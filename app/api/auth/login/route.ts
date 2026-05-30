import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword, signToken, UserRole } from '@/lib/auth';

interface User {
  id: number;
  username: string;
  password: string;
  nama: string;
  jabatan: string;
  role: string;
  is_active: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    // 🔍 Cari user
    const user = await queryOne<User>(
      `SELECT id, username, password, nama, jabatan, role, is_active
       FROM users
       WHERE username = $1`,
      [username.toLowerCase().trim()]
    );

    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // 🔐 Verifikasi password
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // 🎫 Buat token
    const token = signToken({
      userId: user.id,
      username: user.username,
      nama: user.nama,
      jabatan: user.jabatan,
      role: user.role as UserRole,
    });

    // ✅ Response + set cookie
    const res = NextResponse.json({
      success: true,
      user: {
        nama: user.nama,
        jabatan: user.jabatan,
        role: user.role,
      },
    });

    // 🔥 INI YANG PALING PENTING
    res.cookies.set('jai_auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/', // WAJIB supaya kebaca di semua route
      // secure: false (default di dev)
    });

    return res;

  } catch (err: any) {
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}