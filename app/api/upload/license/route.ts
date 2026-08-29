import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "license");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${MAX_SIZE_MB} MB` },
        { status: 400 }
      );
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Hanya JPG, PNG, WebP, atau PDF." },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `license_${Date.now()}_${safeName}`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      url: `/form-permit/api/upload/license/${fileName}`,
      filename: file.name,
    });
  } catch (error: unknown) {
    console.error("[POST /api/upload/license]", error);
    const message = error instanceof Error ? error.message : "Upload gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
