import { AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";

export default async function JsaVerificationPage({ params }: { params: Promise<{ id: string; role: string }> }) {
  const { id, role } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
  const response = await fetch(`${baseUrl}/api/approval-verification/jsa/${id}/${role}`, { cache: "no-store" });
  const result = await response.json();

  if (!response.ok || !result.success) return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 p-6"><AlertCircle className="w-12 h-12 text-red-500" /><h1 className="text-xl font-bold text-slate-800">Verifikasi JSA Gagal</h1><p className="text-sm text-slate-500">{result.error || "Data tidak ditemukan."}</p></main>;

  return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><section className="max-w-md w-full bg-white border border-green-200 rounded-2xl shadow-lg p-8 text-center"><ShieldCheck className="w-14 h-14 text-green-600 mx-auto mb-3" /><h1 className="text-2xl font-bold text-slate-900">Approval JSA Terverifikasi</h1><CheckCircle className="w-6 h-6 text-green-600 mx-auto mt-4" /><div className="mt-4 text-left space-y-2 text-sm"><p><span className="text-slate-400">Form:</span> <strong>{result.form.id_form}</strong></p><p><span className="text-slate-400">Role:</span> <strong>{role}</strong></p><p><span className="text-slate-400">Approver:</span> <strong>{result.approver.nama || "-"}</strong></p><p><span className="text-slate-400">NIK:</span> <strong>{result.approver.nik || "-"}</strong></p><p><span className="text-slate-400">Waktu:</span> <strong>{new Date(result.approver.approved_at).toLocaleString("id-ID")}</strong></p></div></section></main>;
}
