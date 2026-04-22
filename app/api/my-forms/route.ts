// app/api/my-forms/route.ts
// FIX: hot-work & workshop sekarang ikutkan tipe_perusahaan dan mr_pga_approved
// agar frontend bisa menampilkan alur approval yang benar (internal/eksternal)

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Ekspresi normalisasi tipe_perusahaan untuk hot-work & workshop
const TIPE_EXPR_FW = `CASE
  WHEN tipe_perusahaan IN ('internal', 'eksternal') THEN tipe_perusahaan
  ELSE 'internal'
END`;

// Ekspresi normalisasi tipe_perusahaan untuk height-work (handle data lama)
const TIPE_EXPR_HW = `CASE
  WHEN tipe_perusahaan IN ('internal', 'eksternal') THEN tipe_perusahaan
  WHEN petugas_ketinggian ILIKE '%eksternal%' THEN 'eksternal'
  ELSE 'internal'
END`;

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [hotWork, workshop, heightWork] = await Promise.all([
      // Hot-work: sertakan tipe_perusahaan dan semua kolom approval baru
      query(
        `SELECT
          id_form, tanggal, tanggal_pelaksanaan, status,
          lokasi_pekerjaan AS lokasi,
          catatan_reject, approved_by, approved_at,
          fw_approved,
          spv_approved,
          kontraktor_approved,
          admin_k3_approved,
          sfo_approved,
          pga_approved,
          mr_pga_approved,
          (${TIPE_EXPR_FW}) AS tipe_perusahaan,
          'hot-work' AS jenis_form
        FROM form_kerja_panas
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [user.userId]
      ),

      // Workshop: sertakan tipe_perusahaan dan semua kolom approval baru
      query(
        `SELECT
          id_form, tanggal, tanggal_pelaksanaan, status,
          lokasi_pekerjaan AS lokasi,
          catatan_reject, approved_by, approved_at,
          fw_approved,
          spv_approved,
          kontraktor_approved,
          admin_k3_approved,
          sfo_approved,
          pga_approved,
          mr_pga_approved,
          (${TIPE_EXPR_FW}) AS tipe_perusahaan,
          'workshop' AS jenis_form
        FROM form_kerja_workshop
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [user.userId]
      ),

      // Height-work: normalisasi tipe_perusahaan (handle data lama & baru)
      query(
        `SELECT
          id_form, tanggal, tanggal_pelaksanaan, status,
          lokasi,
          catatan_reject, approved_by, approved_at,
          NULL::boolean AS fw_approved,
          spv_approved,
          kontraktor_approved,
          admin_k3_approved,
          sfo_approved,
          NULL::boolean AS pga_approved,
          mr_pga_approved,
          (${TIPE_EXPR_HW}) AS tipe_perusahaan,
          'height-work' AS jenis_form
        FROM form_kerja_ketinggian
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [user.userId]
      ),
    ]);

    const all = [...hotWork, ...workshop, ...heightWork].sort(
      (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    return NextResponse.json({ data: all, total: all.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}