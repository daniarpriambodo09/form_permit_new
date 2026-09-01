// app/api/upload/signature/route.ts
// Upload tanda tangan (kontraktor / security) sebagai gambar PNG.
// Menyimpan file ke /uploads/signatures/ (di luar /public), disajikan
// via /api/files/signatures/[...path] — pola identik dengan upload lisensi.

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB cukup untuk PNG tanda tangan
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'signatures');

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const context = String(formData.get('context') || 'sign').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipe file tidak valid. Hanya PNG, JPG, atau WebP.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran file melebihi batas 2 MB' }, { status: 400 });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const timestamp = Date.now();
    const fileName = `${context}_${timestamp}.${ext}`;

    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(UPLOAD_ROOT, fileName), buffer);

    const publicUrl = `/form-permit/api/files/signatures/${fileName}`;
    return NextResponse.json({ success: true, url: publicUrl, fileName });
  } catch (err: any) {
    console.error('[POST /api/upload/signature]', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}