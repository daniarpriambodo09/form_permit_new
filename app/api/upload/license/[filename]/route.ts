import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "license");
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    const extension = path.extname(filename).toLowerCase();
    if (!MIME_TYPES[extension]) {
      return NextResponse.json({ error: "Format file tidak valid" }, { status: 400 });
    }

    const fileBuffer = await fs.readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": MIME_TYPES[extension],
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[GET /api/upload/license/[filename]]", error);
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}
