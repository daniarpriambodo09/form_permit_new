// app/api/forms/height-work/by-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')?.trim().toUpperCase();
  if (!token) return NextResponse.json({ error: 'token wajib' }, { status: 400 });
  try {
    const row = await queryOne(`SELECT * FROM form_kerja_ketinggian WHERE edit_token = $1`, [token]);
    if (!row) return NextResponse.json({ found: false, error: 'Form tidak ditemukan' }, { status: 404 });
    if (!['rejected', 'draft'].includes(row.status))
      return NextResponse.json({ found: false, error: `Status "${row.status}" tidak bisa diedit` }, { status: 403 });
    return NextResponse.json({ found: true, data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}