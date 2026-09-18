// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Home,
  BarChart3,
  ChevronDown,
  TrendingUp,
  Flame,
  AlertTriangle,
  Shield,
  ShieldCheck,
  RefreshCw,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  ArrowUpRight,
  Users,
  Layers,
  MapPin,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PermitStatus = "draft" | "submitted" | "approved" | "rejected";
export type FormType = "hot-work" | "workshop" | "height-work" | "general-permit";
export type Period = "daily" | "weekly" | "monthly" | "yearly";

export interface Permit {
  id: string;
  status: PermitStatus;
  jenisForm: FormType;
  tanggal: string;
  tanggalPelaksanaan?: string;
  lokasi?: string;
  pemohon?: string;
  tipePerusahaan?: "internal" | "eksternal";
}

// ─── Helpers & Config ─────────────────────────────────────────────────────────
const FORM_CONFIG: Record<
  FormType,
  {
    name: string;
    shortName: string;
    color: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    chartColor: string;
    icon: React.ElementType;
  }
> = {
  "hot-work": {
    name: "Izin Kerja Panas",
    shortName: "Hot Work",
    color: "from-orange-500 to-red-500",
    bgBadge: "bg-orange-50",
    textBadge: "text-orange-700",
    borderBadge: "border-orange-200",
    chartColor: "#F97316",
    icon: Flame,
  },
  "height-work": {
    name: "Izin Kerja Ketinggian",
    shortName: "Height Work",
    color: "from-sky-500 to-blue-600",
    bgBadge: "bg-sky-50",
    textBadge: "text-sky-700",
    borderBadge: "border-sky-200",
    chartColor: "#0284C7",
    icon: AlertTriangle,
  },
  workshop: {
    name: "Izin Kerja Workshop",
    shortName: "Workshop",
    color: "from-emerald-500 to-teal-600",
    bgBadge: "bg-emerald-50",
    textBadge: "text-emerald-700",
    borderBadge: "border-emerald-200",
    chartColor: "#10B981",
    icon: Shield,
  },
  "general-permit": {
    name: "Ijin Kerja Eksternal",
    shortName: "Ijin Eksternal",
    color: "from-indigo-500 to-violet-600",
    bgBadge: "bg-indigo-50",
    textBadge: "text-indigo-700",
    borderBadge: "border-indigo-200",
    chartColor: "#6366F1",
    icon: Building2,
  },
};

const STATUS_CONFIG: Record<
  PermitStatus,
  {
    label: string;
    color: string;
    chartColor: string;
    badgeCls: string;
    icon: React.ElementType;
  }
> = {
  approved: {
    label: "Disetujui",
    color: "text-emerald-600",
    chartColor: "#10B981",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  submitted: {
    label: "Menunggu Approval",
    color: "text-blue-600",
    chartColor: "#3B82F6",
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
  },
  rejected: {
    label: "Ditolak",
    color: "text-red-600",
    chartColor: "#EF4444",
    badgeCls: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  draft: {
    label: "Draft",
    color: "text-slate-500",
    chartColor: "#94A3B8",
    badgeCls: "bg-slate-100 text-slate-700 border-slate-200",
    icon: FileText,
  },
};

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const getDate = (p: Permit): Date | null => {
  if (!p.tanggal) return null;
  const d = new Date(p.tanggal);
  return isNaN(d.getTime()) ? null : d;
};

const dayOfWeek = (d: Date) => (d.getDay() === 0 ? 6 : d.getDay() - 1);

// ─── Custom Chart Tooltip ──────────────────────────────────────────────────────
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
        <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              {entry.name}:
            </span>
            <span className="font-bold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedJenis, setSelectedJenis] = useState<FormType | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [userRole, setUserRole] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    setUserRole(sessionStorage.getItem("user_role") || "");
    loadPermits();
  }, []);

  const loadPermits = async () => {
    setLoading(true);
    try {
      // Load all 4 form types including general-permit (ijin-kerja-eksternal)
      const [r1, r2, r3, r4] = await Promise.all([
        fetch("/form-permit/api/forms/hot-work?limit=2000&full=1"),
        fetch("/form-permit/api/forms/workshop?limit=2000&full=1"),
        fetch("/form-permit/api/forms/height-work?limit=2000&full=1"),
        fetch("/form-permit/api/forms/general-permit?limit=2000&full=1"),
      ]);

      if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) {
        throw new Error("Gagal mengambil data permit");
      }

      const [j1, j2, j3, j4] = await Promise.all([
        r1.json(),
        r2.json(),
        r3.json(),
        r4.json(),
      ]);

      const all: Permit[] = [
        ...(j1.data ?? []).map((x: any) => ({
          id: x.id_form,
          status: (x.status || "submitted") as PermitStatus,
          jenisForm: "hot-work" as const,
          tanggal: x.tanggal,
          tanggalPelaksanaan: x.tanggal_pelaksanaan,
          lokasi: x.lokasi_pekerjaan || "Area Pabrik",
          pemohon: x.nama_kontraktor_nik || x.nama_pekerja_nik || "Internal Worker",
          tipePerusahaan: x.tipe_perusahaan === "eksternal" || x.id_ijin_kerja ? "eksternal" : "internal",
        })),
        ...(j2.data ?? []).map((x: any) => ({
          id: x.id_form,
          status: (x.status || "submitted") as PermitStatus,
          jenisForm: "workshop" as const,
          tanggal: x.tanggal,
          tanggalPelaksanaan: x.tanggal_pelaksanaan,
          lokasi: x.lokasi_pekerjaan || "Workshop Area",
          pemohon: x.nama_kontraktor_nik || x.nama_pekerja_nik || "Internal Worker",
          tipePerusahaan: x.tipe_perusahaan === "eksternal" || x.id_ijin_kerja ? "eksternal" : "internal",
        })),
        ...(j3.data ?? []).map((x: any) => ({
          id: x.id_form,
          status: (x.status || "submitted") as PermitStatus,
          jenisForm: "height-work" as const,
          tanggal: x.tanggal,
          tanggalPelaksanaan: x.tanggal_pelaksanaan,
          lokasi: x.lokasi || "Area Ketinggian",
          pemohon: x.petugas_ketinggian || "Internal Worker",
          tipePerusahaan: x.tipe_perusahaan === "eksternal" || x.id_ijin_kerja ? "eksternal" : "internal",
        })),
        ...(j4.data ?? []).map((x: any) => ({
          id: x.id_form,
          status: (x.status || "submitted") as PermitStatus,
          jenisForm: "general-permit" as const,
          tanggal: x.tanggal,
          tanggalPelaksanaan: x.tanggal_pelaksanaan || x.tgl_mulai_kerja,
          lokasi: x.lokasi_pekerjaan || "Area Pabrik (Eksternal)",
          pemohon: x.nama_kontraktor_pekerja || x.nama_pengawas_pic_subkont || "Kontraktor Eksternal",
          tipePerusahaan: "eksternal" as const,
        })),
      ];

      setPermits(all);
      setLastRefreshed(new Date());

      const years = new Set<string>();
      all.forEach((p) => {
        const d = getDate(p);
        if (d) years.add(d.getFullYear().toString());
      });
      const sorted = Array.from(years).sort().reverse();
      setAvailableYears(sorted);
      if (sorted.length > 0 && !selectedYear) {
        setSelectedYear(sorted[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered by Year, Month, Day, Period AND Form Type
  const filtered = useMemo(() => {
    return permits.filter((p) => {
      const d = getDate(p);
      if (!d || !selectedYear) return false;
      if (d.getFullYear().toString() !== selectedYear) return false;
      if (period === "daily" && selectedDay) {
        const sel = new Date(selectedDay);
        if (d.toDateString() !== sel.toDateString()) return false;
      }
      if (period === "monthly" && selectedMonth) {
        const mm = (d.getMonth() + 1).toString().padStart(2, "0");
        if (mm !== selectedMonth) return false;
      }
      if (selectedJenis && p.jenisForm !== selectedJenis) return false;
      return true;
    });
  }, [permits, selectedYear, selectedMonth, selectedDay, period, selectedJenis]);

  // Filtered by Year, Month, Day, Period WITHOUT Form Type (for top summary stats)
  const filteredForCards = useMemo(() => {
    return permits.filter((p) => {
      const d = getDate(p);
      if (!d || !selectedYear) return false;
      if (d.getFullYear().toString() !== selectedYear) return false;
      if (period === "daily" && selectedDay) {
        const sel = new Date(selectedDay);
        if (d.toDateString() !== sel.toDateString()) return false;
      }
      if (period === "monthly" && selectedMonth) {
        const mm = (d.getMonth() + 1).toString().padStart(2, "0");
        if (mm !== selectedMonth) return false;
      }
      return true;
    });
  }, [permits, selectedYear, selectedMonth, selectedDay, period]);

  // Available Months in selected year
  const availableMonths = useMemo(() => {
    const s = new Set<number>();
    permits.forEach((p) => {
      const d = getDate(p);
      if (d && d.getFullYear().toString() === selectedYear) {
        s.add(d.getMonth() + 1);
      }
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [permits, selectedYear]);

  // Available Days in selected year
  const availableDays = useMemo(() => {
    const s = new Set<string>();
    permits.forEach((p) => {
      const d = getDate(p);
      if (d && d.getFullYear().toString() === selectedYear) {
        s.add(d.toISOString().split("T")[0]);
      }
    });
    return Array.from(s).sort().reverse();
  }, [permits, selectedYear]);

  // ── Line & Area Chart Data ───────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (period === "daily") {
      return Array.from({ length: 24 }, (_, h) => {
        const subset = filtered.filter((p) => {
          const d = getDate(p);
          return d && d.getHours() === h;
        });
        return {
          name: `${String(h).padStart(2, "0")}:00`,
          total: subset.length,
          approved: subset.filter((p) => p.status === "approved").length,
          submitted: subset.filter((p) => p.status === "submitted").length,
        };
      });
    }
    if (period === "weekly") {
      const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      const counts = new Array(7).fill(0);
      const approvedCounts = new Array(7).fill(0);
      filtered.forEach((p) => {
        const d = getDate(p);
        if (d) {
          const idx = dayOfWeek(d);
          counts[idx]++;
          if (p.status === "approved") approvedCounts[idx]++;
        }
      });
      return days.map((name, i) => ({
        name,
        total: counts[i],
        approved: approvedCounts[i],
      }));
    }
    if (period === "monthly") {
      const month = parseInt(selectedMonth || "1");
      const year = parseInt(selectedYear || new Date().getFullYear().toString());
      const daysInMonth = new Date(year, month, 0).getDate();
      const counts: Record<number, number> = {};
      const approved: Record<number, number> = {};
      for (let i = 1; i <= daysInMonth; i++) {
        counts[i] = 0;
        approved[i] = 0;
      }
      filtered.forEach((p) => {
        const d = getDate(p);
        if (d && d.getFullYear() === year && d.getMonth() + 1 === month) {
          const day = d.getDate();
          counts[day]++;
          if (p.status === "approved") approved[day]++;
        }
      });
      return Object.entries(counts).map(([day, total]) => ({
        name: `Tgl ${day}`,
        total,
        approved: approved[parseInt(day)] || 0,
      }));
    }
    // Yearly period (12 months)
    const counts = new Array(12).fill(0);
    const approvedCounts = new Array(12).fill(0);
    filtered.forEach((p) => {
      const d = getDate(p);
      if (d) {
        const m = d.getMonth();
        counts[m]++;
        if (p.status === "approved") approvedCounts[m]++;
      }
    });
    return [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ].map((name, i) => ({
      name,
      total: counts[i],
      approved: approvedCounts[i],
    }));
  }, [filtered, period, selectedMonth, selectedYear]);

  // ── Form Type Distribution ───────────────────────────────────────────────────
  const formTypeData = useMemo(() => {
    return [
      {
        key: "hot-work" as FormType,
        name: FORM_CONFIG["hot-work"].shortName,
        jumlah: filteredForCards.filter((p) => p.jenisForm === "hot-work").length,
        color: FORM_CONFIG["hot-work"].chartColor,
      },
      {
        key: "height-work" as FormType,
        name: FORM_CONFIG["height-work"].shortName,
        jumlah: filteredForCards.filter((p) => p.jenisForm === "height-work").length,
        color: FORM_CONFIG["height-work"].chartColor,
      },
      {
        key: "workshop" as FormType,
        name: FORM_CONFIG["workshop"].shortName,
        jumlah: filteredForCards.filter((p) => p.jenisForm === "workshop").length,
        color: FORM_CONFIG["workshop"].chartColor,
      },
      {
        key: "general-permit" as FormType,
        name: FORM_CONFIG["general-permit"].shortName,
        jumlah: filteredForCards.filter((p) => p.jenisForm === "general-permit").length,
        color: FORM_CONFIG["general-permit"].chartColor,
      },
    ];
  }, [filteredForCards]);

  // ── Status Distribution Data ────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter((p) => p.status === "approved").length;
    const submitted = filtered.filter((p) => p.status === "submitted").length;
    const draft = filtered.filter((p) => p.status === "draft").length;
    const rejected = filtered.filter((p) => p.status === "rejected").length;

    return [
      { name: "Disetujui", value: approved, color: STATUS_CONFIG.approved.chartColor },
      { name: "Menunggu", value: submitted, color: STATUS_CONFIG.submitted.chartColor },
      { name: "Draft", value: draft, color: STATUS_CONFIG.draft.chartColor },
      { name: "Ditolak", value: rejected, color: STATUS_CONFIG.rejected.chartColor },
    ].filter((item) => item.value > 0 || total === 0);
  }, [filtered]);

  // ── Internal vs Eksternal Split ──────────────────────────────────────────────
  const internalExternalData = useMemo(() => {
    const internal = filtered.filter((p) => p.tipePerusahaan === "internal").length;
    const eksternal = filtered.filter((p) => p.tipePerusahaan === "eksternal").length;
    const total = internal + eksternal;
    return {
      internal,
      eksternal,
      total,
      internalPct: total > 0 ? ((internal / total) * 100).toFixed(1) : "0",
      eksternalPct: total > 0 ? ((eksternal / total) * 100).toFixed(1) : "0",
    };
  }, [filtered]);

  // ── Top Locations Distribution ───────────────────────────────────────────────
  const topLocations = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((p) => {
      const loc = p.lokasi ? p.lokasi.trim() : "Tidak Ditentukan";
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filtered]);

  // ── Recent Submissions ───────────────────────────────────────────────────────
  const recentPermits = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .slice(0, 8);
  }, [filtered]);

  // ── Approval Rate Metric ─────────────────────────────────────────────────────
  const approvalRate = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter((p) => p.status === "approved").length;
    return total > 0 ? ((approved / total) * 100).toFixed(1) : "0.0";
  }, [filtered]);

  const toggleJenis = (j: FormType) => {
    setSelectedJenis((prev) => (prev === j ? null : j));
  };

  const resetFilters = () => {
    setSelectedJenis(null);
    setPeriod("monthly");
    setSelectedMonth("");
    setSelectedDay("");
  };

  const selCls =
    "w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer shadow-sm transition-all";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div
          style={{ paddingLeft: "var(--sidebar-width, 0px)" }}
          className="transition-[padding] duration-300 flex items-center justify-center min-h-screen"
        >
          <div className="text-center p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xl max-w-sm">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
              <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Memuat Analitik Data</h3>
            <p className="text-xs text-slate-500 mt-1">
              Menghubungkan data perizinan kerja internal & eksternal...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />

      <div
        style={{ paddingLeft: "var(--sidebar-width, 0px)" }}
        className="transition-[padding] duration-300"
      >
        {/* ── Topbar Ringkas ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={userRole === "admin" ? "/home" : "/approval"}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                title="Kembali ke Beranda"
              >
                <Home className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 truncate">
                    Dashboard Analitik & Monitoring
                  </h1>
                  <span className="hidden md:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    Real-time K3
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate hidden sm:block">
                  Visualisasi Terintegrasi Izin Kerja Internal & Eksternal — PT JAI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Diperbarui: {lastRefreshed.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <button
                onClick={loadPermits}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm transition-all hover:border-orange-300 active:scale-95 disabled:opacity-50"
                title="Segarkan Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-orange-600 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* ── Hero Banner Section ────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-16 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
                  <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-300">
                    Statistik & Kepatuhan Keselamatan
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                  Ringkasan Operasional <span className="text-orange-400">Izin Kerja</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Pantau seluruh alur pengajuan Hot Work, Height Work, Workshop, serta Ijin Kerja
                  Eksternal Subkontraktor dalam periode aktif.
                </p>
              </div>

              {/* Live Mini Counters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 min-w-[120px]">
                  <p className="text-[11px] uppercase tracking-wider text-slate-300 font-medium">
                    Total Izin Terdata
                  </p>
                  <p className="text-2xl font-black text-white mt-0.5">{permits.length}</p>
                </div>
                <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-4 py-3 min-w-[120px]">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-200 font-medium">
                    Approval Rate
                  </p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">{approvalRate}%</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Filter Card & Type Selector ───────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Filter Analisis</h3>
                  <p className="text-xs text-slate-500">Sesuaikan rentang waktu dan jenis izin kerja</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(selectedJenis || selectedMonth || selectedDay || period !== "monthly") && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-slate-500 hover:text-orange-600 font-medium px-2.5 py-1 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Selectors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tahun Kalender
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedMonth("");
                      setSelectedDay("");
                    }}
                    className={selCls}
                  >
                    <option value="">Semua Tahun</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        Tahun {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Mode Periode
                </label>
                <div className="relative">
                  <select
                    value={period}
                    onChange={(e) => {
                      setPeriod(e.target.value as Period);
                      setSelectedMonth("");
                      setSelectedDay("");
                    }}
                    className={selCls}
                  >
                    <option value="daily">Harian (Per Jam)</option>
                    <option value="weekly">Mingguan (Senin - Minggu)</option>
                    <option value="monthly">Bulanan (Per Tanggal)</option>
                    <option value="yearly">Tahunan (Januari - Desember)</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {period === "monthly" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Spesifik Bulan
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className={selCls}
                    >
                      <option value="">Semua Bulan (Tahun {selectedYear})</option>
                      {availableMonths.map((m) => (
                        <option key={m} value={String(m).padStart(2, "0")}>
                          {monthNames[m - 1]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {period === "daily" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Pilih Tanggal
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className={selCls}
                    >
                      <option value="">Pilih Tanggal</option>
                      {availableDays.map((day) => (
                        <option key={day} value={day}>
                          {new Date(day).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Filter: Jenis Izin Kerja Pills */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-600 mb-2">Filter Cepat Jenis Izin:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedJenis(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    selectedJenis === null
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Semua Jenis ({filteredForCards.length})
                </button>

                {(
                  [
                    "hot-work",
                    "height-work",
                    "workshop",
                    "general-permit",
                  ] as FormType[]
                ).map((key) => {
                  const conf = FORM_CONFIG[key];
                  const Icon = conf.icon;
                  const count = filteredForCards.filter((p) => p.jenisForm === key).length;
                  const isSelected = selectedJenis === key;

                  return (
                    <button
                      key={key}
                      onClick={() => toggleJenis(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? `bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-600/20`
                          : `bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{conf.shortName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Metric Cards Grid ─────────────────────────────────────────── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Izin */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total Pengajuan
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {filteredForCards.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {filtered.length !== filteredForCards.length
                      ? `${filtered.length} form dipilih`
                      : `seluruh jenis izin`}
                  </p>
                </div>
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-700">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Disetujui (Approved) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    Disetujui
                  </p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {filtered.filter((p) => p.status === "approved").length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {approvalRate}% dari filter aktif
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Menunggu (Submitted) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Menunggu Approval
                  </p>
                  <p className="text-3xl font-black text-blue-600 mt-1">
                    {filtered.filter((p) => p.status === "submitted").length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Memerlukan tanda tangan</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Ditolak (Rejected) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                    Ditolak / Revisi
                  </p>
                  <p className="text-3xl font-black text-red-500 mt-1">
                    {filtered.filter((p) => p.status === "rejected").length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Draft: {filtered.filter((p) => p.status === "draft").length} form
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-2xl text-red-500">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
            </div>
          </section>

          {/* ── Form Types Breakdown Interactive Cards ────────────────────── */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {(
              [
                "hot-work",
                "height-work",
                "workshop",
                "general-permit",
              ] as FormType[]
            ).map((key) => {
              const conf = FORM_CONFIG[key];
              const Icon = conf.icon;
              const count = filteredForCards.filter((p) => p.jenisForm === key).length;
              const isSelected = selectedJenis === key;
              const pctOfAll =
                filteredForCards.length > 0
                  ? ((count / filteredForCards.length) * 100).toFixed(0)
                  : "0";

              return (
                <div
                  key={key}
                  onClick={() => toggleJenis(key)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow ${
                    isSelected
                      ? `border-orange-500 ring-2 ring-orange-200 bg-orange-50/40`
                      : `border-slate-200/80 hover:border-slate-300`
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl ${conf.bgBadge} ${conf.textBadge}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">{pctOfAll}%</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 truncate">{conf.name}</h4>
                  <div className="flex items-baseline justify-between mt-1">
                    <p className="text-2xl font-black text-slate-900">{count}</p>
                    <span className="text-[11px] text-slate-400">form</span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* ── Empty State Indicator if no data ──────────────────────────── */}
          {filtered.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Tidak Ada Data Izin untuk Filter Ini
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Silakan ubah pilihan tahun, periode waktu, atau reset pilihan jenis izin untuk
                melihat data lainnya.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl shadow-md shadow-orange-600/20 hover:bg-orange-500 transition-colors"
              >
                Reset Semua Filter
              </button>
            </div>
          )}

          {/* ── Main Charts Row 1: Trend Line & Status Donut ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Area Chart (Span 2) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    Tren Pengajuan Izin Kerja
                  </h3>
                  <p className="text-xs text-slate-500">
                    Volume pengajuan berdasarkan tanggal perizinan ({period})
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Total Pengajuan
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disetujui
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Izin"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#totalGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="approved"
                      name="Disetujui"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#approvedGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Composition Donut Chart (Span 1) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Komposisi Status Izin
                </h3>
                <p className="text-xs text-slate-500">Distribusi persetujuan form aktif</p>
              </div>

              <div className="h-52 my-2 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{filtered.length}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Total Form
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Charts Row 2: Form Types & Volume Comparison ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Jenis Form Donut (Span 1) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Distribusi Jenis Izin
                </h3>
                <p className="text-xs text-slate-500">Proporsi 4 kategori perizinan kerja</p>
              </div>

              <div className="h-52 my-2 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="jumlah"
                    >
                      {formTypeData.map((entry, index) => (
                        <Cell key={`cell-type-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{filteredForCards.length}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Izin Kerja
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                {formTypeData.map((item) => {
                  const pct =
                    filteredForCards.length > 0
                      ? ((item.jumlah / filteredForCards.length) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <div key={item.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.jumlah}</span>
                        <span className="text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Comparison Bar Chart (Span 2) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  Perbandingan Volume per Kategori
                </h3>
                <p className="text-xs text-slate-500">
                  Jumlah izin yang diajukan untuk setiap jenis izin kerja
                </p>
              </div>

              <div className="h-64 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formTypeData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="jumlah" name="Jumlah Izin" radius={[8, 8, 0, 0]}>
                      {formTypeData.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Internal vs Eksternal Sub-breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Rasio Pekerja Internal vs Kontraktor Eksternal
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Berdasarkan kepemilikan izin dan jenis vendor pelaksana
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="text-left">
                    <p className="text-slate-400 text-[10px]">INTERNAL</p>
                    <p className="text-slate-900">
                      {internalExternalData.internal} ({internalExternalData.internalPct}%)
                    </p>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="text-left">
                    <p className="text-indigo-500 text-[10px]">EKSTERNAL</p>
                    <p className="text-indigo-600">
                      {internalExternalData.eksternal} ({internalExternalData.eksternalPct}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 3: Top Locations & Recent Submissions ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Locations (Span 1) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  Lokasi Kerja Terbanyak
                </h3>
                <p className="text-xs text-slate-500">Area kerja dengan frekuensi izin tertinggi</p>
              </div>

              {topLocations.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada data lokasi</p>
              ) : (
                <div className="space-y-3.5">
                  {topLocations.map((loc, idx) => {
                    const pct =
                      filtered.length > 0 ? ((loc.count / filtered.length) * 100).toFixed(0) : "0";
                    return (
                      <div key={loc.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                            {idx + 1}. {loc.name}
                          </span>
                          <span className="font-bold text-slate-900">
                            {loc.count} <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Submissions Feed (Span 2) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Aktivitas Izin Kerja Terbaru
                    </h3>
                    <p className="text-xs text-slate-500">
                      Daftar pengajuan izin kerja terakhir yang masuk ke sistem
                    </p>
                  </div>
                  <Link
                    href="/approval"
                    className="text-xs font-bold text-orange-600 hover:text-orange-500 inline-flex items-center gap-1"
                  >
                    Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-left">
                        <th className="py-2.5 px-3">ID Form</th>
                        <th className="py-2.5 px-3">Jenis Izin</th>
                        <th className="py-2.5 px-3">Pemohon / Kontraktor</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentPermits.map((p) => {
                        const conf = FORM_CONFIG[p.jenisForm];
                        const sConf = STATUS_CONFIG[p.status];
                        const dateFormatted = p.tanggal
                          ? new Date(p.tanggal).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-";

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                              {p.id}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${conf.bgBadge} ${conf.textBadge} ${conf.borderBadge}`}
                              >
                                {conf.shortName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 truncate max-w-[150px]">
                              {p.pemohon || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{dateFormatted}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sConf.badgeCls}`}
                              >
                                {sConf.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── Summary Table: Detailed Status Rekap ───────────────────────── */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  Rekapitulasi Status Per Jenis Izin Kerja
                </h3>
                <p className="text-xs text-slate-500">
                  Tabel rincian status draft, diajukan, disetujui, dan ditolak untuk periode aktif
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="text-left py-3 px-3">Kategori Izin Kerja</th>
                    <th className="text-right py-3 px-3">Draft</th>
                    <th className="text-right py-3 px-3">Menunggu Approval</th>
                    <th className="text-right py-3 px-3">Disetujui</th>
                    <th className="text-right py-3 px-3">Ditolak</th>
                    <th className="text-right py-3 px-3">Total Form</th>
                    <th className="text-right py-3 px-3">Tingkat Persetujuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(
                    [
                      "hot-work",
                      "height-work",
                      "workshop",
                      "general-permit",
                    ] as FormType[]
                  ).map((key) => {
                    const conf = FORM_CONFIG[key];
                    const subset = filtered.filter((p) => p.jenisForm === key);
                    const draft = subset.filter((p) => p.status === "draft").length;
                    const submitted = subset.filter((p) => p.status === "submitted").length;
                    const approved = subset.filter((p) => p.status === "approved").length;
                    const rejected = subset.filter((p) => p.status === "rejected").length;
                    const total = subset.length;
                    const rate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0.0";

                    return (
                      <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${conf.bgBadge} ${conf.textBadge} ${conf.borderBadge}`}
                          >
                            <conf.icon className="w-3.5 h-3.5" />
                            {conf.name}
                          </span>
                        </td>
                        <td className="text-right py-3 px-3 text-slate-500 font-medium">{draft}</td>
                        <td className="text-right py-3 px-3 text-blue-600 font-semibold">
                          {submitted}
                        </td>
                        <td className="text-right py-3 px-3 text-emerald-600 font-bold">
                          {approved}
                        </td>
                        <td className="text-right py-3 px-3 text-red-500 font-medium">{rejected}</td>
                        <td className="text-right py-3 px-3 font-bold text-slate-900">{total}</td>
                        <td className="text-right py-3 px-3">
                          <span className="font-bold text-emerald-600">{rate}%</span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200">
                    <td className="py-3.5 px-3 text-slate-800">Grand Total (Seluruh Izin)</td>
                    <td className="text-right py-3.5 px-3 text-slate-600">
                      {filtered.filter((p) => p.status === "draft").length}
                    </td>
                    <td className="text-right py-3.5 px-3 text-blue-600">
                      {filtered.filter((p) => p.status === "submitted").length}
                    </td>
                    <td className="text-right py-3.5 px-3 text-emerald-600">
                      {filtered.filter((p) => p.status === "approved").length}
                    </td>
                    <td className="text-right py-3.5 px-3 text-red-500">
                      {filtered.filter((p) => p.status === "rejected").length}
                    </td>
                    <td className="text-right py-3.5 px-3 font-black text-slate-900">
                      {filtered.length}
                    </td>
                    <td className="text-right py-3.5 px-3 text-emerald-600 font-black">
                      {approvalRate}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
