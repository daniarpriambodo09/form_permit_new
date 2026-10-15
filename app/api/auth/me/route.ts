// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  // Ambil data lengkap user dari DB termasuk NIK dan departmen
  const user = await queryOne<{ nik: string | null; departmen: string | null }>(
    `SELECT nik, departmen FROM users WHERE id = $1`,
    [payload.userId]
  );

  return NextResponse.json(
    {
      user: {
        userId:   payload.userId,
        username: payload.username,
        nama:     payload.nama,
        jabatan:  payload.jabatan,
        role:     payload.role,
        nik:      user?.nik ?? null,
        departmen: user?.departmen ?? null,
      },
    },
    { headers: NO_CACHE_HEADERS }
  );
}