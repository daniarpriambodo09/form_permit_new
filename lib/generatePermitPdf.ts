// lib/generatePermitPdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// PDF Generator — Surat Izin Kerja PT Jatim Autocomp Indonesia
// Target: 1 halaman A4 untuk mayoritas permit.
// Layout: 2 kolom, compact, grid-based.
// ─────────────────────────────────────────────────────────────────────────────

import type { jsPDF as jsPDFType } from "jspdf";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PW   = 210;
const PH   = 297;
const ML   = 10;
const MR   = 10;
const CW   = PW - ML - MR;  // 190
const COL  = (CW - 3) / 2;  // ~93.5 — lebar satu kolom
const FF   = "helvetica";
const MB   = 12;             // margin bawah (footer area)

type RGB = [number, number, number];

const C: Record<string, RGB> = {
  navy:     [15,  40,  80],
  navyDark: [8,   20,  50],
  gold:     [172, 132,  40],
  goldPale: [240, 225, 180],
  s700:     [51,  65,  85],
  s500:     [100, 116, 139],
  s300:     [203, 213, 225],
  s100:     [241, 245, 249],
  s50:      [248, 250, 252],
  white:    [255, 255, 255],
  g700:     [15,  118,  58],
  g600:     [22,  163,  74],
  g100:     [220, 252, 231],
  r600:     [220,  38,  38],
  r100:     [254, 226, 226],
  a700:     [161,  98,   7],
  a100:     [254, 243, 199],
  blue:     [37,  99,  235],
  purple:   [126, 34,  206],
};

type FormType = "hot-work" | "workshop" | "height-work" | "general-permit";

const JENIS_LABEL: Record<FormType, string> = {
  "hot-work":       "HOT WORK PERMIT",
  "workshop":       "WORKSHOP PERMIT",
  "height-work":    "HEIGHT WORK PERMIT",
  "general-permit": "FORM IJIN KERJA EKSTERNAL",
};

const STATUS_CFG: Record<string, { label: string; bg: RGB }> = {
  approved:  { label: "DISETUJUI",  bg: C.g600 },
  submitted: { label: "DIAJUKAN",   bg: C.blue },
  rejected:  { label: "DITOLAK",    bg: C.r600 },
  draft:     { label: "DRAFT",      bg: C.s500 },
};

const WORKSHOP_CHECKLIST_ITEMS = [
  ["equipment", "Equipment/tool/mesin berfungsi dengan baik"],
  ["apar", "APAR tersedia dekat area kerja"],
  ["flammableNearby", "Tidak ada cairan mudah terbakar dekat area kerja panas"],
  ["b3Stored", "B3 & cairan mudah terbakar disimpan di lemari khusus"],
  ["cleanFloor", "Lantai bersih dari benda mudah terbakar"],
  ["metalShield", "Lantai ditutup dengan perisai metal untuk menampung bunga api"],
  ["completePpe", "Memakai APD lengkap sesuai OS APD"],
  ["cleanMaterial", "Membersihkan sisa material, serpihan logam, atau sampah"],
  ["returnEquipment", "Mengembalikan Equipment/tool/mesin ke tempat penyimpanan semula"],
  ["disposeWaste", "Membuang sampah sesuai jenisnya (organik, anorganik, dan B3)"],
  ["firewatchSafety", "Fire watch memastikan kondisi aman selama dan setelah proses kerja"],
  ["firewatchTraining", "Fire watch terlatih Pemakaian APAR"],
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const bool  = (v: any) => v === true || v === "t" || v === "true";
const dash  = (v: any) => (v == null || v === "" ? "-" : String(v));

const fmtD = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtT = (t?: string | null) => (!t ? "-" : String(t).slice(0, 5));
const fmtDT = (d?: string | null): { date: string; time: string } => {
  if (!d) return { date: "-", time: "-" };
  const dt = new Date(d);
  return {
    date: dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    time: dt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
  };
};
const cleanFile = (url?: string | null) => {
  if (!url) return "-";
  const raw = url.split("/").pop() || url;
  return raw.replace(/^jsa_\d+_/, "");
};

async function makeQR(text: string, px = 200): Promise<string> {
  const QR = (await import("qrcode")).default;
  return QR.toDataURL(text, { width: px, margin: 1, color: { dark: "#0a1428", light: "#ffffff" } });
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF STATE
// ═══════════════════════════════════════════════════════════════════════════

class Doc {
  d: jsPDFType;
  y: number;
  pages: number;

  constructor(d: jsPDFType, startY = 0) {
    this.d     = d;
    this.y     = startY;
    this.pages = 1;
  }

  /** Ensure `h` mm fits; add page if not. */
  need(h: number, resetY = 14) {
    if (this.y + h > PH - MB) {
      this.d.addPage();
      this.pages++;
      this.y = resetY;
    }
  }

  /** Advance Y by `n`. */
  mv(n: number, resetY = 14) {
    this.y += n;
    if (this.y > PH - MB) {
      this.d.addPage();
      this.pages++;
      this.y = resetY;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WATERMARK
// ═══════════════════════════════════════════════════════════════════════════

function drawWatermark(d: jsPDFType) {
  try {
    const gs = (d as any).GState({ opacity: 0.03 });
    d.saveGraphicsState();
    d.setGState(gs);
    d.setFont(FF, "bold");
    d.setFontSize(22);
    d.setTextColor(...C.navy);
    d.text("PT JATIM AUTOCOMP INDONESIA", PW / 2, PH / 2, { align: "center", angle: 38 });
    d.restoreGraphicsState();
  } catch { /* skip if GState unavailable */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGO LOADER — lazy-load + cache Safety First PNG sebagai base64
// ═══════════════════════════════════════════════════════════════════════════

let _logoCache: string | null = null;

async function loadLogoBase64(): Promise<string | null> {
  if (_logoCache !== null) return _logoCache;
  try {
    const url = "/images/safety_first.png";
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const b64  = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res((r.result as string).split(",")[1]);
      r.onerror = () => rej(new Error("FileReader failed"));
      r.readAsDataURL(blob);
    });
    _logoCache = b64;
    return b64;
  } catch (e) {
    console.warn("[generatePermitPdf] Logo gagal dimuat:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER — compact ~34mm
// ═══════════════════════════════════════════════════════════════════════════

// Logo dimensions di header (kotak 20×15 mm → sesuaikan proporsional 1:1)
const LOGO_SIZE = 20; // mm — lebar & tinggi sama (gambar safety_first.png square)
const LOGO_X    = ML;
const LOGO_Y    = 1;  // vertikal center dalam band 22 mm

async function drawHeader(
  doc: Doc,
  jenisPermit: string,
  idForm: string,
  status: string,
  tglDibuat: string | null,
  tglPelaksanaan: string | null,
  tipe: string,
) {
  const d = doc.d;

  // ── Navy band ──────────────────────────────────────────
  d.setFillColor(...C.navyDark);
  d.rect(0, 0, PW, 22, "F");

  // Gold accent line
  d.setFillColor(...C.gold);
  d.rect(0, 22, PW, 0.8, "F");

  // ── Logo Safety First ──────────────────────────────────
  const logoB64 = await loadLogoBase64();
  if (logoB64) {
    d.addImage(
      `data:image/png;base64,${logoB64}`,
      "PNG",
      LOGO_X,
      LOGO_Y,
      LOGO_SIZE,
      LOGO_SIZE,
      undefined,
      "FAST",
    );
  }

  // Company name + jenis permit (digeser menyesuaikan lebar logo baru)
  const textX = LOGO_X + LOGO_SIZE + 4; // 3 mm gap setelah logo
  d.setFont(FF, "bold");
  d.setFontSize(10);
  d.setTextColor(...C.white);
  d.text("PT JATIM AUTOCOMP INDONESIA", textX, 10);

  d.setFont(FF, "normal");
  d.setFontSize(7);
  d.setTextColor(...C.goldPale);
  d.text("Sistem Izin Kerja Digital — Safety Management", textX, 15);

  // Permit type right-aligned
  d.setFont(FF, "bold");
  d.setFontSize(9);
  d.setTextColor(...C.gold);
  d.text(jenisPermit, PW - MR, 10, { align: "right" });
  d.setFont(FF, "normal");
  d.setFontSize(7);
  d.setTextColor(180, 200, 220);
  d.text(`No: ${idForm}`, PW - MR, 16, { align: "right" });

  // ── Info strip (compact grid 5 kolom) ──────────────────
  d.setFillColor(...C.s100);
  d.rect(0, 22.8, PW, 11, "F");

  const items = [
    { lbl: "STATUS",          val: (STATUS_CFG[status] ?? STATUS_CFG.submitted).label, badge: STATUS_CFG[status]?.bg ?? C.blue },
    { lbl: "TIPE",            val: tipe === "eksternal" ? "EKSTERNAL" : "INTERNAL",   badge: tipe === "eksternal" ? C.purple : C.blue },
    { lbl: "NO FORM",         val: idForm,                 badge: null },
    { lbl: "TGL DIBUAT",      val: fmtD(tglDibuat),        badge: null },
    { lbl: "TGL PELAKSANAAN", val: fmtD(tglPelaksanaan),   badge: null },
  ];
  const colW5 = CW / 5;

  items.forEach((it, i) => {
    const x = ML + i * colW5;
    const y = 23.5;

    if (i > 0) {
      d.setDrawColor(...C.s300);
      d.setLineWidth(0.15);
      d.line(x, y, x, y + 9.5);
    }

    d.setFont(FF, "bold");
    d.setFontSize(5.5);
    d.setTextColor(...C.s500);
    d.text(it.lbl, x + 2, y + 3);

    if (it.badge) {
      d.setFillColor(...it.badge);
      d.roundedRect(x + 2, y + 4, colW5 - 5, 5, 0.8, 0.8, "F");
      d.setFont(FF, "bold");
      d.setFontSize(6);
      d.setTextColor(...C.white);
      d.text(it.val, x + 2 + (colW5 - 5) / 2, y + 7.5, { align: "center" });
    } else {
      d.setFont(FF, "normal");
      d.setFontSize(7);
      d.setTextColor(...C.navy);
      const ls = d.splitTextToSize(it.val, colW5 - 4);
      d.text(ls[0] ?? "-", x + 2, y + 8);
    }
  });

  doc.y = 36; // konten mulai di y=36
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION TITLE — compact 6mm
// ═══════════════════════════════════════════════════════════════════════════

function sec(doc: Doc, title: string, x = ML, w = CW) {
  doc.need(10);
  const d = doc.d;
  d.setFillColor(...C.gold);
  d.rect(x, doc.y, 2.5, 6, "F");
  d.setFillColor(...C.navy);
  d.rect(x + 2.5, doc.y, w - 2.5, 6, "F");
  d.setFont(FF, "bold");
  d.setFontSize(7);
  d.setTextColor(...C.white);
  d.text(title.toUpperCase(), x + 5, doc.y + 4.2);
  doc.mv(6.5);
}

// ═══════════════════════════════════════════════════════════════════════════
// INFO TABLE — compact rows, 2-column label|value
// ═══════════════════════════════════════════════════════════════════════════

interface IRow { lbl: string; val: string | null | undefined }

function infoTable(doc: Doc, rows: IRow[], x = ML, w = CW, customLw?: number) {
  const d    = doc.d;
  const LW   = customLw ?? (w < 100 ? 34 : 42);
  const RW   = w - LW;
  const RH   = 5.2;
  doc.need(rows.length * RH + 2);
  const sy = doc.y;

  rows.forEach((r, i) => {
    const ry = sy + i * RH;
    doc.need(RH + 2);

    // Zebra
    d.setFillColor(...(i % 2 === 0 ? C.s50 : C.white));
    d.rect(x, ry, w, RH, "F");

    // Bottom border
    d.setDrawColor(...C.s300);
    d.setLineWidth(0.12);
    d.line(x, ry + RH, x + w, ry + RH);

    // Divider
    d.setDrawColor(...C.s300);
    d.setLineWidth(0.12);
    d.line(x + LW, ry, x + LW, ry + RH);

    d.setFont(FF, "bold");
    d.setFontSize(6.5);
    d.setTextColor(...C.s700);
    d.text(r.lbl, x + 2, ry + RH - 1.5);

    d.setFont(FF, "normal");
    d.setFontSize(7);
    d.setTextColor(...C.navy);
    const ls = d.splitTextToSize(dash(r.val), RW - 3);
    d.text(ls[0] ?? "-", x + LW + 2, ry + RH - 1.5);
  });

  // Outer border
  d.setDrawColor(...C.s500);
  d.setLineWidth(0.25);
  d.rect(x, sy, w, rows.length * RH, "S");

  doc.y = sy + rows.length * RH + 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKLIST — 2 kolom, badge kecil
// ═══════════════════════════════════════════════════════════════════════════

interface CItem { lbl: string; val: any }

function checkGrid(doc: Doc, items: CItem[], x = ML, w = CW) {
  const d    = doc.d;
  const half = Math.ceil(items.length / 2);
  const col  = (w - 2) / 2;
  const RH   = 4.8;
  const rows = half;
  doc.need(rows * RH + 2);
  const sy = doc.y;

  for (let i = 0; i < half; i++) {
    const ry = sy + i * RH;
    doc.need(RH + 2);

    // Draw left item (index i)
    drawCheckItem(d, items[i], x, ry, col, RH, i);

    // Draw right item (index i + half)
    const ri = i + half;
    if (ri < items.length) {
      drawCheckItem(d, items[ri], x + col + 2, ry, col, RH, i);
    }
  }

  // Outer border
  d.setDrawColor(...C.s300);
  d.setLineWidth(0.2);
  d.rect(x, sy, w, rows * RH, "S");

  doc.y = sy + rows * RH + 2;
}

function drawCheckItem(d: jsPDFType, item: CItem, x: number, y: number, w: number, h: number, i: number) {
  const yes = bool(item.val);

  // Background zebra
  d.setFillColor(...(i % 2 === 0 ? C.s50 : C.white));
  d.rect(x, y, w, h, "F");

  // Bottom border
  d.setDrawColor(...C.s300);
  d.setLineWidth(0.1);
  d.line(x, y + h, x + w, y + h);

  // Status badge
  d.setFillColor(...(yes ? C.g100 : C.r100));
  d.roundedRect(x + w - 9.5, y + 0.5, 9, h - 1, 0.6, 0.6, "F");
  d.setFont(FF, "bold");
  d.setFontSize(5.5);
  d.setTextColor(...(yes ? C.g700 : C.r600));
  d.text(yes ? "Ya" : "Tdk", x + w - 5, y + h - 1.2, { align: "center" });

  // Label
  d.setFont(FF, "normal");
  d.setFontSize(6.5);
  d.setTextColor(...C.navy);
  const ls = d.splitTextToSize(item.lbl, w - 13);
  d.text(ls[0] ?? item.lbl, x + 2, y + h - 1.2);
}

// ═══════��═══════════════════════════════════════════════════════════════════
// JOB GRID — 2x2 grid (Cutting | Grinding / Welding | Painting)
// ═══════════════════════════════════════════════════════════════════════════

interface Job { lbl: string; detail: string | null | undefined; mulai: string | null | undefined; selesai: string | null | undefined }

function jobGrid(doc: Doc, jobs: Job[], x = ML, w = CW) {
  const activeJobs = jobs.filter(j => j.detail || j.mulai);
  if (activeJobs.length === 0) return;

  const d    = doc.d;
  const cols = 2;
  const jW   = (w - 2) / cols;
  const jH   = 10;
  const rows  = Math.ceil(activeJobs.length / cols);

  doc.need(rows * jH + 2);
  const sy = doc.y;

  for (let i = 0; i < activeJobs.length; i++) {
    const j   = activeJobs[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx  = x + col * (jW + 2);
    const jy  = sy + row * jH;

    // Box background + border
    d.setFillColor(...C.s50);
    d.setDrawColor(...C.gold);
    d.setLineWidth(0.35);
    d.rect(jx, jy, jW, jH, "FD");

    // Gold left bar
    d.setFillColor(...C.gold);
    d.rect(jx, jy, 2.5, jH, "F");

    // Label
    d.setFont(FF, "bold");
    d.setFontSize(7);
    d.setTextColor(...C.navy);
    d.text(j.lbl.toUpperCase(), jx + 5, jy + 4.2);

    // Waktu
    if (j.mulai) {
      d.setFont(FF, "normal");
      d.setFontSize(6.5);
      d.setTextColor(...C.s500);
      d.text(`${fmtT(j.mulai)} – ${fmtT(j.selesai)}`, jx + 5, jy + 8.2);
    }

    // Detail (kanan)
    if (j.detail) {
      d.setFont(FF, "normal");
      d.setFontSize(6.5);
      d.setTextColor(...C.s700);
      const ls = d.splitTextToSize(j.detail, jW - 32);
      d.text(ls[0] ?? "", jx + jW - 2, jy + 4.2, { align: "right" });
    }
  }

  doc.y = sy + rows * jH + 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// BADGE HELPER — rounded pill dengan padding horizontal konsisten
// Digunakan oleh jsaRow (✓ TERLAMPIR) dan approvalGrid (✓ DISETUJUI / MENUNGGU)
//
// Parameter:
//   d         — instance jsPDF
//   text      — teks badge
//   rightEdge — koordinat X batas kanan badge (sudah termasuk margin dari border card)
//   midY      — koordinat Y tengah badge (badge akan di-center secara vertikal di sini)
//   bg        — warna background badge [R, G, B]
//   fg        — warna teks badge [R, G, B]
//   fontSize  — ukuran font (default 5.5)
//   badgeH    — tinggi badge dalam mm (default 4.2)
//   padX      — padding horizontal kiri & kanan dalam mm (default 2.5)
// ═══════════════════════════════════════════════════════════════════════════

// Lebar badge fixed (mm) per teks, fontSize 5.5, helvetica bold.
// PENTING: Jangan gunakan karakter ✓ di teks badge — font Helvetica di jsPDF
// tidak mendukung Unicode, sehingga ✓ muncul sebagai tanda ' atau karakter rusak.
const BADGE_WIDTHS: Record<string, number> = {
  "DISETUJUI": 20,
  "MENUNGGU":  18,
  "TERLAMPIR": 20,
};

function drawBadge(
  d: jsPDFType,
  text: string,
  rightEdge: number,
  midY: number,
  bg: RGB,
  fg: RGB,
  fontSize = 5.5,
  badgeH   = 4.2,
) {
  const badgeW = BADGE_WIDTHS[text] ?? 20;
  const bx     = rightEdge - badgeW;
  const by     = midY - badgeH / 2;

  // Background pill
  d.setFillColor(...bg);
  d.roundedRect(bx, by, badgeW, badgeH, 0.8, 0.8, "F");

  // Teks di tengah badge
  d.setFont(FF, "bold");
  d.setFontSize(fontSize);
  d.setTextColor(...fg);
  d.text(text, bx + badgeW / 2, by + badgeH * 0.65, { align: "center" });
}

// ═══════════════════════════════════════════════════════════════════════════
// JSA — QR Code mengarah ke URL file JSA
//
// Layout (ada file):
//   ┌──────────────────────────────────────────────────────┐
//   │  [QR 22mm]  File JSA Terlampir           TERLAMPIR  │
//   │             nama-file.xlsx                           │
//   │             Scan QR untuk membuka file JSA          │
//   └──────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════════

async function jsaSection(doc: Doc, perluJsa: boolean, url?: string | null, jsaData?: any, x = ML, w = CW) {
  const d = doc.d;

  // Cek apakah ada file URL JSA (bisa dari prop url atau jsaData.fileUrl)
  const effectiveUrl = url || jsaData?.fileUrl;

  // Cek apakah ada konten terstruktur yang benar-benar diisi (bukan sekadar empty string)
  const hasStructuredContent = Boolean(
    jsaData && (
      (typeof jsaData.area === "string" && jsaData.area.trim()) ||
      (typeof jsaData.jenisPekerjaan === "string" && jsaData.jenisPekerjaan.trim()) ||
      (Array.isArray(jsaData.petugas) && jsaData.petugas.some((p: any) => p && String(p).trim())) ||
      (Array.isArray(jsaData.rows) && jsaData.rows.length > 0)
    )
  );

  // 1. Ada file JSA terlampir -> QR card rapi
  if (effectiveUrl) {
    const QR_SIZE = 19;
    const H       = QR_SIZE + 4; // 23mm
    doc.need(H + 2);
    const y = doc.y;

    d.setFillColor(...C.g100);
    d.setDrawColor(...C.g600);
    d.setLineWidth(0.25);
    d.roundedRect(x, y, w, H, 1.5, 1.5, "FD");

    try {
      const fullUrl = effectiveUrl.startsWith("http")
        ? effectiveUrl
        : (typeof window !== "undefined" ? window.location.origin : "") + effectiveUrl;
      const qrImg = await makeQR(fullUrl, 300);
      d.addImage(qrImg, "PNG", x + 2, y + 2, QR_SIZE, QR_SIZE);
    } catch { /* skip QR */ }

    const textX = x + QR_SIZE + 5;
    const textW = w - QR_SIZE - 8;

    d.setFont(FF, "bold");
    d.setFontSize(7.5);
    d.setTextColor(...C.g700);
    d.text("Dokumen Job Safety Analysis (JSA) Terlampir", textX, y + 6.5);

    const fn = cleanFile(effectiveUrl);
    d.setFont(FF, "normal");
    d.setFontSize(6.5);
    d.setTextColor(...C.navy);
    const fnLines = d.splitTextToSize(fn, textW - 24);
    d.text(fnLines[0] ?? fn, textX, y + 11.5);

    d.setFont(FF, "normal");
    d.setFontSize(5.5);
    d.setTextColor(...C.s500);
    d.text("Scan QR Code di samping untuk membuka dokumen JSA.", textX, y + 16.5);

    drawBadge(d, "TERLAMPIR", x + w - 3, y + 5, C.navyDark, C.white, 5.5, 4.0);
    doc.y = y + H + 2;
    return;
  }

  // 2. Ada konten terstruktur yang benar-benar diisi
  if (hasStructuredContent) {
    const rows = [
      { lbl: "Area Kerja", val: jsaData.area || "-" },
      { lbl: "Jenis Pekerjaan", val: jsaData.jenisPekerjaan || "-" },
      { lbl: "Sect/Dept & PIC", val: `${jsaData.sectDept || "-"} / ${jsaData.pic || "-"}` },
      { lbl: "Daftar Petugas", val: (jsaData.petugas || []).filter(Boolean).join(", ") || "-" },
    ];
    sec(doc, "Dokumen JSA Terstruktur", x, w);
    infoTable(doc, rows, x, w);
    return;
  }

  // 3. JSA diperlukan tapi belum diupload
  if (perluJsa) {
    const H = 6.5;
    doc.need(H + 2);
    const y = doc.y;
    d.setFillColor(...C.a100);
    d.setDrawColor(...C.a700);
    d.setLineWidth(0.25);
    d.roundedRect(x, y, w, H, 1, 1, "FD");
    d.setFont(FF, "bold");
    d.setFontSize(6.5);
    d.setTextColor(...C.a700);
    d.text("! FORMULIR JSA DIPERLUKAN — Dokumen belum dilampirkan", x + 4, y + 4.5);
    doc.y = y + H + 2;
    return;
  }

  // 4. JSA tidak diperlukan
  const H = 6;
  doc.need(H + 2);
  const y = doc.y;
  d.setFillColor(...C.s100);
  d.setDrawColor(...C.s300);
  d.setLineWidth(0.2);
  d.roundedRect(x, y, w, H, 1, 1, "FD");
  d.setFont(FF, "normal");
  d.setFontSize(6);
  d.setTextColor(...C.s500);
  d.text("Job Safety Analysis (JSA): Tidak Diperlukan / Mengikuti Instruksi Standar K3 PT JAI", x + 4, y + 4.2);
  doc.y = y + H + 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL GRID — 2 kolom
// ═══════════════════════════════════════════════════════════════════════════

interface Approver {
  lbl:  string;
  role: string;
  approved:    any;
  approvedBy:  string | null | undefined;
  approvedNik?: string | null | undefined;
  approvedAt:  string | null | undefined;
}

async function approvalGrid(
  doc: Doc,
  approvers: Approver[],
  formId: string,
  formType: FormType,
  x = ML,
  w = CW,
) {
  const d    = doc.d;
  const isGP = formType === "general-permit";
  const cols = (isGP || approvers.length >= 5) ? 3 : 2;
  const gap  = cols === 3 ? 2.5 : 2;
  const cW   = (w - (cols - 1) * gap) / cols;
  const cH   = cols === 3 ? 25 : 28;    // tinggi card approved
  const cHwait = cols === 3 ? 14 : 13; // tinggi card pending
  const QR   = cols === 3 ? 13.5 : 17; // ukuran QR code
  const hdrH = cols === 3 ? 5.8 : 6.5;

  // Untuk general-permit dengan 5 approver, tambahkan kartu ke-6 sebagai status pengesahan sistem
  const allCards: Array<Approver | { isSystemCard: true }> = [...approvers];
  if (isGP && approvers.length === 5) {
    allCards.push({ isSystemCard: true });
  }

  const rows = Math.ceil(allCards.length / cols);
  doc.need(rows * (cH + 2) + 4);
  const baseY = doc.y;

  // Hitung Y awal tiap baris
  const rowStartY: number[] = [];
  for (let r = 0; r < rows; r++) {
    if (r === 0) {
      rowStartY[r] = baseY;
    } else {
      let prevRowH = 0;
      for (let c = 0; c < cols; c++) {
        const idx = (r - 1) * cols + c;
        if (idx < allCards.length) {
          const item = allCards[idx];
          const h = ("isSystemCard" in item) ? cH : (bool(item.approved) ? cH : cHwait);
          prevRowH = Math.max(prevRowH, h);
        }
      }
      rowStartY[r] = rowStartY[r - 1] + prevRowH + 2.5;
    }
  }

  for (let i = 0; i < allCards.length; i++) {
    const item  = allCards[i];
    const col   = i % cols;
    const row   = Math.floor(i / cols);
    const cx    = x + col * (cW + gap);
    const cy    = rowStartY[row];

    // ── KARTU KHUSUS KE-6: STATUS & VALIDASI SISTEM ──────
    if ("isSystemCard" in item) {
      const allApproved = approvers.every(a => bool(a.approved));
      const approvedCount = approvers.filter(a => bool(a.approved)).length;
      const thisH = cH;

      d.setFillColor(...(allApproved ? C.g100 : C.s50));
      d.setDrawColor(...(allApproved ? C.g600 : C.s300));
      d.setLineWidth(0.3);
      d.roundedRect(cx, cy, cW, thisH, 1.5, 1.5, "FD");

      // Header strip
      d.setFillColor(...(allApproved ? C.g600 : C.navy));
      d.roundedRect(cx, cy, cW, hdrH, 1.5, 1.5, "F");
      d.rect(cx, cy + hdrH - 3, cW, 3, "F");

      d.setFont(FF, "bold");
      d.setFontSize(6);
      d.setTextColor(...C.white);
      d.text("PENGESAHAN SISTEM", cx + 3, cy + 4.2);

      drawBadge(
        d,
        allApproved ? "DISETUJUI" : "MENUNGGU",
        cx + cW - 3.5,
        cy + hdrH / 2,
        allApproved ? C.navyDark : [30, 41, 59],
        C.white,
        5.2,
        3.8,
      );

      // Info teks
      d.setFont(FF, "bold");
      d.setFontSize(6);
      d.setTextColor(...(allApproved ? C.g700 : C.navy));
      d.text(allApproved ? "DOKUMEN RESMI SAH" : "PROSES APPROVAL", cx + 3, cy + hdrH + 4.5);

      d.setFont(FF, "normal");
      d.setFontSize(5);
      d.setTextColor(...C.s500);
      d.text(`${approvedCount} dari ${approvers.length} Verifikasi Selesai`, cx + 3, cy + hdrH + 8.5);
      d.text(`ID Form: ${formId}`, cx + 3, cy + hdrH + 12.5);

      // QR Code Verifikasi Dokumen
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url    = `${origin}/approval-verification/${formType}/${formId}/system`;
        const qrImg  = await makeQR(url, 200);
        const qrX    = cx + cW - QR - 2.5;
        const qrY    = cy + hdrH + 1;
        d.addImage(qrImg, "PNG", qrX, qrY, QR, QR);
        d.setFont(FF, "normal");
        d.setFontSize(4);
        d.setTextColor(...C.s500);
        d.text("Verifikasi", qrX + QR / 2, qrY + QR + 2.5, { align: "center" });
      } catch { /* skip */ }
      continue;
    }

    const ap    = item as Approver;
    const isOk  = bool(ap.approved);
    const thisH = isOk ? cH : cHwait;

    // ── Card background + border ──────────────────────────
    d.setFillColor(...(isOk ? C.g100 : C.s50));
    d.setDrawColor(...(isOk ? C.g600 : C.s300));
    d.setLineWidth(0.3);
    d.roundedRect(cx, cy, cW, thisH, 1.5, 1.5, "FD");

    // ── Header strip ──────────────────────────────────────
    d.setFillColor(...(isOk ? C.g600 : C.s500));
    d.roundedRect(cx, cy, cW, hdrH, 1.5, 1.5, "F");
    d.rect(cx, cy + hdrH - 3, cW, 3, "F");

    // Label kiri header
    d.setFont(FF, "bold");
    d.setFontSize(cols === 3 ? 6 : 6.5);
    d.setTextColor(...C.white);
    d.text(ap.lbl.toUpperCase(), cx + 3, cy + 4.2);

    // ── Badge status ──────────────────────────────────────
    drawBadge(
      d,
      isOk ? "DISETUJUI" : "MENUNGGU",
      cx + cW - 3.5,
      cy + hdrH / 2,
      isOk ? C.navyDark : [30, 41, 59],
      C.white,
      cols === 3 ? 5.2 : 5.5,
      cols === 3 ? 3.8 : 4.0,
    );

    // ── Card pending: hanya teks "Belum Disetujui" ────────
    if (!isOk) {
      d.setFont(FF, "normal");
      d.setFontSize(6.5);
      d.setTextColor(...C.s500);
      d.text("Belum Disetujui", cx + 3, cy + hdrH + 5);
      continue;
    }

    // ── Card approved: info inline satu baris per field ──
    const { date: aDate, time: aTime } = fmtDT(ap.approvedAt);
    const infoX  = cx + 2.5;
    const infoY  = cy + hdrH + 2.5;
    const infoW  = cW - QR - 5.5;
    const lblW   = cols === 3 ? 7 : 8;
    const lineH  = cols === 3 ? 3.6 : 4.0;

    const infoRows: Array<[string, string]> = [
      ["NAMA", dash(ap.approvedBy)],
      ["NIK",  dash(ap.approvedNik)],
      ["TGL",  aDate],
      ["JAM",  aTime],
    ];

    infoRows.forEach(([lbl, val], ri) => {
      const ry = infoY + ri * lineH;

      d.setFont(FF, "bold");
      d.setFontSize(cols === 3 ? 5 : 5.5);
      d.setTextColor(...C.s500);
      d.text(lbl, infoX, ry + 2);

      d.setFont(FF, "normal");
      d.setFontSize(cols === 3 ? 5 : 5.5);
      d.setTextColor(...C.s500);
      d.text(":", infoX + lblW, ry + 2);

      d.setFont(FF, "bold");
      d.setFontSize(cols === 3 ? 5.2 : 6);
      d.setTextColor(...C.navy);
      const ls = d.splitTextToSize(val, infoW - lblW - 1.5);
      d.text(ls[0] ?? val, infoX + lblW + 1.5, ry + 2);
    });

    // ── QR Code ───────────────────────────────────────────
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url    = `${origin}/approval-verification/${formType}/${formId}/${ap.role}`;
      const qrImg  = await makeQR(url, 200);
      const qrX    = cx + cW - QR - 2.5;
      const qrY    = cy + hdrH + 1;
      d.addImage(qrImg, "PNG", qrX, qrY, QR, QR);
      d.setFont(FF, "normal");
      d.setFontSize(4);
      d.setTextColor(...C.s500);
      d.text("Scan verifikasi", qrX + QR / 2, qrY + QR + 2.5, { align: "center" });
    } catch { /* skip */ }
  }

  // Advance doc.y
  let totalH = 0;
  for (let r = 0; r < rows; r++) {
    let rowH = 0;
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < allCards.length) {
        const item = allCards[idx];
        const h = ("isSystemCard" in item) ? cH : (bool(item.approved) ? cH : cHwait);
        rowH = Math.max(rowH, h);
      }
    }
    totalH += rowH + 2.5;
  }
  doc.y = baseY + totalH + 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════

function drawFooters(d: jsPDFType, total: number, generatedAt: string) {
  for (let p = 1; p <= total; p++) {
    d.setPage(p);
    const fy = PH - 6;
    d.setDrawColor(...C.gold);
    d.setLineWidth(0.5);
    d.line(ML, fy - 2, ML + 18, fy - 2);
    d.setDrawColor(...C.s300);
    d.setLineWidth(0.2);
    d.line(ML + 18, fy - 2, ML + CW, fy - 2);
    d.setFont(FF, "normal");
    d.setFontSize(5.5);
    d.setTextColor(...C.s500);
    d.text(`Sistem Izin Kerja Digital — PT Jatim Autocomp Indonesia  |  Generated: ${generatedAt}`, ML, fy + 1);
    d.text(`Hal. ${p} / ${total}`, ML + CW, fy + 1, { align: "right" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — GENERAL PERMIT / IJIN KERJA EKSTERNAL (2 kolom)
// ═══════════════════════════════════════════════════════════════════════════

function buildGeneralPermit(doc: Doc, data: any) {
  const d      = doc.d;
  const startY = doc.y;

  // ── KOLOM KIRI ─────────────────────────────────────────
  const lx = ML;
  const lw = COL;

  // 1. Informasi Kontraktor / Pemohon
  sec(doc, "Informasi Kontraktor / Pemohon", lx, lw);
  infoTable(doc, [
    { lbl: "Nama Kontraktor", val: data.nama_kontraktor_pekerja },
    { lbl: "Pengawas / PIC",  val: data.nama_pengawas_pic_subkont },
    { lbl: "Jumlah Pekerja",  val: data.jumlah_tenaga_kerja ? `${data.jumlah_tenaga_kerja} Orang` : "-" },
    { lbl: "Lokasi Kerja",    val: data.lokasi_pekerjaan },
    { lbl: "SPV Penanggung Jwb", val: data.spv_terkait_pj ? `${data.spv_terkait_pj}${data.nik_spv_terkait_pj ? ` (${data.nik_spv_terkait_pj})` : ""}` : "-" },
  ], lx, lw);

  // 2. Periode & Waktu Kerja
  sec(doc, "Periode & Waktu Kerja", lx, lw);
  infoTable(doc, [
    { lbl: "Tgl Rencana",     val: `${fmtD(data.tgl_mulai_kerja)} s/d ${fmtD(data.tgl_akhir_kerja_rencana)}` },
    { lbl: "Jam Kerja Rencana", val: `${fmtT(data.waktu_kerja)} - ${fmtT(data.waktu_selesai || data.izin_kerja_sampai)}` },
    { lbl: "Izin Berlaku",    val: `${fmtD(data.izin_kerja_tanggal_dari || data.tgl_mulai_kerja)} s/d ${fmtD(data.izin_kerja_tanggal_sampai || data.tgl_akhir_kerja_rencana)}` },
    { lbl: "Jam Izin",        val: `${fmtT(data.izin_kerja_dari || data.waktu_kerja)} - ${fmtT(data.izin_kerja_sampai || data.waktu_selesai)}` },
    { lbl: "Aktual Selesai",  val: fmtD(data.actual_tanggal_kerja) },
  ], lx, lw);

  // 3. APAR, Limbah & Peralatan
  sec(doc, "APAR, Limbah & Peralatan", lx, lw);
  const aparVal = bool(data.apar_dry_powder) ? "Dry Powder" : bool(data.apar_gas_cair) ? "Gas/Cair" : bool(data.apar_tidak_perlu) ? "Tidak Perlu" : data.apar_lainnya || "-";
  const limbahVal = bool(data.limbah_kontraktor) ? "Dibawa Kontraktor" : bool(data.limbah_pt_jai) ? "Dibuang di PT.JAI" : bool(data.limbah_luar_jai) ? "Dibuang Luar PT.JAI" : "-";
  
  const alatList = [
    bool(data.alat_mesin_potong) && "Mesin Potong",
    bool(data.alat_mesin_las_gerinda) && "Mesin Las/Gerinda",
    bool(data.alat_genset) && "Genset",
    bool(data.alat_tabung_gas) && "Tabung Gas",
    bool(data.alat_tangga_listrik_awp) && "Tangga Listrik/AWP",
    bool(data.alat_forklift) && "Forklift",
    bool(data.alat_lift_barang) && "Lift Barang",
    data.alat_lainnya,
  ].filter(Boolean) as string[];

  infoTable(doc, [
    { lbl: "APAR", val: aparVal },
    { lbl: "Limbah", val: limbahVal },
    { lbl: "Peralatan", val: alatList.length > 0 ? alatList.join(", ") : "Standar / Tidak Ada" },
  ], lx, lw);

  const leftEndY = doc.y;

  // ── KOLOM KANAN ────────────────────────────────────────
  doc.y = startY;
  const rx = ML + COL + 3;
  const rw = COL;

  // 4. Spesifikasi Pekerjaan (Checklist 2-kolom: 8 item)
  sec(doc, "Spesifikasi Pekerjaan", rx, rw);
  const spekItems: CItem[] = [
    { lbl: "Area Workshop",      val: data.spek_area_workshop },
    { lbl: "Ruang Tertutup",     val: data.spek_ruang_tertutup },
    { lbl: "Ketinggian",         val: data.spek_ketinggian },
    { lbl: "Tegangan Tinggi",    val: data.spek_tegangan_tinggi },
    { lbl: "Pemakaian LOTO",     val: data.spek_pemakaian_loto },
    { lbl: "Forklift",           val: data.spek_forklift },
    { lbl: "Temperatur Tinggi",  val: data.spek_temperatur_tinggi },
    { lbl: "Spesifikasi Lain",   val: data.spesifikasi_lainnya },
  ];
  checkGrid(doc, spekItems, rx, rw);

  // 5. Potensi Bahaya & Dampak (Checklist 2-kolom: 8 item)
  sec(doc, "Potensi Bahaya / Dampak K3", rx, rw);
  const bahayaItems: CItem[] = [
    { lbl: "Ledakan / Kebakaran",   val: data.dampak_ledakan_kebakaran },
    { lbl: "Jatuh dari Ketinggian", val: data.dampak_jatuh_ketinggian },
    { lbl: "Kepala / Kaki Tertimpa",val: bool(data.dampak_kepala_tertimpa) || bool(data.dampak_kaki_tertimpa) },
    { lbl: "Tersengat Listrik",     val: data.dampak_tersengat_listrik },
    { lbl: "Terjepit Mesin",        val: data.dampak_terjepit_mesin },
    { lbl: "Tumpahan B3 / Oli",     val: data.dampak_tumpahan_oli_bbm_b3 },
    { lbl: "Iritasi / Radiasi Las", val: bool(data.dampak_iritasi_mata) || bool(data.dampak_radiasi_sinar_las) },
    { lbl: "Bahaya Lainnya",        val: bool(data.dampak_kebisingan) || bool(data.dampak_keracunan_zat_kimia) || bool(data.dampak_lainnya) },
  ];
  checkGrid(doc, bahayaItems, rx, rw);

  // 6. APD (Alat Pelindung Diri) (Checklist 2-kolom: 6 item)
  sec(doc, "Alat Pelindung Diri (APD)", rx, rw);
  const apdItems: CItem[] = [
    { lbl: "Helm & Safety Shoes",   val: bool(data.apd_helm) && bool(data.apd_safety_shoes) },
    { lbl: "Masker / Masker Kimia", val: bool(data.apd_masker) || bool(data.apd_masker_kimia) },
    { lbl: "Kacamata (Safety/Las)", val: bool(data.apd_kacamata_biasa) || bool(data.apd_kacamata_las) },
    { lbl: "Sarung Tangan",         val: bool(data.apd_gloves) || bool(data.apd_sarung_tangan_bintil) || bool(data.apd_sarung_tangan_kulit) },
    { lbl: "Full Body Harness",     val: data.apd_full_body_harness },
    { lbl: "Ear Plug",              val: data.apd_ear_plug },
  ];
  checkGrid(doc, apdItems, rx, rw);

  const rightEndY = doc.y;
  doc.y = Math.max(leftEndY, rightEndY) + 2;

  // ── FULL WIDTH: Rincian Deskripsi Pekerjaan (jika ada) ──
  if (data.deskripsi_pekerjaan && String(data.deskripsi_pekerjaan).trim()) {
    doc.need(13);
    const by = doc.y;
    d.setFillColor(...C.s50);
    d.setDrawColor(...C.s300);
    d.setLineWidth(0.25);
    d.roundedRect(ML, by, CW, 11, 1, 1, "FD");

    // Gold accent bar on left
    d.setFillColor(...C.gold);
    d.rect(ML, by, 2.5, 11, "F");

    d.setFont(FF, "bold");
    d.setFontSize(6.5);
    d.setTextColor(...C.navy);
    d.text("DESKRIPSI PEKERJAAN:", ML + 5, by + 4);

    d.setFont(FF, "normal");
    d.setFontSize(6.5);
    d.setTextColor(...C.s700);
    const descLines = d.splitTextToSize(String(data.deskripsi_pekerjaan).trim(), CW - 10);
    d.text(descLines[0] ?? "-", ML + 5, by + 8);
    if (descLines[1]) {
      d.text(descLines[1], ML + 5, by + 11.5);
      doc.y = by + 14.5;
    } else {
      doc.y = by + 13;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — HOT WORK & WORKSHOP (2 kolom)
// ═══════════════════════════════════════════════════════════════════════════

function buildHotWorkWorkshop(doc: Doc, data: any, formType: FormType) {
  const d       = doc.d;
  const isWS    = formType === "workshop";
  const startY  = doc.y;

  // ── KOLOM KIRI ─────────────────────────────────────────
  const lx = ML;
  const lw = COL;

  // Informasi Dasar
  sec(doc, "Informasi Dasar", lx, lw);
  infoTable(doc, [
    { lbl: "No. Registrasi",   val: data.id_form },
    { lbl: "Lokasi Pekerjaan", val: data.lokasi_pekerjaan },
    { lbl: "Kontraktor / NIK", val: data.nama_kontraktor_nik },
    { lbl: "Pekerja / NIK",    val: data.nama_pekerja_nik },
    { lbl: "Waktu",            val: fmtT(data.waktu_pukul) },
  ], lx, lw);

  // Fire Watch & Pemberi Izin
  sec(doc, "Fire Watch & Pemberi Izin", lx, lw);
  infoTable(doc, [
    { lbl: "Nama Fire Watch", val: data.nama_fire_watch },
    { lbl: "NIK Fire Watch",  val: data.nik_fire_watch },
    { lbl: "Nama Pemberi SPV", val: data.spv_terkait },
    { lbl: "NIK Pemberi",     val: data.nik_pemberi_ijin },
  ], lx, lw);

  // Jenis Pekerjaan — box
  sec(doc, "Jenis Pekerjaan", lx, lw);
  const jenisAktif = [
    bool(data.preventive_genset_pump_room) && "Preventive Genset/Pump Room",
    bool(data.tangki_solar)               && "Tangki Solar",
    bool(data.panel_listrik)              && "Panel Listrik",
    isWS && bool(data.painting_spray)     && "Painting Spray",
    isWS && bool(data.painting_non_spray) && "Painting Non-Spray",
  ].filter(Boolean) as string[];

  if (jenisAktif.length > 0) {
    // Mini badge-list
    doc.need(8);
    const by = doc.y;
    d.setFillColor(...C.s50);
    d.setDrawColor(...C.s300);
    d.setLineWidth(0.15);
    d.roundedRect(lx, by, lw, 7, 1, 1, "FD");
    d.setFont(FF, "normal");
    d.setFontSize(6.5);
    d.setTextColor(...C.navy);
    d.text(jenisAktif.join("  ·  "), lx + 3, by + 4.5);
    doc.y = by + 9;
  }

  const leftBottomY = doc.y;

  // ── KOLOM KANAN (mulai dari startY) ───────────────────
  const rx = ML + COL + 3;
  const rw = COL;
  doc.y = startY;

  // Job Grid (2×2)
  sec(doc, "Detail Pekerjaan", rx, rw);
  jobGrid(doc, [
    { lbl: "Cutting",  detail: data.detail_cutting,  mulai: data.t_mulai_cutting,  selesai: data.t_selesai_cutting },
    { lbl: "Grinding", detail: data.detail_grinding, mulai: data.t_mulai_grinding, selesai: data.t_selesai_grinding },
    { lbl: "Welding",  detail: data.detail_welding,  mulai: data.t_mulai_welding,  selesai: data.t_selesai_welding },
    { lbl: "Painting", detail: data.detail_painting, mulai: data.t_mulai_painting, selesai: data.t_selesai_painting },
  ], rx, rw);

  // Permintaan Tambahan (kolom kanan)
  if (data.permintaan_tambahan) {
    doc.need(13);
    const py = doc.y;
    d.setFillColor(...C.a100);
    d.setDrawColor(...C.a700);
    d.setLineWidth(0.2);
    d.roundedRect(rx, py, rw, 11, 1, 1, "FD");
    d.setFont(FF, "bold");
    d.setFontSize(6);
    d.setTextColor(...C.a700);
    d.text("PERMINTAAN TAMBAHAN", rx + 3, py + 4.5);
    d.setFont(FF, "normal");
    d.setFontSize(6.5);
    d.setTextColor(...C.navy);
    const ls = d.splitTextToSize(data.permintaan_tambahan, rw - 6);
    d.text(ls[0] ?? "-", rx + 3, py + 8.5);
    doc.y = py + 13;
  }

  const rightBottomY = doc.y;

  // ── Kembali ke bawah kolom yang lebih panjang ──────────
  doc.y = Math.max(leftBottomY, rightBottomY) + 2;

  // ── FULL WIDTH: Checklist Upaya Pencegahan ──────────────
  sec(doc, "Upaya Pencegahan");
  if (formType === "workshop") {
    checkGrid(doc, WORKSHOP_CHECKLIST_ITEMS.map(([key, lbl]) => ({
      lbl,
      val: data.checklist_pencegahan?.[key],
    })));
  } else {
    checkGrid(doc, [
      { lbl: "Equipment/Tools kondisi baik", val: data.kondisi_tools_baik },
      { lbl: "APAR dan Hydrant tersedia", val: data.tersedia_apar_hydrant },
      { lbl: "Sensor smoke detector non-aktif", val: data.sensor_smoke_detector_non_aktif },
      { lbl: "APD lengkap", val: data.apd_lengkap },
      { lbl: "Tidak ada cairan mudah terbakar", val: data.tidak_ada_cairan_mudah_terbakar },
      { lbl: "Lantai bersih", val: data.lantai_bersih },
      { lbl: "Lantai sudah dibasahi", val: data.lantai_sudah_dibasahi },
      { lbl: "Cairan mudah terbakar tertutup", val: data.cairan_mudah_tebakar_tertutup },
      { lbl: "Lembaran dibawah pekerjaan", val: data.lembaran_dibawah_pekerjaan },
      { lbl: "Lindungi conveyor dll", val: data.lindungi_conveyor_dll },
      { lbl: "Alat telah bersih", val: data.alat_telah_bersih },
      { lbl: "Uap menyala telah dibuang", val: data.uap_menyala_telah_dibuang },
      { lbl: "Kerja pada dinding/langit-langit", val: data.kerja_pada_dinding_lagit },
      { lbl: "Bahan mudah terbakar dipindahkan", val: data.bahan_mudah_terbakar_dipindahkan_dari_dinding },
      { lbl: "Fire watch memastikan area aman", val: data.fire_watch_memastikan_area_aman },
      { lbl: "Fire watch terlatih", val: data.firwatch_terlatih },
    ]);
  }

  if (data.jumlah_fire_blanket) {
    infoTable(doc, [{ lbl: "Jumlah Fire Blanket", val: String(data.jumlah_fire_blanket) }]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — HEIGHT WORK (2 kolom)
// ═══════════════════════════════════════════════════════════════════════════

function buildHeightWork(doc: Doc, data: any) {
  const startY = doc.y;

  // ── KOLOM KIRI ─────────────────────────────────────────
  const lx = ML;
  const lw = COL;

  sec(doc, "Informasi Dasar", lx, lw);
  infoTable(doc, [
    { lbl: "Lokasi",              val: data.lokasi },
    { lbl: "Deskripsi",           val: data.deskripsi_pekerjaan },
    { lbl: "Tgl Pelaksanaan",     val: fmtD(data.tanggal_pelaksanaan) },
    { lbl: "Waktu Mulai",         val: fmtT(data.waktu_mulai) },
    { lbl: "Waktu Selesai",       val: fmtT(data.waktu_selesai) },
    { lbl: "Pengawas Kontraktor", val: data.nama_pengawas_kontraktor },
    { lbl: "Pengawas Dept",       val: data.nama_pengawas_departemen },
    { lbl: "Departemen",          val: data.nama_departemen },
    { lbl: "Nama Pemberi SPV",    val: data.spv_terkait },
  ], lx, lw);

  sec(doc, "Peminjaman APD", lx, lw);
  checkGrid(doc, [
    { lbl: "Kunci Pagar Tangga Listrik", val: data.ada_kunci_pagar },
    { lbl: "Rompi Ketinggian",           val: data.ada_rompi_ketinggian },
    { lbl: "Safety Helmet",              val: data.ada_safety_helmet },
    { lbl: "Full Body Harness",          val: data.ada_full_body_harmess },
  ], lx, lw);

  const leftBottomY = doc.y;

  // ── KOLOM KANAN ────────────────────────────────────────
  const rx = ML + COL + 3;
  const rw = COL;
  doc.y = startY;

  // Daftar Petugas
  const petugasList = Array.from({ length: 10 }, (_, i) => i + 1)
    .map(i => ({ idx: i, nama: data[`nama_petugas_${i}`] as string | undefined, sehat: bool(data[`petugas_${i}_sehat`]) }))
    .filter(p => p.nama);

  if (petugasList.length > 0) {
    sec(doc, "Daftar Petugas", rx, rw);
    checkGrid(doc, petugasList.map(p => ({ lbl: `${p.idx}. ${p.nama}`, val: p.sehat })), rx, rw);
  }

  // Helm, Body Harness & Lanyard
  sec(doc, "Cek Helm, Harness & Lanyard", rx, rw);
  checkGrid(doc, [
    { lbl: "Helm kondisi baik",       val: data.helm_kondisi_baik },
    { lbl: "Webbing kondisi baik",    val: data.webbing_kondisi_baik },
    { lbl: "D-Ring kondisi baik",     val: data.dring_kondisi_baik },
    { lbl: "Gesper kondisi baik",     val: data.gesper_kondisi_baik },
    { lbl: "Absorber & Timbes baik",  val: data.absorter_dan_timbes_kondisi_baik },
    { lbl: "Snap Hook kondisi baik",  val: data.snap_hook_kondisi_baik },
    { lbl: "Rope Lanyard baik",       val: data.rope_lanyard_kondisi_baik },
  ], rx, rw);

  const rightBottomY = doc.y;

  // ── FULL WIDTH: Keselamatan ─────────────────────────────
  doc.y = Math.max(leftBottomY, rightBottomY) + 2;

  sec(doc, "Keselamatan Kerja Ketinggian");
  checkGrid(doc, [
    { lbl: "Area diperiksa & aman",           val: data.area_diperiksa_aman },
    { lbl: "Paham alat pemadam kebakaran",    val: data.paham_cara_menggunakan_alat_pemadam_kebakaran },
    { lbl: "Ada pekerjaan listrik",           val: data.ada_kerja_listrik },
    { lbl: "Prosedur LOTO diterapkan",        val: data.prosedur_loto },
    { lbl: "Area bawah ditutup prisai",       val: data.menutupi_area_bawah_prisai },
    { lbl: "Safety line tersedia",            val: data.safetyline_tersedia },
    { lbl: "Alat bantu kerja aman",           val: data.alat_bantu_kerja_aman },
    { lbl: "Menggunakan rompi",               val: data.menggunakan_rompi },
    { lbl: "Beban tidak lebih dari 5kg",      val: data.beban_tidak_5kg },
    { lbl: "Helm sesuai SOP",                 val: data.helm_sesuai_sop },
    { lbl: "Rambu-rambu tersedia",            val: data.rambu2_tersedia },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// LAMPIRAN LISENSI — Halaman 2 khusus HEIGHT WORK PERMIT
//
// Sumber data: data[`foto_lisensi_${i}`] untuk i = 1..10
// Layout: grid 2 kolom, auto lanjut halaman jika foto banyak
// ═══════════════════════════════════════════════════════════════════════════

async function buildLisensiPage(doc: Doc, data: any) {
  const d = doc.d;

  // Kumpulkan semua petugas yang punya foto lisensi
  const petugas: Array<{ idx: number; nama: string; fotoUrl: string }> = [];
  for (let i = 1; i <= 10; i++) {
    const nama = data[`nama_petugas_${i}`];
    const foto = data[`foto_lisensi_${i}`];
    if (nama && foto) {
      petugas.push({ idx: i, nama: String(nama), fotoUrl: String(foto) });
    }
  }

  // Tambah halaman baru
  d.addPage();
  doc.pages++;
  doc.y = 14;

  // ── Header halaman lampiran ─────────────────────────────
  d.setFillColor(...C.navyDark);
  d.rect(0, 0, PW, 16, "F");
  d.setFillColor(...C.gold);
  d.rect(0, 16, PW, 0.6, "F");

  d.setFont(FF, "bold");
  d.setFontSize(9);
  d.setTextColor(...C.white);
  d.text("LAMPIRAN LISENSI KERJA KETINGGIAN", ML, 10);

  d.setFont(FF, "normal");
  d.setFontSize(7);
  d.setTextColor(...C.goldPale);
  d.text(`HEIGHT WORK PERMIT — ${data.id_form ?? ""}`, ML, 14.5);

  doc.y = 22; // mulai konten setelah header lampiran

  if (petugas.length === 0) {
    // Tidak ada foto lisensi
    d.setFillColor(...C.s100);
    d.setDrawColor(...C.s300);
    d.setLineWidth(0.2);
    d.roundedRect(ML, doc.y, CW, 12, 1, 1, "FD");
    d.setFont(FF, "normal");
    d.setFontSize(7);
    d.setTextColor(...C.s500);
    d.text("Tidak ada foto lisensi yang terlampir.", ML + 4, doc.y + 7.5);
    doc.y += 14;
    return;
  }

  // ── Grid 2 kolom ───────────────────────────────────────
  const COLS     = 2;
  const GAP      = 4;          // mm antar kolom
  const cW       = (CW - GAP) / COLS;  // ~93mm
  const IMG_H    = 60;         // mm tinggi foto
  const LABEL_H  = 8;          // mm tinggi label nama
  const CARD_H   = IMG_H + LABEL_H + 8; // 76mm total card
  const CARD_GAP = 5;          // mm antar baris

  for (let i = 0; i < petugas.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    // Mulai baris baru
    if (col === 0) {
      doc.need(CARD_H + CARD_GAP + 4);
    }

    const cx = ML + col * (cW + GAP);
    // Hitung cy berdasarkan baris — setelah doc.need berpotensi tambah halaman
    // Untuk baris pertama di halaman baru, cy = doc.y (sudah diset oleh need/addPage)
    // Untuk kolom kanan (col=1) dalam baris yang sama, cy harus sama dengan kolom kiri
    const cy = col === 0
      ? doc.y
      : doc.y; // kedua kolom di baris yang sama selalu doc.y saat col===0

    // Simpan Y awal baris saat kita di kolom kiri
    if (col === 0 && i > 0) {
      // advance doc.y ke baris berikutnya
      // (sudah dilakukan oleh increment di akhir baris sebelumnya)
    }

    const p = petugas[i];

    // ── Card background ──────────────────────────────────
    d.setFillColor(...C.s50);
    d.setDrawColor(...C.s300);
    d.setLineWidth(0.2);
    d.roundedRect(cx, cy, cW, CARD_H, 1.5, 1.5, "FD");

    // ── Label header card ────────────────────────────────
    d.setFillColor(...C.navy);
    d.roundedRect(cx, cy, cW, LABEL_H, 1.5, 1.5, "F");
    d.rect(cx, cy + LABEL_H - 3, cW, 3, "F");

    d.setFont(FF, "bold");
    d.setFontSize(6.5);
    d.setTextColor(...C.white);
    d.text(`Petugas ${p.idx}`, cx + 3, cy + 3.5);

    d.setFont(FF, "normal");
    d.setFontSize(6.5);
    d.setTextColor(...C.goldPale);
    const namaLs = d.splitTextToSize(p.nama, cW - 30);
    d.text(namaLs[0] ?? p.nama, cx + 3, cy + 7);

    // ── Foto lisensi ────────────────────────────────────
    const imgX = cx + 2;
    const imgY = cy + LABEL_H + 2;
    const imgW = cW - 4;

    try {
      // Fetch foto sebagai base64
      const fotoUrl = p.fotoUrl.startsWith("http")
        ? p.fotoUrl
        : (typeof window !== "undefined" ? window.location.origin : "") + p.fotoUrl;

      const resp   = await fetch(fotoUrl);
      const blob   = await resp.blob();
      const b64    = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(",")[1]);
        reader.onerror = () => rej(new Error("read failed"));
        reader.readAsDataURL(blob);
      });
      const mime = blob.type || "image/jpeg";
      const fmt  = mime.includes("png") ? "PNG" : "JPEG";

      d.addImage(`data:${mime};base64,${b64}`, fmt, imgX, imgY, imgW, IMG_H, undefined, "FAST");
    } catch {
      // Jika foto gagal dimuat — tampilkan placeholder
      d.setFillColor(...C.s100);
      d.rect(imgX, imgY, imgW, IMG_H, "F");
      d.setFont(FF, "normal");
      d.setFontSize(6.5);
      d.setTextColor(...C.s500);
      d.text("Foto tidak tersedia", imgX + imgW / 2, imgY + IMG_H / 2, { align: "center" });
    }

    // ── Advance doc.y setelah kolom kanan atau petugas terakhir ──
    if (col === COLS - 1 || i === petugas.length - 1) {
      doc.y = cy + CARD_H + CARD_GAP;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

export async function generatePermitPdf(data: any, formType: FormType): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const jenisPermit = JENIS_LABEL[formType] ?? formType.toUpperCase();
  const isEksternal = formType === "general-permit" ? true : data.tipe_perusahaan === "eksternal";
  const tipePermit  = formType === "general-permit" ? "eksternal" : (data.tipe_perusahaan ?? "internal");
  const generatedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const jd  = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const doc = new Doc(jd, 0);

  // ── Halaman 1: Header ──────────────────────────────────
  drawWatermark(doc.d);
  await drawHeader(doc, jenisPermit, data.id_form ?? "-", data.status ?? "submitted",
    data.tanggal ?? null, data.tanggal_pelaksanaan ?? null, tipePermit);

  // ── Konten form ────────────────────────────────────────
  if (formType === "general-permit") {
    buildGeneralPermit(doc, data);
  } else if (formType === "hot-work" || formType === "workshop") {
    buildHotWorkWorkshop(doc, data, formType);
  } else {
    buildHeightWork(doc, data);
  }

  // ── JSA ────────────────────────────────────────────────
  sec(doc, "Dokumen JSA");
  await jsaSection(doc, bool(data.perlu_jsa), data.jsa_file_url, data.jsa_data);

  // ── Catatan Reject ─────────────────────────────────────
  if (data.catatan_reject) {
    doc.need(14);
    const ry = doc.y;
    const d  = doc.d;
    d.setFillColor(...C.r100);
    d.setDrawColor(...C.r600);
    d.setLineWidth(0.3);
    d.roundedRect(ML, ry, CW, 12, 1, 1, "FD");
    d.setFont(FF, "bold");
    d.setFontSize(7);
    d.setTextColor(...C.r600);
    d.text("CATATAN PENOLAKAN", ML + 3, ry + 5);
    d.setFont(FF, "normal");
    d.setFontSize(7);
    d.setTextColor(185, 28, 28);
    const ls = d.splitTextToSize(data.catatan_reject, CW - 6);
    d.text(ls[0] ?? "-", ML + 3, ry + 9.5);
    doc.y = ry + 15;
  }

  // ── Approval Grid ──────────────────────────────────────
  sec(doc, "Persetujuan & Verifikasi QR");

  const approvers: Approver[] = [];
  if (formType === "general-permit") {
    approvers.push(
      {
        lbl: "Kontraktor", role: "kontraktor",
        approved: Boolean(data.kontraktor_signature_url || data.kontraktor_pj),
        approvedBy: data.kontraktor_pj || data.nama_kontraktor_pekerja,
        approvedNik: null,
        approvedAt: data.tanggal,
      },
      {
        lbl: "SPV Terkait", role: "spv",
        approved: data.spv_approved,
        approvedBy: data.spv_approved_by ?? data.spv_terkait_pj,
        approvedNik: data.spv_nik ?? data.nik_spv_terkait_pj,
        approvedAt: data.spv_approved_at,
      },
      {
        lbl: "Admin K3", role: "admin_k3",
        approved: data.admin_k3_approved,
        approvedBy: data.admin_k3_approved_by,
        approvedNik: data.admin_k3_nik,
        approvedAt: data.admin_k3_approved_at,
      },
      {
        lbl: "SFO", role: "sfo",
        approved: data.sfo_approved,
        approvedBy: data.sfo_approved_by,
        approvedNik: data.sfo_nik,
        approvedAt: data.sfo_approved_at,
      },
      {
        lbl: "SMR / PGA Mgr", role: "pga",
        approved: data.pga_approved,
        approvedBy: data.pga_approved_by,
        approvedNik: data.pga_nik,
        approvedAt: data.pga_approved_at,
      },
      {
        lbl: "Security", role: "security",
        approved: data.security_approved,
        approvedBy: data.security_approved_by,
        approvedNik: data.security_nik,
        approvedAt: data.security_approved_at,
      },
    );
  } else {
    if (isEksternal) {
      approvers.push({
        lbl: "Kontraktor", role: "kontraktor",
        approved: data.kontraktor_approved, approvedBy: data.kontraktor_approved_by,
        approvedNik: data.kontraktor_nik, approvedAt: data.kontraktor_approved_at,
      });
    }
    approvers.push(
      { lbl: "SPV Terkait",  role: "spv",      approved: data.spv_approved,      approvedBy: data.spv_approved_by ?? data.spv_terkait,      approvedNik: data.spv_nik,      approvedAt: data.spv_approved_at },
      { lbl: "Admin K3",     role: "admin_k3", approved: data.admin_k3_approved,  approvedBy: data.admin_k3_approved_by,                     approvedNik: data.admin_k3_nik, approvedAt: data.admin_k3_approved_at },
      { lbl: "SFO",          role: "sfo",      approved: data.sfo_approved,       approvedBy: data.sfo_approved_by ?? data.sfo,               approvedNik: data.sfo_nik,      approvedAt: data.sfo_approved_at },
      { lbl: "MR / PGA Mgr", role: "mr_pga",   approved: data.mr_pga_approved,    approvedBy: data.mr_pga_approved_by ?? data.mr_pga_mgr,     approvedNik: data.mr_pga_nik,   approvedAt: data.mr_pga_approved_at },
    );
  }

  await approvalGrid(doc, approvers, data.id_form ?? "", formType);

  // ── Lampiran Lisensi HEW (halaman 2+) ───────────────────
  if (formType === "height-work") {
    await buildLisensiPage(doc, data);
  }

  // ── Watermark semua halaman ────────────────────────────
  const total = (doc.d.internal as any).getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.d.setPage(p);
    drawWatermark(doc.d);
  }

  // ── Footer semua halaman ───────────────────────────────
  drawFooters(doc.d, total, generatedAt);

  // ── Download ───────────────────────────────────────────
  const safe = (data.id_form ?? "permit").replace(/[^a-zA-Z0-9\-_]/g, "_");
  doc.d.save(`Permit_${safe}.pdf`);
}

export async function generatePermitPdfBlob(data: any, formType: FormType): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
 
  const jenisPermit = JENIS_LABEL[formType] ?? formType.toUpperCase();
  const isEksternal = formType === "general-permit" ? true : data.tipe_perusahaan === "eksternal";
  const tipePermit  = formType === "general-permit" ? "eksternal" : (data.tipe_perusahaan ?? "internal");
  const generatedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
 
  const jd  = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const doc = new Doc(jd, 0);
 
  // ── Halaman 1: Header ──────────────────────────────────
  drawWatermark(doc.d);
  await drawHeader(doc, jenisPermit, data.id_form ?? "-", data.status ?? "submitted",
    data.tanggal ?? null, data.tanggal_pelaksanaan ?? null, tipePermit);
 
  // ── Konten form ────────────────────────────────────────
  if (formType === "general-permit") {
    buildGeneralPermit(doc, data);
  } else if (formType === "hot-work" || formType === "workshop") {
    buildHotWorkWorkshop(doc, data, formType);
  } else {
    buildHeightWork(doc, data);
  }

  // ── JSA ────────────────────────────────────────────────
  sec(doc, "Dokumen JSA");
  await jsaSection(doc, bool(data.perlu_jsa), data.jsa_file_url, data.jsa_data);

  // ── Catatan Reject ─────────────────────────────────────
  if (data.catatan_reject) {
    doc.need(14);
    const ry = doc.y;
    const d  = doc.d;
    d.setFillColor(...C.r100);
    d.setDrawColor(...C.r600);
    d.setLineWidth(0.3);
    d.roundedRect(ML, ry, CW, 12, 1, 1, "FD");
    d.setFont(FF, "bold");
    d.setFontSize(7);
    d.setTextColor(...C.r600);
    d.text("CATATAN PENOLAKAN", ML + 3, ry + 5);
    d.setFont(FF, "normal");
    d.setFontSize(7);
    d.setTextColor(185, 28, 28);
    const ls = d.splitTextToSize(data.catatan_reject, CW - 6);
    d.text(ls[0] ?? "-", ML + 3, ry + 9.5);
    doc.y = ry + 15;
  }

  // ── Approval Grid ──────────────────────────────────────
  sec(doc, "Persetujuan & Verifikasi QR");

  const approvers: Approver[] = [];
  if (formType === "general-permit") {
    approvers.push(
      {
        lbl: "Kontraktor", role: "kontraktor",
        approved: Boolean(data.kontraktor_signature_url || data.kontraktor_pj),
        approvedBy: data.kontraktor_pj || data.nama_kontraktor_pekerja,
        approvedNik: null,
        approvedAt: data.tanggal,
      },
      {
        lbl: "SPV Terkait", role: "spv",
        approved: data.spv_approved,
        approvedBy: data.spv_approved_by ?? data.spv_terkait_pj,
        approvedNik: data.spv_nik ?? data.nik_spv_terkait_pj,
        approvedAt: data.spv_approved_at,
      },
      {
        lbl: "Admin K3", role: "admin_k3",
        approved: data.admin_k3_approved,
        approvedBy: data.admin_k3_approved_by,
        approvedNik: data.admin_k3_nik,
        approvedAt: data.admin_k3_approved_at,
      },
      {
        lbl: "SFO", role: "sfo",
        approved: data.sfo_approved,
        approvedBy: data.sfo_approved_by,
        approvedNik: data.sfo_nik,
        approvedAt: data.sfo_approved_at,
      },
      {
        lbl: "SMR / PGA Mgr", role: "pga",
        approved: data.pga_approved,
        approvedBy: data.pga_approved_by,
        approvedNik: data.pga_nik,
        approvedAt: data.pga_approved_at,
      },
      {
        lbl: "Security", role: "security",
        approved: data.security_approved,
        approvedBy: data.security_approved_by,
        approvedNik: data.security_nik,
        approvedAt: data.security_approved_at,
      },
    );
  } else {
    if (isEksternal) {
      approvers.push({
        lbl: "Kontraktor", role: "kontraktor",
        approved: data.kontraktor_approved, approvedBy: data.kontraktor_approved_by,
        approvedNik: data.kontraktor_nik, approvedAt: data.kontraktor_approved_at,
      });
    }
    approvers.push(
      { lbl: "SPV Terkait",  role: "spv",      approved: data.spv_approved,      approvedBy: data.spv_approved_by ?? data.spv_terkait,      approvedNik: data.spv_nik,      approvedAt: data.spv_approved_at },
      { lbl: "Admin K3",     role: "admin_k3", approved: data.admin_k3_approved,  approvedBy: data.admin_k3_approved_by,                     approvedNik: data.admin_k3_nik, approvedAt: data.admin_k3_approved_at },
      { lbl: "SFO",          role: "sfo",      approved: data.sfo_approved,       approvedBy: data.sfo_approved_by ?? data.sfo,               approvedNik: data.sfo_nik,      approvedAt: data.sfo_approved_at },
      { lbl: "MR / PGA Mgr", role: "mr_pga",   approved: data.mr_pga_approved,    approvedBy: data.mr_pga_approved_by ?? data.mr_pga_mgr,     approvedNik: data.mr_pga_nik,   approvedAt: data.mr_pga_approved_at },
    );
  }
 
  await approvalGrid(doc, approvers, data.id_form ?? "", formType);
 
  // ── Lampiran Lisensi HEW (halaman 2+) ───────────────────
  if (formType === "height-work") {
    await buildLisensiPage(doc, data);
  }
 
  // ── Watermark semua halaman ────────────────────────────
  const total = (doc.d.internal as any).getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.d.setPage(p);
    drawWatermark(doc.d);
  }
 
  // ── Footer semua halaman ───────────────────────────────
  drawFooters(doc.d, total, generatedAt);
 
  // ── Kembalikan sebagai Blob (TIDAK download) ───────────
  return doc.d.output("blob");
}