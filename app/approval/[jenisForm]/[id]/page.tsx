// app/approval/[jenisForm]/[id]/page.tsx
// REFACTOR: Role 'pga' diganti 'smr'. Kolom DB mr_pga_* tetap.
// SECURITY: Auth guard via useApproverAuth — tidak lagi mengandalkan sessionStorage untuk auth.
//
// WORKFLOW:
//   Hot-work & Workshop INTERNAL:  SPV(1) → Admin K3(2) → SFO(3) → SMR(4)
//   Hot-work & Workshop EKSTERNAL: Kontraktor(1) → SPV(2) → Admin K3(3) → SFO(4) → SMR(5)
//   Height-work INTERNAL:          SPV(1) → Admin K3(2) → SFO(3) → SMR(4)
//   Height-work EKSTERNAL:         Kontraktor(1) → SPV(2) → Admin K3(3) → SFO(4) → SMR(5)
"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle,
  Clock, Loader2, Flame, Info, Eye, FileText,
  LogOut,
} from "lucide-react";
import React from "react";
import { useApproverAuth } from "@/hooks/useApproverAuth";
import AuthLoadingSpinner from "@/components/AuthLoadingSpinner";

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};
const formatTime = (t?: string) => (!t ? "-" : String(t).slice(0, 5));
const isTruthy = (v: any) => v === true || v === "t" || v === "true";

const jenisLabel: Record<string, string> = {
  "hot-work":    "Hot Work Permit",
  "workshop":    "Workshop Permit",
  "height-work": "Kerja Ketinggian",
};

function getTipeLabel(tipe?: string): string {
  if (tipe === "eksternal") return "Eksternal / Subkontraktor";
  return "Internal / Karyawan PT.JAI";
}

// ── Sub-components ────────────────────────────────────────────
const F = ({ label, value }: { label: string; value?: any }) => (
  <div>
    <span className="text-xs text-slate-400 uppercase font-medium">{label}</span>
    <p className="font-semibold text-slate-800 mt-0.5 text-sm">{value ?? "-"}</p>
  </div>
);

const BF = ({ label, value }: { label: string; value: any }) => {
  const yes = isTruthy(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-bold shrink-0 ${yes ? "text-green-600" : "text-red-500"}`}>
        {yes ? "✓ Ya" : "✗ Tidak"}
      </span>
    </div>
  );
};

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-slate-200 rounded-lg overflow-hidden">
    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ── JSA Display Component ────────────────────────────────────
const JsaDisplay = ({ perluJsa, jsaFileUrl }: { perluJsa: boolean; jsaFileUrl?: string | null }) => {
  if (!perluJsa) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
        <span className="text-sm text-slate-600">JSA <strong>Tidak Diperlukan</strong> untuk pekerjaan ini.</span>
      </div>
    );
  }

  if (jsaFileUrl) {
    const fileName = jsaFileUrl.split("/").pop() || "Dokumen JSA";
    const fileUrl = jsaFileUrl.startsWith("http")
      ? jsaFileUrl
      : `${window.location.origin}${jsaFileUrl}`;

    return (
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">File JSA Terlampir</p>
            <p className="text-xs text-green-600 truncate">{fileName}</p>
          </div>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 ml-3"
        >
          <Eye className="w-3.5 h-3.5" /> Lihat File
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
      <span className="text-sm text-amber-800">JSA <strong>Diperlukan</strong>, namun file belum diupload.</span>
    </div>
  );
};

// ── Approval chain ────────────────────────────────────────────
const renderApprovalChain = (form: any, jenisForm: string) => {
  const isEksternal = form.tipe_perusahaan === "eksternal" || form.petugas_ketinggian === "eksternal";

  let stages: { label: string; key: string; icon: string; dbStage: number }[];

  if (jenisForm === "height-work") {
    if (isEksternal) {
      stages = [
        { label: "Kontraktor", key: "kontraktor", icon: "🏢", dbStage: 1 },
        { label: "SPV",        key: "spv",        icon: "👷", dbStage: 2 },
        { label: "Admin K3",   key: "admin_k3",   icon: "🛡️", dbStage: 3 },
        { label: "SFO",        key: "sfo",        icon: "🔒", dbStage: 4 },
        { label: "SMR",        key: "mr_pga",     icon: "✅", dbStage: 5 },
      ];
    } else {
      stages = [
        { label: "SPV",      key: "spv",      icon: "👷", dbStage: 1 },
        { label: "Admin K3", key: "admin_k3", icon: "🛡️", dbStage: 2 },
        { label: "SFO",      key: "sfo",      icon: "🔒", dbStage: 3 },
        { label: "SMR",      key: "mr_pga",   icon: "✅", dbStage: 4 },
      ];
    }
  } else {
    if (isEksternal) {
      stages = [
        { label: "Kontraktor", key: "kontraktor", icon: "🏢", dbStage: 1 },
        { label: "SPV",        key: "spv",        icon: "👷", dbStage: 2 },
        { label: "Admin K3",   key: "admin_k3",   icon: "🛡️", dbStage: 3 },
        { label: "SFO",        key: "sfo",        icon: "🔒", dbStage: 4 },
        { label: "SMR",        key: "mr_pga",     icon: "✅", dbStage: 5 },
      ];
    } else {
      stages = [
        { label: "SPV",      key: "spv",      icon: "👷", dbStage: 1 },
        { label: "Admin K3", key: "admin_k3", icon: "🛡️", dbStage: 2 },
        { label: "SFO",      key: "sfo",      icon: "🔒", dbStage: 3 },
        { label: "SMR",      key: "mr_pga",   icon: "✅", dbStage: 4 },
      ];
    }
  }

  const currentDbStage = form.current_stage ?? 1;

  return (
    <div className="bg-slate-50 rounded-xl p-4 mb-6">
      <h4 className="font-semibold text-slate-800 text-sm mb-4">Status Approval</h4>
      <div className="flex items-center justify-between gap-1">
        {stages.map((stage, idx) => {
          const approvedKey   = `${stage.key}_approved`;
          const approvedByKey = `${stage.key}_approved_by`;
          const isApproved    = isTruthy(form[approvedKey]);
          const approvedBy    = form[approvedByKey];
          const isCurrent     = currentDbStage === stage.dbStage && form.status === "submitted";
          const isRejected    = form.status === "rejected";

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isApproved
                    ? "bg-green-100 text-green-700 border-2 border-green-500"
                    : isCurrent && !isRejected
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-500 ring-2 ring-blue-200"
                    : isRejected && isCurrent
                    ? "bg-red-100 text-red-700 border-2 border-red-400"
                    : "bg-slate-100 text-slate-400 border-2 border-slate-200"
                }`}>
                  {isApproved ? <CheckCircle className="w-5 h-5" /> : <span>{stage.icon}</span>}
                </div>
                <span className="text-xs font-semibold mt-1.5 text-center text-slate-600 truncate w-full text-center px-1">
                  {stage.label}
                </span>
                {isApproved && approvedBy && (
                  <span className="text-[10px] text-slate-400 mt-0.5 text-center truncate w-full px-1">
                    {approvedBy}
                  </span>
                )}
                {isCurrent && !isRejected && (
                  <span className="text-[10px] text-blue-500 font-semibold mt-0.5">Menunggu</span>
                )}
              </div>

              {idx < stages.length - 1 && (
                <div className={`h-0.5 flex-1 mx-0.5 rounded-full ${isApproved ? "bg-green-300" : "bg-slate-200"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────
export default function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ jenisForm: string; id: string }>;
}) {
  const { jenisForm, id } = use(params);
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────
  // Validasi auth via cookie JWT, bukan sessionStorage.
  const { user, loading: authLoading } = useApproverAuth();

  const [form, setForm]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [catatan, setCatatan]       = useState("");
  const [done, setDone]             = useState<"approved" | "rejected" | null>(null);
  const [error, setError]           = useState("");

  const isHotOrWorkshop = jenisForm !== "height-work";

  // Muat detail form hanya setelah auth selesai
  useEffect(() => {
    if (authLoading || !user) return;
    loadForm();
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadForm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/form-permit/api/approval/${jenisForm}/${id}`, {
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
      const res = await fetch(`/form-permit/api/approval/${jenisForm}/${id}`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ action, catatan_reject: catatan }),
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
    await fetch("/form-permit/api/auth/logout", { method: "POST", credentials: "include" });
    sessionStorage.clear();
    router.push("/login/approver");
  };

  // ── Auth loading — jangan render halaman sebelum auth selesai ──
  if (authLoading || !user) return <AuthLoadingSpinner />;

  // ── Form data loading ─────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // ── Done state ────────────────────────────────────────────
  if (done) {
    const isApproved = done === "approved";
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 max-w-md w-full text-center">
          {isApproved ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isApproved ? "Berhasil Disetujui!" : "Form Ditolak"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {isApproved ? `Form ${id} telah berhasil disetujui.` : `Form ${id} telah ditolak.`}
          </p>
          <Link href="/approval"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Form not found ────────────────────────────────────────
  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-slate-600 font-medium">Form tidak ditemukan.</p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Link href="/approval" className="text-orange-600 hover:underline text-sm">
          ← Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const isEksternal = form?.tipe_perusahaan === "eksternal" || form?.petugas_ketinggian === "eksternal";

  // Data user dari /api/auth/me (bukan sessionStorage)
  const userRole    = user.role;
  const userNama    = user.nama;
  const userNik     = user.nik ?? "";
  const userJabatan = user.jabatan;

  const roleLabel: Record<string, string> = {
    spv:        "SPV / Pemberi Izin",
    kontraktor: "Kontraktor",
    admin_k3:   "Admin K3",
    sfo:        "SFO",
    smr:        "SMR",
    admin:      "Admin",
    firewatch:  "Fire Watch (Tidak bisa approve)",
    worker:     "Worker",
  };

  const getApproveButtonLabel = () => {
    if (userRole === "kontraktor") return "Setujui (Kontraktor)";
    if (userRole === "spv")        return "Setujui (SPV)";
    if (userRole === "admin_k3")   return "Setujui (Admin K3)";
    if (userRole === "sfo")        return "Setujui (SFO)";
    if (userRole === "smr")        return "Setujui (SMR)";
    return "Setujui Form";
  };

  const isFirewatchRole = userRole === "firewatch" || userRole === "worker";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/approval" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-slate-900 text-base truncate">
                {jenisLabel[jenisForm] || jenisForm} — {id}
              </h1>
              {form.tipe_perusahaan && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isEksternal ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {getTipeLabel(form.tipe_perusahaan)}
                </span>
              )}
              {form.status === "submitted" && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Menunggu Review
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Diajukan: {formatDate(form.tanggal)}</p>
          </div>
          {/* Logout shortcut di header detail page */}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors shrink-0">
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Status banner */}
        {form.status !== "submitted" && (
          <div className={`rounded-xl p-4 flex items-center gap-3 ${
            form.status === "approved"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}>
            {form.status === "approved" ? (
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <div>
              <p className={`font-semibold text-sm ${form.status === "approved" ? "text-green-800" : "text-red-800"}`}>
                Form sudah {form.status === "approved" ? "disetujui" : "ditolak"} oleh {form.approved_by}
              </p>
              {form.catatan_reject && (
                <p className="text-xs text-red-600 mt-0.5">Catatan: {form.catatan_reject}</p>
              )}
            </div>
          </div>
        )}

        {/* Info alur approval */}
        {isHotOrWorkshop && form.tipe_perusahaan && (
          <div className={`rounded-xl p-4 flex items-start gap-3 border ${
            isEksternal ? "bg-purple-50 border-purple-200" : "bg-blue-50 border-blue-200"
          }`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isEksternal ? "text-purple-600" : "text-blue-600"}`} />
            <div>
              <p className={`text-sm font-semibold ${isEksternal ? "text-purple-800" : "text-blue-800"}`}>
                Tipe Pekerja: {getTipeLabel(form.tipe_perusahaan)}
              </p>
              <p className={`text-xs mt-0.5 ${isEksternal ? "text-purple-700" : "text-blue-700"}`}>
                Alur approval:{" "}
                {isEksternal
                  ? "Kontraktor → SPV → Admin K3 → SFO → SMR"
                  : "SPV → Admin K3 → SFO → SMR"
                }
              </p>
            </div>
          </div>
        )}

        {/* Approval chain visual */}
        {renderApprovalChain(form, jenisForm)}

        {/* ── DOKUMEN JSA ── */}
        <Sec title="Dokumen JSA (Job Safety Analysis)">
          <JsaDisplay
            perluJsa={isTruthy(form.perlu_jsa)}
            jsaFileUrl={form.jsa_file_url}
          />
        </Sec>

        {/* Konten form */}
        {isHotOrWorkshop ? (
          <>
            <Sec title="Bagian 1: Identitas & Registrasi">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <F label="No. Registrasi"        value={form.no_registrasi} />
                <F label="Nama Kontraktor / NIK"  value={form.nama_kontraktor_nik} />
                <F label="Nama Pekerja / NIK"     value={form.nama_pekerja_nik} />
                <F label="Lokasi Pekerjaan"       value={form.lokasi_pekerjaan} />
                <F label="Tanggal Pelaksanaan"    value={formatDate(form.tanggal_pelaksanaan)} />
                <F label="Waktu Pukul"            value={formatTime(form.waktu_pukul)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-3.5 h-3.5 text-blue-600" />
                    <p className="text-xs font-bold text-blue-700">Fire Watch (Informasi)</p>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                      Bukan Approver
                    </span>
                  </div>
                  <F label="Nama" value={form.nama_fire_watch || "Belum diisi"} />
                  <F label="NIK"  value={form.nik_fire_watch  || "Belum diisi"} />
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-green-700">Pemberi Izin (SPV)</p>
                    {isTruthy(form.spv_approved) ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">✓ Approved</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Menunggu SPV</span>
                    )}
                  </div>
                  <F label="Jabatan" value={form.jabatan_pemberi_izin || "Belum diisi"} />
                  <F label="NIK"     value={form.nik_pemberi_ijin     || "Belum diisi"} />
                </div>
              </div>
            </Sec>

            <Sec title="Bagian 2: Jenis Pekerjaan & Area Berisiko">
              <div className="mb-3 flex flex-wrap gap-2">
                {isTruthy(form.preventive_genset_pump_room) && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Preventive Genset</span>}
                {isTruthy(form.tangki_solar)                && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Tangki Solar</span>}
                {isTruthy(form.panel_listrik)               && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Panel Listrik</span>}
              </div>
              {[
                { l: "Cutting",  d: form.detail_cutting,  m: form.t_mulai_cutting,  s: form.t_selesai_cutting  },
                { l: "Grinding", d: form.detail_grinding, m: form.t_mulai_grinding, s: form.t_selesai_grinding },
                { l: "Welding",  d: form.detail_welding,  m: form.t_mulai_welding,  s: form.t_selesai_welding  },
                { l: "Painting", d: form.detail_painting, m: form.t_mulai_painting, s: form.t_selesai_painting },
              ].filter(x => x.d || x.m).map(x => (
                <div key={x.l} className="flex gap-2 py-1.5 border-b border-slate-100 text-sm last:border-0">
                  <span className="font-bold w-16 text-slate-700 shrink-0">{x.l}</span>
                  <span className="flex-1 text-slate-600">{x.d}</span>
                  {(x.m || x.s) && <span className="text-xs text-slate-400 shrink-0">{formatTime(x.m)}–{formatTime(x.s)}</span>}
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {isTruthy(form.ruang_tertutup)         && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">Ruang Tertutup</span>}
                {isTruthy(form.bahan_mudah_terbakar)   && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">Bahan Mudah Terbakar</span>}
                {isTruthy(form.gas_bejana_tangki)      && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">Gas/Bejana/Tangki</span>}
                {isTruthy(form.height_work)            && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">Ketinggian</span>}
                {isTruthy(form.cairan_hydrocarbon)     && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">Hydrocarbon</span>}
              </div>
            </Sec>

            <Sec title="Bagian 3: Upaya Pencegahan">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <BF label="Equipment / Tools kondisi baik"      value={form.kondisi_tools_baik} />
                  <BF label="APAR / Hydrant tersedia"             value={form.tersedia_apar_hydrant} />
                  <BF label="Sensor Smoke Detector non-aktif"     value={form.sensor_smoke_detector_non_aktif} />
                  <BF label="APD lengkap dipakai"                 value={form.apd_lengkap} />
                  <BF label="Tidak ada cairan mudah terbakar"     value={form.tidak_ada_cairan_mudah_terbakar} />
                  <BF label="Lantai bersih"                       value={form.lantai_bersih} />
                  <BF label="Lantai dibasahi"                     value={form.lantai_sudah_dibasahi} />
                  <BF label="Cairan mudah terbakar tertutup"      value={form.cairan_mudah_tebakar_tertutup} />
                </div>
                <div>
                  <BF label="Lembaran di bawah pekerjaan"         value={form.lembaran_dibawah_pekerjaan} />
                  <BF label="Lindungi conveyor, kabel"            value={form.lindungi_conveyor_dll} />
                  <BF label="Alat dibersihkan"                    value={form.alat_telah_bersih} />
                  <BF label="Uap menyala dibuang"                 value={form.uap_menyala_telah_dibuang} />
                  <BF label="Konstruksi tidak mudah terbakar"     value={form.kerja_pada_dinding_lagit} />
                  <BF label="Bahan mudah terbakar dipindahkan"    value={form.bahan_mudah_terbakar_dipindahkan_dari_dinding} />
                  <BF label="Fire watch memastikan area aman"     value={form.fire_watch_memastikan_area_aman} />
                  <BF label="Fire watch terlatih pakai APAR"      value={form.firwatch_terlatih} />
                </div>
              </div>
              {form.permintaan_tambahan && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <span className="font-semibold text-amber-700">Permintaan Tambahan: </span>
                  <span className="text-slate-700">{form.permintaan_tambahan}</span>
                </div>
              )}
            </Sec>
          </>
        ) : (
          <>
            <Sec title="Informasi Pekerjaan di Ketinggian">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <F label="Tipe Petugas"           value={getTipeLabel(form.tipe_perusahaan || form.petugas_ketinggian)} />
                <F label="Deskripsi Pekerjaan"    value={form.deskripsi_pekerjaan} />
                <F label="Lokasi"                 value={form.lokasi} />
                <F label="Tanggal Pelaksanaan"    value={formatDate(form.tanggal_pelaksanaan)} />
                <F label="Waktu Mulai"            value={formatTime(form.waktu_mulai)} />
                <F label="Waktu Selesai"          value={formatTime(form.waktu_selesai)} />
                <F label="Pengawas Kontraktor"    value={form.nama_pengawas_kontraktor} />
                <F label="Pengawas Departemen"    value={form.nama_pengawas_departemen} />
                <F label="Departemen"             value={form.nama_departemen} />
              </div>
            </Sec>

            <Sec title="Pengecekan Keselamatan">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <BF label="Area kerja aman"                  value={form.area_diperiksa_aman} />
                  <BF label="Paham prosedur kebakaran"         value={form.paham_cara_menggunakan_alat_pemadam_kebakaran} />
                  <BF label="Ada pekerjaan listrik"            value={form.ada_kerja_listrik} />
                  <BF label="Prosedur LOTO"                    value={form.prosedur_loto} />
                  <BF label="Safety line baik"                 value={form.safetyline_tersedia} />
                </div>
                <div>
                  <BF label="Webbing harness baik"             value={form.webbing_kondisi_baik} />
                  <BF label="D-Ring baik"                      value={form.dring_kondisi_baik} />
                  <BF label="Snap Hook baik"                   value={form.snap_hook_kondisi_baik} />
                  <BF label="Helm sesuai standar"              value={form.helm_sesuai_sop} />
                  <BF label="Rambu safety tersedia"            value={form.rambu2_tersedia} />
                </div>
              </div>
            </Sec>
          </>
        )}

        {/* ── ACTION PANEL ── */}
        {form.status === "submitted" && (
          userRole === "admin" ? (
            <div className="bg-slate-50 rounded-xl border-2 border-slate-300 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 rounded-lg shrink-0">
                  <Eye className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-base">Mode Monitoring (Admin)</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Admin hanya dapat melihat detail form. Tindakan approve dan reject tidak tersedia untuk role ini.
                  </p>
                </div>
              </div>
            </div>
          ) : isFirewatchRole ? (
            <div className="bg-amber-50 rounded-xl border-2 border-amber-300 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-200 rounded-lg shrink-0">
                  <Flame className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-700 text-base">Fire Watch — Tidak Dapat Approve</h3>
                  <p className="text-sm text-amber-600 mt-0.5">
                    Role Fire Watch tidak lagi termasuk dalam rantai approval. Form ini menunggu persetujuan dari{" "}
                    <strong>{isEksternal ? "Kontraktor" : "SPV"}</strong>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1 text-base">Keputusan Approval</h3>
              <p className="text-xs text-slate-500 mb-5">
                Anda login sebagai: <strong>{roleLabel[userRole] || userRole}</strong>
                {userNama && <> — {userNama}</>}
                {userNik  && <> (NIK: <span className="font-mono">{userNik}</span>)</>}
              </p>

              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 mb-5">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {userRole === "spv" && isHotOrWorkshop
                    ? <>Jabatan Pemberi Izin (<strong>{userJabatan || "—"}</strong>) dan NIK Anda (<strong className="font-mono">{userNik || "—"}</strong>) akan otomatis tersimpan saat Anda menyetujui.</>
                    : <>Nama Anda (<strong>{userNama}</strong>) akan otomatis tercatat sebagai approver.</>
                  }
                </p>
              </div>

              {showReject && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <label className="block text-sm font-bold text-red-700 mb-2">
                    Catatan Alasan Penolakan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    placeholder="Jelaskan alasan penolakan secara spesifik..."
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent text-black resize-none"
                  />
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {!showReject && (
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {getApproveButtonLabel()}
                  </button>
                )}

                {!showReject ? (
                  <button
                    onClick={() => setShowReject(true)}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-sm transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Tolak Form
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction("reject")}
                      disabled={submitting || !catatan.trim()}
                      className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl font-semibold text-sm transition-colors"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Konfirmasi Tolak
                    </button>
                    <button
                      onClick={() => { setShowReject(false); setCatatan(""); setError(""); }}
                      className="px-4 py-3 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}