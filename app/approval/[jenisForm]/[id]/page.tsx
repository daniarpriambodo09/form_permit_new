// app/approval/[jenisForm]/[id]/page.tsx
// REFACTOR: Role 'pga' diganti 'smr'. Kolom DB mr_pga_* tetap.
// SECURITY: Auth guard via useApproverAuth — tidak lagi mengandalkan sessionStorage untuk auth.
// FIX: Halaman detail approval sekarang menampilkan SELURUH informasi form yang diisi worker,
//      termasuk field yang sebelumnya tidak ditampilkan sama sekali:
//        - Height-work: daftar petugas + status sehat + foto lisensi (Bagian 2),
//          peminjaman APD (Bagian 3), dan seluruh item checklist Bagian 4 & 5.
//        - Hot-work/Workshop: cairan/gas bertekanan, bahaya lain, pekerjaan lainnya,
//          fire blanket (hot-work), spray/non-spray (workshop), dan permintaan tambahan.
//
// UPDATED: Height-work Bagian 5 (Pengecekan Body Harness & Lanyard) TIDAK LAGI diisi
//          worker di form pembuatan. Sekarang:
//            - Role SEBELUM Admin K3 (SPV untuk internal; Kontraktor & SPV untuk
//              eksternal) melihat teks placeholder — checklist belum tersedia.
//            - Role Admin K3, pada gilirannya (status submitted & current_stage
//              == stage Admin K3), melihat checklist INTERAKTIF dan mengisinya
//              bersamaan dengan aksi approve.
//            - Setelah Admin K3 approve (admin_k3_approved = true), SEMUA role
//              (termasuk SFO, SMR, dan Admin K3 sendiri jika kembali membuka
//              halaman ini) melihat hasil checklist dalam mode read-only.
//
// UPDATED: Bagian 5 sekarang juga menyertakan checklist "Helm" (sebelumnya
//          belum ada), mengikuti pola yang sama seperti item Body Harness &
//          Lanyard lainnya — diisi oleh Admin K3 saat approve, kolom DB
//          helm_kondisi_baik, dikirim via body.harness_checklist.
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
  LogOut, ZoomIn, X, Lock,
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

function resolveFileUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http") ? url : `${window.location.origin}${url}`;
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
    const fileUrl = resolveFileUrl(jsaFileUrl);

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

// ── Image lightbox untuk foto lisensi petugas ketinggian ──────
function ImageLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm truncate pr-4">{label}</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="w-full max-h-[70vh] object-contain rounded-lg bg-slate-50" />
        </div>
      </div>
    </div>
  );
}

// ── Bagian 2 Height-work: Petugas Ketinggian & Status Kesehatan ──
const PetugasKetinggianSection = ({ form }: { form: any }) => {
  const [preview, setPreview] = useState<{ src: string; label: string } | null>(null);

  const petugasList = Array.from({ length: 10 })
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
    .filter(Boolean) as { idx: number; nama: string; sehat: boolean; foto: string | null }[];

  if (petugasList.length === 0) {
    return <p className="text-sm text-slate-400 italic">Belum ada petugas yang diisi pada form ini.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {petugasList.map(({ idx, nama, sehat, foto }) => (
          <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">{idx}</span>
              <span className="text-sm font-semibold text-slate-800 truncate">{nama}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold ${sehat ? "text-green-600" : "text-red-500"}`}>
                {sehat ? "✓ Berbadan Sehat" : "✗ Tidak Sehat"}
              </span>
              {foto ? (
                <button
                  type="button"
                  onClick={() => setPreview({ src: resolveFileUrl(foto), label: `Lisensi — ${nama}` })}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Lihat Lisensi
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Belum Ada Foto
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {preview && (
        <ImageLightbox src={preview.src} label={preview.label} onClose={() => setPreview(null)} />
      )}
    </>
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

  // ── Height-work: state checklist Helm, Body Harness & Lanyard (Bagian 5),
  //    diisi oleh Admin K3 saat approve. Harus dideklarasikan sebelum
  //    early return apa pun agar urutan hooks tetap konsisten.
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
      const patchBody: Record<string, any> = { action, catatan_reject: catatan };

      // Height-work: sertakan checklist Helm, Body Harness & Lanyard hanya saat
      // Admin K3 melakukan approve — role lain tidak mengirim field ini.
      if (jenisForm === "height-work" && user?.role === "admin_k3" && action === "approve") {
        patchBody.harness_checklist = {
          helm_kondisi_baik:                 harness.helm,
          webbing_kondisi_baik:              harness.webbing,
          dring_kondisi_baik:                harness.dring,
          gesper_kondisi_baik:               harness.gesper,
          absorter_dan_timbes_kondisi_baik:  harness.absorber,
          snap_hook_kondisi_baik:            harness.snapHook,
          rope_lanyard_kondisi_baik:         harness.rope,
        };
      }

      const res = await fetch(`/form-permit/api/approval/${jenisForm}/${id}`, {
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

  // ── Height-work: kapan Bagian 5 (Helm, Body Harness & Lanyard) editable ──
  // Stage Admin K3: internal = 2, eksternal = 3 (lihat penomoran di renderApprovalChain).
  const heightWorkAdminK3Stage = isEksternal ? 3 : 2;
  const harnessAlreadyApproved = isTruthy(form.admin_k3_approved);
  const isAdminK3TurnForHarness =
    jenisForm === "height-work" &&
    userRole === "admin_k3" &&
    form.status === "submitted" &&
    (form.current_stage ?? 1) === heightWorkAdminK3Stage;

  // Badge area berisiko tinggi (hot-work & workshop)
  const areaBerisikoBadges: { label: string; active: boolean }[] = [
    { label: "Ruang Tertutup",        active: isTruthy(form.ruang_tertutup) },
    { label: "Bahan Mudah Terbakar",  active: isTruthy(form.bahan_mudah_terbakar) },
    { label: "Gas/Bejana/Tangki",     active: isTruthy(form.gas_bejana_tangki) },
    { label: "Ketinggian",            active: isTruthy(form.height_work) },
    { label: "Cairan/Gas Bertekanan", active: isTruthy(form.cairan_gas_bertekan) },
    { label: "Cairan Hydrocarbon",    active: isTruthy(form.cairan_hydrocarbon) },
  ];

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
        {form.tipe_perusahaan && (
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
                {form.nik_pekerja && <F label="NIK Pekerja" value={form.nik_pekerja} />}
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

              {/* Painting: Spray / Non Spray — khusus Workshop */}
              {isWorkshop && (isTruthy(form.painting_spray) || isTruthy(form.painting_non_spray)) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {isTruthy(form.painting_spray)    && <span className="px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded text-xs font-semibold">SPRAY</span>}
                  {isTruthy(form.painting_non_spray) && <span className="px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded text-xs font-semibold">NON SPRAY</span>}
                </div>
              )}

              {/* Pekerjaan lainnya */}
              {isTruthy(form.ada_kerja_lainnya) && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <span className="font-semibold text-slate-700">Pekerjaan Lainnya: </span>
                  <span className="text-slate-600">{form.jenis_kerjaan_lainnya || "-"}</span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {areaBerisikoBadges.filter(b => b.active).map(b => (
                  <span key={b.label} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">{b.label}</span>
                ))}
              </div>
              {form.bahaya_lain && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <span className="font-semibold text-red-700">Bahaya Lain: </span>
                  <span className="text-red-700">{form.bahaya_lain}</span>
                </div>
              )}
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

              {/* Fire Blanket / Perisai Metal — khusus Hot Work */}
              {isHotWork && (form.kondisi_fire_blanket !== null && form.kondisi_fire_blanket !== undefined) && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fire Blanket / Perisai Metal</p>
                  <div className="grid grid-cols-2 gap-4">
                    <F label="Kondisi" value={isTruthy(form.kondisi_fire_blanket) ? "Layak" : "Tidak Layak"} />
                    <F label="Jumlah"  value={form.jumlah_fire_blanket ?? "-"} />
                  </div>
                </div>
              )}

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
            <Sec title="Bagian 1: Informasi Pekerjaan di Ketinggian">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <F label="Tipe Petugas"           value={getTipeLabel(form.tipe_perusahaan || form.petugas_ketinggian)} />
                <F label="Deskripsi Pekerjaan"    value={form.deskripsi_pekerjaan} />
                <F label="Lokasi"                 value={form.lokasi} />
                <F label="Tanggal Pelaksanaan"    value={formatDate(form.tanggal_pelaksanaan)} />
                <F label="Waktu Mulai"            value={formatTime(form.waktu_mulai)} />
                <F label="Waktu Selesai"          value={formatTime(form.waktu_selesai)} />
                {isEksternal ? (
                  <F label="Pengawas Kontraktor"  value={form.nama_pengawas_kontraktor} />
                ) : (
                  <>
                    <F label="Departemen"            value={form.nama_departemen} />
                    <F label="Pengawas Departemen"   value={form.nama_pengawas_departemen} />
                  </>
                )}
              </div>
            </Sec>

            <Sec title="Bagian 2: Nama Petugas Ketinggian & Status Kesehatan">
              <PetugasKetinggianSection form={form} />
            </Sec>

            <Sec title="Bagian 3: Peminjaman APD">
              <div className="space-y-0">
                <BF label="Kunci Pagar Tangga Listrik" value={form.ada_kunci_pagar} />
                <BF label="Rompi Ketinggian"           value={form.ada_rompi_ketinggian} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                {isTruthy(form.ada_rompi_ketinggian) && (
                  <F label="No. Rompi" value={form.no_rompi ?? "-"} />
                )}
                <F label="Jumlah Safety Helmet"      value={form.jumlah_safety_helmet ?? "-"} />
                <F label="Jumlah Full Body Harness"  value={form.jumlah_full_body_harness ?? "-"} />
              </div>
            </Sec>

            <Sec title="Bagian 4: Keselamatan Kerja Ketinggian">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <BF label="Area kerja diperiksa dan aman"                       value={form.area_diperiksa_aman} />
                  <BF label="Paham cara menggunakan alat pemadam kebakaran"       value={form.paham_cara_menggunakan_alat_pemadam_kebakaran} />
                  <BF label="Ada pekerjaan listrik"                               value={form.ada_kerja_listrik} />
                  <BF label="Prosedur LOTO diterapkan"                            value={form.prosedur_loto} />
                  <BF label="Menutupi area bawah dengan prisai"                   value={form.menutupi_area_bawah_prisai} />
                  <BF label="Safety line tersedia"                                value={form.safetyline_tersedia} />
                </div>
                <div>
                  <BF label="Alat bantu kerja dalam kondisi aman"                 value={form.alat_bantu_kerja_aman} />
                  <BF label="Menggunakan rompi saat bekerja"                      value={form.menggunakan_rompi} />
                  <BF label="Beban tidak melebihi 5 kg"                           value={form.beban_tidak_5kg} />
                  <BF label="Helm sesuai standar SOP"                             value={form.helm_sesuai_sop} />
                  <BF label="Rambu-rambu keselamatan tersedia"                    value={form.rambu2_tersedia} />
                </div>
              </div>
            </Sec>

            <Sec title="Bagian 5: Pengecekan Helm, Body Harness & Lanyard">
              {harnessAlreadyApproved ? (
                // ── Sudah diperiksa Admin K3 — tampilkan hasil, read-only untuk semua role ──
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Helm</p>
                    <BF label="Helm kondisi baik"                value={form.helm_kondisi_baik} />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-3">Body Harness</p>
                    <BF label="Webbing kondisi baik"            value={form.webbing_kondisi_baik} />
                    <BF label="D-Ring kondisi baik"              value={form.dring_kondisi_baik} />
                    <BF label="Adjustment Buckle (Gesper) baik"  value={form.gesper_kondisi_baik} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lanyard</p>
                    <BF label="Absorber & Timbles kondisi baik"  value={form.absorter_dan_timbes_kondisi_baik} />
                    <BF label="Snap Hook kondisi baik"           value={form.snap_hook_kondisi_baik} />
                    <BF label="Rope Lanyard kondisi baik"        value={form.rope_lanyard_kondisi_baik} />
                  </div>
                  {form.admin_k3_approved_by && (
                    <div className="md:col-span-2 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span className="text-xs text-slate-500">
                        Diperiksa &amp; disetujui oleh Admin K3: <strong className="text-slate-700">{form.admin_k3_approved_by}</strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : isAdminK3TurnForHarness ? (
                // ── Giliran Admin K3 — checklist interaktif, tersimpan saat approve ──
                <div className="space-y-4">
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Lakukan pengecekan fisik Helm, Body Harness &amp; Lanyard, lalu centang item yang kondisinya baik. Checklist ini akan tersimpan otomatis saat Anda menekan tombol <strong>Setujui (Admin K3)</strong> di bawah.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Helm</p>
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={harness.helm}
                        onChange={(e) => setHarness((prev) => ({ ...prev, helm: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400 shrink-0 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-700">Helm</span>
                        <p className="text-xs text-slate-500 mt-0.5">Kondisi baik (tidak retak/pecah, tali pengait masih kokoh, ukuran sesuai kepala petugas)</p>
                      </div>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Body Harness</p>
                      <div className="space-y-1">
                        {[
                          { key: "webbing", label: "Webbing", desc: "Kondisi jahitan baik (tidak lepas, tidak berserabut)" },
                          { key: "dring",   label: "D-Ring",  desc: "Kondisi baik (tidak retak/bengkok/berkarat, dapat diputar bebas/fleksibel)" },
                          { key: "gesper",  label: "Adjustment Buckle (Gesper)", desc: "Kondisi baik (tidak retak/bengkok/berkarat, dapat mengunci sempurna)" },
                        ].map((item) => (
                          <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={(harness as any)[item.key]}
                              onChange={(e) => setHarness((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                              className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400 shrink-0 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lanyard</p>
                      <div className="space-y-1">
                        {[
                          { key: "absorber", label: "Absorber & Timbles", desc: "Kondisi baik (sarung penutup tidak rusak, terpasang tepat pada ujung mata sambungan)" },
                          { key: "snapHook", label: "Snap Hook",          desc: "Kondisi baik (tidak retak/bengkok/berkarat, dapat terkunci dengan sempurna)" },
                          { key: "rope",     label: "Rope Lanyard",       desc: "Kondisi baik (tidak berserabut, fiber tidak aus/terpotong)" },
                        ].map((item) => (
                          <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={(harness as any)[item.key]}
                              onChange={(e) => setHarness((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                              className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400 shrink-0 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // ── Belum giliran Admin K3 (SPV/Kontraktor, atau role lain sebelum Admin K3) ──
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-600">
                    Pengecekan Helm, Body Harness &amp; Lanyard dilakukan dan disetujui oleh <strong>Admin K3</strong> pada tahap approval berikutnya.
                  </span>
                </div>
              )}
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

              {/* Peringatan halus: Admin K3 belum mencentang seluruh checklist harness */}
              {isAdminK3TurnForHarness && !showReject && Object.values(harness).some((v) => !v) && (
                <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Belum semua item Helm, Body Harness &amp; Lanyard dicentang. Anda tetap bisa menyetujui, namun pastikan item yang tidak dicentang memang belum diperiksa atau kondisinya tidak baik.
                  </p>
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