// lib/admin-k3-routing.ts
import { query, queryOne } from '@/lib/db';

export type JenisFormK3 = 'hot-work' | 'height-work' | 'workshop' | 'general-permit';

export interface AdminK3ApproverInfo {
  id:     number;
  nama:   string;
  email:  string | null;
  nik?:   string | null;
}

let routingConstraintChecked = false;
async function ensureRoutingConstraint(): Promise<void> {
  if (routingConstraintChecked) return;
  try {
    await query(
      `ALTER TABLE admin_k3_email_routing DROP CONSTRAINT IF EXISTS admin_k3_email_routing_jenis_form_check`
    );
    routingConstraintChecked = true;
  } catch (err) {
    console.warn('[admin-k3-routing] Could not drop old check constraint:', err);
  }
}

let assignmentTableReady = false;
export async function ensureApproverAssignmentTable(): Promise<void> {
  if (assignmentTableReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS form_approver_assignments (
        id_form VARCHAR(50) NOT NULL,
        role VARCHAR(30) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by INTEGER,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id_form, role)
      )
    `);
    assignmentTableReady = true;
  } catch (err) {
    console.warn('[ensureApproverAssignmentTable] error:', err);
  }
}

// ── Ambil approver Admin K3 yang di-set khusus untuk jenis form tsb ──
// Fallback: kalau belum ada routing untuk jenis_form ini, return null
// (caller bisa fallback ke perilaku lama: semua user role='admin_k3').
export async function getAdminK3ApproverForForm(
  jenisForm: JenisFormK3
): Promise<AdminK3ApproverInfo | null> {
  const row = await queryOne<AdminK3ApproverInfo>(
    `SELECT u.id, u.nama, u.email, u.nik
     FROM admin_k3_email_routing r
     JOIN users u ON u.id = r.user_id
     WHERE r.jenis_form = $1 AND u.role = 'admin_k3' AND u.is_active = TRUE`,
    [jenisForm]
  );
  return row;
}

// ── Ambil seluruh mapping (untuk halaman admin & filter approval) ──
export async function getAllRouting(): Promise<Record<string, AdminK3ApproverInfo | null>> {
  const rows = await query<{ jenis_form: string; id: number; nama: string; email: string | null }>(
    `SELECT r.jenis_form, u.id, u.nama, u.email
     FROM admin_k3_email_routing r
     JOIN users u ON u.id = r.user_id
     WHERE u.role = 'admin_k3' AND u.is_active = TRUE`
  );
  const result: Record<string, AdminK3ApproverInfo | null> = {
    'hot-work': null,
    'height-work': null,
    'workshop': null,
    'general-permit': null,
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
  await ensureRoutingConstraint();
  await query(
    `INSERT INTO admin_k3_email_routing (jenis_form, user_id, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (jenis_form)
     DO UPDATE SET user_id = $2, updated_at = NOW(), updated_by = $3`,
    [jenisForm, userId, updatedBy]
  );
}

// ── Simpan user approver tahap selanjutnya (mis. SFO atau SMR) untuk suatu form ──
export async function setAssignedApproverForForm(
  idForm: string,
  role: 'sfo' | 'smr',
  userId: number,
  assignedBy?: number | null
): Promise<AdminK3ApproverInfo | null> {
  if (!idForm || !userId) return null;
  await ensureApproverAssignmentTable();

  const targetUser = await queryOne<AdminK3ApproverInfo>(
    `SELECT id, nama, email, nik FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE`,
    [userId, role]
  );
  if (!targetUser) return null;

  await query(
    `INSERT INTO form_approver_assignments (id_form, role, user_id, assigned_by, assigned_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (id_form, role)
     DO UPDATE SET user_id = $3, assigned_by = $4, assigned_at = NOW()`,
    [idForm, role, userId, assignedBy ?? null]
  );

  // Update kolom nama sfo / mr_pga_mgr pada form kerja jika ada
  const colName = role === 'sfo' ? 'sfo' : 'mr_pga_mgr';
  for (const tbl of ['form_kerja_panas', 'form_kerja_workshop', 'form_kerja_ketinggian']) {
    await query(
      `UPDATE ${tbl} SET ${colName} = $1 WHERE id_form = $2`,
      [targetUser.nama, idForm]
    ).catch(() => {});
  }

  return targetUser;
}

// ── Simpan penugasan approver untuk form induk eksternal beserta seluruh lampiran terkait ──
export async function setAssignedApproverCascade(
  idIjinKerja: string,
  role: 'sfo' | 'smr',
  userId: number,
  assignedBy?: number | null
): Promise<AdminK3ApproverInfo | null> {
  if (!idIjinKerja || !userId) return null;
  const targetUser = await setAssignedApproverForForm(idIjinKerja, role, userId, assignedBy);
  if (!targetUser) return null;

  const colName = role === 'sfo' ? 'sfo' : 'mr_pga_mgr';
  for (const tbl of ['form_kerja_panas', 'form_kerja_workshop', 'form_kerja_ketinggian']) {
    const childRows = await query<{ id_form: string }>(
      `SELECT id_form FROM ${tbl} WHERE id_ijin_kerja = $1`,
      [idIjinKerja]
    );
    for (const child of childRows) {
      await query(
        `INSERT INTO form_approver_assignments (id_form, role, user_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id_form, role)
         DO UPDATE SET user_id = $3, assigned_by = $4, assigned_at = NOW()`,
        [child.id_form, role, userId, assignedBy ?? null]
      );
      await query(
        `UPDATE ${tbl} SET ${colName} = $1 WHERE id_form = $2`,
        [targetUser.nama, child.id_form]
      ).catch(() => {});
    }
  }

  return targetUser;
}

// ── Ambil approver (SFO / SMR) yang ditugaskan khusus pada suatu form ──
export async function getAssignedApproverForForm(
  idForm: string,
  role: string
): Promise<AdminK3ApproverInfo | null> {
  if (!idForm || !role) return null;
  await ensureApproverAssignmentTable();
  const row = await queryOne<AdminK3ApproverInfo>(
    `SELECT u.id, u.nama, u.email, u.nik
     FROM form_approver_assignments fa
     JOIN users u ON u.id = fa.user_id
     WHERE fa.id_form = $1 AND fa.role = $2 AND u.is_active = TRUE`,
    [idForm, role]
  );
  return row;
}
