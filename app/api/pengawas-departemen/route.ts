import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await query(
      `SELECT id, nama, nik, departemen, is_active, created_at, updated_at
       FROM pengawas_departemen
       ${user.role === 'admin' ? '' : 'WHERE is_active = true'}
       ORDER BY departemen ASC, nama ASC`
    );
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[GET /api/pengawas-departemen]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Hanya admin yang bisa menambah pengawas' }, { status: 403 });

  try {
    const body = await req.json();
    const nama = String(body.nama ?? '').trim();
    const nik = String(body.nik ?? '').trim();
    const departemen = String(body.departemen ?? '').trim();
    if (!nama || !nik || !departemen) {
      return NextResponse.json({ error: 'Nama, NIK, dan departemen wajib diisi' }, { status: 400 });
    }
    const duplicate = await queryOne(
      `SELECT id FROM pengawas_departemen WHERE nama = $1 AND nik = $2 AND departemen = $3`,
      [nama, nik, departemen]
    );
    if (duplicate) return NextResponse.json({ error: 'Data pengawas tersebut sudah terdaftar' }, { status: 409 });

    const created = await queryOne(
      `INSERT INTO pengawas_departemen (nama, nik, departemen)
       VALUES ($1, $2, $3)
       RETURNING id, nama, nik, departemen, is_active, created_at, updated_at`,
      [nama, nik, departemen]
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/pengawas-departemen]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
