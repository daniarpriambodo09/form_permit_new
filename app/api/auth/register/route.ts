// app/api/auth/register/route.ts
// UPDATED: SPV dapat membuat Administrator Departemen untuk departemennya sendiri.
//
// Behavior:
//   role = admin  → boleh pilih departemen bebas (seperti sebelumnya)
//   role = spv    → departemen DIPAKSA = departmen SPV dari DB
//                   (field 'departmen' dari request body diabaikan)
//   role lain     → 403

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
    const { nama, username, perusahaan, departmen: bodyDepartmen, email, no_telp, password } =
      await req.json();

    // ── Tentukan departmen yang akan dipakai ─────────────────
    let finalDepartmen: string;

    if (role === 'spv') {
      // SPV: ambil departmen dari DB — ABAIKAN bodyDepartmen
      // Ini mencegah privilege escalation meski request dimanipulasi
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
      // Admin: gunakan departmen dari body, validasi seperti semula
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

    // ── Validasi email (opsional) ────────────────────────────
    const emailValue: string | null =
      email && typeof email === 'string' && email.trim() !== ''
        ? email.trim()
        : null;

    if (emailValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
      }
    }

    // ── Cek duplikat username ────────────────────────────────
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
        finalDepartmen,                                // selalu dari DB untuk SPV
        emailValue ? emailValue.toLowerCase() : null,
        no_telp || null,
        'Administrator Departemen',
        'worker',
        true,
      ]
    );

    return NextResponse.json({
      success:    true,
      message:    'Akun Administrator Departemen berhasil dibuat.',
      departmen:  finalDepartmen,                      // kembalikan ke frontend untuk konfirmasi
    }, { status: 201 });

  } catch (err: unknown) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}