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
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d1 > d2) return [];
  const days: string[] = [];
  const cur = new Date(d1);
  while (cur <= d2 && days.length < 60) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export const ITEM_LABELS: { key: keyof PenilaianItems; label: string; desc: string }[] = [
  { key: "kelengkapanApd", label: "Kelengkapan APD", desc: "APD yang dibawa harus sesuai dengan Form Ijin Kerja" },
  { key: "kedisiplinanApd", label: "Kedisiplinan Penggunaan APD", desc: "APD harus digunakan sesuai jenis pekerjaannya" },
  { key: "adanyaPengawasan", label: "Adanya Pengawasan", desc: "Pengawas subcont wajib memantau setiap pekerjaan yang dilakukan" },
  { key: "bekerjaSesuaiIjin", label: "Bekerja Sesuai dengan Ijin Kerja", desc: "Pelaksanaan pekerjaan harus sesuai dengan ijin kerja" },
  { key: "kepatuhanPeraturan", label: "Kepatuhan terhadap Peraturan di PT. JAI", desc: "Wajib mematuhi peraturan dan OS yang ada" },
  { key: "bekerjaAman", label: "Bekerja dengan Aman dan Selamat", desc: "Tidak berpotensi mengganggu keselamatan orang lain dan diri sendiri" },
  { key: "tidakAdaKecelakaan", label: "Tidak Ada Kecelakaan Kerja", desc: "" },
];

export const RATING_OPTIONS: { value: PenilaianRating; label: string }[] = [
  { value: "baik_sekali", label: "Baik Sekali" },
  { value: "baik", label: "Baik" },
  { value: "sedang", label: "Sedang" },
  { value: "kurang", label: "Kurang" },
];

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400";

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

    // URL verifikasi dengan root dari app_url di setting SMTP
    const targetFormId = formId || "unknown";
    const mappedRole = roleKey === "picDept" ? "pengawasDept" : roleKey;
    const verifyUrl = `${appUrl}/approval-verification/penilaian-subkontraktor/${encodeURIComponent(targetFormId)}/${encodeURIComponent(mappedRole)}`;

    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: 140,
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
      className={`border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
        hasApproved
          ? "bg-white border-green-200 shadow-xs"
          : isSfo
          ? "bg-slate-50/80 border-slate-200"
          : "bg-slate-50/50 border-slate-200"
      }`}
    >
      {/* Header Card */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          {hasApproved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {label}
          </p>
        </div>
        {hasApproved ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            ✓ Disetujui
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
            Menunggu
          </span>
        )}
      </div>

      {/* Main Barcode Display */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 min-h-[170px]">
        {hasApproved ? (
          <div className="flex flex-col items-center">
            <div className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <canvas
                ref={canvasRef}
                className={qrReady ? "block rounded" : "hidden"}
              />
              {!qrReady && (
                <div className="w-[140px] h-[140px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center flex items-center gap-1 font-medium">
              <QrCode className="w-3 h-3 text-slate-400" />
              Scan barcode untuk verifikasi persetujuan
            </p>
            {!readOnly && !isSfo && (
              <button
                type="button"
                onClick={handleReset}
                className="mt-2 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset Barcode
              </button>
            )}
          </div>
        ) : showInputForm && !readOnly && !isSfo ? (
          <div className="w-full space-y-2 bg-slate-100/60 p-3 rounded-lg border border-slate-200">
            <p className="text-[11px] font-bold text-slate-700">Data Persetujuan {label}</p>
            <input
              type="text"
              placeholder="Nama Lengkap"
              value={tempNama}
              onChange={(e) => setTempNama(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <input
              type="text"
              placeholder="NIK"
              value={tempNik}
              onChange={(e) => setTempNik(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <input
              type="date"
              value={tempTanggal}
              onChange={(e) => setTempTanggal(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyForm}
                disabled={!tempNama.trim()}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" />
                Buat Barcode
              </button>
              <button
                type="button"
                onClick={() => setShowInputForm(false)}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 py-3 text-center">
            <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-white mb-2">
              <QrCode className="w-6 h-6 text-slate-300" />
            </div>
            {isSfo ? (
              <>
                <p className="text-xs font-semibold text-slate-600">Menunggu Approval SFO</p>
                <p className="text-[10px] text-slate-400 italic max-w-[200px] mt-0.5">
                  Barcode otomatis terbentuk saat SFO melakukan approval form
                </p>
              </>
            ) : !readOnly ? (
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-600">Belum Ada Barcode</p>
                <button
                  type="button"
                  onClick={() => setShowInputForm(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer mt-1"
                >
                  <Plus className="w-3 h-3" />
                  Bubuhkan Persetujuan
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-500">Belum Ada Persetujuan</p>
                <p className="text-[10px] text-slate-400 italic">Menunggu otorisasi {label}</p>
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
  /** Nama user yang sedang login — dicatat sebagai filledBy saat entry disimpan. */
  currentUserName?: string | null;
  currentUserNik?: string | null;
  formId?: string;
  tanggalDari?: string | null;
  tanggalSampai?: string | null;
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
}: Props) {
  const [saving, setSaving] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

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
    const nextEntries = [...entries];
    nextEntries[idx] = { ...nextEntries[idx], ...patch };
    setValue({ ...safeValue, entries: nextEntries, mengetahui });
  };

  const updateItem = (idx: number, key: keyof PenilaianItems, rating: PenilaianRating) => {
    const nextEntries = [...entries];
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
      const nextEntries = [...entries];
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

    // Sinkronisasi picDept dan pengawasDept agar kompatibel dua arah
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

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-800">Form Penilaian Sub Kontraktor</h2>
            <p className="text-xs text-slate-500 mt-1">
              Diisi dan disetujui oleh Pengawas Dept per hari kerja ({entries.length} waktu inspeksi), lalu diverifikasi oleh Purchasing dan SFO.
            </p>
          </div>
          {tanggalDari && tanggalSampai && (
            <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800">
              Rentang: {tanggalDari} s/d {tanggalSampai} ({targetDates.length} Hari Kerja)
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {entries.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-6 border border-dashed border-slate-200 rounded-lg">
            Belum ada checklist. Klik &quot;Tambah Waktu Inspeksi&quot; untuk mulai.
          </p>
        )}

        {entries.map((entry, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Waktu Inspeksi {idx + 1}
                  {targetDates[idx] ? ` (Hari ke-${idx + 1})` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                <label className="text-xs font-semibold text-slate-500">Tanggal:</label>
                <input
                  type="date"
                  value={entry.tanggal}
                  disabled={readOnly}
                  onChange={(e) => updateEntry(idx, { tanggal: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                />
                {!readOnly && targetDates.length === 0 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Hapus checklist ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-1">
              <div className="hidden sm:grid grid-cols-[1fr_repeat(4,6.5rem)] gap-2 px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <span>Item Pengecekan</span>
                {RATING_OPTIONS.map((opt) => (
                  <span key={opt.value} className="text-center">{opt.label}</span>
                ))}
              </div>
              {ITEM_LABELS.map((item) => (
                <div key={item.key} className="grid grid-cols-1 sm:grid-cols-[1fr_repeat(4,6.5rem)] gap-2 items-center px-2 py-2.5 rounded-lg hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                    {item.desc && <p className="text-xs text-slate-400">{item.desc}</p>}
                  </div>
                  <div className="grid grid-cols-4 sm:contents gap-1">
                    {RATING_OPTIONS.map((opt) => {
                      const isSelected = entry.items[item.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={readOnly}
                          onClick={(e) => {
                            e.preventDefault();
                            if (!readOnly) {
                              updateItem(idx, item.key, opt.value);
                            }
                          }}
                          title={opt.label}
                          className={`relative flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-orange-100 border-orange-400 text-orange-700 font-bold shadow-2xs ring-1 ring-orange-300"
                              : "bg-white border-slate-200 text-slate-500 hover:border-orange-300 hover:bg-slate-50/80"
                          } ${readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer active:scale-95"}`}
                        >
                          <span className="sm:hidden truncate">{opt.label}</span>
                          <span className="hidden sm:inline">✓</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-3">
                <label className="text-sm font-semibold text-slate-700">
                  Catatan / Temuan
                  <textarea
                    rows={2}
                    disabled={readOnly}
                    value={entry.catatan}
                    onChange={(e) => updateEntry(idx, { catatan: e.target.value })}
                    className={`${inputCls} mt-1 resize-none`}
                    placeholder="Catatan atau temuan pada inspeksi ini (opsional)"
                  />
                </label>
              </div>

              {entry.filledBy && (
                <p className="text-[11px] text-slate-400 pt-1">
                  Diisi oleh {entry.filledBy}
                  {entry.filledAt ? ` — ${new Date(entry.filledAt).toLocaleString("id-ID")}` : ""}
                </p>
              )}

              {onSave && !readOnly && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => saveEntry(idx)}
                    disabled={savingIdx === idx}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    {savingIdx === idx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Simpan Checklist Ini
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {!readOnly && targetDates.length === 0 && entries.length < maxEntries && (
          <button
            type="button"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Waktu Inspeksi ({entries.length}/{maxEntries})
          </button>
        )}

        {/* ── Mengetahui: SFO / Purchasing / Pengawas Dept (Tampilan Barcode Saja) ── */}
        <div className="border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-700">Mengetahui</h3>
              <p className="text-xs text-slate-400">Verifikasi barcode digital oleh SFO, Purchasing, dan Pengawas Dept</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={saveMengetahui}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan Mengetahui
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}