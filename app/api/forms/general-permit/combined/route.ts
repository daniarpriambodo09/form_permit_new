// app/api/forms/general-permit/combined/route.ts
// Endpoint gabungan untuk alur EKSTERNAL: 1x submit menghasilkan
// 1 record form_ijin_kerja + N record job-type form (hot-work/height-work/workshop)
// yang dipilih user, semua terhubung via id_ijin_kerja, dalam 1 transaction.
// Status semua form (general-permit & tiap job-type) disamakan sekaligus —
// TIDAK ada approval berjenjang antar form ini; masing-masing form tetap
// punya approval chain sendiri-sendiri (lihat masing-masing route asli).

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateEditToken, verifyToken, COOKIE_NAME } from '@/lib/auth';
import { notifyExternalPermit } from '@/lib/approval-email';

function getUserFromReq(req: NextRequest): { userId: number | null; nama: string | null } {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return { userId: null, nama: null };
  try {
    const user = verifyToken(token);
    return { userId: user?.userId ?? null, nama: user?.nama ?? null };
  } catch {
    return { userId: null, nama: null };
  }
}

async function nextId(client: any, table: string, prefix: string): Promise<string> {
  const res = await client.query(
    `SELECT id_form FROM ${table} ORDER BY id_form DESC LIMIT 1 FOR UPDATE`
  );
  let next = 1;
  if (res.rows[0]) {
    const num = parseInt(res.rows[0].id_form.replace(`${prefix}-`, ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

const toIso = (d: string | null | undefined) => (d ? new Date(d).toISOString() : null);

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { isSubmit, generalPermit: gp, jobPermits } = body;
    if (!gp) {
      return NextResponse.json({ error: 'Data general permit wajib diisi' }, { status: 400 });
    }

    const { userId, nama: namaFromToken } = getUserFromReq(req);
    const status = isSubmit ? 'submitted' : 'draft';
    const now = new Date().toISOString();

    await client.query('BEGIN');

    // ── 1. Insert form_ijin_kerja (general permit) ──────────────────────
    const idIjinKerja = await nextId(client, 'form_ijin_kerja', 'WP');
    const editTokenGp = generateEditToken();

    await client.query(
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
        idIjinKerja, now, toIso(gp.tglMulaiKerja), status,
        gp.namaKontraktorPekerja || null, gp.namaPengawasPicSubkont || null,
        gp.jumlahTenagaKerja ? parseFloat(gp.jumlahTenagaKerja) : null,
        toIso(gp.tglMulaiKerja), toIso(gp.tglAkhirKerjaRencana),
        gp.waktuKerja || null, toIso(gp.actualTanggalKerja),
        gp.spesifikasiPekerjaan?.areaWorkshop      ?? false,
        gp.spesifikasiPekerjaan?.ruangTertutup     ?? false,
        gp.spesifikasiPekerjaan?.ketinggian        ?? false,
        gp.spesifikasiPekerjaan?.teganganTinggi    ?? false,
        gp.spesifikasiPekerjaan?.pemakaianLoto     ?? false,
        gp.spesifikasiPekerjaan?.forklift          ?? false,
        gp.spesifikasiPekerjaan?.temperaturTinggi  ?? false,
        gp.deskripsiPekerjaan || null, gp.spesifikasiLainnya || null,
        gp.alat?.mesinPotong?.pakai      ?? false, gp.alat?.mesinPotong?.kondisi      || null,
        gp.alat?.mesinLasGerinda?.pakai  ?? false, gp.alat?.mesinLasGerinda?.kondisi  || null,
        gp.alat?.genset?.pakai           ?? false, gp.alat?.genset?.kondisi           || null,
        gp.alat?.tabungGas?.pakai        ?? false, gp.alat?.tabungGas?.kondisi        || null,
        gp.alat?.tanggaListrikAwp?.pakai ?? false, gp.alat?.tanggaListrikAwp?.kondisi || null,
        gp.alat?.forklift?.pakai         ?? false, gp.alat?.forklift?.kondisi         || null,
        gp.alat?.liftBarang?.pakai       ?? false, gp.alat?.liftBarang?.kondisi       || null,
        gp.alatLainnya || null, gp.alatLainnyaKondisi || null,
        gp.lokasiPekerjaan || null,
        gp.lokasiTipe?.dalamGedung      ?? false,
        gp.lokasiTipe?.luarGedung       ?? false,
        gp.lokasiTipe?.luarPagarGedung  ?? false,
        gp.lokasiTipe?.diAtasGedung     ?? false,
        gp.lokasiLainnya || null,
        gp.pengawasBagian || null, gp.picLotoStationLoto || null,
        gp.bahan?.mudahTerbakar        ?? false,
        gp.bahan?.mudahMeledak         ?? false,
        gp.bahan?.kimiaBeracunIritan   ?? false,
        gp.bahanLainnya || null,
        gp.dampak?.ledakanKebakaran     ?? false,
        gp.dampak?.jatuhKetinggian      ?? false,
        gp.dampak?.kepalaTertimpa       ?? false,
        gp.dampak?.kakiTertimpa         ?? false,
        gp.dampak?.tumpahanOliBbmB3     ?? false,
        gp.dampak?.tersengatListrik     ?? false,
        gp.dampak?.terjepitMesin        ?? false,
        gp.dampak?.tersayatTertusuk     ?? false,
        gp.dampak?.infeksiPernafasan    ?? false,
        gp.dampak?.iritasiMata          ?? false,
        gp.dampak?.radiasiSinarLas      ?? false,
        gp.dampak?.iritasiKulit         ?? false,
        gp.dampak?.kebisingan           ?? false,
        gp.dampak?.keracunanZatKimia    ?? false,
        gp.dampakLainnya || null,
        gp.apd?.masker                ?? false,
        gp.apd?.maskerKimia           ?? false,
        gp.apd?.kacamataBiasa         ?? false,
        gp.apd?.kacamataLas           ?? false,
        gp.apd?.earPlug               ?? false,
        gp.apd?.gloves                ?? false,
        gp.apd?.fullBodyHarness       ?? false,
        gp.apd?.sarungTanganBintil    ?? false,
        gp.apd?.sarungTanganListrik   ?? false,
        gp.apd?.sarungTanganKulit     ?? false,
        gp.apd?.helm                  ?? false,
        gp.apd?.safetyShoes           ?? false,
        gp.apd?.sepatuKaret           ?? false,
        gp.apd?.topiKerja             ?? false,
        gp.apdLainnya || null,
        gp.licenseSertifikasi || null,
        gp.apar?.dryPowder   ?? false,
        gp.apar?.gasCair     ?? false,
        gp.apar?.tidakPerlu  ?? false,
        gp.aparLainnya || null,
        gp.limbah?.kontraktor ?? false,
        gp.limbah?.ptJai      ?? false,
        gp.limbahLokasiPt || null,
        gp.limbah?.luarJai    ?? false,
        gp.izinKerjaDari    || null, gp.izinKerjaSampai || null,
        gp.kontraktorPj || null, gp.spvTerkaitPj || null,
        gp.pernyataanDiperiksa ?? false, gp.pengawasPekerjaanUser || null,
        editTokenGp, userId,
      ]
    );

    if (gp.jsaData && typeof gp.jsaData === 'object') {
      await client.query(
        `UPDATE form_ijin_kerja SET perlu_jsa = TRUE, jsa_data = $1 WHERE id_form = $2`,
        [JSON.stringify(gp.jsaData), idIjinKerja]
      );
    }
    await client.query(
      `UPDATE form_ijin_kerja
          SET izin_kerja_tanggal_dari = $1,
              izin_kerja_tanggal_sampai = $2
        WHERE id_form = $3`,
      [gp.tglMulaiKerja || null, gp.tglAkhirKerjaRencana || null, idIjinKerja]
    );

    const createdJobForms: { formType: string; idForm: string }[] = [];

    // ── 2. Insert Hot Work (jika dicentang) ──────────────────────────────
    if (jobPermits?.hotWork) {
      const f = jobPermits.hotWork;
      const idHw = await nextId(client, 'form_kerja_panas', 'HW');
      const editToken = generateEditToken();
      const perluJsa = f.perluJsa === true;
      const jsaFileUrl = perluJsa ? (f.jsaFileUrl || null) : null;

      await client.query(
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
          perlu_jsa, jsa_file_url,
          edit_token, user_id, id_ijin_kerja
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
          $64,$65,
          $66,$67,$68
        )`,
        [
          idHw, now, toIso(f.tanggalPelaksanaan),
          status, 'eksternal', 1,
          f.noRegistrasi || null, gp.namaKontraktorPekerja || null, f.namaPekerjaNIK || null,
          f.lokasi || gp.lokasiPekerjaan || null, f.waktuPukul || null,
          f.namaFireWatch || null, f.nikFireWatch || null, '',
          null, null,
          f.jenisPekerjaan?.preventive ?? false,
          f.jenisPekerjaan?.tangki     ?? false,
          f.jenisPekerjaan?.panel      ?? false,
          f.jenisPekerjaan?.cutting?.detail   || null,
          f.jenisPekerjaan?.cutting?.mulai    || null,
          f.jenisPekerjaan?.cutting?.selesai  || null,
          f.jenisPekerjaan?.grinding?.detail  || null,
          f.jenisPekerjaan?.grinding?.mulai   || null,
          f.jenisPekerjaan?.grinding?.selesai || null,
          f.jenisPekerjaan?.welding?.detail   || null,
          f.jenisPekerjaan?.welding?.mulai    || null,
          f.jenisPekerjaan?.welding?.selesai  || null,
          f.jenisPekerjaan?.painting?.detail  || null,
          f.jenisPekerjaan?.painting?.mulai   || null,
          f.jenisPekerjaan?.painting?.selesai || null,
          f.jenisPekerjaan?.lainnya            ?? false,
          f.jenisPekerjaan?.lainnyaKeterangan || null,
          f.areaBerisiko?.ruangTertutup ?? false, f.areaBerisiko?.bahanMudah ?? false,
          f.areaBerisiko?.gas           ?? false, f.areaBerisiko?.ketinggian ?? false,
          f.areaBerisiko?.cairan        ?? false, f.areaBerisiko?.hydrocarbon ?? false,
          f.areaBerisiko?.lain          || null,
          f.pencegahan?.equipment                  === 'ya',
          f.pencegahan?.apar                       === 'ya',
          f.pencegahan?.sensor                     === 'ya',
          f.pencegahan?.apd                        === 'ya',
          f.pencegahan?.meter11_cairan             === 'ya',
          f.pencegahan?.lantai                     === 'ya',
          f.pencegahan?.lantaiBasah                === 'ya',
          f.pencegahan?.cairan_diproteksi          === 'ya',
          f.pencegahan?.lembaran                   === 'ya',
          f.pencegahan?.lindungi_conveyor          === 'ya',
          f.pencegahan?.ruang_tertutup_dibersihkan === 'ya',
          f.pencegahan?.uap_dibuang                === 'ya',
          f.pencegahan?.dinding_konstruksi         === 'ya',
          f.pencegahan?.bahan_dipindahkan          === 'ya',
          f.pencegahan?.firewatch_ada              === 'ya',
          f.pencegahan?.firewatch_pelatihan        === 'ya',
          f.pencegahan?.fireblank === 'layak',
          f.pencegahan?.fireblank_jumlah ? parseInt(f.pencegahan.fireblank_jumlah) : null,
          f.pencegahan?.permintaan_tambahan || null,
          null, null, null, null,
          perluJsa, jsaFileUrl,
          editToken, userId, idIjinKerja,
        ]
      );
      createdJobForms.push({ formType: 'hot-work', idForm: idHw });
    }

    // ── 3. Insert Height Work (jika dicentang) ───────────────────────────
    if (jobPermits?.heightWork) {
      const f = jobPermits.heightWork;
      const idHaw = await nextId(client, 'form_kerja_ketinggian', 'HAW');
      const perluJsa = f.perluJsa === true;
      const jsaFileUrl = perluJsa ? (f.jsaFileUrl || null) : null;

      await client.query(
        `INSERT INTO form_kerja_ketinggian (
          id_form, tanggal, tanggal_pelaksanaan, status,
          petugas_ketinggian, tipe_perusahaan,
          deskripsi_pekerjaan, lokasi,
          waktu_mulai, waktu_selesai, nama_pengawas_kontraktor,
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
          helm_kondisi_baik,
          spv_terkait, nama_kontraktor, sfo, mr_pga_mgr,
          perlu_jsa, jsa_file_url,
          user_id, id_ijin_kerja
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
          $24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,
          $36,$37,$38,$39,$40,$41,$42,
          $43,$44,$45,
          $46,$47,
          $48,$49,
          $50,$51,
          $52,$53,$54,
          $55,$56,$57,
          $58,$59,$60,
          $61,$62,$63,
          $64,$65,$66,
          $67,
          $68,$69,$70,$71,
          $72,$73,
          $74,$75
        )`,
        [
          idHaw, now, toIso(f.tanggalPelaksanaan), status,
          'Eksternal / Subkontraktor', 'eksternal',
          f.deskripsiPekerjaan || null, f.lokasi || gp.lokasiPekerjaan || null,
          f.waktuMulai || null, f.waktuSelesai || null,
          f.namaPengawasKontraktor || gp.namaPengawasPicSubkont || null,
          f.namaPetugas?.[0] || null, f.berbadanSehat?.[0] ?? false, f.fotoLisensi?.[0] || null,
          f.namaPetugas?.[1] || null, f.berbadanSehat?.[1] ?? false, f.fotoLisensi?.[1] || null,
          f.namaPetugas?.[2] || null, f.berbadanSehat?.[2] ?? false, f.fotoLisensi?.[2] || null,
          f.namaPetugas?.[3] || null, f.berbadanSehat?.[3] ?? false, f.fotoLisensi?.[3] || null,
          f.namaPetugas?.[4] || null, f.berbadanSehat?.[4] ?? false, f.fotoLisensi?.[4] || null,
          f.namaPetugas?.[5] || null, f.berbadanSehat?.[5] ?? false, f.fotoLisensi?.[5] || null,
          f.namaPetugas?.[6] || null, f.berbadanSehat?.[6] ?? false, f.fotoLisensi?.[6] || null,
          f.namaPetugas?.[7] || null, f.berbadanSehat?.[7] ?? false, f.fotoLisensi?.[7] || null,
          f.namaPetugas?.[8] || null, f.berbadanSehat?.[8] ?? false, f.fotoLisensi?.[8] || null,
          f.namaPetugas?.[9] || null, f.berbadanSehat?.[9] ?? false, f.fotoLisensi?.[9] || null,
          f.kunceePagar ?? false,
          f.rompiKetinggian ?? false,
          f.rompiAngka ? parseFloat(f.rompiAngka) : null,
          f.safetyHelmetCount ? true : false,
          f.safetyHelmetCount ? parseFloat(f.safetyHelmetCount) : null,
          f.fullBodyHarnessCount ? true : false,
          f.fullBodyHarnessCount ? parseFloat(f.fullBodyHarnessCount) : null,
          f.areaKerjaAman ?? false,
          f.kebakaranProcedure ?? false,
          f.pekerjaanListrik ?? false,
          f.prosedurLoto ?? false,
          f.perisakArea ?? false,
          f.safetyLineLine ?? false,
          f.alatBantuKerja ?? false,
          f.rompiSaatBekerja ?? false,
          f.bebanBeratTubuh ?? false,
          f.helmStandar ?? false,
          f.rambuSafetyWarning ?? false,
          f.bodyHarnessWebbing ?? false,
          f.bodyHarnessDRing ?? false,
          f.bodyHarnessAdjustment ?? false,
          f.lanyardAbsorber ?? false,
          f.lanyardSnapHook ?? false,
          f.lanyardRope ?? false,
          f.helmKondisiBaik ?? false,
          null, gp.namaKontraktorPekerja || null, null, null,
          perluJsa, jsaFileUrl,
          userId, idIjinKerja,
        ]
      );
      createdJobForms.push({ formType: 'height-work', idForm: idHaw });
    }

    // ── 4. Insert Workshop (jika dicentang) ──────────────────────────────
    if (jobPermits?.workshop) {
      const f = jobPermits.workshop;
      const idWs = await nextId(client, 'form_kerja_workshop', 'WS');
      const perluJsa = f.perluJsa === true;
      const jsaFileUrl = perluJsa ? (f.jsaFileUrl || null) : null;
      const pekerjaNama = f.namaPekerja || null;
      const pekerjaNik  = f.nikPekerja  || null;
      const namaPekerjaNik = pekerjaNama && pekerjaNik ? `${pekerjaNama} / ${pekerjaNik}` : pekerjaNama || null;

      await client.query(
        `INSERT INTO form_kerja_workshop (
          id_form, tanggal, tanggal_pelaksanaan, status,
          tipe_perusahaan, current_stage,
          no_registrasi, nama_kontraktor_nik, nama_pekerja_nik, nik_pekerja,
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
          perlu_jsa, jsa_file_url,
          user_id, id_ijin_kerja
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
          $63,$64,
          $65,$66
        )`,
        [
          idWs, now, toIso(f.tanggalPelaksanaan), status, 'eksternal', 1,
          f.noRegistrasi || null, gp.namaKontraktorPekerja || null, namaPekerjaNik, pekerjaNik,
          f.lokasi || gp.lokasiPekerjaan || null, f.waktuPukul || null,
          f.namaFireWatch || null, f.nikFireWatch || null,
          null, null,
          f.jenisPekerjaan?.preventive ?? false,
          f.jenisPekerjaan?.tangki     ?? false,
          f.jenisPekerjaan?.panel      ?? false,
          f.jenisPekerjaan?.cutting?.detail   || null,
          f.jenisPekerjaan?.cutting?.mulai    || null,
          f.jenisPekerjaan?.cutting?.selesai  || null,
          f.jenisPekerjaan?.grinding?.detail  || null,
          f.jenisPekerjaan?.grinding?.mulai   || null,
          f.jenisPekerjaan?.grinding?.selesai || null,
          f.jenisPekerjaan?.welding?.detail   || null,
          f.jenisPekerjaan?.welding?.mulai    || null,
          f.jenisPekerjaan?.welding?.selesai  || null,
          f.jenisPekerjaan?.painting?.detail  || null,
          f.jenisPekerjaan?.painting?.mulai   || null,
          f.jenisPekerjaan?.painting?.selesai || null,
          f.jenisPekerjaan?.spray    ?? false,
          f.jenisPekerjaan?.nonSpray ?? false,
          f.jenisPekerjaan?.lainnya            ?? false,
          f.jenisPekerjaan?.lainnyaKeterangan || null,
          f.areaBerisiko?.ruangTertutup ?? false, f.areaBerisiko?.bahanMudah  ?? false,
          f.areaBerisiko?.gas           ?? false, f.areaBerisiko?.ketinggian  ?? false,
          f.areaBerisiko?.cairan        ?? false, f.areaBerisiko?.hydrocarbon ?? false,
          f.areaBerisiko?.lain          || null,
          f.pencegahan?.equipment                  === 'ya',
          f.pencegahan?.apar                       === 'ya',
          f.pencegahan?.sensor                     === 'ya',
          f.pencegahan?.apd                        === 'ya',
          f.pencegahan?.meter11_cairan             === 'ya',
          f.pencegahan?.lantai                     === 'ya',
          f.pencegahan?.lantaiBasah                === 'ya',
          f.pencegahan?.cairan_diproteksi          === 'ya',
          f.pencegahan?.lembaran                   === 'ya',
          f.pencegahan?.lindungi_conveyor          === 'ya',
          f.pencegahan?.ruang_tertutup_dibersihkan === 'ya',
          f.pencegahan?.uap_dibuang                === 'ya',
          f.pencegahan?.dinding_konstruksi         === 'ya',
          f.pencegahan?.bahan_dipindahkan          === 'ya',
          f.pencegahan?.firewatch_ada              === 'ya',
          f.pencegahan?.firewatch_pelatihan        === 'ya',
          f.pencegahan?.permintaan_tambahan || null,
          null, gp.namaKontraktorPekerja || null, null, null,
          perluJsa, jsaFileUrl,
          userId, idIjinKerja,
        ]
      );
      createdJobForms.push({ formType: 'workshop', idForm: idWs });
    }

    await client.query('COMMIT');

    // ── Email notifikasi approver pertama (fire-and-forget, di luar transaction) ──
    if (status === 'submitted' && userId) {
      notifyExternalPermit({
        idForm: idIjinKerja,
        userId,
        namaPemohon: namaFromToken ?? gp.namaKontraktorPekerja ?? '-',
        tanggal: now,
        attachmentCount: createdJobForms.length + (gp.jsaData ? 1 : 0),
      }).catch((err) => {
        console.error(`[EMAIL] Background external-permit email error for ${idIjinKerja}:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      id_ijin_kerja: idIjinKerja,
      status,
      job_forms: createdJobForms,
    }, { status: 201 });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[POST /api/forms/general-permit/combined]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}