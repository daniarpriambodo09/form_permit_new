// app/api/auth/register/route.ts
// UPDATED: Email wajib diisi (tidak boleh kosong).
//          Simpan password_encrypted (AES-256-GCM) bersamaan dengan hash bcrypt.
//          Kolom password_encrypted TIDAK dipakai untuk login.
//          Login tetap menggunakan kolom password (bcrypt hash).
//          NIK wajib diisi (hanya angka, 4-20 digit).

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, verifyToken, COOKIE_NAME } from '@/lib/auth';
import { encryptPassword } from '@/lib/crypto';

const ALLOWED_DEPARTMENTS = [
  "QA", "ENG", "MTC", "PRODUKSI",
  "NYS", "FATP-Exim", "MPC-WHS", "PGA",
] as const;

export async function POST(req: NextRequest) {
  // ── Autentikasi ──────────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Akses ditolak. Login terlebih dahulu.' },
      { status: 403 }
    );
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 403 });
  }

  const { role, userId } = payload;

  // ── Otorisasi: hanya admin dan spv ──────────────────────────
  if (role !== 'admin' && role !== 'spv') {
    return NextResponse.json(
      { error: 'Akses ditolak. Hanya admin atau SPV yang dapat membuat akun.' },
      { status: 403 }
    );
  }

  try {
    const { nama, username, perusahaan, departmen: bodyDepartmen, email, nik, no_telp, password } =
      await req.json();

    // ── Tentukan departmen yang akan dipakai ─────────────────
    let finalDepartmen: string;

    if (role === 'spv') {
      const spvRow = await queryOne<{ departmen: string | null }>(
        `SELECT departmen FROM users WHERE id = $1`,
        [userId]
      );
      const spvDepartmen = spvRow?.departmen ?? null;
      if (!spvDepartmen) {
        return NextResponse.json(
          { error: 'Akun SPV Anda tidak memiliki departemen. Hubungi administrator.' },
          { status: 403 }
        );
      }
      finalDepartmen = spvDepartmen;
    } else {
      if (!bodyDepartmen) {
        return NextResponse.json({ error: 'Departemen wajib dipilih' }, { status: 400 });
      }
      if (!(ALLOWED_DEPARTMENTS as readonly string[]).includes(bodyDepartmen)) {
        return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
      }
      finalDepartmen = bodyDepartmen;
    }

    // ── Validasi password ────────────────────────────────────
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // ── Validasi username ────────────────────────────────────
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username harus 3-20 karakter, hanya huruf, angka, dan underscore' },
        { status: 400 }
      );
    }

    // ── Validasi email — WAJIB DIISI ─────────────────────────
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    }
    const emailValue = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }
    // CATATAN: Duplikat email DIIZINKAN — tidak ada cek unique di sini.

    // ── Validasi NIK — WAJIB DIISI, hanya angka, 4-20 digit ──
    if (!nik || typeof nik !== 'string' || nik.trim() === '') {
      return NextResponse.json({ error: 'NIK wajib diisi' }, { status: 400 });
    }
    const nikValue = nik.trim();
    const nikRegex = /^[0-9]{4,20}$/;
    if (!nikRegex.test(nikValue)) {
      return NextResponse.json({ error: 'Format NIK tidak valid' }, { status: 400 });
    }

    // ── Cek duplikat username ────────────────────────────────
    const existingUsername = await queryOne(
      `SELECT id FROM users WHERE username = $1`,
      [username.toLowerCase().trim()]
    );
    if (existingUsername) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    // ── Hash + enkripsi password ─────────────────────────────
    // hashedPassword → untuk login (bcrypt, one-way)
    // encryptedPassword → untuk fitur "Lihat Password" (AES-GCM, reversible)
    const hashedPassword    = await hashPassword(password);
    const encryptedPassword = encryptPassword(password);

    await query(
      `INSERT INTO users
         (username, password, password_encrypted, nama, nik, perusahaan, departmen,
          email, no_telp, jabatan, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        username.toLowerCase().trim(),
        hashedPassword,
        encryptedPassword,           // AES-GCM — BUKAN untuk login
        nama,
        nikValue,
        perusahaan,
        finalDepartmen,
        emailValue,
        no_telp || null,
        'Administrator Departemen',
        'worker',
        true,
      ]
    );

    return NextResponse.json({
      success:   true,
      message:   'Akun Administrator Departemen berhasil dibuat.',
      departmen: finalDepartmen,
    }, { status: 201 });

  } catch (err: unknown) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}