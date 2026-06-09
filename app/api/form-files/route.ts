// app/api/form-files/route.ts
// Endpoint khusus admin: kembalikan daftar semua form dari 3 tabel
// dengan kolom minimal untuk halaman /form-files.
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const results = await Promise.allSettled([
      // ── Hot Work ─────────────────────────────────────────────
      query(
        `SELECT
          id_form,
          'hot-work'            AS jenis_form,
          tanggal,
          tanggal_pelaksanaan,
          status,
          COALESCE(nama_kontraktor_nik, nama_pekerja_nik, '') AS pemohon,
          lokasi_pekerjaan      AS lokasi
        FROM form_kerja_panas
        ORDER BY tanggal DESC`,
        []
      ),
      // ── Workshop ─────────────────────────────────────────────
      query(
        `SELECT
          id_form,
          'workshop'            AS jenis_form,
          tanggal,
          tanggal_pelaksanaan,
          status,
          COALESCE(nama_kontraktor_nik, nama_pekerja_nik, '') AS pemohon,
          lokasi_pekerjaan      AS lokasi
        FROM form_kerja_workshop
        ORDER BY tanggal DESC`,
        []
      ),
      // ── Height Work ──────────────────────────────────────────
      query(
        `SELECT
          id_form,
          'height-work'         AS jenis_form,
          tanggal,
          tanggal_pelaksanaan,
          status,
          COALESCE(petugas_ketinggian, '') AS pemohon,
          lokasi
        FROM form_kerja_ketinggian
        ORDER BY tanggal DESC`,
        []
      ),
    ]);

    const hotWork    = results[0].status === "fulfilled" ? results[0].value : [];
    const workshop   = results[1].status === "fulfilled" ? results[1].value : [];
    const heightWork = results[2].status === "fulfilled" ? results[2].value : [];

    // Log errors jika ada
    if (results[0].status === "rejected") console.error("[form-files] hot-work:", results[0].reason);
    if (results[1].status === "rejected") console.error("[form-files] workshop:", results[1].reason);
    if (results[2].status === "rejected") console.error("[form-files] height-work:", results[2].reason);

    const all = [...hotWork, ...workshop, ...heightWork].sort(
      (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    return NextResponse.json({ data: all, total: all.length });
  } catch (err: any) {
    console.error("[form-files] unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}