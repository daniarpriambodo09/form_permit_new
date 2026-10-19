"use client";

import { useEffect, useState } from "react";
import JsaBuilderSection, { createEmptyJsa, type JsaData } from "@/components/JsaBuilderSection";
import { FileText, ExternalLink, CheckCircle2, ShieldCheck, Download } from "lucide-react";
import type { JsaFileInfo } from "@/components/JsaUploadSection";

interface LinkedJsaSectionProps {
  idIjinKerja: string | null;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  value: JsaData;
  setValue: (value: JsaData) => void;
  onLoaded?: (enabled: boolean) => void;
  jsaMode?: "upload" | "build";
  setJsaMode?: (mode: "upload" | "build") => void;
  jsaFile?: JsaFileInfo | null;
  setJsaFile?: (file: JsaFileInfo | null) => void;
  onJsaInfoLoaded?: (info: {
    mode: "upload" | "build";
    fileUrl: string | null;
    jsaData: JsaData | null;
    enabled: boolean;
  }) => void;
}

export default function LinkedJsaSection({
  idIjinKerja,
  enabled,
  setEnabled,
  value,
  setValue,
  onLoaded,
  jsaMode = "build",
  setJsaMode,
  jsaFile,
  setJsaFile,
  onJsaInfoLoaded,
}: LinkedJsaSectionProps) {
  const [loading, setLoading] = useState(Boolean(idIjinKerja));
  const [detectedMode, setDetectedMode] = useState<"upload" | "build">(jsaMode);
  const [fileUrl, setFileUrl] = useState<string | null>(jsaFile?.url || null);
  const [fileName, setFileName] = useState<string>(jsaFile?.name || "");

  useEffect(() => {
    if (!idIjinKerja) {
      setLoading(false);
      return;
    }

    // 1. Cek dulu dari sessionStorage untuk prefill instan
    try {
      const sess = sessionStorage.getItem("last_ijin_kerja_eksternal");
      if (sess) {
        const p = JSON.parse(sess);
        if (p && (!p.id_form || p.id_form === idIjinKerja)) {
          if (p.jsaMode === "upload" || p.jsaFileUrl || p.jsaFile?.url) {
            const url = p.jsaFileUrl || p.jsaFile?.url;
            setDetectedMode("upload");
            setFileUrl(url);
            setFileName(p.jsaFile?.name || "Dokumen_JSA_Eksternal");
            setJsaMode?.("upload");
            setEnabled(true);
            if (setJsaFile && url) {
              setJsaFile(p.jsaFile || { name: "Dokumen_JSA_Eksternal", size: 0, url });
            }
            onJsaInfoLoaded?.({
              mode: "upload",
              fileUrl: url,
              jsaData: null,
              enabled: true,
            });
            setLoading(false);
            return;
          } else if (p.jsaData) {
            setValue(p.jsaData);
            setDetectedMode("build");
            setJsaMode?.("build");
            setEnabled(true);
            onJsaInfoLoaded?.({
              mode: "build",
              fileUrl: null,
              jsaData: p.jsaData,
              enabled: true,
            });
          }
        }
      }
    } catch {}

    // 2. Fetch dari backend database
    fetch(`/api/forms/general-permit/${idIjinKerja}/jsa`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;

        const isUpload = data.jsaMode === "upload" || Boolean(data.jsaFileUrl);
        const resolvedUrl = data.jsaFileUrl || null;

        if (isUpload && resolvedUrl) {
          setDetectedMode("upload");
          setFileUrl(resolvedUrl);
          const derivedName = resolvedUrl.split("/").pop() || "Dokumen_JSA_Eksternal";
          setFileName(derivedName);
          setJsaMode?.("upload");
          setEnabled(true);
          if (setJsaFile) {
            setJsaFile({
              name: derivedName,
              size: 0,
              url: resolvedUrl,
            });
          }
          onJsaInfoLoaded?.({
            mode: "upload",
            fileUrl: resolvedUrl,
            jsaData: null,
            enabled: true,
          });
          onLoaded?.(true);
        } else if (data.jsaData) {
          setDetectedMode("build");
          setJsaMode?.("build");
          setValue(data.jsaData);
          setEnabled(true);
          onJsaInfoLoaded?.({
            mode: "build",
            fileUrl: null,
            jsaData: data.jsaData,
            enabled: true,
          });
          onLoaded?.(true);
        }
      })
      .catch((err) => console.error("Gagal memuat JSA dari form eksternal:", err))
      .finally(() => setLoading(false));
  }, [idIjinKerja, onLoaded, setEnabled, setValue, setJsaMode, setJsaFile, onJsaInfoLoaded]);

  if (!idIjinKerja) {
    return <JsaBuilderSection enabled={enabled} setEnabled={setEnabled} value={value} setValue={setValue} />;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-3 text-sm text-slate-500 shadow-xs">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        Memeriksa data JSA dari form induk ({idIjinKerja})...
      </div>
    );
  }

  // JIKA FORM INDUK MENGGUNAKAN UPLOAD JSA (FILE DOKUMEN EXCEL/PDF)
  if (detectedMode === "upload" && fileUrl) {
    const isPdf = fileUrl.toLowerCase().endsWith(".pdf");
    const isExcel = fileUrl.toLowerCase().endsWith(".xlsx") || fileUrl.toLowerCase().endsWith(".xls");

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">JOB SAFETY ANALYSIS (JSA) — TERHUBUNG</h3>
              <p className="text-xs text-slate-400">Dokumen JSA diambil otomatis dari Form Ijin Kerja Eksternal</p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Dokumen Upload Terhubung
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Dokumen JSA Terlampir ({isPdf ? "PDF" : isExcel ? "Excel" : "File"})
                </p>
                <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">
                  {fileName || "Dokumen_JSA_Tersambung"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Form induk: <strong className="text-slate-700">{idIjinKerja}</strong>. Anda tidak perlu menginput JSA manual lagi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Lihat Dokumen JSA
              </a>
              <a
                href={fileUrl}
                download
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-colors shadow-xs"
                title="Download file JSA"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>

          <p className="text-xs text-slate-500 italic">
            * JSA ini terhubung langsung dengan dokumen JSA utama. Seluruh proses review dan persetujuan JSA dilakukan bersamaan dengan form induk.
          </p>
        </div>
      </div>
    );
  }

  // JIKA FORM INDUK MENGGUNAKAN PEMBUAT JSA MANUAL (BUILD)
  return (
    <div>
      <JsaBuilderSection enabled={enabled} setEnabled={setEnabled} value={value} setValue={setValue} />
      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
        JSA ini tersambung ke form eksternal <strong>{idIjinKerja}</strong>. Perubahan dari form ini akan memperbarui JSA induk.
      </p>
    </div>
  );
}

export { createEmptyJsa };
