// app/api/approval/external/[id]/safety-induction/route.ts
// Menyimpan data Safety Induction (draft atau approval penuh).

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { syncCascadeApproval } from "@/lib/approval-sync";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "security" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Security atau Admin yang dapat mengubah data Safety Induction." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const { safetyInduction, signatureUrl, submit } = body;

  if (!safetyInduction || typeof safetyInduction !== "object") {
    return NextResponse.json({ error: "Data Safety Induction wajib diisi." }, { status: 400 });
  }

  const existing = await queryOne<any>(
    `SELECT id_form, status, current_stage, security_approved, safety_induction,
            user_id, nama_kontraktor_pekerja, tanggal
       FROM form_ijin_kerja WHERE id_form = $1`,
    [id]
  );
  if (!existing) return NextResponse.json({ error: "Form tidak ditemukan." }, { status: 404 });

  // ── Mode 1: Simpan Draft (tidak memerlukan tanda tangan Security) ──
  if (!submit && !signatureUrl) {
    const draftData = {
      ...safetyInduction,
      status: existing.security_approved ? "approved" : "draft",
    };
    await query(
      `UPDATE form_ijin_kerja
          SET safety_induction = $1,
              updated_at = NOW()
        WHERE id_form = $2`,
      [JSON.stringify(draftData), id]
    );
    return NextResponse.json({ success: true, data: draftData });
  }

  // ── Mode 2: Submit & Tanda Tangan Security ──
  if (!signatureUrl) {
    return NextResponse.json({ error: "Tanda tangan wajib diisi." }, { status: 400 });
  }
  if (
    !String(safetyInduction.namaSubcont || "").trim() ||
    !String(safetyInduction.aktivitasPekerjaan || "").trim() ||
    !Array.isArray(safetyInduction.namaPekerja) ||
    !safetyInduction.namaPekerja.some((n: unknown) => typeof n === "string" && n.trim())
  ) {
    return NextResponse.json(
      { error: "Nama Subcont, Aktivitas Pekerjaan, dan minimal satu nama pekerja pada Daftar Nama Pekerja wajib diisi." },
      { status: 400 }
    );
  }

  if (existing.status !== "submitted") {
    return NextResponse.json({ error: `Form berstatus "${existing.status}".` }, { status: 409 });
  }
  if (existing.current_stage !== 5 || existing.security_approved) {
    return NextResponse.json(
      { error: "Belum giliran Security, atau Safety Induction sudah disetujui." },
      { status: 409 }
    );
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
            current_stage = 5,
            updated_at = NOW()
      WHERE id_form = $4`,
    [JSON.stringify(finalData), user.nama || user.username, signatureUrl, id]
  );

  await syncCascadeApproval({
    idIjinKerja: id,
    role: "security",
    approverName: user.nama || user.username,
    approverNik: (user as any).nik ?? null,
    signatureUrl,
    now: new Date().toISOString(),
    origin: "safety-induction",
  });

  return NextResponse.json({ success: true, data: finalData });
}