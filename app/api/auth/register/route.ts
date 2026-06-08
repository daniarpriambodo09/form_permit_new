// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, verifyToken, COOKIE_NAME } from '@/lib/auth';

const ALLOWED_DEPARTMENTS = [
  "QA",
  "ENG",
  "MTC",
  "PRODUKSI",
  "NYS",
  "FATP-Exim",
  "MPC-WHS",
  "PGA",
] as const;

export async function POST(req: NextRequest) {
  // ── Validasi admin sebelum apapun ────────────────────────────
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
      { error: 'Akses ditolak. Hanya admin yang dapat membuat akun.' },
      { status: 403 }
    );
  }
  // ── AKHIR validasi admin ──────────────────────────────────────

  try {
    const { nama, username, perusahaan, departmen, email, no_telp, password } = await req.json();

    // Validasi password
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // Validasi username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username harus 3-20 karakter, hanya huruf, angka, dan underscore' },
        { status: 400 }
      );
    }

    // Validasi departemen — wajib & harus nilai yang diizinkan
    if (!departmen) {
      return NextResponse.json({ error: 'Departemen wajib dipilih' }, { status: 400 });
    }
    if (!(ALLOWED_DEPARTMENTS as readonly string[]).includes(departmen)) {
      return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
    }

    // Validasi email — opsional, tapi jika diisi harus valid format
    const emailValue: string | null = email && typeof email === 'string' && email.trim() !== ''
      ? email.trim()
      : null;

    if (emailValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
      }
    }

    // Cek duplikat username
    const existingUsername = await queryOne(
      `SELECT id FROM users WHERE username = $1`,
      [username.toLowerCase().trim()]
    );
    if (existingUsername) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    await query(
      `INSERT INTO users (username, password, nama, perusahaan, departmen, email, no_telp, jabatan, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        username.toLowerCase().trim(),
        hashedPassword,
        nama,
        perusahaan,
        departmen,
        emailValue ? emailValue.toLowerCase() : null,
        no_telp || null,
        'Administrator Departemen',
        'worker',
        true,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Akun Administrator Departemen berhasil dibuat.',
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}