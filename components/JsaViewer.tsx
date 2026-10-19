// components/JsaViewer.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Eye,
  AlertCircle,
  Loader2,
  Table,
  Layers,
  ChevronRight,
  Maximize2,
  Info,
} from "lucide-react";
import type { JsaData } from "@/components/JsaBuilderSection";

interface JsaViewerProps {
  perluJsa: boolean;
  jsaData?: JsaData | any | null;
  jsaFileUrl?: string | null;
  className?: string;
}

interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  data: string[][];
}

export default function JsaViewer({
  perluJsa,
  jsaData,
  jsaFileUrl,
  className = "",
}: JsaViewerProps) {
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [sheets, setSheets] = useState<SheetInfo[]>([]);

  // Tentukan apakah ada data manual dan file
  const hasManualData = Boolean(
    jsaData &&
      (jsaData.area ||
        jsaData.jenisPekerjaan ||
        (Array.isArray(jsaData.rows) && jsaData.rows.length > 0) ||
        (Array.isArray(jsaData.petugas) && jsaData.petugas.length > 0))
  );

  const fileUrl = jsaFileUrl || jsaData?.fileUrl || null;
  const hasFile = Boolean(fileUrl);

  const fileExt = fileUrl ? fileUrl.split(".").pop()?.toLowerCase() : "";
  const isExcel = fileExt === "xlsx" || fileExt === "xls";
  const isPdf = fileExt === "pdf";

  // Tab mode switcher jika kedua-duanya ada
  const [viewMode, setViewMode] = useState<"file" | "manual">(
    hasFile ? "file" : "manual"
  );

  useEffect(() => {
    if (hasFile && isExcel && fileUrl) {
      setExcelLoading(true);
      setExcelError("");
      fetch(`/api/upload/jsa/preview?fileUrl=${encodeURIComponent(fileUrl)}`)
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Gagal memuat preview Excel");
          if (!json.isSupported) {
            setExcelError(json.error || "Format Excel tidak didukung untuk pratinjau langsung.");
          } else {
            setSheets(json.sheets || []);
            setActiveSheetIdx(0);
          }
        })
        .catch((err: any) => {
          setExcelError(err.message || "Gagal memproses file Excel");
        })
        .finally(() => {
          setExcelLoading(false);
        });
    }
  }, [fileUrl, hasFile, isExcel]);

  if (!perluJsa) {
    return (
      <div className={`p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 ${className}`}>
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-sm text-slate-700">JSA Tidak Diwajibkan</p>
        <p className="text-xs text-slate-400 mt-0.5">Pengajuan pekerjaan ini tidak memerlukan Job Safety Analysis.</p>
      </div>
    );
  }

  if (!hasFile && !hasManualData) {
    return (
      <div className={`p-8 text-center rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 ${className}`}>
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <p className="font-bold text-sm">Dokumen JSA Belum Ditemukan</p>
        <p className="text-xs text-amber-700 mt-1">
          Formulir JSA belum diisi secara manual atau file dokumen belum diunggah.
        </p>
      </div>
    );
  }

  const rawFileName = fileUrl ? fileUrl.split("/").pop() || "dokumen_jsa" : "";
  const cleanFileName = rawFileName.replace(/^jsa_\d+_/, "");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── Switcher Tab jika ada File DAN Form Manual ── */}
      {hasFile && hasManualData && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-fit border border-slate-200/80">
          <button
            type="button"
            onClick={() => setViewMode("file")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "file"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isExcel ? <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-red-600" />}
            <span>File Dokumen Terlampir ({isExcel ? "Excel" : isPdf ? "PDF" : "File"})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("manual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "manual"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Table className="w-4 h-4 text-blue-600" />
            <span>Formulir Analisis Manual</span>
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TAMPILAN FILE UPLOAD (EXCEL / PDF)                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {hasFile && (viewMode === "file" || !hasManualData) && (
        <div className="space-y-4">
          {/* Header Card File */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isExcel
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : isPdf
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                }`}
              >
                {isExcel ? (
                  <FileSpreadsheet className="w-6 h-6" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-800 truncate" title={cleanFileName}>
                    {cleanFileName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isExcel
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : isPdf
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isExcel ? "Spreadsheet Excel" : isPdf ? "Dokumen PDF" : fileExt || "File"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dokumen Job Safety Analysis resmi yang dilampirkan pemohon
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Buka di Tab Baru</span>
              </a>
              <a
                href={fileUrl}
                download={cleanFileName}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>
          </div>

          {/* ── PREVIEW EXCEL SPREADSHEET ── */}
          {isExcel && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>Pratinjau Lembar Kerja Excel (Live Preview)</span>
                </div>
                {sheets.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    Sheet: <strong>{sheets[activeSheetIdx]?.name || "1"}</strong> · {sheets[activeSheetIdx]?.rowCount || 0} Baris
                  </span>
                )}
              </div>

              {/* Sheet Tabs jika multiple sheets */}
              {sheets.length > 1 && (
                <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200 overflow-x-auto scrollbar-none">
                  {sheets.map((sheet, sIdx) => (
                    <button
                      key={sheet.name + sIdx}
                      type="button"
                      onClick={() => setActiveSheetIdx(sIdx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        activeSheetIdx === sIdx
                          ? "bg-white text-emerald-700 border border-emerald-300 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Body Preview Sheet */}
              <div className="p-4">
                {excelLoading ? (
                  <div className="py-16 text-center text-slate-500 space-y-3">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                    <p className="text-xs font-medium">Membaca dan memproses lembar data Excel...</p>
                  </div>
                ) : excelError ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">{excelError}</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Anda tetap dapat melihat dan memeriksa seluruh isi dokumen dengan mengunduh file secara langsung.
                    </p>
                    <a
                      href={fileUrl}
                      download={cleanFileName}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      <Download className="w-4 h-4" /> Unduh Dokumen Excel
                    </a>
                  </div>
                ) : sheets.length === 0 || !sheets[activeSheetIdx] || sheets[activeSheetIdx].data.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Table className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs">Lembar kerja Excel kosong atau tidak memiliki data baris.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[550px] border border-slate-200 rounded-xl shadow-inner scrollbar-thin">
                    <table className="w-full text-xs border-collapse">
                      <tbody>
                        {sheets[activeSheetIdx].data.map((row, rIdx) => {
                          const isHeader = rIdx === 0;
                          return (
                            <tr
                              key={rIdx}
                              className={
                                isHeader
                                  ? "bg-slate-100/90 font-bold text-slate-800 sticky top-0 z-10 shadow-2xs border-b border-slate-300"
                                  : "hover:bg-blue-50/40 transition-colors border-b border-slate-100"
                              }
                            >
                              {/* Kolom Indeks Baris (Row Number) */}
                              <td className="p-2 text-center text-[10px] font-mono text-slate-400 bg-slate-50 border-r border-slate-200 select-none w-10 shrink-0">
                                {rIdx + 1}
                              </td>
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className={`p-2.5 border-r border-slate-100 text-slate-700 whitespace-pre-wrap max-w-xs break-words ${
                                    isHeader ? "font-bold text-slate-900 bg-slate-100/90" : ""
                                  }`}
                                >
                                  {cell !== "" ? cell : <span className="text-slate-300 select-none">-</span>}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PREVIEW PDF VIEWER ── */}
          {isPdf && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <span>Pratinjau Dokumen PDF (Integrated Viewer)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal">
                  Gunakan zoom dan navigasi bawaan browser untuk memeriksa dokumen
                </span>
              </div>
              <div className="w-full h-[620px] bg-slate-100">
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0`}
                  title="PDF JSA Preview"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* ── FILE LAINNYA ── */}
          {!isExcel && !isPdf && (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">File Dokumen Siap Ditinjau</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                File dilampirkan dalam format <strong>.{fileExt}</strong>. Silakan unduh atau buka file untuk membaca detail JSA.
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Eye className="w-4 h-4" /> Buka / Unduh Dokumen JSA
              </a>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TAMPILAN FORMULIR JSA MANUAL                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {hasManualData && (viewMode === "manual" || !hasFile) && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
            {[
              ["Area", jsaData.area],
              ["Jenis Pekerjaan", jsaData.jenisPekerjaan],
              ["Sect / Dept", jsaData.sectDept],
              ["PIC Proyek", jsaData.pic],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-slate-400 font-semibold uppercase">{label}</span>
                <p className="font-bold text-slate-800 mt-0.5">{value || "-"}</p>
              </div>
            ))}
          </div>

          {Array.isArray(jsaData.petugas) && jsaData.petugas.filter(Boolean).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Petugas yang Mengerjakan ({jsaData.petugas.filter(Boolean).length} Orang)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {jsaData.petugas.filter(Boolean).map((name: string, index: number) => (
                  <div
                    key={index}
                    className="text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <span className="truncate text-slate-700">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Tabel Analisis Langkah Kerja
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full min-w-[800px] text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    {["Tanggal", "Jenis Pekerjaan", "Langkah Kerja", "Potensi Bahaya", "Pengendalian", "Saran"].map(
                      (heading) => (
                        <th key={heading} className="p-3 text-left font-bold border-b border-slate-200">
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Array.isArray(jsaData.rows) ? jsaData.rows : []).map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors align-top">
                      {[
                        row.tanggal,
                        row.jenisPekerjaan,
                        row.langkahKerja,
                        row.potensiBahaya,
                        row.pengendalian,
                        row.saran,
                      ].map((value, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="p-3 whitespace-pre-wrap text-slate-700 leading-relaxed"
                        >
                          {value || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
