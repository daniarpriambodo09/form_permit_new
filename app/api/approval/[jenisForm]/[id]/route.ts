// app/api/approval/[jenisForm]/[id]/route.ts
// FIX: Alur PATCH hot-work & workshop sekarang:
//   Internal:  fw(0) → spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Eksternal: kontraktor(0) → fw(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
//
// Height-work tidak berubah:
//   Internal:  spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Eksternal: kontraktor(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME, UserRole, requiresFireWatch } from '@/lib/auth';

const TABLE_MAP: Record<string, string> = {
  'hot-work':    'form_kerja_panas',
  'workshop':    'form_kerja_workshop',
  'height-work': 'form_kerja_ketinggian',
};

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

async function getUserNik(userId: number): Promise<string | null> {
  const row = await queryOne<{ nik: string | null }>(
    `SELECT nik FROM users WHERE id = $1`, [userId]
  );
  return row?.nik ?? null;
}

async function getUserJabatan(userId: number): Promise<string | null> {
  const row = await queryOne<{ jabatan: string | null }>(
    `SELECT jabatan FROM users WHERE id = $1`, [userId]
  );
  return row?.jabatan ?? null;
}

// ── Normalisasi tipe_perusahaan ───────────────────────────────
function normalizeTipe(
  tipe_perusahaan: string | null,
  petugas_ketinggian: string | null
): 'internal' | 'eksternal' {
  if (tipe_perusahaan === 'eksternal') return 'eksternal';
  if (tipe_perusahaan === 'internal') return 'internal';
  if (petugas_ketinggian?.toLowerCase().includes('eksternal')) return 'eksternal';
  return 'internal';
}

// ── Helper: required role per stage ──────────────────────────
function getRequiredRole(
  jenisForm: string,
  currentStage: number,
  isEksternal: boolean
): UserRole | null {
  // ── HOT-WORK / WORKSHOP ───────────────────────────────────
  if (requiresFireWatch(jenisForm)) {
    if (isEksternal) {
      // Eksternal: 0=kontraktor, 1=fw, 2=spv, 3=admin_k3, 4=sfo, 5=pga
      const map: Record<number, UserRole> = {
        0: 'kontraktor',
        1: 'firewatch',
        2: 'spv',
        3: 'admin_k3',
        4: 'sfo',
        5: 'pga',
      };
      return map[currentStage] ?? null;
    }
    // Internal: 0=fw, 1=spv, 2=admin_k3, 3=sfo, 4=pga
    const map: Record<number, UserRole> = {
      0: 'firewatch',
      1: 'spv',
      2: 'admin_k3',
      3: 'sfo',
      4: 'pga',
    };
    return map[currentStage] ?? null;
  }

  // ── HEIGHT-WORK ──────────────────────────────────────────
  if (!isEksternal) {
    // Internal: 1=spv, 2=admin_k3, 3=sfo, 4=pga
    const map: Record<number, UserRole> = {
      1: 'spv', 2: 'admin_k3', 3: 'sfo', 4: 'pga',
    };
    return map[currentStage] ?? null;
  }
  // Eksternal: 1=kontraktor, 2=spv, 3=admin_k3, 4=sfo, 5=pga
  const map: Record<number, UserRole> = {
    1: 'kontraktor', 2: 'spv', 3: 'admin_k3', 4: 'sfo', 5: 'pga',
  };
  return map[currentStage] ?? null;
}

type Params = { params: Promise<{ jenisForm: string; id: string }> };

// ── GET: Detail satu form ──────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jenisForm, id } = await params;
  const table = TABLE_MAP[jenisForm];
  if (!table) return NextResponse.json({ error: 'Jenis form tidak valid' }, { status: 400 });

  try {
    const row = await queryOne(`SELECT * FROM ${table} WHERE id_form = $1`, [id]);
    if (!row) return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Approve / Reject ────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jenisForm, id } = await params;
  const table = TABLE_MAP[jenisForm];
  if (!table) return NextResponse.json({ error: 'Jenis form tidak valid' }, { status: 400 });

  try {
    const body = await req.json();
    const { action, catatan_reject } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action harus "approve" atau "reject"' }, { status: 400 });
    }
    if (action === 'reject' && !catatan_reject?.trim()) {
      return NextResponse.json({ error: 'Catatan alasan penolakan wajib diisi' }, { status: 400 });
    }

    // Kolom petugas_ketinggian hanya ada di form_kerja_ketinggian,
    // jangan di-query untuk hot-work / workshop
    const selectCols = jenisForm === 'height-work'
      ? `current_stage, status, tipe_perusahaan, petugas_ketinggian`
      : `current_stage, status, tipe_perusahaan`;

    const form = await queryOne(
      `SELECT ${selectCols} FROM ${table} WHERE id_form = $1`,
      [id]
    );
    if (!form) return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });

    const userRole     = user.role as UserRole;
    const currentStage = form.current_stage as number;
    const now          = new Date().toISOString();

    const isEksternal = normalizeTipe(form.tipe_perusahaan, form.petugas_ketinggian) === 'eksternal';

    const userNik     = await getUserNik(user.userId);
    const userJabatan = await getUserJabatan(user.userId);

    // ── Validasi role vs stage ─────────────────────────────────
    const requiredRole = getRequiredRole(jenisForm, currentStage, isEksternal);

    if (requiredRole === null && userRole !== 'admin') {
      return NextResponse.json({ error: 'Stage tidak dikenali' }, { status: 400 });
    }
    if (userRole !== requiredRole && userRole !== 'admin') {
      return NextResponse.json(
        { error: `Anda tidak memiliki otoritas untuk approve form di tahap ini. Tahap saat ini: ${currentStage} (${requiredRole})` },
        { status: 403 }
      );
    }

    // ── REJECT ─────────────────────────────────────────────────
    if (action === 'reject') {
      let resetStage: number;
      let resetColumns: string;

      if (requiresFireWatch(jenisForm)) {
        // Reset ke awal: internal=0 (fw), eksternal=0 (kontraktor)
        resetStage = 0;
        resetColumns = `
          fw_approved = FALSE, fw_approved_by = NULL, fw_approved_at = NULL,
          pemberi_izin_approved = FALSE, pemberi_izin_approved_by = NULL, pemberi_izin_approved_at = NULL,
          nama_fire_watch = NULL, nik_fire_watch = NULL,
          jabatan_pemberi_izin = NULL, nik_pemberi_ijin = NULL,
          spv_approved = FALSE, spv_approved_by = NULL, spv_approved_at = NULL,
          kontraktor_approved = FALSE, kontraktor_approved_by = NULL, kontraktor_approved_at = NULL,
          admin_k3_approved = FALSE, admin_k3_approved_by = NULL, admin_k3_approved_at = NULL,
          sfo_approved = FALSE, sfo_approved_by = NULL, sfo_approved_at = NULL,
          pga_approved = FALSE, pga_approved_by = NULL, pga_approved_at = NULL,
          mr_pga_approved = FALSE, mr_pga_approved_by = NULL, mr_pga_approved_at = NULL`;
      } else {
        // height-work: reset ke stage 1
        resetStage = 1;
        resetColumns = `
          spv_approved = FALSE, spv_approved_by = NULL, spv_approved_at = NULL,
          kontraktor_approved = FALSE, kontraktor_approved_by = NULL, kontraktor_approved_at = NULL,
          admin_k3_approved = FALSE, admin_k3_approved_by = NULL, admin_k3_approved_at = NULL,
          sfo_approved = FALSE, sfo_approved_by = NULL, sfo_approved_at = NULL,
          mr_pga_approved = FALSE, mr_pga_approved_by = NULL, mr_pga_approved_at = NULL`;
      }

      await query(
        `UPDATE ${table}
         SET status = 'rejected',
             current_stage = $1,
             catatan_reject = $2,
             approved_by = $3,
             approved_at = $4,
             ${resetColumns},
             updated_at = $4
         WHERE id_form = $5`,
        [resetStage, catatan_reject.trim(), user.nama, now, id]
      );

      return NextResponse.json({
        success: true, id_form: id, status: 'rejected', action: 'reject',
        rejected_by: user.nama, rejected_at: now,
        message: 'Form ditolak dan dikembalikan ke tahap awal',
      });
    }

    // ── APPROVE ────────────────────────────────────────────────
    const nextStage = currentStage + 1;

    // ===========================================================
    // HOT-WORK / WORKSHOP
    // ===========================================================
    if (requiresFireWatch(jenisForm)) {

      // ── INTERNAL: fw(0) → spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
      if (!isEksternal) {
        // Stage 0: Fire Watch (internal)
        if (currentStage === 0) {
          await query(
            `UPDATE ${table}
             SET fw_approved = TRUE, fw_approved_by = $1, fw_approved_at = $2,
                 nama_fire_watch = $1, nik_fire_watch = $3,
                 current_stage = $4, status = 'submitted', updated_at = $2
             WHERE id_form = $5`,
            [user.nama, now, userNik, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'Fire Watch telah menyetujui. Form diteruskan ke SPV.' });
        }
        // Stage 1: SPV (internal)
        if (currentStage === 1) {
          const jabatanToSave = userJabatan?.trim() || '-';
          await query(
            `UPDATE ${table}
             SET spv_approved = TRUE, spv_approved_by = $1, spv_approved_at = $2,
                 spv_terkait = $1,
                 pemberi_izin_approved = TRUE, pemberi_izin_approved_by = $1, pemberi_izin_approved_at = $2,
                 jabatan_pemberi_izin = $3, nik_pemberi_ijin = $4,
                 current_stage = $5, status = 'submitted', updated_at = $2
             WHERE id_form = $6`,
            [user.nama, now, jabatanToSave, userNik, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'SPV telah menyetujui. Form diteruskan ke Admin K3.' });
        }
        // Stage 2: Admin K3 (internal)
        if (currentStage === 2) {
          await query(
            `UPDATE ${table}
             SET admin_k3_approved = TRUE, admin_k3_approved_by = $1, admin_k3_approved_at = $2,
                 current_stage = $3, status = 'submitted', updated_at = $2
             WHERE id_form = $4`,
            [user.nama, now, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'Admin K3 telah menyetujui. Form diteruskan ke SFO.' });
        }
        // Stage 3: SFO (internal)
        if (currentStage === 3) {
          await query(
            `UPDATE ${table}
             SET sfo_approved = TRUE, sfo_approved_by = $1, sfo_approved_at = $2,
                 sfo = $1, current_stage = $3, status = 'submitted', updated_at = $2
             WHERE id_form = $4`,
            [user.nama, now, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'SFO telah menyetujui. Form diteruskan ke MR/PGA.' });
        }
        // Stage 4: MR/PGA — FINAL (internal)
        if (currentStage === 4) {
          await query(
            `UPDATE ${table}
             SET mr_pga_approved = TRUE, mr_pga_approved_by = $1, mr_pga_approved_at = $2,
                 mr_pga_mgr = $1, pga = $1,
                 current_stage = 4, status = 'approved',
                 approved_by = $1, approved_at = $2, updated_at = $2
             WHERE id_form = $3`,
            [user.nama, now, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'approved',
            current_stage: 4, message: 'Form telah disetujui sepenuhnya.' });
        }
      }

      // ── EKSTERNAL: kontraktor(0) → fw(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
      if (isEksternal) {
        // Stage 0: Kontraktor (eksternal)
        if (currentStage === 0) {
          await query(
            `UPDATE ${table}
             SET kontraktor_approved = TRUE, kontraktor_approved_by = $1, kontraktor_approved_at = $2,
                 kontraktor = $1, current_stage = $3, status = 'submitted', updated_at = $2
             WHERE id_form = $4`,
            [user.nama, now, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'Kontraktor telah menyetujui. Form diteruskan ke Fire Watch.' });
        }
        // Stage 1: Fire Watch (eksternal)
        if (currentStage === 1) {
          await query(
            `UPDATE ${table}
             SET fw_approved = TRUE, fw_approved_by = $1, fw_approved_at = $2,
                 nama_fire_watch = $1, nik_fire_watch = $3,
                 current_stage = $4, status = 'submitted', updated_at = $2
             WHERE id_form = $5`,
            [user.nama, now, userNik, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'Fire Watch telah menyetujui. Form diteruskan ke SPV.' });
        }
        // Stage 2: SPV (eksternal)
        if (currentStage === 2) {
          const jabatanToSave = userJabatan?.trim() || '-';
          await query(
            `UPDATE ${table}
             SET spv_approved = TRUE, spv_approved_by = $1, spv_approved_at = $2,
                 spv_terkait = $1,
                 pemberi_izin_approved = TRUE, pemberi_izin_approved_by = $1, pemberi_izin_approved_at = $2,
                 jabatan_pemberi_izin = $3, nik_pemberi_ijin = $4,
                 current_stage = $5, status = 'submitted', updated_at = $2
             WHERE id_form = $6`,
            [user.nama, now, jabatanToSave, userNik, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'SPV telah menyetujui. Form diteruskan ke Admin K3.' });
        }
        // Stage 3: Admin K3 (eksternal)
        if (currentStage === 3) {
          await query(
            `UPDATE ${table}
             SET admin_k3_approved = TRUE, admin_k3_approved_by = $1, admin_k3_approved_at = $2,
                 current_stage = $3, status = 'submitted', updated_at = $2
             WHERE id_form = $4`,
            [user.nama, now, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'Admin K3 telah menyetujui. Form diteruskan ke SFO.' });
        }
        // Stage 4: SFO (eksternal)
        if (currentStage === 4) {
          await query(
            `UPDATE ${table}
             SET sfo_approved = TRUE, sfo_approved_by = $1, sfo_approved_at = $2,
                 sfo = $1, current_stage = $3, status = 'submitted', updated_at = $2
             WHERE id_form = $4`,
            [user.nama, now, nextStage, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'submitted',
            current_stage: nextStage, message: 'SFO telah menyetujui. Form diteruskan ke MR/PGA.' });
        }
        // Stage 5: MR/PGA — FINAL (eksternal)
        if (currentStage === 5) {
          await query(
            `UPDATE ${table}
             SET mr_pga_approved = TRUE, mr_pga_approved_by = $1, mr_pga_approved_at = $2,
                 mr_pga_mgr = $1, pga = $1,
                 current_stage = 5, status = 'approved',
                 approved_by = $1, approved_at = $2, updated_at = $2
             WHERE id_form = $3`,
            [user.nama, now, id]
          );
          return NextResponse.json({ success: true, id_form: id, status: 'approved',
            current_stage: 5, message: 'Form telah disetujui sepenuhnya.' });
        }
      }
    }

    // ===========================================================
    // HEIGHT-WORK INTERNAL: spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
    // ===========================================================
    if (jenisForm === 'height-work' && !isEksternal) {
      if (currentStage === 1) {
        await query(
          `UPDATE ${table}
           SET spv_approved = TRUE, spv_approved_by = $1, spv_approved_at = $2,
               spv_terkait = $1, current_stage = $3, status = 'submitted', updated_at = $2
           WHERE id_form = $4`,
          [user.nama, now, nextStage, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'submitted',
          current_stage: nextStage, message: 'SPV telah menyetujui. Form diteruskan ke Admin K3.' });
      }
      if (currentStage === 2) {
        await query(
          `UPDATE ${table}
           SET admin_k3_approved = TRUE, admin_k3_approved_by = $1, admin_k3_approved_at = $2,
               current_stage = $3, status = 'submitted', updated_at = $2
           WHERE id_form = $4`,
          [user.nama, now, nextStage, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'submitted',
          current_stage: nextStage, message: 'Admin K3 telah menyetujui. Form diteruskan ke SFO.' });
      }
      if (currentStage === 3) {
        await query(
          `UPDATE ${table}
           SET sfo_approved = TRUE, sfo_approved_by = $1, sfo_approved_at = $2,
               sfo = $1, current_stage = $3, status = 'submitted', updated_at = $2
           WHERE id_form = $4`,
          [user.nama, now, nextStage, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'submitted',
          current_stage: nextStage, message: 'SFO telah menyetujui. Form diteruskan ke MR/PGA.' });
      }
      if (currentStage === 4) {
        await query(
          `UPDATE ${table}
           SET mr_pga_approved = TRUE, mr_pga_approved_by = $1, mr_pga_approved_at = $2,
               mr_pga_mgr = $1, current_stage = 4, status = 'approved',
               approved_by = $1, approved_at = $2, updated_at = $2
           WHERE id_form = $3`,
          [user.nama, now, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'approved',
          current_stage: 4, message: 'Form telah disetujui sepenuhnya.' });
      }
    }

    // ===========================================================
    // HEIGHT-WORK EKSTERNAL: kontraktor(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
    // ===========================================================
    if (jenisForm === 'height-work' && isEksternal) {
      if (currentStage === 1) {
        await query(
          `UPDATE ${table}
           SET kontraktor_approved = TRUE, kontraktor_approved_by = $1, kontraktor_approved_at = $2,
               nama_kontraktor = $1, current_stage = $3, status = 'submitted', updated_at = $2
           WHERE id_form = $4`,
          [user.nama, now, nextStage, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'submitted',
          current_stage: nextStage, message: 'Kontraktor telah menyetujui. Form diteruskan ke SPV.' });
      }
      if (currentStage === 2) {
        await query(
          `UPDATE ${table}
           SET spv_approved = TRUE, spv_approved_by = $1, spv_approved_at = $2,
               spv_terkait = $1, current_stage = $3, status = 'submitted', updated_at = $2
           WHERE id_form = $4`,
          [user.nama, now, nextStage, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'submitted',
          current_stage: nextStage, message: 'SPV telah menyetujui. Form diteruskan ke Admin K3.' });
      }
      if (currentStage === 3) {
        await query(
          `UPDATE ${table}
           SET admin_k3_approved = TRUE, admin_k3_approved_by = $1, admin_k3_approved_at = $2,
               current_stage = $3, status = 'submitted', updated_at = $2
           WHERE id_form = $4`,
          [user.nama, now, nextStage, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'submitted',
          current_stage: nextStage, message: 'Admin K3 telah menyetujui. Form diteruskan ke SFO.' });
      }
      if (currentStage === 4) {
        await query(
          `UPDATE ${table}
           SET sfo_approved = TRUE, sfo_approved_by = $1, sfo_approved_at = $2,
               sfo = $1, current_stage = $3, status = 'submitted', updated_at = $2
           WHERE id_form = $4`,
          [user.nama, now, nextStage, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'submitted',
          current_stage: nextStage, message: 'SFO telah menyetujui. Form diteruskan ke MR/PGA.' });
      }
      if (currentStage === 5) {
        await query(
          `UPDATE ${table}
           SET mr_pga_approved = TRUE, mr_pga_approved_by = $1, mr_pga_approved_at = $2,
               mr_pga_mgr = $1, current_stage = 5, status = 'approved',
               approved_by = $1, approved_at = $2, updated_at = $2
           WHERE id_form = $3`,
          [user.nama, now, id]
        );
        return NextResponse.json({ success: true, id_form: id, status: 'approved',
          current_stage: 5, message: 'Form telah disetujui sepenuhnya.' });
      }
    }

    return NextResponse.json({ error: 'Stage tidak dikenali' }, { status: 400 });

  } catch (err: any) {
    console.error(`[PATCH /api/approval/...]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}