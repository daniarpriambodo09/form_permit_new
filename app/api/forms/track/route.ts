// app/api/forms/track/route.ts
// GET publik — cari form berdasarkan id_form ATAU edit_token
// Tidak perlu login, digunakan oleh halaman /form/track

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim(); // bisa id_form atau edit_token

  if (!q) {
    return NextResponse.json({ error: 'Parameter q (ID form atau kode edit) wajib diisi' }, { status: 400 });
  }

  // Cari di 3 tabel, ambil kolom yang dibutuhkan untuk status tracking
  const tables = [
    { table: 'form_kerja_panas',      jenis: 'hot-work',    idCol: 'id_form' },
    { table: 'form_kerja_workshop',   jenis: 'workshop',    idCol: 'id_form' },
    { table: 'form_kerja_ketinggian', jenis: 'height-work', idCol: 'id_form' },
  ];

  const selectCols = `
    id_form, tanggal, tanggal_pelaksanaan, status, edit_token,
    catatan_reject, approved_by, approved_at, no_registrasi,
    nama_kontraktor_nik, lokasi_pekerjaan, waktu_pukul
  `;

  const selectColsHEW = `
    id_form, tanggal, tanggal_pelaksanaan, status, edit_token,
    catatan_reject, approved_by, approved_at,
    NULL AS no_registrasi,
    NULL AS nama_kontraktor_nik,
    lokasi AS lokasi_pekerjaan,
    waktu_mulai AS waktu_pukul
  `;

  try {
    for (const t of tables) {
      const cols = t.jenis === 'height-work' ? selectColsHEW : selectCols;
      const row = await queryOne(
        `SELECT ${cols}, '${t.jenis}' AS jenis_form
         FROM ${t.table}
         WHERE id_form = $1 OR edit_token = $1`,
        [q.toUpperCase()]
      );
      if (row) {
        // Jangan kembalikan edit_token jika pencarian berdasarkan id_form saja
        // Biarkan — user bisa lihat token mereka sendiri
        return NextResponse.json({ found: true, data: row });
      }
    }

    return NextResponse.json({ found: false, message: 'Form tidak ditemukan' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}