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
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role');
    const deptParam = searchParams.get('departmen');

    let sql = `
      SELECT
         id,
         nama,
         username,
         role,
         COALESCE(NULLIF(TRIM(nik), ''), '100' || id) AS nik,
         COALESCE(jabatan, 'Supervisor') AS jabatan,
         departmen,
         email,
         no_telp,
         is_active,
         created_at
       FROM users
       WHERE role IN ('spv', 'kontraktor', 'admin_k3', 'sfo', 'smr', 'admin', 'security')
    `;
    const params: any[] = [];
    if (roleParam) {
      params.push(roleParam);
      sql += ` AND role = $${params.length}`;
    }
    if (deptParam) {
      params.push(deptParam);
      sql += ` AND departmen = $${params.length}`;
    }
    sql += ` ORDER BY role ASC, departmen ASC, nama ASC, created_at DESC`;

    const rows = await query(sql, params);
    return NextResponse.json({ users: rows }, { status: 200 });
  } catch (err: unknown) {
    console.error('[GET /api/admin-users/approvers]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}