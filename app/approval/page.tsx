// app/approval/page.tsx

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, CheckCircle, XCircle, Clock, Eye,
  LogOut, User, FileText, RefreshCw,
  Shield, ShieldCheck, Download, Loader2, Mail,
  ClipboardCheck, CheckCircle2, AlertCircle, Check, X,
  Building2, MapPin, Calendar, Search, Filter,
  Flame, Wrench, Layers, CalendarClock, ChevronRight,
} from "lucide-react";
import { useApproverAuth } from "@/hooks/useApproverAuth";
import AuthLoadingSpinner from "@/components/AuthLoadingSpinner";
import Sidebar from "@/components/Sidebar";

// ── Types ─────────────────────────────────────────────────────
export interface EvaluasiFormItem {
  id_form: string;
  status: string;
  nama_kontraktor_pekerja: string;
  pimpinan_kontraktor: string;
  lokasi_pekerjaan: string;
  tanggal: string;
  tanggal_pelaksanaan: string;
  izin_kerja_tanggal_dari?: string | null;
  izin_kerja_tanggal_sampai?: string | null;
  evaluasi: {
    area_bersih_rapi: boolean;
    limbah_ditangani_baik: boolean;
    instalasi_listrik_aman: boolean;
    tdk_ada_kerusakan_property: boolean;
    ada_tumpahan_kimia_bbm: boolean;
    tdk_ada_kehilangan_property: boolean;
    status: string;
    submitted_by?: string;
    submitted_at?: string;
  };
  approval_flow: {
    current_stage: number;
    pengawas_approved: boolean;
    pengawas_approved_by?: string;
    pengawas_approved_at?: string;
    security_approved: boolean;
    security_approved_by?: string;
    security_approved_at?: string;
    sfo_approved: boolean;
    sfo_approved_by?: string;
    sfo_approved_at?: string;
    is_complete: boolean;
  };
  is_pending_my_approval: boolean;
  created_at: string;
  updated_at: string;
}
interface FormItem {
  id_form: string;
  jenis_form: string;
  status: string;
  tanggal: string;
  tanggal_pelaksanaan?: string;
  tgl_mulai_kerja?: string;
  no_registrasi?: string;
  pemohon?: string;
  nama_kontraktor_nik?: string;
  deskripsi_pekerjaan?: string;
  lokasi_pekerjaan?: string;
  catatan_reject?: string;
  approved_by?: string;
  approved_at?: string;
  current_stage?: number;
  tipe_perusahaan?: string;
  spv_approved?: boolean;
  kontraktor_approved?: boolean;
  admin_k3_approved?: boolean;
  sfo_approved?: boolean;
  mr_pga_approved?: boolean; // kolom DB tetap, bukan pga_approved
  security_approved?: boolean; // untuk form external-permit (Safety Induction)
  id_ijin_kerja?: string | null;
  spv_terkait_pj?: string;
  nik_spv_terkait_pj?: string;
}

interface FormCounts {
  submitted: number;
  approved: number;
  rejected: number;
}

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

const jenisLabel: Record<string, string> = {
  "hot-work": "Hot Work Permit",
  "workshop": "Workshop Permit",
  "height-work": "Kerja Ketinggian",
  "external-permit": "Safety Induction",
  "general-permit": "Ijin Kerja Eksternal",
};

const jenisBadge: Record<string, string> = {
  "hot-work": "bg-red-100 text-red-700",
  "workshop": "bg-purple-100 text-purple-700",
  "height-work": "bg-orange-100 text-orange-700",
  "external-permit": "bg-teal-100 text-teal-700",
  "general-permit": "bg-indigo-100 text-indigo-700",
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
  "external-permit": {
    icon: Shield,
    borderLeft: "border-l-teal-500",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
    badgeText: "Safety Induction",
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
    label: "Menunggu Approval",
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

const roleLabelMap: Record<string, string> = {
  firewatch: "Fire Watch",
  spv: "SPV",
  kontraktor: "Kontraktor",
  admin_k3: "Admin K3",
  sfo: "SFO",
  smr: "SMR",
  admin: "Admin",
};

function getStageLabelForForm(form: FormItem): string {
  const stage = form.current_stage ?? 0;
  const isEksternal = form.tipe_perusahaan === "eksternal";

  if (form.jenis_form === "general-permit") {
    const map: Record<number, string> = {
      1: "SPV", 2: "SFO", 3: "MGR", 4: "Security",
    };
    return map[stage] ?? `Tahap ${stage}`;
  }

  if (isEksternal) {
    const map: Record<number, string> = {
      1: "Kontraktor", 2: "SPV", 3: "Admin K3", 4: "SFO", 5: "SMR",
    };
    return map[stage] ?? `Tahap ${stage}`;
  }
  const map: Record<number, string> = {
    1: "SPV", 2: "Admin K3", 3: "SFO", 4: "SMR",
  };
  return map[stage] ?? `Tahap ${stage}`;
}

function getApprovalStages(form: FormItem): { key: keyof FormItem; label: string }[] {
  const isEksternal = form.tipe_perusahaan === "eksternal";

  if (form.jenis_form === "general-permit") {
    return [
      { key: "spv_approved", label: "SPV" },
      { key: "admin_k3_approved", label: "Admin K3" },
      { key: "sfo_approved", label: "SFO" },
      { key: "mr_pga_approved", label: "MGR" },
      { key: "security_approved", label: "Security" },
    ];
  }

  // Form Safety Induction (external-permit) — hanya satu stage: Security
  if (form.jenis_form === "external-permit") {
    return [{ key: "security_approved", label: "Security" }];
  }

  if (form.jenis_form === "height-work") {
    if (isEksternal) {
      return [
        { key: "kontraktor_approved", label: "Kontraktor" },
        { key: "spv_approved", label: "SPV" },
        { key: "admin_k3_approved", label: "Admin K3" },
        { key: "sfo_approved", label: "SFO" },
        { key: "mr_pga_approved", label: "SMR" },
      ];
    }
    return [
      { key: "spv_approved", label: "SPV" },
      { key: "admin_k3_approved", label: "Admin K3" },
      { key: "sfo_approved", label: "SFO" },
      { key: "mr_pga_approved", label: "SMR" },
    ];
  }

  if (isEksternal) {
    return [
      { key: "kontraktor_approved", label: "Kontraktor" },
      { key: "spv_approved", label: "SPV" },
      { key: "admin_k3_approved", label: "Admin K3" },
      { key: "sfo_approved", label: "SFO" },
      { key: "mr_pga_approved", label: "SMR" },
    ];
  }

  return [
    { key: "spv_approved", label: "SPV" },
    { key: "admin_k3_approved", label: "Admin K3" },
    { key: "sfo_approved", label: "SFO" },
    { key: "mr_pga_approved", label: "SMR" },
  ];
}

const statusTabs = [
  { key: "submitted", label: "Belum Disetujui", icon: Clock, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-500" },
  { key: "approved", label: "Sudah Disetujui", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-500" },
  { key: "rejected", label: "Ditolak", icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-500" },
];

// ── Page ──────────────────────────────────────────────────────
export default function ApprovalPage() {
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────
  // Hook memanggil /api/auth/me dan redirect ke /login/approver jika belum login.
  // Render halaman hanya setelah loading selesai & user valid.
  const { user, loading: authLoading } = useApproverAuth();

  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("submitted");
  const [filterJenis, setFilterJenis] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [formCounts, setFormCounts] = useState<FormCounts>({ submitted: 0, approved: 0, rejected: 0 });
  const [exportLoading, setExportLoading] = useState(false); // ADDED: loading state download excel

  // ── Evaluasi Akhir (Pasca Pekerjaan) untuk Security, SFO, Admin ──
  const [activeCategory, setActiveCategory] = useState<"permits" | "evaluasi">("permits");
  const [evalForms, setEvalForms] = useState<EvaluasiFormItem[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalPendingCount, setEvalPendingCount] = useState(0);
  const [selectedEvalItem, setSelectedEvalItem] = useState<EvaluasiFormItem | null>(null);
  const [approvingEval, setApprovingEval] = useState(false);
  const [evalReviewMessage, setEvalReviewMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [evalFilterTab, setEvalFilterTab] = useState<"pending" | "approved" | "all">("pending");

  // Muat data hanya setelah auth selesai & berhasil
  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      loadFormCounts(),
      loadForms("submitted"),
      loadEvaluasiForms(),
    ]).then(() => {
      // Jika login sebagai security, arahkan default tab ke evaluasi akhir
      if (user.role === "security") {
        setActiveCategory("evaluasi");
      }
    }).finally(() => setLoading(false));
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvaluasiForms = async () => {
    if (!user || (user.role !== "security" && user.role !== "sfo" && user.role !== "admin")) return;
    setEvalLoading(true);
    try {
      const res = await fetch("/api/evaluasi-akhir", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setEvalForms(json.data ?? []);
        setEvalPendingCount(json.pendingCount ?? 0);
      }
    } catch (err) {
      console.error("Gagal memuat data evaluasi akhir:", err);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleApproveEvaluasi = async (action: "approve_security" | "approve_sfo") => {
    if (!selectedEvalItem) return;
    const confirmText =
      action === "approve_security"
        ? "Konfirmasi verifikasi Evaluasi Akhir oleh Security? Form akan diteruskan ke SFO untuk persetujuan akhir."
        : "Konfirmasi persetujuan akhir Evaluasi Akhir oleh SFO? Proses pengesahan selesai.";

    if (!confirm(confirmText)) return;

    setApprovingEval(true);
    setEvalReviewMessage(null);
    try {
      const res = await fetch(`/api/evaluasi-akhir/${selectedEvalItem.id_form}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          nama: user?.nama,
          nik: user?.nik,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal melakukan approval evaluasi akhir.");
      }

      setEvalReviewMessage({
        type: "success",
        text: json.message || "Approval berhasil disimpan!",
      });

      if (action === "approve_security") {
        setSelectedEvalItem((prev) =>
          prev
            ? {
                ...prev,
                is_pending_my_approval: false,
                approval_flow: {
                  ...prev.approval_flow,
                  current_stage: 3,
                  security_approved: true,
                  security_approved_by: user?.nama || user?.username || "Security",
                  security_approved_at: new Date().toISOString(),
                },
              }
            : null
        );
      } else if (action === "approve_sfo") {
        setSelectedEvalItem((prev) =>
          prev
            ? {
                ...prev,
                is_pending_my_approval: false,
                approval_flow: {
                  ...prev.approval_flow,
                  current_stage: 4,
                  sfo_approved: true,
                  sfo_approved_by: user?.nama || user?.username || "SFO",
                  sfo_approved_at: new Date().toISOString(),
                  is_complete: true,
                },
              }
            : null
        );
      }

      await Promise.all([loadEvaluasiForms(), loadFormCounts(), loadForms(activeTab)]);
    } catch (err: any) {
      setEvalReviewMessage({ type: "error", text: err.message || "Gagal melakukan approval." });
    } finally {
      setApprovingEval(false);
    }
  };

  const loadFormCounts = async () => {
    try {
      const res = await fetch("/api/approval?countOnly=1", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.counts) setFormCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load form counts:", err);
    }
  };

  const loadForms = async (status = activeTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approval?status=${status}`, { credentials: "include" });
      if (res.status === 401) {
        router.push("/login/approver");
        return;
      }
      const data = await res.json();
      setForms(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    loadForms(tab);
  };

  const handleRefresh = async () => {
    await Promise.all([loadFormCounts(), loadForms(activeTab), loadEvaluasiForms()]);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    sessionStorage.clear();
    window.location.href = "/login/approver";
  };

  // ── ADDED: Download rekap Excel khusus Workshop (sesuai tab aktif) ──
  const handleExportWorkshop = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/approval/export/workshop?status=${activeTab}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Gagal mengunduh rekap Excel Workshop.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Rekap_Workshop_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export workshop excel:", err);
      alert("Terjadi kesalahan saat mengunduh rekap Excel Workshop.");
    } finally {
      setExportLoading(false);
    }
  };

  // ── Auth loading ───────────────────────────────────────────
  // Jangan render halaman sebelum auth selesai
  if (authLoading || !user) return <AuthLoadingSpinner />;

  const normalizeDate = (d?: string) => {
    if (!d) return "";
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return d.slice(0, 10);
      return dateObj.toISOString().slice(0, 10);
    } catch {
      return String(d).slice(0, 10);
    }
  };

  const filtered = forms.filter((f) => {
    // Form lampiran izin kerja eksternal tidak ditampilkan langsung di luar form induk
    if (f.id_ijin_kerja && f.id_ijin_kerja.trim() !== "") return false;
    if (filterJenis !== "all" && f.jenis_form !== filterJenis) return false;

    // Filter tanggal pelaksanaan atau tanggal mulai kerja
    if (filterDate) {
      const matchPelaksanaan = normalizeDate(f.tanggal_pelaksanaan) === filterDate;
      const matchMulaiKerja = normalizeDate(f.tgl_mulai_kerja) === filterDate;
      const matchTanggal = normalizeDate(f.tanggal) === filterDate;
      if (!matchPelaksanaan && !matchMulaiKerja && !matchTanggal) {
        return false;
      }
    }

    // Fitur search: nama pekerja / kontraktor, deskripsi pekerjaan, kode / no registrasi
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = (f.id_form || "").toLowerCase().includes(q);
      const matchNoReg = (f.no_registrasi || "").toLowerCase().includes(q);
      const matchPemohon = (f.pemohon || f.nama_kontraktor_nik || "").toLowerCase().includes(q);
      const matchDeskripsi = (f.deskripsi_pekerjaan || "").toLowerCase().includes(q);
      const matchLokasi = (f.lokasi_pekerjaan || "").toLowerCase().includes(q);
      if (!matchId && !matchNoReg && !matchPemohon && !matchDeskripsi && !matchLokasi) {
        return false;
      }
    }

    return true;
  });
  const isAdmin = user.role === "admin";
  const isSecurity = user.role === "security";
  const isSfo = user.role === "sfo";

  // Filter ketat Evaluasi Akhir:
  // - Security: HANYA form yang Evaluasi Akhir-nya SUDAH disetujui Pengawas Dept
  // - SFO: HANYA form yang SUDAH diverifikasi Security
  // - Admin: Semua form
  const validEvalForms = evalForms.filter((f) => {
    if (isSecurity) {
      return Boolean(f.approval_flow?.pengawas_approved);
    }
    if (isSfo) {
      return Boolean(f.approval_flow?.pengawas_approved) && Boolean(f.approval_flow?.security_approved);
    }
    return true;
  });

  const evalStats = {
    pending: validEvalForms.filter((f) => f.is_pending_my_approval).length,
    approved: isSecurity
      ? validEvalForms.filter((f) => Boolean(f.approval_flow?.security_approved)).length
      : isSfo
      ? validEvalForms.filter((f) => Boolean(f.approval_flow?.sfo_approved)).length
      : validEvalForms.filter((f) => Boolean(f.approval_flow?.is_complete)).length,
    total: validEvalForms.length,
  };

  const displayedEval = validEvalForms.filter((item) => {
    if (evalFilterTab === "pending") return item.is_pending_my_approval;
    if (evalFilterTab === "approved") {
      if (isSecurity) return Boolean(item.approval_flow?.security_approved);
      if (isSfo) return Boolean(item.approval_flow?.sfo_approved);
      return Boolean(item.approval_flow?.is_complete);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/home" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Home className="w-5 h-5 text-slate-600" />
                </Link>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">Dashboard Approval</h1>
                    <p className="text-xs text-slate-500">PT Jatim Autocomp Indonesia</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* ADDED: Shortcut ke pengaturan routing email Admin K3 — admin only */}
                {isAdmin && (
                  <Link
                    href="/admin/admin-k3-routing"
                    title="Atur email Admin K3 per jenis form (hot-work/height-work/workshop)"
                    className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600
                              hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                  >
                    <Mail className="w-4 h-4" /> Routing Admin K3
                  </Link>
                )}
                {/* Gunakan data dari user (hasil /api/auth/me), bukan sessionStorage */}
                <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-sm font-semibold text-slate-700 block">{user.nama}</span>
                    <span className="text-xs text-slate-500">{user.jabatan} • {roleLabelMap[user.role] || user.role}</span>
                  </div>
                </div>
                <button onClick={handleRefresh} disabled={loading}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Refresh">
                  <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          {/* ── Switcher Tab Utama: Form Approval vs Evaluasi Akhir (Security, SFO, Admin) ── */}
          {(isSecurity || isSfo || isAdmin) && (
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveCategory("permits")}
                className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  activeCategory === "permits"
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20 ring-2 ring-orange-400/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Form Approval</span>
                {formCounts.submitted > 0 && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      activeCategory === "permits"
                        ? "bg-white/20 text-white"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {formCounts.submitted}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("evaluasi")}
                className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  activeCategory === "evaluasi"
                    ? "bg-purple-700 text-white shadow-md shadow-purple-900/20 ring-2 ring-purple-400/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Evaluasi Akhir</span>
                {evalStats.pending > 0 ? (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      activeCategory === "evaluasi"
                        ? "bg-white/25 text-white animate-pulse"
                        : "bg-purple-100 text-purple-700 animate-pulse"
                    }`}
                  >
                    {evalStats.pending} Menunggu
                  </span>
                ) : evalStats.total > 0 ? (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      activeCategory === "evaluasi"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {evalStats.total}
                  </span>
                ) : null}
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 1: FORM APPROVAL (PERMIT REGULER)
          ══════════════════════════════════════════════════════════ */}
          {activeCategory === "permits" && (
            <div className="space-y-5">
              {/* Info role */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Anda login sebagai: <span className="font-bold">{roleLabelMap[user.role] || user.role}</span>
                    </p>
                    <p className="text-xs text-blue-700">
                      {activeTab === "submitted"
                        ? "Menampilkan form perizinan yang menunggu approval Anda"
                        : activeTab === "approved"
                        ? "Menampilkan form perizinan yang telah Anda setujui"
                        : "Menampilkan form perizinan yang ditolak"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stat cards Permit */}
              <div className="grid grid-cols-3 gap-4">
                {statusTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`bg-white rounded-xl p-4 border-2 transition-all text-left cursor-pointer ${
                        activeTab === tab.key ? `${tab.border} shadow-md` : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tab.label}</span>
                        <Icon className={`w-4 h-4 ${tab.color}`} />
                      </div>
                      <p className={`text-3xl font-bold mt-2 ${tab.color}`}>
                        {formCounts[tab.key as keyof FormCounts]}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama pekerja/kontraktor, deskripsi, kode / no registrasi..."
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Tanggal Kalender (Tanggal Pelaksanaan / Mulai Kerja) */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500">
                      <Calendar className="w-4 h-4 text-slate-500 mr-2 shrink-0 pointer-events-none" />
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                        title="Filter berdasarkan Tanggal Pelaksanaan atau Mulai Kerja"
                      />
                      {filterDate && (
                        <button
                          type="button"
                          onClick={() => setFilterDate("")}
                          className="ml-1 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                          title="Hapus filter tanggal"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {(searchQuery || filterDate || filterJenis !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setFilterDate("");
                          setFilterJenis("all");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors shrink-0"
                        title="Reset Filter"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Actions Right (Admin Tools) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isAdmin && (
                      <Link
                        href="/admin/admin-k3-routing"
                        className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" /> Routing Admin K3
                      </Link>
                    )}

                    {isAdmin && (
                      <button
                        onClick={handleExportWorkshop}
                        disabled={exportLoading}
                        title="Download rekap Excel khusus Workshop Permit sesuai tab yang sedang aktif"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {exportLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        Excel Workshop
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Jenis Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Jenis:
                  </span>
                  {["all", "hot-work", "workshop", "height-work", "general-permit", ...(isSecurity || isAdmin ? ["external-permit"] : [])].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterJenis(type)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        filterJenis === type ? "bg-orange-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {type === "all" ? "Semua" : jenisLabel[type]}
                    </button>
                  ))}

                  <span className="ml-auto text-xs text-slate-400 font-medium">
                    Menampilkan <strong>{filtered.length}</strong> dari {forms.length} form
                  </span>
                </div>
              </div>

              {/* List Form Permit */}
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600" />
                  <p className="mt-3 text-slate-400 text-sm">Memuat data...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="font-semibold text-slate-600">
                    {activeTab === "submitted" ? "Tidak ada form yang menunggu approval Anda"
                      : activeTab === "approved" ? "Anda belum menyetujui form apapun"
                        : "Tidak ada form yang ditolak"}
                  </p>
                  {activeTab === "submitted" && (
                    <p className="text-slate-400 text-sm mt-1">Form akan muncul di sini ketika mencapai tahap approval Anda</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(form => {
                    const stageLabel = getStageLabelForForm(form);
                    const approvalStages = getApprovalStages(form);
                    const isEksternal = form.tipe_perusahaan === "eksternal";
                    const meta = jenisTheme[form.jenis_form] || {
                      icon: FileText,
                      borderLeft: "border-l-slate-400",
                      iconBg: "bg-slate-100",
                      iconColor: "text-slate-600",
                      badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
                      badgeText: form.jenis_form,
                    };
                    const PermitIcon = meta.icon;
                    const cfg = statusConfig[form.status] || statusConfig.submitted;

                    const reviewUrl =
                      form.jenis_form === "external-permit" || form.jenis_form === "general-permit"
                        ? `/approval/external/${form.id_form}`
                        : `/approval/${form.jenis_form}/${form.id_form}`;

                    return (
                      <div
                        key={form.id_form}
                        className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 space-y-3 border-l-4 ${meta.borderLeft}`}
                      >
                        {/* Baris 1: Header Card (Icon, Kode Form, Badge Jenis, Badge Status, Tombol REVIEW) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${meta.iconBg} ${meta.iconColor}`}>
                              <PermitIcon className="w-5 h-5" />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight">
                                {form.id_form}
                              </span>

                              {/* Badge Jenis Form */}
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${meta.badgeBg}`}>
                                {jenisLabel[form.jenis_form] || form.jenis_form}
                              </span>

                              {form.tipe_perusahaan && (
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
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
                                <span>{form.status === "submitted" ? (activeTab === "submitted" ? `Menunggu: ${stageLabel}` : "Diajukan") : cfg.label}</span>
                              </span>
                            </div>
                          </div>

                          {/* Right: Action Button Ringkas -> Tombol REVIEW */}
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Link
                              href={reviewUrl}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md hover:shadow-orange-500/20 active:scale-95 cursor-pointer"
                              title="Buka Halaman Review Form & Approval"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                        {/* Baris 2: Informasi Ringkasan Kerja (Compact Meta Row) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={form.pemohon || form.nama_kontraktor_nik || "-"}>
                                {form.pemohon || form.nama_kontraktor_nik || "-"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <CalendarClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                Pelaksanaan: <strong className="text-slate-800">{formatDate(form.tanggal_pelaksanaan || form.tgl_mulai_kerja)}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]" title={form.lokasi_pekerjaan || "-"}>
                                {form.lokasi_pekerjaan || "-"}
                              </span>
                            </div>
                          </div>

                          {/* Stage Progress Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                            {approvalStages.map((stage) => {
                              const isApproved = Boolean((form as any)[stage.key]);
                              return (
                                <span
                                  key={stage.key}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isApproved
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {isApproved ? "✓" : "○"} {stage.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Baris 3: Cuplikan Deskripsi Pekerjaan (jika ada) */}
                        {form.deskripsi_pekerjaan && (
                          <div className="text-xs text-slate-500 bg-slate-50/70 px-3 py-1.5 rounded-lg border border-slate-100 flex items-baseline gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Pekerjaan:</span>
                            <p className="line-clamp-1 text-slate-700 font-medium">{form.deskripsi_pekerjaan}</p>
                          </div>
                        )}

                        {/* SPV Terkait Ditugaskan jika general permit */}
                        {form.jenis_form === "general-permit" && form.spv_terkait_pj && (
                          <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                            <span>SPV Terkait Ditugaskan: <strong>{form.spv_terkait_pj}</strong>{form.nik_spv_terkait_pj ? ` (NIK: ${form.nik_spv_terkait_pj})` : ""}</span>
                          </div>
                        )}

                        {/* Notifikasi Ditolak Singkat jika ada catatan reject */}
                        {form.status === "rejected" && form.catatan_reject && (
                          <div className="text-xs text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="font-semibold">Ditolak:</span>
                            <span className="truncate">{form.catatan_reject}</span>
                          </div>
                        )}

                        {form.approved_by && activeTab !== "submitted" && (
                          <p className="text-[11px] text-emerald-600 font-medium">
                            ✓ {form.status === "approved" ? "Disetujui" : "Ditolak"} oleh <strong>{form.approved_by}</strong> — {formatDate(form.approved_at)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: EVALUASI AKHIR (PASCA-PEKERJAAN)
          ══════════════════════════════════════════════════════════ */}
          {activeCategory === "evaluasi" && (
            <div className="space-y-5">
              {/* Info role evaluasi */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-900">
                      Evaluasi Akhir Pasca-Kerja — Role: <span className="font-bold">{roleLabelMap[user.role] || user.role}</span>
                    </p>
                    <p className="text-xs text-purple-700">
                      {isSecurity
                        ? "Form evaluasi akhir hanya akan muncul jika telah diisi & disetujui Pengawas Dept, menunggu verifikasi lapangan oleh Security."
                        : isSfo
                        ? "Form evaluasi akhir hanya akan muncul jika telah diverifikasi Security, menunggu persetujuan akhir dari SFO."
                        : "Menampilkan daftar seluruh form evaluasi akhir pasca-pekerjaan."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stat cards Evaluasi Akhir */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setEvalFilterTab("pending")}
                  className={`bg-white rounded-xl p-4 border-2 transition-all text-left cursor-pointer ${
                    evalFilterTab === "pending"
                      ? "border-amber-500 shadow-md ring-2 ring-amber-400/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Menunggu Approval Anda
                    </span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-3xl font-bold mt-2 text-amber-600">
                    {evalStats.pending}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEvalFilterTab("approved")}
                  className={`bg-white rounded-xl p-4 border-2 transition-all text-left cursor-pointer ${
                    evalFilterTab === "approved"
                      ? "border-emerald-500 shadow-md ring-2 ring-emerald-400/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Sudah Disetujui
                    </span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold mt-2 text-emerald-600">
                    {evalStats.approved}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEvalFilterTab("all")}
                  className={`bg-white rounded-xl p-4 border-2 transition-all text-left cursor-pointer ${
                    evalFilterTab === "all"
                      ? "border-purple-500 shadow-md ring-2 ring-purple-400/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Total Evaluasi
                    </span>
                    <ClipboardCheck className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold mt-2 text-purple-600">
                    {evalStats.total}
                  </p>
                </button>
              </div>

              {/* Sub-Filter Tabs Evaluasi Akhir */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Tampilkan:</span>
                  <button
                    type="button"
                    onClick={() => setEvalFilterTab("pending")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      evalFilterTab === "pending"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Menunggu Approval ({evalStats.pending})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvalFilterTab("approved")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      evalFilterTab === "approved"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Sudah Disetujui ({evalStats.approved})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvalFilterTab("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      evalFilterTab === "all"
                        ? "bg-purple-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Semua ({evalStats.total})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadEvaluasiForms}
                  disabled={evalLoading}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                  title="Segarkan data evaluasi"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${evalLoading ? "animate-spin text-purple-600" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Grid Cards Evaluasi Akhir */}
              {evalLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-600" />
                  <p className="text-sm font-medium">Memuat data evaluasi akhir...</p>
                </div>
              ) : displayedEval.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700 text-base">
                    {evalFilterTab === "pending"
                      ? "Tidak ada form evaluasi akhir yang menunggu approval Anda"
                      : evalFilterTab === "approved"
                      ? "Belum ada form evaluasi akhir yang Anda setujui"
                      : "Belum ada data evaluasi akhir"}
                  </p>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-md mx-auto">
                    {isSecurity
                      ? "Form evaluasi akhir hanya akan muncul setelah Pengawas Dept menyetujui checklist evaluasi akhir pasca-kerja."
                      : isSfo
                      ? "Form evaluasi akhir hanya akan muncul setelah Security menyelesaikan verifikasi lapangan."
                      : "Form evaluasi akhir akan muncul secara bertahap sesuai alur verifikasi."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedEval.map(item => {
                    const canApprove = item.is_pending_my_approval;

                    return (
                      <div
                        key={item.id_form}
                        className={`bg-white rounded-2xl p-5 border-2 transition-all flex flex-col justify-between hover:shadow-md ${
                          canApprove
                            ? "border-purple-300 ring-2 ring-purple-100 shadow-sm"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          {/* Top Bar */}
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-md border border-purple-200">
                              {item.id_form}
                            </span>
                            {item.approval_flow.is_complete ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai SFO
                              </span>
                            ) : canApprove ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" /> Perlu Approval Anda
                              </span>
                            ) : item.approval_flow.security_approved ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                                Menunggu SFO
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                Menunggu Security
                              </span>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="space-y-2 text-xs text-slate-600 my-2">
                            <div className="flex items-start gap-2">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">
                                  {item.nama_kontraktor_pekerja || "-"}
                                </p>
                                {item.pimpinan_kontraktor && (
                                  <p className="text-[10px] text-slate-400 truncate">
                                    Pimpinan: {item.pimpinan_kontraktor}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <p className="text-slate-600 truncate">{item.lokasi_pekerjaan || "-"}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <p className="text-slate-500 text-[11px]">
                                {item.izin_kerja_tanggal_dari || item.tanggal || "-"} s/d{" "}
                                {item.izin_kerja_tanggal_sampai || item.tanggal_pelaksanaan || "-"}
                              </p>
                            </div>
                          </div>

                          {/* Mini Stage Stepper */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-[10px] my-3">
                            <span className={item.approval_flow.pengawas_approved ? "text-emerald-700 font-bold" : "text-slate-400"}>
                              {item.approval_flow.pengawas_approved ? "✓ Pengawas" : "○ Pengawas"}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span
                              className={
                                item.approval_flow.security_approved
                                  ? "text-emerald-700 font-bold"
                                  : isSecurity
                                  ? "text-amber-700 font-bold"
                                  : "text-slate-400"
                              }
                            >
                              {item.approval_flow.security_approved ? "✓ Security" : "○ Security"}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span
                              className={
                                item.approval_flow.sfo_approved
                                  ? "text-emerald-700 font-bold"
                                  : isSfo
                                  ? "text-amber-700 font-bold"
                                  : "text-slate-400"
                              }
                            >
                              {item.approval_flow.sfo_approved ? "✓ SFO" : "○ SFO"}
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvalItem(item);
                            setEvalReviewMessage(null);
                          }}
                          className={`w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                            canApprove
                              ? isSecurity
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                                : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          <span>
                            {canApprove
                              ? isSecurity
                                ? "Review & Verifikasi Security"
                                : "Review & Setujui SFO"
                              : "Lihat Evaluasi"}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Review / Approval Evaluasi Akhir ── */}
      {selectedEvalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full border border-purple-400/30">
                    Evaluasi Akhir Pasca-Kerja
                  </span>
                  <span className="text-xs font-mono font-bold bg-white/20 text-white px-2 py-0.5 rounded-md">
                    {selectedEvalItem.id_form}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  Verifikasi & Pengesahan Lapangan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvalItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Feedback Alert */}
              {evalReviewMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    evalReviewMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {evalReviewMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{evalReviewMessage.text}</span>
                </div>
              )}

              {/* Form Metadata Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Kontraktor / Pekerja</span>
                  <span className="font-bold text-slate-800 block mt-0.5 truncate">
                    {selectedEvalItem.nama_kontraktor_pekerja || "-"}
                  </span>
                  {selectedEvalItem.pimpinan_kontraktor && (
                    <span className="text-slate-500 text-[10px] block truncate">
                      Pimp: {selectedEvalItem.pimpinan_kontraktor}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Lokasi Pekerjaan</span>
                  <span className="font-bold text-slate-800 block mt-0.5 truncate">
                    {selectedEvalItem.lokasi_pekerjaan || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Periode Ijin Kerja</span>
                  <span className="font-bold text-slate-800 block mt-0.5 text-[11px]">
                    {selectedEvalItem.izin_kerja_tanggal_dari || selectedEvalItem.tanggal || "-"} s/d{" "}
                    {selectedEvalItem.izin_kerja_tanggal_sampai || selectedEvalItem.tanggal_pelaksanaan || "-"}
                  </span>
                </div>
              </div>

              {/* Workflow Stepper */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                <p className="text-[11px] font-bold text-purple-950 uppercase tracking-wide mb-2.5">
                  Status Pengesahan Bertahap
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* Step 1: Pengawas */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedEvalItem.approval_flow.pengawas_approved
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-white border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px]">1. Pengawas Dept</span>
                      {selectedEvalItem.approval_flow.pengawas_approved && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600">
                      {selectedEvalItem.approval_flow.pengawas_approved
                        ? `Disetujui: ${selectedEvalItem.evaluasi.submitted_by || selectedEvalItem.approval_flow.pengawas_approved_by || "Pengawas"}`
                        : "Belum disetujui"}
                    </p>
                  </div>

                  {/* Step 2: Security */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedEvalItem.approval_flow.security_approved
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : isSecurity && selectedEvalItem.is_pending_my_approval
                        ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200 text-blue-900"
                        : "bg-white border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px]">2. Security</span>
                      {selectedEvalItem.approval_flow.security_approved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isSecurity && selectedEvalItem.is_pending_my_approval ? (
                        <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-600">
                      {selectedEvalItem.approval_flow.security_approved
                        ? `Diverifikasi: ${selectedEvalItem.approval_flow.security_approved_by || "Security"}`
                        : selectedEvalItem.approval_flow.pengawas_approved
                        ? "Menunggu verifikasi lapangan"
                        : "Menunggu Pengawas Dept"}
                    </p>
                  </div>

                  {/* Step 3: SFO */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedEvalItem.approval_flow.sfo_approved
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : isSfo && selectedEvalItem.is_pending_my_approval
                        ? "bg-purple-50 border-purple-300 ring-1 ring-purple-200 text-purple-900"
                        : "bg-white border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px]">3. SFO</span>
                      {selectedEvalItem.approval_flow.sfo_approved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isSfo && selectedEvalItem.is_pending_my_approval ? (
                        <Clock className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-600">
                      {selectedEvalItem.approval_flow.sfo_approved
                        ? `Disetujui: ${selectedEvalItem.approval_flow.sfo_approved_by || "SFO"}`
                        : selectedEvalItem.approval_flow.security_approved
                        ? "Menunggu persetujuan akhir"
                        : "Menunggu Security"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Checklist 6 Item (Readonly view of what pengawas submitted) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Hasil Checklist Evaluasi Akhir
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Diisi oleh Pengawas Dept
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { key: "area_bersih_rapi", num: 1, title: "Area bersih & rapih", desc: "Area kerja telah dibersihkan dan dirapikan kembali seperti kondisi semula." },
                    { key: "limbah_ditangani_baik", num: 2, title: "Limbah ditangani dengan baik", desc: "Seluruh limbah, sisa material, dan sampah kerja telah dibuang sesuai prosedur K3." },
                    { key: "instalasi_listrik_aman", num: 3, title: "Instalasi listrik aman", desc: "Semua kabel sementara, sambungan daya, dan panel telah diamankan/dicabut." },
                    { key: "tdk_ada_kerusakan_property", num: 4, title: "Tidak ada kerusakan property", desc: "Tidak terdapat kerusakan fasilitas, mesin, atau gedung milik PT. JAI." },
                    { key: "ada_tumpahan_kimia_bbm", num: 5, title: "Ada tumpahan bahan kimia/BBM", desc: "Pemeriksaan ada/tidaknya ceceran oli, bahan bakar, atau zat kimia di lokasi." },
                    { key: "tdk_ada_kehilangan_property", num: 6, title: "Tidak ada kehilangan property", desc: "Tidak ada barang, perkakas, atau inventaris milik perusahaan yang hilang." },
                  ].map((item) => {
                    const isChecked = Boolean((selectedEvalItem.evaluasi as any)[item.key]);

                    return (
                      <div
                        key={item.key}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          isChecked
                            ? "bg-slate-50/80 border-slate-200"
                            : "bg-slate-50/40 border-slate-200 opacity-75"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                              isChecked
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-slate-200 border-slate-300 text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {item.num}. {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                            isChecked
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isChecked ? "✓ Ya" : "Belum"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedEvalItem(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                {/* Security Action */}
                {(isSecurity || isAdmin) &&
                  !selectedEvalItem.approval_flow.security_approved &&
                  selectedEvalItem.approval_flow.pengawas_approved && (
                    <button
                      type="button"
                      onClick={() => handleApproveEvaluasi("approve_security")}
                      disabled={approvingEval}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {approvingEval ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Verifikasi & Teruskan ke SFO
                    </button>
                  )}

                {/* SFO Action */}
                {(isSfo || isAdmin) &&
                  selectedEvalItem.approval_flow.security_approved &&
                  !selectedEvalItem.approval_flow.sfo_approved && (
                    <button
                      type="button"
                      onClick={() => handleApproveEvaluasi("approve_sfo")}
                      disabled={approvingEval}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {approvingEval ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Setujui Evaluasi Akhir (SFO - Selesai)
                    </button>
                  )}

                {selectedEvalItem.approval_flow.sfo_approved && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Proses Pengesahan Selesai
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}