// app/api/my-forms/route.ts
// FIX: hot-work & workshop sekarang ikutkan tipe_perusahaan dan mr_pga_approved
// agar frontend bisa menampilkan alur approval yang benar (internal/eksternal)
//
// FIXES APPLIED:
// 1. userId di-cast eksplisit ke Number() sebelum dipakai sebagai query param
//    → mencegah type mismatch string vs integer di PostgreSQL
// 2. Ditambahkan debug logging agar mudah trace masalah di production
// 3. Error handling per-query (tidak semua gagal jika 1 tabel error)

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");

  if (!cookieHeader) {
    console.log("❌ COOKIE HEADER KOSONG");
    return null;
  }

  // Parse manual cookie
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
  console.log("RAW COOKIE:", req.headers.get("cookie"));
  const user = getUser(req);

  // ── DEBUG LOG: cek apakah user berhasil di-decode dari token ──
  // Hapus log ini setelah masalah terselesaikan
  console.log('[GET /api/my-forms] user from token:', user
    ? { userId: user.userId, username: user.username, role: user.role }
    : 'NULL — cookie tidak terbaca atau token invalid'
  );

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // FIX #1: Paksa userId menjadi integer murni.
  // JWT payload bisa membawa userId sebagai string tergantung bagaimana
  // jsonwebtoken men-serialize nilai saat sign, dan pg driver kadang
  // mengembalikan kolom integer sebagai string.
  // Dengan Number() + Math.floor(), kita pastikan selalu integer.
  const userId = Math.floor(Number(user.userId));

  if (isNaN(userId) || userId <= 0) {
    console.error('[GET /api/my-forms] userId tidak valid:', user.userId);
    return NextResponse.json({ error: 'Token tidak valid: userId tidak ditemukan' }, { status: 401 });
  }

  console.log("🔥 USER DEBUG:");
  console.log("user dari token:", user);
  console.log("userId hasil cast:", userId);
  console.log("type:", typeof userId);

  try {
    // FIX #2: Jalankan query secara terpisah dengan error handling individual.
    // Sebelumnya Promise.all membuat SEMUA query gagal jika SATU tabel error
    // (misal karena kolom baru belum ada di tabel lama).
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
          (${TIPE_EXPR_FW})       AS tipe_perusahaan,
          'hot-work'              AS jenis_form
        FROM form_kerja_panas
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [userId]   // ← FIX: integer murni, bukan string
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
          (${TIPE_EXPR_FW})       AS tipe_perusahaan,
          'workshop'              AS jenis_form
        FROM form_kerja_workshop
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [userId]   // ← FIX: integer murni
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
          (${TIPE_EXPR_HW})       AS tipe_perusahaan,
          'height-work'           AS jenis_form
        FROM form_kerja_ketinggian
        WHERE user_id = $1
        ORDER BY tanggal DESC`,
        [userId]   // ← FIX: integer murni
      ),
    ]);

    // ── DEBUG LOG: hasil tiap query ───────────────────────────
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
    // ── END DEBUG LOG ─────────────────────────────────────────

    // Gabungkan hanya yang berhasil (tidak crash jika ada 1 tabel gagal)
    const hotWork    = hotWorkResult.status    === 'fulfilled' ? hotWorkResult.value    : [];
    const workshop   = workshopResult.status   === 'fulfilled' ? workshopResult.value   : [];
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