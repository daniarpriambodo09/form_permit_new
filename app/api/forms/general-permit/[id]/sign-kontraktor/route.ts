// app/api/forms/general-permit/[id]/sign-kontraktor/route.ts
// Tanda tangan Kontraktor untuk form induk Ijin Kerja Eksternal.
// Dilakukan lewat /my-forms (DetailModal) menggunakan akun worker
// (biasanya di tablet yang dipinjamkan ke kontraktor).
//
// Efek: current_stage form_ijin_kerja bergerak dari 1 -> 2 (giliran SPV),
// lalu SPV departemen pembuat form dinotifikasi via email.

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { notifyGeneralPermitNextApprover } from "@/lib/approval-email";

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

  const { id } = await params;
  const body = await req.json();
  const signatureUrl: string | undefined = body.signatureUrl;
  if (!signatureUrl) {
    return NextResponse.json({ error: "Tanda tangan wajib diisi." }, { status: 400 });
  }

  const existing = await queryOne<any>(
    `SELECT id_form, status, current_stage, kontraktor_signature_url,
            user_id, nama_kontraktor_pekerja, tanggal
       FROM form_ijin_kerja WHERE id_form = $1`,
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
  }
  if (existing.status !== "submitted" && existing.status !== "approved") {
    return NextResponse.json(
      { error: `Form berstatus "${existing.status}", tidak bisa ditandatangani.` },
      { status: 409 }
    );
  }
  if (existing.kontraktor_signature_url) {
    return NextResponse.json(
      { error: "Form ini sudah ditandatangani Kontraktor." },
      { status: 409 }
    );
  }

  // Kontraktor tanda tangan bebas kapan saja, tidak mengubah current_stage
  await query(
    `UPDATE form_ijin_kerja
        SET kontraktor_signature_url = $1,
            updated_at = NOW()
      WHERE id_form = $2`,
    [signatureUrl, id]
  );

  return NextResponse.json({ success: true });
}