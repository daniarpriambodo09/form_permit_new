// app/my-forms/[jenisForm]/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ApprovalQRCard from "@/components/ApprovalQRCard";
import SignaturePad from "@/components/SignaturePad";
import JsaViewer from "@/components/JsaViewer";
import PenilaianSubkontraktorSection, {
  createEmptyPenilaianSubkontraktor,
  type PenilaianSubkontraktorData,
} from "@/components/PenilaianSubkontraktorSection";
import EditModal from "@/components/EditModal";
import {
  ArrowLeft, Download, Edit3, XCircle, RefreshCw, FileText,
  Clock, CheckCircle2, AlertCircle, Check, X, Shield, ShieldCheck,
  Calendar, CalendarClock, CalendarCheck, MapPin, Building2, User,
  Paperclip, Layers, Eye, ZoomIn, Loader2, ChevronRight, Phone,
  Wrench, Flame, AlertTriangle, ClipboardList, ClipboardCheck,
  HardHat, Lock, Trash2
} from "lucide-react";

interface PageProps {
  params: Promise<{
    jenisForm: string;
    id: string;
  }>;
}

// ── Types ─────────────────────────────────────────────────────
type FormType = "hot-work" | "height-work" | "workshop" | "general-permit";

interface LinkedJobForm {
  id_form: string;
  status: string;
  tanggal: string;
  jenis: string;
}

interface LinkedJobForms {
  hotWork: LinkedJobForm | null;
  heightWork: LinkedJobForm | null;
  workshop: LinkedJobForm | null;
}

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (t?: string | null) => {
  if (!t) return "-";
  return String(t).slice(0, 5);
};

const isTruthy = (v: any): boolean => v === true || v === "t" || v === "true";

function resolveFileUrl(url: string): string {
  if (!url) return url;
  if (typeof window !== "undefined") {
    return url.startsWith("http") ? url : `${window.location.origin}${url}`;
  }
  return url;
}

const jenisMeta: Record<string, { label: string; icon: any; color: string; badge: string; border: string }> = {
  "hot-work": {
    label: "Hot Work Permit (Kerja Panas)",
    icon: Flame,
    color: "text-orange-600",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    border: "border-orange-500",
  },
  "workshop": {
    label: "Workshop Permit",
    icon: Wrench,
    color: "text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    border: "border-blue-500",
  },
  "height-work": {
    label: "Kerja Ketinggian (Height Work)",
    icon: AlertTriangle,
    color: "text-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    border: "border-purple-500",
  },
  "general-permit": {
    label: "Ijin Kerja Eksternal",
    icon: Layers,
    color: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    border: "border-emerald-500",
  },
  "ijin-kerja-eksternal": {
    label: "Ijin Kerja Eksternal",
    icon: Layers,
    color: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    border: "border-emerald-500",
  },
};

const statusMeta: Record<string, { label: string; icon: any; bg: string; text: string; border: string }> = {
  draft: {
    label: "Draft",
    icon: FileText,
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
  },
  submitted: {
    label: "Menunggu Approval",
    icon: Clock,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-300",
  },
  approved: {
    label: "Disetujui Penuh",
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
  rejected: {
    label: "Ditolak",
    icon: XCircle,
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-300",
  },
};

// Checklist definitions for Hot Work
const HOT_WORK_CHECKLIST_ITEMS = [
  ["1", "Equipment/Tools kondisi baik", "kondisi_tools_baik"],
  ["2", "Alat pemadam api (APAR, Hydrant)", "tersedia_apar_hydrant"],
  ["3", "Sensor Smoke Detector dinon-aktifkan", "sensor_smoke_detector_non_aktif"],
  ["4", "APD lengkap dipakai", "apd_lengkap"],
  ["5", "Lantai mudah terbakar dibasahi / ditutup perisai metal", "lantai_sudah_dibasahi"],
  ["6", "Cairan mudah terbakar diproteksi dengan tutup / perisai metal", "cairan_mudah_tebakar_tertutup"],
  ["7", "Lindungi conveyor, instalasi kabel, & alat listrik dengan perisai metal", "lindungi_conveyor_dll"],
] as const;

const HOT_WORK_RUANG_TERTUTUP_ITEMS = [
  ["8.1", "Peralatan dibersihkan dari semua bahan mudah terbakar", "alat_telah_bersih"],
  ["8.2", "Uap menyala di ruangan tertutup dibuang dari ruangan", "uap_menyala_telah_dibuang"],
] as const;

const HOT_WORK_DINDING_ITEMS = [
  ["9.1", "Pekerjaan pada dinding/langit-langit konstruksi tidak mudah terbakar", "kerja_pada_dinding_lagit"],
  ["9.2", "Bahan mudah terbakar dipindahkan dari dinding yang bersebrangan", "bahan_mudah_terbakar_dipindahkan_dari_dinding"],
] as const;

const HOT_WORK_TAIL_ITEMS = [
  ["10", "Fire watch memastikan area aman selama dan 60 menit setelahnya", "fire_watch_memastikan_area_aman"],
  ["11", "Fire watch terlatih pemakaian APAR & fire alarm", "firwatch_terlatih"],
] as const;

const WORKSHOP_CHECKLIST_ITEMS = [
  ["equipment", "Equipment / tool / mesin berfungsi dengan baik", "alat_mesin_berfungsi"],
  ["apar", "APAR tersedia dekat area kerja", "apar_tersedia"],
  ["flammableNearby", "Tidak ada cairan mudah terbakar dekat area kerja", "tidak_ada_cairan_mudah_terbakar"],
  ["b3Stored", "B3 & cairan mudah terbakar disimpan di lemari khusus", "b3_tersimpan_khusus"],
  ["cleanFloor", "Lantai bersih dari benda mudah terbakar", "lantai_bersih"],
  ["metalShield", "Lantai ditutup dengan perisai metal penampung bunga api", "perisai_metal_tersedia"],
  ["completePpe", "Memakai APD lengkap sesuai SOP", "apd_lengkap"],
  ["cleanMaterial", "Membersihkan sisa material, serpihan logam, sampah", "area_dibersihkan"],
  ["returnEquipment", "Mengembalikan alat kerja ke tempat semula", "alat_dikembalikan"],
  ["disposeWaste", "Membuang sampah sesuai jenisnya (organik, anorganik, B3)", "sampah_dipilah"],
  ["firewatchSafety", "Fire watch memastikan kondisi aman", "fire_watch_standby"],
  ["firewatchTraining", "Fire watch terlatih APAR", "fire_watch_terlatih"],
] as const;

// ── Reusable Micro-Components ─────────────────────────────────
const SectionCard = ({ title, icon: Icon, children, badge }: { title: string; icon?: any; children: React.ReactNode; badge?: string }) => (
  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-orange-600" />}
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
      </div>
      {badge && (
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
          {badge}
        </span>
      )}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const Field = ({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) => (
  <div className="space-y-0.5">
    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
    <p className={`text-xs font-semibold text-slate-800 break-words ${mono ? "font-mono" : ""}`}>
      {value ?? "-"}
    </p>
  </div>
);

const BoolBadges = ({ items }: { items: { label: string; active: boolean }[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((item, idx) => (
      <span
        key={idx}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
          item.active
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
            : "bg-slate-50/80 text-slate-400 border-slate-200 line-through opacity-60"
        }`}
      >
        {item.active ? <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
        <span>{item.label}</span>
      </span>
    ))}
  </div>
);

// ── Main Page Component ───────────────────────────────────────
export default function FormDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const rawFormType = resolvedParams.jenisForm;
  const formType = (rawFormType === "ijin-kerja-eksternal" ? "general-permit" : rawFormType) as FormType;
  const formId = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "lampiran" | "persetujuan">("detail");
  const [activeLampiran, setActiveLampiran] = useState<string>("linked-permits");

  // State untuk modal & actions
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null);

  // Modal Aktual Tanggal Selesai Kerja (Khusus General Permit)
  const [actualDateModal, setActualDateModal] = useState({ isOpen: false, dateValue: "", submitting: false });

  // Linked Job Forms (untuk General Permit)
  const [linkedJobForms, setLinkedJobForms] = useState<LinkedJobForms | null>(null);

  // Penilaian Subkontraktor State
  const [penilaianData, setPenilaianData] = useState<PenilaianSubkontraktorData>(createEmptyPenilaianSubkontraktor());

  // Load Form Data
  const loadFormData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/forms/${formType}/${formId}`);
      if (!res.ok) {
        throw new Error("Form tidak ditemukan atau gagal memuat data");
      }
      const json = await res.json();
      let detail = json.data;

      // Jika job-form memiliki parent general permit, ambil data lampiran induknya
      if (detail?.id_ijin_kerja) {
        try {
          const parentRes = await fetch(`/api/forms/general-permit/${detail.id_ijin_kerja}`);
          if (parentRes.ok) {
            const parentJson = await parentRes.json();
            const parentData = parentJson.data;
            detail = {
              ...detail,
              perlu_jsa: detail.perlu_jsa ?? parentData?.perlu_jsa,
              jsa_data: detail.jsa_data ?? parentData?.jsa_data,
              jsa_file_url: detail.jsa_file_url ?? parentData?.jsa_file_url,
              safety_induction: parentData?.safety_induction,
              penilaian_subkontraktor: detail.penilaian_subkontraktor ?? parentData?.penilaian_subkontraktor,
              _parent_id_form: parentData?.id_form,
            };
          }
        } catch (e) {
          console.warn("Could not load parent permit:", e);
        }
      }

      setData(detail);

      // Inisialisasi data penilaian subkontraktor jika ada
      const rawPenilaian = detail?.penilaian_subkontraktor || detail?.penilaian_subkontraktor_data;
      if (rawPenilaian) {
        try {
          const parsed = typeof rawPenilaian === "string"
            ? JSON.parse(rawPenilaian)
            : rawPenilaian;
          setPenilaianData(parsed);
        } catch {}
      }

      // Jika general-permit, muat linked job forms
      if (formType === "general-permit") {
        try {
          const jfRes = await fetch(`/api/forms/general-permit/${formId}/job-forms`);
          if (jfRes.ok) {
            const jfJson = await jfRes.json();
            setLinkedJobForms(jfJson.data ?? null);
          }
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat detail form");
    } finally {
      setLoading(false);
    }
  }, [formType, formId]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  // ── Helper Parsing untuk Lisensi, Tenaga Kerja Subkont, dan Peralatan ──
  const parsedLicenseFiles: Array<{ name?: string; url: string }> = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.license_files)) {
      return data.license_files.filter((x: any) => x && typeof x.url === "string");
    }
    if (typeof data.license_files === "string") {
      try {
        const parsed = JSON.parse(data.license_files);
        if (Array.isArray(parsed)) {
          return parsed.filter((x: any) => x && typeof x.url === "string");
        }
      } catch {}
    }
    if (data.license_sertifikasi) {
      return [{ name: "Berkas Lisensi / Sertifikasi K3", url: data.license_sertifikasi }];
    }
    return [];
  }, [data]);


  const parsedAlatLainnya = useMemo(() => {
    if (!data?.alat_lainnya) return [];
    try {
      if (typeof data.alat_lainnya === "string" && data.alat_lainnya.trim().startsWith("[")) {
        const parsed = JSON.parse(data.alat_lainnya);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [data]);

  // ── Daftar Jenis Lampiran & Form Terkait untuk Tab Dokumen (Model Split Side seperti form-files) ──
  const lampiranItems = useMemo(() => {
    if (!data) return [];
    const p = data;
    const items = [];

    // 1. Linked Job Permits (Izin Kerja Khusus)
    if (formType === "general-permit") {
      const linkedCount = [linkedJobForms?.hotWork, linkedJobForms?.heightWork, linkedJobForms?.workshop].filter(Boolean).length;
      items.push({
        id: "linked-permits",
        title: "Izin Kerja Khusus",
        subtitle: "Hot Work, Ketinggian, Workshop",
        icon: Layers,
        badge: linkedCount > 0 ? `${linkedCount} Terhubung` : "3 Form",
        badgeColor: linkedCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
      });
    } else if (p.id_ijin_kerja) {
      items.push({
        id: "parent-permit",
        title: "Izin Kerja Induk",
        subtitle: `Ref: ${p.id_ijin_kerja}`,
        icon: Layers,
        badge: "Form Induk",
        badgeColor: "bg-blue-100 text-blue-800",
      });
    }

    // 2. Job Safety Analysis (JSA)
    items.push({
      id: "jsa",
      title: "Job Safety Analysis (JSA)",
      subtitle: p.perlu_jsa ? (p.jsa_file_url ? "Dokumen Terlampir" : "Analisis K3") : "Ketentuan JSA",
      icon: ClipboardList,
      badge: p.perlu_jsa ? (p.jsa_file_url ? "File JSA" : "Tabel JSA") : "Tidak Wajib",
      badgeColor: p.perlu_jsa ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500",
    });

    // 3. Safety Induction Security (Hanya untuk Ijin Kerja Eksternal / General Permit)
    if (formType === "general-permit") {
      const isSiVerified = Boolean(p.security_approved || p.safety_induction?.status === "submitted" || p.safety_induction?.status === "verified");
      items.push({
        id: "safety-induction",
        title: "Safety Induction Security",
        subtitle: "Verifikasi Pos Security & Pekerja",
        icon: Shield,
        badge: isSiVerified ? "Terverifikasi" : "Menunggu",
        badgeColor: isSiVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
      });
    }

    // 4. Penilaian K3 Subkontraktor (Hanya untuk Ijin Kerja Eksternal / General Permit)
    if (formType === "general-permit") {
      const entriesCount = (penilaianData?.entries || []).filter((e) =>
        e && Object.values(e.items || {}).some((v) => v !== "")
      ).length;
      const hasMengetahui = Boolean(
        penilaianData?.mengetahui?.sfo?.nama ||
        penilaianData?.mengetahui?.purchasing?.nama ||
        penilaianData?.mengetahui?.pengawasDept?.nama ||
        penilaianData?.mengetahui?.picDept?.nama
      );
      items.push({
        id: "penilaian",
        title: "Penilaian Subkontraktor",
        subtitle: "Evaluasi Lapangan & Barcode",
        icon: ClipboardCheck,
        badge: entriesCount > 0 ? `${entriesCount} Terisi` : hasMengetahui ? "Mengetahui" : "Form K3",
        badgeColor: entriesCount > 0 ? "bg-emerald-100 text-emerald-800" : hasMengetahui ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800",
      });
    }

    // 5. Lisensi & Sertifikasi jika ada
    if (parsedLicenseFiles.length > 0) {
      items.push({
        id: "license",
        title: "Lisensi & Sertifikasi K3",
        subtitle: `${parsedLicenseFiles.length} Berkas Kualifikasi`,
        icon: FileText,
        badge: `${parsedLicenseFiles.length} File`,
        badgeColor: "bg-purple-100 text-purple-800",
      });
    }

    return items;
  }, [formType, data, linkedJobForms, penilaianData, parsedLicenseFiles]);

  // Sinkronisasi activeLampiran jika list berubah
  useEffect(() => {
    if (lampiranItems.length > 0) {
      if (!lampiranItems.some((it) => it.id === activeLampiran)) {
        setActiveLampiran(lampiranItems[0].id);
      }
    }
  }, [lampiranItems, activeLampiran]);


  // Download PDF
  const handleDownloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { generatePermitPdf } = await import("@/lib/generatePermitPdf");
      await generatePermitPdf(data, formType);
    } catch (err: any) {
      console.error("[PDF Error]", err);
      alert("Gagal mengunduh PDF: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setPdfLoading(false);
    }
  };

  // Batalkan Form
  const handleCancelForm = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/my-forms?id=${formId}&jenis=${formType}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membatalkan form");
      }
      router.push("/my-forms");
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan form");
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  // Submit Aktual Tanggal Selesai Kerja
  const handleSaveActualDate = async () => {
    if (!actualDateModal.dateValue) {
      alert("Pilih tanggal aktual selesai kerja terlebih dahulu");
      return;
    }
    setActualDateModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await fetch(`/api/forms/general-permit/${formId}/actual-date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_tanggal_kerja: actualDateModal.dateValue }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan aktual tanggal kerja");
      }
      setActualDateModal({ isOpen: false, dateValue: "", submitting: false });
      await loadFormData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan");
      setActualDateModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300 min-h-screen flex flex-col items-center justify-center p-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4 animate-bounce">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Memuat Rincian Form...</h3>
          <p className="text-xs text-slate-400 mt-1">Mengambil data perizinan dari server</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300 min-h-screen flex flex-col items-center justify-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Gagal Memuat Detail Form</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md text-center">{error || "Data form tidak ditemukan."}</p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/my-forms"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
            </Link>
            <button
              onClick={loadFormData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700"
            >
              <RefreshCw className="w-4 h-4" /> Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const p = data;
  const meta = jenisMeta[formType] || jenisMeta["hot-work"];
  const PermitIcon = meta.icon;
  const cfg = statusMeta[p.status] || statusMeta.submitted;
  const isEksternal = formType === "general-permit" || p.tipe_perusahaan === "eksternal";
  const canCancel = p.status === "submitted" || p.status === "draft";
  const canEdit = p.status === "draft" || p.status === "rejected";

  // Stages approval
  const stages = formType === "general-permit"
    ? [
        { key: "spv_approved", label: "SPV", by: p.spv_approved_by, at: p.spv_approved_at },
        { key: "sfo_approved", label: "SFO", by: p.sfo_approved_by, at: p.sfo_approved_at },
        { key: "pga_approved", label: "MGR / PGA", by: p.pga_approved_by, at: p.pga_approved_at },
        { key: "security_approved", label: "Security", by: p.security_approved_by, at: p.security_approved_at },
      ]
    : [
        { key: "spv_approved", label: "SPV", by: p.spv_approved_by, at: p.spv_approved_at },
        { key: "admin_k3_approved", label: "Admin K3", by: p.admin_k3_approved_by, at: p.admin_k3_approved_at },
        { key: "sfo_approved", label: "SFO", by: p.sfo_approved_by, at: p.sfo_approved_at },
        { key: "mr_pga_approved", label: "SMR / PGA", by: p.mr_pga_approved_by, at: p.mr_pga_approved_at },
      ];



  return (
    <div className="min-h-screen bg-slate-100/60 font-sans text-slate-800 w-full max-w-full overflow-x-hidden">
      <Sidebar />

      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300 min-h-screen flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* ── Sticky Top Bar ── */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            
            {/* Left: Back button & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/my-forms"
                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl transition-colors shrink-0"
                title="Kembali ke Daftar Form"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight truncate">
                    {p.id_form}
                  </h1>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>{cfg.label}</span>
                  </span>
                </div>
                {p.no_registrasi && (
                  <p className="text-[11px] text-slate-400 font-mono">No. Reg: {p.no_registrasi}</p>
                )}
              </div>
            </div>

            {/* Right: Actions Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Tombol Download PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95"
                title="Unduh Berkas Surat Izin Kerja Resmi (PDF)"
              >
                {pdfLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Unduh PDF</span>
              </button>

              {/* Tombol Perbaiki / Edit jika ditolak/draft */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Perbaiki</span>
                </button>
              )}

              {/* Tombol Batalkan */}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
                  title="Batalkan Pengajuan Ini"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Batalkan</span>
                </button>
              )}

              {/* Tombol Refresh */}
              <button
                type="button"
                onClick={loadFormData}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-colors"
                title="Segarkan Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

          </div>
        </header>

        {/* ── Main Content Body ── */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 flex-1 min-w-0 max-w-full overflow-x-hidden">

          {/* ── Hero Status & Approval Flow Banner ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-xs`}>
                  <PermitIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">{meta.label}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600">
                      {isEksternal ? "Subkontraktor Eksternal" : "Karyawan Internal"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dibuat pada: <strong>{formatDate(p.tanggal)}</strong> • Lokasi: <strong>{p.lokasi || p.lokasi_pekerjaan || "-"}</strong>
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  <cfg.icon className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-xs font-bold">{cfg.label}</span>
                </div>
              </div>
            </div>

            {/* Catatan Penolakan Alert jika Ditolak */}
            {p.catatan_reject && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Catatan Penolakan / Revisi:</h4>
                  <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">{p.catatan_reject}</p>
                </div>
              </div>
            )}

            {/* Stepper Alur Approval Lengkap */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                  Alur Persetujuan Resmi (Approval Flow)
                </span>
                <span className="text-[11px] text-slate-400">
                  {p.approved_by && `Terakhir diproses oleh: ${p.approved_by}`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {/* Kontraktor TTD (jika form eksternal) */}
                {isEksternal && (
                  <div
                    className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                      p.kontraktor_approved || p.kontraktor_signature_url
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                        : "bg-amber-50/70 border-amber-300 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pemohon</span>
                      {p.kontraktor_approved || p.kontraktor_signature_url ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold truncate">Kontraktor (TTD)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {p.kontraktor_approved || p.kontraktor_signature_url ? "Sudah TTD" : "Belum TTD"}
                    </p>
                  </div>
                )}

                {/* Approver Stages */}
                {stages.map((stage) => {
                  const isApproved = Boolean(p[stage.key]);
                  return (
                    <div
                      key={stage.key}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                        isApproved
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Approver</span>
                        {isApproved ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold truncate">{stage.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {isApproved ? (stage.by || "Disetujui") : "Menunggu"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aktual Tanggal Kerja Selesai (Khusus Ijin Kerja Eksternal) */}
            {formType === "general-permit" && (
              <div className="p-3 sm:p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                      Aktual Tanggal Pekerjaan Selesai
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      {p.actual_tanggal_kerja ? (
                        formatDate(p.actual_tanggal_kerja)
                      ) : (
                        <span className="text-slate-400 font-normal italic">Belum diisi (diinput setelah pekerjaan selesai)</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const raw = p.actual_tanggal_kerja
                      ? new Date(p.actual_tanggal_kerja).toISOString().split("T")[0]
                      : "";
                    setActualDateModal({ isOpen: true, dateValue: raw, submitting: false });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs active:scale-95 shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{p.actual_tanggal_kerja ? "Ubah Tanggal Selesai" : "+ Input Tanggal Selesai"}</span>
                </button>
              </div>
            )}

          </div>

          {/* ── Navigation Tabs ── */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-2">
            {[
              { id: "detail", label: "Rincian & Informasi Kerja", icon: FileText },
              { id: "lampiran", label: "Dokumen & Form Terkait", icon: Paperclip, badge: lampiranItems.length > 0 ? `${lampiranItems.length} Lampiran` : undefined },
              { id: "persetujuan", label: "Persetujuan & Tanda Tangan QR", icon: ShieldCheck },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === "detail" ? "Rincian" : tab.id === "lampiran" ? "Lampiran" : "Approval"}</span>
                  {tab.badge && (
                    <span className="hidden md:inline text-[9px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-700 font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════
              TAB 1: RINCIAN & INFORMASI PEKERJAAN
          ══════════════════════════════════════════════════════════ */}
          {activeTab === "detail" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {formType === "general-permit" ? (
                <>
                  {/* ═══ BAGIAN 1: INFORMASI KONTRAKTOR ═══ */}
                  <SectionCard title="Bagian 1: Informasi Kontraktor & Jadwal Kerja" icon={Building2} badge="Wajib">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Field label="No. Registrasi / ID Form" value={p.id_form} mono />
                      <Field label="Perusahaan / Kontraktor" value={p.nama_kontraktor_pekerja || p.nama_kontraktor || p.kontraktor || "-"} />
                      <Field label="Pimpinan Kontraktor" value={p.pimpinan_kontraktor || "-"} />
                      <Field label="Pengawas / PIC Subkont" value={p.nama_pengawas_pic_subkont || "-"} />
                      <Field label="No. Telepon Kontraktor / PIC" value={p.telepon_kontraktor || "-"} />
                      <Field label="Jumlah Tenaga Kerja" value={p.jumlah_tenaga_kerja ? `${p.jumlah_tenaga_kerja} Orang` : "-"} />
                      <Field label="Tanggal Diajukan" value={formatDate(p.tanggal || p.created_at)} />
                      <Field label="Rencana Mulai Kerja" value={formatDate(p.tgl_mulai_kerja || p.izin_kerja_tanggal_dari)} />
                      <Field label="Rencana Akhir Kerja" value={formatDate(p.tgl_akhir_kerja_rencana || p.izin_kerja_tanggal_sampai)} />
                      <Field label="Jam Kerja" value={`${formatTime(p.waktu_kerja || p.izin_kerja_dari)} – ${formatTime(p.waktu_selesai || p.izin_kerja_sampai)}`} />
                      {p.actual_tanggal_kerja && (
                        <Field label="Aktual Tanggal Selesai" value={formatDate(p.actual_tanggal_kerja)} />
                      )}
                      {p.id_ijin_kerja && <Field label="Izin Induk (Parent)" value={p.id_ijin_kerja} mono />}
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 2: SPESIFIKASI PEKERJAAN ═══ */}
                  <SectionCard title="Bagian 2: Spesifikasi Pekerjaan" icon={ClipboardList}>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Deskripsi Rinci Pekerjaan
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed whitespace-pre-wrap">
                          {p.deskripsi_pekerjaan || "Tidak ada deskripsi pekerjaan tertulis."}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Kondisi Spesifikasi Area Kerja
                        </span>
                        <BoolBadges
                          items={[
                            { label: "Area Workshop", active: isTruthy(p.spek_area_workshop) },
                            { label: "Ruang Tertutup", active: isTruthy(p.spek_ruang_tertutup) },
                            { label: "Kerja Ketinggian", active: isTruthy(p.spek_ketinggian) },
                            { label: "Tegangan Listrik Tinggi", active: isTruthy(p.spek_tegangan_tinggi) },
                            { label: "Pemakaian LOTO", active: isTruthy(p.spek_pemakaian_loto) },
                            { label: "Alat Angkat / Forklift", active: isTruthy(p.spek_forklift) },
                            { label: "Temperatur Tinggi", active: isTruthy(p.spek_temperatur_tinggi) },
                          ]}
                        />
                      </div>

                      {p.spesifikasi_lainnya && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold text-slate-800 block mb-0.5">Spesifikasi Lainnya:</span>
                          <p className="text-slate-700 whitespace-pre-wrap">{p.spesifikasi_lainnya}</p>
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 3: ALAT YANG DIPAKAI ═══ */}
                  <SectionCard title="Bagian 3: Alat yang Dipakai" icon={Wrench}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Daftar Peralatan &amp; Status Kondisi
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                        {[
                          { l: "Mesin Potong", v: p.alat_mesin_potong, cond: p.alat_mesin_potong_kondisi },
                          { l: "Mesin Las / Gerinda", v: p.alat_mesin_las_gerinda, cond: p.alat_mesin_las_gerinda_kondisi },
                          { l: "Genset", v: p.alat_genset, cond: p.alat_genset_kondisi },
                          { l: "Tabung Gas", v: p.alat_tabung_gas, cond: p.alat_tabung_gas_kondisi },
                          { l: "Tangga Listrik / AWP", v: p.alat_tangga_listrik_awp, cond: p.alat_tangga_listrik_awp_kondisi },
                          { l: "Forklift", v: p.alat_forklift, cond: p.alat_forklift_kondisi },
                          { l: "Lift Barang", v: p.alat_lift_barang, cond: p.alat_lift_barang_kondisi },
                          ...(parsedAlatLainnya.length > 0
                            ? parsedAlatLainnya.map((it: any) => ({ l: it.nama, v: true, cond: it.kondisi }))
                            : [{ l: p.alat_lainnya ? `Lainnya: ${p.alat_lainnya}` : null, v: Boolean(p.alat_lainnya), cond: p.alat_lainnya_kondisi }]),
                        ]
                          .filter((item) => item.v && item.l)
                          .map((item, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                              <span className="font-semibold text-slate-800 truncate">{item.l}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.cond?.toUpperCase() === "NG" || item.cond?.toLowerCase() === "rusak" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                                {item.cond ? item.cond.toUpperCase() : "OK"}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 4: JOB SAFETY ANALYSIS (JSA) ═══ */}
                  <SectionCard title="Bagian 4: Job Safety Analysis (JSA)" icon={ClipboardList}>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3">
                      <div>
                        <span className="font-bold text-slate-800 block">Status Dokumen JSA</span>
                        <p className="text-slate-500 mt-0.5">
                          {p.perlu_jsa
                            ? (p.jsa_file_url ? "File dokumen JSA terlampir secara digital" : "Analisis K3 / JSA terstruktur telah diisi")
                            : "Ketentuan JSA tidak diwajibkan untuk pekerjaan ini"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("lampiran");
                          setActiveLampiran("jsa");
                        }}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                      >
                        Buka JSA
                      </button>
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 5: LOKASI & PENGAWAS DEPARTEMEN ═══ */}
                  <SectionCard title="Bagian 5: Lokasi & Pengawas Departemen" icon={MapPin}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field label="Lokasi Pekerjaan (Area Genba)" value={p.lokasi_pekerjaan || p.lokasi || "-"} />
                        <Field label="Departemen Pengawas" value={p.departemen_pengawas || "-"} />
                        <Field label="Pengawas Bagian PT. JAI" value={p.pengawas_bagian || "-"} />
                        <Field label="PIC LOTO / Station LOTO" value={p.pic_loto_station_loto || "-"} />
                        <Field label="Supervisor Terkait (PJ PT. JAI)" value={p.spv_terkait_pj || p.spv_terkait || p.spv_approved_by || "-"} />
                        <Field label="NIK SPV Penanggung Jawab" value={p.nik_spv_terkait_pj || p.spv_nik || "-"} mono />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Tipe Lokasi Area Genba Spesifik
                        </span>
                        <BoolBadges
                          items={[
                            { label: "Dalam Gedung", active: isTruthy(p.lokasi_dalam_gedung) },
                            { label: "Luar Gedung", active: isTruthy(p.lokasi_luar_gedung) },
                            { label: "Luar Pagar Gedung", active: isTruthy(p.lokasi_luar_pagar_gedung) },
                            { label: "Di Atas Gedung / Rooftop", active: isTruthy(p.lokasi_di_atas_gedung) },
                          ]}
                        />
                        {p.lokasi_lainnya && (
                          <p className="text-xs text-slate-600 mt-1.5 italic">Lokasi Lainnya: {p.lokasi_lainnya}</p>
                        )}
                      </div>
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 6: KARAKTER BAHAN ═══ */}
                  <SectionCard title="Bagian 6: Karakter Bahan" icon={AlertTriangle}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Bahan / Material Berbahaya
                      </span>
                      <BoolBadges
                        items={[
                          { label: "Mudah Terbakar", active: isTruthy(p.bahan_mudah_terbakar) },
                          { label: "Mudah Meledak", active: isTruthy(p.bahan_mudah_meledak) },
                          { label: "Bahan Kimia Beracun / Iritan", active: isTruthy(p.bahan_kimia_beracun_iritan) },
                        ]}
                      />
                      {p.bahan_lainnya && (
                        <p className="text-xs text-slate-600 mt-1.5 italic">Bahan Lainnya: {p.bahan_lainnya}</p>
                      )}
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 7: POTENSI DAMPAK LK3 ═══ */}
                  <SectionCard title="Bagian 7: Potensi Dampak LK3" icon={AlertCircle}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Potensi Bahaya Teridentifikasi (15 Dampak)
                      </span>
                      <BoolBadges
                        items={[
                          { label: "Ledakan / Kebakaran", active: isTruthy(p.dampak_ledakan_kebakaran) },
                          { label: "Jatuh dari Ketinggian", active: isTruthy(p.dampak_jatuh_ketinggian) },
                          { label: "Kepala Tertimpa", active: isTruthy(p.dampak_kepala_tertimpa) },
                          { label: "Kaki Tertimpa", active: isTruthy(p.dampak_kaki_tertimpa) },
                          { label: "Tumpahan Oli / BBM / B3", active: isTruthy(p.dampak_tumpahan_oli_bbm_b3) },
                          { label: "Tersengat Listrik", active: isTruthy(p.dampak_tersengat_listrik) },
                          { label: "Terjepit Mesin", active: isTruthy(p.dampak_terjepit_mesin) },
                          { label: "Tersayat / Tertusuk", active: isTruthy(p.dampak_tersayat_tertusuk) },
                          { label: "Infeksi Pernafasan", active: isTruthy(p.dampak_infeksi_pernafasan) },
                          { label: "Iritasi Mata", active: isTruthy(p.dampak_iritasi_mata) },
                          { label: "Radiasi Sinar Las", active: isTruthy(p.dampak_radiasi_sinar_las) },
                          { label: "Iritasi Kulit", active: isTruthy(p.dampak_iritasi_kulit) },
                          { label: "Kebisingan", active: isTruthy(p.dampak_kebisingan) },
                          { label: "Keracunan Zat Kimia", active: isTruthy(p.dampak_keracunan_zat_kimia) },
                          { label: p.dampak_lainnya ? `Lainnya: ${p.dampak_lainnya}` : "Dampak Lainnya", active: Boolean(p.dampak_lainnya) },
                        ]}
                      />
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 8: APD WAJIB ═══ */}
                  <SectionCard title="Bagian 8: APD Wajib" icon={HardHat}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Alat Pelindung Diri (APD) Diwajibkan (15 Item)
                      </span>
                      <BoolBadges
                        items={[
                          { label: "Helm Safety", active: isTruthy(p.apd_helm) },
                          { label: "Safety Shoes", active: isTruthy(p.apd_safety_shoes) },
                          { label: "Sepatu Karet", active: isTruthy(p.apd_sepatu_karet) },
                          { label: "Topi Kerja", active: isTruthy(p.apd_topi_kerja) },
                          { label: "Masker Biasa", active: isTruthy(p.apd_masker) },
                          { label: "Masker Kimia / Respirator", active: isTruthy(p.apd_masker_kimia) },
                          { label: "Kacamata Biasa", active: isTruthy(p.apd_kacamata_biasa) },
                          { label: "Kacamata Las", active: isTruthy(p.apd_kacamata_las) },
                          { label: "Ear Plug / Earmuff", active: isTruthy(p.apd_ear_plug) },
                          { label: "Sarung Tangan Standard (Gloves)", active: isTruthy(p.apd_gloves) },
                          { label: "Sarung Tangan Bintil", active: isTruthy(p.apd_sarung_tangan_bintil) },
                          { label: "Sarung Tangan Listrik", active: isTruthy(p.apd_sarung_tangan_listrik) },
                          { label: "Sarung Tangan Kulit", active: isTruthy(p.apd_sarung_tangan_kulit) },
                          { label: "Full Body Harness", active: isTruthy(p.apd_full_body_harness) },
                          { label: p.apd_lainnya ? `Lainnya: ${p.apd_lainnya}` : "APD Lainnya", active: Boolean(p.apd_lainnya) },
                        ]}
                      />
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 9: UPLOAD LISENSI ═══ */}
                  <SectionCard title="Bagian 9: Lisensi & Sertifikasi Kompetensi" icon={FileText}>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3">
                      <div>
                        <span className="font-bold text-slate-800 block">Berkas Lisensi K3 Terlampir</span>
                        <p className="text-slate-500 mt-0.5">
                          {parsedLicenseFiles.length > 0
                            ? `${parsedLicenseFiles.length} berkas lisensi/sertifikasi kompetensi K3 diunggah`
                            : "Tidak ada berkas lisensi K3 dilampirkan"}
                        </p>
                      </div>
                      {parsedLicenseFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("lampiran");
                            setActiveLampiran("license");
                          }}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                        >
                          Lihat Lisensi ({parsedLicenseFiles.length})
                        </button>
                      )}
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 10: APAR ═══ */}
                  <SectionCard title="Bagian 10: Alat Pemadam Api Ringan (APAR)" icon={Flame}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Kebutuhan APAR
                      </span>
                      <BoolBadges
                        items={[
                          { label: "Dry Powder", active: isTruthy(p.apar_dry_powder) },
                          { label: "Gas Cair / CO2", active: isTruthy(p.apar_gas_cair) },
                          { label: "Tidak Perlu APAR", active: isTruthy(p.apar_tidak_perlu) },
                        ]}
                      />
                      {p.apar_lainnya && <p className="text-xs text-slate-500 mt-1.5 italic">Lainnya: {p.apar_lainnya}</p>}
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 11: PENGELOLAAN LIMBAH ═══ */}
                  <SectionCard title="Bagian 11: Pengelolaan Limbah" icon={Trash2}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Pengelolaan Limbah Hasil Kerja
                      </span>
                      <BoolBadges
                        items={[
                          { label: "Dikelola Kontraktor", active: isTruthy(p.limbah_kontraktor) },
                          { label: `Dikelola PT JAI${p.limbah_lokasi_pt ? ` (${p.limbah_lokasi_pt})` : ""}`, active: isTruthy(p.limbah_pt_jai) },
                          { label: "Dikelola Luar JAI", active: isTruthy(p.limbah_luar_jai) },
                        ]}
                      />
                      {p.limbah_lainnya && <p className="text-xs text-slate-500 mt-1.5 italic">Lainnya: {p.limbah_lainnya}</p>}
                    </div>
                  </SectionCard>

                  {/* ═══ BAGIAN 15: PERNYATAAN & PENGESAHAN PEMOHON ═══ */}
                  <SectionCard title="Bagian 15: Pernyataan & Pengesahan Pemohon" icon={ShieldCheck}>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Verifikasi Pemeriksaan Lapangan:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isTruthy(p.pernyataan_diperiksa) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          {isTruthy(p.pernyataan_diperiksa) ? "✓ Telah Diperiksa & Disetujui di Lapangan" : "Belum Diverifikasi"}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tanda Tangan Pemohon / Kontraktor
                          </span>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            Disahkan secara digital oleh: {p.pemohon || p.pimpinan_kontraktor || p.nama_pengawas_pic_subkont || p.nama_kontraktor_pekerja || "Pemohon"}
                          </p>
                        </div>
                        {p.kontraktor_signature_url ? (
                          <button
                            type="button"
                            onClick={() => setZoomImage({ src: resolveFileUrl(p.kontraktor_signature_url), title: `Tanda Tangan Pemohon — ${p.id_form}` })}
                            className="p-1 bg-white rounded-lg border border-slate-300 hover:border-orange-500 transition-colors shrink-0 shadow-2xs"
                          >
                            <img src={resolveFileUrl(p.kontraktor_signature_url)} alt="TTD Kontraktor" className="h-9 w-auto object-contain" />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            Tervalidasi Digital
                          </span>
                        )}
                      </div>
                    </div>
                  </SectionCard>

                  {/* Serah Terima Pengawas (Job Handover jika ada) */}
                  {(p.handover_pengawas_lama || p.handover_pengawas_baru) && (
                    <SectionCard title="Serah Terima Pengawas (Job Handover)" icon={User}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Pengawas Lama</span><p className="font-bold text-slate-800 mt-0.5">{p.handover_pengawas_lama || "-"}</p></div>
                        <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Pengawas Baru</span><p className="font-bold text-slate-800 mt-0.5">{p.handover_pengawas_baru || "-"}</p></div>
                        <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Tanggal Handover</span><p className="font-bold text-slate-800 mt-0.5">{formatDate(p.handover_tanggal)}</p></div>
                        <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Jam Handover</span><p className="font-bold text-slate-800 mt-0.5">{p.handover_jam || "-"}</p></div>
                      </div>
                    </SectionCard>
                  )}

                  {/* Evaluasi Housekeeping Selesai Pekerjaan jika ada */}
                  {(p.evaluasi_status || p.eval_area_bersih_rapi !== undefined) && (
                    <SectionCard title="Evaluasi Housekeeping Selesai Pekerjaan" icon={ShieldCheck} badge={p.evaluasi_status ? `Status: ${p.evaluasi_status}` : undefined}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {[
                          { label: "Area kerja telah dibersihkan & dirapikan", val: p.eval_area_bersih_rapi },
                          { label: "Sisa material & limbah telah dipilah & dibuang ke tempatnya", val: p.eval_limbah_ditangani_baik },
                          { label: "Instalasi listrik / sumber energi dipastikan aman", val: p.eval_instalasi_listrik_aman },
                          { label: "Tidak ada kerusakan pada fasilitas / properti PT JAI", val: p.eval_tdk_ada_kerusakan_property },
                          { label: "Tidak terjadi tumpahan bahan kimia / BBM di area kerja", val: p.eval_ada_tumpahan_kimia_bbm === false },
                          { label: "Tidak ada kehilangan peralatan atau properti PT JAI", val: p.eval_tdk_ada_kehilangan_property },
                        ].map((it, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <span className="text-slate-700 font-medium pr-2">{it.label}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${it.val ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {it.val ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {p.evaluasi_submitted_by && (
                        <p className="text-[11px] text-slate-500 mt-2">
                          Evaluasi disubmit oleh: <strong>{p.evaluasi_submitted_by}</strong>
                          {p.evaluasi_submitted_at && ` pada ${new Date(p.evaluasi_submitted_at).toLocaleString("id-ID")}`}
                        </p>
                      )}
                    </SectionCard>
                  )}
                </>
              ) : formType === "height-work" ? (
                <>
                  {/* ═══ HEIGHT WORK: BAGIAN 1: INFORMASI PEKERJAAN KETINGGIAN ═══ */}
                  <SectionCard title="Bagian 1: Informasi Pekerjaan di Ketinggian" icon={AlertTriangle} badge="Wajib">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Field label="No. Registrasi" value={p.no_registrasi || p.id_form} mono />
                      <Field label="Tipe Petugas" value={p.tipe_perusahaan === "eksternal" ? "Eksternal / Subkontraktor" : "Internal / PT. JAI"} />
                      <Field label="Lokasi Pekerjaan" value={p.lokasi || p.lokasi_pekerjaan || "-"} />
                      <Field label="Tanggal Diajukan" value={formatDate(p.tanggal)} />
                      <Field label="Tanggal Pelaksanaan" value={formatDate(p.tanggal_pelaksanaan)} />
                      <Field label="Waktu Pelaksanaan" value={`${formatTime(p.waktu_mulai)} – ${formatTime(p.waktu_selesai)}`} />
                      {p.tipe_perusahaan === "eksternal" ? (
                        <>
                          <Field label="Perusahaan Kontraktor" value={p.nama_kontraktor || p.kontraktor || "-"} />
                          <Field label="Pengawas Kontraktor" value={p.nama_pengawas_kontraktor || "-"} />
                          <Field label="NIK Kontraktor" value={p.kontraktor_nik || "-"} mono />
                        </>
                      ) : (
                        <>
                          <Field label="Departemen" value={p.nama_departemen || "-"} />
                          <Field label="Pengawas Departemen" value={p.nama_pengawas_departemen || "-"} />
                        </>
                      )}
                      <Field label="SPV Terkait" value={p.spv_terkait || p.spv_approved_by || "-"} />
                      <Field label="NIK SPV" value={p.spv_nik || "-"} mono />
                      {p.id_ijin_kerja && <Field label="Izin Induk (Parent)" value={p.id_ijin_kerja} mono />}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Deskripsi Rinci Pekerjaan Ketinggian
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
                        {p.deskripsi_pekerjaan || "Tidak ada rincian deskripsi pekerjaan tertulis."}
                      </p>
                    </div>
                  </SectionCard>

                  {/* ═══ HEIGHT WORK: BAGIAN 2: NAMA PETUGAS KETINGGIAN & STATUS KESEHATAN ═══ */}
                  <SectionCard title="Bagian 2: Nama Petugas Ketinggian & Status Kesehatan" icon={AlertTriangle}>
                    {(() => {
                      const petugasList = Array.from({ length: 10 }, (_, i) => i + 1)
                        .map((i) => ({
                          index: i,
                          nama: p[`nama_petugas_${i}`],
                          sehat: isTruthy(p[`petugas_${i}_sehat`]),
                          lisensi: p[`foto_lisensi_${i}`],
                        }))
                        .filter((row) => row.nama);

                      if (petugasList.length === 0) {
                        return <p className="text-xs text-slate-400 italic">Tidak ada petugas ketinggian terdaftar.</p>;
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {petugasList.map((row) => (
                            <div key={row.index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">{row.index}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{row.nama}</p>
                                <span className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${row.sehat ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                  {row.sehat ? "✓ Berbadan Sehat" : "✗ Tidak Sehat"}
                                </span>
                              </div>
                              {row.lisensi ? (
                                <button
                                  type="button"
                                  onClick={() => setZoomImage({ src: resolveFileUrl(row.lisensi), title: `Lisensi - ${row.nama}` })}
                                  className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-300 hover:border-orange-500 transition-colors shrink-0"
                                >
                                  <img src={resolveFileUrl(row.lisensi)} alt={`Lisensi ${row.nama}`} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <ZoomIn className="w-4 h-4" />
                                  </div>
                                </button>
                              ) : (
                                <div className="w-14 h-14 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 text-center leading-tight p-1 shrink-0">
                                  Tanpa Foto
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </SectionCard>

                  {/* ═══ HEIGHT WORK: BAGIAN 3: PEMINJAMAN APD ═══ */}
                  <SectionCard title="Bagian 3: Peminjaman Alat Pelindung Diri (APD)" icon={HardHat}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Field label="Kunci Pagar Tangga Listrik" value={isTruthy(p.ada_kunci_pagar) ? "Ada" : "Tidak Ada"} />
                      <Field label="Rompi Ketinggian" value={isTruthy(p.ada_rompi_ketinggian) ? "Dipinjam" : "Tidak"} />
                      {isTruthy(p.ada_rompi_ketinggian) && <Field label="Nomor Rompi" value={p.no_rompi || "-"} mono />}
                      <Field label="Jumlah Safety Helmet" value={`${p.jumlah_safety_helmet || 0} Unit`} />
                      <Field label="Jumlah Full Body Harness" value={`${p.jumlah_full_body_harness || 0} Unit`} />
                    </div>
                  </SectionCard>

                  {/* ═══ HEIGHT WORK: BAGIAN 4: KESELAMATAN KERJA KETINGGIAN ═══ */}
                  <SectionCard title="Bagian 4: Keselamatan Kerja Ketinggian" icon={ShieldCheck}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      {[
                        { l: "Area kerja diperiksa dan aman", v: p.area_diperiksa_aman },
                        { l: "Paham cara memakai APAR", v: p.paham_cara_menggunakan_alat_pemadam_kebakaran },
                        { l: "Ada pekerjaan instalasi listrik", v: p.ada_kerja_listrik },
                        { l: "Prosedur LOTO diterapkan", v: p.prosedur_loto },
                        { l: "Menutupi area bawah dengan prisai", v: p.menutupi_area_bawah_prisai },
                        { l: "Safety line / perimeter terpasang", v: p.safetyline_tersedia },
                        { l: "Alat bantu kerja dalam kondisi aman", v: p.alat_bantu_kerja_aman },
                        { l: "Menggunakan rompi saat bekerja", v: p.menggunakan_rompi },
                        { l: "Beban bawaan tidak melebihi 5 kg", v: p.beban_tidak_5kg },
                        { l: "Helm sesuai standar SOP", v: p.helm_sesuai_sop },
                        { l: "Rambu-rambu keselamatan tersedia", v: p.rambu2_tersedia },
                      ].map((item, idx) => {
                        const active = isTruthy(item.v);
                        return (
                          <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                            <span className="text-slate-700 font-medium pr-2">{item.l}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {active ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>

                  {/* ═══ HEIGHT WORK: BAGIAN 5: PENGECEKAN BODY HARNESS & LANYARD (ADMIN K3) ═══ */}
                  <SectionCard
                    title="Bagian 5: Pengecekan Body Harness & Lanyard (Admin K3)"
                    icon={Shield}
                    badge={isTruthy(p.admin_k3_approved) ? "✓ Selesai Diperiksa" : "Menunggu Admin K3"}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Helm</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700">Helm Kondisi Baik</span>
                          <span className={`font-bold ${isTruthy(p.helm_kondisi_baik) ? "text-emerald-600" : "text-rose-600"}`}>
                            {isTruthy(p.helm_kondisi_baik) ? "✓ YA" : "✗ TIDAK"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Body Harness</p>
                        {[
                          { l: "Webbing baik", v: p.webbing_kondisi_baik },
                          { l: "D-Ring baik", v: p.dring_kondisi_baik },
                          { l: "Gesper baik", v: p.gesper_kondisi_baik },
                        ].map((x, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-slate-700">{x.l}</span>
                            <span className={`font-bold ${isTruthy(x.v) ? "text-emerald-600" : "text-rose-600"}`}>
                              {isTruthy(x.v) ? "✓ YA" : "✗ TIDAK"}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lanyard</p>
                        {[
                          { l: "Absorber & Timbles", v: p.absorter_dan_timbes_kondisi_baik },
                          { l: "Snap Hook", v: p.snap_hook_kondisi_baik },
                          { l: "Rope Lanyard", v: p.rope_lanyard_kondisi_baik },
                        ].map((x, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-slate-700">{x.l}</span>
                            <span className={`font-bold ${isTruthy(x.v) ? "text-emerald-600" : "text-rose-600"}`}>
                              {isTruthy(x.v) ? "✓ YA" : "✗ TIDAK"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {p.admin_k3_approved_by && (
                      <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          Diverifikasi oleh Admin K3: <strong>{p.admin_k3_approved_by}</strong>
                          {p.admin_k3_approved_at && ` pada ${new Date(p.admin_k3_approved_at).toLocaleString("id-ID")}`}
                        </span>
                      </div>
                    )}
                  </SectionCard>

                  {/* ═══ HEIGHT WORK: BAGIAN 6: PENGESAHAN & TANDA TANGAN ═══ */}
                  {p.kontraktor_signature_url && (
                    <SectionCard title="Bagian 6: Pengesahan & Tanda Tangan Pemohon" icon={ShieldCheck}>
                      <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tanda Tangan Pemohon / Kontraktor
                          </span>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            Disahkan secara digital oleh: {p.pemohon || p.pimpinan_kontraktor || p.nama_pengawas_kontraktor || p.nama_kontraktor || "Pemohon"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setZoomImage({ src: resolveFileUrl(p.kontraktor_signature_url), title: `Tanda Tangan Pemohon — ${p.id_form}` })}
                          className="p-1 bg-white rounded-lg border border-slate-300 hover:border-orange-500 transition-colors shrink-0 shadow-2xs"
                        >
                          <img src={resolveFileUrl(p.kontraktor_signature_url)} alt="TTD Kontraktor" className="h-9 w-auto object-contain" />
                        </button>
                      </div>
                    </SectionCard>
                  )}

                  {/* ═══ HEIGHT WORK: BAGIAN 7: JSA ═══ */}
                  <SectionCard title="Bagian 7: Dokumen Job Safety Analysis (JSA)" icon={ClipboardList}>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3">
                      <div>
                        <span className="font-bold text-slate-800 block">Status Dokumen JSA</span>
                        <p className="text-slate-500 mt-0.5">
                          {p.perlu_jsa ? (p.jsa_file_url ? "File dokumen JSA terlampir secara digital" : "Analisis K3 / JSA terstruktur telah diisi") : "Ketentuan JSA tidak diwajibkan untuk pekerjaan ini"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("lampiran");
                          setActiveLampiran("jsa");
                        }}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                      >
                        Buka JSA
                      </button>
                    </div>
                  </SectionCard>

                  {/* Evaluasi Housekeeping Selesai Pekerjaan khusus Eksternal jika ada */}
                  {isEksternal && (p.evaluasi_status || p.eval_area_bersih_rapi !== undefined) && (
                    <SectionCard title="Evaluasi Housekeeping Selesai Pekerjaan" icon={ShieldCheck} badge={p.evaluasi_status ? `Status: ${p.evaluasi_status}` : undefined}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {[
                          { label: "Area kerja telah dibersihkan & dirapikan", val: p.eval_area_bersih_rapi },
                          { label: "Sisa material & limbah telah dipilah & dibuang ke tempatnya", val: p.eval_limbah_ditangani_baik },
                          { label: "Instalasi listrik / sumber energi dipastikan aman", val: p.eval_instalasi_listrik_aman },
                          { label: "Tidak ada kerusakan pada fasilitas / properti PT JAI", val: p.eval_tdk_ada_kerusakan_property },
                          { label: "Tidak terjadi tumpahan bahan kimia / BBM di area kerja", val: p.eval_ada_tumpahan_kimia_bbm === false },
                          { label: "Tidak ada kehilangan peralatan atau properti PT JAI", val: p.eval_tdk_ada_kehilangan_property },
                        ].map((it, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <span className="text-slate-700 font-medium pr-2">{it.label}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${it.val ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {it.val ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {p.evaluasi_submitted_by && (
                        <p className="text-[11px] text-slate-500 mt-2">
                          Evaluasi disubmit oleh: <strong>{p.evaluasi_submitted_by}</strong>
                          {p.evaluasi_submitted_at && ` pada ${new Date(p.evaluasi_submitted_at).toLocaleString("id-ID")}`}
                        </p>
                      )}
                    </SectionCard>
                  )}
                </>
              ) : (
                /* ═══ HOT WORK & WORKSHOP SECTIONS ═══ */
                <>
                  {/* BAGIAN 1: INFORMASI REGISTRASI & IDENTITAS PEKERJAAN */}
                  <SectionCard title="Bagian 1: Informasi Registrasi & Identitas Pekerjaan" icon={User} badge="Wajib">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Field label="No. Registrasi / ID Form" value={p.no_registrasi || p.id_form} mono />
                      <Field label="Tipe Perusahaan" value={p.tipe_perusahaan === "eksternal" ? "Eksternal / Subkontraktor" : "Internal / PT. JAI"} />
                      <Field label="Perusahaan / Kontraktor" value={p.pemohon || p.nama_kontraktor_nik || p.nama_kontraktor_pekerja || p.nama_kontraktor || p.kontraktor || "-"} />
                      <Field label="Nama Pekerja" value={p.nama_pekerja_nik || "-"} />
                      <Field label="NIK Pekerja" value={p.nik_pekerja || p.kontraktor_nik || "-"} mono />
                      <Field label="Lokasi Pekerjaan" value={p.lokasi_pekerjaan || p.lokasi || "-"} />
                      <Field label="Tanggal Diajukan" value={formatDate(p.tanggal)} />
                      <Field label="Tanggal Pelaksanaan" value={formatDate(p.tanggal_pelaksanaan)} />
                      <Field label="Waktu Mulai" value={formatTime(p.waktu_pukul || p.waktu_mulai)} />
                      <Field label="Waktu Selesai" value={formatTime(p.waktu_selesai)} />
                      {p.id_ijin_kerja && <Field label="Izin Induk (Parent)" value={p.id_ijin_kerja} mono />}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-100">
                      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-bold text-blue-900">Petugas Fire Watch</span>
                          </div>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                            Pengawas Api
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Field label="Nama" value={p.nama_fire_watch || "Belum diisi"} />
                          <Field label="NIK" value={p.nik_fire_watch || "Belum diisi"} mono />
                        </div>
                        {p.tanda_tangan_fw && (
                          <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-blue-800">Tanda Tangan Fire Watch:</span>
                            <button
                              type="button"
                              onClick={() => setZoomImage({ src: resolveFileUrl(p.tanda_tangan_fw), title: `TTD Fire Watch — ${p.nama_fire_watch || ""}` })}
                              className="p-1 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors shadow-2xs"
                            >
                              <img src={resolveFileUrl(p.tanda_tangan_fw)} alt="TTD Fire Watch" className="h-8 w-auto object-contain" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-900">Pemberi Izin (SPV Terkait)</span>
                          </div>
                          {isTruthy(p.spv_approved) ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                              ✓ Disetujui SPV
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-semibold">
                              Menunggu SPV
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <Field label="Nama SPV" value={p.spv_terkait || p.spv_terkait_pj || p.spv_approved_by || p.pengawas_lapangan || "Belum diisi"} />
                          <Field label="Jabatan" value={p.jabatan_pemberi_izin || "Supervisor Area"} />
                          <Field label="NIK SPV" value={p.nik_pemberi_ijin || p.spv_nik || p.nik_spv_terkait_pj || "Belum diisi"} mono />
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO TINGGI */}
                  <SectionCard title="Bagian 2: Jenis Pekerjaan & Area Berisiko Tinggi" icon={Flame}>
                    <div className="space-y-4">
                      {p.deskripsi_pekerjaan && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Deskripsi Rinci Pekerjaan
                          </span>
                          <p className="text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed whitespace-pre-wrap">
                            {p.deskripsi_pekerjaan}
                          </p>
                        </div>
                      )}

                      <div className="space-y-3 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Rincian Operasi Teknis &amp; Jam Kerja
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { l: "Cutting (Pemotongan)", d: p.detail_cutting, m: p.t_mulai_cutting, s: p.t_selesai_cutting },
                            { l: "Grinding (Gerinda)", d: p.detail_grinding, m: p.t_mulai_grinding, s: p.t_selesai_grinding },
                            { l: "Welding (Pengelasan)", d: p.detail_welding, m: p.t_mulai_welding, s: p.t_selesai_welding },
                            { l: "Painting (Pengecatan)", d: p.detail_painting, m: p.t_mulai_painting, s: p.t_selesai_painting },
                          ].map((item) => (
                            <div
                              key={item.l}
                              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                                item.d || item.m
                                  ? "bg-white border-slate-300 shadow-2xs"
                                  : "bg-slate-50/50 border-slate-200/60 opacity-60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-800">{item.l}</span>
                                  {item.d ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                      Aktif
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-medium text-slate-400">
                                      Tidak
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                                  {item.d || "Tidak ada pekerjaan"}
                                </p>
                              </div>
                              {(item.m || item.s) && (
                                <span className="text-[10px] font-mono text-orange-600 font-semibold block mt-2 pt-2 border-t border-slate-100">
                                  Jam: {formatTime(item.m)} – {formatTime(item.s)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {formType === "workshop" && (isTruthy(p.painting_spray) || isTruthy(p.painting_non_spray)) && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-slate-500 font-semibold">Metode Pengecatan (Painting):</span>
                            {isTruthy(p.painting_spray) && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                SPRAY
                              </span>
                            )}
                            {isTruthy(p.painting_non_spray) && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                NON SPRAY
                              </span>
                            )}
                          </div>
                        )}

                        {isTruthy(p.ada_kerja_lainnya) && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <span className="font-bold text-slate-800 block mb-0.5">Pekerjaan Lainnya:</span>
                            <p className="text-slate-700 whitespace-pre-wrap">{p.jenis_kerjaan_lainnya || "-"}</p>
                          </div>
                        )}

                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Peralatan &amp; Fasilitas Khusus Terkait
                          </span>
                          <BoolBadges
                            items={[
                              { label: "Preventive Genset Pump Room", active: isTruthy(p.preventive_genset_pump_room) },
                              { label: "Tangki Solar", active: isTruthy(p.tangki_solar) },
                              { label: "Panel Listrik", active: isTruthy(p.panel_listrik) },
                            ]}
                          />
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Area Berisiko Tinggi
                          </span>
                          <BoolBadges
                            items={[
                              { label: "Ruang Tertutup", active: isTruthy(p.ruang_tertutup) },
                              { label: "Bahan Mudah Terbakar", active: isTruthy(p.bahan_mudah_terbakar) },
                              { label: "Gas/Bejana/Tangki", active: isTruthy(p.gas_bejana_tangki) },
                              { label: "Ketinggian", active: isTruthy(p.height_work) },
                              { label: "Cairan/Gas Bertekanan", active: isTruthy(p.cairan_gas_bertekan) },
                              { label: "Cairan Hydrocarbon", active: isTruthy(p.cairan_hydrocarbon) },
                            ]}
                          />
                        </div>

                        {p.bahaya_lain && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                            <span className="font-bold block mb-0.5">Potensi Bahaya Lain:</span>
                            <p className="whitespace-pre-wrap">{p.bahaya_lain}</p>
                          </div>
                        )}

                        {p.permintaan_tambahan && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                            <span className="font-bold block mb-0.5">Permintaan Tambahan:</span>
                            <p className="whitespace-pre-wrap">{p.permintaan_tambahan}</p>
                          </div>
                        )}

                        {formType === "hot-work" && (p.jumlah_fire_blanket || p.kondisi_fire_blanket !== undefined) && (
                          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <Field label="Kondisi Fire Blanket" value={isTruthy(p.kondisi_fire_blanket) ? "Layak Pakai" : "Tidak Layak"} />
                            {p.jumlah_fire_blanket && <Field label="Jumlah Fire Blanket" value={`${p.jumlah_fire_blanket} Unit`} />}
                          </div>
                        )}
                      </div>
                    </div>
                  </SectionCard>

                  {/* BAGIAN 3: UPAYA PENCEGAHAN & CHECKLIST KESELAMATAN */}
                  <SectionCard
                    title={formType === "workshop" ? "Bagian 3: Upaya Pencegahan & Checklist Keselamatan" : "Bagian 3: Langkah Pengendalian & Upaya Pencegahan Kebakaran"}
                    icon={ShieldCheck}
                  >
                    {formType === "workshop" ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                        <div className="bg-slate-100/80 px-4 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
                          <span>Checklist Standar Workshop</span>
                          <span>Status</span>
                        </div>
                        {WORKSHOP_CHECKLIST_ITEMS.map(([key, label, col]) => {
                          const checked = isTruthy(p.checklist_pencegahan?.[key] ?? p[key] ?? p[col]);
                          return (
                            <div key={key} className="px-4 py-2.5 flex items-center justify-between text-xs gap-3">
                              <span className="text-slate-700">{label}</span>
                              <span className={`font-bold px-2 py-0.5 rounded ${checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                {checked ? "YA" : "TIDAK"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                        <div className="bg-slate-100/80 px-4 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
                          <span>Prosedur Pengamanan</span>
                          <span>Status</span>
                        </div>
                        {HOT_WORK_CHECKLIST_ITEMS.map(([no, label, key]) => (
                          <div key={key} className="px-4 py-2.5 flex items-center justify-between text-xs gap-3">
                            <span className="text-slate-700">{no}. {label}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${isTruthy(p[key]) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {isTruthy(p[key]) ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        ))}
                        {HOT_WORK_RUANG_TERTUTUP_ITEMS.map(([no, label, key]) => (
                          <div key={key} className="px-4 py-2.5 flex items-center justify-between text-xs gap-3">
                            <span className="text-slate-700">{no}. {label}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${isTruthy(p[key]) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {isTruthy(p[key]) ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        ))}
                        {HOT_WORK_DINDING_ITEMS.map(([no, label, key]) => (
                          <div key={key} className="px-4 py-2.5 flex items-center justify-between text-xs gap-3">
                            <span className="text-slate-700">{no}. {label}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${isTruthy(p[key]) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {isTruthy(p[key]) ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        ))}
                        {HOT_WORK_TAIL_ITEMS.map(([no, label, key]) => (
                          <div key={key} className="px-4 py-2.5 flex items-center justify-between text-xs gap-3">
                            <span className="text-slate-700">{no}. {label}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${isTruthy(p[key]) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {isTruthy(p[key]) ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        ))}
                        {(p.tidak_ada_cairan_mudah_terbakar !== undefined || p.lantai_bersih !== undefined || p.lembaran_dibawah_pekerjaan !== undefined) && (
                          <>
                            <div className="bg-orange-50/80 px-4 py-1.5 font-bold text-orange-900 text-[11px] border-b border-slate-200">
                              Pemeriksaan Area &amp; Penutup Tambahan
                            </div>
                            {[
                              ["Tidak ada cairan mudah terbakar di sekitar", "tidak_ada_cairan_mudah_terbakar"],
                              ["Lantai bersih dari serpihan / serbuk mudah terbakar", "lantai_bersih"],
                              ["Lembaran tahan api dipasang di bawah pekerjaan", "lembaran_dibawah_pekerjaan"],
                            ].map(([label, key]) => {
                              const val = p[key];
                              if (val === undefined || val === null) return null;
                              const checked = isTruthy(val);
                              return (
                                <div key={key} className="px-4 py-2.5 flex items-center justify-between text-xs gap-3">
                                  <span className="text-slate-700">{label}</span>
                                  <span className={`font-bold px-2 py-0.5 rounded ${checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                    {checked ? "YA" : "TIDAK"}
                                  </span>
                                </div>
                              );
                            })}
                          </>
                        )}
                        <div className="px-4 py-2.5 flex items-center justify-between text-xs gap-3">
                          <span className="text-slate-700">12. Kondisi Fire Blanket / Perisai Metal</span>
                          <span className={`font-bold px-2 py-0.5 rounded ${isTruthy(p.kondisi_fire_blanket) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {isTruthy(p.kondisi_fire_blanket) ? "LAYAK" : "TIDAK"}
                          </span>
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  {/* BAGIAN 4: PENGESAHAN & TANDA TANGAN PEMOHON */}
                  {p.kontraktor_signature_url && (
                    <SectionCard title="Bagian 4: Pengesahan & Tanda Tangan Pemohon" icon={ShieldCheck}>
                      <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tanda Tangan Pemohon / Kontraktor
                          </span>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            Disahkan secara digital oleh: {p.pemohon || p.pimpinan_kontraktor || p.nama_pekerja_nik || p.nama_kontraktor_nik || "Pemohon"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setZoomImage({ src: resolveFileUrl(p.kontraktor_signature_url), title: `Tanda Tangan Pemohon — ${p.id_form}` })}
                          className="p-1 bg-white rounded-lg border border-slate-300 hover:border-orange-500 transition-colors shrink-0 shadow-2xs"
                        >
                          <img src={resolveFileUrl(p.kontraktor_signature_url)} alt="TTD Kontraktor" className="h-9 w-auto object-contain" />
                        </button>
                      </div>
                    </SectionCard>
                  )}

                  {/* BAGIAN 5: DOKUMEN JOB SAFETY ANALYSIS (JSA) */}
                  <SectionCard title="Bagian 5: Dokumen Job Safety Analysis (JSA)" icon={ClipboardList}>
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3">
                      <div>
                        <span className="font-bold text-slate-800 block">Status Dokumen JSA</span>
                        <p className="text-slate-500 mt-0.5">
                          {p.perlu_jsa ? (p.jsa_file_url ? "File dokumen JSA terlampir secara digital" : "Analisis K3 / JSA terstruktur telah diisi") : "Ketentuan JSA tidak diwajibkan untuk pekerjaan ini"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("lampiran");
                          setActiveLampiran("jsa");
                        }}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                      >
                        Buka JSA
                      </button>
                    </div>
                  </SectionCard>

                  {/* Evaluasi Housekeeping Selesai Pekerjaan khusus Eksternal jika ada */}
                  {isEksternal && (p.evaluasi_status || p.eval_area_bersih_rapi !== undefined) && (
                    <SectionCard title="Evaluasi Housekeeping Selesai Pekerjaan" icon={ShieldCheck} badge={p.evaluasi_status ? `Status: ${p.evaluasi_status}` : undefined}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {[
                          { label: "Area kerja telah dibersihkan & dirapikan", val: p.eval_area_bersih_rapi },
                          { label: "Sisa material & limbah telah dipilah & dibuang ke tempatnya", val: p.eval_limbah_ditangani_baik },
                          { label: "Instalasi listrik / sumber energi dipastikan aman", val: p.eval_instalasi_listrik_aman },
                          { label: "Tidak ada kerusakan pada fasilitas / properti PT JAI", val: p.eval_tdk_ada_kerusakan_property },
                          { label: "Tidak terjadi tumpahan bahan kimia / BBM di area kerja", val: p.eval_ada_tumpahan_kimia_bbm === false },
                          { label: "Tidak ada kehilangan peralatan atau properti PT JAI", val: p.eval_tdk_ada_kehilangan_property },
                        ].map((it, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <span className="text-slate-700 font-medium pr-2">{it.label}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${it.val ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {it.val ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {p.evaluasi_submitted_by && (
                        <p className="text-[11px] text-slate-500 mt-2">
                          Evaluasi disubmit oleh: <strong>{p.evaluasi_submitted_by}</strong>
                          {p.evaluasi_submitted_at && ` pada ${new Date(p.evaluasi_submitted_at).toLocaleString("id-ID")}`}
                        </p>
                      )}
                    </SectionCard>
                  )}
                </>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: DOKUMEN & FORM TERKAIT (LAMPIRAN) - SPLIT VIEW
          ══════════════════════════════════════════════════════════ */}
          {activeTab === "lampiran" && (
            <div className="flex flex-col lg:flex-row items-start gap-5 animate-in fade-in duration-200 w-full max-w-full min-w-0">
              
              {/* ── Sisi Kiri: Menu Jenis Lampiran (Side Nav Compact) ── */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-orange-600" />
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Jenis Lampiran</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                      {lampiranItems.length} Jenis
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {lampiranItems.map((item) => {
                      const Icon = item.icon;
                      const isSelected = activeLampiran === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveLampiran(item.id)}
                          className={`w-full text-left p-3.5 transition-all flex items-start gap-3 border-l-4 cursor-pointer ${
                            isSelected
                              ? "bg-orange-50/80 border-orange-500 text-slate-900 shadow-2xs"
                              : "border-transparent hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? "bg-orange-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className={`text-xs font-bold truncate ${isSelected ? "text-orange-950" : "text-slate-800"}`}>
                                {item.title}
                              </h4>
                              {item.badge && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${item.badgeColor}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-2 transition-transform ${
                            isSelected ? "text-orange-600 translate-x-0.5" : "text-slate-300"
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-500 leading-relaxed hidden lg:block">
                  💡 Klik salah satu jenis lampiran di atas untuk melihat dokumen, form perizinan terkait, atau berkas K3 pada panel sebelah kanan.
                </div>
              </div>

              {/* ── Sisi Kanan: Tampilan Hasil Lampiran (Jauh Lebih Lebar) ── */}
              <div className="flex-1 w-full min-w-0 max-w-full space-y-4">
                
                {/* 1. LINKED JOB PERMITS */}
                {activeLampiran === "linked-permits" && formType === "general-permit" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Form Perizinan Khusus Terkait (Linked Job Permits)</h3>
                          <p className="text-[11px] text-slate-500">Izin kerja spesifik yang dibuat di bawah otorisasi surat izin eksternal ini</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {[
                          { key: "hotWork", label: "Hot Work Permit", type: "hot-work", desc: "Pekerjaan pengelasan, gerinda, pemotongan api", icon: Flame, color: "text-orange-600 bg-orange-50 border-orange-200" },
                          { key: "heightWork", label: "Kerja Ketinggian", type: "height-work", desc: "Pekerjaan di atas ketinggian >= 1.8 meter", icon: AlertTriangle, color: "text-purple-600 bg-purple-50 border-purple-200" },
                          { key: "workshop", label: "Workshop Permit", type: "workshop", desc: "Pekerjaan permesinan / fabrikasi workshop", icon: Wrench, color: "text-blue-600 bg-blue-50 border-blue-200" },
                        ].map((item) => {
                          const found = (linkedJobForms as any)?.[item.key];
                          const Icon = item.icon;

                          if (found) {
                            return (
                              <div key={item.key} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${item.color}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-800">{item.label}</h4>
                                      <span className="text-[10px] font-mono text-slate-400">{found.id_form}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    {found.status}
                                  </span>
                                </div>
                                <Link
                                  href={`/my-forms/${item.type}/${found.id_form}`}
                                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat Detail {item.label}</span>
                                </Link>
                              </div>
                            );
                          }

                          return (
                            <div key={item.key} className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-white space-y-3 flex flex-col justify-between">
                              <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-700">{item.label}</h4>
                                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                                </div>
                              </div>
                              <Link
                                href={`/form/${item.type}?id_ijin_kerja=${p.id_form}`}
                                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                <span>+ Buat {item.label}</span>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. JSA (JOB SAFETY ANALYSIS) */}
                {activeLampiran === "jsa" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden w-full max-w-full min-w-0">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Job Safety Analysis (JSA)</h3>
                          <p className="text-[11px] text-slate-500">Lembar analisis bahaya, langkah kerja, dan pengendalian risiko keselamatan</p>
                        </div>
                      </div>
                      {p.jsa_file_url && (
                        <a
                          href={p.jsa_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download JSA Asli</span>
                        </a>
                      )}
                    </div>
                    <div className="p-4 sm:p-5 w-full max-w-full min-w-0 overflow-hidden">
                      <JsaViewer
                        perluJsa={Boolean(p.perlu_jsa)}
                        jsaData={p.jsa_data}
                        jsaFileUrl={p.jsa_file_url}
                      />
                    </div>
                  </div>
                )}

                {/* 3. SAFETY INDUCTION SECURITY */}
                {activeLampiran === "safety-induction" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Safety Induction Pos Security</h3>
                          <p className="text-[11px] text-slate-500">Hasil pengarahan tata tertib K3 dan verifikasi kartu identitas pekerja</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        p.security_approved || p.safety_induction?.status === "submitted" || p.safety_induction?.status === "verified"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {p.security_approved || p.safety_induction?.status === "submitted" || p.safety_induction?.status === "verified"
                          ? "✓ Terverifikasi Security"
                          : "Menunggu Pemeriksaan"}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      {p.safety_induction ? (
                        <>
                          {/* Status Verifikasi Banner */}
                          {p.security_approved || p.safety_induction?.status === "submitted" || p.safety_induction?.status === "verified" ? (
                            <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  <span className="text-xs font-bold text-emerald-900">
                                    Safety Induction Selesai Diverifikasi & Disahkan oleh Pos Security
                                  </span>
                                  {p.security_approved_by && (
                                    <p className="text-[11px] text-emerald-700 mt-0.5">
                                      Diverifikasi oleh: <span className="font-semibold">{p.security_approved_by}</span>
                                      {p.security_approved_at && ` pada ${new Date(p.security_approved_at).toLocaleString("id-ID")}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-auto">
                                ✓ Terverifikasi Security
                              </span>
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-xs font-medium">Menunggu pemeriksaan dan verifikasi Safety Induction oleh petugas Pos Security.</span>
                              </div>
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                Menunggu Security
                              </span>
                            </div>
                          )}

                          {/* Info Subcont Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                            <Field label="Perusahaan Subcont" value={p.safety_induction?.namaSubcont || p.nama_kontraktor_pekerja || "-"} />
                            <Field label="Aktivitas Pekerjaan" value={p.safety_induction?.aktivitasPekerjaan || p.deskripsi_pekerjaan || "-"} />
                            <Field label="Koord. Subcont / No. HP" value={p.safety_induction?.koordinatNoHp || p.nama_pengawas_pic_subkont || "-"} />
                            <Field label="Lokasi Pekerjaan" value={p.lokasi || p.lokasi_pekerjaan || "-"} />
                          </div>

                          {/* Pekerja Terinduksi Chips Grid */}
                          {Array.isArray(p.safety_induction?.namaPekerja) && p.safety_induction.namaPekerja.filter(Boolean).length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  Daftar Pekerja Terinduksi ({p.safety_induction.namaPekerja.filter(Boolean).length} Orang)
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {p.safety_induction.namaPekerja.filter(Boolean).map((nama: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg transition-colors"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700 truncate">{nama}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mini Pengesahan Barcode / TTD */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80">
                              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Koordinator Subcont</span>
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {p.kontraktor_signature_url || p.safety_induction?.kontraktor_signature_url ? "✓ Sudah Bertanda Tangan" : "Belum Bertanda Tangan"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Verifikasi Security</span>
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {p.security_approved ? `✓ Disetujui (${p.security_approved_by || "Security"})` : "Menunggu Approval Security"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                          <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">Belum Ada Data Safety Induction</p>
                          <p className="text-slate-400 mt-1">Formulir Safety Induction akan diinput dan diverifikasi oleh petugas Pos Security saat kontraktor tiba.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. PENILAIAN SUBKONTRAKTOR */}
                {activeLampiran === "penilaian" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Penilaian K3 Subkontraktor</h3>
                          <p className="text-[11px] text-slate-500">Evaluasi penerapan K3 di lapangan oleh Pengawas Dept, Purchasing, dan SFO</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                        <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <p className="font-semibold text-blue-950">Informasi Evaluasi K3 Subkontraktor:</p>
                          <p className="text-[11px] text-blue-800 mt-0.5">
                            Formulir penilaian ini diisi berkala oleh Pengawas Departemen selama masa pelaksanaan kerja, serta diverifikasi barcode digital oleh SFO, Purchasing, dan Pengawas Departemen.
                          </p>
                        </div>
                      </div>
                      <PenilaianSubkontraktorSection
                        value={penilaianData}
                        setValue={setPenilaianData}
                        readOnly={true}
                        hideHeader={true}
                        formId={p.id_form}
                        tanggalDari={p.tgl_mulai_kerja || p.izin_kerja_tanggal_dari || p.tanggal_mulai || p.tanggal_pelaksanaan || p.tanggal}
                        tanggalSampai={p.tgl_akhir_kerja_rencana || p.izin_kerja_tanggal_sampai || p.tanggal_selesai || p.tanggal_pelaksanaan || p.tanggal}
                      />
                    </div>
                  </div>
                )}

                {/* 5. PARENT PERMIT (KHUSUS JOB FORM DENGAN PARENT) */}
                {activeLampiran === "parent-permit" && p.id_ijin_kerja && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Izin Kerja Eksternal Induk</h3>
                          <p className="text-[11px] text-slate-500">Izin kerja umum yang menaungi izin kerja khusus ini</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Form Izin Kerja Induk</span>
                          <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">{p.id_ijin_kerja}</p>
                          <p className="text-xs text-slate-500 mt-1">Surat izin kerja eksternal induk tempat izin kerja ini didaftarkan.</p>
                        </div>
                        <Link
                          href={`/my-forms/general-permit/${p.id_ijin_kerja}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buka Izin Induk</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. LISENSI & SERTIFIKASI K3 PEKERJA */}
                {activeLampiran === "license" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Lisensi &amp; Sertifikasi K3 Pekerja</h3>
                          <p className="text-[11px] text-slate-500">Kualifikasi keahlian pekerja &amp; sertifikat kompetensi K3</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {parsedLicenseFiles.length} Berkas Diunggah
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      {parsedLicenseFiles.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 space-y-2">
                          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="text-sm font-medium">Tidak ada berkas lisensi atau sertifikasi K3 yang diunggah.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {parsedLicenseFiles.map((lic, idx) => {
                            const isImg = lic.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                            const fileName = lic.name || `Sertifikat K3 #${idx + 1}`;
                            return (
                              <div
                                key={idx}
                                className="p-4 bg-slate-50/70 hover:bg-purple-50/40 rounded-xl border border-slate-200 flex flex-col justify-between gap-3 transition-colors"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate" title={fileName}>
                                          {fileName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono truncate">{lic.url}</p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                                      #{idx + 1}
                                    </span>
                                  </div>

                                  {isImg && (
                                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-200 border border-slate-200 group">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={resolveFileUrl(lic.url)}
                                        alt={fileName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2">
                                  <a
                                    href={resolveFileUrl(lic.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Buka Dokumen</span>
                                  </a>
                                  <a
                                    href={resolveFileUrl(lic.url)}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Unduh</span>
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: PERSETUJUAN & TANDA TANGAN QR
          ══════════════════════════════════════════════════════════ */}
          {activeTab === "persetujuan" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Tanda Tangan Pad Kontraktor jika belum bertanda tangan */}
              {isEksternal && !p.kontraktor_signature_url && (
                <div className="bg-white rounded-2xl border-2 border-orange-200 bg-orange-50/30 p-5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-orange-800">
                    <User className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-sm sm:text-base">Tanda Tangan Digital Kontraktor</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sebagai perwakilan kontraktor pelaksana, silakan bubuhkan tanda tangan digital Anda di bawah ini untuk mengesahkan permohonan izin kerja.
                  </p>
                  <SignaturePad
                    onConfirm={async (dataUrl) => {
                      try {
                        const blob = await fetch(dataUrl).then((r) => r.blob());
                        const formData = new FormData();
                        formData.append("file", blob, `sig-${p.id_form}.png`);
                        const uploadRes = await fetch("/api/upload/signature", { method: "POST", body: formData });
                        const uploadJson = await uploadRes.json();
                        if (!uploadRes.ok) throw new Error(uploadJson.error || "Gagal upload TTD");

                        const endpoint = formType === "general-permit"
                          ? `/api/forms/general-permit/${p.id_form}/sign-kontraktor`
                          : `/api/approval/${formType}/${p.id_form}/sign`;

                        const signRes = await fetch(endpoint, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ signatureUrl: uploadJson.url }),
                        });
                        if (!signRes.ok) throw new Error("Gagal mengesahkan TTD");
                        alert("Tanda tangan kontraktor berhasil disimpan!");
                        await loadFormData();
                      } catch (e: any) {
                        alert(e.message || "Gagal menyimpan tanda tangan");
                      }
                    }}
                    confirmLabel="Simpan Tanda Tangan Kontraktor"
                  />
                </div>
              )}

              {/* Grid QR Card Approver */}
              <SectionCard title="Kartu Verifikasi Approval & Digital QR Code" icon={ShieldCheck}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Kontraktor QR Card */}
                  {isEksternal && (
                    <ApprovalQRCard
                      formId={p.id_form}
                      formType={formType}
                      label="Kontraktor"
                      role="kontraktor"
                      approved={Boolean(p.kontraktor_signature_url || p.kontraktor_approved)}
                      approvedBy={p.kontraktor_pj || p.nama_kontraktor_pekerja || p.nama_kontraktor_nik || "Kontraktor"}
                      approvedAt={p.tanggal}
                    />
                  )}

                  {/* SPV */}
                  <ApprovalQRCard
                    formId={p.id_form}
                    formType={formType}
                    label="SPV Terkait"
                    role="spv"
                    approved={Boolean(p.spv_approved)}
                    approvedBy={p.spv_approved_by || p.spv_terkait}
                    approvedNik={p.spv_nik}
                    approvedAt={p.spv_approved_at}
                  />

                  {/* Admin K3 (untuk Job Forms) */}
                  {formType !== "general-permit" && (
                    <ApprovalQRCard
                      formId={p.id_form}
                      formType={formType}
                      label="Admin K3"
                      role="admin_k3"
                      approved={Boolean(p.admin_k3_approved)}
                      approvedBy={p.admin_k3_approved_by}
                      approvedNik={p.admin_k3_nik}
                      approvedAt={p.admin_k3_approved_at}
                    />
                  )}

                  {/* SFO */}
                  <ApprovalQRCard
                    formId={p.id_form}
                    formType={formType}
                    label="Safety Officer (SFO)"
                    role="sfo"
                    approved={Boolean(p.sfo_approved)}
                    approvedBy={p.sfo_approved_by || p.sfo}
                    approvedNik={p.sfo_nik}
                    approvedAt={p.sfo_approved_at}
                  />

                  {/* MR / PGA MGR / SMR */}
                  <ApprovalQRCard
                    formId={p.id_form}
                    formType={formType}
                    label="MR / PGA Manager"
                    role={formType === "general-permit" ? "pga" : "mr_pga"}
                    approved={Boolean(p.pga_approved || p.mr_pga_approved)}
                    approvedBy={p.pga_approved_by || p.mr_pga_approved_by || p.mr_pga_mgr}
                    approvedNik={p.pga_nik || p.mr_pga_nik}
                    approvedAt={p.pga_approved_at || p.mr_pga_approved_at}
                  />

                  {/* Security (Khusus General Permit) */}
                  {formType === "general-permit" && (
                    <ApprovalQRCard
                      formId={p.id_form}
                      formType={formType}
                      label="Security"
                      role="security"
                      approved={Boolean(p.security_approved)}
                      approvedBy={p.security_approved_by}
                      approvedNik={p.security_nik}
                      approvedAt={p.security_approved_at}
                    />
                  )}
                </div>
              </SectionCard>

            </div>
          )}

        </main>
      </div>

      {/* ── Modal Input Aktual Tanggal Kerja Selesai ── */}
      {actualDateModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Aktual Tanggal Selesai</h3>
                <p className="text-xs text-slate-500">Ijin Kerja Eksternal: {p.id_form}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Tanggal Pekerjaan Selesai</label>
              <input
                type="date"
                value={actualDateModal.dateValue}
                onChange={(e) => setActualDateModal((prev) => ({ ...prev, dateValue: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActualDateModal({ isOpen: false, dateValue: "", submitting: false })}
                disabled={actualDateModal.submitting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveActualDate}
                disabled={actualDateModal.submitting}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                {actualDateModal.submitting ? "Menyimpan..." : "Simpan Tanggal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Batalkan Form ── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-600">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Batalkan Pengajuan Form?</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin membatalkan pengajuan form <strong>{p.id_form}</strong>?
              </p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Tindakan ini tidak dapat dibatalkan. Pengajuan form akan dihapus secara permanen dari sistem.</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Tidak, Kembali
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={cancelling}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
              >
                {cancelling ? "Membatalkan..." : "Ya, Batalkan Pengajuan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Zoom Preview Lisensi ── */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setZoomImage(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="font-bold text-slate-800 text-sm">{zoomImage.title}</p>
              <button onClick={() => setZoomImage(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomImage.src} alt={zoomImage.title} className="w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Edit Form ── */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        formId={p.id_form}
        formType={formType}
        onSuccess={loadFormData}
      />
    </div>
  );
}
