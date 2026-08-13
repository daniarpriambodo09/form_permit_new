// app/api/approval/export/workshop/route.ts
// NEW: Export rekap form Workshop ke Excel (.xlsx).
// Hanya role 'admin' yang bisa akses. Data mengikuti status tab yang aktif
// di halaman /approval (submitted | approved | rejected).
//
// Kolom (sesuai template Kolom_Workshop_Excell.xlsx):
//   No. Registrasi     -> id_form
//   Nama Petugas/Supplier -> nama_pekerja_nik (nama saja, tanpa " / NIK")
//   NIK                -> nik_pekerja
//   Departmen          -> users.departmen (pembuat form)
//   Tanggal            -> tanggal
//   Jam Kerja Mulai/Selesai -> waktu paling awal & paling akhir dari
//                              detail pekerjaan (cutting/grinding/welding/painting)
//                              yang dipilih di form
//   Item Pekerjaan     -> daftar jenis pekerjaan yang dipilih
//   Nama Pengawas      -> nama_fire_watch (fire watch yang DIPILIH pengaju
//                         permit langsung di form /form/workshop, bukan
//                         hasil lookup ulang dari FIREWATCH_MAP)
//   TTD SFO            -> QR code verifikasi (sama seperti generatePermitPdf.ts)
//                         jika sfo_approved = true, selain itu "-"

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

interface WorkshopRow {
  id_form: string;
  tanggal: string;
  status: string;
  nama_pekerja_nik: string | null;
  nik_pekerja: string | null;
  detail_cutting: string | null;
  t_mulai_cutting: string | null;
  t_selesai_cutting: string | null;
  detail_grinding: string | null;
  t_mulai_grinding: string | null;
  t_selesai_grinding: string | null;
  detail_welding: string | null;
  t_mulai_welding: string | null;
  t_selesai_welding: string | null;
  detail_painting: string | null;
  t_mulai_painting: string | null;
  t_selesai_painting: string | null;
  ada_kerja_lainnya: boolean | null;
  jenis_kerjaan_lainnya: string | null;
  nama_fire_watch: string | null;
  sfo_approved: boolean | null;
  creator_departmen: string | null;
}

// ── Helper: ambil nama saja dari "Nama / NIK" ────────────────
function extractNamaSaja(namaPekerjaNik: string | null): string {
  if (!namaPekerjaNik) return '-';
  const parts = namaPekerjaNik.split(' / ');
  return (parts[0] || namaPekerjaNik).trim();
}

// ── Helper: kumpulkan jam kerja (mulai paling awal, selesai paling akhir)
//    dan daftar item pekerjaan dari detail_cutting/grinding/welding/painting ──
function collectJamKerjaDanItem(row: WorkshopRow): {
  mulai: string | null;
  selesai: string | null;
  items: string[];
} {
  const jobs: { label: string; detail: string | null; mulai: string | null; selesai: string | null }[] = [
    { label: 'Cutting',  detail: row.detail_cutting,  mulai: row.t_mulai_cutting,  selesai: row.t_selesai_cutting },
    { label: 'Grinding', detail: row.detail_grinding, mulai: row.t_mulai_grinding, selesai: row.t_selesai_grinding },
    { label: 'Welding',  detail: row.detail_welding,  mulai: row.t_mulai_welding,  selesai: row.t_selesai_welding },
    { label: 'Painting', detail: row.detail_painting, mulai: row.t_mulai_painting, selesai: row.t_selesai_painting },
  ];

  const active = jobs.filter(j => j.detail && String(j.detail).trim() !== '');
  const items  = active.map(j => j.label);

  if (row.ada_kerja_lainnya && row.jenis_kerjaan_lainnya && row.jenis_kerjaan_lainnya.trim() !== '') {
    items.push(row.jenis_kerjaan_lainnya.trim());
  }

  // Format waktu dari pg adalah "HH:MM:SS" -> aman diurutkan secara string.
  const startTimes = active.map(j => j.mulai).filter((t): t is string => !!t).sort();
  const endTimes    = active.map(j => j.selesai).filter((t): t is string => !!t).sort();

  return {
    mulai:   startTimes.length ? startTimes[0] : null,
    selesai: endTimes.length ? endTimes[endTimes.length - 1] : null,
    items,
  };
}

const fmtJam = (t: string | null) => (t ? t.slice(0, 5) : '-');

const fmtTanggal = (d: string | null) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

// ── Helper: generate QR code (pola sama persis dengan generatePermitPdf.ts) ──
async function makeQR(text: string, px = 200): Promise<string> {
  const QR = (await import('qrcode')).default;
  return QR.toDataURL(text, { width: px, margin: 1, color: { dark: '#0a1428', light: '#ffffff' } });
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya Admin yang dapat mengunduh rekap Excel.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'submitted';
  const validStatus = ['submitted', 'approved', 'rejected'];
  if (!validStatus.includes(status)) {
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
  }

  try {
    const rows = await query<WorkshopRow>(
      `SELECT
         f.id_form, f.tanggal, f.status,
         f.nama_pekerja_nik, f.nik_pekerja,
         f.detail_cutting,  f.t_mulai_cutting,  f.t_selesai_cutting,
         f.detail_grinding, f.t_mulai_grinding, f.t_selesai_grinding,
         f.detail_welding,  f.t_mulai_welding,  f.t_selesai_welding,
         f.detail_painting, f.t_mulai_painting, f.t_selesai_painting,
         f.ada_kerja_lainnya, f.jenis_kerjaan_lainnya,
         f.nama_fire_watch,
         f.sfo_approved,
         u.departmen AS creator_departmen
       FROM form_kerja_workshop f
       LEFT JOIN users u ON u.id = f.user_id
       WHERE f.status = $1
       ORDER BY f.tanggal ASC`,
      [status]
    );

    // ── Build workbook ──────────────────────────────────────
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JAI Form Permit';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Rekap Workshop', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    sheet.columns = [
      { key: 'no_registrasi', width: 16 },
      { key: 'nama_petugas',  width: 24 },
      { key: 'nik',           width: 14 },
      { key: 'departmen',     width: 16 },
      { key: 'tanggal',       width: 16 },
      { key: 'jam_mulai',     width: 9 },
      { key: 'jam_selesai',   width: 9 },
      { key: 'item_pekerjaan', width: 26 },
      { key: 'nama_pengawas', width: 24 },
      { key: 'ttd_sfo',       width: 16 },
    ];

    // ── Header (2 baris, mengikuti template) ─────────────────
    sheet.mergeCells('A1:A2');
    sheet.mergeCells('C1:C2');
    sheet.mergeCells('D1:D2');
    sheet.mergeCells('E1:E2');
    sheet.mergeCells('F1:G1');
    sheet.mergeCells('H1:H2');
    sheet.mergeCells('I1:I2');
    sheet.mergeCells('J1:J2');

    sheet.getCell('A1').value = 'No. Registrasi';
    sheet.getCell('B1').value = 'Nama Petugas';
    sheet.getCell('B2').value = 'Nama Supplier';
    sheet.getCell('C1').value = 'NIK';
    sheet.getCell('D1').value = 'Departmen';
    sheet.getCell('E1').value = 'Tanggal';
    sheet.getCell('F1').value = 'Jam Kerja';
    sheet.getCell('F2').value = 'Mulai';
    sheet.getCell('G2').value = 'Selesai';
    sheet.getCell('H1').value = 'Item Pekerjaan';
    sheet.getCell('I1').value = 'Nama Pengawas';
    sheet.getCell('J1').value = 'TTD SFO';

    const headerRow1 = sheet.getRow(1);
    const headerRow2 = sheet.getRow(2);
    [headerRow1, headerRow2].forEach(r => {
      r.eachCell({ includeEmpty: true }, cell => {
        cell.font = { bold: true, size: 12 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
      });
    });
    headerRow1.height = 20;
    headerRow2.height = 18;

    // ── Data rows ─────────────────────────────────────────────
    const ROW_HEIGHT = 46; // cukup untuk QR code
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

    let rowIndex = 3; // data mulai baris ke-3
    for (const r of rows) {
      const { mulai, selesai, items } = collectJamKerjaDanItem(r);
      const departmen = r.creator_departmen || '-';
      const namaPengawas = r.nama_fire_watch && r.nama_fire_watch.trim() !== '' ? r.nama_fire_watch : '-';

      const row = sheet.getRow(rowIndex);
      row.height = ROW_HEIGHT;
      row.getCell(1).value = r.id_form;
      row.getCell(2).value = extractNamaSaja(r.nama_pekerja_nik);
      row.getCell(3).value = r.nik_pekerja || '-';
      row.getCell(4).value = departmen;
      row.getCell(5).value = fmtTanggal(r.tanggal);
      row.getCell(6).value = fmtJam(mulai);
      row.getCell(7).value = fmtJam(selesai);
      row.getCell(8).value = items.length ? items.join(', ') : '-';
      row.getCell(9).value = namaPengawas;

      // ── TTD SFO: QR code jika sudah di-approve SFO ──────────
      if (r.sfo_approved) {
        try {
          const url   = `${origin}/form-permit/approval-verification/workshop/${r.id_form}/sfo`;
          const qrImg = await makeQR(url, 150);
          const imageId = workbook.addImage({
            base64: qrImg,
            extension: 'png',
          });
          sheet.addImage(imageId, {
            tl: { col: 9.15, row: rowIndex - 1 + 0.1 },
            ext: { width: 42, height: 42 },
          });
        } catch (err) {
          console.error(`[export-workshop] Gagal generate QR untuk ${r.id_form}:`, err);
          row.getCell(10).value = '-';
        }
      } else {
        row.getCell(10).value = '-';
      }

      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.font = { size: 10 };

      rowIndex++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Rekap_Workshop_${status}_${dateStr}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/approval/export/workshop]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}