// lib/approval-verification.ts
// Logic verifikasi QR Code approval — dipakai LANGSUNG (in-process, tanpa
// HTTP fetch) baik oleh endpoint API maupun server components.

import { queryOne } from "@/lib/db";

export type VerificationFormType =
  | "hot-work"
  | "workshop"
  | "height-work"
  | "general-permit"
  | "jsa"
  | "penilaian-subkontraktor";

export type VerificationRoleKey =
  | "kontraktor"
  | "spv"
  | "admin_k3"
  | "sfo"
  | "mr_pga"
  | "pga"
  | "security"
  | "firewatch"
  | "purchasing"
  | "picDept";

// ── Mapping tabel per form type ─────────────────────────────
const TABLE_MAP: Record<string, { table: string; lokCol: string }> = {
  "hot-work":    { table: "form_kerja_panas",      lokCol: "lokasi_pekerjaan" },
  "workshop":    { table: "form_kerja_workshop",   lokCol: "lokasi_pekerjaan" },
  "height-work": { table: "form_kerja_ketinggian", lokCol: "lokasi" },
};

const JENIS_LABEL: Record<string, string> = {
  "hot-work":               "Hot Work Permit (Ijin Kerja Panas)",
  "workshop":               "Workshop Permit (Ijin Kerja Workshop)",
  "height-work":            "Kerja Ketinggian (Height Work Permit)",
  "general-permit":         "Form Ijin Kerja Eksternal",
  "jsa":                    "Job Safety Analysis (JSA)",
  "penilaian-subkontraktor": "Form Penilaian Sub Kontraktor",
};

// ── Mapping role label ───────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  kontraktor: "Kontraktor / Penanggung Jawab",
  spv:        "Supervisor (SPV)",
  admin_k3:   "Admin K3",
  sfo:        "Safety Officer (SFO)",
  mr_pga:     "MR / PGA Manager",
  pga:        "SMR / PGA Manager",
  security:   "Security",
  firewatch:  "Pengawas Pekerjaan / Firewatch",
  purchasing: "Purchasing",
  picDept:    "Pengawas Dept",
  pengawasDept: "Pengawas Dept",
  pengawas:   "Pengawas Dept",
};

function isTruthy(v: any): boolean {
  return v === true || v === "t" || v === "true";
}

export type VerificationResult =
  | {
      success: true;
      form: {
        id_form: string;
        jenis_form: string;
        jenis_form_raw: string;
        lokasi: string | null;
        status: string;
        tanggal_pelaksanaan: string | null;
        tipe_perusahaan: string | null;
      };
      approver: {
        nama: string | null;
        nik: string | null;
        jabatan: string | null;
        role: string;
        role_label: string;
        approved_at: string | null;
      };
    }
  | { success: false; error: string; status: number };

export async function getApprovalVerification(
  jenisForm: string,
  id: string,
  role: string
): Promise<VerificationResult> {
  const formType = jenisForm.toLowerCase();
  const roleKey = role.toLowerCase();

  try {
    // 1. Verifikasi JSA (tersimpan di jsonb jsa_data form_ijin_kerja)
    if (formType === "jsa") {
      const row = await queryOne<{
        id_form: string;
        status: string;
        nama_kontraktor_pekerja: string | null;
        lokasi_pekerjaan: string | null;
        tanggal: string | null;
        jsa_data: any;
      }>(
        `SELECT id_form, status, nama_kontraktor_pekerja, lokasi_pekerjaan, tanggal, jsa_data
           FROM form_ijin_kerja
          WHERE id_form = $1`,
        [id]
      );

      if (!row) return { success: false, error: "Form Ijin Kerja Eksternal tidak ditemukan", status: 404 };

      const jsaData = typeof row.jsa_data === "string" ? JSON.parse(row.jsa_data) : (row.jsa_data || {});
      const entry = jsaData.approval?.[roleKey];

      if (!entry || !entry.approved) {
        return { success: false, error: `Approval JSA untuk role ${ROLE_LABEL[roleKey] || role} belum dilakukan`, status: 404 };
      }

      return {
        success: true,
        form: {
          id_form: row.id_form,
          jenis_form: JENIS_LABEL["jsa"],
          jenis_form_raw: "jsa",
          lokasi: row.lokasi_pekerjaan,
          status: row.status,
          tanggal_pelaksanaan: row.tanggal,
          tipe_perusahaan: row.nama_kontraktor_pekerja,
        },
        approver: {
          nama: entry.approvedBy || null,
          nik: entry.approvedNik || null,
          jabatan: "Approver JSA",
          role: roleKey,
          role_label: ROLE_LABEL[roleKey] || roleKey,
          approved_at: entry.approvedAt || null,
        },
      };
    }

    // 2. Verifikasi Penilaian Sub Kontraktor (tersimpan di jsonb penilaian_subkontraktor form_ijin_kerja)
    if (formType === "penilaian-subkontraktor") {
      const row = await queryOne<{
        id_form: string;
        status: string;
        nama_kontraktor_pekerja: string | null;
        lokasi_pekerjaan: string | null;
        tanggal: string | null;
        penilaian_subkontraktor: any;
      }>(
        `SELECT id_form, status, nama_kontraktor_pekerja, lokasi_pekerjaan, tanggal, penilaian_subkontraktor
           FROM form_ijin_kerja
          WHERE id_form = $1`,
        [id]
      );

      if (!row) return { success: false, error: "Form Ijin Kerja Eksternal tidak ditemukan", status: 404 };

      const penData = typeof row.penilaian_subkontraktor === "string"
        ? JSON.parse(row.penilaian_subkontraktor)
        : (row.penilaian_subkontraktor || {});

      const mgt = penData.mengetahui?.[roleKey] || (roleKey === "pengawasDept" || roleKey === "pengawas" ? penData.mengetahui?.picDept : (roleKey === "picDept" ? (penData.mengetahui?.pengawasDept || penData.mengetahui?.pengawas) : null));

      if (!mgt || !mgt.nama || !mgt.nama.trim()) {
        return {
          success: false,
          error: `Persetujuan / Mengetahui ${ROLE_LABEL[roleKey] || role} belum dilakukan`,
          status: 404,
        };
      }

      return {
        success: true,
        form: {
          id_form: row.id_form,
          jenis_form: JENIS_LABEL["penilaian-subkontraktor"],
          jenis_form_raw: "penilaian-subkontraktor",
          lokasi: row.lokasi_pekerjaan,
          status: row.status,
          tanggal_pelaksanaan: row.tanggal,
          tipe_perusahaan: row.nama_kontraktor_pekerja,
        },
        approver: {
          nama: mgt.nama,
          nik: mgt.nik || null,
          jabatan: `Mengetahui — ${ROLE_LABEL[roleKey] || roleKey}`,
          role: roleKey,
          role_label: ROLE_LABEL[roleKey] || roleKey,
          approved_at: mgt.tanggal || null,
        },
      };
    }

    // 3. Verifikasi Form Induk General Permit (form_ijin_kerja)
    if (formType === "general-permit") {
      const row = await queryOne<any>(
        `SELECT
           id_form, status, lokasi_pekerjaan, tanggal, nama_kontraktor_pekerja,
           kontraktor_pj,
           spv_approved, spv_approved_by, spv_approved_at, spv_nik,
           sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
           pga_approved, pga_approved_by, pga_approved_at, pga_nik,
           security_approved, security_approved_by, security_approved_at, security_nik
         FROM form_ijin_kerja
        WHERE id_form = $1`,
        [id]
      );

      if (!row) return { success: false, error: "Form Ijin Kerja Eksternal tidak ditemukan", status: 404 };

      let isApproved = false;
      let appBy: string | null = null;
      let appNik: string | null = null;
      let appAt: string | null = null;

      if (roleKey === "spv") {
        isApproved = isTruthy(row.spv_approved);
        appBy = row.spv_approved_by;
        appNik = row.spv_nik;
        appAt = row.spv_approved_at;
      } else if (roleKey === "sfo") {
        isApproved = isTruthy(row.sfo_approved);
        appBy = row.sfo_approved_by;
        appNik = row.sfo_nik;
        appAt = row.sfo_approved_at;
      } else if (roleKey === "pga" || roleKey === "mr_pga") {
        isApproved = isTruthy(row.pga_approved);
        appBy = row.pga_approved_by;
        appNik = row.pga_nik;
        appAt = row.pga_approved_at;
      } else if (roleKey === "security") {
        isApproved = isTruthy(row.security_approved);
        appBy = row.security_approved_by;
        appNik = row.security_nik;
        appAt = row.security_approved_at;
      } else if (roleKey === "kontraktor") {
        isApproved = Boolean(row.kontraktor_pj);
        appBy = row.kontraktor_pj;
        appAt = row.tanggal;
      }

      if (!isApproved) {
        return { success: false, error: `Approval untuk role ${ROLE_LABEL[roleKey] || role} belum dilakukan`, status: 404 };
      }

      return {
        success: true,
        form: {
          id_form: row.id_form,
          jenis_form: JENIS_LABEL["general-permit"],
          jenis_form_raw: "general-permit",
          lokasi: row.lokasi_pekerjaan,
          status: row.status,
          tanggal_pelaksanaan: row.tanggal,
          tipe_perusahaan: row.nama_kontraktor_pekerja,
        },
        approver: {
          nama: appBy,
          nik: appNik,
          jabatan: ROLE_LABEL[roleKey] || roleKey,
          role: roleKey,
          role_label: ROLE_LABEL[roleKey] || roleKey,
          approved_at: appAt,
        },
      };
    }

    // 4. Verifikasi Form Kerja Khusus (hot-work, workshop, height-work)
    const tableInfo = TABLE_MAP[formType];
    if (!tableInfo) {
      return { success: false, error: "Jenis form tidak valid", status: 400 };
    }

    const roleColMap: Record<string, { approved: string; approved_by: string; approved_at: string; nik: string }> = {
      kontraktor: { approved: "kontraktor_approved", approved_by: "kontraktor_approved_by", approved_at: "kontraktor_approved_at", nik: "kontraktor_nik" },
      spv:        { approved: "spv_approved", approved_by: "spv_approved_by", approved_at: "spv_approved_at", nik: "spv_nik" },
      admin_k3:   { approved: "admin_k3_approved", approved_by: "admin_k3_approved_by", approved_at: "admin_k3_approved_at", nik: "admin_k3_nik" },
      sfo:        { approved: "sfo_approved", approved_by: "sfo_approved_by", approved_at: "sfo_approved_at", nik: "sfo_nik" },
      mr_pga:     { approved: "mr_pga_approved", approved_by: "mr_pga_approved_by", approved_at: "mr_pga_approved_at", nik: "mr_pga_nik" },
      pga:        { approved: "mr_pga_approved", approved_by: "mr_pga_approved_by", approved_at: "mr_pga_approved_at", nik: "mr_pga_nik" },
    };

    const roleCols = roleColMap[roleKey];
    if (!roleCols) {
      return { success: false, error: "Role tidak valid", status: 400 };
    }

    const row = await queryOne<any>(
      `SELECT
         id_form,
         status,
         tanggal_pelaksanaan,
         tipe_perusahaan,
         ${tableInfo.lokCol}        AS lokasi,
         ${roleCols.approved}       AS is_approved,
         ${roleCols.approved_by}    AS approved_by,
         ${roleCols.approved_at}    AS approved_at,
         ${roleCols.nik}            AS approver_nik
       FROM ${tableInfo.table}
       WHERE id_form = $1`,
      [id]
    );

    if (!row) {
      return { success: false, error: "Form tidak ditemukan", status: 404 };
    }

    if (!isTruthy(row.is_approved)) {
      return { success: false, error: `Approval untuk role ${ROLE_LABEL[roleKey] || role} belum dilakukan`, status: 404 };
    }

    let jabatan: string | null = null;
    if (row.approved_by) {
      const userRow = await queryOne<{ jabatan: string | null }>(
        `SELECT jabatan FROM users WHERE nama = $1 LIMIT 1`,
        [row.approved_by]
      );
      jabatan = userRow?.jabatan ?? null;
    }

    return {
      success: true,
      form: {
        id_form:            row.id_form,
        jenis_form:         JENIS_LABEL[formType] ?? formType,
        jenis_form_raw:     formType,
        lokasi:             row.lokasi,
        status:             row.status,
        tanggal_pelaksanaan: row.tanggal_pelaksanaan,
        tipe_perusahaan:    row.tipe_perusahaan,
      },
      approver: {
        nama:        row.approved_by,
        nik:         row.approver_nik,
        jabatan:     jabatan,
        role:        roleKey,
        role_label:  ROLE_LABEL[roleKey] ?? roleKey,
        approved_at: row.approved_at,
      },
    };
  } catch (err: any) {
    console.error(`[getApprovalVerification] ${jenisForm}/${id}/${role}`, err);
    return { success: false, error: err.message, status: 500 };
  }
}