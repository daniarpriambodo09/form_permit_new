// app/api/evaluasi-akhir/route.ts
// Endpoint daftar form untuk Evaluasi Akhir (Pasca Pekerjaan).
// Role yang mengakses:
// - pengawas: melihat seluruh form untuk mengisi / menyetujui checklist evaluasi akhir.
// - security: melihat form yang sudah disetujui Pengawas Dept (pengesahan_pengawas_approved = true).
// - sfo: melihat form yang sudah disetujui Security (pengesahan_security_approved = true).
// - admin: melihat seluruh form pada seluruh tahapan evaluasi akhir.

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

    const userRole = (user.role || "").toLowerCase().trim();

    // Pastikan filter SQL ketat:
    // Security: HANYA form yang Evaluasi Akhir-nya sudah disetujui Pengawas Dept
    // SFO: HANYA form yang sudah disetujui Security
    let whereSql = "status != 'draft'";
    if (userRole === "security") {
      whereSql += " AND pengesahan_pengawas_approved = TRUE";
    } else if (userRole === "sfo") {
      whereSql += " AND pengesahan_pengawas_approved = TRUE AND pengesahan_security_approved = TRUE";
    }

    const rows = await query<any>(
      `SELECT id_form, status, nama_kontraktor_pekerja, nama_pengawas_pic_subkont,
              lokasi_pekerjaan, tanggal, tanggal_pelaksanaan,
              izin_kerja_tanggal_dari, izin_kerja_tanggal_sampai,
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
        WHERE ${whereSql}
        ORDER BY created_at DESC`
    );

    const data = rows.map((r) => {
      const pengawasApproved = Boolean(r.pengesahan_pengawas_approved);
      const securityApproved = Boolean(r.pengesahan_security_approved);
      const sfoApproved = Boolean(r.pengesahan_sfo_approved);

      // Tentukan apakah giliran user saat ini untuk approve
      let isPendingMyApproval = false;
      if (user.role === "security") {
        isPendingMyApproval = pengawasApproved && !securityApproved;
      } else if (user.role === "sfo") {
        isPendingMyApproval = securityApproved && !sfoApproved;
      } else if (user.role === "pengawas") {
        isPendingMyApproval = !pengawasApproved;
      } else if (user.role === "admin") {
        isPendingMyApproval = (!pengawasApproved) || (pengawasApproved && !securityApproved) || (securityApproved && !sfoApproved);
      }

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
        evaluasi: {
          area_bersih_rapi: Boolean(r.eval_area_bersih_rapi),
          limbah_ditangani_baik: Boolean(r.eval_limbah_ditangani_baik),
          instalasi_listrik_aman: Boolean(r.eval_instalasi_listrik_aman),
          tdk_ada_kerusakan_property: Boolean(r.eval_tdk_ada_kerusakan_property),
          ada_tumpahan_kimia_bbm: Boolean(r.eval_ada_tumpahan_kimia_bbm),
          tdk_ada_kehilangan_property: Boolean(r.eval_tdk_ada_kehilangan_property),
          status: r.evaluasi_status || (pengawasApproved ? "submitted" : "draft"),
          submitted_by: r.evaluasi_submitted_by,
          submitted_at: r.evaluasi_submitted_at,
        },
        approval_flow: {
          current_stage: r.pengesahan_current_stage || (pengawasApproved ? (securityApproved ? (sfoApproved ? 4 : 3) : 2) : 1),
          pengawas_approved: pengawasApproved,
          pengawas_approved_by: r.pengesahan_pengawas_approved_by,
          pengawas_approved_at: r.pengesahan_pengawas_approved_at,
          security_approved: securityApproved,
          security_approved_by: r.pengesahan_security_approved_by,
          security_approved_at: r.pengesahan_security_approved_at,
          sfo_approved: sfoApproved,
          sfo_approved_by: r.pengesahan_sfo_approved_by,
          sfo_approved_at: r.pengesahan_sfo_approved_at,
          is_complete: pengawasApproved && securityApproved && sfoApproved,
        },
        is_pending_my_approval: isPendingMyApproval,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    // Urutan & filter ketersediaan form per role:
    // Security: hanya form yang sudah diapprove Pengawas (muncul di security terlebih dahulu)
    // SFO: hanya form yang sudah diapprove Security (lalu baru muncul ke SFO)
    let visibleData = data;
    if (user.role === "security") {
      visibleData = data.filter((d) => d.approval_flow.pengawas_approved);
    } else if (user.role === "sfo") {
      visibleData = data.filter((d) => d.approval_flow.security_approved);
    }

    if (filter === "pending") {
      visibleData = visibleData.filter((d) => d.is_pending_my_approval);
    } else if (filter === "completed") {
      visibleData = visibleData.filter((d) => d.approval_flow.is_complete);
    }

    const pendingCount = visibleData.filter((d) => d.is_pending_my_approval).length;

    return NextResponse.json({
      success: true,
      data: visibleData,
      pendingCount,
    });
  } catch (err: any) {
    console.error("[GET /api/evaluasi-akhir]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
