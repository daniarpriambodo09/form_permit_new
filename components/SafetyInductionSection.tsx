// components/SafetyInductionSection.tsx
"use client";

import { useState } from "react";
import { Save, CheckCircle, Loader2 } from "lucide-react";

export interface SafetyInductionData {
  namaSubcont: string;
  aktivitasPekerjaan: string;
  koordinatNoHp: string;
  namaPekerja: string[];
  status: "draft" | "submitted" | "approved";
  // Field lama (kebijakan, himbauan, larangan, areaTerbatas, koordinatorSubcont,
  // security) sudah tidak dipakai lagi sebagai input — bagian-bagian itu
  // sekarang murni informasi statis / digantikan tanda tangan asli.
  // Dibiarkan opsional agar data lama (jika ada) tidak menyebabkan error saat dibaca.
  kebijakan?: boolean[];
  himbauan?: boolean[];
  larangan?: boolean[];
  areaTerbatas?: boolean[];
  koordinatorSubcont?: string;
  security?: string;
  signatureUrl?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export const createEmptySafetyInduction = (): SafetyInductionData => ({
  namaSubcont: "",
  aktivitasPekerjaan: "",
  koordinatNoHp: "",
  namaPekerja: Array.from({ length: 14 }, () => ""),
  status: "draft",
});

// ── Info statis (Bagian tata tertib) — bukan checklist, murni ditampilkan ──
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
  "Segera lapor ke PIC area kerja jika terjadi keadaan darurat, kecelakaan kerja atau kondisi abnormal",
];
const larangan = [
  "Mengambil foto",
  "Merokok disembarang tempat (harus di SMOKING AREA)",
  "Membawa barang berbahaya seperti senjata tajam, bahan yang mudah meledak",
  "Bekerja di area terbatas yang tanpa adanya izin dan pendampingan",
  "Membuang sampah dan limbah sisa hasil kerja sembarangan",
  "Melakukan tindakan berbahaya yang berakibat kecelakaan kerja dan mengganggu ketertiban umum",
];
const areaTerbatas = [
  "Charger Forklift Warehouse & EXIM",
  "Panel utama",
  "Pump Room",
  "TPS B3 & Domestik",
  "Utility Area",
  "Tangki Solar",
  "Workshop",
  "Tandon Air",
  "Water Treatment",
  "IPAL (Hydro Kalvabio)",
];

const input = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400";

interface Props {
  value: SafetyInductionData;
  setValue: (value: SafetyInductionData) => void;
  readOnly?: boolean;
  onSave?: (submit: boolean) => Promise<void>;
  /** URL tanda tangan Kontraktor dari form induk — ditampilkan sebagai
   *  pengganti "Koord. Subcont" (bukan lagi input teks). */
  kontraktorSignatureUrl?: string | null;
}

export default function SafetyInductionSection({
  value,
  setValue,
  readOnly = false,
  onSave,
  kontraktorSignatureUrl,
}: Props) {
  const [saving, setSaving] = useState(false);

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

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
        <h2 className="font-bold text-slate-800">Safety Induction - Tata Tertib Pekerja Sub Contractor</h2>
        <p className="text-xs text-slate-500 mt-1">Diisi oleh Security berdasarkan form Ijin Kerja Eksternal.</p>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Data isian (tetap diisi Security) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm font-semibold">
            Nama Subcont
            <input
              disabled={readOnly}
              value={value.namaSubcont}
              onChange={(e) => set("namaSubcont", e.target.value)}
              className={`${input} mt-1`}
            />
          </label>
          <label className="text-sm font-semibold">
            Aktivitas Pekerjaan
            <input
              disabled={readOnly}
              value={value.aktivitasPekerjaan}
              onChange={(e) => set("aktivitasPekerjaan", e.target.value)}
              className={`${input} mt-1`}
            />
          </label>
          <label className="text-sm font-semibold">
            Koord. Kerja / No. HP
            <input
              disabled={readOnly}
              value={value.koordinatNoHp}
              onChange={(e) => set("koordinatNoHp", e.target.value)}
              className={`${input} mt-1`}
            />
          </label>
        </div>

        {/* ── Daftar Nama Pekerja ── */}
        <div>
          <h3 className="font-bold text-sm text-slate-700 mb-2">Daftar Nama Pekerja</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {value.namaPekerja.map((name, i) => (
              <label key={i} className="flex gap-2 items-center text-xs text-slate-500">
                <span className="w-5 text-right">{i + 1}</span>
                <input
                  disabled={readOnly}
                  value={name}
                  onChange={(e) => {
                    const next = [...value.namaPekerja];
                    next[i] = e.target.value;
                    set("namaPekerja", next);
                  }}
                  className={input}
                />
              </label>
            ))}
          </div>
        </div>

        {/* ── INFO STATIS — bukan checklist, murni ditampilkan ── */}
        <InfoList title="Kebijakan K3 PT JAI" items={kebijakan} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <InfoList title="Himbauan Pekerja Sub Contractor" items={himbauan} />
          <InfoList title="Larangan Bagi Pekerja Sub Contractor" items={larangan} />
        </div>
        <InfoList title="Daftar Area Terbatas" items={areaTerbatas} twoColumn />

        <p className="text-xs text-slate-600 border-t border-slate-200 pt-4">
          Setelah membaca dan mempelajari ketentuan tata tertib di atas, pekerja telah mengerti dan siap
          melaksanakan serta menginformasikan kepada rekan kerja lainnya.
        </p>

        {/* ── Tanda tangan Kontraktor (bukan input teks lagi) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Koord. Sub Contractor (Tanda Tangan)</p>
            {kontraktorSignatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={kontraktorSignatureUrl}
                alt="Tanda tangan Kontraktor"
                className="h-16 border border-slate-200 rounded-lg bg-white px-2"
              />
            ) : (
              <p className="text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg px-3 py-4">
                Kontraktor belum menandatangani form induk.
              </p>
            )}
          </div>
        </div>

        {/* ── Tombol simpan draft / TTD dilakukan di luar komponen ini (SignaturePad) ── */}
        {onSave && !readOnly && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}
              Simpan Draft
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function InfoList({
  title, items, twoColumn = false,
}: { title: string; items: string[]; twoColumn?: boolean }) {
  return (
    <div>
      <h3 className="font-bold text-sm text-slate-700 mb-2">{title}</h3>
      <div className={`border border-slate-200 rounded-lg overflow-hidden ${twoColumn ? "grid grid-cols-1 sm:grid-cols-2" : ""}`}>
        {items.map((item, i) => (
          <p key={i} className="px-3 py-2 border-b sm:border-b last:border-0 border-slate-100 text-xs text-slate-600">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}