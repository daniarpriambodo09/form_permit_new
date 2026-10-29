// app/api/inspeksi-scaffolding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";

    // Ambil semua form ketinggian yang perlu scaffolding
    const rows = await query<any>(
      `SELECT 
        k.id_form,
        k.tanggal,
        k.tanggal_pelaksanaan,
        k.lokasi,
        k.deskripsi_pekerjaan,
        k.nama_pengawas_kontraktor,
        k.nama_kontraktor,
        k.spv_terkait,
        k.id_ijin_kerja,
        k.status AS form_status,
        k.perlu_scaffolding,
        s.id AS inspection_id,
        s.nama_inspektor,
        s.tanggal_inspeksi,
        s.tipe_perancah,
        COALESCE(s.status, 'menunggu_inspeksi') AS inspection_status,
        COALESCE(s.current_stage, 1) AS current_stage,
        COALESCE(s.spv_approved, false) AS spv_approved,
        s.spv_approved_by,
        s.spv_approved_at,
        COALESCE(s.sfo_approved, false) AS sfo_approved,
        s.sfo_approved_by,
        s.sfo_approved_at,
        COALESCE(s.kontraktor_approved, false) AS kontraktor_approved,
        s.kontraktor_approved_by,
        s.kontraktor_approved_at,
        s.pengawas_nama,
        s.pengawas_submitted_at,
        s.catatan_reject,
        s.items,
        s.ketentuan_lainnya,
        s.created_at,
        s.updated_at
      FROM form_kerja_ketinggian k
      LEFT JOIN inspeksi_scaffolding s ON k.id_form = s.id_form
      WHERE k.perlu_scaffolding = TRUE
      ORDER BY k.tanggal DESC`
    );

    let filtered = rows;
    if (filter === "pending") {
      filtered = rows.filter(
        (r) => r.inspection_status === "menunggu_inspeksi" || r.inspection_status === "draft" || r.inspection_status === "submitted"
      );
    } else if (filter === "approved") {
      filtered = rows.filter((r) => r.inspection_status === "approved");
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (err: any) {
    console.error("[GET /api/inspeksi-scaffolding]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
