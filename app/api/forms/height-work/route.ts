// app/api/forms/height-work/route.ts
// UPDATED: Tambah kolom perlu_jsa dan jsa_file_url untuk fitur Upload JSA.
// FIX: Tambah kolom tipe_perusahaan ke INSERT agar alur approval tersimpan dengan benar.
// ADDED: Email notification ke approver pertama saat form di-submit.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { notifyFirstApprover } from '@/lib/approval-email';

async function generateId(): Promise<string> {
  const row = await queryOne<{ id_form: string }>(
    `SELECT id_form FROM form_kerja_ketinggian ORDER BY id_form DESC LIMIT 1`
  );
  let next = 1;
  if (row) {
    const num = parseInt(row.id_form.replace('HAW-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `HAW-${String(next).padStart(4, '0')}`;
}

function getUserFromReq(req: NextRequest): { userId: number | null; nama: string | null } {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return { userId: null, nama: null };
  try {
    const user = verifyToken(token);
    return {
      userId: user?.userId ?? null,
      nama:   user?.nama   ?? null,
    };
  } catch {
    return { userId: null, nama: null };
  }
}

// ── GET: list forms ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit  = parseInt(searchParams.get('limit')  ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const full   = searchParams.get('full') === '1';

    const selectCols = full
      ? '*'
      : `id_form, tanggal, tanggal_pelaksanaan, status,
         petugas_ketinggian, tipe_perusahaan, deskripsi_pekerjaan, lokasi,
         waktu_mulai, nama_pengawas_kontraktor, spv_terkait,
         perlu_jsa, jsa_file_url`;

    let sql = `SELECT ${selectCols} FROM form_kerja_ketinggian`;
    const params: any[] = [];
    if (status) { params.push(status); sql += ` WHERE status = $1`; }
    sql += ` ORDER BY tanggal DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows      = await query(sql, params);
    const countRows = await query(
      status
        ? `SELECT COUNT(*) FROM form_kerja_ketinggian WHERE status = $1`
        : `SELECT COUNT(*) FROM form_kerja_ketinggian`,
      status ? [status] : []
    );
    return NextResponse.json({
      data:   rows,
      total:  parseInt(countRows[0].count),
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: buat form baru ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isSubmit, ...formData } = body;

    const { userId, nama: namaFromToken } = getUserFromReq(req);
    const idForm      = await generateId();
    const status      = isSubmit ? 'submitted' : 'draft';
    const now         = new Date().toISOString();
    const pelaksanaan = formData.tanggalPelaksanaan
      ? new Date(formData.tanggalPelaksanaan).toISOString()
      : null;

    const tipePerusahaan: 'internal' | 'eksternal' =
      formData.tipePerusahaan === 'eksternal' ? 'eksternal' : 'internal';

    const petugasKetinggianLabel = tipePerusahaan === 'eksternal'
      ? 'Eksternal / Subkontraktor'
      : 'Internal / Karyawan PT.JAI';

    const perluJsa   = formData.perluJsa === true;
    const jsaFileUrl = perluJsa ? (formData.jsaFileUrl || null) : null;

    await query(
      `INSERT INTO form_kerja_ketinggian (
        id_form, tanggal, tanggal_pelaksanaan, status,
        petugas_ketinggian, tipe_perusahaan,
        deskripsi_pekerjaan, lokasi,
        waktu_mulai, waktu_selesai, nama_pengawas_kontraktor,
        nama_pengawas_departemen, nama_departemen,
        nama_petugas_1,  petugas_1_sehat,  foto_lisensi_1,
        nama_petugas_2,  petugas_2_sehat,  foto_lisensi_2,
        nama_petugas_3,  petugas_3_sehat,  foto_lisensi_3,
        nama_petugas_4,  petugas_4_sehat,  foto_lisensi_4,
        nama_petugas_5,  petugas_5_sehat,  foto_lisensi_5,
        nama_petugas_6,  petugas_6_sehat,  foto_lisensi_6,
        nama_petugas_7,  petugas_7_sehat,  foto_lisensi_7,
        nama_petugas_8,  petugas_8_sehat,  foto_lisensi_8,
        nama_petugas_9,  petugas_9_sehat,  foto_lisensi_9,
        nama_petugas_10, petugas_10_sehat, foto_lisensi_10,
        ada_kunci_pagar, ada_rompi_ketinggian, no_rompi,
        ada_safety_helmet, jumlah_safety_helmet,
        ada_full_body_harmess, jumlah_full_body_harness,
        area_diperiksa_aman, paham_cara_menggunakan_alat_pemadam_kebakaran,
        ada_kerja_listrik, prosedur_loto, menutupi_area_bawah_prisai,
        safetyline_tersedia, alat_bantu_kerja_aman, menggunakan_rompi,
        beban_tidak_5kg, helm_sesuai_sop, rambu2_tersedia,
        webbing_kondisi_baik, dring_kondisi_baik, gesper_kondisi_baik,
        absorter_dan_timbes_kondisi_baik, snap_hook_kondisi_baik, rope_lanyard_kondisi_baik,
        spv_terkait, nama_kontraktor, sfo, mr_pga_mgr,
        perlu_jsa, jsa_file_url,
        user_id
      ) VALUES (
        $1,  $2,  $3,  $4,
        $5,  $6,
        $7,  $8,  $9,  $10, $11,
        $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22,
        $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31,
        $32, $33, $34,
        $35, $36, $37,
        $38, $39, $40,
        $41, $42, $43,
        $44, $45, $46,
        $47, $48,
        $49, $50,
        $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61,
        $62, $63, $64, $65, $66, $67,
        $68, $69, $70, $71,
        $72, $73,
        $74
      )`,
      [
        idForm, now, pelaksanaan, status,
        petugasKetinggianLabel, tipePerusahaan,
        formData.deskripsiPekerjaan      || null,
        formData.lokasi                  || null,
        formData.waktuMulai              || null,
        formData.waktuSelesai            || null,
        formData.namaPengawasKontraktor  || null,
        formData.namaPengawasDepartemen  || null,
        formData.namaDepartemen          || null,
        formData.namaPetugas?.[0]  || null, formData.berbadanSehat?.[0]  ?? false, formData.fotoLisensi?.[0]  || null,
        formData.namaPetugas?.[1]  || null, formData.berbadanSehat?.[1]  ?? false, formData.fotoLisensi?.[1]  || null,
        formData.namaPetugas?.[2]  || null, formData.berbadanSehat?.[2]  ?? false, formData.fotoLisensi?.[2]  || null,
        formData.namaPetugas?.[3]  || null, formData.berbadanSehat?.[3]  ?? false, formData.fotoLisensi?.[3]  || null,
        formData.namaPetugas?.[4]  || null, formData.berbadanSehat?.[4]  ?? false, formData.fotoLisensi?.[4]  || null,
        formData.namaPetugas?.[5]  || null, formData.berbadanSehat?.[5]  ?? false, formData.fotoLisensi?.[5]  || null,
        formData.namaPetugas?.[6]  || null, formData.berbadanSehat?.[6]  ?? false, formData.fotoLisensi?.[6]  || null,
        formData.namaPetugas?.[7]  || null, formData.berbadanSehat?.[7]  ?? false, formData.fotoLisensi?.[7]  || null,
        formData.namaPetugas?.[8]  || null, formData.berbadanSehat?.[8]  ?? false, formData.fotoLisensi?.[8]  || null,
        formData.namaPetugas?.[9]  || null, formData.berbadanSehat?.[9]  ?? false, formData.fotoLisensi?.[9]  || null,
        formData.kunceePagar            ?? false,
        formData.rompiKetinggian        ?? false,
        formData.rompiAngka ? parseFloat(formData.rompiAngka) : null,
        formData.safetyHelmetCount      ? true  : false,
        formData.safetyHelmetCount      ? parseFloat(formData.safetyHelmetCount)    : null,
        formData.fullBodyHarnessCount   ? true  : false,
        formData.fullBodyHarnessCount   ? parseFloat(formData.fullBodyHarnessCount) : null,
        formData.areaKerjaAman      ?? false,
        formData.kebakaranProcedure ?? false,
        formData.pekerjaanListrik   ?? false,
        formData.prosedurLoto       ?? false,
        formData.perisakArea        ?? false,
        formData.safetyLineLine     ?? false,
        formData.alatBantuKerja     ?? false,
        formData.rompiSaatBekerja   ?? false,
        formData.bebanBeratTubuh    ?? false,
        formData.helmStandar        ?? false,
        formData.rambuSafetyWarning ?? false,
        formData.bodyHarnessWebbing    ?? false,
        formData.bodyHarnessDRing      ?? false,
        formData.bodyHarnessAdjustment ?? false,
        formData.lanyardAbsorber       ?? false,
        formData.lanyardSnapHook       ?? false,
        formData.lanyardRope           ?? false,
        null, null, null, null,
        perluJsa, jsaFileUrl,
        userId,
      ]
    );

    // ── Email: kirim ke approver pertama jika status submitted (fire-and-forget) ──
    if (status === 'submitted' && userId) {
      notifyFirstApprover({
        formType:       'height-work',
        idForm,
        tipePerusahaan,
        userId,
        namaPemohon:    namaFromToken ?? formData.namaPengawasDepartemen ?? '-',
        tanggal:        now,
      }).catch((err) => {
        console.error(`[EMAIL] Background first-approver email error for ${idForm}:`, err);
      });
    }

    return NextResponse.json({ success: true, id_form: idForm, status }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/height-work]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}