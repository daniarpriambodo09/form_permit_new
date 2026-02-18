// app/form/track/page.tsx
"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Home, Search, CheckCircle, XCircle, Clock,
  AlertCircle, ArrowRight, Info, Copy, Check,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};
const formatTime = (t?: string) => (!t ? "-" : String(t).slice(0, 5));

const jenisLabel: Record<string, string> = {
  "hot-work":    "Hot Work Permit",
  "workshop":    "Workshop Permit",
  "height-work": "Kerja Ketinggian",
};
const editPath: Record<string, string> = {
  "hot-work":    "/form/hot-work/edit",
  "workshop":    "/form/workshop/edit",
  "height-work": "/form/height-work/edit",
};

// ── Status display ────────────────────────────────────────────
const StatusDisplay = ({ status, catatanReject, approvedBy, approvedAt }: {
  status: string; catatanReject?: string; approvedBy?: string; approvedAt?: string;
}) => {
  const cfg: Record<string, { bg: string; border: string; icon: any; color: string; label: string; desc: string }> = {
    draft:     { bg: "bg-gray-50",   border: "border-gray-200",  icon: AlertCircle, color: "text-gray-600",  label: "Draft",     desc: "Form masih tersimpan sebagai draft, belum dikirim." },
    submitted: { bg: "bg-blue-50",   border: "border-blue-200",  icon: Clock,       color: "text-blue-700",  label: "Diajukan",  desc: "Form sudah dikirim dan menunggu review dari atasan." },
    approved:  { bg: "bg-green-50",  border: "border-green-200", icon: CheckCircle, color: "text-green-700", label: "Disetujui", desc: "Form telah disetujui. Pekerjaan dapat dilaksanakan." },
    rejected:  { bg: "bg-red-50",    border: "border-red-200",   icon: XCircle,     color: "text-red-700",   label: "Ditolak",   desc: "Form ditolak. Perbaiki sesuai catatan berikut." },
  };
  const c = cfg[status] ?? cfg.submitted;
  const Icon = c.icon;

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-5`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-6 h-6 ${c.color}`} />
        <span className={`text-lg font-bold ${c.color}`}>{c.label}</span>
      </div>
      <p className="text-sm text-slate-600">{c.desc}</p>

      {/* Info approval */}
      {(status === "approved" || status === "rejected") && (approvedBy || approvedAt) && (
        <div className="mt-3 pt-3 border-t border-current/10 text-xs text-slate-500 space-y-0.5">
          {approvedBy && <p>Oleh: <span className="font-semibold">{approvedBy}</span></p>}
          {approvedAt && <p>Pada: {formatDate(approvedAt)}, {formatTime(approvedAt?.slice(11, 16))}</p>}
        </div>
      )}

      {/* Catatan penolakan */}
      {status === "rejected" && catatanReject && (
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
          <p className="text-xs font-bold text-red-700 uppercase mb-1">Catatan Penolakan:</p>
          <p className="text-sm text-red-800">{catatanReject}</p>
        </div>
      )}
    </div>
  );
};

// ── Copy button ───────────────────────────────────────────────
const CopyBtn = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="p-1.5 hover:bg-slate-200 rounded transition-colors"
      title="Salin"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
    </button>
  );
};

// ── Main Track Component ──────────────────────────────────────
function TrackContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initialQ     = searchParams.get("q") || "";

  const [query,    setQuery]   = useState(initialQ);
  const [loading,  setLoading] = useState(false);
  const [result,   setResult]  = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [error,    setError]   = useState("");

  const search = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError("");
    try {
      const res  = await fetch(`/api/forms/track?q=${encodeURIComponent(q.trim().toUpperCase())}`);
      const data = await res.json();
      if (res.status === 404 || !data.found) { setNotFound(true); return; }
      if (!res.ok) throw new Error(data.error);
      setResult(data.data);
      router.replace(`/form/track?q=${encodeURIComponent(q.trim().toUpperCase())}`, { scroll: false });
    } catch (e: any) {
      setError("Gagal mencari: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if query param exists on load
  useState(() => { if (initialQ) search(initialQ); });

  const canEdit = result && (result.status === "rejected" || result.status === "draft");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg">
            <Home className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Search className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Cek Status Izin Kerja</h1>
              <p className="text-xs text-slate-500">Masukkan ID Form atau Kode Edit</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Search box */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            ID Form atau Kode Edit
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Contoh: HOW-1002 atau XKJP-9QZA"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg
                         focus:ring-2 focus:ring-orange-500 focus:border-transparent
                         text-slate-900 font-mono text-base uppercase tracking-wider
                         placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
            />
            <button onClick={() => search()} disabled={loading || !query.trim()}
              className="px-5 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300
                         text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Search className="w-4 h-4" />
              }
              <span className="hidden sm:inline">Cari</span>
            </button>
          </div>

          {/* Info */}
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Kode edit diberikan saat form berhasil dikirim. Simpan kode tersebut untuk bisa memeriksa dan memperbaiki form Anda.</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700">Form Tidak Ditemukan</h3>
            <p className="text-slate-400 text-sm mt-1">
              Pastikan ID Form atau Kode Edit yang dimasukkan sudah benar.
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Form info card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {jenisLabel[result.jenis_form] || result.jenis_form}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">
                    {result.id_form}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Dibuat: {formatDate(result.tanggal)}
                  </p>
                </div>
                {/* Edit token display */}
                {result.edit_token && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400 mb-1">Kode Edit</p>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-3 py-1.5">
                      <span className="font-mono text-sm font-bold text-slate-700">{result.edit_token}</span>
                      <CopyBtn value={result.edit_token} />
                    </div>
                  </div>
                )}
              </div>

              {/* Detail info */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                {result.no_registrasi && (
                  <div><span className="text-slate-400 text-xs">No. Registrasi</span><p className="font-semibold">{result.no_registrasi}</p></div>
                )}
                {result.nama_kontraktor_nik && (
                  <div><span className="text-slate-400 text-xs">Kontraktor</span><p className="font-semibold">{result.nama_kontraktor_nik}</p></div>
                )}
                {result.lokasi_pekerjaan && (
                  <div><span className="text-slate-400 text-xs">Lokasi</span><p className="font-semibold">{result.lokasi_pekerjaan}</p></div>
                )}
                {result.tanggal_pelaksanaan && (
                  <div><span className="text-slate-400 text-xs">Tgl Pelaksanaan</span><p className="font-semibold">{formatDate(result.tanggal_pelaksanaan)}</p></div>
                )}
              </div>

              {/* Status */}
              <StatusDisplay
                status={result.status}
                catatanReject={result.catatan_reject}
                approvedBy={result.approved_by}
                approvedAt={result.approved_at}
              />
            </div>

            {/* Edit button — hanya jika rejected atau draft */}
            {canEdit && result.edit_token && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-bold text-amber-900 mb-1.5">
                  {result.status === "rejected" ? "Form Ini Perlu Diperbaiki" : "Lanjutkan Draft"}
                </h3>
                <p className="text-sm text-amber-700 mb-4">
                  {result.status === "rejected"
                    ? "Perbaiki form sesuai catatan penolakan di atas, kemudian ajukan kembali."
                    : "Draft belum dikirim. Lanjutkan pengisian form dan kirim untuk mendapat persetujuan."}
                </p>
                <Link
                  href={`${editPath[result.jenis_form]}/${result.edit_token}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5
                             bg-amber-600 hover:bg-amber-700 text-white
                             rounded-lg font-semibold text-sm transition-colors"
                >
                  {result.status === "rejected" ? "✏️ Perbaiki Form" : "✏️ Lanjutkan Draft"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Submitted — info menunggu */}
            {result.status === "submitted" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800 text-sm">Menunggu Persetujuan</p>
                  <p className="text-blue-600 text-sm mt-1">Form Anda sedang dalam antrian review oleh Safety Officer atau Supervisor. Cek kembali nanti.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense>
      <TrackContent />
    </Suspense>
  );
}