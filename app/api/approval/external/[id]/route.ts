import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const general = await queryOne(
      `SELECT f.*, u.nama AS pembuat_nama, u.departmen AS pembuat_departmen
         FROM form_ijin_kerja f
         LEFT JOIN users u ON u.id = f.user_id
        WHERE f.id_form = $1`,
      [id]
    );
    if (!general) return NextResponse.json({ error: "Form eksternal tidak ditemukan" }, { status: 404 });

    const attachments = await query(
      `SELECT 'hot-work' AS jenis_form, id_form, id_ijin_kerja, status, current_stage,
              tipe_perusahaan, tanggal, tanggal_pelaksanaan, lokasi_pekerjaan,
              nama_kontraktor_nik, nama_pekerja_nik, perlu_jsa, jsa_file_url,
              kontraktor_approved, spv_approved, admin_k3_approved, sfo_approved,
              mr_pga_approved
         FROM form_kerja_panas WHERE id_ijin_kerja = $1
       UNION ALL
       SELECT 'height-work' AS jenis_form, id_form, id_ijin_kerja, status, current_stage,
              tipe_perusahaan, tanggal, tanggal_pelaksanaan, lokasi,
              NULL, NULL, perlu_jsa, jsa_file_url,
              kontraktor_approved, spv_approved, admin_k3_approved, sfo_approved,
              mr_pga_approved
         FROM form_kerja_ketinggian WHERE id_ijin_kerja = $1
       UNION ALL
       SELECT 'workshop' AS jenis_form, id_form, id_ijin_kerja, status, current_stage,
              tipe_perusahaan, tanggal, tanggal_pelaksanaan, lokasi_pekerjaan,
              nama_kontraktor_nik, nama_pekerja_nik, perlu_jsa, jsa_file_url,
              kontraktor_approved, spv_approved, admin_k3_approved, sfo_approved,
              mr_pga_approved
         FROM form_kerja_workshop WHERE id_ijin_kerja = $1
       ORDER BY tanggal ASC`,
      [id]
    );

    return NextResponse.json({ success: true, data: { general, attachments } });
  } catch (error: any) {
    console.error(`[GET /api/approval/external/${id}]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
