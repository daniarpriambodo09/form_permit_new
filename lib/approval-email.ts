// lib/approval-email.ts
// Helper untuk email notification workflow approval.
// Menentukan approver berikutnya, mencari email mereka dari DB,
// lalu memanggil fungsi sendEmail dari lib/email.ts.
//
// UPDATED: Saat approverRole === 'admin_k3' dan formType termasuk
// hot-work/height-work/workshop, email SEKARANG dicek dulu ke tabel
// admin_k3_email_routing (diatur lewat halaman /admin/admin-k3-routing).
// Jika belum diatur untuk jenis form tsb, fallback ke perilaku lama
// (kirim ke semua user role='admin_k3').

import { queryOne, query } from '@/lib/db';
import {
  getStageToRoleMap,
  getStageConfig,
  UserRole,
} from '@/lib/auth';
import {
  sendApprovalNotification,
  sendRejectionNotification,
  sendExternalApprovalNotification,
} from '@/lib/email';
import { getAdminK3ApproverForForm, JenisFormK3 } from '@/lib/admin-k3-routing';

// ── Tipe data ────────────────────────────────────────────────

export type FormType = 'hot-work' | 'workshop' | 'height-work';

interface UserRow {
  id:        number;
  nama:      string;
  email:     string | null;
  role:      string;
  departmen: string | null;
}

const ROUTABLE_FORM_TYPES: FormType[] = ['hot-work', 'height-work', 'workshop'];

// ── Label jenis form ─────────────────────────────────────────

function getFormLabel(formType: FormType): string {
  const map: Record<FormType, string> = {
    'hot-work':    'Hot Work',
    'workshop':    'Workshop',
    'height-work': 'Height Work',
  };
  return map[formType];
}

// ── Format tanggal: "09 Juni 2026" ──────────────────────────

function formatTanggal(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day:   '2-digit',
      month: 'long',
      year:  'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── getNextApprover: role approver pada stage berikutnya ─────

export function getNextApprover(
  formType:        FormType,
  tipePerusahaan:  string,
  currentStage:    number,
): UserRole | null {
  const stageConfig = getStageConfig(formType, tipePerusahaan);
  const nextStage   = currentStage + 1;

  if (nextStage > stageConfig.totalStages) return null;

  const stageMap = getStageToRoleMap(formType, tipePerusahaan);
  return stageMap[nextStage] ?? null;
}

// ── getApproverEmails: cari email approver dari DB (perilaku lama) ──
//
// Untuk SPV: filter berdasarkan departmen pembuat form.
// Untuk role lain: ambil semua user aktif dengan role tersebut.

export async function getApproverEmails(
  role:              UserRole,
  makerDepartmen?:   string | null,
): Promise<UserRow[]> {
  if (role === 'spv' && makerDepartmen) {
    const rows = await query<UserRow>(
      `SELECT id, nama, email, role, departmen
       FROM users
       WHERE role = 'spv'
         AND is_active = TRUE
         AND departmen = $1
         AND email IS NOT NULL
         AND email != ''`,
      [makerDepartmen]
    );
    return rows;
  }

  const rows = await query<UserRow>(
    `SELECT id, nama, email, role, departmen
     FROM users
     WHERE role = $1
       AND is_active = TRUE
       AND email IS NOT NULL
       AND email != ''`,
    [role]
  );
  return rows;
}

// ── getMakerDepartmen / getMakerUser ─────────────────────────

async function getMakerDepartmen(userId: number | null): Promise<string | null> {
  if (!userId) return null;
  const row = await queryOne<{ departmen: string | null }>(
    `SELECT departmen FROM users WHERE id = $1`,
    [userId]
  );
  return row?.departmen ?? null;
}

async function getMakerUser(userId: number | null): Promise<UserRow | null> {
  if (!userId) return null;
  return queryOne<UserRow>(
    `SELECT id, nama, email, role, departmen FROM users WHERE id = $1`,
    [userId]
  );
}

// ── notifyNextApprover: kirim email setelah approval ─────────

export async function notifyNextApprover(params: {
  formType:        FormType;
  idForm:          string;
  tipePerusahaan:  string;
  nextStage:       number;
  userId:          number | null;
  namaPemohon:     string;
  tanggal:         string;
}): Promise<void> {
  const { formType, idForm, tipePerusahaan, nextStage, userId, namaPemohon, tanggal } = params;

  try {
    const stageMap      = getStageToRoleMap(formType, tipePerusahaan);
    const approverRole  = stageMap[nextStage] as UserRole | undefined;

    if (!approverRole) {
      console.log(`[EMAIL] No approver role found for stage ${nextStage} — skipping.`);
      return;
    }

    // ── ROUTING KHUSUS: stage Admin K3 untuk hot-work/height-work/workshop ──
    // Kalau sudah diatur di halaman /admin/admin-k3-routing, kirim HANYA
    // ke Admin K3 yang dipilih untuk jenis form ini, lalu selesai (jangan
    // lanjut ke fallback "semua admin_k3").
    if (approverRole === 'admin_k3' && ROUTABLE_FORM_TYPES.includes(formType)) {
      const routed = await getAdminK3ApproverForForm(formType as JenisFormK3);
      if (routed?.email) {
        await sendApprovalNotification({
          idForm,
          jenisForm:     getFormLabel(formType),
          namaPemohon,
          tanggal:       formatTanggal(tanggal),
          approverName:  routed.nama,
          approverEmail: routed.email,
        });
        console.log(`[EMAIL] Admin K3 routing aktif untuk ${formType} → dikirim ke ${routed.nama} (${routed.email})`);
        return;
      }
      console.log(`[EMAIL] Belum ada routing Admin K3 untuk "${formType}" — fallback ke semua Admin K3.`);
      // sengaja tidak return, lanjut ke logika default di bawah
    }

    // ── Perilaku default (SPV per-departemen, atau semua user per-role) ──
    const makerDepartmen = await getMakerDepartmen(userId);
    const approvers = await getApproverEmails(approverRole, makerDepartmen);

    if (approvers.length === 0) {
      console.log(`[EMAIL] No approver found with role "${approverRole}" — email not sent.`);
      return;
    }

    for (const approver of approvers) {
      if (!approver.email) continue;

      await sendApprovalNotification({
        idForm,
        jenisForm:     getFormLabel(formType),
        namaPemohon,
        tanggal:       formatTanggal(tanggal),
        approverName:  approver.nama,
        approverEmail: approver.email,
      });
    }

  } catch (err) {
    console.error(`[EMAIL] Failed to send approval notification for ${idForm}:`, err);
  }
}

// ── notifyFirstApprover ───────────────────────────────────────

export async function notifyFirstApprover(params: {
  formType:       FormType;
  idForm:         string;
  tipePerusahaan: string;
  userId:         number | null;
  namaPemohon:    string;
  tanggal:        string;
}): Promise<void> {
  const { formType, idForm, tipePerusahaan, userId, namaPemohon, tanggal } = params;

  await notifyNextApprover({
    formType,
    idForm,
    tipePerusahaan,
    nextStage: 1,
    userId,
    namaPemohon,
    tanggal,
  });
}

// ── notifyFormRejected ────────────────────────────────────────

export async function notifyFormRejected(params: {
  formType:      FormType;
  idForm:        string;
  userId:        number | null;
  namaApprover:  string;
  catatanReject: string;
}): Promise<void> {
  const { formType, idForm, userId, namaApprover, catatanReject } = params;

  try {
    if (!userId) {
      console.log(`[EMAIL] Form ${idForm} has no user_id — rejection email not sent.`);
      return;
    }

    const maker = await getMakerUser(userId);

    if (!maker || !maker.email) {
      console.log(`[EMAIL] Pembuat form ${idForm} tidak memiliki email — rejection email not sent.`);
      return;
    }

    await sendRejectionNotification({
      idForm,
      jenisForm:     getFormLabel(formType),
      namaApprover,
      catatanReject,
      pembuatEmail:  maker.email,
      pembuatName:   maker.nama,
    });

  } catch (err) {
    console.error(`[EMAIL] Failed to send rejection notification for ${idForm}:`, err);
  }
}

export async function notifyExternalPermit(params: {
  idForm: string;
  userId: number | null;
  namaPemohon: string;
  tanggal: string;
  attachmentCount: number;
}): Promise<void> {
  try {
    const makerDepartmen = await getMakerDepartmen(params.userId);
    const approvers = await getApproverEmails('firewatch', makerDepartmen);
    for (const approver of approvers) {
      if (!approver.email) continue;
      await sendExternalApprovalNotification({
        idForm: params.idForm,
        namaPemohon: params.namaPemohon,
        tanggal: formatTanggal(params.tanggal),
        approverName: approver.nama,
        approverEmail: approver.email,
        attachmentCount: params.attachmentCount,
      });
    }
  } catch (err) {
    console.error(`[EMAIL] Failed to send external permit notification for ${params.idForm}:`, err);
  }
}