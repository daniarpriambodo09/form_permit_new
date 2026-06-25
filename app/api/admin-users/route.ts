// app/api/admin-users/route.ts
// UPDATED: SPV dapat mengakses endpoint ini untuk melihat Administrator Departemen
//          milik departemennya sendiri.
// UPDATED: Tambah field `nik` pada SELECT dan response JSON.
//
// Behavior:
//   role = admin  → mengembalikan semua worker (WHERE role='worker')
//   role = spv    → mengembalikan worker dari departemennya saja
//                   (WHERE role='worker' AND departmen = departmen_spv)
//   role lain     → 403

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
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
      { error: 'Akses ditolak. Hanya admin atau SPV yang dapat mengakses data ini.' },
      { status: 403 }
    );
  }

  try {
    // ── Admin: kembalikan semua worker ───────────────────────
    if (role === 'admin') {
      const rows = await query<{
        id:         number;
        nama:       string;
        username:   string;
        nik:        string | null;
        departmen:  string | null;
        perusahaan: string | null;
        email:      string | null;
        no_telp:    string | null;
        is_active:  boolean;
        created_at: string;
      }>(
        `SELECT id, nama, username, nik, departmen, perusahaan,
                email, no_telp, is_active, created_at
         FROM users
         WHERE role = 'worker'
         ORDER BY created_at DESC`,
        []
      );
      return NextResponse.json({ users: rows }, { status: 200 });
    }

    // ── SPV: kembalikan worker dari departemennya saja ───────
    // Ambil departmen SPV dari DB (bukan dari JWT yang bisa kedaluwarsa)
    const spvRow = await queryOne<{ departmen: string | null }>(
      `SELECT departmen FROM users WHERE id = $1`,
      [userId]
    );
    const spvDepartmen = spvRow?.departmen ?? null;

    if (!spvDepartmen) {
      // SPV tanpa departmen di DB — kembalikan kosong, bukan error
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const rows = await query<{
      id:         number;
      nama:       string;
      username:   string;
      nik:        string | null;
      departmen:  string | null;
      perusahaan: string | null;
      email:      string | null;
      no_telp:    string | null;
      is_active:  boolean;
      created_at: string;
    }>(
      `SELECT id, nama, username, nik, departmen, perusahaan,
              email, no_telp, is_active, created_at
       FROM users
       WHERE role = 'worker'
         AND departmen = $1
       ORDER BY created_at DESC`,
      [spvDepartmen]
    );

    // Sertakan info departmen SPV agar frontend bisa tampilkan label
    return NextResponse.json({
      users:          rows,
      spv_departmen:  spvDepartmen,
    }, { status: 200 });

  } catch (err: unknown) {
    console.error('[GET /api/admin-users]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}