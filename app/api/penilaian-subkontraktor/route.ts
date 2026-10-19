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
              penilaian_subkontraktor, created_at, updated_at
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
