// lib/export-penilaian.ts
// Utility untuk ekspor Lampiran Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1)
// ke format Excel (.xlsx) dan PDF (.pdf) dengan font Arial Narrow dan Kode QR verifikasi.

import {
  type PenilaianSubkontraktorData,
  ITEM_LABELS,
} from "@/components/PenilaianSubkontraktorSection";

export interface FormExportMeta {
  id_form: string;
  nama_kontraktor_pekerja: string;
  pimpinan_kontraktor?: string;
  lokasi_pekerjaan: string;
  izin_kerja_tanggal_dari?: string | null;
  izin_kerja_tanggal_sampai?: string | null;
  tanggal?: string | null;
}

const RATING_LABEL_MAP: Record<string, string> = {
  baik_sekali: "Baik Sekali",
  baik: "Baik",
  sedang: "Sedang",
  kurang: "Kurang",
};

/**
 * Format tanggal dari berbagai format (ISO, YYYY-MM-DD, dsb.) ke format DD-MM-YYYY (HH-MM-YYYY).
 * Menghapus segala keterangan jam/timezone seperti T00:00:00.000Z.
 */
export function formatTanggalDDMMYYYY(raw?: string | null): string {
  if (!raw) return "-";
  const str = String(raw).trim();
  if (!str) return "-";
  // Tangani format YYYY-MM-DD atau ISO 8601
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, y, m, d] = match;
    return `${d}-${m}-${y}`;
  }
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = dateObj.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return str;
}

/**
 * Format periode tanggal: HH-MM-YYYY s/d HH-MM-YYYY (tanpa sisa timestamp ISO).
 */
export function formatPeriodeDDMMYYYY(start?: string | null, end?: string | null): string {
  const s = formatTanggalDDMMYYYY(start);
  const e = formatTanggalDDMMYYYY(end);
  if (s === "-" && e === "-") return "-";
  if (s !== "-" && e !== "-") return `${s} s/d ${e}`;
  return s !== "-" ? s : e;
}

/**
 * Helper untuk membuat gambar Data URL QR Code
 */
async function makeQR(text: string, px = 200): Promise<string> {
  const QR = (await import("qrcode")).default;
  return QR.toDataURL(text, {
    width: px,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/**
 * Buat URL verifikasi digital resmi untuk approval penilaian
 */
function getVerifyUrl(idForm: string, roleKey: string): string {
  const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "http://localhost:3100";
  return `${origin}/approval-verification/general-permit/${encodeURIComponent(idForm)}?doc=penilaian-subkontraktor&approver=${encodeURIComponent(roleKey)}`;
}

/**
 * Helper untuk memuat font Arial Narrow ke jsPDF di browser
 */
async function loadArialNarrow(doc: any): Promise<string> {
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch("/fonts/ARIALN.TTF"),
      fetch("/fonts/ARIALNB.TTF"),
    ]);
    if (regRes.ok && boldRes.ok) {
      const [regBuf, boldBuf] = await Promise.all([
        regRes.arrayBuffer(),
        boldRes.arrayBuffer(),
      ]);
      const toB64 = (buf: ArrayBuffer) => {
        let binary = "";
        const bytes = new Uint8Array(buf);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i += 8192) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
        }
        return btoa(binary);
      };
      doc.addFileToVFS("ArialNarrow.ttf", toB64(regBuf));
      doc.addFont("ArialNarrow.ttf", "ArialNarrow", "normal");
      doc.addFileToVFS("ArialNarrow-Bold.ttf", toB64(boldBuf));
      doc.addFont("ArialNarrow-Bold.ttf", "ArialNarrow", "bold");
      return "ArialNarrow";
    }
  } catch (err) {
    console.warn("Could not load Arial Narrow font, falling back to helvetica:", err);
  }
  return "helvetica";
}

let _logoCache: string | null = null;

/**
 * Helper untuk memuat logo safety_first.png sebagai base64
 */
async function loadLogoBase64(): Promise<string | null> {
  if (_logoCache !== null) return _logoCache;
  try {
    const resp = await fetch("/images/safety_first.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
    _logoCache = b64;
    return b64;
  } catch (e) {
    console.warn("Logo safety_first gagal dimuat:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 1. EKSPOR KE EXCEL (.xlsx)
// ═══════════════════════════════════════════════════════════════════
export async function exportPenilaianToExcel(
  meta: FormExportMeta,
  data: PenilaianSubkontraktorData
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PT. JAI Form Permit System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Penilaian Subkontraktor", {
    views: [{ showGridLines: true }],
  });

  const FONT_FAMILY = "Arial Narrow";

  // ── 1. Judul & Header Dokumen ──
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "FORM PENILAIAN SUB KONTRAKTOR - JAI/F-08/P.SHE-19 Rev. 1";
  titleCell.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:G2");
  const subTitleCell = sheet.getCell("A2");
  subTitleCell.value = "Lampiran Evaluasi & Pengawasan Ijin Kerja Eksternal — PT. Jatim Autocomp Indonesia";
  subTitleCell.font = { name: FONT_FAMILY, size: 9.5, italic: true, color: { argb: "FF64748B" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 18;

  // ── 2. Informasi Form (Metadata) ──
  const periodeStr = formatPeriodeDDMMYYYY(
    meta.izin_kerja_tanggal_dari,
    meta.izin_kerja_tanggal_sampai
  );

  const infoRows = [
    ["No. Ijin Kerja Eksternal", `: ${meta.id_form}`],
    ["Nama Sub Kontraktor", `: ${meta.nama_kontraktor_pekerja || "-"}`],
    ["Lokasi Pekerjaan", `: ${meta.lokasi_pekerjaan || "-"}`],
    ["Periode Pekerjaan", `: ${periodeStr}`],
  ];

  let curRow = 4;
  for (const [k, v] of infoRows) {
    sheet.getCell(`A${curRow}`).value = k;
    sheet.getCell(`A${curRow}`).font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FF1E293B" } };
    sheet.getCell(`B${curRow}`).value = v;
    sheet.getCell(`B${curRow}`).font = { name: FONT_FAMILY, size: 10, color: { argb: "FF0F172A" } };
    sheet.getRow(curRow).height = 19;
    curRow++;
  }

  curRow += 1;

  // ── 3. Tabel Checklist Penilaian ──
  const entries = data.entries || [];
  const headerCols = ["No", "Item Pengecekan", "Keterangan / Standar"];
  entries.forEach((_, idx) => {
    headerCols.push(`H-${idx + 1}`);
  });

  const tableHeaderRow = sheet.getRow(curRow);
  tableHeaderRow.values = headerCols;
  tableHeaderRow.height = 28;

  for (let c = 1; c <= headerCols.length; c++) {
    const cell = tableHeaderRow.getCell(c);
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // dark navy
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "thin", color: { argb: "FF94A3B8" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
    };
  }

  curRow++;

  // Isi baris item penilaian
  ITEM_LABELS.forEach((item, itemIdx) => {
    const rowValues: any[] = [itemIdx + 1, item.label, item.desc];
    entries.forEach((entry) => {
      const val = entry.items?.[item.key] || "";
      rowValues.push(RATING_LABEL_MAP[val] || "-");
    });

    const row = sheet.getRow(curRow);
    row.values = rowValues;
    row.height = 22;

    const isEven = itemIdx % 2 === 1;

    for (let c = 1; c <= headerCols.length; c++) {
      const cell = row.getCell(c);
      cell.font = { name: FONT_FAMILY, size: 9.5 };
      if (isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (c === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (c >= 4) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        const textVal = String(cell.value || "");
        if (textVal === "Baik Sekali") {
          cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: "FF047857" } };
        } else if (textVal === "Baik") {
          cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: "FF059669" } };
        } else if (textVal === "Sedang") {
          cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: "FFD97706" } };
        } else if (textVal === "Kurang") {
          cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: "FFDC2626" } };
        }
      } else {
        cell.alignment = { vertical: "middle" };
      }
    }
    curRow++;
  });

  // Baris Catatan / Temuan
  const catatanValues: any[] = ["-", "Catatan / Temuan", "Keterangan evaluasi lapangan"];
  entries.forEach((entry) => {
    catatanValues.push(entry.catatan || "-");
  });
  const catatanRow = sheet.getRow(curRow);
  catatanRow.values = catatanValues;
  catatanRow.height = 30;
  for (let c = 1; c <= headerCols.length; c++) {
    const cell = catatanRow.getCell(c);
    cell.font = { name: FONT_FAMILY, size: 9, italic: true, color: { argb: "FF475569" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  }
  curRow += 2;

  // ── 4. Bagian Status Persetujuan (Mengetahui) dengan Kode QR ──
  sheet.getCell(`A${curRow}`).value = "STATUS PERSETUJUAN (MENGETAHUI)";
  sheet.getCell(`A${curRow}`).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF0F172A" } };
  curRow++;

  const mgt = data.mengetahui || {};
  const pengawasRow = mgt.pengawasDept || mgt.picDept || { nama: "", nik: "", tanggal: "" };
  const purchasingRow = mgt.purchasing || { nama: "", nik: "", tanggal: "" };
  const sfoRow = mgt.sfo || { nama: "", nik: "", tanggal: "" };

  const approvalHeader = [
    "Jabatan / Otoritas",
    "Status",
    "Nama Petugas",
    "NIK",
    "Tanggal Persetujuan",
    "Kode QR Verifikasi",
  ];
  const mgtHeaderRow = sheet.getRow(curRow);
  mgtHeaderRow.values = approvalHeader;
  mgtHeaderRow.height = 24;

  for (let c = 1; c <= approvalHeader.length; c++) {
    const cell = mgtHeaderRow.getCell(c);
    cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  }
  curRow++;

  const approverList = [
    {
      roleTitle: "Pengawas Dept",
      roleKey: "pengawasDept",
      row: pengawasRow,
    },
    {
      roleTitle: "Purchasing",
      roleKey: "purchasing",
      row: purchasingRow,
    },
    {
      roleTitle: "SFO",
      roleKey: "sfo",
      row: sfoRow,
    },
  ];

  for (const approver of approverList) {
    const hasApproved = Boolean(approver.row.nama && approver.row.nama.trim() !== "");
    const formattedTgl = hasApproved ? formatTanggalDDMMYYYY(approver.row.tanggal) : "-";

    const rData = [
      approver.roleTitle,
      hasApproved ? "DISETUJUI" : "MENUNGGU",
      approver.row.nama || "-",
      approver.row.nik || "-",
      formattedTgl,
      hasApproved ? "" : "Belum Tersedia",
    ];

    const row = sheet.getRow(curRow);
    row.values = rData;
    row.height = hasApproved ? 58 : 26;

    for (let c = 1; c <= approvalHeader.length; c++) {
      const cell = row.getCell(c);
      cell.font = { name: FONT_FAMILY, size: 9.5 };
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (c === 2) {
        cell.font = {
          name: FONT_FAMILY,
          size: 9.5,
          bold: true,
          color: { argb: hasApproved ? "FF059669" : "FFD97706" },
        };
      }
      if (c === 6 && !hasApproved) {
        cell.font = { name: FONT_FAMILY, size: 8.5, italic: true, color: { argb: "FF94A3B8" } };
      }
    }

    // Sisipkan QR Code ke kolom 6 (F) jika sudah disetujui
    if (hasApproved) {
      try {
        const verifyUrl = getVerifyUrl(meta.id_form, approver.roleKey);
        const qrBase64 = await makeQR(verifyUrl, 160);
        const imageId = workbook.addImage({
          base64: qrBase64,
          extension: "png",
        });

        // Letakkan di kolom F (col index 5 dalam 0-based), di baris saat ini (curRow - 1 dalam 0-based)
        sheet.addImage(imageId, {
          tl: { col: 5.25, row: curRow - 1 + 0.1 },
          ext: { width: 68, height: 68 },
        });
      } catch (qrErr) {
        console.error("Gagal menyisipkan QR Excel:", qrErr);
      }
    }

    curRow++;
  }

  // ── Atur Lebar Kolom yang Pas & Rapi ──
  sheet.getColumn(1).width = 22; // No / Info label / Jabatan
  sheet.getColumn(2).width = 32; // Item Pengecekan / Status
  sheet.getColumn(3).width = 38; // Keterangan / Nama Petugas
  sheet.getColumn(4).width = 18; // H-1 / NIK
  sheet.getColumn(5).width = 20; // H-2 / Tanggal
  sheet.getColumn(6).width = 18; // H-3 / QR Code

  for (let i = 7; i <= headerCols.length; i++) {
    sheet.getColumn(i).width = 14;
  }

  // Trigger download di browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Penilaian_Subkontraktor_${meta.id_form}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
// 2. EKSPOR KE PDF (.pdf)
// ═══════════════════════════════════════════════════════════════════
export async function exportPenilaianToPdf(
  meta: FormExportMeta,
  data: PenilaianSubkontraktorData
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const fontName = await loadArialNarrow(doc);
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const startX = 14;
  const boxWidth = pageWidth - 28; // 182mm

  // ── 1. Header Resmi Perusahaan & Kontrol Dokumen ──
  const logoB64 = await loadLogoBase64();
  if (logoB64) {
    try {
      doc.addImage(`data:image/png;base64,${logoB64}`, "PNG", startX, 11, 18, 18, undefined, "FAST");
    } catch (e) {
      console.warn("Gagal menyisipkan logo PDF:", e);
    }
  }

  const titleX = logoB64 ? startX + 22 : startX;

  doc.setFont(fontName, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("PT. JATIM AUTOCOMP INDONESIA", titleX, 15.5);

  doc.setFontSize(13.5);
  doc.setTextColor(15, 40, 80); // navy
  doc.text("FORM PENILAIAN SUB KONTRAKTOR", titleX, 21.5);

  doc.setFont(fontName, "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Lampiran Evaluasi & Pengawasan Ijin Kerja Eksternal", titleX, 26.5);

  // Box Kontrol Dokumen di Kanan Atas
  const docBoxW = 48;
  const docBoxH = 17;
  const docBoxX = startX + boxWidth - docBoxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(docBoxX, 11, docBoxW, docBoxH, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont(fontName, "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("No. Dok : JAI/F-08/P.SHE-19", docBoxX + 3, 16);

  doc.setFont(fontName, "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text("Revisi    : 01", docBoxX + 3, 20.5);
  doc.text("Halaman : 1 dari 1", docBoxX + 3, 25);

  // Garis Aksen Ganda Elegan
  doc.setDrawColor(5, 150, 105); // emerald-600
  doc.setLineWidth(0.8);
  doc.line(startX, 31.5, startX + boxWidth, 31.5);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.25);
  doc.line(startX, 32.8, startX + boxWidth, 32.8);

  // ── 2. Informasi Ijin Kerja & Subkontraktor (Metadata Card) ──
  const metaY = 36;
  const metaH = 27;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(startX, metaY, boxWidth, metaH, 2, 2, "FD");

  // Header Strip Metadata Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(startX, metaY, boxWidth, 6, 2, 2, "F");
  doc.rect(startX, metaY + 4, boxWidth, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.line(startX, metaY + 6, startX + boxWidth, metaY + 6);

  doc.setFont(fontName, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("INFORMASI IJIN KERJA & SUB KONTRAKTOR", startX + 4, metaY + 4.3);

  const periodeText = formatPeriodeDDMMYYYY(
    meta.izin_kerja_tanggal_dari,
    meta.izin_kerja_tanggal_sampai
  );

  // Kolom Kiri
  const colLeftLabelX = startX + 4;
  const colLeftValX = startX + 44;

  doc.setFontSize(8);
  doc.setFont(fontName, "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("No. Ijin Kerja Eksternal", colLeftLabelX, metaY + 12);
  doc.setFont(fontName, "bold");
  doc.setTextColor(15, 40, 80);
  doc.text(`:  ${meta.id_form}`, colLeftValX, metaY + 12);

  doc.setFont(fontName, "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nama Sub Kontraktor", colLeftLabelX, metaY + 20);
  doc.setFont(fontName, "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${meta.nama_kontraktor_pekerja || "-"}`, colLeftValX, metaY + 20);

  // Kolom Kanan
  const colRightLabelX = startX + boxWidth / 2 + 2;
  const colRightValX = colRightLabelX + 38;

  doc.setFont(fontName, "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Lokasi Pekerjaan", colRightLabelX, metaY + 12);
  doc.setFont(fontName, "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${meta.lokasi_pekerjaan || "-"}`, colRightValX, metaY + 12);

  doc.setFont(fontName, "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Periode Pelaksanaan", colRightLabelX, metaY + 20);
  doc.setFont(fontName, "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${periodeText}`, colRightValX, metaY + 20);

  // ── 3. Tabel Checklist Penilaian Harian ──
  let curY = metaY + metaH + 6; // ~69
  const entries = data.entries || [];
  const entriesCount = entries.length;

  doc.setFont(fontName, "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Hasil Penilaian Harian (${entriesCount} Hari Evaluasi)`, startX, curY);

  curY += 3.8;

  // Ukuran Kolom Tabel
  const noColW = 8;
  const itemColW = 48;
  const descColW = 62;
  const remainW = boxWidth - noColW - itemColW - descColW; // 64mm
  const maxDayCols = Math.max(1, entriesCount);
  const dayColW = remainW / maxDayCols;

  // Header Tabel
  const tableHeaderH = 7.5;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(startX, curY, boxWidth, tableHeaderH, "F");

  doc.setFontSize(7.5);
  doc.setFont(fontName, "bold");
  doc.setTextColor(255, 255, 255);

  doc.text("No", startX + noColW / 2, curY + 5, { align: "center" });
  doc.text("Item Pengecekan", startX + noColW + 2.5, curY + 5);
  doc.text("Keterangan / Standar Evaluasi", startX + noColW + itemColW + 2.5, curY + 5);

  if (entriesCount > 0) {
    entries.forEach((_, i) => {
      const x = startX + noColW + itemColW + descColW + i * dayColW;
      doc.text(`H-${i + 1}`, x + dayColW / 2, curY + 5, { align: "center" });
    });
  } else {
    const x = startX + noColW + itemColW + descColW;
    doc.text("H-1", x + remainW / 2, curY + 5, { align: "center" });
  }

  // Garis Pemisah Kolom Header
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.2);
  doc.line(startX + noColW, curY, startX + noColW, curY + tableHeaderH);
  doc.line(startX + noColW + itemColW, curY, startX + noColW + itemColW, curY + tableHeaderH);
  doc.line(startX + noColW + itemColW + descColW, curY, startX + noColW + itemColW + descColW, curY + tableHeaderH);
  if (entriesCount > 1) {
    for (let i = 1; i < entriesCount; i++) {
      const x = startX + noColW + itemColW + descColW + i * dayColW;
      doc.line(x, curY, x, curY + tableHeaderH);
    }
  }

  curY += tableHeaderH;

  // Mapping rating label pendek agar pas di kolom harian
  const RATING_SHORT_MAP: Record<string, string> = {
    baik_sekali: "B. Sekali",
    baik: "Baik",
    sedang: "Sedang",
    kurang: "Kurang",
  };

  // Baris Data Item Checklist
  const rowH = 8.5; // Tinggi baris proporsional untuk 2 baris deskripsi
  ITEM_LABELS.forEach((item, itemIdx) => {
    const isEven = itemIdx % 2 === 1;

    // Background baris
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, curY, boxWidth, rowH, "F");
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(startX, curY, boxWidth, rowH, "F");
    }

    // Border sel luar
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.rect(startX, curY, boxWidth, rowH);

    // Garis pemisah kolom vertikal
    doc.line(startX + noColW, curY, startX + noColW, curY + rowH);
    doc.line(startX + noColW + itemColW, curY, startX + noColW + itemColW, curY + rowH);
    doc.line(startX + noColW + itemColW + descColW, curY, startX + noColW + itemColW + descColW, curY + rowH);
    if (entriesCount > 1) {
      for (let i = 1; i < entriesCount; i++) {
        const x = startX + noColW + itemColW + descColW + i * dayColW;
        doc.line(x, curY, x, curY + rowH);
      }
    }

    // Nomor
    doc.setFontSize(7.5);
    doc.setFont(fontName, "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(String(itemIdx + 1), startX + noColW / 2, curY + 5.2, { align: "center" });

    // Item Pengecekan
    doc.setFont(fontName, "bold");
    doc.setTextColor(15, 23, 42);
    const itemLines = doc.splitTextToSize(item.label, itemColW - 5);
    if (itemLines.length === 1) {
      doc.text(itemLines[0], startX + noColW + 2.5, curY + 5.2);
    } else {
      doc.text(itemLines[0], startX + noColW + 2.5, curY + 3.6);
      doc.text(itemLines[1], startX + noColW + 2.5, curY + 6.8);
    }

    // Keterangan / Standar (Ditampilkan utuh tanpa dipotong!)
    doc.setFont(fontName, "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(item.desc || "-", descColW - 5);
    if (descLines.length === 1) {
      doc.text(descLines[0], startX + noColW + itemColW + 2.5, curY + 5.2);
    } else {
      doc.text(descLines[0], startX + noColW + itemColW + 2.5, curY + 3.6);
      doc.text(descLines[1], startX + noColW + itemColW + 2.5, curY + 6.8);
    }

    // Kolom Evaluasi Hari
    if (entriesCount > 0) {
      entries.forEach((entry, i) => {
        const val = entry.items?.[item.key] || "";
        const textVal = RATING_SHORT_MAP[val] || "-";
        const x = startX + noColW + itemColW + descColW + i * dayColW + dayColW / 2;

        if (val === "baik_sekali" || val === "baik") {
          doc.setFont(fontName, "bold");
          doc.setFontSize(7);
          doc.setTextColor(5, 150, 105); // emerald-600
        } else if (val === "sedang") {
          doc.setFont(fontName, "bold");
          doc.setFontSize(7);
          doc.setTextColor(217, 119, 6); // amber-600
        } else if (val === "kurang") {
          doc.setFont(fontName, "bold");
          doc.setFontSize(7);
          doc.setTextColor(220, 38, 38); // red-600
        } else {
          doc.setFont(fontName, "normal");
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184); // slate-400
        }
        doc.text(textVal, x, curY + 5.2, { align: "center" });
      });
    } else {
      const x = startX + noColW + itemColW + descColW + remainW / 2;
      doc.setFont(fontName, "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("-", x, curY + 5.2, { align: "center" });
    }

    curY += rowH;
  });

  // Baris Catatan / Temuan Lapangan
  const catatanRowH = 8.5;
  doc.setFillColor(241, 245, 249);
  doc.rect(startX, curY, boxWidth, catatanRowH, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(startX, curY, boxWidth, catatanRowH);

  // Garis kolom
  doc.line(startX + noColW + itemColW, curY, startX + noColW + itemColW, curY + catatanRowH);
  doc.line(startX + noColW + itemColW + descColW, curY, startX + noColW + itemColW + descColW, curY + catatanRowH);
  if (entriesCount > 1) {
    for (let i = 1; i < entriesCount; i++) {
      const x = startX + noColW + itemColW + descColW + i * dayColW;
      doc.line(x, curY, x, curY + catatanRowH);
    }
  }

  doc.setFont(fontName, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Catatan / Temuan", startX + 4, curY + 5.2);

  doc.setFont(fontName, "italic");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Evaluasi catatan lapangan per hari", startX + noColW + itemColW + 2.5, curY + 5.2);

  if (entriesCount > 0) {
    entries.forEach((entry, i) => {
      const x = startX + noColW + itemColW + descColW + i * dayColW + dayColW / 2;
      const cText = entry.catatan ? (entry.catatan.length > 7 ? entry.catatan.slice(0, 6) + "…" : entry.catatan) : "-";
      doc.setFont(fontName, "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(cText, x, curY + 5.2, { align: "center" });
    });
  }

  curY += catatanRowH + 3.5;

  // ── Legend Kriteria Penilaian ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(startX, curY, boxWidth, 5.8, 1, 1, "FD");

  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Kriteria Penilaian :   [ B. Sekali ] Baik Sekali     •     [ Baik ] Sesuai Standar     •     [ Sedang ] Perlu Evaluasi     •     [ Kurang ] Tidak Sesuai",
    startX + boxWidth / 2,
    curY + 3.8,
    { align: "center" }
  );

  curY += 9;

  // ── 4. Verifikasi dan Persetujuan (Digital) ──
  doc.setFont(fontName, "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Verifikasi dan Persetujuan (Digital)", startX, curY);

  curY += 4;

  const mgt = data.mengetahui || {};
  const signBoxes = [
    {
      title: "Pengawas Dept",
      roleKey: "pengawasDept",
      data: mgt.pengawasDept || mgt.picDept || { nama: "", nik: "", tanggal: "" },
    },
    {
      title: "Purchasing",
      roleKey: "purchasing",
      data: mgt.purchasing || { nama: "", nik: "", tanggal: "" },
    },
    {
      title: "SFO",
      roleKey: "sfo",
      data: mgt.sfo || { nama: "", nik: "", tanggal: "" },
    },
  ];

  const cardGap = 4;
  const cardW = (boxWidth - cardGap * 2) / 3; // 58mm
  const cardH = 45; // Tinggi card nyaman dan proporsional

  for (let i = 0; i < signBoxes.length; i++) {
    const box = signBoxes[i];
    const x = startX + i * (cardW + cardGap);
    const hasApproved = Boolean(box.data.nama && box.data.nama.trim() !== "");

    // Bingkai Card
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.setFillColor(hasApproved ? 255 : 248, hasApproved ? 255 : 250, hasApproved ? 255 : 252);
    doc.roundedRect(x, curY, cardW, cardH, 2, 2, "FD");

    // Header Strip Card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, curY, cardW, 7, 2, 2, "F");
    doc.rect(x, curY + 4, cardW, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(x, curY + 7, x + cardW, curY + 7);

    doc.setFontSize(8.5);
    doc.setFont(fontName, "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(box.title, x + cardW / 2, curY + 5, { align: "center" });

    if (hasApproved) {
      // ── Sisipkan QR Code Verifikasi ──
      const qrSize = 20;
      const qrX = x + 3.5;
      const qrY = curY + 10;

      // Frame halus di sekeliling QR
      doc.setDrawColor(226, 232, 240);
      doc.rect(qrX - 0.5, qrY - 0.5, qrSize + 1, qrSize + 1);

      try {
        const verifyUrl = getVerifyUrl(meta.id_form, box.roleKey);
        const qrDataUrl = await makeQR(verifyUrl, 200);
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch (err) {
        console.error("Gagal menyisipkan QR PDF:", err);
      }

      // ── Info Approver di Samping QR ──
      const rightX = x + 26.5;

      // Badge Pill DISETUJUI (Menggunakan rounded rectangle vektor, tanpa karakter unicode rusak)
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(16, 185, 129); // emerald-500
      doc.setLineWidth(0.2);
      doc.roundedRect(rightX, curY + 10, 27, 4.6, 1, 1, "FD");

      doc.setFont(fontName, "bold");
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text("DISETUJUI", rightX + 13.5, curY + 13.4, { align: "center" });

      // Nama Approver
      doc.setFont(fontName, "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const displayName = box.data.nama.length > 15 ? box.data.nama.slice(0, 14) + "…" : box.data.nama;
      doc.text(displayName, rightX, curY + 18.5);

      // NIK
      doc.setFont(fontName, "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`NIK: ${box.data.nik || "-"}`, rightX, curY + 23);

      // Tanggal
      const tglFormatted = formatTanggalDDMMYYYY(box.data.tanggal);
      doc.text(`Tgl: ${tglFormatted}`, rightX, curY + 27.2);

      // Scan subtext
      doc.setFontSize(5.8);
      doc.setTextColor(148, 163, 184);
      doc.text("Scan QR utk verifikasi", rightX, curY + 31);
    } else {
      // ── Status Belum Disetujui ──
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.2);
      doc.roundedRect(x + (cardW - 28) / 2, curY + 14, 28, 5, 1, 1, "FD");

      doc.setFont(fontName, "bold");
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text("MENUNGGU", x + cardW / 2, curY + 17.6, { align: "center" });

      doc.setFont(fontName, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Belum Disetujui", x + cardW / 2, curY + 25, { align: "center" });

      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text("(Menunggu Tanda Tangan)", x + cardW / 2, curY + 29.5, { align: "center" });
    }

    // Card Footer Strip
    doc.setDrawColor(226, 232, 240);
    doc.line(x + 3, curY + cardH - 6.5, x + cardW - 3, curY + cardH - 6.5);
    doc.setFontSize(6);
    doc.setFont(fontName, "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("• Otorisasi Digital PT JAI •", x + cardW / 2, curY + cardH - 2.5, { align: "center" });
  }

  curY += cardH + 6;

  // ── 5. Kotak Ketentuan & Catatan K3 (Safety Health Environment) ──
  const noteBoxH = 17;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.25);
  doc.roundedRect(startX, curY, boxWidth, noteBoxH, 1.5, 1.5, "FD");

  // Garis Aksen Hijau di Kiri Kotak Catatan
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(startX, curY, 2.5, noteBoxH, 1.5, 1.5, "F");
  doc.rect(startX + 1.5, curY, 1, noteBoxH, "F");

  doc.setFont(fontName, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text("Ketentuan & Catatan K3 (Safety Health Environment):", startX + 6, curY + 5);

  doc.setFont(fontName, "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    "1. Form evaluasi ini merupakan instrumen resmi pengawasan keselamatan & kesehatan kerja (K3) PT. Jatim Autocomp Indonesia.",
    startX + 6,
    curY + 9.5
  );
  doc.text(
    "2. Hasil evaluasi harian wajib menjadi acuan perbaikan langsung oleh Sub Kontraktor dan mempengaruhi kelayakan ijin kerja berikutnya.",
    startX + 6,
    curY + 13.8
  );

  // ── 6. Footer Resmi Halaman ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(startX, 282, startX + boxWidth, 282);

  doc.setFontSize(7);
  doc.setFont(fontName, "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen resmi diverifikasi secara digital oleh PT. JAI Form Permit System • JAI/F-08/P.SHE-19 Rev. 1`,
    pageWidth / 2,
    286,
    { align: "center" }
  );

  doc.save(`Penilaian_Subkontraktor_${meta.id_form}.pdf`);
}
