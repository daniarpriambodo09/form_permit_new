// app/api/evaluasi-akhir/[id]/route.ts
// Endpoint detail dan aksi persetujuan bertahap Evaluasi Akhir:
// 1. Pengawas Dept: mengisi 6 item checklist dan menyetujui -> diteruskan ke Security.
// 2. Security: memverifikasi dan menyetujui -> diteruskan ke SFO.
// 3. SFO: memberikan persetujuan akhir -> evaluasi selesai.

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const row = await queryOne<any>(
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
              pengesahan_status, created_at, updated_at
         FROM form_ijin_kerja
        WHERE UPPER(TRIM(id_form)) = UPPER(TRIM($1))`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id_form: row.id_form,
        nama_kontraktor_pekerja: row.nama_kontraktor_pekerja,
        lokasi_pekerjaan: row.lokasi_pekerjaan,
        tanggal: row.tanggal,
        izin_kerja_tanggal_dari: row.izin_kerja_tanggal_dari,
        izin_kerja_tanggal_sampai: row.izin_kerja_tanggal_sampai,
        evaluasi: {
          area_bersih_rapi: Boolean(row.eval_area_bersih_rapi),
          limbah_ditangani_baik: Boolean(row.eval_limbah_ditangani_baik),
          instalasi_listrik_aman: Boolean(row.eval_instalasi_listrik_aman),
          tdk_ada_kerusakan_property: Boolean(row.eval_tdk_ada_kerusakan_property),
          ada_tumpahan_kimia_bbm: Boolean(row.eval_ada_tumpahan_kimia_bbm),
          tdk_ada_kehilangan_property: Boolean(row.eval_tdk_ada_kehilangan_property),
          status: row.evaluasi_status || "draft",
          submitted_by: row.evaluasi_submitted_by,
          submitted_at: row.evaluasi_submitted_at,
        },
        approval_flow: {
          pengawas_approved: Boolean(row.pengesahan_pengawas_approved),
          pengawas_approved_by: row.pengesahan_pengawas_approved_by,
          pengawas_approved_at: row.pengesahan_pengawas_approved_at,
          security_approved: Boolean(row.pengesahan_security_approved),
          security_approved_by: row.pengesahan_security_approved_by,
          security_approved_at: row.pengesahan_security_approved_at,
          sfo_approved: Boolean(row.pengesahan_sfo_approved),
          sfo_approved_by: row.pengesahan_sfo_approved_by,
          sfo_approved_at: row.pengesahan_sfo_approved_at,
          is_complete: Boolean(row.pengesahan_pengawas_approved && row.pengesahan_security_approved && row.pengesahan_sfo_approved),
        },
      },
    });
  } catch (err: any) {
    console.error(`[GET /api/evaluasi-akhir/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { action, checklist, nama, nik } = body;

    const row = await queryOne<any>(
      `SELECT id_form,
              penilaian_subkontraktor,
              eval_area_bersih_rapi, eval_limbah_ditangani_baik, eval_instalasi_listrik_aman,
              eval_tdk_ada_kerusakan_property, eval_ada_tumpahan_kimia_bbm, eval_tdk_ada_kehilangan_property,
              pengesahan_pengawas_approved, pengesahan_security_approved, pengesahan_sfo_approved
         FROM form_ijin_kerja
        WHERE UPPER(TRIM(id_form)) = UPPER(TRIM($1))`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }

    const approverName = (nama || user.nama || user.username || "").trim();

    // ── 1. Tahap 1: Pengawas Dept mengisi checklist & approve ──
    if (action === "submit_pengawas") {
      if (user.role !== "pengawas" && user.role !== "admin") {
        return NextResponse.json({ error: "Hanya Pengawas Dept yang dapat mengisi checklist evaluasi akhir." }, { status: 403 });
      }

      // Verifikasi bahwa Penilaian Sub Kontraktor telah disetujui lengkap oleh Pengawas, Purchasing, dan SFO
      const pen = typeof row.penilaian_subkontraktor === "string"
        ? JSON.parse(row.penilaian_subkontraktor)
        : (row.penilaian_subkontraktor || { entries: [], mengetahui: {} });

      const mgt = pen.mengetahui || {};
      const pengawasApproved = Boolean(
        (mgt.pengawasDept && mgt.pengawasDept.nama && mgt.pengawasDept.nama.trim()) ||
        (mgt.picDept && mgt.picDept.nama && mgt.picDept.nama.trim())
      );
      const purchasingApproved = Boolean(mgt.purchasing && mgt.purchasing.nama && mgt.purchasing.nama.trim());
      const sfoApproved = Boolean(mgt.sfo && mgt.sfo.nama && mgt.sfo.nama.trim());

      if (!pengawasApproved || !purchasingApproved || !sfoApproved) {
        return NextResponse.json(
          {
            error: "Evaluasi Akhir belum dapat diisi atau disetujui. Penilaian Sub Kontraktor harus disetujui lengkap terlebih dahulu oleh Pengawas Dept, Purchasing, dan SFO.",
          },
          { status: 400 }
        );
      }

      const evalData = {
        area_bersih_rapi: Boolean(checklist?.area_bersih_rapi ?? checklist?.eval_area_bersih_rapi),
        limbah_ditangani_baik: Boolean(checklist?.limbah_ditangani_baik ?? checklist?.eval_limbah_ditangani_baik),
        instalasi_listrik_aman: Boolean(checklist?.instalasi_listrik_aman ?? checklist?.eval_instalasi_listrik_aman),
        tdk_ada_kerusakan_property: Boolean(checklist?.tdk_ada_kerusakan_property ?? checklist?.eval_tdk_ada_kerusakan_property),
        ada_tumpahan_kimia_bbm: Boolean(checklist?.ada_tumpahan_kimia_bbm ?? checklist?.eval_ada_tumpahan_kimia_bbm),
        tdk_ada_kehilangan_property: Boolean(checklist?.tdk_ada_kehilangan_property ?? checklist?.eval_tdk_ada_kehilangan_property),
      };

      await query(
        `UPDATE form_ijin_kerja
            SET eval_area_bersih_rapi = $1,
                eval_limbah_ditangani_baik = $2,
                eval_instalasi_listrik_aman = $3,
                eval_tdk_ada_kerusakan_property = $4,
                eval_ada_tumpahan_kimia_bbm = $5,
                eval_tdk_ada_kehilangan_property = $6,
                evaluasi_status = 'pending_security',
                evaluasi_submitted_by = $7,
                evaluasi_submitted_at = NOW(),
                pengesahan_current_stage = 2,
                pengesahan_pengawas_approved = TRUE,
                pengesahan_pengawas_approved_by = $7,
                pengesahan_pengawas_approved_at = NOW(),
                updated_at = NOW()
          WHERE UPPER(TRIM(id_form)) = UPPER(TRIM($8))`,
        [
          evalData.area_bersih_rapi,
          evalData.limbah_ditangani_baik,
          evalData.instalasi_listrik_aman,
          evalData.tdk_ada_kerusakan_property,
          evalData.ada_tumpahan_kimia_bbm,
          evalData.tdk_ada_kehilangan_property,
          approverName,
          row.id_form,
        ]
      );

      return NextResponse.json({
        success: true,
        message: "Evaluasi akhir berhasil disetujui Pengawas Dept dan diteruskan ke Security.",
      });
    }

    // ── 2. Tahap 2: Security verifikasi & approve ──
    if (action === "approve_security") {
      if (user.role !== "security" && user.role !== "admin") {
        return NextResponse.json({ error: "Hanya Security yang dapat melakukan approval tahap ini." }, { status: 403 });
      }

      if (!row.pengesahan_pengawas_approved) {
        return NextResponse.json(
          { error: "Form belum disetujui oleh Pengawas Dept." },
          { status: 400 }
        );
      }

      await query(
        `UPDATE form_ijin_kerja
            SET evaluasi_status = 'pending_sfo',
                pengesahan_current_stage = 3,
                pengesahan_security_approved = TRUE,
                pengesahan_security_approved_by = $1,
                pengesahan_security_approved_at = NOW(),
                updated_at = NOW()
          WHERE UPPER(TRIM(id_form)) = UPPER(TRIM($2))`,
        [approverName, row.id_form]
      );

      return NextResponse.json({
        success: true,
        message: "Evaluasi akhir berhasil diverifikasi Security dan diteruskan ke SFO.",
      });
    }

    // ── 3. Tahap 3: SFO approval akhir ──
    if (action === "approve_sfo") {
      if (user.role !== "sfo" && user.role !== "admin") {
        return NextResponse.json({ error: "Hanya SFO yang dapat melakukan approval tahap ini." }, { status: 403 });
      }

      if (!row.pengesahan_security_approved) {
        return NextResponse.json(
          { error: "Form belum diverifikasi oleh Security." },
          { status: 400 }
        );
      }

      await query(
        `UPDATE form_ijin_kerja
            SET evaluasi_status = 'approved',
                pengesahan_status = 'approved',
                pengesahan_current_stage = 4,
                pengesahan_sfo_approved = TRUE,
                pengesahan_sfo_approved_by = $1,
                pengesahan_sfo_approved_at = NOW(),
                updated_at = NOW()
          WHERE UPPER(TRIM(id_form)) = UPPER(TRIM($2))`,
        [approverName, row.id_form]
      );

      return NextResponse.json({
        success: true,
        message: "Evaluasi akhir berhasil disetujui oleh SFO. Seluruh proses pengesahan selesai.",
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    console.error(`[POST /api/evaluasi-akhir/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
