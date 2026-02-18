// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Home, BarChart2, ChevronDown, TrendingUp,
  Flame, AlertTriangle, Shield, RefreshCw,
} from "lucide-react";
import {
  Line, LineChart, Bar, BarChart, Pie, PieChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Permit {
  id: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  jenisForm: "hot-work" | "workshop" | "height-work";
  tanggal: string; // timestamp saat form disimpan
}

type Period    = "daily" | "weekly" | "monthly" | "yearly";
type JenisForm = "hot-work" | "height-work" | "workshop" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDate = (p: Permit): Date | null => {
  if (!p.tanggal) return null;
  const d = new Date(p.tanggal);
  return isNaN(d.getTime()) ? null : d;
};

// Monday = 0 … Sunday = 6
const dayOfWeek = (d: Date) => (d.getDay() === 0 ? 6 : d.getDay() - 1);

const monthNames = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [permits, setPermits]               = useState<Permit[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedYear, setSelectedYear]     = useState("");
  const [selectedMonth, setSelectedMonth]   = useState("");
  const [selectedDay, setSelectedDay]       = useState("");
  const [period, setPeriod]                 = useState<Period>("monthly");
  const [selectedJenis, setSelectedJenis]   = useState<JenisForm>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => { loadPermits(); }, []);

  // ── Fetch all permits via API routes (SELECT * untuk dapat kolom tanggal) ──
  const loadPermits = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/forms/hot-work?limit=2000&full=1"),
        fetch("/api/forms/workshop?limit=2000&full=1"),
        fetch("/api/forms/height-work?limit=2000&full=1"),
      ]);
      if (!r1.ok || !r2.ok || !r3.ok) throw new Error("Gagal mengambil data");
      const [j1, j2, j3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

      const all: Permit[] = [
        ...(j1.data ?? []).map((x: any) => ({ id: x.id_form, status: x.status ?? "submitted", jenisForm: "hot-work"    as const, tanggal: x.tanggal })),
        ...(j2.data ?? []).map((x: any) => ({ id: x.id_form, status: x.status ?? "submitted", jenisForm: "workshop"     as const, tanggal: x.tanggal })),
        ...(j3.data ?? []).map((x: any) => ({ id: x.id_form, status: x.status ?? "submitted", jenisForm: "height-work"  as const, tanggal: x.tanggal })),
      ];

      setPermits(all);

      // Kumpulkan tahun unik dari field tanggal
      const years = new Set<string>();
      all.forEach(p => {
        const d = getDate(p);
        if (d) years.add(d.getFullYear().toString());
      });
      const sorted = Array.from(years).sort().reverse();
      setAvailableYears(sorted);
      if (sorted.length > 0) setSelectedYear(sorted[0]);
    } catch (err: any) {
      console.error(err);
      alert("Gagal memuat data dashboard: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Filter permits sesuai pilihan filter ──────────────────────────────────
  const filtered = useMemo(() => {
    return permits.filter(p => {
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

  // ── Line chart data ───────────────────────────────────────────────────────
  const lineData = useMemo(() => {
    if (period === "daily") {
      return Array.from({ length: 24 }, (_, h) => ({
        name: `${String(h).padStart(2, "0")}.00`,
        jumlah: filtered.filter(p => { const d = getDate(p); return d && d.getHours() === h; }).length,
      }));
    }
    if (period === "weekly") {
      const days = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
      const counts = new Array(7).fill(0);
      filtered.forEach(p => { const d = getDate(p); if (d) counts[dayOfWeek(d)]++; });
      return days.map((name, i) => ({ name, jumlah: counts[i] }));
    }
    if (period === "monthly") {
      const month   = parseInt(selectedMonth || "1");
      const year    = parseInt(selectedYear);
      const daysInMonth = new Date(year, month, 0).getDate();
      const counts: Record<number, number> = {};
      for (let i = 1; i <= daysInMonth; i++) counts[i] = 0;
      filtered.forEach(p => {
        const d = getDate(p);
        if (d && d.getFullYear() === year && d.getMonth() + 1 === month) counts[d.getDate()]++;
      });
      return Object.entries(counts).map(([day, jumlah]) => ({ name: day, jumlah }));
    }
    // yearly
    const counts = new Array(12).fill(0);
    filtered.forEach(p => { const d = getDate(p); if (d) counts[d.getMonth()]++; });
    return ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
      .map((name, i) => ({ name, jumlah: counts[i] }));
  }, [filtered, period, selectedMonth, selectedYear]);

  // ── Bar & Pie data ────────────────────────────────────────────────────────
  const barData = useMemo(() => [
    { name: "Hot Work",    jumlah: filtered.filter(p => p.jenisForm === "hot-work").length },
    { name: "Height Work", jumlah: filtered.filter(p => p.jenisForm === "height-work").length },
    { name: "Workshop",    jumlah: filtered.filter(p => p.jenisForm === "workshop").length },
  ], [filtered]);

  const pieData = useMemo(() => [
    { name: "Hot Work",    value: barData[0].jumlah, fill: "#FF6B6B" },
    { name: "Height Work", value: barData[1].jumlah, fill: "#06B6D4" },
    { name: "Workshop",    value: barData[2].jumlah, fill: "#10B981" },
  ], [barData]);

  const pieTotal  = pieData.reduce((s, x) => s + x.value, 0);
  const pct = (name: string) => {
    const v = pieData.find(x => x.name === name)?.value ?? 0;
    return pieTotal > 0 ? ((v / pieTotal) * 100).toFixed(1) : "0.0";
  };

  // ── Available months / days for selectors ─────────────────────────────────
  const availableMonths = useMemo(() => {
    const s = new Set<number>();
    permits.forEach(p => {
      const d = getDate(p);
      if (d && d.getFullYear().toString() === selectedYear) s.add(d.getMonth() + 1);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [permits, selectedYear]);

  const availableDays = useMemo(() => {
    const s = new Set<string>();
    permits.forEach(p => {
      const d = getDate(p);
      if (d && d.getFullYear().toString() === selectedYear)
        s.add(d.toISOString().split("T")[0]);
    });
    return Array.from(s).sort().reverse();
  }, [permits, selectedYear]);

  const toggleJenis = (j: NonNullable<JenisForm>) =>
    setSelectedJenis(prev => prev === j ? null : j);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600" />
          <p className="mt-4 text-gray-600">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Select styling helper ────────────────────────────────────────────────
  const selCls = "w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Home className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dashboard Analitik</h1>
                  <p className="text-xs text-gray-500">Visualisasi Data Permintaan Izin Kerja — PT Jatim Autocomp Indonesia</p>
                </div>
              </div>
            </div>
            <button onClick={loadPermits} disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Filter Section ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tahun */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahun</label>
              <div className="relative">
                <select value={selectedYear}
                  onChange={e => { setSelectedYear(e.target.value); setSelectedMonth(""); setSelectedDay(""); }}
                  className={selCls}
                >
                  <option value="">Pilih Tahun</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Periode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Periode</label>
              <div className="relative">
                <select value={period}
                  onChange={e => { setPeriod(e.target.value as Period); setSelectedMonth(""); setSelectedDay(""); }}
                  className={selCls}
                >
                  <option value="daily">Harian (Daily)</option>
                  <option value="weekly">Mingguan (Weekly)</option>
                  <option value="monthly">Bulanan (Monthly)</option>
                  <option value="yearly">Tahunan (Yearly)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Bulan (hanya jika monthly) */}
            {period === "monthly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bulan</label>
                <div className="relative">
                  <select value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className={selCls}
                  >
                    <option value="">Semua Bulan</option>
                    {availableMonths.map(m => (
                      <option key={m} value={String(m).padStart(2, "0")}>
                        {monthNames[m - 1]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Tanggal (hanya jika daily) */}
            {period === "daily" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <div className="relative">
                  <select value={selectedDay}
                    onChange={e => setSelectedDay(e.target.value)}
                    className={selCls}
                  >
                    <option value="">Pilih Tanggal</option>
                    {availableDays.map(day => (
                      <option key={day} value={day}>
                        {new Date(day).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Active filter indicator */}
          {(selectedJenis || selectedMonth || selectedDay) && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Filter aktif:</span>
              {selectedJenis && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                  {selectedJenis === "hot-work" ? "Hot Work" : selectedJenis === "height-work" ? "Height Work" : "Workshop"}
                  <button onClick={() => setSelectedJenis(null)} className="ml-1.5 hover:text-orange-900">×</button>
                </span>
              )}
              {selectedMonth && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  {monthNames[parseInt(selectedMonth) - 1]}
                  <button onClick={() => setSelectedMonth("")} className="ml-1.5 hover:text-blue-900">×</button>
                </span>
              )}
              {selectedDay && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  {new Date(selectedDay).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                  <button onClick={() => setSelectedDay("")} className="ml-1.5 hover:text-green-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Stats Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          {/* Total */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Total Izin</p>
                <p className="text-3xl font-bold text-gray-900">{filtered.length}</p>
                <p className="text-xs text-gray-400 mt-1">dari {permits.length} total</p>
              </div>
              <div className="p-2.5 bg-red-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>

          {/* Hot Work */}
          <div onClick={() => toggleJenis("hot-work")}
            className={`bg-white rounded-xl shadow-sm p-5 border cursor-pointer transition-all ${
              selectedJenis === "hot-work" ? "border-orange-500 ring-2 ring-orange-200 bg-orange-50" : "border-gray-200 hover:border-orange-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Hot Work</p>
                <p className="text-3xl font-bold text-gray-900">{filtered.filter(p => p.jenisForm === "hot-work").length}</p>
                <p className="text-xs text-gray-400 mt-1">Pekerjaan panas</p>
              </div>
              <div className="p-2.5 bg-orange-100 rounded-lg">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Height Work */}
          <div onClick={() => toggleJenis("height-work")}
            className={`bg-white rounded-xl shadow-sm p-5 border cursor-pointer transition-all ${
              selectedJenis === "height-work" ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50" : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Height Work</p>
                <p className="text-3xl font-bold text-gray-900">{filtered.filter(p => p.jenisForm === "height-work").length}</p>
                <p className="text-xs text-gray-400 mt-1">Pekerjaan ketinggian</p>
              </div>
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Workshop */}
          <div onClick={() => toggleJenis("workshop")}
            className={`bg-white rounded-xl shadow-sm p-5 border cursor-pointer transition-all ${
              selectedJenis === "workshop" ? "border-green-500 ring-2 ring-green-200 bg-green-50" : "border-gray-200 hover:border-green-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Workshop</p>
                <p className="text-3xl font-bold text-gray-900">{filtered.filter(p => p.jenisForm === "workshop").length}</p>
                <p className="text-xs text-gray-400 mt-1">Workshop</p>
              </div>
              <div className="p-2.5 bg-green-100 rounded-lg">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-8">
            <BarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Tidak ada data untuk filter yang dipilih</p>
            <p className="text-gray-400 text-sm mt-1">Coba ubah tahun, periode, atau jenis form</p>
          </div>
        )}

        {/* ── Line Chart ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Tren Permintaan Izin
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              berdasarkan tanggal pengisian
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ bottom: 15, left: 10 }}>
                <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 11, fill: "#9ca3af" }}
                  label={{
                    value: period === "daily" ? "Jam" : period === "weekly" ? "Hari" : period === "monthly" ? "Tanggal" : "Bulan",
                    position: "insideBottom", offset: -10, style: { fill: "#9ca3af", fontSize: 12 },
                  }}
                />
                <YAxis stroke="#999" tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false}
                  label={{ value: "Jumlah Izin", angle: -90, position: "insideLeft", offset: -5, style: { fill: "#9ca3af", fontSize: 11 } }}
                />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="jumlah" stroke="#f97316" strokeWidth={3}
                  dot={{ r: 4, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }} name="Jumlah"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Pie + Bar charts ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Pie */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex flex-col">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Distribusi Jenis Izin</h3>
            <div className="flex-1 min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
              {[
                { name: "Hot Work",    color: "text-red-500",     dot: "bg-[#FF6B6B]" },
                { name: "Height Work", color: "text-cyan-500",    dot: "bg-[#06B6D4]" },
                { name: "Workshop",    color: "text-emerald-500", dot: "bg-[#10B981]" },
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${item.dot}`} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className={`font-bold ${item.color}`}>{pct(item.name)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex flex-col">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Perbandingan Jenis Izin</h3>
            <div className="flex-1 min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={48}>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#999" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <YAxis stroke="#999" tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                  <Legend />
                  <Bar dataKey="jumlah" name="Jumlah Izin" radius={[8, 8, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={["#FF6B6B","#06B6D4","#10B981"][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Summary table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Ringkasan Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jenis Form</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Draft</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Diajukan</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Disetujui</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ditolak</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "hot-work",    label: "Hot Work",    color: "text-red-600",   bg: "bg-red-50" },
                  { key: "height-work", label: "Height Work", color: "text-blue-600",  bg: "bg-blue-50" },
                  { key: "workshop",    label: "Workshop",    color: "text-green-600", bg: "bg-green-50" },
                ].map(row => {
                  const subset = filtered.filter(p => p.jenisForm === row.key);
                  return (
                    <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.bg} ${row.color}`}>
                          {row.label}
                        </span>
                      </td>
                      <td className="text-right py-3 px-3 text-gray-600">{subset.filter(p => p.status === "draft").length}</td>
                      <td className="text-right py-3 px-3 text-blue-600 font-medium">{subset.filter(p => p.status === "submitted").length}</td>
                      <td className="text-right py-3 px-3 text-green-600 font-medium">{subset.filter(p => p.status === "approved").length}</td>
                      <td className="text-right py-3 px-3 text-red-500 font-medium">{subset.filter(p => p.status === "rejected").length}</td>
                      <td className="text-right py-3 px-3 font-bold text-gray-900">{subset.length}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-3 px-3 text-gray-700">Total</td>
                  <td className="text-right py-3 px-3">{filtered.filter(p => p.status === "draft").length}</td>
                  <td className="text-right py-3 px-3 text-blue-600">{filtered.filter(p => p.status === "submitted").length}</td>
                  <td className="text-right py-3 px-3 text-green-600">{filtered.filter(p => p.status === "approved").length}</td>
                  <td className="text-right py-3 px-3 text-red-500">{filtered.filter(p => p.status === "rejected").length}</td>
                  <td className="text-right py-3 px-3 text-gray-900 font-bold">{filtered.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}