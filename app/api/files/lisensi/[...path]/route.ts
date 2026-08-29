// app/api/files/lisensi/[...path]/route.ts
// File server untuk foto lisensi yang diupload saat runtime.
//
// MENGAPA ENDPOINT INI DIPERLUKAN:
//   Next.js production (next start) hanya meng-serve file statis yang sudah
//   ada di /public saat `next build`. File yang ditulis ke disk setelah build
//   (hasil upload runtime) TIDAK bisa diakses via URL statis — browser dapat 404.
//   Endpoint ini membaca file langsung dari disk saat request datang,
//   sehingga bekerja di production tanpa perlu rebuild.
//
// Diakses via: GET /api/files/lisensi/<formId>/<fileName>
// File dibaca dari: <project_root>/uploads/lisensi/<formId>/<fileName>

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'lisensi');

const MIME_TYPES: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await context.params;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'Path tidak valid' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'lisensi', ...segments);

    // keamanan path traversal
    const root = path.join(process.cwd(), 'uploads', 'lisensi');
    if (!filePath.startsWith(root)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch {
      return new NextResponse('File tidak ditemukan', { status: 404 });
    }

    const ext = path.extname(filePath).slice(1).toLowerCase();

    const mimeTypes: any = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=86400',
      },
    });

  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}