// app/api/forms/workshop/route.ts  — PATCH: tambah ?full=1
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

async function generateId(): Promise<string> {
  const row = await queryOne<{ id_form: string }>(
    `SELECT id_form FROM form_kerja_workshop ORDER BY id_form DESC LIMIT 1`
  );
  let next = 1000;
  if (row) {
    const num = parseInt(row.id_form.replace('HW-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `HW-${next}`;
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
         no_registrasi, nama_kontraktor_nik, nama_pekerja_nik,
         lokasi_pekerjaan, waktu_pukul, spv_terkait`;

    let sql = `SELECT ${selectCols} FROM form_kerja_workshop`;
    const params: any[] = [];
    if (status) { params.push(status); sql += ` WHERE status = $1`; }
    sql += ` ORDER BY tanggal DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const rows = await query(sql, params);
    const countRows = await query(
      status ? `SELECT COUNT(*) FROM form_kerja_workshop WHERE status=$1` : `SELECT COUNT(*) FROM form_kerja_workshop`,
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
    const { isSubmit, ...f } = body;
    const idForm = await generateId();
    const status = isSubmit ? 'submitted' : 'draft';
    const now    = new Date().toISOString();

    await query(
      `INSERT INTO form_kerja_workshop (
        id_form, tanggal, tanggal_pelaksanaan, status,
        no_registrasi, nama_kontraktor_nik, nama_pekerja_nik,
        lokasi_pekerjaan, waktu_pukul,
        nama_fire_watch, nik_fire_watch,
        jabatan_pemberi_izin, nik_pemberi_ijin,
        preventive_genset_pump_room, tangki_solar, panel_listrik,
        detail_cutting, t_mulai_cutting, t_selesai_cutting,
        detail_grinding, t_mulai_grinding, t_selesai_grinding,
        detail_welding, t_mulai_welding, t_selesai_welding,
        detail_painting, t_mulai_painting, t_selesai_painting,
        painting_spray, painting_non_spray,
        ada_kerja_lainnya, jenis_kerjaan_lainnya,
        ruang_tertutup, bahan_mudah_terbakar, gas_bejana_tangki,
        height_work, cairan_gas_bertekan, cairan_hydrocarbon, bahaya_lain,
        kondisi_tools_baik, tersedia_apar_hydrant,
        sensor_smoke_detector_non_aktif, apd_lengkap,
        tidak_ada_cairan_mudah_terbakar, lantai_bersih, lantai_sudah_dibasahi,
        cairan_mudah_tebakar_tertutup, lembaran_dibawah_pekerjaan, lindungi_conveyor_dll,
        alat_telah_bersih, uap_menyala_telah_dibuang,
        kerja_pada_dinding_lagit, bahan_mudah_terbakar_dipindahkan_dari_dinding,
        fire_watch_memastikan_area_aman, firwatch_terlatih,
        permintaan_tambahan,
        spv_terkait, kontraktor, sfo, pga
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
        $51,$52,$53,$54,$55,$56,$57,$58,$59,$60
      )`,
      [
        idForm, now,
        f.tanggalPelaksanaan ? new Date(f.tanggalPelaksanaan).toISOString() : null,
        status,
        f.noRegistrasi, f.namaKontraktor, f.namaNIK,
        f.lokasi, f.waktuPukul || null,
        f.namaFireWatch, f.namaNIKFireWatch,
        f.jabaranPemberiIzin, f.namaNIKPemberiIzin,
        f.jenisPekerjaan.preventive, f.jenisPekerjaan.tangki, f.jenisPekerjaan.panel,
        f.jenisPekerjaan.cutting.detail,  f.jenisPekerjaan.cutting.mulai  || null, f.jenisPekerjaan.cutting.selesai  || null,
        f.jenisPekerjaan.grinding.detail, f.jenisPekerjaan.grinding.mulai || null, f.jenisPekerjaan.grinding.selesai || null,
        f.jenisPekerjaan.welding.detail,  f.jenisPekerjaan.welding.mulai  || null, f.jenisPekerjaan.welding.selesai  || null,
        f.jenisPekerjaan.painting.detail, f.jenisPekerjaan.painting.mulai || null, f.jenisPekerjaan.painting.selesai || null,
        f.jenisPekerjaan.spray, f.jenisPekerjaan.nonSpray,
        f.jenisPekerjaan.lainnya, f.jenisPekerjaan.lainnyaKeterangan,
        f.areaBerisiko.ruangTertutup, f.areaBerisiko.bahanMudah, f.areaBerisiko.gas,
        f.areaBerisiko.ketinggian, f.areaBerisiko.cairan, f.areaBerisiko.hydrocarbon, f.areaBerisiko.lain,
        f.pencegahan.equipment === 'ya',      f.pencegahan.apar === 'ya',
        f.pencegahan.sensor === 'ya',         f.pencegahan.apd === 'ya',
        f.pencegahan.meter11_cairan === 'ya', f.pencegahan.lantai === 'ya',
        f.pencegahan.lantaiBasah === 'ya',    f.pencegahan.cairan_diproteksi === 'ya',
        f.pencegahan.lembaran === 'ya',       f.pencegahan.lindungi_conveyor === 'ya',
        f.pencegahan.ruang_tertutup_dibersihkan === 'ya', f.pencegahan.uap_dibuang === 'ya',
        f.pencegahan.dinding_konstruksi === 'ya', f.pencegahan.bahan_dipindahkan === 'ya',
        f.pencegahan.firewatch_ada === 'ya',  f.pencegahan.firewatch_pelatihan === 'ya',
        f.pencegahan.permintaan_tambahan,
        f.persetujuan.spvNama, f.persetujuan.kontraktorNama,
        f.persetujuan.sfoNama, f.persetujuan.pgaNama,
      ]
    );
    return NextResponse.json({ success: true, id_form: idForm, status }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/workshop]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}