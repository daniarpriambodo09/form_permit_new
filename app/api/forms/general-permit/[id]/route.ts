// app/api/forms/general-permit/[id]/route.ts
// UPDATED: Tambah kolom perlu_jsa dan jsa_file_url ke PUT (edit & resubmit),
// mengikuti penambahan Bagian 4: Upload JSA di halaman
// /form/ijin-kerja-eksternal. license_sertifikasi tidak berubah strukturnya
// (masih text), hanya isinya sekarang URL file lisensi.
// UPDATED: PUT sekarang juga menerima spvPemberiIzin { nama, nik } untuk
//   Bagian 11 (SPV Terkait), disimpan ke spv_terkait_pj & nik_spv_terkait_pj
//   (kolom baru — lihat migration-spv-terkait-ijin-kerja.sql).
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

// ── PATCH: Update status atau actual_tanggal_kerja ─────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, actual_tanggal_kerja, actualTanggalKerja } = body;
    const actualDate = actual_tanggal_kerja !== undefined ? actual_tanggal_kerja : actualTanggalKerja;

    if (actualDate !== undefined && status === undefined) {
      const updated = await queryOne(
        `UPDATE form_ijin_kerja
         SET actual_tanggal_kerja = $1, updated_at = NOW()
         WHERE id_form = $2
         RETURNING id_form, status, actual_tanggal_kerja`,
        [actualDate ? new Date(actualDate).toISOString() : null, id]
      );
      if (!updated) {
        return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: updated });
    }

    const validStatus = ['draft', 'submitted', 'approved', 'rejected'];
    if (status && !validStatus.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status) {
      setClauses.push(`status = $${idx++}`);
      values.push(status);
    }
    if (actualDate !== undefined) {
      setClauses.push(`actual_tanggal_kerja = $${idx++}`);
      values.push(actualDate ? new Date(actualDate).toISOString() : null);
    }
    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const updated = await queryOne(
      `UPDATE form_ijin_kerja
       SET ${setClauses.join(', ')}
       WHERE id_form = $${idx}
       RETURNING id_form, status, actual_tanggal_kerja`,
      values
    );
    if (!updated) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
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
    if (!['rejected', 'draft', 'submitted'].includes(existing.status)) {
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

    if (newStatus === 'submitted' && perluJsa) {
      if (jsaFileUrl) {
        // Mode upload: file JSA sudah dilampirkan
      } else if (
        !f.jsaData ||
        !String(f.jsaData.area || '').trim() ||
        !String(f.jsaData.jenisPekerjaan || '').trim() ||
        !String(f.jsaData.pic || '').trim() ||
        !f.jsaData.petugas?.some((name: unknown) => typeof name === 'string' && name.trim())
      ) {
        return NextResponse.json(
          { error: 'Silakan lampirkan file dokumen JSA atau lengkapi formulir JSA.' },
          { status: 400 }
        );
      }
    }

    // ── Bagian 11: SPV Terkait — nama + NIK (opsional) ─────────────────
    const selectedSpvName = (f.spvPemberiIzin?.nama ?? null)?.toString().trim() || null;
    const selectedSpvNik  = (f.spvPemberiIzin?.nik  ?? null)?.toString().trim() || null;

    // ── Lisensi/Sertifikasi files (Bagian 9) — opsional, jika diisi maksimal sesuai jumlah tenaga kerja ──
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
    if (newStatus === 'submitted' && hasWorkerCount && workerCount > 0 && licenseFiles.length > workerCount) {
      return NextResponse.json(
        { error: `Jumlah file lisensi maksimal ${workerCount}. Saat ini ${licenseFiles.length} file.` },
        { status: 400 }
      );
    }

    // Update penuh — set ulang seluruh field Bagian 1-11 & 14, reset status
    // approval (sama pola dengan height-work: catatan_reject/approved_by/at
    // dan current_stage dikembalikan ke awal saat resubmit).
    await query(
      `UPDATE form_ijin_kerja SET
        nama_kontraktor_pekerja = $1, nama_pengawas_pic_subkont = $2, jumlah_tenaga_kerja = $3,
        tgl_mulai_kerja = $4, tgl_akhir_kerja_rencana = $5, waktu_kerja = $6, waktu_selesai = $7, actual_tanggal_kerja = $8,
        tanggal_pelaksanaan = $4,
        spek_area_workshop = $9, spek_ruang_tertutup = $10, spek_ketinggian = $11,
        spek_tegangan_tinggi = $12, spek_pemakaian_loto = $13, spek_forklift = $14,
        spek_temperatur_tinggi = $15, deskripsi_pekerjaan = $16, spesifikasi_lainnya = $17,
        alat_mesin_potong = $18, alat_mesin_potong_kondisi = $19,
        alat_mesin_las_gerinda = $20, alat_mesin_las_gerinda_kondisi = $21,
        alat_genset = $22, alat_genset_kondisi = $23,
        alat_tabung_gas = $24, alat_tabung_gas_kondisi = $25,
        alat_tangga_listrik_awp = $26, alat_tangga_listrik_awp_kondisi = $27,
        alat_forklift = $28, alat_forklift_kondisi = $29,
        alat_lift_barang = $30, alat_lift_barang_kondisi = $31,
        alat_lainnya = $32, alat_lainnya_kondisi = $33,
        lokasi_pekerjaan = $34, lokasi_dalam_gedung = $35, lokasi_luar_gedung = $36,
        lokasi_luar_pagar_gedung = $37, lokasi_di_atas_gedung = $38, lokasi_lainnya = $39,
        pengawas_bagian = $40, pic_loto_station_loto = $41,
        bahan_mudah_terbakar = $42, bahan_mudah_meledak = $43, bahan_kimia_beracun_iritan = $44,
        bahan_lainnya = $45,
        dampak_ledakan_kebakaran = $46, dampak_jatuh_ketinggian = $47, dampak_kepala_tertimpa = $48,
        dampak_kaki_tertimpa = $49, dampak_tumpahan_oli_bbm_b3 = $50, dampak_tersengat_listrik = $51,
        dampak_terjepit_mesin = $52, dampak_tersayat_tertusuk = $53, dampak_infeksi_pernafasan = $54,
        dampak_iritasi_mata = $55, dampak_radiasi_sinar_las = $56, dampak_iritasi_kulit = $57,
        dampak_kebisingan = $58, dampak_keracunan_zat_kimia = $59, dampak_lainnya = $60,
        apd_masker = $61, apd_masker_kimia = $62, apd_kacamata_biasa = $63, apd_kacamata_las = $64,
        apd_ear_plug = $65, apd_gloves = $66, apd_full_body_harness = $67,
        apd_sarung_tangan_bintil = $68, apd_sarung_tangan_listrik = $69, apd_sarung_tangan_kulit = $70,
        apd_helm = $71, apd_safety_shoes = $72, apd_sepatu_karet = $73, apd_topi_kerja = $74,
        apd_lainnya = $75,
        license_sertifikasi = $76,
        apar_dry_powder = $77, apar_gas_cair = $78, apar_tidak_perlu = $79, apar_lainnya = $80,
        limbah_kontraktor = $81, limbah_pt_jai = $82, limbah_lokasi_pt = $83, limbah_luar_jai = $84,
        izin_kerja_dari = $85, izin_kerja_sampai = $86,
        spv_terkait_pj = $87, nik_spv_terkait_pj = $88,
        pernyataan_diperiksa = $89, pengawas_pekerjaan_user = $90,
        perlu_jsa = $91, jsa_file_url = $92, license_files = $93,
        status = $94,
        current_stage = 1,
        spv_approved = false, spv_approved_by = NULL, spv_approved_at = NULL, spv_nik = NULL,
        security_approved = false, security_approved_by = NULL, security_approved_at = NULL,
        sfo_approved = false, sfo_approved_by = NULL, sfo_approved_at = NULL,
        pga_approved = false, pga_approved_by = NULL, pga_approved_at = NULL,
        catatan_reject = NULL,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = $95
       WHERE id_form = $96
       RETURNING id_form, status`,
      [
        f.namaKontraktorPekerja || null, f.namaPengawasPicSubkont || null,
        f.jumlahTenagaKerja ? parseFloat(f.jumlahTenagaKerja) : null,
        toIso(f.tglMulaiKerja), toIso(f.tglAkhirKerjaRencana),
        f.waktuKerja || f.izinKerjaDari || null,
        f.waktuSelesai || f.izinKerjaSampai || null,
        toIso(f.actualTanggalKerja),
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
        f.izinKerjaDari || f.waktuKerja || null, f.izinKerjaSampai || f.waktuSelesai || null,
        selectedSpvName, selectedSpvNik,
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

    if (f.jsaData) {
      await query(
        `UPDATE form_ijin_kerja SET jsa_data = $1 WHERE id_form = $2`,
        [JSON.stringify(f.jsaData), id]
      );
    } else if (perluJsa && jsaFileUrl) {
      // Pastikan ada object JSA dan approval default saat mode upload file
      const uploadJsa = {
        area: "",
        jenisPekerjaan: "",
        sectDept: "",
        pic: "",
        petugas: [],
        rows: [],
        fileUrl: jsaFileUrl,
        approval: {
          currentStage: 1,
          status: "submitted",
          catatanReject: null,
          firewatch: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
          spv: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
          sfo: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
        },
      };
      await query(
        `UPDATE form_ijin_kerja SET jsa_data = $1 WHERE id_form = $2`,
        [JSON.stringify(uploadJsa), id]
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