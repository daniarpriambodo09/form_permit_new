"use client";

import { useEffect, useState } from "react";
import JsaBuilderSection, { createEmptyJsa, type JsaData } from "@/components/JsaBuilderSection";

interface LinkedJsaSectionProps {
  idIjinKerja: string | null;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  value: JsaData;
  setValue: (value: JsaData) => void;
  onLoaded?: (enabled: boolean) => void;
}

export default function LinkedJsaSection({ idIjinKerja, enabled, setEnabled, value, setValue, onLoaded }: LinkedJsaSectionProps) {
  const [loading, setLoading] = useState(Boolean(idIjinKerja));

  useEffect(() => {
    if (!idIjinKerja) {
      setLoading(false);
      return;
    }
    fetch(`/form-permit/api/forms/general-permit/${idIjinKerja}/jsa`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const jsa = data?.jsaData as JsaData | null;
        if (jsa) {
          setValue(jsa);
          setEnabled(true);
          onLoaded?.(true);
        }
      })
      .finally(() => setLoading(false));
  }, [idIjinKerja, onLoaded, setEnabled, setValue]);

  if (!idIjinKerja) return <JsaBuilderSection enabled={enabled} setEnabled={setEnabled} value={value} setValue={setValue} />;
  if (loading) return <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">Memuat JSA dari form eksternal...</div>;

  return (
    <div>
      <JsaBuilderSection enabled={enabled} setEnabled={setEnabled} value={value} setValue={setValue} />
      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">JSA ini tersambung ke form eksternal {idIjinKerja}. Perubahan dari form ini akan memperbarui JSA induk.</p>
    </div>
  );
}

export { createEmptyJsa };
