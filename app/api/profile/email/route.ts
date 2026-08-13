// app/api/profile/email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { query } from '@/lib/db';

// Regex validasi format email sederhana namun cukup ketat untuk kebutuhan umum.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const email: string = (body?.email ?? '').trim();

  // Validasi
  if (!email) {
    return NextResponse.json({ error: 'Email tidak boleh kosong.' }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
  }

  // Ambil email saat ini untuk perbandingan (bukan dari JWT karena email tidak disimpan di token).
  const current = await query<{ email: string | null }>(
    `SELECT email FROM users WHERE id = $1`,
    [payload.userId]
  );
  const currentEmail = current[0]?.email ?? null;

  if (currentEmail && currentEmail.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Email baru sama dengan email saat ini.' },
      { status: 400 }
    );
  }

  // Update database — SENGAJA tidak ada pengecekan unique, email boleh dipakai banyak akun.
  await query(`UPDATE users SET email = $1 WHERE id = $2`, [email, payload.userId]);

  return NextResponse.json({ message: 'Email berhasil diubah.', email });
}