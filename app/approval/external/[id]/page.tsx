// app/approval/external/[id]/page.tsx
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, CheckCircle, AlertCircle, Loader2, FileText,
  Shield, ClipboardList, XCircle, User, ChevronRight,
  FileCheck, ExternalLink, HardHat, Flame, Wrench,
  Building2, Calendar, Clock, Download, Check, Minus,
  Layers, AlertTriangle, Sparkles, FolderOpen,
} from "lucide-react";
import { useApproverAuth } from "@/hooks/useApproverAuth";
import AuthLoadingSpinner from "@/components/AuthLoadingSpinner";
import type { JsaData } from "@/components/JsaBuilderSection";
import JsaApprovalCard from "@/components/JsaApprovalCard";
import SafetyInductionSection, { createEmptySafetyInduction, type SafetyInductionData } from "@/components/SafetyInductionSection";
import PenilaianSubkontraktorSection, {
  createEmptyPenilaianSubkontraktor,
  type PenilaianSubkontraktorData,
} from "@/components/PenilaianSubkontraktorSection";
import SignaturePad from "@/components/SignaturePad";

const labels: Record<string, string> = {
  "hot-work": "Hot Work",
  "height-work": "Height Work",
  workshop: "Workshop",
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  submitted: { label: "Diajukan", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  approved: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-200" },
};

// ── Label & role per stage (form_ijin_kerja) ────────────────
const STAGE_LABEL: Record<number, string> = {
  1: "Kontraktor",
  2: "SPV",
  3: "Security",
  4: "SFO",
  5: "SMR / PGA Manager",
};
const STAGE_ROLE: Record<number, string> = {
  2: "spv",
  4: "sfo",
  5: "smr",
};

const formatDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (t?: string | null) => {
  if (!t) return "-";
  return String(t).slice(0, 5);
};

type TabType = "form-utama" | "safety-induction" | "jsa" | "penilaian" | "lampiran-pekerjaan";

export default function ExternalApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useApproverAuth();
  const [data, setData] = useState<{ general: any; attachments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("form-utama");

  const [safetyInduction, setSafetyInduction] = useState<SafetyInductionData>(createEmptySafetyInduction);
  const [penilaianData, setPenilaianData] = useState<PenilaianSubkontraktorData>(createEmptyPenilaianSubkontraktor);
  const [penilaianLoading, setPenilaianLoading] = useState(false);

  // ── Reject modal state (SPV/SFO/SMR) ────────────────────────
  const [showReject, setShowReject] = useState(false);
  const [catatan, setCatatan] = useState("");

  // ── Signature pad state (Security) ──────────────────────────
  const [signSubmitting, setSignSubmitting] = useState(false);

  const isSecurity = user?.role === "security";
  const isAdmin = user?.role === "admin";

  const loadData = () =>
    fetch(`/form-permit/api/approval/external/${id}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat form eksternal");
        setData(result.data);
        if (result.data?.general?.safety_induction) setSafetyInduction(result.data.general.safety_induction);
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

  // ── SFO / Admin: Approve Form Penilaian Sub Kontraktor ────────
  const approvePenilaianSubkontraktor = async () => {
    setPenilaianLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/form-permit/api/approval/external/${id}/penilaian-subkontraktor`, {
        method: "PATCH",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyetujui Penilaian Sub Kontraktor");
      setMessage("Form Penilaian Sub Kontraktor berhasil disetujui oleh SFO.");
      setPenilaianData(json.data);
      if (data) {
        setData({
          ...data,
          general: {
            ...data.general,
            penilaian_subkontraktor: json.data,
          },
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPenilaianLoading(false);
    }
  };

  // ── Approve lampiran (hot-work, workshop, height-work) ────────
  const approveAttachments = async () => {
    if (!data) return;
    setActionLoading(true);
    setError("");
    const results = await Promise.all(data.attachments.map(async (attachment) => {
      const response = await fetch(`/form-permit/api/approval/${attachment.jenis_form}/${attachment.id_form}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      return { ok: response.ok, body: await response.json() };
    }));
    const approved = results.filter((result) => result.ok).length;
    const failed = results.filter((result) => !result.ok);
    setMessage(`${approved} lampiran berhasil diproses${failed.length ? `. ${failed.length} lampiran belum dapat diproses karena belum giliran approval atau sudah diproses.` : "."}`);
    if (approved) {
      const refreshed = await fetch(`/form-permit/api/approval/external/${id}`, { credentials: "include" });
      if (refreshed.ok) setData((await refreshed.json()).data);
    }
    setActionLoading(false);
  };

  // ── Approve JSA ───────────────────────────────────────────────
  const approveJsa = async () => {
    setActionLoading(true);
    setError("");
    const response = await fetch(`/form-permit/api/approval/external/${id}/jsa`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "JSA tidak dapat disetujui");
    else setMessage(`JSA berhasil diproses oleh role ${user?.role}.`);
    const refreshed = await fetch(`/form-permit/api/approval/external/${id}`, { credentials: "include" });
    if (refreshed.ok) setData((await refreshed.json()).data);
    setActionLoading(false);
  };

  // ── Simpan Safety Induction (draft, tanpa approve) ─────────────
  const saveSafetyInduction = async (submit: boolean) => {
    const response = await fetch(`/form-permit/api/approval/external/${id}/safety-induction`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safetyInduction, submit }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Safety Induction gagal disimpan");
    setSafetyInduction(result.data);
    setMessage(submit ? "Safety Induction berhasil disetujui." : "Safety Induction berhasil disimpan sebagai draft.");
    const refreshed = await fetch(`/form-permit/api/approval/external/${id}`, { credentials: "include" });
    if (refreshed.ok) {
      const refreshedData = (await refreshed.json()).data;
      setData(refreshedData);
    }
  };

  // ── Tanda tangan Security + approve final Safety Induction ─────
  const signAndApproveSafetyInduction = async (dataUrl: string) => {
    setSignSubmitting(true);
    setError("");
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, `signature-${id}.png`);
      fd.append("context", `security-${id}`);
      const uploadRes = await fetch("/form-permit/api/upload/signature", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload tanda tangan gagal");

      const res = await fetch(`/form-permit/api/approval/external/${id}/safety-induction/sign`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safetyInduction, signatureUrl: uploadJson.url }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan tanda tangan");
      setMessage("Safety Induction berhasil ditandatangani & disetujui. Menunggu SFO.");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSignSubmitting(false);
    }
  };

  // ── SPV / SFO / SMR: approve / reject form induk ────────────────
  const handleGeneralPermitAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !catatan.trim()) {
      setError("Catatan alasan penolakan wajib diisi.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/form-permit/api/approval/general-permit/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, catatan_reject: catatan }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses approval");
      setMessage(action === "approve" ? "Form berhasil disetujui." : "Form berhasil ditolak.");
      setShowReject(false);
      setCatatan("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !user) return <AuthLoadingSpinner />;
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 text-orange-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Memuat berkas form ijin kerja eksternal...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-4">
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
  const jsa = general.jsa_data as JsaData | null;
  const pendingAttachments = attachments.some((att) => att.status === "submitted");
  const jsaApproval = jsa?.approval;
  const jsaRole: "firewatch" | "spv" | "sfo" | null =
    jsaApproval && typeof jsaApproval.currentStage === "number"
      ? (["firewatch", "spv", "sfo"] as const)[jsaApproval.currentStage - 1] ?? null
      : null;
  const canApproveJsa = Boolean(jsaApproval && jsaApproval.status === "submitted" && (user?.role === jsaRole || isAdmin));

  const siStatus = general.safety_induction?.status;
  const siApproved = siStatus === "approved";
  const siHasData = Boolean(general.safety_induction?.namaSubcont);

  const isPenilaianSfoApproved = Boolean(penilaianData?.mengetahui?.sfo?.nama);

  const currentStage: number = general.current_stage ?? 1;
  const isMyStageRole = STAGE_ROLE[currentStage] === user.role || isAdmin;
  const canActOnGeneralPermit =
    general.status === "submitted" &&
    (currentStage === 2 || currentStage === 4 || currentStage === 5) &&
    isMyStageRole;

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

  const alatItems = [
    { label: "Mesin Potong", val: general.alat_mesin_potong, cond: general.alat_mesin_potong_kondisi },
    { label: "Mesin Las / Gerinda", val: general.alat_mesin_las_gerinda, cond: general.alat_mesin_las_gerinda_kondisi },
    { label: "Genset", val: general.alat_genset, cond: general.alat_genset_kondisi },
    { label: "Tabung Gas", val: general.alat_tabung_gas, cond: general.alat_tabung_gas_kondisi },
    { label: "Tangga Listrik / AWP", val: general.alat_tangga_listrik_awp, cond: general.alat_tangga_listrik_awp_kondisi },
    { label: "Forklift", val: general.alat_forklift, cond: general.alat_forklift_kondisi },
    { label: "Lift Barang", val: general.alat_lift_barang, cond: general.alat_lift_barang_kondisi },
    { label: general.alat_lainnya || "Alat Lainnya", val: Boolean(general.alat_lainnya), cond: general.alat_lainnya_kondisi },
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
    { label: `Dikelola PT JAI${general.limbah_lokasi_pt ? ` (Lokasi: ${general.limbah_lokasi_pt})` : ""}`, val: general.limbah_pt_jai },
    { label: "Dibuang ke Luar JAI", val: general.limbah_luar_jai },
  ];

  const lokasiTipeItems = [
    { label: "Dalam Gedung", val: general.lokasi_dalam_gedung },
    { label: "Luar Gedung", val: general.lokasi_luar_gedung },
    { label: "Luar Pagar Gedung", val: general.lokasi_luar_pagar_gedung },
    { label: "Di Atas Gedung", val: general.lokasi_di_atas_gedung },
    { label: general.lokasi_lainnya ? `Lainnya: ${general.lokasi_lainnya}` : null, val: Boolean(general.lokasi_lainnya) },
  ].filter((l) => l.label !== null);

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* ── Top Header ── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/approval"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Kembali ke Approval"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                  Ijin Kerja Eksternal
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {id}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Kontraktor: <strong>{general.nama_kontraktor_pekerja || "-"}</strong></span>
                <span>•</span>
                <span>{general.lokasi_pekerjaan || "Area Kerja"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${statusConfig[general.status]?.cls || "bg-slate-100 text-slate-700 border-slate-200"}`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>{statusConfig[general.status]?.label || general.status}</span>
            </div>
            <div className={`text-xs font-bold px-3 py-1.5 rounded-xl border shadow-2xs ${isSecurity ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              {isSecurity ? "🛡️ Security" : `👤 ${user.role.toUpperCase()}`}
            </div>
          </div>
        </div>

        {/* ── Tab Bar Navigation (Pemisah Antar Dokumen & Lampiran) ── */}
        <div className="border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("form-utama")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "form-utama"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 border border-slate-200/70"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Form Ijin Kerja Eksternal</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === "form-utama" ? "bg-orange-700 text-white" : "bg-slate-200 text-slate-600"}`}>
                Utama
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("safety-induction")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "safety-induction"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Lampiran Safety Induction</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                siApproved
                  ? "bg-emerald-100 text-emerald-800"
                  : siHasData
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-200 text-slate-600"
              }`}>
                {siApproved ? "✓ Disetujui" : siHasData ? "Draft" : "Belum Diisi"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("jsa")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "jsa"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 hover:bg-blue-100/80 text-blue-800 border border-blue-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lampiran JSA</span>
              {general.perlu_jsa ? (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                  jsaApproval?.status === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-200 text-blue-900"
                }`}>
                  {jsaApproval?.status === "approved" ? "✓ Approved" : "Aktif"}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-500">
                  Tidak Perlu
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("penilaian")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "penilaian"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "bg-purple-50 hover:bg-purple-100/80 text-purple-800 border border-purple-200"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Penilaian Sub Kontraktor</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                isPenilaianSfoApproved
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900"
              }`}>
                {isPenilaianSfoApproved ? "✓ SFO OK" : "Menunggu SFO"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("lampiran-pekerjaan")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === "lampiran-pekerjaan"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lampiran Kerja ({attachments.length})</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── Notification Feedback ── */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Terjadi Kesalahan</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}
        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 flex items-start gap-3 shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Berhasil</p>
              <p className="text-xs mt-0.5">{message}</p>
            </div>
          </div>
        )}

        {/* ── Approval Stepper Progress ── */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Alur Persetujuan Form Induk</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                Tahap Saat Ini:{" "}
                {general.status === "approved" ? (
                  <span className="text-emerald-600 font-bold">Disetujui Penuh (Semua Tahap Selesai)</span>
                ) : general.status === "rejected" ? (
                  <span className="text-red-600 font-bold">Form Ditolak</span>
                ) : (
                  <span className="text-orange-600">{STAGE_LABEL[currentStage] ?? `Tahap ${currentStage}`}</span>
                )}
              </p>
            </div>
            {general.status === "rejected" && (
              <span className="text-xs font-bold px-3 py-1 bg-red-100 text-red-700 rounded-full">
                Form Ditolak: {general.catatan_reject}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {[
              {
                num: 1,
                title: "Kontraktor",
                isApproved: true,
                status: "Selesai (Diajukan)",
              },
              {
                num: 2,
                title: "SPV",
                isApproved: Boolean(general.spv_approved || general.status === "approved" || currentStage > 2),
                status: general.spv_approved
                  ? "Disetujui"
                  : general.status === "approved" || currentStage > 2
                  ? "Selesai"
                  : currentStage === 2 && general.status === "submitted"
                  ? "Menunggu Approval"
                  : "Menunggu",
              },
              {
                num: 3,
                title: "Security",
                isApproved: Boolean(general.security_approved || general.status === "approved" || currentStage > 3),
                status: general.security_approved
                  ? "Disetujui"
                  : general.status === "approved" || currentStage > 3
                  ? "Selesai"
                  : currentStage === 3 && general.status === "submitted"
                  ? "Menunggu Safety Induction"
                  : "Menunggu",
              },
              {
                num: 4,
                title: "SFO",
                isApproved: Boolean(general.sfo_approved || general.status === "approved" || currentStage > 4),
                status: general.sfo_approved
                  ? "Disetujui"
                  : general.status === "approved" || currentStage > 4
                  ? "Selesai"
                  : currentStage === 4 && general.status === "submitted"
                  ? "Menunggu Approval"
                  : "Menunggu",
              },
              {
                num: 5,
                title: "SMR / PGA",
                isApproved: Boolean(general.pga_approved || general.mr_pga_approved || general.status === "approved"),
                status: Boolean(general.pga_approved || general.mr_pga_approved || general.status === "approved")
                  ? "Disetujui"
                  : currentStage === 5 && general.status === "submitted"
                  ? "Menunggu Approval"
                  : "Menunggu",
              },
            ].map((step) => {
              const isDone = step.isApproved;
              const isCurrent = !isDone && general.status === "submitted" && currentStage === step.num;
              const isRejected = general.status === "rejected" && currentStage === step.num && !isDone;

              return (
                <div
                  key={step.num}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isDone
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                      : isRejected
                      ? "bg-red-50/80 border-red-300 ring-2 ring-red-200"
                      : isCurrent
                      ? "bg-orange-50/80 border-orange-300 ring-2 ring-orange-200"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isRejected
                        ? "bg-red-600 text-white"
                        : isCurrent
                        ? "bg-orange-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {isDone ? "✓" : isRejected ? "✗" : step.num}
                    </span>
                    <span className="text-[10px] font-semibold opacity-80">
                      {isDone ? "✓ Selesai" : isRejected ? "✗ Ditolak" : isCurrent ? "● Aktif" : "Antri"}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">{step.title}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{step.status}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================== */}
        {/* TAB 1: FORM UTAMA (SEMUA DATA FORM IJIN KERJA EKSTERNAL LENGKAP) */}
        {/* ============================================================== */}
        {activeTab === "form-utama" && (
          <div className="space-y-6">
            {/* ── Hub Tombol Lampiran Terkait ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Dokumen & Lampiran Terkait</h3>
                </div>
                <p className="text-xs text-slate-400">Klik tombol di bawah untuk meninjau lampiran di halaman terpisah</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tombol Lampiran Safety Induction */}
                <button
                  type="button"
                  onClick={() => setActiveTab("safety-induction")}
                  className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-300 transition-all text-left flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <Shield className="w-4 h-4 text-teal-600" />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        siApproved ? "bg-emerald-100 text-emerald-800" : siHasData ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-600"
                      }`}>
                        {siApproved ? "✓ Disetujui" : siHasData ? "Draft" : "Belum Diisi"}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 mt-2">Safety Induction</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pemeriksaan & pengarahan dari Security</p>
                  </div>
                  <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1 mt-3 group-hover:translate-x-1 transition-transform">
                    Buka Lampiran <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* Tombol Lampiran JSA */}
                <button
                  type="button"
                  onClick={() => setActiveTab("jsa")}
                  className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all text-left flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        general.perlu_jsa ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        {general.perlu_jsa ? "Wajib" : "Tidak Perlu"}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 mt-2">Job Safety Analysis</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Analisa bahaya, langkah kerja & mitigasi</p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1 mt-3 group-hover:translate-x-1 transition-transform">
                    Buka Lampiran <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* Tombol Lampiran Penilaian Sub Kontraktor */}
                <button
                  type="button"
                  onClick={() => setActiveTab("penilaian")}
                  className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all text-left flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <FileCheck className="w-4 h-4 text-purple-600" />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPenilaianSfoApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                      }`}>
                        {isPenilaianSfoApproved ? "✓ SFO Selesai" : "Menunggu SFO"}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 mt-2">Penilaian Sub Kontraktor</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Checklist evaluasi harian kerja</p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1 mt-3 group-hover:translate-x-1 transition-transform">
                    Buka Lampiran <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* Tombol Lampiran Pekerjaan Khusus */}
                <button
                  type="button"
                  onClick={() => setActiveTab("lampiran-pekerjaan")}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 transition-all text-left flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <Layers className="w-4 h-4 text-slate-700" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {attachments.length} Dokumen
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 mt-2">Lampiran Kerja Khusus</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Hot Work, Height Work, Workshop</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mt-3 group-hover:translate-x-1 transition-transform">
                    Buka Lampiran <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            </section>

            {/* ── BAGIAN 1: IDENTITAS & RINCIAN PEKERJAAN ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Bagian 1: Identitas Pekerjaan & Kontraktor</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">ID: {general.id_form}</span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Perusahaan / Kontraktor</span>
                  <p className="font-bold text-slate-800 text-base">{general.nama_kontraktor_pekerja || "-"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Nama Pengawas / PIC Subkontraktor</span>
                  <p className="font-bold text-slate-800">{general.nama_pengawas_pic_subkont || "-"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jumlah Tenaga Kerja</span>
                  <p className="font-bold text-slate-800">{general.jumlah_tenaga_kerja ? `${general.jumlah_tenaga_kerja} Orang` : "-"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tanggal Pengajuan</span>
                  <p className="font-semibold text-slate-700">{formatDate(general.tanggal)}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Periode Izin Kerja</span>
                  <p className="font-semibold text-slate-700">
                    {general.izin_kerja_tanggal_dari && general.izin_kerja_tanggal_sampai
                      ? `${formatDate(general.izin_kerja_tanggal_dari)} – ${formatDate(general.izin_kerja_tanggal_sampai)}`
                      : general.tgl_mulai_kerja && general.tgl_akhir_kerja_rencana
                      ? `${formatDate(general.tgl_mulai_kerja)} – ${formatDate(general.tgl_akhir_kerja_rencana)}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jam Izin Kerja</span>
                  <p className="font-semibold text-slate-700">
                    {general.izin_kerja_dari && general.izin_kerja_sampai
                      ? `${formatTime(general.izin_kerja_dari)} – ${formatTime(general.izin_kerja_sampai)}`
                      : general.waktu_kerja
                      ? formatTime(general.waktu_kerja)
                      : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Departemen Pemohon</span>
                  <p className="font-semibold text-slate-700">{general.pembuat_departmen || general.departemen_pengawas || "-"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Dibuat Oleh</span>
                  <p className="font-semibold text-slate-700">{general.pembuat_nama || "-"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tanggal Pelaksanaan Aktual</span>
                  <p className="font-semibold text-slate-700">{formatDate(general.actual_tanggal_kerja || general.tanggal_pelaksanaan)}</p>
                </div>
                <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Deskripsi Pekerjaan</span>
                  <p className="font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {general.deskripsi_pekerjaan || "Tidak ada deskripsi pekerjaan."}
                  </p>
                </div>
              </div>
            </section>

            {/* ── BAGIAN 2: LOKASI PROYEK & PENGAWAS ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-800 text-sm">Bagian 2: Lokasi Proyek & Pengawas</h3>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Lokasi Pekerjaan</span>
                    <p className="font-bold text-slate-800">{general.lokasi_pekerjaan || "-"}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Pengawas Bagian</span>
                    <p className="font-semibold text-slate-800">{general.pengawas_bagian || "-"}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">PIC LOTO / Station LOTO</span>
                    <p className="font-semibold text-slate-800">{general.pic_loto_station_loto || "-"}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Tipe Lokasi Pekerjaan</span>
                  <div className="flex flex-wrap gap-2">
                    {lokasiTipeItems.map((loc) => (
                      <span
                        key={loc.label}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 ${
                          loc.val
                            ? "bg-orange-50 border-orange-300 text-orange-800 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}
                      >
                        {loc.val ? <Check className="w-3.5 h-3.5 text-orange-600" /> : <Minus className="w-3.5 h-3.5 text-slate-300" />}
                        {loc.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── BAGIAN 3: SPESIFIKASI PEKERJAAN ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-800 text-sm">Bagian 3: Spesifikasi Pekerjaan</h3>
              </div>
              <div className="p-6 space-y-3 text-sm">
                <p className="text-xs text-slate-500">Kondisi / karakteristik risiko spesifik dalam pekerjaan ini:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {spesifikasiItems.map((spek) => (
                    <div
                      key={spek.label}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        spek.val
                          ? "bg-amber-50/80 border-amber-300 text-amber-900 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <span>{spek.label}</span>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        spek.val ? "bg-amber-500 text-white font-bold" : "bg-slate-200 text-slate-400"
                      }`}>
                        {spek.val ? "✓" : "—"}
                      </span>
                    </div>
                  ))}
                </div>
                {general.spesifikasi_lainnya && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-slate-500">Spesifikasi Lainnya:</span>
                    <p className="text-xs font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">
                      {general.spesifikasi_lainnya}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── BAGIAN 4: ALAT-ALAT YANG DIGUNAKAN & KONDISINYA ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-800 text-sm">Bagian 4: Peralatan / Mesin yang Digunakan</h3>
              </div>
              <div className="p-6 space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {alatItems.map((alat, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                        alat.val
                          ? "bg-blue-50/60 border-blue-200 text-blue-900"
                          : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{alat.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {alat.val ? "Digunakan dalam pekerjaan" : "Tidak digunakan"}
                        </p>
                      </div>
                      {alat.val && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                          alat.cond?.toLowerCase() === "ok" || alat.cond?.toLowerCase() === "baik"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {alat.cond || "Baik / OK"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── BAGIAN 5 & 6: BAHAN BERBAHAYA & POTENSI BAHAYA (2 KOLOM) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bahan Berbahaya */}
              <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col">
                <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Bagian 5: Bahan Berbahaya</h3>
                </div>
                <div className="p-6 space-y-2 text-sm flex-1">
                  <div className="space-y-2">
                    {bahanItems.map((bahan) => (
                      <div
                        key={bahan.label}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          bahan.val
                            ? "bg-red-50 border-red-200 text-red-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <span>{bahan.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          bahan.val ? "bg-red-200 text-red-800" : "bg-slate-200 text-slate-400"
                        }`}>
                          {bahan.val ? "Ada" : "Tidak"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Potensi Bahaya & Dampak Risiko */}
              <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col">
                <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Bagian 6: Potensi Bahaya & Risiko</h3>
                </div>
                <div className="p-6 space-y-2 text-sm flex-1">
                  <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {dampakItems.map((dampak) => (
                      <span
                        key={dampak.label}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                          dampak.val
                            ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        }`}
                      >
                        {dampak.val ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <Minus className="w-3.5 h-3.5 text-slate-300" />}
                        {dampak.label}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* ── BAGIAN 7: ALAT PELINDUNG DIRI (APD) ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                <HardHat className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-800 text-sm">Bagian 7: Alat Pelindung Diri (APD) Diwajibkan</h3>
              </div>
              <div className="p-6 space-y-3 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {apdItems.map((apd) => (
                    <div
                      key={apd.label}
                      className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                        apd.val
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                        apd.val ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                      }`}>
                        {apd.val ? "✓" : "—"}
                      </span>
                      <span className="truncate">{apd.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── BAGIAN 8: APAR & PENGELOLAAN LIMBAH ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Proteksi Kebakaran / APAR */}
              <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Bagian 8: APAR (Pemadam Api)</h3>
                </div>
                <div className="p-6 space-y-2 text-sm">
                  {aparItems.map((apar) => (
                    <div
                      key={apar.label}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        apar.val
                          ? "bg-orange-50 border-orange-200 text-orange-900 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <span>{apar.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        apar.val ? "bg-orange-200 text-orange-800" : "bg-slate-200 text-slate-400"
                      }`}>
                        {apar.val ? "Tersedia / Berlaku" : "Tidak"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pengelolaan Limbah */}
              <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Bagian 9: Pengelolaan Limbah</h3>
                </div>
                <div className="p-6 space-y-2 text-sm">
                  {limbahItems.map((limbah) => (
                    <div
                      key={limbah.label}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        limbah.val
                          ? "bg-slate-100 border-slate-300 text-slate-900 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <span>{limbah.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        limbah.val ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-400"
                      }`}>
                        {limbah.val ? "Dipilih" : "Tidak"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── BAGIAN 9: BERKAS LISENSI & SERTIFIKASI PEKERJA ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Bagian 10: Berkas Lisensi / Sertifikasi Pekerja</h3>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                  {Array.isArray(general.license_files) ? `${general.license_files.length} Berkas` : "0 Berkas"}
                </span>
              </div>
              <div className="p-6 text-sm">
                {Array.isArray(general.license_files) && general.license_files.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {general.license_files.map((file: any, idx: number) => {
                      const fileUrl = file?.url ? (file.url.startsWith("http") ? file.url : `${file.url}`) : "#";
                      return (
                        <a
                          key={idx}
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-orange-700 transition-all shadow-2xs group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                            <span className="truncate">{file?.name || `Berkas Lisensi ${idx + 1}`}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Tidak ada berkas lisensi diunggah pada form ini.</p>
                )}
              </div>
            </section>

            {/* ── BAGIAN 10: PENANGGUNG JAWAB & TANDA TANGAN KONTRAKTOR ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center gap-2.5">
                <User className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-800 text-sm">Bagian 11: Penanggung Jawab & Tanda Tangan</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Kontraktor Penanggung Jawab</span>
                  <p className="font-bold text-slate-800">
                    {general.kontraktor_pj || general.nama_kontraktor_pekerja || general.nama_pengawas_pic_subkont || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">SPV Terkait Penanggung Jawab</span>
                  <p className="font-bold text-slate-800">
                    {(() => {
                      const spvName = general.spv_terkait_pj || general.spv_approved_by;
                      const spvNik = general.nik_spv_terkait_pj || general.spv_nik;
                      if (!spvName) return "-";
                      return `${spvName}${spvNik ? ` (${spvNik})` : ""}`;
                    })()}
                  </p>
                  {general.spv_approved && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md mt-1">
                      ✓ Disetujui SPV
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Pengawas Pekerjaan User</span>
                  <p className="font-bold text-slate-800">
                    {general.pengawas_pekerjaan_user || general.pengawas_bagian || general.pembuat_nama || "-"}
                  </p>
                </div>

                {general.kontraktor_signature_url && (
                  <div className="sm:col-span-3 pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Tanda Tangan Pemohon (Kontraktor)</span>
                    <div className="inline-block p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={general.kontraktor_signature_url} alt="TTD Kontraktor" className="h-20 rounded bg-white" />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: LAMPIRAN SAFETY INDUCTION (SECURITY)                    */}
        {/* ============================================================== */}
        {activeTab === "safety-induction" && (
          <section className="bg-white rounded-2xl border border-teal-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-teal-600 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-teal-100 shrink-0" />
                <div>
                  <h2 className="font-bold text-white text-base">Formulir Safety Induction</h2>
                  <p className="text-xs text-teal-100">
                    {isSecurity ? "Isi dan tanda tangani formulir Safety Induction berikut" : "Pemeriksaan dan pengarahan K3 yang dilakukan oleh Security"}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                siApproved ? "bg-emerald-100 text-emerald-900" : siHasData ? "bg-amber-100 text-amber-900" : "bg-white/20 text-white"
              }`}>
                {siApproved ? "✓ Disetujui Security" : siHasData ? "📝 Draft Tersimpan" : "⏳ Menunggu Pengisian"}
              </span>
            </div>

            <div className="p-6">
              {siApproved && !isSecurity && !isAdmin ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-800 font-semibold">
                      Safety Induction telah diperiksa dan disetujui oleh Security
                      {general.safety_induction?.approvedBy && <span className="font-bold"> ({general.safety_induction.approvedBy})</span>}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div><span className="text-xs text-slate-500">Nama Subkontraktor</span><p className="font-semibold text-slate-800">{general.safety_induction?.namaSubcont || "-"}</p></div>
                    <div><span className="text-xs text-slate-500">Aktivitas Pekerjaan</span><p className="font-semibold text-slate-800">{general.safety_induction?.aktivitasPekerjaan || "-"}</p></div>
                  </div>
                  {general.security_signature_url && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Tanda Tangan Petugas Security</span>
                      <div className="inline-block p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={general.security_signature_url} alt="TTD Security" className="h-20 rounded bg-white" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <SafetyInductionSection
                    value={safetyInduction}
                    setValue={setSafetyInduction}
                    readOnly={!isSecurity && !isAdmin}
                    onSave={isSecurity || isAdmin ? saveSafetyInduction : undefined}
                    kontraktorSignatureUrl={general.kontraktor_signature_url}
                  />

                  {(isSecurity || isAdmin) && currentStage === 3 && !siApproved && (
                    <div className="border-t border-teal-200 pt-5">
                      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4">
                        <User className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800 leading-relaxed">
                          Pastikan poin evaluasi Safety Induction sudah diisi dengan benar. Konfirmasi tanda tangan digital di bawah akan secara otomatis menyetujui Safety Induction dan memajukan perizinan ke tahap <strong>SFO</strong>.
                        </p>
                      </div>
                      <SignaturePad
                        onConfirm={signAndApproveSafetyInduction}
                        disabled={signSubmitting}
                        confirmLabel={signSubmitting ? "Menyimpan TTD..." : "Tanda Tangan & Setujui Safety Induction"}
                      />
                    </div>
                  )}

                  {(isSecurity || isAdmin) && currentStage !== 3 && !siApproved && (
                    <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-800">
                        Belum giliran Security — form ini masih berada di tahap <strong>{STAGE_LABEL[currentStage] ?? currentStage}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 3: LAMPIRAN JSA (JOB SAFETY ANALYSIS)                     */}
        {/* ============================================================== */}
        {activeTab === "jsa" && (
          <section className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-blue-600 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-100 shrink-0" />
                <div>
                  <h2 className="font-bold text-white text-base">Job Safety Analysis (JSA)</h2>
                  <p className="text-xs text-blue-100">
                    Analisa risiko keselamatan kerja per tahapan langkah kerja
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                general.perlu_jsa ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {general.perlu_jsa ? "JSA Diwajibkan" : "Tidak Perlu JSA"}
              </span>
            </div>

            <div className="p-6">
              {!general.perlu_jsa ? (
                <div className="text-center py-10 text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-medium text-sm">JSA tidak diwajibkan untuk pengajuan pekerjaan ini.</p>
                </div>
              ) : !jsa ? (
                <div className="text-center py-10 text-amber-700 space-y-2">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="font-medium text-sm">Dokumen data JSA belum dibuat atau tidak ditemukan.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {[
                      ["Area", jsa.area],
                      ["Jenis Pekerjaan", jsa.jenisPekerjaan],
                      ["Sect / Dept", jsa.sectDept],
                      ["PIC Proyek", jsa.pic],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span className="text-xs text-slate-400 font-semibold uppercase">{label}</span>
                        <p className="font-bold text-slate-800 mt-0.5">{value || "-"}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Petugas yang Mengerjakan</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {(Array.isArray(jsa.petugas) ? jsa.petugas : []).filter(Boolean).map((name, index) => (
                        <div key={index} className="text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {index + 1}
                          </span>
                          <span className="truncate text-slate-700">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tabel Analisis Langkah Kerja</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full min-w-[800px] text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            {["Tanggal", "Jenis Pekerjaan", "Langkah Kerja", "Potensi Bahaya", "Pengendalian", "Saran"].map((heading) => (
                              <th key={heading} className="p-3 text-left font-bold border-b border-slate-200">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(Array.isArray(jsa.rows) ? jsa.rows : []).map((row, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors align-top">
                              {[row.tanggal, row.jenisPekerjaan, row.langkahKerja, row.potensiBahaya, row.pengendalian, row.saran].map((value, cellIndex) => (
                                <td key={cellIndex} className="p-3 whitespace-pre-wrap text-slate-700 leading-relaxed">{value || "-"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* JSA Approvers */}
                  {!isSecurity && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Persetujuan Khusus JSA</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {jsaApproval && (["firewatch", "spv", "sfo"] as const).map((role) => {
                          const roleLabel: Record<string, string> = { firewatch: "Fire Watch", spv: "SPV", sfo: "SFO" };
                          return <JsaApprovalCard key={role} label={roleLabel[role]} role={role} entry={jsaApproval[role]} formId={id} />;
                        })}
                      </div>
                      {canApproveJsa && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={approveJsa}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                          >
                            {actionLoading ? "Memproses..." : `Approve JSA (${jsaRole?.toUpperCase()})`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 4: LAMPIRAN PENILAIAN SUB KONTRAKTOR                       */}
        {/* ============================================================== */}
        {activeTab === "penilaian" && (
          <section className="bg-white rounded-2xl border border-purple-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-purple-700 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-purple-200 shrink-0" />
                <div>
                  <h2 className="font-bold text-white text-base">Form Penilaian Sub Kontraktor</h2>
                  <p className="text-xs text-purple-200">
                    Evaluasi checklist pelaksanaan K3 harian subkontraktor selama masa kerja
                  </p>
                </div>
              </div>
              <div>
                {isPenilaianSfoApproved ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 shadow-2xs">
                    ✓ Sudah Disetujui SFO
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 shadow-2xs">
                    ⏳ Menunggu Persetujuan SFO
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <PenilaianSubkontraktorSection
                value={penilaianData}
                setValue={setPenilaianData}
                readOnly={true}
              />

              {/* SFO Approval Action Box */}
              {(user?.role === "sfo" || user?.role === "admin") && (
                <div className="border border-purple-200 rounded-2xl p-5 bg-purple-50/70 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Persetujuan Form Penilaian Sub Kontraktor oleh SFO</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl">
                      {isPenilaianSfoApproved
                        ? `Form Penilaian Sub Kontraktor telah disetujui resmi oleh ${penilaianData.mengetahui?.sfo?.nama} pada tanggal ${penilaianData.mengetahui?.sfo?.tanggal}.`
                        : "Sebagai SFO, Anda dapat membubuhkan persetujuan pada Form Penilaian Sub Kontraktor secara digital dengan menekan tombol berikut."}
                    </p>
                  </div>

                  {isPenilaianSfoApproved ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-2.5 rounded-xl shadow-2xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Telah Disetujui: {penilaianData.mengetahui?.sfo?.nama} ({penilaianData.mengetahui?.sfo?.tanggal})</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={approvePenilaianSubkontraktor}
                      disabled={penilaianLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {penilaianLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve Form Penilaian Sub Kontraktor
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 5: LAMPIRAN FORM JENIS PEKERJAAN KHUSUS                   */}
        {/* ============================================================== */}
        {activeTab === "lampiran-pekerjaan" && (
          <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-slate-800 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-slate-300 shrink-0" />
                <div>
                  <h2 className="font-bold text-white text-base">Lampiran Formulir Pekerjaan Khusus</h2>
                  <p className="text-xs text-slate-300">
                    Formulir spesifik yang ditautkan langsung dengan izin kerja eksternal {id}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-slate-700 text-white rounded-full">
                {attachments.length} Terkait
              </span>
            </div>

            <div className="p-6 space-y-4">
              {attachments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium">Belum ada form jenis pekerjaan khusus yang terhubung.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {attachments.map((attachment) => {
                    const sc = statusConfig[attachment.status] || statusConfig.draft;
                    return (
                      <Link
                        key={attachment.id_form}
                        href={`/approval/${attachment.jenis_form}/${attachment.id_form}`}
                        className="flex items-center justify-between gap-4 p-4 bg-slate-50 hover:bg-orange-50/60
                                   rounded-xl border border-slate-200 hover:border-orange-300 transition-all group"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 group-hover:text-orange-600 transition-colors">
                              {labels[attachment.jenis_form] || attachment.jenis_form}
                            </span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold">
                              {attachment.id_form}
                            </span>
                          </div>
                          {attachment.lokasi_pekerjaan && (
                            <p className="text-xs text-slate-500 truncate">Lokasi: {attachment.lokasi_pekerjaan}</p>
                          )}
                          <p className="text-xs text-slate-400">
                            Tahap: <strong>{STAGE_LABEL[attachment.current_stage] ?? attachment.current_stage}</strong>
                            {attachment.tipe_perusahaan && ` · ${attachment.tipe_perusahaan}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sc.cls}`}>
                            {sc.label}
                          </span>
                          <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-orange-300 text-slate-400 group-hover:text-orange-600 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {!isSecurity && attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <p className="text-xs text-slate-500">
                    Anda dapat menyetujui seluruh lampiran yang sudah giliran secara serentak:
                  </p>
                  <button
                    type="button"
                    onClick={approveAttachments}
                    disabled={!pendingAttachments || actionLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading ? "Memproses..." : "Approve Lampiran Yang Tersedia"}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Action Decision Box for Approvers (SPV / SFO / SMR) — Diposisikan di Bawah ── */}
        {canActOnGeneralPermit && (
          <section className="bg-gradient-to-r from-orange-50 via-amber-50 to-white rounded-2xl border-2 border-orange-300 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  <h2 className="font-bold text-slate-900 text-base">
                    Keputusan Persetujuan Form Induk — {STAGE_LABEL[currentStage]}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Anda masuk sebagai <strong>{user.nama}</strong> ({user.role.toUpperCase()}). Form ini memerlukan keputusan persetujuan Anda untuk lanjut ke tahap berikutnya.
                </p>
              </div>

              {!showReject ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleGeneralPermitAction("approve")}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Setujui Form Induk ({STAGE_LABEL[currentStage]})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReject(true)}
                    className="flex items-center gap-2 px-5 py-3 border-2 border-red-300 bg-white text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Tolak Form
                  </button>
                </div>
              ) : null}
            </div>

            {showReject && (
              <div className="mt-4 pt-4 border-t border-orange-200">
                <label className="block text-xs font-bold text-red-700 mb-1.5">
                  Catatan Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara spesifik untuk pihak kontraktor..."
                  className="w-full px-3.5 py-2.5 border border-red-300 rounded-xl text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent text-slate-800 bg-white resize-none"
                />
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleGeneralPermitAction("reject")}
                    disabled={actionLoading || !catatan.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Konfirmasi Tolak Form
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReject(false); setCatatan(""); setError(""); }}
                    className="px-4 py-2.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}