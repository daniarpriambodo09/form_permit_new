// components/PenilaianSubkontraktorSection.tsx
// Lampiran "Form Penilaian Sub Kontraktor" untuk Ijin Kerja Eksternal —
// Diisi dan disetujui oleh Pengawas Dept per hari kerja (berdasarkan rentang
// tanggal ijin kerja), lalu diteruskan ke Purchasing, dan selanjutnya SFO.

"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  QrCode,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useAppUrl } from "@/lib/useAppUrl";

export type PenilaianRating = "baik_sekali" | "baik" | "sedang" | "kurang" | "";

export interface PenilaianItems {
  kelengkapanApd: PenilaianRating;
  kedisiplinanApd: PenilaianRating;
  adanyaPengawasan: PenilaianRating;
  bekerjaSesuaiIjin: PenilaianRating;
  kepatuhanPeraturan: PenilaianRating;
  bekerjaAman: PenilaianRating;
  tidakAdaKecelakaan: PenilaianRating;
}

export interface PenilaianEntry {
  tanggal: string; // "YYYY-MM-DD"
  items: PenilaianItems;
  catatan: string;
  filledBy?: string | null;
  filledAt?: string | null;
}

export interface MengetahuiRow {
  nama: string;
  tanggal: string; // "YYYY-MM-DD"
  nik?: string;
}

export interface PenilaianSubkontraktorData {
  entries: PenilaianEntry[];
  mengetahui: {
    sfo: MengetahuiRow;
    purchasing: MengetahuiRow;
    pengawasDept?: MengetahuiRow;
    picDept?: MengetahuiRow; // backward compatibility
  };
}

export const emptyItems = (): PenilaianItems => ({
  kelengkapanApd: "",
  kedisiplinanApd: "",
  adanyaPengawasan: "",
  bekerjaSesuaiIjin: "",
  kepatuhanPeraturan: "",
  bekerjaAman: "",
  tidakAdaKecelakaan: "",
});

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const createEmptyPenilaianEntry = (tanggal?: string): PenilaianEntry => ({
  tanggal: tanggal || todayStr(),
  items: emptyItems(),
  catatan: "",
});

export const createEmptyPenilaianSubkontraktor = (): PenilaianSubkontraktorData => ({
  entries: [],
  mengetahui: {
    sfo: { nama: "", tanggal: "", nik: "" },
    purchasing: { nama: "", tanggal: "", nik: "" },
    pengawasDept: { nama: "", tanggal: "", nik: "" },
    picDept: { nama: "", tanggal: "", nik: "" },
  },
});

export function getDaysRange(start?: string | null, end?: string | null): string[] {
  if (!start || !end) return [];
  const sStr = String(start).slice(0, 10);
  const eStr = String(end).slice(0, 10);
  const d1 = new Date(sStr + "T00:00:00Z");
  const d2 = new Date(eStr + "T00:00:00Z");
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d1 > d2) return [];
  const days: string[] = [];
  const cur = new Date(d1);
  while (cur <= d2 && days.length < 60) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export const ITEM_LABELS: { key: keyof PenilaianItems; label: string; desc: string }[] = [
  { key: "kelengkapanApd", label: "Kelengkapan APD", desc: "APD yang dibawa harus sesuai dengan Form Ijin Kerja" },
  { key: "kedisiplinanApd", label: "Kedisiplinan Penggunaan APD", desc: "APD harus digunakan sesuai jenis pekerjaannya" },
  { key: "adanyaPengawasan", label: "Adanya Pengawasan", desc: "Pengawas subcont wajib memantau pekerjaan yang dilakukan" },
  { key: "bekerjaSesuaiIjin", label: "Bekerja Sesuai dengan Ijin Kerja", desc: "Pelaksanaan pekerjaan harus sesuai dengan izin kerja" },
  { key: "kepatuhanPeraturan", label: "Kepatuhan terhadap Peraturan PT. JAI", desc: "Wajib mematuhi peraturan dan OS yang berlaku" },
  { key: "bekerjaAman", label: "Bekerja dengan Aman dan Selamat", desc: "Tidak berpotensi mengganggu keselamatan orang lain & diri sendiri" },
  { key: "tidakAdaKecelakaan", label: "Tidak Ada Kecelakaan Kerja", desc: "Nir kecelakaan (zero accident) selama pelaksanaan pekerjaan" },
];

export const RATING_OPTIONS: { value: PenilaianRating; label: string; short: string; badgeColor: string }[] = [
  { value: "baik_sekali", label: "Baik Sekali", short: "B. Sekali", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "baik", label: "Baik", short: "Baik", badgeColor: "bg-teal-100 text-teal-800 border-teal-300" },
  { value: "sedang", label: "Sedang", short: "Sedang", badgeColor: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "kurang", label: "Kurang", short: "Kurang", badgeColor: "bg-rose-100 text-rose-800 border-rose-300" },
];

const inputCls = "w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white placeholder:text-slate-400 transition-colors";

// ── Subkomponen Barcode Mengetahui ──────────────────────────────────────────
function MengetahuiBarcodeCard({
  roleKey,
  label,
  row,
  formId,
  readOnly,
  onUpdate,
  currentUserName,
  currentUserNik,
}: {
  roleKey: "sfo" | "purchasing" | "pengawasDept" | "picDept";
  label: string;
  row: MengetahuiRow;
  formId?: string;
  readOnly?: boolean;
  onUpdate: (patch: Partial<MengetahuiRow>) => void;
  currentUserName?: string | null;
  currentUserNik?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [tempNama, setTempNama] = useState(row.nama || currentUserName || "");
  const [tempNik, setTempNik] = useState(row.nik || currentUserNik || "");
  const [tempTanggal, setTempTanggal] = useState(row.tanggal || todayStr());
  const appUrl = useAppUrl();

  const hasApproved = Boolean(row.nama && row.nama.trim() !== "");
  const isSfo = roleKey === "sfo";

  useEffect(() => {
    if (!hasApproved || !canvasRef.current || !appUrl) return;

    const targetFormId = formId || "unknown";
    const mappedRole = roleKey === "picDept" ? "pengawasDept" : roleKey;
    const verifyUrl = `${appUrl}/approval-verification/penilaian-subkontraktor/${encodeURIComponent(targetFormId)}/${encodeURIComponent(mappedRole)}`;

    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: 105,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(() => setQrReady(true))
      .catch((err) => {
        console.error("Gagal generate QR Mengetahui:", err);
        setQrReady(false);
      });
  }, [hasApproved, row.nama, roleKey, formId, appUrl]);

  const handleApplyForm = () => {
    if (!tempNama.trim()) return;
    onUpdate({
      nama: tempNama.trim(),
      nik: tempNik.trim(),
      tanggal: tempTanggal || todayStr(),
    });
    setShowInputForm(false);
  };

  const handleReset = () => {
    if (confirm(`Hapus barcode persetujuan ${label}?`)) {
      onUpdate({ nama: "", nik: "", tanggal: "" });
      setTempNama(currentUserName || "");
      setTempNik(currentUserNik || "");
      setTempTanggal(todayStr());
    }
  };

  return (
    <div
      className={`border rounded-xl p-3 flex flex-col justify-between transition-all ${
        hasApproved
          ? "bg-white border-emerald-200/90 shadow-2xs"
          : isSfo
          ? "bg-slate-50/80 border-slate-200"
          : "bg-slate-50/50 border-slate-200"
      }`}
    >
      {/* Header Card */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          {hasApproved ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            {label}
          </p>
        </div>
        {hasApproved ? (
          <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
            ✓ Selesai
          </span>
        ) : (
          <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-slate-200 text-slate-600">
            Menunggu
          </span>
        )}
      </div>

      {/* Main Barcode Display */}
      <div className="flex-1 flex flex-col items-center justify-center py-1 min-h-[140px]">
        {hasApproved ? (
          <div className="flex flex-col items-center">
            <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <canvas
                ref={canvasRef}
                className={qrReady ? "block rounded" : "hidden"}
              />
              {!qrReady && (
                <div className="w-[105px] h-[105px] flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-800 mt-1.5 truncate max-w-[140px] text-center">
              {row.nama}
            </p>
            <p className="text-[9px] text-slate-400 font-mono text-center">
              {row.tanggal || todayStr()}
            </p>
            {!readOnly && !isSfo && (
              <button
                type="button"
                onClick={handleReset}
                className="mt-1 text-[9px] text-rose-500 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset
              </button>
            )}
          </div>
        ) : showInputForm && !readOnly && !isSfo ? (
          <div className="w-full space-y-1.5 bg-slate-100/60 p-2.5 rounded-lg border border-slate-200">
            <p className="text-[10px] font-bold text-slate-700">Data Persetujuan {label}</p>
            <input
              type="text"
              placeholder="Nama Lengkap"
              value={tempNama}
              onChange={(e) => setTempNama(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <input
              type="text"
              placeholder="NIK"
              value={tempNik}
              onChange={(e) => setTempNik(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <input
              type="date"
              value={tempTanggal}
              onChange={(e) => setTempTanggal(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleApplyForm}
                disabled={!tempNama.trim()}
                className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" />
                Buat Barcode
              </button>
              <button
                type="button"
                onClick={() => setShowInputForm(false)}
                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 py-2 text-center">
            <div className="w-10 h-10 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-white mb-1.5">
              <QrCode className="w-5 h-5 text-slate-300" />
            </div>
            {isSfo ? (
              <>
                <p className="text-[11px] font-semibold text-slate-600">Menunggu Approval SFO</p>
                <p className="text-[9px] text-slate-400 italic max-w-[150px] mt-0.5">
                  Barcode otomatis terbentuk saat SFO menyetujui form
                </p>
              </>
            ) : !readOnly ? (
              <div className="flex flex-col items-center gap-1">
                <p className="text-[11px] font-semibold text-slate-600">Belum Ada Barcode</p>
                <button
                  type="button"
                  onClick={() => setShowInputForm(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Bubuhkan TTD
                </button>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-slate-500">Belum Ada Barcode</p>
                <p className="text-[9px] text-slate-400 italic">Menunggu otorisasi {label}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  value: PenilaianSubkontraktorData;
  setValue: (value: PenilaianSubkontraktorData) => void;
  readOnly?: boolean;
  onSave?: (data: PenilaianSubkontraktorData) => Promise<void>;
  currentUserName?: string | null;
  currentUserNik?: string | null;
  formId?: string;
  tanggalDari?: string | null;
  tanggalSampai?: string | null;
  hideHeader?: boolean;
}

export default function PenilaianSubkontraktorSection({
  value,
  setValue,
  readOnly = false,
  onSave,
  currentUserName,
  currentUserNik,
  formId,
  tanggalDari,
  tanggalSampai,
  hideHeader = false,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [viewAllDays, setViewAllDays] = useState(false);

  const safeValue = value ?? createEmptyPenilaianSubkontraktor();
  const entries = Array.isArray(safeValue.entries) ? safeValue.entries : [];
  const mengetahui = safeValue.mengetahui ?? createEmptyPenilaianSubkontraktor().mengetahui;

  const targetDates = getDaysRange(tanggalDari, tanggalSampai);
  const maxEntries = targetDates.length > 0 ? targetDates.length : 30;

  // Sinkronisasi otomatis entri checklist jika tanggal kerja diketahui dan entries masih kosong
  useEffect(() => {
    if (readOnly) return;
    if (targetDates.length > 0 && entries.length === 0) {
      const generated = targetDates.map((d) => createEmptyPenilaianEntry(d));
      setValue({
        ...safeValue,
        entries: generated,
      });
    }
  }, [tanggalDari, tanggalSampai, readOnly, entries.length]);

  const updateEntry = (idx: number, patch: Partial<PenilaianEntry>) => {
    const nextEntries = entries.length > 0 ? [...entries] : [...displayEntries];
    while (nextEntries.length <= idx) {
      const d = targetDates[nextEntries.length] || todayStr();
      nextEntries.push(createEmptyPenilaianEntry(d));
    }
    nextEntries[idx] = { ...nextEntries[idx], ...patch };
    setValue({ ...safeValue, entries: nextEntries, mengetahui });
  };

  const updateItem = (idx: number, key: keyof PenilaianItems, rating: PenilaianRating) => {
    const nextEntries = entries.length > 0 ? [...entries] : [...displayEntries];
    while (nextEntries.length <= idx) {
      const d = targetDates[nextEntries.length] || todayStr();
      nextEntries.push(createEmptyPenilaianEntry(d));
    }
    nextEntries[idx] = { ...nextEntries[idx], items: { ...(nextEntries[idx]?.items ?? {}), [key]: rating } };
    setValue({ ...safeValue, entries: nextEntries, mengetahui });
  };

  const addEntry = () => {
    if (entries.length >= maxEntries) return;
    setValue({ ...safeValue, entries: [...entries, createEmptyPenilaianEntry()], mengetahui });
  };

  const removeEntry = (idx: number) => {
    const nextEntries = entries.filter((_, i) => i !== idx);
    setValue({ ...safeValue, entries: nextEntries, mengetahui });
  };

  const saveEntry = async (idx: number) => {
    if (!onSave) return;
    setSavingIdx(idx);
    try {
      const nextEntries = entries.length > 0 ? [...entries] : [...displayEntries];
      while (nextEntries.length <= idx) {
        const d = targetDates[nextEntries.length] || todayStr();
        nextEntries.push(createEmptyPenilaianEntry(d));
      }
      nextEntries[idx] = {
        ...nextEntries[idx],
        filledBy: nextEntries[idx].filledBy ?? currentUserName ?? "Pengawas Dept",
        filledAt: nextEntries[idx].filledAt ?? new Date().toISOString(),
      };
      const next = { ...safeValue, entries: nextEntries, mengetahui };
      setValue(next);
      await onSave(next);
    } finally {
      setSavingIdx(null);
    }
  };

  const updateMengetahui = (row: "sfo" | "purchasing" | "pengawasDept" | "picDept", patch: Partial<MengetahuiRow>) => {
    const updated = {
      ...mengetahui,
      [row]: { ...(mengetahui[row as keyof typeof mengetahui] ?? { nama: "", tanggal: "" }), ...patch },
    };

    if (row === "pengawasDept" || row === "picDept") {
      const merged = { ...((mengetahui.pengawasDept || mengetahui.picDept) ?? { nama: "", tanggal: "" }), ...patch };
      updated.pengawasDept = merged;
      updated.picDept = merged;
    }

    setValue({
      ...safeValue,
      entries,
      mengetahui: updated,
    });
  };

  const saveMengetahui = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({ ...safeValue, entries, mengetahui });
    } finally {
      setSaving(false);
    }
  };

  const displayEntries: PenilaianEntry[] = (() => {
    if (targetDates.length > 0) {
      const merged: PenilaianEntry[] = targetDates.map((d, i) => {
        const matched = entries.find((e) => e.tanggal && e.tanggal.slice(0, 10) === d) || entries[i];
        if (matched) {
          return {
            ...matched,
            tanggal: matched.tanggal ? matched.tanggal.slice(0, 10) : d,
            items: { ...emptyItems(), ...(matched.items || {}) },
            catatan: matched.catatan || "",
          };
        }
        return createEmptyPenilaianEntry(d);
      });

      if (entries.length > targetDates.length) {
        for (let i = targetDates.length; i < entries.length; i++) {
          merged.push({
            ...entries[i],
            items: { ...emptyItems(), ...(entries[i].items || {}) },
            catatan: entries[i].catatan || "",
          });
        }
      }

      return merged;
    }

    if (entries.length > 0) {
      return entries.map((e) => ({
        ...e,
        items: { ...emptyItems(), ...(e.items || {}) },
        catatan: e.catatan || "",
      }));
    }

    return [createEmptyPenilaianEntry(tanggalDari ? String(tanggalDari).slice(0, 10) : todayStr())];
  })();

  const activeEntry = displayEntries[activeDayIdx] || displayEntries[0];

  return (
    <section className={hideHeader ? "space-y-3.5" : "bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs"}>
      {!hideHeader && (
        <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 sm:px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-800">Form Penilaian Sub Kontraktor</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Checklist inspeksi harian K3 ({displayEntries.length} hari) &amp; persetujuan digital
              </p>
            </div>
            {tanggalDari && tanggalSampai && (
              <div className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-md text-[10px] font-bold text-amber-800">
                {tanggalDari} s/d {tanggalSampai} ({targetDates.length} Hari)
              </div>
            )}
          </div>
        </div>
      )}

      <div className={hideHeader ? "space-y-3.5" : "p-4 sm:p-5 space-y-4"}>
        {/* ── Day Tabs Switcher (Membuat UI jauh lebih ringkas & rapi jika lebih dari 1 hari) ── */}
        {displayEntries.length > 1 && (
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              {displayEntries.map((entry, idx) => {
                const filled = Object.values(entry.items || {}).filter(Boolean).length;
                const isActive = activeDayIdx === idx && !viewAllDays;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveDayIdx(idx);
                      setViewAllDays(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                      isActive
                        ? "bg-orange-500 text-white border-orange-600 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Hari {idx + 1}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isActive
                          ? "bg-white/20 text-white"
                          : filled === 7
                          ? "bg-emerald-100 text-emerald-800 font-bold"
                          : filled > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200/80 text-slate-500"
                      }`}
                    >
                      {filled === 7 ? "✓ 7/7" : `${filled}/7`}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setViewAllDays(!viewAllDays)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                viewAllDays
                  ? "bg-orange-50 text-orange-700 border-orange-300"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {viewAllDays ? "Tampilkan Per Hari" : "Lihat Semua Hari"}
            </button>
          </div>
        )}

        {/* ── Render Inspection Day(s) ── */}
        {(viewAllDays ? displayEntries : [activeEntry]).map((entry, renderIdx) => {
          const actualIdx = viewAllDays ? renderIdx : activeDayIdx;
          const filledCount = Object.values(entry.items || {}).filter(Boolean).length;

          return (
            <div
              key={actualIdx}
              className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs bg-white space-y-0"
            >
              {/* Header Inspeksi */}
              <div className="bg-slate-50/70 border-b border-slate-200/80 px-3.5 py-2.5 flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Inspeksi Hari ke-{actualIdx + 1}
                  </span>
                  {filledCount === 0 ? (
                    <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      Belum Diisi
                    </span>
                  ) : filledCount < 7 ? (
                    <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {filledCount} / 7 Terisi
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Lengkap (7/7)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-500">Tanggal:</span>
                  <input
                    type="date"
                    value={entry.tanggal}
                    disabled={readOnly}
                    onChange={(e) => updateEntry(actualIdx, { tanggal: e.target.value })}
                    className="px-2 py-0.5 border border-slate-200 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                  />
                  {!readOnly && targetDates.length === 0 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(actualIdx)}
                      className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Hapus checklist ini"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Table Layout Rapi & Responsif (Memperbaiki error kolom terlalu sempit) ── */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[540px]">
                  <thead>
                    <tr className="bg-slate-100/75 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2 px-2.5 text-center w-8">No</th>
                      <th className="py-2 px-3">Item Pengecekan K3</th>
                      {RATING_OPTIONS.map((opt) => (
                        <th key={opt.value} className="py-2 px-1 text-center w-20">
                          {opt.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {ITEM_LABELS.map((item, rowNo) => {
                      const currentRating = entry.items[item.key];
                      return (
                        <tr
                          key={item.key}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {/* No */}
                          <td className="py-2 px-2.5 text-center font-mono text-[10px] text-slate-400 font-bold align-middle">
                            {rowNo + 1}
                          </td>

                          {/* Item Label & Desc */}
                          <td className="py-2 px-3 align-middle">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800 leading-tight">
                                {item.label}
                              </span>
                              {currentRating ? (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  RATING_OPTIONS.find((r) => r.value === currentRating)?.badgeColor || "bg-slate-100"
                                }`}>
                                  {RATING_OPTIONS.find((r) => r.value === currentRating)?.short || currentRating}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  (Belum dinilai)
                                </span>
                              )}
                            </div>
                            {item.desc && (
                              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                {item.desc}
                              </p>
                            )}
                          </td>

                          {/* 4 Rating Columns */}
                          {RATING_OPTIONS.map((opt) => {
                            const isSelected = currentRating === opt.value;
                            return (
                              <td key={opt.value} className="py-2 px-1 text-center align-middle">
                                {readOnly ? (
                                  <div className="flex items-center justify-center">
                                    {isSelected ? (
                                      <span
                                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border shadow-2xs ${opt.badgeColor}`}
                                        title={`${item.label}: ${opt.label}`}
                                      >
                                        ✓
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-xs">-</span>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => updateItem(actualIdx, item.key, opt.value)}
                                    title={`${item.label}: ${opt.label}`}
                                    className={`w-full py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-orange-500 border-orange-600 text-white shadow-2xs ring-1 ring-orange-300"
                                        : "bg-white border-slate-200 text-slate-400 hover:border-orange-300 hover:text-slate-700 hover:bg-orange-50/40"
                                    }`}
                                  >
                                    {isSelected ? "✓" : "-"}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Catatan Temuan */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/40 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Catatan / Temuan Inspeksi Hari ke-{actualIdx + 1}
                </span>
                <textarea
                  rows={2}
                  disabled={readOnly}
                  value={entry.catatan || ""}
                  onChange={(e) => updateEntry(actualIdx, { catatan: e.target.value })}
                  className={`${inputCls} resize-none`}
                  placeholder={
                    readOnly
                      ? entry.catatan
                        ? ""
                        : "Tidak ada catatan temuan untuk hari ini."
                      : "Catatan atau temuan inspeksi (opsional)"
                  }
                />
                {entry.filledBy && (
                  <p className="text-[10px] text-slate-400 pt-0.5">
                    Diisi oleh: <strong>{entry.filledBy}</strong>
                    {entry.filledAt ? ` (${new Date(entry.filledAt).toLocaleString("id-ID")})` : ""}
                  </p>
                )}
              </div>

              {/* Tombol Simpan per hari jika edit mode */}
              {onSave && !readOnly && (
                <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveEntry(actualIdx)}
                    disabled={savingIdx === actualIdx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  >
                    {savingIdx === actualIdx ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan Inspeksi Hari ke-{actualIdx + 1}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!readOnly && targetDates.length === 0 && entries.length < maxEntries && (
          <button
            type="button"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Waktu Inspeksi ({entries.length}/{maxEntries})</span>
          </button>
        )}

        {/* ── Mengetahui (Barcode Otorisasi Digital) ── */}
        <div className="border-t border-slate-200/80 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Mengetahui (Persetujuan Digital)
              </h3>
              <p className="text-[10px] text-slate-400">
                Verifikasi barcode digital oleh SFO, Purchasing, dan Pengawas Dept
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(["sfo", "purchasing", "pengawasDept"] as const).map((roleKey) => {
              const labelMap = { sfo: "SFO", purchasing: "Purchasing", pengawasDept: "Pengawas Dept" };
              const row = roleKey === "pengawasDept"
                ? (mengetahui?.pengawasDept?.nama ? mengetahui.pengawasDept : (mengetahui?.picDept ?? { nama: "", tanggal: "", nik: "" }))
                : (mengetahui?.[roleKey] ?? { nama: "", tanggal: "", nik: "" });

              return (
                <MengetahuiBarcodeCard
                  key={roleKey}
                  roleKey={roleKey}
                  label={labelMap[roleKey]}
                  row={row}
                  formId={formId}
                  readOnly={readOnly}
                  onUpdate={(patch) => updateMengetahui(roleKey, patch)}
                  currentUserName={currentUserName}
                  currentUserNik={currentUserNik}
                />
              );
            })}
          </div>

          {onSave && !readOnly && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={saveMengetahui}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan Mengetahui</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}