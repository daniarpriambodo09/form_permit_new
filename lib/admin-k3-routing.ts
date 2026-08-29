// lib/admin-k3-routing.ts
import { query, queryOne } from '@/lib/db';

export type JenisFormK3 = 'hot-work' | 'height-work' | 'workshop';

export interface AdminK3ApproverInfo {
  id:     number;
  nama:   string;
  email:  string | null;
}

// ── Ambil approver Admin K3 yang di-set khusus untuk jenis form tsb ──
// Fallback: kalau belum ada routing untuk jenis_form ini, return null
// (caller bisa fallback ke perilaku lama: semua user role='admin_k3').
export async function getAdminK3ApproverForForm(
  jenisForm: JenisFormK3
): Promise<AdminK3ApproverInfo | null> {
  const row = await queryOne<AdminK3ApproverInfo>(
    `SELECT u.id, u.nama, u.email
     FROM admin_k3_email_routing r
     JOIN users u ON u.id = r.user_id
     WHERE r.jenis_form = $1 AND u.role = 'admin_k3' AND u.is_active = TRUE`,
    [jenisForm]
  );
  return row;
}

// ── Ambil seluruh mapping (untuk halaman admin) ──
export async function getAllRouting(): Promise<Record<string, AdminK3ApproverInfo | null>> {
  const rows = await query<{ jenis_form: string; id: number; nama: string; email: string | null }>(
    `SELECT r.jenis_form, u.id, u.nama, u.email
     FROM admin_k3_email_routing r
     JOIN users u ON u.id = r.user_id`
  );
  const result: Record<string, AdminK3ApproverInfo | null> = {
    'hot-work': null, 'height-work': null, 'workshop': null,
  };
  for (const r of rows) {
    result[r.jenis_form] = { id: r.id, nama: r.nama, email: r.email };
  }
  return result;
}

// ── Set/replace routing untuk satu jenis form ──
export async function setRouting(
  jenisForm: JenisFormK3,
  userId: number,
  updatedBy: number
): Promise<void> {
  await query(
    `INSERT INTO admin_k3_email_routing (jenis_form, user_id, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (jenis_form)
     DO UPDATE SET user_id = $2, updated_at = NOW(), updated_by = $3`,
    [jenisForm, userId, updatedBy]
  );
}