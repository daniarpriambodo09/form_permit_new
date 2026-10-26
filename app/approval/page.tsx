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
    iconBg: "bg-orange-50 text-orange-600",
    iconColor: "text-orange-600",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    badgeText: "Hot Work",
  },
  "workshop": {
    icon: Wrench,
    borderLeft: "border-l-blue-500",
    iconBg: "bg-blue-50 text-blue-600",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    badgeText: "Workshop",
  },
  "height-work": {
    icon: AlertCircle,
    borderLeft: "border-l-amber-500",
    iconBg: "bg-amber-50 text-amber-600",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    badgeText: "Ketinggian",
  },
  "general-permit": {
    icon: Layers,
    borderLeft: "border-l-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeText: "Ijin Eksternal",
  },
  "external-permit": {
    icon: Shield,
    borderLeft: "border-l-slate-400",
    iconBg: "bg-slate-100 text-slate-600",
    iconColor: "text-slate-600",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
    badgeText: "Safety Induction",
  },
};

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; dot: string; border: string }> = {
  draft: {
    label: "Draft",
    icon: FileText,
    color: "text-slate-600",
    bg: "bg-slate-100",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
  submitted: {
    label: "Menunggu Approval",
    icon: Clock,
    color: "text-amber-800",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    border: "border-amber-200",
  },
  approved: {
    label: "Disetujui",
    icon: CheckCircle2,
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
  },
  rejected: {
    label: "Ditolak",
    icon: XCircle,
    color: "text-rose-800",
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
  admin: "Admin K3 / Admin",
  security: "Security",
  pengawas: "Pengawas Dept",
  purchasing: "Purchasing",
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
  {
    key: "submitted",
    label: "Belum Disetujui",
    icon: Clock,
    color: "text-amber-600",
    iconBg: "bg-amber-50 border border-amber-100",
    activeClass: "bg-white border-2 border-orange-500 shadow-xs ring-1 ring-orange-500/10",
    inactiveClass: "bg-white/80 border border-slate-200/90 hover:border-slate-300 hover:bg-white text-slate-600",
    countColor: "text-slate-900",
    accentBar: "bg-orange-500",
  },
  {
    key: "approved",
    label: "Sudah Disetujui",
    icon: CheckCircle2,
    color: "text-emerald-600",
    iconBg: "bg-emerald-50 border border-emerald-100",
    activeClass: "bg-white border-2 border-emerald-500 shadow-xs ring-1 ring-emerald-500/10",
    inactiveClass: "bg-white/80 border border-slate-200/90 hover:border-slate-300 hover:bg-white text-slate-600",
    countColor: "text-slate-900",
    accentBar: "bg-emerald-500",
  },
  {
    key: "rejected",
    label: "Ditolak / Revisi",
    icon: XCircle,
    color: "text-rose-600",
    iconBg: "bg-rose-50 border border-rose-100",
    activeClass: "bg-white border-2 border-rose-500 shadow-xs ring-1 ring-rose-500/10",
    inactiveClass: "bg-white/80 border border-slate-200/90 hover:border-slate-300 hover:bg-white text-slate-600",
    countColor: "text-slate-900",
    accentBar: "bg-rose-500",
  },
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

  // Muat data hanya setelah auth selesai & berhasil
  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      loadFormCounts(),
      loadForms("submitted"),
    ]).finally(() => setLoading(false));
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

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
    await Promise.all([loadFormCounts(), loadForms(activeTab)]);
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
  const initials = (user.nama || user.username || "AP")
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleBadge = roleLabelMap[user.role] || user.role;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800">
      <Sidebar />
      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300">
        {/* ── 1. Topbar Sticky (Clean, Professional & Polished) ── */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            
            {/* Left: Brand & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/home"
                className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0 border border-slate-200 shadow-2xs"
                title="Kembali ke Beranda"
              >
                <Home className="w-4 h-4" />
              </Link>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    Dashboard Approval
                  </h1>
                  <p className="text-[11px] text-slate-500 truncate">
                    PT Jatim Autocomp Indonesia • Form Permit System
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Quick Tools, User Profile, Refresh, Logout */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {isAdmin && (
                <Link
                  href="/admin/admin-k3-routing"
                  title="Atur email Admin K3 per jenis form"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-200"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Routing Admin K3</span>
                </Link>
              )}

              {/* User Profile Pill */}
              <div className="flex items-center gap-2.5 bg-slate-100/90 border border-slate-200 rounded-xl px-3 py-1.5">
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                  {initials}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[140px]">
                    {user.nama}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 border border-orange-200 uppercase">
                      {roleBadge}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                      {user.departmen ? `Dept. ${user.departmen}` : "Approver"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                title="Muat ulang data"
                className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-600" : ""}`} />
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── 2. Konten Halaman Utama ── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
          
          {/* Context Strip (Clean Light Card) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">Hak Akses:</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 uppercase">
                    {roleBadge}
                  </span>
                  {user.departmen && (
                    <span className="text-xs text-slate-500">
                      • Departemen {user.departmen}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === "submitted"
                    ? "Menampilkan formulir perizinan yang memerlukan persetujuan dan verifikasi Anda."
                    : activeTab === "approved"
                    ? "Menampilkan riwayat formulir izin kerja yang telah Anda setujui."
                    : "Menampilkan daftar formulir perizinan kerja yang ditolak atau memerlukan revisi."}
                </p>
              </div>
            </div>
          </div>

          {/* ── 3. KPI Tabs (Clean Corporate Light) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {statusTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const count = formCounts[tab.key as keyof FormCounts];

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`rounded-xl p-4 sm:p-5 text-left transition-all duration-150 cursor-pointer relative overflow-hidden ${
                    isActive ? tab.activeClass : tab.inactiveClass
                  }`}
                >
                  {/* Top Accent Stripe */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${tab.accentBar} ${isActive ? "opacity-100" : "opacity-0"} transition-opacity`} />

                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-bold tracking-wider uppercase block ${
                        isActive ? "text-slate-900" : "text-slate-600"
                      }`}>
                        {tab.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {tab.key === "submitted"
                          ? "Perlu Otorisasi"
                          : tab.key === "approved"
                          ? "Telah Disetujui"
                          : "Ditolak / Revisi"}
                      </span>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tab.iconBg} ${tab.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2.5">
                      <span className={`text-3xl font-mono font-extrabold tracking-tight ${tab.countColor}`}>
                        {count}
                      </span>
                      {tab.key === "submitted" && count > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                          {count} Menunggu
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    {tab.key === "submitted"
                      ? "Menunggu peninjauan & otorisasi Anda"
                      : tab.key === "approved"
                      ? "Izin kerja telah disahkan & aktif"
                      : "Form tidak disetujui atau perlu perbaikan"}
                  </p>
                </button>
              );
            })}
          </div>

              {/* Search & Filter Bar (Clean Light Theme) */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama pemohon/kontraktor, deskripsi, kode atau no permit..."
                      className="w-full pl-10 pr-10 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Tanggal Kalender (Tanggal Pelaksanaan / Mulai Kerja) */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <Calendar className="w-4 h-4 text-slate-500 mr-2 shrink-0 pointer-events-none" />
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                        title="Filter berdasarkan Tanggal Pelaksanaan atau Mulai Kerja"
                      />
                      {filterDate && (
                        <button
                          type="button"
                          onClick={() => setFilterDate("")}
                          className="ml-1.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
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
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shrink-0 cursor-pointer"
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
                      <button
                        onClick={handleExportWorkshop}
                        disabled={exportLoading}
                        title="Download rekap Excel khusus Workshop Permit sesuai tab yang sedang aktif"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {exportLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        <span>Excel Workshop</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Jenis Tabs - Clean Uniform Styling (No Rainbow Colors) */}
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
                  </span>
                  {[
                    { id: "all", label: "Semua" },
                    { id: "hot-work", label: "Hot Work" },
                    { id: "workshop", label: "Workshop" },
                    { id: "height-work", label: "Ketinggian" },
                    { id: "general-permit", label: "Eksternal" },
                    ...(isSecurity || isAdmin ? [{ id: "external-permit", label: "Safety Induction" }] : []),
                  ].map(item => {
                    const isSelected = filterJenis === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setFilterJenis(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-orange-600 text-white font-semibold shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 font-medium"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}

                  <span className="ml-auto text-xs text-slate-500">
                    Menampilkan <strong className="text-slate-800 font-bold">{filtered.length}</strong> dari {forms.length} formulir
                  </span>
                </div>
              </div>

              {/* List Form Permit */}
              {loading ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-orange-600" />
                  <p className="mt-3 text-slate-500 text-xs sm:text-sm">Memuat data formulir approval...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-2xs">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    {activeTab === "submitted" ? "Tidak ada form yang menunggu approval Anda"
                      : activeTab === "approved" ? "Anda belum menyetujui form apapun"
                        : "Tidak ada form yang ditolak"}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 max-w-md mx-auto">
                    {activeTab === "submitted"
                      ? "Seluruh antrean izin kerja telah selesai ditinjau. Formulir baru akan muncul di sini secara otomatis."
                      : "Semua riwayat formulir izin kerja yang telah selesai diproses tercatat di sini."}
                  </p>
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
                        className={`group bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all p-4 sm:p-5 space-y-3.5 border-l-4 ${meta.borderLeft}`}
                      >
                        {/* Baris 1: Header Card (Icon, Kode Form, Badge Jenis, Badge Status, Tombol REVIEW) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                              <PermitIcon className="w-4 h-4" />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-base font-bold text-slate-900 font-mono tracking-tight group-hover:text-orange-600 transition-colors">
                                {form.id_form}
                              </span>

                              {/* Badge Jenis Form */}
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${meta.badgeBg}`}>
                                {jenisLabel[form.jenis_form] || form.jenis_form}
                              </span>

                              {form.tipe_perusahaan && (
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
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
                                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                                <span>{form.status === "submitted" ? (activeTab === "submitted" ? `Menunggu: ${stageLabel}` : "Diajukan") : cfg.label}</span>
                              </span>
                            </div>
                          </div>

                          {/* Right: Action Button Ringkas -> Tombol REVIEW */}
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Link
                              href={reviewUrl}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                              title="Buka Halaman Review Form & Approval"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{activeTab === "submitted" ? "Review & Setujui" : "Lihat Detail"}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                        {/* Baris 2: Informasi Ringkasan Kerja (Compact Meta Row) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={form.pemohon || form.nama_kontraktor_nik || "-"}>
                                {form.pemohon || form.nama_kontraktor_nik || "-"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <CalendarClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                Pelaksanaan: <strong className="text-slate-700 font-semibold">{formatDate(form.tanggal_pelaksanaan || form.tgl_mulai_kerja)}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px] text-slate-600" title={form.lokasi_pekerjaan || "-"}>
                                {form.lokasi_pekerjaan || "-"}
                              </span>
                            </div>
                          </div>

                          {/* Stage Progress Chips (Clean Subdued) */}
                          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                            {approvalStages.map((stage) => {
                              const isApproved = Boolean((form as any)[stage.key]);
                              const isCurrentWaitingStage =
                                form.status === "submitted" &&
                                !isApproved &&
                                stageLabel.toLowerCase() === stage.label.toLowerCase();

                              return (
                                <span
                                  key={stage.key}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                    isApproved
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                                      : isCurrentWaitingStage
                                      ? "bg-orange-50 text-orange-800 border-orange-300 font-bold ring-1 ring-orange-300"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {isApproved ? "✓" : isCurrentWaitingStage ? "●" : "○"} {stage.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Baris 3: Cuplikan Deskripsi Pekerjaan (jika ada) */}
                        {form.deskripsi_pekerjaan && (
                          <div className="text-xs text-slate-600 bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-100 flex items-baseline gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 tracking-wider">Pekerjaan:</span>
                            <p className="line-clamp-1 text-slate-700 font-medium">{form.deskripsi_pekerjaan}</p>
                          </div>
                        )}

                        {/* SPV Terkait Ditugaskan jika general permit */}
                        {form.jenis_form === "general-permit" && form.spv_terkait_pj && (
                          <div className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-center gap-2">
                            <User className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                            <span>SPV Terkait Ditugaskan: <strong className="font-semibold text-indigo-900">{form.spv_terkait_pj}</strong>{form.nik_spv_terkait_pj ? ` (NIK: ${form.nik_spv_terkait_pj})` : ""}</span>
                          </div>
                        )}

                        {/* Notifikasi Ditolak Singkat jika ada catatan reject */}
                        {form.status === "rejected" && form.catatan_reject && (
                          <div className="text-xs text-rose-800 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="font-semibold">Ditolak:</span>
                            <span className="truncate">{form.catatan_reject}</span>
                          </div>
                        )}

                        {form.approved_by && activeTab !== "submitted" && (
                          <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <span>{form.status === "approved" ? "Disetujui" : "Ditolak"} oleh <strong className="text-emerald-800">{form.approved_by}</strong> — {formatDate(form.approved_at)}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
        </main>
      </div>
    </div>
  );
}
