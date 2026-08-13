// app/form/general-permit/page.tsx
// Form Ijin Kerja umum (JAI/F-01/P.SHE-19) — tanpa jenis pekerjaan spesifik
// seperti hot-work/workshop/height-work. Mengikuti tema visual & pola state
// yang sama dengan app/form/height-work/page.tsx.
//
// Cakupan halaman ini: Bagian 1–11 & Bagian 14 (field yang diisi pemohon
// saat mengajukan). Bagian 12 (Security → SFO → PGA Manager) adalah rantai
// approval yang diproses di halaman /approval, bukan di sini. Bagian 13, 15,
// 16 (Job Hand Over & Evaluasi/Pengesahan Akhir pasca-kerja) akan dibuatkan
// di halaman terpisah setelah form ini disetujui.
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, ChevronRight, AlertCircle, AlertTriangle,
  CheckCircle, Loader2, ClipboardList,
} from "lucide-react";
import TimeInput24, { normalizeTo24h } from "@/components/Time24Input";

// ── Types ────────────────────────────────────────────────────
type Kondisi = "" | "ok" | "ng";
interface AlatItem { pakai: boolean; kondisi: Kondisi }
const emptyAlat = (): AlatItem => ({ pakai: false, kondisi: "" });

interface FormState {
  namaKontraktorPekerja: string;
  namaPengawasPicSubkont: string;
  jumlahTenagaKerja: string;
  tglMulaiKerja: string;
  tglAkhirKerjaRencana: string;
  waktuKerja: string;
  actualTanggalKerja: string;

  spesifikasiPekerjaan: {
    areaWorkshop: boolean; ruangTertutup: boolean; ketinggian: boolean;
    teganganTinggi: boolean; pemakaianLoto: boolean; forklift: boolean;
    temperaturTinggi: boolean;
  };
  deskripsiPekerjaan: string;
  spesifikasiLainnya: string;

  alat: {
    mesinPotong: AlatItem; mesinLasGerinda: AlatItem; genset: AlatItem;
    tabungGas: AlatItem; tanggaListrikAwp: AlatItem; forklift: AlatItem;
    liftBarang: AlatItem;
  };
  alatLainnya: string;
  alatLainnyaKondisi: Kondisi;

  lokasiPekerjaan: string;
  lokasiTipe: { dalamGedung: boolean; luarGedung: boolean; luarPagarGedung: boolean; diAtasGedung: boolean };
  lokasiLainnya: string;
  pengawasBagian: string;
  picLotoStationLoto: string;

  bahan: { mudahTerbakar: boolean; mudahMeledak: boolean; kimiaBeracunIritan: boolean };
  bahanLainnya: string;

  dampak: {
    ledakanKebakaran: boolean; jatuhKetinggian: boolean; kepalaTertimpa: boolean;
    kakiTertimpa: boolean; tumpahanOliBbmB3: boolean; tersengatListrik: boolean;
    terjepitMesin: boolean; tersayatTertusuk: boolean; infeksiPernafasan: boolean;
    iritasiMata: boolean; radiasiSinarLas: boolean; iritasiKulit: boolean;
    kebisingan: boolean; keracunanZatKimia: boolean;
  };
  dampakLainnya: string;

  apd: {
    masker: boolean; maskerKimia: boolean; kacamataBiasa: boolean; kacamataLas: boolean;
    earPlug: boolean; gloves: boolean; fullBodyHarness: boolean;
    sarungTanganBintil: boolean; sarungTanganListrik: boolean; sarungTanganKulit: boolean;
    helm: boolean; safetyShoes: boolean; sepatuKaret: boolean; topiKerja: boolean;
  };
  apdLainnya: string;

  licenseSertifikasi: string;

  apar: { dryPowder: boolean; gasCair: boolean; tidakPerlu: boolean };
  aparLainnya: string;

  limbah: { kontraktor: boolean; ptJai: boolean; luarJai: boolean };
  limbahLokasiPt: string;

  izinKerjaDari: string;
  izinKerjaSampai: string;

  kontraktorPj: string;
  spvTerkaitPj: string;

  pernyataanDiperiksa: boolean;
  pengawasPekerjaanUser: string;
}

const defaultForm = (): FormState => ({
  namaKontraktorPekerja: "", namaPengawasPicSubkont: "", jumlahTenagaKerja: "",
  tglMulaiKerja: "", tglAkhirKerjaRencana: "", waktuKerja: "", actualTanggalKerja: "",
  spesifikasiPekerjaan: {
    areaWorkshop: false, ruangTertutup: false, ketinggian: false,
    teganganTinggi: false, pemakaianLoto: false, forklift: false, temperaturTinggi: false,
  },
  deskripsiPekerjaan: "", spesifikasiLainnya: "",
  alat: {
    mesinPotong: emptyAlat(), mesinLasGerinda: emptyAlat(), genset: emptyAlat(),
    tabungGas: emptyAlat(), tanggaListrikAwp: emptyAlat(), forklift: emptyAlat(),
    liftBarang: emptyAlat(),
  },
  alatLainnya: "", alatLainnyaKondisi: "",
  lokasiPekerjaan: "",
  lokasiTipe: { dalamGedung: false, luarGedung: false, luarPagarGedung: false, diAtasGedung: false },
  lokasiLainnya: "", pengawasBagian: "", picLotoStationLoto: "",
  bahan: { mudahTerbakar: false, mudahMeledak: false, kimiaBeracunIritan: false },
  bahanLainnya: "",
  dampak: {
    ledakanKebakaran: false, jatuhKetinggian: false, kepalaTertimpa: false,
    kakiTertimpa: false, tumpahanOliBbmB3: false, tersengatListrik: false,
    terjepitMesin: false, tersayatTertusuk: false, infeksiPernafasan: false,
    iritasiMata: false, radiasiSinarLas: false, iritasiKulit: false,
    kebisingan: false, keracunanZatKimia: false,
  },
  dampakLainnya: "",
  apd: {
    masker: false, maskerKimia: false, kacamataBiasa: false, kacamataLas: false,
    earPlug: false, gloves: false, fullBodyHarness: false,
    sarungTanganBintil: false, sarungTanganListrik: false, sarungTanganKulit: false,
    helm: false, safetyShoes: false, sepatuKaret: false, topiKerja: false,
  },
  apdLainnya: "",
  licenseSertifikasi: "",
  apar: { dryPowder: false, gasCair: false, tidakPerlu: false },
  aparLainnya: "",
  limbah: { kontraktor: false, ptJai: false, luarJai: false },
  limbahLokasiPt: "",
  izinKerjaDari: "", izinKerjaSampai: "",
  kontraktorPj: "", spvTerkaitPj: "",
  pernyataanDiperiksa: false, pengawasPekerjaanUser: "",
});

// ── Reusable UI bits (tema sama dengan height-work) ────────────
const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder-slate-400";
const sectionHead = "bg-slate-50 border-b border-slate-200 px-6 py-4";
const cb = "w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400 shrink-0";

function SectionCard({ nomor, title, children }: { nomor: number; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={sectionHead}>
        <h2 className="font-bold text-slate-800">Bagian {nomor}: {title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </section>
  );
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={cb} />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function AlatRow({ label, item, onChange }: { label: string; item: AlatItem; onChange: (v: AlatItem) => void }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors flex-wrap">
      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-[160px]">
        <input
          type="checkbox"
          checked={item.pakai}
          onChange={(e) => onChange({ pakai: e.target.checked, kondisi: e.target.checked ? item.kondisi : "" })}
          className={cb}
        />
        <span className="text-sm text-slate-700">{label}</span>
      </label>
      {item.pakai && (
        <div className="flex gap-3 ml-8 sm:ml-0">
          {(["ok", "ng"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`kondisi-${label}`}
                checked={item.kondisi === k}
                onChange={() => onChange({ ...item, kondisi: k })}
                className="w-4 h-4 text-orange-500"
              />
              <span className={`text-xs font-semibold ${k === "ok" ? "text-green-600" : "text-red-500"}`}>
                {k.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GeneralPermitFormPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successId, setSuccessId] = useState("");

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const setGroup = <K extends keyof FormState>(key: K, patch: Partial<FormState[K]>) =>
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] as any), ...patch } }));

  const buildBody = (isSubmit: boolean) => ({
    isSubmit,
    ...form,
    waktuKerja: normalizeTo24h(form.waktuKerja),
    izinKerjaDari: normalizeTo24h(form.izinKerjaDari),
    izinKerjaSampai: normalizeTo24h(form.izinKerjaSampai),
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/form-permit/api/forms/general-permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(false)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan draft");
      router.push("/my-forms");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.pernyataanDiperiksa) {
      setError("Pernyataan tentang ijin kerja (Bagian 14) wajib dicentang sebelum mengajukan.");
      document.getElementById("bagian-14")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!form.pengawasPekerjaanUser.trim()) {
      setError("Nama Pengawas Pekerjaan/User (Bagian 14) wajib diisi.");
      document.getElementById("bagian-14")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/form-permit/api/forms/general-permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(true)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan form");
      setSuccessId(data.id_form);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Berhasil Dikirim!</h2>
          <p className="text-slate-500 text-sm mb-2">
            Form ijin kerja Anda telah berhasil diajukan dan sedang menunggu persetujuan.
          </p>
          <div className="text-xs px-3 py-2 rounded-lg mb-4 bg-blue-50 text-blue-700 border border-blue-200">
            <strong>Alur Approval:</strong>
            <p className="mt-1">Security → SFO → PGA Manager</p>
          </div>
          {successId && (
            <p className="text-xs text-slate-400 mb-6">
              ID Form: <span className="font-mono font-bold text-slate-700">{successId}</span>
            </p>
          )}
          <div className="flex gap-3">
            <Link href="/my-forms" className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition-colors">
              Lihat Riwayat
            </Link>
            <Link href="/home" className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition-colors">
              Kembali
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">Form Ijin Kerja</h1>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Link href="/my-forms" className="hover:text-orange-600 transition-colors">Beranda</Link>
                <ChevronRight className="w-3 h-3" />
                <span>Ijin Kerja Umum</span>
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-semibold text-orange-700">
            <ClipboardList className="w-3.5 h-3.5" /> JAI/F-01/P.SHE-19
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* BAGIAN 1 */}
          <SectionCard nomor={1} title="Informasi Kontraktor/Pekerja">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kontraktor/Pekerja <span className="text-red-500">*</span></label>
              <input type="text" value={form.namaKontraktorPekerja} onChange={(e) => set("namaKontraktorPekerja", e.target.value)} required className={inputCls} placeholder="Nama kontraktor atau pekerja" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pengawas/PIC Subkont</label>
              <input type="text" value={form.namaPengawasPicSubkont} onChange={(e) => set("namaPengawasPicSubkont", e.target.value)} className={inputCls} placeholder="Nama pengawas / PIC subkontraktor" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Jumlah Tenaga Kerja</label>
              <input type="number" min="0" value={form.jumlahTenagaKerja} onChange={(e) => set("jumlahTenagaKerja", e.target.value)} className={`${inputCls} max-w-[160px]`} placeholder="0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Mulai Kerja <span className="text-red-500">*</span></label>
                <input type="date" value={form.tglMulaiKerja} onChange={(e) => set("tglMulaiKerja", e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Akhir Kerja (Rencana)</label>
                <input type="date" value={form.tglAkhirKerjaRencana} onChange={(e) => set("tglAkhirKerjaRencana", e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu <span className="text-[10px] font-normal text-slate-400">(24 jam)</span></label>
                <TimeInput24 value={form.waktuKerja} onChange={(v) => set("waktuKerja", v)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Actual Tanggal Kerja <span className="text-[10px] font-normal text-slate-400">(diisi jika beda dari rencana)</span>
                </label>
                <input type="date" value={form.actualTanggalKerja} onChange={(e) => set("actualTanggalKerja", e.target.value)} className={inputCls} />
              </div>
            </div>
          </SectionCard>

          {/* BAGIAN 2 */}
          <SectionCard nomor={2} title="Spesifikasi Pekerjaan">
            <div className="space-y-1">
              <CheckboxRow checked={form.spesifikasiPekerjaan.areaWorkshop} onChange={(v) => setGroup("spesifikasiPekerjaan", { areaWorkshop: v })} label="Bekerja area Workshop (las, gerinding, cutt off, pengecatan)" />
              <CheckboxRow checked={form.spesifikasiPekerjaan.ruangTertutup} onChange={(v) => setGroup("spesifikasiPekerjaan", { ruangTertutup: v })} label="Bekerja di ruang tertutup (pengurasan tandon air)" />
              <CheckboxRow checked={form.spesifikasiPekerjaan.ketinggian} onChange={(v) => setGroup("spesifikasiPekerjaan", { ketinggian: v })} label="Bekerja di ketinggian" />
              <CheckboxRow checked={form.spesifikasiPekerjaan.teganganTinggi} onChange={(v) => setGroup("spesifikasiPekerjaan", { teganganTinggi: v })} label="Bekerja di tegangan tinggi" />
              <CheckboxRow checked={form.spesifikasiPekerjaan.pemakaianLoto} onChange={(v) => setGroup("spesifikasiPekerjaan", { pemakaianLoto: v })} label="Pemakaian LOTO" />
              <CheckboxRow checked={form.spesifikasiPekerjaan.forklift} onChange={(v) => setGroup("spesifikasiPekerjaan", { forklift: v })} label="Bekerja mengoperasikan forklift" />
              <CheckboxRow checked={form.spesifikasiPekerjaan.temperaturTinggi} onChange={(v) => setGroup("spesifikasiPekerjaan", { temperaturTinggi: v })} label="Bekerja di temperatur tinggi (panas)" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Pekerjaan</label>
              <textarea rows={3} value={form.deskripsiPekerjaan} onChange={(e) => set("deskripsiPekerjaan", e.target.value)} className={`${inputCls} resize-none`} placeholder="Jelaskan pekerjaan yang akan dilakukan..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lainnya</label>
              <input type="text" value={form.spesifikasiLainnya} onChange={(e) => set("spesifikasiLainnya", e.target.value)} className={inputCls} placeholder="Sebutkan jika ada spesifikasi lain" />
            </div>
          </SectionCard>

          {/* BAGIAN 3 */}
          <SectionCard nomor={3} title="Alat yang Dipakai">
            <p className="text-xs text-slate-400 -mt-1 mb-2">Centang alat yang dipakai, lalu pilih kondisi alat (OK / NG).</p>
            <div className="space-y-1">
              <AlatRow label="Mesin potong / cut off" item={form.alat.mesinPotong} onChange={(v) => setGroup("alat", { mesinPotong: v })} />
              <AlatRow label="Mesin las / Gerinda" item={form.alat.mesinLasGerinda} onChange={(v) => setGroup("alat", { mesinLasGerinda: v })} />
              <AlatRow label="Genset" item={form.alat.genset} onChange={(v) => setGroup("alat", { genset: v })} />
              <AlatRow label="Tabung gas" item={form.alat.tabungGas} onChange={(v) => setGroup("alat", { tabungGas: v })} />
              <AlatRow label="Tangga Listrik / AWP" item={form.alat.tanggaListrikAwp} onChange={(v) => setGroup("alat", { tanggaListrikAwp: v })} />
              <AlatRow label="Forklift" item={form.alat.forklift} onChange={(v) => setGroup("alat", { forklift: v })} />
              <AlatRow label="Lift Barang" item={form.alat.liftBarang} onChange={(v) => setGroup("alat", { liftBarang: v })} />
            </div>
            <div className="flex items-end gap-3 flex-wrap pt-2 border-t border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alat Lainnya</label>
                <input type="text" value={form.alatLainnya} onChange={(e) => set("alatLainnya", e.target.value)} className={inputCls} placeholder="Sebutkan alat lain" />
              </div>
              {form.alatLainnya.trim() && (
                <div className="flex gap-3 pb-3">
                  {(["ok", "ng"] as const).map((k) => (
                    <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="kondisi-alat-lainnya" checked={form.alatLainnyaKondisi === k} onChange={() => set("alatLainnyaKondisi", k)} className="w-4 h-4 text-orange-500" />
                      <span className={`text-xs font-semibold ${k === "ok" ? "text-green-600" : "text-red-500"}`}>{k.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* BAGIAN 4 */}
          <SectionCard nomor={4} title="Informasi Lokasi Proyek & Pengawas">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lokasi Pekerjaan <span className="text-red-500">*</span></label>
              <textarea rows={2} value={form.lokasiPekerjaan} onChange={(e) => set("lokasiPekerjaan", e.target.value)} required className={`${inputCls} resize-none`} placeholder="Contoh: Gedung A Lantai 3" />
            </div>
            <div className="space-y-1">
              <CheckboxRow checked={form.lokasiTipe.dalamGedung} onChange={(v) => setGroup("lokasiTipe", { dalamGedung: v })} label="Dalam gedung" />
              <CheckboxRow checked={form.lokasiTipe.luarGedung} onChange={(v) => setGroup("lokasiTipe", { luarGedung: v })} label="Luar gedung" />
              <CheckboxRow checked={form.lokasiTipe.luarPagarGedung} onChange={(v) => setGroup("lokasiTipe", { luarPagarGedung: v })} label="Luar pagar gedung" />
              <CheckboxRow checked={form.lokasiTipe.diAtasGedung} onChange={(v) => setGroup("lokasiTipe", { diAtasGedung: v })} label="Di atas gedung" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lainnya</label>
              <input type="text" value={form.lokasiLainnya} onChange={(e) => set("lokasiLainnya", e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pengawas (Bagian)</label>
                <input type="text" value={form.pengawasBagian} onChange={(e) => set("pengawasBagian", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">PIC LOTO / Station LOTO</label>
                <input type="text" value={form.picLotoStationLoto} onChange={(e) => set("picLotoStationLoto", e.target.value)} className={inputCls} />
              </div>
            </div>
          </SectionCard>

          {/* BAGIAN 5 */}
          <SectionCard nomor={5} title="Karakter Bahan yang Dipakai">
            <div className="space-y-1">
              <CheckboxRow checked={form.bahan.mudahTerbakar} onChange={(v) => setGroup("bahan", { mudahTerbakar: v })} label="Bahan mudah terbakar" />
              <CheckboxRow checked={form.bahan.mudahMeledak} onChange={(v) => setGroup("bahan", { mudahMeledak: v })} label="Bahan mudah meledak" />
              <CheckboxRow checked={form.bahan.kimiaBeracunIritan} onChange={(v) => setGroup("bahan", { kimiaBeracunIritan: v })} label="Bahan Kimia Beracun / Iritan" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lainnya, sebutkan</label>
              <input type="text" value={form.bahanLainnya} onChange={(e) => set("bahanLainnya", e.target.value)} className={inputCls} />
            </div>
          </SectionCard>

          {/* BAGIAN 6 */}
          <SectionCard nomor={6} title="Potensi Dampak LK3 yang Ditimbulkan">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <div className="space-y-1">
                <CheckboxRow checked={form.dampak.ledakanKebakaran} onChange={(v) => setGroup("dampak", { ledakanKebakaran: v })} label="Bahaya ledakan / kebakaran" />
                <CheckboxRow checked={form.dampak.jatuhKetinggian} onChange={(v) => setGroup("dampak", { jatuhKetinggian: v })} label="Jatuh dari ketinggian" />
                <CheckboxRow checked={form.dampak.kepalaTertimpa} onChange={(v) => setGroup("dampak", { kepalaTertimpa: v })} label="Kepala tertimpa benda keras" />
                <CheckboxRow checked={form.dampak.kakiTertimpa} onChange={(v) => setGroup("dampak", { kakiTertimpa: v })} label="Kaki tertimpa benda keras" />
                <CheckboxRow checked={form.dampak.tumpahanOliBbmB3} onChange={(v) => setGroup("dampak", { tumpahanOliBbmB3: v })} label="Tumpahan Oli & BBM, B3" />
                <CheckboxRow checked={form.dampak.tersengatListrik} onChange={(v) => setGroup("dampak", { tersengatListrik: v })} label="Tersengat Listrik / Kesetrum" />
                <CheckboxRow checked={form.dampak.terjepitMesin} onChange={(v) => setGroup("dampak", { terjepitMesin: v })} label="Terjepit Mesin / Equipment" />
              </div>
              <div className="space-y-1">
                <CheckboxRow checked={form.dampak.tersayatTertusuk} onChange={(v) => setGroup("dampak", { tersayatTertusuk: v })} label="Tersayat / tertusuk benda tajam" />
                <CheckboxRow checked={form.dampak.infeksiPernafasan} onChange={(v) => setGroup("dampak", { infeksiPernafasan: v })} label="Infeksi pernafasan / debu" />
                <CheckboxRow checked={form.dampak.iritasiMata} onChange={(v) => setGroup("dampak", { iritasiMata: v })} label="Iritasi mata" />
                <CheckboxRow checked={form.dampak.radiasiSinarLas} onChange={(v) => setGroup("dampak", { radiasiSinarLas: v })} label="Radiasi sinar las" />
                <CheckboxRow checked={form.dampak.iritasiKulit} onChange={(v) => setGroup("dampak", { iritasiKulit: v })} label="Iritasi Kulit" />
                <CheckboxRow checked={form.dampak.kebisingan} onChange={(v) => setGroup("dampak", { kebisingan: v })} label="Kebisingan diatas 85 dB" />
                <CheckboxRow checked={form.dampak.keracunanZatKimia} onChange={(v) => setGroup("dampak", { keracunanZatKimia: v })} label="Keracunan Zat Kimia" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lainnya, sebutkan</label>
              <input type="text" value={form.dampakLainnya} onChange={(e) => set("dampakLainnya", e.target.value)} className={inputCls} />
            </div>
          </SectionCard>

          {/* BAGIAN 7 */}
          <SectionCard nomor={7} title="Alat Pelindung Diri (APD) yang Harus Dipergunakan">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <div className="space-y-1">
                <CheckboxRow checked={form.apd.masker} onChange={(v) => setGroup("apd", { masker: v })} label="Masker" />
                <CheckboxRow checked={form.apd.maskerKimia} onChange={(v) => setGroup("apd", { maskerKimia: v })} label="Masker Kimia" />
                <CheckboxRow checked={form.apd.kacamataBiasa} onChange={(v) => setGroup("apd", { kacamataBiasa: v })} label="Kaca mata Biasa" />
                <CheckboxRow checked={form.apd.kacamataLas} onChange={(v) => setGroup("apd", { kacamataLas: v })} label="Kaca mata Las" />
                <CheckboxRow checked={form.apd.earPlug} onChange={(v) => setGroup("apd", { earPlug: v })} label="Ear plug" />
                <CheckboxRow checked={form.apd.gloves} onChange={(v) => setGroup("apd", { gloves: v })} label="Gloves" />
                <CheckboxRow checked={form.apd.fullBodyHarness} onChange={(v) => setGroup("apd", { fullBodyHarness: v })} label="Full Body Harness" />
              </div>
              <div className="space-y-1">
                <CheckboxRow checked={form.apd.sarungTanganBintil} onChange={(v) => setGroup("apd", { sarungTanganBintil: v })} label="Sarung Tangan Bintil" />
                <CheckboxRow checked={form.apd.sarungTanganListrik} onChange={(v) => setGroup("apd", { sarungTanganListrik: v })} label="Sarung Tangan Listrik" />
                <CheckboxRow checked={form.apd.sarungTanganKulit} onChange={(v) => setGroup("apd", { sarungTanganKulit: v })} label="Sarung Tangan Kulit" />
                <CheckboxRow checked={form.apd.helm} onChange={(v) => setGroup("apd", { helm: v })} label="Helm" />
                <CheckboxRow checked={form.apd.safetyShoes} onChange={(v) => setGroup("apd", { safetyShoes: v })} label="Safety Shoes" />
                <CheckboxRow checked={form.apd.sepatuKaret} onChange={(v) => setGroup("apd", { sepatuKaret: v })} label="Sepatu Karet" />
                <CheckboxRow checked={form.apd.topiKerja} onChange={(v) => setGroup("apd", { topiKerja: v })} label="Topi Kerja" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lainnya, sebutkan</label>
              <input type="text" value={form.apdLainnya} onChange={(e) => set("apdLainnya", e.target.value)} className={inputCls} />
            </div>
          </SectionCard>

          {/* BAGIAN 8 */}
          <SectionCard nomor={8} title="License / Sertifikasi yang Dipunyai">
            <textarea rows={3} value={form.licenseSertifikasi} onChange={(e) => set("licenseSertifikasi", e.target.value)} className={`${inputCls} resize-none`} placeholder="Sebutkan lisensi/sertifikasi yang dimiliki (mis. sertifikat las, sertifikat K3 ketinggian, dsb.)" />
          </SectionCard>

          {/* BAGIAN 9 */}
          <SectionCard nomor={9} title="Jenis APAR yang Harus Tersedia">
            <div className="space-y-1">
              <CheckboxRow checked={form.apar.dryPowder} onChange={(v) => setGroup("apar", { dryPowder: v, tidakPerlu: v ? false : form.apar.tidakPerlu })} label="Dry Powder" />
              <CheckboxRow checked={form.apar.gasCair} onChange={(v) => setGroup("apar", { gasCair: v, tidakPerlu: v ? false : form.apar.tidakPerlu })} label="Gas Cair" />
              <CheckboxRow checked={form.apar.tidakPerlu} onChange={(v) => setGroup("apar", v ? { tidakPerlu: true, dryPowder: false, gasCair: false } : { tidakPerlu: false })} label="Tidak Perlu" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Lainnya, sebutkan</label>
              <input type="text" value={form.aparLainnya} onChange={(e) => set("aparLainnya", e.target.value)} className={inputCls} />
            </div>
          </SectionCard>

          {/* BAGIAN 10 */}
          <SectionCard nomor={10} title="Tanggung Jawab Limbah Hasil Kegiatan">
            <div className="space-y-1">
              <CheckboxRow checked={form.limbah.kontraktor} onChange={(v) => setGroup("limbah", { kontraktor: v })} label="Kontraktor" />
              <CheckboxRow checked={form.limbah.ptJai} onChange={(v) => setGroup("limbah", { ptJai: v })} label="PT.JAI" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Lokasi Pembuangan Limbah</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={form.limbahLokasiPt} onChange={(e) => set("limbahLokasiPt", e.target.value)} className={inputCls} placeholder="Lokasi PT ..." />
                <label className="flex items-center gap-2 shrink-0 px-4 py-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={form.limbah.luarJai} onChange={(e) => setGroup("limbah", { luarJai: e.target.checked })} className={cb} />
                  <span className="text-sm text-slate-700 whitespace-nowrap">Luar JAI</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Izin Mulai Kerja</label>
                <TimeInput24 value={form.izinKerjaDari} onChange={(v) => set("izinKerjaDari", v)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Sampai Dengan</label>
                <TimeInput24 value={form.izinKerjaSampai} onChange={(v) => set("izinKerjaSampai", v)} />
              </div>
            </div>
          </SectionCard>

          {/* BAGIAN 11 */}
          <SectionCard nomor={11} title="Penanggung Jawab Pelaksanaan Pekerjaan">
            <p className="text-xs text-slate-400 -mt-1 mb-2">Informasi penanggung jawab — bukan approver form ini.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Kontraktor</label>
                <input type="text" value={form.kontraktorPj} onChange={(e) => set("kontraktorPj", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">SPV Terkait</label>
                <input type="text" value={form.spvTerkaitPj} onChange={(e) => set("spvTerkaitPj", e.target.value)} className={inputCls} />
              </div>
            </div>
          </SectionCard>

          {/* Info alur approval (Bagian 12 — diproses di halaman approval) */}
          <div className="px-4 py-3 rounded-xl text-xs bg-blue-50 text-blue-700 border border-blue-200">
            <strong>Alur approval (Bagian 12) yang akan diterapkan:</strong>
            <span className="ml-1">Security → SFO → PGA Manager</span>
          </div>

          {/* BAGIAN 14 */}
          <section id="bagian-14" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={sectionHead}>
              <h2 className="font-bold text-slate-800">Bagian 14: Pernyataan Tentang Ijin Kerja</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 border-slate-200 hover:border-orange-300 transition-all">
                <input
                  type="checkbox"
                  checked={form.pernyataanDiperiksa}
                  onChange={(e) => set("pernyataanDiperiksa", e.target.checked)}
                  className={`${cb} mt-0.5`}
                />
                <span className="text-sm text-slate-700">
                  Saya telah memeriksa area kerja dan pencegahan yang diperlukan, dan telah dibahas oleh pihak-pihak terkait.
                  <span className="text-red-500"> *</span>
                </span>
              </label>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nama Pengawas Pekerjaan / User <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.pengawasPekerjaanUser}
                  onChange={(e) => set("pengawasPekerjaanUser", e.target.value)}
                  className={inputCls}
                  placeholder="Nama pengawas pekerjaan / user"
                />
              </div>
            </div>
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="flex-1 py-3.5 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan Draft...</> : "Simpan sebagai Draft"}
            </button>
            <button
              type="submit"
              disabled={submitting || saving}
              className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</> : <><AlertTriangle className="w-4 h-4" />Kirim Izin Kerja</>}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}