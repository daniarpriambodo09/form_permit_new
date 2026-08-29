// components/LicenseUploadSection.tsx
// UPDATED: Upload Lisensi/Sertifikasi sekarang WAJIB (tidak ada toggle
// perlu/tidak lagi) dan mendukung LEBIH DARI SATU file — ada tombol
// "+ Tambah File Lisensi" untuk menambah slot upload baru. Setiap file
// diupload independen (bisa ada yang masih "uploading" sementara yang
// lain sudah "success"). File yang diterima hanya gambar atau PDF,
// maksimal 10MB per file.

"use client";

import { useRef, useState } from "react";
import {
  FileText, Upload, X, Loader2, CheckCircle,
  AlertCircle, FileImage, Award, Plus,
} from "lucide-react";

export type LicenseFileStatus = "uploading" | "success" | "error";

export interface LicenseFileInfo {
  id: string;              // id unik sisi klien (bukan dari server)
  name: string;
  size: number;
  url: string | null;      // URL dari server setelah upload berhasil
  status: LicenseFileStatus;
  error?: string;
}

interface LicenseUploadSectionProps {
  licenseFiles: LicenseFileInfo[];
  setLicenseFiles: React.Dispatch<React.SetStateAction<LicenseFileInfo[]>>;
  jumlahTenagaKerja: string;
  sectionTitle?: string;
  /** Gaya header section — opsional, default mirip hot-work */
  sectionStyle?: "hot-work" | "height-work" | "workshop";
}

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
  return <FileImage className="w-5 h-5 text-blue-600 shrink-0" />;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LicenseUploadSection({
  licenseFiles,
  setLicenseFiles,
  jumlahTenagaKerja,
  sectionTitle = "BAGIAN 9: UPLOAD LISENSI / SERTIFIKASI",
  sectionStyle = "hot-work",
}: LicenseUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadNotice, setUploadNotice] = useState("");

  const workerCountValue = jumlahTenagaKerja.trim();
  const workerCount = Number(workerCountValue);
  const isWorkerCountValid = workerCountValue !== "" && Number.isInteger(workerCount) && workerCount >= 0;
  const activeFileCount = licenseFiles.filter((file) => file.status !== "error").length;
  const uploadLimitReached = isWorkerCountValid && activeFileCount >= workerCount;

  const openFilePicker = () => {
    if (!isWorkerCountValid) {
      setUploadNotice("Isi jumlah tenaga kerja dengan bilangan bulat minimal 0 terlebih dahulu.");
      return;
    }
    if (uploadLimitReached) {
      setUploadNotice(`Jumlah upload sudah mencapai ${workerCount} file sesuai jumlah tenaga kerja.`);
      return;
    }
    setUploadNotice("");
    fileInputRef.current?.click();
  };

  // ── Upload ke endpoint lisensi ────────────────────────────
  const doUpload = async (file: File) => {
    const id = genId();

    // Validasi ukuran
    if (file.size > MAX_MB * 1024 * 1024) {
      setLicenseFiles((prev) => [
        ...prev,
        { id, name: file.name, size: file.size, url: null, status: "error", error: `Ukuran file maksimal ${MAX_MB} MB` },
      ]);
      return;
    }

    // Validasi ekstensi / tipe
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIME.includes(file.type)) {
      setLicenseFiles((prev) => [
        ...prev,
        { id, name: file.name, size: file.size, url: null, status: "error", error: "Format tidak didukung. Gunakan gambar JPG, PNG, WebP, atau PDF." },
      ]);
      return;
    }

    // Tambahkan entri baru berstatus "uploading"
    setLicenseFiles((prev) => [
      ...prev,
      { id, name: file.name, size: file.size, url: null, status: "uploading" },
    ]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/form-permit/api/upload/license", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Upload gagal");
      }
      const { url } = await res.json();
      setLicenseFiles((prev) => prev.map((f) => (f.id === id ? { ...f, url, status: "success" } : f)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload gagal, coba lagi";
      setLicenseFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "error", error: message } : f))
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && isWorkerCountValid && activeFileCount < workerCount) doUpload(f);
    e.target.value = "";
  };

  const handleRemove = (id: string) => {
    setLicenseFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRetry = (id: string) => {
    setLicenseFiles((prev) => prev.filter((f) => f.id !== id));
    openFilePicker();
  };

  // ── Render helpers ────────────────────────────────────────
  const isHeightWork = sectionStyle === "height-work";

  const SectionWrapper = ({ children }: { children: React.ReactNode }) =>
    isHeightWork ? (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold text-slate-800">{sectionTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload dokumen lisensi atau sertifikasi kompetensi yang dimiliki. Bisa lebih dari satu file.
          </p>
        </div>
        <div className="p-6">{children}</div>
      </section>
    ) : (
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm">
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 text-base">{sectionTitle}</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Upload dokumen lisensi atau sertifikasi kompetensi yang dimiliki. Bisa lebih dari satu file.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white">{children}</div>
      </div>
    );

  const successCount = licenseFiles.filter((f) => f.status === "success").length;

  return (
    <SectionWrapper>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-sm font-semibold text-slate-700 mb-3">
        Dokumen Lisensi / Sertifikasi <span className="text-red-500">*</span>
        <span className="text-xs font-normal text-slate-400 ml-2">Minimal satu file, maksimal sesuai jumlah tenaga kerja</span>
      </p>

      {uploadNotice && <p className="text-xs text-red-600 mb-3">{uploadNotice}</p>}

      {/* Daftar file yang sudah/sedang diupload */}
      {licenseFiles.length > 0 && (
        <div className="space-y-2 mb-3">
          {licenseFiles.map((lf) => (
            <div
              key={lf.id}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                lf.status === "error"
                  ? "bg-red-50 border-red-200"
                  : lf.status === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {getFileIcon(lf.name)}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{lf.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(lf.size)}</p>
                {lf.status === "uploading" && (
                  <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Mengupload…
                  </p>
                )}
                {lf.status === "success" && (
                  <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Upload berhasil
                  </p>
                )}
                {lf.status === "error" && (
                  <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {lf.error || "Upload gagal"}
                  </p>
                )}
              </div>

              {lf.status === "uploading" && <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />}
              {lf.status === "success" && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
              {lf.status === "error" && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}

              <div className="flex items-center gap-1 shrink-0">
                {lf.status === "error" && (
                  <button
                    type="button"
                    onClick={() => handleRetry(lf.id)}
                    className="text-xs text-slate-600 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50 transition-colors font-medium"
                    title="Coba lagi"
                  >
                    Coba Lagi
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(lf.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  title="Hapus file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tombol tambah — selalu tampil, teks berubah tergantung sudah ada file atau belum */}
      <button
        type="button"
        onClick={openFilePicker}
        disabled={uploadLimitReached}
        className="flex items-center gap-2.5 px-4 py-3 border-2 border-dashed border-orange-300 rounded-xl text-sm font-medium text-orange-700 hover:border-orange-400 hover:bg-orange-50 transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {licenseFiles.length === 0 ? <Upload className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {licenseFiles.length === 0 ? "Upload File Lisensi" : "Tambah File Lisensi"}
      </button>
      <p className="text-xs text-slate-400 mt-1.5 text-center">
        Format: JPG, PNG, WebP, PDF — maks. {MAX_MB} MB per file
        {` · ${successCount}/${isWorkerCountValid ? workerCount : "-"} file terupload`}
      </p>

      {/* Info box */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Lisensi / Sertifikasi</strong> adalah dokumen bukti kompetensi atau izin kerja yang dimiliki pekerja/kontraktor
          (contoh: sertifikat las, sertifikat K3 ketinggian, SIO, dsb). Upload semua dokumen yang relevan — bisa lebih dari satu file.
        </p>
      </div>
    </SectionWrapper>
  );
}