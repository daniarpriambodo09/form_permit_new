// app/api/approval/route.ts
// GET: list semua form pending untuk halaman approval
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

// Map jenis form ke tabel
const TABLE_MAP: Record<string, string> = {
  'hot-work':    'form_kerja_panas',
  'workshop':    'form_kerja_workshop',
  'height-work': 'form_kerja_ketinggian',
};

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'submitted';

    // Ambil dari 3 tabel, tambahkan kolom jenisForm
    const [hotWork, workshop, heightWork] = await Promise.all([
      query(
        `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                no_registrasi, nama_kontraktor_nik, lokasi_pekerjaan,
                waktu_pukul, catatan_reject, approved_by, approved_at,
                'hot-work' AS jenis_form
         FROM form_kerja_panas
         WHERE status = $1 ORDER BY tanggal ASC`,
        [statusFilter]
      ),
      query(
        `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                no_registrasi, nama_kontraktor_nik, lokasi_pekerjaan,
                waktu_pukul, catatan_reject, approved_by, approved_at,
                'workshop' AS jenis_form
         FROM form_kerja_workshop
         WHERE status = $1 ORDER BY tanggal ASC`,
        [statusFilter]
      ),
      query(
        `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                NULL AS no_registrasi, NULL AS nama_kontraktor_nik,
                lokasi, catatan_reject, approved_by, approved_at,
                waktu_mulai AS waktu_pukul,
                'height-work' AS jenis_form
         FROM form_kerja_ketinggian
         WHERE status = $1 ORDER BY tanggal ASC`,
        [statusFilter]
      ),
    ]);

    const all = [...hotWork, ...workshop, ...heightWork].sort(
      (a: any, b: any) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    return NextResponse.json({ data: all, total: all.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}