"use client";

import { useState } from "react";
import { Save, CheckCircle, Loader2 } from "lucide-react";

export interface SafetyInductionData {
  namaSubcont: string;
  aktivitasPekerjaan: string;
  koordinatNoHp: string;
  namaPekerja: string[];
  kebijakan: boolean[];
  himbauan: boolean[];
  larangan: boolean[];
  areaTerbatas: boolean[];
  koordinatorSubcont: string;
  security: string;
  status: "draft" | "submitted" | "approved";
}

export const createEmptySafetyInduction = (): SafetyInductionData => ({
  namaSubcont: "", aktivitasPekerjaan: "", koordinatNoHp: "",
  namaPekerja: Array.from({ length: 14 }, () => ""),
  kebijakan: Array.from({ length: 4 }, () => false),
  himbauan: Array.from({ length: 6 }, () => false),
  larangan: Array.from({ length: 6 }, () => false),
  areaTerbatas: Array.from({ length: 10 }, () => false),
  koordinatorSubcont: "", security: "", status: "draft",
});

const kebijakan = [
  "Melaksanakan Kegiatan yang ditujukan untuk mencegah terjadinya kecelakaan kerja dan penyakit akibat kerja, serta meningkatkan kesadaran karyawan dalam hal K3",
  "Memenuhi peraturan perundang-undangan dan ketentuan lain yang berkaitan dengan aspek Keselamatan dan Kesehatan Kerja",
  "Melakukan perbaikan berkelanjutan dalam bidang manajemen Keselamatan dan Kesehatan Kerja",
  "Melakukan kebijakan Keselamatan dan Kesehatan Kerja kepada seluruh karyawan yang bekerja dan atas nama PT Jatim Autocomp Indonesia",
];
const himbauan = ["Mematuhi peraturan yang berlaku di PT. Jatim Autocomp Indonesia", "Memahami dan mengenali lingkungan kerja sekitarnya yang berpotensi bahaya", "Memperhatikan dan mematuhi rambu-rambu keselamatan dan batas area", "Bekerja sesuai prosedur yang berlaku", "Gunakan APD saat bekerja sesuai standard yang telah ditentukan", "Segera lapor ke PIC area kerja jika terjadi keadaan darurat, kecelakaan kerja atau kondisi abnormal"];
const area = ["Charger Forklift Warehouse & EXIM", "Panel utama", "Pump Room", "TPS B3 & Domestik", "Utility Area", "Tangki Solar", "Workshop", "Tandon Air", "Water Treatment", "IPAL (Hydro Kalvabio)"];
const batasan = ["Mengambil foto", "Merokok disembarang tempat (harus di SMOKING AREA)", "Membawa barang berbahaya seperti senjata tajam, bahan yang mudah meledak", "Bekerja di area terbatas yang tanpa adanya izin dan pendampingan", "Membuang sampah dan limbah sisa hasil kerja sembarangan", "Melakukan tindakan berbahaya yang berakibat kecelakaan kerja dan mengganggu ketertiban umum"];
const input = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400";

interface Props { value: SafetyInductionData; setValue: (value: SafetyInductionData) => void; readOnly?: boolean; onSave?: (submit: boolean) => Promise<void>; }
export default function SafetyInductionSection({ value, setValue, readOnly = false, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof SafetyInductionData>(key: K, next: SafetyInductionData[K]) => setValue({ ...value, [key]: next });
  const setBool = (key: "kebijakan" | "himbauan" | "larangan" | "areaTerbatas", index: number, checked: boolean) => { const next = [...value[key]]; next[index] = checked; set(key, next); };
  const save = async (submit: boolean) => { if (!onSave) return; setSaving(true); try { await onSave(submit); } finally { setSaving(false); } };
  return <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-800">Safety Induction - Tata Tertib Pekerja Sub Contractor</h2><p className="text-xs text-slate-500 mt-1">Diisi oleh Security berdasarkan form Ijin Kerja Eksternal.</p></div>
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="text-sm font-semibold">Nama Subcont<input disabled={readOnly} value={value.namaSubcont} onChange={e => set("namaSubcont", e.target.value)} className={`${input} mt-1`} /></label><label className="text-sm font-semibold">Aktivitas Pekerjaan<input disabled={readOnly} value={value.aktivitasPekerjaan} onChange={e => set("aktivitasPekerjaan", e.target.value)} className={`${input} mt-1`} /></label><label className="text-sm font-semibold">Koord. Kerja / No. HP<input disabled={readOnly} value={value.koordinatNoHp} onChange={e => set("koordinatNoHp", e.target.value)} className={`${input} mt-1`} /></label></div>
      <div><h3 className="font-bold text-sm text-slate-700 mb-2">Daftar Nama Pekerja</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{value.namaPekerja.map((name, i) => <label key={i} className="flex gap-2 items-center text-xs text-slate-500"><span className="w-5 text-right">{i + 1}</span><input disabled={readOnly} value={name} onChange={e => { const next = [...value.namaPekerja]; next[i] = e.target.value; set("namaPekerja", next); }} className={input} /></label>)}</div></div>
      <Checklist title="Kebijakan K3 PT JAI" items={kebijakan} values={value.kebijakan} disabled={readOnly} onChange={(i, checked) => setBool("kebijakan", i, checked)} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Checklist title="Himbauan Pekerja Sub Contractor" items={himbauan} values={value.himbauan} disabled={readOnly} onChange={(i, checked) => setBool("himbauan", i, checked)} /><Checklist title="Larangan Bagi Pekerja Sub Contractor" items={batasan} values={value.larangan} disabled={readOnly} onChange={(i, checked) => setBool("larangan", i, checked)} /></div>
      <Checklist title="Daftar Area Terbatas" items={area} values={value.areaTerbatas} disabled={readOnly} onChange={(i, checked) => setBool("areaTerbatas", i, checked)} />
      <p className="text-xs text-slate-600 border-t border-slate-200 pt-4">Setelah membaca dan mempelajari ketentuan tata tertib di atas, pekerja telah mengerti dan siap melaksanakan serta menginformasikan kepada rekan kerja lainnya.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-sm font-semibold">Koord. Subcont<input disabled={readOnly} value={value.koordinatorSubcont} onChange={e => set("koordinatorSubcont", e.target.value)} className={`${input} mt-1`} /></label><label className="text-sm font-semibold">Security<input disabled={readOnly} value={value.security} onChange={e => set("security", e.target.value)} className={`${input} mt-1`} /></label></div>
      {onSave && !readOnly && <div className="flex justify-end gap-2"><button type="button" onClick={() => save(false)} disabled={saving} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}Simpan Draft</button><button type="button" onClick={() => save(true)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold"><CheckCircle className="w-4 h-4 inline mr-1" />Simpan & Approve</button></div>}
    </div>
  </section>;
}
function Checklist({ title, items, values, disabled, onChange }: { title: string; items: string[]; values: boolean[]; disabled: boolean; onChange: (index: number, checked: boolean) => void }) { return <div><h3 className="font-bold text-sm text-slate-700 mb-2">{title}</h3><div className="border border-slate-200 rounded-lg overflow-hidden">{items.map((item, i) => <label key={i} className="flex gap-2 p-2 border-b last:border-0 border-slate-100 text-xs text-slate-600"><input type="checkbox" disabled={disabled} checked={Boolean(values[i])} onChange={e => onChange(i, e.target.checked)} className="mt-0.5" />{item}</label>)}</div></div>; }
