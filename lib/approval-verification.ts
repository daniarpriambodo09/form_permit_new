// lib/approval-verification.ts
// Logic verifikasi QR Code approval — dipakai LANGSUNG (in-process, tanpa
// HTTP fetch) baik oleh app/api/approval-verification/[jenisForm]/[id]/[role]/route.ts
// (dipanggil dari luar, mis. Postman/aplikasi lain) maupun oleh
// app/approval-verification/[jenisForm]/[id]/[role]/page.tsx (server
// component, memanggil ini langsung — TIDAK fetch ke URL publiknya sendiri).
//
// Kenapa ini penting: sebelumnya page.tsx melakukan fetch() ke
// NEXT_PUBLIC_APP_URL (URL publik aplikasi lewat reverse proxy). Ini rapuh
// karena:
//  1. NEXT_PUBLIC_APP_URL harus di-hardcode ke IP LAN yang bisa berubah
//     (DHCP) — begitu IP server berubah, semua verifikasi gagal.
//  2. Request itu "hairpin" — server men-fetch dirinya sendiri lewat
//     reverse proxy publik (port 80) yang belum tentu reachable dari
//     proses Next.js itu sendiri, menyebabkan ECONNREFUSED.
// Dengan memanggil fungsi ini langsung (bukan lewat network), page.tsx
// tidak lagi tergantung IP, port, atau reverse proxy sama sekali.

import { query, queryOne } from "@/lib/db";

export type VerificationFormType = "hot-work" | "workshop" | "height-work";
export type VerificationRoleKey  = "kontraktor" | "spv" | "admin_k3" | "sfo" | "mr_pga";

// ── Mapping tabel per form type ─────────────────────────────
const TABLE_MAP: Record<VerificationFormType, { table: string; lokCol: string }> = {
  "hot-work":    { table: "form_kerja_panas",      lokCol: "lokasi_pekerjaan" },
  "workshop":    { table: "form_kerja_workshop",   lokCol: "lokasi_pekerjaan" },
  "height-work": { table: "form_kerja_ketinggian", lokCol: "lokasi" },
};

const JENIS_LABEL: Record<VerificationFormType, string> = {
  "hot-work":    "Hot Work Permit",
  "workshop":    "Workshop Permit",
  "height-work": "Kerja Ketinggian",
};

// ── Mapping role → kolom DB ──────────────────────────────────
const ROLE_COL_MAP: Record<VerificationRoleKey, {
  approved:    string;
  approved_by: string;
  approved_at: string;
  nik:         string;
}> = {
  kontraktor: {
    approved:    "kontraktor_approved",
    approved_by: "kontraktor_approved_by",
    approved_at: "kontraktor_approved_at",
    nik:         "kontraktor_nik",
  },
  spv: {
    approved:    "spv_approved",
    approved_by: "spv_approved_by",
    approved_at: "spv_approved_at",
    nik:         "spv_nik",
  },
  admin_k3: {
    approved:    "admin_k3_approved",
    approved_by: "admin_k3_approved_by",
    approved_at: "admin_k3_approved_at",
    nik:         "admin_k3_nik",
  },
  sfo: {
    approved:    "sfo_approved",
    approved_by: "sfo_approved_by",
    approved_at: "sfo_approved_at",
    nik:         "sfo_nik",
  },
  mr_pga: {
    approved:    "mr_pga_approved",
    approved_by: "mr_pga_approved_by",
    approved_at: "mr_pga_approved_at",
    nik:         "mr_pga_nik",
  },
};

const ROLE_LABEL: Record<VerificationRoleKey, string> = {
  kontraktor: "Kontraktor",
  spv:        "Supervisor (SPV)",
  admin_k3:   "Admin K3",
  sfo:        "SFO",
  mr_pga:     "MR / PGA Manager",
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
        jenis_form_raw: VerificationFormType;
        lokasi: string | null;
        status: string;
        tanggal_pelaksanaan: string | null;
        tipe_perusahaan: string | null;
      };
      approver: {
        nama: string | null;
        nik: string | null;
        jabatan: string | null;
        role: VerificationRoleKey;
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
  const formType = jenisForm as VerificationFormType;
  const roleKey  = role as VerificationRoleKey;

  const tableInfo = TABLE_MAP[formType];
  if (!tableInfo) {
    return { success: false, error: "Jenis form tidak valid", status: 400 };
  }

  const roleCols = ROLE_COL_MAP[roleKey];
  if (!roleCols) {
    return { success: false, error: "Role tidak valid", status: 400 };
  }

  try {
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
      return { success: false, error: "Approval dari role ini belum dilakukan", status: 404 };
    }

    // Coba ambil jabatan approver dari tabel users (by nama, karena kita simpan nama bukan ID)
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