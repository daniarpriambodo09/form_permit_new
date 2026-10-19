// components/ApprovalQRCard.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Clock, QrCode } from "lucide-react";
import { useAppUrl } from "@/lib/useAppUrl";

interface ApprovalQRCardProps {
  label: string;
  role: string;            // "spv" | "kontraktor" | "admin_k3" | "sfo" | "mr_pga" | "pga"
  approved: any;
  approvedBy?: string;
  approvedNik?: string;
  approvedAt?: string;
  fallbackName?: string;
  formId: string;
  formType: string;        // "hot-work" | "workshop" | "height-work" | "general-permit"
  baseUrl?: string;        // override untuk QR URL, default window.location.origin
}

const isTruthy = (v: any) => v === true || v === "t" || v === "true";

export default function ApprovalQRCard({
  label,
  role,
  approved,
  fallbackName,
  formId,
  formType,
  baseUrl,
}: ApprovalQRCardProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const isApproved = isTruthy(approved);
  const hookAppUrl = useAppUrl();

  const rootUrl = baseUrl || hookAppUrl;

  useEffect(() => {
    if (!isApproved || !canvasRef.current || !rootUrl) return;
    const verifyUrl = `${rootUrl}/approval-verification/${encodeURIComponent(formType)}/${encodeURIComponent(formId)}/${encodeURIComponent(role)}`;

    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then(() => setQrReady(true))
      .catch((err) => {
        console.error("Gagal generate Approval QR:", err);
        setQrReady(false);
      });
  }, [isApproved, formId, formType, role, rootUrl]);

  return (
    <div
      className={`rounded-xl border transition-all ${
        isApproved
          ? "bg-white border-green-200 shadow-sm"
          : "bg-slate-50/80 border-slate-200"
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-2.5 rounded-t-xl flex items-center gap-2 ${
          isApproved
            ? "bg-green-50/70 border-b border-green-100"
            : "bg-slate-100/70 border-b border-slate-200"
        }`}
      >
        {isApproved ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <span className="font-bold text-xs uppercase tracking-wide text-slate-800">{label}</span>
        {isApproved ? (
          <span className="ml-auto text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">
            ✓ Disetujui
          </span>
        ) : (
          <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            Menunggu
          </span>
        )}
      </div>

      {/* Body: Tampilan Barcode Saja (Tanpa Teks Nama & Tanggal di UI) */}
      <div className="p-4 flex flex-col items-center justify-center min-h-[170px]">
        {isApproved ? (
          <div className="flex flex-col items-center">
            <div className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <canvas
                ref={canvasRef}
                className={qrReady ? "block rounded" : "hidden"}
              />
              {!qrReady && (
                <div className="w-[140px] h-[140px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center flex items-center gap-1 font-medium">
              <QrCode className="w-3 h-3 text-slate-400" />
              Scan barcode untuk verifikasi persetujuan
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 py-4 text-center">
            <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-white mb-2">
              <QrCode className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs font-semibold text-slate-600">Belum ada persetujuan</p>
            <p className="text-[10px] text-slate-400 italic">Barcode akan muncul setelah di-approve</p>
          </div>
        )}
      </div>
    </div>
  );
}