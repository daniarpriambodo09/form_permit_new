// components/PetugasLisensiSection.tsx
// Komponen daftar petugas ketinggian dengan upload foto lisensi
"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, ZoomIn, CheckCircle, AlertCircle, Loader2, ImageIcon } from "lucide-react";

interface PetugasData {
  nama: string;
  berbadanSehat: boolean;
  fotoLisensi?: string | null; // URL atau base64 preview
  fotoLisensiFile?: File | null;
  uploadStatus?: "idle" | "uploading" | "success" | "error";
  uploadError?: string;
}

interface PetugasLisensiSectionProps {
  /** Array 10 elemen petugas */
  petugasList: PetugasData[];
  onChange: (list: PetugasData[]) => void;
  /** Jika true, komponen dalam mode read-only (preview) */
  readOnly?: boolean;
  /** ID form yang sedang dibuat/diedit — dipakai untuk naming file upload */
  formId?: string;
}

// ── Preview Modal ───────────────────────────────────────────
function ImagePreviewModal({
  src,
  label,
  onClose,
}: {
  src: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm">{label}</p>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="w-full max-h-[60vh] object-contain rounded-lg bg-slate-50"
          />
        </div>
      </div>
    </div>
  );
}

// ── Upload button component ─────────────────────────────────
function LisensiUploadButton({
  petugas,
  index,
  onChange,
  formId,
}: {
  petugas: PetugasData;
  index: number;
  onChange: (updated: PetugasData) => void;
  formId?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const doUpload = useCallback(
    async (file: File) => {
      // Validasi ukuran & tipe
      if (file.size > 5 * 1024 * 1024) {
        onChange({
          ...petugas,
          uploadStatus: "error",
          uploadError: "Ukuran file maks 5 MB",
        });
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        onChange({
          ...petugas,
          uploadStatus: "error",
          uploadError: "Hanya JPG, PNG, atau WebP",
        });
        return;
      }

      // Preview lokal langsung
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({
          ...petugas,
          fotoLisensi: reader.result as string,
          fotoLisensiFile: file,
          uploadStatus: "uploading",
          uploadError: undefined,
        });
      };
      reader.readAsDataURL(file);

      // Upload ke API
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("index", String(index + 1));
        if (formId) fd.append("formId", formId);

        const res = await fetch("/api/upload/lisensi", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload gagal");
        }

        const { url } = await res.json();
        onChange({
          ...petugas,
          fotoLisensi: url,
          fotoLisensiFile: file,
          uploadStatus: "success",
          uploadError: undefined,
        });
      } catch (err: any) {
        // Tetap simpan preview lokal, tandai error
        onChange({
          ...petugas,
          fotoLisensiFile: file,
          uploadStatus: "error",
          uploadError: err.message || "Upload gagal, coba lagi",
        });
      }
    },
    [petugas, index, onChange, formId]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    setShowOptions(false);
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange({
      ...petugas,
      fotoLisensi: null,
      fotoLisensiFile: null,
      uploadStatus: "idle",
      uploadError: undefined,
    });
  };

  const status = petugas.uploadStatus ?? "idle";
  const hasPhoto = !!petugas.fotoLisensi;

  // ── Sudah ada foto ─────────────────────────────────────────
  if (hasPhoto) {
    return (
      <>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Thumbnail */}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-orange-400 transition-colors group"
            title="Lihat foto lisensi"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={petugas.fotoLisensi!}
              alt="Lisensi"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* Status badge */}
          {status === "uploading" && (
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {status === "error" && (
            <div title={petugas.uploadError}>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          )}

          {/* Hapus */}
          <button
            type="button"
            onClick={handleRemove}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Hapus foto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {showPreview && (
          <ImagePreviewModal
            src={petugas.fotoLisensi!}
            label={`Lisensi — ${petugas.nama}`}
            onClose={() => setShowPreview(false)}
          />
        )}
      </>
    );
  }

  // ── Belum ada foto ──────────────────────────────────────────
  return (
    <div className="relative shrink-0">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all
          ${
            status === "error"
              ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
              : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-400"
          }
        `}
        title="Upload foto lisensi"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {status === "error" ? "Coba lagi" : "Foto Lisensi"}
        </span>
      </button>

      {/* Error tooltip */}
      {status === "error" && petugas.uploadError && (
        <p className="absolute top-full mt-1 left-0 text-xs text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1 whitespace-nowrap z-10 shadow">
          {petugas.uploadError}
        </p>
      )}

      {/* Options dropdown */}
      {showOptions && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowOptions(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            <button
              type="button"
              onClick={() => {
                setShowOptions(false);
                cameraInputRef.current?.click();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Camera className="w-4 h-4 text-orange-500" />
              Ambil Foto
            </button>
            <div className="border-t border-slate-100" />
            <button
              type="button"
              onClick={() => {
                setShowOptions(false);
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Upload className="w-4 h-4 text-blue-500" />
              Upload File
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function PetugasLisensiSection({
  petugasList,
  onChange,
  readOnly = false,
  formId,
}: PetugasLisensiSectionProps) {
  const handlePetugasChange = useCallback(
    (index: number, updated: PetugasData) => {
      const next = [...petugasList];
      next[index] = updated;
      onChange(next);
    },
    [petugasList, onChange]
  );

  const handleNamaChange = (index: number, nama: string) => {
    const next = [...petugasList];
    next[index] = { ...next[index], nama };
    onChange(next);
  };

  const handleSehatChange = (index: number, val: boolean) => {
    const next = [...petugasList];
    next[index] = { ...next[index], berbadanSehat: val };
    onChange(next);
  };

  // Tentukan baris mana yang ditampilkan:
  // Selalu tampil baris 1. Tampil baris N jika baris N-1 ada namanya.
  const visibleCount = (() => {
    let count = 1;
    for (let i = 0; i < 9; i++) {
      if (petugasList[i]?.nama?.trim()) count = i + 2;
    }
    return Math.min(count, 10);
  })();

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        Upload foto lisensi wajib untuk setiap petugas yang namanya sudah diisi.
      </p>

      {Array.from({ length: visibleCount }).map((_, i) => {
        const p = petugasList[i] ?? {
          nama: "",
          berbadanSehat: false,
          fotoLisensi: null,
          uploadStatus: "idle" as const,
        };
        const namaFilled = !!p.nama?.trim();
        const fotoRequired = namaFilled;
        const fotoMissing = fotoRequired && !p.fotoLisensi;

        return (
          <div
            key={i}
            className={`
              flex items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all
              ${
                fotoMissing
                  ? "bg-amber-50 border-amber-200"
                  : namaFilled
                  ? "bg-white border-slate-200 shadow-sm"
                  : "bg-slate-50 border-slate-200"
              }
            `}
          >
            {/* Nomor */}
            <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">
              {i + 1}
            </span>

            {/* Input nama */}
            <div className="flex-1 min-w-0">
              {readOnly ? (
                <p className="text-sm font-medium text-slate-700">
                  {p.nama || <span className="text-slate-400 italic">—</span>}
                </p>
              ) : (
                <input
                  type="text"
                  placeholder={`Nama Petugas ${i + 1}`}
                  value={p.nama}
                  onChange={(e) => handleNamaChange(i, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white placeholder-slate-400 transition"
                />
              )}
            </div>

            {/* Checkbox sehat */}
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
              {readOnly ? (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.berbadanSehat
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.berbadanSehat ? "✓ Sehat" : "Sehat"}
                </span>
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={p.berbadanSehat}
                    onChange={(e) => handleSehatChange(i, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                  />
                  <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                    Berbadan Sehat
                  </span>
                  <span className="text-xs font-medium text-slate-600 sm:hidden">
                    Sehat
                  </span>
                </>
              )}
            </label>

            {/* Upload foto lisensi — hanya tampil jika nama terisi */}
            {namaFilled && !readOnly && (
              <LisensiUploadButton
                petugas={p}
                index={i}
                onChange={(updated) => handlePetugasChange(i, updated)}
                formId={formId}
              />
            )}

            {/* Read-only: tampilkan foto jika ada */}
            {namaFilled && readOnly && p.fotoLisensi && (
              <div className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.fotoLisensi}
                  alt="Lisensi"
                  className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                />
              </div>
            )}

            {/* Indikator foto wajib */}
            {fotoMissing && !readOnly && (
              <span className="text-xs text-amber-600 font-medium shrink-0 hidden md:block">
                Wajib foto
              </span>
            )}
          </div>
        );
      })}

      {/* Hint tambah baris */}
      {visibleCount < 10 && !readOnly && (
        <p className="text-xs text-slate-400 text-center pt-1">
          Isi nama petugas {visibleCount} untuk menambah baris berikutnya
        </p>
      )}
    </div>
  );
}