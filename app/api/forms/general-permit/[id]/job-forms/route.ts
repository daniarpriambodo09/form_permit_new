// app/api/forms/general-permit/[id]/job-forms/route.ts
// Return job-type form (hot-work/height-work/workshop) yang sudah terhubung
// ke satu Ijin Kerja Eksternal (general-permit), dipakai DetailModal untuk
// menampilkan daftar form terkait dan menentukan jenis apa yang masih boleh
// ditambahkan (maksimal 1 form per jenis per ijin kerja eksternal).

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
        `SELECT id_form, status, tanggal FROM form_kerja_panas WHERE id_ijin_kerja = $1`,
        [id]
      ),
      query(
        `SELECT id_form, status, tanggal FROM form_kerja_ketinggian WHERE id_ijin_kerja = $1`,
        [id]
      ),
      query(
        `SELECT id_form, status, tanggal FROM form_kerja_workshop WHERE id_ijin_kerja = $1`,
        [id]
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        hotWork:    hotWork[0]    ? { ...hotWork[0], jenis: 'hot-work' }       : null,
        heightWork: heightWork[0] ? { ...heightWork[0], jenis: 'height-work' } : null,
        workshop:   workshop[0]   ? { ...workshop[0], jenis: 'workshop' }      : null,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/forms/general-permit/[id]/job-forms]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}