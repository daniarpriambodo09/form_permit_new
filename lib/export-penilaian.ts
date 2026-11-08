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

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 16;

  // ── Header Title & Document Number ──
  doc.setFont(fontName, "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("FORM PENILAIAN SUB KONTRAKTOR", pageWidth / 2, curY, { align: "center" });

  curY += 5;
  doc.setFontSize(9.5);
  doc.setFont(fontName, "bold");
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text("JAI/F-08/P.SHE-19 Rev. 1", pageWidth / 2, curY, { align: "center" });

  curY += 4.5;
  doc.setFontSize(8.5);
  doc.setFont(fontName, "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Lampiran Evaluasi & Pengawasan Ijin Kerja Eksternal — PT. Jatim Autocomp Indonesia", pageWidth / 2, curY, {
    align: "center",
  });

  curY += 6;

  // Garis Aksen Ganda Elegan
  doc.setDrawColor(5, 150, 105); // emerald-600
  doc.setLineWidth(0.6);
  doc.line(14, curY, pageWidth - 14, curY);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
  doc.line(14, curY + 1, pageWidth - 14, curY + 1);

  curY += 6;

  // ── Metadata Box ──
  const startX = 14;
  const boxWidth = pageWidth - 28;
  const boxHeight = 24;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(startX, curY, boxWidth, boxHeight, 2, 2, "FD");

  const periodeText = formatPeriodeDDMMYYYY(
    meta.izin_kerja_tanggal_dari,
    meta.izin_kerja_tanggal_sampai
  );

  const infoListLeft = [
    ["No. Ijin Kerja Eksternal", meta.id_form],
    ["Nama Sub Kontraktor", meta.nama_kontraktor_pekerja || "-"],
  ];
  const infoListRight = [
    ["Lokasi Pekerjaan", meta.lokasi_pekerjaan || "-"],
    ["Periode Pelaksanaan", periodeText],
  ];

  let metaY = curY + 5.5;
  doc.setFontSize(8.5);

  infoListLeft.forEach(([lbl, val]) => {
    doc.setFont(fontName, "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(lbl, startX + 4, metaY);
    doc.setFont(fontName, "normal");
    doc.text(`:  ${val}`, startX + 42, metaY);
    metaY += 6;
  });

  metaY = curY + 5.5;
  const rightColX = startX + boxWidth / 2 + 2;
  infoListRight.forEach(([lbl, val]) => {
    doc.setFont(fontName, "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(lbl, rightColX, metaY);
    doc.setFont(fontName, "normal");
    doc.text(`:  ${val}`, rightColX + 34, metaY);
    metaY += 6;
  });

  curY += boxHeight + 6;

  // ── Tabel Hasil Penilaian Harian ──
  const entries = data.entries || [];
  const entriesCount = entries.length;

  doc.setFont(fontName, "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Hasil Penilaian Harian (${entriesCount} Hari Evaluasi)`, 14, curY);

  curY += 3.5;

  // Ukuran Kolom Tabel
  const itemColW = 58;
  const descColW = 46;
  const remainW = boxWidth - itemColW - descColW;
  const dayColW = entriesCount > 0 ? remainW / entriesCount : remainW;

  // Header row
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(startX, curY, boxWidth, 7, "F");

  doc.setFontSize(8);
  doc.setFont(fontName, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Item Pengecekan", startX + 3, curY + 4.8);
  doc.text("Keterangan / Standar", startX + itemColW + 3, curY + 4.8);

  // Menggunakan "H-1", "H-2", ... tanpa teks tanggal yang bertumpuk
  entries.forEach((_, i) => {
    const x = startX + itemColW + descColW + i * dayColW;
    doc.text(`H-${i + 1}`, x + dayColW / 2, curY + 4.8, { align: "center" });
  });

  curY += 7;

  // Rows Data Checklist
  ITEM_LABELS.forEach((item, idx) => {
    const rowH = 6.8;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, curY, boxWidth, rowH, "F");
    }

    doc.setDrawColor(226, 232, 240);
    doc.rect(startX, curY, boxWidth, rowH);

    doc.setFontSize(7.5);
    doc.setFont(fontName, "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(item.label, startX + 3, curY + 4.5);

    doc.setTextColor(100, 116, 139);
    doc.text(item.desc ? item.desc.slice(0, 28) : "-", startX + itemColW + 3, curY + 4.5);

    entries.forEach((entry, i) => {
      const val = entry.items?.[item.key] || "";
      const textVal = RATING_LABEL_MAP[val] || "-";
      const x = startX + itemColW + descColW + i * dayColW + dayColW / 2;

      if (val === "baik_sekali" || val === "baik") {
        doc.setFont(fontName, "bold");
        doc.setTextColor(5, 150, 105); // emerald
      } else if (val === "sedang") {
        doc.setFont(fontName, "bold");
        doc.setTextColor(217, 119, 6); // amber
      } else if (val === "kurang") {
        doc.setFont(fontName, "bold");
        doc.setTextColor(220, 38, 38); // rose
      } else {
        doc.setFont(fontName, "normal");
        doc.setTextColor(148, 163, 184);
      }
      doc.text(textVal, x, curY + 4.5, { align: "center" });
    });

    curY += rowH;
  });

  curY += 7;

  // ── Verifikasi dan Persetujuan (Digital) dengan Kode QR ──
  doc.setFont(fontName, "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Verifikasi dan Persetujuan (Digital)", 14, curY);

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
  const cardW = (boxWidth - cardGap * 2) / 3;
  const cardH = 38; // Lebih tinggi agar QR code dan informasi tertata rapi

  for (let i = 0; i < signBoxes.length; i++) {
    const box = signBoxes[i];
    const x = startX + i * (cardW + cardGap);
    const hasApproved = Boolean(box.data.nama && box.data.nama.trim() !== "");

    // Bingkai Card
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(hasApproved ? 255 : 248, hasApproved ? 255 : 250, hasApproved ? 255 : 252);
    doc.roundedRect(x, curY, cardW, cardH, 2, 2, "FD");

    // Header Strip Card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, curY, cardW, 6.5, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(x, curY + 6.5, x + cardW, curY + 6.5);

    doc.setFontSize(8.5);
    doc.setFont(fontName, "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(box.title, x + cardW / 2, curY + 4.6, { align: "center" });

    if (hasApproved) {
      // ── Sisipkan QR Code Verifikasi ──
      const qrSize = 18;
      const qrX = x + 4;
      const qrY = curY + 10;

      try {
        const verifyUrl = getVerifyUrl(meta.id_form, box.roleKey);
        const qrDataUrl = await makeQR(verifyUrl, 180);
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch (err) {
        console.error("Gagal menyisipkan QR PDF:", err);
      }

      // ── Teks Keterangan di Samping QR ──
      const textX = qrX + qrSize + 3;
      const textMaxW = cardW - qrSize - 9;

      doc.setFontSize(7.5);
      doc.setFont(fontName, "bold");
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text("✓ DISETUJUI", textX, curY + 13);

      doc.setFont(fontName, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const displayName = box.data.nama.length > 14 ? box.data.nama.slice(0, 13) + "…" : box.data.nama;
      doc.text(displayName, textX, curY + 18);

      doc.setFont(fontName, "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      if (box.data.nik) {
        doc.text(`NIK: ${box.data.nik}`, textX, curY + 22.5);
      }
      const tglFormatted = formatTanggalDDMMYYYY(box.data.tanggal);
      doc.text(`Tgl: ${tglFormatted}`, textX, curY + 26.5);

      // Verifikasi Digital Badge
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Verifikasi Digital", textX, curY + 30.5);
    } else {
      // Menunggu Persetujuan
      doc.setFontSize(7.5);
      doc.setFont(fontName, "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Belum Disetujui", x + cardW / 2, curY + 19, { align: "center" });
      doc.setFontSize(6.5);
      doc.text("(Menunggu Otorisasi)", x + cardW / 2, curY + 23.5, { align: "center" });
    }
  }

  // ── Footer Note ──
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
