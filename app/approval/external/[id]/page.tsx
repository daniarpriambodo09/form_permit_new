// app/approval/external/[id]/page.tsx
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, CheckCircle, AlertCircle, Loader2, FileText,
  Shield, ClipboardList, XCircle, User, ChevronRight,
  FileCheck, ExternalLink, HardHat, Flame, Wrench,
  Building2, Calendar, Clock, Download, Check, Minus,
  Layers, AlertTriangle, Sparkles, FolderOpen, RefreshCw,
  LogOut, Phone, ShieldCheck, CheckCircle2, Paperclip,
  CalendarDays, MapPin, Eye, Trash2, X,
} from "lucide-react";
import { useApproverAuth } from "@/hooks/useApproverAuth";
import AuthLoadingSpinner from "@/components/AuthLoadingSpinner";
import Sidebar from "@/components/Sidebar";
import type { JsaData } from "@/components/JsaBuilderSection";
import JsaApprovalCard from "@/components/JsaApprovalCard";
import JsaViewer from "@/components/JsaViewer";
import SignaturePad from "@/components/SignaturePad";
import SafetyInductionSection, { createEmptySafetyInduction, type SafetyInductionData } from "@/components/SafetyInductionSection";
import PenilaianSubkontraktorSection, {
  createEmptyPenilaianSubkontraktor,
  type PenilaianSubkontraktorData,
} from "@/components/PenilaianSubkontraktorSection";
import NextApproverModal from "@/components/NextApproverModal";

const labels: Record<string, string> = {
  "hot-work": "Hot Work Permit",
  "height-work": "Kerja Ketinggian",
  workshop: "Workshop Permit",
};

const statusConfig: Record<string, { label: string; cls: string; dot: string; bg: string; text: string; border: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  submitted: { label: "Diajukan", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  approved: { label: "Disetujui Penuh", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

// ── Label & role per stage (form_ijin_kerja) ────────────────
const STAGE_LABEL: Record<number, string> = {
  1: "SPV",
  2: "Admin K3",
  3: "SFO",
  4: "SMR / PGA",
  5: "Security",
};
const STAGE_ROLE: Record<number, string> = {
  1: "spv",
  2: "admin_k3",
  3: "sfo",
  4: "smr",
  5: "security",
};

const formatDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (t?: string | null) => {
  if (!t) return "-";
  return String(t).slice(0, 5);
};

// ── Sub-component Card Wrapper ───────────────────────────────
function SectionCard({
  title,
  icon: Icon,
  children,
  badge,
  className = "",
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  badge?: string;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${className}`}>
      <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">{title}</h3>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

const isTruthy = (v: any): boolean => v === true || v === "t" || v === "true";

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
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${item.active
          ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-bold"
          : "bg-slate-50/80 text-slate-400 border-slate-200 line-through opacity-60"
          }`}
      >
        {item.active ? <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
        <span>{item.label}</span>
      </span>
    ))}
  </div>
);

export default function ExternalApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useApproverAuth();
  const [data, setData] = useState<{ general: any; attachments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Tab Utama: "detail" (Rincian Formulir) vs "lampiran" (Dokumen & Form Terkait)
  const [activeMainTab, setActiveMainTab] = useState<"detail" | "lampiran">("detail");
  // Sub-Tab Lampiran Terkait (Split View side menu)
  const [activeLampiran, setActiveLampiran] = useState<string>("linked-permits");

  const [safetyInduction, setSafetyInduction] = useState<SafetyInductionData>(createEmptySafetyInduction);
  const [penilaianData, setPenilaianData] = useState<PenilaianSubkontraktorData>(createEmptyPenilaianSubkontraktor);
  const [penilaianLoading, setPenilaianLoading] = useState(false);

  // ── Reject modal state (SPV/SFO/SMR) ────────────────────────
  const [showReject, setShowReject] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [pendingApproveSource, setPendingApproveSource] = useState<
    "general-permit" | "attachments" | "jsa" | "penilaian" | null
  >(null);

  // ── Signature pad state (Security) ──────────────────────────
  const [signSubmitting, setSignSubmitting] = useState(false);

  const isSecurity = user?.role === "security";
  const isAdmin = user?.role === "admin";

  const loadData = () =>
    fetch(`/api/approval/external/${id}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat form eksternal");
        setData(result.data);
        const general = result.data?.general;
        const rawSi = general?.safety_induction;
        const defaultSi = createEmptySafetyInduction();

        // Hubungkan data dari form ijin-kerja-eksternal
        const mergedSi: SafetyInductionData = {
          ...defaultSi,
          ...(rawSi || {}),
          namaSubcont: (rawSi?.namaSubcont && rawSi.namaSubcont.trim())
            ? rawSi.namaSubcont
            : (general?.nama_kontraktor_pekerja || ""),
          koordinatNoHp: (rawSi?.koordinatNoHp && rawSi.koordinatNoHp.trim())
            ? rawSi.koordinatNoHp
            : (general?.nama_pengawas_pic_subkont || ""),
          aktivitasPekerjaan: (rawSi?.aktivitasPekerjaan && rawSi.aktivitasPekerjaan.trim())
            ? rawSi.aktivitasPekerjaan
            : (general?.deskripsi_pekerjaan || ""),
          namaPekerja: Array.isArray(rawSi?.namaPekerja) && rawSi.namaPekerja.length === 14
            ? rawSi.namaPekerja
            : Array.from({ length: 14 }, (_, i) => rawSi?.namaPekerja?.[i] || ""),
        };
        setSafetyInduction(mergedSi);

        if (result.data?.general?.penilaian_subkontraktor) {
          const raw = result.data.general.penilaian_subkontraktor;
          const empty = createEmptyPenilaianSubkontraktor();
          setPenilaianData({
            entries: Array.isArray(raw?.entries) ? raw.entries : [],
            mengetahui: raw?.mengetahui ? { ...empty.mengetahui, ...raw.mengetahui } : empty.mengetahui,
          });
        }
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (authLoading || !user) return;
    loadData();
  }, [authLoading, user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!data?.general) return;
    setPdfLoading(true);
    try {
      const { generatePermitPdf } = await import("@/lib/generatePermitPdf");
      await generatePermitPdf(data.general, "general-permit");
    } catch (err: any) {
      console.error("[PDF Error]", err);
      alert("Gagal mengunduh PDF: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setPdfLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { }
    sessionStorage.clear();
    window.location.href = "/login/approver";
  };

  const nextApproverTargetRole: "sfo" | "smr" | null =
    user?.role === "admin_k3" || (isAdmin && Number(data?.general?.current_stage) === 2)
      ? "sfo"
      : user?.role === "sfo" || (isAdmin && Number(data?.general?.current_stage) === 3)
        ? "smr"
        : null;

  // ── SFO / Admin: Approve Form Penilaian Sub Kontraktor ────────
  const approvePenilaianSubkontraktor = async (nextApproverUserId?: number) => {
    if (nextApproverTargetRole && !nextApproverUserId) {
      setPendingApproveSource("penilaian");
      return;
    }
    setPenilaianLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/approval/external/${id}/penilaian-subkontraktor`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextApproverUserId ? { next_approver_user_id: nextApproverUserId } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyetujui Penilaian Sub Kontraktor");
      setPendingApproveSource(null);
      setMessage("Form Penilaian Sub Kontraktor dan seluruh lampiran terkait berhasil disetujui otomatis.");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPenilaianLoading(false);
    }
  };

  // ── Approve lampiran (hot-work, workshop, height-work) ────────
  const approveAttachments = async (nextApproverUserId?: number) => {
    if (!data) return;
    if (nextApproverTargetRole && !nextApproverUserId) {
      setPendingApproveSource("attachments");
      return;
    }
    setActionLoading(true);
    setError("");
    const results = await Promise.all(data.attachments.map(async (attachment) => {
      const response = await fetch(`/api/approval/${attachment.jenis_form}/${attachment.id_form}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          ...(nextApproverUserId ? { next_approver_user_id: nextApproverUserId } : {}),
        }),
      });
      return { ok: response.ok, body: await response.json() };
    }));
    const approved = results.filter((result) => result.ok).length;
    const failed = results.filter((result) => !result.ok);
    setPendingApproveSource(null);
    setMessage(`${approved} lampiran berhasil diproses${failed.length ? `. ${failed.length} lampiran belum dapat diproses karena belum giliran approval atau sudah diproses.` : "."} Status lampiran dan form induk telah disinkronkan.`);
    await loadData();
    setActionLoading(false);
  };

  // ── Approve JSA ───────────────────────────────────────────────
  const approveJsa = async (nextApproverUserId?: number) => {
    if (nextApproverTargetRole === "smr" && user?.role === "sfo" && !nextApproverUserId) {
      setPendingApproveSource("jsa");
      return;
    }
    setActionLoading(true);
    setError("");
    const response = await fetch(`/api/approval/external/${id}/jsa`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        ...(nextApproverUserId ? { next_approver_user_id: nextApproverUserId } : {}),
      }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "JSA tidak dapat disetujui");
    else {
      setPendingApproveSource(null);
      setMessage(`JSA dan seluruh lampiran terkait berhasil disetujui otomatis untuk role ${user?.role}.`);
      await loadData();
    }
    setActionLoading(false);
  };

  // ── Simpan Safety Induction (draft, tanpa approve) ─────────────
  const saveSafetyInduction = async (submit: boolean) => {
    const response = await fetch(`/api/approval/external/${id}/safety-induction`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safetyInduction, submit }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Safety Induction gagal disimpan");
    setSafetyInduction(result.data);
    setMessage(submit ? "Safety Induction berhasil disetujui." : "Safety Induction berhasil disimpan sebagai draft.");
    const refreshed = await fetch(`/api/approval/external/${id}`, { credentials: "include" });
    if (refreshed.ok) {
      const refreshedData = (await refreshed.json()).data;
      setData(refreshedData);
    }
  };

  // ── Tanda tangan Security + approve final Safety Induction ─────
  const signAndApproveSafetyInduction = async (dataUrl: string) => {
    const hasWorkers = Array.isArray(safetyInduction.namaPekerja) && safetyInduction.namaPekerja.some((n: string) => typeof n === "string" && n.trim().length > 0);
    if (!hasWorkers) {
      setError("Harap isi minimal 1 nama pekerja pada Daftar Nama Pekerja sebelum menandatangani & menyetujui.");
      return;
    }

    setSignSubmitting(true);
    setError("");
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, `signature-${id}.png`);
      fd.append("context", `security-${id}`);
      const uploadRes = await fetch("/api/upload/signature", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload tanda tangan gagal");

      const payload = {
        ...safetyInduction,
        namaSubcont: safetyInduction.namaSubcont || general.nama_kontraktor_pekerja || "",
        aktivitasPekerjaan: safetyInduction.aktivitasPekerjaan || general.deskripsi_pekerjaan || "",
        koordinatNoHp: safetyInduction.koordinatNoHp || general.nama_pengawas_pic_subkont || "",
      };

      const res = await fetch(`/api/approval/external/${id}/safety-induction/sign`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safetyInduction: payload, signatureUrl: uploadJson.url }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan tanda tangan");
      setMessage("Safety Induction berhasil ditandatangani & disetujui. Seluruh alur approval selesai dan form telah disetujui penuh.");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSignSubmitting(false);
    }
  };

  // ── SPV / SFO / SMR: approve / reject form induk ────────────────
  const handleGeneralPermitAction = async (action: "approve" | "reject", nextApproverUserId?: number) => {
    if (action === "reject" && !catatan.trim()) {
      setError("Catatan alasan penolakan wajib diisi.");
      return;
    }
    if (action === "approve" && nextApproverTargetRole && !nextApproverUserId) {
      setPendingApproveSource("general-permit");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/approval/general-permit/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          catatan_reject: catatan,
          ...(nextApproverUserId ? { next_approver_user_id: nextApproverUserId } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses approval");
      setPendingApproveSource(null);
      setMessage(action === "approve" ? "Form induk dan seluruh lampiran terkait berhasil disetujui otomatis." : "Form berhasil ditolak.");
      setShowReject(false);
      setCatatan("");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !user) return <AuthLoadingSpinner />;
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100/60 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 text-orange-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Memuat berkas form ijin kerja eksternal...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100/60 flex flex-col items-center justify-center gap-3 p-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="font-semibold text-slate-800">{error || "Form tidak ditemukan."}</p>
        <Link href="/approval" className="text-sm font-semibold text-orange-600 hover:underline">
          Kembali ke Daftar Approval
        </Link>
      </div>
    );
  }

  const general = data.general;
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];
  const jsa = (general.jsa_data as JsaData | null) || (general.perlu_jsa || general.jsa_file_url ? {
    area: "",
    jenisPekerjaan: "",
    sectDept: "",
    pic: "",
    petugas: [],
    rows: [],
    fileUrl: general.jsa_file_url || null,
    approval: {
      currentStage: 1,
      status: "submitted",
      catatanReject: null,
      firewatch: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
      spv: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
      sfo: { approved: false, approvedBy: null, approvedNik: null, approvedAt: null },
    },
  } : null);
  const pendingAttachments = attachments.some((att) => att.status === "submitted");
  const jsaApproval = jsa?.approval;
  const jsaRole: "firewatch" | "spv" | "sfo" | null =
    jsaApproval && typeof jsaApproval.currentStage === "number"
      ? (["firewatch", "spv", "sfo"] as const)[jsaApproval.currentStage - 1] ?? null
      : null;

  const isAssignedSpv =
    user.role !== "spv" ||
    isAdmin ||
    Boolean(
      !general.spv_terkait_pj ||
      general.spv_terkait_pj.trim() === "" ||
      (user.nama && general.spv_terkait_pj.trim().toLowerCase() === user.nama.trim().toLowerCase()) ||
      (user.username && general.spv_terkait_pj.trim().toLowerCase() === user.username.trim().toLowerCase()) ||
      ((user as any).nik && general.nik_spv_terkait_pj && String((user as any).nik).trim() === String(general.nik_spv_terkait_pj).trim())
    );

  const canApproveJsa = Boolean(
    jsaApproval &&
    jsaApproval.status === "submitted" &&
    (user?.role === jsaRole || isAdmin) &&
    (jsaRole !== "spv" || isAssignedSpv)
  );

  const siStatus = general.safety_induction?.status;
  const siApproved = siStatus === "approved";
  const siHasData = Boolean(general.safety_induction?.namaSubcont);

  const isPenilaianSfoApproved = Boolean(penilaianData?.mengetahui?.sfo?.nama);

  const currentStage: number = general.current_stage ?? 1;
  const isMyStageRole = STAGE_ROLE[currentStage] === user.role || isAdmin;
  const canActOnGeneralPermit =
    general.status === "submitted" &&
    ((currentStage >= 1 && currentStage <= 4) || (currentStage === 5 && isAdmin)) &&
    isMyStageRole &&
    (currentStage !== 1 || isAssignedSpv);

  // ── Helper lists for Section rendering ──
  const spesifikasiItems = [
    { label: "Area Workshop", val: general.spek_area_workshop },
    { label: "Ruang Tertutup (Confined Space)", val: general.spek_ruang_tertutup },
    { label: "Bekerja di Ketinggian", val: general.spek_ketinggian },
    { label: "Tegangan Tinggi", val: general.spek_tegangan_tinggi },
    { label: "Pemakaian LOTO", val: general.spek_pemakaian_loto },
    { label: "Penggunaan Forklift", val: general.spek_forklift },
    { label: "Temperatur Tinggi", val: general.spek_temperatur_tinggi },
  ];

  const parsedAlatLainnya = (() => {
    if (!general.alat_lainnya) return [];
    try {
      if (typeof general.alat_lainnya === "string" && general.alat_lainnya.trim().startsWith("[")) {
        const parsed = JSON.parse(general.alat_lainnya);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  })();

  const alatItems = [
    { label: "Mesin Potong", val: general.alat_mesin_potong, cond: general.alat_mesin_potong_kondisi },
    { label: "Mesin Las / Gerinda", val: general.alat_mesin_las_gerinda, cond: general.alat_mesin_las_gerinda_kondisi },
    { label: "Genset", val: general.alat_genset, cond: general.alat_genset_kondisi },
    { label: "Tabung Gas", val: general.alat_tabung_gas, cond: general.alat_tabung_gas_kondisi },
    { label: "Tangga Listrik / AWP", val: general.alat_tangga_listrik_awp, cond: general.alat_tangga_listrik_awp_kondisi },
    { label: "Forklift", val: general.alat_forklift, cond: general.alat_forklift_kondisi },
    { label: "Lift Barang", val: general.alat_lift_barang, cond: general.alat_lift_barang_kondisi },
    ...(parsedAlatLainnya.length > 0
      ? parsedAlatLainnya.map((it: any) => ({ label: it.nama, val: true, cond: it.kondisi }))
      : [{ label: general.alat_lainnya || "Alat Lainnya", val: Boolean(general.alat_lainnya), cond: general.alat_lainnya_kondisi }]),
  ];

  const bahanItems = [
    { label: "Mudah Terbakar", val: general.bahan_mudah_terbakar },
    { label: "Mudah Meledak", val: general.bahan_mudah_meledak },
    { label: "Kimia Beracun / Iritan", val: general.bahan_kimia_beracun_iritan },
    { label: general.bahan_lainnya ? `Lainnya: ${general.bahan_lainnya}` : null, val: Boolean(general.bahan_lainnya) },
  ].filter((b) => b.label !== null);

  const dampakItems = [
    { label: "Ledakan / Kebakaran", val: general.dampak_ledakan_kebakaran },
    { label: "Jatuh dari Ketinggian", val: general.dampak_jatuh_ketinggian },
    { label: "Kepala Tertimpa", val: general.dampak_kepala_tertimpa },
    { label: "Kaki Tertimpa", val: general.dampak_kaki_tertimpa },
    { label: "Tumpahan Oli / BBM / B3", val: general.dampak_tumpahan_oli_bbm_b3 },
    { label: "Tersengat Listrik", val: general.dampak_tersengat_listrik },
    { label: "Terjepit Mesin", val: general.dampak_terjepit_mesin },
    { label: "Tersayat / Tertusuk", val: general.dampak_tersayat_tertusuk },
    { label: "Infeksi Pernafasan", val: general.dampak_infeksi_pernafasan },
    { label: "Iritasi Mata", val: general.dampak_iritasi_mata },
    { label: "Radiasi Sinar Las", val: general.dampak_radiasi_sinar_las },
    { label: "Iritasi Kulit", val: general.dampak_iritasi_kulit },
    { label: "Kebisingan", val: general.dampak_kebisingan },
    { label: "Keracunan Zat Kimia", val: general.dampak_keracunan_zat_kimia },
    { label: general.dampak_lainnya ? `Lainnya: ${general.dampak_lainnya}` : null, val: Boolean(general.dampak_lainnya) },
  ].filter((d) => d.label !== null);

  const apdItems = [
    { label: "Helm Safety", val: general.apd_helm },
    { label: "Safety Shoes", val: general.apd_safety_shoes },
    { label: "Sepatu Karet", val: general.apd_sepatu_karet },
    { label: "Topi Kerja", val: general.apd_topi_kerja },
    { label: "Masker Biasa", val: general.apd_masker },
    { label: "Masker Kimia / Respirator", val: general.apd_masker_kimia },
    { label: "Kacamata Biasa", val: general.apd_kacamata_biasa },
    { label: "Kacamata Las", val: general.apd_kacamata_las },
    { label: "Ear Plug / Muff", val: general.apd_ear_plug },
    { label: "Sarung Tangan Standard (Gloves)", val: general.apd_gloves },
    { label: "Sarung Tangan Bintil", val: general.apd_sarung_tangan_bintil },
    { label: "Sarung Tangan Listrik", val: general.apd_sarung_tangan_listrik },
    { label: "Sarung Tangan Kulit", val: general.apd_sarung_tangan_kulit },
    { label: "Full Body Harness", val: general.apd_full_body_harness },
    { label: general.apd_lainnya ? `Lainnya: ${general.apd_lainnya}` : null, val: Boolean(general.apd_lainnya) },
  ].filter((a) => a.label !== null);

  const aparItems = [
    { label: "Dry Powder", val: general.apar_dry_powder },
    { label: "Gas Cair / CO2", val: general.apar_gas_cair },
    { label: "Tidak Perlu APAR", val: general.apar_tidak_perlu },
    { label: general.apar_lainnya ? `Lainnya: ${general.apar_lainnya}` : null, val: Boolean(general.apar_lainnya) },
  ].filter((a) => a.label !== null);

  const limbahItems = [
    { label: "Dikelola Kontraktor", val: general.limbah_kontraktor },
    { label: "Dikelola PT JAI", val: general.limbah_pt_jai },
    { label: "Dibuang ke Luar Area JAI", val: general.limbah_luar_jai },
    { label: general.limbah_lokasi_pt ? `Lokasi Limbah di Area JAI: ${general.limbah_lokasi_pt}` : null, val: Boolean(general.limbah_lokasi_pt) },
    { label: general.limbah_lainnya ? `Lainnya: ${general.limbah_lainnya}` : null, val: Boolean(general.limbah_lainnya) },
  ].filter((l) => l.label !== null);

  // ── Parse license files / sertifikasi jika ada ──
  const parsedLicenseFiles: Array<{ name?: string; url: string }> = (() => {
    if (Array.isArray(general.license_files)) {
      return general.license_files.filter((x: any) => x && typeof x.url === "string");
    }
    if (typeof general.license_files === "string") {
      try {
        const parsed = JSON.parse(general.license_files);
        if (Array.isArray(parsed)) {
          return parsed.filter((x: any) => x && typeof x.url === "string");
        }
      } catch { }
    }
    if (general.license_sertifikasi) {
      return [{ name: "Berkas Lisensi / Sertifikasi K3", url: general.license_sertifikasi }];
    }
    return [];
  })();

  // ── Daftar Jenis Lampiran & Form Terkait untuk Tab Dokumen (Model Split Side seperti form-files) ──
  const entriesCount = (penilaianData?.entries || []).filter((e) =>
    e && Object.values(e.items || {}).some((v) => v !== "")
  ).length;

  const lampiranItems = [
    // 1. Linked Job Permits
    {
      id: "linked-permits",
      title: "Izin Kerja Khusus",
      subtitle: "Hot Work, Ketinggian, Workshop",
      icon: Layers,
      badge: attachments.length > 0 ? `${attachments.length} Terhubung` : "0 Form",
      badgeColor: attachments.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
    },

    // 2. Job Safety Analysis (JSA)
    {
      id: "jsa",
      title: "Job Safety Analysis (JSA)",
      subtitle: general.perlu_jsa ? (general.jsa_file_url ? "Dokumen Terlampir" : "Analisis K3") : "Ketentuan JSA",
      icon: ClipboardList,
      badge: general.perlu_jsa ? (jsaApproval?.status === "approved" ? "✓ Approved" : "Aktif") : "Tidak Wajib",
      badgeColor: general.perlu_jsa ? (jsaApproval?.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800") : "bg-slate-100 text-slate-500",
    },

    // 3. Safety Induction Security
    {
      id: "safety-induction",
      title: "Safety Induction JAI/F-04/P.SHE-19 Rev. 1",
      subtitle: "Verifikasi Pos Security & Pekerja",
      icon: Shield,
      badge: siApproved ? "Terverifikasi" : siHasData ? "Draft" : "Belum Diisi",
      badgeColor: siApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
    },

    // 4. Penilaian Subkontraktor
    {
      id: "penilaian",
      title: "Penilaian Subkontraktor JAI/F-08/P.SHE-19 Rev. 1",
      subtitle: "Evaluasi Lapangan & Barcode",
      icon: FileCheck,
      badge: entriesCount > 0 ? `${entriesCount} Terisi` : isPenilaianSfoApproved ? "✓ SFO OK" : "Form K3",
      badgeColor: entriesCount > 0 || isPenilaianSfoApproved ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800",
    },

    // 5. Lisensi & Sertifikasi Pekerja
    ...(parsedLicenseFiles.length > 0 ? [{
      id: "license",
      title: "Lisensi & Sertifikasi K3",
      subtitle: `${parsedLicenseFiles.length} Berkas Kualifikasi`,
      icon: FileText,
      badge: `${parsedLicenseFiles.length} File`,
      badgeColor: "bg-purple-100 text-purple-800",
    }] : []),
  ];

  const cfg = statusConfig[general.status] || statusConfig.submitted;

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
                href="/approval"
                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl transition-colors shrink-0"
                title="Kembali ke Daftar Approval"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight truncate">
                    {general.id_form}
                  </h1>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
                    Ijin Kerja Eksternal
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                    <span>{cfg.label}</span>
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    Role: {user.role.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Kontraktor: <strong className="text-slate-600">{general.nama_kontraktor_pekerja || "-"}</strong> • Lokasi: <strong className="text-slate-600">{general.lokasi_pekerjaan || "-"}</strong>
                </p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95"
                title="Unduh Berkas Surat Izin Kerja Resmi (PDF)"
              >
                {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={loadData}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-colors"
                title="Segarkan Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Main Body Content ── */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 flex-1 min-w-0 max-w-full overflow-x-hidden">

          {/* ── Notification Feedback ── */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Terjadi Kesalahan</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}
          {message && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-800 flex items-start gap-2.5 shadow-2xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Berhasil</p>
                <p className="text-xs mt-0.5">{message}</p>
              </div>
            </div>
          )}

          {user.role === "spv" && currentStage === 1 && !isAssignedSpv && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs sm:text-sm text-amber-900 flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Bukan SPV Terkait yang Ditugaskan</p>
                <p className="text-xs mt-0.5">
                  Form pengajuan ini ditugaskan khusus kepada SPV Terkait: <strong>{general.spv_terkait_pj}</strong> {general.nik_spv_terkait_pj ? `(NIK: ${general.nik_spv_terkait_pj})` : ""}. Anda masuk sebagai <strong>{user.nama}</strong> ({user.role.toUpperCase()}) sehingga tidak memiliki hak approval pada tahap SPV.
                </p>
              </div>
            </div>
          )}

          {/* ── Hero Status & Approval Flow Banner ── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Ijin Kerja Eksternal (General Permit)</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      Subkontraktor Eksternal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kontraktor: <strong>{general.nama_kontraktor_pekerja || "-"}</strong> • Diajukan pada: <strong>{formatDate(general.tanggal || general.created_at)}</strong>
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`}></span>
                  <span className="text-xs font-bold">{cfg.label}</span>
                </div>
              </div>
            </div>

            {/* Catatan Penolakan jika ada */}
            {general.catatan_reject && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Catatan Penolakan / Revisi:</h4>
                  <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">{general.catatan_reject}</p>
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
                  Tahap Saat Ini: <strong className="text-slate-700">{STAGE_LABEL[currentStage] ?? `Tahap ${currentStage}`}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { num: 1, title: "SPV", isApproved: Boolean(general.spv_approved || general.status === "approved" || currentStage > 1), by: general.spv_approved_by, at: general.spv_approved_at },
                  { num: 2, title: "Admin K3", isApproved: Boolean(general.admin_k3_approved || general.status === "approved" || currentStage > 2), by: general.admin_k3_approved_by, at: general.admin_k3_approved_at },
                  { num: 3, title: "SFO", isApproved: Boolean(general.sfo_approved || general.status === "approved" || currentStage > 3), by: general.sfo_approved_by, at: general.sfo_approved_at },
                  { num: 4, title: "SMR / PGA", isApproved: Boolean(general.pga_approved || general.mr_pga_approved || general.status === "approved" || currentStage > 4), by: general.pga_approved_by || general.mr_pga_approved_by, at: general.pga_approved_at || general.mr_pga_approved_at },
                  { num: 5, title: "Security", isApproved: Boolean(general.security_approved || general.status === "approved"), by: general.security_approved_by, at: general.security_approved_at },
                ].map((step) => {
                  const isDone = step.isApproved;
                  const isCurrent = !isDone && general.status === "submitted" && currentStage === step.num;
                  const isRejected = general.status === "rejected" && currentStage === step.num && !isDone;

                  return (
                    <div
                      key={step.num}
                      className={`p-2.5 sm:p-3 rounded-xl border text-xs transition-all ${isDone
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                        : isRejected
                          ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-200"
                          : isCurrent
                            ? "bg-orange-50/80 border-orange-300 ring-2 ring-orange-200 text-orange-950"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tahap {step.num}</span>
                        {isDone ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        ) : isCurrent ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold truncate">{step.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {isDone ? (step.by || "Disetujui") : isCurrent ? "Menunggu Review" : "Menunggu Antrian"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Panel Keputusan Approval Form Induk ── */}
            {canActOnGeneralPermit && (
              <div className="pt-3 border-t border-slate-100">
                <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/60 to-white rounded-xl border border-orange-200/90 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                          Keputusan Approval — {STAGE_LABEL[currentStage]}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Anda masuk sebagai <strong>{user.nama}</strong> ({user.role.toUpperCase()})
                        {currentStage === 1 && general.spv_terkait_pj ? (
                          <> — Ditugaskan sebagai <strong>SPV Terkait: {general.spv_terkait_pj}</strong></>
                        ) : null}. Berikan keputusan persetujuan untuk form izin eksternal ini:
                      </p>
                    </div>

                    {!showReject && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleGeneralPermitAction("approve")}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>Setujui Form Induk ({STAGE_LABEL[currentStage]})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReject(true)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {showReject && (
                    <div className="mt-3 pt-3 border-t border-orange-200/70">
                      <label className="block text-xs font-bold text-rose-700 mb-1">
                        Catatan Alasan Penolakan <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Tuliskan alasan penolakan secara spesifik untuk pihak kontraktor..."
                        className="w-full px-3 py-2 border border-rose-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 focus:border-transparent text-slate-800 bg-white resize-none"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleGeneralPermitAction("reject")}
                          disabled={actionLoading || !catatan.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Konfirmasi Tolak Form
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowReject(false); setCatatan(""); setError(""); }}
                          className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isSecurity && currentStage === 5 && (
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-900">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="font-bold text-teal-950">Tahap Verifikasi Pos Security &amp; Safety Induction (JAI/F-04/P.SHE-19 Rev. 1)</p>
                    <p className="text-[11px] text-teal-800 mt-0.5">
                      Silakan periksa kartu identitas pekerja subkontraktor dan bubuhkan tanda tangan digital Security pada tab Dokumen &amp; Form Terkait → Safety Induction.
                    </p>
                    <p className="text-[11px] font-semibold text-teal-900 mt-1">
                      Area terbatas : Utility Area, Panel Utama, Tandon Air &amp; Water Treatment, IPAL (Hydro Kalva bio)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab("lampiran");
                    setActiveLampiran("safety-induction");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shrink-0 transition-all shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Buka Safety Induction</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Navigation Tabs Utama (Model My-Forms) ── */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-2">
            {[
              { id: "detail", label: "Rincian & Formulir Izin Kerja", icon: FileText },
              { id: "lampiran", label: "Dokumen & Form Terkait", icon: Paperclip, badge: `${lampiranItems.length} Lampiran` },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeMainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveMainTab(tab.id as any)}
                  className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${isSelected
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected
                        ? "bg-white/20 text-white"
                        : "bg-orange-100 text-orange-700 border border-orange-200"
                        }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════
              TAB 1: RINCIAN & FORMULIR IZIN KERJA EKSTERNAL LENGKAP
          ══════════════════════════════════════════════════════════ */}
          {activeMainTab === "detail" && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* ═══ BAGIAN 1: INFORMASI KONTRAKTOR & JADWAL KERJA ═══ */}
              <SectionCard title="Bagian 1: Informasi Kontraktor & Jadwal Kerja" icon={Building2} badge="Wajib">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="No. Registrasi / ID Form" value={general.id_form || general.no_registrasi} mono />
                  <Field label="Perusahaan / Kontraktor" value={general.nama_kontraktor_pekerja || general.nama_kontraktor || "-"} />
                  <Field label="Pengawas / PIC Subkont" value={general.nama_pengawas_pic_subkont || "-"} />
                  <Field label="No. Telepon Kontraktor / PIC" value={general.telepon_kontraktor || general.no_hp || "-"} />
                  <Field label="Jumlah Tenaga Kerja" value={general.jumlah_tenaga_kerja ? `${general.jumlah_tenaga_kerja} Orang` : "-"} />
                  <Field label="Tanggal Diajukan" value={formatDate(general.tanggal || general.created_at)} />
                  <Field label="Rencana Mulai Kerja" value={formatDate(general.tgl_mulai_kerja || general.izin_kerja_tanggal_dari)} />
                  <Field label="Rencana Akhir Kerja" value={formatDate(general.tgl_akhir_kerja_rencana || general.izin_kerja_tanggal_sampai)} />
                  <Field label="Jam Kerja" value={`${formatTime(general.jam_mulai_kerja || general.waktu_kerja || general.izin_kerja_dari)} – ${formatTime(general.jam_akhir_kerja || general.waktu_selesai || general.izin_kerja_sampai)}`} />
                  {general.actual_tanggal_kerja && (
                    <Field label="Aktual Tanggal Mulai Kerja" value={formatDate(general.actual_tanggal_kerja)} />
                  )}
                  {general.id_ijin_kerja && <Field label="Izin Induk (Parent)" value={general.id_ijin_kerja} mono />}
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 2: SPESIFIKASI PEKERJAAN ═══ */}
              <SectionCard title="Bagian 2: Spesifikasi & Deskripsi Pekerjaan" icon={ClipboardList}>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Deskripsi Rinci Pekerjaan
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed whitespace-pre-wrap">
                      {general.deskripsi_pekerjaan || "Tidak ada deskripsi pekerjaan tertulis."}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Kondisi Spesifikasi Area Kerja
                    </span>
                    <BoolBadges
                      items={[
                        { label: "Area Workshop", active: isTruthy(general.spek_area_workshop) },
                        { label: "Ruang Tertutup", active: isTruthy(general.spek_ruang_tertutup) },
                        { label: "Kerja Ketinggian", active: isTruthy(general.spek_ketinggian) },
                        { label: "Tegangan Listrik Tinggi", active: isTruthy(general.spek_tegangan_tinggi) },
                        { label: "Pemakaian LOTO", active: isTruthy(general.spek_pemakaian_loto) },
                        { label: "Alat Angkat / Forklift", active: isTruthy(general.spek_forklift) },
                        { label: "Temperatur Tinggi", active: isTruthy(general.spek_temperatur_tinggi) },
                      ]}
                    />
                  </div>

                  {general.spesifikasi_lainnya && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800 block mb-0.5">Spesifikasi Lainnya:</span>
                      <p className="text-slate-700 whitespace-pre-wrap">{general.spesifikasi_lainnya}</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 3: ALAT YANG DIPAKAI ═══ */}
              <SectionCard title="Bagian 3: Peralatan yang dipakai & Kondisi alat Kerja" icon={Wrench}>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Daftar Peralatan &amp; Status Kelayakan Fisik
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {[
                      { l: "Mesin Potong", v: general.alat_mesin_potong, cond: general.alat_mesin_potong_kondisi },
                      { l: "Mesin Las / Gerinda", v: general.alat_mesin_las_gerinda, cond: general.alat_mesin_las_gerinda_kondisi },
                      { l: "Genset", v: general.alat_genset, cond: general.alat_genset_kondisi },
                      { l: "Tabung Gas", v: general.alat_tabung_gas, cond: general.alat_tabung_gas_kondisi },
                      { l: "Tangga Listrik / AWP", v: general.alat_tangga_listrik_awp, cond: general.alat_tangga_listrik_awp_kondisi },
                      { l: "Forklift", v: general.alat_forklift, cond: general.alat_forklift_kondisi },
                      { l: "Lift Barang", v: general.alat_lift_barang, cond: general.alat_lift_barang_kondisi },
                      ...(parsedAlatLainnya.length > 0
                        ? parsedAlatLainnya.map((it: any) => ({ l: it.nama, v: true, cond: it.kondisi }))
                        : [{ l: general.alat_lainnya ? `Lainnya: ${general.alat_lainnya}` : null, v: Boolean(general.alat_lainnya), cond: general.alat_lainnya_kondisi }]),
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
                      {general.perlu_jsa
                        ? (general.jsa_file_url ? "File dokumen JSA terlampir secara digital" : "Analisis K3 / JSA terstruktur telah diisi")
                        : "Ketentuan JSA tidak diwajibkan untuk pekerjaan ini"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMainTab("lampiran");
                      setActiveLampiran("jsa");
                    }}
                    className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    Buka JSA
                  </button>
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 5: LOKASI & PENGAWAS DEPARTEMEN ═══ */}
              <SectionCard title="Bagian 5: Informasi Lokasi Proyek & Pengawas Departemen" icon={MapPin} badge="Wajib">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Lokasi Pekerjaan (Area Genba)" value={general.lokasi_pekerjaan || general.lokasi || "-"} />
                    <Field label="Departemen Pengawas" value={general.departemen_pengawas || "-"} />
                    <Field label="Pengawas Bagian PT. JAI" value={general.pengawas_bagian || general.pengawas_pekerjaan_user || "-"} />
                    <Field label="PIC LOTO / Station LOTO" value={general.pic_loto_station_loto || "-"} />
                    <Field label="Supervisor Terkait (PJ PT. JAI)" value={general.spv_terkait_pj || general.spv_approved_by || "-"} />
                    <Field label="NIK SPV Penanggung Jawab" value={general.nik_spv_terkait_pj || general.spv_nik || "-"} mono />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Tipe Lokasi Area Genba Spesifik
                    </span>
                    <BoolBadges
                      items={[
                        { label: "Dalam Gedung", active: isTruthy(general.lokasi_dalam_gedung) },
                        { label: "Luar Gedung", active: isTruthy(general.lokasi_luar_gedung) },
                        { label: "Luar Pagar Gedung", active: isTruthy(general.lokasi_luar_pagar_gedung) },
                        { label: "Di Atas Gedung / Rooftop", active: isTruthy(general.lokasi_di_atas_gedung) },
                      ]}
                    />
                    {general.lokasi_lainnya && (
                      <p className="text-xs text-slate-600 mt-1.5 italic">Lokasi Lainnya: {general.lokasi_lainnya}</p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 6: KARAKTER BAHAN ═══ */}
              <SectionCard title="Bagian 6: Karakter Bahan yang Dipakai" icon={AlertTriangle}>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Karakteristik Bahan Kimia / Material Berbahaya
                  </span>
                  <BoolBadges
                    items={[
                      { label: "Bahan Mudah Terbakar", active: isTruthy(general.bahan_mudah_terbakar) },
                      { label: "Bahan Mudah Meledak", active: isTruthy(general.bahan_mudah_meledak) },
                      { label: "Kimia Beracun / Iritan", active: isTruthy(general.bahan_kimia_beracun_iritan) },
                    ]}
                  />
                  {general.bahan_lainnya && (
                    <p className="text-xs text-slate-600 mt-1.5 italic">Bahan Lainnya: {general.bahan_lainnya}</p>
                  )}
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 7: POTENSI DAMPAK LK3 ═══ */}
              <SectionCard title="Bagian 7: Potensi Bahaya & Dampak LK3" icon={AlertCircle}>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Potensi Bahaya Teridentifikasi (15 Dampak)
                  </span>
                  <BoolBadges
                    items={[
                      { label: "Ledakan / Kebakaran", active: isTruthy(general.dampak_ledakan_kebakaran) },
                      { label: "Jatuh dari Ketinggian", active: isTruthy(general.dampak_jatuh_ketinggian) },
                      { label: "Kepala Tertimpa", active: isTruthy(general.dampak_kepala_tertimpa) },
                      { label: "Kaki Tertimpa", active: isTruthy(general.dampak_kaki_tertimpa) },
                      { label: "Tumpahan Oli / BBM / B3", active: isTruthy(general.dampak_tumpahan_oli_bbm_b3) },
                      { label: "Tersengat Listrik", active: isTruthy(general.dampak_tersengat_listrik) },
                      { label: "Terjepit Mesin", active: isTruthy(general.dampak_terjepit_mesin) },
                      { label: "Tersayat / Tertusuk", active: isTruthy(general.dampak_tersayat_tertusuk) },
                      { label: "Infeksi Pernafasan", active: isTruthy(general.dampak_infeksi_pernafasan) },
                      { label: "Iritasi Mata", active: isTruthy(general.dampak_iritasi_mata) },
                      { label: "Radiasi Sinar Las", active: isTruthy(general.dampak_radiasi_sinar_las) },
                      { label: "Iritasi Kulit", active: isTruthy(general.dampak_iritasi_kulit) },
                      { label: "Kebisingan", active: isTruthy(general.dampak_kebisingan) },
                      { label: "Keracunan Zat Kimia", active: isTruthy(general.dampak_keracunan_zat_kimia) },
                      { label: general.dampak_lainnya ? `Lainnya: ${general.dampak_lainnya}` : "Dampak Lainnya", active: Boolean(general.dampak_lainnya) },
                    ]}
                  />
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 8: APD WAJIB ═══ */}
              <SectionCard title="Bagian 8: Alat Pelindung Diri (APD) yang Wajib Digunakan" icon={HardHat}>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Alat Pelindung Diri (APD) Diwajibkan (15 Item)
                  </span>
                  <BoolBadges
                    items={[
                      { label: "Masker Debu", active: isTruthy(general.apd_masker) },
                      { label: "Masker Kimia / Respirator", active: isTruthy(general.apd_masker_kimia) },
                      { label: "Kacamata Safety", active: isTruthy(general.apd_kacamata_biasa) },
                      { label: "Kedok / Kacamata Las", active: isTruthy(general.apd_kacamata_las) },
                      { label: "Ear Plug / Muff", active: isTruthy(general.apd_ear_plug) },
                      { label: "Sarung Tangan Kerja", active: isTruthy(general.apd_gloves) },
                      { label: "Full Body Harness", active: isTruthy(general.apd_full_body_harness) },
                      { label: "Sarung Tangan Bintil", active: isTruthy(general.apd_sarung_tangan_bintil) },
                      { label: "Sarung Tangan Listrik", active: isTruthy(general.apd_sarung_tangan_listrik) },
                      { label: "Sarung Tangan Kulit", active: isTruthy(general.apd_sarung_tangan_kulit) },
                      { label: "Safety Helmet", active: isTruthy(general.apd_helm) },
                      { label: "Safety Shoes", active: isTruthy(general.apd_safety_shoes) },
                      { label: "Sepatu Karet Boots", active: isTruthy(general.apd_sepatu_karet) },
                      { label: "Topi Kerja", active: isTruthy(general.apd_topi_kerja) },
                      { label: general.apd_lainnya ? `Lainnya: ${general.apd_lainnya}` : "APD Lainnya", active: Boolean(general.apd_lainnya) },
                    ]}
                  />
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 9: UPLOAD LISENSI ═══ */}
              <SectionCard title="Bagian 9: Upload Lisensi & Sertifikasi Kompetensi" icon={FileText}>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3">
                  <div>
                    <span className="font-bold text-slate-800 block">Berkas Lisensi K3 Terlampir</span>
                    <p className="text-slate-500 mt-0.5">
                      {parsedLicenseFiles.length > 0
                        ? `${parsedLicenseFiles.length} berkas lisensi/sertifikasi kompetensi kualifikasi pekerja telah diunggah`
                        : "Tidak ada berkas lisensi / sertifikasi yang diunggah"}
                    </p>
                  </div>
                  {parsedLicenseFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMainTab("lampiran");
                        setActiveLampiran("license");
                      }}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      Buka Lisensi
                    </button>
                  )}
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 10: APAR ═══ */}
              <SectionCard title="Bagian 10: Kesiapan Alat Pemadam Api Ringan (APAR)" icon={Flame}>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Kebutuhan APAR
                  </span>
                  <BoolBadges
                    items={[
                      { label: "Dry Chemical Powder", active: isTruthy(general.apar_dry_powder) },
                      { label: "Gas Cair / CO2", active: isTruthy(general.apar_gas_cair) },
                      { label: "Tidak Memerlukan APAR", active: isTruthy(general.apar_tidak_perlu) },
                    ]}
                  />
                  {general.apar_lainnya && <p className="text-xs text-slate-500 mt-1.5 italic">Lainnya: {general.apar_lainnya}</p>}
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 11: PENGELOLAAN LIMBAH ═══ */}
              <SectionCard title="Bagian 11: Pengelolaan Limbah" icon={Trash2}>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Tanggung Jawab Pembuangan Limbah
                    </span>
                    <BoolBadges
                      items={[
                        { label: "Pihak Kontraktor", active: isTruthy(general.limbah_kontraktor) },
                        { label: "Pihak PT. JAI", active: isTruthy(general.limbah_pt_jai) },
                        { label: "Dibuang Keluar Area JAI", active: isTruthy(general.limbah_luar_jai) },
                      ]}
                    />
                    {general.limbah_lainnya && <p className="text-xs text-slate-500 mt-1.5 italic">Lainnya: {general.limbah_lainnya}</p>}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <Field
                      label="Lokasi Pembuangan Limbah di Area JAI"
                      value={general.limbah_lokasi_pt || "-"}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <Field label="Mulai Berlaku Izin" value={formatDate(general.tgl_mulai_kerja || general.izin_kerja_tanggal_dari)} />
                    <Field label="Sampai Dengan" value={formatDate(general.tgl_akhir_kerja_rencana || general.izin_kerja_tanggal_sampai)} />
                  </div>
                </div>
              </SectionCard>

              {/* ═══ BAGIAN 15: PERNYATAAN & KONFIRMASI IZIN KERJA ═══ */}
              <SectionCard title="Bagian 15: Pernyataan & Konfirmasi Izin Kerja" icon={ShieldCheck} badge="Wajib Konfirmasi">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Verifikasi Lapangan:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isTruthy(general.pernyataan_diperiksa) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {isTruthy(general.pernyataan_diperiksa) ? "✓ Telah Diperiksa & Disetujui di Lapangan" : "Belum Diverifikasi"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <Field
                      label="Pengawas Pekerjaan / User PT. JAI"
                      value={(() => {
                        const picSubkont = (general.nama_pengawas_pic_subkont || "").trim();
                        const pengawasBagian = (general.pengawas_bagian || "").trim();
                        if (picSubkont && pengawasBagian) {
                          return `${picSubkont} - ${pengawasBagian}`;
                        }
                        return general.pengawas_pekerjaan_user || picSubkont || pengawasBagian || "-";
                      })()}
                    />
                    <Field label="Pemohon Subkontraktor" value={general.nama_kontraktor_pekerja || general.nama_pengawas_pic_subkont || "-"} />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tanda Tangan Pemohon / Kontraktor
                      </span>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        Disahkan secara digital oleh: {general.nama_pengawas_pic_subkont || general.nama_kontraktor_pekerja || "Kontraktor"}
                      </p>
                    </div>
                    {general.kontraktor_signature_url ? (
                      <div className="border border-slate-300 rounded-lg p-2 bg-white text-center shrink-0">
                        <img src={general.kontraktor_signature_url} alt="TTD Kontraktor" className="h-12 w-auto object-contain mx-auto" />
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Tervalidasi Digital</span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        Tervalidasi Digital
                      </span>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Serah Terima Pengawas (Job Handover jika ada) */}
              {(general.handover_pengawas_lama || general.handover_pengawas_baru) && (
                <SectionCard title="Serah Terima Pengawas (Job Handover)" icon={User}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <Field label="Pengawas Lama" value={general.handover_pengawas_lama || "-"} />
                    <Field label="Pengawas Baru" value={general.handover_pengawas_baru || "-"} />
                    <Field label="Tanggal Handover" value={formatDate(general.handover_tanggal)} />
                    <Field label="Jam Handover" value={general.handover_jam || "-"} />
                  </div>
                </SectionCard>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: DOKUMEN & FORM TERKAIT (SPLIT-VIEW MODEL FORM-FILES)
          ══════════════════════════════════════════════════════════ */}
          {activeMainTab === "lampiran" && (
            <div className="flex flex-col lg:flex-row items-start gap-5 animate-in fade-in duration-200 w-full max-w-full min-w-0">

              {/* ── Sisi Kiri: Menu Jenis Lampiran (Side Nav Compact) ── */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-orange-600" />
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Berkas &amp; Lampiran</h3>
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
                          className={`w-full text-left p-3.5 transition-all flex items-start gap-3 border-l-4 cursor-pointer ${isSelected
                            ? "bg-orange-50/80 border-orange-500 text-slate-900 shadow-2xs"
                            : "border-transparent hover:bg-slate-50 text-slate-700"
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected
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
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-2 transition-transform ${isSelected ? "text-orange-600 translate-x-0.5" : "text-slate-300"
                            }`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-500 leading-relaxed hidden lg:block">
                  💡 Klik salah satu jenis lampiran untuk memeriksa lembar analisis JSA, Safety Induction Security, atau checklist penilaian subkontraktor.
                </div>
              </div>

              {/* ── Sisi Kanan: Tampilan Hasil Lampiran (Jauh Lebih Lebar) ── */}
              <div className="flex-1 w-full min-w-0 max-w-full space-y-4">

                {/* 1. LINKED JOB PERMITS (IZIN KERJA KHUSUS) */}
                {activeLampiran === "linked-permits" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Izin Kerja Khusus Terkait (Linked Permits)</h3>
                          <p className="text-[11px] text-slate-500">Izin spesifik (Hot Work, Height Work, Workshop) yang dinaungi izin induk ini</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {attachments.length} Form Terkait
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      {attachments.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 space-y-2">
                          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="text-sm font-medium">Belum ada form pekerjaan khusus yang terhubung.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {attachments.map((attachment) => {
                            const sc = statusConfig[attachment.status] || statusConfig.draft;
                            return (
                              <div
                                key={attachment.id_form}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/70 hover:bg-orange-50/50 rounded-xl border border-slate-200 transition-all"
                              >
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-slate-900">
                                      {labels[attachment.jenis_form] || attachment.jenis_form}
                                    </span>
                                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                                      {attachment.id_form}
                                    </span>
                                  </div>
                                  {attachment.lokasi_pekerjaan && (
                                    <p className="text-xs text-slate-500">Lokasi: {attachment.lokasi_pekerjaan}</p>
                                  )}
                                  <p className="text-xs text-slate-400">
                                    Tahap: <strong>{STAGE_LABEL[attachment.current_stage] ?? attachment.current_stage}</strong>
                                    {attachment.tipe_perusahaan && ` · ${attachment.tipe_perusahaan}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sc.cls}`}>
                                    {sc.label}
                                  </span>
                                  <Link
                                    href={`/approval/${attachment.jenis_form}/${attachment.id_form}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Review Izin Khusus</span>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isSecurity && attachments.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                          <p className="text-xs text-slate-500">
                            Anda dapat menyetujui seluruh lampiran yang sudah giliran secara serentak:
                          </p>
                          <button
                            type="button"
                            onClick={() => approveAttachments()}
                            disabled={!pendingAttachments || actionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {actionLoading ? "Memproses..." : "Approve Lampiran Yang Tersedia"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. JOB SAFETY ANALYSIS (JSA) */}
                {activeLampiran === "jsa" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden w-full max-w-full min-w-0">
                    <div className="bg-slate-50/70 border-b border-slate-200/70 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Job Safety Analysis (JSA)</h3>
                          <p className="text-[11px] text-slate-500">Analisa langkah kerja, potensi bahaya, dan pengendalian risiko K3</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${general.perlu_jsa ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                        {general.perlu_jsa ? "JSA Diwajibkan" : "Tidak Perlu JSA"}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-5 w-full max-w-full min-w-0 overflow-hidden">
                      <JsaViewer
                        perluJsa={Boolean(general.perlu_jsa)}
                        jsaData={jsa}
                        jsaFileUrl={general.jsa_file_url || (jsa as any)?.fileUrl || null}
                      />

                      {/* JSA Approvers Box */}
                      {general.perlu_jsa && !isSecurity && (
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Persetujuan Khusus JSA
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(["firewatch", "spv", "sfo"] as const).map((role) => {
                              const roleLabel: Record<string, string> = {
                                firewatch: "Pengawas Pekerjaan",
                                spv: "SPV",
                                sfo: "SFO",
                              };
                              const fallbackEntry = { approved: false, approvedBy: null, approvedNik: null, approvedAt: null };
                              return (
                                <JsaApprovalCard
                                  key={role}
                                  label={roleLabel[role]}
                                  role={role}
                                  entry={jsaApproval?.[role] ?? fallbackEntry}
                                  formId={id}
                                />
                              );
                            })}
                          </div>
                          {canApproveJsa && (
                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => approveJsa()}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                <span>Approve JSA ({jsaRole?.toUpperCase()})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Safety Induction Pos Security</h3>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              JAI/F-04/P.SHE-19 Rev. 1
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Pemeriksaan tata tertib K3 &amp; verifikasi identitas pekerja lapangan</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${siApproved ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : siHasData ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-600"
                        }`}>
                        {siApproved ? "✓ Terverifikasi Security" : siHasData ? "Draft" : "Belum Diisi"}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-5">
                      <SafetyInductionSection
                        value={safetyInduction}
                        setValue={setSafetyInduction}
                        readOnly={!isSecurity || siApproved}
                        defaultNamaSubcont={general.nama_kontraktor_pekerja}
                        defaultAktivitasPekerjaan={general.deskripsi_pekerjaan}
                        defaultKoordinatNoHp={general.nama_pengawas_pic_subkont}
                        formId={id}
                      />

                      {/* Security Action Controls if isSecurity and !siApproved */}
                      {isSecurity && !siApproved && (
                        <div className="pt-4 border-t border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Tanda Tangan &amp; Verifikasi Security</h4>
                              <p className="text-xs text-slate-500">Bubuhkan tanda tangan untuk menyelesaikan alur Safety Induction dan menyetujui izin kerja.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveSafetyInduction(false)}
                                disabled={actionLoading}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Simpan Draf
                              </button>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <SignaturePad
                              onConfirm={signAndApproveSafetyInduction}
                              label="Tanda Tangan Petugas Security"
                              confirmLabel="Konfirmasi &amp; Setujui Safety Induction"
                              disabled={signSubmitting}
                            />
                          </div>
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
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Form Penilaian Sub Kontraktor</h3>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              JAI/F-08/P.SHE-19 Rev. 1
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Evaluasi checklist K3 harian di lapangan dan tanda tangan digital</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isPenilaianSfoApproved ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                        {isPenilaianSfoApproved ? "✓ Disetujui SFO" : "Menunggu SFO"}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      <PenilaianSubkontraktorSection
                        value={penilaianData}
                        setValue={setPenilaianData}
                        readOnly={true}
                        hideHeader={true}
                        formId={id}
                        tanggalDari={general.tgl_mulai_kerja || general.izin_kerja_tanggal_dari}
                        tanggalSampai={general.tgl_akhir_kerja_rencana || general.izin_kerja_tanggal_sampai}
                      />

                      {/* SFO Approval Action Box */}
                      {(user?.role === "sfo" || isAdmin) && (
                        <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/70 flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800">Persetujuan Penilaian Subkontraktor oleh SFO</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {isPenilaianSfoApproved
                                ? `Form telah disetujui resmi oleh ${penilaianData.mengetahui?.sfo?.nama} pada ${penilaianData.mengetahui?.sfo?.tanggal}.`
                                : "Sebagai SFO, Anda dapat menyetujui evaluasi subkontraktor ini secara digital."}
                            </p>
                          </div>

                          {isPenilaianSfoApproved ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg shadow-2xs">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Disetujui: {penilaianData.mengetahui?.sfo?.nama}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => approvePenilaianSubkontraktor()}
                              disabled={penilaianLoading}
                              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              {penilaianLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              <span>Approve Penilaian Subkontraktor</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. LISENSI & SERTIFIKASI K3 PEKERJA */}
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
                                        <FileCheck className="w-4 h-4" />
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
                                      <img
                                        src={lic.url}
                                        alt={fileName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2">
                                  <a
                                    href={lic.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Buka Dokumen</span>
                                  </a>
                                  <a
                                    href={lic.url}
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

        </main>
      </div>

      {nextApproverTargetRole && (
        <NextApproverModal
          isOpen={pendingApproveSource !== null}
          onClose={() => setPendingApproveSource(null)}
          targetRole={nextApproverTargetRole}
          submitting={actionLoading || penilaianLoading}
          onConfirm={(selectedUserId) => {
            if (pendingApproveSource === "general-permit") {
              handleGeneralPermitAction("approve", selectedUserId);
            } else if (pendingApproveSource === "attachments") {
              approveAttachments(selectedUserId);
            } else if (pendingApproveSource === "jsa") {
              approveJsa(selectedUserId);
            } else if (pendingApproveSource === "penilaian") {
              approvePenilaianSubkontraktor(selectedUserId);
            }
          }}
        />
      )}
    </div>
  );
}