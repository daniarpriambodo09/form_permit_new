// components/PenilaianSubkontraktorSection.tsx
// Lampiran "Form Penilaian Sub Kontraktor" untuk Ijin Kerja Eksternal —
// mirip Safety Induction, tapi diisi berkala: 5x checklist (idealnya 1x per
// hari kerja selama 5 hari), oleh administrator departemen (worker) lewat
// tablet. Setiap entry punya kalender tanggal yang BISA diubah bebas —
// kalau kemarin lupa checklist, hari ini tetap bisa mengisi untuk tanggal
// kemarin.

"use client";

import { useState } from "react";
import { Save, Loader2, Plus, Trash2, CalendarDays } from "lucide-react";

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
  tanggal: string; // "YYYY-MM-DD" — dipilih bebas via kalender, boleh mundur
  items: PenilaianItems;
  catatan: string;
  filledBy?: string | null;
  filledAt?: string | null;
}

export interface MengetahuiRow {
  nama: string;
  tanggal: string; // "YYYY-MM-DD"
}

export interface PenilaianSubkontraktorData {
  entries: PenilaianEntry[];
  mengetahui: {
    sfo: MengetahuiRow;
    purchasing: MengetahuiRow;
    picDept: MengetahuiRow;
  };
}

const emptyItems = (): PenilaianItems => ({
  kelengkapanApd: "",
  kedisiplinanApd: "",
  adanyaPengawasan: "",
  bekerjaSesuaiIjin: "",
  kepatuhanPeraturan: "",
  bekerjaAman: "",
  tidakAdaKecelakaan: "",
});

const todayStr = () => new Date().toISOString().slice(0, 10);

export const createEmptyPenilaianEntry = (): PenilaianEntry => ({
  tanggal: todayStr(),
  items: emptyItems(),
  catatan: "",
});

export const createEmptyPenilaianSubkontraktor = (): PenilaianSubkontraktorData => ({
  entries: [],
  mengetahui: {
    sfo: { nama: "", tanggal: "" },
    purchasing: { nama: "", tanggal: "" },
    picDept: { nama: "", tanggal: "" },
  },
});

const MAX_ENTRIES = 5;

const ITEM_LABELS: { key: keyof PenilaianItems; label: string; desc: string }[] = [
  { key: "kelengkapanApd", label: "Kelengkapan APD", desc: "APD yang dibawa harus sesuai dengan Form Ijin Kerja" },
  { key: "kedisiplinanApd", label: "Kedisiplinan Penggunaan APD", desc: "APD harus digunakan sesuai jenis pekerjaannya" },
  { key: "adanyaPengawasan", label: "Adanya Pengawasan", desc: "Pengawas subcont wajib memantau setiap pekerjaan yang dilakukan" },
  { key: "bekerjaSesuaiIjin", label: "Bekerja Sesuai dengan Ijin Kerja", desc: "Pelaksanaan pekerjaan harus sesuai dengan ijin kerja" },
  { key: "kepatuhanPeraturan", label: "Kepatuhan terhadap Peraturan di PT. JAI", desc: "Wajib mematuhi peraturan dan OS yang ada" },
  { key: "bekerjaAman", label: "Bekerja dengan Aman dan Selamat", desc: "Tidak berpotensi mengganggu keselamatan orang lain dan diri sendiri" },
  { key: "tidakAdaKecelakaan", label: "Tidak Ada Kecelakaan Kerja", desc: "" },
];

const RATING_OPTIONS: { value: PenilaianRating; label: string }[] = [
  { value: "baik_sekali", label: "Baik Sekali" },
  { value: "baik", label: "Baik" },
  { value: "sedang", label: "Sedang" },
  { value: "kurang", label: "Kurang" },
];

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400";

interface Props {
  value: PenilaianSubkontraktorData;
  setValue: (value: PenilaianSubkontraktorData) => void;
  readOnly?: boolean;
  onSave?: (data: PenilaianSubkontraktorData) => Promise<void>;
  /** Nama user yang sedang login — dicatat sebagai filledBy saat entry disimpan. */
  currentUserName?: string | null;
}

export default function PenilaianSubkontraktorSection({
  value,
  setValue,
  readOnly = false,
  onSave,
  currentUserName,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const updateEntry = (idx: number, patch: Partial<PenilaianEntry>) => {
    const entries = [...value.entries];
    entries[idx] = { ...entries[idx], ...patch };
    setValue({ ...value, entries });
  };

  const updateItem = (idx: number, key: keyof PenilaianItems, rating: PenilaianRating) => {
    const entries = [...value.entries];
    entries[idx] = { ...entries[idx], items: { ...entries[idx].items, [key]: rating } };
    setValue({ ...value, entries });
  };

  const addEntry = () => {
    if (value.entries.length >= MAX_ENTRIES) return;
    setValue({ ...value, entries: [...value.entries, createEmptyPenilaianEntry()] });
  };

  const removeEntry = (idx: number) => {
    const entries = value.entries.filter((_, i) => i !== idx);
    setValue({ ...value, entries });
  };

  const saveEntry = async (idx: number) => {
    if (!onSave) return;
    setSavingIdx(idx);
    try {
      const entries = [...value.entries];
      entries[idx] = {
        ...entries[idx],
        filledBy: currentUserName ?? entries[idx].filledBy ?? null,
        filledAt: new Date().toISOString(),
      };
      const next = { ...value, entries };
      setValue(next);
      await onSave(next);
    } finally {
      setSavingIdx(null);
    }
  };

  const updateMengetahui = (row: "sfo" | "purchasing" | "picDept", patch: Partial<MengetahuiRow>) => {
    setValue({ ...value, mengetahui: { ...value.mengetahui, [row]: { ...value.mengetahui[row], ...patch } } });
  };

  const saveMengetahui = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
        <h2 className="font-bold text-slate-800">Form Penilaian Sub Kontraktor</h2>
        <p className="text-xs text-slate-500 mt-1">
          Diisi oleh administrator departemen (worker) — checklist harian, maksimal {MAX_ENTRIES}x selama masa kerja.
          Tanggal tiap checklist bisa dipilih bebas — kalau lupa mengisi kemarin, tetap bisa diisi hari ini untuk tanggal kemarin.
        </p>
      </div>

      <div className="p-5 space-y-6">
        {value.entries.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-6 border border-dashed border-slate-200 rounded-lg">
            Belum ada checklist. Klik &quot;Tambah Waktu Inspeksi&quot; untuk mulai.
          </p>
        )}

        {value.entries.map((entry, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">Waktu Inspeksi {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                <label className="text-xs font-semibold text-slate-500">Tanggal:</label>
                <input
                  type="date"
                  value={entry.tanggal}
                  disabled={readOnly}
                  // Sengaja TIDAK dibatasi max=today — boleh pilih tanggal
                  // mundur (lupa checklist kemarin) atau bahkan hari ini/besok
                  // sesuai kebutuhan lapangan.
                  onChange={(e) => updateEntry(idx, { tanggal: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {!readOnly && (
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
                    {RATING_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                          entry.items[item.key] === opt.value
                            ? "bg-orange-100 border-orange-400 text-orange-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-orange-300"
                        } ${readOnly ? "cursor-not-allowed opacity-70" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`penilaian-${idx}-${item.key}`}
                          checked={entry.items[item.key] === opt.value}
                          disabled={readOnly}
                          onChange={() => updateItem(idx, item.key, opt.value)}
                          className="sr-only"
                        />
                        <span className="sm:hidden">{opt.label}</span>
                        <span className="hidden sm:inline">✓</span>
                      </label>
                    ))}
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

        {!readOnly && value.entries.length < MAX_ENTRIES && (
          <button
            type="button"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Waktu Inspeksi ({value.entries.length}/{MAX_ENTRIES})
          </button>
        )}

        {/* ── Mengetahui: SFO / Purchasing / PIC Dept ── */}
        <div className="border-t border-slate-200 pt-5">
          <h3 className="font-bold text-sm text-slate-700 mb-3">Mengetahui</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["sfo", "purchasing", "picDept"] as const).map((roleKey) => {
              const labelMap = { sfo: "SFO", purchasing: "Purchasing", picDept: "PIC Dept" };
              const row = value.mengetahui[roleKey];
              return (
                <div key={roleKey} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">{labelMap[roleKey]}</p>
                  <input
                    type="text"
                    placeholder="Nama"
                    disabled={readOnly}
                    value={row.nama}
                    onChange={(e) => updateMengetahui(roleKey, { nama: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="date"
                    disabled={readOnly}
                    value={row.tanggal}
                    onChange={(e) => updateMengetahui(roleKey, { tanggal: e.target.value })}
                    className={inputCls}
                  />
                </div>
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