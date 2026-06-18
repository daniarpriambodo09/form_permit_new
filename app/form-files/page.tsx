// app/form-files/page.tsx
// Halaman admin: daftar seluruh form dari 3 tabel, dengan inline PDF viewer.
// Reuse generatePermitPdf dari lib/generatePermitPdf.ts (identik dengan Download PDF di DetailModal).
"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, FileText, Flame, AlertTriangle, Filter,
  Eye, Loader2, User, LogOut, RefreshCw, ChevronRight,
  X, Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
type JenisForm = "hot-work" | "workshop" | "height-work";

interface FormRow {
  id_form: string;
  jenis_form: JenisForm;
  tanggal: string;
  tanggal_pelaksanaan?: string;
  status: string;
  pemohon: string;       // nama_kontraktor_nik / nama_pekerja_nik / petugas_ketinggian
  lokasi?: string;
}

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const JENIS_CFG: Record<JenisForm, { label: string; color: string; bg: string; icon: any }> = {
  "hot-work":    { label: "Hot Work",     color: "text-orange-700", bg: "bg-orange-100", icon: Flame },
  "workshop":    { label: "Workshop",     color: "text-blue-700",   bg: "bg-blue-100",   icon: FileText },
  "height-work": { label: "Height Work",  color: "text-purple-700", bg: "bg-purple-100", icon: AlertTriangle },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "text-slate-600", bg: "bg-slate-100" },
  submitted: { label: "Diajukan",  color: "text-blue-600",  bg: "bg-blue-100"  },
  approved:  { label: "Disetujui", color: "text-green-600", bg: "bg-green-100" },
  rejected:  { label: "Ditolak",   color: "text-red-600",   bg: "bg-red-100"   },
};

// ── Main Page ─────────────────────────────────────────────────
export default function FormFilesPage() {
  const router = useRouter();

  const [forms, setForms]         = useState<FormRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterJenis, setFilter]       = useState<"all" | JenisForm>("all");
  const [filterMonth, setFilterMonth]  = useState<string>("all"); // "all" | "01".."12"
  const [filterYear,  setFilterYear]   = useState<string>("all"); // "all" | "2024" etc.
  const [userName, setUserName]   = useState("");

  // PDF viewer state
  const [selectedForm, setSelected]     = useState<FormRow | null>(null);
  const [pdfUrl, setPdfUrl]             = useState<string | null>(null);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [pdfError, setPdfError]         = useState<string | null>(null);
  const [downloading, setDownloading]   = useState(false);
  const prevPdfUrl = useRef<string | null>(null);

  useEffect(() => {
    setUserName(sessionStorage.getItem("user_nama") || "");
    loadForms();
  }, []);

  // Cleanup blob URL ketika berubah
  useEffect(() => {
    return () => {
      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
    };
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/form-permit/api/form-files", { credentials: "include" });
      if (res.status === 401) { router.replace("/"); return; }
      const data = await res.json();
      setForms(data.data ?? []);
    } catch (err) {
      console.error("[form-files] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/form-permit/api/auth/logout", { method: "POST", credentials: "include" });
    sessionStorage.clear();
    router.push("/");
  };

  // ── Generate PDF blob dan tampilkan di iframe ──────────────
  const handleViewPdf = async (form: FormRow) => {
    setSelected(form);
    setPdfUrl(null);
    setPdfError(null);
    setPdfLoading(true);

    try {
      // 1. Ambil data lengkap form dari API
      const res = await fetch(
        `/form-permit/api/forms/${form.jenis_form}/${form.id_form}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Gagal memuat data form");
      const json = await res.json();

      // 2. Generate PDF menggunakan library yang sama dengan Download PDF
      const { jsPDF } = await import("jspdf");
      const { generatePermitPdfBlob } = await import("@/lib/generatePermitPdf");
      const blob = await generatePermitPdfBlob(json.data, form.jenis_form);

      // 3. Buat blob URL untuk iframe
      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
      const url = URL.createObjectURL(blob);
      prevPdfUrl.current = url;
      setPdfUrl(url);
    } catch (err: any) {
      console.error("[form-files] PDF error:", err);
      setPdfError(err.message || "Gagal generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Download dari blob yang sudah di-generate ─────────────
  const handleDownload = async () => {
    if (!selectedForm) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/form-permit/api/forms/${selectedForm.jenis_form}/${selectedForm.id_form}`,
        { credentials: "include" }
      );
      const json = await res.json();
      const { generatePermitPdf } = await import("@/lib/generatePermitPdf");
      await generatePermitPdf(json.data, selectedForm.jenis_form);
    } catch (err: any) {
      alert("Gagal download PDF: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // Daftar tahun unik dari data (otomatis, tidak hardcode)
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    forms.forEach(f => {
      if (f.tanggal) years.add(new Date(f.tanggal).getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [forms]);

  // Data setelah semua filter diterapkan
  const filtered = useMemo(() => {
    return forms.filter(f => {
      if (filterJenis !== "all" && f.jenis_form !== filterJenis) return false;
      if (filterMonth !== "all") {
        const mm = f.tanggal
          ? String(new Date(f.tanggal).getMonth() + 1).padStart(2, "0")
          : null;
        if (mm !== filterMonth) return false;
      }
      if (filterYear !== "all") {
        const yyyy = f.tanggal ? new Date(f.tanggal).getFullYear().toString() : null;
        if (yyyy !== filterYear) return false;
      }
      return true;
    });
  }, [forms, filterJenis, filterMonth, filterYear]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/home" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Home className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Daftar File Form</h1>
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
              <button onClick={loadForms} disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh">
                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600
                           hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Filter */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          {/* Baris 1: Jenis Form (buttons) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Jenis Form:</span>
            {(["all", "hot-work", "workshop", "height-work"] as const).map((k) => {
              const labels: Record<string, string> = {
                all: "Semua", "hot-work": "Hot Work", workshop: "Workshop", "height-work": "Height Work",
              };
              return (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterJenis === k
                      ? "bg-orange-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {labels[k]}
                </button>
              );
            })}
          </div>

          {/* Baris 2: Bulan + Tahun (dropdowns) + count */}
          <div className="flex items-center gap-4 flex-wrap mt-3">
            {/* Bulan */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Bulan:</span>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="text-xs font-medium bg-slate-100 text-slate-700 border-0 rounded-lg
                           px-3 py-1.5 pr-7 cursor-pointer focus:ring-2 focus:ring-orange-400
                           focus:outline-none appearance-none
                           bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b7280%22><path fill-rule=%22evenodd%22 d=%22M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z%22 clip-rule=%22evenodd%22/></svg>')]
                           bg-no-repeat bg-[right_0.5rem_center] bg-[length:1rem]">
                <option value="all">Semua Bulan</option>
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>

            {/* Tahun */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Tahun:</span>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="text-xs font-medium bg-slate-100 text-slate-700 border-0 rounded-lg
                           px-3 py-1.5 pr-7 cursor-pointer focus:ring-2 focus:ring-orange-400
                           focus:outline-none appearance-none
                           bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b7280%22><path fill-rule=%22evenodd%22 d=%22M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z%22 clip-rule=%22evenodd%22/></svg>')]
                           bg-no-repeat bg-[right_0.5rem_center] bg-[length:1rem]">
                <option value="all">Semua Tahun</option>
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <span className="ml-auto text-xs text-slate-400">{filtered.length} form</span>
          </div>
        </div>

        {/* ── Split Layout ── */}
        <div className="flex flex-col lg:flex-row gap-5">

          {/* ── Tabel kiri ── */}
          <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600" />
                  <p className="text-sm text-slate-400">Memuat data…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Tidak ada form</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {filtered.map((form) => {
                    const jCfg = JENIS_CFG[form.jenis_form] ?? JENIS_CFG["hot-work"];
                    const sCfg = STATUS_CFG[form.status] ?? STATUS_CFG.submitted;
                    const Icon = jCfg.icon;
                    const isActive = selectedForm?.id_form === form.id_form;

                    return (
                      <div key={form.id_form}
                        onClick={() => handleViewPdf(form)}
                        className={`p-4 cursor-pointer transition-colors ${
                          isActive
                            ? "bg-orange-50 border-l-4 border-orange-500"
                            : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`p-1.5 rounded-lg shrink-0 ${jCfg.bg}`}>
                              <Icon className={`w-3.5 h-3.5 ${jCfg.color}`} />
                            </span>
                            <span className="text-sm font-bold text-slate-800 font-mono truncate">
                              {form.id_form}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${sCfg.bg} ${sCfg.color}`}>
                            {sCfg.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 text-xs text-slate-500 mb-2">
                          <span className={`font-medium ${jCfg.color}`}>{jCfg.label}</span>
                          <span>{fmtDate(form.tanggal)}</span>
                        </div>

                        <p className="text-xs text-slate-600 truncate mb-2">
                          {form.pemohon || "-"}
                        </p>

                        <div className={`flex items-center gap-1 text-xs font-semibold ${
                          isActive ? "text-orange-600" : "text-slate-400"
                        }`}>
                          <Eye className="w-3 h-3" />
                          <span>{isActive ? "Sedang ditampilkan" : "Klik untuk lihat PDF"}</span>
                          {!isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── PDF Viewer kanan ── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-[76px]"
              style={{ height: "calc(100vh - 110px)" }}>

              {/* Toolbar PDF viewer */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedForm ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-slate-800 font-mono truncate">
                        {selectedForm.id_form}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JENIS_CFG[selectedForm.jenis_form]?.bg} ${JENIS_CFG[selectedForm.jenis_form]?.color}`}>
                        {JENIS_CFG[selectedForm.jenis_form]?.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Pilih form untuk melihat PDF</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedForm && pdfUrl && (
                    <button onClick={handleDownload} disabled={downloading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700
                                 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg transition-colors">
                      {downloading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>
                        : <><Download className="w-3.5 h-3.5" /> Download</>
                      }
                    </button>
                  )}
                  {selectedForm && (
                    <button onClick={() => { setSelected(null); setPdfUrl(null); setPdfError(null); }}
                      className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Tutup">
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Konten PDF */}
              <div className="h-[calc(100%-53px)] flex items-center justify-center bg-slate-100">
                {!selectedForm && (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-semibold">Belum ada form dipilih</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Klik salah satu form di daftar kiri untuk menampilkan PDF-nya di sini.
                    </p>
                  </div>
                )}

                {selectedForm && pdfLoading && (
                  <div className="text-center p-8">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-semibold">Generating PDF…</p>
                    <p className="text-slate-400 text-sm mt-1">Mohon tunggu sebentar</p>
                  </div>
                )}

                {selectedForm && pdfError && !pdfLoading && (
                  <div className="text-center p-8 max-w-sm">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <X className="w-7 h-7 text-red-500" />
                    </div>
                    <p className="text-red-600 font-semibold">Gagal Memuat PDF</p>
                    <p className="text-slate-500 text-sm mt-1 mb-4">{pdfError}</p>
                    <button onClick={() => handleViewPdf(selectedForm)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors">
                      Coba Lagi
                    </button>
                  </div>
                )}

                {selectedForm && pdfUrl && !pdfLoading && (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title={`PDF ${selectedForm.id_form}`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}