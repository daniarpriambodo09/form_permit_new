// components/ScaffoldingInspectionCard.tsx
"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Calendar,
  MapPin,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  ZoomIn,
  CheckCheck,
  User,
  Wrench,
  Info,
} from "lucide-react";

export interface ScaffoldingItem {
  no: number;
  bagian: string;
  kondisi_standar: string;
  kondisi: "standart" | "tidak_standart" | "";
  komentar: string;
}

export interface KetentuanItem {
  no: number;
  ketentuan: string;
  prosedur: "ya" | "tidak" | "";
  komentar: string;
}

export const DEFAULT_SCAFFOLDING_ITEMS: ScaffoldingItem[] = [
  { no: 1, bagian: "OPEN FRAME", kondisi_standar: "TIDAK BENGKOK / KEROPOS, PIN PENGUNCI ADA", kondisi: "", komentar: "" },
  { no: 2, bagian: "HORIZONTAL FRAME", kondisi_standar: "TIDAK BENGKOK / KEROPOS", kondisi: "", komentar: "" },
  { no: 3, bagian: "HORIZONTAL PLATE", kondisi_standar: "TERPASANG KUAT SEBAGAI PELATARAN KERJA", kondisi: "", komentar: "" },
  { no: 4, bagian: "CROSS BRACE", kondisi_standar: "TERPASANG KUAT, TIDAK BENGKOK & TERKUNCI", kondisi: "", komentar: "" },
  { no: 5, bagian: "JACK BASE / U-HEAD", kondisi_standar: "TERPASANG KUAT SEBAGAI LEVELING", kondisi: "", komentar: "" },
  { no: 6, bagian: "JOINT PIN", kondisi_standar: "TERPASANG TIDAK KENDOR", kondisi: "", komentar: "" },
  { no: 7, bagian: "STAIR FRAME", kondisi_standar: "TERPASANG KUAT DILENGKAPI HANDRAIL", kondisi: "", komentar: "" },
  { no: 8, bagian: "BASE PLATE", kondisi_standar: "TERPASANG KUAT DENGAN KONDISI RATA", kondisi: "", komentar: "" },
  { no: 9, bagian: "HORIZONTAL PIPE", kondisi_standar: "TERPASANG KUAT DIATAS JACK BASE", kondisi: "", komentar: "" },
  { no: 10, bagian: "ANGLE PIPE SUPPORT", kondisi_standar: "TERPASANG KUAT TIDAK BENGKOK / KEROPOS (PEMASANGAN MAKSIMAL UNTUK 4 TRAP SCAFFOLDING DAN TIDAK DIPERLUKAN BILA SUDAH MEMAKAI WALL TEE)", kondisi: "", komentar: "" },
  { no: 11, bagian: "HANDRAIL", kondisi_standar: "TERPASANG KUAT DENGAN TINGGI Min. 90 Cm.", kondisi: "", komentar: "" },
  { no: 12, bagian: "KLEM PIPA", kondisi_standar: "TERPASANG KUAT/SAMBUNGAN PIPA Min.3 KLEM", kondisi: "", komentar: "" },
  { no: 13, bagian: "PELATARAN KERJA", kondisi_standar: "TERPASANG KUAT DENGAN LEBAR Min. 40 Cm.", kondisi: "", komentar: "" },
  { no: 14, bagian: "KONDISI TANAH DASAR", kondisi_standar: "KONDISI TANAH RATA TIDAK MUDAH AMBLAS", kondisi: "", komentar: "" },
  { no: 15, bagian: "TOE BOARD", kondisi_standar: "TERPASANG KELILING KETINGGIAN Min. 20 Cm.", kondisi: "", komentar: "" },
  { no: 16, bagian: "WALL TEE", kondisi_standar: "TERPASANG 3 TRAP VERTICAL DAN HORIZONTAL", kondisi: "", komentar: "" },
  { no: 17, bagian: "OPENING", kondisi_standar: "TERPASANG PIPA HORIZONTAL DAN SUDUT/SIKU DI KEDUA SISINYA, PENGAMAN DIATAS OPENING DGN. PAPAN ATAU SAFETY NET DILAPISI PLASTIK.", kondisi: "", komentar: "" },
];

export const DEFAULT_KETENTUAN_LAINNYA: KetentuanItem[] = [
  { no: 1, ketentuan: "Akses dan tangga aman serta mudah dilalui", prosedur: "", komentar: "" },
  { no: 2, ketentuan: "Tanda peringatan terpasang dan area sekitar diberi demarkasi / batas pengaman", prosedur: "", komentar: "" },
  { no: 3, ketentuan: "Jaring pengaman (safety net) dipasang jika diperlukan", prosedur: "", komentar: "" },
];

interface ScaffoldingInspectionCardProps {
  namaInspektor: string;
  setNamaInspektor: (val: string) => void;
  tanggalInspeksi: string;
  setTanggalInspeksi: (val: string) => void;
  lokasi: string;
  setLokasi: (val: string) => void;
  tipePerancah: string;
  setTipePerancah: (val: string) => void;
  items: ScaffoldingItem[];
  setItems: React.Dispatch<React.SetStateAction<ScaffoldingItem[]>>;
  ketentuan: KetentuanItem[];
  setKetentuan: React.Dispatch<React.SetStateAction<KetentuanItem[]>>;
  readOnly?: boolean;
}

export default function ScaffoldingInspectionCard({
  namaInspektor,
  setNamaInspektor,
  tanggalInspeksi,
  setTanggalInspeksi,
  lokasi,
  setLokasi,
  tipePerancah,
  setTipePerancah,
  items,
  setItems,
  ketentuan,
  setKetentuan,
  readOnly = false,
}: ScaffoldingInspectionCardProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showInlineDiagram, setShowInlineDiagram] = useState(false);

  const completedItemCount = items.filter((it) => it.kondisi !== "").length;
  const standardItemCount = items.filter((it) => it.kondisi === "standart").length;
  const nonStandardItemCount = items.filter((it) => it.kondisi === "tidak_standart").length;
  const completedKetentuanCount = ketentuan.filter((kt) => kt.prosedur !== "").length;

  const handleMarkAllStandard = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        kondisi: "standart",
      }))
    );
    setKetentuan((prev) =>
      prev.map((kt) => ({
        ...kt,
        prosedur: "ya",
      }))
    );
  };

  const handleItemKondisiChange = (idx: number, kondisi: "standart" | "tidak_standart") => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        kondisi,
      };
      return copy;
    });
  };

  const handleItemKomentarChange = (idx: number, komentar: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], komentar };
      return copy;
    });
  };

  const handleKetentuanProsedurChange = (idx: number, prosedur: "ya" | "tidak") => {
    setKetentuan((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], prosedur };
      return copy;
    });
  };

  const handleKetentuanKomentarChange = (idx: number, komentar: string) => {
    setKetentuan((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], komentar };
      return copy;
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 mt-4">
      {/* ═══════════════════════════════════════════════════════════
          1. EXECUTIVE DOCUMENT HEADER & METADATA CARD
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        {/* Dark Industrial Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-5 py-3.5 border-b border-slate-700 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-orange-300 bg-orange-500/20 border border-orange-400/30 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                Checksheet Scaffolding
              </span>
              <span className="text-xs text-slate-300">
                17 Komponen Standar &amp; Ketentuan Lapangan
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowInlineDiagram((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all border border-slate-600 cursor-pointer whitespace-nowrap"
              >
                {showInlineDiagram ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Tutup Diagram</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Lihat Diagram</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                <span>Zoom Diagram (1–17)</span>
              </button>
            </div>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            Lembar Checklist &amp; Sertifikasi Kelayakan Scaffolding
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* 4 Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
            <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Nama Inspektor / Pengawas
                </label>
                {!readOnly ? (
                  <input
                    type="text"
                    value={namaInspektor}
                    onChange={(e) => setNamaInspektor(e.target.value)}
                    placeholder="Nama Pengawas / Inspektor"
                    className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {namaInspektor || "-"}
                  </p>
                )}
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Tanggal Inspeksi
                </label>
                {!readOnly ? (
                  <input
                    type="date"
                    value={tanggalInspeksi}
                    onChange={(e) => setTanggalInspeksi(e.target.value)}
                    className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {tanggalInspeksi || "-"}
                  </p>
                )}
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Lokasi Pemasangan
                </label>
                {!readOnly ? (
                  <input
                    type="text"
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    placeholder="Area / Gedung"
                    className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {lokasi || "-"}
                  </p>
                )}
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  Tipe Perancah
                </label>
                {!readOnly ? (
                  <input
                    type="text"
                    value={tipePerancah}
                    onChange={(e) => setTipePerancah(e.target.value)}
                    placeholder="Frame Scaffolding"
                    className="w-full mt-0.5 bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {tipePerancah || "Frame Scaffolding"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2. INLINE DIAGRAM ACCORDION (JIKA DIBUKA)
      ═══════════════════════════════════════════════════════════ */}
      {showInlineDiagram && (
        <div className="bg-white rounded-2xl border border-orange-200/90 shadow-2xs overflow-hidden animate-in fade-in duration-150">
          <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="text-xs font-bold text-orange-950">
                Diagram Panduan Komponen Perancah (Nomor 1 – 17)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-orange-100/60 text-orange-900 border border-orange-300 rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <ZoomIn className="w-3.5 h-3.5 text-orange-600" />
              <span>Layar Penuh</span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50/60 space-y-3">
            <div
              onClick={() => setShowImageModal(true)}
              className="w-full bg-white rounded-xl border border-slate-200 p-3 shadow-2xs cursor-zoom-in group overflow-hidden"
            >
              <img
                src="/images/scaffolding-diagram.png"
                alt="Diagram Teknis Komponen Scaffolding 1-17"
                className="w-full max-h-60 object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-200"
              />
            </div>

            {/* Quick Legend Grid of 17 Components */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 text-[11px]">
              {items.map((it) => {
                const isStd = it.kondisi === "standart";
                const isNotStd = it.kondisi === "tidak_standart";
                return (
                  <div
                    key={it.no}
                    className={`px-2 py-1.5 rounded-lg border flex items-center gap-1.5 min-w-0 ${
                      isStd
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                        : isNotStd
                        ? "bg-rose-50/70 border-rose-200 text-rose-900"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className={`w-4.5 h-4.5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                        isStd
                          ? "bg-emerald-600 text-white"
                          : isNotStd
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {it.no}
                    </span>
                    <span className="font-semibold truncate text-[10px]">{it.bagian}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          3. TABEL 1: 17 ITEM BAGIAN SCAFFOLDING
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide">
              1. Komponen &amp; Kondisi Scaffolding (17 Bagian)
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 whitespace-nowrap">
              {completedItemCount}/17 Terisi
            </span>
            {standardItemCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                ✓ {standardItemCount} Standart
              </span>
            )}
            {nonStandardItemCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                ✕ {nonStandardItemCount} Tidak Std
              </span>
            )}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleMarkAllStandard}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-2xs cursor-pointer whitespace-nowrap"
              title="Tandai seluruh 17 item sebagai Standart dan semua ketentuan Ya"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tandai Semua Standart</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wide">
                <th className="py-2.5 px-2.5 w-10 text-center">No</th>
                <th className="py-2.5 px-3 w-36 xl:w-44">Bagian Scaffolding</th>
                <th className="py-2.5 px-3">Standar Kelayakan K3</th>
                <th className="py-2.5 px-2.5 w-44 text-center">Kondisi Lapangan</th>
                <th className="py-2.5 px-3 w-44 xl:w-56">Komentar / Temuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {items.map((it, idx) => {
                const isStandard = it.kondisi === "standart";
                const isNotStandard = it.kondisi === "tidak_standart";

                return (
                  <tr
                    key={it.no}
                    className={`transition-colors ${
                      isNotStandard
                        ? "bg-rose-50/30 hover:bg-rose-50/50"
                        : isStandard
                        ? "hover:bg-emerald-50/20"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 px-2.5 text-center">
                      <span
                        className={`inline-flex w-6 h-6 rounded-md font-mono font-bold text-[11px] items-center justify-center ${
                          isStandard
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isNotStandard
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {it.no}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-xs">
                      {it.bagian}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600 leading-snug">
                      {it.kondisi_standar}
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleItemKondisiChange(idx, "standart")}
                          className={`flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-md font-bold text-[10px] transition-all whitespace-nowrap ${
                            isStandard
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          } ${!readOnly ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <Check className="w-3 h-3 shrink-0" />
                          <span>Standart</span>
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleItemKondisiChange(idx, "tidak_standart")}
                          className={`flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-md font-bold text-[10px] transition-all whitespace-nowrap ${
                            isNotStandard
                              ? "bg-rose-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          } ${!readOnly ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <X className="w-3 h-3 shrink-0" />
                          <span>Tidak Std</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {!readOnly ? (
                        <input
                          type="text"
                          value={it.komentar || ""}
                          onChange={(e) => handleItemKomentarChange(idx, e.target.value)}
                          placeholder={isNotStandard ? "Wajib isi temuan..." : "Catatan (opsional)"}
                          className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${
                            isNotStandard
                              ? "border-rose-300 bg-rose-50/50 text-rose-900 placeholder:text-rose-400"
                              : "border-slate-200 bg-white text-slate-800"
                          }`}
                        />
                      ) : (
                        <span
                          className={`block text-xs px-2.5 py-1.5 rounded-lg ${
                            it.komentar
                              ? isNotStandard
                                ? "bg-rose-50 text-rose-800 font-semibold border border-rose-200"
                                : "bg-slate-100 text-slate-800 font-medium"
                              : "text-slate-400 italic"
                          }`}
                        >
                          {it.komentar || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          4. TABEL 2: KETENTUAN KESELAMATAN LAINNYA
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
            2. Ketentuan Keselamatan Lainnya (Area &amp; Demarkasi)
          </span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            {completedKetentuanCount} / 3 Terisi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-wide">
                <th className="py-3 px-3.5 w-14 text-center">No</th>
                <th className="py-3 px-3.5">Ketentuan Pemeriksaan Prosedur</th>
                <th className="py-3 px-3.5 w-52 text-center">Sesuai Prosedur</th>
                <th className="py-3 px-3.5 w-60">Komentar / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {ketentuan.map((kt, idx) => {
                const isYa = kt.prosedur === "ya";
                const isTidak = kt.prosedur === "tidak";

                return (
                  <tr key={kt.no} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-flex w-7 h-7 rounded-lg font-mono font-extrabold text-xs items-center justify-center ${
                          isYa
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isTidak
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {kt.no}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900 text-xs sm:text-sm">
                      {kt.ketentuan}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center justify-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleKetentuanProsedurChange(idx, "ya")}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-all ${
                            isYa
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          } ${!readOnly ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Ya</span>
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleKetentuanProsedurChange(idx, "tidak")}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-all ${
                            isTidak
                              ? "bg-rose-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          } ${!readOnly ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <X className="w-3.5 h-3.5 shrink-0" />
                          <span>Tidak</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      {!readOnly ? (
                        <input
                          type="text"
                          value={kt.komentar || ""}
                          onChange={(e) => handleKetentuanKomentarChange(idx, e.target.value)}
                          placeholder="Catatan / Tindakan mitigasi..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <span className="block text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800">
                          {kt.komentar || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL LIGHTBOX / FULL SCREEN GAMBAR DIAGRAM SCAFFOLDING */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-4 space-y-3 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Diagram Teknis Pemasangan Komponen Perancah (1–17)
                </h3>
                <p className="text-xs text-slate-500">
                  Panduan posisi dan nomor komponen scaffolding standar keselamatan kerja
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 rounded-xl p-2 border border-slate-200 overflow-hidden">
              <img
                src="/images/scaffolding-diagram.png"
                alt="Diagram Teknis Scaffolding"
                className="w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

