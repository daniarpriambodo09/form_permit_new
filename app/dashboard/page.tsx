// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Home,
  BarChart2,
  Calendar,
  AlertCircle,
  ChevronDown,
  TrendingUp,
  Flame,
  AlertTriangle,
  Shield,
} from "lucide-react";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Permit {
  id: number;
  noRegistrasi?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  jenisForm?: "hot-work" | "workshop" | "height-work";
  tanggal?: string;
  submittedAt?: string;
  [key: string]: any;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";
type JenisForm = "hot-work" | "height-work" | "workshop" | null;

export default function DashboardPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [allSubmittedPermits, setAllSubmittedPermits] = useState<Permit[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedJenisForm, setSelectedJenisForm] = useState<JenisForm>(null); // 🔹 State baru

  useEffect(() => {
    loadPermits();
  }, []);

  const loadPermits = () => {
    const storedPermits = JSON.parse(localStorage.getItem("permits") || "[]");
    const storedDrafts = JSON.parse(localStorage.getItem("permitDrafts") || "[]");
    const allPermits = [...storedPermits, ...storedDrafts];

    const filteredAll = allPermits.filter((p: Permit) => p.status !== "draft");
    setPermits(filteredAll);
    setAllSubmittedPermits(filteredAll);

    const years = new Set<string>();
    filteredAll.forEach((p) => {
      const dateStr = p.submittedAt || p.tanggal;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          years.add(date.getFullYear().toString());
        }
      }
    });

    const sortedYears = Array.from(years).sort().reverse();
    setAvailableYears(sortedYears);
    if (sortedYears.length > 0) {
      setSelectedYear(sortedYears[0]);
    }
  };

  const getPermitDate = (permit: Permit): Date | null => {
    const dateStr = permit.submittedAt || permit.tanggal;
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const getDayOfWeek = (date: Date): number => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  };

  // 🔹 Filter berdasarkan waktu DAN jenis izin
  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      // Filter by time
      const date = getPermitDate(p);
      if (!date || !selectedYear) return false;

      const year = date.getFullYear().toString();
      if (year !== selectedYear) return false;

      if (period === "daily" && selectedDay) {
        const selectedDate = new Date(selectedDay);
        if (date.toDateString() !== selectedDate.toDateString()) return false;
      }

      if (period === "monthly" && selectedMonth) {
        if (
          date.getFullYear().toString() !== selectedYear ||
          (date.getMonth() + 1).toString().padStart(2, "0") !== selectedMonth
        ) {
          return false;
        }
      }

      // 🔹 Filter by jenisForm
      if (selectedJenisForm && p.jenisForm !== selectedJenisForm) {
        return false;
      }

      return true;
    });
  }, [permits, selectedYear, selectedMonth, selectedDay, period, selectedJenisForm]);

  const getLineChartData = useMemo(() => {
    const data: any[] = [];

    if (period === "daily") {
      for (let hour = 0; hour < 24; hour++) {
        const count = filteredPermits.filter((p) => {
          const date = getPermitDate(p);
          return date && date.getHours() === hour;
        }).length;
        data.push({
          name: `${String(hour).padStart(2, "0")}.00`,
          jumlah: count,
        });
      }
    } else if (period === "weekly") {
      const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      const dayCounts = new Array(7).fill(0);

      filteredPermits.forEach((p) => {
        const date = getPermitDate(p);
        if (date) {
          const dayIndex = getDayOfWeek(date);
          dayCounts[dayIndex]++;
        }
      });

      days.forEach((day, index) => {
        data.push({
          name: day,
          jumlah: dayCounts[index],
        });
      });
    } else if (period === "monthly") {
      const month = parseInt(selectedMonth || "1");
      const year = parseInt(selectedYear);
      const daysInMonth = new Date(year, month, 0).getDate();

      const dayCounts: Record<number, number> = {};
      for (let i = 1; i <= daysInMonth; i++) {
        dayCounts[i] = 0;
      }

      filteredPermits.forEach((p) => {
        const date = getPermitDate(p);
        if (date && date.getFullYear() === year && date.getMonth() + 1 === month) {
          const day = date.getDate();
          if (dayCounts[day] !== undefined) {
            dayCounts[day]++;
          }
        }
      });

      Object.entries(dayCounts).forEach(([day, count]) => {
        data.push({
          name: `${day}`,
          jumlah: count,
        });
      });
    } else if (period === "yearly") {
      const months = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
      ];
      const monthCounts = new Array(12).fill(0);

      filteredPermits.forEach((p) => {
        const date = getPermitDate(p);
        if (date) {
          monthCounts[date.getMonth()]++;
        }
      });

      months.forEach((month, index) => {
        data.push({
          name: month,
          jumlah: monthCounts[index],
        });
      });
    }

    return data;
  }, [filteredPermits, period, selectedMonth, selectedYear]);

  // 🔹 Bar chart now uses filteredPermits instead of allSubmittedPermits
  const getBarChartData = useMemo(() => {
    const hotWorkCount = filteredPermits.filter(
      (p) => p.jenisForm === "hot-work"
    ).length;
    const heightWorkCount = filteredPermits.filter(
      (p) => p.jenisForm === "height-work"
    ).length;
    const workshopCount = filteredPermits.filter(
      (p) => p.jenisForm === "workshop"
    ).length;

    return [
      { name: "Hot Work", jumlah: hotWorkCount },
      { name: "Height Work", jumlah: heightWorkCount },
      { name: "Workshop", jumlah: workshopCount },
    ];
  }, [filteredPermits]);

  const getPieChartData = useMemo(() => {
    const data = getBarChartData;
    const total = data.reduce((sum, item) => sum + item.jumlah, 0);

    return data.map((item) => ({
      name: item.name,
      value: item.jumlah,
      fill:
        item.name === "Hot Work"
          ? "#FF6B6B"
          : item.name === "Height Work"
          ? "#06B6D4"
          : "#10B981",
    }));
  }, [getBarChartData]);

  const percentageMap = useMemo(() => {
    const total = getPieChartData.reduce((sum, item) => sum + item.value, 0);
    return getPieChartData.reduce<Record<string, string>>((acc, item) => {
      acc[item.name] = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
      return acc;
    }, {});
  }, [getPieChartData]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    permits.forEach((p) => {
      const date = getPermitDate(p);
      if (date && date.getFullYear().toString() === selectedYear) {
        months.add(date.getMonth() + 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [permits, selectedYear]);

  const availableDays = useMemo(() => {
    const days = new Set<string>();
    permits.forEach((p) => {
      const date = getPermitDate(p);
      if (date && date.getFullYear().toString() === selectedYear) {
        const dateStr = date.toISOString().split("T")[0];
        days.add(dateStr);
      }
    });
    return Array.from(days).sort().reverse();
  }, [permits, selectedYear]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // 🔹 Toggle function for card click
  const toggleJenisForm = (jenis: "hot-work" | "height-work" | "workshop") => {
    setSelectedJenisForm(selectedJenisForm === jenis ? null : jenis);
  };

  // 🔹 Helper to check if a card is active
  const isActive = (jenis: "hot-work" | "height-work" | "workshop") =>
    selectedJenisForm === jenis;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/home"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Analitik</h1>
                <p className="text-sm text-gray-600">Visualisasi Data Permintaan Izin Kerja</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tahun
              </label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedMonth("");
                    setSelectedDay("");
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
                >
                  <option value="">Pilih Tahun</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periode
              </label>
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value as Period);
                    setSelectedMonth("");
                    setSelectedDay("");
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
                >
                  <option value="daily">Harian (Daily)</option>
                  <option value="weekly">Mingguan (Weekly)</option>
                  <option value="monthly">Bulanan (Monthly)</option>
                  <option value="yearly">Tahunan (Yearly)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {period === "monthly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bulan
                </label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
                  >
                    <option value="">Semua Bulan</option>
                    {availableMonths.map((month) => (
                      <option key={month} value={String(month).padStart(2, "0")}>
                        {monthNames[month - 1]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {period === "daily" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal
                </label>
                <div className="relative">
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
                  >
                    <option value="">Pilih Tanggal</option>
                    {availableDays.map((day) => {
                      const date = new Date(day);
                      return (
                        <option key={day} value={day}>
                          {date.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {/* Total Permintaan Izin */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Total Permintaan Izin</p>
                <p className="text-3xl font-bold text-gray-900">{filteredPermits.length}</p>
                <p className="text-xs text-gray-500 mt-2">Total keseluruhan</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>

          {/* Hot Work */}
          <div
            onClick={() => toggleJenisForm("hot-work")}
            className={`bg-white rounded-lg shadow-sm p-6 border cursor-pointer transition-all ${
              isActive("hot-work")
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-orange-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Hot Work</p>
                <p className="text-3xl font-bold text-gray-900">
                  {filteredPermits.filter(p => p.jenisForm === "hot-work").length}
                </p>
                <p className="text-xs text-gray-500 mt-2">Pekerjaan panas</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Height Work */}
          <div
            onClick={() => toggleJenisForm("height-work")}
            className={`bg-white rounded-lg shadow-sm p-6 border cursor-pointer transition-all ${
              isActive("height-work")
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Height Work</p>
                <p className="text-3xl font-bold text-gray-900">
                  {filteredPermits.filter(p => p.jenisForm === "height-work").length}
                </p>
                <p className="text-xs text-gray-500 mt-2">Pekerjaan ketinggian</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Workshop */}
          <div
            onClick={() => toggleJenisForm("workshop")}
            className={`bg-white rounded-lg shadow-sm p-6 border cursor-pointer transition-all ${
              isActive("workshop")
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-green-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Workshop</p>
                <p className="text-3xl font-bold text-gray-900">
                  {filteredPermits.filter(p => p.jenisForm === "workshop").length}
                </p>
                <p className="text-xs text-gray-500 mt-2">Workshop</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 mb-10">
          {/* Line Chart - Full Width */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tren Permintaan Izin
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getLineChartData} margin={{ bottom: 15 }}>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                  <XAxis
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    dataKey="name"
                    stroke="#999"
                    label={{
                      value:
                        period === "daily"
                          ? "Jam"
                          : period === "weekly"
                          ? "Hari"
                          : period === "monthly"
                          ? "Tanggal"
                          : "Bulan",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis
                    stroke="#999"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    label={{
                      value: "Jumlah Permintaan Izin",
                      fontSize: 12,
                      angle: -90,
                      style: { fill: "#6b7280", fontSize: 12 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      color: "#333",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="jumlah"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                    name="Jumlah"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Pie Chart */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Distribusi Jenis Izin
            </h3>

            {/* Chart */}
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getPieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {getPieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Hot Work</span>
                <span className="font-semibold text-red-500">{percentageMap["Hot Work"]}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Height Work</span>
                <span className="font-semibold text-cyan-500">{percentageMap["Height Work"]}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Workshop</span>
                <span className="font-semibold text-emerald-500">{percentageMap["Workshop"]}%</span>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Perbandingan Jenis Izin
            </h3>

            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getBarChartData}>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="jumlah" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}