// app/purchasing/page.tsx
// Halaman khusus untuk Purchasing:
// - Melihat daftar form Ijin Kerja Eksternal terkait Penilaian Sub Kontraktor.
// - Meninjau hasil checklist pengawasan yang telah diisi & disetujui Pengawas Dept.
// - Melakukan approval/otorisasi Purchasing (barcode digital).
// - Mengirim otomatis notifikasi email ke SFO yang terdaftar setelah Purchasing approve.
// - Menyediakan fitur ekspor file penilaian sub kontraktor ke Excel (.xlsx) dan PDF (.pdf).

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PenilaianSubkontraktorSection, {
  createEmptyPenilaianSubkontraktor,
  getDaysRange,
  type PenilaianSubkontraktorData,
} from "@/components/PenilaianSubkontraktorSection";
import { exportPenilaianToExcel, exportPenilaianToPdf } from "@/lib/export-penilaian";
import {
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  Download,
  ShieldCheck,
  Send,
  Eye,
} from "lucide-react";

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
  created_at: string;
  updated_at: string;
}

export default function PurchasingDashboardPage() {
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
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "approved">("all");

  // Modal Review & Approval
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [penilaianData, setPenilaianData] = useState<PenilaianSubkontraktorData>(
    createEmptyPenilaianSubkontraktor()
  );
  const [approving, setApproving] = useState(false);
  const [exportingType, setExportingType] = useState<"excel" | "pdf" | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        if (data.user.role !== "purchasing" && data.user.role !== "admin") {
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

  const handleApprovePurchasing = async () => {
    if (!selectedForm) return;

    if (!confirm("Setujui Form Penilaian Sub Kontraktor ini? Notifikasi email akan otomatis dikirimkan ke tim SFO terdaftar.")) {
      return;
    }

    setApproving(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/penilaian-subkontraktor/${selectedForm.id_form}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_purchasing",
          entries: penilaianData.entries,
          nama: currentUser?.nama || currentUser?.username,
          nik: currentUser?.nik,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyetujui form.");
      }

      setActionMessage({
        type: "success",
        text: "Persetujuan Purchasing berhasil disimpan! Notifikasi email telah dikirimkan ke SFO.",
      });

      if (json.data) {
        setPenilaianData(json.data);
      }
      await loadForms();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Gagal melakukan persetujuan." });
    } finally {
      setApproving(false);
    }
  };

  const handleExport = async (form: FormItem, type: "excel" | "pdf") => {
    setExportingType(type);
    try {
      const meta = {
        id_form: form.id_form,
        nama_kontraktor_pekerja: form.nama_kontraktor_pekerja,
        pimpinan_kontraktor: form.pimpinan_kontraktor,
        lokasi_pekerjaan: form.lokasi_pekerjaan,
        izin_kerja_tanggal_dari: form.izin_kerja_tanggal_dari,
        izin_kerja_tanggal_sampai: form.izin_kerja_tanggal_sampai,
        tanggal: form.tanggal,
      };

      const dataToExport = form.penilaian_subkontraktor || createEmptyPenilaianSubkontraktor();

      if (type === "excel") {
        await exportPenilaianToExcel(meta, dataToExport);
      } else {
        await exportPenilaianToPdf(meta, dataToExport);
      }
    } catch (err: any) {
      alert(`Gagal mengekspor file: ${err.message || err}`);
    } finally {
      setExportingType(null);
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

      if (statusFilter === "waiting") {
        // Form yang sudah diapprove pengawas, tapi belum diapprove purchasing
        return f.approval_status.pengawas && !f.approval_status.purchasing;
      }
      if (statusFilter === "approved") {
        return f.approval_status.purchasing;
      }
      return true;
    });
  }, [forms, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = forms.length;
    const waiting = forms.filter((f) => f.approval_status.pengawas && !f.approval_status.purchasing).length;
    const approved = forms.filter((f) => f.approval_status.purchasing).length;
    return { total, waiting, approved };
  }, [forms]);

  const isCurrentPurchasingApproved = Boolean(
    penilaianData.mengetahui?.purchasing?.nama && penilaianData.mengetahui?.purchasing?.nama.trim()
  );

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
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  Penilaian Sub Kontraktor — Purchasing
                </h1>
                <p className="text-xs text-slate-500">
                  Daftar form, verifikasi otorisasi & ekspor file Excel / PDF
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-semibold">
                Role: Purchasing
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
                  Total Form Masuk
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Menunggu Otorisasi Purchasing
                </p>
                <p className="text-2xl font-black text-blue-600 mt-1">{stats.waiting}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Selesai Disetujui Purchasing
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
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50/50"
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
                  onClick={() => setStatusFilter("waiting")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "waiting"
                      ? "bg-blue-600 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Menunggu Otorisasi ({stats.waiting})
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
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm">Memuat daftar form...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Tidak ada data ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? "Coba ubah kata kunci pencarian" : "Belum ada form yang diajukan"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredForms.map((item) => {
                const days = getDaysRange(item.izin_kerja_tanggal_dari, item.izin_kerja_tanggal_sampai);
                const daysCount = days.length > 0 ? days.length : 1;
                const entriesCount = item.penilaian_subkontraktor?.entries?.length || 0;
                const isPurchasingDone = item.approval_status.purchasing;
                const isPengawasDone = item.approval_status.pengawas;

                return (
                  <div
                    key={item.id_form}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          {item.id_form}
                        </span>
                        {isPurchasingDone ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai Purchasing
                          </span>
                        ) : isPengawasDone ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" /> Siap Otorisasi
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Menunggu Pengawas
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
                            <p className="text-[11px] text-slate-400">
                              Pimpinan: {item.pimpinan_kontraktor || "-"}
                            </p>
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
                              {item.izin_kerja_tanggal_dari || "-"} s/d {item.izin_kerja_tanggal_sampai || "-"}
                            </p>
                            <p className="text-[10px] text-blue-700 font-semibold">
                              Durasi: {daysCount} Hari Kerja ({entriesCount} Laporan Inspeksi)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Approval Status Indicator */}
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-[10px]">
                        <div className="text-center flex-1">
                          <p className="text-slate-400 font-semibold">Pengawas</p>
                          <p className={`font-bold mt-0.5 ${item.approval_status.pengawas ? "text-emerald-600" : "text-amber-500"}`}>
                            {item.approval_status.pengawas ? "✓ Ok" : "Menunggu"}
                          </p>
                        </div>
                        <div className="text-slate-300">→</div>
                        <div className="text-center flex-1">
                          <p className="text-slate-400 font-semibold">Purchasing</p>
                          <p className={`font-bold mt-0.5 ${item.approval_status.purchasing ? "text-emerald-600" : "text-blue-600"}`}>
                            {item.approval_status.purchasing ? "✓ Ok" : "Menunggu"}
                          </p>
                        </div>
                        <div className="text-slate-300">→</div>
                        <div className="text-center flex-1">
                          <p className="text-slate-400 font-semibold">SFO</p>
                          <p className={`font-bold mt-0.5 ${item.approval_status.sfo ? "text-emerald-600" : "text-slate-400"}`}>
                            {item.approval_status.sfo ? "✓ Ok" : "Menunggu"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 space-y-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenForm(item)}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review & Otorisasi</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleExport(item, "excel")}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ekspor Excel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport(item, "pdf")}
                          className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-600" />
                          <span>Ekspor PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal Review & Persetujuan Purchasing */}
      {selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-4">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Verifikasi Penilaian Sub Kontraktor — {selectedForm.id_form}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md">
                    Purchasing
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
              {/* Info Banner Pengawas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">Status Pengisian Pengawas Dept:</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedForm.approval_status.pengawas
                      ? `Telah diverifikasi & disetujui resmi oleh Pengawas Dept (${penilaianData.mengetahui?.pengawasDept?.nama || penilaianData.mengetahui?.picDept?.nama || "Pengawas Dept"}).`
                      : "Form ini belum disetujui resmi oleh Pengawas Dept."}
                  </p>
                </div>
                {selectedForm.approval_status.pengawas && (
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Disetujui Pengawas
                  </span>
                )}
              </div>

              {/* View Penilaian Section */}
              <PenilaianSubkontraktorSection
                value={penilaianData}
                setValue={setPenilaianData}
                readOnly={true}
                formId={selectedForm.id_form}
                tanggalDari={selectedForm.izin_kerja_tanggal_dari}
                tanggalSampai={selectedForm.izin_kerja_tanggal_sampai}
              />
            </div>

            {/* Modal Footer / Action Box */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExport(selectedForm, "excel")}
                  disabled={exportingType !== null}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(selectedForm, "pdf")}
                  disabled={exportingType !== null}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Ekspor PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                {!isCurrentPurchasingApproved ? (
                  <button
                    type="button"
                    onClick={handleApprovePurchasing}
                    disabled={approving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Setujui (Purchasing) & Kirim Email ke SFO</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Telah Disetujui Purchasing: {penilaianData.mengetahui?.purchasing?.nama}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
