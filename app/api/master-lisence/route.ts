// app/api/master-lisence/route.ts
// Master Lisence Pekerja — List (GET) & Tambah Baru (POST)
// Hanya role 'admin' yang boleh mengakses endpoint ini.
//
// Menggunakan helper asli project: query()/queryOne() dari "@/lib/db",
// dan verifyToken() + COOKIE_NAME dari "@/lib/auth" (JWT disimpan di
// cookie httpOnly 'jai_auth_token', payload berisi userId & role).
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME, type JWTPayload } from "@/lib/auth";

const JENIS_KERJA_VALID = ["hot_work", "height_work", "workshop"] as const;

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

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await query<MasterLisenceRow>(
      `SELECT id, nama, nik, jenis_kerja, departemen, file_url, file_type, file_name,
              tanggal_exp, is_active, created_at, updated_at
         FROM master_lisence
        ORDER BY nama ASC, jenis_kerja ASC`
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("GET /api/master-lisence error:", err);
    return NextResponse.json({ error: "Gagal mengambil data lisence" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { nama, nik, jenisKerja, departemen, fileUrl, fileType, fileName, tanggalExp } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama pekerja wajib diisi" }, { status: 400 });
    }
    if (!nik || !String(nik).trim()) {
      return NextResponse.json({ error: "NIK wajib diisi" }, { status: 400 });
    }
    if (!departemen || !String(departemen).trim()) {
      return NextResponse.json({ error: "Departemen wajib dipilih" }, { status: 400 });
    }
    if (!JENIS_KERJA_VALID.includes(jenisKerja)) {
      return NextResponse.json({ error: "Jenis kerja tidak valid" }, { status: 400 });
    }
    if (fileUrl && !["pdf", "image"].includes(fileType)) {
      return NextResponse.json({ error: "Tipe file lisence tidak valid" }, { status: 400 });
    }

    const row = await queryOne<MasterLisenceRow>(
      `INSERT INTO master_lisence
         (nama, nik, jenis_kerja, departemen, file_url, file_type, file_name, tanggal_exp, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       RETURNING id, nama, nik, jenis_kerja, departemen, file_url, file_type, file_name, tanggal_exp, is_active, created_at, updated_at`,
      [
        String(nama).trim(),
        String(nik).trim(),
        jenisKerja,
        String(departemen).trim(),
        fileUrl || null,
        fileType || null,
        fileName ?? null,
        tanggalExp || null,
        user.userId,
      ]
    );

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (err: any) {
    // Unique violation (nik + jenis_kerja) → pekerja sudah punya lisence jenis ini
    if (err?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Pekerja dengan NIK ini sudah memiliki lisence untuk jenis kerja tersebut. Gunakan tombol Edit pada tabel untuk memperbarui datanya.",
        },
        { status: 409 }
      );
    }
    console.error("POST /api/master-lisence error:", err);
    return NextResponse.json({ error: "Gagal menyimpan data lisence" }, { status: 500 });
  }
}