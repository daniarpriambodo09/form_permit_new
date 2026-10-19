"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Clock, QrCode } from "lucide-react";
import type { JsaApprovalEntry } from "./JsaBuilderSection";
import { useAppUrl } from "@/lib/useAppUrl";

interface JsaApprovalCardProps {
  label: string;
  role: "firewatch" | "spv" | "sfo";
  entry: JsaApprovalEntry;
  formId: string;
}

export default function JsaApprovalCard({ label, role, entry, formId }: JsaApprovalCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const appUrl = useAppUrl();

  useEffect(() => {
    if (!entry.approved || !canvasRef.current || !appUrl) return;

    // URL verifikasi dengan root dari app_url di setting SMTP
    const verifyUrl = `${appUrl}/approval-verification/jsa/${encodeURIComponent(formId)}/${encodeURIComponent(role)}`;

    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(() => setReady(true))
      .catch((err) => {
        console.error("Gagal membuat barcode JSA:", err);
        setReady(false);
      });
  }, [entry.approved, formId, role, appUrl]);

  return (
    <div
      className={`rounded-xl border transition-all ${
        entry.approved
          ? "bg-white border-green-200 shadow-sm"
          : "bg-slate-50/80 border-slate-200"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-b ${
          entry.approved
            ? "bg-green-50/70 border-green-100"
            : "bg-slate-100/70 border-slate-200"
        }`}
      >
        {entry.approved ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <span className="font-bold text-xs uppercase tracking-wide text-slate-800">
          {label}
        </span>
        <span
          className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            entry.approved
              ? "bg-green-100 text-green-800"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {entry.approved ? "✓ Disetujui" : "Menunggu"}
        </span>
      </div>

      <div className="p-4 flex flex-col items-center justify-center min-h-[170px]">
        {entry.approved ? (
          <div className="flex flex-col items-center">
            <div className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <canvas
                ref={canvasRef}
                className={ready ? "block rounded" : "hidden"}
              />
              {!ready && (
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
          <div className="flex flex-col items-center justify-center text-slate-400 py-4">
            <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-100/60 mb-2">
              <QrCode className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Belum ada persetujuan</p>
            <p className="text-[10px] text-slate-400 italic">Barcode akan muncul setelah di-approve</p>
          </div>
        )}
      </div>
    </div>
  );
}
