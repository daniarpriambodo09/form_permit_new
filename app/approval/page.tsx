// app/approval/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, CheckCircle, XCircle, Clock, Eye,
  LogOut, User, FileText, RefreshCw, AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface FormItem {
  id_form: string;
  jenis_form: string;
  status: string;
  tanggal: string;
  tanggal_pelaksanaan?: string;
  no_registrasi?: string;
  nama_kontraktor_nik?: string;
  lokasi_pekerjaan?: string;
  waktu_pukul?: string;
  catatan_reject?: string;
  approved_by?: string;
  approved_at?: string;
}

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};
const formatTime = (t?: string) => (!t ? "-" : String(t).slice(0, 5));

const jenisLabel: Record<string, string> = {
  "hot-work":    "Hot Work Permit",
  "workshop":    "Workshop Permit",
  "height-work": "Kerja Ketinggian",
};
const jenisBadge: Record<string, string> = {
  "hot-work":    "bg-red-100 text-red-700",
  "workshop":    "bg-purple-100 text-purple-700",
  "height-work": "bg-orange-100 text-orange-700",
};

const statusTabs = [
  { key: "submitted", label: "Menunggu Review", icon: Clock,         color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-500" },
  { key: "approved",  label: "Sudah Disetujui", icon: CheckCircle,   color: "text-green-600", bg: "bg-green-50", border: "border-green-500" },
  { key: "rejected",  label: "Ditolak",         icon: XCircle,       color: "text-red-600",   bg: "bg-red-50",   border: "border-red-500" },
];

// ── Page ──────────────────────────────────────────────────────
export default function ApprovalPage() {
  const router = useRouter();
  const [forms,      setForms]      = useState<FormItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("submitted");
  const [filterJenis, setFilterJenis] = useState("all");
  const [userName,   setUserName]   = useState("");
  const [userJabatan, setUserJabatan] = useState("");

  useEffect(() => {
    // Ambil info user dari sessionStorage
    setUserName(sessionStorage.getItem("user_nama") || "");
    setUserJabatan(sessionStorage.getItem("user_jabatan") || "");
    loadForms("submitted");
  }, []);

  const loadForms = async (status = activeTab) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/approval?status=${status}`);
      if (res.status === 401) { router.push("/login"); return; }
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.clear();
    router.push("/login");
  };

  const filtered = forms.filter(f =>
    filterJenis === "all" || f.jenis_form === filterJenis
  );

  const counts: Record<string, number> = { submitted: 0, approved: 0, rejected: 0 };
  forms.forEach(f => { if (counts[f.status] !== undefined) counts[f.status]++; });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg">
                <Home className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Dashboard Approval</h1>
                  <p className="text-xs text-slate-500">PT Jatim Autocomp Indonesia</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* User info */}
              {userName && (
                <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-700">{userName}</p>
                    <p className="text-slate-400">{userJabatan}</p>
                  </div>
                </div>
              )}
              <button onClick={() => loadForms(activeTab)} disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Refresh"
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
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {statusTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                className={`bg-white rounded-xl p-4 border-2 transition-all text-left
                  ${activeTab === tab.key
                    ? `${tab.border} shadow-md`
                    : "border-slate-200 hover:border-slate-300"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tab.label}</span>
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                </div>
                <p className={`text-3xl font-bold mt-2 ${tab.color}`}>{counts[tab.key]}</p>
              </button>
            );
          })}
        </div>

        {/* Filter jenis */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
          {["all","hot-work","workshop","height-work"].map(type => (
            <button key={type} onClick={() => setFilterJenis(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterJenis === type
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type === "all" ? "Semua" : jenisLabel[type]}
            </button>
          ))}
        </div>

        {/* List forms */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600" />
            <p className="mt-3 text-slate-400 text-sm">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Tidak ada form dengan status ini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(form => (
              <div key={form.id_form}
                className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all"
              >
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <span className="text-base font-bold text-slate-900 font-mono">{form.id_form}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${jenisBadge[form.jenis_form] || "bg-slate-100 text-slate-600"}`}>
                        {jenisLabel[form.jenis_form] || form.jenis_form}
                      </span>
                      {form.status === "rejected" && form.catatan_reject && (
                        <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          ✗ Ditolak
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-500">
                      <div>
                        <span className="text-xs text-slate-400">Kontraktor</span>
                        <p className="font-medium text-slate-700 truncate">{form.nama_kontraktor_nik || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Lokasi</span>
                        <p className="font-medium text-slate-700 truncate">{form.lokasi_pekerjaan || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Tgl Diajukan</span>
                        <p className="font-medium text-slate-700">{formatDate(form.tanggal)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Tgl Pelaksanaan</span>
                        <p className="font-medium text-slate-700">{formatDate(form.tanggal_pelaksanaan)}</p>
                      </div>
                    </div>
                    {/* Catatan reject preview */}
                    {form.catatan_reject && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                        <span className="font-semibold">Catatan: </span>{form.catatan_reject}
                      </div>
                    )}
                    {/* Approved by */}
                    {form.approved_by && (
                      <p className="mt-2 text-xs text-green-600">
                        ✓ {form.status === "approved" ? "Disetujui" : "Ditolak"} oleh <strong>{form.approved_by}</strong> — {formatDate(form.approved_at)}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/approval/${form.jenis_form}/${form.id_form}`}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2.5
                               bg-orange-600 hover:bg-orange-700 text-white
                               rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {activeTab === "submitted" ? "Review" : "Lihat"}
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}