// app/api/approval/[jenisForm]/[id]/sign/route.ts
// Tanda tangan Kontraktor untuk form jenis kerja (hot-work, height-work,
// workshop) yang tipe_perusahaan = 'eksternal'.
//
// REFACTOR: Kontraktor TIDAK LAGI menjadi bagian dari alur approval
// bertahap (current_stage). Kontraktor bisa menandatangani form ini
// kapan saja selama form berstatus "submitted" dan belum ditandatangani
// — tidak menunggu giliran, dan tidak lagi menggeser current_stage ke
// SPV. SPV (dan approver lain) tetap berjalan berdasarkan current_stage
// masing-masing, independen dari tanda tangan kontraktor.

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const TABLE_MAP: Record<string, string> = {
  "hot-work": "form_kerja_panas",
  "height-work": "form_kerja_ketinggian",
  "workshop": "form_kerja_workshop",
};

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jenisForm: string; id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // if (user.role !== "kontraktor" && user.role !== "admin") {
  //   return NextResponse.json(
  //     { error: "Hanya Kontraktor yang dapat menandatangani di sini." },
  //     { status: 403 }
  //   );
  // }

  const { jenisForm, id } = await params;
  const table = TABLE_MAP[jenisForm];
  if (!table) return NextResponse.json({ error: "Jenis form tidak valid" }, { status: 400 });

  const body = await req.json();
  const signatureUrl: string | undefined = body.signatureUrl;
  if (!signatureUrl) {
    return NextResponse.json({ error: "Tanda tangan wajib diisi." }, { status: 400 });
  }

  const tipeExpr =
    jenisForm === "height-work"
      ? `CASE
           WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
           WHEN petugas_ketinggian ILIKE '%eksternal%' THEN 'eksternal'
           ELSE 'internal'
         END`
      : `CASE
           WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
           ELSE 'internal'
         END`;

  const existing = await queryOne<any>(
    `SELECT id_form, status, current_stage, user_id, tanggal, kontraktor_approved,
            (${tipeExpr}) AS tipe_perusahaan
       FROM ${table} WHERE id_form = $1`,
    [id]
  );
  if (!existing) return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
  if (existing.status !== "submitted") {
    return NextResponse.json(
      { error: `Form berstatus "${existing.status}", tidak bisa ditandatangani.` },
      { status: 409 }
    );
  }
  // REFACTOR: kontraktor tidak lagi harus menunggu current_stage === 1 —
  // yang penting form ini memang milik kontraktor eksternal.
  if (existing.tipe_perusahaan !== "eksternal") {
    return NextResponse.json(
      { error: "Tanda tangan Kontraktor hanya berlaku untuk form eksternal." },
      { status: 409 }
    );
  }
  if (existing.kontraktor_approved) {
    return NextResponse.json(
      { error: "Form ini sudah ditandatangani Kontraktor." },
      { status: 409 }
    );
  }

  // REFACTOR: tidak lagi mengubah current_stage — tanda tangan kontraktor
  // independen dari alur approval SPV → Admin K3 → SFO → SMR.
  await query(
    `UPDATE ${table}
        SET kontraktor_approved = TRUE,
            kontraktor_approved_by = $1,
            kontraktor_approved_at = NOW(),
            kontraktor_nik = $2,
            kontraktor_signature_url = $3,
            updated_at = NOW()
      WHERE id_form = $4`,
    [user.nama || user.username, (user as any).nik ?? null, signatureUrl, id]
  );

  return NextResponse.json({ success: true });
}