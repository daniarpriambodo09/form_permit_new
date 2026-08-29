"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Clock, QrCode, User } from "lucide-react";
import type { JsaApprovalEntry } from "./JsaBuilderSection";

interface JsaApprovalCardProps {
  label: string;
  role: "firewatch" | "spv" | "sfo";
  entry: JsaApprovalEntry;
  formId: string;
}

export default function JsaApprovalCard({ label, role, entry, formId }: JsaApprovalCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!entry.approved || !canvasRef.current) return;
    const url = `${window.location.origin}/form-permit/approval-verification/jsa/${formId}/${role}`;
    QRCode.toCanvas(canvasRef.current, url, { width: 120, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(() => setReady(true)).catch(() => setReady(false));
  }, [entry.approved, formId, role]);

  return (
    <div className={`rounded-xl border p-4 ${entry.approved ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-center gap-2 mb-3">
        {entry.approved ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-slate-400" />}
        <span className="font-bold text-sm text-slate-800">{label}</span>
        <span className="ml-auto text-xs font-semibold">{entry.approved ? "Disetujui" : "Menunggu"}</span>
      </div>
      {entry.approved ? (
        <div className="flex items-center gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {entry.approvedBy || "-"}</p>
            <p className="text-xs text-slate-500">NIK: {entry.approvedNik || "-"}</p>
            <p className="text-xs text-slate-500">{entry.approvedAt ? new Date(entry.approvedAt).toLocaleString("id-ID") : "-"}</p>
          </div>
          <div className="text-center shrink-0"><canvas ref={canvasRef} className={ready ? "" : "hidden"} /><QrCode className={ready ? "hidden" : "w-10 h-10 text-slate-300"} /><p className="text-[9px] text-slate-400 mt-1">Scan verifikasi</p></div>
        </div>
      ) : <p className="text-xs text-slate-400 italic">Belum ada persetujuan.</p>}
    </div>
  );
}
