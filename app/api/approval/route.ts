// app/api/approval/route.ts
// ADDED: SPV hanya melihat form dari departemen yang sama dengan pembuat form.
//        Filter menggunakan JOIN ke tabel users via user_id FK — tanpa kolom baru.
//        Role lain (admin, admin_k3, sfo, smr, kontraktor) tidak terpengaruh.
// ADDED: Ijin Kerja Eksternal (form_ijin_kerja / jenis_form "general-permit")
//        sekarang ikut muncul untuk role SPV (stage 2), SFO (stage 4),
//        dan SMR (stage 5) — sesuai stage map:
//          1=Kontraktor(TTD di /my-forms) 2=SPV 3=Security(TTD) 4=SFO 5=SMR
// FIXED: queryGeneralPermitByStage/countGeneralPermitByStage sebelumnya
//        hanya memfilter berdasarkan departemen pembuat form (creator.departmen),
//        TANPA mencocokkan SPV Terkait (spv_terkait_pj/nik_spv_terkait_pj) yang
//        dipilih di Bagian 11 form Ijin Kerja Eksternal. Akibatnya SEMUA SPV di
//        departemen yang sama ikut melihat form tsb di antrian "submitted",
//        padahal harusnya hanya SPV yang benar-benar dipilih. Sekarang kedua
//        fungsi menerima spvNama & spvNik lalu mencocokkannya ke
//        gp.spv_terkait_pj / gp.nik_spv_terkait_pj — sama pola dengan
//        spvAssignment yang sudah dipakai hot-work/workshop di bawah.

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
  'hot-work': { table: 'form_kerja_panas', pgaColumn: 'mr_pga_approved' },
  'workshop': { table: 'form_kerja_workshop', pgaColumn: 'mr_pga_approved' },
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
function buildSelectQuery(
  formType: FormType,
  whereClause: string,
  params: any[] = [],
  spvDepartmen?: string | null
): [string, any[]] {
  const { table, pgaColumn } = FORM_CONFIG[formType];

  if (spvDepartmen != null) {
    const deptParam = `$${params.length + 1}`;
    const newParams = [...params, spvDepartmen];

    if (formType === 'height-work') {
      return [
        `SELECT
           f.id_form, f.tanggal, f.tanggal_pelaksanaan, f.status, f.current_stage,
           NULL AS no_registrasi,
           COALESCE(f.petugas_ketinggian, f.nama_kontraktor, '') AS nama_kontraktor_nik,
           COALESCE(f.petugas_ketinggian, f.nama_kontraktor, '') AS pemohon,
           f.deskripsi_pekerjaan,
           f.lokasi AS lokasi_pekerjaan,
           f.waktu_mulai AS waktu_pukul,
           f.catatan_reject, f.approved_by, f.approved_at,
           f.spv_approved, f.spv_approved_by,
           f.kontraktor_approved, f.kontraktor_approved_by,
           f.admin_k3_approved, f.admin_k3_approved_by,
           f.sfo_approved, f.sfo_approved_by,
           f.${pgaColumn} AS mr_pga_approved,
           f.${pgaColumn}_by AS mr_pga_approved_by,
           f.id_ijin_kerja,
           (${TIPE_EXPR.replace(/tipe_perusahaan/g, 'f.tipe_perusahaan').replace(/petugas_ketinggian/g, 'f.petugas_ketinggian')}) AS tipe_perusahaan,
           '${formType}' AS jenis_form
         FROM ${table} f
         JOIN users creator ON creator.id = f.user_id
         WHERE (${whereClause})
           AND (f.id_ijin_kerja IS NULL OR TRIM(f.id_ijin_kerja) = '')
           AND creator.departmen = ${deptParam}
           AND (
             f.perlu_scaffolding IS NOT TRUE
             OR EXISTS (
               SELECT 1 FROM inspeksi_scaffolding sc
               WHERE sc.id_form = f.id_form
                 AND sc.status IN ('submitted', 'approved')
             )
           )
         ORDER BY f.tanggal ASC`,
        newParams,
      ];
    }

    return [
      `SELECT
         f.id_form, f.tanggal, f.tanggal_pelaksanaan, f.status, f.current_stage,
         f.no_registrasi,
         COALESCE(f.nama_kontraktor_nik, f.nama_pekerja_nik, '') AS nama_kontraktor_nik,
         COALESCE(f.nama_kontraktor_nik, f.nama_pekerja_nik, '') AS pemohon,
         CONCAT_WS(' ', f.detail_cutting, f.detail_grinding, f.detail_welding, f.detail_painting, f.jenis_kerjaan_lainnya) AS deskripsi_pekerjaan,
         f.lokasi_pekerjaan, f.waktu_pukul,
         f.catatan_reject, f.approved_by, f.approved_at,
         f.nama_fire_watch, f.nik_fire_watch,
         f.spv_approved, f.spv_approved_by,
         f.kontraktor_approved, f.kontraktor_approved_by,
         f.admin_k3_approved, f.admin_k3_approved_by,
         f.sfo_approved, f.sfo_approved_by,
         f.${pgaColumn} AS mr_pga_approved,
         f.${pgaColumn}_by AS mr_pga_approved_by,
         f.id_ijin_kerja,
         (${TIPE_EXPR_FW.replace(/tipe_perusahaan/g, 'f.tipe_perusahaan')}) AS tipe_perusahaan,
         '${formType}' AS jenis_form
       FROM ${table} f
       JOIN users creator ON creator.id = f.user_id
       WHERE (${whereClause})
         AND (f.id_ijin_kerja IS NULL OR TRIM(f.id_ijin_kerja) = '')
         AND creator.departmen = ${deptParam}
       ORDER BY f.tanggal ASC`,
      newParams,
    ];
  }

  if (formType === 'height-work') {
    return [
      `SELECT
         f.id_form, f.tanggal, f.tanggal_pelaksanaan, f.status, f.current_stage,
         NULL AS no_registrasi,
         COALESCE(f.petugas_ketinggian, f.nama_kontraktor, '') AS nama_kontraktor_nik,
         COALESCE(f.petugas_ketinggian, f.nama_kontraktor, '') AS pemohon,
         f.deskripsi_pekerjaan,
         f.lokasi AS lokasi_pekerjaan,
         f.waktu_mulai AS waktu_pukul,
         f.catatan_reject, f.approved_by, f.approved_at,
         f.spv_approved, f.spv_approved_by,
         f.kontraktor_approved, f.kontraktor_approved_by,
         f.admin_k3_approved, f.admin_k3_approved_by,
         f.sfo_approved, f.sfo_approved_by,
         f.${pgaColumn} AS mr_pga_approved,
         f.${pgaColumn}_by AS mr_pga_approved_by,
         f.id_ijin_kerja,
         (${TIPE_EXPR}) AS tipe_perusahaan,
         '${formType}' AS jenis_form
       FROM ${table} f
       WHERE (${whereClause})
         AND (f.id_ijin_kerja IS NULL OR TRIM(f.id_ijin_kerja) = '')
         AND (
           f.perlu_scaffolding IS NOT TRUE
           OR EXISTS (
             SELECT 1 FROM inspeksi_scaffolding sc
             WHERE sc.id_form = f.id_form
               AND sc.status IN ('submitted', 'approved')
           )
         )
       ORDER BY f.tanggal ASC`,
      params,
    ];
  }

  return [
    `SELECT
       id_form, tanggal, tanggal_pelaksanaan, status, current_stage,
       no_registrasi,
       COALESCE(nama_kontraktor_nik, nama_pekerja_nik, '') AS nama_kontraktor_nik,
       COALESCE(nama_kontraktor_nik, nama_pekerja_nik, '') AS pemohon,
       CONCAT_WS(' ', detail_cutting, detail_grinding, detail_welding, detail_painting, jenis_kerjaan_lainnya) AS deskripsi_pekerjaan,
       lokasi_pekerjaan, waktu_pukul,
       catatan_reject, approved_by, approved_at,
       nama_fire_watch, nik_fire_watch,
       spv_approved, spv_approved_by,
       kontraktor_approved, kontraktor_approved_by,
       admin_k3_approved, admin_k3_approved_by,
       sfo_approved, sfo_approved_by,
       ${pgaColumn} AS mr_pga_approved,
       ${pgaColumn}_by AS mr_pga_approved_by,
      id_ijin_kerja,
       (${TIPE_EXPR_FW}) AS tipe_perusahaan,
       '${formType}' AS jenis_form
     FROM ${table}
     WHERE (${whereClause})
       AND (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '')
     ORDER BY tanggal ASC`,
    params,
  ];
}

// ── countByQuery ──────────────────────────────────────────────
async function countByQuery(
  formType: FormType,
  whereClause: string,
  params: any[] = [],
  spvDepartmen?: string | null
): Promise<number> {
  const { table } = FORM_CONFIG[formType];
  const scaffoldingCheck = formType === 'height-work'
    ? ` AND (f.perlu_scaffolding IS NOT TRUE OR EXISTS (SELECT 1 FROM inspeksi_scaffolding sc WHERE sc.id_form = f.id_form AND sc.status IN ('submitted', 'approved')))`
    : '';

  if (spvDepartmen != null) {
    const deptParam = `$${params.length + 1}`;
    const res = await query(
      `SELECT COUNT(*) as count
       FROM ${table} f
       JOIN users creator ON creator.id = f.user_id
       WHERE (${whereClause})
         AND (f.id_ijin_kerja IS NULL OR TRIM(f.id_ijin_kerja) = '')
         AND creator.departmen = ${deptParam}${scaffoldingCheck}`,
      [...params, spvDepartmen]
    );
    return parseInt(res[0].count);
  }

  const res = await query(
    `SELECT COUNT(*) as count FROM ${table} f WHERE (${whereClause}) AND (f.id_ijin_kerja IS NULL OR TRIM(f.id_ijin_kerja) = '')${scaffoldingCheck}`,
    params
  );
  return parseInt(res[0].count);
}

// ── ADDED: query khusus form_ijin_kerja (general-permit) by stage ──
// FIXED: sekarang menerima spvNama & spvNik — saat dipanggil dengan
// spvDepartmen (khusus role SPV di stage 2), hasil difilter agar HANYA
// form yang SPV Terkait-nya (Bagian 11) cocok dengan SPV yang login yang
// muncul. Pemanggilan tanpa spvDepartmen (role SFO/SMR/admin di stage
// lain) tidak terpengaruh sama sekali — tetap global seperti sebelumnya.
async function queryGeneralPermitByStage(
  stage: number,
  spvDepartmen?: string | null,
  spvNama?: string | null,
  spvNik?: string | null,
  spvUsername?: string | null
) {
  if (spvDepartmen != null) {
    return query(
      `SELECT gp.id_form, gp.tanggal, gp.tanggal_pelaksanaan, gp.status, gp.current_stage,
              gp.nama_kontraktor_pekerja AS nama_kontraktor_nik,
              COALESCE(gp.nama_kontraktor_pekerja, '') AS pemohon,
              gp.deskripsi_pekerjaan, gp.tgl_mulai_kerja,
              gp.lokasi_pekerjaan, gp.catatan_reject, gp.approved_by, gp.approved_at,
              gp.spv_approved, gp.spv_approved_by,
              gp.admin_k3_approved, gp.admin_k3_approved_by,
              gp.security_approved, gp.security_approved_by,
              gp.sfo_approved, gp.sfo_approved_by,
              gp.pga_approved AS mr_pga_approved, gp.pga_approved_by AS mr_pga_approved_by,
              NULL::boolean AS kontraktor_approved,
              NULL::text AS tipe_perusahaan, NULL::text AS id_ijin_kerja,
              'general-permit' AS jenis_form
         FROM form_ijin_kerja gp
         LEFT JOIN users creator ON creator.id = gp.user_id
        WHERE gp.status = 'submitted' AND gp.current_stage = $1
          AND (
            -- 1. Jika form memiliki SPV Terkait yang dipilih, HANYA SPV tersebut yang melihat
            (
              (gp.spv_terkait_pj IS NOT NULL AND TRIM(gp.spv_terkait_pj) <> '')
              AND (
                ($3::text IS NOT NULL AND $3 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($3)))
                OR ($5::text IS NOT NULL AND $5 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($5)))
                OR ($4::text IS NOT NULL AND $4 <> '' AND gp.nik_spv_terkait_pj = $4)
              )
            )
            -- 2. ATAU jika form lama tidak ada SPV terkait (kosong/null), baru tampil untuk SPV satu departemen
            OR (
              (gp.spv_terkait_pj IS NULL OR TRIM(gp.spv_terkait_pj) = '')
              AND $2::text IS NOT NULL AND $2 <> '' AND $2 <> 'Unknown'
              AND LOWER(TRIM(COALESCE(creator.departmen, ''))) = LOWER(TRIM($2))
            )
          )
        ORDER BY gp.tanggal ASC`,
      [stage, spvDepartmen, spvNama ?? '', spvNik ?? null, spvUsername ?? '']
    );
  }
  return query(
    `SELECT id_form, tanggal, tanggal_pelaksanaan, status, current_stage,
            nama_kontraktor_pekerja AS nama_kontraktor_nik,
            COALESCE(nama_kontraktor_pekerja, '') AS pemohon,
            deskripsi_pekerjaan, tgl_mulai_kerja,
            lokasi_pekerjaan, catatan_reject, approved_by, approved_at,
            spv_approved, spv_approved_by,
            admin_k3_approved, admin_k3_approved_by,
            security_approved, security_approved_by,
            sfo_approved, sfo_approved_by,
            pga_approved AS mr_pga_approved, pga_approved_by AS mr_pga_approved_by,
            NULL::boolean AS kontraktor_approved,
            NULL::text AS tipe_perusahaan, NULL::text AS id_ijin_kerja,
            'general-permit' AS jenis_form,
            spv_terkait_pj, nik_spv_terkait_pj
       FROM form_ijin_kerja
      WHERE status = 'submitted'
        AND (
          current_stage = $1
          OR ($1 = 1 AND spv_approved = FALSE)
          OR ($1 = 2 AND spv_approved = TRUE AND admin_k3_approved = FALSE)
          OR ($1 = 3 AND admin_k3_approved = TRUE AND sfo_approved = FALSE)
          OR ($1 = 4 AND sfo_approved = TRUE AND pga_approved = FALSE)
          OR ($1 = 5 AND pga_approved = TRUE AND security_approved = FALSE)
        )
      ORDER BY tanggal ASC`,
    [stage]
  );
}

async function queryGeneralPermitApproved(
  col: 'spv_approved' | 'admin_k3_approved' | 'sfo_approved' | 'pga_approved',
  spvDepartmen?: string | null,
  spvNama?: string | null,
  spvNik?: string | null,
  spvUsername?: string | null
) {
  if (spvDepartmen != null) {
    if (col === 'spv_approved') {
      return query(
        `SELECT gp.id_form, gp.tanggal, gp.tanggal_pelaksanaan, gp.status, gp.current_stage,
                gp.nama_kontraktor_pekerja AS nama_kontraktor_nik,
                COALESCE(gp.nama_kontraktor_pekerja, '') AS pemohon,
                gp.deskripsi_pekerjaan, gp.tgl_mulai_kerja,
                gp.lokasi_pekerjaan,
                gp.catatan_reject, gp.approved_by, gp.approved_at,
                gp.spv_approved, gp.spv_approved_by, gp.spv_nik,
                gp.admin_k3_approved, gp.admin_k3_approved_by, gp.admin_k3_nik,
                gp.spv_terkait_pj, gp.nik_spv_terkait_pj,
                gp.security_approved, gp.security_approved_by,
                gp.sfo_approved, gp.sfo_approved_by,
                gp.pga_approved AS mr_pga_approved, gp.pga_approved_by AS mr_pga_approved_by,
                NULL::boolean AS kontraktor_approved,
                NULL::text AS tipe_perusahaan, NULL::text AS id_ijin_kerja,
                'general-permit' AS jenis_form
           FROM form_ijin_kerja gp
           LEFT JOIN users creator ON creator.id = gp.user_id
          WHERE gp.spv_approved = TRUE
            AND (
              (
                (gp.spv_approved_by IS NOT NULL AND TRIM(gp.spv_approved_by) <> '')
                AND (
                  ($2::text IS NOT NULL AND $2 <> '' AND LOWER(TRIM(gp.spv_approved_by)) = LOWER(TRIM($2)))
                  OR ($4::text IS NOT NULL AND $4 <> '' AND LOWER(TRIM(gp.spv_approved_by)) = LOWER(TRIM($4)))
                  OR ($3::text IS NOT NULL AND $3 <> '' AND gp.spv_nik = $3)
                )
              )
              OR (
                (gp.spv_terkait_pj IS NOT NULL AND TRIM(gp.spv_terkait_pj) <> '')
                AND (
                  ($2::text IS NOT NULL AND $2 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($2)))
                  OR ($4::text IS NOT NULL AND $4 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($4)))
                  OR ($3::text IS NOT NULL AND $3 <> '' AND gp.nik_spv_terkait_pj = $3)
                )
              )
              OR (
                (gp.spv_approved_by IS NULL OR TRIM(gp.spv_approved_by) = '')
                AND (gp.spv_terkait_pj IS NULL OR TRIM(gp.spv_terkait_pj) = '')
                AND $1::text IS NOT NULL AND $1 <> '' AND $1 <> 'Unknown'
                AND LOWER(TRIM(COALESCE(creator.departmen, ''))) = LOWER(TRIM($1))
              )
            )
          ORDER BY gp.tanggal ASC`,
        [spvDepartmen, spvNama ?? '', spvNik ?? null, spvUsername ?? '']
      );
    }
    return query(
      `SELECT gp.id_form, gp.tanggal, gp.tanggal_pelaksanaan, gp.status, gp.current_stage,
              gp.nama_kontraktor_pekerja AS nama_kontraktor_nik,
              COALESCE(gp.nama_kontraktor_pekerja, '') AS pemohon,
              gp.deskripsi_pekerjaan, gp.tgl_mulai_kerja,
              gp.lokasi_pekerjaan,
              gp.catatan_reject, gp.approved_by, gp.approved_at,
              gp.spv_approved, gp.spv_approved_by, gp.spv_nik,
              gp.admin_k3_approved, gp.admin_k3_approved_by, gp.admin_k3_nik,
              gp.spv_terkait_pj, gp.nik_spv_terkait_pj,
              gp.security_approved, gp.security_approved_by,
              gp.sfo_approved, gp.sfo_approved_by,
              gp.pga_approved AS mr_pga_approved, gp.pga_approved_by AS mr_pga_approved_by,
              NULL::boolean AS kontraktor_approved,
              NULL::text AS tipe_perusahaan, NULL::text AS id_ijin_kerja,
              'general-permit' AS jenis_form
         FROM form_ijin_kerja gp
         LEFT JOIN users creator ON creator.id = gp.user_id
        WHERE gp.${col} = TRUE AND (creator.departmen = $1 OR creator.departmen IS NULL OR creator.departmen = '' OR creator.departmen = 'Unknown')
        ORDER BY gp.tanggal ASC`,
      [spvDepartmen]
    );
  }
  return query(
    `SELECT id_form, tanggal, tanggal_pelaksanaan, status, current_stage,
            nama_kontraktor_pekerja AS nama_kontraktor_nik,
            COALESCE(nama_kontraktor_pekerja, '') AS pemohon,
            deskripsi_pekerjaan, tgl_mulai_kerja,
            lokasi_pekerjaan,
            catatan_reject, approved_by, approved_at,
            spv_approved, spv_approved_by, spv_nik,
            admin_k3_approved, admin_k3_approved_by, admin_k3_nik,
            spv_terkait_pj, nik_spv_terkait_pj,
            security_approved, security_approved_by,
            sfo_approved, sfo_approved_by,
            pga_approved AS mr_pga_approved, pga_approved_by AS mr_pga_approved_by,
            NULL::boolean AS kontraktor_approved,
            NULL::text AS tipe_perusahaan, NULL::text AS id_ijin_kerja,
            'general-permit' AS jenis_form
       FROM form_ijin_kerja
      WHERE ${col} = TRUE
      ORDER BY tanggal ASC`,
    []
  );
}

async function countGeneralPermitByStage(
  stage: number,
  spvDepartmen?: string | null,
  spvNama?: string | null,
  spvNik?: string | null,
  spvUsername?: string | null
): Promise<number> {
  if (spvDepartmen != null) {
    const res = await query(
      `SELECT COUNT(*) AS count
         FROM form_ijin_kerja gp
         LEFT JOIN users creator ON creator.id = gp.user_id
        WHERE gp.status = 'submitted' AND gp.current_stage = $1
          AND (
            -- 1. Jika form memiliki SPV Terkait yang dipilih, HANYA SPV tersebut yang melihat
            (
              (gp.spv_terkait_pj IS NOT NULL AND TRIM(gp.spv_terkait_pj) <> '')
              AND (
                ($3::text IS NOT NULL AND $3 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($3)))
                OR ($5::text IS NOT NULL AND $5 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($5)))
                OR ($4::text IS NOT NULL AND $4 <> '' AND gp.nik_spv_terkait_pj = $4)
              )
            )
            -- 2. ATAU jika form lama tidak ada SPV terkait (kosong/null), baru tampil untuk SPV satu departemen
            OR (
              (gp.spv_terkait_pj IS NULL OR TRIM(gp.spv_terkait_pj) = '')
              AND $2::text IS NOT NULL AND $2 <> '' AND $2 <> 'Unknown'
              AND LOWER(TRIM(COALESCE(creator.departmen, ''))) = LOWER(TRIM($2))
            )
          )`,
      [stage, spvDepartmen, spvNama ?? '', spvNik ?? null, spvUsername ?? '']
    );
    return parseInt(res[0].count);
  }
  const res = await query(
    `SELECT COUNT(*) AS count
       FROM form_ijin_kerja
      WHERE status = 'submitted'
        AND (
          current_stage = $1
          OR ($1 = 1 AND spv_approved = FALSE)
          OR ($1 = 2 AND spv_approved = TRUE AND admin_k3_approved = FALSE)
          OR ($1 = 3 AND admin_k3_approved = TRUE AND sfo_approved = FALSE)
          OR ($1 = 4 AND sfo_approved = TRUE AND pga_approved = FALSE)
          OR ($1 = 5 AND pga_approved = TRUE AND security_approved = FALSE)
        )`,
    [stage]
  );
  return parseInt(res[0].count);
}

async function countGeneralPermitApproved(
  col: 'spv_approved' | 'admin_k3_approved' | 'sfo_approved' | 'pga_approved',
  spvDepartmen?: string | null,
  spvNama?: string | null,
  spvNik?: string | null,
  spvUsername?: string | null
): Promise<number> {
  if (spvDepartmen != null) {
    if (col === 'spv_approved') {
      const res = await query(
        `SELECT COUNT(*) AS count
           FROM form_ijin_kerja gp
           LEFT JOIN users creator ON creator.id = gp.user_id
          WHERE gp.spv_approved = TRUE
            AND (
              (
                (gp.spv_approved_by IS NOT NULL AND TRIM(gp.spv_approved_by) <> '')
                AND (
                  ($2::text IS NOT NULL AND $2 <> '' AND LOWER(TRIM(gp.spv_approved_by)) = LOWER(TRIM($2)))
                  OR ($4::text IS NOT NULL AND $4 <> '' AND LOWER(TRIM(gp.spv_approved_by)) = LOWER(TRIM($4)))
                  OR ($3::text IS NOT NULL AND $3 <> '' AND gp.spv_nik = $3)
                )
              )
              OR (
                (gp.spv_terkait_pj IS NOT NULL AND TRIM(gp.spv_terkait_pj) <> '')
                AND (
                  ($2::text IS NOT NULL AND $2 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($2)))
                  OR ($4::text IS NOT NULL AND $4 <> '' AND LOWER(TRIM(gp.spv_terkait_pj)) = LOWER(TRIM($4)))
                  OR ($3::text IS NOT NULL AND $3 <> '' AND gp.nik_spv_terkait_pj = $3)
                )
              )
              OR (
                (gp.spv_approved_by IS NULL OR TRIM(gp.spv_approved_by) = '')
                AND (gp.spv_terkait_pj IS NULL OR TRIM(gp.spv_terkait_pj) = '')
                AND $1::text IS NOT NULL AND $1 <> '' AND $1 <> 'Unknown'
                AND LOWER(TRIM(COALESCE(creator.departmen, ''))) = LOWER(TRIM($1))
              )
            )`,
        [spvDepartmen, spvNama ?? '', spvNik ?? null, spvUsername ?? '']
      );
      return parseInt(res[0].count);
    }
    const res = await query(
      `SELECT COUNT(*) AS count
         FROM form_ijin_kerja gp
         LEFT JOIN users creator ON creator.id = gp.user_id
        WHERE gp.${col} = TRUE AND (creator.departmen = $1 OR creator.departmen IS NULL OR creator.departmen = '' OR creator.departmen = 'Unknown')`,
      [spvDepartmen]
    );
    return parseInt(res[0].count);
  }
  const res = await query(`SELECT COUNT(*) AS count FROM form_ijin_kerja WHERE ${col} = TRUE`, []);
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
    const countOnly = searchParams.get('countOnly') === '1';
    const userRole = user.role as UserRole;
    const allFormTypes: FormType[] = ['hot-work', 'workshop', 'height-work'];

    // ── ADMIN: lihat semua ──────────────────────────────────────
    if (userRole === 'admin') {
      if (countOnly) {
        const [submitted, approved, rejected] = await Promise.all([
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['submitted']))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['approved']))),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({
          counts: {
            submitted: sum(submitted), approved: sum(approved), rejected: sum(rejected),
          }
        });
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

    // ── SECURITY: mengisi dan menyetujui Safety Induction (stage 5) ──
    if (userRole === 'security') {
      if (countOnly) {
        const [subm, appr] = await Promise.all([
          query(`SELECT COUNT(*) FROM form_ijin_kerja WHERE status = 'submitted' AND current_stage = 5`),
          query(`SELECT COUNT(*) FROM form_ijin_kerja WHERE security_approved = TRUE`),
        ]);
        return NextResponse.json({ counts: { submitted: Number(subm[0].count), approved: Number(appr[0].count), rejected: 0 } });
      }
      if (statusFilter === 'submitted') {
        const rows = await query(
          `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                  nama_kontraktor_pekerja AS nama_kontraktor_nik,
                  lokasi_pekerjaan, current_stage,
                  security_approved,
                  spv_approved,
                  admin_k3_approved,
                  sfo_approved,
                  pga_approved AS mr_pga_approved,
                  NULL::boolean AS kontraktor_approved,
                  NULL::text AS tipe_perusahaan,
                  NULL::text AS id_ijin_kerja,
                  'external-permit' AS jenis_form
             FROM form_ijin_kerja
            WHERE status = 'submitted' AND current_stage = 5
            ORDER BY tanggal ASC`);
        return NextResponse.json({ data: rows, total: rows.length });
      }
      if (statusFilter === 'approved') {
        const rows = await query(
          `SELECT id_form, tanggal, tanggal_pelaksanaan, status,
                  nama_kontraktor_pekerja AS nama_kontraktor_nik,
                  lokasi_pekerjaan, current_stage,
                  security_approved,
                  spv_approved,
                  admin_k3_approved,
                  sfo_approved,
                  pga_approved AS mr_pga_approved,
                  NULL::boolean AS kontraktor_approved,
                  NULL::text AS tipe_perusahaan,
                  NULL::text AS id_ijin_kerja,
                  'external-permit' AS jenis_form
             FROM form_ijin_kerja
            WHERE security_approved = TRUE
            ORDER BY tanggal DESC`);
        return NextResponse.json({ data: rows, total: rows.length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── SPV ──────────────────────────────────────────────────────
    if (userRole === 'spv') {
      const spvRow = await queryOne<{ departmen: string | null; nama: string | null; nik: string | null; username: string | null }>(
        `SELECT departmen, nama, nik, username FROM users WHERE id = $1`,
        [user.userId]
      );
      const spvDepartmen = spvRow?.departmen ?? null;
      const spvNama = spvRow?.nama ?? null;
      const spvNik = spvRow?.nik ?? null;
      const spvUsername = spvRow?.username ?? null;
      const spvAssignment = spvNama
        ? ` AND LOWER(TRIM(spv_terkait)) = LOWER(TRIM($4))`
        : '';
      const withSpvAssignment = (params: any[]) => spvNama ? [...params, spvNama] : params;
      if (spvDepartmen === null) {
        return NextResponse.json({ data: [], total: 0 });
      }

      if (countOnly) {
        const [subm, appr, rej] = await Promise.all([
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 1, 'internal']), spvDepartmen)),
            ...FW_FORMS.map(f => countByQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 2, 'eksternal']), spvDepartmen)),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 1, 'internal']), spvDepartmen),
            countByQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 2, 'eksternal']), spvDepartmen),
            countGeneralPermitByStage(1, spvDepartmen, spvNama, spvNik, spvUsername),
          ]),
          Promise.all([
            ...allFormTypes.map(f => countByQuery(f, `spv_approved = TRUE`, [], spvDepartmen)),
            countGeneralPermitApproved('spv_approved', spvDepartmen, spvNama, spvNik, spvUsername),
          ]),
          Promise.all([
            ...allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected'], spvDepartmen)),
          ]),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) } });
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 1, 'internal']), spvDepartmen))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 2, 'eksternal']), spvDepartmen))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 1, 'internal']), spvDepartmen)),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3${spvAssignment}`, withSpvAssignment(['submitted', 2, 'eksternal']), spvDepartmen)),
          queryGeneralPermitByStage(1, spvDepartmen, spvNama, spvNik, spvUsername),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all([
          ...allFormTypes.map(f => query(...buildSelectQuery(f, `spv_approved = TRUE`, [], spvDepartmen))),
          queryGeneralPermitApproved('spv_approved', spvDepartmen, spvNama, spvNik, spvUsername),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'rejected') {
        const results = await Promise.all(allFormTypes.map(f => query(...buildSelectQuery(f, `status = $1`, ['rejected'], spvDepartmen))));
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      return NextResponse.json({ data: [], total: 0 });
    }

    // ── KONTRAKTOR ───────────────────────────────────────────────
    // Catatan: Kontraktor untuk Ijin Kerja Eksternal (form_ijin_kerja)
    // tidak login sebagai role ini — TTD dilakukan lewat akun worker di
    // /my-forms (tablet). Jadi general-permit sengaja TIDAK disertakan
    // di blok ini.
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
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) } });
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
            countGeneralPermitByStage(2),
          ]),
          Promise.all([
            ...allFormTypes.map(f => countByQuery(f, `admin_k3_approved = TRUE`)),
            countGeneralPermitApproved('admin_k3_approved'),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) } });
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 2, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 3, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 2, 'internal'])),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 3, 'eksternal'])),
          queryGeneralPermitByStage(2),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all([
          ...allFormTypes.map(f => query(...buildSelectQuery(f, `admin_k3_approved = TRUE`))),
          queryGeneralPermitApproved('admin_k3_approved'),
        ]);
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
            countGeneralPermitByStage(3),
          ]),
          Promise.all([
            ...allFormTypes.map(f => countByQuery(f, `sfo_approved = TRUE`)),
            countGeneralPermitApproved('sfo_approved'),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) } });
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 3, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 4, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 3, 'internal'])),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 4, 'eksternal'])),
          queryGeneralPermitByStage(3),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all([
          ...allFormTypes.map(f => query(...buildSelectQuery(f, `sfo_approved = TRUE`))),
          queryGeneralPermitApproved('sfo_approved'),
        ]);
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
            countGeneralPermitByStage(4),
          ]),
          Promise.all([
            ...FW_FORMS.map(f => countByQuery(f, `mr_pga_approved = TRUE`)),
            countByQuery('height-work', `mr_pga_approved = TRUE`),
            countGeneralPermitApproved('pga_approved'),
          ]),
          Promise.all(allFormTypes.map(f => countByQuery(f, `status = $1`, ['rejected']))),
        ]);
        return NextResponse.json({ counts: { submitted: sum(subm), approved: sum(appr), rejected: sum(rej) } });
      }
      if (statusFilter === 'submitted') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 4, 'internal']))),
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `status = $1 AND current_stage = $2 AND (${TIPE_EXPR_FW}) = $3`, ['submitted', 5, 'eksternal']))),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 4, 'internal'])),
          query(...buildSelectQuery('height-work', `status = $1 AND current_stage = $2 AND (${TIPE_EXPR}) = $3`, ['submitted', 5, 'eksternal'])),
          queryGeneralPermitByStage(4),
        ]);
        return NextResponse.json({ data: results.flat(), total: results.flat().length });
      }
      if (statusFilter === 'approved') {
        const results = await Promise.all([
          ...FW_FORMS.map(f => query(...buildSelectQuery(f, `mr_pga_approved = TRUE`))),
          query(...buildSelectQuery('height-work', `mr_pga_approved = TRUE`)),
          queryGeneralPermitApproved('pga_approved'),
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