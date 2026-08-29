// app/api/forms/general-permit/[id]/route.ts
// UPDATED: Tambah kolom perlu_jsa dan jsa_file_url ke PUT (edit & resubmit),
// mengikuti penambahan Bagian 4: Upload JSA di halaman
// /form/ijin-kerja-eksternal. license_sertifikasi tidak berubah strukturnya
// (masih text), hanya isinya sekarang URL file lisensi.
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── GET: Detail satu form ────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await queryOne(
      `SELECT * FROM form_ijin_kerja WHERE id_form = $1`,
      [id]
    );
    if (!row) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    console.error('[GET /api/forms/general-permit/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update status saja ────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;
    const validStatus = ['draft', 'submitted', 'approved', 'rejected'];
    if (!validStatus.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }
    const updated = await queryOne(
      `UPDATE form_ijin_kerja
       SET status = $1, updated_at = NOW()
       WHERE id_form = $2
       RETURNING id_form, status`,
      [status, id]
    );
    if (!updated) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[PATCH /api/forms/general-permit/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT: Update penuh (edit & resubmit setelah reject/draft) ──
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await queryOne(
      `SELECT id_form, status, user_id FROM form_ijin_kerja WHERE id_form = $1`,
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    if (!['rejected', 'draft'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Form dengan status "${existing.status}" tidak bisa diedit` },
        { status: 403 }
      );
    }
    if (existing.user_id !== user.userId) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk mengedit form ini' }, { status: 403 });
    }

    const body = await req.json();
    const f = body;
    const newStatus = body.status === 'submitted' ? 'submitted' : 'draft';
    const now = new Date().toISOString();
    const toIso = (d: string | null | undefined) => (d ? new Date(d).toISOString() : null);

    // ── JSA fields (Bagian 4) ─────────────────────────────────────────
    const perluJsa   = f.perluJsa === true;
    const jsaFileUrl = perluJsa ? (f.jsaFileUrl || null) : null;

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
    if (newStatus === 'submitted' && (!hasWorkerCount || licenseFiles.length !== workerCount)) {
      return NextResponse.json(
        { error: `Jumlah file lisensi harus tepat ${workerCount}. Saat ini ${licenseFiles.length} file.` },
        { status: 400 }
      );
    }

    // Update penuh — set ulang seluruh field Bagian 1-11 & 14, reset status
    // approval (sama pola dengan height-work: catatan_reject/approved_by/at
    // dan current_stage dikembalikan ke awal saat resubmit).
    await query(
      `UPDATE form_ijin_kerja SET
        nama_kontraktor_pekerja = $1, nama_pengawas_pic_subkont = $2, jumlah_tenaga_kerja = $3,
        tgl_mulai_kerja = $4, tgl_akhir_kerja_rencana = $5, waktu_kerja = $6, actual_tanggal_kerja = $7,
        tanggal_pelaksanaan = $4,
        spek_area_workshop = $8, spek_ruang_tertutup = $9, spek_ketinggian = $10,
        spek_tegangan_tinggi = $11, spek_pemakaian_loto = $12, spek_forklift = $13,
        spek_temperatur_tinggi = $14, deskripsi_pekerjaan = $15, spesifikasi_lainnya = $16,
        alat_mesin_potong = $17, alat_mesin_potong_kondisi = $18,
        alat_mesin_las_gerinda = $19, alat_mesin_las_gerinda_kondisi = $20,
        alat_genset = $21, alat_genset_kondisi = $22,
        alat_tabung_gas = $23, alat_tabung_gas_kondisi = $24,
        alat_tangga_listrik_awp = $25, alat_tangga_listrik_awp_kondisi = $26,
        alat_forklift = $27, alat_forklift_kondisi = $28,
        alat_lift_barang = $29, alat_lift_barang_kondisi = $30,
        alat_lainnya = $31, alat_lainnya_kondisi = $32,
        lokasi_pekerjaan = $33, lokasi_dalam_gedung = $34, lokasi_luar_gedung = $35,
        lokasi_luar_pagar_gedung = $36, lokasi_di_atas_gedung = $37, lokasi_lainnya = $38,
        pengawas_bagian = $39, pic_loto_station_loto = $40,
        bahan_mudah_terbakar = $41, bahan_mudah_meledak = $42, bahan_kimia_beracun_iritan = $43,
        bahan_lainnya = $44,
        dampak_ledakan_kebakaran = $45, dampak_jatuh_ketinggian = $46, dampak_kepala_tertimpa = $47,
        dampak_kaki_tertimpa = $48, dampak_tumpahan_oli_bbm_b3 = $49, dampak_tersengat_listrik = $50,
        dampak_terjepit_mesin = $51, dampak_tersayat_tertusuk = $52, dampak_infeksi_pernafasan = $53,
        dampak_iritasi_mata = $54, dampak_radiasi_sinar_las = $55, dampak_iritasi_kulit = $56,
        dampak_kebisingan = $57, dampak_keracunan_zat_kimia = $58, dampak_lainnya = $59,
        apd_masker = $60, apd_masker_kimia = $61, apd_kacamata_biasa = $62, apd_kacamata_las = $63,
        apd_ear_plug = $64, apd_gloves = $65, apd_full_body_harness = $66,
        apd_sarung_tangan_bintil = $67, apd_sarung_tangan_listrik = $68, apd_sarung_tangan_kulit = $69,
        apd_helm = $70, apd_safety_shoes = $71, apd_sepatu_karet = $72, apd_topi_kerja = $73,
        apd_lainnya = $74,
        license_sertifikasi = $75,
        apar_dry_powder = $76, apar_gas_cair = $77, apar_tidak_perlu = $78, apar_lainnya = $79,
        limbah_kontraktor = $80, limbah_pt_jai = $81, limbah_lokasi_pt = $82, limbah_luar_jai = $83,
        izin_kerja_dari = $84, izin_kerja_sampai = $85,
        kontraktor_pj = $86, spv_terkait_pj = $87,
        pernyataan_diperiksa = $88, pengawas_pekerjaan_user = $89,
        perlu_jsa = $90, jsa_file_url = $91, license_files = $92,
        status = $93,
        current_stage = 1,
        security_approved = false, security_approved_by = NULL, security_approved_at = NULL,
        sfo_approved = false, sfo_approved_by = NULL, sfo_approved_at = NULL,
        pga_approved = false, pga_approved_by = NULL, pga_approved_at = NULL,
        catatan_reject = NULL,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = $94
       WHERE id_form = $95
       RETURNING id_form, status`,
      [
        f.namaKontraktorPekerja || null, f.namaPengawasPicSubkont || null,
        f.jumlahTenagaKerja ? parseFloat(f.jumlahTenagaKerja) : null,
        toIso(f.tglMulaiKerja), toIso(f.tglAkhirKerjaRencana), f.waktuKerja || null, toIso(f.actualTanggalKerja),
        f.spesifikasiPekerjaan?.areaWorkshop ?? false, f.spesifikasiPekerjaan?.ruangTertutup ?? false,
        f.spesifikasiPekerjaan?.ketinggian ?? false, f.spesifikasiPekerjaan?.teganganTinggi ?? false,
        f.spesifikasiPekerjaan?.pemakaianLoto ?? false, f.spesifikasiPekerjaan?.forklift ?? false,
        f.spesifikasiPekerjaan?.temperaturTinggi ?? false, f.deskripsiPekerjaan || null, f.spesifikasiLainnya || null,
        f.alat?.mesinPotong?.pakai ?? false, f.alat?.mesinPotong?.kondisi || null,
        f.alat?.mesinLasGerinda?.pakai ?? false, f.alat?.mesinLasGerinda?.kondisi || null,
        f.alat?.genset?.pakai ?? false, f.alat?.genset?.kondisi || null,
        f.alat?.tabungGas?.pakai ?? false, f.alat?.tabungGas?.kondisi || null,
        f.alat?.tanggaListrikAwp?.pakai ?? false, f.alat?.tanggaListrikAwp?.kondisi || null,
        f.alat?.forklift?.pakai ?? false, f.alat?.forklift?.kondisi || null,
        f.alat?.liftBarang?.pakai ?? false, f.alat?.liftBarang?.kondisi || null,
        f.alatLainnya || null, f.alatLainnyaKondisi || null,
        f.lokasiPekerjaan || null,
        f.lokasiTipe?.dalamGedung ?? false, f.lokasiTipe?.luarGedung ?? false,
        f.lokasiTipe?.luarPagarGedung ?? false, f.lokasiTipe?.diAtasGedung ?? false,
        f.lokasiLainnya || null,
        f.pengawasBagian || null, f.picLotoStationLoto || null,
        f.bahan?.mudahTerbakar ?? false, f.bahan?.mudahMeledak ?? false, f.bahan?.kimiaBeracunIritan ?? false,
        f.bahanLainnya || null,
        f.dampak?.ledakanKebakaran ?? false, f.dampak?.jatuhKetinggian ?? false, f.dampak?.kepalaTertimpa ?? false,
        f.dampak?.kakiTertimpa ?? false, f.dampak?.tumpahanOliBbmB3 ?? false, f.dampak?.tersengatListrik ?? false,
        f.dampak?.terjepitMesin ?? false, f.dampak?.tersayatTertusuk ?? false, f.dampak?.infeksiPernafasan ?? false,
        f.dampak?.iritasiMata ?? false, f.dampak?.radiasiSinarLas ?? false, f.dampak?.iritasiKulit ?? false,
        f.dampak?.kebisingan ?? false, f.dampak?.keracunanZatKimia ?? false, f.dampakLainnya || null,
        f.apd?.masker ?? false, f.apd?.maskerKimia ?? false, f.apd?.kacamataBiasa ?? false, f.apd?.kacamataLas ?? false,
        f.apd?.earPlug ?? false, f.apd?.gloves ?? false, f.apd?.fullBodyHarness ?? false,
        f.apd?.sarungTanganBintil ?? false, f.apd?.sarungTanganListrik ?? false, f.apd?.sarungTanganKulit ?? false,
        f.apd?.helm ?? false, f.apd?.safetyShoes ?? false, f.apd?.sepatuKaret ?? false, f.apd?.topiKerja ?? false,
        f.apdLainnya || null,
        f.licenseSertifikasi || null,
        f.apar?.dryPowder ?? false, f.apar?.gasCair ?? false, f.apar?.tidakPerlu ?? false, f.aparLainnya || null,
        f.limbah?.kontraktor ?? false, f.limbah?.ptJai ?? false, f.limbahLokasiPt || null, f.limbah?.luarJai ?? false,
        f.izinKerjaDari || null, f.izinKerjaSampai || null,
        f.kontraktorPj || null, f.spvTerkaitPj || null,
        f.pernyataanDiperiksa ?? false, f.pengawasPekerjaanUser || null,
        perluJsa, jsaFileUrl, JSON.stringify(licenseFiles),
        newStatus,
        now,
        id,
      ]
    );

    if (f.tglMulaiKerja !== undefined || f.tglAkhirKerjaRencana !== undefined) {
      await query(
        `UPDATE form_ijin_kerja
            SET izin_kerja_tanggal_dari = $1,
                izin_kerja_tanggal_sampai = $2
          WHERE id_form = $3`,
        [f.tglMulaiKerja || null, f.tglAkhirKerjaRencana || null, id]
      );
    }

    return NextResponse.json({
      success: true,
      id_form: id,
      status: newStatus,
      message: 'Form berhasil diperbaiki dan dikirim ulang',
    });
  } catch (err: any) {
    console.error('[PUT /api/forms/general-permit/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: Batalkan form (hanya draft/submitted milik sendiri) ─
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await queryOne(
      `SELECT id_form, status, user_id FROM form_ijin_kerja WHERE id_form = $1`,
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    if (!['submitted', 'draft'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Form dengan status "${existing.status}" tidak bisa dibatalkan` },
        { status: 403 }
      );
    }
    if (existing.user_id !== user.userId) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk menghapus form ini' }, { status: 403 });
    }

    await query(`DELETE FROM form_ijin_kerja WHERE id_form = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Form berhasil dibatalkan dan dihapus',
      id_form: id,
    });
  } catch (err: any) {
    console.error('[DELETE /api/forms/general-permit/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}