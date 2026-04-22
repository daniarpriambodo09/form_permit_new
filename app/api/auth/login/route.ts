// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword, signToken, getCookieOptions, COOKIE_NAME, UserRole } from '@/lib/auth';

interface User {
  id:        number;
  username:  string;
  password:  string;
  nama:      string;
  jabatan:   string;
  role:      string;
  is_active: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    // Cari user di database
    const user = await queryOne<User>(
      `SELECT id, username, password, nama, jabatan, role, is_active
       FROM users WHERE username = $1`,
      [username.toLowerCase().trim()]
    );

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // Verifikasi password
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // Buat JWT token
    const token = signToken({
      userId:   user.id,
      username: user.username,
      nama:     user.nama,
      jabatan:  user.jabatan,
      role:     user.role as UserRole,
    });

    // Set cookie httpOnly
    const res = NextResponse.json({
      success:  true,
      user: {
        nama:    user.nama,
        jabatan: user.jabatan,
        role:    user.role,
      },
    });

    res.cookies.set(COOKIE_NAME, token, getCookieOptions());
    return res;
  } catch (err: any) {
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}