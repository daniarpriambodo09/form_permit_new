// app/api/upload/lisensi/route.ts
// Upload foto lisensi petugas ketinggian.
// Menyimpan file ke /public/uploads/lisensi/ (filesystem lokal).
// Tidak menggunakan Supabase sama sekali.

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const MAX_SIZE     = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── POST: Upload foto lisensi ─────────────────────────────────
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file     = formData.get('file')  as File   | null;
    const indexStr = formData.get('index') as string | null;
    const formId   = (formData.get('formId') as string | null) || 'temp';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validasi tipe
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak valid. Hanya JPG, PNG, atau WebP.' },
        { status: 400 }
      );
    }

    // Validasi ukuran
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas 5 MB' },
        { status: 400 }
      );
    }

    // Buat nama file unik
    const ext          = file.type === 'image/png'  ? 'png'
                       : file.type === 'image/webp' ? 'webp'
                       : 'jpg';
    const petugasIndex = indexStr ? indexStr.padStart(2, '0') : '01';
    const timestamp    = Date.now();
    const fileName     = `petugas_${petugasIndex}_${timestamp}.${ext}`;

    // Folder tujuan: public/uploads/lisensi/<formId>/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'lisensi', formId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Tulis file ke disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    // URL publik yang bisa diakses browser
    const publicUrl = `/uploads/lisensi/${formId}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl, fileName });

  } catch (err: any) {
    console.error('[POST /api/upload/lisensi]', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// ── DELETE: Hapus foto lisensi dari disk ──────────────────────
export async function DELETE(req: NextRequest) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL file wajib diisi' }, { status: 400 });
    }

    // Keamanan: hanya izinkan path di dalam /uploads/lisensi/
    if (!url.startsWith('/uploads/lisensi/')) {
      return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
    }

    const diskPath = path.join(process.cwd(), 'public', url);
    await fs.unlink(diskPath).catch(() => {}); // abaikan jika sudah tidak ada

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}