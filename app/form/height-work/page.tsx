// app/form/height-work/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Home, AlertCircle, Save, Send } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface FormData {
  tipePerusahaan: "eksternal" | "internal";
  deskripsiPekerjaan: string;
  lokasi: string;
  tanggalPelaksanaan: string;
  waktuMulai: string;
  waktuSelesai: string;
  namaPengawasKontraktor: string;
  namaPetugas: string[];
  berbadanSehat: boolean[];
  kunceePagar: boolean;
  rompiKetinggian: boolean;
  rompiAngka: string;
  safetyHelmetCount: string;
  fullBodyHarnessCount: string;
  areaKerjaAman: boolean;
  kebakaranProcedure: boolean;
  pekerjaanListrik: boolean;
  prosedurLoto: boolean;
  perisakArea: boolean;
  safetyLineLine: boolean;
  alatBantuKerja: boolean;
  rompiSaatBekerja: boolean;
  bebanBeratTubuh: boolean;
  helmStandar: boolean;
  rambuSafetyWarning: boolean;
  bodyHarnessWebbing: boolean;
  bodyHarnessDRing: boolean;
  bodyHarnessAdjustment: boolean;
  lanyardAbsorber: boolean;
  lanyardSnapHook: boolean;
  lanyardRope: boolean;
  persetujuan: {
    spvNama: string;
    kontraktorNama: string;
    sfoNama: string;
    mrPgaNama: string;
  };
}

// ─── Reusable Components ─────────────────────────────────────────────────────
const Section = ({
  title, section, description, expanded, toggle, children,
}: {
  title: string; section: string; description?: string;
  expanded: boolean; toggle: (s: string) => void; children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-slate-200">
    <button
      onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200 hover:from-orange-100 hover:to-orange-150 transition-colors"
    >
      <div className="text-left">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {expanded
        ? <ChevronUp   className="w-5 h-5 text-orange-600 shrink-0" />
        : <ChevronDown className="w-5 h-5 text-orange-600 shrink-0" />
      }
    </button>
    {expanded && <div className="p-6">{children}</div>}
  </div>
);

const YesNo = ({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
    <span className="text-sm text-slate-700">{label}</span>
    <div className="flex items-center gap-4 shrink-0 ml-4">
      {[{ val: true, lbl: "YA" }, { val: false, lbl: "TIDAK" }].map(({ val, lbl }) => (
        <label key={lbl} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={label}
            checked={value === val}
            onChange={() => onChange(val)}
            className="w-4 h-4 text-orange-600"
          />
          <span className="text-sm">{lbl}</span>
        </label>
      ))}
    </div>
  </div>
);

const SigBox = ({
  label, name, onChange,
}: {
  label: string; name: string; onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-slate-700">{label}</label>
    <input
      type="text"
      placeholder="Nama"
      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-black"
      value={name}
      onChange={e => onChange(e.target.value)}
    />
    <div className="border-2 border-dashed border-slate-300 rounded-lg h-28 flex items-center justify-center bg-slate-50">
      <span className="text-slate-400 text-sm">[Tanda Tangan]</span>
    </div>
  </div>
);

// ─── Default state ────────────────────────────────────────────────────────────
const defaultForm = (): FormData => ({
  tipePerusahaan: "internal",
  deskripsiPekerjaan: "", lokasi: "",
  tanggalPelaksanaan: "", waktuMulai: "", waktuSelesai: "",
  namaPengawasKontraktor: "",
  namaPetugas: Array(10).fill(""),
  berbadanSehat: Array(10).fill(false),
  kunceePagar: false, rompiKetinggian: false, rompiAngka: "",
  safetyHelmetCount: "", fullBodyHarnessCount: "",
  areaKerjaAman: false, kebakaranProcedure: false, pekerjaanListrik: false,
  prosedurLoto: false, perisakArea: false, safetyLineLine: false,
  alatBantuKerja: false, rompiSaatBekerja: false,
  bebanBeratTubuh: false, helmStandar: false, rambuSafetyWarning: false,
  bodyHarnessWebbing: false, bodyHarnessDRing: false, bodyHarnessAdjustment: false,
  lanyardAbsorber: false, lanyardSnapHook: false, lanyardRope: false,
  persetujuan: { spvNama: "", kontraktorNama: "", sfoNama: "", mrPgaNama: "" },
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HeightWorkPermitForm() {
  const [formData, setFormData]   = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded]   = useState({
    bagian1: true, bagian2: true, bagian3: true,
    bagian4: true, bagian5: true, persetujuan: true,
  });

  const toggle = (s: string) =>
    setExpanded(prev => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));

  // ── Submit to API ───────────────────────────────────────────────────────
  const submit = async (isSubmit: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/forms/height-work", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...formData, isSubmit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan server");
      return data;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    try {
      const result = await submit(false);
      alert(`Draft berhasil disimpan! ID: ${result.id_form}`);
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await submit(true);
      alert(`Izin berhasil diajukan! ID: ${result.id_form}`);
      window.location.href = "/history";
    } catch (err: any) {
      alert("Gagal mengajukan: " + err.message);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const set = (patch: Partial<FormData>) => setFormData(prev => ({ ...prev, ...patch }));

  const inputClass =
    "w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-black";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Home className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">FORM IZIN KERJA DI KETINGGIAN</h1>
                  <p className="text-xs text-slate-500">(WORK AT HEIGHT PERMIT) — PT JATIM AUTOCOMP INDONESIA</p>
                </div>
              </div>
            </div>
            <Link href="/history" className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors">
              Lihat Riwayat →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">Perhatian: Keselamatan Adalah Prioritas Utama</h3>
            <p className="text-sm text-amber-800 mt-1">
              Form ini harus diselesaikan sebelum memulai pekerjaan di ketinggian. Pastikan semua bagian terisi dengan benar dan mendapat persetujuan dari pihak yang berwenang.
            </p>
          </div>
        </div>

        {/* ── BAGIAN 1 ─────────────────────────────────────────────────── */}
        <Section title="BAGIAN 1: INFORMASI PETUGAS KETINGGIAN" section="bagian1"
          description="Data registrasi, identitas, dan informasi dasar pekerjaan"
          expanded={expanded.bagian1} toggle={toggle}
        >
          <div className="space-y-6">
            {/* Tipe perusahaan */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Tipe Petugas Ketinggian</label>
              <div className="flex gap-6">
                {[
                  { val: "eksternal", lbl: "Eksternal / Subkontraktor" },
                  { val: "internal",  lbl: "Internal / Karyawan PT.JAI" },
                ].map(({ val, lbl }) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.tipePerusahaan === val}
                      onChange={() => set({ tipePerusahaan: val as "eksternal" | "internal" })}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm text-black">{lbl}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Pekerjaan *</label>
                <textarea rows={2} placeholder="Jelaskan jenis dan deskripsi pekerjaan"
                  className={inputClass} value={formData.deskripsiPekerjaan}
                  onChange={e => set({ deskripsiPekerjaan: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lokasi *</label>
                <input type="text" placeholder="Lokasi pekerjaan"
                  className={inputClass} value={formData.lokasi}
                  onChange={e => set({ lokasi: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Pelaksanaan *</label>
                <input type="date" className={inputClass} value={formData.tanggalPelaksanaan}
                  onChange={e => set({ tanggalPelaksanaan: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Mulai</label>
                <input type="time" className={inputClass} value={formData.waktuMulai}
                  onChange={e => set({ waktuMulai: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Selesai</label>
                <input type="time" className={inputClass} value={formData.waktuSelesai}
                  onChange={e => set({ waktuSelesai: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pengawas Kontraktor *</label>
              <input type="text" placeholder="Nama pengawas kontraktor"
                className={inputClass} value={formData.namaPengawasKontraktor}
                onChange={e => set({ namaPengawasKontraktor: e.target.value })}
              />
            </div>

            {/* Petugas list */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Nama Petugas Ketinggian & Status Kesehatan
              </label>
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder={`Nama Petugas ${i + 1}`}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-black"
                      value={formData.namaPetugas[i]}
                      onChange={e => {
                        const arr = [...formData.namaPetugas];
                        arr[i] = e.target.value;
                        set({ namaPetugas: arr });
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.berbadanSehat[i]}
                        onChange={e => {
                          const arr = [...formData.berbadanSehat];
                          arr[i] = e.target.checked;
                          set({ berbadanSehat: arr });
                        }}
                        className="w-4 h-4 text-orange-600 rounded border-slate-400"
                      />
                      Berbadan Sehat
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 2 ─────────────────────────────────────────────────── */}
        <Section title="BAGIAN 2: PEMINJAMAN TANGGA LISTRIK / AWP" section="bagian2"
          description="Informasi peralatan dan perlengkapan yang digunakan"
          expanded={expanded.bagian2} toggle={toggle}
        >
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Kunci pagar */}
              <label className="flex items-center gap-4 cursor-pointer">
                <input type="checkbox" checked={formData.kunceePagar}
                  onChange={e => set({ kunceePagar: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded border-slate-300"
                />
                <span className="text-sm font-medium">Kunci Pagar Tangga Listrik</span>
              </label>

              {/* Rompi */}
              <div className="flex items-center gap-4">
                <input type="checkbox" checked={formData.rompiKetinggian}
                  onChange={e => set({ rompiKetinggian: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded border-slate-300"
                />
                <span className="text-sm font-medium">Rompi Ketinggian</span>
                <span className="text-xs text-slate-500">(No. Rompi:)</span>
                <input type="text" placeholder="No. Rompi"
                  className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                  value={formData.rompiAngka}
                  onChange={e => set({ rompiAngka: e.target.value })}
                />
              </div>

              {/* Safety Helmet */}
              <div className="flex items-center gap-4">
                <input type="checkbox"
                  checked={formData.safetyHelmetCount !== ""}
                  onChange={e => set({ safetyHelmetCount: e.target.checked ? "1" : "" })}
                  className="w-5 h-5 text-orange-600 rounded border-slate-300"
                />
                <span className="text-sm font-medium">Safety Helmet</span>
                <span className="text-xs text-slate-500">(Jumlah:)</span>
                <input type="text" placeholder="Jumlah"
                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                  value={formData.safetyHelmetCount}
                  onChange={e => set({ safetyHelmetCount: e.target.value })}
                />
              </div>

              {/* Full Body Harness */}
              <div className="flex items-center gap-4">
                <input type="checkbox"
                  checked={formData.fullBodyHarnessCount !== ""}
                  onChange={e => set({ fullBodyHarnessCount: e.target.checked ? "1" : "" })}
                  className="w-5 h-5 text-orange-600 rounded border-slate-300"
                />
                <span className="text-sm font-medium">Full Body Harness</span>
                <span className="text-xs text-slate-500">(Jumlah:)</span>
                <input type="text" placeholder="Jumlah"
                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                  value={formData.fullBodyHarnessCount}
                  onChange={e => set({ fullBodyHarnessCount: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-slate-700 space-y-1">
              <p className="font-semibold">Point Penting:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Tangga listrik / AWP tidak bisa digunakan di luar gedung saat hujan</li>
                <li>Segera kembalikan kunci pagar dan APD setelah selesai</li>
                <li>Jaga kebersihan tangga listrik setelah pemakaian</li>
                <li>Pastikan beban tidak melebihi kapasitas maksimal safety line = 150 kg</li>
                <li>Wajib mengenakan APD sesuai standar operasional</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 3 ─────────────────────────────────────────────────── */}
        <Section title="BAGIAN 3: PEKERJAAN BERESIKO TINGGI" section="bagian3"
          description="Checklist keselamatan untuk area kerja di ketinggian"
          expanded={expanded.bagian3} toggle={toggle}
        >
          <div className="space-y-3">
            <YesNo label="Apakah area kerja telah diperiksa dan aman untuk digunakan"                                value={formData.areaKerjaAman}      onChange={v => set({ areaKerjaAman: v })} />
            <YesNo label="Jika terjadi kebakaran, apakah paham cara menggunakan alat pemadam kebakaran"             value={formData.kebakaranProcedure}  onChange={v => set({ kebakaranProcedure: v })} />
            <YesNo label="Apakah ada pekerjaan listrik"                                                             value={formData.pekerjaanListrik}    onChange={v => set({ pekerjaanListrik: v })} />
            <YesNo label="Melakukan prosedur LOTO"                                                                  value={formData.prosedurLoto}        onChange={v => set({ prosedurLoto: v })} />
            <YesNo label="Menutupi area di bawah dan sekitar dengan perisai yang tidak mudah terbakar"             value={formData.perisakArea}         onChange={v => set({ perisakArea: v })} />
            <YesNo label="Apakah safety / lfl line tersedia dan dalam keadaan baik"                                value={formData.safetyLineLine}      onChange={v => set({ safetyLineLine: v })} />
            <YesNo label="Apakah alat bantu kerja (Tangga, Scaffolding) yang akan digunakan dalam keadaan aman"   value={formData.alatBantuKerja}      onChange={v => set({ alatBantuKerja: v })} />
            <YesNo label="Menggunakan rompi saat bekerja di ketinggian"                                            value={formData.rompiSaatBekerja}    onChange={v => set({ rompiSaatBekerja: v })} />
          </div>
        </Section>

        {/* ── BAGIAN 4 ─────────────────────────────────────────────────── */}
        <Section title="BAGIAN 4: ALAT PELINDUNG DIRI" section="bagian4"
          description="Pengecekan APD sebelum bekerja di ketinggian"
          expanded={expanded.bagian4} toggle={toggle}
        >
          <div className="space-y-3">
            <YesNo label="Beban yang dibawa saat naik tidak boleh lebih dari 5 kg (diluar beban berat tubuh dan APD)" value={formData.bebanBeratTubuh}     onChange={v => set({ bebanBeratTubuh: v })} />
            <YesNo label="Apakah helm sudah sesuai standar"                                                          value={formData.helmStandar}         onChange={v => set({ helmStandar: v })} />
            <YesNo label="Rambu-rambu / safety warning apakah sudah tersedia"                                        value={formData.rambuSafetyWarning}  onChange={v => set({ rambuSafetyWarning: v })} />
          </div>
        </Section>

        {/* ── BAGIAN 5 ─────────────────────────────────────────────────── */}
        <Section title="BAGIAN 5: POINT PENGECEKAN BODY HARNESS SEBELUM DIGUNAKAN" section="bagian5"
          description="Verifikasi kondisi harness dan perlengkapan safety"
          expanded={expanded.bagian5} toggle={toggle}
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Body Harness</h4>
              <div className="space-y-3">
                <YesNo label="1. Webbing — Kondisi jahitan baik (tidak lepas, tidak berserabut)"                                value={formData.bodyHarnessWebbing}    onChange={v => set({ bodyHarnessWebbing: v })} />
                <YesNo label="2. D-Ring — Kondisi baik (tidak retak/bengkok/berkarat, dapat diputar bebas/fleksibel)"         value={formData.bodyHarnessDRing}      onChange={v => set({ bodyHarnessDRing: v })} />
                <YesNo label="3. Adjustment Buckle (Gesper) — Kondisi baik (tidak retak/bengkok/berkarat, mengunci sempurna)" value={formData.bodyHarnessAdjustment} onChange={v => set({ bodyHarnessAdjustment: v })} />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Lanyard</h4>
              <div className="space-y-3">
                <YesNo label="1. Absorber & Timbes — Kondisi jahitan baik (tidak lepas, tidak berserabut)"                    value={formData.lanyardAbsorber}  onChange={v => set({ lanyardAbsorber: v })} />
                <YesNo label="2. Snap Hook — Kondisi baik (tidak retak/bengkok/berkarat, dapat dikunci dengan sempurna)"      value={formData.lanyardSnapHook}  onChange={v => set({ lanyardSnapHook: v })} />
                <YesNo label="3. Rope Lanyard — Kondisi baik (tidak berserabut, fiber tidak aus / terpotong)"                value={formData.lanyardRope}      onChange={v => set({ lanyardRope: v })} />
              </div>
            </div>
          </div>
        </Section>

        {/* ── PERSETUJUAN ──────────────────────────────────────────────── */}
        <Section title="PERSETUJUAN" section="persetujuan"
          description="Tanda tangan dan persetujuan dari pihak yang berwenang"
          expanded={expanded.persetujuan} toggle={toggle}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SigBox label="SPV Terkait"    name={formData.persetujuan.spvNama}        onChange={v => set({ persetujuan: { ...formData.persetujuan, spvNama: v } })} />
            <SigBox label="Kontraktor"     name={formData.persetujuan.kontraktorNama} onChange={v => set({ persetujuan: { ...formData.persetujuan, kontraktorNama: v } })} />
            <SigBox label="SFO"            name={formData.persetujuan.sfoNama}        onChange={v => set({ persetujuan: { ...formData.persetujuan, sfoNama: v } })} />
            <SigBox label="MR / PGA MGR"  name={formData.persetujuan.mrPgaNama}      onChange={v => set({ persetujuan: { ...formData.persetujuan, mrPgaNama: v } })} />
          </div>
        </Section>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-md sticky bottom-4 border border-slate-200">
          <button onClick={handleSave} disabled={submitting}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            <Save className="w-5 h-5" />
            <span>{submitting ? "Menyimpan..." : "Simpan Draft"}</span>
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-lg disabled:opacity-60"
          >
            <Send className="w-5 h-5" />
            <span>{submitting ? "Mengajukan..." : "Ajukan Izin"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}