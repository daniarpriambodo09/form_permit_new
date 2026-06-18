// components/JsaUploadSection.tsx
// Komponen section upload JSA yang dipakai ulang di:
//   - app/form/hot-work/page.tsx
//   - app/form/workshop/page.tsx
//   - app/form/height-work/page.tsx
//
// Props:
//   perluJsa        – boolean state (perlu / tidak)
//   setPerluJsa     – setter
//   jsaFile         – objek file info setelah dipilih/upload
//   setJsaFile      – setter
//   jsaUploadStatus – 'idle' | 'uploading' | 'success' | 'error'
//   setJsaUploadStatus
//   jsaUploadError  – pesan error string
//   setJsaUploadError
//   sectionTitle    – judul bagian (default: "BAGIAN 5: UPLOAD JSA")

"use client";

import { useRef } from "react";
import {
  FileText, Upload, X, Loader2, CheckCircle,
  AlertCircle, FileSpreadsheet,
} from "lucide-react";

export type JsaUploadStatus = "idle" | "uploading" | "success" | "error";

export interface JsaFileInfo {
  name: string;
  size: number;
  url: string | null;   // URL dari server setelah upload berhasil
}

interface JsaUploadSectionProps {
  perluJsa: boolean;
  setPerluJsa: (v: boolean) => void;
  jsaFile: JsaFileInfo | null;
  setJsaFile: (v: JsaFileInfo | null) => void;
  jsaUploadStatus: JsaUploadStatus;
  setJsaUploadStatus: (v: JsaUploadStatus) => void;
  jsaUploadError: string;
  setJsaUploadError: (v: string) => void;
  sectionTitle?: string;
  /** Gaya header section — opsional, default mirip hot-work */
  sectionStyle?: "hot-work" | "height-work" | "workshop";
}

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const ALLOWED_EXT = [".pdf", ".xlsx", ".xls"];
const MAX_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
  return <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />;
}

export default function JsaUploadSection({
  perluJsa,
  setPerluJsa,
  jsaFile,
  setJsaFile,
  jsaUploadStatus,
  setJsaUploadStatus,
  jsaUploadError,
  setJsaUploadError,
  sectionTitle = "BAGIAN 5: UPLOAD JSA",
  sectionStyle = "hot-work",
}: JsaUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload ke server ──────────────────────────────────────
  const doUpload = async (file: File) => {
    // Validasi ukuran
    if (file.size > MAX_MB * 1024 * 1024) {
      setJsaUploadError(`Ukuran file maksimal ${MAX_MB} MB`);
      setJsaUploadStatus("error");
      setJsaFile({ name: file.name, size: file.size, url: null });
      return;
    }

    // Validasi ekstensi / tipe
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIME.includes(file.type)) {
      setJsaUploadError("Format tidak didukung. Gunakan PDF, XLSX, atau XLS.");
      setJsaUploadStatus("error");
      setJsaFile({ name: file.name, size: file.size, url: null });
      return;
    }

    // Mulai upload
    setJsaFile({ name: file.name, size: file.size, url: null });
    setJsaUploadStatus("uploading");
    setJsaUploadError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/form-permit/api/upload/jsa", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Upload gagal");
      }
      const { url } = await res.json();
      setJsaFile({ name: file.name, size: file.size, url });
      setJsaUploadStatus("success");
    } catch (err: any) {
      setJsaUploadError(err.message || "Upload gagal, coba lagi");
      setJsaUploadStatus("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) doUpload(f);
    e.target.value = "";
  };

  const handleRemove = () => {
    setJsaFile(null);
    setJsaUploadStatus("idle");
    setJsaUploadError("");
  };

  // ── Render helpers ────────────────────────────────────────
  const isHeightWork = sectionStyle === "height-work";

  // Header style konsisten dengan masing-masing form
  const SectionWrapper = ({ children }: { children: React.ReactNode }) =>
    isHeightWork ? (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold text-slate-800">{sectionTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload dokumen Job Safety Analysis (JSA) apabila diperlukan.
          </p>
        </div>
        <div className="p-6">{children}</div>
      </section>
    ) : (
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm">
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 text-base">{sectionTitle}</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Upload dokumen Job Safety Analysis (JSA) apabila diperlukan.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white">{children}</div>
      </div>
    );

  return (
    <SectionWrapper>
      {/* Pilihan perlu / tidak */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Apakah pekerjaan ini memerlukan JSA?{" "}
          <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {[
            { value: false, label: "Tidak Perlu JSA", desc: "Upload tidak diperlukan" },
            { value: true,  label: "Perlu JSA",       desc: "File JSA wajib diupload" },
          ].map((opt) => (
            <label
              key={String(opt.value)}
              className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                perluJsa === opt.value
                  ? opt.value
                    ? "border-orange-400 bg-orange-50"
                    : "border-slate-400 bg-slate-50"
                  : "border-slate-200 hover:border-orange-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="perluJsa"
                  checked={perluJsa === opt.value}
                  onChange={() => {
                    setPerluJsa(opt.value);
                    // reset jika beralih ke "tidak perlu"
                    if (!opt.value) {
                      handleRemove();
                    }
                  }}
                  className="text-orange-500"
                />
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 ml-5">{opt.desc}</p>
            </label>
          ))}
        </div>
      </div>

      {/* Area upload — hanya tampil jika perlu JSA */}
      {perluJsa && (
        <div className="mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Belum ada file dipilih */}
          {!jsaFile && (
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 px-4 py-3 border-2 border-dashed border-orange-300 rounded-xl text-sm font-medium text-orange-700 hover:border-orange-400 hover:bg-orange-50 transition-all w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                Upload File JSA
              </button>
              <p className="text-xs text-slate-400 mt-1.5 text-center">
                Format: PDF, XLSX, XLS — maks. {MAX_MB} MB
              </p>
            </div>
          )}

          {/* File sudah dipilih */}
          {jsaFile && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                jsaUploadStatus === "error"
                  ? "bg-red-50 border-red-200"
                  : jsaUploadStatus === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {getFileIcon(jsaFile.name)}

              {/* Info file */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {jsaFile.name}
                </p>
                <p className="text-xs text-slate-500">{formatBytes(jsaFile.size)}</p>
                {jsaUploadStatus === "uploading" && (
                  <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Mengupload…
                  </p>
                )}
                {jsaUploadStatus === "success" && (
                  <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Upload berhasil
                  </p>
                )}
                {jsaUploadStatus === "error" && (
                  <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {jsaUploadError || "Upload gagal"}
                  </p>
                )}
              </div>

              {/* Status icon */}
              {jsaUploadStatus === "uploading" && (
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
              )}
              {jsaUploadStatus === "success" && (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              )}
              {jsaUploadStatus === "error" && (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              )}

              {/* Tombol aksi */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-slate-600 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50 transition-colors font-medium"
                  title="Ganti file"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  title="Hapus file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Pesan error validasi (saat submit tanpa file) */}
          {jsaUploadStatus === "error" && jsaUploadError && !jsaFile && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {jsaUploadError}
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>JSA (Job Safety Analysis)</strong> adalah dokumen analisis keselamatan kerja yang mengidentifikasi potensi bahaya dan tindakan pencegahan untuk setiap langkah pekerjaan.
          Upload file dalam format <strong>PDF</strong>, <strong>XLSX</strong>, atau <strong>XLS</strong> (maks. {MAX_MB} MB).
        </p>
      </div>
    </SectionWrapper>
  );
}