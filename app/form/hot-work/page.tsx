// app/form/hot-work/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Home,
  Flame,
  Save,
  Send,
  AlertCircle,
  Lock,
  Clock,
  CheckCircle2,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Building2,
  Calendar,
  Layers,
  Check
} from "lucide-react";
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
    preventive: boolean;
    tangki: boolean;
    panel: boolean;
    cutting: WorkDetail;
    grinding: WorkDetail;
    welding: WorkDetail;
    painting: WorkDetail;
    lainnya: boolean;
    lainnyaKeterangan: string;
  };
  areaBerisiko: {
    ruangTertutup: boolean;
    bahanMudah: boolean;
    gas: boolean;
    ketinggian: boolean;
    cairan: boolean;
    hydrocarbon: boolean;
    lain: string;
  };
  pencegahan: {
    equipment: string;
    apar: string;
    sensor: string;
    apd: string;
    lantaiBasah: string;
    cairan_diproteksi: string;
    lindungi_conveyor: string;
    ruangTertutupBerlaku: string;
    ruang_tertutup_dibersihkan: string;
    uap_dibuang: string;
    dindingBerlaku: string;
    dinding_konstruksi: string;
    bahan_dipindahkan: string;
    firewatch_ada: string;
    firewatch_pelatihan: string;
    fireblank: string;
    fireblank_jumlah: string;
    permintaan_tambahan: string;
  };
  persetujuan: { spvNama: string; kontraktorNama: string; sfoNama: string; pgaNama: string };
}

// ── Komponen Card Section yang Rapi & Modern ─────────────────────────
const Section = ({
  stepNumber,
  title,
  section,
  description,
  expanded,
  toggle,
  badge,
  children,
}: any) => (
  <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
    <button
      type="button"
      onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-slate-50/80 hover:bg-orange-50/60 px-5 sm:px-7 py-4 border-b border-slate-200 transition-colors text-left"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-orange-600/20 shrink-0">
          {stepNumber}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">{title}</h3>
            {badge && (
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          {expanded[section] ? "Tutup" : "Buka"}
        </span>
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
          {expanded[section] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
    </button>
    {expanded[section] && <div className="p-5 sm:p-7">{children}</div>}
  </div>
);

// ── Check Item Kotak Centang Modern ──────────────────────────────────
const CheckItem = ({ label, checked, onChange }: any) => (
  <label
    className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-xl border transition-all ${
      checked
        ? "bg-orange-50/80 border-orange-300 text-orange-950 font-medium shadow-xs"
        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
    }`}
  >
    <div
      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
        checked ? "bg-orange-600 border-orange-600 text-white" : "border-slate-300 bg-white"
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <span className="text-xs sm:text-sm flex-1 leading-snug">{label}</span>
  </label>
);

// ── Baris Checklist K3 dengan Tombol Pill Segmented ──────────────────
const ChecklistRow = ({
  no,
  label,
  fieldKey,
  pencegahan,
  setPencegahan,
  disabled,
  indent,
  options,
}: any) => {
  const opts = options ?? [
    { value: "ya", label: "YA" },
    { value: "tidak", label: "TIDAK" },
  ];
  const currentValue = pencegahan[fieldKey];

  return (
    <div
      className={`grid grid-cols-[3.5rem_1fr] border-b border-slate-200/80 last:border-0 transition-colors items-center ${
        disabled ? "opacity-50 bg-slate-50/80 cursor-not-allowed" : "hover:bg-slate-50/60"
      }`}
    >
      <span className="px-3 py-3 text-xs sm:text-sm font-semibold text-slate-500 text-center border-r border-slate-200">
        {no}
      </span>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 ${indent ? "pl-6 sm:pl-8" : ""}`}>
        <span className="text-xs sm:text-sm text-slate-700 leading-snug">{label}</span>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {opts.map((opt: { value: string; label: string }) => {
            const isSelected = currentValue === opt.value;
            const isPositive = opt.value === "ya" || opt.value === "layak";
            return (
              <button
                type="button"
                key={opt.value}
                disabled={disabled}
                onClick={() => setPencegahan({ ...pencegahan, [fieldKey]: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : isSelected
                    ? isPositive
                      ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500"
                      : "bg-rose-600 text-white shadow-sm ring-1 ring-rose-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Header Kelompok Checklist dengan Tombol Pill ──────────────────────
const ChecklistGroupHeader = ({ no, label, groupField, pencegahan, onToggleGroup }: any) => {
  const currentValue = pencegahan[groupField];

  return (
    <div className="grid grid-cols-[3.5rem_1fr] border-b border-slate-200 bg-orange-50/70 items-center">
      <span className="px-3 py-3 text-xs sm:text-sm font-bold text-orange-900 text-center border-r border-slate-200">
        {no}
      </span>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
        <span className="text-xs sm:text-sm font-bold text-orange-950 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {["ya", "tidak"].map((v) => {
            const isSelected = currentValue === v;
            return (
              <button
                type="button"
                key={v}
                onClick={() => onToggleGroup(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? v === "ya"
                      ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500"
                      : "bg-rose-600 text-white shadow-sm ring-1 ring-rose-500"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300"
                }`}
              >
                {v === "ya" ? "YA" : "TIDAK"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const emptyWork = (): WorkDetail => ({ detail: "", mulai: "", selesai: "" });

const defaultForm = (): FormData => ({
  tipePerusahaan: "internal",
  namaKontraktor: "",
  namaPekerjaNIK: "",
  lokasi: "",
  tanggalPelaksanaan: "",
  waktuPukul: "",
  waktuSelesai: "",
  namaFireWatch: "",
  nikFireWatch: "",
  jenisPekerjaan: {
    preventive: false,
    tangki: false,
    panel: false,
    cutting: emptyWork(),
    grinding: emptyWork(),
    welding: emptyWork(),
    painting: emptyWork(),
    lainnya: false,
    lainnyaKeterangan: "",
  },
  areaBerisiko: {
    ruangTertutup: false,
    bahanMudah: false,
    gas: false,
    ketinggian: false,
    cairan: false,
    hydrocarbon: false,
    lain: "",
  },
  pencegahan: {
    equipment: "tidak",
    apar: "tidak",
    sensor: "tidak",
    apd: "tidak",
    lantaiBasah: "tidak",
    cairan_diproteksi: "tidak",
    lindungi_conveyor: "tidak",
    ruangTertutupBerlaku: "tidak",
    ruang_tertutup_dibersihkan: "tidak",
    uap_dibuang: "tidak",
    dindingBerlaku: "tidak",
    dinding_konstruksi: "tidak",
    bahan_dipindahkan: "tidak",
    firewatch_ada: "tidak",
    firewatch_pelatihan: "tidak",
    fireblank: "tidak_layak",
    fireblank_jumlah: "",
    permintaan_tambahan: "",
  },
  persetujuan: { spvNama: "", kontraktorNama: "", sfoNama: "", pgaNama: "" },
});

const getApproverLabels = (isInternal: boolean) =>
  isInternal
    ? ["SPV / Pemberi Izin", "Admin K3", "SFO", "SMR / PGA SMGR"]
    : ["Kontraktor", "SPV / Pemberi Izin", "Admin K3", "SFO", "SMR / PGA SMGR"];

function calculateDuration(start: string, end: string): string | null {
  if (!start || !end) return null;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;

  let totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
  if (totalMinutes <= 0) return null;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hours} Jam`;
  return `${hours} Jam ${mins} Menit`;
}

function HotWorkPermitFormInner() {
  const [formData, setFormData] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState({
    bagian1: true,
    bagian2: true,
    bagian3: true,
    bagian4: true,
  });
  const [user, setUser] = useState<any>(null);
  const [workerOptions, setWorkerOptions] = useState<WorkerOption[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [spvOptions, setSpvOptions] = useState<
    Array<{ id: number; nama: string; nik: string | null; jabatan: string | null; departmen: string | null }>
  >([]);
  const [spvPemberiIzin, setSpvPemberiIzin] = useState<{ nama: string; nik: string; jabatan: string }>({
    nama: "",
    nik: "",
    jabatan: "",
  });
  const [validationError, setValidationError] = useState<string>("");
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // ── JSA state ──────────────────────────────────────────────
  const [perluJsa, setPerluJsa] = useState(false);
  const [jsaFile, setJsaFile] = useState<JsaFileInfo | null>(null);
  const [jsaUploadStatus, setJsaUploadStatus] = useState<JsaStatus>("idle");
  const [jsaUploadError, setJsaUploadError] = useState("");
  const [jsaData, setJsaData] = useState<JsaData>(createEmptyJsa());
  const [jsaMode, setJsaMode] = useState<JsaMode>("upload");

  const searchParams = useSearchParams();
  const idIjinKerja = searchParams.get("id_ijin_kerja");

  // ── Auto-save Draft ke LocalStorage ─────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("draft_hot_work");
      if (saved && !hasRestoredDraft) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setFormData((prev) => ({ ...prev, ...parsed }));
          setHasRestoredDraft(true);
        }
      }
    } catch {
      // Abaikan jika parse gagal
    }
  }, [hasRestoredDraft]);

  const saveLocalDraft = (data: FormData) => {
    try {
      localStorage.setItem("draft_hot_work", JSON.stringify(data));
    } catch {
      // Abaikan jika storage penuh/disabled
    }
  };

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

  const toggle = (s: string) => setExpanded((prev) => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));
  const setJ = (patch: any) => {
    setFormData((prev) => {
      const next = { ...prev, jenisPekerjaan: { ...prev.jenisPekerjaan, ...patch } };
      saveLocalDraft(next);
      return next;
    });
  };
  const setA = (patch: any) => {
    setFormData((prev) => {
      const next = { ...prev, areaBerisiko: { ...prev.areaBerisiko, ...patch } };
      saveLocalDraft(next);
      return next;
    });
  };
  const setP = (patch: any) => {
    setFormData((prev) => {
      const next = { ...prev, pencegahan: { ...prev.pencegahan, ...patch } };
      saveLocalDraft(next);
      return next;
    });
  };
  const setWork = (key: "cutting" | "grinding" | "welding" | "painting", field: keyof WorkDetail, val: string) =>
    setJ({ [key]: { ...formData.jenisPekerjaan[key], [field]: val } });

  const setRuangTertutupBerlaku = (v: string) =>
    setP(
      v === "tidak"
        ? { ruangTertutupBerlaku: v, ruang_tertutup_dibersihkan: "tidak", uap_dibuang: "tidak" }
        : { ruangTertutupBerlaku: v }
    );
  const setDindingBerlaku = (v: string) =>
    setP(
      v === "tidak"
        ? { dindingBerlaku: v, dinding_konstruksi: "tidak", bahan_dipindahkan: "tidak" }
        : { dindingBerlaku: v }
    );

  const isInternal = formData.tipePerusahaan === "internal";
  const approverLabels = getApproverLabels(isInternal);
  const inputCls =
    "w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all";

  const totalDuration = useMemo(
    () => calculateDuration(formData.waktuPukul, formData.waktuSelesai),
    [formData.waktuPukul, formData.waktuSelesai]
  );

  const submit = async (isSubmit: boolean) => {
    setValidationError("");
    if (!formData.namaPekerjaNIK.trim()) {
      setValidationError("Nama Pekerja / NIK wajib diisi");
      return;
    }
    if (!formData.namaFireWatch || !formData.nikFireWatch) {
      setValidationError("Fire Watch wajib dipilih dan diisi");
      return;
    }
    if (!spvPemberiIzin.nama || !spvPemberiIzin.nik) {
      setValidationError("SPV / Pemberi Izin wajib dipilih");
      return;
    }

    if (
      (idIjinKerja || jsaMode === "build") &&
      perluJsa &&
      (!jsaData.area.trim() ||
        !jsaData.jenisPekerjaan.trim() ||
        !jsaData.pic.trim() ||
        !jsaData.petugas.some((name) => name.trim()))
    ) {
      setValidationError("Area, Jenis Pekerjaan, PIC, dan minimal satu Petugas pada JSA wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
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

      // Hapus draft lokal setelah berhasil submit
      if (isSubmit) {
        localStorage.removeItem("draft_hot_work");
      }

      return data;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    try {
      const r = await submit(false);
      alert(`Draft berhasil disimpan! ID Form: ${r.id_form}`);
    } catch (e: any) {
      alert("Gagal menyimpan draft: " + e.message);
    }
  };

  const handleSubmit = async () => {
    if (validationError) {
      alert(validationError);
      return;
    }
    try {
      const r = await submit(true);
      if (!r) return;
      alert(`Izin Kerja Panas berhasil diajukan! ID: ${r.id_form}`);
      window.location.href = "/form-permit/my-forms";
    } catch (e: any) {
      alert("Gagal mengajukan izin: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/my-forms"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              title="Kembali ke Riwayat"
            >
              <Home className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  Formulir K3
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">&bull; PT JAI</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Hot Work Permit (Izin Kerja Panas)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Estimasi: ±5 Menit</span>
            </div>
            <Link
              href="/my-forms"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/80 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors"
            >
              Lihat Riwayat &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Banner Pemulihan Draft */}
        {hasRestoredDraft && (
          <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-3.5 sm:p-4 mb-6 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Memuat draft isian terakhir yang tersimpan di perangkat ini.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("draft_hot_work");
                setFormData(defaultForm());
                setHasRestoredDraft(false);
              }}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 underline shrink-0 cursor-pointer"
            >
              Reset Formulir
            </button>
          </div>
        )}

        {/* Banner Relasi Ijin Kerja Eksternal */}
        {idIjinKerja && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-xs">
            <Lock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                Terhubung ke Ijin Kerja Eksternal
              </h4>
              <p className="text-xs sm:text-sm text-purple-800 mt-0.5">
                Form Hot Work ini otomatis tertaut ke form induk{" "}
                <strong className="font-mono bg-purple-100 px-1.5 py-0.5 rounded">{idIjinKerja}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Alert Error Validasi */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-red-900 uppercase tracking-wide">Perhatian Diperlukan</h5>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">{validationError}</p>
            </div>
          </div>
        )}

        {/* ── BAGIAN 1: INFORMASI REGISTRASI ── */}
        <Section
          stepNumber="1"
          title="Informasi Registrasi & Identitas Pekerjaan"
          section="bagian1"
          description="Data kontraktor, pekerja, lokasi, dan jadwal pelaksanaan kerja panas"
          badge="Wajib Diisi"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="space-y-6">
            {/* Tipe Pekerja */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                Tipe Pelaksana Pekerjaan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    value: "internal",
                    label: "Internal / Karyawan PT.JAI",
                    desc: "Alur: SPV → Admin K3 → SFO → SMR",
                  },
                  {
                    value: "eksternal",
                    label: "Eksternal / Subkontraktor",
                    desc: "Alur: Kontraktor → SPV → Admin K3 → SFO → SMR",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col gap-1 p-3.5 rounded-xl border-2 transition-all ${
                      opt.value === "eksternal" ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      formData.tipePerusahaan === opt.value
                        ? "border-orange-500 bg-orange-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="tipePerusahaan"
                        value={opt.value}
                        checked={formData.tipePerusahaan === opt.value}
                        onChange={() =>
                          setFormData((p) => {
                            const next = { ...p, tipePerusahaan: opt.value as any, namaPekerjaNIK: "" };
                            saveLocalDraft(next);
                            return next;
                          })
                        }
                        disabled={opt.value === "eksternal" || !!idIjinKerja}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-900">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 ml-6">{opt.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Nama Kontraktor (Jika eksternal) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                Nama Kontraktor{" "}
                {isInternal ? (
                  <span className="text-slate-400 font-normal text-xs">(tidak diperlukan untuk Internal)</span>
                ) : (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="text"
                value={isInternal ? "" : formData.namaKontraktor}
                onChange={(e) =>
                  setFormData((p) => {
                    const next = { ...p, namaKontraktor: e.target.value };
                    saveLocalDraft(next);
                    return next;
                  })
                }
                disabled={isInternal}
                required={!isInternal}
                placeholder={isInternal ? "Tidak diperlukan untuk Karyawan Internal PT.JAI" : "Contoh: PT Sumber Berkah Mandiri"}
                className={`${inputCls} ${isInternal ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
              />
            </div>

            {/* Pekerja & NIK */}
            {isInternal ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Nama Pekerja (Master Lisence) <span className="text-red-500">*</span>
                  </label>
                  {loadingWorkers ? (
                    <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs sm:text-sm flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                      <span>Memuat pekerja dari Master Lisence...</span>
                    </div>
                  ) : workerOptions.length > 0 ? (
                    <select
                      value={formData.namaPekerjaNIK}
                      onChange={(e) => {
                        const selected = workerOptions.find((w) => `${w.nama} / ${w.nik}` === e.target.value);
                        setFormData((p) => {
                          const next = {
                            ...p,
                            namaPekerjaNIK: selected ? `${selected.nama} / ${selected.nik}` : e.target.value,
                          };
                          saveLocalDraft(next);
                          return next;
                        });
                        setValidationError("");
                      }}
                      required
                      className={inputCls}
                    >
                      <option value="">-- Pilih Pekerja Berlisensi --</option>
                      {workerOptions.map((w) => {
                        const isExpired = w.tanggal_exp
                          ? new Date(w.tanggal_exp).getTime() < new Date().setHours(0, 0, 0, 0)
                          : false;
                        return (
                          <option key={`${w.nama}-${w.nik}`} value={`${w.nama} / ${w.nik}`}>
                            {`${w.nama} / ${w.nik}`}
                            {w.departemen ? ` (${w.departemen})` : ""}
                            {isExpired ? " [Lisensi Kadaluarsa]" : ""}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={formData.namaPekerjaNIK}
                        onChange={(e) =>
                          setFormData((p) => {
                            const next = { ...p, namaPekerjaNIK: e.target.value };
                            saveLocalDraft(next);
                            return next;
                          })
                        }
                        className={inputCls}
                        placeholder="Ketik manual Nama Lengkap / NIK"
                        required
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        Belum ada pekerja Hot Work di Master Lisence. Anda dapat mengetik manual.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">NIK Pekerja</label>
                  <input
                    type="text"
                    value={
                      formData.namaPekerjaNIK.includes(" / ")
                        ? formData.namaPekerjaNIK.split(" / ")[1].trim()
                        : formData.namaPekerjaNIK || ""
                    }
                    readOnly
                    placeholder="Terisi otomatis dari pilihan pekerja"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Nama Pekerja & NIK <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.namaPekerjaNIK}
                  onChange={(e) =>
                    setFormData((p) => {
                      const next = { ...p, namaPekerjaNIK: e.target.value };
                      saveLocalDraft(next);
                      return next;
                    })
                  }
                  className={inputCls}
                  placeholder="Contoh: Budi Santoso / 102938"
                  required
                />
              </div>
            )}

            {/* Lokasi & Tanggal Pelaksanaan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Lokasi Pekerjaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lokasi}
                  onChange={(e) =>
                    setFormData((p) => {
                      const next = { ...p, lokasi: e.target.value };
                      saveLocalDraft(next);
                      return next;
                    })
                  }
                  placeholder="Contoh: Gedung A Lantai 2 / Area Workshop"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Tanggal Pelaksanaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tanggalPelaksanaan}
                  onChange={(e) =>
                    setFormData((p) => {
                      const next = { ...p, tanggalPelaksanaan: e.target.value };
                      saveLocalDraft(next);
                      return next;
                    })
                  }
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* Jam Kerja & Kalkulator Durasi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  Jadwal Waktu Kerja (Format 24 Jam)
                </label>
                {totalDuration && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Durasi: {totalDuration}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Waktu Mulai (HH:mm)</label>
                  <TimeInput24
                    value={formData.waktuPukul}
                    onChange={(val) =>
                      setFormData((p) => {
                        const next = { ...p, waktuPukul: val };
                        saveLocalDraft(next);
                        return next;
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Waktu Selesai (HH:mm)</label>
                  <TimeInput24
                    value={formData.waktuSelesai}
                    onChange={(val) =>
                      setFormData((p) => {
                        const next = { ...p, waktuSelesai: val };
                        saveLocalDraft(next);
                        return next;
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Fire Watch Card */}
            <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <h4 className="font-bold text-blue-950 text-sm">Fire Watch (Pengawas Api Siaga)</h4>
              </div>
              <p className="text-xs text-blue-700/80 mb-4">
                Wajib menunjuk petugas Fire Watch yang siaga selama pekerjaan panas berlangsung serta minimal 60 menit pasca pekerjaan.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Petugas Fire Watch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.namaFireWatch}
                    onChange={(e) =>
                      setFormData((p) => {
                        const next = { ...p, namaFireWatch: e.target.value };
                        saveLocalDraft(next);
                        return next;
                      })
                    }
                    placeholder="Nama lengkap petugas fire watch"
                    className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIK Petugas Fire Watch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nikFireWatch}
                    onChange={(e) =>
                      setFormData((p) => {
                        const next = { ...p, nikFireWatch: e.target.value };
                        saveLocalDraft(next);
                        return next;
                      })
                    }
                    placeholder="Nomor Induk Karyawan (NIK)"
                    className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pemberi Izin (SPV Terkait) */}
            <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                <h4 className="font-bold text-emerald-950 text-sm">Pemberi Izin / Supervisor Departemen</h4>
              </div>
              <p className="text-xs text-emerald-800/80 mb-4">
                Pilih Supervisor (SPV) dari departemen Anda yang bertindak sebagai approver tahap pertama.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Nama SPV <span className="text-red-500">*</span>
                  </label>
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
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">-- Pilih SPV Terkait --</option>
                    {spvOptions.map((spv) => (
                      <option key={spv.id} value={spv.nama}>
                        {spv.nama} {spv.departmen ? `(${spv.departmen})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIK SPV</label>
                  <input
                    type="text"
                    value={spvPemberiIzin.nik}
                    readOnly
                    placeholder="Otomatis terisi"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO ── */}
        <Section
          stepNumber="2"
          title="Jenis Pekerjaan & Area Berisiko Tinggi"
          section="bagian2"
          description="Rincian aplikasi pekerjaan panas (welding, cutting, grinding) serta potensi bahaya lingkungan"
          badge="K3 Risk Matrix"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="space-y-8">
            {/* A. Pilihan Jenis Pekerjaan */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span>A. Lokasi Khusus / Equipment Kerja</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "preventive", label: "Preventive Genset / Pump Room" },
                  { key: "tangki", label: "Tangki Penyimpanan Solar" },
                  { key: "panel", label: "Area Panel Kelistrikan" },
                ].map((item) => (
                  <CheckItem
                    key={item.key}
                    label={item.label}
                    checked={(formData.jenisPekerjaan as any)[item.key]}
                    onChange={() => setJ({ [item.key]: !(formData.jenisPekerjaan as any)[item.key] })}
                  />
                ))}
              </div>
            </div>

            {/* B. Detail Pekerjaan Panas (Cutting, Grinding, Welding, Painting) */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span>B. Rincian Pekerjaan Panas & Jam Operasional</span>
              </h4>
              <div className="space-y-4">
                {(["cutting", "grinding", "welding", "painting"] as const).map((key) => {
                  const item = formData.jenisPekerjaan[key];
                  const labels: Record<string, string> = {
                    cutting: "Pemotongan (Cutting)",
                    grinding: "Gerinda (Grinding)",
                    welding: "Pengelasan (Welding)",
                    painting: "Pengecatan / Spray (Painting)",
                  };
                  const subDuration = calculateDuration(item.mulai, item.selesai);

                  return (
                    <div
                      key={key}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:bg-orange-50/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-100 px-2.5 py-0.5 rounded-md">
                          {labels[key]}
                        </span>
                        {subDuration && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {subDuration}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Rincian Pekerjaan {labels[key]}
                          </label>
                          <input
                            type="text"
                            value={item.detail}
                            onChange={(e) => setWork(key, "detail", e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Deskripsi pengerjaan..."
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Mulai</label>
                          <TimeInput24 value={item.mulai} onChange={(val) => setWork(key, "mulai", val)} />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Selesai</label>
                          <TimeInput24 value={item.selesai} onChange={(val) => setWork(key, "selesai", val)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* C. Pekerjaan Lainnya */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span>C. Pekerjaan Aplikasi Panas Lainnya</span>
              </h4>
              <CheckItem
                label="Ada pekerjaan lain yang menghasilkan nyala api terbuka atau panas tinggi"
                checked={formData.jenisPekerjaan.lainnya}
                onChange={() => setJ({ lainnya: !formData.jenisPekerjaan.lainnya })}
              />
              {formData.jenisPekerjaan.lainnya && (
                <div className="mt-3">
                  <textarea
                    rows={2}
                    value={formData.jenisPekerjaan.lainnyaKeterangan}
                    onChange={(e) => setJ({ lainnyaKeterangan: e.target.value })}
                    className={inputCls}
                    placeholder="Sebutkan rincian pekerjaan panas lainnya..."
                  />
                </div>
              )}
            </div>

            {/* D. Area Berisiko Tinggi */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Area / Equipment Berisiko Tinggi</span>
              </h4>
              <div className="bg-red-50/60 border border-red-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <p className="text-xs text-red-800 font-medium">
                  Tandai seluruh potensi bahaya yang ada di sekitar radius kerja panas (11 meter):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: "ruangTertutup", label: "Ruang tertutup (Confined space) / area pembuangan" },
                    { key: "bahanMudah", label: "Bahan / material mudah terbakar (kertas, kayu, kain)" },
                    { key: "gas", label: "Gas mudah terbakar (bejana tekan / tangki)" },
                    { key: "ketinggian", label: "Bekerja di ketinggian (> 1.8 meter)" },
                    { key: "cairan", label: "Cairan atau gas bertekanan tinggi" },
                    { key: "hydrocarbon", label: "Cairan hidrokarbon / oli / pelarut organik" },
                  ].map((item) => (
                    <CheckItem
                      key={item.key}
                      label={item.label}
                      checked={(formData.areaBerisiko as any)[item.key]}
                      onChange={() => setA({ [item.key]: !(formData.areaBerisiko as any)[item.key] })}
                    />
                  ))}
                </div>
                <div className="pt-3 border-t border-red-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Potensi bahaya lingkungan lainnya (jika ada):
                  </label>
                  <input
                    type="text"
                    value={formData.areaBerisiko.lain}
                    onChange={(e) => setA({ lain: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-red-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Tuliskan bahaya lain..."
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 3: HAL PENCEGAHAN ── */}
        <Section
          stepNumber="3"
          title="Langkah Pengendalian & Upaya Pencegahan Kebakaran"
          section="bagian3"
          description="Checklist keselamatan K3 wajib diverifikasi sebelum pekerjaan dimulai"
          badge="Safety Controls"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs mb-6">
            <div className="grid grid-cols-[3.5rem_1fr] bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600">
              <span className="px-3 py-3 text-center border-r border-slate-200">NO.</span>
              <span className="px-4 py-3">ITEM KONTROL KESELAMATAN (CHECKLIST K3)</span>
            </div>

            <ChecklistRow
              no="1"
              label="Equipment / Peralatan dan kabel dalam kondisi baik dan aman"
              fieldKey="equipment"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
            <ChecklistRow
              no="2"
              label="Alat pemadam api ringan (APAR / Hydrant) tersedia dan siap digunakan di lokasi"
              fieldKey="apar"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
            <ChecklistRow
              no="3"
              label="Sensor Smoke Detector telah dinonaktifkan sementara (jika berpotensi memicu alarm palsu)"
              fieldKey="sensor"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
            <ChecklistRow
              no="4"
              label="Alat Pelindung Diri (APD) lengkap dan wajib digunakan seluruh pekerja"
              fieldKey="apd"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
            <ChecklistRow
              no="5"
              label="Lantai dari bahan mudah terbakar dibasahi, ditutupi pasir basah, atau perisai metal tahan api"
              fieldKey="lantaiBasah"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
            <ChecklistRow
              no="6"
              label="Cairan mudah terbakar/menyala diproteksi dengan penutup atau perisai metal"
              fieldKey="cairan_diproteksi"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
            <ChecklistRow
              no="7"
              label="Lindungi conveyor, instalasi kabel, dan equipment penghantar listrik dengan perisai tahan api"
              fieldKey="lindungi_conveyor"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />

            {/* Kelompok 8: Ruangan Tertutup */}
            <ChecklistGroupHeader
              no="8"
              label="Pekerjaan Pada Ruangan Tertutup (Confined Space)"
              groupField="ruangTertutupBerlaku"
              pencegahan={formData.pencegahan}
              onToggleGroup={setRuangTertutupBerlaku}
            />
            <ChecklistRow
              no="8.1"
              indent
              label="Peralatan dibersihkan dari seluruh residu bahan mudah terbakar"
              fieldKey="ruang_tertutup_dibersihkan"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
              disabled={formData.pencegahan.ruangTertutupBerlaku !== "ya"}
            />
            <ChecklistRow
              no="8.2"
              indent
              label="Uap menyala di ruangan tertutup dibuang (ventilasi/exhaust) dari ruangan"
              fieldKey="uap_dibuang"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
              disabled={formData.pencegahan.ruangTertutupBerlaku !== "ya"}
            />

            {/* Kelompok 9: Dinding / Langit-langit */}
            <ChecklistGroupHeader
              no="9"
              label="Pekerjaan Pada Dinding Atau Langit-Langit"
              groupField="dindingBerlaku"
              pencegahan={formData.pencegahan}
              onToggleGroup={setDindingBerlaku}
            />
            <ChecklistRow
              no="9.1"
              indent
              label="Konstruksi dinding/langit-langit tidak mudah terbakar dan tanpa penutup yang mudah terbakar"
              fieldKey="dinding_konstruksi"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
              disabled={formData.pencegahan.dindingBerlaku !== "ya"}
            />
            <ChecklistRow
              no="9.2"
              indent
              label="Bahan mudah terbakar dipindahkan dari sisi dinding yang berseberangan"
              fieldKey="bahan_dipindahkan"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
              disabled={formData.pencegahan.dindingBerlaku !== "ya"}
            />

            <ChecklistRow
              no="10"
              label="Fire Watch bersiaga memastikan area aman selama proses dan 60 menit setelahnya"
              fieldKey="firewatch_ada"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
            <ChecklistRow
              no="11"
              label="Fire Watch telah mendapatkan pelatihan dan mampu mengoperasikan APAR serta fire alarm"
              fieldKey="firewatch_pelatihan"
              pencegahan={formData.pencegahan}
              setPencegahan={setP}
            />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                Jumlah Fire Blanket yang Digunakan (Unit)
              </label>
              <input
                type="number"
                min={0}
                value={formData.pencegahan.fireblank_jumlah}
                onChange={(e) => setP({ fireblank_jumlah: e.target.value })}
                className={inputCls}
                placeholder="Contoh: 2"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                Permintaan Tambahan Tindakan Pengamanan
              </label>
              <input
                type="text"
                value={formData.pencegahan.permintaan_tambahan}
                onChange={(e) => setP({ permintaan_tambahan: e.target.value })}
                className={inputCls}
                placeholder="Instruksi tambahan jika ada..."
              />
            </div>
          </div>
        </Section>

        {/* ── BAGIAN 4: PERSETUJUAN / APPROVER ── */}
        <Section
          stepNumber="4"
          title="Alur Otorisasi & Persetujuan Bertingkat"
          section="bagian4"
          description="Tahapan verifikasi tanda tangan digital otomatis"
          badge="Multi-stage Sign"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Alur Otorisasi Berjenjang Terprogram:
                </h4>
                <p className="text-xs sm:text-sm font-bold text-blue-900 mt-1">
                  {isInternal
                    ? "SPV Departemen → Admin K3 → Safety Officer (SFO) → SMR / PGA SMGR"
                    : "Kontraktor → SPV Terkait → Admin K3 → Safety Officer (SFO) → SMR / PGA SMGR"}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Kolom tanda tangan dan status verifikasi akan terisi otomatis saat masing-masing pihak memberikan approval secara digital.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {approverLabels.map((label, idx) => (
              <div key={label} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">TAHAP {idx + 1}</span>
                <p className="text-xs font-bold text-slate-800 mb-2 truncate">{label}</p>
                <div className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-400 text-xs italic text-center">
                  Menunggu Submit
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── BAGIAN 5: UPLOAD JSA ── */}
        {idIjinKerja ? (
          <LinkedJsaSection
            idIjinKerja={idIjinKerja}
            enabled={perluJsa}
            setEnabled={setPerluJsa}
            value={jsaData}
            setValue={setJsaData}
          />
        ) : (
          <JsaMethodSection
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
            sectionTitle="BAGIAN 5: JOB SAFETY ANALYSIS (JSA)"
            sectionStyle="hot-work"
          />
        )}
      </div>

      {/* ── STICKY FLOATING ACTION BAR DI BAWAH ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-600 hidden sm:flex">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Formulir siap diajukan setelah data lengkap & diverifikasi.</span>
          </div>

          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || jsaUploadStatus === "uploading"}
              className="flex-1 sm:flex-initial px-5 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>{submitting ? "Menyimpan..." : "Simpan Draft"}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || jsaUploadStatus === "uploading"}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-600/25 transition-all duration-200 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? "Memproses..."
                  : jsaUploadStatus === "uploading"
                  ? "Upload JSA..."
                  : "Ajukan Izin Kerja"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HotWorkPermitForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
          Memuat formulir izin kerja panas...
        </div>
      }
    >
      <HotWorkPermitFormInner />
    </Suspense>
  );
}