// app/api/forms/workshop/route.ts
// UPDATED: Tambah kolom perlu_jsa dan jsa_file_url untuk fitur Upload JSA.
// REFACTOR: current_stage dimulai dari 1 (bukan 0).
// ADDED: Email notification ke approver pertama saat form di-submit.
// ADDED (Ijin Kerja Eksternal): Menerima idIjinKerja dari body. Jika ada:
//   - tipePerusahaan dipaksa 'eksternal'
//   - divalidasi bahwa form_ijin_kerja tsb ada & milik user yang sama
//   - divalidasi belum ada Workshop lain yang terhubung ke id_ijin_kerja
//     yang sama (maksimal 1 form per jenis kerja per Ijin Kerja Eksternal)
//   - id_ijin_kerja disimpan ke kolom baru form_kerja_workshop.id_ijin_kerja
// UPDATED: waktu_pukul sekarang mewakili "Waktu Mulai". Ditambahkan kolom
//   baru waktu_selesai untuk "Waktu Selesai" (lihat migration di bawah).

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { notifyFirstApprover } from '@/lib/approval-email';
import { syncJobFormsStageAndStatus } from '@/lib/approval-sync';

async function generateId(): Promise<string> {
  const row = await queryOne<{ next_number: number }>(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(id_form, '\\D', '', 'g'), '')::integer), 0) + 1 AS next_number
     FROM form_kerja_workshop`
  );
  let next = Number(row?.next_number) || 1;

  while (await queryOne<{ id_form: string }>(
    `SELECT id_form FROM form_kerja_workshop WHERE id_form = $1`,
    [`WS-${String(next).padStart(4, '0')}`]
  )) {
    next += 1;
  }

  return `WS-${String(next).padStart(4, '0')}`;
}

function getUserFromReq(req: NextRequest): { userId: string | null; nama: string | null } {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return { userId: null, nama: null };
  try {
    const user = verifyToken(token);
    return {
      userId: user?.userId ? String(user.userId) : null,
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
         no_registrasi, nama_kontraktor_nik, nama_pekerja_nik, nik_pekerja,
         lokasi_pekerjaan, waktu_pukul, waktu_selesai, tipe_perusahaan, spv_terkait,
         perlu_jsa, jsa_file_url, id_ijin_kerja`;

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

    const { userId, nama: namaFromToken } = getUserFromReq(req);
    const idForm = await generateId();
    const now    = new Date().toISOString();

    // ── Relasi Ijin Kerja Eksternal (opsional) ───────────────────────────
    const idIjinKerja: string | null = f.idIjinKerja || null;
    if (f.tipePerusahaan === 'eksternal' && !idIjinKerja) {
      return NextResponse.json({ error: 'Form eksternal harus dibuat melalui Ijin Kerja Eksternal.' }, { status: 400 });
    }
    let tipePerusahaan: 'internal' | 'eksternal' =
      f.tipePerusahaan === 'eksternal' ? 'eksternal' : 'internal';

    if (idIjinKerja) {
      tipePerusahaan = 'eksternal';
      const gp = await queryOne<{ id_form: string; user_id: number }>(
        `SELECT id_form, user_id FROM form_ijin_kerja WHERE id_form = $1`,
        [idIjinKerja]
      );
      if (!gp) {
        return NextResponse.json({ error: 'Ijin Kerja Eksternal tidak ditemukan' }, { status: 404 });
      }
      if (userId && gp.user_id !== parseInt(userId)) {
        return NextResponse.json({ error: 'Ijin Kerja Eksternal ini bukan milik Anda' }, { status: 403 });
      }
      const existing = await queryOne(
        `SELECT id_form FROM form_kerja_workshop WHERE id_ijin_kerja = $1`,
        [idIjinKerja]
      );
      if (existing) {
        return NextResponse.json(
          { error: `Ijin Kerja Workshop untuk ${idIjinKerja} sudah pernah dibuat (${existing.id_form}). Maksimal 1 form per jenis kerja.` },
          { status: 409 }
        );
      }
    }

    const startStage = 1;
    const status = isSubmit ? 'submitted' : 'draft';

    const selectedSpvName = (f.spvPemberiIzin?.nama ?? null)?.toString().trim() || null;
    const selectedSpvNik = (f.spvPemberiIzin?.nik ?? null)?.toString().trim() || null;
    const selectedSpvJabatan = (f.spvPemberiIzin?.jabatan ?? null)?.toString().trim() || null;

    const pekerjaNama = f.namaPekerja || f.namaNIK || null;
    const pekerjaNik  = f.nikPekerja || (typeof f.namaNIK === 'string' && /^[0-9]+$/.test(f.namaNIK) ? f.namaNIK : null) || null;
    const namaPekerjaNik = pekerjaNama && pekerjaNik ? `${pekerjaNama} / ${pekerjaNik}` : pekerjaNama || null;

    // JSA fields
    const perluJsa   = f.perluJsa === true;
    let jsaFileUrl   = perluJsa ? (f.jsaFileUrl || null) : null;
    let jsaData      = f.jsaData && typeof f.jsaData === 'object' ? f.jsaData : null;
    let linkedJsaData = idIjinKerja && f.jsaData && typeof f.jsaData === 'object' ? f.jsaData : null;

    // Jika idIjinKerja ada, sinkronkan fileUrl dari form induk jika client belum mengirim
    if (idIjinKerja) {
      const parentForm = await queryOne<{ jsa_file_url: string | null; jsa_data: any }>(
        `SELECT jsa_file_url, jsa_data FROM form_ijin_kerja WHERE id_form = $1`,
        [idIjinKerja]
      );
      if (parentForm) {
        if (!jsaFileUrl && parentForm.jsa_file_url) {
          jsaFileUrl = parentForm.jsa_file_url;
        } else if (!jsaFileUrl && parentForm.jsa_data?.fileUrl) {
          jsaFileUrl = parentForm.jsa_data.fileUrl;
        }
      }
    }

    // Validasi JSA manual HANYA jika bukan JSA upload (tidak ada jsaFileUrl)
    if (
      idIjinKerja &&
      isSubmit &&
      perluJsa &&
      !jsaFileUrl &&
      (!linkedJsaData ||
        !String(linkedJsaData.area || '').trim() ||
        !String(linkedJsaData.jenisPekerjaan || '').trim() ||
        !String(linkedJsaData.pic || '').trim() ||
        !Array.isArray(linkedJsaData.petugas) ||
        !linkedJsaData.petugas.some((name: unknown) => typeof name === 'string' && name.trim()))
    ) {
      return NextResponse.json({ error: 'JSA terhubung harus memiliki Area, Jenis Pekerjaan, PIC, dan minimal satu Petugas.' }, { status: 400 });
    }

    await query(
      `INSERT INTO form_kerja_workshop (
        id_form, tanggal, tanggal_pelaksanaan, status,
        tipe_perusahaan, current_stage,
        no_registrasi, nama_kontraktor_nik, nama_pekerja_nik, nik_pekerja,
        lokasi_pekerjaan, waktu_pukul, waktu_selesai,
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
        user_id, id_ijin_kerja, checklist_pencegahan, jsa_data
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,$13,
        $14,$15,
        $16,$17,
        $18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
        $33,$34,
        $35,$36,
        $37,$38,$39,$40,$41,$42,$43,
        $44,$45,$46,$47,$48,$49,$50,$51,$52,$53,
        $54,$55,$56,$57,$58,$59,
        $60,
        $61,$62,$63,$64,
        $65,$66,
        $67,$68,$69,$70
      )`,
      [
        idForm, now,
        f.tanggalPelaksanaan ? new Date(f.tanggalPelaksanaan).toISOString() : null,
        status, tipePerusahaan, startStage,
        idForm, f.namaKontraktor || null, namaPekerjaNik,
        pekerjaNik,
        f.lokasi         || null, f.waktuPukul     || null, f.waktuSelesai || null,
        f.namaFireWatch  || null, f.nikFireWatch   || null,
        selectedSpvJabatan, selectedSpvNik,
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
        f.areaBerisiko?.ruangTertutup ?? false, f.areaBerisiko?.bahanMudah    ?? false,
        f.areaBerisiko?.gas           ?? false, f.areaBerisiko?.ketinggian    ?? false,
        f.areaBerisiko?.cairan        ?? false, f.areaBerisiko?.hydrocarbon   ?? false,
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
        selectedSpvName,
        null,
        null,
        null,
        perluJsa, jsaFileUrl,
        userId ?? null, idIjinKerja,
        f.checklistPencegahan ? JSON.stringify(f.checklistPencegahan) : null,
        jsaData ? JSON.stringify(jsaData) : null,
      ]
    );

    if (linkedJsaData) {
      await query(`UPDATE form_ijin_kerja SET jsa_data = $1 WHERE id_form = $2`, [JSON.stringify(linkedJsaData), idIjinKerja]);
    }

    // ── Pewarisan approval otomatis dari Ijin Kerja Eksternal induk ──
    if (idIjinKerja) {
      const parentForm = await queryOne<{
        spv_approved: boolean;
        spv_approved_by: string | null;
        spv_approved_at: string | null;
        spv_nik: string | null;
        spv_terkait_pj: string | null;
        nik_spv_terkait_pj: string | null;
        sfo_approved: boolean;
        sfo_approved_by: string | null;
        sfo_approved_at: string | null;
        sfo_nik: string | null;
        pga_approved: boolean;
        pga_approved_by: string | null;
        pga_approved_at: string | null;
        pga_nik: string | null;
      }>(
        `SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik
           FROM form_ijin_kerja
          WHERE id_form = $1`,
        [idIjinKerja]
      );

      if (parentForm) {
        if (parentForm.spv_approved) {
          const spvName = parentForm.spv_approved_by || parentForm.spv_terkait_pj || selectedSpvName;
          const spvNik = parentForm.spv_nik || parentForm.nik_spv_terkait_pj || selectedSpvNik;
          const spvAt = parentForm.spv_approved_at || now;
          await query(
            `UPDATE form_kerja_workshop
                SET spv_approved = TRUE,
                    spv_approved_by = $1,
                    spv_approved_at = $2,
                    spv_nik = $3,
                    nik_pemberi_ijin = COALESCE(nik_pemberi_ijin, $3)
              WHERE id_form = $4`,
            [spvName, spvAt, spvNik, idForm]
          );
        }

        if (parentForm.sfo_approved) {
          await query(
            `UPDATE form_kerja_workshop
                SET sfo_approved = TRUE,
                    sfo_approved_by = $1,
                    sfo_approved_at = $2,
                    sfo_nik = $3
              WHERE id_form = $4`,
            [parentForm.sfo_approved_by, parentForm.sfo_approved_at || now, parentForm.sfo_nik, idForm]
          );
        }

        if (parentForm.pga_approved) {
          await query(
            `UPDATE form_kerja_workshop
                SET mr_pga_approved = TRUE,
                    pga_approved = TRUE,
                    mr_pga_approved_by = $1,
                    pga_approved_by = $1,
                    mr_pga_approved_at = $2,
                    pga_approved_at = $2,
                    mr_pga_nik = $3
              WHERE id_form = $4`,
            [parentForm.pga_approved_by, parentForm.pga_approved_at || now, parentForm.pga_nik, idForm]
          );
        }

        await syncJobFormsStageAndStatus(idIjinKerja, now);
      }
    }

    // ── Email: kirim ke approver pertama jika status submitted (fire-and-forget) ──
    if (status === 'submitted' && userId && !idIjinKerja) {
      notifyFirstApprover({
        formType:       'workshop',
        idForm,
        tipePerusahaan,
        userId:         parseInt(userId),
        namaPemohon:    namaFromToken ?? f.namaKontraktor ?? '-',
        tanggal:        now,
      }).catch((err) => {
        console.error(`[EMAIL] Background first-approver email error for ${idForm}:`, err);
      });
    }

    return NextResponse.json({ success: true, id_form: idForm, status }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/forms/workshop]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}