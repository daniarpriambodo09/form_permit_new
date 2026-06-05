// app/api/my-forms/route.ts
// UPDATED: Menambahkan kolom perlu_jsa dan jsa_file_url ke dalam SELECT query 
// agar data JSA dapat ditampilkan di Detail Modal.
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    console.log("❌ COOKIE HEADER KOSONG");
    return null;
  }
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map(c => {
      const [key, ...v] = c.split("=");
      return [key, v.join("=")];
    })
  );
  const token = cookies[COOKIE_NAME];
  if (!token) {
    console.log("❌ TOKEN TIDAK DITEMUKAN DI COOKIE");
    return null;
  }
  console.log("✅ TOKEN TERBACA");
  return verifyToken(token);
}

const TIPE_EXPR_FW = `CASE WHEN tipe_perusahaan IN ('internal', 'eksternal') THEN tipe_perusahaan ELSE 'internal' END`;
const TIPE_EXPR_HW = `CASE WHEN tipe_perusahaan IN ('internal', 'eksternal') THEN tipe_perusahaan WHEN petugas_ketinggian ILIKE '%eksternal%' THEN 'eksternal' ELSE 'internal' END`;

export async function GET(req: NextRequest) {
  console.log("RAW COOKIE:", req.headers.get("cookie"));
  const user = getUser(req);
  
  console.log('[GET /api/my-forms] user from token:', user
    ? { userId: user.userId, username: user.username, role: user.role }
    : 'NULL — cookie tidak terbaca atau token invalid'
  );

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Math.floor(Number(user.userId));
  if (isNaN(userId) || userId <= 0) {
    console.error('[GET /api/my-forms] userId tidak valid:', user.userId);
    return NextResponse.json({ error: 'Token tidak valid: userId tidak ditemukan' }, { status: 401 });
  }

  console.log("🔥 USER DEBUG:", user, "userId hasil cast:", userId, "type:", typeof userId);

  try {
    const results = await Promise.allSettled([
      // ── Hot-work ──────────────────────────────────────────────
      query(
        `SELECT
          id_form,
          tanggal,
          tanggal_pelaksanaan,
          status,
          lokasi_pekerjaan        AS lokasi,
          catatan_reject,
          approved_by,
          approved_at,
          fw_approved,
          spv_approved,
          kontraktor_approved,
          admin_k3_approved,
          sfo_approved,
          pga_approved,
          mr_pga_approved,
          nama_fire_watch,
          nik_fire_watch,
          perlu_jsa,              -- ✅ BARU: Untuk Detail Modal JSA
          jsa_file_url,           -- ✅ BARU: Untuk Detail Modal JSA
          (${TIPE_EXPR_FW})       AS tipe_perusahaan,
          'hot-work'              AS jenis_form
        FROM form_kerja_panas
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [userId]
      ),

      // ── Workshop ──────────────────────────────────────────────
      query(
        `SELECT
          id_form,
          tanggal,
          tanggal_pelaksanaan,
          status,
          lokasi_pekerjaan        AS lokasi,
          catatan_reject,
          approved_by,
          approved_at,
          fw_approved,
          spv_approved,
          kontraktor_approved,
          admin_k3_approved,
          sfo_approved,
          pga_approved,
          mr_pga_approved,
          nama_fire_watch,
          nik_fire_watch,
          perlu_jsa,              -- ✅ BARU: Untuk Detail Modal JSA
          jsa_file_url,           -- ✅ BARU: Untuk Detail Modal JSA
          (${TIPE_EXPR_FW})       AS tipe_perusahaan,
          'workshop'              AS jenis_form
        FROM form_kerja_workshop
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [userId]
      ),

      // ── Height-work ───────────────────────────────────────────
      query(
        `SELECT
          id_form,
          tanggal,
          tanggal_pelaksanaan,
          status,
          lokasi,
          catatan_reject,
          approved_by,
          approved_at,
          NULL::boolean           AS fw_approved,
          spv_approved,
          kontraktor_approved,
          admin_k3_approved,
          sfo_approved,
          NULL::boolean           AS pga_approved,
          mr_pga_approved,
          NULL::text              AS nama_fire_watch,
          NULL::text              AS nik_fire_watch,
          perlu_jsa,              -- ✅ BARU: Untuk Detail Modal JSA
          jsa_file_url,           -- ✅ BARU: Untuk Detail Modal JSA
          (${TIPE_EXPR_HW})       AS tipe_perusahaan,
          'height-work'           AS jenis_form
        FROM form_kerja_ketinggian
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [userId]
      ),
    ]);

    const [hotWorkResult, workshopResult, heightWorkResult] = results;

    if (hotWorkResult.status === 'fulfilled') {
      console.log('[GET /api/my-forms] hot-work rows:', hotWorkResult.value.length);
    } else { 
      console.error('[GET /api/my-forms] hot-work ERROR:', hotWorkResult.reason);
    }
    
    if (workshopResult.status === 'fulfilled') {
      console.log('[GET /api/my-forms] workshop rows:', workshopResult.value.length);
    } else {
      console.error('[GET /api/my-forms] workshop ERROR:', workshopResult.reason);
    }
    
    if (heightWorkResult.status === 'fulfilled') {
      console.log('[GET /api/my-forms] height-work rows:', heightWorkResult.value.length);
    } else {
      console.error('[GET /api/my-forms] height-work ERROR:', heightWorkResult.reason);
    }

    const hotWork = hotWorkResult.status === 'fulfilled' ? hotWorkResult.value : [];
    const workshop = workshopResult.status === 'fulfilled' ? workshopResult.value : [];
    const heightWork = heightWorkResult.status === 'fulfilled' ? heightWorkResult.value : [];

    const all = [...hotWork, ...workshop, ...heightWork].sort(
      (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    console.log('[GET /api/my-forms] Total forms returned:', all.length);
    return NextResponse.json({ data: all, total: all.length });
  } catch (err: any) {
    console.error('[GET /api/my-forms] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}