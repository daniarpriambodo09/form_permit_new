// app/master-lisence/page.tsx
// Master Lisence Pekerja — hanya role 'admin'.
//
// TAMBAHAN (revisi ke-4): tombol Hapus di kolom Aksi.
// - Klik tombol Hapus → muncul dropdown jenis kerja (pola sama seperti
//   Lihat/Edit). Pilih salah satu jenis kerja untuk menghapus HANYA
//   lisence itu, atau pilih "Hapus Semua Lisence" (muncul kalau pekerja
//   punya >1 jenis kerja) untuk menghapus seluruh baris pekerja tsb.
// - Kedua aksi memunculkan modal konfirmasi dulu sebelum benar-benar
//   menghapus (tindakan destruktif, tidak bisa dibatalkan).
// - "Hapus semua" memanggil DELETE /api/master-lisence/{id} untuk tiap
//   lisence milik pekerja tsb (tidak perlu endpoint baru).
"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Shield, Plus, Search, Eye, Pencil, Trash2, X, Loader2,
  CheckCircle, AlertCircle, Flame, AlertTriangle, FileText,
  Upload, BadgeCheck, CalendarClock, Check,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
type JenisKerja = "hot_work" | "height_work" | "workshop";
type FileType = "pdf" | "image";

interface LisenceItem {
  id: number;
  nama: string;
  nik: string;
  jenis_kerja: JenisKerja;
  departemen: string | null;
  file_url: string;
  file_type: FileType;
  file_name: string | null;
  tanggal_exp: string; // ISO date (yyyy-mm-dd)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkerGroup {
  key: string; // nik
  nama: string;
  nik: string;
  licenses: LisenceItem[];
}

type ExpStatus = "expired" | "soon" | "active";
type PickerMode = "view" | "edit" | "delete";

const JENIS_KERJA_META: Record<JenisKerja, { label: string; icon: React.ElementType; badge: string; dot: string }> = {
  hot_work:    { label: "Hot Work",    icon: Flame,         badge: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  height_work: { label: "Height Work", icon: AlertTriangle, badge: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  workshop:    { label: "Workshop",    icon: FileText,      badge: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500" },
};

const JENIS_KERJA_OPTIONS: { value: JenisKerja; label: string }[] = [
  { value: "hot_work", label: "Hot Work (Izin Kerja Panas)" },
  { value: "height_work", label: "Height Work (Izin Kerja Ketinggian)" },
  { value: "workshop", label: "Workshop (Izin Kerja Workshop)" },
];

// Daftar departemen — HARUS SINKRON dengan DEPT_SPV_MAP di
// app/form/height-work/page.tsx (nama departemennya, bukan daftar SPV-nya).
// Kalau menambah/mengubah departemen di salah satu file, update juga yang satunya.
const DEPARTEMEN_OPTIONS = ["QA", "ENG", "MTC", "PRODUKSI", "NYS", "FATP-Exim", "MPC-WHS", "PGA"];

// ── Helpers ───────────────────────────────────────────────────────────────
function getExpStatus(tanggalExp: string): ExpStatus {
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

const EXP_BADGE: Record<ExpStatus, { label: string; cls: string; dot: string }> = {
  expired: { label: "Kadaluarsa", cls: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  soon:    { label: "Segera Habis", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  active:  { label: "Aktif", cls: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
};

// ── Toast ─────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface Toast { type: ToastType; message: string }

function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[110] flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl
        text-white text-sm font-medium transition-all
        ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
    >
      {toast.type === "success"
        ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
      {toast.message}
    </div>
  );
}

// ── File upload button (dipakai di modal Tambah & Edit) ────────────────────
interface FileUploadFieldProps {
  fileUrl: string | null;
  fileType: FileType | null;
  fileName: string | null;
  uploading: boolean;
  error: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

function FileUploadField({ fileUrl, fileType, fileName, uploading, error, onUpload, onRemove }: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(f);
    e.target.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      {fileUrl ? (
        <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
          {fileType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt="Lisence" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
          ) : (
            <div className="w-12 h-12 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{fileName || "File lisence"}</p>
            <p className="text-xs text-slate-400">{fileType === "pdf" ? "Dokumen PDF" : "Foto lisence"}</p>
          </div>
          {uploading
            ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin shrink-0" />
            : (
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50">
                  Ganti
                </button>
                <button type="button" onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50 rounded-xl transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Upload className="w-6 h-6 text-slate-400" />}
          <span className="text-sm font-medium text-slate-600">
            {uploading ? "Mengupload..." : "Klik untuk upload file lisence"}
          </span>
          <span className="text-xs text-slate-400">PDF, JPG, PNG, atau WebP — maks 5 MB</span>
        </button>
      )}
      {error && (
        <p className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

// ── Modal Tambah Lisence (multi jenis kerja per pekerja) ───────────────────
interface AddModalProps {
  onClose: () => void;
  onItemAdded: (item: LisenceItem) => void;
}

function AddLisenceModal({ onClose, onItemAdded }: AddModalProps) {
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [departemen, setDepartemen] = useState("");
  const [locked, setLocked] = useState(false); // nama, nik & departemen dikunci setelah lisence pertama tersimpan
  const [addedJenis, setAddedJenis] = useState<JenisKerja[]>([]);

  const remainingOptions = useMemo(
    () => JENIS_KERJA_OPTIONS.filter((o) => !addedJenis.includes(o.value)),
    [addedJenis]
  );

  const [jenisKerja, setJenisKerja] = useState<JenisKerja>(JENIS_KERJA_OPTIONS[0].value);
  const [tanggalExp, setTanggalExp] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const allDone = remainingOptions.length === 0;

  const handleUpload = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/form-permit/api/upload/master-lisence", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      setFileUrl(data.url);
      setFileType(data.fileType);
      setFileName(data.fileName || file.name);
    } catch (err: any) {
      setUploadError(err.message || "Upload gagal, coba lagi");
    } finally {
      setUploading(false);
    }
  };

  const handleAddEntry = async () => {
    setError("");
    setSuccessMsg("");
    if (!nama.trim())       { setError("Nama pekerja wajib diisi."); return; }
    if (!nik.trim())        { setError("NIK wajib diisi."); return; }
    if (!departemen.trim()) { setError("Departemen wajib dipilih."); return; }
    if (!fileUrl)           { setError("File lisence wajib diupload."); return; }
    if (!tanggalExp)        { setError("Tanggal exp lisence wajib diisi."); return; }

    setSaving(true);
    try {
      const res = await fetch("/form-permit/api/master-lisence", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          nik: nik.trim(),
          departemen,
          jenisKerja,
          fileUrl,
          fileType,
          fileName,
          tanggalExp,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menyimpan data lisence."); return; }

      onItemAdded(data.data);

      const newAddedJenis = [...addedJenis, jenisKerja];
      setAddedJenis(newAddedJenis);
      setLocked(true);
      setSuccessMsg(`Lisence ${JENIS_KERJA_META[jenisKerja].label} berhasil ditambahkan.`);

      // Reset field khusus per-entry, siap untuk jenis kerja berikutnya
      setFileUrl(null); setFileType(null); setFileName(null);
      setTanggalExp("");
      const next = JENIS_KERJA_OPTIONS.find((o) => !newAddedJenis.includes(o.value));
      if (next) setJenisKerja(next.value);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tambah Lisence Pekerja</h2>
            <p className="text-xs text-slate-500 mt-0.5">Isi nama & NIK sekali, lalu tambahkan lisence per jenis kerja.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{successMsg}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Pekerja <span className="text-red-500">*</span></label>
              <input
                type="text" value={nama} disabled={locked}
                onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap pekerja"
                className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${locked ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">NIK <span className="text-red-500">*</span></label>
              <input
                type="text" value={nik} disabled={locked}
                onChange={(e) => setNik(e.target.value)} placeholder="Nomor Induk Karyawan"
                className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${locked ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Departemen <span className="text-red-500">*</span></label>
            <select
              value={departemen} disabled={locked}
              onChange={(e) => setDepartemen(e.target.value)}
              className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${locked ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "text-slate-900"} ${!departemen ? "text-slate-400" : ""}`}
            >
              <option value="" disabled>— Pilih Departemen —</option>
              {DEPARTEMEN_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>

          {locked && (
            <p className="text-xs text-slate-400 -mt-3">Nama, NIK & Departemen dikunci supaya setiap lisence yang ditambahkan tetap tercatat untuk pekerja yang sama.</p>
          )}

          {/* Progress checklist jenis kerja */}
          <div className="flex flex-wrap gap-2">
            {JENIS_KERJA_OPTIONS.map((opt) => {
              const meta = JENIS_KERJA_META[opt.value];
              const Icon = meta.icon;
              const done = addedJenis.includes(opt.value);
              return (
                <span
                  key={opt.value}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                    done ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {meta.label}
                </span>
              );
            })}
          </div>

          {allDone ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <BadgeCheck className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-blue-800">Semua jenis kerja sudah ditambahkan untuk pekerja ini.</p>
              <p className="text-xs text-blue-600 mt-0.5">Klik "Selesai" untuk menutup, atau tutup dan buka lagi untuk pekerja lain.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Kerja <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 gap-2">
                  {remainingOptions.map((opt) => {
                    const meta = JENIS_KERJA_META[opt.value];
                    const Icon = meta.icon;
                    return (
                      <label key={opt.value}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${jenisKerja === opt.value ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-200"}`}>
                        <input type="radio" name="jenisKerja" value={opt.value} checked={jenisKerja === opt.value}
                          onChange={() => setJenisKerja(opt.value)} className="text-orange-500" />
                        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Exp Lisence <span className="text-red-500">*</span></label>
                <input type="date" value={tanggalExp} onChange={(e) => setTanggalExp(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  File Lisence — {JENIS_KERJA_META[jenisKerja].label} <span className="text-red-500">*</span>
                </label>
                <FileUploadField
                  fileUrl={fileUrl} fileType={fileType} fileName={fileName}
                  uploading={uploading} error={uploadError}
                  onUpload={handleUpload}
                  onRemove={() => { setFileUrl(null); setFileType(null); setFileName(null); }}
                />
              </div>

              <button
                onClick={handleAddEntry}
                disabled={saving || uploading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tambah Jenis Kerja Ini
              </button>
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition-colors">
            <CheckCircle className="w-4 h-4" /> Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Edit Lisence ───────────────────────────────────────────────────
interface EditModalProps {
  item: LisenceItem;
  onClose: () => void;
  onSuccess: (item: LisenceItem) => void;
}

function EditLisenceModal({ item, onClose, onSuccess }: EditModalProps) {
  const [nama, setNama] = useState(item.nama);
  const [nik, setNik] = useState(item.nik);
  const [departemen, setDepartemen] = useState(item.departemen ?? "");
  const [tanggalExp, setTanggalExp] = useState(item.tanggal_exp.slice(0, 10));
  const [fileUrl, setFileUrl] = useState<string | null>(item.file_url);
  const [fileType, setFileType] = useState<FileType | null>(item.file_type);
  const [fileName, setFileName] = useState<string | null>(item.file_name);
  const [fileChanged, setFileChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const meta = JENIS_KERJA_META[item.jenis_kerja];
  const MetaIcon = meta.icon;

  const handleUpload = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/form-permit/api/upload/master-lisence", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      setFileUrl(data.url);
      setFileType(data.fileType);
      setFileName(data.fileName || file.name);
      setFileChanged(true);
    } catch (err: any) {
      setUploadError(err.message || "Upload gagal, coba lagi");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!nama.trim())       { setError("Nama pekerja wajib diisi."); return; }
    if (!nik.trim())        { setError("NIK wajib diisi."); return; }
    if (!departemen.trim()) { setError("Departemen wajib dipilih."); return; }
    if (!tanggalExp)        { setError("Tanggal exp lisence wajib diisi."); return; }
    if (!fileUrl)           { setError("File lisence wajib ada."); return; }

    setSaving(true);
    try {
      const res = await fetch(`/form-permit/api/master-lisence/${item.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          nik: nik.trim(),
          departemen,
          tanggalExp,
          // Hanya kirim data file jika memang diganti, supaya file lama tetap dipertahankan di backend.
          fileUrl: fileChanged ? fileUrl : null,
          fileType: fileChanged ? fileType : null,
          fileName: fileChanged ? fileName : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal memperbarui data lisence."); return; }
      onSuccess(data.data);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Lisence Pekerja</h2>
            <span className={`inline-flex items-center gap-1.5 mt-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.badge}`}>
              <MetaIcon className="w-3.5 h-3.5" /> {meta.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Pekerja <span className="text-red-500">*</span></label>
              <input type="text" value={nama} onChange={(e) => setNama(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">NIK <span className="text-red-500">*</span></label>
              <input type="text" value={nik} onChange={(e) => setNik(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Departemen <span className="text-red-500">*</span></label>
            <select value={departemen} onChange={(e) => setDepartemen(e.target.value)}
              className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${!departemen ? "text-slate-400" : "text-slate-900"}`}>
              <option value="" disabled>— Pilih Departemen —</option>
              {DEPARTEMEN_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Exp Lisence <span className="text-red-500">*</span></label>
            <input type="date" value={tanggalExp} onChange={(e) => setTanggalExp(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">File Lisence</label>
            <FileUploadField
              fileUrl={fileUrl} fileType={fileType} fileName={fileName}
              uploading={uploading} error={uploadError}
              onUpload={handleUpload}
              onRemove={() => { setFileUrl(null); setFileType(null); setFileName(null); setFileChanged(true); }}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving || uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Lihat Lisence ──────────────────────────────────────────────────
function ViewLisenceModal({ item, onClose }: { item: LisenceItem; onClose: () => void }) {
  const meta = JENIS_KERJA_META[item.jenis_kerja];
  const MetaIcon = meta.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-bold text-slate-800 text-sm">{item.nama} <span className="text-slate-400 font-normal">— {item.nik}</span></p>
            <span className={`inline-flex items-center gap-1.5 mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
              <MetaIcon className="w-3.5 h-3.5" /> {meta.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
          {item.file_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.file_url} alt={`Lisence ${item.nama}`} className="max-w-full max-h-[70vh] object-contain rounded-lg bg-white" />
          ) : (
            <iframe src={item.file_url} title={`Lisence ${item.nama}`} className="w-full h-[70vh] rounded-lg bg-white border border-slate-200" />
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">Berlaku hingga <span className="font-semibold text-slate-700">{formatDate(item.tanggal_exp)}</span></p>
          <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
            Buka di tab baru →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Modal Konfirmasi Hapus ──────────────────────────────────────────────
function ConfirmDeleteModal({
  title, message, confirmLabel, loading, onConfirm, onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dropdown aksi (Lihat / Edit / Hapus) per jenis kerja ────────────────
// Di-render lewat Portal ke document.body dengan position:fixed berdasarkan
// posisi tombol trigger-nya, supaya TIDAK ke-clip oleh overflow container
// tabel manapun (mis. overflow-x-auto pada wrapper tabel).
interface PickerState {
  key: string;
  mode: PickerMode;
  rect: DOMRect;
}

function ActionPicker({
  worker, mode, rect, onView, onEdit, onDeleteOne, onDeleteAll, onClose,
}: {
  worker: WorkerGroup;
  mode: PickerMode;
  rect: DOMRect;
  onView: (item: LisenceItem) => void;
  onEdit: (item: LisenceItem) => void;
  onDeleteOne: (item: LisenceItem) => void;
  onDeleteAll: (worker: WorkerGroup) => void;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  const top = rect.bottom + 6;
  const right = Math.max(8, window.innerWidth - rect.right);

  const titleMap: Record<PickerMode, string> = {
    view: "Pilih jenis kerja — Lihat",
    edit: "Pilih jenis kerja — Edit",
    delete: "Pilih jenis kerja — Hapus",
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        className="fixed z-[95] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[230px]"
        style={{ top, right }}
      >
        <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {titleMap[mode]}
        </p>
        {worker.licenses.map((lic) => {
          const meta = JENIS_KERJA_META[lic.jenis_kerja];
          const Icon = meta.icon;
          const status = getExpStatus(lic.tanggal_exp);
          const handleClick = () => {
            if (mode === "view") onView(lic);
            else if (mode === "edit") onEdit(lic);
            else onDeleteOne(lic);
            onClose();
          };
          return (
            <button
              key={lic.id}
              type="button"
              onClick={handleClick}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                mode === "delete" ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-70" />
              <span className="flex-1 text-left font-medium">{meta.label}</span>
              {mode === "delete"
                ? <Trash2 className="w-3.5 h-3.5 shrink-0" />
                : <span className={`w-2 h-2 rounded-full shrink-0 ${EXP_BADGE[status].dot}`} title={EXP_BADGE[status].label} />}
            </button>
          );
        })}
        {mode === "delete" && worker.licenses.length > 1 && (
          <>
            <div className="border-t border-slate-100" />
            <button
              type="button"
              onClick={() => { onDeleteAll(worker); onClose(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Hapus Semua Lisence ({worker.licenses.length})
            </button>
          </>
        )}
      </div>
    </>,
    document.body
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────
export default function MasterLisencePage() {
  const router = useRouter();

  const [checkingRole, setCheckingRole] = useState(true);
  const [items, setItems] = useState<LisenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState<JenisKerja | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ExpStatus | "all">("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<LisenceItem | null>(null);
  const [viewItem, setViewItem] = useState<LisenceItem | null>(null);
  const [openPicker, setOpenPicker] = useState<PickerState | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "single"; item: LisenceItem }
    | { type: "all"; worker: WorkerGroup }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Guard: hanya admin
  useEffect(() => {
    const role = sessionStorage.getItem("user_role");
    if (role && role !== "admin") {
      router.replace("/home");
      return;
    }
    setCheckingRole(false);
  }, [router]);

  const showToast = (type: ToastType, message: string) => setToast({ type, message });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/form-permit/api/master-lisence", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.replace("/home"); return; }
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.error("Gagal memuat data master lisence:", err);
      showToast("error", "Gagal memuat data lisence.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { if (!checkingRole) loadData(); }, [checkingRole, loadData]);

  // Tutup dropdown otomatis saat halaman di-scroll (termasuk scroll horizontal
  // tabel) atau saat window di-resize, supaya posisinya tidak jadi salah.
  useEffect(() => {
    if (!openPicker) return;
    const close = () => setOpenPicker(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openPicker]);

  // ── Filtering di frontend (nama/nik + jenis kerja + status exp) ─────────
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchSearch = !q || it.nama.toLowerCase().includes(q) || it.nik.toLowerCase().includes(q);
      const matchJenis = filterJenis === "all" || it.jenis_kerja === filterJenis;
      const matchStatus = statusFilter === "all" || getExpStatus(it.tanggal_exp) === statusFilter;
      return matchSearch && matchJenis && matchStatus;
    });
  }, [items, search, filterJenis, statusFilter]);

  // ── Kelompokkan lisence per pekerja (berdasarkan NIK) ───────────────────
  const groupedWorkers = useMemo<WorkerGroup[]>(() => {
    const map = new Map<string, WorkerGroup>();
    for (const it of filteredItems) {
      if (!map.has(it.nik)) {
        map.set(it.nik, { key: it.nik, nama: it.nama, nik: it.nik, licenses: [] });
      }
      map.get(it.nik)!.licenses.push(it);
    }
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [filteredItems]);

  const stats = useMemo(() => {
    const total = items.length;
    const expired = items.filter((it) => getExpStatus(it.tanggal_exp) === "expired").length;
    const soon = items.filter((it) => getExpStatus(it.tanggal_exp) === "soon").length;
    return { total, expired, soon };
  }, [items]);

  const handleItemAdded = (item: LisenceItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleEditSuccess = (item: LisenceItem) => {
    setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
    setEditItem(null);
    showToast("success", "Data lisence berhasil diperbarui.");
  };

  const togglePicker = (key: string, mode: PickerMode, el: HTMLButtonElement) => {
    setOpenPicker((prev) => {
      if (prev?.key === key && prev.mode === mode) return null;
      return { key, mode, rect: el.getBoundingClientRect() };
    });
  };

  // ── Hapus lisence (satu / semua) ────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "single") {
        const { item } = confirmDelete;
        const res = await fetch(`/form-permit/api/master-lisence/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast("error", data.error || "Gagal menghapus lisence.");
          return;
        }
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        showToast("success", `Lisence ${JENIS_KERJA_META[item.jenis_kerja].label} milik ${item.nama} berhasil dihapus.`);
      } else {
        const { worker } = confirmDelete;
        const results = await Promise.all(
          worker.licenses.map((lic) =>
            fetch(`/form-permit/api/master-lisence/${lic.id}`, { method: "DELETE", credentials: "include" })
              .then((res) => ({ ok: res.ok, id: lic.id }))
              .catch(() => ({ ok: false, id: lic.id }))
          )
        );
        const succeededIds = results.filter((r) => r.ok).map((r) => r.id);
        const failedCount = results.length - succeededIds.length;

        setItems((prev) => prev.filter((it) => !succeededIds.includes(it.id)));

        if (failedCount > 0) {
          showToast("error", `${succeededIds.length} lisence terhapus, ${failedCount} gagal dihapus. Coba lagi untuk yang gagal.`);
        } else {
          showToast("success", `Semua lisence (${succeededIds.length}) milik ${worker.nama} berhasil dihapus.`);
        }
      }
      setConfirmDelete(null);
    } catch {
      showToast("error", "Terjadi kesalahan saat menghapus data.");
    } finally {
      setDeleting(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Master Lisence Pekerja</h1>
                <p className="text-xs text-slate-500">Kelola lisence Hot Work, Height Work &amp; Workshop</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tambah Lisence</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stat cards — klik untuk filter tabel di bawah berdasarkan status exp */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 transition-all ${
              statusFilter === "all" ? "border-slate-300 ring-2 ring-slate-200" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="p-3 bg-slate-100 rounded-xl"><BadgeCheck className="w-5 h-5 text-slate-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500 font-medium">Total Lisence Terdaftar</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "soon" ? "all" : "soon"))}
            className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 transition-all ${
              statusFilter === "soon" ? "border-amber-300 ring-2 ring-amber-200" : "border-slate-200 hover:border-amber-300"
            }`}
          >
            <div className="p-3 bg-amber-100 rounded-xl"><CalendarClock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.soon}</p>
              <p className="text-xs text-slate-500 font-medium">Segera Habis (&le; 30 hari)</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "expired" ? "all" : "expired"))}
            className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 transition-all ${
              statusFilter === "expired" ? "border-red-300 ring-2 ring-red-200" : "border-slate-200 hover:border-red-300"
            }`}
          >
            <div className="p-3 bg-red-100 rounded-xl"><AlertCircle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.expired}</p>
              <p className="text-xs text-slate-500 font-medium">Sudah Kadaluarsa</p>
            </div>
          </button>
        </div>

        {/* Chip filter status aktif */}
        {statusFilter !== "all" && (
          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${EXP_BADGE[statusFilter].cls}`}>
              Filter aktif: {EXP_BADGE[statusFilter].label}
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
            >
              Hapus filter
            </button>
          </div>
        )}

        {/* Toolbar: search + filter */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NIK pekerja..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(["all", "hot_work", "height_work", "workshop"] as const).map((val) => {
              const active = filterJenis === val;
              const label = val === "all" ? "Semua Jenis" : JENIS_KERJA_META[val].label;
              return (
                <button
                  key={val}
                  onClick={() => setFilterJenis(val)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${
                    active ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : groupedWorkers.length === 0 ? (
            <div className="p-12 text-center">
              <BadgeCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Belum ada data lisence</p>
              <p className="text-xs text-slate-400 mt-1">
                {items.length === 0 ? "Klik \"Tambah Lisence\" untuk mulai menambahkan data pekerja." : "Tidak ada data yang cocok dengan pencarian/filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Nama Pekerja</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">NIK</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Departemen</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Jenis Kerja</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedWorkers.map((w) => (
                    <tr key={w.key} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-800 align-top">{w.nama}</td>
                      <td className="px-5 py-3.5 text-slate-600 align-top">{w.nik}</td>
                      <td className="px-5 py-3.5 text-slate-600 align-top">{w.licenses[0]?.departemen || "-"}</td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex flex-wrap gap-2">
                          {w.licenses.map((lic) => {
                            const meta = JENIS_KERJA_META[lic.jenis_kerja];
                            const Icon = meta.icon;
                            const status = getExpStatus(lic.tanggal_exp);
                            return (
                              <div key={lic.id} className="flex flex-col items-start gap-0.5">
                                <span
                                  title={`Exp: ${formatDate(lic.tanggal_exp)} — ${EXP_BADGE[status].label}`}
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.badge}`}
                                >
                                  <Icon className="w-3.5 h-3.5" /> {meta.label}
                                  <span className={`w-1.5 h-1.5 rounded-full ${EXP_BADGE[status].dot}`} />
                                </span>
                                <span className="text-[10px] text-slate-400 pl-1">Exp: {formatDate(lic.tanggal_exp)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => togglePicker(w.key, "view", e.currentTarget)}
                            title="Lihat lisence"
                            className="p-2 rounded-lg text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => togglePicker(w.key, "edit", e.currentTarget)}
                            title="Edit lisence"
                            className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => togglePicker(w.key, "delete", e.currentTarget)}
                            title="Hapus lisence"
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddLisenceModal onClose={() => setShowAddModal(false)} onItemAdded={handleItemAdded} />
      )}
      {editItem && (
        <EditLisenceModal item={editItem} onClose={() => setEditItem(null)} onSuccess={handleEditSuccess} />
      )}
      {viewItem && (
        <ViewLisenceModal item={viewItem} onClose={() => setViewItem(null)} />
      )}

      {openPicker && (() => {
        const worker = groupedWorkers.find((w) => w.key === openPicker.key);
        if (!worker) return null;
        return (
          <ActionPicker
            worker={worker}
            mode={openPicker.mode}
            rect={openPicker.rect}
            onView={(lic) => setViewItem(lic)}
            onEdit={(lic) => setEditItem(lic)}
            onDeleteOne={(lic) => setConfirmDelete({ type: "single", item: lic })}
            onDeleteAll={(w) => setConfirmDelete({ type: "all", worker: w })}
            onClose={() => setOpenPicker(null)}
          />
        );
      })()}

      {confirmDelete && (
        <ConfirmDeleteModal
          title={confirmDelete.type === "single" ? "Hapus Lisence Ini?" : "Hapus Semua Lisence Pekerja Ini?"}
          message={
            confirmDelete.type === "single"
              ? `Lisence ${JENIS_KERJA_META[confirmDelete.item.jenis_kerja].label} milik ${confirmDelete.item.nama} (${confirmDelete.item.nik}) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
              : `Seluruh lisence (${confirmDelete.worker.licenses.length} jenis kerja) milik ${confirmDelete.worker.nama} (${confirmDelete.worker.nik}) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
          }
          confirmLabel={confirmDelete.type === "single" ? "Ya, Hapus" : "Ya, Hapus Semua"}
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}