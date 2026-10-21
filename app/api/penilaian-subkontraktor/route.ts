// app/api/penilaian-subkontraktor/route.ts
// Endpoint untuk daftar form ijin kerja eksternal terkait Penilaian Sub Kontraktor.
// Dapat diakses oleh role: pengawas, purchasing, sfo, admin, dan spv.

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

    // Ambil seluruh form ijin kerja eksternal yang bukan draft
    const rows = await query<any>(
      `SELECT id_form, status, nama_kontraktor_pekerja, nama_pengawas_pic_subkont,
              lokasi_pekerjaan, tanggal, tanggal_pelaksanaan,
              izin_kerja_tanggal_dari, izin_kerja_tanggal_sampai,
              penilaian_subkontraktor,
              eval_area_bersih_rapi, eval_limbah_ditangani_baik, eval_instalasi_listrik_aman,
              eval_tdk_ada_kerusakan_property, eval_ada_tumpahan_kimia_bbm, eval_tdk_ada_kehilangan_property,
              evaluasi_status, evaluasi_submitted_by, evaluasi_submitted_at,
              pengesahan_current_stage,
              pengesahan_pengawas_approved, pengesahan_pengawas_approved_by, pengesahan_pengawas_approved_at,
              pengesahan_security_approved, pengesahan_security_approved_by, pengesahan_security_approved_at,
              pengesahan_sfo_approved, pengesahan_sfo_approved_by, pengesahan_sfo_approved_at,
              pengesahan_status,
              created_at, updated_at
         FROM form_ijin_kerja
        WHERE status != 'draft'
        ORDER BY created_at DESC`
    );

    const data = rows.map((r) => {
      const pen = typeof r.penilaian_subkontraktor === "string"
        ? JSON.parse(r.penilaian_subkontraktor)
        : (r.penilaian_subkontraktor || { entries: [], mengetahui: {} });

      const mgt = pen.mengetahui || {};
      const pengawasApproved = Boolean(
        (mgt.pengawasDept && mgt.pengawasDept.nama && mgt.pengawasDept.nama.trim()) ||
        (mgt.picDept && mgt.picDept.nama && mgt.picDept.nama.trim())
      );
      const purchasingApproved = Boolean(mgt.purchasing && mgt.purchasing.nama && mgt.purchasing.nama.trim());
      const sfoApproved = Boolean(mgt.sfo && mgt.sfo.nama && mgt.sfo.nama.trim());

      return {
        id_form: r.id_form,
        status: r.status,
        nama_kontraktor_pekerja: r.nama_kontraktor_pekerja,
        pimpinan_kontraktor: r.nama_pengawas_pic_subkont || "-",
        lokasi_pekerjaan: r.lokasi_pekerjaan,
        tanggal: r.tanggal,
        tanggal_pelaksanaan: r.tanggal_pelaksanaan,
        izin_kerja_tanggal_dari: r.izin_kerja_tanggal_dari,
        izin_kerja_tanggal_sampai: r.izin_kerja_tanggal_sampai,
        penilaian_subkontraktor: pen,
        approval_status: {
          pengawas: pengawasApproved,
          purchasing: purchasingApproved,
          sfo: sfoApproved,
        },
        evaluasi_akhir: {
          area_bersih_rapi: Boolean(r.eval_area_bersih_rapi),
          limbah_ditangani_baik: Boolean(r.eval_limbah_ditangani_baik),
          instalasi_listrik_aman: Boolean(r.eval_instalasi_listrik_aman),
          tdk_ada_kerusakan_property: Boolean(r.eval_tdk_ada_kerusakan_property),
          ada_tumpahan_kimia_bbm: Boolean(r.eval_ada_tumpahan_kimia_bbm),
          tdk_ada_kehilangan_property: Boolean(r.eval_tdk_ada_kehilangan_property),
          status: r.evaluasi_status || (r.pengesahan_pengawas_approved ? "submitted" : "draft"),
          submitted_by: r.evaluasi_submitted_by,
          submitted_at: r.evaluasi_submitted_at,
          pengawas_approved: Boolean(r.pengesahan_pengawas_approved),
          pengawas_approved_by: r.pengesahan_pengawas_approved_by,
          pengawas_approved_at: r.pengesahan_pengawas_approved_at,
          security_approved: Boolean(r.pengesahan_security_approved),
          security_approved_by: r.pengesahan_security_approved_by,
          security_approved_at: r.pengesahan_security_approved_at,
          sfo_approved: Boolean(r.pengesahan_sfo_approved),
          sfo_approved_by: r.pengesahan_sfo_approved_by,
          sfo_approved_at: r.pengesahan_sfo_approved_at,
        },
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    let filtered = data;
    if (filter === "waiting-purchasing") {
      filtered = data.filter((d) => d.approval_status.pengawas && !d.approval_status.purchasing);
    } else if (filter === "approved-purchasing") {
      filtered = data.filter((d) => d.approval_status.purchasing);
    } else if (filter === "waiting-pengawas") {
      filtered = data.filter((d) => !d.approval_status.pengawas);
    } else if (filter === "approved-pengawas") {
      filtered = data.filter((d) => d.approval_status.pengawas);
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    console.error("[GET /api/penilaian-subkontraktor]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
