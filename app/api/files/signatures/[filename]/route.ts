// app/api/files/signatures/[filename]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "signatures");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const safe = filename.replace(/[^a-zA-Z0-9_.-]/g, "");
  try {
    const buffer = await readFile(path.join(UPLOAD_DIR, safe));
    return new NextResponse(buffer, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}