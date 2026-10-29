// app/approval/[jenisForm]/[id]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle,
  Clock, Loader2, Flame, Info, Eye, FileText,
  LogOut, ZoomIn, X, Lock, CheckCircle2, Shield,
  Wrench, AlertTriangle, Layers, Download, RefreshCw,
  Calendar, MapPin, User, ChevronRight, Paperclip,
  ExternalLink, HardHat, Check, ShieldCheck, Printer,
  Building2,
} from "lucide-react";
import React from "react";
import { useApproverAuth } from "@/hooks/useApproverAuth";
import AuthLoadingSpinner from "@/components/AuthLoadingSpinner";
import JsaViewer from "@/components/JsaViewer";

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (t?: string | null) => (!t ? "-" : String(t).slice(0, 5));
const isTruthy = (v: any) => v === true || v === "t" || v === "true";

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
};

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  draft: {
    label: "Draft",
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-300",
  },
  submitted: {
    label: "Menunggu Approval",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  approved: {
    label: "Disetujui Penuh",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
  },
  rejected: {
    label: "Ditolak",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-300",
  },
};

const roleLabel: Record<string, string> = {
  spv:        "SPV / Pemberi Izin",
  kontraktor: "Kontraktor",
  admin_k3:   "Admin K3",
  sfo:        "SFO",
  smr:        "SMR / PGA",
  admin:      "Administrator",
  firewatch:  "Fire Watch",
  worker:     "Worker",
};

// ── Checklist Data Items ──────────────────────────────────────
const WORKSHOP_CHECKLIST_ITEMS = [
  ["equipment", "Equipment/tool/mesin berfungsi dengan baik"],
  ["apar", "APAR tersedia dekat area kerja"],
  ["flammableNearby", "Tidak ada cairan mudah terbakar dekat area kerja panas"],
  ["b3Stored", "B3 & cairan mudah terbakar disimpan di lemari khusus"],
  ["cleanFloor", "Lantai bersih dari benda mudah terbakar"],
  ["metalShield", "Lantai ditutup dengan perisai metal untuk menampung bunga api"],
  ["completePpe", "Memakai APD lengkap sesuai OS APD"],
  ["cleanMaterial", "Membersihkan sisa material, serpihan logam, atau sampah"],
  ["returnEquipment", "Mengembalikan Equipment/tool/mesin ke tempat penyimpanan semula"],
  ["disposeWaste", "Membuang sampah sesuai jenisnya (organik, anorganik, dan B3)"],
  ["firewatchSafety", "Fire watch memastikan kondisi aman selama dan setelah proses kerja"],
  ["firewatchTraining", "Fire watch terlatih Pemakaian APAR"],
] as const;

const HOT_WORK_CHECKLIST_ITEMS = [
  ["1", "Equipment/Tools kondisi baik", "kondisi_tools_baik"],
  ["2", "Alat pemadam api (APAR, Hydrant)", "tersedia_apar_hydrant"],
  ["3", "Sensor Smoke Detector perlu dinon-aktifkan", "sensor_smoke_detector_non_aktif"],
  ["4", "APD lengkap dipakai", "apd_lengkap"],
  ["5", "Lantai dari bahan mudah terbakar dibasahi, ditutupi pasir basah/perisai metal", "lantai_sudah_dibasahi"],
  ["6", "Cairan mudah terbakar dan menyala diproteksi dengan tutup/perisai metal", "cairan_mudah_tebakar_tertutup"],
  ["7", "Lindungi conveyor, instalasi kabel, alat listrik dengan perisai metal", "lindungi_conveyor_dll"],
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
  ["10", "Fire watch ada memastikan area aman selama proses dan 60 menit setelahnya", "fire_watch_memastikan_area_aman"],
  ["11", "Fire watch sudah mendapatkan pelatihan dan mampu menggunakan APAR/alarm", "firwatch_terlatih"],
] as const;

function getTipeLabel(tipe?: string): string {
  if (tipe === "eksternal") return "Eksternal / Subkontraktor";
  return "Internal / PT. JAI";
}

// ── Reusable Micro-Components ─────────────────────────────────
const SectionCard = ({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  badge?: string;
}) => (
  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200 hover:shadow-xs">
    <div className="bg-slate-50/75 border-b border-slate-200/80 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <h3 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider truncate">
          {title}
        </h3>
      </div>
      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
          {badge}
        </span>
      )}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const Field = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="space-y-0.5">
    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
      {label}
    </span>
    <p
      className={`text-xs sm:text-sm font-semibold text-slate-800 break-words ${
        mono ? "font-mono" : ""
      }`}
    >
      {value ?? "-"}
    </p>
  </div>
);

const BoolBadges = ({ items }: { items: { label: string; active: boolean }[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((item, idx) => (
      <span
        key={idx}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
          item.active
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
            : "bg-slate-50/80 text-slate-400 border-slate-200 line-through opacity-60"
        }`}
      >
        {item.active ? (
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
        ) : (
          <X className="w-3 h-3 text-slate-400" />
        )}
        <span>{item.label}</span>
      </span>
    ))}
  </div>
);

// ── Lightbox Image Modal ──────────────────────────────────────
function ImageLightbox({
  src,
  label,
  onClose,
}: {
  src: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className="font-bold text-slate-800 text-sm truncate pr-4">{label}</p>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4 bg-slate-900/5 flex items-center justify-center min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="max-h-[75vh] w-auto object-contain rounded-lg shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────
export default function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ jenisForm: string; id: string }>;
}) {
  const { jenisForm, id } = use(params);
  const router = useRouter();

  // ── Auth guard via hook ────────────────────────────────────
  const { user, loading: authLoading } = useApproverAuth();

  const [form, setForm]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [catatan, setCatatan]       = useState("");
  const [done, setDone]             = useState<"approved" | "rejected" | null>(null);
  const [error, setError]           = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"detail" | "lampiran">("detail");
  const [activeLampiranTab, setActiveLampiranTab] = useState<"jsa" | "lisensi" | "parent">("jsa");

  // Lightbox preview modal
  const [previewImage, setPreviewImage] = useState<{ src: string; label: string } | null>(null);

  // Height-work: Bagian 5 inspection checklist for Admin K3
  const [harness, setHarness] = useState({
    helm:     false,
    webbing:  false,
    dring:    false,
    gesper:   false,
    absorber: false,
    snapHook: false,
    rope:     false,
  });

  const isHotOrWorkshop = jenisForm !== "height-work";
  const isWorkshop      = jenisForm === "workshop";
  const isHotWork       = jenisForm === "hot-work";
  const isHeightWork    = jenisForm === "height-work";

  const meta = jenisMeta[jenisForm] || {
    label: jenisForm,
    icon: FileText,
    color: "text-slate-600",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    border: "border-slate-500",
  };
  const FormIcon = meta.icon;

  useEffect(() => {
    if (jenisForm === "general-permit" || jenisForm === "external-permit" || jenisForm === "external" || jenisForm === "ijin-kerja-eksternal") {
      router.replace(`/approval/external/${id}`);
      return;
    }
    if (authLoading || !user) return;
    loadForm();
  }, [authLoading, user, jenisForm, id]);

  const loadForm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approval/${jenisForm}/${id}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push(`/login/approver?redirect=${encodeURIComponent(`/approval/${jenisForm}/${id}`)}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !catatan.trim()) {
      setError("Catatan alasan penolakan wajib diisi sebelum menolak form.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const patchBody: Record<string, any> = { action, catatan_reject: catatan };

      // Height-work: sertakan checklist Helm, Body Harness & Lanyard saat Admin K3 approve
      if (jenisForm === "height-work" && user?.role === "admin_k3" && action === "approve") {
        patchBody.harness_checklist = {
          helm_kondisi_baik:                harness.helm,
          webbing_kondisi_baik:             harness.webbing,
          dring_kondisi_baik:               harness.dring,
          gesper_kondisi_baik:              harness.gesper,
          absorter_dan_timbes_kondisi_baik: harness.absorber,
          snap_hook_kondisi_baik:           harness.snapHook,
          rope_lanyard_kondisi_baik:        harness.rope,
        };
      }

      const res = await fetch(`/api/approval/${jenisForm}/${id}`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(action === "approve" ? "approved" : "rejected");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    sessionStorage.clear();
    window.location.href = "/login/approver";
  };

  // ── Auth Loading ──────────────────────────────────────────
  if (authLoading || !user) return <AuthLoadingSpinner />;

  // ── Data Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 text-orange-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Memuat data review izin kerja...</p>
      </div>
    );
  }

  // ── Done Screen ───────────────────────────────────────────
  if (done) {
    const isApproved = done === "approved";
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-8 sm:p-10 max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-200">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isApproved ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
          }`}>
            {isApproved ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            {isApproved ? "Berhasil Disetujui!" : "Form Ditolak"}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
            {isApproved
              ? `Form ${id} telah berhasil disetujui dan dialihkan ke tahap alur selanjutnya.`
              : `Form ${id} telah ditolak dengan catatan yang tercatat di sistem.`}
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/approval"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition-all"
            >
              ← Kembali ke Dashboard Approval
            </Link>
            <button
              onClick={() => { setDone(null); loadForm(); }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Lihat Ringkasan Formulir Ini
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form Not Found ────────────────────────────────────────
  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-lg">Form Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            Form dengan nomor {id} tidak ditemukan atau Anda tidak memiliki akses ke departemen ini.
          </p>
          {error && <p className="text-xs text-rose-600 font-mono mt-2">{error}</p>}
        </div>
        <Link
          href="/approval"
          className="px-5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-colors"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  // ── Form & User Data Mapping ──────────────────────────────
  const isEksternal = form?.tipe_perusahaan === "eksternal" || form?.petugas_ketinggian === "eksternal";
  const userRole    = user.role;
  const userNama    = user.nama || user.username;
  const userNik     = user.nik ?? "";
  const userJabatan = user.jabatan;

  const currentDbStage = form.current_stage ?? 1;
  const statusMeta = statusConfig[form.status] || statusConfig.submitted;

  // Stages approval pipeline
  const stages: { label: string; key: string; icon: string; dbStage: number; roleName: string }[] = [
    { label: "SPV",      key: "spv",      icon: "👷", dbStage: 1, roleName: "SPV / Pemberi Izin" },
    { label: "Admin K3", key: "admin_k3", icon: "🛡️", dbStage: 2, roleName: "Admin K3" },
    { label: "SFO",      key: "sfo",      icon: "🔒", dbStage: 3, roleName: "SFO" },
    { label: "SMR / PGA",key: "mr_pga",   icon: "✅", dbStage: 4, roleName: "SMR / PGA Manager" },
  ];

  const stageRoleNames: Record<number, string> = {
    1: "SPV / Pemberi Izin",
    2: "Admin K3",
    3: "SFO",
    4: "SMR / PGA Manager",
  };
  const waitingRoleName = stageRoleNames[currentDbStage] || `Tahap ${currentDbStage}`;

  const isAlreadyApprovedByMe =
    userRole === "spv" ? isTruthy(form.spv_approved) :
    userRole === "admin_k3" ? isTruthy(form.admin_k3_approved) :
    userRole === "sfo" ? isTruthy(form.sfo_approved) :
    userRole === "smr" ? (isTruthy(form.mr_pga_approved) || isTruthy(form.pga_approved)) :
    false;

  const myApprovalDetails =
    userRole === "spv" ? { by: form.spv_approved_by, at: form.spv_approved_at, nik: form.spv_nik } :
    userRole === "admin_k3" ? { by: form.admin_k3_approved_by, at: form.admin_k3_approved_at, nik: form.admin_k3_nik } :
    userRole === "sfo" ? { by: form.sfo_approved_by, at: form.sfo_approved_at, nik: form.sfo_nik } :
    userRole === "smr" ? { by: form.mr_pga_approved_by || form.pga_approved_by, at: form.mr_pga_approved_at || form.pga_approved_at, nik: form.mr_pga_nik } :
    null;

  const roleToStageNumber: Partial<Record<string, number>> = {
    spv: 1,
    admin_k3: 2,
    sfo: 3,
    smr: 4,
  };
  const myExpectedStage = roleToStageNumber[userRole];
  const isMyTurn = userRole === "admin" || (myExpectedStage !== undefined && currentDbStage === myExpectedStage && !isAlreadyApprovedByMe);

  // Height-work inspection state
  const heightWorkAdminK3Stage = 2;
  const harnessAlreadyApproved = isTruthy(form.admin_k3_approved);
  const isAdminK3TurnForHarness =
    isHeightWork &&
    userRole === "admin_k3" &&
    form.status === "submitted" &&
    currentDbStage === heightWorkAdminK3Stage;

  const isFirewatchRole = userRole === "firewatch" || userRole === "worker";

  // Petugas Ketinggian List
  const petugasList = isHeightWork
    ? Array.from({ length: 10 })
        .map((_, i) => {
          const idx = i + 1;
          const nama = form[`nama_petugas_${idx}`];
          if (!nama) return null;
          return {
            idx,
            nama,
            sehat: isTruthy(form[`petugas_${idx}_sehat`]),
            foto: form[`foto_lisensi_${idx}`] as string | null,
          };
        })
        .filter(Boolean) as { idx: number; nama: string; sehat: boolean; foto: string | null }[]
    : [];

  const areaBerisikoBadges = [
    { label: "Ruang Tertutup",        active: isTruthy(form.ruang_tertutup) },
    { label: "Bahan Mudah Terbakar",  active: isTruthy(form.bahan_mudah_terbakar) },
    { label: "Gas/Bejana/Tangki",     active: isTruthy(form.gas_bejana_tangki) },
    { label: "Ketinggian",            active: isTruthy(form.height_work) },
    { label: "Cairan/Gas Bertekanan", active: isTruthy(form.cairan_gas_bertekan) },
    { label: "Cairan Hydrocarbon",    active: isTruthy(form.cairan_hydrocarbon) },
  ];

  const peralatanKhususBadges = [
    { label: "Preventive Genset Pump Room", active: isTruthy(form.preventive_genset_pump_room) },
    { label: "Tangki Solar",                 active: isTruthy(form.tangki_solar) },
    { label: "Panel Listrik",                active: isTruthy(form.panel_listrik) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/60 pb-16">
      {/* ── STICKY TOP BAR ────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/approval"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors shrink-0"
              title="Kembali ke Dashboard Approval"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  {id}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badge}`}
                >
                  <FormIcon className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} animate-pulse`} />
                  <span>{statusMeta.label}</span>
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    isEksternal
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {getTipeLabel(form.tipe_perusahaan)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span>Diajukan: {formatDate(form.tanggal || form.created_at)}</span>
                {form.lokasi_pekerjaan && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {form.lokasi_pekerjaan}
                    </span>
                  </>
                )}
                {form.id_ijin_kerja && (
                  <>
                    <span>•</span>
                    <span className="text-orange-600 font-mono font-semibold">
                      Induk: {form.id_ijin_kerja}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadForm()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title="Cetak Formulir"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak</span>
            </button>

            {/* Approver Identity Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-orange-50/70 border border-orange-200/80">
              <div className="w-6 h-6 rounded-lg bg-orange-500 text-white font-bold text-[11px] flex items-center justify-center">
                {userNama ? userNama.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {userNama}
                </p>
                <p className="text-[9px] font-semibold text-orange-700 leading-tight">
                  {roleLabel[userRole] || userRole}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-semibold"
              title="Keluar dari sesi approver"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Error notification banner */}
        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ── HERO STEPPER: STATUS ALUR PERSETUJUAN ────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Status Alur Persetujuan Resmi
              </span>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                Pipeline Verifikasi Bertahap
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Tahap Saat Ini:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span>{waitingRoleName}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stages.map((stage) => {
              const approvedKey = `${stage.key}_approved`;
              const approvedByKey = `${stage.key}_approved_by`;
              const isApproved =
                isTruthy(form[approvedKey]) ||
                (stage.key === "mr_pga" && isTruthy(form.pga_approved)) ||
                form.status === "approved" ||
                currentDbStage > stage.dbStage;
              const approverName = form[approvedByKey] || (stage.key === "mr_pga" ? form.pga_approved_by : null);
              const isCurrent = currentDbStage === stage.dbStage && form.status === "submitted";
              const isRejected = form.status === "rejected";

              return (
                <div
                  key={stage.key}
                  className={`relative p-3.5 rounded-xl border transition-all ${
                    isApproved
                      ? "bg-emerald-50/50 border-emerald-300 text-emerald-950"
                      : isCurrent && !isRejected
                      ? "bg-amber-50/50 border-amber-300 text-amber-950 ring-2 ring-amber-200/50 shadow-2xs"
                      : isRejected && isCurrent
                      ? "bg-rose-50/50 border-rose-300 text-rose-950"
                      : "bg-slate-50/60 border-slate-200/80 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm">{stage.icon}</span>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai
                      </span>
                    ) : isCurrent && !isRejected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-amber-600 animate-spin" /> Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Tahap {stage.dbStage}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm truncate">{stage.label}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {isApproved && approverName ? (
                      <span className="text-emerald-700 font-semibold">{approverName}</span>
                    ) : isCurrent && !isRejected ? (
                      <span className="text-amber-700 font-medium">Menunggu Keputusan</span>
                    ) : (
                      stage.roleName
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PANEL KEPUTUSAN APPROVAL (ACTION CARD) ──────────── */}
        {form.status === "approved" ? (
          <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-emerald-950 text-base sm:text-lg">
                  Form Izin Kerja Telah Disetujui Sepenuhnya
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                  Seluruh tahapan verifikasi telah lengkap. Izin kerja ini sah, aktif, dan dapat digunakan di area kerja sesuai jadwal yang tertera.
                </p>
              </div>
            </div>
          </div>
        ) : form.status === "rejected" ? (
          <div className="bg-rose-50 rounded-2xl border-2 border-rose-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-rose-950 text-base sm:text-lg">
                  Permohonan Izin Kerja Ditolak
                </h3>
                <p className="text-xs sm:text-sm text-rose-800 mt-0.5">
                  Form ini ditolak oleh <strong>{form.approved_by || "Approver"}</strong>.
                </p>
                {form.catatan_reject && (
                  <div className="mt-3 p-3.5 bg-white/90 rounded-xl border border-rose-200 text-xs sm:text-sm text-rose-900">
                    <span className="font-bold block mb-0.5">Alasan Penolakan:</span>
                    {form.catatan_reject}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isAlreadyApprovedByMe ? (
          <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-300 p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-emerald-950 text-base sm:text-lg">
                    Anda Telah Menyetujui Formulir Ini
                  </h3>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Disetujui ({roleLabel[userRole] || userRole})
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 mt-1">
                  Persetujuan Anda telah tercatat atas nama <strong>{myApprovalDetails?.by || userNama}</strong>
                  {myApprovalDetails?.nik && <> (NIK: <span className="font-mono">{myApprovalDetails.nik}</span>)</>}
                  {myApprovalDetails?.at && <> pada <strong>{formatDate(myApprovalDetails.at)}</strong></>}.
                </p>
                <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Status saat ini: Menunggu persetujuan dari <strong>{waitingRoleName}</strong> (Tahap {currentDbStage}).
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : !isMyTurn ? (
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-2xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Belum Giliran Verifikasi Anda
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Anda login sebagai <strong>{roleLabel[userRole] || userRole}</strong>. Form ini saat ini sedang dalam proses review oleh <strong>{waitingRoleName}</strong> (Tahap {currentDbStage}).
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Tombol persetujuan akan aktif secara otomatis setelah tahap verifikasi sebelumnya telah disetujui.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* USER'S TURN TO APPROVE */
          <div className="bg-white rounded-2xl border-2 border-orange-300/80 p-5 sm:p-6 shadow-md shadow-orange-500/5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                  Keputusan Verifikasi
                </span>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Panel Tindakan Persetujuan
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-orange-100 text-orange-800 border border-orange-200">
                  {roleLabel[userRole] || userRole}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Anda bertindak sebagai: <strong>{userNama}</strong>
              {userNik && <> (NIK: <span className="font-mono">{userNik}</span>)</>}
              {userJabatan && <> — Jabatan: <strong>{userJabatan}</strong></>}.
            </p>

            {/* Checklist Helm, Body Harness & Lanyard KHUSUS Admin K3 saat Height Work */}
            {isAdminK3TurnForHarness && !showReject && (
              <div className="mb-5 p-4 rounded-xl bg-orange-50/60 border border-orange-200 space-y-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Checklist Pemeriksaan Fisik Helm, Body Harness &amp; Lanyard (Bagian 5)
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sebagai Admin K3, periksa kondisi fisik peralatan berikut dan centang item yang layak pakai sebelum menyetujui.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {/* Helm */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      1. Pelindung Kepala
                    </p>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={harness.helm}
                        onChange={(e) => setHarness((p) => ({ ...p, helm: e.target.checked }))}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 shrink-0 mt-0.5"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Helm kondisi baik (tidak retak, tali pengait kokoh)
                      </span>
                    </label>
                  </div>

                  {/* Body Harness */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      2. Body Harness
                    </p>
                    {[
                      { key: "webbing", label: "Webbing (jahitan baik, tidak terpotong)" },
                      { key: "dring",   label: "D-Ring (tidak retak, tidak berkarat)" },
                      { key: "gesper",  label: "Adjustment Buckle (mengunci kuat)" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(harness as any)[item.key]}
                          onChange={(e) => setHarness((p) => ({ ...p, [item.key]: e.target.checked }))}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 shrink-0 mt-0.5"
                        />
                        <span className="text-xs text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Lanyard */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      3. Lanyard &amp; Hooks
                    </p>
                    {[
                      { key: "absorber", label: "Absorber & Timbles kondisi baik" },
                      { key: "snapHook", label: "Snap Hook (mengunci sempurna)" },
                      { key: "rope",     label: "Rope Lanyard (tidak berserabut)" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(harness as any)[item.key]}
                          onChange={(e) => setHarness((p) => ({ ...p, [item.key]: e.target.checked }))}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 shrink-0 mt-0.5"
                        />
                        <span className="text-xs text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input Alasan Penolakan */}
            {showReject && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 animate-in fade-in">
                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Catatan Alasan Penolakan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Jelaskan secara spesifik alasan form ini ditolak agar pemohon dapat memperbaiki..."
                  className="w-full px-3.5 py-2.5 border border-rose-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent text-slate-900 bg-white resize-none"
                />
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex items-center gap-3 flex-wrap">
              {!showReject ? (
                <>
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      Setujui Form {userRole !== "admin" ? `(${roleLabel[userRole] || userRole})` : "sebagai Admin"}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowReject(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 border-2 border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs sm:text-sm transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Form</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={submitting || !catatan.trim()}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-sm"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>Konfirmasi Tolak Form</span>
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setCatatan(""); setError(""); }}
                    className="px-4 py-3 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TWO-TAB NAVIGATION ──────────────────────────────── */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("detail")}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "detail"
                ? "border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Rincian &amp; Formulir Izin Kerja</span>
          </button>

          <button
            onClick={() => setActiveTab("lampiran")}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "lampiran"
                ? "border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl"
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Dokumen &amp; Form Terkait</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {isHeightWork ? "JSA & Lisensi" : "JSA"}
            </span>
          </button>
        </div>

        {/* ── TAB 1: RINCIAN FORMULIR ─────────────────────────── */}
        {activeTab === "detail" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {isHotOrWorkshop ? (
              <>
                {/* Bagian 1: Identitas & Registrasi */}
                <SectionCard title="Bagian 1: Identitas & Registrasi Pekerjaan" icon={User} badge="Wajib">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <Field label="No. Registrasi" value={form.id_form} mono />
                    <Field label="Tipe Perusahaan" value={form.tipe_perusahaan === "eksternal" ? "Eksternal / Subkontraktor" : "Internal / PT. JAI"} />
                    <Field label="Perusahaan / Kontraktor" value={form.nama_kontraktor_nik || form.kontraktor || "-"} />
                    <Field label="Nama Pekerja" value={form.nama_pekerja_nik || "-"} />
                    <Field label="NIK Pekerja" value={form.nik_pekerja || form.kontraktor_nik || "-"} mono />
                    <Field label="Lokasi Pekerjaan" value={form.lokasi_pekerjaan || "-"} />
                    <Field label="Tanggal Diajukan" value={formatDate(form.tanggal)} />
                    <Field label="Tanggal Pelaksanaan" value={formatDate(form.tanggal_pelaksanaan)} />
                    <Field label="Waktu Mulai" value={formatTime(form.waktu_pukul)} />
                    <Field label="Waktu Selesai" value={formatTime(form.waktu_selesai)} />
                    {form.id_ijin_kerja && <Field label="Izin Induk (Parent)" value={form.id_ijin_kerja} mono />}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-blue-900">Petugas Fire Watch</span>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                          Pengawas
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Field label="Nama" value={form.nama_fire_watch || "Belum diisi"} />
                        <Field label="NIK" value={form.nik_fire_watch || "Belum diisi"} mono />
                      </div>
                      {form.tanda_tangan_fw && (
                        <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-blue-800">Tanda Tangan Fire Watch:</span>
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ src: resolveFileUrl(form.tanda_tangan_fw), label: `Tanda Tangan Fire Watch — ${form.nama_fire_watch || ""}` })}
                            className="p-1 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors shadow-2xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={resolveFileUrl(form.tanda_tangan_fw)} alt="TTD Fire Watch" className="h-8 w-auto object-contain" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-900">Pemberi Izin (SPV Terkait)</span>
                        </div>
                        {isTruthy(form.spv_approved) ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                            ✓ Disetujui
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-semibold">
                            Menunggu SPV
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <Field label="Nama SPV" value={form.spv_terkait || form.spv_approved_by || "Belum diisi"} />
                        <Field label="Jabatan" value={form.jabatan_pemberi_izin || "Supervisor Area"} />
                        <Field label="NIK SPV" value={form.nik_pemberi_ijin || form.spv_nik || "Belum diisi"} mono />
                      </div>
                    </div>
                  </div>

                  {form.kontraktor_signature_url && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Tanda Tangan Digital Pemohon / Kontraktor
                        </span>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          Disahkan oleh: {form.nama_pekerja_nik || form.nama_kontraktor_nik || form.kontraktor || "Pemohon"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ src: resolveFileUrl(form.kontraktor_signature_url), label: `Tanda Tangan Pemohon — ${form.id_form}` })}
                        className="p-1 bg-white rounded-lg border border-slate-300 hover:border-orange-500 transition-colors shrink-0 shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveFileUrl(form.kontraktor_signature_url)} alt="TTD Kontraktor" className="h-9 w-auto object-contain" />
                      </button>
                    </div>
                  )}
                </SectionCard>

                {/* Bagian 2: Pekerjaan & Area Berisiko */}
                <SectionCard title="Bagian 2: Deskripsi Pekerjaan, Peralatan & Area Berisiko" icon={Flame}>
                  <div className="space-y-4">
                    {/* Ringkasan / Deskripsi Rinci Pekerjaan */}
                    {(form.deskripsi_pekerjaan || form.detail_cutting || form.detail_grinding || form.detail_welding || form.detail_painting || form.jenis_kerjaan_lainnya) && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-orange-600" />
                            Rincian Deskripsi &amp; Ruang Lingkup Pekerjaan
                          </span>
                          {form.id_ijin_kerja && (
                            <span className="text-[10px] font-mono font-semibold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded border border-orange-200">
                              Izin Induk: {form.id_ijin_kerja}
                            </span>
                          )}
                        </div>
                        {form.deskripsi_pekerjaan ? (
                          <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {form.deskripsi_pekerjaan}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Rincian operasi pekerjaan teknis tercantum pada masing-masing pos di bawah:
                          </p>
                        )}
                      </div>
                    )}

                    {/* Grid Detail Pekerjaan Panas / Workshop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { l: "Cutting (Pemotongan)",  d: form.detail_cutting,  m: form.t_mulai_cutting,  s: form.t_selesai_cutting  },
                        { l: "Grinding (Gerinda)",    d: form.detail_grinding, m: form.t_mulai_grinding, s: form.t_selesai_grinding },
                        { l: "Welding (Pengelasan)",  d: form.detail_welding,  m: form.t_mulai_welding,  s: form.t_selesai_welding  },
                        { l: "Painting (Pengecatan)", d: form.detail_painting, m: form.t_mulai_painting, s: form.t_selesai_painting },
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

                    {/* Painting Method */}
                    {isWorkshop && (isTruthy(form.painting_spray) || isTruthy(form.painting_non_spray)) && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-slate-500 font-semibold">Metode Pengecatan (Painting):</span>
                        {isTruthy(form.painting_spray) && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            SPRAY
                          </span>
                        )}
                        {isTruthy(form.painting_non_spray) && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            NON SPRAY
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pekerjaan Lainnya */}
                    {isTruthy(form.ada_kerja_lainnya) && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800 block mb-0.5">Pekerjaan Lainnya:</span>
                        <p className="text-slate-700 whitespace-pre-wrap">{form.jenis_kerjaan_lainnya || "-"}</p>
                      </div>
                    )}

                    {/* Peralatan & Fasilitas Khusus Terkait */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Peralatan &amp; Fasilitas Khusus Terkait
                      </span>
                      <BoolBadges items={peralatanKhususBadges} />
                    </div>

                    {/* Area Berisiko Tinggi */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Area Berisiko Tinggi
                      </span>
                      <BoolBadges items={areaBerisikoBadges} />
                    </div>

                    {/* Potensi Bahaya Lain */}
                    {form.bahaya_lain && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                        <span className="font-bold block mb-0.5">Potensi Bahaya Lain:</span>
                        <p className="whitespace-pre-wrap">{form.bahaya_lain}</p>
                      </div>
                    )}

                    {/* Permintaan Tambahan */}
                    {form.permintaan_tambahan && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <span className="font-bold block mb-0.5">Permintaan Tambahan:</span>
                        <p className="whitespace-pre-wrap">{form.permintaan_tambahan}</p>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Bagian 3: Upaya Pencegahan */}
                <SectionCard title="Bagian 3: Checklist Upaya Pencegahan Bahaya" icon={ShieldCheck}>
                  {isWorkshop ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <div className="grid grid-cols-[3rem_1fr_4.5rem] bg-slate-100 px-3 py-2 font-bold text-slate-700 border-b border-slate-200">
                        <span className="text-center">NO</span>
                        <span>ITEM PEMERIKSAAN CHECKLIST</span>
                        <span className="text-center">STATUS</span>
                      </div>
                      {WORKSHOP_CHECKLIST_ITEMS.map(([key, label], idx) => {
                        const checked = isTruthy(form.checklist_pencegahan?.[key] ?? form[key]);
                        return (
                          <div
                            key={key}
                            className="grid grid-cols-[3rem_1fr_4.5rem] px-3 py-2 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50/60"
                          >
                            <span className="text-center text-slate-400 font-mono font-medium">{idx + 1}</span>
                            <span className="text-slate-700 font-medium pr-2">{label}</span>
                            <span className="text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                  checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {checked ? "YA" : "TIDAK"}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs space-y-0">
                      <div className="grid grid-cols-[3.5rem_1fr_4.5rem] bg-slate-100 px-3 py-2 font-bold text-slate-700 border-b border-slate-200">
                        <span className="text-center">NO</span>
                        <span>ITEM PEMERIKSAAN CHECKLIST</span>
                        <span className="text-center">STATUS</span>
                      </div>
                      {HOT_WORK_CHECKLIST_ITEMS.map(([no, label, key]) => {
                        const checked = isTruthy(form[key]);
                        return (
                          <div
                            key={key}
                            className="grid grid-cols-[3.5rem_1fr_4.5rem] px-3 py-2 border-b border-slate-100 items-center hover:bg-slate-50/60"
                          >
                            <span className="text-center text-slate-400 font-mono font-medium">{no}</span>
                            <span className="text-slate-700 font-medium pr-2">{label}</span>
                            <span className="text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                  checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {checked ? "YA" : "TIDAK"}
                              </span>
                            </span>
                          </div>
                        );
                      })}

                      <div className="bg-orange-50/80 px-3 py-1.5 font-bold text-orange-900 text-[11px] border-b border-slate-200">
                        8. Pekerjaan Pada Ruangan Tertutup
                      </div>
                      {HOT_WORK_RUANG_TERTUTUP_ITEMS.map(([no, label, key]) => {
                        const checked = isTruthy(form[key]);
                        return (
                          <div
                            key={key}
                            className="grid grid-cols-[3.5rem_1fr_4.5rem] px-3 py-2 border-b border-slate-100 items-center hover:bg-slate-50/60"
                          >
                            <span className="text-center text-slate-400 font-mono font-medium">{no}</span>
                            <span className="text-slate-700 font-medium pr-2">{label}</span>
                            <span className="text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                  checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {checked ? "YA" : "TIDAK"}
                              </span>
                            </span>
                          </div>
                        );
                      })}

                      <div className="bg-orange-50/80 px-3 py-1.5 font-bold text-orange-900 text-[11px] border-b border-slate-200">
                        9. Pekerjaan Pada Dinding atau Langit-Langit
                      </div>
                      {HOT_WORK_DINDING_ITEMS.map(([no, label, key]) => {
                        const checked = isTruthy(form[key]);
                        return (
                          <div
                            key={key}
                            className="grid grid-cols-[3.5rem_1fr_4.5rem] px-3 py-2 border-b border-slate-100 items-center hover:bg-slate-50/60"
                          >
                            <span className="text-center text-slate-400 font-mono font-medium">{no}</span>
                            <span className="text-slate-700 font-medium pr-2">{label}</span>
                            <span className="text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                  checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {checked ? "YA" : "TIDAK"}
                              </span>
                            </span>
                          </div>
                        );
                      })}

                      {HOT_WORK_TAIL_ITEMS.map(([no, label, key]) => {
                        const checked = isTruthy(form[key]);
                        return (
                          <div
                            key={key}
                            className="grid grid-cols-[3.5rem_1fr_4.5rem] px-3 py-2 border-b border-slate-100 items-center hover:bg-slate-50/60"
                          >
                            <span className="text-center text-slate-400 font-mono font-medium">{no}</span>
                            <span className="text-slate-700 font-medium pr-2">{label}</span>
                            <span className="text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                  checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {checked ? "YA" : "TIDAK"}
                              </span>
                            </span>
                          </div>
                        );
                      })}

                      {(form.tidak_ada_cairan_mudah_terbakar !== undefined || form.lantai_bersih !== undefined || form.lembaran_dibawah_pekerjaan !== undefined) && (
                        <>
                          <div className="bg-orange-50/80 px-3 py-1.5 font-bold text-orange-900 text-[11px] border-b border-slate-200">
                            Pemeriksaan Area &amp; Penutup Tambahan
                          </div>
                          {[
                            ["Tidak ada cairan mudah terbakar di sekitar", "tidak_ada_cairan_mudah_terbakar"],
                            ["Lantai bersih dari serpihan / serbuk mudah terbakar", "lantai_bersih"],
                            ["Lembaran tahan api dipasang di bawah pekerjaan", "lembaran_dibawah_pekerjaan"],
                          ].map(([label, key]) => {
                            const val = form[key];
                            if (val === undefined || val === null) return null;
                            const checked = isTruthy(val);
                            return (
                              <div
                                key={key}
                                className="grid grid-cols-[3.5rem_1fr_4.5rem] px-3 py-2 border-b border-slate-100 items-center hover:bg-slate-50/60"
                              >
                                <span className="text-center text-slate-400 font-mono font-medium">•</span>
                                <span className="text-slate-700 font-medium pr-2">{label}</span>
                                <span className="text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                      checked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                    }`}
                                  >
                                    {checked ? "YA" : "TIDAK"}
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      <div className="grid grid-cols-[3.5rem_1fr_4.5rem] px-3 py-2 items-center">
                        <span className="text-center text-slate-400 font-mono font-medium">12</span>
                        <span className="text-slate-700 font-medium pr-2">Kondisi Fire Blanket / Perisai Metal</span>
                        <span className="text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              isTruthy(form.kondisi_fire_blanket) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isTruthy(form.kondisi_fire_blanket) ? "LAYAK" : "TIDAK"}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {isHotWork && form.jumlah_fire_blanket && (
                    <div className="mt-3">
                      <Field label="Jumlah Fire Blanket" value={`${form.jumlah_fire_blanket} Unit`} />
                    </div>
                  )}

                  {form.permintaan_tambahan && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <span className="font-bold">Permintaan Tambahan: </span>
                      {form.permintaan_tambahan}
                    </div>
                  )}
                </SectionCard>
              </>
            ) : (
              /* HEIGHT WORK SECTIONS */
              <>
                {/* Bagian 1: Informasi Pekerjaan */}
                <SectionCard title="Bagian 1: Informasi Pekerjaan di Ketinggian" icon={AlertTriangle} badge="Wajib">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="No. Registrasi" value={form.id_form} mono />
                    <Field label="Tipe Petugas" value={getTipeLabel(form.tipe_perusahaan || form.petugas_ketinggian)} />
                    <Field label="Lokasi" value={form.lokasi || "-"} />
                    <Field label="Tanggal Diajukan" value={formatDate(form.tanggal)} />
                    <Field label="Tanggal Pelaksanaan" value={formatDate(form.tanggal_pelaksanaan)} />
                    <Field label="Waktu Mulai" value={formatTime(form.waktu_mulai)} />
                    <Field label="Waktu Selesai" value={formatTime(form.waktu_selesai)} />
                    {isEksternal ? (
                      <>
                        <Field label="Perusahaan Kontraktor" value={form.nama_kontraktor || form.kontraktor || "-"} />
                        <Field label="Pengawas Kontraktor" value={form.nama_pengawas_kontraktor || "-"} />
                        <Field label="NIK Kontraktor" value={form.kontraktor_nik || "-"} mono />
                      </>
                    ) : (
                      <>
                        <Field label="Departemen" value={form.nama_departemen || "-"} />
                        <Field label="Pengawas Departemen" value={form.nama_pengawas_departemen || "-"} />
                      </>
                    )}
                    <Field
                      label="Kebutuhan Scaffolding"
                      value={
                        form.perlu_scaffolding ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs">
                              Ya (Perlu Inspeksi Scaffolding)
                            </span>
                            <Link
                              href="/pengawas/scaffolding"
                              className="text-xs text-orange-600 hover:text-orange-700 font-bold underline inline-flex items-center gap-0.5"
                            >
                              <span>Buka Inspeksi</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        ) : (
                          "Tidak Perlu"
                        )
                      }
                    />
                    <Field label="SPV Terkait" value={form.spv_terkait || form.spv_approved_by || "-"} />
                    <Field label="NIK SPV" value={form.spv_nik || "-"} mono />
                    {form.id_ijin_kerja && <Field label="Izin Induk (Parent)" value={form.id_ijin_kerja} mono />}
                  </div>

                  {/* Deskripsi Pekerjaan Ketinggian Penuh */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Deskripsi Rinci Pekerjaan Ketinggian
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
                      {form.deskripsi_pekerjaan || "Tidak ada rincian deskripsi pekerjaan tertulis."}
                    </p>
                  </div>

                  {form.kontraktor_signature_url && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Tanda Tangan Pemohon / Kontraktor
                        </span>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          Disahkan oleh: {form.nama_pengawas_kontraktor || form.nama_kontraktor || form.nama_pengawas_departemen || "Pemohon"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ src: resolveFileUrl(form.kontraktor_signature_url), label: `Tanda Tangan Pemohon — ${form.id_form}` })}
                        className="p-1 bg-white rounded-lg border border-slate-300 hover:border-orange-500 transition-colors shrink-0 shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveFileUrl(form.kontraktor_signature_url)} alt="TTD Kontraktor" className="h-9 w-auto object-contain" />
                      </button>
                    </div>
                  )}
                </SectionCard>

                {/* Bagian 2: Petugas Ketinggian */}
                <SectionCard
                  title="Bagian 2: Daftar Petugas Ketinggian & Status Kesehatan"
                  icon={User}
                  badge={`${petugasList.length} Petugas`}
                >
                  {petugasList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada daftar petugas diisi.</p>
                  ) : (
                    <div className="space-y-2">
                      {petugasList.map(({ idx, nama, sehat, foto }) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              {nama}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                sehat ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {sehat ? "✓ Sehat" : "✗ Tidak Sehat"}
                            </span>

                            {foto ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    src: resolveFileUrl(foto),
                                    label: `Lisensi Petugas — ${nama}`,
                                  })
                                }
                                className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100 transition-colors"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Lihat Lisensi</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Belum Ada Lisensi
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Bagian 3: Peminjaman APD */}
                <SectionCard title="Bagian 3: Peminjaman Alat Pelindung Diri (APD)" icon={HardHat}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field
                      label="Kunci Pagar Tangga Listrik"
                      value={isTruthy(form.ada_kunci_pagar) ? "Ada" : "Tidak Ada"}
                    />
                    <Field
                      label="Rompi Ketinggian"
                      value={isTruthy(form.ada_rompi_ketinggian) ? "Dipinjam" : "Tidak"}
                    />
                    {isTruthy(form.ada_rompi_ketinggian) && (
                      <Field label="Nomor Rompi" value={form.no_rompi || "-"} mono />
                    )}
                    <Field label="Jumlah Safety Helmet" value={`${form.jumlah_safety_helmet || 0} Unit`} />
                    <Field label="Jumlah Full Body Harness" value={`${form.jumlah_full_body_harness || 0} Unit`} />
                  </div>
                </SectionCard>

                {/* Bagian 4: Keselamatan Kerja Ketinggian */}
                <SectionCard title="Bagian 4: Checklist Keselamatan Kerja Ketinggian" icon={ShieldCheck}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    {[
                      { l: "Area kerja diperiksa dan aman", v: form.area_diperiksa_aman },
                      { l: "Paham cara memakai APAR", v: form.paham_cara_menggunakan_alat_pemadam_kebakaran },
                      { l: "Ada pekerjaan instalasi listrik", v: form.ada_kerja_listrik },
                      { l: "Prosedur LOTO diterapkan", v: form.prosedur_loto },
                      { l: "Menutupi area bawah dengan prisai", v: form.menutupi_area_bawah_prisai },
                      { l: "Safety line / perimeter terpasang", v: form.safetyline_tersedia },
                      { l: "Alat bantu kerja dalam kondisi aman", v: form.alat_bantu_kerja_aman },
                      { l: "Menggunakan rompi saat bekerja", v: form.menggunakan_rompi },
                      { l: "Beban bawaan tidak melebihi 5 kg", v: form.beban_tidak_5kg },
                      { l: "Helm sesuai standar SOP", v: form.helm_sesuai_sop },
                      { l: "Rambu-rambu keselamatan tersedia", v: form.rambu2_tersedia },
                    ].map((item, idx) => {
                      const active = isTruthy(item.v);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                        >
                          <span className="text-slate-700 font-medium pr-2">{item.l}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {active ? "YA" : "TIDAK"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                {/* Bagian 5: Pengecekan Helm, Body Harness & Lanyard */}
                <SectionCard
                  title="Bagian 5: Pengecekan Helm, Body Harness & Lanyard (Admin K3)"
                  icon={Shield}
                  badge={harnessAlreadyApproved ? "✓ Selesai Diperiksa" : "Menunggu Admin K3"}
                >
                  {harnessAlreadyApproved ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Helm
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-700">Helm Kondisi Baik</span>
                            <span className={`font-bold ${isTruthy(form.helm_kondisi_baik) ? "text-emerald-600" : "text-rose-600"}`}>
                              {isTruthy(form.helm_kondisi_baik) ? "✓ YA" : "✗ TIDAK"}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Body Harness
                          </p>
                          {[
                            { l: "Webbing baik", v: form.webbing_kondisi_baik },
                            { l: "D-Ring baik",  v: form.dring_kondisi_baik },
                            { l: "Gesper baik",  v: form.gesper_kondisi_baik },
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Lanyard
                          </p>
                          {[
                            { l: "Absorber & Timbles", v: form.absorter_dan_timbes_kondisi_baik },
                            { l: "Snap Hook",          v: form.snap_hook_kondisi_baik },
                            { l: "Rope Lanyard",       v: form.rope_lanyard_kondisi_baik },
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

                      {form.admin_k3_approved_by && (
                        <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            Diverifikasi oleh Admin K3: <strong>{form.admin_k3_approved_by}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        Pemeriksaan fisik peralatan ini akan diisi dan disetujui secara resmi oleh <strong>Admin K3</strong> saat tahap approval kedua.
                      </span>
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        )}

        {/* ── TAB 2: DOKUMEN & FORM TERKAIT (SPLIT-VIEW) ─────── */}
        {activeTab === "lampiran" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-150">
            {/* Left Nav Switcher */}
            <div className="lg:col-span-4 space-y-2">
              <button
                type="button"
                onClick={() => setActiveLampiranTab("jsa")}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  activeLampiranTab === "jsa"
                    ? "bg-white border-orange-500 shadow-sm ring-1 ring-orange-400"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      JSA
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Job Safety Analysis</h4>
                      <p className="text-[11px] text-slate-500">Analisa bahaya &amp; mitigasi kerja</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {isHeightWork && (
                <button
                  type="button"
                  onClick={() => setActiveLampiranTab("lisensi")}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    activeLampiranTab === "lisensi"
                      ? "bg-white border-orange-500 shadow-sm ring-1 ring-orange-400"
                      : "bg-white/80 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                        LIS
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Lisensi Ketinggian</h4>
                        <p className="text-[11px] text-slate-500">{petugasList.length} Petugas terdaftar</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              )}

              {form.id_ijin_kerja && (
                <button
                  type="button"
                  onClick={() => setActiveLampiranTab("parent")}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    activeLampiranTab === "parent"
                      ? "bg-white border-orange-500 shadow-sm ring-1 ring-orange-400"
                      : "bg-white/80 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Izin Kerja Induk</h4>
                        <p className="text-[11px] text-slate-500 font-mono">{form.id_ijin_kerja}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              )}
            </div>

            {/* Right Document Display Pane */}
            <div className="lg:col-span-8">
              {activeLampiranTab === "jsa" && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-slate-900 text-sm">Dokumen Job Safety Analysis (JSA)</h3>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Lampiran Wajib
                    </span>
                  </div>

                  <JsaViewer
                    perluJsa={isTruthy(form.perlu_jsa)}
                    jsaData={form.jsa_data}
                    jsaFileUrl={form.jsa_file_url || form.jsa_data?.fileUrl}
                  />
                </div>
              )}

              {activeLampiranTab === "lisensi" && isHeightWork && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Galeri Lisensi Petugas Ketinggian</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Klik pada kartu untuk memperbesar foto kartu lisensi resmi.
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {petugasList.filter(p => p.foto).length} Lisensi Diunggah
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {petugasList.map(({ idx, nama, foto }) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{idx}. {nama}</span>
                          {foto ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  src: resolveFileUrl(foto),
                                  label: `Lisensi — ${nama}`,
                                })
                              }
                              className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
                            >
                              <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Tidak ada foto</span>
                          )}
                        </div>

                        {foto ? (
                          <div
                            onClick={() =>
                              setPreviewImage({
                                src: resolveFileUrl(foto),
                                label: `Lisensi — ${nama}`,
                              })
                            }
                            className="h-32 bg-slate-200 rounded-lg overflow-hidden cursor-pointer relative group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveFileUrl(foto)}
                              alt={`Lisensi ${nama}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <ZoomIn className="w-4 h-4" /> Klik Perbesar
                            </div>
                          </div>
                        ) : (
                          <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                            Belum diunggah
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeLampiranTab === "parent" && form.id_ijin_kerja && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Form Izin Kerja Induk Terhubung</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Izin khusus ini merupakan lampiran turunan dari Izin Kerja Eksternal induk.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {form.id_ijin_kerja}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        WP
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm">Ijin Kerja Eksternal</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{form.id_ijin_kerja}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Persetujuan yang Anda berikan pada form induk atau form khusus ini disinkronkan secara otomatis sesuai peran approval Anda.
                    </p>

                    <div className="pt-2">
                      <Link
                        href={`/approval/external/${form.id_ijin_kerja}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka &amp; Review Form Induk ({form.id_ijin_kerja})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <ImageLightbox
          src={previewImage.src}
          label={previewImage.label}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}