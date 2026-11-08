// components/SignaturePad.tsx
"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void;
  disabled?: boolean;
  label?: string;
  confirmLabel?: string;
}

export default function SignaturePad({
  onConfirm,
  disabled = false,
  label = "Tanda Tangan",
  confirmLabel = "Konfirmasi Tanda Tangan",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = getCtx();
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#090e17";
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = getCtx();
    const point = getPoint(e);
    if (ctx && lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      setIsEmpty(false);
    }
    lastPoint.current = point;
  };

  const handlePointerUp = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Latar Putih Kontras Tinggi</span>
      </div>
      <div
        style={{ backgroundColor: "#ffffff" }}
        className="signature-pad-canvas-container relative border-2 border-dashed border-slate-300 dark:border-slate-400 rounded-xl overflow-hidden shadow-xs !bg-white"
      >
        <canvas
          ref={canvasRef}
          style={{ backgroundColor: "#ffffff" }}
          className="w-full h-48 touch-none cursor-crosshair !bg-white block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {isEmpty && (
          <p className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm pointer-events-none select-none font-medium">
            Tanda tangan di sini (mouse / sentuh layar)
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" /> Hapus
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={disabled || isEmpty}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-900/40 text-white rounded-lg text-xs font-semibold transition-colors ml-auto shadow-xs cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" /> {confirmLabel}
        </button>
      </div>
    </div>
  );
}