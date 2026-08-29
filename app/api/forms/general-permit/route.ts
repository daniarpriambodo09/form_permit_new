// app/api/forms/general-permit/route.ts
// UPDATED: Tambah kolom perlu_jsa dan jsa_file_url — halaman
// /form/ijin-kerja-eksternal sekarang punya Bagian 4: Upload JSA (reuse
// JsaUploadSection). license_sertifikasi TIDAK butuh migration baru —
// kolom itu sudah ada, sekarang isinya URL file lisensi (bukan lagi teks
// deskripsi), diisi dari komponen upload di frontend.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateEditToken, verifyToken, COOKIE_NAME } from '@/lib/auth';
import { notifyExternalPermit } from '@/lib/approval-email';

async function generateId(): Promise<string> {
  const row = await queryOne<{ next_number: number }>(
    `SELECT COALESCE(MAX(SUBSTRING(id_form FROM 5)::integer), 0) + 1 AS next_number
     FROM form_ijin_kerja
     WHERE id_form ~ '^IJK-[0-9]+$'`
  );
  let next = Number(row?.next_number) || 1;

  // Find the first unused number in case historical data has gaps.
  while (await queryOne<{ id_form: string }>(
    `SELECT id_form FROM form_ijin_kerja WHERE id_form = $1`,
    [`IJK-${String(next).padStart(4, '0')}`]
  )) {
    next += 1;
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
         current_stage, security_approved, sfo_approved, pga_approved,
         perlu_jsa, jsa_file_url`;

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

    // ── JSA fields (Bagian 4) ─────────────────────────────────────────
    const perluJsa   = f.perluJsa === true;
    const jsaFileUrl = perluJsa ? (f.jsaFileUrl || null) : null;
    const safetyInduction = f.safetyInduction && typeof f.safetyInduction === 'object'
      ? f.safetyInduction
      : null;
    const jsaData = perluJsa && f.jsaData && typeof f.jsaData === 'object'
      ? {
          area: typeof f.jsaData.area === 'string' ? f.jsaData.area : '',
          jenisPekerjaan: typeof f.jsaData.jenisPekerjaan === 'string' ? f.jsaData.jenisPekerjaan : '',
          sectDept: typeof f.jsaData.sectDept === 'string' ? f.jsaData.sectDept : '',
          pic: typeof f.jsaData.pic === 'string' ? f.jsaData.pic : '',
          petugas: Array.isArray(f.jsaData.petugas) ? f.jsaData.petugas.slice(0, 10) : [],
          rows: Array.isArray(f.jsaData.rows) ? f.jsaData.rows : [],
          approval: {
            currentStage: 1,
            status: 'submitted',
            catatanReject: null,
            firewatch: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
            spv: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
            sfo: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
          },
        }
      : null;

    if (isSubmit && perluJsa && (!jsaData || !String(jsaData.area || '').trim() || !String(jsaData.jenisPekerjaan || '').trim() || !String(jsaData.pic || '').trim() || !jsaData.petugas.some((name: unknown) => typeof name === 'string' && name.trim()))) {
      return NextResponse.json(
        { error: 'Area, Jenis Pekerjaan, PIC, dan minimal satu Petugas pada JSA wajib diisi.' },
        { status: 400 }
      );
    }

    // ── Lisensi/Sertifikasi files (Bagian 9) — wajib, bisa banyak file ──
    const licenseFiles = Array.isArray(f.licenseFiles)
      ? f.licenseFiles.filter((x: any) => x && typeof x.url === 'string')
      : [];
    const workerCountRaw = f.jumlahTenagaKerja;
    const hasWorkerCount = workerCountRaw !== undefined && workerCountRaw !== null && workerCountRaw !== '';
    const workerCount = Number(workerCountRaw);
    if (hasWorkerCount && (!Number.isInteger(workerCount) || workerCount < 0)) {
      return NextResponse.json(
        { error: 'Jumlah tenaga kerja harus berupa bilangan bulat minimal 0.' },
        { status: 400 }
      );
    }
    if (isSubmit && (!hasWorkerCount || (workerCount > 0 && licenseFiles.length < 1) || licenseFiles.length > workerCount)) {
      return NextResponse.json(
        { error: `Jumlah file lisensi harus minimal 1 dan maksimal ${workerCount}. Saat ini ${licenseFiles.length} file.` },
        { status: 400 }
      );
    }

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
        edit_token, user_id, perlu_jsa, jsa_file_url, license_files,
        izin_kerja_tanggal_dari, izin_kerja_tanggal_sampai, safety_induction
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
        $94,$95,$96,$97,$98,$99,$100,$101
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
        // license_sertifikasi sekarang menyimpan URL file lisensi hasil
        // upload (Bagian 9), bukan lagi teks deskripsi bebas.
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
        editToken, userId, perluJsa, jsaFileUrl, JSON.stringify(licenseFiles),
        f.tglMulaiKerja || null, f.tglAkhirKerjaRencana || null, JSON.stringify(safetyInduction),
      ]
    );

    if (jsaData) {
      await query(
        `UPDATE form_ijin_kerja SET jsa_data = $1 WHERE id_form = $2`,
        [JSON.stringify(jsaData), idForm]
      );
    }

    if (status === 'submitted' && userId) {
      notifyExternalPermit({
        idForm,
        userId,
        namaPemohon: f.namaKontraktorPekerja || 'Pemohon',
        tanggal: now,
        attachmentCount: jsaData ? 1 : 0,
      }).catch((error) => console.error(`[EMAIL] External permit notification failed for ${idForm}:`, error));
    }

    return NextResponse.json({ success: true, id_form: idForm, status, edit_token: editToken }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/general-permit]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}