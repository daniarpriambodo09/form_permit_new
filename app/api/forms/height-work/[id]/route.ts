// app/api/forms/height-work/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// ── GET: Detail satu form ──────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const row = await queryOne(
      `SELECT * FROM form_kerja_ketinggian WHERE id_form = $1`,
      [params.id]
    );
    if (!row) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update status (misal: approve/reject) ──────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status } = body;

    const validStatus = ['draft', 'submitted', 'approved', 'rejected'];
    if (!validStatus.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const updated = await queryOne(
      `UPDATE form_kerja_ketinggian
       SET status = $1, updated_at = NOW()
       WHERE id_form = $2
       RETURNING id_form, status`,
      [status, params.id]
    );

    if (!updated) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}