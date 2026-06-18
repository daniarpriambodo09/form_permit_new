// lib/approval-email.ts
// Helper untuk email notification workflow approval.
// Menentukan approver berikutnya, mencari email mereka dari DB,
// lalu memanggil fungsi sendEmail dari lib/email.ts.
//
// Tidak mengubah logika approval yang ada — murni additive.

import { queryOne, query } from '@/lib/db';
import {
  getStageToRoleMap,
  getStageConfig,
  UserRole,
} from '@/lib/auth';
import {
  sendApprovalNotification,
  sendRejectionNotification,
} from '@/lib/email';

// ── Tipe data ────────────────────────────────────────────────

export type FormType = 'hot-work' | 'workshop' | 'height-work';

interface FormRow {
  id_form:          string;
  tipe_perusahaan:  string;
  current_stage:    number;
  user_id:          number | null;
  tanggal:          string;
}

interface UserRow {
  id:        number;
  nama:      string;
  email:     string | null;
  role:      string;
  departmen: string | null;
}

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
//
// Mengembalikan role yang harus approve pada nextStage.
// Mengembalikan null jika sudah stage terakhir (completed).

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

// ── getApproverEmail: cari email approver dari DB ────────────
//
// Untuk SPV: filter berdasarkan departmen pembuat form.
// Untuk role lain: ambil user pertama aktif dengan role tersebut.
// Mengembalikan array karena bisa ada lebih dari satu (misalnya banyak SPV se-departemen).

export async function getApproverEmails(
  role:              UserRole,
  makerDepartmen?:   string | null,
): Promise<UserRow[]> {
  if (role === 'spv' && makerDepartmen) {
    // SPV harus dari departemen yang sama dengan pembuat form
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

  // Role lain: semua user aktif dengan role tersebut
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

// ── getMakerDepartmen: ambil departmen pembuat form ──────────

async function getMakerDepartmen(userId: number | null): Promise<string | null> {
  if (!userId) return null;
  const row = await queryOne<{ departmen: string | null }>(
    `SELECT departmen FROM users WHERE id = $1`,
    [userId]
  );
  return row?.departmen ?? null;
}

// ── getMakerUser: ambil data lengkap pembuat form ────────────

async function getMakerUser(userId: number | null): Promise<UserRow | null> {
  if (!userId) return null;
  return queryOne<UserRow>(
    `SELECT id, nama, email, role, departmen FROM users WHERE id = $1`,
    [userId]
  );
}

// ── notifyNextApprover: kirim email setelah approval ─────────
//
// Dipanggil setelah approver berhasil approve (bukan last stage).
// nextStage = currentStage + 1 (sudah di-increment di route approval).
//
// Parameter:
//   formType        - jenis form
//   idForm          - ID form (e.g. "HOW-1030")
//   tipePerusahaan  - 'internal' | 'eksternal'
//   nextStage       - stage berikutnya (setelah approval)
//   userId          - user_id pembuat form (untuk filter departemen SPV)
//   namaPemohon     - nama pembuat form
//   tanggal         - tanggal form dibuat

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

    // Ambil departmen pembuat untuk filter SPV
    const makerDepartmen = await getMakerDepartmen(userId);

    const approvers = await getApproverEmails(approverRole, makerDepartmen);

    if (approvers.length === 0) {
      console.log(`[EMAIL] No approver found with role "${approverRole}" — email not sent.`);
      return;
    }

    // Kirim ke semua approver yang cocok (bisa lebih dari satu SPV se-departemen)
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
    // Tidak melempar error agar tidak mengganggu response approval
  }
}

// ── notifyFirstApprover: kirim email saat form pertama kali submitted ──
//
// Sama seperti notifyNextApprover tapi dipanggil dari route POST form.
// Stage pertama selalu 1.

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
    nextStage: 1,  // stage pertama
    userId,
    namaPemohon,
    tanggal,
  });
}

// ── notifyFormRejected: kirim email ke pembuat form saat reject ──

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
    // Tidak melempar error agar tidak mengganggu response reject
  }
}