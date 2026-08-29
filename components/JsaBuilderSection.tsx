"use client";

import { Plus, Trash2, FileText } from "lucide-react";

export interface JsaRow {
  tanggal: string;
  jenisPekerjaan: string;
  langkahKerja: string;
  potensiBahaya: string;
  pengendalian: string;
  saran: string;
}

export interface JsaData {
  area: string;
  jenisPekerjaan: string;
  sectDept: string;
  pic: string;
  petugas: string[];
  rows: JsaRow[];
  approval?: JsaApproval;
}

export interface JsaApprovalEntry {
  approved: boolean;
  approvedBy: string | null;
  approvedNik: string | null;
  approvedAt: string | null;
}

export interface JsaApproval {
  currentStage: 1 | 2 | 3;
  status: "submitted" | "approved" | "rejected";
  catatanReject: string | null;
  firewatch: JsaApprovalEntry;
  spv: JsaApprovalEntry;
  sfo: JsaApprovalEntry;
}

interface JsaBuilderSectionProps {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  value: JsaData;
  setValue: (value: JsaData) => void;
}

const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400";

const emptyRow = (): JsaRow => ({
  tanggal: "",
  jenisPekerjaan: "",
  langkahKerja: "",
  potensiBahaya: "",
  pengendalian: "",
  saran: "",
});

export const createEmptyJsa = (sectDept = ""): JsaData => ({
  area: "",
  jenisPekerjaan: "",
  sectDept,
  pic: "",
  petugas: Array.from({ length: 10 }, () => ""),
  rows: [emptyRow()],
  approval: {
    currentStage: 1,
    status: "submitted",
    catatanReject: null,
    firewatch: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
    spv: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
    sfo: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
  },
});

export default function JsaBuilderSection({ enabled, setEnabled, value, setValue }: JsaBuilderSectionProps) {
  const setField = <K extends keyof JsaData>(key: K, fieldValue: JsaData[K]) => {
    setValue({ ...value, [key]: fieldValue });
  };

  const setRow = (index: number, row: JsaRow) => {
    const rows = [...value.rows];
    rows[index] = row;
    setField("rows", rows);
  };

  return (
    <section id="bagian-jsa" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <h2 className="font-bold text-slate-800">Bagian 4: Buat JSA</h2>
        <p className="text-xs text-slate-500 mt-0.5">Buat Job Safety Analysis apabila pekerjaan memerlukannya.</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Apakah pekerjaan ini memerlukan JSA? <span className="text-red-500">*</span></p>
            <p className="text-xs text-slate-500 mt-1">Pilih Buat JSA untuk menampilkan formulir analisis keselamatan.</p>
          </div>
          <button type="button" onClick={() => setEnabled(!enabled)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${enabled ? "bg-slate-200 text-slate-700" : "bg-orange-600 text-white hover:bg-orange-700"}`}>
            {enabled ? "Tutup JSA" : "Buat JSA"}
          </button>
        </div>

        {enabled && (
          <div className="space-y-5 border-t border-slate-200 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                ["area", "Area"],
                ["jenisPekerjaan", "Jenis Pekerjaan"],
                ["sectDept", "Sect/Dept"],
                ["pic", "PIC"],
              ] as const).map(([key, label]) => (
                <label key={key} className="block text-sm font-semibold text-slate-700">
                  {label}
                  <input value={value[key]} onChange={(event) => setField(key, event.target.value)} readOnly={key === "sectDept"} className={`${inputClass} mt-1 ${key === "sectDept" ? "bg-slate-100" : ""}`} />
                </label>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Petugas Yang Mengerjakan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {value.petugas.map((petugas, index) => (
                  <label key={index} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-5 text-right">{index + 1}.</span>
                    <input value={petugas} onChange={(event) => { const next = [...value.petugas]; next[index] = event.target.value; setField("petugas", next); }} className={inputClass} placeholder={`Nama petugas ${index + 1}`} />
                  </label>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>{["Tanggal", "Jenis Pekerjaan", "Uraian Urutan Langkah Kerja", "Potensi Kecelakaan/Bahaya", "Pengendalian yang Dilakukan", "Saran", ""].map((heading) => <th key={heading} className="p-2 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {value.rows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-200 align-top">
                      {(["tanggal", "jenisPekerjaan", "langkahKerja", "potensiBahaya", "pengendalian", "saran"] as const).map((key) => (
                        <td key={key} className="p-2">{key === "tanggal" ? <input type="date" value={row[key]} onChange={(event) => setRow(index, { ...row, [key]: event.target.value })} className={inputClass} /> : <textarea value={row[key]} onChange={(event) => setRow(index, { ...row, [key]: event.target.value })} rows={2} className={inputClass} />}</td>
                      ))}
                      <td className="p-2"><button type="button" onClick={() => setField("rows", value.rows.filter((_, rowIndex) => rowIndex !== index))} disabled={value.rows.length === 1} className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30" title="Hapus baris"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setField("rows", [...value.rows, emptyRow()])} className="inline-flex items-center gap-2 px-3 py-2 border border-orange-300 text-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-50"><Plus className="w-4 h-4" /> Tambah Baris Analisis</button>
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3"><FileText className="w-4 h-4 shrink-0" /> JSA akan tampil sebagai lampiran terstruktur pada halaman approval.</div>
          </div>
        )}
      </div>
    </section>
  );
}