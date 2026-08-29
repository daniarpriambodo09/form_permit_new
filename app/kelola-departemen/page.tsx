// app/kelola-departemen/page.tsx
// Kelola Departemen — hanya role 'admin'.
// CRUD untuk tabel `departemen`, yang menjadi sumber data dropdown
// "Nama Departemen" di app/form/height-work/page.tsx (menggantikan
// array hardcoded DEPT_SPV_MAP). Departemen yang dinonaktifkan (bukan
// dihapus) tidak akan muncul lagi sebagai pilihan baru di form, tapi
// data histori form yang sudah memakainya tetap aman.
"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Plus, Search, Pencil, Trash2, X, Loader2,
  CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Layers,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
interface DepartemenItem {
  id: number;
  nama_departemen: string;
  keterangan: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type ToastType = "success" | "error";
interface Toast { type: ToastType; message: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Toast ─────────────────────────────────────────────────────────────────
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

// ── Modal Tambah / Edit ──────────────────────────────────────────────────
interface FormModalProps {
  mode: "add" | "edit";
  initial?: DepartemenItem | null;
  onClose: () => void;
  onSuccess: (item: DepartemenItem, mode: "add" | "edit") => void;
}

function DepartemenFormModal({ mode, initial, onClose, onSuccess }: FormModalProps) {
  const [nama, setNama] = useState(initial?.nama_departemen ?? "");
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nama.trim()) { setError("Nama departemen wajib diisi."); return; }

    setSaving(true);
    try {
      const url = mode === "add" ? "/form-permit/api/departemen" : `/form-permit/api/departemen/${initial?.id}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaDepartemen: nama,
          keterangan,
          ...(mode === "edit" ? { isActive } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal menyimpan departemen."); return; }
      onSuccess(data.data, mode);
    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {mode === "add" ? "Tambah Departemen" : "Edit Departemen"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === "add"
                ? "Departemen baru akan langsung muncul di dropdown form."
                : "Perubahan nama akan tersinkron ke dropdown form."}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nama Departemen <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: QA, ENG, PRODUKSI"
              maxLength={100}
              autoFocus
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">Akan otomatis disimpan dalam huruf kapital.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Keterangan</label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Opsional — misal nama lengkap departemen"
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
            />
          </div>

          {mode === "edit" && (
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                isActive ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="text-left">
                <p className={`text-sm font-semibold ${isActive ? "text-green-700" : "text-slate-600"}`}>
                  {isActive ? "Aktif" : "Nonaktif"}
                </p>
                <p className="text-xs text-slate-500">
                  {isActive
                    ? "Muncul sebagai pilihan di form baru"
                    : "Disembunyikan dari pilihan form baru (data lama tetap aman)"}
                </p>
              </div>
              {isActive
                ? <ToggleRight className="w-8 h-8 text-green-500 shrink-0" />
                : <ToggleLeft className="w-8 h-8 text-slate-400 shrink-0" />}
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {mode === "add" ? "Tambah Departemen" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Konfirmasi Hapus ──────────────────────────────────────────────
function ConfirmDeleteModal({
  nama, loading, onConfirm, onCancel,
}: { nama: string; loading: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5">Hapus Departemen "{nama}"?</h3>
        <p className="text-sm text-slate-500 mb-6">
          Tindakan ini tidak dapat dibatalkan. Jika departemen masih dipakai di form atau data akun yang sudah ada,
          penghapusan akan ditolak — gunakan opsi Nonaktifkan sebagai alternatif.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────
export default function KelolaDepartemenPage() {
  const router = useRouter();

  const [checkingRole, setCheckingRole] = useState(true);
  const [items, setItems] = useState<DepartemenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [formModal, setFormModal] = useState<{ mode: "add" | "edit"; item: DepartemenItem | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartemenItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Guard: hanya admin ─────────────────────────────────────────
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
      const res = await fetch("/form-permit/api/departemen", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.replace("/home"); return; }
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.error("Gagal memuat data departemen:", err);
      showToast("error", "Gagal memuat data departemen.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { if (!checkingRole) loadData(); }, [checkingRole, loadData]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchSearch =
        !q ||
        it.nama_departemen.toLowerCase().includes(q) ||
        (it.keterangan ?? "").toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" ? true : statusFilter === "active" ? it.is_active : !it.is_active;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((it) => it.is_active).length,
    inactive: items.filter((it) => !it.is_active).length,
  }), [items]);

  const handleFormSuccess = (item: DepartemenItem, mode: "add" | "edit") => {
    if (mode === "add") {
      setItems((prev) => [...prev, item].sort((a, b) => a.nama_departemen.localeCompare(b.nama_departemen)));
      showToast("success", `Departemen "${item.nama_departemen}" berhasil ditambahkan.`);
    } else {
      setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
      showToast("success", `Departemen "${item.nama_departemen}" berhasil diperbarui.`);
    }
    setFormModal(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/form-permit/api/departemen/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", data.error || "Gagal menghapus departemen.");
        setDeleteTarget(null);
        return;
      }
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      showToast("success", `Departemen "${deleteTarget.nama_departemen}" berhasil dihapus.`);
      setDeleteTarget(null);
    } catch {
      showToast("error", "Terjadi kesalahan saat menghapus data.");
    } finally {
      setDeleting(false);
    }
  };

  // Toggle cepat aktif/nonaktif langsung dari tabel (tanpa buka modal)
  const handleQuickToggle = async (item: DepartemenItem) => {
    try {
      const res = await fetch(`/form-permit/api/departemen/${item.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaDepartemen: item.nama_departemen,
          keterangan: item.keterangan,
          isActive: !item.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast("error", data.error || "Gagal mengubah status."); return; }
      setItems((prev) => prev.map((it) => (it.id === item.id ? data.data : it)));
      showToast("success", `Status "${item.nama_departemen}" diubah menjadi ${data.data.is_active ? "Aktif" : "Nonaktif"}.`);
    } catch {
      showToast("error", "Terjadi kesalahan koneksi.");
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Kelola Departemen</h1>
                <p className="text-xs text-slate-500">Sumber pilihan "Nama Departemen" di Form Izin Kerja Ketinggian</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setFormModal({ mode: "add", item: null })}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tambah Departemen</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 transition-all ${
              statusFilter === "all" ? "border-slate-300 ring-2 ring-slate-200" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="p-3 bg-slate-100 rounded-xl"><Layers className="w-5 h-5 text-slate-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500 font-medium">Total Departemen</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "active" ? "all" : "active"))}
            className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 transition-all ${
              statusFilter === "active" ? "border-green-300 ring-2 ring-green-200" : "border-slate-200 hover:border-green-300"
            }`}
          >
            <div className="p-3 bg-green-100 rounded-xl"><ToggleRight className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              <p className="text-xs text-slate-500 font-medium">Aktif (tampil di form)</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "inactive" ? "all" : "inactive"))}
            className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 transition-all ${
              statusFilter === "inactive" ? "border-slate-400 ring-2 ring-slate-200" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="p-3 bg-slate-100 rounded-xl"><ToggleLeft className="w-5 h-5 text-slate-500" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.inactive}</p>
              <p className="text-xs text-slate-500 font-medium">Nonaktif</p>
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau keterangan departemen..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Belum ada data departemen</p>
              <p className="text-xs text-slate-400 mt-1">
                {items.length === 0 ? 'Klik "Tambah Departemen" untuk mulai menambahkan.' : "Tidak ada data yang cocok dengan pencarian/filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Nama Departemen</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Keterangan</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Dibuat</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-center">Status</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                          {it.nama_departemen}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {it.keterangan || <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDate(it.created_at)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleQuickToggle(it)}
                          title="Klik untuk ubah status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            it.is_active
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {it.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {it.is_active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setFormModal({ mode: "edit", item: it })}
                            title="Edit departemen"
                            className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(it)}
                            title="Hapus departemen"
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

      {formModal && (
        <DepartemenFormModal
          mode={formModal.mode}
          initial={formModal.item}
          onClose={() => setFormModal(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          nama={deleteTarget.nama_departemen}
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}