"use client";

import { FileText, PenLine } from "lucide-react";
import JsaBuilderSection, { type JsaData } from "@/components/JsaBuilderSection";
import JsaUploadSection, { type JsaFileInfo, type JsaUploadStatus } from "@/components/JsaUploadSection";

type JsaMode = "upload" | "build";

interface JsaMethodSectionProps {
  mode: JsaMode;
  setMode: (mode: JsaMode) => void;
  perluJsa: boolean;
  setPerluJsa: (value: boolean) => void;
  jsaFile: JsaFileInfo | null;
  setJsaFile: (value: JsaFileInfo | null) => void;
  jsaUploadStatus: JsaUploadStatus;
  setJsaUploadStatus: (value: JsaUploadStatus) => void;
  jsaUploadError: string;
  setJsaUploadError: (value: string) => void;
  jsaData: JsaData;
  setJsaData: (value: JsaData) => void;
  sectionTitle: string;
  sectionStyle: "hot-work" | "height-work" | "workshop";
}

export default function JsaMethodSection({
  mode, setMode, perluJsa, setPerluJsa, jsaFile, setJsaFile,
  jsaUploadStatus, setJsaUploadStatus, jsaUploadError, setJsaUploadError,
  jsaData, setJsaData, sectionTitle, sectionStyle,
}: JsaMethodSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { value: "upload" as const, label: "Upload JSA", icon: FileText, description: "Lampirkan dokumen JSA yang sudah dibuat." },
          { value: "build" as const, label: "Buat JSA", icon: PenLine, description: "Isi JSA langsung melalui formulir." },
        ].map((option) => {
          const Icon = option.icon;
          return (
            <label key={option.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${mode === option.value ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-200"}`}>
              <input type="radio" name="jsa-mode" value={option.value} checked={mode === option.value} onChange={() => setMode(option.value)} className="mt-1 text-orange-500" />
              <span><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Icon className="w-4 h-4 text-orange-600" />{option.label}</span><span className="block text-xs text-slate-500 mt-1">{option.description}</span></span>
            </label>
          );
        })}
      </div>
      {mode === "upload" ? (
        <JsaUploadSection
          perluJsa={perluJsa} setPerluJsa={setPerluJsa}
          jsaFile={jsaFile} setJsaFile={setJsaFile}
          jsaUploadStatus={jsaUploadStatus} setJsaUploadStatus={setJsaUploadStatus}
          jsaUploadError={jsaUploadError} setJsaUploadError={setJsaUploadError}
          sectionTitle={sectionTitle} sectionStyle={sectionStyle}
        />
      ) : (
        <JsaBuilderSection enabled={perluJsa} setEnabled={setPerluJsa} value={jsaData} setValue={setJsaData} />
      )}
    </div>
  );
}

export type { JsaMode };
