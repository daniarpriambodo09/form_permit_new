// app/api/approval/[jenisForm]/[id]/route.ts
// REFACTOR: Hapus Fire Watch dari approval workflow.
//
// WORKFLOW BARU — stage dimulai dari 1:
//   Hot-work & Workshop INTERNAL:  1=spv → 2=admin_k3 → 3=sfo → 4=pga(mr_pga)
//   Hot-work & Workshop EKSTERNAL: 1=kontraktor → 2=spv → 3=admin_k3 → 4=sfo → 5=pga(mr_pga)
//   Height-work INTERNAL:          1=spv → 2=admin_k3 → 3=sfo → 4=pga(mr_pga)
//   Height-work EKSTERNAL:         1=kontraktor → 2=spv → 3=admin_k3 → 4=sfo → 5=pga(mr_pga)
//
// Catatan penting:
// - firewatch TIDAK BISA approve. Request dari role firewatch akan ditolak 403.
// - Form hot-work & workshop yang di-submit: current_stage dimulai dari 1 (SPV/Kontraktor).
// - Form yang sudah ada di DB dengan current_stage=0 (lama) harus di-migrate ke 1.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME, UserRole, canUserApproveAtStage, getStageToRoleMap, getStageConfig } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

type FormType = 'hot-work' | 'workshop' | 'height-work';

// ── Konfigurasi per form type ────────────────────────────────
const FORM_CONFIG: Record<FormType, {
  table:        string;
  idColumn:     string;
  pgaApprCol:   string;   // kolom boolean approved terakhir
  pgaByCol:     string;   // kolom nama approver terakhir
}> = {
  'hot-work': {
    table:      'form_kerja_panas',
    idColumn:   'id_form',
    pgaApprCol: 'mr_pga_approved',
    pgaByCol:   'mr_pga_approved_by',
  },
  'workshop': {
    table:      'form_kerja_workshop',
    idColumn:   'id_form',
    pgaApprCol: 'mr_pga_approved',
    pgaByCol:   'mr_pga_approved_by',
  },
  'height-work': {
    table:      'form_kerja_ketinggian',
    idColumn:   'id_form',
    pgaApprCol: 'mr_pga_approved',
    pgaByCol:   'mr_pga_approved_by',
  },
};

// SQL normalisasi tipe_perusahaan
const TIPE_EXPR = `CASE
  WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
  WHEN petugas_ketinggian ILIKE '%eksternal%' THEN 'eksternal'
  ELSE 'internal'
END`;

const TIPE_EXPR_FW = `CASE
  WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
  ELSE 'internal'
END`;

// ── Mapping role → kolom DB (approved & approved_by) ────────
// Dipakai saat PATCH untuk menentukan kolom apa yang harus di-UPDATE.
function getRoleApprovalColumns(role: UserRole, formType: FormType, isLastStage: boolean): {
  approvedCol:   string;
  approvedByCol: string;
} | null {
  const config = FORM_CONFIG[formType];

  if (isLastStage) {
    return {
      approvedCol:   config.pgaApprCol,
      approvedByCol: config.pgaByCol,
    };
  }

  const map: Partial<Record<UserRole, { approvedCol: string; approvedByCol: string }>> = {
    kontraktor: { approvedCol: 'kontraktor_approved', approvedByCol: 'kontraktor_approved_by' },
    spv:        { approvedCol: 'spv_approved',        approvedByCol: 'spv_approved_by' },
    admin_k3:   { approvedCol: 'admin_k3_approved',   approvedByCol: 'admin_k3_approved_by' },
    sfo:        { approvedCol: 'sfo_approved',        approvedByCol: 'sfo_approved_by' },
  };

  return map[role] ?? null;
}

// ── GET: Detail satu form untuk halaman approval ─────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jenisForm: string; id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jenisForm, id } = await params;
  const formType = jenisForm as FormType;
  const config   = FORM_CONFIG[formType];
  if (!config) return NextResponse.json({ error: 'Jenis form tidak valid' }, { status: 400 });

  try {
    const tipeExpr = formType === 'height-work' ? TIPE_EXPR : TIPE_EXPR_FW;
    const row = await queryOne(
      `SELECT *, (${tipeExpr}) AS tipe_perusahaan_normalized
       FROM ${config.table}
       WHERE ${config.idColumn} = $1`,
      [id]
    );
    if (!row) return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });

    // Normalisasi: pakai tipe_perusahaan_normalized sebagai tipe_perusahaan
    row.tipe_perusahaan = row.tipe_perusahaan_normalized ?? row.tipe_perusahaan;
    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    console.error(`[GET /api/approval/${jenisForm}/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Approve atau Reject ───────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jenisForm: string; id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jenisForm, id } = await params;
  const formType = jenisForm as FormType;
  const config   = FORM_CONFIG[formType];
  if (!config) return NextResponse.json({ error: 'Jenis form tidak valid' }, { status: 400 });

  const userRole = user.role as UserRole;

  // HARD BLOCK: firewatch tidak bisa approve sama sekali
  if (userRole === 'firewatch' || userRole === 'worker') {
    return NextResponse.json(
      { error: 'Role Anda tidak memiliki hak untuk melakukan approval.' },
      { status: 403 }
    );
  }

  try {
    const body   = await req.json();
    const action = body.action as 'approve' | 'reject';
    const catatanReject = body.catatan_reject ?? '';

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
    }
    if (action === 'reject' && !catatanReject.trim()) {
      return NextResponse.json({ error: 'Catatan reject wajib diisi' }, { status: 400 });
    }

    // Baca form dari DB
    const tipeExpr = formType === 'height-work' ? TIPE_EXPR : TIPE_EXPR_FW;
    const form = await queryOne<{
      id_form: string;
      status: string;
      current_stage: number;
      tipe_perusahaan: string;
      jabatan_pemberi_izin?: string | null;
    }>(
      `SELECT id_form, status, current_stage, (${tipeExpr}) AS tipe_perusahaan
       FROM ${config.table}
       WHERE id_form = $1`,
      [id]
    );

    if (!form) return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    if (form.status !== 'submitted') {
      return NextResponse.json({ error: `Form status "${form.status}" tidak bisa di-approve/reject` }, { status: 400 });
    }

    const tipePerusahaan = form.tipe_perusahaan;
    const currentStage   = form.current_stage;

    // Cek apakah user berhak approve di stage ini
    const canApprove = userRole === 'admin' || canUserApproveAtStage(userRole, currentStage, formType, tipePerusahaan);
    if (!canApprove) {
      const stageMap   = getStageToRoleMap(formType, tipePerusahaan);
      const neededRole = stageMap[currentStage] ?? '?';
      return NextResponse.json(
        { error: `Stage ini membutuhkan role "${neededRole}". Anda adalah "${userRole}".` },
        { status: 403 }
      );
    }

    const now      = new Date().toISOString();
    const userName = user.nama || user.username;

    // ── REJECT ───────────────────────────────────────────────
    if (action === 'reject') {
      await query(
        `UPDATE ${config.table} SET
           status         = 'rejected',
           catatan_reject = $1,
           approved_by    = $2,
           approved_at    = $3
         WHERE id_form = $4`,
        [catatanReject, userName, now, id]
      );
      return NextResponse.json({ success: true, action: 'rejected', id_form: id });
    }

    // ── APPROVE ──────────────────────────────────────────────
    const stageConfig  = getStageConfig(formType, tipePerusahaan);
    const maxStage     = stageConfig.totalStages; // stage terakhir (inklusif)
    const isLastStage  = currentStage === maxStage;
    const nextStage    = currentStage + 1;

    // Kolom yang perlu di-update untuk role ini
    const cols = getRoleApprovalColumns(userRole, formType, isLastStage);
    if (!cols && userRole !== 'admin') {
      return NextResponse.json({ error: 'Tidak dapat menentukan kolom approval untuk role ini' }, { status: 500 });
    }

    // Bangun SET clause dinamis
    const setClauses: string[] = [];
    const queryParams: any[]   = [];
    let   paramIdx             = 1;

    // Mark kolom approval role ini
    if (cols) {
      setClauses.push(`${cols.approvedCol} = $${paramIdx++}`);   queryParams.push(true);
      setClauses.push(`${cols.approvedByCol} = $${paramIdx++}`); queryParams.push(userName);
    }

    // SPV hot-work/workshop: simpan jabatan & NIK pemberi izin
    if (userRole === 'spv' && (formType === 'hot-work' || formType === 'workshop')) {
      setClauses.push(`jabatan_pemberi_izin = $${paramIdx++}`); queryParams.push(user.jabatan || null);
      setClauses.push(`nik_pemberi_ijin = $${paramIdx++}`);     queryParams.push(String(user.userId) || null);
    }

    if (isLastStage) {
      // Form selesai disetujui seluruh chain
      setClauses.push(`status = $${paramIdx++}`);      queryParams.push('approved');
      setClauses.push(`approved_by = $${paramIdx++}`); queryParams.push(userName);
      setClauses.push(`approved_at = $${paramIdx++}`); queryParams.push(now);
    } else {
      // Lanjut ke stage berikutnya
      setClauses.push(`current_stage = $${paramIdx++}`); queryParams.push(nextStage);
    }

    setClauses.push(`updated_at = $${paramIdx++}`); queryParams.push(now);

    queryParams.push(id); // untuk WHERE

    await query(
      `UPDATE ${config.table} SET ${setClauses.join(', ')} WHERE id_form = $${paramIdx}`,
      queryParams
    );

    return NextResponse.json({
      success:      true,
      action:       'approved',
      id_form:      id,
      next_stage:   isLastStage ? null : nextStage,
      is_completed: isLastStage,
    });

  } catch (err: any) {
    console.error(`[PATCH /api/approval/${jenisForm}/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}