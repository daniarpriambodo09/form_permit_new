// app/api/master-lisence/workers/route.ts
// GET /api/master-lisence/workers?jenisKerja=height_work&departemen=QA
//
// Dipakai oleh halaman form (mis. app/form/height-work/page.tsx Bagian 2)
// untuk menampilkan dropdown pekerja yang SUDAH terdaftar di Master
// Lisence sesuai jenis kerja & departemen tertentu, lengkap dengan info
// lisence-nya (untuk ditampilkan/lihat langsung di form).
//
// TIDAK dibatasi hanya admin — worker/spv/dst yang mengisi form kerja
// juga perlu mengaksesnya, jadi cukup wajib login (role apa pun).
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken, COOKIE_NAME, type JWTPayload } from "@/lib/auth";

function getAuthUser(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

const JENIS_KERJA_VALID = ["hot_work", "height_work", "workshop"];

interface WorkerRow {
  nik: string;
  nama: string;
  departemen: string | null;
  jenis_kerja: string;
  file_url: string;
  file_type: string;
  tanggal_exp: string;
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jenisKerja = searchParams.get("jenisKerja");
    const departemen = searchParams.get("departemen");

    if (!jenisKerja || !JENIS_KERJA_VALID.includes(jenisKerja)) {
      return NextResponse.json({ error: "Parameter jenisKerja wajib diisi dan valid" }, { status: 400 });
    }

    const conditions: string[] = ["jenis_kerja = $1"];
    const params: any[] = [jenisKerja];

    if (departemen) {
      params.push(departemen);
      conditions.push(`departemen = $${params.length}`);
    }

    const rows = await query<WorkerRow>(
      `SELECT nik, nama, departemen, jenis_kerja, file_url, file_type, tanggal_exp
         FROM master_lisence
        WHERE ${conditions.join(" AND ")}
        ORDER BY nama ASC`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("GET /api/master-lisence/workers error:", err);
    return NextResponse.json({ error: "Gagal mengambil data pekerja" }, { status: 500 });
  }
}