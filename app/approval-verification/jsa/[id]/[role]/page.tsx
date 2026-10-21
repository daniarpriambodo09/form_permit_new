// app/approval-verification/jsa/[id]/[role]/page.tsx
// Halaman publik verifikasi digital QR Code untuk Job Safety Analysis (JSA).

import { Metadata } from "next";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Building2,
  MapPin,
  Calendar,
  Clock,
  User,
  Hash,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  PenTool,
} from "lucide-react";
import { getApprovalVerification } from "@/lib/approval-verification";

interface PageProps {
  params: Promise<{ id: string; role: string }>;
}

export const metadata: Metadata = {
  title: "Verifikasi Approval JSA | PT. JAI",
  description: "Halaman verifikasi digital approval Job Safety Analysis (JSA) PT Jatim Autocomp Indonesia",
};

const formatDate = (ts?: string | null) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (ts?: string | null) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    hour12: false,
  });
};

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

export default async function JsaVerificationPage({ params }: PageProps) {
  const { id, role } = await params;
  const result = await getApprovalVerification("jsa", id, role);

  const verifiedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    hour12: false,
  });

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 mb-4">
              <ShieldX className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">VERIFIKASI GAGAL</h1>
            <p className="text-red-300 text-sm">QR Code tidak valid atau approval JSA belum dilakukan</p>
          </div>

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
                Pastikan form permit induk telah diajukan dan approver terkait telah menyetujui JSA.
              </p>
            </div>
          </div>

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Hero Badge */}
        <div className="text-center mb-6">
          <div className="relative inline-flex mb-4">
            <div
              className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"
              style={{ animationDuration: "2.5s" }}
            />
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400/60">
              <ShieldCheck className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-400/30 rounded-full px-4 py-1.5 mb-3">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-300 font-bold text-sm tracking-wide">APPROVAL JSA VALID</span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">
            Persetujuan JSA<br />
            <span className="text-green-400">Terverifikasi Resmi</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Persetujuan Job Safety Analysis sah dan tercatat pada sistem
          </p>
        </div>

        {/* Card Utama */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">Dokumen Persetujuan</p>
                <p className="text-white font-black text-base">{form.jenis_form}</p>
              </div>
              <div className="px-3 py-1 rounded-lg text-xs font-black bg-green-100 text-green-800">
                DISETUJUI
              </div>
            </div>
          </div>

          {/* Data Form / Dokumen */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Detail Dokumen yang Diapprove
            </p>
            <InfoRow icon={Hash} label="Nomor Form" value={form.id_form} />
            <InfoRow icon={MapPin} label="Lokasi Pekerjaan" value={form.lokasi} />
            <InfoRow icon={Calendar} label="Tanggal Pengajuan" value={formatDate(form.tanggal_pelaksanaan)} />
            {form.tipe_perusahaan && (
              <InfoRow icon={Briefcase} label="Kontraktor" value={form.tipe_perusahaan} />
            )}
          </div>

          <div className="mx-5 my-2 border-t-2 border-dashed border-slate-100" />

          {/* Data Approver */}
          <div className="px-5 pt-2 pb-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Data Approver
            </p>
            <InfoRow icon={User} label="Nama" value={approver.nama} />
            <InfoRow icon={Hash} label="NIK" value={approver.nik} />
            <InfoRow icon={Briefcase} label="Role" value={approver.role_label} />
            <InfoRow icon={Calendar} label="Tanggal Approve" value={formatDate(approver.approved_at)} />
            <InfoRow
              icon={Clock}
              label="Waktu Approve"
              value={formatTime(approver.approved_at)}
              valueClass="font-mono"
            />
          </div>

          {/* ── Tanda Tangan Asli (jika ada pada approval JSA) ── */}
          {approver.signature_url && (
            <>
              <div className="mx-5 my-1 border-t-2 border-dashed border-slate-100" />
              <div className="px-5 pt-3 pb-5">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2.5 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-slate-500" /> Tanda Tangan Asli ({approver.role_label})
                </p>
                <div
                  className="signature-outer-box p-3.5 rounded-2xl flex flex-col items-center justify-center border border-slate-200"
                  style={{ backgroundColor: "#f8fafc" }}
                >
                  <div
                    className="signature-display-box w-full p-4 rounded-xl flex items-center justify-center min-h-[110px] border border-slate-200 shadow-inner"
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={approver.signature_url}
                      alt={`Tanda Tangan Asli ${approver.role_label}`}
                      className="max-h-24 max-w-full object-contain filter contrast-125"
                    />
                  </div>
                  <p
                    className="text-[11px] font-medium text-center mt-2.5"
                    style={{ color: "#475569" }}
                  >
                    ✓ Tanda tangan digital resmi terverifikasi sistem
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status chip */}
        <div className="bg-green-500/10 border border-green-400/25 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <div>
            <p className="text-green-300 font-bold text-sm">Status: VALID & RESMI</p>
            <p className="text-green-400/70 text-xs">
              Persetujuan digital tercatat dalam database sistem e-permit PT JAI
            </p>
          </div>
        </div>

        {/* Footer */}
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
