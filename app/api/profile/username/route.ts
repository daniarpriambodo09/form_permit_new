// app/api/profile/username/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signToken, COOKIE_NAME, getCookieOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const username: string = (body?.username ?? '').trim();

  // Validasi
  if (!username) {
    return NextResponse.json({ error: 'Username tidak boleh kosong.' }, { status: 400 });
  }
  if (username.length < 4) {
    return NextResponse.json({ error: 'Username minimal 4 karakter.' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json(
      { error: 'Username hanya boleh berisi huruf, angka, dan underscore.' },
      { status: 400 }
    );
  }
  if (username === payload.username) {
    return NextResponse.json(
      { error: 'Username baru sama dengan username saat ini.' },
      { status: 400 }
    );
  }

  // Cek keunikan username
  const existing = await queryOne(
    `SELECT id FROM users WHERE username = $1 AND id != $2`,
    [username, payload.userId]
  );
  if (existing) {
    return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 });
  }

  // Update database
  await query(`UPDATE users SET username = $1 WHERE id = $2`, [username, payload.userId]);

  // Re-issue JWT dengan username baru
  const {
    exp,
    iat,
    ...cleanPayload 
    } = payload as any;

    const newPayload = {
    ...cleanPayload,
    username,
    };
  const newToken   = signToken(newPayload);

  const res = NextResponse.json({ message: 'Username berhasil diubah.', username });
  res.cookies.set(COOKIE_NAME, newToken, getCookieOptions());
  return res;
}