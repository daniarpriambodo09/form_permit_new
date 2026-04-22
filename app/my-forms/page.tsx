// app/my-forms/page.tsx
// FIX: getApprovalStages sekarang aware tipe_perusahaan untuk hot-work & workshop
// Internal:  fw → spv → admin_k3 → sfo → mr_pga
// Eksternal: kontraktor → fw → spv → admin_k3 → sfo → mr_pga
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormSelectionModal from "@/components/form-selection-modal";
import DetailModal from "@/components/DetailModal";
import EditModal from "@/components/EditModal";
import {
  Home, Plus, FileText, Clock, CheckCircle, XCircle,
  AlertCircle, Eye, Edit, RefreshCw, User, LogOut,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

interface FormItem {
  id_form: string;
  jenis_form: string;
  status: string;
  tanggal: string;
  tanggal_pelaksanaan?: string;
  lokasi?: string;
  catatan_reject?: string;
  approved_by?: string;
  approved_at?: string;
  // tipe_perusahaan: 'internal' | 'eksternal' — berlaku untuk semua jenis form
  tipe_perusahaan?: string;
  // Kolom approval hot-work & workshop
  fw_approved?: boolean;
  spv_approved?: boolean;
  kontraktor_approved?: boolean;
  sfo_approved?: boolean;
  pga_approved?: boolean;
  // Kolom approval baru hot-work & workshop
  admin_k3_approved?: boolean;
  mr_pga_approved?: boolean;
  // Kolom approval height-work
}

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

const jenisLabel: Record<string, string> = {
  "hot-work":    "Hot Work Permit",
  "workshop":    "Workshop Permit",
  "height-work": "Kerja Ketinggian",
};

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  draft:     { label: "Draft",     icon: FileText,    color: "text-slate-600", bg: "bg-slate-100" },
  submitted: { label: "Diajukan",  icon: Clock,       color: "text-blue-600",  bg: "bg-blue-100" },
  approved:  { label: "Disetujui", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  rejected:  { label: "Ditolak",   icon: XCircle,     color: "text-red-600",   bg: "bg-red-100" },
};

// ── Helper: dapatkan stages berdasarkan jenis form & tipe perusahaan ──
// Alur hot-work & workshop:
//   Internal:  fw(0) → spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Eksternal: kontraktor(0) → fw(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
//
// Alur height-work:
//   Internal:  spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Eksternal: kontraktor(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
const getApprovalStages = (form: FormItem): { key: keyof FormItem; label: string }[] => {
  const isEksternal = form.tipe_perusahaan === "eksternal";

  if (form.jenis_form === "height-work") {
    if (isEksternal) {
      return [
        { key: "kontraktor_approved", label: "Kontraktor" },
        { key: "spv_approved",        label: "SPV" },
        { key: "admin_k3_approved",   label: "Admin K3" },
        { key: "sfo_approved",        label: "SFO" },
        { key: "mr_pga_approved",     label: "MR/PGA" },
      ];
    }
    return [
      { key: "spv_approved",      label: "SPV" },
      { key: "admin_k3_approved", label: "Admin K3" },
      { key: "sfo_approved",      label: "SFO" },
      { key: "mr_pga_approved",   label: "MR/PGA" },
    ];
  }

  // hot-work & workshop — sekarang aware tipe_perusahaan
  if (isEksternal) {
    // Eksternal: Kontraktor → Firewatch → SPV → Admin K3 → SFO → MR/PGA
    return [
      { key: "kontraktor_approved", label: "Kontraktor" },
      { key: "fw_approved",         label: "Fire Watch" },
      { key: "spv_approved",        label: "SPV" },
      { key: "admin_k3_approved",   label: "Admin K3" },
      { key: "sfo_approved",        label: "SFO" },
      { key: "mr_pga_approved",     label: "MR/PGA" },
    ];
  }

  // Internal: Firewatch → SPV → Admin K3 → SFO → MR/PGA
  return [
    { key: "fw_approved",       label: "Fire Watch" },
    { key: "spv_approved",      label: "SPV" },
    { key: "admin_k3_approved", label: "Admin K3" },
    { key: "sfo_approved",      label: "SFO" },
    { key: "mr_pga_approved",   label: "MR/PGA" },
  ];
};

// ── Helper: cek apakah semua approver sudah approve ──
const checkAllApproved = (form: FormItem): boolean => {
  const stages = getApprovalStages(form);
  return stages.every(({ key }) => Boolean(form[key]));
};

// ── Helper: render approval progress badges ──
const renderApprovalProgress = (form: FormItem) => {
  const stages = getApprovalStages(form);
  const isEksternal = form.tipe_perusahaan === "eksternal";

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {stages.map((stage) => {
          const approved = Boolean(form[stage.key]);
          return (
            <span
              key={stage.key}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                approved
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {approved ? "✓" : "○"} {stage.label}
            </span>
          );
        })}
      </div>
      {/* Info alur approval */}
      {(form.jenis_form === "hot-work" || form.jenis_form === "workshop") && form.tipe_perusahaan && (
        <p className="text-[10px] text-slate-400 mt-1">
          Alur: {isEksternal
            ? "Kontraktor → Fire Watch → SPV → Admin K3 → SFO → MR/PGA"
            : "Fire Watch → SPV → Admin K3 → SFO → MR/PGA"
          }
        </p>
      )}
      {form.jenis_form === "height-work" && form.tipe_perusahaan && (
        <p className="text-[10px] text-slate-400 mt-1">
          Alur: {isEksternal
            ? "Kontraktor → SPV → Admin K3 → SFO → MR/PGA"
            : "SPV → Admin K3 → SFO → MR/PGA"
          }
        </p>
      )}
    </div>
  );
};

// ── Confirm Modal ─────────────────────────────────────────────
const ConfirmModal = ({
  isOpen, onClose, onConfirm, title, message,
  confirmText = "Ya, Batalkan", cancelText = "Tidak, Kembali", isLoading = false,
}: ConfirmModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600">{message}</p>
          <p className="text-xs text-red-500 mt-2 font-medium">
            ⚠️ Tindakan ini tidak dapat dibatalkan. Data form akan dihapus permanen.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
          <button onClick={onClose} disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50
                       text-slate-700 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300
                       text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
            {isLoading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Memproses...</>
              : confirmText
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
export default function MyFormsPage() {
  const router = useRouter();
  const [forms, setForms]               = useState<FormItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [userName, setUserName]         = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const [detailModal, setDetailModal]   = useState({ isOpen: false, formId: "", formType: "" as any });
  const [editModal, setEditModal]       = useState({ isOpen: false, formId: "", formType: "" as any });
  const [cancelModal, setCancelModal]   = useState({
    isOpen: false, formId: "",
    formType: "" as "hot-work" | "height-work" | "workshop",
  });
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setUserName(sessionStorage.getItem("user_nama") || "");
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my-forms");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setForms(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = async () => {
    if (!cancelModal.formId || !cancelModal.formType) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/forms/${cancelModal.formType}/${cancelModal.formId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan form");
      await loadForms();
      alert("✅ Form berhasil dibatalkan dan dihapus");
    } catch (err: any) {
      alert(`❌ Gagal: ${err.message}`);
    } finally {
      setCancelling(false);
      setCancelModal({ isOpen: false, formId: "", formType: "" as any });
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.clear();
    router.push("/");
  };

  const filtered = filterStatus === "all" ? forms : forms.filter(f => f.status === filterStatus);
  const counts: Record<string, number> = { all: forms.length, draft: 0, submitted: 0, approved: 0, rejected: 0 };
  forms.forEach(f => { if (counts[f.status] !== undefined) counts[f.status]++; });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Home className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Form Izin Kerja Saya</h1>
                  <p className="text-xs text-slate-500">PT Jatim Autocomp Indonesia</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {userName && (
                <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">{userName}</span>
                </div>
              )}
              <button onClick={loadForms} disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Refresh">
                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600
                           hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Tombol buat form baru */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Total {forms.length} form · Ditampilkan: {filtered.length}
          </p>
          <button onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700
                       text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Buat Form Baru
          </button>
        </div>

        {/* Filter status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Filter Status:</span>
          {["all", "draft", "submitted", "approved", "rejected"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {s === "all" ? "Semua" : statusConfig[s]?.label || s} ({counts[s] || 0})
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600" />
            <p className="mt-3 text-slate-400 text-sm">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">
              {filterStatus === "all" ? "Belum ada form" : `Tidak ada form dengan status "${statusConfig[filterStatus]?.label}"`}
            </p>
            <p className="text-slate-400 text-sm mt-1">Buat form izin kerja baru untuk memulai.</p>
            <button onClick={() => setShowFormModal(true)}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700
                         text-white rounded-lg text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Buat Form Baru
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(form => {
              const cfg  = statusConfig[form.status] || statusConfig.submitted;
              const Icon = cfg.icon;
              const canCancel = form.status === "submitted" || form.status === "draft";

              const isHeightWork = form.jenis_form === "height-work";
              const isFwForm     = form.jenis_form === "hot-work" || form.jenis_form === "workshop";
              const isEksternal  = form.tipe_perusahaan === "eksternal";

              return (
                <div key={form.id_form}
                  className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className="text-base font-bold text-slate-900 font-mono">{form.id_form}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                            {jenisLabel[form.jenis_form] || form.jenis_form}
                          </span>
                          {/* Badge tipe perusahaan */}
                          {form.tipe_perusahaan && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isEksternal
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {isEksternal ? "Eksternal" : "Internal"}
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-slate-400">Dibuat</span>
                            <p className="font-medium text-slate-700">{formatDate(form.tanggal)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">Tanggal Pelaksanaan</span>
                            <p className="font-medium text-slate-700">{formatDate(form.tanggal_pelaksanaan)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">Lokasi</span>
                            <p className="font-medium text-slate-700 truncate">{form.lokasi || "-"}</p>
                          </div>
                        </div>

                        {/* Catatan reject */}
                        {form.catatan_reject && (
                          <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            <span className="font-semibold">Alasan ditolak: </span>{form.catatan_reject}
                          </div>
                        )}

                        {form.approved_by && form.status === "approved" && (
                          <p className="mt-2 text-xs text-green-600">
                            ✓ {checkAllApproved(form)
                              ? "Form sudah disetujui oleh Semua Approver"
                              : `Disetujui oleh ${form.approved_by}`
                            } — {formatDate(form.approved_at)}
                          </p>
                        )}

                        {form.status === "rejected" && form.approved_by && (
                          <p className="mt-2 text-xs text-red-600">
                            ✗ Ditolak oleh <strong>{form.approved_by}</strong> — {formatDate(form.approved_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Approval Progress Badges */}
                    {(form.status === "submitted" || form.status === "approved") && (
                      renderApprovalProgress(form)
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap mt-3">
                      <button
                        onClick={() => setDetailModal({ isOpen: true, formId: form.id_form, formType: form.jenis_form })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600
                                   hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Lihat Detail
                      </button>

                      {(form.status === "draft" || form.status === "rejected") && (
                        <button
                          onClick={() => setEditModal({ isOpen: true, formId: form.id_form, formType: form.jenis_form })}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-orange-600
                                     hover:bg-orange-50 rounded-lg text-xs font-medium transition-colors">
                          <Edit className="w-3.5 h-3.5" /> {form.status === "rejected" ? "Perbaiki" : "Edit"}
                        </button>
                      )}

                      {canCancel && (
                        <button
                          onClick={() => setCancelModal({
                            isOpen: true,
                            formId: form.id_form,
                            formType: form.jenis_form as any,
                          })}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-red-600
                                     hover:bg-red-50 rounded-lg text-xs font-medium transition-colors border border-red-200">
                          <XCircle className="w-3.5 h-3.5" /> Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ ...detailModal, isOpen: false })}
        formId={detailModal.formId}
        formType={detailModal.formType}
      />

      <EditModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ ...editModal, isOpen: false })}
        formId={editModal.formId}
        formType={editModal.formType}
        onSuccess={loadForms}
      />

      <FormSelectionModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
      />

      <ConfirmModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, formId: "", formType: "" as any })}
        onConfirm={handleCancelForm}
        isLoading={cancelling}
        title="Batalkan Pengajuan Form?"
        message={`Apakah Anda yakin ingin membatalkan pengajuan form ${cancelModal.formId}? Tindakan ini akan menghapus data form secara permanen dari sistem.`}
        confirmText="Ya, Batalkan Pengajuan"
        cancelText="Tidak, Kembali"
      />
    </div>
  );
}