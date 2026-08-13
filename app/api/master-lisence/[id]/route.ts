// app/api/master-lisence/[id]/route.ts
// Master Lisence Pekerja — Detail (GET), Update (PUT), Hapus (DELETE)
// Hanya role 'admin' yang boleh mengakses endpoint ini.
//
// CATATAN Next.js 16: `params` pada route handler sekarang berupa
// Promise, jadi setiap handler wajib `await params` sebelum dipakai.
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME, type JWTPayload } from "@/lib/auth";

function getAuthUser(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

interface MasterLisenceRow {
  id: number;
  nama: string;
  nik: string;
  jenis_kerja: string;
  departemen: string | null;
  file_url: string;
  file_type: string;
  file_name: string | null;
  tanggal_exp: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;

    const row = await queryOne<MasterLisenceRow>(
      `SELECT id, nama, nik, jenis_kerja, departemen, file_url, file_type, file_name,
              tanggal_exp, is_active, created_at, updated_at
         FROM master_lisence
        WHERE id = $1`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: "Data lisence tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("GET /api/master-lisence/[id] error:", err);
    return NextResponse.json({ error: "Gagal mengambil data lisence" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const body = await req.json();
    // fileUrl/fileType/fileName bersifat opsional saat edit — hanya diisi
    // jika admin mengganti/upload ulang file lisence. Jika tidak, file lama
    // tetap dipertahankan lewat COALESCE di query UPDATE.
    const { nama, nik, departemen, fileUrl, fileType, fileName, tanggalExp } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama pekerja wajib diisi" }, { status: 400 });
    }
    if (!nik || !String(nik).trim()) {
      return NextResponse.json({ error: "NIK wajib diisi" }, { status: 400 });
    }
    if (!departemen || !String(departemen).trim()) {
      return NextResponse.json({ error: "Departemen wajib dipilih" }, { status: 400 });
    }
    if (!tanggalExp) {
      return NextResponse.json({ error: "Tanggal exp lisence wajib diisi" }, { status: 400 });
    }
    if (fileUrl && !["pdf", "image"].includes(fileType)) {
      return NextResponse.json({ error: "Tipe file lisence tidak valid" }, { status: 400 });
    }

    const row = await queryOne<MasterLisenceRow>(
      `UPDATE master_lisence
          SET nama        = $1,
              nik         = $2,
              departemen  = $3,
              tanggal_exp = $4,
              file_url    = COALESCE($5, file_url),
              file_type   = COALESCE($6, file_type),
              file_name   = COALESCE($7, file_name),
              updated_by  = $8
        WHERE id = $9
        RETURNING id, nama, nik, jenis_kerja, departemen, file_url, file_type, file_name, tanggal_exp, is_active, created_at, updated_at`,
      [
        String(nama).trim(),
        String(nik).trim(),
        String(departemen).trim(),
        tanggalExp,
        fileUrl ?? null,
        fileType ?? null,
        fileName ?? null,
        user.userId,
        id,
      ]
    );

    if (!row) {
      return NextResponse.json({ error: "Data lisence tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "NIK tersebut sudah terdaftar untuk jenis kerja yang sama pada baris lain." },
        { status: 409 }
      );
    }
    console.error("PUT /api/master-lisence/[id] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui data lisence" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;

    const row = await queryOne<{ id: number }>(
      `DELETE FROM master_lisence WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: "Data lisence tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/master-lisence/[id] error:", err);
    return NextResponse.json({ error: "Gagal menghapus data lisence" }, { status: 500 });
  }
}