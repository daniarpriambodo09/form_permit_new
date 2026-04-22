// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Ambil data lengkap user dari DB termasuk NIK
  const user = await queryOne<{ nik: string | null }>(
    `SELECT nik FROM users WHERE id = $1`,
    [payload.userId]
  );

  return NextResponse.json({
    user: {
      userId:   payload.userId,
      username: payload.username,
      nama:     payload.nama,
      jabatan:  payload.jabatan,
      role:     payload.role,
      nik:      user?.nik ?? null,
    },
  });
}