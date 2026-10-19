// app/form/height-work/page.tsx

"use client";
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, Shield, ChevronRight, AlertCircle,
  CheckCircle, Loader2, Camera, Upload, X, ZoomIn, ImageIcon, Lock,
  Eye, CalendarClock, Clock, Check, Save, Send, ChevronDown, ChevronUp,
  HardHat, ShieldAlert, Sparkles, Building2, UserCheck, Home, Info
} from "lucide-react";
import JsaMethodSection, { type JsaMode } from "@/components/JsaMethodSection";
import { type JsaFileInfo, type JsaUploadStatus as JsaStatus } from "@/components/JsaUploadSection";
import LinkedJsaSection from "@/components/LinkedJsaSection";
import { createEmptyJsa } from "@/components/JsaBuilderSection";
import type { JsaData } from "@/components/JsaBuilderSection";
import TimeInput24, { normalizeTo24h } from "@/components/Time24Input";

type UploadStatus = "idle" | "uploading" | "success" | "error";
type MasterFileType = "pdf" | "image";

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

function ImagePreviewModal({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className="font-semibold text-slate-800 text-sm truncate pr-4">{label}</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="w-full max-h-[65vh] object-contain rounded-xl bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

interface LisensiButtonProps {
  namaPetugas: string;
  index: number;
  fotoUrl: string | null;
  uploadStatus: UploadStatus;
  uploadError: string;
  onUploaded: (url: string, status: UploadStatus, error: string) => void;
  onRemoved: () => void;
}

function LisensiUploadButton({ namaPetugas, index, fotoUrl, uploadStatus, uploadError, onUploaded, onRemoved }: LisensiButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const doUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      const r = new FileReader();
      r.onloadend = () => onUploaded(r.result as string, "error", "Ukuran file maks 5 MB");
      r.readAsDataURL(file);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onUploaded("", "error", "Hanya JPG, PNG, atau WebP");
      return;
    }
    const r = new FileReader();
    r.onloadend = () => onUploaded(r.result as string, "uploading", "");
    r.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("index", String(index));
      const res = await fetch("/api/upload/lisensi", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Upload gagal");
      }
      const { url } = await res.json();
      onUploaded(url, "success", "");
    } catch (err: any) {
      onUploaded("", "error", err.message || "Upload gagal, coba lagi");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) doUpload(f);
    setShowOptions(false);
    e.target.value = "";
  };

  if (fotoUrl) {
    return (
      <>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-orange-200 hover:border-orange-500 shadow-xs transition-all group"
            title="Lihat foto lisensi"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoUrl} alt="Lisensi" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          {uploadStatus === "uploading" && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
          {uploadStatus === "success" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
          {uploadStatus === "error" && <div title={uploadError}><AlertCircle className="w-4 h-4 text-rose-500" /></div>}
          <button
            type="button"
            onClick={onRemoved}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
            title="Hapus foto lisensi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {showPreview && <ImagePreviewModal src={fotoUrl} label={`Lisensi — ${namaPetugas || `Petugas ${index}`}`} onClose={() => setShowPreview(false)} />}
      </>
    );
  }

  return (
    <div className="relative shrink-0">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
          uploadStatus === "error"
            ? "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
            : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-400 shadow-2xs"
        }`}
        title={uploadError || "Upload foto lisensi"}
      >
        {uploadStatus === "uploading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        <span>{uploadStatus === "error" ? "Coba lagi" : "Upload Lisensi"}</span>
      </button>
      {uploadStatus === "error" && uploadError && (
        <p className="absolute top-full mt-1.5 right-0 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 whitespace-nowrap z-20 shadow-md">
          {uploadError}
        </p>
      )}
      {showOptions && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowOptions(false)} />
          <div className="absolute right-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[170px] animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              type="button"
              onClick={() => { setShowOptions(false); camRef.current?.click(); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors text-left"
            >
              <Camera className="w-4 h-4 text-orange-500" /> Ambil Kamera
            </button>
            <div className="border-t border-slate-100" />
            <button
              type="button"
              onClick={() => { setShowOptions(false); fileRef.current?.click(); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors text-left"
            >
              <Upload className="w-4 h-4 text-blue-500" /> Pilih dari Galeri
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Master Lisence — pekerja internal ──
interface WorkerLisenceOption {
  nik: string;
  nama: string;
  departemen: string | null;
  file_url: string;
  file_type: MasterFileType;
  tanggal_exp: string;
}

function getExpStatus(tanggalExp: string): "expired" | "soon" | "active" {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(tanggalExp); exp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "active";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function MasterLisenceViewModal({ worker, onClose }: { worker: WorkerLisenceOption; onClose: () => void }) {
  const status = getExpStatus(worker.tanggal_exp);
  const statusMeta = {
    expired: { label: "Kadaluarsa", cls: "bg-red-100 text-red-700 border-red-200" },
    soon:    { label: "Segera Habis", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    active:  { label: "Aktif", cls: "bg-green-100 text-green-700 border-green-200" },
  }[status];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <p className="font-bold text-slate-800 text-sm">{worker.nama} <span className="text-slate-400 font-normal">({worker.nik})</span></p>
            <span className={`inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.cls}`}>
              <CalendarClock className="w-3.5 h-3.5" /> Exp: {formatDate(worker.tanggal_exp)} — {statusMeta.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
          {worker.file_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={worker.file_url} alt={`Lisensi ${worker.nama}`} className="max-w-full max-h-[60vh] object-contain rounded-xl bg-white shadow-sm" />
          ) : (
            <iframe src={worker.file_url} title={`Lisensi ${worker.nama}`} className="w-full h-[60vh] rounded-xl bg-white border border-slate-200" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Check Item Kotak Centang Modern ──────────────────────────────────
const CheckItem = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
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
    <span className="text-xs sm:text-sm select-none leading-snug">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only"
    />
  </label>
);

// ── Card Section Modern ──────────────────────────────────────────────
const Section = ({
  stepNumber,
  title,
  description,
  badge,
  children,
  id,
}: {
  stepNumber: string;
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  id?: string;
}) => (
  <div id={id} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden mb-6 shadow-xs hover:shadow-sm transition-shadow">
    <div className="w-full flex items-center justify-between bg-slate-50/80 px-5 sm:px-7 py-4 border-b border-slate-200 text-left">
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
    </div>
    <div className="p-5 sm:p-7">{children}</div>
  </div>
);

function HeightWorkFormPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idIjinKerja = searchParams.get("id_ijin_kerja");

  const [tipePerusahaan, setTipePerusahaan] = useState<"internal" | "eksternal">("internal");
  const [deskripsiPekerjaan, setDeskripsiPekerjaan] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [tanggalPelaksanaan, setTanggalPelaksanaan] = useState("");
  const [waktuMulai, setWaktuMulai] = useState("");
  const [waktuSelesai, setWaktuSelesai] = useState("");
  const [namaPengawasKontraktor, setNamaPengawasKontraktor] = useState("");
  const [namaPengawasDepartemen, setNamaPengawasDepartemen] = useState("");
  const [namaDepartemen, setNamaDepartemen] = useState("");
  const [spvOptions, setSpvOptions] = useState<Array<{ id: number; nama: string; nik: string | null; jabatan: string | null; departmen?: string | null }>>([]);
  const [spvPemberiIzin, setSpvPemberiIzin] = useState({ nama: "", nik: "", jabatan: "" });
  const [namaPetugas, setNamaPetugas] = useState<string[]>(Array(10).fill(""));
  const [berbadanSehat, setBerbadanSehat] = useState<boolean[]>(Array(10).fill(false));
  const [fotoLisensi, setFotoLisensi] = useState<(string | null)[]>(Array(10).fill(null));
  const [uploadStatus, setUploadStatus] = useState<UploadStatus[]>(Array(10).fill("idle" as UploadStatus));
  const [uploadError, setUploadError] = useState<string[]>(Array(10).fill(""));

  // ── State khusus dropdown Master Lisence (tipe Internal) ────────────────
  const [selectedNik, setSelectedNik] = useState<(string | null)[]>(Array(10).fill(null));
  const [workerOptions, setWorkerOptions] = useState<WorkerLisenceOption[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [previewWorker, setPreviewWorker] = useState<WorkerLisenceOption | null>(null);

  const [kunceePagar, setKunceePagar] = useState(false);
  const [rompiKetinggian, setRompiKetinggian] = useState(false);
  const [rompiAngka, setRompiAngka] = useState("");
  const [safetyHelmetCount, setSafetyHelmetCount] = useState("");
  const [fullBodyHarnessCount, setFullBodyHarnessCount] = useState("");
  const [areaKerjaAman, setAreaKerjaAman] = useState(false);
  const [kebakaranProcedure, setKebakaranProcedure] = useState(false);
  const [pekerjaanListrik, setPekerjaanListrik] = useState(false);
  const [prosedurLoto, setProsedurLoto] = useState(false);
  const [perisakArea, setPerisakArea] = useState(false);
  const [safetyLineLine, setSafetyLineLine] = useState(false);
  const [alatBantuKerja, setAlatBantuKerja] = useState(false);
  const [rompiSaatBekerja, setRompiSaatBekerja] = useState(false);
  const [bebanBeratTubuh, setBebanBeratTubuh] = useState(false);
  const [helmStandar, setHelmStandar] = useState(false);
  const [rambuSafetyWarning, setRambuSafetyWarning] = useState(false);

  // ── State Body Harness & Lanyard (disabled, diisi Admin K3) ─────────────
  const [bodyHarnessWebbing] = useState(false);
  const [bodyHarnessDRing] = useState(false);
  const [bodyHarnessAdjustment] = useState(false);
  const [lanyardAbsorber] = useState(false);
  const [lanyardSnapHook] = useState(false);
  const [lanyardRope] = useState(false);
  const [helmKondisiBaik] = useState(false);
  const [harnessLightbox, setHarnessLightbox] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successId, setSuccessId] = useState("");

  // ── JSA state ──────────────────────────────────────────────
  const [perluJsa, setPerluJsa] = useState(false);
  const [jsaFile, setJsaFile] = useState<JsaFileInfo | null>(null);
  const [jsaUploadStatus, setJsaUploadStatus] = useState<JsaStatus>("idle");
  const [jsaUploadError, setJsaUploadError] = useState("");
  const [jsaData, setJsaData] = useState<JsaData>(createEmptyJsa());
  const [jsaMode, setJsaMode] = useState<JsaMode>("upload");

  const [loadingParent, setLoadingParent] = useState(false);

  // ── Hubungkan & Isi Otomatis Data dari Ijin Kerja Eksternal
  useEffect(() => {
    if (!idIjinKerja) return;

    setTipePerusahaan("eksternal");

    // Cek dulu dari sessionStorage untuk prefill instan
    try {
      const sess = sessionStorage.getItem("last_ijin_kerja_eksternal");
      if (sess) {
        const p = JSON.parse(sess);
        if (p && (!p.id_form || p.id_form === idIjinKerja)) {
          if (p.deskripsiPekerjaan) setDeskripsiPekerjaan(p.deskripsiPekerjaan);
          if (p.lokasi) setLokasi(p.lokasi);
          if (p.tanggalPelaksanaan) setTanggalPelaksanaan(p.tanggalPelaksanaan.slice(0, 10));
          if (p.waktuMulai) setWaktuMulai(p.waktuMulai.slice(0, 5));
          if (p.waktuSelesai) setWaktuSelesai(p.waktuSelesai.slice(0, 5));
          if (p.namaKontraktor || p.namaPengawasPicSubkont) {
            setNamaPengawasKontraktor(p.namaKontraktor || p.namaPengawasPicSubkont || "");
          }
          if (p.spvPemberiIzin?.nama) {
            setSpvPemberiIzin({
              nama: p.spvPemberiIzin.nama,
              nik: p.spvPemberiIzin.nik || "",
              jabatan: p.spvPemberiIzin.jabatan || "Supervisor",
            });
          }
          if (p.perluJsa !== undefined) setPerluJsa(Boolean(p.perluJsa));
          if (p.jsaMode === "upload" || p.jsaFileUrl || p.jsaFile?.url) {
            setJsaMode("upload");
            const u = p.jsaFileUrl || p.jsaFile?.url;
            setJsaFile(p.jsaFile || { url: u, name: "Dokumen_JSA", size: 0 });
          } else if (p.jsaData) {
            setJsaMode("build");
            setJsaData(p.jsaData);
          }
          setJsaData((prev) => ({
            ...prev,
            area: p.lokasi || prev.area,
            pic: p.namaPengawasPicSubkont || prev.pic,
            jenisPekerjaan: p.deskripsiPekerjaan ? `Kerja Ketinggian - ${p.deskripsiPekerjaan}` : prev.jenisPekerjaan,
          }));
        }
      }
    } catch {}

    // Fetch langsung dari API general-permit untuk data pasti dan akurat
    setLoadingParent(true);
    fetch(`/api/forms/general-permit/${idIjinKerja}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.data) return;
        const p = data.data;

        if (p.deskripsi_pekerjaan) setDeskripsiPekerjaan(p.deskripsi_pekerjaan);
        if (p.lokasi_pekerjaan) setLokasi(p.lokasi_pekerjaan);
        if (p.tgl_mulai_kerja) {
          const tgl = new Date(p.tgl_mulai_kerja).toISOString().split("T")[0];
          setTanggalPelaksanaan(tgl);
        }
        const wMulai = p.waktu_kerja ? p.waktu_kerja.slice(0, 5) : (p.izin_kerja_dari ? p.izin_kerja_dari.slice(0, 5) : "");
        const wSelesai = p.waktu_selesai ? p.waktu_selesai.slice(0, 5) : (p.izin_kerja_sampai ? p.izin_kerja_sampai.slice(0, 5) : "");
        if (wMulai) setWaktuMulai(wMulai);
        if (wSelesai) setWaktuSelesai(wSelesai);

        const pengawas = p.nama_kontraktor_pekerja || p.nama_pengawas_pic_subkont || "";
        if (pengawas) setNamaPengawasKontraktor(pengawas);

        const spvName = p.spv_terkait_pj || p.spvPemberiIzin?.nama || "";
        const spvNik = p.nik_spv_terkait_pj || p.spvPemberiIzin?.nik || "";
        if (spvName) {
          setSpvPemberiIzin({
            nama: spvName,
            nik: spvNik,
            jabatan: "Supervisor",
          });
          setSpvOptions((prev) => {
            if (prev.some((s) => s.nama === spvName)) return prev;
            return [{ id: 999999, nama: spvName, nik: spvNik, jabatan: "Supervisor", departmen: p.departemen_pengawas || null }, ...prev];
          });
        }

        if (p.perlu_jsa !== undefined) setPerluJsa(Boolean(p.perlu_jsa));
        const fileUrl = p.jsa_file_url || (p.jsa_data as any)?.fileUrl;
        if (fileUrl || (p.jsa_data as any)?.mode === "upload") {
          setJsaMode("upload");
          setJsaFile({ url: fileUrl, name: fileUrl ? fileUrl.split("/").pop() || "Dokumen_JSA" : "Dokumen_JSA", size: 0 });
        } else if (p.jsa_data) {
          setJsaMode("build");
          setJsaData(p.jsa_data);
        }

        setJsaData((prev) => ({
          ...prev,
          area: p.lokasi_pekerjaan || prev.area,
          pic: p.nama_pengawas_pic_subkont || prev.pic,
          jenisPekerjaan: p.deskripsi_pekerjaan ? `Kerja Ketinggian - ${p.deskripsi_pekerjaan}` : prev.jenisPekerjaan,
        }));
      })
      .catch((err) => console.error("Gagal memuat data parent permit:", err))
      .finally(() => setLoadingParent(false));
  }, [idIjinKerja]);

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        let userDept = "";
        try {
          const meRes = await fetch("/api/auth/me", { credentials: "include" });
          if (meRes.ok) {
            const meData = await meRes.json();
            userDept = meData.user?.departmen || "";
          }
        } catch {}

        const r = await fetch("/api/admin-users/approvers", { credentials: "include" });
        if (!r.ok) return;
        const d = await r.json();
        const allSpvs = (d.users ?? []).filter((user: { role: string; is_active?: boolean }) => user.role === "spv" && user.is_active !== false);

        // Opsi SPV HANYA dari departemen yang sama dengan user
        let filteredSpvs = allSpvs;
        if (userDept && userDept !== "Unknown") {
          const byDept = allSpvs.filter(
            (s: any) => s.departmen?.toLowerCase() === userDept.toLowerCase()
          );
          if (byDept.length > 0) filteredSpvs = byDept;
        }

        setSpvOptions((prev) => {
          if (spvPemberiIzin.nama && !filteredSpvs.some((s: any) => s.nama === spvPemberiIzin.nama)) {
            return [
              {
                id: 999999,
                nama: spvPemberiIzin.nama,
                nik: spvPemberiIzin.nik,
                jabatan: spvPemberiIzin.jabatan || "Supervisor",
                departmen: userDept || null,
              },
              ...filteredSpvs,
            ];
          }
          return filteredSpvs;
        });

        if (!idIjinKerja) {
          setSpvPemberiIzin((prev) => {
            if (prev.nama) return prev;
            const defaultSpv = filteredSpvs[0];
            if (!defaultSpv) return prev;
            return {
              nama: defaultSpv.nama ?? "",
              nik: (defaultSpv.nik && defaultSpv.nik.trim()) ? defaultSpv.nik.trim() : (defaultSpv.username ?? ""),
              jabatan: defaultSpv.jabatan ?? "Supervisor",
            };
          });
        }
      } catch {
        setSpvOptions([]);
      }
    };
    fetchApprovers();
  }, [idIjinKerja]);

  // Auto-isi Sect/Dept JSA dari Nama Departemen (Internal)
  useEffect(() => {
    if (tipePerusahaan === "internal" && namaDepartemen) {
      setJsaData((prev) => ({ ...prev, sectDept: namaDepartemen }));
    }
  }, [tipePerusahaan, namaDepartemen]);

  const resetPetugasRows = useCallback(() => {
    setNamaPetugas(Array(10).fill(""));
    setBerbadanSehat(Array(10).fill(false));
    setFotoLisensi(Array(10).fill(null));
    setUploadStatus(Array(10).fill("idle" as UploadStatus));
    setUploadError(Array(10).fill(""));
    setSelectedNik(Array(10).fill(null));
  }, []);

  const [departemenOptions, setDepartemenOptions] = useState<string[]>([]);
  const [loadingDept, setLoadingDept] = useState(true);

  useEffect(() => {
    fetch("/api/departemen?activeOnly=1", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setDepartemenOptions((d.data || []).map((x: any) => x.nama_departemen)))
      .catch(() => setDepartemenOptions([]))
      .finally(() => setLoadingDept(false));
  }, []);

  useEffect(() => {
    if (tipePerusahaan !== "internal" || !namaDepartemen) {
      setWorkerOptions([]);
      return;
    }
    setLoadingWorkers(true);
    fetch(
      `/api/master-lisence/workers?jenisKerja=height_work&departemen=${encodeURIComponent(namaDepartemen)}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWorkerOptions(d.data || []))
      .catch(() => setWorkerOptions([]))
      .finally(() => setLoadingWorkers(false));
  }, [tipePerusahaan, namaDepartemen]);

  const handleNamaChange = (i: number, val: string) => {
    setNamaPetugas((prev) => { const n = [...prev]; n[i] = val; return n; });
    if (!val.trim()) {
      setFotoLisensi((prev) => { const n = [...prev]; n[i] = null; return n; });
      setUploadStatus((prev) => { const n = [...prev]; n[i] = "idle"; return n; });
      setUploadError((prev) => { const n = [...prev]; n[i] = ""; return n; });
    }
  };

  const handleSehatChange = (i: number, val: boolean) => {
    setBerbadanSehat((prev) => { const n = [...prev]; n[i] = val; return n; });
  };

  const handleFotoUploaded = useCallback((i: number, url: string, status: UploadStatus, err: string) => {
    setFotoLisensi((prev) => { const n = [...prev]; n[i] = url || prev[i]; return n; });
    setUploadStatus((prev) => { const n = [...prev]; n[i] = status; return n; });
    setUploadError((prev) => { const n = [...prev]; n[i] = err; return n; });
  }, []);

  const handleFotoRemoved = useCallback((i: number) => {
    setFotoLisensi((prev) => { const n = [...prev]; n[i] = null; return n; });
    setUploadStatus((prev) => { const n = [...prev]; n[i] = "idle"; return n; });
    setUploadError((prev) => { const n = [...prev]; n[i] = ""; return n; });
  }, []);

  const handleWorkerSelect = (i: number, nik: string) => {
    if (!nik) {
      setNamaPetugas((prev) => { const n = [...prev]; n[i] = ""; return n; });
      setFotoLisensi((prev) => { const n = [...prev]; n[i] = null; return n; });
      setSelectedNik((prev) => { const n = [...prev]; n[i] = null; return n; });
      return;
    }
    const worker = workerOptions.find((w) => w.nik === nik);
    if (!worker) return;
    setNamaPetugas((prev) => { const n = [...prev]; n[i] = worker.nama; return n; });
    setFotoLisensi((prev) => { const n = [...prev]; n[i] = worker.file_url; return n; });
    setSelectedNik((prev) => { const n = [...prev]; n[i] = worker.nik; return n; });
  };

  const visibleCount = (() => {
    let c = 1;
    for (let i = 0; i < 9; i++) if (namaPetugas[i]?.trim()) c = i + 2;
    return Math.min(c, 10);
  })();

  const petugasAktif = namaPetugas.slice(0, visibleCount).map((n, i) => ({ nama: n, idx: i })).filter(({ nama }) => nama.trim());
  const lisensiMissing = petugasAktif.filter(({ idx }) => !fotoLisensi[idx]);
  const lisensiUploading = uploadStatus.some((s) => s === "uploading");

  const TIME_24H_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const isValidTime24 = (val: string) => val === "" || TIME_24H_PATTERN.test(val);
  const totalDuration = calculateDuration(waktuMulai, waktuSelesai);

  const buildBody = (isSubmit: boolean) => ({
    isSubmit,
    tipePerusahaan,
    spv_terkait: spvPemberiIzin.nama,
    spvPemberiIzin,
    deskripsiPekerjaan,
    lokasi,
    tanggalPelaksanaan,
    waktuMulai: normalizeTo24h(waktuMulai),
    waktuSelesai: normalizeTo24h(waktuSelesai),
    ...(tipePerusahaan === "eksternal" ? { namaPengawasKontraktor } : {}),
    ...(tipePerusahaan === "internal" ? { namaPengawasDepartemen, namaDepartemen } : {}),
    namaPetugas,
    berbadanSehat,
    fotoLisensi,
    kunceePagar,
    rompiKetinggian,
    rompiAngka,
    safetyHelmetCount: safetyHelmetCount !== "" ? safetyHelmetCount : null,
    fullBodyHarnessCount: fullBodyHarnessCount !== "" ? fullBodyHarnessCount : null,
    areaKerjaAman,
    kebakaranProcedure,
    pekerjaanListrik,
    prosedurLoto,
    perisakArea,
    safetyLineLine,
    alatBantuKerja,
    rompiSaatBekerja,
    bebanBeratTubuh,
    helmStandar,
    rambuSafetyWarning,
    bodyHarnessWebbing,
    bodyHarnessDRing,
    bodyHarnessAdjustment,
    lanyardAbsorber,
    lanyardSnapHook,
    lanyardRope,
    helmKondisiBaik,
    perluJsa,
    jsaFileUrl: jsaFile?.url ?? null,
    ...(jsaMode === "build" && !jsaFile?.url ? { jsaData } : {}),
    idIjinKerja,
  });

  const handleSaveDraft = async () => {
    if (!spvPemberiIzin.nama.trim()) {
      setError("SPV / Pemberi Izin wajib dipilih.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/forms/height-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(false))
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

    if (!spvPemberiIzin.nama.trim()) {
      setError("SPV / Pemberi Izin wajib dipilih.");
      return;
    }

    if (lisensiMissing.length > 0) {
      setError(`Foto lisensi wajib untuk: ${lisensiMissing.map(({ nama, idx }) => `Petugas ${idx + 1} (${nama})`).join(", ")}`);
      document.getElementById("bagian-petugas")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (lisensiUploading) {
      setError("Masih ada foto lisensi yang sedang diunggah, harap tunggu.");
      return;
    }

    if (!isValidTime24(waktuMulai) || !isValidTime24(waktuSelesai)) {
      setError("Format waktu tidak valid. Gunakan format 24 jam HH:mm (00:00 - 23:59).");
      return;
    }

    if (jsaMode === "build" && !jsaFile?.url && perluJsa && (!jsaData.area.trim() || !jsaData.jenisPekerjaan.trim() || !jsaData.pic.trim() || !jsaData.petugas.some((name) => name.trim()))) {
      setError("Area, Jenis Pekerjaan, PIC, dan minimal satu Petugas wajib diisi pada JSA");
      document.getElementById("bagian-jsa")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/forms/height-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(true))
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
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Berhasil Dikirim!</h2>
          <p className="text-slate-500 text-sm mb-4">
            Form izin kerja ketinggian Anda telah berhasil diajukan dan sedang menunggu persetujuan berjenjang.
          </p>
          <div className={`text-xs px-4 py-3 rounded-xl mb-5 text-left ${tipePerusahaan === "eksternal" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
            <p className="font-bold mb-1">Alur Approval ({tipePerusahaan === "eksternal" ? "Eksternal" : "Internal"}):</p>
            <p className="text-[11px] leading-relaxed opacity-90">{tipePerusahaan === "eksternal" ? "Kontraktor → SPV → Admin K3 → SFO → SMR / PGA SMGR" : "SPV → Admin K3 → SFO → SMR / PGA SMGR"}</p>
          </div>
          {successId && (
            <p className="text-xs text-slate-400 mb-6 bg-slate-50 py-2 rounded-lg border border-slate-100">
              ID Permohonan: <span className="font-mono font-bold text-slate-800">{successId}</span>
            </p>
          )}
          <div className="flex gap-3">
            <Link href="/my-forms" className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-orange-600/20 text-center">
              Lihat Riwayat
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors text-center cursor-pointer"
            >
              Kembali ke Formulir
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400 transition-all bg-white";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              title="Kembali ke Beranda"
            >
              <Home className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20 text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Form Izin Kerja Ketinggian</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <Link href="/home" className="hover:text-orange-600 transition-colors">Beranda</Link>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-orange-600 font-medium">Height Work</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-orange-700">
              <HardHat className="w-3.5 h-3.5" /> Height Work
            </span>
            <Link
              href="/my-forms"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/80 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors cursor-pointer"
            >
              Lihat Riwayat &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Banner relasi ke Ijin Kerja Eksternal */}
          {idIjinKerja && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <Lock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-purple-900 flex-1">
                <p className="font-bold flex items-center gap-2">
                  Terhubung dengan Ijin Kerja Eksternal
                  {loadingParent && <span className="text-[11px] font-normal text-purple-600 animate-pulse">(Memuat data...)</span>}
                </p>
                <p className="mt-0.5 text-purple-700">
                  Formulir ini dikaitkan dengan nomor izin <strong className="font-mono bg-purple-100 px-1.5 py-0.5 rounded">{idIjinKerja}</strong>.
                  Data kontraktor/pengawas, lokasi pekerjaan, deskripsi, tanggal pelaksanaan, jam kerja, dan SPV pemberi izin telah terisi otomatis.
                </p>
              </div>
            </div>
          )}

          {/* ── BAGIAN 1: INFORMASI PEKERJAAN ── */}
          <Section
            stepNumber="1"
            title="Informasi Pekerjaan Ketinggian"
            description="Detail pelaksanaan, lokasi, tipe pelaksana, dan penanggung jawab"
            badge="Wajib Diisi"
          >
            <div className="space-y-5">
              {/* Tipe Petugas */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                  Tipe Pelaksana Ketinggian <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: "internal", label: "Internal / Karyawan PT.JAI", desc: "Alur: SPV → Admin K3 → SFO → SMR" },
                    { value: "eksternal", label: "Eksternal / Subkontraktor", desc: "Alur: Kontraktor → SPV → Admin K3 → SFO → SMR" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-col gap-1.5 p-4 rounded-xl border-2 transition-all ${
                        opt.value === "eksternal" && !idIjinKerja ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                      } ${
                        tipePerusahaan === opt.value
                          ? "border-orange-500 bg-orange-50/60 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="tipePerusahaan"
                          value={opt.value}
                          checked={tipePerusahaan === opt.value}
                          disabled={opt.value === "eksternal" && !idIjinKerja}
                          onChange={() => {
                            const val = opt.value as "internal" | "eksternal";
                            setTipePerusahaan(val);
                            if (val === "internal") {
                              setNamaPengawasKontraktor("");
                            } else {
                              setNamaDepartemen("");
                              setNamaPengawasDepartemen("");
                            }
                            resetPetugasRows();
                          }}
                          className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-xs sm:text-sm font-bold text-slate-800">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 ml-6">{opt.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* SPV Pemberi Izin */}
              <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs sm:text-sm font-bold text-emerald-900">
                    Pemberi Izin (SPV Terkait) <span className="text-rose-500">*</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Nama SPV</label>
                    <select
                      value={spvPemberiIzin.nama}
                      onChange={(e) => {
                        const selected = spvOptions.find((spv) => spv.nama === e.target.value);
                        const nikVal = selected?.nik?.trim() || (selected as any)?.username || "";
                        setSpvPemberiIzin({
                          nama: selected?.nama ?? e.target.value,
                          nik: nikVal,
                          jabatan: selected?.jabatan ?? "Supervisor",
                        });
                        setError("");
                      }}
                      required
                      className={`${inputCls} ${!spvPemberiIzin.nama ? "border-amber-300 bg-amber-50/50" : ""}`}
                    >
                      <option value="">-- Pilih SPV --</option>
                      {spvOptions.map((spv) => (
                        <option key={spv.id} value={spv.nama}>
                          {spv.nama} {spv.departmen ? `(${spv.departmen})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIK SPV</label>
                    <input
                      type="text"
                      value={spvPemberiIzin.nik}
                      onChange={(e) => setSpvPemberiIzin((prev) => ({ ...prev, nik: e.target.value }))}
                      placeholder="Terisi otomatis / ketik manual"
                      className="w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Deskripsi Pekerjaan */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Deskripsi Pekerjaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={deskripsiPekerjaan}
                  onChange={(e) => setDeskripsiPekerjaan(e.target.value)}
                  placeholder="Jelaskan jenis pekerjaan yang akan dilakukan di ketinggian (cth: Perbaikan talang air atap gedung, instalasi kabel tray, dll)..."
                  rows={3}
                  required
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Lokasi & Tanggal Pelaksanaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Lokasi Pekerjaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    placeholder="Contoh: Gedung A Lantai 3 / Area Rack Pipe"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Tanggal Pelaksanaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tanggalPelaksanaan}
                    onChange={(e) => setTanggalPelaksanaan(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Waktu & Kalkulator Durasi */}
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
                    <TimeInput24 value={waktuMulai} onChange={setWaktuMulai} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Waktu Selesai (HH:mm)</label>
                    <TimeInput24 value={waktuSelesai} onChange={setWaktuSelesai} />
                  </div>
                </div>
              </div>

              {/* Nama Pengawas Kontraktor (Eksternal) */}
              {tipePerusahaan === "eksternal" && (
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Nama Pengawas Kontraktor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={namaPengawasKontraktor}
                    onChange={(e) => setNamaPengawasKontraktor(e.target.value)}
                    placeholder="Nama pengawas dari pihak kontraktor"
                    required
                    className={inputCls}
                  />
                </div>
              )}

              {/* Departemen & Pengawas Departemen (Internal) */}
              {tipePerusahaan === "internal" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Nama Departemen <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={namaDepartemen}
                      onChange={(e) => {
                        setNamaDepartemen(e.target.value);
                        setNamaPengawasDepartemen("");
                        resetPetugasRows();
                      }}
                      required
                      className={inputCls}
                    >
                      <option value="" disabled>— Pilih Departemen —</option>
                      {loadingDept ? (
                        <option value="" disabled>Memuat departemen…</option>
                      ) : (
                        departemenOptions.map((d) => (<option key={d} value={d}>{d}</option>))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Nama Pengawas Departemen <span className="text-rose-500">*</span>
                    </label>
                    {namaDepartemen ? (
                      <input
                        type="text"
                        value={namaPengawasDepartemen}
                        onChange={(e) => setNamaPengawasDepartemen(e.target.value)}
                        placeholder="Nama pengawas departemen"
                        required
                        className={inputCls}
                      />
                    ) : (
                      <div className={`${inputCls} text-slate-400 italic cursor-not-allowed bg-slate-50 flex items-center`}>
                        Pilih departemen terlebih dahulu
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── BAGIAN 2: PETUGAS & LISENSI ── */}
          <Section
            id="bagian-petugas"
            stepNumber="2"
            title="Nama Petugas Ketinggian & Status Kesehatan"
            description="Daftar pekerja yang bertugas, pernyataan kondisi fisik sehat, dan verifikasi sertifikat lisensi"
            badge="Maks. 10 Orang"
          >
            <div>
              {tipePerusahaan === "eksternal" ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-amber-800">
                      Setiap petugas yang didaftarkan <strong>wajib</strong> melampirkan foto lisensi ketinggian yang masih berlaku.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: visibleCount }).map((_, i) => {
                      const namaFilled = !!namaPetugas[i]?.trim();
                      const fotoMissing = namaFilled && !fotoLisensi[i];

                      return (
                        <div
                          key={i}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                            fotoMissing
                              ? "bg-amber-50/60 border-amber-300 shadow-xs"
                              : namaFilled
                              ? "bg-white border-slate-200 shadow-xs"
                              : "bg-slate-50/60 border-slate-200"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <input
                                type="text"
                                placeholder={`Nama Petugas ${i + 1}`}
                                value={namaPetugas[i]}
                                onChange={(e) => handleNamaChange(i, e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white placeholder-slate-400"
                              />
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0 shrink-0">
                              <label
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                  berbadanSehat[i]
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={berbadanSehat[i]}
                                  onChange={(e) => handleSehatChange(i, e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>Sehat</span>
                              </label>

                              {namaFilled && (
                                <LisensiUploadButton
                                  namaPetugas={namaPetugas[i]}
                                  index={i + 1}
                                  fotoUrl={fotoLisensi[i]}
                                  uploadStatus={uploadStatus[i]}
                                  uploadError={uploadError[i]}
                                  onUploaded={(url, status, err) => handleFotoUploaded(i, url, status, err)}
                                  onRemoved={() => handleFotoRemoved(i)}
                                />
                              )}
                            </div>
                          </div>
                          {fotoMissing && (
                            <p className="text-[11px] font-semibold text-amber-700 mt-2 pl-9">
                              ⚠️ Foto lisensi wajib diunggah untuk petugas ini.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {visibleCount < 10 && (
                    <p className="text-xs text-slate-400 text-center mt-3">
                      Ketik nama pada baris ke-{visibleCount} untuk menambah slot petugas berikutnya.
                    </p>
                  )}
                </>
              ) : (
                <>
                  {!namaDepartemen ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                      <HardHat className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Pilih Nama Departemen Terlebih Dahulu</p>
                      <p className="text-xs text-slate-500 mt-1">Daftar lisensi pekerja internal akan otomatis dimuat sesuai departemen yang Anda pilih di Bagian 1.</p>
                    </div>
                  ) : loadingWorkers ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
                      <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                      <span>Memuat lisensi pekerja internal dari database...</span>
                    </div>
                  ) : workerOptions.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                      <p className="text-sm font-bold text-amber-800">
                        Belum Ada Pekerja Terdaftar Lisensi Ketinggian
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Tidak ditemukan pekerja dengan sertifikat Height Work di departemen <strong>{namaDepartemen}</strong>. Silakan hubungi Admin SHE untuk verifikasi Master Lisence.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-blue-800">
                          Pilih pekerja yang memiliki lisensi Height Work aktif di departemen <strong>{namaDepartemen}</strong>. Dokumen lisensi terverifikasi otomatis.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {Array.from({ length: visibleCount }).map((_, i) => {
                          const nikTerpakai = selectedNik.filter((nik, idx) => nik && idx !== i);
                          const availableOptions = workerOptions.filter((w) => !nikTerpakai.includes(w.nik));
                          const currentWorker = workerOptions.find((w) => w.nik === selectedNik[i]);
                          const status = currentWorker ? getExpStatus(currentWorker.tanggal_exp) : null;
                          const namaFilled = !!namaPetugas[i]?.trim();

                          return (
                            <div
                              key={i}
                              className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                                namaFilled ? "bg-white border-slate-200 shadow-xs" : "bg-slate-50/60 border-slate-200"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                                    {i + 1}
                                  </span>
                                  <select
                                    value={selectedNik[i] ?? ""}
                                    onChange={(e) => handleWorkerSelect(i, e.target.value)}
                                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                                      !selectedNik[i] ? "text-slate-400" : "text-slate-800 font-medium"
                                    }`}
                                  >
                                    <option value="">— Pilih Petugas dari Master Lisence —</option>
                                    {availableOptions.map((w) => (
                                      <option key={w.nik} value={w.nik}>{w.nama} ({w.nik})</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0 shrink-0">
                                  <label
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                      berbadanSehat[i]
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={berbadanSehat[i]}
                                      onChange={(e) => handleSehatChange(i, e.target.checked)}
                                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>Sehat</span>
                                  </label>

                                  {currentWorker && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewWorker(currentWorker)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-all shrink-0 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> <span>Lihat Lisensi</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {currentWorker && status !== "active" && (
                                <p className={`text-xs font-semibold mt-2.5 pl-8 sm:pl-9 flex items-center gap-1.5 ${
                                  status === "expired" ? "text-rose-600" : "text-amber-600"
                                }`}>
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {status === "expired" ? "Lisensi pekerja ini telah KADALUARSA" : "Lisensi pekerja ini hampir kadaluarsa"} (Exp: {formatDate(currentWorker.tanggal_exp)})
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {visibleCount < 10 && (
                        <p className="text-xs text-slate-400 text-center mt-3">
                          Pilih petugas pada baris ke-{visibleCount} untuk menambah slot pekerja berikutnya.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </Section>

          {/* ── BAGIAN 3: PEMINJAMAN APD ── */}
          <Section
            stepNumber="3"
            title="Peminjaman Alat Pelindung Diri (APD)"
            description="Peminjaman perlengkapan keselamatan khusus kerja ketinggian"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CheckItem
                label="Kunci Pagar Tangga Listrik"
                checked={kunceePagar}
                onChange={setKunceePagar}
              />

              <div className="space-y-3">
                <CheckItem
                  label="Rompi Ketinggian"
                  checked={rompiKetinggian}
                  onChange={setRompiKetinggian}
                />
                {rompiKetinggian && (
                  <div className="pl-4 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rompi</label>
                    <input
                      type="text"
                      value={rompiAngka}
                      onChange={(e) => setRompiAngka(e.target.value)}
                      placeholder="Masukkan no. rompi..."
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-2">Safety Helmet</p>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-500 font-medium">Jumlah Unit:</label>
                  <input
                    type="number"
                    min="0"
                    value={safetyHelmetCount}
                    onChange={(e) => setSafetyHelmetCount(e.target.value)}
                    placeholder="0"
                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-2">Full Body Harness</p>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-500 font-medium">Jumlah Unit:</label>
                  <input
                    type="number"
                    min="0"
                    value={fullBodyHarnessCount}
                    onChange={(e) => setFullBodyHarnessCount(e.target.value)}
                    placeholder="0"
                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ── BAGIAN 4: KESELAMATAN KERJA KETINGGIAN ── */}
          <Section
            stepNumber="4"
            title="Keselamatan Kerja Ketinggian"
            description="Pemeriksaan langkah-langkah pencegahan bahaya jatuh dan keselamatan lingkungan kerja"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                [areaKerjaAman, setAreaKerjaAman, "Area kerja telah diperiksa dan aman"],
                [kebakaranProcedure, setKebakaranProcedure, "Paham cara menggunakan alat pemadam kebakaran"],
                [pekerjaanListrik, setPekerjaanListrik, "Ada pekerjaan listrik"],
                [prosedurLoto, setProsedurLoto, "Prosedur LOTO diterapkan"],
                [perisakArea, setPerisakArea, "Menutupi area bawah dengan prisai"],
                [safetyLineLine, setSafetyLineLine, "Safety line tersedia"],
                [alatBantuKerja, setAlatBantuKerja, "Alat bantu kerja dalam kondisi aman"],
                [rompiSaatBekerja, setRompiSaatBekerja, "Menggunakan rompi saat bekerja"],
                [bebanBeratTubuh, setBebanBeratTubuh, "Beban tidak melebihi 5 kg"],
                [helmStandar, setHelmStandar, "Helm sesuai standar SOP"],
                [rambuSafetyWarning, setRambuSafetyWarning, "Rambu-rambu keselamatan tersedia"],
              ].map(([val, set, label]: any, idx) => (
                <CheckItem
                  key={idx}
                  label={label}
                  checked={val}
                  onChange={set}
                />
              ))}
            </div>
          </Section>

          {/* ── BAGIAN 5: BODY HARNESS & LANYARD ── */}
          <Section
            stepNumber="5"
            title="Pengecekan Body Harness & Lanyard"
            description="Diverifikasi langsung oleh Tim K3 pada saat inspeksi lapangan"
            badge="Verifikasi K3"
          >
            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                Pemeriksaan fisik terhadap Helm, Body Harness, dan Lanyard akan divalidasi langsung oleh <strong>Admin K3</strong> pada tahap approval izin. Bagian ini disediakan sebagai panduan standar pemeriksaan.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-6 opacity-75">
                {/* Helm */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Helm Keselamatan</h4>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-xs sm:text-sm font-bold text-slate-700">Kondisi Helm Baik</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tidak retak/pecah, tali pengait masih kokoh, ukuran pas di kepala petugas</p>
                  </div>
                </div>

                {/* Body Harness */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Komponen Body Harness</h4>
                  <div className="space-y-2">
                    {[
                      ["Webbing (Tali Anyam)", "Kondisi jahitan baik, tidak terpotong, robek, atau berserabut"],
                      ["D-Ring (Cincin D)", "Tidak bengkok, retak, atau berkarat, dapat berputar bebas"],
                      ["Adjustment Buckle (Gesper)", "Mengunci dengan sempurna, tidak longgar, tidak ada karat"],
                    ].map(([name, desc], idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-xs sm:text-sm font-bold text-slate-700">{name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lanyard */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">3. Komponen Lanyard</h4>
                  <div className="space-y-2">
                    {[
                      ["Absorber & Timbles", "Sarung pelindung utuh, sambungan terpasang kuat"],
                      ["Snap Hook (Pengait)", "Dapat mengunci otomatis secara sempurna, tidak macet"],
                      ["Rope Lanyard (Tali Tambat)", "Serat tali padat dan tidak aus atau terpotong"],
                    ].map(([name, desc], idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-xs sm:text-sm font-bold text-slate-700">{name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Diagram Referensi */}
              <div className="w-full md:w-56 shrink-0 flex flex-col items-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Panduan Diagram</p>
                <button
                  type="button"
                  onClick={() => setHarnessLightbox(true)}
                  className="group relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 shadow-xs hover:border-orange-500 hover:shadow-md transition-all cursor-pointer"
                  title="Klik untuk memperbesar diagram"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/Body_Harness_Check.png" alt="Diagram Body Harness" className="w-full object-contain" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white rounded-full p-2.5 shadow-lg">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                </button>
                <p className="text-[11px] text-slate-400 mt-2 text-center">Klik diagram untuk perbesar</p>
              </div>
            </div>

            {harnessLightbox && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setHarnessLightbox(false)}>
                <div className="relative max-w-xl w-full max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-slate-800 font-bold text-sm">Referensi Pengecekan Body Harness</p>
                    <button type="button" onClick={() => setHarnessLightbox(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  <div className="p-4 overflow-auto max-h-[80vh] flex items-center justify-center bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/Body_Harness_Check.png" alt="Diagram Body Harness" className="max-w-full h-auto object-contain rounded-xl bg-white shadow-sm" style={{ maxHeight: "72vh" }} />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── BAGIAN 6: JSA (UPLOAD ATAU LINKED) ── */}
          <section id="bagian-jsa">
            {idIjinKerja ? (
              <LinkedJsaSection
                idIjinKerja={idIjinKerja}
                enabled={perluJsa}
                setEnabled={setPerluJsa}
                value={jsaData}
                setValue={setJsaData}
                jsaMode={jsaMode}
                setJsaMode={setJsaMode}
                jsaFile={jsaFile}
                setJsaFile={setJsaFile}
                onJsaInfoLoaded={({ mode, fileUrl, enabled }) => {
                  setJsaMode(mode);
                  setPerluJsa(enabled);
                  if (mode === "upload" && fileUrl) {
                    setJsaFile({ name: fileUrl.split("/").pop() || "Dokumen_JSA", size: 0, url: fileUrl });
                  }
                }}
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
                sectionTitle="Bagian 6: Dokumen Job Safety Analysis (JSA)"
                sectionStyle="height-work"
              />
            )}
          </section>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* ── STICKY BOTTOM ACTION BAR ── */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-3 px-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-500">Izin Kerja Ketinggian</span>
                <p className="text-sm font-bold text-slate-900 truncate max-w-xs">{lokasi || "Lokasi belum diisi"}</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || submitting || jsaUploadStatus === "uploading"}
                  className="flex-1 sm:flex-none px-5 py-2.5 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-600" /> : <Save className="w-4 h-4 text-slate-600" />}
                  <span>Simpan Draft</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || saving || lisensiUploading || jsaUploadStatus === "uploading"}
                  className="flex-1 sm:flex-none px-7 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : lisensiUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Upload Foto...</span>
                    </>
                  ) : jsaUploadStatus === "uploading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Upload JSA...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Ajukan Izin Kerja</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>

      {previewWorker && (
        <MasterLisenceViewModal worker={previewWorker} onClose={() => setPreviewWorker(null)} />
      )}
    </div>
  );
}

export default function HeightWorkFormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
          Memuat formulir kerja ketinggian...
        </div>
      }
    >
      <HeightWorkFormPageInner />
    </Suspense>
  );
}