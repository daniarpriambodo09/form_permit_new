// components/ApprovalQRCard.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Clock, QrCode, User, Calendar, Hash } from "lucide-react";

interface ApprovalQRCardProps {
  label: string;
  role: string;            // "spv" | "kontraktor" | "admin_k3" | "sfo" | "mr_pga"
  approved: any;
  approvedBy?: string;
  approvedNik?: string;
  approvedAt?: string;
  fallbackName?: string;
  formId: string;
  formType: string;        // "hot-work" | "workshop" | "height-work"
  baseUrl?: string;        // override untuk QR URL, default window.location.origin
}

const isTruthy = (v: any) => v === true || v === "t" || v === "true";

const formatDateTime = (ts?: string) => {
  if (!ts) return { date: "-", time: "-" };
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
};

export default function ApprovalQRCard({
  label,
  role,
  approved,
  approvedBy,
  approvedNik,
  approvedAt,
  fallbackName,
  formId,
  formType,
  baseUrl,
}: ApprovalQRCardProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const isApproved = isTruthy(approved);
  const { date: approveDate, time: approveTime } = formatDateTime(approvedAt);

  useEffect(() => {
    if (!isApproved || !canvasRef.current) return;
    const origin = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    const url    = `${origin}/form-permit/approval-verification/${formType}/${formId}/${role}`;

    QRCode.toCanvas(canvasRef.current, url, {
      width:            140,
      margin:           1,
      color: {
        dark:  "#0f172a",
        light: "#ffffff",
      },
    }).then(() => setQrReady(true)).catch(console.error);
  }, [isApproved, formId, formType, role, baseUrl]);

  return (
    <div
      className={`rounded-xl border transition-all ${
        isApproved
          ? "bg-white border-green-200 shadow-sm"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-2.5 rounded-t-xl flex items-center gap-2 ${
          isApproved ? "bg-green-50 border-b border-green-100" : "bg-slate-100 border-b border-slate-200"
        }`}
      >
        {isApproved ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <span className="font-bold text-sm text-slate-800">{label}</span>
        {isApproved && (
          <span className="ml-auto text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
            ✓ Disetujui
          </span>
        )}
        {!isApproved && (
          <span className="ml-auto text-[10px] bg-slate-300 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            Menunggu
          </span>
        )}
      </div>

      <div className="p-4">
        {isApproved ? (
          <div className="flex gap-4 items-start">
            {/* Info approver */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Nama</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {approvedBy || fallbackName || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">NIK</p>
                  <p className="text-sm font-semibold text-slate-800">{approvedNik || "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Tanggal & Jam</p>
                  <p className="text-sm font-semibold text-slate-800">{approveDate}</p>
                  <p className="text-xs text-slate-500">{approveTime}</p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="border border-slate-200 rounded-lg p-1 bg-white shadow-sm">
                <canvas
                  ref={canvasRef}
                  className={`rounded transition-opacity ${qrReady ? "opacity-100" : "opacity-0"}`}
                  style={{ width: 100, height: 100 }}
                />
                {!qrReady && (
                  <div className="w-[100px] h-[100px] flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <QrCode className="w-2.5 h-2.5" />
                <span>Scan untuk verifikasi</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-400 italic">Belum ada persetujuan</p>
          </div>
        )}
      </div>
    </div>
  );
}