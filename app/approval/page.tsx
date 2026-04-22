// app/approval/page.tsx
// FIX: getApprovalStages dan getStageLabelForForm sekarang aware tipe_perusahaan
// untuk hot-work & workshop:
//   Internal:  fw(0) → spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Eksternal: kontraktor(0) → fw(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, CheckCircle, XCircle, Clock, Eye,
  LogOut, User, FileText, RefreshCw,
  Shield, ShieldCheck,
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
  catatan_reject?: string;
  approved_by?: string;
  approved_at?: string;
  current_stage?: number;
  // tipe_perusahaan berlaku untuk semua jenis form
  tipe_perusahaan?: string;
  // approval columns hot-work & workshop
  fw_approved?: boolean;
  spv_approved?: boolean;
  kontraktor_approved?: boolean;
  admin_k3_approved?: boolean;
  sfo_approved?: boolean;
  pga_approved?: boolean;
  mr_pga_approved?: boolean;
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
  "hot-work":    "Hot Work Permit",
  "workshop":    "Workshop Permit",
  "height-work": "Kerja Ketinggian",
};

const jenisBadge: Record<string, string> = {
  "hot-work":    "bg-red-100 text-red-700",
  "workshop":    "bg-purple-100 text-purple-700",
  "height-work": "bg-orange-100 text-orange-700",
};

const roleLabelMap: Record<string, string> = {
  firewatch:  "Fire Watch",
  spv:        "SPV",
  kontraktor: "Kontraktor",
  admin_k3:   "Admin K3",
  sfo:        "SFO",
  pga:        "PGA / MR",
  admin:      "Admin",
};

// ── Helper: label stage sesuai jenis form & tipe_perusahaan ──
// Dipakai untuk badge "Tahap X: ..." di card list
function getStageLabelForForm(form: FormItem): string {
  const stage = form.current_stage ?? 0;
  const isHw  = form.jenis_form === "height-work";
  const isEksternal = form.tipe_perusahaan === "eksternal";

  if (isHw) {
    if (isEksternal) {
      const map: Record<number, string> = {
        1: "Kontraktor", 2: "SPV", 3: "Admin K3", 4: "SFO", 5: "MR/PGA",
      };
      return map[stage] ?? `Tahap ${stage}`;
    }
    // height-work internal
    const map: Record<number, string> = {
      1: "SPV", 2: "Admin K3", 3: "SFO", 4: "MR/PGA",
    };
    return map[stage] ?? `Tahap ${stage}`;
  }

  // hot-work & workshop — aware tipe_perusahaan
  if (isEksternal) {
    // Eksternal: stage 0=Kontraktor, 1=FireWatch, 2=SPV, 3=AdminK3, 4=SFO, 5=MR/PGA
    const map: Record<number, string> = {
      0: "Kontraktor", 1: "Fire Watch", 2: "SPV", 3: "Admin K3", 4: "SFO", 5: "MR/PGA",
    };
    return map[stage] ?? `Tahap ${stage}`;
  }

  // Internal: stage 0=FireWatch, 1=SPV, 2=AdminK3, 3=SFO, 4=MR/PGA
  const map: Record<number, string> = {
    0: "Fire Watch", 1: "SPV", 2: "Admin K3", 3: "SFO", 4: "MR/PGA",
  };
  return map[stage] ?? `Tahap ${stage}`;
}

// ── Helper: stages badge untuk approval progress ──
function getApprovalStages(form: FormItem): { key: keyof FormItem; label: string }[] {
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

  // hot-work & workshop — aware tipe_perusahaan
  if (isEksternal) {
    return [
      { key: "kontraktor_approved", label: "Kontraktor" },
      { key: "fw_approved",         label: "Fire Watch" },
      { key: "spv_approved",        label: "SPV" },
      { key: "admin_k3_approved",   label: "Admin K3" },
      { key: "sfo_approved",        label: "SFO" },
      { key: "mr_pga_approved",     label: "MR/PGA" },
    ];
  }

  // Internal
  return [
    { key: "fw_approved",       label: "Fire Watch" },
    { key: "spv_approved",      label: "SPV" },
    { key: "admin_k3_approved", label: "Admin K3" },
    { key: "sfo_approved",      label: "SFO" },
    { key: "mr_pga_approved",   label: "MR/PGA" },
  ];
}

const statusTabs = [
  { key: "submitted", label: "Belum Disetujui", icon: Clock,        color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-500" },
  { key: "approved",  label: "Sudah Disetujui", icon: CheckCircle,  color: "text-green-600", bg: "bg-green-50", border: "border-green-500" },
  { key: "rejected",  label: "Ditolak",          icon: XCircle,     color: "text-red-600",   bg: "bg-red-50",   border: "border-red-500" },
];

// ── Page ──────────────────────────────────────────────────────
export default function ApprovalPage() {
  const router = useRouter();
  const [forms, setForms]           = useState<FormItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("submitted");
  const [filterJenis, setFilterJenis] = useState("all");
  const [userName, setUserName]     = useState("");
  const [userJabatan, setUserJabatan] = useState("");
  const [userRole, setUserRole]     = useState("");
  const [formCounts, setFormCounts] = useState<FormCounts>({ submitted: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    const role = sessionStorage.getItem("user_role") || "";
    setUserName(sessionStorage.getItem("user_nama") || "");
    setUserJabatan(sessionStorage.getItem("user_jabatan") || "");
    setUserRole(role);

    Promise.all([loadFormCounts(), loadForms("submitted")]).finally(() => setLoading(false));
  }, []);

  const loadFormCounts = async () => {
    try {
      const res = await fetch("/api/approval?countOnly=1");
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
      const res = await fetch(`/api/approval?status=${status}`);
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

  const handleRefresh = async () => {
    await Promise.all([loadFormCounts(), loadForms(activeTab)]);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.clear();
    router.push("/");
  };

  const filtered = forms.filter(f => filterJenis === "all" || f.jenis_form === filterJenis);

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
              {userName && (
                <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-sm font-semibold text-slate-700 block">{userName}</span>
                    <span className="text-xs text-slate-500">{userJabatan} • {roleLabelMap[userRole] || userRole}</span>
                  </div>
                </div>
              )}
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
        {/* Info role */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Anda login sebagai: <span className="font-bold">{roleLabelMap[userRole] || userRole}</span>
              </p>
              <p className="text-xs text-blue-700">
                {activeTab === "submitted"
                  ? "Menampilkan form yang menunggu approval Anda"
                  : activeTab === "approved"
                    ? "Menampilkan form yang telah Anda setujui"
                    : "Menampilkan form yang ditolak"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {statusTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                className={`bg-white rounded-xl p-4 border-2 transition-all text-left ${
                  activeTab === tab.key ? `${tab.border} shadow-md` : "border-slate-200 hover:border-slate-300"
                }`}>
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

        {/* Filter jenis */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
          {["all", "hot-work", "workshop", "height-work"].map(type => (
            <button key={type} onClick={() => setFilterJenis(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterJenis === type ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {type === "all" ? "Semua" : jenisLabel[type]}
            </button>
          ))}
        </div>

        {/* List */}
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
              const stageLabel     = getStageLabelForForm(form);
              const approvalStages = getApprovalStages(form);
              const isHeightWork   = form.jenis_form === "height-work";
              const isFwForm       = form.jenis_form === "hot-work" || form.jenis_form === "workshop";
              const isEksternal    = form.tipe_perusahaan === "eksternal";

              return (
                <div key={form.id_form}
                  className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all">
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <span className="text-base font-bold text-slate-900 font-mono">{form.id_form}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${jenisBadge[form.jenis_form] || "bg-slate-100 text-slate-600"}`}>
                          {jenisLabel[form.jenis_form] || form.jenis_form}
                        </span>
                        {/* Badge tipe perusahaan */}
                        {form.tipe_perusahaan && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isEksternal ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {isEksternal ? "Eksternal" : "Internal"}
                          </span>
                        )}
                        {/* Badge tahap saat ini */}
                        {activeTab === "submitted" && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Tahap {form.current_stage}: {stageLabel}
                          </span>
                        )}
                        {form.status === "rejected" && form.catatan_reject && (
                          <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                            ✗ Ditolak
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-500">
                        <div>
                          <span className="text-xs text-slate-400">Kontraktor / Pekerja</span>
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

                      {/* Approval Progress Badges */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {approvalStages.map(stage => {
                          const isApproved = Boolean((form as any)[stage.key]);
                          return (
                            <span key={stage.key}
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                isApproved
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                              {isApproved ? "✓" : "○"} {stage.label}
                            </span>
                          );
                        })}
                      </div>

                      {/* Info alur */}
                      {isFwForm && form.tipe_perusahaan && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Alur: {isEksternal
                            ? "Kontraktor → Fire Watch → SPV → Admin K3 → SFO → MR/PGA"
                            : "Fire Watch → SPV → Admin K3 → SFO → MR/PGA"}
                        </p>
                      )}
                      {isHeightWork && form.tipe_perusahaan && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Alur: {isEksternal
                            ? "Kontraktor → SPV → Admin K3 → SFO → MR/PGA"
                            : "SPV → Admin K3 → SFO → MR/PGA"}
                        </p>
                      )}

                      {form.catatan_reject && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                          <span className="font-semibold">Catatan: </span>{form.catatan_reject}
                        </div>
                      )}
                      {form.approved_by && activeTab !== "submitted" && (
                        <p className="mt-2 text-xs text-green-600">
                          ✓ {form.status === "approved" ? "Disetujui" : "Ditolak"} oleh <strong>{form.approved_by}</strong> — {formatDate(form.approved_at)}
                        </p>
                      )}
                    </div>

                    <Link href={`/approval/${form.jenis_form}/${form.id_form}`}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2.5
                                 bg-orange-600 hover:bg-orange-700 text-white
                                 rounded-lg text-sm font-semibold transition-colors">
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">{activeTab === "submitted" ? "Review" : "Lihat"}</span>
                    </Link>
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