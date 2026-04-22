// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { nama, username, perusahaan, no_telp, password } = await req.json();

    // Validasi
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }
    // Validasi format username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ error: 'Username harus 3-20 karakter, hanya huruf, angka, dan underscore' }, { status: 400 });
    }

    // Cek duplikat username
    const existingUsername = await queryOne(
      `SELECT id FROM users WHERE username = $1`,
      [username.toLowerCase().trim()]
    );
    if (existingUsername) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user baru
    await query(
      `INSERT INTO users (username, password, nama, perusahaan, no_telp, jabatan, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        username.toLowerCase().trim(),
        hashedPassword,
        nama,
        perusahaan,
        no_telp || null,
        'Pekerja',
        'worker',
        true,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Silakan login dengan username dan password Anda.',
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
