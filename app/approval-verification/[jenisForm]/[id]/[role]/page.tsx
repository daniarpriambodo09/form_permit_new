// app/approval-verification/[jenisForm]/[id]/[role]/page.tsx
// Halaman publik — tidak butuh login — untuk verifikasi QR Code approval.
// URL: /approval-verification/hot-work/HW-20250601-001/spv

import { Metadata } from "next";
import { Shield, ShieldCheck, ShieldX, Building2, MapPin, Calendar, Clock, User, Hash, Briefcase, CheckCircle, AlertTriangle } from "lucide-react";

interface PageProps {
  params: Promise<{ jenisForm: string; id: string; role: string }>;
}

export const metadata: Metadata = {
  title: "Verifikasi Approval Permit | JAI",
  description: "Halaman verifikasi digital approval surat izin kerja PT Jatim Autocomp Indonesia",
};

const formatDate = (ts?: string) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  });
};

const formatTime = (ts?: string) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  });
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  approved:  { bg: "bg-green-100",  text: "text-green-800",  label: "DISETUJUI" },
  submitted: { bg: "bg-blue-100",   text: "text-blue-800",   label: "DIAJUKAN" },
  rejected:  { bg: "bg-red-100",    text: "text-red-800",    label: "DITOLAK" },
  draft:     { bg: "bg-slate-100",  text: "text-slate-800",  label: "DRAFT" },
};

async function fetchVerification(
  jenisForm: string,
  id: string,
  role: string
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3100";

  try {
    const url =
      `${baseUrl}/api/approval-verification/${jenisForm}/${id}/${role}`;

    console.log("BASE URL:", baseUrl);
    console.log("FETCH URL:", url);

    const res = await fetch(url, {
      cache: "no-store",
    });

    return await res.json();
  } catch (error) {
    console.error(error);

    return {
      success: false,
      error: "Tidak dapat terhubung ke server",
    };
  }
}

// ── Info row helper ──────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: any;
  label: string;
  value?: string | null;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">{label}</p>
        <p className={`text-sm font-bold text-slate-800 mt-0.5 ${valueClass}`}>{value || "-"}</p>
      </div>
    </div>
  );
}

export default async function ApprovalVerificationPage({ params }: PageProps) {
  const { jenisForm, id, role } = await params;
  const result = await fetchVerification(jenisForm, id, role);

  const verifiedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZoneName: "short",
  });

  // ── INVALID / NOT FOUND ──────────────────────────────────
  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header invalid */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 mb-4">
              <ShieldX className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">VERIFIKASI GAGAL</h1>
            <p className="text-red-300 text-sm">QR Code tidak valid atau approval belum dilakukan</p>
          </div>

          {/* Card error */}
          <div className="bg-white/5 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold text-sm mb-1">Detail Kesalahan</p>
                <p className="text-red-200/80 text-sm">{result.error}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-red-500/20">
              <p className="text-xs text-slate-400">
                Jika Anda yakin QR Code ini valid, hubungi Admin K3 untuk pemeriksaan lebih lanjut.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>PT Jatim Autocomp Indonesia — Sistem Izin Kerja Digital</span>
            </div>
            <p className="text-slate-600 text-[10px] mt-1">Dicek pada: {verifiedAt}</p>
          </div>
        </div>
      </div>
    );
  }

  const { form, approver } = result;
  const statusCfg = statusColors[form.status] ?? statusColors.submitted;

  // ── VALID ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* ── Hero Badge ── */}
        <div className="text-center mb-6">
          <div className="relative inline-flex mb-4">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400/60">
              <ShieldCheck className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-400/30 rounded-full px-4 py-1.5 mb-3">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-300 font-bold text-sm tracking-wide">APPROVAL VALID</span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">
            Tanda Tangan Digital<br />
            <span className="text-green-400">Terverifikasi</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Approval ini sah dan terdaftar dalam sistem
          </p>
        </div>

        {/* ── Card Utama ── */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-4">

          {/* Header card — Jenis Form */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Surat Izin Kerja</p>
                <p className="text-white font-black text-base">{form.jenis_form}</p>
              </div>
              <div className={`px-3 py-1 rounded-lg text-xs font-black ${statusCfg.bg} ${statusCfg.text}`}>
                {statusCfg.label}
              </div>
            </div>
          </div>

          {/* ── Data Form ── */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Data Permit
            </p>
            <InfoRow icon={Hash}     label="ID Form"             value={form.id_form} />
            <InfoRow icon={MapPin}   label="Lokasi"              value={form.lokasi} />
            <InfoRow icon={Calendar} label="Tanggal Pelaksanaan" value={formatDate(form.tanggal_pelaksanaan)} />
          </div>

          {/* Divider */}
          <div className="mx-5 my-2 border-t-2 border-dashed border-slate-100" />

          {/* ── Data Approver ── */}
          <div className="px-5 pt-2 pb-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Data Approver
            </p>
            <InfoRow icon={User}      label="Nama"          value={approver.nama} />
            <InfoRow icon={Hash}      label="NIK"           value={approver.nik} />
            <InfoRow
              icon={Briefcase}
              label="Jabatan / Role"
              value={`${approver.jabatan || "-"} — ${approver.role_label}`}
            />
            <InfoRow icon={Calendar}  label="Tanggal Approve" value={formatDate(approver.approved_at)} />
            <InfoRow
              icon={Clock}
              label="Jam Approve"
              value={formatTime(approver.approved_at)}
              valueClass="font-mono"
            />
          </div>
        </div>

        {/* ── Status chip ── */}
        <div className="bg-green-500/10 border border-green-400/25 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <div>
            <p className="text-green-300 font-bold text-sm">Status: VALID APPROVAL</p>
            <p className="text-green-400/70 text-xs">
              Data cocok dengan catatan resmi di sistem permit JAI
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-slate-500 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>PT Jatim Autocomp Indonesia — Sistem Izin Kerja Digital</span>
          </div>
          <p className="text-slate-600 text-[10px]">Dicek pada: {verifiedAt}</p>
        </div>
      </div>
    </div>
  );
}