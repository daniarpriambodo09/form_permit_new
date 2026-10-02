// app/form/hot-work/page.tsx
"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Home, Flame, Save, Send, AlertCircle, Lock } from "lucide-react";
import JsaMethodSection, { type JsaMode } from "@/components/JsaMethodSection";
import { type JsaFileInfo, type JsaUploadStatus as JsaStatus } from "@/components/JsaUploadSection";
import LinkedJsaSection, { createEmptyJsa } from "@/components/LinkedJsaSection";
import type { JsaData } from "@/components/JsaBuilderSection";
import TimeInput24, { normalizeTo24h } from "@/components/Time24Input";
import { useSearchParams } from "next/navigation";

interface WorkerOption {
  nik: string;
  nama: string;
  departemen: string | null;
  jenis_kerja: string;
  file_url: string | null;
  file_type: string | null;
  tanggal_exp: string | null;
}

type WorkDetail = { detail: string; mulai: string; selesai: string };

interface FormData {
  tipePerusahaan: "internal" | "eksternal";
  namaKontraktor: string;
  namaPekerjaNIK: string;
  lokasi: string;
  tanggalPelaksanaan: string;
  waktuPukul: string;
  waktuSelesai: string;
  namaFireWatch: string;
  nikFireWatch: string;
  jenisPekerjaan: {
    preventive: boolean; tangki: boolean; panel: boolean;
    cutting: WorkDetail; grinding: WorkDetail; welding: WorkDetail; painting: WorkDetail;
    lainnya: boolean; lainnyaKeterangan: string;
  };
  areaBerisiko: {
    ruangTertutup: boolean; bahanMudah: boolean; gas: boolean;
    ketinggian: boolean; cairan: boolean; hydrocarbon: boolean; lain: string;
  };
  pencegahan: {
    equipment: string; apar: string; sensor: string; apd: string;
    lantaiBasah: string; cairan_diproteksi: string; lindungi_conveyor: string;
    ruangTertutupBerlaku: string;
    ruang_tertutup_dibersihkan: string; uap_dibuang: string;
    dindingBerlaku: string;
    dinding_konstruksi: string; bahan_dipindahkan: string;
    firewatch_ada: string; firewatch_pelatihan: string;
    fireblank: string; fireblank_jumlah: string;
    permintaan_tambahan: string;
  };
  persetujuan: { spvNama: string; kontraktorNama: string; sfoNama: string; pgaNama: string };
}

const Section = ({ title, section, description, expanded, toggle, children }: any) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm">
    <button onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200 hover:from-orange-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
          <Flame className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          {description && <p className="text-xs text-slate-600 mt-0.5">{description}</p>}
        </div>
      </div>
      {expanded[section] ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
    </button>
    {expanded[section] && <div className="p-6 bg-white">{children}</div>}
  </div>
);

const CheckItem = ({ label, checked, onChange }: any) => (
  <label className="flex items-start gap-3 cursor-pointer p-3 hover:bg-slate-50 rounded-lg transition-colors">
    <input type="checkbox" checked={checked} onChange={onChange} className="w-5 h-5 text-orange-600 rounded border-slate-300 mt-0.5 shrink-0" />
    <span className="text-sm text-slate-700 flex-1">{label}</span>
  </label>
);

// ── Bagian 3: baris checklist tunggal (item biasa & sub-item kelompok) ──
// `options` opsional: default YA/TIDAK, bisa diganti mis. LAYAK/TIDAK LAYAK.
const ChecklistRow = ({ no, label, fieldKey, pencegahan, setPencegahan, disabled, indent, options }: any) => {
  const opts = options ?? [
    { value: "ya", label: "YA" },
    { value: "tidak", label: "TIDAK" },
  ];
  return (
    <label
      className={`grid grid-cols-[3.5rem_1fr] border-b border-slate-200 last:border-0 transition-colors ${
        disabled ? "opacity-50 bg-slate-50 cursor-not-allowed" : "cursor-pointer hover:bg-orange-50"
      }`}
    >
      <span className="px-3 py-2.5 text-sm text-slate-600 text-center border-r border-slate-200">{no}</span>
      <span className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-slate-700 ${indent ? "pl-6" : ""}`}>
        <span>{label}</span>
        <span className="flex items-center gap-3 shrink-0">
          {opts.map((opt: { value: string; label: string }) => (
            <label key={opt.value} className={`flex items-center gap-1.5 text-xs font-semibold ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="radio"
                name={fieldKey}
                value={opt.value}
                disabled={disabled}
                checked={pencegahan[fieldKey] === opt.value}
                onChange={() => setPencegahan({ ...pencegahan, [fieldKey]: opt.value })}
                className="w-4 h-4 text-orange-600 border-slate-300"
              />
              {opt.label}
            </label>
          ))}
        </span>
      </span>
    </label>
  );
};

// ── Bagian 3: header kelompok (item 8 & 9) — YA/TIDAK di sini mengaktifkan/menonaktifkan sub-item ──
const ChecklistGroupHeader = ({ no, label, groupField, pencegahan, onToggleGroup }: any) => (
  <div className="grid grid-cols-[3.5rem_1fr] border-b border-slate-200 bg-orange-50">
    <span className="px-3 py-2.5 text-sm font-bold text-slate-700 text-center border-r border-slate-200">{no}</span>
    <span className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-sm font-bold text-slate-800 uppercase">{label}</span>
      <span className="flex items-center gap-3 shrink-0">
        {["ya", "tidak"].map((v) => (
          <label key={v} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
            <input
              type="radio"
              name={groupField}
              value={v}
              checked={pencegahan[groupField] === v}
              onChange={() => onToggleGroup(v)}
              className="w-4 h-4 text-orange-600 border-slate-300"
            />
            {v === "ya" ? "YA" : "TIDAK"}
          </label>
        ))}
      </span>
    </span>
  </div>
);

const DisabledField = ({ placeholder }: any) => (
  <div className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-400 text-sm italic select-none cursor-not-allowed">{placeholder}</div>
);

const emptyWork = (): WorkDetail => ({ detail: "", mulai: "", selesai: "" });

const defaultForm = (): FormData => ({
  tipePerusahaan: "internal",
  namaKontraktor: "", namaPekerjaNIK: "", lokasi: "", tanggalPelaksanaan: "", waktuPukul: "", waktuSelesai: "",
  namaFireWatch: "", nikFireWatch: "",
  jenisPekerjaan: {
    preventive: false, tangki: false, panel: false,
    cutting: emptyWork(), grinding: emptyWork(), welding: emptyWork(), painting: emptyWork(),
    lainnya: false, lainnyaKeterangan: "",
  },
  areaBerisiko: { ruangTertutup: false, bahanMudah: false, gas: false, ketinggian: false, cairan: false, hydrocarbon: false, lain: "" },
  pencegahan: {
    equipment: "tidak", apar: "tidak", sensor: "tidak", apd: "tidak",
    lantaiBasah: "tidak", cairan_diproteksi: "tidak", lindungi_conveyor: "tidak",
    ruangTertutupBerlaku: "tidak",
    ruang_tertutup_dibersihkan: "tidak", uap_dibuang: "tidak",
    dindingBerlaku: "tidak",
    dinding_konstruksi: "tidak", bahan_dipindahkan: "tidak",
    firewatch_ada: "tidak", firewatch_pelatihan: "tidak",
    fireblank: "tidak_layak", fireblank_jumlah: "",
    permintaan_tambahan: "",
  },
  persetujuan: { spvNama: "", kontraktorNama: "", sfoNama: "", pgaNama: "" },
});

const getApproverLabels = (isInternal: boolean) => isInternal
  ? ["SPV / Pemberi Izin", "Admin K3", "SFO", "SMR / PGA SMGR"]
  : ["Kontraktor", "SPV / Pemberi Izin", "Admin K3", "SFO", "SMR / PGA SMGR"];

function HotWorkPermitFormInner() {
  const [formData, setFormData] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState({ bagian1: true, bagian2: true, bagian3: true, bagian4: true });
  const [user, setUser] = useState<any>(null);
  const [workerOptions, setWorkerOptions] = useState<WorkerOption[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [spvOptions, setSpvOptions] = useState<Array<{ id: number; nama: string; nik: string | null; jabatan: string | null; departmen: string | null }>>([]);
  const [spvPemberiIzin, setSpvPemberiIzin] = useState<{ nama: string; nik: string; jabatan: string }>({ nama: "", nik: "", jabatan: "" });
  const [validationError, setValidationError] = useState<string>("");

  // ── JSA state ──────────────────────────────────────────────
  const [perluJsa, setPerluJsa] = useState(false);
  const [jsaFile, setJsaFile] = useState<JsaFileInfo | null>(null);
  const [jsaUploadStatus, setJsaUploadStatus] = useState<JsaStatus>("idle");
  const [jsaUploadError, setJsaUploadError] = useState("");
  const [jsaData, setJsaData] = useState<JsaData>(createEmptyJsa());
  const [jsaMode, setJsaMode] = useState<JsaMode>("upload");

  const searchParams = useSearchParams();
  const idIjinKerja = searchParams.get("id_ijin_kerja");

  useEffect(() => {
    if (idIjinKerja) {
      setFormData((p) => ({ ...p, tipePerusahaan: "eksternal" }));
    }
  }, [idIjinKerja]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/form-permit/api/auth/me");
        if (!res.ok) return;

        const data = await res.json();
        setUser(data.user);

        // ── Auto-isi Sect/Dept JSA dari departemen user (Internal) ──
        if (data.user.departmen) {
          setJsaData((prev) => ({ ...prev, sectDept: data.user.departmen }));
        }

        if (data.user.departmen) {
          const spvRes = await fetch("/form-permit/api/admin-users/approvers");
          if (spvRes.ok) {
            const spvData = await spvRes.json();
            const options = (spvData.users ?? []).filter((u: any) => {
              if (u.role !== "spv") return false;
              if (!u.departmen) return true;
              return u.departmen === data.user.departmen;
            });
            setSpvOptions(options);
            if (options.length > 0) {
              const defaultSpv = options[0];
              setSpvPemberiIzin({
                nama: defaultSpv.nama ?? "",
                nik: defaultSpv.nik ?? "",
                jabatan: defaultSpv.jabatan ?? "",
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
    fetchUser();
  }, []);

  // ── Fetch pekerja Hot Work dari Master Lisence saat Internal ──
  useEffect(() => {
    if (formData.tipePerusahaan !== "internal") {
      setWorkerOptions([]);
      return;
    }
    setLoadingWorkers(true);
    fetch("/form-permit/api/master-lisence/workers?jenisKerja=hot_work", {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWorkerOptions(d.data || []))
      .catch((err) => {
        console.error("Gagal memuat pekerja master lisence:", err);
        setWorkerOptions([]);
      })
      .finally(() => setLoadingWorkers(false));
  }, [formData.tipePerusahaan]);

  const toggle = (s: string) => setExpanded(prev => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));
  const setJ = (patch: any) => setFormData(prev => ({ ...prev, jenisPekerjaan: { ...prev.jenisPekerjaan, ...patch } }));
  const setA = (patch: any) => setFormData(prev => ({ ...prev, areaBerisiko: { ...prev.areaBerisiko, ...patch } }));
  const setP = (patch: any) => setFormData(prev => ({ ...prev, pencegahan: { ...prev.pencegahan, ...patch } }));
  const setWork = (key: "cutting" | "grinding" | "welding" | "painting", field: keyof WorkDetail, val: string) =>
    setJ({ [key]: { ...formData.jenisPekerjaan[key], [field]: val } });

  // ── Bagian 3: kelompok 8 (ruangan tertutup) & 9 (dinding/langit-langit) ──
  // Kalau kelompok "tidak", sub-item ikut dipaksa "tidak" & dikunci.
  const setRuangTertutupBerlaku = (v: string) =>
    setP(v === "tidak"
      ? { ruangTertutupBerlaku: v, ruang_tertutup_dibersihkan: "tidak", uap_dibuang: "tidak" }
      : { ruangTertutupBerlaku: v });
  const setDindingBerlaku = (v: string) =>
    setP(v === "tidak"
      ? { dindingBerlaku: v, dinding_konstruksi: "tidak", bahan_dipindahkan: "tidak" }
      : { dindingBerlaku: v });

  const isInternal = formData.tipePerusahaan === "internal";
  const approverLabels = getApproverLabels(isInternal);
  const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black";

  const submit = async (isSubmit: boolean) => {
    setValidationError("");
    if (!formData.namaPekerjaNIK.trim()) {
      setValidationError("Nama Pekerja / NIK wajib diisi");
      return;
    }
    // Validasi Fire Watch
    if (!formData.namaFireWatch || !formData.nikFireWatch) {
      setValidationError("Fire Watch wajib dipilih");
      return;
    }

    if (!spvPemberiIzin.nama || !spvPemberiIzin.nik) {
      setValidationError("SPV / Pemberi Izin wajib dipilih");
      return;
    }

    // ── Validasi JSA ──────────────────────────────────────────
    if ((idIjinKerja || jsaMode === "build") && perluJsa && (!jsaData.area.trim() || !jsaData.jenisPekerjaan.trim() || !jsaData.pic.trim() || !jsaData.petugas.some((name) => name.trim()))) {
      setValidationError("Area, Jenis Pekerjaan, PIC, dan minimal satu Petugas pada JSA wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      // Helper: hanya kirim waktu jika detail ada
      const normalizeWork = (work: WorkDetail) => ({
        detail: work.detail || null,
        mulai: work.detail ? normalizeTo24h(work.mulai) : null,
        selesai: work.detail ? normalizeTo24h(work.selesai) : null,
      });

      const normalizedData = {
        ...formData,
        waktuPukul: normalizeTo24h(formData.waktuPukul),
        waktuSelesai: normalizeTo24h(formData.waktuSelesai),
        jenisPekerjaan: {
          ...formData.jenisPekerjaan,
          cutting: normalizeWork(formData.jenisPekerjaan.cutting),
          grinding: normalizeWork(formData.jenisPekerjaan.grinding),
          welding: normalizeWork(formData.jenisPekerjaan.welding),
          painting: normalizeWork(formData.jenisPekerjaan.painting),
        },
      };
      const res = await fetch("/form-permit/api/forms/hot-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...normalizedData,
          isSubmit,
          perluJsa,
          jsaFileUrl: jsaFile?.url ?? null,
          spvPemberiIzin,
          ...(idIjinKerja || jsaMode === "build" ? { jsaData } : {}),
          idIjinKerja,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan server");
      return data;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => { try { const r = await submit(false); alert(`Draft disimpan! ID: ${r.id_form}`); } catch (e: any) { alert("Gagal: " + e.message); } };
  const handleSubmit = async () => {
    if (validationError) { alert(validationError); return; }
    try {
      const r = await submit(true);
      if (!r) return;
      alert(`Izin diajukan! ID: ${r.id_form}`);
      window.location.href = "/form-permit/my-forms";
    } catch (e: any) { alert("Gagal: " + e.message); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/my-forms" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Home className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">FORM HOT WORK PERMIT</h1>
              <p className="text-xs text-slate-500">(IJIN KERJA PANAS) — PT JATIM AUTOCOMP INDONESIA</p>
            </div>
          </div>
          <Link href="/my-forms" className="text-sm text-orange-600 hover:text-orange-700 font-medium">Lihat Riwayat →</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Pastikan semua bagian diisi dengan lengkap dan mendapat persetujuan dari pihak berwenang sebelum pekerjaan dimulai.</p>
        </div>

        {idIjinKerja && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Lock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <p className="text-sm text-purple-800">
              Form ini akan terhubung ke Ijin Kerja Eksternal <strong className="font-mono">{idIjinKerja}</strong>.
            </p>
          </div>
        )}

        {/* ── BAGIAN 1 ── */}
        <Section title="BAGIAN 1: INFORMASI REGISTRASI & IDENTITAS PEKERJAAN"
          section="bagian1" description="Data kontraktor, pekerja, lokasi, dan jadwal pekerjaan"
          expanded={expanded} toggle={toggle}>
          <div className="space-y-5">

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe Pekerja / Perusahaan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "internal", label: "Internal / Karyawan PT.JAI", desc: "Alur: SPV → Admin K3 → SFO → SMR" },
                  { value: "eksternal", label: "Eksternal / Subkontraktor", desc: "Alur: Kontraktor → SPV → Admin K3 → SFO → SMR" },
                ].map(opt => (
                  <label key={opt.value}
                    className={`flex flex-col gap-1 p-3 rounded-xl border-2 transition-all ${opt.value === "eksternal" ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${formData.tipePerusahaan === opt.value ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-200"}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="tipePerusahaan" value={opt.value}
                        checked={formData.tipePerusahaan === opt.value}
                        onChange={() => setFormData(p => ({ ...p, tipePerusahaan: opt.value as any, namaPekerjaNIK: "" }))}
                        disabled={opt.value === "eksternal" || !!idIjinKerja}
                        className="text-orange-500" />
                      <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 ml-5">{opt.desc}</p>
                  </label>
                ))}
              </div>
              <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${isInternal ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
                <strong>Alur approval yang akan diterapkan:</strong>
                <span className="ml-1">{isInternal ? "SPV → Admin K3 → SFO → SMR / PGA SMGR" : "Kontraktor → SPV → Admin K3 → SFO → SMR / PGA SMGR"}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Kontraktor{" "}
                {isInternal ? <span className="text-slate-400 font-normal text-xs ml-1">(tidak diperlukan untuk Internal)</span> : <span className="text-red-500">*</span>}
              </label>
              <input type="text" value={isInternal ? "" : formData.namaKontraktor}
                onChange={e => setFormData(p => ({ ...p, namaKontraktor: e.target.value }))}
                disabled={isInternal} required={!isInternal}
                placeholder={isInternal ? "Tidak diperlukan untuk Internal / Karyawan PT.JAI" : "PT ABC"}
                className={`${inputCls} ${isInternal ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60" : ""}`} />
            </div>

            {isInternal ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nama Pekerja / NIK <span className="text-red-500">*</span>
                  </label>
                  {loadingWorkers ? (
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-400 text-sm flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                      <span>Memuat pekerja dari Master Lisence...</span>
                    </div>
                  ) : workerOptions.length > 0 ? (
                    <select
                      value={formData.namaPekerjaNIK}
                      onChange={(e) => {
                        const selected = workerOptions.find((w) => `${w.nama} / ${w.nik}` === e.target.value);
                        setFormData((p) => ({
                          ...p,
                          namaPekerjaNIK: selected ? `${selected.nama} / ${selected.nik}` : e.target.value,
                        }));
                        setValidationError("");
                      }}
                      required
                      className={inputCls}
                    >
                      <option value="">-- Pilih Pekerja (Master Lisence) --</option>
                      {workerOptions.map((w) => {
                        const isExpired = w.tanggal_exp ? new Date(w.tanggal_exp).getTime() < new Date().setHours(0, 0, 0, 0) : false;
                        return (
                          <option key={`${w.nama}-${w.nik}`} value={`${w.nama} / ${w.nik}`}>
                            {`${w.nama} / ${w.nik}`}{w.departemen ? ` (${w.departemen})` : ""}{isExpired ? " [Lisensi Kadaluarsa]" : ""}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={formData.namaPekerjaNIK}
                        onChange={(e) => setFormData((p) => ({ ...p, namaPekerjaNIK: e.target.value }))}
                        className={inputCls}
                        placeholder="Nama lengkap atau NIK (Ketik manual)"
                        required
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        Belum ada pekerja Hot Work terdaftar di Master Lisence. Anda dapat mengetik manual atau mendaftarkannya di menu Master Lisence.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">NIK Pekerja</label>
                  <input
                    type="text"
                    value={formData.namaPekerjaNIK.includes(" / ") ? formData.namaPekerjaNIK.split(" / ")[1].trim() : (formData.namaPekerjaNIK || "")}
                    readOnly
                    placeholder="NIK akan terisi otomatis"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nama Pekerja / NIK <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.namaPekerjaNIK}
                  onChange={(e) => setFormData((p) => ({ ...p, namaPekerjaNIK: e.target.value }))}
                  className={inputCls}
                  placeholder="Nama lengkap atau NIK"
                  required
                />
              </div>
            )}

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

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Mulai</label>
                <TimeInput24 value={formData.waktuPukul} onChange={val => setFormData(p => ({ ...p, waktuPukul: val }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Selesai</label>
                <TimeInput24 value={formData.waktuSelesai} onChange={val => setFormData(p => ({ ...p, waktuSelesai: val }))} />
              </div>
            </div>

            {/* Fire Watch */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                <h4 className="font-bold text-blue-900 text-sm">Fire Watch (Pengawas Api) <span className="text-red-500">*</span></h4>
              </div>
              <div className="flex items-start gap-2 bg-blue-100 border border-blue-300 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Input manual nama dan NIK Fire Watch sesuai data yang benar.</p>
              </div>
              {validationError && (
                <div className="bg-red-100 border border-red-300 rounded-lg px-3 py-2.5 mb-4">
                  <p className="text-xs text-red-700">{validationError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Fire Watch <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.namaFireWatch}
                    onChange={(e) => setFormData((p) => ({ ...p, namaFireWatch: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black"
                    placeholder="Masukkan nama Fire Watch"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">NIK Fire Watch <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.nikFireWatch}
                    onChange={(e) => setFormData((p) => ({ ...p, nikFireWatch: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black"
                    placeholder="Masukkan NIK Fire Watch"
                  />
                </div>
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
                <p className="text-xs text-green-700">Pilih SPV yang sesuai dari departemen Anda. NIK dan jabatan akan muncul otomatis.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nama SPV / Pemberi Izin <span className="text-red-500">*</span></label>
                  <select
                    value={spvPemberiIzin.nama}
                    onChange={(e) => {
                      const selected = spvOptions.find((spv) => spv.nama === e.target.value);
                      setSpvPemberiIzin({
                        nama: selected?.nama ?? "",
                        nik: selected?.nik ?? "",
                        jabatan: selected?.jabatan ?? "",
                      });
                    }}
                    className={`w-full px-4 py-2.5 border ${spvPemberiIzin.nama ? 'border-slate-300' : 'border-red-300 bg-red-50'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black`}
                  >
                    <option value="">-- Pilih SPV --</option>
                    {spvOptions.map((spv) => (
                      <option key={spv.id} value={spv.nama}>{spv.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">NIK SPV</label>
                  <input
                    type="text"
                    value={spvPemberiIzin.nik}
                    readOnly
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 text-sm"
                  />
                </div>
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
              {[{ key: "preventive", label: "Preventive Genset / Pump room" }, { key: "tangki", label: "Tangki Solar" }, { key: "panel", label: "Panel Listrik" }]
                .map(item => <CheckItem key={item.key} label={item.label} checked={(formData.jenisPekerjaan as any)[item.key]} onChange={() => setJ({ [item.key]: !(formData.jenisPekerjaan as any)[item.key] })} />)}
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">B. Detail Pekerjaan Panas</h4>
              <div className="space-y-4">
                {(["cutting", "grinding", "welding", "painting"] as const).map(key => {
                  const item = formData.jenisPekerjaan[key];
                  return (
                    <div key={key} className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-orange-50 transition-colors">
                      <p className="text-sm font-bold text-slate-900 mb-3 capitalize">{key}</p>
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-12 md:col-span-5">
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Detail Pekerjaan</label>
                          <input
                            type="text"
                            value={item.detail}
                            onChange={e => setWork(key, "detail", e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Deskripsi pekerjaan"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mulai</label>
                          <TimeInput24
                            value={item.mulai}
                            onChange={val => setWork(key, "mulai", val)}
                            label=""
                          />
                        </div>
                        <div className="col-span-6 md:col-span-4">
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Selesai</label>
                          <TimeInput24
                            value={item.selesai}
                            onChange={val => setWork(key, "selesai", val)}
                            label=""
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base mb-3 pb-3 border-b border-slate-200">C. Pekerjaan Lainnya</h4>
              <CheckItem label="Ada pekerjaan lain yang menggunakan aplikasi panas lainnya" checked={formData.jenisPekerjaan.lainnya} onChange={() => setJ({ lainnya: !formData.jenisPekerjaan.lainnya })} />
              {formData.jenisPekerjaan.lainnya && <textarea rows={2} value={formData.jenisPekerjaan.lainnyaKeterangan} onChange={e => setJ({ lainnyaKeterangan: e.target.value })} className="w-full mt-3 px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-black" placeholder="Sebutkan..." />}
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">Area / Equipment Berisiko Tinggi</h4>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-1">
                {[{ key: "ruangTertutup", label: "Ruang tertutup / area pembuangan" }, { key: "bahanMudah", label: "Bahan mudah terbakar" }, { key: "gas", label: "Gas (bekerja dalam bejana / tangki)" }, { key: "ketinggian", label: "Bekerja di ketinggian" }, { key: "cairan", label: "Cairan / Gas bertekanan" }, { key: "hydrocarbon", label: "Cairan hydrocarbon" }]
                  .map(item => <CheckItem key={item.key} label={item.label} checked={(formData.areaBerisiko as any)[item.key]} onChange={() => setA({ [item.key]: !(formData.areaBerisiko as any)[item.key] })} />)}
                <div className="mt-3 pt-3 border-t border-red-300">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bahaya lain (sebutkan)</label>
                  <input type="text" value={formData.areaBerisiko.lain} onChange={e => setA({ lain: e.target.value })} className="w-full px-4 py-2.5 border border-red-300 rounded-lg text-sm text-black" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 3 ── */}
        <Section title="BAGIAN 3: HAL-HAL YANG PERLU DIPERHATIKAN SEBAGAI UPAYA PENCEGAHAN"
          section="bagian3" description="Checklist keselamatan" expanded={expanded} toggle={toggle}>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[3.5rem_1fr] bg-slate-100 border-b border-slate-300">
              <span className="px-3 py-2.5 text-xs font-bold text-slate-600 text-center">NO.</span>
              <span className="px-3 py-2.5 text-xs font-bold text-slate-600">ITEM CHECK LIST</span>
            </div>

            <ChecklistRow no="1" label="Equipment/Tools kondisi baik" fieldKey="equipment" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow no="2" label="Alat pemadam api (APAR, Hydrant)" fieldKey="apar" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow no="3" label="Sensor Smoke Detector perlu dinon-aktifkan" fieldKey="sensor" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow no="4" label="APD lengkap dipakai" fieldKey="apd" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow no="5" label="Lantai dari bahan mudah terbakar dibasahi, ditutupi dengan pasir basah atau perisai metal lainnya" fieldKey="lantaiBasah" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow no="6" label="Cairan mudah terbakar dan menyala diproteksi dengan tutup atau perisai metal" fieldKey="cairan_diproteksi" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow no="7" label="Lindungi conveyor, instalasi kabel, equipment penghantar listrik dengan perisai metal tidak mudah terbakar" fieldKey="lindungi_conveyor" pencegahan={formData.pencegahan} setPencegahan={setP} />

            <ChecklistGroupHeader no="8" label="Pekerjaan Pada Ruangan Tertutup" groupField="ruangTertutupBerlaku" pencegahan={formData.pencegahan} onToggleGroup={setRuangTertutupBerlaku} />
            <ChecklistRow no="8.1" indent label="Peralatan dibersihkan dari semua bahan mudah terbakar" fieldKey="ruang_tertutup_dibersihkan" pencegahan={formData.pencegahan} setPencegahan={setP} disabled={formData.pencegahan.ruangTertutupBerlaku !== "ya"} />
            <ChecklistRow no="8.2" indent label="Uap menyala di ruangan tertutup dibuang dari ruangan" fieldKey="uap_dibuang" pencegahan={formData.pencegahan} setPencegahan={setP} disabled={formData.pencegahan.ruangTertutupBerlaku !== "ya"} />

            <ChecklistGroupHeader no="9" label="Pekerjaan Pada Dinding Atau Langit-Langit" groupField="dindingBerlaku" pencegahan={formData.pencegahan} onToggleGroup={setDindingBerlaku} />
            <ChecklistRow no="9.1" indent label="Pekerjaan pada dinding atau langit-langit konstruksi tidak mudah terbakar dan tanpa penutup yang mudah terbakar" fieldKey="dinding_konstruksi" pencegahan={formData.pencegahan} setPencegahan={setP} disabled={formData.pencegahan.dindingBerlaku !== "ya"} />
            <ChecklistRow no="9.2" indent label="Bahan mudah terbakar dipindahkan dari dinding yang bersebrangan" fieldKey="bahan_dipindahkan" pencegahan={formData.pencegahan} setPencegahan={setP} disabled={formData.pencegahan.dindingBerlaku !== "ya"} />

            <ChecklistRow no="10" label="Fire watch ada memastikan area aman selama proses dan 60 menit setelahnya untuk menghindari bunga api dan panas yang menjalar" fieldKey="firewatch_ada" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow no="11" label="Fire Watch sudah mendapatkan pelatihan dan mampu menggunakan alat pemadam kebakaran dan fire alarm" fieldKey="firewatch_pelatihan" pencegahan={formData.pencegahan} setPencegahan={setP} />
            <ChecklistRow
              no="12"
              label="Kondisi Fire Blanket / Perisai Metal"
              fieldKey="fireblank"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
              options={[
                { value: "layak", label: "LAYAK" },
                { value: "tidak_layak", label: "TIDAK LAYAK" },
              ]}
            />
          </div>

          <div className="mt-4 max-w-xs">
            <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah Fire Blanket yang Digunakan</label>
            <input
              type="number"
              min={0}
              value={formData.pencegahan.fireblank_jumlah}
              onChange={e => setP({ fireblank_jumlah: e.target.value })}
              className={inputCls}
              placeholder="Jumlah"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Permintaan Tambahan Tindakan Pengamanan</label>
            <textarea rows={3} value={formData.pencegahan.permintaan_tambahan} onChange={e => setP({ permintaan_tambahan: e.target.value })} className={inputCls} placeholder="Sebutkan..." />
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
                  {isInternal ? "SPV → Admin K3 → SFO → SMR / PGA SMGR" : "Kontraktor → SPV → Admin K3 → SFO → SMR / PGA SMGR"}
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

        {/* ── BAGIAN 5: UPLOAD JSA ── */}
        {idIjinKerja ? <LinkedJsaSection
          idIjinKerja={idIjinKerja}
          enabled={perluJsa}
          setEnabled={setPerluJsa}
          value={jsaData}
          setValue={setJsaData}
        /> : <JsaMethodSection
          mode={jsaMode}
          setMode={setJsaMode}
          perluJsa={perluJsa}
          setPerluJsa={setPerluJsa}
          jsaFile={jsaFile}
          setJsaFile={setJsaFile}
          jsaUploadStatus={jsaUploadStatus}
          setJsaUploadStatus={setJsaUploadStatus}
          jsaUploadError={jsaUploadError}
          setJsaUploadError={setJsaUploadError}
          jsaData={jsaData}
          setJsaData={setJsaData}
          sectionTitle="BAGIAN 5: UPLOAD JSA"
          sectionStyle="hot-work"
        />}

        {/* Action buttons */}
        <div className="flex justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-md sticky bottom-4 border border-slate-200">
          <button onClick={handleSave} disabled={submitting || jsaUploadStatus === "uploading"}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold flex items-center gap-2 disabled:opacity-60">
            <Save className="w-5 h-5" />{submitting ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button onClick={handleSubmit} disabled={submitting || jsaUploadStatus === "uploading"}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg disabled:opacity-60">
            <Send className="w-5 h-5" />{submitting ? "Mengajukan..." : jsaUploadStatus === "uploading" ? "Upload JSA..." : "Ajukan Izin"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HotWorkPermitForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
          Memuat formulir...
        </div>
      }
    >
      <HotWorkPermitFormInner />
    </Suspense>
  );
}