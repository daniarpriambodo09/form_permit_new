// app/my-forms/page.tsx
// Redesigned: UI modern, responsif, KPI stat cards interaktif, search & filter cepat,
// serta penataan tombol aksi yang jauh lebih efisien di header kartu.
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import FormSelectionModal from "@/components/form-selection-modal";
import DetailModal from "@/components/DetailModal";
import EditModal from "@/components/EditModal";
import {
  Home, Plus, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Eye, Edit3, RefreshCw, User, LogOut,
  Flame, Wrench, ClipboardCheck, ShieldCheck, ClipboardList, Paperclip,
  Search, X, Calendar, CalendarClock, MapPin, ChevronRight,
  Filter, Layers, Check,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
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

interface LinkedJobForm {
  id_form: string;
  status: string;
  tipe_perusahaan?: string;
  jenis_form: "hot-work" | "height-work" | "workshop";
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
  tipe_perusahaan?: string;
  fw_approved?: boolean;
  spv_approved?: boolean;
  kontraktor_approved?: boolean;
  sfo_approved?: boolean;
  pga_approved?: boolean;
  admin_k3_approved?: boolean;
  mr_pga_approved?: boolean;
  security_approved?: boolean;
  job_forms_count?: number;
  id_ijin_kerja?: string;
  linked_job_forms?: LinkedJobForm[];
  has_jsa?: boolean;
  has_safety_induction?: boolean;
  has_penilaian_subkontraktor?: boolean;
  kontraktor_signature_url?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const jenisLabel: Record<string, string> = {
  "hot-work":        "Hot Work Permit",
  "workshop":        "Workshop Permit",
  "height-work":     "Kerja Ketinggian",
  "general-permit":  "Ijin Kerja Eksternal",
};

const jenisTheme: Record<string, {
  icon: any;
  borderLeft: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  "hot-work": {
    icon: Flame,
    borderLeft: "border-l-orange-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    badgeText: "Hot Work",
  },
  "workshop": {
    icon: Wrench,
    borderLeft: "border-l-blue-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    badgeText: "Workshop",
  },
  "height-work": {
    icon: AlertCircle,
    borderLeft: "border-l-purple-500",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    badgeText: "Ketinggian",
  },
  "general-permit": {
    icon: Layers,
    borderLeft: "border-l-emerald-500",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeText: "Ijin Eksternal",
  },
};

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; dot: string; border: string }> = {
  draft: {
    label: "Draft",
    icon: FileText,
    color: "text-slate-700",
    bg: "bg-slate-100",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
  submitted: {
    label: "Diajukan",
    icon: Clock,
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    border: "border-amber-200",
  },
  approved: {
    label: "Disetujui",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
  },
  rejected: {
    label: "Ditolak",
    icon: XCircle,
    color: "text-rose-700",
    bg: "bg-rose-50",
    dot: "bg-rose-500",
    border: "border-rose-200",
  },
};

const getApprovalStages = (form: FormItem): { key: keyof FormItem; label: string }[] => {
  if (form.jenis_form === "general-permit") {
    return [
      { key: "spv_approved",      label: "SPV" },
      { key: "security_approved", label: "Security" },
      { key: "sfo_approved",      label: "SFO" },
      { key: "pga_approved",      label: "MGR" },
    ];
  }

  return [
    { key: "spv_approved",      label: "SPV" },
    { key: "admin_k3_approved", label: "Admin K3" },
    { key: "sfo_approved",      label: "SFO" },
    { key: "mr_pga_approved",   label: "SMR" },
  ];
};

const checkAllApproved = (form: FormItem): boolean => {
  const stages = getApprovalStages(form);
  return stages.every(({ key }) => Boolean(form[key]));
};

// ── Stepper Alur Approval ───────────────────────────────────────────
const renderApprovalStepper = (form: FormItem) => {
  const stages = getApprovalStages(form);
  const isEksternal = form.tipe_perusahaan === "eksternal";
  const showKontraktorBadge = isEksternal && form.jenis_form !== "general-permit";

  return (
    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          Progres Persetujuan
        </span>
        <span className="text-[10px] text-slate-400">
          {form.jenis_form === "general-permit"
            ? "Alur: SPV → Security → SFO → MGR"
            : "Alur: SPV → Admin K3 → SFO → SMR"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showKontraktorBadge && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              form.kontraktor_approved
                ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs"
                : "bg-amber-100 text-amber-800 border-amber-300"
            }`}
            title="Tanda Tangan Kontraktor (Bebas urutan)"
          >
            {form.kontraktor_approved ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
            <span>Kontraktor (TTD)</span>
          </div>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          {stages.map((stage, idx) => {
            const approved = Boolean(form[stage.key]);
            return (
              <div key={stage.key} className="flex items-center">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    approved
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  {approved ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  )}
                  <span>{stage.label}</span>
                </div>
                {idx < stages.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-0.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Lampiran (tombol) khusus card general-permit ─────────────
const renderLampiranButtons = (
  form: FormItem,
  onOpenJobForm: (jenis: LinkedJobForm["jenis_form"], id: string) => void,
  onOpenGeneralPermitAction: (action: "jsa" | "safety-induction" | "penilaian-subkontraktor") => void
) => {
  const linked = form.linked_job_forms ?? [];
  const jobTypes: LinkedJobForm["jenis_form"][] = ["hot-work", "height-work", "workshop"];

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-xl border-dashed">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-slate-500" />
          Form Terhubung &amp; Dokumen Lampiran
        </p>
        <span className="text-[10px] text-slate-400">Klik untuk melihat detail atau tambah</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {jobTypes.map((jenis) => {
          const found = linked.find((jf) => jf.jenis_form === jenis);
          const meta = jenisTheme[jenis] || jenisTheme["hot-work"];
          const Icon = meta.icon;

          if (found) {
            const cfg = statusConfig[found.status] || statusConfig.submitted;
            return (
              <button
                key={jenis}
                type="button"
                onClick={() => onOpenJobForm(jenis, found.id_form)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs hover:shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border} hover:opacity-90 active:scale-95`}
                title={`${jenisLabel[jenis]} — ${cfg.label}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{jenisLabel[jenis]}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/70 border border-black/5">
                  {cfg.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={jenis}
              href={`/form/${jenis}?id_ijin_kerja=${form.id_form}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 text-slate-600 bg-white hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50 transition-all shadow-2xs active:scale-95"
              title={`Tambah ${jenisLabel[jenis]}`}
            >
              <Plus className="w-3.5 h-3.5 text-orange-500" />
              <span>{jenisLabel[jenis]}</span>
            </Link>
          );
        })}

        <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

        <button
          type="button"
          onClick={() => onOpenGeneralPermitAction("jsa")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs active:scale-95 ${
            form.has_jsa
              ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              : "bg-white border-dashed border-slate-300 text-slate-500 hover:border-slate-400"
          }`}
          title="Job Safety Analysis"
        >
          <ClipboardList className={`w-3.5 h-3.5 ${form.has_jsa ? "text-blue-600" : "text-slate-400"}`} />
          <span>JSA</span>
          {form.has_jsa && <Check className="w-3 h-3 text-blue-600" />}
        </button>

        <button
          type="button"
          onClick={() => onOpenGeneralPermitAction("safety-induction")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs active:scale-95 ${
            form.has_safety_induction
              ? "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
              : "bg-white border-dashed border-slate-300 text-slate-500 hover:border-slate-400"
          }`}
          title="Safety Induction"
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${form.has_safety_induction ? "text-teal-600" : "text-slate-400"}`} />
          <span>Safety Induction</span>
          {form.has_safety_induction && <Check className="w-3 h-3 text-teal-600" />}
        </button>

        <button
          type="button"
          onClick={() => onOpenGeneralPermitAction("penilaian-subkontraktor")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs active:scale-95 ${
            form.has_penilaian_subkontraktor
              ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
              : "bg-white border-dashed border-slate-300 text-slate-500 hover:border-slate-400"
          }`}
          title="Form Penilaian Sub Kontraktor"
        >
          <ClipboardCheck className={`w-3.5 h-3.5 ${form.has_penilaian_subkontraktor ? "text-purple-600" : "text-slate-400"}`} />
          <span>Penilaian Subkontraktor</span>
          {form.has_penilaian_subkontraktor && <Check className="w-3 h-3 text-purple-600" />}
        </button>
      </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Tindakan ini tidak dapat dibatalkan. Pengajuan form akan dihapus secara permanen dari sistem.</span>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 border border-slate-200 hover:bg-white text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-rose-600/20 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
export default function MyFormsPage() {
  const router = useRouter();
  const [forms, setForms]                 = useState<FormItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterJenis, setFilterJenis]     = useState("all");
  const [searchQuery, setSearchQuery]     = useState("");
  const [userName, setUserName]           = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const [detailModal, setDetailModal]     = useState({
    isOpen: false,
    formId: "",
    formType: "" as any,
    action: null as null | "jsa" | "safety-induction" | "penilaian-subkontraktor",
  });
  const [editModal, setEditModal]         = useState({ isOpen: false, formId: "", formType: "" as any });
  const [cancelModal, setCancelModal]     = useState({
    isOpen: false,
    formId: "",
    formType: "" as "hot-work" | "height-work" | "workshop" | "general-permit",
  });
  const [cancelling, setCancelling]       = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      const { jenis, idForm } = e.detail;
      setDetailModal({ isOpen: true, formId: idForm, formType: jenis, action: null });
    };
    window.addEventListener("open-form-detail", handler);
    return () => window.removeEventListener("open-form-detail", handler);
  }, []);

  useEffect(() => {
    setUserName(sessionStorage.getItem("user_nama") || "");
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/form-permit/api/my-forms", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/login/worker");
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("[my-forms] Response bukan JSON:", res.status, res.url);
        setForms([]);
        return;
      }

      const data = await res.json();
      setForms(data.data ?? []);
    } catch (err) {
      console.error("[my-forms] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = async () => {
    if (!cancelModal.formId || !cancelModal.formType) return;
    setCancelling(true);
    try {
      const res = await fetch(
        `/form-permit/api/forms/${cancelModal.formType}/${cancelModal.formId}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan form");
      await loadForms();
    } catch (err: any) {
      alert(`❌ Gagal: ${err.message}`);
    } finally {
      setCancelling(false);
      setCancelModal({ isOpen: false, formId: "", formType: "" as any });
    }
  };

  const handleLogout = async () => {
    await fetch("/form-permit/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    sessionStorage.clear();
    router.push("/");
  };

  // ── Hitung Statistik Counts ──
  const counts = useMemo(() => {
    const res: Record<string, number> = {
      all: forms.length, draft: 0, submitted: 0, approved: 0, rejected: 0,
    };
    forms.forEach(f => {
      if (res[f.status] !== undefined) res[f.status]++;
    });
    return res;
  }, [forms]);

  // ── Filter Data ──
  const filtered = useMemo(() => {
    return forms.filter((f) => {
      // Filter Status
      if (filterStatus !== "all" && f.status !== filterStatus) return false;
      // Filter Jenis Form
      if (filterJenis !== "all" && f.jenis_form !== filterJenis) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (f.id_form || "").toLowerCase().includes(q);
        const matchLokasi = (f.lokasi || "").toLowerCase().includes(q);
        const matchJenis = (jenisLabel[f.jenis_form] || "").toLowerCase().includes(q);
        const matchCatatan = (f.catatan_reject || "").toLowerCase().includes(q);
        if (!matchId && !matchLokasi && !matchJenis && !matchCatatan) return false;
      }
      return true;
    });
  }, [forms, filterStatus, filterJenis, searchQuery]);

  const hasActiveFilters = filterStatus !== "all" || filterJenis !== "all" || searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setFilterStatus("all");
    setFilterJenis("all");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Sidebar Navigasi Konsisten */}
      <Sidebar />

      {/* Konten Utama */}
      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 backdrop-blur-md bg-white/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center justify-between gap-4">
              
              {/* Left: Brand & Title */}
              <div className="flex items-center gap-3">
                <Link
                  href="/home"
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
                  title="Kembali ke Beranda"
                >
                  <Home className="w-5 h-5" />
                </Link>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      Riwayat &amp; Status Form
                    </h1>
                    <p className="text-xs text-slate-500 hidden sm:block">
                      PT Jatim Autocomp Indonesia
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Actions & User Info */}
              <div className="flex items-center gap-2.5">
                {/* TOMBOL UTAMA: Buat Form Baru (Diletakkan di posisi paling strategis) */}
                <button
                  type="button"
                  onClick={() => setShowFormModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Buat Form Baru</span>
                  <span className="sm:hidden">Buat</span>
                </button>

                <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block" />

                {/* User Pill */}
                {userName && (
                  <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-[140px]">{userName}</span>
                  </div>
                )}

                {/* Refresh */}
                <button
                  type="button"
                  onClick={loadForms}
                  disabled={loading}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800 disabled:opacity-50"
                  title="Segarkan Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-600" : ""}`} />
                </button>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* ── KPI Stat Cards (Interaktif: Klik untuk Filter Status Langsung) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              {
                id: "all",
                label: "Total Form",
                count: counts.all,
                icon: Layers,
                color: "text-slate-700",
                bg: "bg-slate-100",
                activeBorder: "border-slate-800 ring-2 ring-slate-800/10",
              },
              {
                id: "submitted",
                label: "Menunggu Approval",
                count: counts.submitted,
                icon: Clock,
                color: "text-amber-700",
                bg: "bg-amber-100/80",
                activeBorder: "border-amber-500 ring-2 ring-amber-500/20",
              },
              {
                id: "approved",
                label: "Disetujui",
                count: counts.approved,
                icon: CheckCircle2,
                color: "text-emerald-700",
                bg: "bg-emerald-100/80",
                activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20",
              },
              {
                id: "rejected",
                label: "Ditolak / Revisi",
                count: counts.rejected,
                icon: XCircle,
                color: "text-rose-700",
                bg: "bg-rose-100/80",
                activeBorder: "border-rose-500 ring-2 ring-rose-500/20",
              },
              {
                id: "draft",
                label: "Draft Tersimpan",
                count: counts.draft,
                icon: FileText,
                color: "text-slate-700",
                bg: "bg-slate-200/70",
                activeBorder: "border-slate-500 ring-2 ring-slate-500/20",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              const isSelected = filterStatus === stat.id;
              return (
                <button
                  key={stat.id}
                  type="button"
                  onClick={() => setFilterStatus(stat.id)}
                  className={`text-left p-4 rounded-2xl bg-white border transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                    isSelected ? stat.activeBorder + " shadow-sm" : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-500 leading-snug">
                      {stat.label}
                    </span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {stat.count}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-200">
                        Aktif
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Search & Filter Controls Bar ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari ID Form (cth: HW-001, WS-001), Lokasi, Pekerjaan..."
                  className="w-full pl-9 pr-9 py-2 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Jenis Form Dropdown */}
              <div className="flex items-center gap-2">
                <div className="relative min-w-[200px]">
                  <select
                    value={filterJenis}
                    onChange={(e) => setFilterJenis(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer transition-all"
                  >
                    <option value="all">Semua Jenis Form</option>
                    <option value="hot-work">Hot Work Permit (Kerja Panas)</option>
                    <option value="workshop">Workshop Permit</option>
                    <option value="height-work">Kerja Ketinggian (Height Work)</option>
                    <option value="general-permit">Ijin Kerja Eksternal</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors shrink-0"
                    title="Reset Filter"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset Filter</span>
                  </button>
                )}
              </div>

            </div>

            {/* Quick Filter Status Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { id: "all", label: "Semua", count: counts.all },
                { id: "submitted", label: "Diajukan", count: counts.submitted },
                { id: "approved", label: "Disetujui", count: counts.approved },
                { id: "rejected", label: "Ditolak", count: counts.rejected },
                { id: "draft", label: "Draft", count: counts.draft },
              ].map((tab) => {
                const isSelected = filterStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterStatus(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}

              <div className="ml-auto text-xs text-slate-400 font-medium">
                Menampilkan <strong className="text-slate-700 font-bold">{filtered.length}</strong> dari {forms.length} form
              </div>
            </div>
          </div>

          {/* ── List of Forms ── */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
              <div className="inline-block animate-spin rounded-full h-9 w-9 border-4 border-orange-100 border-t-orange-500 mb-3" />
              <p className="text-slate-600 font-semibold text-sm">Memuat riwayat form izin kerja...</p>
              <p className="text-slate-400 text-xs mt-1">Mohon tunggu sebentar.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-14 text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4 border border-orange-100">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {hasActiveFilters ? "Tidak Ada Form yang Sesuai" : "Belum Ada Form Izin Kerja"}
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Coba ubah kata kunci pencarian atau sesuaikan filter status dan jenis form."
                  : "Anda belum mengajukan permohonan izin kerja. Buat form izin baru sekarang untuk memulai."}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    <X className="w-4 h-4" /> Reset Filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFormModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" /> Buat Form Baru
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((form) => {
                const cfg = statusConfig[form.status] || statusConfig.submitted;
                const canCancel = form.status === "submitted" || form.status === "draft";
                const isEksternal = form.tipe_perusahaan === "eksternal";
                const isGeneralPermit = form.jenis_form === "general-permit";
                const meta = jenisTheme[form.jenis_form] || jenisTheme["hot-work"];
                const PermitIcon = meta.icon;

                return (
                  <div
                    key={form.id_form}
                    className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden ${meta.borderLeft} border-l-[5px]`}
                  >
                    <div className="p-5 sm:p-6 space-y-4">
                      
                      {/* ── CARD HEADER: Informasi & EFFICIENT BUTTON PLACEMENT ── */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                        
                        {/* Left: ID & Badge Identitas */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className={`w-8 h-8 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shrink-0`}>
                            <PermitIcon className="w-4 h-4" />
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                              {form.id_form}
                            </span>

                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${meta.badgeBg}`}>
                              {jenisLabel[form.jenis_form] || form.jenis_form}
                            </span>

                            {form.tipe_perusahaan && (
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                                  isEksternal
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {isEksternal ? "Eksternal" : "Internal"}
                              </span>
                            )}

                            {/* Status Badge */}
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${form.status === "submitted" ? "animate-pulse" : ""}`}></span>
                              <span>{cfg.label}</span>
                            </span>
                          </div>
                        </div>

                        {/* Right: PELETAKAN TOMBOL AKSI UTAMA YANG LEBIH EFISIEN */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          
                          {/* Tombol Perbaiki / Edit (Jika ditolak atau draft) */}
                          {(form.status === "draft" || form.status === "rejected") && (
                            <button
                              type="button"
                              onClick={() => setEditModal({ isOpen: true, formId: form.id_form, formType: form.jenis_form })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all active:scale-95"
                              title={form.status === "rejected" ? "Perbaiki Form yang Ditolak" : "Edit Draft"}
                            >
                              <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{form.status === "rejected" ? "Perbaiki" : "Edit"}</span>
                            </button>
                          )}

                          {/* Tombol Lihat Detail: Menonjol, Cepat & Mudah Diakses */}
                          <button
                            type="button"
                            onClick={() =>
                              setDetailModal({
                                isOpen: true,
                                formId: form.id_form,
                                formType: form.jenis_form,
                                action: null,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 hover:border-orange-200 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Detail</span>
                          </button>

                          {/* Tombol Batalkan: Rapi di pojok untuk form draft/submitted */}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() =>
                                setCancelModal({
                                  isOpen: true,
                                  formId: form.id_form,
                                  formType: form.jenis_form as any,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
                              title="Batalkan Pengajuan Form Ini"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Batalkan</span>
                            </button>
                          )}

                        </div>

                      </div>

                      {/* ── CARD BODY: Metadata Info Chips ── */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2.5 text-xs bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Tanggal Dibuat</span>
                            <span className="font-bold text-slate-700">{formatDate(form.tanggal)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                          <CalendarClock className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Pelaksanaan</span>
                            <span className="font-bold text-slate-700">{formatDate(form.tanggal_pelaksanaan)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Lokasi Kerja</span>
                            <span className="font-bold text-slate-700 truncate block">{form.lokasi || "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* ── Notifikasi Alasan Ditolak ── */}
                      {form.catatan_reject && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-bold text-rose-800">Catatan Penolakan:</span>
                            <p className="text-rose-700 mt-0.5 leading-relaxed">{form.catatan_reject}</p>
                          </div>
                        </div>
                      )}

                      {/* ── Notifikasi Approval Selesai ── */}
                      {form.approved_by && form.status === "approved" && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200/70 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {checkAllApproved(form)
                              ? "Form telah disetujui sepenuhnya oleh Seluruh Approver."
                              : `Terakhir disetujui oleh ${form.approved_by}`}
                            {" — "}{formatDate(form.approved_at)}
                          </span>
                        </div>
                      )}

                      {/* ── Stepper Alur Approval ── */}
                      {(form.status === "submitted" || form.status === "approved") &&
                        renderApprovalStepper(form)
                      }

                      {/* ── Bagian Lampiran Khusus Ijin Kerja Eksternal (General Permit) ── */}
                      {isGeneralPermit &&
                        renderLampiranButtons(
                          form,
                          (jenis, id) => setDetailModal({ isOpen: true, formId: id, formType: jenis, action: null }),
                          (action) => setDetailModal({ isOpen: true, formId: form.id_form, formType: "general-permit", action })
                        )
                      }

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      {/* ── Modals ── */}
      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ ...detailModal, isOpen: false })}
        formId={detailModal.formId}
        formType={detailModal.formType}
        initialAction={detailModal.action}
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
        message={`Apakah Anda yakin ingin membatalkan pengajuan form ${cancelModal.formId}?`}
        confirmText="Ya, Batalkan Pengajuan"
        cancelText="Tidak, Kembali"
      />
    </div>
  );
}