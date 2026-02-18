// app/api/approval/[jenisForm]/[id]/route.ts
// FIX: Next.js 15+ — params adalah Promise, harus di-await dulu

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const TABLE_MAP: Record<string, string> = {
  'hot-work':    'form_kerja_panas',
  'workshop':    'form_kerja_workshop',
  'height-work': 'form_kerja_ketinggian',
};

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Next.js 15+: params adalah Promise
type Params = { params: Promise<{ jenisForm: string; id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ✅ await params sebelum diakses
  const { jenisForm, id } = await params;

  const table = TABLE_MAP[jenisForm];
  if (!table) return NextResponse.json({ error: 'Jenis form tidak valid' }, { status: 400 });

  try {
    const row = await queryOne(`SELECT * FROM ${table} WHERE id_form = $1`, [id]);
    if (!row) return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ✅ await params sebelum diakses
  const { jenisForm, id } = await params;

  const table = TABLE_MAP[jenisForm];
  if (!table) return NextResponse.json({ error: 'Jenis form tidak valid' }, { status: 400 });

  try {
    const { action, catatan_reject } = await req.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action harus "approve" atau "reject"' }, { status: 400 });
    }
    if (action === 'reject' && !catatan_reject?.trim()) {
      return NextResponse.json({ error: 'Catatan alasan penolakan wajib diisi' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now       = new Date().toISOString();

    await query(
      `UPDATE ${table}
       SET status         = $1,
           approved_by    = $2,
           approved_at    = $3,
           catatan_reject = $4,
           updated_at     = $3
       WHERE id_form = $5`,
      [
        newStatus,
        user.nama,
        now,
        action === 'reject' ? catatan_reject.trim() : null,
        id,
      ]
    );

    return NextResponse.json({
      success:     true,
      id_form:     id,
      status:      newStatus,
      action,
      approved_by: user.nama,
      approved_at: now,
    });
  } catch (err: any) {
    console.error(`[PATCH /api/approval/${jenisForm}/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}