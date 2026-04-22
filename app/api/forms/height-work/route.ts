// app/api/forms/height-work/route.ts
// FIX: Tambah kolom tipe_perusahaan ke INSERT agar alur approval tersimpan dengan benar.
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

async function generateId(): Promise<string> {
  const row = await queryOne<{ id_form: string }>(
    `SELECT id_form FROM form_kerja_ketinggian ORDER BY id_form DESC LIMIT 1`
  );
  let next = 1000;
  if (row) {
    const num = parseInt(row.id_form.replace('HEW-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `HEW-${next}`;
}

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    return user?.userId ?? null;
  } catch {
    return null;
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
         waktu_mulai, nama_pengawas_kontraktor, spv_terkait`;

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

    const userId      = getUserId(req);
    const idForm      = await generateId();
    const status      = isSubmit ? 'submitted' : 'draft';
    const now         = new Date().toISOString();
    const pelaksanaan = formData.tanggalPelaksanaan
      ? new Date(formData.tanggalPelaksanaan).toISOString()
      : null;

    // Normalisasi tipePerusahaan → selalu simpan 'internal' atau 'eksternal'
    // (bukan string panjang seperti sebelumnya)
    const tipePerusahaan: 'internal' | 'eksternal' =
      formData.tipePerusahaan === 'eksternal' ? 'eksternal' : 'internal';

    // Label panjang untuk kolom petugas_ketinggian (display purposes)
    const petugasKetinggianLabel = tipePerusahaan === 'eksternal'
      ? 'Eksternal / Subkontraktor'
      : 'Internal / Karyawan PT.JAI';

    // ── 72 kolom, 72 parameter ────────────────────────────────
    // Kolom:
    //  $1  – $4  : id_form, tanggal, tanggal_pelaksanaan, status
    //  $5  – $6  : petugas_ketinggian (label), tipe_perusahaan ('internal'/'eksternal') ← BARU
    //  $7  – $11 : deskripsi_pekerjaan, lokasi, waktu_mulai, waktu_selesai, nama_pengawas_kontraktor
    //  $12 – $13 : nama_pengawas_departemen, nama_departemen
    //  $14 – $43 : 10x (nama_petugas_N, petugas_N_sehat, foto_lisensi_N)
    //  $44 – $50 : APD (kunci_pagar, rompi, no_rompi, helmet×2, harness×2)
    //  $51 – $61 : keselamatan (11 boolean)
    //  $62 – $67 : body harness + lanyard (6 boolean)
    //  $68 – $71 : persetujuan (spv, kontraktor, sfo, mr_pga) ← null saat submit
    //  $72       : user_id

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
        $72
      )`,
      [
        // $1–$4: identitas form
        idForm, now, pelaksanaan, status,

        // $5–$6: tipe petugas (DIPERBAIKI: simpan keduanya)
        petugasKetinggianLabel,   // $5  petugas_ketinggian  (label panjang untuk display)
        tipePerusahaan,           // $6  tipe_perusahaan     ('internal' atau 'eksternal')

        // $7–$11: info pekerjaan
        formData.deskripsiPekerjaan      || null,  // $7
        formData.lokasi                  || null,  // $8
        formData.waktuMulai              || null,  // $9
        formData.waktuSelesai            || null,  // $10
        formData.namaPengawasKontraktor  || null,  // $11

        // $12–$13: pengawas departemen
        formData.namaPengawasDepartemen  || null,  // $12
        formData.namaDepartemen          || null,  // $13

        // $14–$43: petugas 1–10 (nama, sehat, foto_lisensi)
        formData.namaPetugas?.[0]  || null, formData.berbadanSehat?.[0]  ?? false, formData.fotoLisensi?.[0]  || null,  // $14,$15,$16
        formData.namaPetugas?.[1]  || null, formData.berbadanSehat?.[1]  ?? false, formData.fotoLisensi?.[1]  || null,  // $17,$18,$19
        formData.namaPetugas?.[2]  || null, formData.berbadanSehat?.[2]  ?? false, formData.fotoLisensi?.[2]  || null,  // $20,$21,$22
        formData.namaPetugas?.[3]  || null, formData.berbadanSehat?.[3]  ?? false, formData.fotoLisensi?.[3]  || null,  // $23,$24,$25
        formData.namaPetugas?.[4]  || null, formData.berbadanSehat?.[4]  ?? false, formData.fotoLisensi?.[4]  || null,  // $26,$27,$28
        formData.namaPetugas?.[5]  || null, formData.berbadanSehat?.[5]  ?? false, formData.fotoLisensi?.[5]  || null,  // $29,$30,$31
        formData.namaPetugas?.[6]  || null, formData.berbadanSehat?.[6]  ?? false, formData.fotoLisensi?.[6]  || null,  // $32,$33,$34
        formData.namaPetugas?.[7]  || null, formData.berbadanSehat?.[7]  ?? false, formData.fotoLisensi?.[7]  || null,  // $35,$36,$37
        formData.namaPetugas?.[8]  || null, formData.berbadanSehat?.[8]  ?? false, formData.fotoLisensi?.[8]  || null,  // $38,$39,$40
        formData.namaPetugas?.[9]  || null, formData.berbadanSehat?.[9]  ?? false, formData.fotoLisensi?.[9]  || null,  // $41,$42,$43

        // $44–$50: APD
        formData.kunceePagar            ?? false,                                              // $44
        formData.rompiKetinggian        ?? false,                                              // $45
        formData.rompiAngka ? parseFloat(formData.rompiAngka) : null,                          // $46
        formData.safetyHelmetCount      ? true  : false,                                       // $47
        formData.safetyHelmetCount      ? parseFloat(formData.safetyHelmetCount)    : null,    // $48
        formData.fullBodyHarnessCount   ? true  : false,                                       // $49
        formData.fullBodyHarnessCount   ? parseFloat(formData.fullBodyHarnessCount) : null,    // $50

        // $51–$61: keselamatan
        formData.areaKerjaAman      ?? false,   // $51
        formData.kebakaranProcedure ?? false,   // $52
        formData.pekerjaanListrik   ?? false,   // $53
        formData.prosedurLoto       ?? false,   // $54
        formData.perisakArea        ?? false,   // $55
        formData.safetyLineLine     ?? false,   // $56
        formData.alatBantuKerja     ?? false,   // $57
        formData.rompiSaatBekerja   ?? false,   // $58
        formData.bebanBeratTubuh    ?? false,   // $59
        formData.helmStandar        ?? false,   // $60
        formData.rambuSafetyWarning ?? false,   // $61

        // $62–$67: body harness & lanyard
        formData.bodyHarnessWebbing    ?? false,  // $62
        formData.bodyHarnessDRing      ?? false,  // $63
        formData.bodyHarnessAdjustment ?? false,  // $64
        formData.lanyardAbsorber       ?? false,  // $65
        formData.lanyardSnapHook       ?? false,  // $66
        formData.lanyardRope           ?? false,  // $67

        // $68–$71: persetujuan — NULL, diisi otomatis saat approval
        null, // spv_terkait      $68
        null, // nama_kontraktor  $69
        null, // sfo              $70
        null, // mr_pga_mgr       $71

        // $72: user_id
        userId,
      ]
    );

    return NextResponse.json({ success: true, id_form: idForm, status }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/height-work]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}