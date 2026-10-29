// app/pengawas/scaffolding/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  ShieldCheck,
  Search,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  X,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  Check,
  ZoomIn,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  CheckCheck,
  ChevronRight,
  User,
  HardHat,
  Layers,
  ClipboardCheck,
  Info,
  Wrench,
} from "lucide-react";

export interface ScaffoldingItem {
  no: number;
  bagian: string;
  kondisi_standar: string;
  kondisi: "standart" | "tidak_standart" | "";
  komentar: string;
}

export interface KetentuanItem {
  no: number;
  ketentuan: string;
  prosedur: "ya" | "tidak" | "";
  komentar: string;
}

const DEFAULT_SCAFFOLDING_ITEMS: ScaffoldingItem[] = [
  { no: 1, bagian: "OPEN FRAME", kondisi_standar: "TIDAK BENGKOK / KEROPOS, PIN PENGUNCI ADA", kondisi: "", komentar: "" },
  { no: 2, bagian: "HORIZONTAL FRAME", kondisi_standar: "TIDAK BENGKOK / KEROPOS", kondisi: "", komentar: "" },
  { no: 3, bagian: "HORIZONTAL PLATE", kondisi_standar: "TERPASANG KUAT SEBAGAI PELATARAN KERJA", kondisi: "", komentar: "" },
  { no: 4, bagian: "CROSS BRACE", kondisi_standar: "TERPASANG KUAT, TIDAK BENGKOK & TERKUNCI", kondisi: "", komentar: "" },
  { no: 5, bagian: "JACK BASE / U-HEAD", kondisi_standar: "TERPASANG KUAT SEBAGAI LEVELING", kondisi: "", komentar: "" },
  { no: 6, bagian: "JOINT PIN", kondisi_standar: "TERPASANG TIDAK KENDOR", kondisi: "", komentar: "" },
  { no: 7, bagian: "STAIR FRAME", kondisi_standar: "TERPASANG KUAT DILENGKAPI HANDRAIL", kondisi: "", komentar: "" },
  { no: 8, bagian: "BASE PLATE", kondisi_standar: "TERPASANG KUAT DENGAN KONDISI RATA", kondisi: "", komentar: "" },
  { no: 9, bagian: "HORIZONTAL PIPE", kondisi_standar: "TERPASANG KUAT DIATAS JACK BASE", kondisi: "", komentar: "" },
  { no: 10, bagian: "ANGLE PIPE SUPPORT", kondisi_standar: "TERPASANG KUAT TIDAK BENGKOK / KEROPOS (PEMASANGAN MAKSIMAL UNTUK 4 TRAP SCAFFOLDING DAN TIDAK DIPERLUKAN BILA SUDAH MEMAKAI WALL TEE)", kondisi: "", komentar: "" },
  { no: 11, bagian: "HANDRAIL", kondisi_standar: "TERPASANG KUAT DENGAN TINGGI Min. 90 Cm.", kondisi: "", komentar: "" },
  { no: 12, bagian: "KLEM PIPA", kondisi_standar: "TERPASANG KUAT/SAMBUNGAN PIPA Min.3 KLEM", kondisi: "", komentar: "" },
  { no: 13, bagian: "PELATARAN KERJA", kondisi_standar: "TERPASANG KUAT DENGAN LEBAR Min. 40 Cm.", kondisi: "", komentar: "" },
  { no: 14, bagian: "KONDISI TANAH DASAR", kondisi_standar: "KONDISI TANAH RATA TIDAK MUDAH AMBLAS", kondisi: "", komentar: "" },
  { no: 15, bagian: "TOE BOARD", kondisi_standar: "TERPASANG KELILING KETINGGIAN Min. 20 Cm.", kondisi: "", komentar: "" },
  { no: 16, bagian: "WALL TEE", kondisi_standar: "TERPASANG 3 TRAP VERTICAL DAN HORIZONTAL", kondisi: "", komentar: "" },
  { no: 17, bagian: "OPENING", kondisi_standar: "TERPASANG PIPA HORIZONTAL DAN SUDUT/SIKU DI KEDUA SISINYA, PENGAMAN DIATAS OPENING DGN. PAPAN ATAU SAFETY NET DILAPISI PLASTIK.", kondisi: "", komentar: "" },
];

const DEFAULT_KETENTUAN_LAINNYA: KetentuanItem[] = [
  { no: 1, ketentuan: "Akses dan tangga aman serta mudah dilalui", prosedur: "", komentar: "" },
  { no: 2, ketentuan: "Tanda peringatan terpasang dan area sekitar diberi demarkasi / batas pengaman", prosedur: "", komentar: "" },
  { no: 3, ketentuan: "Jaring pengaman (safety net) dipasang jika diperlukan", prosedur: "", komentar: "" },
];

interface HeightWorkItem {
  id_form: string;
  tanggal: string;
  tanggal_pelaksanaan: string;
  lokasi: string;
  deskripsi_pekerjaan: string;
  nama_pengawas_kontraktor: string;
  nama_kontraktor: string;
  spv_terkait: string;
  id_ijin_kerja: string;
  form_status: string;
  perlu_scaffolding: boolean;
  inspection_id?: number;
  nama_inspektor?: string;
  tanggal_inspeksi?: string;
  tipe_perancah?: string;
  inspection_status: string;
  current_stage: number;
  spv_approved: boolean;
  spv_approved_by?: string;
  spv_approved_at?: string;
  sfo_approved: boolean;
  sfo_approved_by?: string;
  sfo_approved_at?: string;
  kontraktor_approved: boolean;
  kontraktor_approved_by?: string;
  kontraktor_approved_at?: string;
  pengawas_nama?: string;
  pengawas_submitted_at?: string;
  catatan_reject?: string;
  items?: any;
  ketentuan_lainnya?: any;
}

export default function InspeksiScaffoldingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<HeightWorkItem[]>([]);
  const [selectedForm, setSelectedForm] = useState<HeightWorkItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");

  // State checksheet
  const [items, setItems] = useState<ScaffoldingItem[]>(DEFAULT_SCAFFOLDING_ITEMS);
  const [ketentuan, setKetentuan] = useState<KetentuanItem[]>(DEFAULT_KETENTUAN_LAINNYA);
  const [namaInspektor, setNamaInspektor] = useState("");
  const [tanggalInspeksi, setTanggalInspeksi] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [tipePerancah, setTipePerancah] = useState("Frame Scaffolding");

  // Actions & UI state
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showInlineDiagram, setShowInlineDiagram] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        setCurrentUser(data.user);
        loadForms(data.user);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const loadForms = async (userOverride?: any) => {
    try {
      const res = await fetch("/api/inspeksi-scaffolding", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const list: HeightWorkItem[] = json.data || [];
        setForms(list);
        if (list.length > 0) {
          const activeUser = userOverride || currentUser;
          const currentSelected = selectedForm
            ? list.find((item) => item.id_form === selectedForm.id_form) || list[0]
            : list[0];
          handleSelectForm(currentSelected, activeUser);
        }
      }
    } catch (e) {
      console.error("Gagal memuat form:", e);
    }
  };

  const handleSelectForm = (f: HeightWorkItem, userOverride?: any) => {
    const activeUser = userOverride || currentUser;
    setSelectedForm(f);
    setFeedback(null);
    setNamaInspektor(f.nama_inspektor || activeUser?.nama || activeUser?.username || "");
    setTanggalInspeksi(f.tanggal_inspeksi ? f.tanggal_inspeksi.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setLokasi(f.lokasi || "");
    setTipePerancah(f.tipe_perancah || "Frame Scaffolding");

    if (f.items && Array.isArray(f.items) && f.items.length > 0) {
      setItems(f.items);
    } else {
      setItems(DEFAULT_SCAFFOLDING_ITEMS);
    }

    if (f.ketentuan_lainnya && Array.isArray(f.ketentuan_lainnya) && f.ketentuan_lainnya.length > 0) {
      setKetentuan(f.ketentuan_lainnya);
    } else {
      setKetentuan(DEFAULT_KETENTUAN_LAINNYA);
    }
  };

  const handleItemKondisiChange = (index: number, val: "standart" | "tidak_standart") => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], kondisi: val };
      return copy;
    });
  };

  const handleItemKomentarChange = (index: number, val: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], komentar: val };
      return copy;
    });
  };

  const handleKetentuanProsedurChange = (index: number, val: "ya" | "tidak") => {
    setKetentuan((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], prosedur: val };
      return copy;
    });
  };

  const handleKetentuanKomentarChange = (index: number, val: string) => {
    setKetentuan((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], komentar: val };
      return copy;
    });
  };

  // Quick fill: Isi semua sebagai standart
  const handleMarkAllStandard = () => {
    setItems((prev) => prev.map((it) => ({ ...it, kondisi: "standart" })));
    setKetentuan((prev) => prev.map((kt) => ({ ...kt, prosedur: "ya" })));
  };

  // Simpan draft atau submit oleh Pengawas
  const handleSaveInspection = async (isSubmit: boolean) => {
    if (!selectedForm) return;
    if (isSubmit) {
      const unselected = items.some((it) => !it.kondisi);
      if (unselected) {
        setFeedback({
          type: "error",
          message: "Harap tentukan kondisi (Standart / Tidak Standart) pada seluruh 17 bagian scaffolding sebelum mengirimkan pengajuan.",
        });
        return;
      }
      const unselectedKetentuan = ketentuan.some((kt) => !kt.prosedur);
      if (unselectedKetentuan) {
        setFeedback({
          type: "error",
          message: "Harap tentukan kepatuhan prosedur (Ya / Tidak) pada semua ketentuan lainnya sebelum mengirimkan pengajuan.",
        });
        return;
      }
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/inspeksi-scaffolding/${selectedForm.id_form}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nama_inspektor: namaInspektor,
          tanggal_inspeksi: tanggalInspeksi,
          lokasi,
          tipe_perancah: tipePerancah,
          items,
          ketentuan_lainnya: ketentuan,
          isSubmit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan inspeksi");
      setFeedback({ type: "success", message: data.message });
      await loadForms();
      if (data.data) {
        setSelectedForm((prev) => (prev ? { ...prev, ...data.data, inspection_status: data.data.status } : null));
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Approval (SPV -> SFO -> Kontraktor)
  const handleApprove = async () => {
    if (!selectedForm) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/inspeksi-scaffolding/${selectedForm.id_form}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyetujui inspeksi");
      setFeedback({ type: "success", message: data.message });
      await loadForms();
      if (data.data) {
        setSelectedForm((prev) => (prev ? { ...prev, ...data.data, inspection_status: data.data.status } : null));
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Reject
  const handleReject = async () => {
    if (!selectedForm) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/inspeksi-scaffolding/${selectedForm.id_form}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reject", catatan: rejectNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menolak inspeksi");
      setShowRejectModal(false);
      setRejectNote("");
      setFeedback({ type: "success", message: data.message });
      await loadForms();
      if (data.data) {
        setSelectedForm((prev) => (prev ? { ...prev, ...data.data, inspection_status: data.data.status } : null));
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Statistik Ringkasan Form
  const summaryStats = useMemo(() => {
    const total = forms.length;
    const needCheck = forms.filter(
      (f) => !f.inspection_status || f.inspection_status === "menunggu_inspeksi" || f.inspection_status === "draft" || f.inspection_status === "rejected"
    ).length;
    const inApproval = forms.filter((f) => f.inspection_status === "submitted").length;
    const approved = forms.filter((f) => f.inspection_status === "approved").length;
    return { total, needCheck, inApproval, approved };
  }, [forms]);

  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        f.id_form.toLowerCase().includes(q) ||
        (f.id_ijin_kerja && f.id_ijin_kerja.toLowerCase().includes(q)) ||
        (f.nama_pengawas_kontraktor && f.nama_pengawas_kontraktor.toLowerCase().includes(q)) ||
        (f.nama_kontraktor && f.nama_kontraktor.toLowerCase().includes(q)) ||
        (f.lokasi && f.lokasi.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (statusFilter === "pending") {
        return (
          !f.inspection_status ||
          f.inspection_status === "menunggu_inspeksi" ||
          f.inspection_status === "draft" ||
          f.inspection_status === "submitted" ||
          f.inspection_status === "rejected"
        );
      }
      if (statusFilter === "approved") {
        return f.inspection_status === "approved";
      }
      return true;
    });
  }, [forms, searchQuery, statusFilter]);

  const canApprove = useMemo(() => {
    if (!selectedForm || !currentUser) return false;
    const stage = selectedForm.current_stage || 1;
    const status = selectedForm.inspection_status;
    if (status !== "submitted") return false;

    if (currentUser.role === "admin") return true;
    if (stage === 1 && currentUser.role === "spv") return true;
    if (stage === 2 && (currentUser.role === "sfo" || currentUser.role === "admin_k3")) return true;
    if (stage === 3 && currentUser.role === "kontraktor") return true;
    return false;
  }, [selectedForm, currentUser]);

  const canEditChecksheet = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "pengawas") {
      return (
        !selectedForm?.inspection_status ||
        selectedForm.inspection_status === "menunggu_inspeksi" ||
        selectedForm.inspection_status === "draft" ||
        selectedForm.inspection_status === "rejected"
      );
    }
    return false;
  }, [currentUser, selectedForm]);

  // Statistik kelengkapan item terisi
  const completedItemCount = useMemo(() => items.filter((it) => it.kondisi !== "").length, [items]);
  const standardItemCount = useMemo(() => items.filter((it) => it.kondisi === "standart").length, [items]);
  const nonStandardItemCount = useMemo(() => items.filter((it) => it.kondisi === "tidak_standart").length, [items]);
  const completedKetentuanCount = useMemo(() => ketentuan.filter((kt) => kt.prosedur !== "").length, [ketentuan]);
  const totalCompletionPercent = Math.round(((completedItemCount + completedKetentuanCount) / (17 + 3)) * 100);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 text-orange-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Memuat data inspeksi scaffolding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col font-sans">
      <Sidebar />

      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300 min-h-screen flex flex-col">
        {/* ═════════════════════════════════════════════════════════════════
            TOP HEADER BAR
        ═════════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-xs">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    Inspeksi & Sertifikasi Scaffolding
                  </h1>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
                    Form Ketinggian Eksternal
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block truncate mt-0.5">
                  Pemeriksaan teknis kelayakan 17 komponen perancah & verifikasi berjenjang sebelum pekerjaan ketinggian dimulai
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {currentUser && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-slate-700">{currentUser.nama || currentUser.username}</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                    {currentUser.role}
                  </span>
                </div>
              )}
              <button
                onClick={() => loadForms()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                title="Segarkan data formulir"
              >
                <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>
            </div>
          </div>
        </header>

        {/* ═════════════════════════════════════════════════════════════════
            KPI SUMMARY BAR (4 CARDS)
        ═════════════════════════════════════════════════════════════════ */}
        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center justify-between gap-2 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700" />
              <div className="min-w-0 pl-1">
                <p className="text-[11px] font-bold text-slate-500 truncate">Total Izin Ketinggian</p>
                <p className="text-xl font-black text-slate-900 mt-0.5 leading-tight">{summaryStats.total}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Perlu scaffolding</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-orange-200/90 p-3.5 shadow-2xs flex items-center justify-between gap-2 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
              <div className="min-w-0 pl-1">
                <p className="text-[11px] font-bold text-orange-700 truncate">Perlu Inspeksi / Draft</p>
                <p className="text-xl font-black text-orange-600 mt-0.5 leading-tight">{summaryStats.needCheck}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Cek Pengawas Dept</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-amber-200/90 p-3.5 shadow-2xs flex items-center justify-between gap-2 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
              <div className="min-w-0 pl-1">
                <p className="text-[11px] font-bold text-amber-700 truncate">Proses Approval</p>
                <p className="text-xl font-black text-amber-600 mt-0.5 leading-tight">{summaryStats.inApproval}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">SPV / SFO / Vendor</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200/90 p-3.5 shadow-2xs flex items-center justify-between gap-2 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <div className="min-w-0 pl-1">
                <p className="text-[11px] font-bold text-emerald-700 truncate">Tersertifikasi Aman</p>
                <p className="text-xl font-black text-emerald-600 mt-0.5 leading-tight">{summaryStats.approved}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Selesai 4 tahap</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* FEEDBACK ALERT */}
        {feedback && (
          <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-3">
            <div
              className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm font-medium border shadow-2xs ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-rose-50 text-rose-900 border-rose-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{feedback.message}</div>
              <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            MAIN TWO-COLUMN WORKSPACE
        ═════════════════════════════════════════════════════════════════ */}
        <main className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-4 flex-1 flex flex-col lg:flex-row gap-4 items-start">
          {/* ───────────────────────────────────────────────────────────────
              KOLOM KIRI: DAFTAR PEKERJAAN KETINGGIAN
          ─────────────────────────────────────────────────────────────── */}
          <section className="w-full lg:w-[255px] xl:w-[290px] shrink-0 flex flex-col gap-2.5 lg:sticky lg:top-20">
            <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
              {/* Header Strip */}
              <div className="bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <HardHat className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="text-xs font-bold text-white whitespace-nowrap">
                    Daftar Izin Kerja
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-400/30 whitespace-nowrap shrink-0">
                  {filteredForms.length} Form
                </span>
              </div>

              <div className="p-2.5 space-y-2">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari ID / Kontraktor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-6 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/70 text-slate-800 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`py-1 px-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                      statusFilter === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 font-medium hover:text-slate-900"
                    }`}
                  >
                    <span>Semua</span>
                    <span className="text-[10px] opacity-75">({summaryStats.total})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("pending")}
                    className={`py-1 px-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                      statusFilter === "pending"
                        ? "bg-amber-500 text-white shadow-2xs font-bold"
                        : "text-slate-600 font-medium hover:text-slate-900"
                    }`}
                  >
                    <span>Proses</span>
                    <span className="text-[10px] opacity-85">({summaryStats.needCheck + summaryStats.inApproval})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("approved")}
                    className={`py-1 px-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                      statusFilter === "approved"
                        ? "bg-emerald-600 text-white shadow-2xs font-bold"
                        : "text-slate-600 font-medium hover:text-slate-900"
                    }`}
                  >
                    <span>Selesai</span>
                    <span className="text-[10px] opacity-85">({summaryStats.approved})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List Cards */}
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
              {filteredForms.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs space-y-1.5">
                  <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">Tidak ada form ditemukan</p>
                  <p className="text-[11px] leading-relaxed">
                    Tidak ada perizinan ketinggian yang sesuai filter.
                  </p>
                </div>
              ) : (
                filteredForms.map((f) => {
                  const isSelected = selectedForm?.id_form === f.id_form;
                  const st = f.inspection_status;
                  let badge = {
                    text: "Menunggu Cek",
                    cls: "bg-slate-100 text-slate-700 border-slate-200 font-semibold",
                    stripe: "bg-slate-400",
                  };
                  if (st === "draft") {
                    badge = {
                      text: "Draft",
                      cls: "bg-sky-50 text-sky-700 border-sky-200 font-semibold",
                      stripe: "bg-sky-500",
                    };
                  } else if (st === "submitted") {
                    badge = {
                      text: `Tahap ${(f.current_stage || 1) + 1}/4`,
                      cls: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
                      stripe: "bg-amber-500",
                    };
                  } else if (st === "approved") {
                    badge = {
                      text: "Disetujui",
                      cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
                      stripe: "bg-emerald-500",
                    };
                  } else if (st === "rejected") {
                    badge = {
                      text: "Revisi",
                      cls: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
                      stripe: "bg-rose-500",
                    };
                  }

                  const stageDoneCount =
                    (st && st !== "menunggu_inspeksi" && st !== "draft" ? 1 : 0) +
                    (f.spv_approved ? 1 : 0) +
                    (f.sfo_approved ? 1 : 0) +
                    (f.kontraktor_approved ? 1 : 0);

                  return (
                    <div
                      key={f.id_form}
                      onClick={() => handleSelectForm(f)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative text-left overflow-hidden ${
                        isSelected
                          ? "bg-orange-50/40 border-orange-500 shadow-xs ring-1 ring-orange-500/25"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      {/* Left Accent Stripe */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isSelected ? "bg-orange-500" : badge.stripe
                        }`}
                      />

                      <div className="pl-1.5 space-y-1.5">
                        {/* Row 1: ID Form & Status Badge */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                            {f.id_form}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${badge.cls}`}
                          >
                            {badge.text}
                          </span>
                        </div>

                        {/* Row 2: Contractor Name & Parent Permit Badge */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {f.nama_kontraktor || f.nama_pengawas_kontraktor || "Subkontraktor"}
                            </span>
                          </div>
                          {f.id_ijin_kerja && (
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 whitespace-nowrap shrink-0">
                              {f.id_ijin_kerja}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Location & Date */}
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{f.lokasi || "-"}</span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{f.tanggal_pelaksanaan ? f.tanggal_pelaksanaan.slice(0, 10) : "-"}</span>
                          </span>
                        </div>

                        {/* Row 4: Mini Progress Stepper Bar (4 Stages) */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="flex items-center gap-1 flex-1">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-1 flex-1 rounded-full ${
                                  step <= stageDoneCount
                                    ? "bg-emerald-500"
                                    : st === "submitted" && step === stageDoneCount + 1
                                    ? "bg-amber-400"
                                    : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                            {stageDoneCount}/4
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────────
              KOLOM KANAN: CHECKSHEET & DIAGRAM TEKNIS
          ─────────────────────────────────────────────────────────────── */}
          <section className="w-full flex-1 min-w-0 flex flex-col gap-3.5">
            {!selectedForm ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
                Pilih salah satu izin ketinggian di kolom kiri untuk melihat atau mengisi lembar inspeksi scaffolding.
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* ═══════════════════════════════════════════════════════════
                    1. EXECUTIVE DOCUMENT HEADER & STEPPER CARD
                ═══════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  {/* Dark Industrial Banner: 2 Clean Rows so Title Never Wraps into 4 Lines */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-5 py-3.5 border-b border-slate-700 space-y-2">
                    {/* Top Row: Meta Badges on Left + Diagram Buttons on Right */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-orange-300 bg-orange-500/20 border border-orange-400/30 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {selectedForm.id_form}
                        </span>
                        <span className="text-xs text-slate-300 whitespace-nowrap">
                          Izin Induk:{" "}
                          <strong className="font-mono text-white">{selectedForm.id_ijin_kerja || "Eksternal"}</strong>
                        </span>
                        {selectedForm.nama_kontraktor && (
                          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap">
                            <span className="text-slate-500">•</span>
                            <span>
                              Pelaksana: <strong className="text-white">{selectedForm.nama_kontraktor}</strong>
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowInlineDiagram((v) => !v)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all border border-slate-600 cursor-pointer whitespace-nowrap"
                        >
                          {showInlineDiagram ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                              <span>Tutup Diagram</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                              <span>Lihat Diagram</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowImageModal(true)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                        >
                          <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                          <span>Zoom (1–17)</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Full-Width Document Title */}
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                      Lembar Checklist & Sertifikasi Kelayakan Scaffolding
                    </h2>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* 4 Metadata Fields: 2x2 Grid on Laptop (2xl: 4 cols) so Text Never Truncates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-2.5">
                      <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                            Nama Inspektor
                          </label>
                          {canEditChecksheet ? (
                            <input
                              type="text"
                              value={namaInspektor}
                              onChange={(e) => setNamaInspektor(e.target.value)}
                              placeholder="Nama Pengawas"
                              className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          ) : (
                            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                              {namaInspektor || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                            Tanggal Inspeksi
                          </label>
                          {canEditChecksheet ? (
                            <input
                              type="date"
                              value={tanggalInspeksi}
                              onChange={(e) => setTanggalInspeksi(e.target.value)}
                              className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          ) : (
                            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                              {tanggalInspeksi || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                            Lokasi Pemasangan
                          </label>
                          {canEditChecksheet ? (
                            <input
                              type="text"
                              value={lokasi}
                              onChange={(e) => setLokasi(e.target.value)}
                              placeholder="Area / Gedung"
                              className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          ) : (
                            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                              {lokasi || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                            Tipe Perancah
                          </label>
                          {canEditChecksheet ? (
                            <input
                              type="text"
                              value={tipePerancah}
                              onChange={(e) => setTipePerancah(e.target.value)}
                              placeholder="Frame Scaffolding"
                              className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          ) : (
                            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                              {tipePerancah || "Frame Scaffolding"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stepper Approval Berjenjang: 2x2 Grid on Laptop, 4 Cols on Wide Screen */}
                    <div className="pt-3.5 border-t border-slate-200/80">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">
                            Alur Verifikasi & Otorisasi Sertifikasi Scaffolding
                          </span>
                        </div>
                        {selectedForm.catatan_reject && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Catatan Revisi: {selectedForm.catatan_reject}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                        {/* Tahap 1: Pengawas Dept */}
                        {(() => {
                          const isDone =
                            Boolean(selectedForm.inspection_status) &&
                            selectedForm.inspection_status !== "menunggu_inspeksi" &&
                            selectedForm.inspection_status !== "draft" &&
                            selectedForm.inspection_status !== "rejected";
                          return (
                            <div
                              className={`p-3 rounded-xl border transition-all overflow-hidden ${
                                isDone
                                  ? "bg-emerald-50/50 border-emerald-300"
                                  : "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                  <span
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                      isDone ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                                    }`}
                                  >
                                    {isDone ? "✓" : "1"}
                                  </span>
                                  <span>Tahap 1</span>
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${
                                    isDone
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {isDone ? "Selesai" : "Pengisian"}
                                </span>
                              </div>
                              <p className="font-bold text-xs text-slate-900 truncate">Pengawas Dept</p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {selectedForm.nama_inspektor || selectedForm.pengawas_nama || namaInspektor || "Pemeriksa Lapangan"}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Tahap 2: SPV Terkait */}
                        {(() => {
                          const isDone = Boolean(selectedForm.spv_approved);
                          const isWaiting = selectedForm.current_stage === 1 && selectedForm.inspection_status === "submitted";
                          return (
                            <div
                              className={`p-3 rounded-xl border transition-all overflow-hidden ${
                                isDone
                                  ? "bg-emerald-50/50 border-emerald-300"
                                  : isWaiting
                                  ? "bg-amber-50/70 border-amber-400 ring-1 ring-amber-400/30"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                  <span
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                      isDone
                                        ? "bg-emerald-600 text-white"
                                        : isWaiting
                                        ? "bg-amber-500 text-white"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {isDone ? "✓" : "2"}
                                  </span>
                                  <span>Tahap 2</span>
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${
                                    isDone
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : isWaiting
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : "bg-slate-200/70 text-slate-600"
                                  }`}
                                >
                                  {isDone ? "Disetujui" : isWaiting ? "Menunggu" : "Pending"}
                                </span>
                              </div>
                              <p className="font-bold text-xs text-slate-900 truncate">SPV Terkait</p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {selectedForm.spv_approved_by || selectedForm.spv_terkait || "Supervisor Area"}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Tahap 3: SFO / Admin K3 */}
                        {(() => {
                          const isDone = Boolean(selectedForm.sfo_approved);
                          const isWaiting = selectedForm.current_stage === 2 && selectedForm.inspection_status === "submitted";
                          return (
                            <div
                              className={`p-3 rounded-xl border transition-all overflow-hidden ${
                                isDone
                                  ? "bg-emerald-50/50 border-emerald-300"
                                  : isWaiting
                                  ? "bg-amber-50/70 border-amber-400 ring-1 ring-amber-400/30"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                  <span
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                      isDone
                                        ? "bg-emerald-600 text-white"
                                        : isWaiting
                                        ? "bg-amber-500 text-white"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {isDone ? "✓" : "3"}
                                  </span>
                                  <span>Tahap 3</span>
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${
                                    isDone
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : isWaiting
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : "bg-slate-200/70 text-slate-600"
                                  }`}
                                >
                                  {isDone ? "Disetujui" : isWaiting ? "Menunggu" : "Pending"}
                                </span>
                              </div>
                              <p className="font-bold text-xs text-slate-900 truncate">SFO / Admin K3</p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {selectedForm.sfo_approved_by || "Otorisasi K3 Lapangan"}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Tahap 4: Kontraktor Pelaksana */}
                        {(() => {
                          const isDone = Boolean(selectedForm.kontraktor_approved);
                          const isWaiting = selectedForm.current_stage === 3 && selectedForm.inspection_status === "submitted";
                          return (
                            <div
                              className={`p-3 rounded-xl border transition-all overflow-hidden ${
                                isDone
                                  ? "bg-emerald-50/50 border-emerald-300"
                                  : isWaiting
                                  ? "bg-amber-50/70 border-amber-400 ring-1 ring-amber-400/30"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                  <span
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                      isDone
                                        ? "bg-emerald-600 text-white"
                                        : isWaiting
                                        ? "bg-amber-500 text-white"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {isDone ? "✓" : "4"}
                                  </span>
                                  <span>Tahap 4</span>
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${
                                    isDone
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : isWaiting
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : "bg-slate-200/70 text-slate-600"
                                  }`}
                                >
                                  {isDone ? "Disetujui" : isWaiting ? "Menunggu" : "Pending"}
                                </span>
                              </div>
                              <p className="font-bold text-xs text-slate-900 truncate">Kontraktor Pelaksana</p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {selectedForm.kontraktor_approved_by || selectedForm.nama_kontraktor || "Vendor"}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    2. COLLAPSIBLE INLINE TECHNICAL DIAGRAM PANEL
                ═══════════════════════════════════════════════════════════ */}
                {showInlineDiagram && (
                  <div className="bg-white rounded-xl border border-orange-200 overflow-hidden shadow-2xs">
                    <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-4 py-2.5 border-b border-orange-200/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-[11px] font-extrabold">
                          17
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-orange-950">
                            Diagram Panduan Komponen Perancah (Nomor 1 – 17)
                          </h3>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImageModal(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-orange-100/60 text-orange-900 border border-orange-300 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-orange-600" />
                        <span>Layar Penuh</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-slate-50/60 space-y-3">
                      <div
                        onClick={() => setShowImageModal(true)}
                        className="w-full bg-white rounded-xl border border-slate-200 p-3 shadow-2xs cursor-zoom-in group overflow-hidden"
                      >
                        <img
                          src="/images/scaffolding-diagram.png"
                          alt="Diagram Teknis Komponen Scaffolding 1-17"
                          className="w-full max-h-60 object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-200"
                        />
                      </div>

                      {/* Quick Legend Grid of 17 Components */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 text-[11px]">
                        {items.map((it) => {
                          const isStd = it.kondisi === "standart";
                          const isNotStd = it.kondisi === "tidak_standart";
                          return (
                            <div
                              key={it.no}
                              className={`px-2 py-1.5 rounded-lg border flex items-center gap-1.5 min-w-0 ${
                                isStd
                                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                  : isNotStd
                                  ? "bg-rose-50/70 border-rose-200 text-rose-900"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-4.5 h-4.5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                                  isStd
                                    ? "bg-emerald-600 text-white"
                                    : isNotStd
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {it.no}
                              </span>
                              <span className="font-semibold truncate text-[10px]">{it.bagian}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    3. TABEL 1: 17 ITEM BAGIAN SCAFFOLDING
                ═══════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  {/* Table Header Bar */}
                  <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        1. Komponen & Kondisi Scaffolding (17 Bagian)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 whitespace-nowrap">
                        {completedItemCount}/17 Terisi
                      </span>
                      {standardItemCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                          ✓ {standardItemCount} Standart
                        </span>
                      )}
                      {nonStandardItemCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                          ✕ {nonStandardItemCount} Tidak Std
                        </span>
                      )}
                    </div>

                    {canEditChecksheet && (
                      <button
                        type="button"
                        onClick={handleMarkAllStandard}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                        title="Tandai seluruh 17 item sebagai Standart dan semua ketentuan Ya"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Tandai Semua Standart</span>
                      </button>
                    )}
                  </div>

                  {/* Table Element */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wide">
                          <th className="py-2.5 px-2.5 w-10 text-center">No</th>
                          <th className="py-2.5 px-3 w-36 xl:w-44">Bagian Scaffolding</th>
                          <th className="py-2.5 px-3">Standar Kelayakan K3</th>
                          <th className="py-2.5 px-2.5 w-44 text-center">Kondisi Lapangan</th>
                          <th className="py-2.5 px-3 w-44 xl:w-56">Komentar / Temuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {items.map((it, idx) => {
                          const isStandard = it.kondisi === "standart";
                          const isNotStandard = it.kondisi === "tidak_standart";

                          return (
                            <tr
                              key={it.no}
                              className={`transition-colors ${
                                isNotStandard
                                  ? "bg-rose-50/30 hover:bg-rose-50/50"
                                  : isStandard
                                  ? "hover:bg-emerald-50/20"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="py-2.5 px-2.5 text-center">
                                <span
                                  className={`inline-flex w-6 h-6 rounded-md font-mono font-bold text-[11px] items-center justify-center ${
                                    isStandard
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : isNotStandard
                                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {it.no}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 text-xs">
                                {it.bagian}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-600 leading-snug">
                                {it.kondisi_standar}
                              </td>
                              <td className="py-2.5 px-2.5">
                                <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                                  <button
                                    type="button"
                                    disabled={!canEditChecksheet}
                                    onClick={() => handleItemKondisiChange(idx, "standart")}
                                    className={`flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-md font-bold text-[10px] transition-all whitespace-nowrap ${
                                      isStandard
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                                    } ${canEditChecksheet ? "cursor-pointer" : "cursor-default"}`}
                                  >
                                    <Check className="w-3 h-3 shrink-0" />
                                    <span>Standart</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canEditChecksheet}
                                    onClick={() => handleItemKondisiChange(idx, "tidak_standart")}
                                    className={`flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-md font-bold text-[10px] transition-all whitespace-nowrap ${
                                      isNotStandard
                                        ? "bg-rose-600 text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                                    } ${canEditChecksheet ? "cursor-pointer" : "cursor-default"}`}
                                  >
                                    <X className="w-3 h-3 shrink-0" />
                                    <span>Tidak Std</span>
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                {canEditChecksheet ? (
                                  <input
                                    type="text"
                                    value={it.komentar || ""}
                                    onChange={(e) => handleItemKomentarChange(idx, e.target.value)}
                                    placeholder={isNotStandard ? "Wajib isi temuan..." : "Catatan (opsional)"}
                                    className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${
                                      isNotStandard
                                        ? "border-rose-300 bg-rose-50/50 text-rose-900 placeholder:text-rose-400"
                                        : "border-slate-200 bg-white text-slate-800"
                                    }`}
                                  />
                                ) : (
                                  <span
                                    className={`block text-xs px-2.5 py-1.5 rounded-lg ${
                                      it.komentar
                                        ? isNotStandard
                                          ? "bg-rose-50 text-rose-800 font-semibold border border-rose-200"
                                          : "bg-slate-100 text-slate-800 font-medium"
                                        : "text-slate-400 italic"
                                    }`}
                                  >
                                    {it.komentar || "—"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    4. TABEL 2: KETENTUAN KESELAMATAN LAINNYA
                ═══════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                      2. Ketentuan Keselamatan Lainnya (Area & Demarkasi)
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                      {completedKetentuanCount} / 3 Terisi
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-wide">
                          <th className="py-3 px-3.5 w-14 text-center">No</th>
                          <th className="py-3 px-3.5">Ketentuan Pemeriksaan Prosedur</th>
                          <th className="py-3 px-3.5 w-52 text-center">Sesuai Prosedur</th>
                          <th className="py-3 px-3.5 w-60">Komentar / Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {ketentuan.map((kt, idx) => {
                          const isYa = kt.prosedur === "ya";
                          const isTidak = kt.prosedur === "tidak";

                          return (
                            <tr key={kt.no} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3.5 text-center">
                                <span
                                  className={`inline-flex w-7 h-7 rounded-lg font-mono font-extrabold text-xs items-center justify-center ${
                                    isYa
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : isTidak
                                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {kt.no}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 font-bold text-slate-800 leading-relaxed">
                                {kt.ketentuan}
                              </td>
                              <td className="py-3 px-3.5">
                                <div className="flex items-center justify-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                                  <button
                                    type="button"
                                    disabled={!canEditChecksheet}
                                    onClick={() => handleKetentuanProsedurChange(idx, "ya")}
                                    className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-md font-bold text-[11px] transition-all ${
                                      isYa
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                                    } ${canEditChecksheet ? "cursor-pointer" : "cursor-default"}`}
                                  >
                                    <Check className="w-3 h-3 shrink-0" />
                                    <span>Ya</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canEditChecksheet}
                                    onClick={() => handleKetentuanProsedurChange(idx, "tidak")}
                                    className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-md font-bold text-[11px] transition-all ${
                                      isTidak
                                        ? "bg-rose-600 text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                                    } ${canEditChecksheet ? "cursor-pointer" : "cursor-default"}`}
                                  >
                                    <X className="w-3 h-3 shrink-0" />
                                    <span>Tidak</span>
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5">
                                {canEditChecksheet ? (
                                  <input
                                    type="text"
                                    value={kt.komentar || ""}
                                    onChange={(e) => handleKetentuanKomentarChange(idx, e.target.value)}
                                    placeholder={isTidak ? "Alasan ketidaksesuaian..." : "Catatan (opsional)"}
                                    className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${
                                      isTidak
                                        ? "border-rose-300 bg-rose-50/50 text-rose-900"
                                        : "border-slate-200 bg-white text-slate-800"
                                    }`}
                                  />
                                ) : (
                                  <span
                                    className={`block text-xs px-2.5 py-1.5 rounded-lg ${
                                      kt.komentar
                                        ? "bg-slate-100 text-slate-800 font-medium"
                                        : "text-slate-400 italic"
                                    }`}
                                  >
                                    {kt.komentar || "—"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    5. PERINGATAN K3 & PANEL AKSI VERIFIKASI (FOOTER)
                ═══════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  {/* Ketentuan K3 Banner */}
                  <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 text-amber-950 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-extrabold text-amber-900 uppercase tracking-wider text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Ketentuan Baku Penggunaan Scaffolding (K3):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900/90 leading-relaxed pl-1 font-medium">
                      <li>Sebelum inspeksi dituntaskan dan dinyatakan aman oleh Pengawas & SPV, scaffolding dilarang keras digunakan.</li>
                      <li>Dilarang merusak, memotong, atau melepas komponen scaffolding yang sudah terpasang dengan dalih apapun.</li>
                      <li>Inspeksi wajib diisi saat awal perancah didirikan dan diperiksa ulang secara berkala setiap awal minggu.</li>
                    </ol>
                  </div>

                  {/* Action & Progress Footer Bar (In normal document flow so it NEVER blocks table rows) */}
                  <div className="p-4 sm:px-5 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-initial">
                        <div className="flex items-center justify-between sm:justify-start gap-2 text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">Kelengkapan Checklist:</span>
                          <span
                            className={`font-extrabold ${
                              totalCompletionPercent === 100 ? "text-emerald-600" : "text-orange-600"
                            }`}
                          >
                            {totalCompletionPercent}% Terisi ({completedItemCount + completedKetentuanCount}/20)
                          </span>
                        </div>
                        <div className="w-full sm:w-56 h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full transition-all duration-300 ${
                              totalCompletionPercent === 100 ? "bg-emerald-500" : "bg-orange-500"
                            }`}
                            style={{ width: `${totalCompletionPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
                      {/* Action Pengawas: Simpan & Kirim */}
                      {canEditChecksheet && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveInspection(false)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer"
                          >
                            <Save className="w-4 h-4 text-slate-500" />
                            <span>Simpan Draft</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInspection(true)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-all cursor-pointer"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            <span>Kirim ke Approval (SPV)</span>
                          </button>
                        </>
                      )}

                      {/* Action Approver (SPV / SFO / Kontraktor) */}
                      {canApprove && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowRejectModal(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all cursor-pointer"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            <span>Tolak / Minta Revisi</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-4 h-4" />
                            )}
                            <span>Setujui Hasil Inspeksi</span>
                          </button>
                        </>
                      )}

                      {/* Status Info Read-Only */}
                      {!canEditChecksheet && !canApprove && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
                          <Info className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            {selectedForm.inspection_status === "approved"
                              ? "Sertifikasi scaffolding telah disetujui penuh."
                              : selectedForm.inspection_status === "submitted"
                              ? `Menunggu verifikasi Tahap ${(selectedForm.current_stage || 1) + 1}.`
                              : "Mode baca (Read-Only)."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* MODAL ZOOM GAMBAR DIAGRAM SCAFFOLDING */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Diagram Teknis Komponen Scaffolding (Nomor 1 – 17)</h3>
                <p className="text-[11px] text-slate-400">
                  Gunakan nomor teknis pada diagram sebagai referensi pemeriksaan tabel komponen
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
              <img
                src="/images/scaffolding-diagram.png"
                alt="Detail Scaffolding Diagram"
                className="max-w-full max-h-[76vh] object-contain rounded-lg shadow-xs bg-white p-4 border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK (REJECT) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Tolak Hasil Inspeksi Scaffolding</h3>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tuliskan alasan penolakan atau perbaikan teknis yang harus dilakukan sebelum izin perancah dapat disetujui:
            </p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Contoh: Cross brace trap ke-2 belum terkunci kuat..."
              className="w-full p-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading || !rejectNote.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? "Memproses..." : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
