"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, FileText, Shield, ClipboardList } from "lucide-react";
import { useApproverAuth } from "@/hooks/useApproverAuth";
import AuthLoadingSpinner from "@/components/AuthLoadingSpinner";
import type { JsaData } from "@/components/JsaBuilderSection";
import JsaApprovalCard from "@/components/JsaApprovalCard";
import SafetyInductionSection, { createEmptySafetyInduction, type SafetyInductionData } from "@/components/SafetyInductionSection";

const labels: Record<string, string> = {
  "hot-work": "Hot Work",
  "height-work": "Height Work",
  workshop: "Workshop",
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  submitted: { label: "Diajukan", cls: "bg-blue-100 text-blue-700" },
  approved: { label: "Disetujui", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
};

export default function ExternalApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useApproverAuth();
  const [data, setData] = useState<{ general: any; attachments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [safetyInduction, setSafetyInduction] = useState<SafetyInductionData>(createEmptySafetyInduction);

  const isSecurity = user?.role === "security";
  const isAdmin = user?.role === "admin";

  const loadData = () =>
    fetch(`/form-permit/api/approval/external/${id}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat form eksternal");
        setData(result.data);
        if (result.data.general.safety_induction) setSafetyInduction(result.data.general.safety_induction);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (authLoading || !user) return;
    loadData();
  }, [authLoading, user, id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Simpan Safety Induction ───────────────────────────────────
  const saveSafetyInduction = async (submit: boolean) => {
    const response = await fetch(`/form-permit/api/approval/external/${id}/safety-induction`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safetyInduction, submit }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Safety Induction gagal disimpan");
    setSafetyInduction(result.data);
    setMessage(submit ? "Safety Induction berhasil disetujui." : "Safety Induction berhasil disimpan sebagai draft.");
    // Refresh data
    const refreshed = await fetch(`/form-permit/api/approval/external/${id}`, { credentials: "include" });
    if (refreshed.ok) {
      const refreshedData = (await refreshed.json()).data;
      setData(refreshedData);
    }
  };

  if (authLoading || !user) return <AuthLoadingSpinner />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center gap-3"><AlertCircle className="w-10 h-10 text-red-400" /><p>{error || "Form tidak ditemukan."}</p><Link href="/approval" className="text-orange-600">Kembali</Link></div>;

  const general = data.general;
  const jsa = general.jsa_data as JsaData | null;
  const pending = data.attachments.some((attachment) => attachment.status === "submitted");
  const jsaApproval = jsa?.approval;
  const jsaRole: "firewatch" | "spv" | "sfo" | null = jsaApproval
    ? (["firewatch", "spv", "sfo"] as const)[jsaApproval.currentStage - 1] ?? null
    : null;
  const canApproveJsa = Boolean(jsaApproval && jsaApproval.status === "submitted" && (user?.role === jsaRole || isAdmin));

  // Status Safety Induction
  const siStatus = general.safety_induction?.status;
  const siApproved = siStatus === "approved";
  const siHasData = general.safety_induction?.namaSubcont;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/approval" className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="font-bold text-slate-900">Ijin Kerja Eksternal — {id}</h1>
            <p className="text-xs text-slate-500">
              {isSecurity ? "Form Safety Induction untuk diisi" : "Form induk dan seluruh lampiran pekerjaan"}
            </p>
          </div>
          {/* Role badge */}
          <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${isSecurity ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"
            }`}>
            {isSecurity ? "🛡️ Security" : `👤 ${user.role}`}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {message && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{message}</div>}

        {/* Info Form Induk */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-orange-600" />
            <h2 className="font-bold text-slate-800">Form Ijin Kerja Eksternal</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-xs text-slate-400">ID Form</span><p className="font-semibold font-mono">{general.id_form}</p></div>
            <div><span className="text-xs text-slate-400">Kontraktor/Pekerja</span><p className="font-semibold">{general.nama_kontraktor_pekerja || "-"}</p></div>
            <div><span className="text-xs text-slate-400">Jumlah Tenaga Kerja</span><p className="font-semibold">{general.jumlah_tenaga_kerja ?? "-"}</p></div>
            <div><span className="text-xs text-slate-400">Lokasi</span><p className="font-semibold">{general.lokasi_pekerjaan || "-"}</p></div>
            <div><span className="text-xs text-slate-400">Nama Pengawas/PIC</span><p className="font-semibold">{general.nama_pengawas_pic_subkont || "-"}</p></div>
            <div><span className="text-xs text-slate-400">Deskripsi Pekerjaan</span><p className="font-semibold">{general.deskripsi_pekerjaan || "-"}</p></div>
            <div><span className="text-xs text-slate-400">Status Form</span>
              <span className={`inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig[general.status]?.cls || "bg-slate-100 text-slate-600"}`}>
                {statusConfig[general.status]?.label || general.status}
              </span>
            </div>
            <div><span className="text-xs text-slate-400">Departemen Pembuat</span><p className="font-semibold">{general.pembuat_departmen || "-"}</p></div>
          </div>
        </section>

        {/* === SAFETY INDUCTION SECTION === */}
        {/* Untuk semua role: tampilkan Safety Induction */}
        {/* Security & admin: bisa edit/submit. Role lain: read-only */}
        <section className="rounded-xl border-2 border-teal-200 bg-teal-50 overflow-hidden">
          <div className="px-5 py-3 bg-teal-600 flex items-center gap-3">
            <Shield className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white">Form Safety Induction</h2>
              <p className="text-xs text-teal-100">
                {isSecurity ? "Isi dan setujui form Safety Induction ini" : "Diisi oleh Security berdasarkan Ijin Kerja Eksternal"}
              </p>
            </div>
            {/* Status badge */}
            <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${siApproved ? "bg-green-100 text-green-800" :
              siHasData ? "bg-yellow-100 text-yellow-800" :
                "bg-white/80 text-teal-800"
              }`}>
              {siApproved ? "✓ Sudah Disetujui" : siHasData ? "📝 Draft" : "⏳ Belum Diisi"}
            </span>
          </div>
          <div className="bg-white p-5">
            {siApproved && !isSecurity && !isAdmin ? (
              // Role lain, SI sudah approved → tampilkan ringkasan
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800 font-semibold">
                    Safety Induction sudah disetujui oleh Security
                    {general.safety_induction?.approvedBy && <span className="font-bold"> ({general.safety_induction.approvedBy})</span>}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-slate-500">Nama Subcont</span><p className="font-semibold">{general.safety_induction?.namaSubcont || "-"}</p></div>
                  <div><span className="text-xs text-slate-500">Aktivitas</span><p className="font-semibold">{general.safety_induction?.aktivitasPekerjaan || "-"}</p></div>
                </div>
              </div>
            ) : (
              // Security/admin: bisa edit, atau belum approved
              <SafetyInductionSection
                value={safetyInduction}
                setValue={setSafetyInduction}
                readOnly={!isSecurity && !isAdmin}
                onSave={isSecurity || isAdmin ? saveSafetyInduction : undefined}
              />
            )}
          </div>
        </section>

        {/* === JSA SECTION === */}
        {/* Security hanya lihat sebagai referensi, tidak bisa approve JSA */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-600" />
            <h2 className="font-bold text-slate-800">JSA (Job Safety Analysis)</h2>
            {isSecurity && (
              <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Referensi</span>
            )}
          </div>
          {!general.perlu_jsa ? (
            <p className="text-sm text-slate-500">JSA tidak diperlukan untuk form ini.</p>
          ) : !jsa ? (
            <p className="text-sm text-amber-700">JSA belum dibuat.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[["Area", jsa.area], ["Jenis Pekerjaan", jsa.jenisPekerjaan], ["Sect/Dept", jsa.sectDept], ["PIC", jsa.pic]].map(([label, value]) => (
                  <div key={label}><span className="text-xs text-slate-400">{label}</span><p className="font-semibold">{value || "-"}</p></div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Petugas Yang Mengerjakan</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {jsa.petugas.filter(Boolean).map((name, index) => (
                    <p key={index} className="text-sm p-2 bg-slate-50 rounded">{index + 1}. {name}</p>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-xs">
                  <thead className="bg-slate-100">
                    <tr>{["Tanggal", "Jenis Pekerjaan", "Langkah Kerja", "Potensi Bahaya", "Pengendalian", "Saran"].map((heading) => (
                      <th key={heading} className="p-2 text-left">{heading}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {jsa.rows.map((row, index) => (
                      <tr key={index} className="border-t border-slate-200 align-top">
                        {[row.tanggal, row.jenisPekerjaan, row.langkahKerja, row.potensiBahaya, row.pengendalian, row.saran].map((value, cellIndex) => (
                          <td key={cellIndex} className="p-2 whitespace-pre-wrap">{value || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* JSA Approval — hanya tampilkan untuk non-security */}
              {!isSecurity && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {jsaApproval && (["firewatch", "spv", "sfo"] as const).map((role) => {
                      const roleLabel: Record<string, string> = { firewatch: "Fire Watch", spv: "SPV", sfo: "SFO" };
                      return <JsaApprovalCard key={role} label={roleLabel[role]} role={role} entry={jsaApproval[role]} formId={id} />;
                    })}
                  </div>
                  {canApproveJsa && (
                    <button type="button" onClick={approveJsa} disabled={actionLoading}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                      {actionLoading ? "Memproses..." : `Approve JSA (${jsaRole})`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* === LAMPIRAN FORM JENIS PEKERJAAN === */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-orange-600" />
            <h2 className="font-bold text-slate-800">Lampiran Jenis Pekerjaan</h2>
            {isSecurity && (
              <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Referensi</span>
            )}
          </div>
          {data.attachments.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Belum ada form jenis pekerjaan yang terkait.</p>
          ) : (
            <div className="space-y-2">
              {data.attachments.map((attachment) => {
                const sc = statusConfig[attachment.status] || statusConfig.draft;
                return (
                  <div key={attachment.id_form} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800">
                        {labels[attachment.jenis_form] || attachment.jenis_form}
                        <span className="ml-2 font-mono text-xs text-slate-500">{attachment.id_form}</span>
                      </p>
                      {attachment.lokasi_pekerjaan && (
                        <p className="text-xs text-slate-400 truncate">{attachment.lokasi_pekerjaan}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tahap: {attachment.current_stage}
                        {attachment.tipe_perusahaan && ` · ${attachment.tipe_perusahaan}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${sc.cls}`}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tombol Approve Lampiran — hanya untuk non-security */}
        {!isSecurity && (
          <div className="flex justify-end pb-8">
            <button
              type="button"
              onClick={approveAttachments}
              disabled={!pending || actionLoading}
              className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? "Memproses..." : "Approve Lampiran Yang Tersedia"}
            </button>
          </div>
        )}

        {/* Padding bawah untuk security */}
        {isSecurity && <div className="pb-8" />}
      </main>
    </div>
  );
}
