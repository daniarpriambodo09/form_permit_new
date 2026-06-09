// app/api/profile/password/route.ts
// FIX: Update password_encrypted bersamaan dengan kolom password (bcrypt).
//      Sebelumnya hanya kolom `password` yang diupdate, sehingga fitur
//      "Lihat Password" di /admin-users selalu mengembalikan NO_ENCRYPTED_PASSWORD
//      setelah user mengganti password.

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword, hashPassword, COOKIE_NAME } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { encryptPassword } from '@/lib/crypto';

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
  const oldPassword: string = body?.oldPassword ?? '';
  const newPassword: string = body?.newPassword ?? '';

  if (!oldPassword) {
    return NextResponse.json({ error: 'Password lama wajib diisi.' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 });
  }

  // Ambil hash password dari DB
  const user = await queryOne<{ password: string }>(
    `SELECT password FROM users WHERE id = $1`,
    [payload.userId]
  );
  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
  }

  const valid = await verifyPassword(oldPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'Password lama tidak cocok.' }, { status: 400 });
  }

  // ── Buat hash bcrypt + enkripsi AES baru ─────────────────────
  // newHash         → untuk login (bcrypt, one-way) — tidak berubah dari sebelumnya
  // encryptedPassword → untuk fitur "Lihat Password" (AES-GCM, reversible) — FIX
  const newHash          = await hashPassword(newPassword);
  const encryptedPassword = encryptPassword(newPassword);

  // Update kedua kolom sekaligus dalam satu query
  await query(
    `UPDATE users SET password = $1, password_encrypted = $2 WHERE id = $3`,
    [newHash, encryptedPassword, payload.userId]
  );

  return NextResponse.json({ message: 'Password berhasil diubah.' });
}