// app/api/forms/workshop/route.ts
// BUGFIX: Memperbaiki INSERT VALUES - jumlah placeholder ($1-$63) harus sesuai
// dengan jumlah kolom (63) dan jumlah nilai di array params (63).
// Bug sebelumnya: VALUES clause memiliki $1-$65 (65 placeholder) tapi hanya
// 63 kolom dan 63 nilai → error "INSERT has more expressions than target columns"

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

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

    let sql = `SELECT ${selectCols} FROM form_kerja_workshop`;
    const params: any[] = [];
    if (status) { params.push(status); sql += ` WHERE status = $1`; }
    sql += ` ORDER BY tanggal DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await query(sql, params);
    const countRows = await query(
      status ? `SELECT COUNT(*) FROM form_kerja_workshop WHERE status = $1` : `SELECT COUNT(*) FROM form_kerja_workshop`,
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

    const userId = getUserId(req);
    const idForm = await generateId();
    const now    = new Date().toISOString();

    const tipePerusahaan: 'internal' | 'eksternal' =
      f.tipePerusahaan === 'eksternal' ? 'eksternal' : 'internal';

    const status = isSubmit ? 'submitted' : 'draft';

    // ── 63 kolom, 63 parameter ($1–$63) ──────────────────────
    // Kolom:
    //  $1–$4   : id_form, tanggal, tanggal_pelaksanaan, status
    //  $5–$6   : tipe_perusahaan, current_stage
    //  $7–$11  : no_registrasi, nama_kontraktor_nik, nama_pekerja_nik, lokasi_pekerjaan, waktu_pukul
    //  $12–$15 : nama_fire_watch, nik_fire_watch, jabatan_pemberi_izin, nik_pemberi_ijin
    //  $16–$18 : preventive_genset_pump_room, tangki_solar, panel_listrik
    //  $19–$30 : detail cutting/grinding/welding/painting (masing-masing 3: detail, mulai, selesai)
    //  $31–$32 : painting_spray, painting_non_spray
    //  $33–$34 : ada_kerja_lainnya, jenis_kerjaan_lainnya
    //  $35–$41 : area berisiko (7 kolom)
    //  $42–$57 : pencegahan (16 boolean)
    //  $58     : permintaan_tambahan
    //  $59–$62 : spv_terkait, kontraktor, sfo, pga (null saat submit)
    //  $63     : user_id

    await query(
      `INSERT INTO form_kerja_workshop (
        id_form, tanggal, tanggal_pelaksanaan, status,
        tipe_perusahaan, current_stage,
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
        spv_terkait, kontraktor, sfo, pga,
        user_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,
        $33,$34,
        $35,$36,$37,$38,$39,$40,$41,
        $42,$43,$44,$45,$46,$47,$48,$49,$50,$51,
        $52,$53,$54,$55,$56,$57,
        $58,
        $59,$60,$61,$62,
        $63
      )`,
      [
        // $1–$6: identifikasi & metadata
        idForm,                                                              // $1
        now,                                                                 // $2
        f.tanggalPelaksanaan ? new Date(f.tanggalPelaksanaan).toISOString() : null, // $3
        status,                                                              // $4
        tipePerusahaan,                                                      // $5
        0,                                                                   // $6 current_stage

        // $7–$11: data kontraktor/pekerja
        f.noRegistrasi   || null,                                            // $7
        f.namaKontraktor || null,                                            // $8
        f.namaNIK        || null,                                            // $9
        f.lokasi         || null,                                            // $10
        f.waktuPukul     || null,                                            // $11

        // $12–$15: fire watch & pemberi izin (kosong, diisi approver)
        null,                                                                // $12 nama_fire_watch
        null,                                                                // $13 nik_fire_watch
        null,                                                                // $14 jabatan_pemberi_izin
        null,                                                                // $15 nik_pemberi_ijin

        // $16–$18: jenis pekerjaan umum
        f.jenisPekerjaan?.preventive ?? false,                               // $16
        f.jenisPekerjaan?.tangki     ?? false,                               // $17
        f.jenisPekerjaan?.panel      ?? false,                               // $18

        // $19–$30: detail pekerjaan panas
        f.jenisPekerjaan?.cutting?.detail   || null,                         // $19
        f.jenisPekerjaan?.cutting?.mulai    || null,                         // $20
        f.jenisPekerjaan?.cutting?.selesai  || null,                         // $21
        f.jenisPekerjaan?.grinding?.detail  || null,                         // $22
        f.jenisPekerjaan?.grinding?.mulai   || null,                         // $23
        f.jenisPekerjaan?.grinding?.selesai || null,                         // $24
        f.jenisPekerjaan?.welding?.detail   || null,                         // $25
        f.jenisPekerjaan?.welding?.mulai    || null,                         // $26
        f.jenisPekerjaan?.welding?.selesai  || null,                         // $27
        f.jenisPekerjaan?.painting?.detail  || null,                         // $28
        f.jenisPekerjaan?.painting?.mulai   || null,                         // $29
        f.jenisPekerjaan?.painting?.selesai || null,                         // $30

        // $31–$32: painting spray
        f.jenisPekerjaan?.spray    ?? false,                                 // $31
        f.jenisPekerjaan?.nonSpray ?? false,                                 // $32

        // $33–$34: pekerjaan lainnya
        f.jenisPekerjaan?.lainnya            ?? false,                       // $33
        f.jenisPekerjaan?.lainnyaKeterangan || null,                         // $34

        // $35–$41: area berisiko
        f.areaBerisiko?.ruangTertutup ?? false,                              // $35
        f.areaBerisiko?.bahanMudah    ?? false,                              // $36
        f.areaBerisiko?.gas           ?? false,                              // $37
        f.areaBerisiko?.ketinggian    ?? false,                              // $38
        f.areaBerisiko?.cairan        ?? false,                              // $39
        f.areaBerisiko?.hydrocarbon   ?? false,                              // $40
        f.areaBerisiko?.lain          || null,                               // $41

        // $42–$57: pencegahan (16 boolean)
        f.pencegahan?.equipment                  === 'ya',                   // $42
        f.pencegahan?.apar                       === 'ya',                   // $43
        f.pencegahan?.sensor                     === 'ya',                   // $44
        f.pencegahan?.apd                        === 'ya',                   // $45
        f.pencegahan?.meter11_cairan             === 'ya',                   // $46
        f.pencegahan?.lantai                     === 'ya',                   // $47
        f.pencegahan?.lantaiBasah                === 'ya',                   // $48
        f.pencegahan?.cairan_diproteksi          === 'ya',                   // $49
        f.pencegahan?.lembaran                   === 'ya',                   // $50
        f.pencegahan?.lindungi_conveyor          === 'ya',                   // $51
        f.pencegahan?.ruang_tertutup_dibersihkan === 'ya',                   // $52
        f.pencegahan?.uap_dibuang                === 'ya',                   // $53
        f.pencegahan?.dinding_konstruksi         === 'ya',                   // $54
        f.pencegahan?.bahan_dipindahkan          === 'ya',                   // $55
        f.pencegahan?.firewatch_ada              === 'ya',                   // $56
        f.pencegahan?.firewatch_pelatihan        === 'ya',                   // $57

        // $58: permintaan tambahan
        f.pencegahan?.permintaan_tambahan || null,                           // $58

        // $59–$62: persetujuan — NULL, diisi approver nanti
        null,                                                                // $59 spv_terkait
        null,                                                                // $60 kontraktor
        null,                                                                // $61 sfo
        null,                                                                // $62 pga

        // $63: user_id
        userId ?? null,                                                      // $63
      ]
    );

    return NextResponse.json({ success: true, id_form: idForm, status }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/workshop]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}