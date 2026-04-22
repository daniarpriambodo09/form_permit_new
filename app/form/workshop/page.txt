// app/form/workshop/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Home, Flame, Save, Send, AlertCircle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type WorkDetail = { detail: string; mulai: string; selesai: string };

interface FormData {
  noRegistrasi: string;
  namaKontraktor: string;
  namaNIK: string;
  namaFireWatch: string;
  namaNIKFireWatch: string;
  lokasi: string;
  tanggalPelaksanaan: string;
  waktuPukul: string;
  jabaranPemberiIzin: string;
  namaNIKPemberiIzin: string;
  jenisPekerjaan: {
    preventive: boolean; tangki: boolean; panel: boolean;
    cutting: WorkDetail; grinding: WorkDetail; welding: WorkDetail; painting: WorkDetail;
    spray: boolean; nonSpray: boolean;           // ← khusus workshop
    lainnya: boolean; lainnyaKeterangan: string;
  };
  areaBerisiko: {
    ruangTertutup: boolean; bahanMudah: boolean; gas: boolean; ketinggian: boolean;
    cairan: boolean; hydrocarbon: boolean; lain: string;
  };
  pencegahan: {
    equipment: string; apar: string; sensor: string; apd: string;
    meter11_cairan: string; lantai: string; lantaiBasah: string; cairan_diproteksi: string;
    lembaran: string; lindungi_conveyor: string;
    ruang_tertutup_dibersihkan: string; uap_dibuang: string;
    dinding_konstruksi: string; bahan_dipindahkan: string;
    firewatch_ada: string; firewatch_pelatihan: string;
    permintaan_tambahan: string;
  };
  persetujuan: { spvNama: string; kontraktorNama: string; sfoNama: string; pgaNama: string };
}

// ─── UI Components (identical to hot-work) ───────────────────────────────────
const Section = ({ title, section, description, expanded, toggle, children }: any) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-slate-200">
    <button onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200 hover:from-orange-100 transition-colors"
    >
      <div className="text-left">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {expanded[section] ? <ChevronUp className="w-5 h-5 text-orange-600 shrink-0" /> : <ChevronDown className="w-5 h-5 text-orange-600 shrink-0" />}
    </button>
    {expanded[section] && <div className="p-6">{children}</div>}
  </div>
);

const CheckItem = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-orange-50 transition-colors group">
    <input type="checkbox" checked={checked} onChange={onChange}
      className="w-5 h-5 text-orange-600 rounded border-slate-300 mt-0.5 shrink-0" />
    <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
  </label>
);

const YesNoRow = ({ label, fieldKey, pencegahan, setPencegahan }: {
  label: string; fieldKey: string; pencegahan: any; setPencegahan: (p: any) => void;
}) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
    <span className="text-sm text-slate-700 flex-1 mr-4">{label}</span>
    <div className="flex gap-4 shrink-0">
      {["ya","tidak"].map(v => (
        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name={fieldKey} value={v}
            checked={pencegahan[fieldKey] === v}
            onChange={() => setPencegahan({ ...pencegahan, [fieldKey]: v })}
            className="w-4 h-4 text-orange-600"
          />
          <span className="text-sm">{v === "ya" ? "YA" : "TIDAK"}</span>
        </label>
      ))}
    </div>
  </div>
);

const SigBox = ({ label, name, onChange }: { label: string; name: string; onChange: (v: string) => void }) => (
  <div className="border border-slate-200 rounded-lg p-4">
    <label className="block text-sm font-semibold text-slate-700 mb-3">{label}</label>
    <input type="text" placeholder="Nama Lengkap" value={name} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-orange-500 text-black"
    />
    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg min-h-28 flex items-center justify-center">
      <span className="text-slate-400 text-xs">[Tanda Tangan]</span>
    </div>
  </div>
);

// ─── Defaults ────────────────────────────────────────────────────────────────
const emptyWork = (): WorkDetail => ({ detail: "", mulai: "", selesai: "" });
const defaultForm = (): FormData => ({
  noRegistrasi: "", namaKontraktor: "", namaNIK: "",
  namaFireWatch: "", namaNIKFireWatch: "", lokasi: "",
  tanggalPelaksanaan: "", waktuPukul: "",
  jabaranPemberiIzin: "", namaNIKPemberiIzin: "",
  jenisPekerjaan: {
    preventive: false, tangki: false, panel: false,
    cutting: emptyWork(), grinding: emptyWork(), welding: emptyWork(), painting: emptyWork(),
    spray: false, nonSpray: false,
    lainnya: false, lainnyaKeterangan: "",
  },
  areaBerisiko: { ruangTertutup: false, bahanMudah: false, gas: false, ketinggian: false, cairan: false, hydrocarbon: false, lain: "" },
  pencegahan: {
    equipment: "tidak", apar: "tidak", sensor: "tidak", apd: "tidak",
    meter11_cairan: "tidak", lantai: "tidak", lantaiBasah: "tidak", cairan_diproteksi: "tidak",
    lembaran: "tidak", lindungi_conveyor: "tidak",
    ruang_tertutup_dibersihkan: "tidak", uap_dibuang: "tidak",
    dinding_konstruksi: "tidak", bahan_dipindahkan: "tidak",
    firewatch_ada: "tidak", firewatch_pelatihan: "tidak",
    permintaan_tambahan: "",
  },
  persetujuan: { spvNama: "", kontraktorNama: "", sfoNama: "", pgaNama: "" },
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkshopPermitForm() {
  const [formData, setFormData]   = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded]   = useState({ bagian1: true, bagian2: true, bagian3: true, bagian4: true });

  const toggle = (s: string) => setExpanded(prev => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));
  const setJ   = (patch: Partial<FormData["jenisPekerjaan"]>) =>
    setFormData(prev => ({ ...prev, jenisPekerjaan: { ...prev.jenisPekerjaan, ...patch } }));
  const setA   = (patch: Partial<FormData["areaBerisiko"]>) =>
    setFormData(prev => ({ ...prev, areaBerisiko: { ...prev.areaBerisiko, ...patch } }));
  const setP   = (patch: Partial<FormData["pencegahan"]>) =>
    setFormData(prev => ({ ...prev, pencegahan: { ...prev.pencegahan, ...patch } }));
  const setS   = (patch: Partial<FormData["persetujuan"]>) =>
    setFormData(prev => ({ ...prev, persetujuan: { ...prev.persetujuan, ...patch } }));

  const setWork = (key: "cutting"|"grinding"|"welding"|"painting", field: keyof WorkDetail, val: string) =>
    setJ({ [key]: { ...formData.jenisPekerjaan[key], [field]: val } });

  const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black";

  const submit = async (isSubmit: boolean) => {
    setSubmitting(true);
    try {
      const res  = await fetch("/api/forms/workshop", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, isSubmit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan server");
      return data;
    } finally { setSubmitting(false); }
  };

  const handleSave   = async () => { try { const r = await submit(false); alert(`Draft disimpan! ID: ${r.id_form}`); } catch (e: any) { alert("Gagal: " + e.message); } };
  const handleSubmit = async () => { try { const r = await submit(true);  alert(`Izin diajukan! ID: ${r.id_form}`); window.location.href = "/history"; } catch (e: any) { alert("Gagal: " + e.message); } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Home className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Flame className="w-5 h-5 text-orange-600" /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">FORM WORKSHOP PERMIT</h1>
                <p className="text-xs text-slate-500">(IJIN KERJA WORKSHOP) — PT JATIM AUTOCOMP INDONESIA</p>
              </div>
            </div>
          </div>
          <Link href="/history" className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
            Lihat Riwayat →
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Perhatian: Keselamatan Adalah Prioritas Utama</p>
            <p className="text-sm text-amber-800 mt-1">Pastikan semua bagian diisi dengan lengkap dan mendapat persetujuan dari pihak berwenang sebelum pekerjaan dimulai.</p>
          </div>
        </div>

        {/* ── BAGIAN 1 ──────────────────────────────────────────────────── */}
        <Section title="BAGIAN 1: INFORMASI REGISTRASI & IDENTITAS PEKERJAAN" section="bagian1"
          description="Data registrasi, kontraktor, pekerja, lokasi, dan jadwal"
          expanded={expanded} toggle={toggle}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">No. Registrasi *</label>
                <input type="text" value={formData.noRegistrasi} onChange={e => setFormData(p => ({ ...p, noRegistrasi: e.target.value }))}
                  className={inputCls} placeholder="HW-2024-001" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kontraktor *</label>
              <input type="text" value={formData.namaKontraktor} onChange={e => setFormData(p => ({ ...p, namaKontraktor: e.target.value }))}
                className={inputCls} placeholder="PT ABC Konstruksi" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pekerja / NIK *</label>
              <input type="text" value={formData.namaNIK} onChange={e => setFormData(p => ({ ...p, namaNIK: e.target.value }))}
                className={inputCls} placeholder="Nama lengkap atau NIK" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lokasi Pekerjaan *</label>
                <input type="text" value={formData.lokasi} onChange={e => setFormData(p => ({ ...p, lokasi: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Pelaksanaan *</label>
                <input type="date" value={formData.tanggalPelaksanaan} onChange={e => setFormData(p => ({ ...p, tanggalPelaksanaan: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu (Pukul)</label>
              <input type="time" value={formData.waktuPukul} onChange={e => setFormData(p => ({ ...p, waktuPukul: e.target.value }))} className={inputCls} />
            </div>

            {/* Fire Watch */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 text-sm mb-4">Fire Watch (Pengawas Api)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Fire Watch *</label>
                  <input type="text" value={formData.namaFireWatch} onChange={e => setFormData(p => ({ ...p, namaFireWatch: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">NIK Fire Watch *</label>
                  <input type="text" value={formData.namaNIKFireWatch} onChange={e => setFormData(p => ({ ...p, namaNIKFireWatch: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanda Tangan Fire Watch</label>
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg min-h-24 flex items-center justify-center">
                  <span className="text-slate-400 text-xs">[Tanda Tangan]</span>
                </div>
              </div>
            </div>

            {/* Pemberi Izin */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-900 text-sm mb-4">Pemberi Izin</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Jabatan Pemberi Izin *</label>
                  <input type="text" value={formData.jabaranPemberiIzin} onChange={e => setFormData(p => ({ ...p, jabaranPemberiIzin: e.target.value }))}
                    className={inputCls} placeholder="Site Supervisor, Safety Officer" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nama / NIK Pemberi Izin *</label>
                  <input type="text" value={formData.namaNIKPemberiIzin} onChange={e => setFormData(p => ({ ...p, namaNIKPemberiIzin: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanda Tangan Pemberi Izin</label>
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg min-h-24 flex items-center justify-center">
                  <span className="text-slate-400 text-xs">[Tanda Tangan]</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 2 ──────────────────────────────────────────────────── */}
        <Section title="BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO TINGGI" section="bagian2"
          description="Pilih jenis pekerjaan dan identifikasi area berisiko"
          expanded={expanded} toggle={toggle}
        >
          <div className="space-y-8">
            {/* 2A */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">A. Pilihan Jenis Pekerjaan</h4>
              {[
                { key: "preventive", label: "Preventive Genset / Pump room" },
                { key: "tangki",     label: "Tangki Solar" },
                { key: "panel",      label: "Panel Listrik" },
              ].map(item => (
                <CheckItem key={item.key} label={item.label}
                  checked={(formData.jenisPekerjaan as any)[item.key]}
                  onChange={() => setJ({ [item.key]: !(formData.jenisPekerjaan as any)[item.key] })}
                />
              ))}
            </div>

            {/* 2B Detail — workshop has spray/non-spray under painting */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">B. Detail Pekerjaan Panas (Jelaskan & Waktu Pukul)</h4>
              <div className="space-y-4">
                {(["cutting","grinding","welding","painting"] as const).map(key => {
                  const item = formData.jenisPekerjaan[key];
                  return (
                    <div key={key} className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-orange-50 transition-colors">
                      <p className="text-sm font-semibold text-slate-900 mb-3 capitalize">{key}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Detail Pekerjaan</label>
                          <input type="text" placeholder={`Detail ${key}...`} value={item.detail}
                            onChange={e => setWork(key, "detail", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Mulai</label>
                          <input type="time" value={item.mulai} onChange={e => setWork(key, "mulai", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Selesai</label>
                          <input type="time" value={item.selesai} onChange={e => setWork(key, "selesai", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                          />
                        </div>
                      </div>

                      {/* ── SPRAY / NON SPRAY — hanya untuk painting, khusus workshop ── */}
                      {key === "painting" && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-300">
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-orange-100 transition-colors border border-slate-200 bg-white">
                            <input type="checkbox" checked={formData.jenisPekerjaan.spray}
                              onChange={() => setJ({ spray: !formData.jenisPekerjaan.spray })}
                              className="w-5 h-5 text-orange-600 rounded border-slate-400"
                            />
                            <span className="text-sm font-bold text-slate-900">SPRAY</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-orange-100 transition-colors border border-slate-200 bg-white">
                            <input type="checkbox" checked={formData.jenisPekerjaan.nonSpray}
                              onChange={() => setJ({ nonSpray: !formData.jenisPekerjaan.nonSpray })}
                              className="w-5 h-5 text-orange-600 rounded border-slate-400"
                            />
                            <span className="text-sm font-bold text-slate-900">NON SPRAY</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2C Lainnya */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-3 pb-3 border-b border-slate-200">C. Pekerjaan Lainnya</h4>
              <CheckItem label="Ada pekerjaan lain yang menggunakan aplikasi panas lainnya"
                checked={formData.jenisPekerjaan.lainnya}
                onChange={() => setJ({ lainnya: !formData.jenisPekerjaan.lainnya })}
              />
              {formData.jenisPekerjaan.lainnya && (
                <textarea rows={2} value={formData.jenisPekerjaan.lainnyaKeterangan}
                  onChange={e => setJ({ lainnyaKeterangan: e.target.value })}
                  placeholder="Sebutkan jenis pekerjaan lainnya..."
                  className="w-full mt-3 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                />
              )}
            </div>

            {/* Area berisiko */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">Area / Equipment Berisiko Tinggi</h4>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-1">
                {[
                  { key: "ruangTertutup", label: "Ruang tertutup / area pembuangan / container" },
                  { key: "bahanMudah",    label: "Bahan mudah terbakar" },
                  { key: "gas",           label: "Gas (bekerja dalam bejana / tangki)" },
                  { key: "ketinggian",    label: "Bekerja di ketinggian" },
                  { key: "cairan",        label: "Cairan / Gas bertekanan" },
                  { key: "hydrocarbon",   label: "Cairan hydrocarbon (minyak, kondensat)" },
                ].map(item => (
                  <CheckItem key={item.key} label={item.label}
                    checked={(formData.areaBerisiko as any)[item.key]}
                    onChange={() => setA({ [item.key]: !(formData.areaBerisiko as any)[item.key] })}
                  />
                ))}
                <div className="mt-3 pt-3 border-t border-red-300">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bahaya lain (sebutkan)</label>
                  <input type="text" value={formData.areaBerisiko.lain}
                    onChange={e => setA({ lain: e.target.value })}
                    className="w-full px-4 py-2.5 border border-red-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 3 ──────────────────────────────────────────────────── */}
        <Section title="BAGIAN 3: HAL-HAL YANG PERLU DIPERHATIKAN SEBAGAI UPAYA PENCEGAHAN" section="bagian3"
          description="Checklist keselamatan untuk setiap kategori pekerjaan"
          expanded={expanded} toggle={toggle}
        >
          <div className="space-y-6">
            {/* 1 Umum */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">1. UMUM</h4>
              <div className="space-y-3">
                {[
                  { key: "equipment", label: "Equipment / Tools kondisi baik" },
                  { key: "apar",      label: "Alat pemadam api (APAR, Hydrant) tersedia" },
                  { key: "sensor",    label: "Sensor Area Smoke Detector sudah dinon-aktifkan" },
                  { key: "apd",       label: "APD lengkap dipakai" },
                ].map(item => <YesNoRow key={item.key} label={item.label} fieldKey={item.key} pencegahan={formData.pencegahan} setPencegahan={setP} />)}
              </div>
            </div>

            {/* 2 11 meter */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">2. DAERAH 11 METER DARI PEKERJAAN</h4>
              <div className="space-y-3">
                {[
                  { key: "meter11_cairan",    label: "Tidak ada cairan mudah terbakar dan mudah menyala" },
                  { key: "lantai",            label: "Lantai disapu bersih dari benda mudah terbakar" },
                  { key: "lantaiBasah",       label: "Lantai dari bahan mudah terbakar dibasahi / ditutupi pasir basah / perisai metal" },
                  { key: "cairan_diproteksi", label: "Cairan mudah terbakar dan menyala diproteksi dengan tutup / perisai metal" },
                  { key: "lembaran",          label: "Lembaran di bawah pekerjaan untuk menampung bunga api" },
                  { key: "lindungi_conveyor", label: "Lindungi conveyor, instalasi kabel, equipment penghantar listrik dengan perisai metal" },
                ].map(item => <YesNoRow key={item.key} label={item.label} fieldKey={item.key} pencegahan={formData.pencegahan} setPencegahan={setP} />)}
              </div>
            </div>

            {/* 3 Ruangan tertutup */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">3. PEKERJAAN PADA RUANGAN TERTUTUP</h4>
              <div className="space-y-3">
                {[
                  { key: "ruang_tertutup_dibersihkan", label: "Peralatan dibersihkan dari semua bahan mudah terbakar" },
                  { key: "uap_dibuang",               label: "Uap menyala di ruangan tertutup dibuang dari ruangan" },
                ].map(item => <YesNoRow key={item.key} label={item.label} fieldKey={item.key} pencegahan={formData.pencegahan} setPencegahan={setP} />)}
              </div>
            </div>

            {/* 4 Dinding */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">4. PEKERJAAN PADA DINDING / LANGIT-LANGIT</h4>
              <div className="space-y-3">
                {[
                  { key: "dinding_konstruksi", label: "Pekerjaan pada dinding/langit-langit konstruksi tidak mudah terbakar & tanpa penutup mudah terbakar" },
                  { key: "bahan_dipindahkan",  label: "Bahan mudah terbakar dipindahkan dari dinding yang berseberangan" },
                ].map(item => <YesNoRow key={item.key} label={item.label} fieldKey={item.key} pencegahan={formData.pencegahan} setPencegahan={setP} />)}
              </div>
            </div>

            {/* 5 Fire watch */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-bold text-blue-900 text-sm mb-4">5. PERAN API (FIRE WATCH)</h4>
              <div className="space-y-3">
                {[
                  { key: "firewatch_ada",       label: "Fire Watch ada memastikan area aman selama proses dan 30 menit setelahnya" },
                  { key: "firewatch_pelatihan", label: "Fire Watch sudah mendapat pelatihan dan mampu menggunakan alat pemadam kebakaran & fire alarm" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-700 flex-1 mr-4">{item.label}</span>
                    <div className="flex gap-4 shrink-0">
                      {["ya","tidak"].map(v => (
                        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={item.key} value={v}
                            checked={formData.pencegahan[item.key as keyof typeof formData.pencegahan] === v}
                            onChange={() => setP({ [item.key]: v })}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-sm">{v === "ya" ? "YA" : "TIDAK"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6 Permintaan tambahan — Workshop tidak punya fire blanket */}
            <div className="border border-slate-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Permintaan Tambahan Tindakan Pengamanan</label>
              <textarea rows={3} value={formData.pencegahan.permintaan_tambahan}
                onChange={e => setP({ permintaan_tambahan: e.target.value })}
                className={inputCls} placeholder="Sebutkan tindakan pengamanan tambahan yang dibutuhkan..."
              />
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 4 PERSETUJUAN ───────────────────────────────────────── */}
        <Section title="BAGIAN 4: PERSETUJUAN" section="bagian4"
          description="Tanda tangan dan persetujuan dari pihak terkait"
          expanded={expanded} toggle={toggle}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SigBox label="SPV Terkait / Supervisor"     name={formData.persetujuan.spvNama}        onChange={v => setS({ spvNama: v })} />
            <SigBox label="Kontraktor"                   name={formData.persetujuan.kontraktorNama} onChange={v => setS({ kontraktorNama: v })} />
            <SigBox label="Safety Fire Officer (SFO)"   name={formData.persetujuan.sfoNama}        onChange={v => setS({ sfoNama: v })} />
            <SigBox label="PGA / Dept Head"             name={formData.persetujuan.pgaNama}        onChange={v => setS({ pgaNama: v })} />
          </div>
        </Section>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <div className="flex justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-md sticky bottom-4 border border-slate-200">
          <button onClick={handleSave} disabled={submitting}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            <Save className="w-5 h-5" />
            {submitting ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg disabled:opacity-60"
          >
            <Send className="w-5 h-5" />
            {submitting ? "Mengajukan..." : "Ajukan Izin"}
          </button>
        </div>
      </div>
    </div>
  );
}