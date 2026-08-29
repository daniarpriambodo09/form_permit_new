// app/api/my-forms/route.ts
// UPDATED: Tambah query form_ijin_kerja (general-permit) sebagai jenis_form
// keempat, plus jumlah job-form (hot-work/height-work/workshop) yang sudah
// terhubung ke tiap general-permit (untuk badge "N form terkait" di /my-forms).
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map(c => {
      const [key, ...v] = c.split("=");
      return [key, v.join("=")];
    })
  );
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

const TIPE_EXPR_FW = `CASE WHEN tipe_perusahaan IN ('internal', 'eksternal') THEN tipe_perusahaan ELSE 'internal' END`;
const TIPE_EXPR_HW = `CASE WHEN tipe_perusahaan IN ('internal', 'eksternal') THEN tipe_perusahaan WHEN petugas_ketinggian ILIKE '%eksternal%' THEN 'eksternal' ELSE 'internal' END`;

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Math.floor(Number(user.userId));
  if (isNaN(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Token tidak valid: userId tidak ditemukan' }, { status: 401 });
  }

  try {
    const results = await Promise.allSettled([
      // ── Hot-work ──────────────────────────────────────────────
      query(
        `SELECT
          id_form, tanggal, tanggal_pelaksanaan, status,
          lokasi_pekerjaan AS lokasi,
          catatan_reject, approved_by, approved_at,
          fw_approved, spv_approved, kontraktor_approved,
          admin_k3_approved, sfo_approved, pga_approved, mr_pga_approved,
          nama_fire_watch, nik_fire_watch,
          perlu_jsa, jsa_file_url,
          id_ijin_kerja,
          (${TIPE_EXPR_FW}) AS tipe_perusahaan,
          'hot-work' AS jenis_form
        FROM form_kerja_panas WHERE user_id = $1 ORDER BY tanggal DESC`,
        [userId]
      ),
      // ── Workshop ──────────────────────────────────────────────
      query(
        `SELECT
          id_form, tanggal, tanggal_pelaksanaan, status,
          lokasi_pekerjaan AS lokasi,
          catatan_reject, approved_by, approved_at,
          fw_approved, spv_approved, kontraktor_approved,
          admin_k3_approved, sfo_approved, pga_approved, mr_pga_approved,
          nama_fire_watch, nik_fire_watch,
          perlu_jsa, jsa_file_url,
          id_ijin_kerja,
          (${TIPE_EXPR_FW}) AS tipe_perusahaan,
          'workshop' AS jenis_form
        FROM form_kerja_workshop WHERE user_id = $1 ORDER BY tanggal DESC`,
        [userId]
      ),
      // ── Height-work ───────────────────────────────────────────
      query(
        `SELECT
          id_form, tanggal, tanggal_pelaksanaan, status,
          lokasi,
          catatan_reject, approved_by, approved_at,
          NULL::boolean AS fw_approved,
          spv_approved, kontraktor_approved, admin_k3_approved,
          sfo_approved, NULL::boolean AS pga_approved, mr_pga_approved,
          NULL::text AS nama_fire_watch, NULL::text AS nik_fire_watch,
          perlu_jsa, jsa_file_url,
          id_ijin_kerja,
          (${TIPE_EXPR_HW}) AS tipe_perusahaan,
          'height-work' AS jenis_form
        FROM form_kerja_ketinggian WHERE user_id = $1 ORDER BY tanggal DESC`,
        [userId]
      ),
      // ── Ijin Kerja Eksternal (general-permit) ────────────────────────
      query(
        `SELECT
          gp.id_form, gp.tanggal, gp.tanggal_pelaksanaan, gp.status,
          gp.lokasi_pekerjaan AS lokasi,
          gp.catatan_reject, gp.approved_by, gp.approved_at,
          gp.security_approved, gp.sfo_approved, gp.pga_approved,
          gp.nama_kontraktor_pekerja,
          'general-permit' AS jenis_form,
          'eksternal' AS tipe_perusahaan,
          (
            (SELECT COUNT(*) FROM form_kerja_panas      WHERE id_ijin_kerja = gp.id_form) +
            (SELECT COUNT(*) FROM form_kerja_ketinggian WHERE id_ijin_kerja = gp.id_form) +
            (SELECT COUNT(*) FROM form_kerja_workshop   WHERE id_ijin_kerja = gp.id_form)
          ) AS job_forms_count
        FROM form_ijin_kerja gp
        WHERE gp.user_id = $1
        ORDER BY gp.tanggal DESC`,
        [userId]
      ),
    ]);

    const [hotWorkResult, workshopResult, heightWorkResult, generalPermitResult] = results;

    const hotWork        = hotWorkResult.status === 'fulfilled' ? hotWorkResult.value : [];
    const workshop        = workshopResult.status === 'fulfilled' ? workshopResult.value : [];
    const heightWork      = heightWorkResult.status === 'fulfilled' ? heightWorkResult.value : [];
    const generalPermit   = generalPermitResult.status === 'fulfilled' ? generalPermitResult.value : [];

    if (hotWorkResult.status === 'rejected')      console.error('[GET /api/my-forms] hot-work ERROR:', hotWorkResult.reason);
    if (workshopResult.status === 'rejected')     console.error('[GET /api/my-forms] workshop ERROR:', workshopResult.reason);
    if (heightWorkResult.status === 'rejected')   console.error('[GET /api/my-forms] height-work ERROR:', heightWorkResult.reason);
    if (generalPermitResult.status === 'rejected') console.error('[GET /api/my-forms] general-permit ERROR:', generalPermitResult.reason);

    const all = [...hotWork, ...workshop, ...heightWork, ...generalPermit].sort(
      (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    return NextResponse.json({ data: all, total: all.length });
  } catch (err: any) {
    console.error('[GET /api/my-forms] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}