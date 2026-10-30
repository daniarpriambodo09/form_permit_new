// app/api/forms/general-permit/[id]/job-forms/route.ts
// Return job-type form (hot-work/height-work/workshop) yang sudah terhubung
// ke satu Ijin Kerja Eksternal (general-permit), dipakai DetailModal untuk
// menampilkan daftar form terkait dan menambahkan izin pekerjaan khusus.

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [hotWork, heightWork, workshop] = await Promise.all([
      query(
        `SELECT id_form, status, tanggal FROM form_kerja_panas WHERE id_ijin_kerja = $1 ORDER BY tanggal ASC`,
        [id]
      ),
      query(
        `SELECT id_form, status, tanggal FROM form_kerja_ketinggian WHERE id_ijin_kerja = $1 ORDER BY tanggal ASC`,
        [id]
      ),
      query(
        `SELECT id_form, status, tanggal FROM form_kerja_workshop WHERE id_ijin_kerja = $1 ORDER BY tanggal ASC`,
        [id]
      ),
    ]);

    const hwItems = hotWork.map((r) => ({ ...r, jenis: 'hot-work' }));
    const hewItems = heightWork.map((r) => ({ ...r, jenis: 'height-work' }));
    const wsItems = workshop.map((r) => ({ ...r, jenis: 'workshop' }));

    return NextResponse.json({
      success: true,
      data: {
        // Backward-compatibility: first item
        hotWork:    hwItems[0]    ?? null,
        heightWork: hewItems[0]   ?? null,
        workshop:   wsItems[0]    ?? null,
        // Full array support for multiple attachments of each type
        items: {
          hotWork:    hwItems,
          heightWork: hewItems,
          workshop:   wsItems,
        },
        all: [...hwItems, ...hewItems, ...wsItems],
      },
    });
  } catch (err: any) {
    console.error('[GET /api/forms/general-permit/[id]/job-forms]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
