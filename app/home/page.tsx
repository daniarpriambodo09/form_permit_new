// app/home/page.tsx
// Home Page Berbasis Role yang Informatif, Dinamis, dan Modern untuk PT. JAI Form Permit System
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { getFeaturedCards, ROLE_LABEL, UserRole } from "@/lib/nav-config";
import {
  Flame,
  FileText,
  AlertTriangle,
  Building2,
  ShieldCheck,
  ArrowRight,
  ClipboardCheck,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Users,
  BarChart3,
  Sparkles,
  BadgeCheck,
  Briefcase,
  ChevronRight,
  AlertCircle,
  Eye,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";

interface PermitType {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  href: string;
  tag: string;
}

const PERMIT_TYPES: PermitType[] = [
  {
    id: "general-permit",
    name: "Izin Kerja Eksternal",
    badge: "Subkontraktor",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    description:
      "Untuk pekerjaan pihak ketiga / kontraktor luar di lingkungan PT. JAI. Dilengkapi JSA, lisensi pekerja, dan verifikasi digital berjenjang.",
    icon: Building2,
    iconBg: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
    href: "/form/ijin-kerja-eksternal",
    tag: "Vendor & Rekanan Luar",
  },
  {
    id: "hot-work",
    name: "Izin Kerja Panas",
    badge: "Hot Work",
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
    description:
      "Untuk pekerjaan yang menghasilkan nyala api, panas, atau percikan seperti Cutting, Grinding, Welding, dan Painting di area kerja.",
    icon: Flame,
    iconBg: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
    href: "/form/hot-work",
    tag: "Potensi Api & Panas",
  },
  {
    id: "workshop",
    name: "Izin Kerja Workshop",
    badge: "Workshop",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    description:
      "Untuk aktivitas pekerjaan di area workshop pabrik yang melibatkan mesin perkakas berputar, instalasi alat, dan perbaikan mekanikal.",
    icon: FileText,
    iconBg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    href: "/form/workshop",
    tag: "Area Bengkel & Mesin",
  },
  {
    id: "height-work",
    name: "Izin Kerja di Ketinggian",
    badge: "Height Work",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    description:
      "Untuk pekerjaan di atas 1.8 meter dengan risiko jatuh dari ketinggian. Memerlukan full body harness, scaffolding, dan life line aman.",
    icon: AlertTriangle,
    iconBg: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    href: "/form/height-work",
    tag: "Ketinggian > 1.8 Meter",
  },
];

interface RecentFormItem {
  id_form: string;
  jenis_form: string;
  status: string;
  tanggal?: string;
  created_at?: string;
  pemohon?: string;
  nama_kontraktor_pekerja?: string;
  lokasi?: string;
  lokasi_pekerjaan?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return { label: "Disetujui", bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 };
    case "submitted":
      return { label: "Menunggu Approval", bg: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock };
    case "rejected":
      return { label: "Ditolak / Revisi", bg: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle };
    case "draft":
    default:
      return { label: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText };
  }
}

function getPermitLabel(jenis: string): string {
  switch (jenis) {
    case "general-permit":
      return "Izin Kerja Eksternal";
    case "hot-work":
      return "Izin Kerja Panas";
    case "workshop":
      return "Izin Kerja Workshop";
    case "height-work":
      return "Izin Ketinggian";
    default:
      return jenis || "Izin Kerja";
  }
}

function formatDateSafe(val?: string): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(val).slice(0, 10);
  }
}

function getFormDetailHref(role: UserRole | null, item: RecentFormItem): string {
  if (role === "purchasing") return "/purchasing";
  if (role === "pengawas") return "/pengawas";
  if (role === "worker") return `/my-forms/${item.jenis_form}/${item.id_form}`;
  if (item.jenis_form === "general-permit") return `/approval/external/${item.id_form}`;
  return `/approval/${item.jenis_form}/${item.id_form}`;
}

export default function HomePage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState("");
  const [userDept, setUserDept] = useState("");
  const [userNik, setUserNik] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);

  // Live Stats State
  const [stats, setStats] = useState<{
    total: number;
    submitted: number;
    approved: number;
    draftOrRejected: number;
  }>({ total: 0, submitted: 0, approved: 0, draftOrRejected: 0 });

  // Recent/Actionable Forms State
  const [recentForms, setRecentForms] = useState<RecentFormItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // 1. Load Role-Specific Data & Statistics
  const loadDashboardData = useCallback(async (currentRole: UserRole) => {
    setLoadingStats(true);
    try {
      if (currentRole === "worker") {
        // Fetch form list milik worker (/api/my-forms return { data: all, total: all.length })
        const res = await fetch("/api/my-forms", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          const list: RecentFormItem[] = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
            ? json
            : [];

          const total = list.length;
          const submitted = list.filter((f) => f.status === "submitted").length;
          const approved = list.filter((f) => f.status === "approved").length;
          const draftOrRejected = list.filter(
            (f) => f.status === "draft" || f.status === "rejected"
          ).length;

          setStats({ total, submitted, approved, draftOrRejected });
          setRecentForms(list.slice(0, 5));
        }
      } else if (currentRole === "admin") {
        // Fetch dashboard statistics untuk admin
        const res = await fetch("/api/dashboard/stats", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setStats({
            total: data.totalForms || 0,
            submitted: data.submitted || 0,
            approved: data.approved || 0,
            draftOrRejected: (data.draft || 0) + (data.rejected || 0),
          });
          const recent = Array.isArray(data.recentForms) ? data.recentForms : [];
          setRecentForms(recent.slice(0, 5));
        }
      } else if (currentRole === "purchasing" || currentRole === "pengawas") {
        // Fetch data penilaian subkontraktor
        const res = await fetch("/api/penilaian-subkontraktor", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          const items: any[] = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
            ? json
            : [];

          const total = items.length;
          const submitted =
            currentRole === "purchasing"
              ? items.filter((i) => !i.approval_status?.purchasing).length
              : items.filter((i) => !i.approval_status?.pengawas).length;
          const approved =
            currentRole === "purchasing"
              ? items.filter((i) => i.approval_status?.purchasing).length
              : items.filter((i) => i.approval_status?.pengawas).length;

          setStats({ total, submitted, approved, draftOrRejected: 0 });
          setRecentForms(
            items.slice(0, 5).map((i) => ({
              id_form: i.id_form,
              jenis_form: "general-permit",
              status: i.status || "submitted",
              tanggal: i.tanggal,
              created_at: i.created_at,
              nama_kontraktor_pekerja: i.nama_kontraktor_pekerja,
              lokasi_pekerjaan: i.lokasi_pekerjaan,
            }))
          );
        }
      } else {
        // Approver roles: SPV, SFO, SMR, Security, Admin K3, Firewatch, Kontraktor
        const [countRes, listRes] = await Promise.all([
          fetch("/api/approval?countOnly=1", { credentials: "include" }),
          fetch("/api/approval?status=submitted", { credentials: "include" }),
        ]);

        let submittedCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;

        if (countRes.ok) {
          const countData = await countRes.json();
          submittedCount = countData.counts?.submitted ?? 0;
          approvedCount = countData.counts?.approved ?? 0;
          rejectedCount = countData.counts?.rejected ?? 0;
        }

        if (listRes.ok) {
          const listData = await listRes.json();
          const items: RecentFormItem[] = Array.isArray(listData?.data)
            ? listData.data
            : Array.isArray(listData)
            ? listData
            : [];
          setRecentForms(items.slice(0, 5));
        }

        setStats({
          total: submittedCount + approvedCount + rejectedCount,
          submitted: submittedCount,
          approved: approvedCount,
          draftOrRejected: rejectedCount,
        });
      }
    } catch (err) {
      console.error("[HomePage] Error loading dashboard data:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 2. Load User Session
  useEffect(() => {
    const cachedRole = (sessionStorage.getItem("user_role") as UserRole | null) || null;
    const cachedName = sessionStorage.getItem("user_nama") || "";
    if (cachedRole) {
      setRole(cachedRole);
      setUserName(cachedName);
      setLoadingRole(false);
      loadDashboardData(cachedRole);
    }

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          const userRole = data.user.role as UserRole;
          setRole(userRole);
          setUserName(data.user.nama || data.user.username || "");
          setUserDept(data.user.departmen || "");
          setUserNik(data.user.nik || "");
          sessionStorage.setItem("user_role", userRole);
          sessionStorage.setItem("user_nama", data.user.nama || "");
          loadDashboardData(userRole);
        }
      })
      .catch((err) => console.error("[HomePage] Error auth/me:", err))
      .finally(() => setLoadingRole(false));
  }, [loadDashboardData]);

  const featuredCards = role ? getFeaturedCards(role) : [];
  const firstName = userName.split(" ")[0] || "";
  const greeting = getGreeting();

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isApprover = role && ["spv", "sfo", "smr", "admin_k3", "security", "firewatch", "kontraktor"].includes(role);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Konten Utama Responsif dengan Sidebar */}
      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300">
        
        {/* Topbar Modern */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
          <div className="px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="pl-14 lg:pl-0 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="capitalize">{todayLabel}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
                {loadingRole ? "Memuat…" : `${greeting}, ${firstName || "User"}`}
              </h1>
            </div>

            {/* Profile Pill di Kanan Topbar */}
            {!loadingRole && role && (
              <div className="flex items-center gap-2 shrink-0">
                {userDept && (
                  <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                    Dept: {userDept}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                  <span>{ROLE_LABEL[role] || role}</span>
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="px-5 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto space-y-8">
          
          {/* ══════════════════════════════════════════════════════════
              1. HERO BANNER DINAMIS SESUAI ROLE
          ══════════════════════════════════════════════════════════ */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-6 sm:p-10 shadow-xl border border-slate-800">
            {/* Ambient Glow Effects */}
            <div className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -left-10 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className={`${isApprover || role === "worker" ? "max-w-3xl" : "max-w-2xl"} space-y-3`}>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/15 rounded-full px-3 py-1 text-xs font-semibold text-orange-300">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    {role === "admin"
                      ? "Pusat Kendali Administrator"
                      : role === "spv"
                      ? `Supervisor Departemen • ${userDept || "PT JAI"}`
                      : role === "sfo"
                      ? "Safety Officer (SFO) Portal"
                      : role === "security"
                      ? "Pos Verifikasi & Safety Induction"
                      : role === "purchasing"
                      ? "Portal Penilaian Vendor & Subkontraktor"
                      : role === "pengawas"
                      ? "Portal Pengawas Lapangan K3"
                      : isApprover
                      ? `Otorisasi Izin Kerja • ${ROLE_LABEL[role!]}`
                      : "Prioritas Keselamatan Kerja PT JAI"}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                  {role === "admin" ? (
                    <>Sistem Manajemen Izin Kerja <span className="text-orange-400">Terpusat</span></>
                  ) : role === "worker" ? (
                    <>Manajemen Izin Kerja <span className="text-orange-400">Berbasis Digital</span></>
                  ) : isApprover ? (
                    <>Portal Otorisasi & <span className="text-orange-400">Verifikasi Izin Kerja</span></>
                  ) : role === "purchasing" ? (
                    <>Evaluasi & Penilaian <span className="text-orange-400">Subkontraktor</span></>
                  ) : (
                    <>Pengawasan Harian & <span className="text-orange-400">Standar K3 Pabrik</span></>
                  )}
                </h2>

                <p className={`text-slate-300 text-xs sm:text-sm leading-relaxed ${isApprover || role === "worker" ? "max-w-2xl" : "max-w-xl"}`}>
                  {role === "admin"
                    ? "Kelola pengguna, konfigurasi routing email approval K3, lisensi pekerja, dan pantau status perizinan seluruh area operasional PT JAI."
                    : role === "worker"
                    ? "Ajukan perizinan kerja internal maupun eksternal, lengkapi JSA, dan pantau proses verifikasi barcode digital berjenjang secara real-time."
                    : isApprover
                    ? "Tinjau kelengkapan teknis, identifikasi bahaya, dan bubuhkan barcode persetujuan resmi secara langsung dan terintegrasi."
                    : role === "purchasing"
                    ? "Pantau kepatuhan K3 vendor rekanan eksternal, verifikasi hasil pengawasan lapangan, dan unduh dokumen evaluasi akhir."
                    : "Lakukan checklist keselamatan berkala bagi tenaga kerja rekanan demi memastikan standar zero accident di area operasional."}
                </p>
              </div>

              {/* Action Quick Links di Hero Banner (Hanya untuk role yang belum memiliki navigasi spesifik di bawahnya) */}
              {!isApprover && role !== "worker" && (
                <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0">
                  {role === "admin" ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-600/30 active:scale-95"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Dashboard Analitik</span>
                      </Link>
                      <Link
                        href="/admin-users"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition-all border border-white/15"
                      >
                        <Users className="w-4 h-4" />
                        <span>Kelola Akun Pengguna</span>
                      </Link>
                    </>
                  ) : role === "purchasing" ? (
                    <Link
                      href="/purchasing"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-600/30 active:scale-95"
                    >
                      <span>Penilaian Subkontraktor</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/pengawas"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-600/30 active:scale-95"
                    >
                      <span>Buka Portal Pengawas</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              2. KARTU STATISTIK & METRIK INFORMATIF
          ══════════════════════════════════════════════════════════ */}
          <section>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {role === "worker"
                    ? "Ringkasan Pengajuan Anda"
                    : isApprover
                    ? "Status Antrean & Otorisasi"
                    : role === "admin"
                    ? "Metrik Global Izin Kerja"
                    : "Status Penilaian & Pengawasan"}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Data Real-Time</span>
            </div>

            {loadingStats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Stat 1: Total */}
                <Link
                  href={isApprover ? "/approval" : role === "worker" ? "/my-forms" : "/dashboard"}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {role === "worker"
                        ? "Total Pengajuan"
                        : isApprover
                        ? "Total Form"
                        : "Total Seluruh Form"}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                      {stats.total}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Semua izin kerja</span>
                  </div>
                </Link>

                {/* Stat 2: Pending / Menunggu Tindakan */}
                <Link
                  href={isApprover ? "/approval?status=submitted" : role === "worker" ? "/my-forms" : "#"}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/80 hover:border-amber-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      {isApprover ? "Belum Disetujui" : "Menunggu Approval"}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tracking-tight">
                        {stats.submitted}
                      </span>
                      {stats.submitted > 0 && isApprover && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 animate-pulse">
                          Perlu Tindakan
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {isApprover ? "Menunggu persetujuan Anda" : "Sedang dalam review"}
                    </span>
                  </div>
                </Link>

                {/* Stat 3: Approved */}
                <Link
                  href={isApprover ? "/approval?status=approved" : role === "worker" ? "/my-forms" : "#"}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">
                      {isApprover ? "Sudah Disetujui" : "Telah Disetujui"}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      {stats.approved}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Izin kerja aktif / valid</span>
                  </div>
                </Link>

                {/* Stat 4: Draft / Rejected */}
                <Link
                  href={isApprover ? "/approval?status=rejected" : role === "worker" ? "/my-forms" : "#"}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {role === "worker" ? "Draft & Revisi" : "Ditolak"}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-700 font-mono tracking-tight">
                      {stats.draftOrRejected}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {role === "worker" ? "Perlu perbaikan / lanjut" : "Form tidak disetujui"}
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════
              3. AKSES CEPAT (FEATURED CARDS SESUAI ROLE)
          ══════════════════════════════════════════════════════════ */}
          <section>
            <div className="flex items-center gap-2 mb-3.5">
              <Zap className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Akses Cepat & Tindakan Utama</h3>
            </div>

            {loadingRole ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : featuredCards.length === 1 ? (
              <div>
                {featuredCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="group bg-white border border-slate-200/90 hover:border-orange-400
                                 hover:shadow-md rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-3 bg-orange-50 group-hover:bg-orange-100 rounded-xl text-orange-600 transition-colors shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-orange-600 transition-colors">
                            {card.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{card.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-orange-600 shrink-0 self-end sm:self-auto bg-orange-50/80 group-hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors">
                        <span>Buka Halaman</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                  featuredCards.length >= 3 ? "lg:grid-cols-3" : ""
                }`}
              >
                {featuredCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="group bg-white border border-slate-200/90 hover:border-orange-400
                                 hover:shadow-lg rounded-2xl p-5 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2.5 bg-orange-50 group-hover:bg-orange-100 rounded-xl text-orange-600 transition-colors">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-orange-50 flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors">
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-orange-600 transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-orange-600">
                        <span>Buka Halaman</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════
              4. PILIHAN FORMULIR IZIN KERJA (LENGKAP 4 KATEGORI - WORKER)
          ══════════════════════════════════════════════════════════ */}
          {!loadingRole && role === "worker" && (
            <section id="pilih-form" className="scroll-mt-20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Pilih Jenis Izin Kerja (Form Permit)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">4 Kategori Aktif</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {PERMIT_TYPES.map((permit) => {
                  const Icon = permit.icon;
                  return (
                    <Link
                      key={permit.id}
                      href={permit.href}
                      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-orange-400
                                 hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3.5">
                          <div className={`p-3 rounded-xl ${permit.iconBg} transition-colors`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${permit.badgeColor}`}
                          >
                            {permit.badge}
                          </span>
                        </div>

                        <div className="mb-2">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            {permit.tag}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {permit.name}
                          </h4>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
                          {permit.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600 group-hover:text-orange-700">
                        <span>Buat Form Izin</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════
              5. AKTIVITAS & FORM TERBARU (LIVE FEED)
          ══════════════════════════════════════════════════════════ */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {role === "worker"
                      ? "Pengajuan Terakhir Anda"
                      : isApprover
                      ? "Menunggu Persetujuan Anda Segera"
                      : "Aktivitas Izin Kerja Terkini"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {role === "worker"
                      ? "Pantau status form yang baru saja Anda buat"
                      : isApprover
                      ? "Form pada antrean yang memerlukan otorisasi Anda"
                      : "Ringkasan data izin kerja terbaru di sistem"}
                  </p>
                </div>
              </div>

              <Link
                href={isApprover ? "/approval" : role === "worker" ? "/my-forms" : "/dashboard"}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 hover:underline"
              >
                <span>Lihat Selengkapnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingStats ? (
              <div className="py-8 flex items-center justify-center text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                <span>Memuat daftar aktivitas...</span>
              </div>
            ) : recentForms.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  {isApprover
                    ? "Tidak ada form yang menunggu persetujuan Anda saat ini."
                    : "Belum ada riwayat pengajuan izin kerja."}
                </p>
                <p className="text-[11px] text-slate-400">
                  {role === "worker"
                    ? "Silakan pilih salah satu kategori di atas untuk memulai pengajuan izin kerja."
                    : "Semua pengajuan telah diproses dengan lengkap."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentForms.map((item) => {
                  const badge = getStatusBadge(item.status);
                  const BadgeIcon = badge.icon;
                  const targetHref = getFormDetailHref(role, item);

                  return (
                    <div
                      key={item.id_form}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 font-mono text-xs font-bold">
                          {item.id_form.split("-")[0] || "WP"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                              {item.id_form}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {getPermitLabel(item.jenis_form)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {item.nama_kontraktor_pekerja || item.pemohon || item.lokasi_pekerjaan || item.lokasi || "Izin Kerja PT. JAI"}
                            {item.tanggal || item.created_at ? ` • ${formatDateSafe(item.tanggal || item.created_at)}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${badge.bg}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>

                        <Link
                          href={targetHref}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════
              6. INFORMASI STANDAR KESELAMATAN K3 PT. JAI
          ══════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Standar K3 & JSA Wajib</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Setiap pekerjaan berisiko wajib menyertakan analisis bahaya kerja (JSA) serta APD standar yang terinspeksi.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Persetujuan Digital Berjenjang</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Barcode QR terenkripsi memastikan legalitas izin kerja tanpa kertas dan dapat diverifikasi langsung di lapangan.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Kesiapsiagaan Tanggap Darurat</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hentikan pekerjaan segera jika kondisi lapangan membahayakan. Hubungi Pos Security & Tim K3 PT JAI.
                  </p>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}