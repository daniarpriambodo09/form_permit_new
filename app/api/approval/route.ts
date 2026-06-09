// app/api/approval/route.ts
// ADDED: SPV hanya melihat form dari departemen yang sama dengan pembuat form.
//        Filter menggunakan JOIN ke tabel users via user_id FK — tanpa kolom baru.
//        Role lain (admin, admin_k3, sfo, smr, kontraktor) tidak terpengaruh.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME, UserRole } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

type FormType = 'hot-work' | 'workshop' | 'height-work';

const FW_FORMS: FormType[] = ['hot-work', 'workshop'];

const FORM_CONFIG: Record<FormType, { table: string; pgaColumn: string }> = {
  'hot-work':    { table: 'form_kerja_panas',      pgaColumn: 'mr_pga_approved' },
  'workshop':    { table: 'form_kerja_workshop',   pgaColumn: 'mr_pga_approved' },
  'height-work': { table: 'form_kerja_ketinggian', pgaColumn: 'mr_pga_approved' },
};

const TIPE_EXPR = `CASE
  WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
  WHEN petugas_ketinggian ILIKE '%eksternal%' THEN 'eksternal'
  ELSE 'internal'
END`;

const TIPE_EXPR_FW = `CASE
  WHEN tipe_perusahaan IN ('internal','eksternal') THEN tipe_perusahaan
  ELSE 'internal'
END`;

// ── buildSelectQuery ──────────────────────────────────────────
// spvDepartmen: jika diisi, query pakai JOIN + filter departmen pembuat form.
// Jika null, query seperti semula (tanpa JOIN).
function buildSelectQuery(
  formType: FormType,
  whereClause: string,
  params: any[] = [],
  spvDepartmen?: string | null
): [string, any[]] {
  const { table, pgaColumn } = FORM_CONFIG[formType];

  if (spvDepartmen != null) {
    // Tambahkan departmen sebagai parameter berikutnya
    const deptParam = `$${params.length + 1}`;
    const newParams = [...params, spvDepartmen];

    if (formType === 'height-work') {
      return [
        `SELECT
           f.id_form, f.tanggal, f.tanggal_pelaksanaan, f.status, f.current_stage,
           NULL AS no_registrasi,
           NULL AS nama_kontraktor_nik,
           f.lokasi AS lokasi_pekerjaan,
           f.waktu_mulai AS waktu_pukul,
           f.catatan_reject, f.approved_by, f.approved_at,
           f.spv_approved, f.spv_approved_by,
           f.kontraktor_approved, f.kontraktor_approved_by,
           f.admin_k3_approved, f.admin_k3_approved_by,
           f.sfo_approved, f.sfo_approved_by,
           f.${pgaColumn} AS mr_pga_approved,
           f.${pgaColumn}_by AS mr_pga_approved_by,
           (${TIPE_EXPR.replace(/tipe_perusahaan/g, 'f.tipe_perusahaan').replace(/petugas_ketinggian/g, 'f.petugas_ketinggian')}) AS tipe_perusahaan,
           '${formType}' AS jenis_form
         FROM ${table} f
         JOIN users creator ON creator.id = f.user_id
         WHERE (${whereClause})
           AND creator.departmen = ${deptParam}
         ORDER BY f.tanggal ASC`,
        newParams,
      ];
    }

    return [
      `SELECT
         f.id_form, f.tanggal, f.tanggal_pelaksanaan, f.status, f.current_stage,
         f.no_registrasi, f.nama_kontraktor_nik, f.lokasi_pekerjaan, f.waktu_pukul,
         f.catatan_reject, f.approved_by, f.approved_at,
         f.nama_fire_watch, f.nik_fire_watch,
         f.spv_approved, f.spv_approved_by,
         f.kontraktor_approved, f.kontraktor_approved_by,
         f.admin_k3_approved, f.admin_k3_approved_by,
         f.sfo_approved, f.sfo_approved_by,
         f.${pgaColumn} AS mr_pga_approved,
         f.${pgaColumn}_by AS mr_pga_approved_by,
         (${TIPE_EXPR_FW.replace(/tipe_perusahaan/g, 'f.tipe_perusahaan')}) AS tipe_perusahaan,
         '${formType}' AS jenis_form
       FROM ${table} f
       JOIN users creator ON creator.id = f.user_id
       WHERE (${whereClause})
         AND creator.departmen = ${deptParam}
       ORDER BY f.tanggal ASC`,
      newParams,
    ];
  }

  // ── Query original (tanpa filter departmen) ───────────────
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
         (${TIPE_EXPR}) AS tipe_perusahaan,
         '${formType}' AS jenis_form
       FROM ${table}
       WHERE ${whereClause}
       ORDER BY tanggal ASC`,
      params,
    ];
  }

  return [
    `SELECT
       id_form, tanggal, tanggal_pelaksanaan, status, current_stage,
       no_registrasi, nama_kontraktor_nik, lokasi_pekerjaan, waktu_pukul,
       catatan_reject, approved_by, approved_at,
       nama_fire_watch, nik_fire_watch,
       spv_approved, spv_approved_by,
       kontraktor_approved, kontraktor_approved_by,
       admin_k3_approved, admin_k3_approved_by,
       sfo_approved, sfo_approved_by,
       ${pgaColumn} AS mr_pga_approved,
       ${pgaColumn}_by AS mr_pga_approved_by,
       (${TIPE_EXPR_FW}) AS tipe_perusahaan,
       '${formType}' AS jenis_form
     FROM ${table}
     WHERE ${whereClause}
     ORDER BY tanggal ASC`,
    params,
  ];
}

// ── countByQuery ──────────────────────────────────────────────
// spvDepartmen: jika diisi, JOIN + filter departmen.
async function countByQuery(
  formType: FormType,
  whereClause: string,
  params: any[] = [],
  spvDepartmen?: string | null
): Promise<number> {
  const { table } = FORM_CONFIG[formType];

  if (spvDepartmen != null) {
    const deptParam = `$${params.length + 1}`;
    const res = await query(
      `SELECT COUNT(*) as count
       FROM ${table} f
       JOIN users creator ON creator.id = f.user_id
       WHERE (${whereClause})
         AND creator.departmen = ${deptParam}`,
      [...params, spvDepartmen]
    );
    return parseInt(res[0].count);
  }

  const res = await query(
    `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`,
    params
  );
  return parseInt(res[0].count);
}

const sum = (arr: (number | Promise<number>)[]) =>
  arr.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) as number;

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter     = searchParams.get('status') || 'submitted';
    const countOnly        = searchParams.get('countOnly') === '1';
    const userRole         = user.role as UserRole;
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

    // ── FIREWATCH ────────────────────────────────────────────────
    if (userRole === 'firewatch') {
      return NextResponse.json({ data: [], total: 0, message: 'Fire Watch tidak memiliki antrian approval.' });
    }

    // ── SPV ──────────────────────────────────────────────────────
    // ADDED: Filter departmen — SPV hanya melihat form dari departemennya sendiri.
    // Mengambil departmen SPV dari DB (tidak ada di JWT payload).
    if (userRole === 'spv') {
      // Ambil departmen SPV dari DB
      const spvRow = await queryOne<{ departmen: string | null }>(
        `SELECT departmen FROM users WHERE id = $1`,
        [user.userId]
      );
      const spvDepartmen = spvRow?.departmen ?? null;
      // Jika departmen null (data tidak lengkap), SPV tidak melihat form apapun
      // untuk mencegah over-exposure. Ubah ke `undefined` jika ingin fallback lihat semua.
      if (spvDepartmen === null) {
        return NextResponse.json({ data: [], total: 0 });
      }

      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'internal'], spvDepartmen)),
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 2, 'eksternal'], spvDepartmen)),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 1, 'internal'], spvDepartmen),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 2, 'eksternal'], spvDepartmen),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `spv_approved = TRUE`, [], spvDepartmen))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected'], spvDepartmen))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'internal'], spvDepartmen))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 2, 'eksternal'], spvDepartmen))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 1, 'internal'], spvDepartmen)),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 2, 'eksternal'], spvDepartmen)),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `spv_approved = TRUE`, [], spvDepartmen))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected'], spvDepartmen))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── KONTRAKTOR ───────────────────────────────────────────────
    if (userRole === 'kontraktor') {
      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'eksternal'])),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 1, 'eksternal']),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `kontraktor_approved = TRUE`))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) }});
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 1, 'eksternal']))),
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

    // ── SMR (dahulu PGA / MR_PGA) ────────────────────────────────
    if (userRole === 'smr') {
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