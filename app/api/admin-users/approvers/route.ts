// app/api/admin-users/approvers/route.ts
// UPDATED: Tambah field `nik` pada SELECT dan response JSON.
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Akses ditolak. Login terlebih dahulu.' },
      { status: 403 }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Token tidak valid.' },
      { status: 403 }
    );
  }

  try {
    const isAdmin = payload.role === 'admin';
    const departmen = isAdmin
      ? null
      : (await query<{ departmen: string | null }>(`SELECT departmen FROM users WHERE id = $1`, [payload.userId]))[0]?.departmen ?? null;

    const rows = await query<{
      id: number;
      nama: string;
      username: string;
      role: string;
      nik: string | null;
      jabatan: string | null;
      departmen: string | null;
      email: string | null;
      no_telp: string | null;
      is_active: boolean;
      created_at: string;
    }>(
      `SELECT
         id,
         nama,
         username,
         role,
         nik,
         jabatan,
         departmen,
         email,
         no_telp,
         is_active,
         created_at
       FROM users
       WHERE role IN ('spv', 'kontraktor', 'admin_k3', 'sfo', 'smr', 'admin', 'security')
         ${isAdmin ? '' : 'AND departmen = $1'}
       ORDER BY role ASC, created_at DESC`,
      isAdmin ? [] : [departmen]
    );

    return NextResponse.json({ users: rows }, { status: 200 });
  } catch (err: unknown) {
    console.error('[GET /api/admin-users/approvers]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}