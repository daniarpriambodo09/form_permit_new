// app/api/files/master-lisence/[filename]/route.ts
// Menyajikan file lisence (gambar/PDF) yang di-upload SAAT RUNTIME.
//
// LATAR BELAKANG BUG SEBELUMNYA:
// Next.js hanya menyajikan file yang ada di folder `public/` PADA SAAT
// BUILD ("Only assets that are in the public directory at build time
// will be served by Next.js. Files added at runtime won't be available.").
// Karena upload lisence terjadi setelah build (saat aplikasi jalan),
// file yang ditulis ke public/uploads/... TIDAK PERNAH bisa diakses lewat
// URL — makanya <img>/<iframe> selalu gagal load (broken image).
//
// FIX: file disimpan di folder di LUAR public/ (lihat upload route),
// lalu route API ini yang baca file dari disk dan mengembalikannya
// sebagai response dengan Content-Type yang sesuai. Karena ini route
// API biasa (bukan static file), file yang baru di-upload langsung bisa
// diakses tanpa perlu build ulang.
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { verifyToken, COOKIE_NAME, type JWTPayload } from "@/lib/auth";

function getAuthUser(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

const MIME_TYPES: Record<string, string> = {
  pdf:  "application/pdf",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
};

// Folder penyimpanan HARUS sama dengan yang dipakai di
// app/api/upload/master-lisence/route.ts
const STORAGE_DIR = path.join(process.cwd(), "storage", "uploads", "master-lisence");

interface RouteContext {
  params: Promise<{ filename: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // Butuh login (cookie sesi ikut terkirim otomatis oleh browser saat
    // <img>/<iframe> memuat URL same-origin ini, jadi tetap aman/terproteksi).
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await context.params;

    // Cegah path traversal — hanya izinkan format nama file hasil upload kita
    // (uuid v4 + ekstensi yang diizinkan).
    if (!/^[a-zA-Z0-9-]+\.(pdf|jpg|jpeg|png|webp)$/.test(filename)) {
      return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
    }

    const filePath = path.join(STORAGE_DIR, filename);
    const fileBuffer = await readFile(filePath);

    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("GET /api/files/master-lisence/[filename] error:", err);
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}