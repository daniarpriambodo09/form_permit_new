import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { notifyGeneralPermitNextApprover } from "@/lib/approval-email";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "security" && user.role !== "admin") {
    return NextResponse.json({ error: "Hanya Security yang dapat menandatangani." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { safetyInduction, signatureUrl } = body;
  if (!signatureUrl) return NextResponse.json({ error: "Tanda tangan wajib diisi." }, { status: 400 });
  if (!safetyInduction || typeof safetyInduction !== "object") {
    return NextResponse.json({ error: "Data Safety Induction wajib diisi." }, { status: 400 });
  }
  if (
    !String(safetyInduction.namaSubcont || "").trim() ||
    !String(safetyInduction.aktivitasPekerjaan || "").trim() ||
    !Array.isArray(safetyInduction.namaPekerja) ||
    !safetyInduction.namaPekerja.some((n: unknown) => typeof n === "string" && n.trim())
  ) {
    return NextResponse.json({ error: "Nama Subcont, Aktivitas Pekerjaan, dan minimal satu pekerja wajib diisi." }, { status: 400 });
  }

  const existing = await queryOne<any>(
    `SELECT id_form, status, current_stage, security_approved, user_id, nama_kontraktor_pekerja, tanggal
       FROM form_ijin_kerja WHERE id_form = $1`,
    [id]
  );
  if (!existing) return NextResponse.json({ error: "Form tidak ditemukan." }, { status: 404 });
  if (existing.status !== "submitted") {
    return NextResponse.json({ error: `Form berstatus "${existing.status}".` }, { status: 409 });
  }
  if (existing.current_stage !== 4 || existing.security_approved) {
    return NextResponse.json({ error: "Belum giliran Security, atau Safety Induction sudah disetujui." }, { status: 409 });
  }

  const finalData = {
    ...safetyInduction,
    signatureUrl,
    status: "approved",
    approvedBy: user.nama || user.username,
    approvedAt: new Date().toISOString(),
  };

  await query(
    `UPDATE form_ijin_kerja
        SET safety_induction = $1,
            security_approved = TRUE,
            security_approved_by = $2,
            security_approved_at = NOW(),
            security_signature_url = $3,
            status = 'approved',
            approved_by = $2,
            approved_at = NOW(),
            current_stage = 4,
            updated_at = NOW()
      WHERE id_form = $4`,
    [JSON.stringify(finalData), user.nama || user.username, signatureUrl, id]
  );

  return NextResponse.json({ success: true, data: finalData });
}