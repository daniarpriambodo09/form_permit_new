import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { actual_tanggal_kerja, actualTanggalKerja } = body;
    const actualDate = actual_tanggal_kerja !== undefined ? actual_tanggal_kerja : actualTanggalKerja;

    const updated = await queryOne(
      `UPDATE form_ijin_kerja
       SET actual_tanggal_kerja = $1, updated_at = NOW()
       WHERE id_form = $2
       RETURNING id_form, status, actual_tanggal_kerja`,
      [actualDate ? new Date(actualDate).toISOString() : null, id]
    );

    if (!updated) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[PATCH /api/forms/general-permit/[id]/actual-date]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}

