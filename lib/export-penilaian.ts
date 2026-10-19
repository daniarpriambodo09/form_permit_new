// lib/export-penilaian.ts
// Utility untuk ekspor Lampiran Penilaian Sub Kontraktor ke format Excel (.xlsx) dan PDF (.pdf).

import {
  type PenilaianSubkontraktorData,
  ITEM_LABELS,
  RATING_OPTIONS,
} from "@/components/PenilaianSubkontraktorSection";

interface FormExportMeta {
  id_form: string;
  nama_kontraktor_pekerja: string;
  pimpinan_kontraktor: string;
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
 * Ekspor Lampiran Penilaian Sub Kontraktor ke Excel (.xlsx) menggunakan ExcelJS
 */
export async function exportPenilaianToExcel(
  meta: FormExportMeta,
  data: PenilaianSubkontraktorData
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PT. JAI Permit System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Penilaian Subkontraktor", {
    views: [{ showGridLines: true }],
  });

  // ── 1. Judul & Header ──
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "FORM PENILAIAN SUB KONTRAKTOR";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  // ── 2. Informasi Form ──
  const infoRows = [
    ["No. Ijin Kerja Eksternal", `: ${meta.id_form}`],
    ["Nama Sub Kontraktor", `: ${meta.nama_kontraktor_pekerja || "-"}`],
    ["Pimpinan Kontraktor", `: ${meta.pimpinan_kontraktor || "-"}`],
    ["Lokasi Pekerjaan", `: ${meta.lokasi_pekerjaan || "-"}`],
    [
      "Periode Pekerjaan",
      `: ${meta.izin_kerja_tanggal_dari || "-"} s/d ${meta.izin_kerja_tanggal_sampai || "-"}`,
    ],
  ];

  let curRow = 3;
  for (const [k, v] of infoRows) {
    sheet.getCell(`A${curRow}`).value = k;
    sheet.getCell(`A${curRow}`).font = { name: "Arial", size: 10, bold: true };
    sheet.getCell(`B${curRow}`).value = v;
    sheet.getCell(`B${curRow}`).font = { name: "Arial", size: 10 };
    curRow++;
  }

  curRow += 1;

  // ── 3. Tabel Checklist ──
  const entries = data.entries || [];
  const headerCols = ["No", "Item Pengecekan", "Keterangan / Standar"];
  entries.forEach((e, idx) => {
    headerCols.push(`Hari ${idx + 1}\n(${e.tanggal || "-"})`);
  });

  const tableHeaderRow = sheet.getRow(curRow);
  tableHeaderRow.values = headerCols;
  tableHeaderRow.height = 30;

  for (let c = 1; c <= headerCols.length; c++) {
    const cell = tableHeaderRow.getCell(c);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // dark slate
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
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
    row.height = 24;

    for (let c = 1; c <= headerCols.length; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (c === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (c >= 4) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        const textVal = String(cell.value || "");
        if (textVal === "Baik Sekali") {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF047857" } };
        } else if (textVal === "Kurang") {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFB91C1C" } };
        }
      } else {
        cell.alignment = { vertical: "middle" };
      }
    }
    curRow++;
  });

  // Baris Catatan / Temuan
  const catatanValues: any[] = ["-", "Catatan / Temuan", "Keterangan lapangan"];
  entries.forEach((entry) => {
    catatanValues.push(entry.catatan || "-");
  });
  const catatanRow = sheet.getRow(curRow);
  catatanRow.values = catatanValues;
  catatanRow.height = 36;
  for (let c = 1; c <= headerCols.length; c++) {
    const cell = catatanRow.getCell(c);
    cell.font = { name: "Arial", size: 9, italic: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  }
  curRow += 2;

  // ── 4. Bagian Mengetahui ──
  sheet.getCell(`A${curRow}`).value = "STATUS PERSETUJUAN (MENGETAHUI)";
  sheet.getCell(`A${curRow}`).font = { name: "Arial", size: 11, bold: true };
  curRow++;

  const mgt = data.mengetahui || {};
  const pengawasRow = mgt.pengawasDept || mgt.picDept || { nama: "", nik: "", tanggal: "" };
  const purchasingRow = mgt.purchasing || { nama: "", nik: "", tanggal: "" };
  const sfoRow = mgt.sfo || { nama: "", nik: "", tanggal: "" };

  const approvalHeader = ["Jabatan / Otoritas", "Status", "Nama Petugas", "NIK", "Tanggal Persetujuan"];
  const mgtHeaderRow = sheet.getRow(curRow);
  mgtHeaderRow.values = approvalHeader;
  for (let c = 1; c <= approvalHeader.length; c++) {
    const cell = mgtHeaderRow.getCell(c);
    cell.font = { name: "Arial", size: 9, bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }
  curRow++;

  const approverRowsData = [
    ["Pengawas Dept", pengawasRow.nama ? "DISETUJUI" : "MENUNGGU", pengawasRow.nama || "-", pengawasRow.nik || "-", pengawasRow.tanggal || "-"],
    ["Purchasing", purchasingRow.nama ? "DISETUJUI" : "MENUNGGU", purchasingRow.nama || "-", purchasingRow.nik || "-", purchasingRow.tanggal || "-"],
    ["SFO", sfoRow.nama ? "DISETUJUI" : "MENUNGGU", sfoRow.nama || "-", sfoRow.nik || "-", sfoRow.tanggal || "-"],
  ];

  for (const rData of approverRowsData) {
    const row = sheet.getRow(curRow);
    row.values = rData;
    row.height = 20;
    for (let c = 1; c <= approvalHeader.length; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (c === 2) {
        cell.alignment = { horizontal: "center" };
        cell.font = {
          name: "Arial",
          size: 9,
          bold: true,
          color: { argb: rData[1] === "DISETUJUI" ? "FF059669" : "FFD97706" },
        };
      }
    }
    curRow++;
  }

  // Atur lebar kolom
  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 40;
  for (let i = 4; i <= headerCols.length; i++) {
    sheet.getColumn(i).width = 18;
  }

  // Trigger download
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

/**
 * Ekspor Lampiran Penilaian Sub Kontraktor ke PDF (.pdf) menggunakan jsPDF
 */
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

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 16;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("FORM PENILAIAN SUB KONTRAKTOR", pageWidth / 2, curY, { align: "center" });

  curY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Lampiran Evaluasi & Pengawasan Ijin Kerja Eksternal", pageWidth / 2, curY, {
    align: "center",
  });

  curY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, curY, pageWidth - 14, curY);

  curY += 7;

  // Metadata Box
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const leftX = 14;
  const col2X = 58;

  const infoList = [
    ["No. Ijin Kerja Eksternal", meta.id_form],
    ["Nama Sub Kontraktor", meta.nama_kontraktor_pekerja || "-"],
    ["Pimpinan Kontraktor", meta.pimpinan_kontraktor || "-"],
    ["Lokasi Pekerjaan", meta.lokasi_pekerjaan || "-"],
    [
      "Periode Pelaksanaan",
      `${meta.izin_kerja_tanggal_dari || "-"} s/d ${meta.izin_kerja_tanggal_sampai || "-"}`,
    ],
  ];

  infoList.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "bold");
    doc.text(lbl, leftX, curY);
    doc.setFont("helvetica", "normal");
    doc.text(`:  ${val}`, col2X, curY);
    curY += 5;
  });

  curY += 4;

  // Summary Table of Evaluations
  const entries = data.entries || [];
  const entriesCount = entries.length;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Hasil Penilaian Harian (${entriesCount} Waktu Inspeksi)`, 14, curY);

  curY += 4;

  // Simple Table Rendering
  const startX = 14;
  const itemColW = 55;
  const descColW = 45;
  const remainW = pageWidth - 28 - itemColW - descColW;
  const dayColW = entriesCount > 0 ? remainW / entriesCount : remainW;

  // Header row
  doc.setFillColor(30, 41, 59);
  doc.rect(startX, curY, pageWidth - 28, 7, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Item Pengecekan", startX + 2, curY + 4.5);
  doc.text("Keterangan", startX + itemColW + 2, curY + 4.5);

  entries.forEach((e, i) => {
    const x = startX + itemColW + descColW + i * dayColW;
    doc.text(`H-${i + 1} (${e.tanggal?.slice(5) || "-"})`, x + dayColW / 2, curY + 4.5, {
      align: "center",
    });
  });

  curY += 7;

  // Rows
  ITEM_LABELS.forEach((item, idx) => {
    const rowH = 7;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, curY, pageWidth - 28, rowH, "F");
    }

    doc.setDrawColor(226, 232, 240);
    doc.rect(startX, curY, pageWidth - 28, rowH);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(item.label, startX + 2, curY + 4.5);

    doc.setTextColor(100, 116, 139);
    doc.text(item.desc ? item.desc.slice(0, 26) : "-", startX + itemColW + 2, curY + 4.5);

    entries.forEach((entry, i) => {
      const val = entry.items?.[item.key] || "";
      const textVal = RATING_LABEL_MAP[val] || "-";
      const x = startX + itemColW + descColW + i * dayColW + dayColW / 2;

      if (val === "baik_sekali" || val === "baik") {
        doc.setTextColor(5, 150, 105);
      } else if (val === "kurang") {
        doc.setTextColor(185, 28, 28);
      } else {
        doc.setTextColor(100, 116, 139);
      }
      doc.text(textVal, x, curY + 4.5, { align: "center" });
    });

    curY += rowH;
  });

  curY += 8;

  // Mengetahui / Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Verifikasi dan Persetujuan (Digital)", 14, curY);

  curY += 4;

  const mgt = data.mengetahui || {};
  const signBoxes = [
    {
      title: "Pengawas Dept",
      data: mgt.pengawasDept || mgt.picDept || { nama: "", nik: "", tanggal: "" },
    },
    {
      title: "Purchasing",
      data: mgt.purchasing || { nama: "", nik: "", tanggal: "" },
    },
    {
      title: "SFO",
      data: mgt.sfo || { nama: "", nik: "", tanggal: "" },
    },
  ];

  const boxW = (pageWidth - 28 - 10) / 3;
  signBoxes.forEach((box, i) => {
    const x = startX + i * (boxW + 5);
    const hasApproved = Boolean(box.data.nama);

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(hasApproved ? 255 : 248, hasApproved ? 255 : 250, hasApproved ? 255 : 252);
    doc.roundedRect(x, curY, boxW, 26, 2, 2, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(box.title, x + boxW / 2, curY + 5, { align: "center" });

    doc.setFontSize(7.5);
    if (hasApproved) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 150, 105);
      doc.text("✓ DISETUJUI", x + boxW / 2, curY + 11, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(box.data.nama || "-", x + boxW / 2, curY + 16, { align: "center" });
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `NIK: ${box.data.nik || "-"} • ${box.data.tanggal || "-"}`,
        x + boxW / 2,
        curY + 21,
        { align: "center" }
      );
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Menunggu Persetujuan", x + boxW / 2, curY + 14, { align: "center" });
    }
  });

  // Footer note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen resmi diverifikasi secara digital oleh PT. JAI Permit System pada ${new Date().toLocaleString(
      "id-ID"
    )}`,
    pageWidth / 2,
    285,
    { align: "center" }
  );

  doc.save(`Penilaian_Subkontraktor_${meta.id_form}.pdf`);
}
