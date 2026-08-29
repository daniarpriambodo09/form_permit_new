// app/api/departemen/route.ts
// API untuk Master Departemen.
// - GET  : daftar semua departemen. Bisa diakses semua role yang login
//          (dipakai untuk mengisi dropdown "Nama Departemen" di
//          app/form/height-work/page.tsx dan halaman lain yang butuh
//          daftar departemen).
// - POST : tambah departemen baru — HANYA role admin.
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// ── GET: daftar departemen ─────────────────────────────────────
// Query param opsional: ?activeOnly=1 → hanya departemen aktif
// (dipakai di dropdown form, supaya departemen yang dinonaktifkan
// tidak muncul sebagai pilihan baru, tapi data lama tetap aman).
export async function GET(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === '1';

    const rows = await query(
      `SELECT id, nama_departemen, keterangan, is_active, created_at, updated_at
       FROM departemen
       ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY nama_departemen ASC`
    );

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[GET /api/departemen]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: tambah departemen baru ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa menambah departemen' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const namaDepartemen: string = (body.namaDepartemen || '').trim().toUpperCase();
    const keterangan: string | null = body.keterangan?.trim() || null;

    if (!namaDepartemen) {
      return NextResponse.json({ error: 'Nama departemen wajib diisi' }, { status: 400 });
    }
    if (namaDepartemen.length > 100) {
      return NextResponse.json(
        { error: 'Nama departemen maksimal 100 karakter' },
        { status: 400 }
      );
    }

    const existing = await queryOne(
      `SELECT id FROM departemen WHERE UPPER(nama_departemen) = $1`,
      [namaDepartemen]
    );
    if (existing) {
      return NextResponse.json(
        { error: 'Departemen dengan nama ini sudah terdaftar' },
        { status: 409 }
      );
    }

    const created = await queryOne(
      `INSERT INTO departemen (nama_departemen, keterangan, is_active)
       VALUES ($1, $2, true)
       RETURNING id, nama_departemen, keterangan, is_active, created_at, updated_at`,
      [namaDepartemen, keterangan]
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/departemen]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}