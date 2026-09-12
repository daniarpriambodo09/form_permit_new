import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Hanya admin yang bisa mengubah pengawas' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const nama = String(body.nama ?? '').trim();
    const nik = String(body.nik ?? '').trim();
    const departemen = String(body.departemen ?? '').trim();
    const isActive = body.isActive !== undefined ? !!body.isActive : true;
    if (!nama || !nik || !departemen) {
      return NextResponse.json({ error: 'Nama, NIK, dan departemen wajib diisi' }, { status: 400 });
    }
    const updated = await queryOne(
      `UPDATE pengawas_departemen
       SET nama = $1, nik = $2, departemen = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, nama, nik, departemen, is_active, created_at, updated_at`,
      [nama, nik, departemen, isActive, id]
    );
    if (!updated) return NextResponse.json({ error: 'Pengawas tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[PUT /api/pengawas-departemen/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Hanya admin yang bisa menghapus pengawas' }, { status: 403 });

  try {
    const { id } = await params;
    const deleted = await queryOne(
      `DELETE FROM pengawas_departemen WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!deleted) return NextResponse.json({ error: 'Pengawas tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/pengawas-departemen/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
