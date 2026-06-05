// app/api/upload/jsa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.xlsx', '.xls'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `Ukuran file maksimal ${MAX_SIZE_MB} MB` }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Hanya PDF, XLSX, atau XLS.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName  = `jsa_${timestamp}_${safeName}`;

    // ✅ Simpan ke folder fisik: public/uploads/jsa/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'jsa');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    // ✅ Kembalikan URL API Route (dengan basePath /form-permit)
    const url = `/form-permit/api/upload/jsa/${fileName}`;

    return NextResponse.json({ url, filename: file.name }, { status: 200 });
  } catch (err: any) {
    console.error('[POST /api/upload/jsa]', err);
    return NextResponse.json({ error: err.message || 'Upload gagal' }, { status: 500 });
  }
}