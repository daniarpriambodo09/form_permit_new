// app/api/approval/external/[id]/safety-induction/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

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
    `SELECT id_form, kontraktor_signature_url, security_approved
       FROM form_ijin_kerja WHERE id_form = $1`,
    [id]
  );
  if (!existing) return NextResponse.json({ error: "Form tidak ditemukan." }, { status: 404 });
  if (!existing.kontraktor_signature_url) {
    return NextResponse.json({ error: "Kontraktor belum menandatangani form ini." }, { status: 409 });
  }
  if (existing.security_approved) {
    return NextResponse.json({ error: "Safety Induction ini sudah disetujui Security." }, { status: 409 });
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
            updated_at = NOW()
      WHERE id_form = $4`,
    [JSON.stringify(finalData), user.nama || user.username, signatureUrl, id]
  );

  // TODO: notify SFO next — tergantung stage map final general-permit (lihat catatan di atas)

  return NextResponse.json({ success: true, data: finalData });
}