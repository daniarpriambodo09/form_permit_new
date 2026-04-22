// components/EditableForms.tsx
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Camera, Upload, X, ZoomIn, CheckCircle, AlertCircle, Loader2, ImageIcon } from "lucide-react";

interface EditableFormsProps {
  formType: "hot-work" | "height-work" | "workshop";
  formData: any;
  onChange: (data: any) => void;
}

// ─────────────────────────────────────────────────────────────
// Sub-komponen: Image Preview Modal
// ─────────────────────────────────────────────────────────────
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm truncate pr-4">{label}</p>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
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

// ─────────────────────────────────────────────────────────────
// Sub-komponen: Tombol upload lisensi per baris petugas
// ─────────────────────────────────────────────────────────────
interface LisensiButtonProps {
  namaPetugas: string;
  index: number; // 1-based
  fotoUrl: string | null;
  formId?: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

function LisensiUploadButton({
  namaPetugas,
  index,
  fotoUrl,
  formId,
  onUploaded,
  onRemoved,
}: LisensiButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const doUpload = async (file: File) => {
    setUploadError("");

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Maks 5 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Hanya JPG/PNG/WebP");
      return;
    }

    setUploading(true);

    // Preview lokal langsung
    const reader = new FileReader();
    reader.onloadend = () => {
      onUploaded(reader.result as string); // tampilkan preview dulu
    };
    reader.readAsDataURL(file);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("index", String(index));
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
      onUploaded(url); // ganti dengan URL permanen
    } catch (err: any) {
      setUploadError(err.message || "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) doUpload(f);
    setShowOptions(false);
    e.target.value = "";
  };

  // ── Ada foto ───────────────────────────────────────────────
  if (fotoUrl) {
    return (
      <>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-orange-400 transition-colors group"
            title="Lihat foto lisensi"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoUrl} alt="Lisensi" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {uploading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
          {!uploading && !uploadError && <CheckCircle className="w-4 h-4 text-green-500" />}
          {uploadError && (
            <div title={uploadError}>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          )}

          <button
            type="button"
            onClick={onRemoved}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Hapus foto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {showPreview && (
          <ImagePreviewModal
            src={fotoUrl}
            label={`Lisensi — ${namaPetugas}`}
            onClose={() => setShowPreview(false)}
          />
        )}
      </>
    );
  }

  // ── Belum ada foto ─────────────────────────────────────────
  return (
    <div className="relative shrink-0">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          uploadError
            ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
            : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-400"
        }`}
        title={uploadError || "Upload foto lisensi"}
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ImageIcon className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">{uploadError ? "Coba lagi" : "Foto Lisensi"}</span>
      </button>

      {uploadError && (
        <p className="absolute top-full mt-1 right-0 text-xs text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1 whitespace-nowrap z-10 shadow">
          {uploadError}
        </p>
      )}

      {showOptions && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            <button
              type="button"
              onClick={() => { setShowOptions(false); camRef.current?.click(); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Camera className="w-4 h-4 text-orange-500" />
              Ambil Foto
            </button>
            <div className="border-t border-slate-100" />
            <button
              type="button"
              onClick={() => { setShowOptions(false); fileRef.current?.click(); }}
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

// ─────────────────────────────────────────────────────────────
// Komponen utama
// ─────────────────────────────────────────────────────────────
export default function EditableForms({ formType, formData, onChange }: EditableFormsProps) {
  const [localData, setLocalData] = useState(formData);

  useEffect(() => {
    setLocalData(formData);
  }, [formData]);

  const handleLocalChange = useCallback((field: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: string, value: any) => {
    const newData = { ...localData, [field]: value };
    onChange(newData);
  }, [localData, onChange]);

  const handleToggle = useCallback((field: string, value: boolean) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onChange(newData);
  }, [localData, onChange]);

  // Helper update foto lisensi
  const handleFotoUploaded = useCallback((index: number, url: string) => {
    const key = `foto_lisensi_${index}`;
    const newData = { ...localData, [key]: url };
    setLocalData(newData);
    onChange(newData);
  }, [localData, onChange]);

  const handleFotoRemoved = useCallback((index: number) => {
    const key = `foto_lisensi_${index}`;
    const newData = { ...localData, [key]: null };
    setLocalData(newData);
    onChange(newData);
  }, [localData, onChange]);

  // ── HEIGHT WORK FORM ──────────────────────────────────────
  if (formType === "height-work") {
    // Hitung berapa baris petugas yang ditampilkan (minimal 1, tambah jika baris sebelumnya terisi)
    const visiblePetugasCount = (() => {
      let count = 1;
      for (let i = 1; i <= 9; i++) {
        if (localData[`nama_petugas_${i}`]?.trim()) count = i + 1;
      }
      return Math.min(count, 10);
    })();

    return (
      <div className="space-y-4">
        {/* Bagian 1: Informasi Dasar */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 1: Informasi Pekerjaan</h4>

          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipe Petugas Ketinggian</label>
            <select
              value={localData.petugas_ketinggian || "Internal / Karyawan PT.JAI"}
              onChange={(e) => handleLocalChange("petugas_ketinggian", e.target.value)}
              onBlur={(e) => handleBlur("petugas_ketinggian", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black"
            >
              <option value="Internal / Karyawan PT.JAI">Internal / Karyawan PT.JAI</option>
              <option value="Eksternal / Subkontraktor">Eksternal / Subkontraktor</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi Pekerjaan</label>
            <textarea
              value={localData.deskripsi_pekerjaan || ""}
              onChange={(e) => handleLocalChange("deskripsi_pekerjaan", e.target.value)}
              onBlur={(e) => handleBlur("deskripsi_pekerjaan", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Lokasi</label>
            <input
              type="text"
              value={localData.lokasi || ""}
              onChange={(e) => handleLocalChange("lokasi", e.target.value)}
              onBlur={(e) => handleBlur("lokasi", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Pelaksanaan</label>
              <input
                type="date"
                value={localData.tanggal_pelaksanaan ? new Date(localData.tanggal_pelaksanaan).toISOString().split("T")[0] : ""}
                onChange={(e) => handleLocalChange("tanggal_pelaksanaan", e.target.value)}
                onBlur={(e) => handleBlur("tanggal_pelaksanaan", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama Pengawas Kontraktor</label>
              <input
                type="text"
                value={localData.nama_pengawas_kontraktor || ""}
                onChange={(e) => handleLocalChange("nama_pengawas_kontraktor", e.target.value)}
                onBlur={(e) => handleBlur("nama_pengawas_kontraktor", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
              />
            </div>
          </div>

          <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama Pengawas Departemen</label>
              <input
                type="text"
                value={localData.nama_pengawas_departemen || ""}
                onChange={(e) => handleLocalChange("nama_pengawas_departemen", e.target.value)}
                onBlur={(e) => handleBlur("nama_pengawas_departemen", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                placeholder="Nama Pengawas Departemen"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama Departemen</label>
              <input
                type="text"
                value={localData.nama_departemen || ""}
                onChange={(e) => handleLocalChange("nama_departemen", e.target.value)}
                onBlur={(e) => handleBlur("nama_departemen", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 text-black"
                placeholder="Nama Departemen"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Mulai</label>
              <input
                type="time"
                value={localData.waktu_mulai || ""}
                onChange={(e) => handleLocalChange("waktu_mulai", e.target.value)}
                onBlur={(e) => handleBlur("waktu_mulai", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Selesai</label>
              <input
                type="time"
                value={localData.waktu_selesai || ""}
                onChange={(e) => handleLocalChange("waktu_selesai", e.target.value)}
                onBlur={(e) => handleBlur("waktu_selesai", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black"
              />
            </div>
          </div>
        </div>

        {/* Bagian 2: Daftar Petugas + Upload Foto Lisensi */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-1 text-sm">
            Bagian 2: Nama Petugas Ketinggian & Status Kesehatan
          </h4>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            <p className="text-xs text-amber-700">
              ⚠️ Setiap petugas yang namanya terisi <strong>wajib</strong> melampirkan foto lisensi ketinggian.
              Tombol upload akan muncul otomatis ketika nama petugas diisi.
            </p>
          </div>

          <div className="space-y-2.5">
            {Array.from({ length: visiblePetugasCount }).map((_, i) => {
              const idx = i + 1; // 1-based
              const namaKey = `nama_petugas_${idx}`;
              const sehatKey = `petugas_${idx}_sehat`;
              const fotoKey = `foto_lisensi_${idx}`;
              const namaValue: string = localData[namaKey] || "";
              const sehatValue: boolean = localData[sehatKey] || false;
              const fotoValue: string | null = localData[fotoKey] || null;
              const namaFilled = !!namaValue.trim();
              const fotoMissing = namaFilled && !fotoValue;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all ${
                    fotoMissing
                      ? "bg-amber-50 border-amber-200"
                      : namaFilled
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {/* Nomor */}
                  <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">{idx}</span>

                  {/* Input nama */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder={`Nama Petugas ${idx}`}
                      value={namaValue}
                      onChange={(e) => handleLocalChange(namaKey, e.target.value)}
                      onBlur={(e) => handleBlur(namaKey, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white placeholder-slate-400 transition"
                    />
                  </div>

                  {/* Checkbox berbadan sehat */}
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={sehatValue}
                      onChange={(e) => handleToggle(sehatKey, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-xs font-medium text-slate-600 hidden sm:inline">Berbadan Sehat</span>
                    <span className="text-xs font-medium text-slate-600 sm:hidden">Sehat</span>
                  </label>

                  {/* Upload foto lisensi — hanya muncul jika nama terisi */}
                  {namaFilled && (
                    <LisensiUploadButton
                      namaPetugas={namaValue}
                      index={idx}
                      fotoUrl={fotoValue}
                      formId={localData.id_form}
                      onUploaded={(url) => handleFotoUploaded(idx, url)}
                      onRemoved={() => handleFotoRemoved(idx)}
                    />
                  )}

                  {/* Badge "Wajib foto" jika nama terisi tapi belum ada foto */}
                  {fotoMissing && (
                    <span className="text-xs text-amber-600 font-medium shrink-0 hidden lg:block">
                      Wajib foto
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {visiblePetugasCount < 10 && (
            <p className="text-xs text-slate-400 text-center mt-3">
              Isi nama petugas {visiblePetugasCount} untuk menambah baris berikutnya
            </p>
          )}
        </div>

        {/* Bagian 3: Peminjaman APD */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 3: Peminjaman APD</h4>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localData.ada_kunci_pagar || false}
                onChange={(e) => handleToggle("ada_kunci_pagar", e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Kunci Pagar Tangga Listrik</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localData.ada_rompi_ketinggian || false}
                onChange={(e) => handleToggle("ada_rompi_ketinggian", e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Rompi Ketinggian</span>
            </label>

            {localData.ada_rompi_ketinggian && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">No. Rompi</label>
                <input
                  type="text"
                  value={localData.no_rompi || ""}
                  onChange={(e) => handleLocalChange("no_rompi", e.target.value)}
                  onBlur={(e) => handleBlur("no_rompi", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black"
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localData.ada_safety_helmet || false}
                onChange={(e) => handleToggle("ada_safety_helmet", e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Safety Helmet</span>
            </label>

            {localData.ada_safety_helmet && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah Safety Helmet</label>
                <input
                  type="number"
                  value={localData.jumlah_safety_helmet || ""}
                  onChange={(e) => handleLocalChange("jumlah_safety_helmet", e.target.value)}
                  onBlur={(e) => handleBlur("jumlah_safety_helmet", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black"
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localData.ada_full_body_harmess || false}
                onChange={(e) => handleToggle("ada_full_body_harmess", e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Full Body Harness</span>
            </label>

            {localData.ada_full_body_harmess && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah Full Body Harness</label>
                <input
                  type="number"
                  value={localData.jumlah_full_body_harness || ""}
                  onChange={(e) => handleLocalChange("jumlah_full_body_harness", e.target.value)}
                  onBlur={(e) => handleBlur("jumlah_full_body_harness", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bagian 4: Keselamatan Kerja */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 4: Keselamatan Kerja Ketinggian</h4>

          <div className="space-y-2">
            {[
              { key: "area_diperiksa_aman", label: "Area kerja telah diperiksa dan aman" },
              { key: "paham_cara_menggunakan_alat_pemadam_kebakaran", label: "Paham cara menggunakan alat pemadam kebakaran" },
              { key: "ada_kerja_listrik", label: "Ada pekerjaan listrik" },
              { key: "prosedur_loto", label: "Prosedur LOTO" },
              { key: "menutupi_area_bawah_prisai", label: "Menutupi area bawah prisai" },
              { key: "safetyline_tersedia", label: "Safety line tersedia" },
              { key: "alat_bantu_kerja_aman", label: "Alat bantu kerja aman" },
              { key: "menggunakan_rompi", label: "Menggunakan rompi" },
              { key: "beban_tidak_5kg", label: "Beban tidak lebih dari 5kg" },
              { key: "helm_sesuai_sop", label: "Helm sesuai SOP" },
              { key: "rambu2_tersedia", label: "Rambu-rambu tersedia" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input
                  type="checkbox"
                  checked={localData[key] || false}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bagian 5: Pengecekan Body Harness */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 5: Pengecekan Body Harness</h4>

          <h5 className="text-xs font-semibold text-slate-600 mb-2">Body Harness</h5>
          <div className="space-y-2 mb-4">
            {[
              { key: "webbing_kondisi_baik", label: "Webbing - Kondisi jahitan baik" },
              { key: "dring_kondisi_baik", label: "D-Ring - Kondisi baik" },
              { key: "gesper_kondisi_baik", label: "Gesper - Kondisi baik" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input
                  type="checkbox"
                  checked={localData[key] || false}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          <h5 className="text-xs font-semibold text-slate-600 mb-2">Lanyard</h5>
          <div className="space-y-2">
            {[
              { key: "absorter_dan_timbes_kondisi_baik", label: "Absorber dan Timbes - Kondisi baik" },
              { key: "snap_hook_kondisi_baik", label: "Snap Hook - Kondisi baik" },
              { key: "rope_lanyard_kondisi_baik", label: "Rope Lanyard - Kondisi baik" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input
                  type="checkbox"
                  checked={localData[key] || false}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bagian 6: Persetujuan - DISABLED */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 6: Persetujuan</h4>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700">
              <strong>Info:</strong> Field persetujuan hanya dapat diisi oleh approver dan tidak dapat diedit oleh pekerja.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">SPV Terkait</label>
              <input type="text" value={localData.spv_terkait || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama Kontraktor</label>
              <input type="text" value={localData.nama_kontraktor || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">SFO</label>
              <input type="text" value={localData.sfo || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">MR / PGA MGR</label>
              <input type="text" value={localData.mr_pga_mgr || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── HOT WORK FORM ──────────────────────────────────────
  if (formType === "hot-work") {
    return (
      <div className="space-y-4">
        {/* Bagian 1: Informasi Registrasi */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 1: Informasi Registrasi</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">No. Registrasi</label>
              <input type="text" value={localData.no_registrasi || ""} onChange={(e) => handleLocalChange("no_registrasi", e.target.value)} onBlur={(e) => handleBlur("no_registrasi", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Pelaksanaan</label>
              <input type="date" value={localData.tanggal_pelaksanaan ? new Date(localData.tanggal_pelaksanaan).toISOString().split("T")[0] : ""} onChange={(e) => handleLocalChange("tanggal_pelaksanaan", e.target.value)} onBlur={(e) => handleBlur("tanggal_pelaksanaan", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Kontraktor / NIK</label>
            <input type="text" value={localData.nama_kontraktor_nik || ""} onChange={(e) => handleLocalChange("nama_kontraktor_nik", e.target.value)} onBlur={(e) => handleBlur("nama_kontraktor_nik", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Pekerja / NIK</label>
            <input type="text" value={localData.nama_pekerja_nik || ""} onChange={(e) => handleLocalChange("nama_pekerja_nik", e.target.value)} onBlur={(e) => handleBlur("nama_pekerja_nik", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lokasi Pekerjaan</label>
              <input type="text" value={localData.lokasi_pekerjaan || ""} onChange={(e) => handleLocalChange("lokasi_pekerjaan", e.target.value)} onBlur={(e) => handleBlur("lokasi_pekerjaan", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Pukul</label>
              <input type="time" value={localData.waktu_pukul || ""} onChange={(e) => handleLocalChange("waktu_pukul", e.target.value)} onBlur={(e) => handleBlur("waktu_pukul", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama Fire Watch</label>
              <input type="text" value={localData.nama_fire_watch || ""} onChange={(e) => handleLocalChange("nama_fire_watch", e.target.value)} onBlur={(e) => handleBlur("nama_fire_watch", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">NIK Fire Watch</label>
              <input type="text" value={localData.nik_fire_watch || ""} onChange={(e) => handleLocalChange("nik_fire_watch", e.target.value)} onBlur={(e) => handleBlur("nik_fire_watch", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Jabatan Pemberi Izin</label>
              <input type="text" value={localData.jabatan_pemberi_izin || ""} onChange={(e) => handleLocalChange("jabatan_pemberi_izin", e.target.value)} onBlur={(e) => handleBlur("jabatan_pemberi_izin", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">NIK Pemberi Izin</label>
              <input type="text" value={localData.nik_pemberi_ijin || ""} onChange={(e) => handleLocalChange("nik_pemberi_ijin", e.target.value)} onBlur={(e) => handleBlur("nik_pemberi_ijin", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>
        </div>

        {/* Bagian 2: Jenis Pekerjaan */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 2: Jenis Pekerjaan</h4>

          <div className="space-y-2 mb-4">
            {[
              { key: "preventive_genset_pump_room", label: "Preventive Genset / Pump Room" },
              { key: "tangki_solar", label: "Tangki Solar" },
              { key: "panel_listrik", label: "Panel Listrik" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input type="checkbox" checked={localData[key] || false} onChange={(e) => handleToggle(key, e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-slate-300" />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          {(["cutting", "grinding", "welding", "painting"] as const).map((type) => (
            <div key={type} className="mb-4 p-3 bg-slate-50 rounded-lg">
              <h5 className="text-xs font-semibold text-slate-600 mb-2 capitalize">{type}</h5>
              <div className="mb-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Detail</label>
                <textarea value={localData[`detail_${type}`] || ""} onChange={(e) => handleLocalChange(`detail_${type}`, e.target.value)} onBlur={(e) => handleBlur(`detail_${type}`, e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Mulai</label>
                  <input type="time" value={localData[`t_mulai_${type}`] || ""} onChange={(e) => handleLocalChange(`t_mulai_${type}`, e.target.value)} onBlur={(e) => handleBlur(`t_mulai_${type}`, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Selesai</label>
                  <input type="time" value={localData[`t_selesai_${type}`] || ""} onChange={(e) => handleLocalChange(`t_selesai_${type}`, e.target.value)} onBlur={(e) => handleBlur(`t_selesai_${type}`, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bagian 3: Pencegahan */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 3: Upaya Pencegahan</h4>

          <div className="space-y-2">
            {[
              { key: "kondisi_tools_baik", label: "Equipment/Tools kondisi baik" },
              { key: "tersedia_apar_hydrant", label: "Tersedia APAR dan Hydrant" },
              { key: "sensor_smoke_detector_non_aktif", label: "Sensor smoke detector non-aktif" },
              { key: "apd_lengkap", label: "APD lengkap" },
              { key: "tidak_ada_cairan_mudah_terbakar", label: "Tidak ada cairan mudah terbakar" },
              { key: "lantai_bersih", label: "Lantai bersih" },
              { key: "lantai_sudah_dibasahi", label: "Lantai sudah dibasahi" },
              { key: "cairan_mudah_tebakar_tertutup", label: "Cairan mudah terbakar tertutup" },
              { key: "lembaran_dibawah_pekerjaan", label: "Lembaran dibawah pekerjaan" },
              { key: "lindungi_conveyor_dll", label: "Lindungi conveyor dll" },
              { key: "alat_telah_bersih", label: "Alat telah bersih" },
              { key: "uap_menyala_telah_dibuang", label: "Uap menyala telah dibuang" },
              { key: "kerja_pada_dinding_lagit", label: "Kerja pada dinding langit" },
              { key: "bahan_mudah_terbakar_dipindahkan_dari_dinding", label: "Bahan mudah terbakar dipindahkan dari dinding" },
              { key: "fire_watch_memastikan_area_aman", label: "Fire watch memastikan area aman" },
              { key: "firwatch_terlatih", label: "Firewatch terlatih" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input type="checkbox" checked={localData[key] || false} onChange={(e) => handleToggle(key, e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-slate-300" />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah Fire Blanket</label>
            <input type="number" value={localData.jumlah_fire_blanket || ""} onChange={(e) => handleLocalChange("jumlah_fire_blanket", e.target.value)} onBlur={(e) => handleBlur("jumlah_fire_blanket", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Permintaan Tambahan</label>
            <textarea value={localData.permintaan_tambahan || ""} onChange={(e) => handleLocalChange("permintaan_tambahan", e.target.value)} onBlur={(e) => handleBlur("permintaan_tambahan", e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
          </div>
        </div>

        {/* Bagian 4: Persetujuan - DISABLED */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 4: Persetujuan</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700"><strong>Info:</strong> Field persetujuan hanya dapat diisi oleh approver.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">SPV Terkait</label><input type="text" value={localData.spv_terkait || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Kontraktor</label><input type="text" value={localData.kontraktor || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">SFO</label><input type="text" value={localData.sfo || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">PGA / Dept Head</label><input type="text" value={localData.pga || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
          </div>
        </div>
      </div>
    );
  }

  // ── WORKSHOP FORM ──────────────────────────────────────
  if (formType === "workshop") {
    return (
      <div className="space-y-4">
        {/* Bagian 1: Informasi Registrasi */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 1: Informasi Registrasi</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">No. Registrasi</label>
              <input type="text" value={localData.no_registrasi || ""} onChange={(e) => handleLocalChange("no_registrasi", e.target.value)} onBlur={(e) => handleBlur("no_registrasi", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Pelaksanaan</label>
              <input type="date" value={localData.tanggal_pelaksanaan ? new Date(localData.tanggal_pelaksanaan).toISOString().split("T")[0] : ""} onChange={(e) => handleLocalChange("tanggal_pelaksanaan", e.target.value)} onBlur={(e) => handleBlur("tanggal_pelaksanaan", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Kontraktor / NIK</label>
            <input type="text" value={localData.nama_kontraktor_nik || ""} onChange={(e) => handleLocalChange("nama_kontraktor_nik", e.target.value)} onBlur={(e) => handleBlur("nama_kontraktor_nik", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Pekerja / NIK</label>
            <input type="text" value={localData.nama_pekerja_nik || ""} onChange={(e) => handleLocalChange("nama_pekerja_nik", e.target.value)} onBlur={(e) => handleBlur("nama_pekerja_nik", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lokasi Pekerjaan</label>
              <input type="text" value={localData.lokasi_pekerjaan || ""} onChange={(e) => handleLocalChange("lokasi_pekerjaan", e.target.value)} onBlur={(e) => handleBlur("lokasi_pekerjaan", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Pukul</label>
              <input type="time" value={localData.waktu_pukul || ""} onChange={(e) => handleLocalChange("waktu_pukul", e.target.value)} onBlur={(e) => handleBlur("waktu_pukul", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama Fire Watch</label>
              <input type="text" value={localData.nama_fire_watch || ""} onChange={(e) => handleLocalChange("nama_fire_watch", e.target.value)} onBlur={(e) => handleBlur("nama_fire_watch", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">NIK Fire Watch</label>
              <input type="text" value={localData.nik_fire_watch || ""} onChange={(e) => handleLocalChange("nik_fire_watch", e.target.value)} onBlur={(e) => handleBlur("nik_fire_watch", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Jabatan Pemberi Izin</label>
              <input type="text" value={localData.jabatan_pemberi_izin || ""} onChange={(e) => handleLocalChange("jabatan_pemberi_izin", e.target.value)} onBlur={(e) => handleBlur("jabatan_pemberi_izin", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">NIK Pemberi Izin</label>
              <input type="text" value={localData.nik_pemberi_ijin || ""} onChange={(e) => handleLocalChange("nik_pemberi_ijin", e.target.value)} onBlur={(e) => handleBlur("nik_pemberi_ijin", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
          </div>
        </div>

        {/* Bagian 2: Jenis Pekerjaan */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 2: Jenis Pekerjaan</h4>

          <div className="space-y-2 mb-4">
            {[
              { key: "preventive_genset_pump_room", label: "Preventive Genset / Pump Room" },
              { key: "tangki_solar", label: "Tangki Solar" },
              { key: "panel_listrik", label: "Panel Listrik" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input type="checkbox" checked={localData[key] || false} onChange={(e) => handleToggle(key, e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-slate-300" />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          {(["cutting", "grinding", "welding"] as const).map((type) => (
            <div key={type} className="mb-4 p-3 bg-slate-50 rounded-lg">
              <h5 className="text-xs font-semibold text-slate-600 mb-2 capitalize">{type}</h5>
              <div className="mb-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Detail</label>
                <textarea value={localData[`detail_${type}`] || ""} onChange={(e) => handleLocalChange(`detail_${type}`, e.target.value)} onBlur={(e) => handleBlur(`detail_${type}`, e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Mulai</label>
                  <input type="time" value={localData[`t_mulai_${type}`] || ""} onChange={(e) => handleLocalChange(`t_mulai_${type}`, e.target.value)} onBlur={(e) => handleBlur(`t_mulai_${type}`, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Selesai</label>
                  <input type="time" value={localData[`t_selesai_${type}`] || ""} onChange={(e) => handleLocalChange(`t_selesai_${type}`, e.target.value)} onBlur={(e) => handleBlur(`t_selesai_${type}`, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
                </div>
              </div>
            </div>
          ))}

          {/* Painting - dengan Spray / Non Spray khusus workshop */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <h5 className="text-xs font-semibold text-slate-600 mb-2">Painting</h5>
            <div className="mb-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Detail</label>
              <textarea value={localData.detail_painting || ""} onChange={(e) => handleLocalChange("detail_painting", e.target.value)} onBlur={(e) => handleBlur("detail_painting", e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Mulai</label>
                <input type="time" value={localData.t_mulai_painting || ""} onChange={(e) => handleLocalChange("t_mulai_painting", e.target.value)} onBlur={(e) => handleBlur("t_mulai_painting", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Selesai</label>
                <input type="time" value={localData.t_selesai_painting || ""} onChange={(e) => handleLocalChange("t_selesai_painting", e.target.value)} onBlur={(e) => handleBlur("t_selesai_painting", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localData.painting_spray || false} onChange={(e) => handleToggle("painting_spray", e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-slate-300" />
                <span className="text-sm text-slate-700">Spray</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localData.painting_non_spray || false} onChange={(e) => handleToggle("painting_non_spray", e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-slate-300" />
                <span className="text-sm text-slate-700">Non Spray</span>
              </label>
            </div>
          </div>
        </div>

        {/* Bagian 3: Pencegahan */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 3: Upaya Pencegahan</h4>

          <div className="space-y-2">
            {[
              { key: "kondisi_tools_baik", label: "Equipment/Tools kondisi baik" },
              { key: "tersedia_apar_hydrant", label: "Tersedia APAR dan Hydrant" },
              { key: "sensor_smoke_detector_non_aktif", label: "Sensor smoke detector non-aktif" },
              { key: "apd_lengkap", label: "APD lengkap" },
              { key: "tidak_ada_cairan_mudah_terbakar", label: "Tidak ada cairan mudah terbakar" },
              { key: "lantai_bersih", label: "Lantai bersih" },
              { key: "lantai_sudah_dibasahi", label: "Lantai sudah dibasahi" },
              { key: "cairan_mudah_tebakar_tertutup", label: "Cairan mudah terbakar tertutup" },
              { key: "lembaran_dibawah_pekerjaan", label: "Lembaran dibawah pekerjaan" },
              { key: "lindungi_conveyor_dll", label: "Lindungi conveyor dll" },
              { key: "alat_telah_bersih", label: "Alat telah bersih" },
              { key: "uap_menyala_telah_dibuang", label: "Uap menyala telah dibuang" },
              { key: "kerja_pada_dinding_lagit", label: "Kerja pada dinding langit" },
              { key: "bahan_mudah_terbakar_dipindahkan_dari_dinding", label: "Bahan mudah terbakar dipindahkan dari dinding" },
              { key: "fire_watch_memastikan_area_aman", label: "Fire watch memastikan area aman" },
              { key: "firwatch_terlatih", label: "Firewatch terlatih" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input type="checkbox" checked={localData[key] || false} onChange={(e) => handleToggle(key, e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-slate-300" />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Permintaan Tambahan</label>
            <textarea value={localData.permintaan_tambahan || ""} onChange={(e) => handleLocalChange("permintaan_tambahan", e.target.value)} onBlur={(e) => handleBlur("permintaan_tambahan", e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black" />
          </div>
        </div>

        {/* Bagian 4: Persetujuan - DISABLED */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-slate-800 mb-3 text-sm">Bagian 4: Persetujuan</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700"><strong>Info:</strong> Field persetujuan hanya dapat diisi oleh approver.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">SPV Terkait</label><input type="text" value={localData.spv_terkait || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Kontraktor</label><input type="text" value={localData.kontraktor || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">SFO</label><input type="text" value={localData.sfo || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">PGA</label><input type="text" value={localData.pga || ""} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-100 cursor-not-allowed" /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8 text-slate-500">
      Form editing untuk {formType} tidak tersedia.
    </div>
  );
}