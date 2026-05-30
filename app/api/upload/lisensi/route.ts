// app/api/upload/lisensi/route.ts
// Upload foto lisensi petugas ketinggian.
// Menyimpan file ke /uploads/lisensi/ (di luar /public — tidak di-serve statis).
// File diakses via /api/files/lisensi/[...path] bukan URL statis.

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const MAX_SIZE      = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Simpan di luar /public — di root project agar tidak ikut di-cache build
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'lisensi');

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

    // Folder tujuan: <project_root>/uploads/lisensi/<formId>/
    // (BUKAN di /public — agar tidak bergantung pada static file serving)
    const uploadDir = path.join(UPLOAD_ROOT, formId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Tulis file ke disk — SATU KALI saja
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    // URL yang dikembalikan ke frontend → mengarah ke API file server
    // bukan ke /public/... yang tidak bekerja di production runtime
    const publicUrl = `/form-permit/api/files/lisensi/${formId}/${fileName}`;

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

    // Keamanan: hanya izinkan path dari endpoint file server ini
    if (!url.includes('/api/files/lisensi/')) {
      return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
    }

    // Ekstrak relative path setelah /api/files/lisensi/
    const relativePath = url.split('/api/files/lisensi/')[1];
    if (!relativePath) {
      return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
    }

    const diskPath = path.join(UPLOAD_ROOT, relativePath);

    // Path traversal guard
    if (!diskPath.startsWith(UPLOAD_ROOT)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    await fs.unlink(diskPath).catch(() => {}); // abaikan jika sudah tidak ada

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}