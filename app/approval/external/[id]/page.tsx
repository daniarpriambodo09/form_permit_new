"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { useApproverAuth } from "@/hooks/useApproverAuth";
import AuthLoadingSpinner from "@/components/AuthLoadingSpinner";
import type { JsaData } from "@/components/JsaBuilderSection";
import JsaApprovalCard from "@/components/JsaApprovalCard";

const labels: Record<string, string> = {
  "hot-work": "Hot Work",
  "height-work": "Height Work",
  workshop: "Workshop",
};

export default function ExternalApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useApproverAuth();
  const [data, setData] = useState<{ general: any; attachments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    fetch(`/form-permit/api/approval/external/${id}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat form eksternal");
        setData(result.data);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [authLoading, user, id]);

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

  if (authLoading || !user) return <AuthLoadingSpinner />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center gap-3"><AlertCircle className="w-10 h-10 text-red-400" /><p>{error || "Form tidak ditemukan."}</p><Link href="/approval" className="text-orange-600">Kembali</Link></div>;

  const general = data.general;
  const jsa = general.jsa_data as JsaData | null;
  const pending = data.attachments.some((attachment) => attachment.status === "submitted");
  const jsaApproval = jsa?.approval;
  const jsaRole: "firewatch" | "spv" | "sfo" | null = jsaApproval ? (["firewatch", "spv", "sfo"] as const)[jsaApproval.currentStage - 1] ?? null : null;
  const canApproveJsa = Boolean(jsaApproval && jsaApproval.status === "submitted" && (user?.role === jsaRole || user?.role === "admin"));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/approval" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></Link>
          <div><h1 className="font-bold text-slate-900">Ijin Kerja Eksternal - {id}</h1><p className="text-xs text-slate-500">Form induk dan seluruh lampiran pekerjaan</p></div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {message && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{message}</div>}

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-4">Form Ijin Kerja Eksternal</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-xs text-slate-400">Kontraktor/Pekerja</span><p className="font-semibold">{general.nama_kontraktor_pekerja || "-"}</p></div>
            <div><span className="text-xs text-slate-400">Departemen</span><p className="font-semibold">{general.pembuat_departmen || "-"}</p></div>
            <div><span className="text-xs text-slate-400">Jumlah Tenaga Kerja</span><p className="font-semibold">{general.jumlah_tenaga_kerja ?? "-"}</p></div>
            <div><span className="text-xs text-slate-400">Lokasi</span><p className="font-semibold">{general.lokasi_pekerjaan || "-"}</p></div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-orange-600" /><h2 className="font-bold text-slate-800">JSA</h2></div>
          {!general.perlu_jsa ? <p className="text-sm text-slate-500">JSA tidak diperlukan.</p> : !jsa ? <p className="text-sm text-amber-700">JSA belum dibuat.</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[["Area", jsa.area], ["Jenis Pekerjaan", jsa.jenisPekerjaan], ["Sect/Dept", jsa.sectDept], ["PIC", jsa.pic]].map(([label, value]) => <div key={label}><span className="text-xs text-slate-400">{label}</span><p className="font-semibold">{value || "-"}</p></div>)}
              </div>
              <div><p className="text-sm font-semibold mb-2">Petugas Yang Mengerjakan</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{jsa.petugas.filter(Boolean).map((name, index) => <p key={index} className="text-sm p-2 bg-slate-50 rounded">{index + 1}. {name}</p>)}</div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-xs"><thead className="bg-slate-100"><tr>{["Tanggal", "Jenis Pekerjaan", "Langkah Kerja", "Potensi Bahaya", "Pengendalian", "Saran"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{jsa.rows.map((row, index) => <tr key={index} className="border-t border-slate-200 align-top">{[row.tanggal, row.jenisPekerjaan, row.langkahKerja, row.potensiBahaya, row.pengendalian, row.saran].map((value, cellIndex) => <td key={cellIndex} className="p-2 whitespace-pre-wrap">{value || "-"}</td>)}</tr>)}</tbody></table></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{jsaApproval && ([['firewatch', 'Fire Watch'], ['spv', 'SPV'], ['sfo', 'SFO']] as const).map(([role, label]) => <JsaApprovalCard key={role} label={label} role={role} entry={jsaApproval[role]} formId={id} />)}</div>
              {canApproveJsa && <button type="button" onClick={approveJsa} disabled={actionLoading} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{actionLoading ? "Memproses..." : `Approve JSA (${jsaRole})`}</button>}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-3">Lampiran Jenis Pekerjaan</h2>
          <div className="space-y-2">{data.attachments.map((attachment) => <div key={attachment.id_form} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg"><div><p className="font-semibold text-sm">{labels[attachment.jenis_form] || attachment.jenis_form} - {attachment.id_form}</p><p className="text-xs text-slate-500">Status: {attachment.status}, tahap: {attachment.current_stage}</p></div><span className={`text-xs font-semibold ${attachment.status === "approved" ? "text-green-600" : attachment.status === "rejected" ? "text-red-600" : "text-blue-600"}`}>{attachment.status}</span></div>)}</div>
        </section>

        <div className="flex justify-end pb-8"><button type="button" onClick={approveAttachments} disabled={!pending || actionLoading} className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold disabled:opacity-50"><CheckCircle className="w-4 h-4" />{actionLoading ? "Memproses..." : "Approve Lampiran Yang Tersedia"}</button></div>
      </main>
    </div>
  );
}
