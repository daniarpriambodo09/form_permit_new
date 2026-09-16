// app/api/forms/workshop/[id]/route.ts
// UPDATED: waktu_pukul sekarang "Waktu Mulai", ditambah kolom waktu_selesai.
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
      `SELECT * FROM form_kerja_workshop WHERE id_form = $1`,
      [id]
    );
    if (!row) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    console.error('[GET /api/forms/workshop/[id]]', err);
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
      `UPDATE form_kerja_workshop
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
    console.error('[PATCH /api/forms/workshop/[id]]', err);
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
      namaPekerja, nikPekerja,
      lokasi_pekerjaan, tanggal_pelaksanaan, waktu_pukul, waktu_selesai,
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
      checklist_pencegahan,
      spv_terkait, kontraktor, sfo, pga,
      status,
    } = body;

    // Verify form exists and can be edited
    const existing = await queryOne(
      `SELECT id_form, status, user_id FROM form_kerja_workshop WHERE id_form = $1`,
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

    const pekerjaNama = namaPekerja || nama_pekerja_nik || null;
    const pekerjaNik  = nikPekerja || null;
    const namaPekerjaNik = pekerjaNama && pekerjaNik ? `${pekerjaNama} / ${pekerjaNik}` : pekerjaNama || nama_pekerja_nik || null;
    const newStatus = status === 'submitted' ? 'submitted' : 'draft';
    const now = new Date().toISOString();

    await query(
      `UPDATE form_kerja_workshop SET
        no_registrasi = COALESCE(NULLIF($1, ''), id_form),
        nama_kontraktor_nik = $2,
        nama_pekerja_nik = $3,
        nik_pekerja = $4,
        lokasi_pekerjaan = $5,
        tanggal_pelaksanaan = $6,
        waktu_pukul = $7,
        waktu_selesai = $8,
        nama_fire_watch = $9,
        nik_fire_watch = $10,
        jabatan_pemberi_izin = $11,
        nik_pemberi_ijin = $12,
        preventive_genset_pump_room = $13,
        tangki_solar = $14,
        panel_listrik = $15,
        detail_cutting = $16,
        t_mulai_cutting = $17,
        t_selesai_cutting = $18,
        detail_grinding = $19,
        t_mulai_grinding = $20,
        t_selesai_grinding = $21,
        detail_welding = $22,
        t_mulai_welding = $23,
        t_selesai_welding = $24,
        detail_painting = $25,
        t_mulai_painting = $26,
        t_selesai_painting = $27,
        painting_spray = $28,
        painting_non_spray = $29,
        ada_kerja_lainnya = $30,
        jenis_kerjaan_lainnya = $31,
        ruang_tertutup = $32,
        bahan_mudah_terbakar = $33,
        gas_bejana_tangki = $34,
        height_work = $35,
        cairan_gas_bertekan = $36,
        cairan_hydrocarbon = $37,
        bahaya_lain = $38,
        kondisi_tools_baik = $39,
        tersedia_apar_hydrant = $40,
        sensor_smoke_detector_non_aktif = $41,
        apd_lengkap = $42,
        tidak_ada_cairan_mudah_terbakar = $43,
        lantai_bersih = $44,
        lantai_sudah_dibasahi = $45,
        cairan_mudah_tebakar_tertutup = $46,
        lembaran_dibawah_pekerjaan = $47,
        lindungi_conveyor_dll = $48,
        alat_telah_bersih = $49,
        uap_menyala_telah_dibuang = $50,
        kerja_pada_dinding_lagit = $51,
        bahan_mudah_terbakar_dipindahkan_dari_dinding = $52,
        fire_watch_memastikan_area_aman = $53,
        firwatch_terlatih = $54,
        permintaan_tambahan = $55,
        spv_terkait = $56,
        kontraktor = $57,
        sfo = $58,
        pga = $59,
        status = $60,
        checklist_pencegahan = COALESCE($61, checklist_pencegahan),
        catatan_reject = NULL,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = $62
       WHERE id_form = $63
       RETURNING id_form, status`,
      [
        no_registrasi,
        nama_kontraktor_nik,
        namaPekerjaNik,
        pekerjaNik,
        lokasi_pekerjaan,
        tanggal_pelaksanaan ? new Date(tanggal_pelaksanaan).toISOString() : null,
        waktu_pukul || null,
        waktu_selesai || null,
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
        painting_spray,
        painting_non_spray,
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
        permintaan_tambahan,
        spv_terkait,
        kontraktor,
        sfo,
        pga,
        newStatus,
        checklist_pencegahan ? JSON.stringify(checklist_pencegahan) : null,
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
    console.error('[PUT /api/forms/workshop/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
      `SELECT id_form, status, user_id FROM form_kerja_workshop WHERE id_form = $1`,
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

    await query(`DELETE FROM form_kerja_workshop WHERE id_form = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Form berhasil dibatalkan dan dihapus',
      id_form: id,
    });
  } catch (err: any) {
    console.error('[DELETE /api/forms/workshop/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}