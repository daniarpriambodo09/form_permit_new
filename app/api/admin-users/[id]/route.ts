import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Akses ditolak. Login sebagai admin terlebih dahulu.' },
      { status: 403 }
    );
  }

  const payload = verifyToken(token);

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { error: 'Akses ditolak. Hanya admin yang dapat menghapus akun.' },
      { status: 403 }
    );
  }

  const targetId = Number(id);

  if (isNaN(targetId) || targetId <= 0) {
    return NextResponse.json(
      { error: 'ID tidak valid.' },
      { status: 400 }
    );
  }

  if (targetId === payload.userId) {
    return NextResponse.json(
      { error: 'Tidak dapat menghapus akun Anda sendiri.' },
      { status: 400 }
    );
  }

  const user = await queryOne(
    `SELECT id, nama, username, role
     FROM users
     WHERE id = $1`,
    [targetId]
  );

  if (!user) {
    return NextResponse.json(
      { error: 'Akun tidak ditemukan.' },
      { status: 404 }
    );
  }

  await query(
    `DELETE FROM users WHERE id = $1`,
    [targetId]
  );

  return NextResponse.json({
    message: `Akun "${user.nama}" (${user.username}) berhasil dihapus.`,
  });
}