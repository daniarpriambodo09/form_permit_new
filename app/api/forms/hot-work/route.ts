// app/api/forms/hot-work/route.ts
// BUGFIX: Memperbaiki INSERT VALUES - jumlah placeholder ($1-$65) harus sesuai
// dengan jumlah kolom (65) dan jumlah nilai di array params (65).
// Bug sebelumnya: VALUES clause memiliki $1-$64 (64 placeholder) tapi ada 65 kolom
// → error "INSERT has more expressions than target columns"

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateEditToken, verifyToken, COOKIE_NAME } from '@/lib/auth';

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

function getUserId(req: NextRequest): string | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const user = verifyToken(token);
    return user?.userId ? String(user.userId) : null;
  } catch { return null; }
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
         lokasi_pekerjaan, waktu_pukul, tipe_perusahaan, spv_terkait`;

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

    const userId    = getUserId(req);
    const idForm    = await generateId();
    const editToken = generateEditToken();
    const now       = new Date().toISOString();

    // Normalisasi: default 'internal'
    const tipePerusahaan: 'internal' | 'eksternal' =
      f.tipePerusahaan === 'eksternal' ? 'eksternal' : 'internal';

    const startStage = 0;
    const status = isSubmit ? 'submitted' : 'draft';

    // ── 65 kolom, 65 parameter ($1–$65) ──────────────────────
    // Kolom:
    //  $1–$4   : id_form, tanggal, tanggal_pelaksanaan, status
    //  $5–$6   : tipe_perusahaan, current_stage
    //  $7–$11  : no_registrasi, nama_kontraktor_nik, nama_pekerja_nik, lokasi_pekerjaan, waktu_pukul
    //  $12–$16 : nama_fire_watch, nik_fire_watch, tanda_tangan_fw, jabatan_pemberi_izin, nik_pemberi_ijin
    //  $17–$19 : preventive_genset_pump_room, tangki_solar, panel_listrik
    //  $20–$31 : detail cutting/grinding/welding/painting (masing-masing 3)
    //  $32–$33 : ada_kerja_lainnya, jenis_kerjaan_lainnya
    //  $34–$40 : area berisiko (7 kolom)
    //  $41–$58 : pencegahan (16 boolean + kondisi_fire_blanket + jumlah_fire_blanket + permintaan_tambahan = 19 total)
    //  $59–$62 : spv_terkait, kontraktor, sfo, pga (null saat submit)
    //  $63–$64 : edit_token, user_id

    // CATATAN: hot-work TIDAK punya painting_spray/painting_non_spray (berbeda dari workshop)
    //          hot-work PUNYA tanda_tangan_fw, kondisi_fire_blanket, jumlah_fire_blanket
    //          workshop TIDAK punya tanda_tangan_fw, kondisi_fire_blanket, jumlah_fire_blanket

    await query(
      `INSERT INTO form_kerja_panas (
        id_form, tanggal, tanggal_pelaksanaan, status,
        tipe_perusahaan, current_stage,
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
        edit_token, user_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,
        $32,$33,
        $34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
        $51,$52,$53,$54,$55,$56,
        $57,$58,$59,
        $60,$61,$62,$63,
        $64,$65
      )`,
      [
        // $1–$6: identifikasi & metadata
        idForm,                                                              // $1
        now,                                                                 // $2
        f.tanggalPelaksanaan ? new Date(f.tanggalPelaksanaan).toISOString() : null, // $3
        status,                                                              // $4
        tipePerusahaan,                                                      // $5
        startStage,                                                          // $6 current_stage = 0

        // $7–$11: data kontraktor/pekerja
        f.noRegistrasi   || null,                                            // $7
        f.namaKontraktor || null,                                            // $8
        f.namaPekerjaNIK || null,                                            // $9
        f.lokasi         || null,                                            // $10
        f.waktuPukul     || null,                                            // $11

        // $12–$16: fire watch & pemberi izin (kosong, diisi approver)
        null,                                                                // $12 nama_fire_watch
        null,                                                                // $13 nik_fire_watch
        '',                                                                  // $14 tanda_tangan_fw
        null,                                                                // $15 jabatan_pemberi_izin
        null,                                                                // $16 nik_pemberi_ijin

        // $17–$19: jenis pekerjaan umum
        f.jenisPekerjaan?.preventive ?? false,                               // $17
        f.jenisPekerjaan?.tangki     ?? false,                               // $18
        f.jenisPekerjaan?.panel      ?? false,                               // $19

        // $20–$31: detail pekerjaan panas
        f.jenisPekerjaan?.cutting?.detail   || null,                         // $20
        f.jenisPekerjaan?.cutting?.mulai    || null,                         // $21
        f.jenisPekerjaan?.cutting?.selesai  || null,                         // $22
        f.jenisPekerjaan?.grinding?.detail  || null,                         // $23
        f.jenisPekerjaan?.grinding?.mulai   || null,                         // $24
        f.jenisPekerjaan?.grinding?.selesai || null,                         // $25
        f.jenisPekerjaan?.welding?.detail   || null,                         // $26
        f.jenisPekerjaan?.welding?.mulai    || null,                         // $27
        f.jenisPekerjaan?.welding?.selesai  || null,                         // $28
        f.jenisPekerjaan?.painting?.detail  || null,                         // $29
        f.jenisPekerjaan?.painting?.mulai   || null,                         // $30
        f.jenisPekerjaan?.painting?.selesai || null,                         // $31

        // $32–$33: pekerjaan lainnya
        f.jenisPekerjaan?.lainnya            ?? false,                       // $32
        f.jenisPekerjaan?.lainnyaKeterangan || null,                         // $33

        // $34–$40: area berisiko
        f.areaBerisiko?.ruangTertutup ?? false,                              // $34
        f.areaBerisiko?.bahanMudah    ?? false,                              // $35
        f.areaBerisiko?.gas           ?? false,                              // $36
        f.areaBerisiko?.ketinggian    ?? false,                              // $37
        f.areaBerisiko?.cairan        ?? false,                              // $38
        f.areaBerisiko?.hydrocarbon   ?? false,                              // $39
        f.areaBerisiko?.lain          || null,                               // $40

        // $41–$56: pencegahan (16 boolean)
        f.pencegahan?.equipment                  === 'ya',                   // $41
        f.pencegahan?.apar                       === 'ya',                   // $42
        f.pencegahan?.sensor                     === 'ya',                   // $43
        f.pencegahan?.apd                        === 'ya',                   // $44
        f.pencegahan?.meter11_cairan             === 'ya',                   // $45
        f.pencegahan?.lantai                     === 'ya',                   // $46
        f.pencegahan?.lantaiBasah                === 'ya',                   // $47
        f.pencegahan?.cairan_diproteksi          === 'ya',                   // $48
        f.pencegahan?.lembaran                   === 'ya',                   // $49
        f.pencegahan?.lindungi_conveyor          === 'ya',                   // $50
        f.pencegahan?.ruang_tertutup_dibersihkan === 'ya',                   // $51
        f.pencegahan?.uap_dibuang                === 'ya',                   // $52
        f.pencegahan?.dinding_konstruksi         === 'ya',                   // $53
        f.pencegahan?.bahan_dipindahkan          === 'ya',                   // $54
        f.pencegahan?.firewatch_ada              === 'ya',                   // $55
        f.pencegahan?.firewatch_pelatihan        === 'ya',                   // $56

        // $57–$59: fire blanket & permintaan (khusus hot-work)
        f.pencegahan?.fireblank === 'layak',                                 // $57 kondisi_fire_blanket
        f.pencegahan?.fireblank_jumlah ? parseInt(f.pencegahan.fireblank_jumlah) : null, // $58 jumlah_fire_blanket
        f.pencegahan?.permintaan_tambahan || null,                           // $59 permintaan_tambahan

        // $60–$63: persetujuan — NULL, diisi approver nanti
        null,                                                                // $60 spv_terkait
        null,                                                                // $61 kontraktor
        null,                                                                // $62 sfo
        null,                                                                // $63 pga

        // $64–$65: token & user
        editToken,                                                           // $64
        userId ?? null,                                                      // $65
      ]
    );

    return NextResponse.json({ success: true, id_form: idForm, status, edit_token: editToken }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/hot-work]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}