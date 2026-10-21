// components/SafetyInductionSection.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Save, CheckCircle, Loader2, PenTool,
  CheckCircle2, AlertTriangle, X, Check,
  Shield, Building2, User, Phone, Briefcase,
  ChevronDown, ChevronUp, Lock, AlertOctagon,
  FileCheck,
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";

export interface SafetyInductionData {
  namaSubcont: string;
  aktivitasPekerjaan: string;
  koordinatNoHp: string;
  namaPekerja: string[];
  status: "draft" | "submitted" | "approved";
  kebijakan?: boolean[];
  himbauan?: boolean[];
  larangan?: boolean[];
  areaTerbatas?: boolean[];
  koordinatorSubcont?: string;
  security?: string;
  signatureUrl?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  kontraktorSignatureUrl?: string | null;
}

export const createEmptySafetyInduction = (): SafetyInductionData => ({
  namaSubcont: "",
  aktivitasPekerjaan: "",
  koordinatNoHp: "",
  namaPekerja: Array.from({ length: 14 }, () => ""),
  status: "draft",
});

// ── Info statis (Bagian tata tertib) ──
const kebijakan = [
  "Melaksanakan Kegiatan yang ditujukan untuk mencegah terjadinya kecelakaan kerja dan penyakit akibat kerja, serta meningkatkan kesadaran karyawan dalam hal K3",
  "Memenuhi peraturan perundang-undangan dan ketentuan lain yang berkaitan dengan aspek Keselamatan dan Kesehatan Kerja",
  "Melakukan perbaikan berkelanjutan dalam bidang manajemen Keselamatan dan Kesehatan Kerja",
  "Melakukan kebijakan Keselamatan dan Kesehatan Kerja kepada seluruh karyawan yang bekerja dan atas nama PT Jatim Autocomp Indonesia",
];

const himbauan = [
  "Mematuhi peraturan yang berlaku di PT. Jatim Autocomp Indonesia",
  "Memahami dan mengenali lingkungan kerja sekitarnya yang berpotensi bahaya",
  "Memperhatikan dan mematuhi rambu-rambu keselamatan dan batas area",
  "Bekerja sesuai prosedur yang berlaku",
  "Gunakan APD saat bekerja sesuai standard yang telah ditentukan",
  "Segera lapor ke PIC area kerja jika terjadi keadaan darurat atau kondisi abnormal",
];

const larangan = [
  "Mengambil foto tanpa izin",
  "Merokok disembarang tempat (wajib di SMOKING AREA)",
  "Membawa barang berbahaya seperti senjata tajam, bahan peledak",
  "Bekerja di area terbatas tanpa izin dan pendampingan resmi",
  "Membuang sampah dan limbah sisa hasil kerja sembarangan",
  "Melakukan tindakan berbahaya yang berakibat kecelakaan kerja",
];

const areaTerbatas = [
  "Charger Forklift Warehouse & EXIM",
  "Panel Utama Listrik",
  "Pump Room",
  "TPS B3 & Domestik",
  "Utility Area",
  "Tangki Solar",
  "Workshop",
  "Tandon Air",
  "Water Treatment",
  "IPAL (Hydro Kalvabio)",
];

const inputCls =
  "w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white placeholder:text-slate-400 transition-colors";

interface Props {
  value: SafetyInductionData;
  setValue: (value: SafetyInductionData) => void;
  readOnly?: boolean;
  onSave?: (submit: boolean) => Promise<void>;
  kontraktorSignatureUrl?: string | null;
  formId?: string;
  onKontraktorSigned?: (signatureUrl: string) => void;
  defaultNamaSubcont?: string;
  defaultAktivitasPekerjaan?: string;
  defaultKoordinatNoHp?: string;
}

export default function SafetyInductionSection({
  value,
  setValue,
  readOnly = false,
  onSave,
  kontraktorSignatureUrl,
  formId,
  onKontraktorSigned,
  defaultNamaSubcont,
  defaultAktivitasPekerjaan,
  defaultKoordinatNoHp,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [showKontraktorPad, setShowKontraktorPad] = useState(false);
  const [signingKontraktor, setSigningKontraktor] = useState(false);
  const [kontraktorSignError, setKontraktorSignError] = useState("");
  const [localKontraktorSig, setLocalKontraktorSig] = useState<string | null>(null);
  const [showPedoman, setShowPedoman] = useState(false);

  const activeKontraktorSig = kontraktorSignatureUrl || localKontraktorSig;

  // Auto-fill dari form ijin-kerja-eksternal jika field masih kosong
  useEffect(() => {
    let changed = false;
    const patch: Partial<SafetyInductionData> = {};

    if ((!value.namaSubcont || !value.namaSubcont.trim()) && defaultNamaSubcont?.trim()) {
      patch.namaSubcont = defaultNamaSubcont.trim();
      changed = true;
    }
    if ((!value.aktivitasPekerjaan || !value.aktivitasPekerjaan.trim()) && defaultAktivitasPekerjaan?.trim()) {
      patch.aktivitasPekerjaan = defaultAktivitasPekerjaan.trim();
      changed = true;
    }
    if ((!value.koordinatNoHp || !value.koordinatNoHp.trim()) && defaultKoordinatNoHp?.trim()) {
      patch.koordinatNoHp = defaultKoordinatNoHp.trim();
      changed = true;
    }

    if (changed) {
      setValue({ ...value, ...patch });
    }
  }, [defaultNamaSubcont, defaultAktivitasPekerjaan, defaultKoordinatNoHp]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof SafetyInductionData>(key: K, next: SafetyInductionData[K]) =>
    setValue({ ...value, [key]: next });

  const save = async (submit: boolean) => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(submit);
    } finally {
      setSaving(false);
    }
  };

  const handleContractorSign = async (dataUrl: string) => {
    if (!formId) {
      setKontraktorSignError("ID form tidak ditemukan untuk menandatangani.");
      return;
    }
    setSigningKontraktor(true);
    setKontraktorSignError("");
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, `signature-kontraktor-${formId}.png`);
      fd.append("context", "kontraktor");
      const uploadRes = await fetch("/api/upload/signature", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload tanda tangan gagal");

      const signRes = await fetch(`/api/forms/general-permit/${formId}/sign-kontraktor`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureUrl: uploadJson.url }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson.error || "Gagal menyimpan tanda tangan kontraktor");

      setLocalKontraktorSig(uploadJson.url);
      setShowKontraktorPad(false);
      if (onKontraktorSigned) {
        onKontraktorSigned(uploadJson.url);
      }
    } catch (err: any) {
      setKontraktorSignError(err.message || "Gagal memproses tanda tangan kontraktor.");
    } finally {
      setSigningKontraktor(false);
    }
  };

  const filledWorkers = (value.namaPekerja || []).filter((n) => n && n.trim());
  const filledWorkersCount = filledWorkers.length;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
      {/* ── Header ── */}
      <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-800">
              Safety Induction Pos Security
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Tata tertib pekerja subkontraktor &amp; verifikasi keselamatan pos security
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            value.status === "approved"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : filledWorkersCount > 0
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {value.status === "approved"
            ? "✓ Terverifikasi"
            : filledWorkersCount > 0
            ? `${filledWorkersCount} Pekerja`
            : "Belum Diisi"}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* ── Bagian 1: Data Identitas Subkontraktor ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Nama Subcont */}
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                Nama Subcont
              </span>
              {defaultNamaSubcont && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Form Induk
                </span>
              )}
            </div>
            {readOnly ? (
              <p className="text-xs font-semibold text-slate-800 truncate" title={value.namaSubcont}>
                {value.namaSubcont || "-"}
              </p>
            ) : (
              <input
                value={value.namaSubcont}
                placeholder="Nama Perusahaan Subkontraktor"
                onChange={(e) => set("namaSubcont", e.target.value)}
                className={inputCls}
              />
            )}
          </div>

          {/* Aktivitas Pekerjaan */}
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-400" />
                Aktivitas Pekerjaan
              </span>
              {defaultAktivitasPekerjaan && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Form Induk
                </span>
              )}
            </div>
            {readOnly ? (
              <p className="text-xs font-semibold text-slate-800 truncate" title={value.aktivitasPekerjaan}>
                {value.aktivitasPekerjaan || "-"}
              </p>
            ) : (
              <input
                value={value.aktivitasPekerjaan}
                placeholder="Rincian Pekerjaan"
                onChange={(e) => set("aktivitasPekerjaan", e.target.value)}
                className={inputCls}
              />
            )}
          </div>

          {/* Koordinator / No HP */}
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                Koord. Subcont / No. HP
              </span>
              {defaultKoordinatNoHp && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Form Induk
                </span>
              )}
            </div>
            {readOnly ? (
              <p className="text-xs font-semibold text-slate-800 truncate" title={value.koordinatNoHp}>
                {value.koordinatNoHp || "-"}
              </p>
            ) : (
              <input
                value={value.koordinatNoHp}
                placeholder="Nama Pengawas / PIC"
                onChange={(e) => set("koordinatNoHp", e.target.value)}
                className={inputCls}
              />
            )}
          </div>
        </div>

        {/* ── Bagian 2: Daftar Nama Pekerja ── */}
        <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Daftar Nama Pekerja Diinduksi
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
                {filledWorkersCount} / 14 Pekerja
              </span>
            </div>
            {!readOnly && (
              <span className="text-[10px] text-amber-700 font-medium">
                * Minimal 1 pekerja wajib diisi Security
              </span>
            )}
          </div>

          {readOnly ? (
            /* Mode Baca / Review Approver: Tampilkan grid chip yang rapi dan ringkas */
            filledWorkersCount > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 pt-1">
                {filledWorkers.map((nama, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs min-w-0"
                  >
                    <span className="w-4 h-4 rounded text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate" title={nama}>
                      {nama}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 bg-white rounded-lg border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-400 italic">
                  Belum ada nama pekerja diinput (akan diinput oleh Security saat induksi pos).
                </p>
              </div>
            )
          ) : (
            /* Mode Edit Security: Input ringkas 2-kolom */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {value.namaPekerja.map((name, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-5 text-right font-mono text-[10px] font-bold text-slate-400 shrink-0">
                    {i + 1}.
                  </span>
                  <input
                    value={name}
                    placeholder={`Nama pekerja ${i + 1}`}
                    onChange={(e) => {
                      const next = [...value.namaPekerja];
                      next[i] = e.target.value;
                      set("namaPekerja", next);
                    }}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bagian 3: Pedoman Tata Tertib K3 (Accordion Compact) ── */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPedoman(!showPedoman)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <FileCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700">
                Pedoman Tata Tertib K3 &amp; Area Terbatas PT JAI
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                (Kebijakan, Himbauan, Larangan, Area Terbatas)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-600">
              <span>{showPedoman ? "Tutup" : "Lihat Pedoman"}</span>
              {showPedoman ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showPedoman && (
            <div className="p-3.5 space-y-3 bg-white border-t border-slate-200 text-[11px] animate-in fade-in duration-150">
              {/* Kebijakan */}
              <div>
                <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Kebijakan K3 PT JAI:
                </p>
                <div className="space-y-1 pl-4 text-slate-600">
                  {kebijakan.map((k, i) => (
                    <p key={i}>• {k}</p>
                  ))}
                </div>
              </div>

              {/* Himbauan & Larangan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <p className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-blue-600" />
                    Himbauan Pekerja:
                  </p>
                  <div className="space-y-1 pl-4 text-slate-600">
                    {himbauan.map((h, i) => (
                      <p key={i}>• {h}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                    <AlertOctagon className="w-3 h-3 text-rose-600" />
                    Larangan Bagi Pekerja:
                  </p>
                  <div className="space-y-1 pl-4 text-slate-600">
                    {larangan.map((l, i) => (
                      <p key={i}>• {l}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Area Terbatas Badges */}
              <div className="pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Daftar Area Terbatas:
                </p>
                <div className="flex flex-wrap gap-1">
                  {areaTerbatas.map((a, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bagian 4: Tanda Tangan Koordinator Sub Contractor ── */}
        <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Tanda Tangan Koordinator Sub Contractor
            </span>
            {activeKontraktorSig ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah Ditandatangani
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200">
                Belum TTD
              </span>
            )}
          </div>

          {activeKontraktorSig ? (
            <div className="flex items-center gap-3">
              <div className="p-1 bg-white border border-emerald-200 rounded-lg shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeKontraktorSig}
                  alt="TTD Koordinator"
                  className="h-12 w-auto object-contain px-2"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Tanda tangan digital telah terhubung dan diverifikasi dari form induk.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-slate-500">
                Dapat ditandatangani di sini atau melalui akun kontraktor di Form Saya.
              </p>
              {!showKontraktorPad && (
                <button
                  type="button"
                  onClick={() => setShowKontraktorPad(true)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                >
                  <PenTool className="w-3 h-3" />
                  <span>Tanda Tangan Sekarang</span>
                </button>
              )}
            </div>
          )}

          {showKontraktorPad && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Goreskan tanda tangan koordinator:
                </span>
                <button
                  type="button"
                  onClick={() => setShowKontraktorPad(false)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
                >
                  Batal
                </button>
              </div>
              {kontraktorSignError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {kontraktorSignError}
                </p>
              )}
              <SignaturePad
                onConfirm={handleContractorSign}
                disabled={signingKontraktor}
                confirmLabel={signingKontraktor ? "Menyimpan..." : "Konfirmasi TTD"}
              />
            </div>
          )}
        </div>

        {/* ── Tombol Simpan Draft (Security) ── */}
        {onSave && !readOnly && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Draf Induksi</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}