// app/api/my-forms/route.ts
// GET: list semua form milik user yang sedang login
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Ambil dari 3 tabel, filter by user_id
    const [hotWork, workshop, heightWork] = await Promise.all([
      query(
        `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                lokasi_pekerjaan AS lokasi,
                catatan_reject, approved_by, approved_at,
                'hot-work' AS jenis_form
         FROM form_kerja_panas
         WHERE user_id = $1
         ORDER BY tanggal DESC`,
        [user.userId]
      ),
      query(
        `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                lokasi_pekerjaan AS lokasi,
                catatan_reject, approved_by, approved_at,
                'workshop' AS jenis_form
         FROM form_kerja_workshop
         WHERE user_id = $1
         ORDER BY tanggal DESC`,
        [user.userId]
      ),
      query(
        `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                lokasi,
                catatan_reject, approved_by, approved_at,
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