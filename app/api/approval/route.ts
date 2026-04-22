// app/api/approval/route.ts
// FIX: buildSelectQuery hot-work/workshop sekarang ikutkan tipe_perusahaan
// FIX: semua role query sekarang aware tipe_perusahaan untuk hot-work & workshop
//
// Alur hot-work & workshop:
//   Internal:  fw(0) → spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Eksternal: kontraktor(0) → fw(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
//
// Alur height-work:
//   Internal:  spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Eksternal: kontraktor(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME, UserRole } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

type FormType = 'hot-work' | 'workshop' | 'height-work';

const FW_FORMS: FormType[] = ['hot-work', 'workshop'];

const FORM_CONFIG: Record<FormType, { table: string; pgaColumn: string }> = {
  'hot-work':    { table: 'form_kerja_panas',      pgaColumn: 'pga_approved' },
  'workshop':    { table: 'form_kerja_workshop',   pgaColumn: 'pga_approved' },
  'height-work': { table: 'form_kerja_ketinggian', pgaColumn: 'mr_pga_approved' },
};

// Ekspresi SQL normalisasi tipe_perusahaan (handle data lama & baru)
const TIPE_EXPR = `CASE
  WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
  WHEN petugas_ketinggian ILIKE '%eksternal%' THEN 'eksternal'
  ELSE 'internal'
END`;

// Ekspresi untuk hot-work & workshop (tidak punya petugas_ketinggian)
const TIPE_EXPR_FW = `CASE
  WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
  ELSE 'internal'
END`;

function buildSelectQuery(formType: FormType, whereClause: string, params: any[] = []): [string, any[]] {
  const { table, pgaColumn } = FORM_CONFIG[formType];

  if (formType === 'height-work') {
    return [
      `SELECT
         id_form, tanggal, tanggal_pelaksanaan, status, current_stage,
         NULL AS no_registrasi,
         NULL AS nama_kontraktor_nik,
         lokasi AS lokasi_pekerjaan,
         waktu_mulai AS waktu_pukul,
         catatan_reject, approved_by, approved_at,
         spv_approved, spv_approved_by,
         kontraktor_approved, kontraktor_approved_by,
         admin_k3_approved, admin_k3_approved_by,
         sfo_approved, sfo_approved_by,
         ${pgaColumn} AS mr_pga_approved,
         ${pgaColumn}_by AS mr_pga_approved_by,
         NULL AS fw_approved,
         NULL AS pga_approved,
         (${TIPE_EXPR}) AS tipe_perusahaan,
         '${formType}' AS jenis_form
       FROM ${table}
       WHERE ${whereClause}
       ORDER BY tanggal ASC`,
      params,
    ];
  }

  // hot-work & workshop — sekarang ikutkan tipe_perusahaan dan semua kolom approval baru
  return [
    `SELECT
       id_form, tanggal, tanggal_pelaksanaan, status, current_stage,
       no_registrasi, nama_kontraktor_nik, lokasi_pekerjaan, waktu_pukul,
       catatan_reject, approved_by, approved_at,
       fw_approved, fw_approved_by,
       spv_approved, spv_approved_by,
       kontraktor_approved, kontraktor_approved_by,
       admin_k3_approved, admin_k3_approved_by,
       sfo_approved, sfo_approved_by,
       ${pgaColumn} AS pga_approved,
       ${pgaColumn}_by AS pga_approved_by,
       mr_pga_approved, mr_pga_approved_by,
       (${TIPE_EXPR_FW}) AS tipe_perusahaan,
       '${formType}' AS jenis_form
     FROM ${table}
     WHERE ${whereClause}
     ORDER BY tanggal ASC`,
    params,
  ];
}

async function countByQuery(formType: FormType, whereClause: string, params: any[] = []): Promise<number> {
  const { table } = FORM_CONFIG[formType];
  const res = await query(`SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`, params);
  return parseInt(res[0].count);
}

const sum = (arr: (number | Promise<number>)[]) =>
  arr.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) as number;

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'submitted';
    const countOnly    = searchParams.get('countOnly') === '1';

    const userRole     = user.role as UserRole;
    const allFormTypes: FormType[] = ['hot-work', 'workshop', 'height-work'];

    // ── ADMIN: lihat semua ──────────────────────────────────────
    if (userRole === 'admin') {
      if (countOnly) {
        const [submitted, approved, rejected] = await Promise.all([
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['submitted']))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['approved']))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: {
          submitted: sum(submitted), approved: sum(approved), rejected: sum(rejected),
        }});
      }
      const results = await Promise.all(
        allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, [statusFilter])))
      );
      return NextResponse.json({ data: results.flat(), total: results.flat().length });
    }

    // ── WORKER ──────────────────────────────────────────────────
    if (userRole === 'worker') {
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── FIRE WATCH ───────────────────────────────────────────────
    // Melihat:
    //   - hot-work/workshop INTERNAL stage 0
    //   - hot-work/workshop EKSTERNAL stage 1
    if (userRole === 'firewatch') {
      if (countOnly) {
        const [subm, appr] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 0, 'internal'])),
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'eksternal'])),
          ]),
          Promise.all(FW_FORMS.map(f => countByQuery(f, `fw_approved = TRUE`))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: 0 }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 0, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'eksternal']))),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all(
          FW_FORMS.map(f => query(...buildSelectQuery(f, `fw_approved = TRUE`)))
        );
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(
          FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected'])))
        );
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── SPV ─────────────────────────────────────────────────────
    // Melihat:
    //   - hot-work/workshop INTERNAL stage 1
    //   - hot-work/workshop EKSTERNAL stage 2
    //   - height-work internal stage 1
    //   - height-work eksternal stage 2
    if (userRole === 'spv') {
      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'internal'])),
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 2, 'eksternal'])),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 1, 'internal']),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 2, 'eksternal']),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `spv_approved = TRUE`))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 2, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 1, 'internal'])),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 2, 'eksternal'])),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `spv_approved = TRUE`))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected']))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── KONTRAKTOR ───────────────────────────────────────────────
    // Melihat:
    //   - hot-work/workshop EKSTERNAL stage 0
    //   - height-work eksternal stage 1
    if (userRole === 'kontraktor') {
      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 0, 'eksternal'])),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 1, 'eksternal']),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `kontraktor_approved = TRUE`))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 0, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 1, 'eksternal'])),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `kontraktor_approved = TRUE`))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected']))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── ADMIN K3 ─────────────────────────────────────────────────
    // Melihat:
    //   - hot-work/workshop INTERNAL stage 2
    //   - hot-work/workshop EKSTERNAL stage 3
    //   - height-work internal stage 2
    //   - height-work eksternal stage 3
    if (userRole === 'admin_k3') {
      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 2, 'internal'])),
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 3, 'eksternal'])),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 2, 'internal']),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 3, 'eksternal']),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `admin_k3_approved = TRUE`))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 2, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 3, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 2, 'internal'])),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 3, 'eksternal'])),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `admin_k3_approved = TRUE`))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected']))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── SFO ──────────────────────────────────────────────────────
    // Melihat:
    //   - hot-work/workshop INTERNAL stage 3
    //   - hot-work/workshop EKSTERNAL stage 4
    //   - height-work internal stage 3
    //   - height-work eksternal stage 4
    if (userRole === 'sfo') {
      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 3, 'internal'])),
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 4, 'eksternal'])),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 3, 'internal']),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 4, 'eksternal']),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `sfo_approved = TRUE`))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 3, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 4, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 3, 'internal'])),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 4, 'eksternal'])),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `sfo_approved = TRUE`))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected']))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── PGA / MR_PGA ─────────────────────────────────────────────
    // Melihat:
    //   - hot-work/workshop INTERNAL stage 4
    //   - hot-work/workshop EKSTERNAL stage 5
    //   - height-work internal stage 4
    //   - height-work eksternal stage 5
    if (userRole === 'pga') {
      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 4, 'internal'])),
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 5, 'eksternal'])),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 4, 'internal']),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 5, 'eksternal']),
          ]),
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `mr_pga_approved = TRUE`)),
            countByQuery('height-work', `mr_pga_approved = TRUE`),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 4, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 5, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 4, 'internal'])),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 5, 'eksternal'])),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `mr_pga_approved = TRUE`))),
          query(...buildSelectQuery('height-work', `mr_pga_approved = TRUE`)),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected']))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    return NextResponse.json({ data: [], total: 0 });

  } catch (err: any) {
    console.error('[GET /api/approval]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}