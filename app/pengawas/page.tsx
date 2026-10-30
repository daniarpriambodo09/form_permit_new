// app/pengawas/page.tsx
// Halaman khusus untuk Pengawas Dept:
// - Melihat daftar form Ijin Kerja Eksternal yang memerlukan penilaian sub kontraktor.
// - Mengisi lampiran checklist penilaian harian (sesuai rentang hari kerja).
// - Menyetujui (approve) form penilaian sub kontraktor.
// - Setelah disetujui Pengawas Dept, otomatis muncul di halaman Purchasing (tanpa email).

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PenilaianSubkontraktorSection, {
  createEmptyPenilaianSubkontraktor,
  getDaysRange,
  type PenilaianSubkontraktorData,
  type PenilaianItems,
} from "@/components/PenilaianSubkontraktorSection";
import {
  ClipboardCheck,
  Search,
  Filter,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Check,
  Lock,
  AlertTriangle,
} from "lucide-react";

// Format tanggal ke DD/MM/YYYY berdasarkan zona waktu lokal (WIB)
function formatTanggalDMY(value?: string | null): string {
  if (!value) return "-";
  // Tanggal murni "YYYY-MM-DD" → format langsung tanpa konversi zona waktu
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (plain) return `${plain[3]}/${plain[2]}/${plain[1]}`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

interface FormItem {
  id_form: string;
  status: string;
  nama_kontraktor_pekerja: string;
  pimpinan_kontraktor: string;
  lokasi_pekerjaan: string;
  tanggal: string;
  tanggal_pelaksanaan: string;
  izin_kerja_tanggal_dari: string | null;
  izin_kerja_tanggal_sampai: string | null;
  penilaian_subkontraktor: PenilaianSubkontraktorData;
  approval_status: {
    pengawas: boolean;
    purchasing: boolean;
    sfo: boolean;
  };
  evaluasi_akhir?: {
    area_bersih_rapi: boolean;
    limbah_ditangani_baik: boolean;
    instalasi_listrik_aman: boolean;
    tdk_ada_kerusakan_property: boolean;
    ada_tumpahan_kimia_bbm: boolean;
    tdk_ada_kehilangan_property: boolean;
    status: string;
    submitted_by?: string;
    submitted_at?: string;
    pengawas_approved: boolean;
    pengawas_approved_by?: string;
    pengawas_approved_at?: string;
    security_approved: boolean;
    security_approved_by?: string;
    security_approved_at?: string;
    sfo_approved: boolean;
    sfo_approved_by?: string;
    sfo_approved_at?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function PengawasDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id?: number;
    username?: string;
    nama?: string;
    nik?: string;
    role?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");

  // State modal pengisian penilaian
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [penilaianData, setPenilaianData] = useState<PenilaianSubkontraktorData>(
    createEmptyPenilaianSubkontraktor()
  );
  const [savingDraft, setSavingDraft] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State modal Evaluasi Akhir
  const [selectedEvalForm, setSelectedEvalForm] = useState<FormItem | null>(null);
  const [evalChecklist, setEvalChecklist] = useState<Record<string, boolean>>({
    eval_area_bersih_rapi: false,
    eval_limbah_ditangani_baik: false,
    eval_instalasi_listrik_aman: false,
    eval_tdk_ada_kerusakan_property: false,
    eval_ada_tumpahan_kimia_bbm: false,
    eval_tdk_ada_kehilangan_property: false,
  });
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalActionMsg, setEvalActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        if (data.user.role !== "pengawas" && data.user.role !== "admin") {
          router.replace("/home");
          return;
        }
        setCurrentUser(data.user);
        loadForms();
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const loadForms = async () => {
    try {
      const res = await fetch("/api/penilaian-subkontraktor", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setForms(json.data || []);
      }
    } catch (err) {
      console.error("Gagal mengambil data form:", err);
    }
  };

  const handleOpenForm = (form: FormItem) => {
    setSelectedForm(form);
    setActionMessage(null);

    const raw = form.penilaian_subkontraktor;
    if (raw && typeof raw === "object") {
      setPenilaianData({
        entries: Array.isArray(raw.entries) ? raw.entries : [],
        mengetahui: raw.mengetahui ?? createEmptyPenilaianSubkontraktor().mengetahui,
      });
    } else {
      setPenilaianData(createEmptyPenilaianSubkontraktor());
    }
  };

  const handleCloseModal = () => {
    setSelectedForm(null);
    setActionMessage(null);
  };

  const handleOpenEvaluasi = (form: FormItem) => {
    setSelectedEvalForm(form);
    setEvalActionMsg(null);
    const ex = form.evaluasi_akhir;
    setEvalChecklist({
      eval_area_bersih_rapi: Boolean(ex?.area_bersih_rapi),
      eval_limbah_ditangani_baik: Boolean(ex?.limbah_ditangani_baik),
      eval_instalasi_listrik_aman: Boolean(ex?.instalasi_listrik_aman),
      eval_tdk_ada_kerusakan_property: Boolean(ex?.tdk_ada_kerusakan_property),
      eval_ada_tumpahan_kimia_bbm: Boolean(ex?.ada_tumpahan_kimia_bbm),
      eval_tdk_ada_kehilangan_property: Boolean(ex?.tdk_ada_kehilangan_property),
    });
  };

  const handleCloseEvaluasiModal = () => {
    setSelectedEvalForm(null);
    setEvalActionMsg(null);
  };

  const handleSubmitEvaluasiPengawas = async () => {
    if (!selectedEvalForm) return;

    const isPenilaianComplete = Boolean(
      selectedEvalForm.approval_status?.pengawas &&
      selectedEvalForm.approval_status?.purchasing &&
      selectedEvalForm.approval_status?.sfo
    );

    if (!isPenilaianComplete) {
      setEvalActionMsg({
        type: "error",
        text: "Evaluasi Akhir belum dapat disetujui. Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) harus disetujui lengkap terlebih dahulu oleh Pengawas Dept, Purchasing, dan SFO.",
      });
      return;
    }

    if (
      !confirm(
        "Konfirmasi persetujuan Evaluasi Akhir oleh Pengawas Dept? Data checklist akan dikirim dan diteruskan ke Security untuk verifikasi lapangan."
      )
    ) {
      return;
    }

    setSubmittingEval(true);
    setEvalActionMsg(null);
    try {
      const res = await fetch(`/api/evaluasi-akhir/${selectedEvalForm.id_form}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_pengawas",
          checklist: evalChecklist,
          nama: currentUser?.nama || currentUser?.username,
          nik: currentUser?.nik,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyetujui evaluasi akhir.");
      }

      setEvalActionMsg({
        type: "success",
        text: "Berhasil disetujui! Data otomatis diteruskan ke Security untuk verifikasi lapangan.",
      });

      await loadForms();
    } catch (err: any) {
      setEvalActionMsg({ type: "error", text: err.message || "Gagal menyetujui evaluasi akhir." });
    } finally {
      setSubmittingEval(false);
    }
  };

  const handleSaveDraft = async (dataToSave?: PenilaianSubkontraktorData) => {
    if (!selectedForm) return;
    setSavingDraft(true);
    setActionMessage(null);

    const payload = dataToSave || penilaianData;

    try {
      const res = await fetch(`/api/penilaian-subkontraktor/${selectedForm.id_form}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan checklist");
      }

      setActionMessage({ type: "success", text: "Draft checklist berhasil disimpan!" });
      await loadForms();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Gagal menyimpan draft." });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleApprovePengawas = async () => {
    if (!selectedForm) return;

    // Validasi apakah checklist sudah diisi
    const targetDays = getDaysRange(
      selectedForm.izin_kerja_tanggal_dari,
      selectedForm.izin_kerja_tanggal_sampai
    );
    const expectedCount = targetDays.length > 0 ? targetDays.length : 1;

    if (penilaianData.entries.length < expectedCount) {
      if (
        !confirm(
          `Jumlah checklist (${penilaianData.entries.length}) belum mencakup seluruh hari kerja (${expectedCount} hari). Tetap setujui sekarang?`
        )
      ) {
        return;
      }
    }

    setApproving(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/penilaian-subkontraktor/${selectedForm.id_form}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_pengawas",
          entries: penilaianData.entries,
          nama: currentUser?.nama || currentUser?.username,
          nik: currentUser?.nik,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyetujui form penilaian.");
      }

      setActionMessage({
        type: "success",
        text: "Berhasil disetujui! Data otomatis diteruskan ke halaman Purchasing.",
      });

      // Update state lokal
      if (json.data) {
        setPenilaianData(json.data);
      }
      await loadForms();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Gagal menyetujui form." });
    } finally {
      setApproving(false);
    }
  };

  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        f.id_form.toLowerCase().includes(q) ||
        (f.nama_kontraktor_pekerja && f.nama_kontraktor_pekerja.toLowerCase().includes(q)) ||
        (f.lokasi_pekerjaan && f.lokasi_pekerjaan.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (statusFilter === "pending") {
        return !f.approval_status.pengawas;
      }
      if (statusFilter === "approved") {
        return f.approval_status.pengawas;
      }
      return true;
    });
  }, [forms, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = forms.length;
    const pending = forms.filter((f) => !f.approval_status.pengawas).length;
    const approved = forms.filter((f) => f.approval_status.pengawas).length;
    return { total, pending, approved };
  }, [forms]);

  const isCurrentFormApproved = selectedForm?.approval_status?.pengawas || false;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <div
        style={{ paddingLeft: "var(--sidebar-width, 0px)" }}
        className="transition-[padding] duration-300"
      >
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) — Pengawas Dept
                </h1>
                <p className="text-xs text-slate-500">
                  Pengisian checklist harian & persetujuan digital
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-xs font-semibold">
                Role: Pengawas Dept
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {currentUser?.nama || currentUser?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total Form Ijin Kerja
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  Menunggu Checklist / Approve
                </p>
                <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Selesai Disetujui Pengawas
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari ID form, kontraktor, lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "all"
                      ? "bg-white text-slate-800 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "pending"
                      ? "bg-amber-500 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Perlu Diisi ({stats.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("approved")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "approved"
                      ? "bg-emerald-600 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Disetujui ({stats.approved})
                </button>
              </div>
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
              <p className="text-sm">Memuat daftar form...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Tidak ada form ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? "Coba ubah kata kunci pencarian" : "Belum ada pengajuan izin kerja eksternal"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredForms.map((item) => {
                const days = getDaysRange(item.izin_kerja_tanggal_dari, item.izin_kerja_tanggal_sampai);
                const daysCount = days.length > 0 ? days.length : 1;
                const entriesCount = item.penilaian_subkontraktor?.entries?.length || 0;
                const isApproved = item.approval_status.pengawas;
                const isPenilaianComplete = Boolean(
                  item.approval_status.pengawas &&
                  item.approval_status.purchasing &&
                  item.approval_status.sfo
                );

                return (
                  <div
                    key={item.id_form}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                          {item.id_form}
                        </span>
                        {isApproved ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disetujui
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Perlu Checklist
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-2.5 my-4">
                        <div className="flex items-start gap-2 text-slate-700">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {item.nama_kontraktor_pekerja || "-"}
                            </p>
                            {item.pimpinan_kontraktor && item.pimpinan_kontraktor !== "-" && (
                              <p className="text-[11px] text-slate-400">
                                PIC: {item.pimpinan_kontraktor}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-600 truncate">{item.lokasi_pekerjaan || "-"}</p>
                        </div>

                        <div className="flex items-start gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-600">
                              {formatTanggalDMY(item.izin_kerja_tanggal_dari)} s/d {formatTanggalDMY(item.izin_kerja_tanggal_sampai)}
                            </p>
                            <p className="text-[10px] text-amber-700 font-semibold">
                              Durasi: {daysCount} Hari Kerja ({entriesCount}/{daysCount} Terisi)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Approval chain mini */}
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-[10px]">
                        <div className="text-center flex-1">
                          <p className="text-slate-400 font-semibold">Pengawas</p>
                          <p className={`font-bold mt-0.5 ${item.approval_status.pengawas ? "text-emerald-600" : "text-slate-400"}`}>
                            {item.approval_status.pengawas ? "✓ Ok" : "Menunggu"}
                          </p>
                        </div>
                        <div className="text-slate-300">→</div>
                        <div className="text-center flex-1">
                          <p className="text-slate-400 font-semibold">Purchasing</p>
                          <p className={`font-bold mt-0.5 ${item.approval_status.purchasing ? "text-blue-600" : "text-slate-400"}`}>
                            {item.approval_status.purchasing ? "✓ Ok" : "Menunggu"}
                          </p>
                        </div>
                        <div className="text-slate-300">→</div>
                        <div className="text-center flex-1">
                          <p className="text-slate-400 font-semibold">SFO</p>
                          <p className={`font-bold mt-0.5 ${item.approval_status.sfo ? "text-purple-600" : "text-slate-400"}`}>
                            {item.approval_status.sfo ? "✓ Ok" : "Menunggu"}
                          </p>
                        </div>
                      </div>
                      {/* Mini status Evaluasi Akhir */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Evaluasi Akhir:</span>
                        {item.evaluasi_akhir?.sfo_approved ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                            ✓ Selesai SFO
                          </span>
                        ) : item.evaluasi_akhir?.security_approved ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                            ✓ Menunggu SFO
                          </span>
                        ) : item.evaluasi_akhir?.pengawas_approved ? (
                          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                            ✓ Menunggu Security
                          </span>
                        ) : !isPenilaianComplete ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-amber-600" /> Terkunci
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            Belum Diisi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => handleOpenForm(item)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          isApproved
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                            : "bg-orange-600 hover:bg-orange-700 text-white"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate">{isApproved ? "Lihat Penilaian" : "Nilai Subcont"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEvaluasi(item)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          item.evaluasi_akhir?.pengawas_approved
                            ? "bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                            : !isPenilaianComplete
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                        }`}
                      >
                        {!isPenilaianComplete && !item.evaluasi_akhir?.pengawas_approved ? (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        )}
                        <span className="truncate">Evaluasi Akhir</span>
                        {item.evaluasi_akhir?.pengawas_approved && <span className="text-[10px]">✓</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal Pengisian Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) */}
      {selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-4">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) — {selectedForm.id_form}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-md">
                    Pengawas Dept
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Kontraktor: {selectedForm.nama_kontraktor_pekerja} • Lokasi: {selectedForm.lokasi_pekerjaan}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message if any */}
            {actionMessage && (
              <div
                className={`px-6 py-3 text-xs font-semibold flex items-center gap-2 ${
                  actionMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                    : "bg-red-50 text-red-800 border-b border-red-200"
                }`}
              >
                {actionMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{actionMessage.text}</span>
              </div>
            )}

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <PenilaianSubkontraktorSection
                value={penilaianData}
                setValue={setPenilaianData}
                readOnly={isCurrentFormApproved}
                formId={selectedForm.id_form}
                tanggalDari={selectedForm.izin_kerja_tanggal_dari}
                tanggalSampai={selectedForm.izin_kerja_tanggal_sampai}
                currentUserName={currentUser?.nama || currentUser?.username}
                currentUserNik={currentUser?.nik}
                onSave={isCurrentFormApproved ? undefined : handleSaveDraft}
              />
            </div>

            {/* Modal Footer / Action Box */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                {isCurrentFormApproved ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Form telah disetujui Pengawas Dept
                  </span>
                ) : (
                  <span>
                    Pastikan checklist harian sudah terisi, lalu klik <strong>Setujui Pengawas Dept</strong>.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                {!isCurrentFormApproved && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveDraft()}
                      disabled={savingDraft || approving}
                      className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Simpan Draft
                    </button>

                    <button
                      type="button"
                      onClick={handleApprovePengawas}
                      disabled={savingDraft || approving}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Simpan & Setujui Pengawas Dept
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          Modal Evaluasi Akhir (Pengawas Dept)
      ══════════════════════════════════════════════════════════ */}
      {selectedEvalForm && (() => {
        const isPenilaianComplete = Boolean(
          selectedEvalForm.approval_status?.pengawas &&
          selectedEvalForm.approval_status?.purchasing &&
          selectedEvalForm.approval_status?.sfo
        );
        const isLocked = !isPenilaianComplete;
        const isReadOnly = Boolean(selectedEvalForm.evaluasi_akhir?.pengawas_approved) || isLocked;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-4">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <ClipboardCheck className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        Evaluasi Akhir — {selectedEvalForm.id_form}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md">
                        Pengawas Dept
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Kontraktor: {selectedEvalForm.nama_kontraktor_pekerja} • Lokasi: {selectedEvalForm.lokasi_pekerjaan}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEvaluasiModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification message */}
              {evalActionMsg && (
                <div
                  className={`px-6 py-3 text-xs font-semibold flex items-center gap-2 ${
                    evalActionMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                      : "bg-red-50 text-red-800 border-b border-red-200"
                  }`}
                >
                  {evalActionMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{evalActionMsg.text}</span>
                </div>
              )}

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Warning if Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) is not fully approved */}
                {isLocked && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Evaluasi Akhir Terkunci
                      </h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        Evaluasi Akhir baru dapat diisi dan disetujui setelah <strong>Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1)</strong> telah disetujui lengkap oleh <strong>Pengawas Dept</strong>, <strong>Purchasing</strong>, dan <strong>SFO</strong>.
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold flex-wrap">
                        <span className={`px-2.5 py-1 rounded-md border ${selectedEvalForm.approval_status.pengawas ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-900 border-amber-300"}`}>
                          {selectedEvalForm.approval_status.pengawas ? "✓ Pengawas Dept" : "○ Pengawas (Belum)"}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className={`px-2.5 py-1 rounded-md border ${selectedEvalForm.approval_status.purchasing ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-900 border-amber-300"}`}>
                          {selectedEvalForm.approval_status.purchasing ? "✓ Purchasing" : "○ Purchasing (Belum)"}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className={`px-2.5 py-1 rounded-md border ${selectedEvalForm.approval_status.sfo ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-900 border-amber-300"}`}>
                          {selectedEvalForm.approval_status.sfo ? "✓ SFO" : "○ SFO (Belum)"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info banner */}
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
                    Checklist Evaluasi Selesai Pekerjaan
                  </h4>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    Diisi dan disetujui oleh Pengawas Dept setelah pekerjaan selesai. Setelah disetujui, evaluasi ini akan otomatis diteruskan ke <strong>Security</strong> untuk verifikasi fisik lapangan, lalu ke <strong>SFO</strong> untuk persetujuan akhir.
                  </p>
                </div>

                {/* Checklist Items */}
                <div className="space-y-2.5">
                  {[
                    { key: "eval_area_bersih_rapi", num: 1, title: "Area bersih & rapih", desc: "Area kerja telah dibersihkan dan dirapikan kembali seperti kondisi semula." },
                    { key: "eval_limbah_ditangani_baik", num: 2, title: "Limbah ditangani dengan baik", desc: "Seluruh limbah, sisa material, dan sampah kerja telah dibuang sesuai prosedur K3." },
                    { key: "eval_instalasi_listrik_aman", num: 3, title: "Instalasi listrik aman", desc: "Semua kabel sementara, sambungan daya, dan panel telah diamankan/dicabut." },
                    { key: "eval_tdk_ada_kerusakan_property", num: 4, title: "Tidak ada kerusakan property", desc: "Tidak terdapat kerusakan fasilitas, mesin, atau gedung milik PT. JAI." },
                    { key: "eval_ada_tumpahan_kimia_bbm", num: 5, title: "Ada tumpahan bahan kimia/BBM", desc: "Pemeriksaan ada/tidaknya ceceran oli, bahan bakar, atau zat kimia di lokasi." },
                    { key: "eval_tdk_ada_kehilangan_property", num: 6, title: "Tidak ada kehilangan property", desc: "Tidak ada barang, perkakas, atau inventaris milik perusahaan yang hilang." },
                  ].map((item) => {
                    const isChecked = Boolean(evalChecklist[item.key]);

                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={isReadOnly}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isReadOnly) {
                            setEvalChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                          }
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          isChecked
                            ? "bg-purple-50/80 border-purple-300 ring-1 ring-purple-200"
                            : isLocked
                            ? "bg-slate-50/60 border-slate-200 opacity-60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        } ${isReadOnly ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                              isChecked
                                ? "bg-purple-600 border-purple-600 text-white"
                                : isLocked
                                ? "bg-slate-200 border-slate-300 text-slate-400"
                                : "bg-white border-slate-300 text-transparent"
                            }`}
                          >
                            {isChecked ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : isLocked ? (
                              <Lock className="w-2.5 h-2.5" />
                            ) : null}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${isChecked ? "text-purple-950" : isLocked ? "text-slate-500" : "text-slate-800"}`}>
                              {item.num}. {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isChecked
                              ? "bg-purple-100 text-purple-700"
                              : isLocked
                              ? "bg-slate-100 text-slate-400"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isChecked ? "✓ Ya" : isLocked ? "Terkunci" : "Belum"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Workflow status timeline */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Alur Persetujuan Evaluasi Akhir
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    {/* Step 1: Pengawas */}
                    <div className={`p-2.5 rounded-lg border ${selectedEvalForm.evaluasi_akhir?.pengawas_approved ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>
                      <p className="font-bold text-[11px]">1. Pengawas Dept</p>
                      <p className="text-[10px] mt-0.5">
                        {selectedEvalForm.evaluasi_akhir?.pengawas_approved
                          ? `✓ Disetujui (${selectedEvalForm.evaluasi_akhir.pengawas_approved_by || "Pengawas"})`
                          : isLocked
                          ? "🔒 Terkunci (Perlu Penilaian)"
                          : "⏳ Menunggu Checklist"}
                      </p>
                    </div>
                    {/* Step 2: Security */}
                    <div className={`p-2.5 rounded-lg border ${selectedEvalForm.evaluasi_akhir?.security_approved ? "bg-emerald-50 border-emerald-200 text-emerald-800" : selectedEvalForm.evaluasi_akhir?.pengawas_approved ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-white border-slate-200 text-slate-400"}`}>
                      <p className="font-bold text-[11px]">2. Security</p>
                      <p className="text-[10px] mt-0.5">
                        {selectedEvalForm.evaluasi_akhir?.security_approved
                          ? `✓ Diverifikasi (${selectedEvalForm.evaluasi_akhir.security_approved_by || "Security"})`
                          : selectedEvalForm.evaluasi_akhir?.pengawas_approved
                          ? "⏳ Menunggu Verifikasi"
                          : "○ Menunggu Pengawas"}
                      </p>
                    </div>
                    {/* Step 3: SFO */}
                    <div className={`p-2.5 rounded-lg border ${selectedEvalForm.evaluasi_akhir?.sfo_approved ? "bg-emerald-50 border-emerald-200 text-emerald-800" : selectedEvalForm.evaluasi_akhir?.security_approved ? "bg-purple-50 border-purple-200 text-purple-800" : "bg-white border-slate-200 text-slate-400"}`}>
                      <p className="font-bold text-[11px]">3. SFO</p>
                      <p className="text-[10px] mt-0.5">
                        {selectedEvalForm.evaluasi_akhir?.sfo_approved
                          ? `✓ Disetujui (${selectedEvalForm.evaluasi_akhir.sfo_approved_by || "SFO"})`
                          : selectedEvalForm.evaluasi_akhir?.security_approved
                          ? "⏳ Menunggu Approval"
                          : "○ Menunggu Security"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500">
                  {isLocked ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) belum disetujui lengkap
                    </span>
                  ) : selectedEvalForm.evaluasi_akhir?.pengawas_approved ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Telah disetujui Pengawas Dept
                    </span>
                  ) : (
                    <span>Lengkapi checklist di atas lalu klik setujui.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseEvaluasiModal}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>

                  {!selectedEvalForm.evaluasi_akhir?.pengawas_approved && (
                    <button
                      type="button"
                      onClick={handleSubmitEvaluasiPengawas}
                      disabled={submittingEval || isLocked}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                        isLocked
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none"
                          : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white cursor-pointer"
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : submittingEval ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {isLocked ? "Terkunci" : "Setujui & Teruskan ke Security"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
