// app/api/upload/master-lisence/route.ts
// Upload file lisence pekerja (PDF atau foto JPG/PNG/WebP), maks 5 MB.
//
// FIX BUG: sebelumnya file disimpan di public/uploads/master-lisence/,
// tapi Next.js hanya menyajikan isi folder public/ pada saat BUILD —
// file yang ditulis saat runtime (setelah build) tidak pernah bisa
// diakses lewat URL. Sekarang file disimpan di folder `storage/uploads/`
// di LUAR public/, dan disajikan lewat route API tersendiri:
// GET /api/files/master-lisence/[filename] (lihat file route di sebelah).
//
// PENTING: tambahkan folder `storage/` ke .gitignore project Anda
// (mis. `storage/uploads/`) supaya file upload tidak ikut ter-commit.
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { verifyToken, COOKIE_NAME, type JWTPayload } from "@/lib/auth";

function getAuthUser(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_PDF_TYPES = ["application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Folder penyimpanan HARUS sama dengan yang dipakai di
// app/api/files/master-lisence/[filename]/route.ts
const STORAGE_DIR = path.join(process.cwd(), "storage", "uploads", "master-lisence");

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Ukuran file maksimal 5 MB" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isPdf = ALLOWED_PDF_TYPES.includes(file.type);
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: "Hanya file JPG, PNG, WebP, atau PDF yang diperbolehkan" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = isPdf ? "pdf" : (file.type.split("/")[1] || "jpg");
    const generatedFileName = `${randomUUID()}.${ext}`;

    // ── SIMPAN FILE (di luar public/) ───────────────────────────
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(path.join(STORAGE_DIR, generatedFileName), bytes);

    // URL disajikan lewat route API, bukan static path public/.
    // Sesuaikan basePath "/form-permit" jika basePath project Anda berbeda.
    const url = `/form-permit/api/files/master-lisence/${generatedFileName}`;
    // ─────────────────────────────────────────────────────────────

    return NextResponse.json({
      url,
      fileType: isPdf ? "pdf" : "image",
      fileName: file.name,
    });
  } catch (err) {
    console.error("POST /api/upload/master-lisence error:", err);
    return NextResponse.json({ error: "Upload gagal, coba lagi" }, { status: 500 });
  }
}