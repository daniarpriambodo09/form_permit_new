// app/api/admin-users/[id]/password/route.ts
// GET: Kembalikan password plaintext (hasil decrypt) untuk satu user.
//
// Otorisasi:
//   admin → dapat melihat password SEMUA worker DAN approver
//   spv   → hanya dapat melihat password worker dari departemennya sendiri
//   lain  → 403
//
// Flow:
//   1. Validasi JWT cookie
//   2. Tentukan role & userId dari token
//   3. Ambil record user target dari DB
//   4. Validasi hak akses (role + departmen untuk SPV)
//   5. Decrypt password_encrypted dengan AES-256-GCM
//   6. Return plaintext
//
// TIDAK ADA password di endpoint list (/api/admin-users GET).
// Password hanya dikirim melalui endpoint ini, satu per satu, saat diminta.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { decryptPassword } from '@/lib/crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Autentikasi ──────────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jwtPayload = verifyToken(token);
  if (!jwtPayload) {
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 401 });
  }

  const callerRole   = jwtPayload.role;
  const callerUserId = jwtPayload.userId;

  // ── Otorisasi: hanya admin dan spv ──────────────────────────
  if (callerRole !== 'admin' && callerRole !== 'spv') {
    return NextResponse.json(
      { error: 'Akses ditolak.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const targetId = parseInt(id, 10);
  if (isNaN(targetId)) {
    return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 });
  }

  try {
    // ── Ambil data user target ───────────────────────────────
    const targetUser = await queryOne<{
      id:                 number;
      role:               string;
      departmen:          string | null;
      password_encrypted: string | null;
    }>(
      `SELECT id, role, departmen, password_encrypted FROM users WHERE id = $1`,
      [targetId]
    );

    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
    }

    // ── Validasi hak akses per role ──────────────────────────
    if (callerRole === 'spv') {
      // SPV hanya boleh lihat password worker (bukan approver)
      if (targetUser.role !== 'worker') {
        return NextResponse.json(
          { error: 'SPV hanya dapat melihat password akun worker.' },
          { status: 403 }
        );
      }

      // SPV hanya boleh lihat worker dari departemennya sendiri
      const spvRow = await queryOne<{ departmen: string | null }>(
        `SELECT departmen FROM users WHERE id = $1`,
        [callerUserId]
      );
      const spvDepartmen = spvRow?.departmen ?? null;

      if (!spvDepartmen || targetUser.departmen !== spvDepartmen) {
        return NextResponse.json(
          { error: 'Akses ditolak. User ini bukan dari departemen Anda.' },
          { status: 403 }
        );
      }
    }
    // Admin tidak ada pembatasan tambahan — bisa lihat semua

    // ── Cek apakah password_encrypted tersedia ───────────────
    if (!targetUser.password_encrypted) {
      return NextResponse.json(
        {
          error:    'Password tidak tersedia.',
          detail:   'Akun ini dibuat sebelum fitur enkripsi password diaktifkan. ' +
                    'Minta user reset password untuk mengaktifkan fitur ini.',
          code:     'NO_ENCRYPTED_PASSWORD',
        },
        { status: 404 }
      );
    }

    // ── Decrypt ──────────────────────────────────────────────
    let plaintext: string;
    try {
      plaintext = decryptPassword(targetUser.password_encrypted);
    } catch (decryptErr) {
      console.error('[password/route] Decrypt error:', decryptErr);
      return NextResponse.json(
        { error: 'Gagal mendekripsi password. Hubungi administrator.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ password: plaintext }, { status: 200 });

  } catch (err: unknown) {
    console.error(`[GET /api/admin-users/${id}/password]`, err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}