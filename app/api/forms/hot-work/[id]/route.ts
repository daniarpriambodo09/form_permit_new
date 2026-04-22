// app/api/forms/hot-work/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

// ── Helper: Get user from JWT cookie ──────────────────────────
function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── GET: Detail satu form ──────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await queryOne(
      `SELECT * FROM form_kerja_panas WHERE id_form = $1`,
      [id]
    );
    if (!row) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    console.error('[GET /api/forms/hot-work/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update status only ──────────────────────────────
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
      `UPDATE form_kerja_panas
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
    console.error('[PATCH /api/forms/hot-work/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT: Update full form data (for edit & resubmit) ───────
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

    const body = await req.json();
    const {
      no_registrasi, nama_kontraktor_nik, nama_pekerja_nik,
      lokasi_pekerjaan, tanggal_pelaksanaan, waktu_pukul,
      nama_fire_watch, nik_fire_watch,
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
      status,
    } = body;

    // Verify form exists and can be edited
    const existing = await queryOne(
      `SELECT id_form, status, user_id FROM form_kerja_panas WHERE id_form = $1`,
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
    // Only owner can edit
    if (existing.user_id !== user.userId) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk mengedit form ini' }, { status: 403 });
    }

    const newStatus = status === 'submitted' ? 'submitted' : 'draft';
    const now = new Date().toISOString();

    await query(
      `UPDATE form_kerja_panas SET
        no_registrasi = $1,
        nama_kontraktor_nik = $2,
        nama_pekerja_nik = $3,
        lokasi_pekerjaan = $4,
        tanggal_pelaksanaan = $5,
        waktu_pukul = $6,
        nama_fire_watch = $7,
        nik_fire_watch = $8,
        jabatan_pemberi_izin = $9,
        nik_pemberi_ijin = $10,
        preventive_genset_pump_room = $11,
        tangki_solar = $12,
        panel_listrik = $13,
        detail_cutting = $14,
        t_mulai_cutting = $15,
        t_selesai_cutting = $16,
        detail_grinding = $17,
        t_mulai_grinding = $18,
        t_selesai_grinding = $19,
        detail_welding = $20,
        t_mulai_welding = $21,
        t_selesai_welding = $22,
        detail_painting = $23,
        t_mulai_painting = $24,
        t_selesai_painting = $25,
        ada_kerja_lainnya = $26,
        jenis_kerjaan_lainnya = $27,
        ruang_tertutup = $28,
        bahan_mudah_terbakar = $29,
        gas_bejana_tangki = $30,
        height_work = $31,
        cairan_gas_bertekan = $32,
        cairan_hydrocarbon = $33,
        bahaya_lain = $34,
        kondisi_tools_baik = $35,
        tersedia_apar_hydrant = $36,
        sensor_smoke_detector_non_aktif = $37,
        apd_lengkap = $38,
        tidak_ada_cairan_mudah_terbakar = $39,
        lantai_bersih = $40,
        lantai_sudah_dibasahi = $41,
        cairan_mudah_tebakar_tertutup = $42,
        lembaran_dibawah_pekerjaan = $43,
        lindungi_conveyor_dll = $44,
        alat_telah_bersih = $45,
        uap_menyala_telah_dibuang = $46,
        kerja_pada_dinding_lagit = $47,
        bahan_mudah_terbakar_dipindahkan_dari_dinding = $48,
        fire_watch_memastikan_area_aman = $49,
        firwatch_terlatih = $50,
        kondisi_fire_blanket = $51,
        jumlah_fire_blanket = $52,
        permintaan_tambahan = $53,
        spv_terkait = $54,
        kontraktor = $55,
        sfo = $56,
        pga = $57,
        status = $58,
        catatan_reject = NULL,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = $59
       WHERE id_form = $60
       RETURNING id_form, status`,
      [
        no_registrasi,
        nama_kontraktor_nik,
        nama_pekerja_nik,
        lokasi_pekerjaan,
        tanggal_pelaksanaan ? new Date(tanggal_pelaksanaan).toISOString() : null,
        waktu_pukul || null,
        nama_fire_watch,
        nik_fire_watch,
        jabatan_pemberi_izin,
        nik_pemberi_ijin,
        preventive_genset_pump_room,
        tangki_solar,
        panel_listrik,
        detail_cutting,
        t_mulai_cutting || null,
        t_selesai_cutting || null,
        detail_grinding,
        t_mulai_grinding || null,
        t_selesai_grinding || null,
        detail_welding,
        t_mulai_welding || null,
        t_selesai_welding || null,
        detail_painting,
        t_mulai_painting || null,
        t_selesai_painting || null,
        ada_kerja_lainnya,
        jenis_kerjaan_lainnya,
        ruang_tertutup,
        bahan_mudah_terbakar,
        gas_bejana_tangki,
        height_work,
        cairan_gas_bertekan,
        cairan_hydrocarbon,
        bahaya_lain,
        kondisi_tools_baik,
        tersedia_apar_hydrant,
        sensor_smoke_detector_non_aktif,
        apd_lengkap,
        tidak_ada_cairan_mudah_terbakar,
        lantai_bersih,
        lantai_sudah_dibasahi,
        cairan_mudah_tebakar_tertutup,
        lembaran_dibawah_pekerjaan,
        lindungi_conveyor_dll,
        alat_telah_bersih,
        uap_menyala_telah_dibuang,
        kerja_pada_dinding_lagit,
        bahan_mudah_terbakar_dipindahkan_dari_dinding,
        fire_watch_memastikan_area_aman,
        firwatch_terlatih,
        kondisi_fire_blanket,
        jumlah_fire_blanket ? parseInt(jumlah_fire_blanket) : null,
        permintaan_tambahan,
        spv_terkait,
        kontraktor,
        sfo,
        pga,
        newStatus,
        now,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      id_form: id,
      status: newStatus,
      message: 'Form berhasil diperbaiki dan dikirim ulang',
    });
  } catch (err: any) {
    console.error('[PUT /api/forms/hot-work/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: Hapus form (hanya jika status submitted/draft & milik user) ───────
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
      `SELECT id_form, status, user_id FROM form_kerja_panas WHERE id_form = $1`,
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

    await query(`DELETE FROM form_kerja_panas WHERE id_form = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Form berhasil dibatalkan dan dihapus',
      id_form: id,
    });
  } catch (err: any) {
    console.error('[DELETE /api/forms/hot-work/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}