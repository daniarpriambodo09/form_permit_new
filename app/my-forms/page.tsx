// app/my-forms/page.tsx
// Dashboard untuk pekerja — list semua form milik mereka
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, Plus, FileText, Clock, CheckCircle, XCircle,
  AlertCircle, Eye, Edit, Trash2, RefreshCw, User, LogOut,
} from "lucide-react";

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
}

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
  draft:     { label: "Draft",        icon: FileText,    color: "text-slate-600",  bg: "bg-slate-100" },
  submitted: { label: "Diajukan",     icon: Clock,       color: "text-blue-600",   bg: "bg-blue-100" },
  approved:  { label: "Disetujui",    icon: CheckCircle, color: "text-green-600",  bg: "bg-green-100" },
  rejected:  { label: "Ditolak",      icon: XCircle,     color: "text-red-600",    bg: "bg-red-100" },
};

export default function MyFormsPage() {
  const router = useRouter();
  const [forms,      setForms]      = useState<FormItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [userName,   setUserName]   = useState("");

  useEffect(() => {
    setUserName(sessionStorage.getItem("user_nama") || "");
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/my-forms");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setForms(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.clear();
    router.push("/login");
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
              <button onClick={() => loadForms()} disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600
                           hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
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
          <Link href="/"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700
                       text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Buat Form Baru
          </Link>
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
              }`}
            >
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
          /* Empty state */
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">
              {filterStatus === "all" ? "Belum ada form" : `Tidak ada form dengan status "${statusConfig[filterStatus]?.label}"`}
            </p>
            <p className="text-slate-400 text-sm mt-1">Buat form izin kerja baru untuk memulai.</p>
            <Link href="/"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700
                         text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Buat Form Baru
            </Link>
          </div>
        ) : (
          /* List forms */
          <div className="space-y-3">
            {filtered.map(form => {
              const cfg = statusConfig[form.status] || statusConfig.submitted;
              const Icon = cfg.icon;
              return (
                <div key={form.id_form}
                  className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className="text-base font-bold text-slate-900 font-mono">{form.id_form}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                            {jenisLabel[form.jenis_form] || form.jenis_form}
                          </span>
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
                        {/* Approved by */}
                        {form.approved_by && (
                          <p className="mt-2 text-xs text-green-600">
                            ✓ {form.status === "approved" ? "Disetujui" : "Ditolak"} oleh <strong>{form.approved_by}</strong> — {formatDate(form.approved_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <Link href={`/my-forms/${form.id_form}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600
                                   hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Detail
                      </Link>
                      {(form.status === "draft" || form.status === "rejected") && (
                        <Link href={`/my-forms/${form.id_form}/edit`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-orange-600
                                     hover:bg-orange-50 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> {form.status === "rejected" ? "Perbaiki" : "Edit"}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}