// app/api/form-files/route.ts
// Endpoint khusus admin: kembalikan daftar semua form dari 4 tabel
// dengan kolom minimal untuk halaman /form-files.
// Job-forms (hot-work, workshop, height-work) yang terlampir pada form
// ijin-kerja-eksternal (id_ijin_kerja terisi) TIDAK dikembalikan sebagai baris
// terpisah di luar, melainkan dilampirkan di dalam record general-permit
// (linked_job_forms).
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
          lokasi_pekerjaan      AS lokasi,
          id_ijin_kerja
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
          lokasi_pekerjaan      AS lokasi,
          id_ijin_kerja
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
          lokasi,
          id_ijin_kerja
        FROM form_kerja_ketinggian
        ORDER BY tanggal DESC`,
        []
      ),
      // ── Ijin Kerja Eksternal (General Permit) ─────────────────
      query(
        `SELECT
          gp.id_form,
          'general-permit'      AS jenis_form,
          gp.tanggal,
          gp.tanggal_pelaksanaan,
          gp.status,
          COALESCE(gp.nama_kontraktor_pekerja, '') AS pemohon,
          gp.lokasi_pekerjaan   AS lokasi,
          COALESCE(jf.linked_job_forms, '[]'::json) AS linked_job_forms
        FROM form_ijin_kerja gp
        LEFT JOIN LATERAL (
          SELECT json_agg(row_to_json(t)) AS linked_job_forms
          FROM (
            SELECT id_form, 'hot-work' AS jenis_form, tanggal, tanggal_pelaksanaan, status,
                   COALESCE(nama_kontraktor_nik, nama_pekerja_nik, '') AS pemohon,
                   lokasi_pekerjaan AS lokasi
              FROM form_kerja_panas WHERE id_ijin_kerja = gp.id_form
            UNION ALL
            SELECT id_form, 'height-work' AS jenis_form, tanggal, tanggal_pelaksanaan, status,
                   COALESCE(petugas_ketinggian, '') AS pemohon,
                   lokasi
              FROM form_kerja_ketinggian WHERE id_ijin_kerja = gp.id_form
            UNION ALL
            SELECT id_form, 'workshop' AS jenis_form, tanggal, tanggal_pelaksanaan, status,
                   COALESCE(nama_kontraktor_nik, nama_pekerja_nik, '') AS pemohon,
                   lokasi_pekerjaan AS lokasi
              FROM form_kerja_workshop WHERE id_ijin_kerja = gp.id_form
          ) t
        ) jf ON true
        ORDER BY gp.tanggal DESC`,
        []
      ),
    ]);

    const hotWork       = results[0].status === "fulfilled" ? results[0].value : [];
    const workshop      = results[1].status === "fulfilled" ? results[1].value : [];
    const heightWork    = results[2].status === "fulfilled" ? results[2].value : [];
    const generalPermit = results[3].status === "fulfilled" ? results[3].value : [];

    // Log errors jika ada
    if (results[0].status === "rejected") console.error("[form-files] hot-work:", results[0].reason);
    if (results[1].status === "rejected") console.error("[form-files] workshop:", results[1].reason);
    if (results[2].status === "rejected") console.error("[form-files] height-work:", results[2].reason);
    if (results[3].status === "rejected") console.error("[form-files] general-permit:", results[3].reason);

    // Job-forms yang terlampir pada form ijin-kerja-eksternal (id_ijin_kerja terisi)
    // disaring agar TIDAK tampil sebagai item terpisah di luar.
    const standaloneJobForms = [...hotWork, ...workshop, ...heightWork].filter(
      (f: any) => !f.id_ijin_kerja || String(f.id_ijin_kerja).trim() === ""
    );

    const all = [...standaloneJobForms, ...generalPermit].sort(
      (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    return NextResponse.json({ data: all, total: all.length });
  } catch (err: any) {
    console.error("[form-files] unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}