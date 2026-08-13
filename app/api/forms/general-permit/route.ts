// app/api/forms/general-permit/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateEditToken, verifyToken, COOKIE_NAME } from '@/lib/auth';

async function generateId(): Promise<string> {
  const row = await queryOne<{ id_form: string }>(
    `SELECT id_form FROM form_ijin_kerja ORDER BY id_form DESC LIMIT 1`
  );
  let next = 1;
  if (row) {
    const num = parseInt(row.id_form.replace('IJK-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `IJK-${String(next).padStart(4, '0')}`;
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
         nama_kontraktor_pekerja, lokasi_pekerjaan, tgl_mulai_kerja,
         current_stage, security_approved, sfo_approved, pga_approved`;

    let sql = `SELECT ${selectCols} FROM form_ijin_kerja`;
    const params: any[] = [];
    if (status) { params.push(status); sql += ` WHERE status = $1`; }
    sql += ` ORDER BY tanggal DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows      = await query(sql, params);
    const countRows = await query(
      status
        ? `SELECT COUNT(*) FROM form_ijin_kerja WHERE status = $1`
        : `SELECT COUNT(*) FROM form_ijin_kerja`,
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
    const { isSubmit, ...f } = body;

    const { userId } = getUserFromReq(req);
    const idForm      = await generateId();
    const editToken   = generateEditToken();
    const status      = isSubmit ? 'submitted' : 'draft';
    const now         = new Date().toISOString();

    const toIso = (d: string | null | undefined) => (d ? new Date(d).toISOString() : null);

    await query(
      `INSERT INTO form_ijin_kerja (
        id_form, tanggal, tanggal_pelaksanaan, status,
        nama_kontraktor_pekerja, nama_pengawas_pic_subkont, jumlah_tenaga_kerja,
        tgl_mulai_kerja, tgl_akhir_kerja_rencana, waktu_kerja, actual_tanggal_kerja,
        spek_area_workshop, spek_ruang_tertutup, spek_ketinggian, spek_tegangan_tinggi,
        spek_pemakaian_loto, spek_forklift, spek_temperatur_tinggi,
        deskripsi_pekerjaan, spesifikasi_lainnya,
        alat_mesin_potong, alat_mesin_potong_kondisi,
        alat_mesin_las_gerinda, alat_mesin_las_gerinda_kondisi,
        alat_genset, alat_genset_kondisi,
        alat_tabung_gas, alat_tabung_gas_kondisi,
        alat_tangga_listrik_awp, alat_tangga_listrik_awp_kondisi,
        alat_forklift, alat_forklift_kondisi,
        alat_lift_barang, alat_lift_barang_kondisi,
        alat_lainnya, alat_lainnya_kondisi,
        lokasi_pekerjaan, lokasi_dalam_gedung, lokasi_luar_gedung,
        lokasi_luar_pagar_gedung, lokasi_di_atas_gedung, lokasi_lainnya,
        pengawas_bagian, pic_loto_station_loto,
        bahan_mudah_terbakar, bahan_mudah_meledak, bahan_kimia_beracun_iritan, bahan_lainnya,
        dampak_ledakan_kebakaran, dampak_jatuh_ketinggian, dampak_kepala_tertimpa,
        dampak_kaki_tertimpa, dampak_tumpahan_oli_bbm_b3, dampak_tersengat_listrik,
        dampak_terjepit_mesin, dampak_tersayat_tertusuk, dampak_infeksi_pernafasan,
        dampak_iritasi_mata, dampak_radiasi_sinar_las, dampak_iritasi_kulit,
        dampak_kebisingan, dampak_keracunan_zat_kimia, dampak_lainnya,
        apd_masker, apd_masker_kimia, apd_kacamata_biasa, apd_kacamata_las,
        apd_ear_plug, apd_gloves, apd_full_body_harness,
        apd_sarung_tangan_bintil, apd_sarung_tangan_listrik, apd_sarung_tangan_kulit,
        apd_helm, apd_safety_shoes, apd_sepatu_karet, apd_topi_kerja, apd_lainnya,
        license_sertifikasi,
        apar_dry_powder, apar_gas_cair, apar_tidak_perlu, apar_lainnya,
        limbah_kontraktor, limbah_pt_jai, limbah_lokasi_pt, limbah_luar_jai,
        izin_kerja_dari, izin_kerja_sampai,
        kontraktor_pj, spv_terkait_pj,
        pernyataan_diperiksa, pengawas_pekerjaan_user,
        edit_token, user_id
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,
        $19,$20,
        $21,$22,
        $23,$24,
        $25,$26,
        $27,$28,
        $29,$30,
        $31,$32,
        $33,$34,
        $35,$36,
        $37,$38,$39,
        $40,$41,$42,
        $43,$44,
        $45,$46,$47,$48,
        $49,$50,$51,
        $52,$53,$54,
        $55,$56,$57,
        $58,$59,$60,
        $61,$62,$63,
        $64,$65,$66,$67,
        $68,$69,$70,
        $71,$72,$73,
        $74,$75,$76,$77,$78,
        $79,
        $80,$81,$82,$83,
        $84,$85,$86,$87,
        $88,$89,
        $90,$91,
        $92,$93,
        $94,$95
      )`,
      [
        idForm, now, toIso(f.tglMulaiKerja), status,
        f.namaKontraktorPekerja  || null, f.namaPengawasPicSubkont || null,
        f.jumlahTenagaKerja ? parseFloat(f.jumlahTenagaKerja) : null,
        toIso(f.tglMulaiKerja), toIso(f.tglAkhirKerjaRencana),
        f.waktuKerja || null, toIso(f.actualTanggalKerja),
        f.spesifikasiPekerjaan?.areaWorkshop      ?? false,
        f.spesifikasiPekerjaan?.ruangTertutup     ?? false,
        f.spesifikasiPekerjaan?.ketinggian        ?? false,
        f.spesifikasiPekerjaan?.teganganTinggi    ?? false,
        f.spesifikasiPekerjaan?.pemakaianLoto     ?? false,
        f.spesifikasiPekerjaan?.forklift          ?? false,
        f.spesifikasiPekerjaan?.temperaturTinggi  ?? false,
        f.deskripsiPekerjaan || null, f.spesifikasiLainnya || null,
        f.alat?.mesinPotong?.pakai      ?? false, f.alat?.mesinPotong?.kondisi      || null,
        f.alat?.mesinLasGerinda?.pakai  ?? false, f.alat?.mesinLasGerinda?.kondisi  || null,
        f.alat?.genset?.pakai           ?? false, f.alat?.genset?.kondisi           || null,
        f.alat?.tabungGas?.pakai        ?? false, f.alat?.tabungGas?.kondisi        || null,
        f.alat?.tanggaListrikAwp?.pakai ?? false, f.alat?.tanggaListrikAwp?.kondisi || null,
        f.alat?.forklift?.pakai         ?? false, f.alat?.forklift?.kondisi         || null,
        f.alat?.liftBarang?.pakai       ?? false, f.alat?.liftBarang?.kondisi       || null,
        f.alatLainnya || null, f.alatLainnyaKondisi || null,
        f.lokasiPekerjaan || null,
        f.lokasiTipe?.dalamGedung      ?? false,
        f.lokasiTipe?.luarGedung       ?? false,
        f.lokasiTipe?.luarPagarGedung  ?? false,
        f.lokasiTipe?.diAtasGedung     ?? false,
        f.lokasiLainnya || null,
        f.pengawasBagian || null, f.picLotoStationLoto || null,
        f.bahan?.mudahTerbakar        ?? false,
        f.bahan?.mudahMeledak         ?? false,
        f.bahan?.kimiaBeracunIritan   ?? false,
        f.bahanLainnya || null,
        f.dampak?.ledakanKebakaran     ?? false,
        f.dampak?.jatuhKetinggian      ?? false,
        f.dampak?.kepalaTertimpa       ?? false,
        f.dampak?.kakiTertimpa         ?? false,
        f.dampak?.tumpahanOliBbmB3     ?? false,
        f.dampak?.tersengatListrik     ?? false,
        f.dampak?.terjepitMesin        ?? false,
        f.dampak?.tersayatTertusuk     ?? false,
        f.dampak?.infeksiPernafasan    ?? false,
        f.dampak?.iritasiMata          ?? false,
        f.dampak?.radiasiSinarLas      ?? false,
        f.dampak?.iritasiKulit         ?? false,
        f.dampak?.kebisingan           ?? false,
        f.dampak?.keracunanZatKimia    ?? false,
        f.dampakLainnya || null,
        f.apd?.masker                ?? false,
        f.apd?.maskerKimia           ?? false,
        f.apd?.kacamataBiasa         ?? false,
        f.apd?.kacamataLas           ?? false,
        f.apd?.earPlug               ?? false,
        f.apd?.gloves                ?? false,
        f.apd?.fullBodyHarness       ?? false,
        f.apd?.sarungTanganBintil    ?? false,
        f.apd?.sarungTanganListrik   ?? false,
        f.apd?.sarungTanganKulit     ?? false,
        f.apd?.helm                  ?? false,
        f.apd?.safetyShoes           ?? false,
        f.apd?.sepatuKaret           ?? false,
        f.apd?.topiKerja             ?? false,
        f.apdLainnya || null,
        f.licenseSertifikasi || null,
        f.apar?.dryPowder   ?? false,
        f.apar?.gasCair     ?? false,
        f.apar?.tidakPerlu  ?? false,
        f.aparLainnya || null,
        f.limbah?.kontraktor ?? false,
        f.limbah?.ptJai      ?? false,
        f.limbahLokasiPt || null,
        f.limbah?.luarJai    ?? false,
        f.izinKerjaDari    || null, f.izinKerjaSampai || null,
        f.kontraktorPj || null, f.spvTerkaitPj || null,
        f.pernyataanDiperiksa ?? false, f.pengawasPekerjaanUser || null,
        editToken, userId,
      ]
    );

    return NextResponse.json({ success: true, id_form: idForm, status, edit_token: editToken }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/general-permit]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}