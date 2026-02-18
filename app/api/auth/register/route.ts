// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { nik, nama, email, perusahaan, no_telp, password } = await req.json();

    // Validasi
    if (!nik || !nama || !email || !perusahaan || !password) {
      return NextResponse.json({ error: 'NIK, nama, email, perusahaan, dan password wajib diisi' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }
    if (nik.length < 10) {
      return NextResponse.json({ error: 'NIK tidak valid (minimal 10 digit)' }, { status: 400 });
    }

    // Cek duplikat NIK
    const existingNik = await queryOne(
      `SELECT id FROM users WHERE nik = $1`,
      [nik]
    );
    if (existingNik) {
      return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 409 });
    }

    // Cek duplikat email
    const existingEmail = await queryOne(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    if (existingEmail) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate username dari NIK (bisa custom logic)
    const username = `worker_${nik}`;

    // Insert user baru
    await query(
      `INSERT INTO users (username, password, nama, nik, email, perusahaan, no_telp, jabatan, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        username,
        hashedPassword,
        nama,
        nik,
        email.toLowerCase().trim(),
        perusahaan,
        no_telp || null,
        'Pekerja',
        'worker',
        true,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Silakan login dengan NIK dan password Anda.',
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}