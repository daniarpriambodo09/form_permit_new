// app/api/files/lisensi/[...path]/route.ts
// Menyajikan file lisensi (gambar/PDF) yang di-upload SAAT RUNTIME,
// disimpan di luar folder public/ (lihat catatan bug di route
// master-lisence untuk penjelasan lengkap kenapa ini perlu).
//
// CATATAN PENTING soal folder [...path] (catch-all):
// Next.js mewajibkan tipe `params` mengikuti nama & bentuk segmen folder.
// Untuk [filename]      → params: Promise<{ filename: string }>
// Untuk [...path]        → params: Promise<{ path: string[] }>   ← array!
// Error kamu terjadi karena kode di file ini masih memakai tipe
// `{ filename: string }` padahal foldernya catch-all `[...path]`.
//
// SESUAIKAN STORAGE_DIR di bawah ini dengan folder tempat file lisensi
// (height-work/hot-work/workshop) Anda simpan saat upload — harus SAMA
// PERSIS dengan yang dipakai di route upload lisensi Anda.
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

// Sesuaikan dengan folder penyimpanan asli upload lisensi Anda.
const STORAGE_DIR = path.join(process.cwd(), "storage", "uploads", "lisensi");

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: segments } = await context.params;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
    }

    // Setiap segmen hanya boleh karakter aman — mencegah path traversal (../..)
    const isSafe = segments.every((s) => /^[a-zA-Z0-9._-]+$/.test(s));
    if (!isSafe) {
      return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
    }

    const filePath = path.join(STORAGE_DIR, ...segments);

    // Pastikan hasil resolve tetap di dalam STORAGE_DIR (defense in depth).
    if (!filePath.startsWith(STORAGE_DIR)) {
      return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
    }

    const fileBuffer = await readFile(filePath);
    const lastSegment = segments[segments.length - 1];
    const ext = (lastSegment.split(".").pop() || "").toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("GET /api/files/lisensi/[...path] error:", err);
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}