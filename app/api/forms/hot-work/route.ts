// app/api/forms/hot-work/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateEditToken } from '@/lib/auth';

async function generateId(): Promise<string> {
  const row = await queryOne<{ id_form: string }>(
    `SELECT id_form FROM form_kerja_panas ORDER BY id_form DESC LIMIT 1`
  );
  let next = 1000;
  if (row) {
    const num = parseInt(row.id_form.replace('HOW-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `HOW-${next}`;
}

// ── Helper: map body → array values ─────────────────────────
function buildValues(f: any, idForm: string, status: string, now: string, editToken?: string) {
  return [
    idForm, now,
    f.tanggalPelaksanaan ? new Date(f.tanggalPelaksanaan).toISOString() : null,
    status,
    f.noRegistrasi, f.namaKontraktor, f.namaPekerjaNIK,
    f.lokasi, f.waktuPukul || null,
    f.namaFireWatch, f.namaNIKFireWatch, '',
    f.jabaranPemberiIzin, f.namaNIKPemberiIzin,
    f.jenisPekerjaan.preventive, f.jenisPekerjaan.tangki, f.jenisPekerjaan.panel,
    f.jenisPekerjaan.cutting.detail,  f.jenisPekerjaan.cutting.mulai  || null, f.jenisPekerjaan.cutting.selesai  || null,
    f.jenisPekerjaan.grinding.detail, f.jenisPekerjaan.grinding.mulai || null, f.jenisPekerjaan.grinding.selesai || null,
    f.jenisPekerjaan.welding.detail,  f.jenisPekerjaan.welding.mulai  || null, f.jenisPekerjaan.welding.selesai  || null,
    f.jenisPekerjaan.painting.detail, f.jenisPekerjaan.painting.mulai || null, f.jenisPekerjaan.painting.selesai || null,
    f.jenisPekerjaan.lainnya, f.jenisPekerjaan.lainnyaKeterangan,
    f.areaBerisiko.ruangTertutup, f.areaBerisiko.bahanMudah, f.areaBerisiko.gas,
    f.areaBerisiko.ketinggian, f.areaBerisiko.cairan, f.areaBerisiko.hydrocarbon, f.areaBerisiko.lain,
    f.pencegahan.equipment === 'ya', f.pencegahan.apar === 'ya',
    f.pencegahan.sensor === 'ya',    f.pencegahan.apd === 'ya',
    f.pencegahan.meter11_cairan === 'ya', f.pencegahan.lantai === 'ya',
    f.pencegahan.lantaiBasah === 'ya',    f.pencegahan.cairan_diproteksi === 'ya',
    f.pencegahan.lembaran === 'ya',       f.pencegahan.lindungi_conveyor === 'ya',
    f.pencegahan.ruang_tertutup_dibersihkan === 'ya', f.pencegahan.uap_dibuang === 'ya',
    f.pencegahan.dinding_konstruksi === 'ya', f.pencegahan.bahan_dipindahkan === 'ya',
    f.pencegahan.firewatch_ada === 'ya',  f.pencegahan.firewatch_pelatihan === 'ya',
    f.pencegahan.fireblank === 'layak',
    f.pencegahan.fireblank_jumlah ? parseInt(f.pencegahan.fireblank_jumlah) : null,
    f.pencegahan.permintaan_tambahan,
    f.persetujuan.spvNama, f.persetujuan.kontraktorNama,
    f.persetujuan.sfoNama, f.persetujuan.pgaNama,
    editToken ?? null,  // $62 — edit_token
  ];
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
         no_registrasi, nama_kontraktor_nik, nama_pekerja_nik,
         lokasi_pekerjaan, waktu_pukul, spv_terkait`;

    let sql = `SELECT ${selectCols} FROM form_kerja_panas`;
    const params: any[] = [];
    if (status) { params.push(status); sql += ` WHERE status = $1`; }
    sql += ` ORDER BY tanggal DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await query(sql, params);
    const countRows = await query(
      status ? `SELECT COUNT(*) FROM form_kerja_panas WHERE status = $1` : `SELECT COUNT(*) FROM form_kerja_panas`,
      status ? [status] : []
    );
    return NextResponse.json({ data: rows, total: parseInt(countRows[0].count), limit, offset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: buat form baru ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isSubmit, ...f } = body;
    const idForm    = await generateId();
    const status    = isSubmit ? 'submitted' : 'draft';
    const now       = new Date().toISOString();
    const editToken = generateEditToken(); // ← BARU

    await query(
      `INSERT INTO form_kerja_panas (
        id_form, tanggal, tanggal_pelaksanaan, status,
        no_registrasi, nama_kontraktor_nik, nama_pekerja_nik,
        lokasi_pekerjaan, waktu_pukul,
        nama_fire_watch, nik_fire_watch, tanda_tangan_fw,
        jabatan_pemberi_izin, nik_pemberi_ijin,
        preventive_genset_pump_room, tangki_solar, panel_listrik,
        detail_cutting, t_mulai_cutting, t_selesai_cutting,
        detail_grinding, t_mulai_grinding, t_selesai_grinding,
        detail_welding, t_mulai_welding, t_selesai_welding,
        detail_painting, t_mulai_painting, t_selesai_painting,
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
        kondisi_fire_blanket, jumlah_fire_blanket, permintaan_tambahan,
        spv_terkait, kontraktor, sfo, pga,
        edit_token
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
        $51,$52,$53,$54,$55,$56,$57,$58,$59,$60,
        $61,$62
      )`,
      buildValues(f, idForm, status, now, editToken)
    );

    return NextResponse.json({ success: true, id_form: idForm, status, edit_token: editToken }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/hot-work]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT: edit form yang sudah ada (by edit_token) ────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { editToken, isSubmit, ...f } = body;

    if (!editToken) return NextResponse.json({ error: 'edit_token wajib diisi' }, { status: 400 });

    // Cari form berdasarkan token
    const existing = await queryOne<{ id_form: string; status: string }>(
      `SELECT id_form, status FROM form_kerja_panas WHERE edit_token = $1`,
      [editToken]
    );
    if (!existing) return NextResponse.json({ error: 'Form tidak ditemukan atau token tidak valid' }, { status: 404 });

    // Hanya boleh edit jika status rejected atau draft
    if (!['rejected', 'draft'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Form dengan status "${existing.status}" tidak bisa diedit` },
        { status: 403 }
      );
    }

    const newStatus = isSubmit ? 'submitted' : 'draft';
    const now       = new Date().toISOString();

    await query(
      `UPDATE form_kerja_panas SET
        tanggal_pelaksanaan = $1, status = $2,
        no_registrasi = $3, nama_kontraktor_nik = $4, nama_pekerja_nik = $5,
        lokasi_pekerjaan = $6, waktu_pukul = $7,
        nama_fire_watch = $8, nik_fire_watch = $9,
        jabatan_pemberi_izin = $10, nik_pemberi_ijin = $11,
        preventive_genset_pump_room = $12, tangki_solar = $13, panel_listrik = $14,
        detail_cutting = $15, t_mulai_cutting = $16, t_selesai_cutting = $17,
        detail_grinding = $18, t_mulai_grinding = $19, t_selesai_grinding = $20,
        detail_welding = $21, t_mulai_welding = $22, t_selesai_welding = $23,
        detail_painting = $24, t_mulai_painting = $25, t_selesai_painting = $26,
        ada_kerja_lainnya = $27, jenis_kerjaan_lainnya = $28,
        ruang_tertutup = $29, bahan_mudah_terbakar = $30, gas_bejana_tangki = $31,
        height_work = $32, cairan_gas_bertekan = $33, cairan_hydrocarbon = $34, bahaya_lain = $35,
        kondisi_tools_baik = $36, tersedia_apar_hydrant = $37,
        sensor_smoke_detector_non_aktif = $38, apd_lengkap = $39,
        tidak_ada_cairan_mudah_terbakar = $40, lantai_bersih = $41, lantai_sudah_dibasahi = $42,
        cairan_mudah_tebakar_tertutup = $43, lembaran_dibawah_pekerjaan = $44, lindungi_conveyor_dll = $45,
        alat_telah_bersih = $46, uap_menyala_telah_dibuang = $47,
        kerja_pada_dinding_lagit = $48, bahan_mudah_terbakar_dipindahkan_dari_dinding = $49,
        fire_watch_memastikan_area_aman = $50, firwatch_terlatih = $51,
        kondisi_fire_blanket = $52, jumlah_fire_blanket = $53, permintaan_tambahan = $54,
        spv_terkait = $55, kontraktor = $56, sfo = $57, pga = $58,
        catatan_reject = NULL, approved_by = NULL, approved_at = NULL,
        updated_at = $59
      WHERE edit_token = $60`,
      [
        f.tanggalPelaksanaan ? new Date(f.tanggalPelaksanaan).toISOString() : null,
        newStatus,
        f.noRegistrasi, f.namaKontraktor, f.namaPekerjaNIK,
        f.lokasi, f.waktuPukul || null,
        f.namaFireWatch, f.namaNIKFireWatch,
        f.jabaranPemberiIzin, f.namaNIKPemberiIzin,
        f.jenisPekerjaan.preventive, f.jenisPekerjaan.tangki, f.jenisPekerjaan.panel,
        f.jenisPekerjaan.cutting.detail,  f.jenisPekerjaan.cutting.mulai  || null, f.jenisPekerjaan.cutting.selesai  || null,
        f.jenisPekerjaan.grinding.detail, f.jenisPekerjaan.grinding.mulai || null, f.jenisPekerjaan.grinding.selesai || null,
        f.jenisPekerjaan.welding.detail,  f.jenisPekerjaan.welding.mulai  || null, f.jenisPekerjaan.welding.selesai  || null,
        f.jenisPekerjaan.painting.detail, f.jenisPekerjaan.painting.mulai || null, f.jenisPekerjaan.painting.selesai || null,
        f.jenisPekerjaan.lainnya, f.jenisPekerjaan.lainnyaKeterangan,
        f.areaBerisiko.ruangTertutup, f.areaBerisiko.bahanMudah, f.areaBerisiko.gas,
        f.areaBerisiko.ketinggian, f.areaBerisiko.cairan, f.areaBerisiko.hydrocarbon, f.areaBerisiko.lain,
        f.pencegahan.equipment === 'ya', f.pencegahan.apar === 'ya',
        f.pencegahan.sensor === 'ya',    f.pencegahan.apd === 'ya',
        f.pencegahan.meter11_cairan === 'ya', f.pencegahan.lantai === 'ya',
        f.pencegahan.lantaiBasah === 'ya',    f.pencegahan.cairan_diproteksi === 'ya',
        f.pencegahan.lembaran === 'ya',       f.pencegahan.lindungi_conveyor === 'ya',
        f.pencegahan.ruang_tertutup_dibersihkan === 'ya', f.pencegahan.uap_dibuang === 'ya',
        f.pencegahan.dinding_konstruksi === 'ya', f.pencegahan.bahan_dipindahkan === 'ya',
        f.pencegahan.firewatch_ada === 'ya',  f.pencegahan.firewatch_pelatihan === 'ya',
        f.pencegahan.fireblank === 'layak',
        f.pencegahan.fireblank_jumlah ? parseInt(f.pencegahan.fireblank_jumlah) : null,
        f.pencegahan.permintaan_tambahan,
        f.persetujuan.spvNama, f.persetujuan.kontraktorNama,
        f.persetujuan.sfoNama, f.persetujuan.pgaNama,
        now, editToken,
      ]
    );

    return NextResponse.json({ success: true, id_form: existing.id_form, status: newStatus });
  } catch (err: any) {
    console.error('[PUT /api/forms/hot-work]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}