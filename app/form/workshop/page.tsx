// app/form/workshop/page.tsx
// Alur baru:
//   Internal:  Firewatch → SPV → Admin K3 → SFO → MR/PGA
//   Eksternal: Kontraktor → Firewatch → SPV → Admin K3 → SFO → MR/PGA
"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Home, Flame, Save, Send, AlertCircle, Lock } from "lucide-react";

type WorkDetail = { detail: string; mulai: string; selesai: string };

interface FormData {
  tipePerusahaan: "internal" | "eksternal";
  noRegistrasi: string;
  namaKontraktor: string;
  namaNIK: string;
  lokasi: string;
  tanggalPelaksanaan: string;
  waktuPukul: string;
  jenisPekerjaan: {
    preventive: boolean; tangki: boolean; panel: boolean;
    cutting: WorkDetail; grinding: WorkDetail; welding: WorkDetail; painting: WorkDetail;
    spray: boolean; nonSpray: boolean;
    lainnya: boolean; lainnyaKeterangan: string;
  };
  areaBerisiko: { ruangTertutup: boolean; bahanMudah: boolean; gas: boolean; ketinggian: boolean; cairan: boolean; hydrocarbon: boolean; lain: string };
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

const Section = ({ title, section, description, expanded, toggle, children }: any) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-slate-200">
    <button onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200 hover:from-orange-100 transition-colors">
      <div className="text-left">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {expanded[section] ? <ChevronUp className="w-5 h-5 text-orange-600 shrink-0" /> : <ChevronDown className="w-5 h-5 text-orange-600 shrink-0" />}
    </button>
    {expanded[section] && <div className="p-6">{children}</div>}
  </div>
);

const CheckItem = ({ label, checked, onChange }: any) => (
  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-orange-50 transition-colors">
    <input type="checkbox" checked={checked} onChange={onChange} className="w-5 h-5 text-orange-600 rounded border-slate-300 mt-0.5 shrink-0" />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

const YesNoRow = ({ label, fieldKey, pencegahan, setPencegahan }: any) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
    <span className="text-sm text-slate-700 flex-1 mr-4">{label}</span>
    <div className="flex gap-4 shrink-0">
      {["ya", "tidak"].map(v => (
        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name={fieldKey} value={v} checked={pencegahan[fieldKey] === v}
            onChange={() => setPencegahan({ ...pencegahan, [fieldKey]: v })} className="w-4 h-4 text-orange-600" />
          <span className="text-sm">{v === "ya" ? "YA" : "TIDAK"}</span>
        </label>
      ))}
    </div>
  </div>
);

const DisabledField = ({ placeholder }: any) => (
  <div className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-400 text-sm italic select-none cursor-not-allowed">{placeholder}</div>
);

const emptyWork = (): WorkDetail => ({ detail: "", mulai: "", selesai: "" });
const defaultForm = (): FormData => ({
  tipePerusahaan: "internal",
  noRegistrasi: "", namaKontraktor: "", namaNIK: "", lokasi: "", tanggalPelaksanaan: "", waktuPukul: "",
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

const getApproverLabels = (isInternal: boolean) => isInternal
  ? ["Fire Watch", "SPV / Pemberi Izin", "Admin K3", "SFO", "MR I/PGA MGR"]
  : ["Kontraktor", "Fire Watch", "SPV / Pemberi Izin", "Admin K3", "SFO", "MR I/PGA MGR"];

export default function WorkshopPermitForm() {
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState({ bagian1: true, bagian2: true, bagian3: true, bagian4: true });

  const toggle = (s: string) => setExpanded(prev => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));
  const setJ = (patch: any) => setFormData(prev => ({ ...prev, jenisPekerjaan: { ...prev.jenisPekerjaan, ...patch } }));
  const setA = (patch: any) => setFormData(prev => ({ ...prev, areaBerisiko: { ...prev.areaBerisiko, ...patch } }));
  const setP = (patch: any) => setFormData(prev => ({ ...prev, pencegahan: { ...prev.pencegahan, ...patch } }));
  const setWork = (key: "cutting"|"grinding"|"welding"|"painting", field: keyof WorkDetail, val: string) =>
    setJ({ [key]: { ...formData.jenisPekerjaan[key], [field]: val } });

  const isInternal = formData.tipePerusahaan === "internal";
  const approverLabels = getApproverLabels(isInternal);
  const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black";

  const submit = async (isSubmit: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/forms/workshop", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, isSubmit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan server");
      return data;
    } finally { setSubmitting(false); }
  };

  const handleSave   = async () => { try { const r = await submit(false); alert(`Draft disimpan! ID: ${r.id_form}`); } catch (e: any) { alert("Gagal: " + e.message); } };
  const handleSubmit = async () => { try { const r = await submit(true); alert(`Izin diajukan! ID: ${r.id_form}`); window.location.href = "/history"; } catch (e: any) { alert("Gagal: " + e.message); } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg"><Home className="w-5 h-5 text-slate-600" /></Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Flame className="w-5 h-5 text-orange-600" /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">FORM WORKSHOP PERMIT</h1>
                <p className="text-xs text-slate-500">(IJIN KERJA WORKSHOP) — PT JATIM AUTOCOMP INDONESIA</p>
              </div>
            </div>
          </div>
          <Link href="/history" className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg">Lihat Riwayat →</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Pastikan semua bagian diisi dengan lengkap dan mendapat persetujuan sebelum pekerjaan dimulai.</p>
        </div>

        {/* ── BAGIAN 1 ── */}
        <Section title="BAGIAN 1: INFORMASI REGISTRASI & IDENTITAS PEKERJAAN"
          section="bagian1" description="Data registrasi, kontraktor, pekerja, lokasi, dan jadwal"
          expanded={expanded} toggle={toggle}>
          <div className="space-y-5">

            {/* Pilihan tipe perusahaan */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe Pekerja / Perusahaan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "internal",  label: "Internal / Karyawan PT.JAI",   desc: "Alur: Firewatch → SPV → Admin K3 → SFO → MR/PGA" },
                  { value: "eksternal", label: "Eksternal / Subkontraktor",     desc: "Alur: Kontraktor → Firewatch → SPV → Admin K3 → SFO → MR/PGA" },
                ].map(opt => (
                  <label key={opt.value}
                    className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.tipePerusahaan === opt.value ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-200"
                    }`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="tipePerusahaan" value={opt.value}
                        checked={formData.tipePerusahaan === opt.value}
                        onChange={() => setFormData(p => ({ ...p, tipePerusahaan: opt.value as any }))}
                        className="text-orange-500" />
                      <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 ml-5">{opt.desc}</p>
                  </label>
                ))}
              </div>
              <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${isInternal ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
                <strong>Alur approval:</strong>
                <span className="ml-1">{isInternal ? "Firewatch → SPV → Admin K3 → SFO → MR I/PGA MGR" : "Kontraktor → Firewatch → SPV → Admin K3 → SFO → MR I/PGA MGR"}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Kontraktor{" "}
                {isInternal
                  ? <span className="text-slate-400 font-normal text-xs ml-1">(tidak diperlukan untuk Internal)</span>
                  : <span className="text-red-500">*</span>
                }
              </label>
              <input
                type="text"
                value={isInternal ? "" : formData.namaKontraktor}
                onChange={e => setFormData(p => ({ ...p, namaKontraktor: e.target.value }))}
                disabled={isInternal}
                required={!isInternal}
                placeholder={isInternal ? "Tidak diperlukan untuk Internal / Karyawan PT.JAI" : "PT ABC"}
                className={`${inputCls} ${isInternal ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60" : ""}`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pekerja / NIK *</label>
              <input type="text" value={formData.namaNIK} onChange={e => setFormData(p => ({ ...p, namaNIK: e.target.value }))} className={inputCls} placeholder="Nama atau NIK" />
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

            {/* Fire Watch — selalu ada */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                <h4 className="font-bold text-blue-900 text-sm">Fire Watch (Pengawas Api)</h4>
              </div>
              <div className="flex items-start gap-2 bg-blue-100 border border-blue-300 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {isInternal
                    ? <>Fire Watch adalah approver <strong>pertama</strong> (alur Internal). Terisi otomatis saat Fire Watch menyetujui.</>
                    : <>Fire Watch adalah approver <strong>kedua</strong> setelah Kontraktor (alur Eksternal). Terisi otomatis saat Fire Watch menyetujui.</>
                  }
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-slate-400 mb-2">Nama Fire Watch</label><DisabledField placeholder="Diisi otomatis oleh Fire Watch" /></div>
                <div><label className="block text-sm font-semibold text-slate-400 mb-2">NIK Fire Watch</label><DisabledField placeholder="Diisi otomatis oleh Fire Watch" /></div>
              </div>
            </div>

            {/* Pemberi Izin (SPV) */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-green-600 shrink-0" />
                <h4 className="font-bold text-green-900 text-sm">Pemberi Izin (SPV)</h4>
              </div>
              <div className="flex items-start gap-2 bg-green-100 border border-green-300 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">Jabatan dan NIK Pemberi Izin terisi otomatis dari profil SPV saat approval.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-slate-400 mb-2">Jabatan Pemberi Izin</label><DisabledField placeholder="Diisi otomatis oleh SPV" /></div>
                <div><label className="block text-sm font-semibold text-slate-400 mb-2">Nama / NIK Pemberi Izin</label><DisabledField placeholder="Diisi otomatis oleh SPV" /></div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 2 ── */}
        <Section title="BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO TINGGI"
          section="bagian2" description="Pilih jenis pekerjaan dan identifikasi area berisiko"
          expanded={expanded} toggle={toggle}>
          <div className="space-y-8">
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">A. Pilihan Jenis Pekerjaan</h4>
              {[{ key:"preventive", label:"Preventive Genset / Pump room" }, { key:"tangki", label:"Tangki Solar" }, { key:"panel", label:"Panel Listrik" }]
                .map(item => <CheckItem key={item.key} label={item.label} checked={(formData.jenisPekerjaan as any)[item.key]} onChange={() => setJ({ [item.key]: !(formData.jenisPekerjaan as any)[item.key] })} />)}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">B. Detail Pekerjaan</h4>
              <div className="space-y-4">
                {(["cutting", "grinding", "welding", "painting"] as const).map(key => {
                  const item = formData.jenisPekerjaan[key];
                  return (
                    <div key={key} className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-orange-50 transition-colors">
                      <p className="text-sm font-semibold text-slate-900 mb-3 capitalize">{key}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1"><label className="block text-xs font-medium text-slate-600 mb-1">Detail</label><input type="text" value={item.detail} onChange={e => setWork(key, "detail", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" /></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Mulai</label><input type="time" value={item.mulai} onChange={e => setWork(key, "mulai", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" /></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Selesai</label><input type="time" value={item.selesai} onChange={e => setWork(key, "selesai", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" /></div>
                      </div>
                      {/* Spray/NonSpray khusus Painting */}
                      {key === "painting" && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-300">
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-orange-100 border border-slate-200 bg-white">
                            <input type="checkbox" checked={formData.jenisPekerjaan.spray} onChange={() => setJ({ spray: !formData.jenisPekerjaan.spray })} className="w-5 h-5 text-orange-600 rounded border-slate-400" />
                            <span className="text-sm font-bold text-slate-900">SPRAY</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-orange-100 border border-slate-200 bg-white">
                            <input type="checkbox" checked={formData.jenisPekerjaan.nonSpray} onChange={() => setJ({ nonSpray: !formData.jenisPekerjaan.nonSpray })} className="w-5 h-5 text-orange-600 rounded border-slate-400" />
                            <span className="text-sm font-bold text-slate-900">NON SPRAY</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-3 pb-3 border-b border-slate-200">C. Pekerjaan Lainnya</h4>
              <CheckItem label="Ada pekerjaan lain yang menggunakan aplikasi panas lainnya" checked={formData.jenisPekerjaan.lainnya} onChange={() => setJ({ lainnya: !formData.jenisPekerjaan.lainnya })} />
              {formData.jenisPekerjaan.lainnya && <textarea rows={2} value={formData.jenisPekerjaan.lainnyaKeterangan} onChange={e => setJ({ lainnyaKeterangan: e.target.value })} className="w-full mt-3 px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-black" />}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">Area / Equipment Berisiko Tinggi</h4>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-1">
                {[{ key:"ruangTertutup", label:"Ruang tertutup / area pembuangan" }, { key:"bahanMudah", label:"Bahan mudah terbakar" }, { key:"gas", label:"Gas (bekerja dalam bejana / tangki)" }, { key:"ketinggian", label:"Bekerja di ketinggian" }, { key:"cairan", label:"Cairan / Gas bertekanan" }, { key:"hydrocarbon", label:"Cairan hydrocarbon" }]
                  .map(item => <CheckItem key={item.key} label={item.label} checked={(formData.areaBerisiko as any)[item.key]} onChange={() => setA({ [item.key]: !(formData.areaBerisiko as any)[item.key] })} />)}
                <div className="mt-3 pt-3 border-t border-red-300">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bahaya lain</label>
                  <input type="text" value={formData.areaBerisiko.lain} onChange={e => setA({ lain: e.target.value })} className="w-full px-4 py-2.5 border border-red-300 rounded-lg text-sm text-black" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 3 ── */}
        <Section title="BAGIAN 3: HAL-HAL YANG PERLU DIPERHATIKAN SEBAGAI UPAYA PENCEGAHAN"
          section="bagian3" description="Checklist keselamatan" expanded={expanded} toggle={toggle}>
          <div className="space-y-6">
            {[
              { t:"1. UMUM", items:[{ k:"equipment", l:"Equipment / Tools kondisi baik" }, { k:"apar", l:"Alat pemadam api tersedia" }, { k:"sensor", l:"Sensor Smoke Detector non-aktif" }, { k:"apd", l:"APD lengkap dipakai" }] },
              { t:"2. DAERAH 11 METER", items:[{ k:"meter11_cairan", l:"Tidak ada cairan mudah terbakar" }, { k:"lantai", l:"Lantai bersih" }, { k:"lantaiBasah", l:"Lantai dibasahi" }, { k:"cairan_diproteksi", l:"Cairan mudah terbakar diproteksi" }, { k:"lembaran", l:"Lembaran di bawah pekerjaan" }, { k:"lindungi_conveyor", l:"Lindungi conveyor dan kabel" }] },
              { t:"3. RUANGAN TERTUTUP", items:[{ k:"ruang_tertutup_dibersihkan", l:"Alat dibersihkan dari bahan mudah terbakar" }, { k:"uap_dibuang", l:"Uap menyala dibuang dari ruangan" }] },
              { t:"4. DINDING / LANGIT-LANGIT", items:[{ k:"dinding_konstruksi", l:"Konstruksi tidak mudah terbakar" }, { k:"bahan_dipindahkan", l:"Bahan mudah terbakar dipindahkan" }] },
            ].map(group => (
              <div key={group.t} className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-bold text-slate-900 text-sm mb-4">{group.t}</h4>
                <div className="space-y-3">
                  {group.items.map(item => <YesNoRow key={item.k} label={item.l} fieldKey={item.k} pencegahan={formData.pencegahan} setPencegahan={setP} />)}
                </div>
              </div>
            ))}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-bold text-blue-900 text-sm mb-4">5. PERAN API (FIRE WATCH)</h4>
              <div className="space-y-3">
                {[{ k:"firewatch_ada", l:"Fire Watch ada memastikan area aman selama proses dan 30 menit setelahnya" }, { k:"firewatch_pelatihan", l:"Fire Watch sudah mendapat pelatihan menggunakan alat pemadam kebakaran" }]
                  .map(item => (
                    <div key={item.k} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-sm text-slate-700 flex-1 mr-4">{item.l}</span>
                      <div className="flex gap-4 shrink-0">
                        {["ya","tidak"].map(v => (
                          <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name={item.k} value={v} checked={formData.pencegahan[item.k as keyof typeof formData.pencegahan] === v} onChange={() => setP({ [item.k]: v })} className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">{v === "ya" ? "YA" : "TIDAK"}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Permintaan Tambahan Tindakan Pengamanan</label>
              <textarea rows={3} value={formData.pencegahan.permintaan_tambahan} onChange={e => setP({ permintaan_tambahan: e.target.value })} className={inputCls} placeholder="Sebutkan..." />
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 4 PERSETUJUAN ── */}
        <Section title="BAGIAN 4: PERSETUJUAN" section="bagian4"
          description="Akan terisi otomatis setelah approval" expanded={expanded} toggle={toggle}>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-1">Alur Approval yang Diterapkan:</p>
                <p className={`text-sm font-bold ${isInternal ? "text-blue-700" : "text-purple-700"}`}>
                  {isInternal ? "Firewatch → SPV → Admin K3 → SFO → MR I/PGA MGR" : "Kontraktor → Firewatch → SPV → Admin K3 → SFO → MR I/PGA MGR"}
                </p>
                <p className="text-xs text-blue-700 mt-1">🔒 Kolom persetujuan terisi otomatis saat masing-masing approver menyetujui.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {approverLabels.map(label => (
              <div key={label}>
                <label className="block text-sm font-semibold text-slate-500 mb-1">{label}</label>
                <div className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-400 text-sm italic cursor-not-allowed">Diisi otomatis saat approval</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Action buttons */}
        <div className="flex justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-md sticky bottom-4 border border-slate-200">
          <button onClick={handleSave} disabled={submitting} className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold flex items-center gap-2 disabled:opacity-60">
            <Save className="w-5 h-5" />{submitting ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg disabled:opacity-60">
            <Send className="w-5 h-5" />{submitting ? "Mengajukan..." : "Ajukan Izin"}
          </button>
        </div>
      </div>
    </div>
  );
}