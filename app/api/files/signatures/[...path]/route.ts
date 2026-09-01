// app/api/files/signatures/[...path]/route.ts
// File server untuk tanda tangan yang diupload saat runtime (pola sama
// dengan /api/files/lisensi — file di luar /public tidak bisa di-serve
// statis oleh Next.js production, jadi harus dibaca manual dari disk).

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'signatures');

const MIME_TYPES: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
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

        const filePath = path.join(UPLOAD_ROOT, ...segments);

        // keamanan path traversal
        if (!filePath.startsWith(UPLOAD_ROOT)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        let fileBuffer: Buffer;
        try {
            fileBuffer = await fs.readFile(filePath);
        } catch {
            return new NextResponse('File tidak ditemukan', { status: 404 });
        }

        const ext = path.extname(filePath).slice(1).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

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