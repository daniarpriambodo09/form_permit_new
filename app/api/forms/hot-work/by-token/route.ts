// app/api/forms/hot-work/by-token/route.ts
// GET publik — ambil satu form lengkap berdasarkan edit_token
// Digunakan oleh halaman edit untuk prefill form

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token')?.trim().toUpperCase();

  if (!token) {
    return NextResponse.json({ error: 'Parameter token wajib diisi' }, { status: 400 });
  }

  try {
    const row = await queryOne(
      `SELECT * FROM form_kerja_panas WHERE edit_token = $1`,
      [token]
    );

    if (!row) {
      return NextResponse.json({ found: false, error: 'Form tidak ditemukan' }, { status: 404 });
    }

    // Keamanan: hanya izinkan load jika status rejected atau draft
    if (!['rejected', 'draft'].includes(row.status)) {
      return NextResponse.json(
        { found: false, error: `Form dengan status "${row.status}" tidak bisa diedit` },
        { status: 403 }
      );
    }

    return NextResponse.json({ found: true, data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}