// app/api/forms/height-work/route.ts  — PATCH: tambah ?full=1
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

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
         petugas_ketinggian, deskripsi_pekerjaan, lokasi,
         waktu_mulai, nama_pengawas_kontraktor, spv_terkait`;

    let sql = `SELECT ${selectCols} FROM form_kerja_ketinggian`;
    const params: any[] = [];
    if (status) { params.push(status); sql += ` WHERE status = $1`; }
    sql += ` ORDER BY tanggal DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const rows = await query(sql, params);
    const countRows = await query(
      status ? `SELECT COUNT(*) FROM form_kerja_ketinggian WHERE status=$1` : `SELECT COUNT(*) FROM form_kerja_ketinggian`,
      status ? [status] : []
    );
    return NextResponse.json({ data: rows, total: parseInt(countRows[0].count), limit, offset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isSubmit, ...formData } = body;
    const idForm = await generateId();
    const status = isSubmit ? 'submitted' : 'draft';
    const now    = new Date().toISOString();
    const pelaksanaan = formData.tanggalPelaksanaan
      ? new Date(formData.tanggalPelaksanaan).toISOString()
      : null;

    await query(
      `INSERT INTO form_kerja_ketinggian (
        id_form, tanggal, tanggal_pelaksanaan, status,
        petugas_ketinggian, deskripsi_pekerjaan, lokasi,
        waktu_mulai, waktu_selesai, nama_pengawas_kontraktor,
        nama_petugas_1, petugas_1_sehat, nama_petugas_2, petugas_2_sehat,
        nama_petugas_3, petugas_3_sehat, nama_petugas_4, petugas_4_sehat,
        nama_petugas_5, petugas_5_sehat, nama_petugas_6, petugas_6_sehat,
        nama_petugas_7, petugas_7_sehat, nama_petugas_8, petugas_8_sehat,
        nama_petugas_9, petugas_9_sehat, nama_petugas_10, petugas_10_sehat,
        ada_kunci_pagar, ada_rompi_ketinggian, no_rompi,
        ada_safety_helmet, jumlah_safety_helmet,
        ada_full_body_harmess, jumlah_full_body_harness,
        area_diperiksa_aman, paham_cara_menggunakan_alat_pemadam_kebakaran,
        ada_kerja_listrik, prosedur_loto, menutupi_area_bawah_prisai,
        safetyline_tersedia, alat_bantu_kerja_aman, menggunakan_rompi,
        beban_tidak_5kg, helm_sesuai_sop, rambu2_tersedia,
        webbing_kondisi_baik, dring_kondisi_baik, gesper_kondisi_baik,
        absorter_dan_timbes_kondisi_baik, snap_hook_kondisi_baik, rope_lanyard_kondisi_baik,
        spv_terkait, nama_kontraktor, sfo, mr_pga_mgr
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,
        $38,$39,$40,$41,$42,$43,$44,$45,
        $46,$47,$48,$49,$50,$51,$52,$53,$54,
        $55,$56,$57,$58
      )`,
      [
        idForm, now, pelaksanaan, status,
        formData.tipePerusahaan === 'eksternal'
          ? 'Eksternal / Subkontraktor'
          : 'Internal / Karyawan PT.JAI',
        formData.deskripsiPekerjaan,
        formData.lokasi,
        formData.waktuMulai   || null,
        formData.waktuSelesai || null,
        formData.namaPengawasKontraktor,
        formData.namaPetugas[0] || null, formData.berbadanSehat[0],
        formData.namaPetugas[1] || null, formData.berbadanSehat[1],
        formData.namaPetugas[2] || null, formData.berbadanSehat[2],
        formData.namaPetugas[3] || null, formData.berbadanSehat[3],
        formData.namaPetugas[4] || null, formData.berbadanSehat[4],
        formData.namaPetugas[5] || null, formData.berbadanSehat[5],
        formData.namaPetugas[6] || null, formData.berbadanSehat[6],
        formData.namaPetugas[7] || null, formData.berbadanSehat[7],
        formData.namaPetugas[8] || null, formData.berbadanSehat[8],
        formData.namaPetugas[9] || null, formData.berbadanSehat[9],
        formData.kunceePagar,
        formData.rompiKetinggian,
        formData.rompiAngka ? parseFloat(formData.rompiAngka) : null,
        formData.safetyHelmetCount !== '',
        formData.safetyHelmetCount ? parseFloat(formData.safetyHelmetCount) : null,
        formData.fullBodyHarnessCount !== '',
        formData.fullBodyHarnessCount ? parseFloat(formData.fullBodyHarnessCount) : null,
        formData.areaKerjaAman,
        formData.kebakaranProcedure,
        formData.pekerjaanListrik,
        formData.prosedurLoto,
        formData.perisakArea,
        formData.safetyLineLine,
        formData.alatBantuKerja,
        formData.rompiSaatBekerja,
        formData.bebanBeratTubuh,
        formData.helmStandar,
        formData.rambuSafetyWarning,
        formData.bodyHarnessWebbing,
        formData.bodyHarnessDRing,
        formData.bodyHarnessAdjustment,
        formData.lanyardAbsorber,
        formData.lanyardSnapHook,
        formData.lanyardRope,
        formData.persetujuan.spvNama,
        formData.persetujuan.kontraktorNama,
        formData.persetujuan.sfoNama,
        formData.persetujuan.mrPgaNama,
      ]
    );
    return NextResponse.json({ success: true, id_form: idForm, status }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/height-work]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}