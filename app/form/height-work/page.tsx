// app/form/height-work/page.tsx
// UPDATED: Bagian 6 (Persetujuan) dihapus dari form pengisian.
// tipe_perusahaan (internal/eksternal) disimpan ke DB untuk menentukan alur approval.
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, Shield, ChevronRight, AlertCircle,
  CheckCircle, Loader2, Camera, Upload, X, ZoomIn, ImageIcon,
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

function ImagePreviewModal({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm truncate pr-4">{label}</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="w-full max-h-[60vh] object-contain rounded-lg bg-slate-50" />
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
  const camRef  = useRef<HTMLInputElement>(null);
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
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload gagal"); }
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
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={() => setShowPreview(true)}
            className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-orange-400 transition-colors group" title="Lihat foto lisensi">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoUrl} alt="Lisensi" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          {uploadStatus === "uploading" && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
          {uploadStatus === "success"   && <CheckCircle className="w-4 h-4 text-green-500" />}
          {uploadStatus === "error"     && <div title={uploadError}><AlertCircle className="w-4 h-4 text-red-500" /></div>}
          <button type="button" onClick={onRemoved} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus foto">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {showPreview && <ImagePreviewModal src={fotoUrl} label={`Lisensi — ${namaPetugas}`} onClose={() => setShowPreview(false)} />}
      </>
    );
  }

  return (
    <div className="relative shrink-0">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      <input ref={camRef}  type="file" accept="image/*" capture="environment"  className="hidden" onChange={handleFile} />
      <button type="button" onClick={() => setShowOptions((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          uploadStatus === "error"
            ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
            : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-400"
        }`} title={uploadError || "Upload foto lisensi"}>
        {uploadStatus === "uploading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{uploadStatus === "error" ? "Coba lagi" : "Foto Lisensi"}</span>
      </button>
      {uploadStatus === "error" && uploadError && (
        <p className="absolute top-full mt-1 right-0 text-xs text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1 whitespace-nowrap z-10 shadow">{uploadError}</p>
      )}
      {showOptions && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            <button type="button" onClick={() => { setShowOptions(false); camRef.current?.click(); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <Camera className="w-4 h-4 text-orange-500" /> Ambil Foto
            </button>
            <div className="border-t border-slate-100" />
            <button type="button" onClick={() => { setShowOptions(false); fileRef.current?.click(); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4 text-blue-500" /> Upload File
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const DEPT_SPV_MAP: { dept: string; spv: string[] }[] = [
  { dept: "QA",        spv: ["TONI WIJAYA"] },
  { dept: "ENG",       spv: ["TKR", "KAR", "YHE", "AYP"] },
  { dept: "MTC",       spv: ["RIZAL FIRMANSYAH", "M. CHASAN BASRI", "GHAITSUL AMTHARI"] },
  { dept: "PRODUKSI",  spv: ["DONI FERIN HARINDRA"] },
  { dept: "NYS",       spv: ["HARY SW.", "ANDIK EKA P.", "DESNA RIATTAMA"] },
  { dept: "FATP-Exim", spv: ["Arianto Setiawan"] },
  { dept: "MPC-WHS",   spv: ["HERU YUDIANTO", "FERRY IRAWAN"] },
  { dept: "PGA",       spv: ["ARIS CAHYONO", "AGUNG INDRAYANA"] },
];

export default function HeightWorkFormPage() {
  const router = useRouter();

  // tipePerusahaan menentukan alur approval:
  // "internal"  → SPV → Admin K3 → SFO → MR/PGA
  // "eksternal" → Kontraktor → SPV → Admin K3 → SFO → MR/PGA
  const [tipePerusahaan,         setTipePerusahaan]         = useState<"internal"|"eksternal">("internal");
  const [deskripsiPekerjaan,     setDeskripsiPekerjaan]     = useState("");
  const [lokasi,                 setLokasi]                 = useState("");
  const [tanggalPelaksanaan,     setTanggalPelaksanaan]     = useState("");
  const [waktuMulai,             setWaktuMulai]             = useState("");
  const [waktuSelesai,           setWaktuSelesai]           = useState("");
  const [namaPengawasKontraktor, setNamaPengawasKontraktor] = useState("");
  const [namaPengawasDepartemen, setNamaPengawasDepartemen] = useState("");
  const [namaDepartemen,         setNamaDepartemen]         = useState("");

  const [namaPetugas,   setNamaPetugas]   = useState<string[]>(Array(10).fill(""));
  const [berbadanSehat, setBerbadanSehat] = useState<boolean[]>(Array(10).fill(false));
  const [fotoLisensi,   setFotoLisensi]   = useState<(string|null)[]>(Array(10).fill(null));
  const [uploadStatus,  setUploadStatus]  = useState<UploadStatus[]>(Array(10).fill("idle" as UploadStatus));
  const [uploadError,   setUploadError]   = useState<string[]>(Array(10).fill(""));

  const [kunceePagar,          setKunceePagar]          = useState(false);
  const [rompiKetinggian,      setRompiKetinggian]      = useState(false);
  const [rompiAngka,           setRompiAngka]           = useState("");
  const [safetyHelmetCount,    setSafetyHelmetCount]    = useState("");
  const [fullBodyHarnessCount, setFullBodyHarnessCount] = useState("");

  const [areaKerjaAman,      setAreaKerjaAman]      = useState(false);
  const [kebakaranProcedure, setKebakaranProcedure] = useState(false);
  const [pekerjaanListrik,   setPekerjaanListrik]   = useState(false);
  const [prosedurLoto,       setProsedurLoto]       = useState(false);
  const [perisakArea,        setPerisakArea]        = useState(false);
  const [safetyLineLine,     setSafetyLineLine]     = useState(false);
  const [alatBantuKerja,     setAlatBantuKerja]     = useState(false);
  const [rompiSaatBekerja,   setRompiSaatBekerja]   = useState(false);
  const [bebanBeratTubuh,    setBebanBeratTubuh]    = useState(false);
  const [helmStandar,        setHelmStandar]        = useState(false);
  const [rambuSafetyWarning, setRambuSafetyWarning] = useState(false);

  const [bodyHarnessWebbing,    setBodyHarnessWebbing]    = useState(false);
  const [bodyHarnessDRing,      setBodyHarnessDRing]      = useState(false);
  const [bodyHarnessAdjustment, setBodyHarnessAdjustment] = useState(false);
  const [lanyardAbsorber,       setLanyardAbsorber]       = useState(false);
  const [lanyardSnapHook,       setLanyardSnapHook]       = useState(false);
  const [lanyardRope,           setLanyardRope]           = useState(false);

  const [harnessLightbox, setHarnessLightbox] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [successId,  setSuccessId]  = useState("");

  const handleNamaChange = (i: number, val: string) => {
    setNamaPetugas((prev) => { const n = [...prev]; n[i] = val; return n; });
    if (!val.trim()) {
      setFotoLisensi((prev)  => { const n = [...prev]; n[i] = null;   return n; });
      setUploadStatus((prev) => { const n = [...prev]; n[i] = "idle"; return n; });
      setUploadError((prev)  => { const n = [...prev]; n[i] = "";     return n; });
    }
  };

  const handleSehatChange = (i: number, val: boolean) => {
    setBerbadanSehat((prev) => { const n = [...prev]; n[i] = val; return n; });
  };

  const handleFotoUploaded = useCallback((i: number, url: string, status: UploadStatus, err: string) => {
    setFotoLisensi((prev)  => { const n = [...prev]; n[i] = url || prev[i]; return n; });
    setUploadStatus((prev) => { const n = [...prev]; n[i] = status;         return n; });
    setUploadError((prev)  => { const n = [...prev]; n[i] = err;            return n; });
  }, []);

  const handleFotoRemoved = useCallback((i: number) => {
    setFotoLisensi((prev)  => { const n = [...prev]; n[i] = null;   return n; });
    setUploadStatus((prev) => { const n = [...prev]; n[i] = "idle"; return n; });
    setUploadError((prev)  => { const n = [...prev]; n[i] = "";     return n; });
  }, []);

  const visibleCount = (() => {
    let c = 1;
    for (let i = 0; i < 9; i++) if (namaPetugas[i]?.trim()) c = i + 2;
    return Math.min(c, 10);
  })();

  const petugasAktif     = namaPetugas.slice(0, visibleCount).map((n, i) => ({ nama: n, idx: i })).filter(({ nama }) => nama.trim());
  const lisensiMissing   = petugasAktif.filter(({ idx }) => !fotoLisensi[idx]);
  const lisensiUploading = uploadStatus.some((s) => s === "uploading");

  const buildBody = (isSubmit: boolean) => ({
    isSubmit,
    // tipePerusahaan disimpan untuk menentukan alur approval di backend
    tipePerusahaan,
    deskripsiPekerjaan,
    lokasi,
    tanggalPelaksanaan,
    waktuMulai,
    waktuSelesai,
    namaPengawasKontraktor,
    namaPengawasDepartemen,
    namaDepartemen,
    namaPetugas,
    berbadanSehat,
    fotoLisensi,
    kunceePagar,
    rompiKetinggian,
    rompiAngka,
    safetyHelmetCount:    safetyHelmetCount    !== "" ? safetyHelmetCount    : null,
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
  });

  const handleSaveDraft = async () => {
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/forms/height-work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody(false)) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan draft");
      router.push("/history");
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (lisensiMissing.length > 0) {
      setError(`Foto lisensi wajib untuk: ${lisensiMissing.map(({ nama, idx }) => `Petugas ${idx + 1} (${nama})`).join(", ")}`);
      document.getElementById("bagian-petugas")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (lisensiUploading) { setError("Masih ada foto yang sedang diupload, tunggu sebentar."); return; }
    setSubmitting(true);
    try {
      const res  = await fetch("/api/forms/height-work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody(true)) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan form");
      setSuccessId(data.id_form); setSuccess(true);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Berhasil Dikirim!</h2>
          <p className="text-slate-500 text-sm mb-2">Form izin kerja ketinggian Anda telah berhasil diajukan dan sedang menunggu persetujuan.</p>
          {/* Tampilkan info alur approval */}
          <div className={`text-xs px-3 py-2 rounded-lg mb-4 ${tipePerusahaan === "eksternal" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
            <strong>Alur Approval ({tipePerusahaan === "eksternal" ? "Eksternal" : "Internal"}):</strong>
            <p className="mt-1">{tipePerusahaan === "eksternal" ? "Kontraktor → SPV → Admin K3 → SFO → MR/PGA" : "SPV → Admin K3 → SFO → MR/PGA"}</p>
          </div>
          {successId && <p className="text-xs text-slate-400 mb-6">ID Form: <span className="font-mono font-bold text-slate-700">{successId}</span></p>}
          <div className="flex gap-3">
            <Link href="/history" className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition-colors">Lihat Riwayat</Link>
            <Link href="/home"    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition-colors">Kembali</Link>
          </div>
        </div>
      </div>
    );
  }

  const inputCls    = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder-slate-400";
  const sectionHead = "bg-slate-50 border-b border-slate-200 px-6 py-4";
  const cb          = "w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400 shrink-0";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">Form Izin Kerja Ketinggian</h1>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Link href="/home" className="hover:text-orange-600 transition-colors">Beranda</Link>
                <ChevronRight className="w-3 h-3" /><span>Kerja Ketinggian</span>
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-semibold text-orange-700">
            <AlertTriangle className="w-3.5 h-3.5" /> Height Work
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" /><p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* BAGIAN 1 */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={sectionHead}><h2 className="font-bold text-slate-800">Bagian 1: Informasi Pekerjaan</h2></div>
            <div className="p-6 space-y-5">

              {/* Tipe Petugas — menentukan alur approval */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tipe Petugas Ketinggian <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "internal",  label: "Internal / Karyawan PT.JAI",     desc: "Alur: SPV → Admin K3 → SFO → MR/PGA" },
                    { value: "eksternal", label: "Eksternal / Subkontraktor",       desc: "Alur: Kontraktor → SPV → Admin K3 → SFO → MR/PGA" },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${tipePerusahaan === opt.value ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-200"}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="tipePerusahaan" value={opt.value} checked={tipePerusahaan === opt.value} onChange={() => setTipePerusahaan(opt.value as any)} className="text-orange-500" />
                        <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 ml-5">{opt.desc}</p>
                    </label>
                  ))}
                </div>
                {/* Info alur approval */}
                <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${tipePerusahaan === "eksternal" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                  <strong>Alur approval yang akan diterapkan:</strong>
                  <span className="ml-1">{tipePerusahaan === "eksternal" ? "Kontraktor → SPV → Admin K3 → SFO → MR I/PGA MGR" : "SPV → Admin K3 → SFO → MR I/PGA MGR"}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Pekerjaan <span className="text-red-500">*</span></label>
                <textarea value={deskripsiPekerjaan} onChange={(e) => setDeskripsiPekerjaan(e.target.value)} placeholder="Jelaskan pekerjaan yang akan dilakukan di ketinggian..." rows={3} required className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Lokasi <span className="text-red-500">*</span></label>
                  <input type="text" value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Contoh: Gedung A Lantai 3" required className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Pelaksanaan <span className="text-red-500">*</span></label>
                  <input type="date" value={tanggalPelaksanaan} onChange={(e) => setTanggalPelaksanaan(e.target.value)} required className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Mulai</label>
                  <input type="time" value={waktuMulai} onChange={(e) => setWaktuMulai(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Selesai</label>
                  <input type="time" value={waktuSelesai} onChange={(e) => setWaktuSelesai(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pengawas Kontraktor <span className="text-red-500">*</span></label>
                <input type="text" value={namaPengawasKontraktor} onChange={(e) => setNamaPengawasKontraktor(e.target.value)} placeholder="Nama pengawas kontraktor" required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Departemen <span className="text-red-500">*</span></label>
                <select value={namaDepartemen} onChange={(e) => { setNamaDepartemen(e.target.value); setNamaPengawasDepartemen(""); }} required className={`${inputCls} ${!namaDepartemen ? "text-slate-400" : "text-slate-800"}`}>
                  <option value="" disabled>— Pilih Departemen —</option>
                  {DEPT_SPV_MAP.map((d) => (<option key={d.dept} value={d.dept}>{d.dept}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pengawas Departemen <span className="text-red-500">*</span></label>
                {namaDepartemen ? (
                  <select value={namaPengawasDepartemen} onChange={(e) => setNamaPengawasDepartemen(e.target.value)} required className={`${inputCls} ${!namaPengawasDepartemen ? "text-slate-400" : "text-slate-800"}`}>
                    <option value="" disabled>— Pilih Pengawas —</option>
                    {(DEPT_SPV_MAP.find((d) => d.dept === namaDepartemen)?.spv ?? []).map((spv) => (<option key={spv} value={spv}>{spv}</option>))}
                  </select>
                ) : (
                  <div className={`${inputCls} text-slate-400 italic cursor-not-allowed bg-slate-50`}>Pilih departemen terlebih dahulu</div>
                )}
              </div>
            </div>
          </section>

          {/* BAGIAN 2: Petugas + Lisensi */}
          <section id="bagian-petugas" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={sectionHead}><h2 className="font-bold text-slate-800">Bagian 2: Nama Petugas Ketinggian & Status Kesehatan</h2></div>
            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-sm text-amber-700">⚠️ Setiap petugas yang namanya terisi <strong>wajib</strong> melampirkan foto lisensi ketinggian.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span className="w-5 shrink-0">#</span>
                <span className="flex-1">Nama Petugas</span>
                <span className="w-28 text-center shrink-0">Berbadan Sehat</span>
                <span className="w-24 text-center shrink-0">Foto Lisensi</span>
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: visibleCount }).map((_, i) => {
                  const namaFilled  = !!namaPetugas[i]?.trim();
                  const fotoMissing = namaFilled && !fotoLisensi[i];
                  return (
                    <div key={i} className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all ${fotoMissing ? "bg-amber-50 border-amber-200" : namaFilled ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-200"}`}>
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <input type="text" placeholder={`Nama Petugas ${i + 1}`} value={namaPetugas[i]} onChange={(e) => handleNamaChange(i, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white placeholder-slate-400" />
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input type="checkbox" checked={berbadanSehat[i]} onChange={(e) => handleSehatChange(i, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
                        <span className="text-xs font-medium text-slate-600 hidden sm:inline">Berbadan Sehat</span>
                        <span className="text-xs font-medium text-slate-600 sm:hidden">Sehat</span>
                      </label>
                      {namaFilled && (
                        <LisensiUploadButton namaPetugas={namaPetugas[i]} index={i + 1} fotoUrl={fotoLisensi[i]} uploadStatus={uploadStatus[i]} uploadError={uploadError[i]}
                          onUploaded={(url, status, err) => handleFotoUploaded(i, url, status, err)} onRemoved={() => handleFotoRemoved(i)} />
                      )}
                      {fotoMissing && <span className="text-xs text-amber-600 font-medium shrink-0 hidden lg:block">Wajib foto</span>}
                    </div>
                  );
                })}
              </div>
              {visibleCount < 10 && <p className="text-xs text-slate-400 text-center mt-3">Isi nama petugas {visibleCount} untuk menambah baris berikutnya</p>}
            </div>
          </section>

          {/* BAGIAN 3: APD */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={sectionHead}><h2 className="font-bold text-slate-800">Bagian 3: Peminjaman APD</h2></div>
            <div className="p-6 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                <input type="checkbox" checked={kunceePagar} onChange={(e) => setKunceePagar(e.target.checked)} className={cb} />
                <span className="text-sm font-medium text-slate-700">Kunci Pagar Tangga Listrik</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                <input type="checkbox" checked={rompiKetinggian} onChange={(e) => setRompiKetinggian(e.target.checked)} className={cb} />
                <span className="text-sm font-medium text-slate-700">Rompi Ketinggian</span>
              </label>
              {rompiKetinggian && (
                <div className="ml-8">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. Rompi</label>
                  <input type="text" value={rompiAngka} onChange={(e) => setRompiAngka(e.target.value)} placeholder="Nomor rompi" className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              )}
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Safety Helmet</p>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-600">Jumlah:</label>
                  <input type="number" min="0" value={safetyHelmetCount} onChange={(e) => setSafetyHelmetCount(e.target.value)} placeholder="0" className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Full Body Harness</p>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-600">Jumlah:</label>
                  <input type="number" min="0" value={fullBodyHarnessCount} onChange={(e) => setFullBodyHarnessCount(e.target.value)} placeholder="0" className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            </div>
          </section>

          {/* BAGIAN 4: Keselamatan */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={sectionHead}><h2 className="font-bold text-slate-800">Bagian 4: Keselamatan Kerja Ketinggian</h2></div>
            <div className="p-6">
              <div className="space-y-1">
                {[
                  [areaKerjaAman,      setAreaKerjaAman,      "Area kerja telah diperiksa dan aman"],
                  [kebakaranProcedure, setKebakaranProcedure, "Paham cara menggunakan alat pemadam kebakaran"],
                  [pekerjaanListrik,   setPekerjaanListrik,   "Ada pekerjaan listrik"],
                  [prosedurLoto,       setProsedurLoto,       "Prosedur LOTO diterapkan"],
                  [perisakArea,        setPerisakArea,        "Menutupi area bawah dengan prisai"],
                  [safetyLineLine,     setSafetyLineLine,     "Safety line tersedia"],
                  [alatBantuKerja,     setAlatBantuKerja,     "Alat bantu kerja dalam kondisi aman"],
                  [rompiSaatBekerja,   setRompiSaatBekerja,   "Menggunakan rompi saat bekerja"],
                  [bebanBeratTubuh,    setBebanBeratTubuh,    "Beban tidak melebihi 5 kg"],
                  [helmStandar,        setHelmStandar,        "Helm sesuai standar SOP"],
                  [rambuSafetyWarning, setRambuSafetyWarning, "Rambu-rambu keselamatan tersedia"],
                ].map(([val, set, label]: any, idx) => (
                  <label key={idx} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className={cb} />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* BAGIAN 5: Body Harness */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={sectionHead}><h2 className="font-bold text-slate-800">Bagian 5: Pengecekan Body Harness & Lanyard</h2></div>
            <div className="p-6">
              <div className="flex gap-6">
                <div className="flex-1 space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Body Harness</h3>
                    <div className="space-y-1">
                      {[
                        [bodyHarnessWebbing,    setBodyHarnessWebbing,    "Webbing",                   "Kondisi jahitan baik (tidak lepas, tidak berserabut)"],
                        [bodyHarnessDRing,      setBodyHarnessDRing,      "D-Ring",                    "Kondisi baik (tidak retak/bengkok/berkarat, dapat diputar bebas/fleksibel)"],
                        [bodyHarnessAdjustment, setBodyHarnessAdjustment, "Adjustment Buckle (Gesper)", "Kondisi baik (tidak retak/bengkok/berkarat, dapat mengunci sempurna)"],
                      ].map(([val, set, name, desc]: any, idx) => (
                        <label key={idx} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
                          <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className={`${cb} mt-0.5`} />
                          <div>
                            <span className="text-sm font-semibold text-slate-700">{name}</span>
                            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lanyard</h3>
                    <div className="space-y-1">
                      {[
                        [lanyardAbsorber, setLanyardAbsorber, "Absorber & Timbles", "Kondisi baik (sarung penutup tidak rusak, terpasang tepat pada ujung mata sambungan)"],
                        [lanyardSnapHook, setLanyardSnapHook, "Snap Hook",          "Kondisi baik (tidak retak/bengkok/berkarat, dapat terkunci dengan sempurna)"],
                        [lanyardRope,     setLanyardRope,     "Rope Lanyard",       "Kondisi baik (tidak berserabut, fiber tidak aus/terpotong)"],
                      ].map(([val, set, name, desc]: any, idx) => (
                        <label key={idx} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
                          <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className={`${cb} mt-0.5`} />
                          <div>
                            <span className="text-sm font-semibold text-slate-700">{name}</span>
                            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-center justify-start shrink-0 w-48">
                  <div className="sticky top-24 flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Referensi Body Harness</p>
                    <button type="button" onClick={() => setHarnessLightbox(true)}
                      className="group relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:border-orange-400 hover:shadow-md transition-all cursor-zoom-in" title="Klik untuk perbesar">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/Cek_Body_Harness.jpg" alt="Diagram pengecekan body harness" className="w-full object-contain bg-white" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-center">Klik untuk perbesar</p>
                  </div>
                </div>

                {harnessLightbox && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setHarnessLightbox(false)}>
                    <div className="relative max-w-xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-t-2xl px-4 py-2.5">
                        <p className="text-white font-semibold text-sm">Referensi Pengecekan Body Harness</p>
                        <button type="button" onClick={() => setHarnessLightbox(false)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                      <div className="bg-white rounded-b-2xl overflow-auto max-h-[80vh] flex items-center justify-center p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/Cek_Body_Harness.jpg" alt="Diagram pengecekan body harness" className="w-full h-auto object-contain" style={{ maxHeight: "75vh" }} />
                      </div>
                      <p className="text-white/50 text-xs text-center mt-2">Klik di luar gambar untuk menutup</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Bagian 6 (Persetujuan) DIHAPUS dari form pengisian ── */}
          {/* Persetujuan akan terisi otomatis oleh approver dan tetap tampil di Detail Modal */}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" /><p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <button type="button" onClick={handleSaveDraft} disabled={saving || submitting}
              className="flex-1 py-3.5 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan Draft...</> : "Simpan sebagai Draft"}
            </button>
            <button type="submit" disabled={submitting || saving || lisensiUploading}
              className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</>
               : lisensiUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Upload foto...</>
               : <><AlertTriangle className="w-4 h-4" />Kirim Izin Kerja</>}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}