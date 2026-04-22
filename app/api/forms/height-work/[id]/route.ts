// app/api/forms/height-work/[id]/route.ts
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
      `SELECT * FROM form_kerja_ketinggian WHERE id_form = $1`,
      [id]
    );
    if (!row) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    console.error('[GET /api/forms/height-work/[id]]', err);
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
      `UPDATE form_kerja_ketinggian
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
    console.error('[PATCH /api/forms/height-work/[id]]', err);
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
      petugas_ketinggian, deskripsi_pekerjaan, lokasi,
      tanggal_pelaksanaan, waktu_mulai, waktu_selesai,
      nama_pengawas_kontraktor, nama_pengawas_departemen, nama_departemen,
      nama_petugas_1, petugas_1_sehat, nama_petugas_2, petugas_2_sehat,
      nama_petugas_3, petugas_3_sehat, nama_petugas_4, petugas_4_sehat,
      nama_petugas_5, petugas_5_sehat, nama_petugas_6, petugas_6_sehat,
      nama_petugas_7, petugas_7_sehat, nama_petugas_8, petugas_8_sehat,
      nama_petugas_9, petugas_9_sehat, nama_petugas_10, petugas_10_sehat,
      ada_kunci_pagar, ada_rompi_ketinggian, no_rompi,
      ada_safety_helmet, jumlah_safety_helmet,
      ada_full_body_harmess, jumlah_full_body_harness,
      area_diperiksa_aman, paham_cara_menggunakan_alat_pemadam_kebakaran,
      ada_kerja_listrik, prosedur_loto, menutupi_area_bawah_prisai,
      safetyline_tersedia, alat_bantu_kerja_aman, menggunakan_rompi,
      beban_tidak_5kg, helm_sesuai_sop, rambu2_tersedia,
      webbing_kondisi_baik, dring_kondisi_baik, gesper_kondisi_baik,
      absorter_dan_timbes_kondisi_baik, snap_hook_kondisi_baik, rope_lanyard_kondisi_baik,
      spv_terkait, nama_kontraktor, sfo, mr_pga_mgr,
      status,
    } = body;

    // Verify form exists and can be edited
    const existing = await queryOne(
      `SELECT id_form, status, user_id FROM form_kerja_ketinggian WHERE id_form = $1`,
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

    const newStatus = body.status === 'submitted' ? 'submitted' : 'draft';
    const now = new Date().toISOString();

    await query(
      `UPDATE form_kerja_ketinggian SET
        petugas_ketinggian = $1,
        deskripsi_pekerjaan = $2,
        lokasi = $3,
        tanggal_pelaksanaan = $4,
        waktu_mulai = $5,
        waktu_selesai = $6,
        nama_pengawas_kontraktor = $7,
        nama_pengawas_departemen = $8,  
        nama_departemen = $9,            
        nama_petugas_1 = $10, petugas_1_sehat = $11,
        nama_petugas_2 = $12, petugas_2_sehat = $13,
        nama_petugas_3 = $14, petugas_3_sehat = $15,
        nama_petugas_4 = $16, petugas_4_sehat = $17,
        nama_petugas_5 = $18, petugas_5_sehat = $19,
        nama_petugas_6 = $20, petugas_6_sehat = $21,
        nama_petugas_7 = $22, petugas_7_sehat = $23,
        nama_petugas_8 = $24, petugas_8_sehat = $25,
        nama_petugas_9 = $26, petugas_9_sehat = $27,
        nama_petugas_10 = $28, petugas_10_sehat = $29,
        ada_kunci_pagar = $30,
        ada_rompi_ketinggian = $31,
        no_rompi = $32,
        ada_safety_helmet = $33,
        jumlah_safety_helmet = $34,
        ada_full_body_harmess = $35,
        jumlah_full_body_harness = $36,
        area_diperiksa_aman = $37,
        paham_cara_menggunakan_alat_pemadam_kebakaran = $38,
        ada_kerja_listrik = $39,
        prosedur_loto = $40,
        menutupi_area_bawah_prisai = $41,
        safetyline_tersedia = $42,
        alat_bantu_kerja_aman = $43,
        menggunakan_rompi = $44,
        beban_tidak_5kg = $45,
        helm_sesuai_sop = $46,
        rambu2_tersedia = $47,
        webbing_kondisi_baik = $48,
        dring_kondisi_baik = $49,
        gesper_kondisi_baik = $50,
        absorter_dan_timbes_kondisi_baik = $51,
        snap_hook_kondisi_baik = $52,
        rope_lanyard_kondisi_baik = $53,
        spv_terkait = $54,
        nama_kontraktor = $55,
        sfo = $56,
        mr_pga_mgr = $57,
        status = $58,
        catatan_reject = NULL,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = $59
       WHERE id_form = $60
       RETURNING id_form, status`,
      [
        petugas_ketinggian,
        deskripsi_pekerjaan,
        lokasi,
        tanggal_pelaksanaan ? new Date(tanggal_pelaksanaan).toISOString() : null,
        waktu_mulai || null,
        waktu_selesai || null,
        nama_pengawas_kontraktor,
        nama_pengawas_departemen,
        nama_departemen,
        nama_petugas_1, petugas_1_sehat,
        nama_petugas_2, petugas_2_sehat,
        nama_petugas_3, petugas_3_sehat,
        nama_petugas_4, petugas_4_sehat,
        nama_petugas_5, petugas_5_sehat,
        nama_petugas_6, petugas_6_sehat,
        nama_petugas_7, petugas_7_sehat,
        nama_petugas_8, petugas_8_sehat,
        nama_petugas_9, petugas_9_sehat,
        nama_petugas_10, petugas_10_sehat,
        ada_kunci_pagar,
        ada_rompi_ketinggian,
        no_rompi ? parseFloat(no_rompi) : null,
        ada_safety_helmet,
        jumlah_safety_helmet ? parseFloat(jumlah_safety_helmet) : null,
        ada_full_body_harmess,
        jumlah_full_body_harness ? parseFloat(jumlah_full_body_harness) : null,
        area_diperiksa_aman,
        paham_cara_menggunakan_alat_pemadam_kebakaran,
        ada_kerja_listrik,
        prosedur_loto,
        menutupi_area_bawah_prisai,
        safetyline_tersedia,
        alat_bantu_kerja_aman,
        menggunakan_rompi,
        beban_tidak_5kg,
        helm_sesuai_sop,
        rambu2_tersedia,
        webbing_kondisi_baik,
        dring_kondisi_baik,
        gesper_kondisi_baik,
        absorter_dan_timbes_kondisi_baik,
        snap_hook_kondisi_baik,
        rope_lanyard_kondisi_baik,
        spv_terkait,
        nama_kontraktor,
        sfo,
        mr_pga_mgr,
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
    console.error('[PUT /api/forms/height-work/[id]]', err);
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

    // Cek form ada dan milik user
    const existing = await queryOne(
      `SELECT id_form, status, user_id FROM form_kerja_ketinggian WHERE id_form = $1`,
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 });
    }
    // Hanya bisa hapus jika status submitted atau draft
    if (!['submitted', 'draft'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Form dengan status "${existing.status}" tidak bisa dibatalkan` },
        { status: 403 }
      );
    }
    // Hanya owner yang bisa hapus
    if (existing.user_id !== user.userId) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk menghapus form ini' }, { status: 403 });
    }

    await query(`DELETE FROM form_kerja_ketinggian WHERE id_form = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Form berhasil dibatalkan dan dihapus',
      id_form: id,
    });
  } catch (err: any) {
    console.error('[DELETE /api/forms/height-work/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}