// app/api/admin-users/approvers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  // ── Validasi admin ───────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Akses ditolak. Login sebagai admin terlebih dahulu.' },
      { status: 403 }
    );
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { error: 'Akses ditolak. Hanya admin yang dapat mengakses data ini.' },
      { status: 403 }
    );
  }
  // ── AKHIR validasi admin ─────────────────────────────────────

  try {
    const rows = await query<{
      id:         number;
      nama:       string;
      username:   string;
      role:       string;
      departmen:  string | null;
      email:      string | null;
      no_telp:    string | null;
      is_active:  boolean;
      created_at: string;
    }>(
      `SELECT
         id,
         nama,
         username,
         role,
         departmen,
         email,
         no_telp,
         is_active,
         created_at
       FROM users
       WHERE role IN ('spv', 'kontraktor', 'admin_k3', 'sfo', 'smr', 'admin')
       ORDER BY role ASC, created_at DESC`,
      // ↑ 'pga' diganti 'smr' sesuai nilai baru di kolom role tabel users
      []
    );

    return NextResponse.json({ users: rows }, { status: 200 });
  } catch (err: unknown) {
    console.error('[GET /api/admin-users/approvers]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}