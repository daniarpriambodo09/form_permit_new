// app/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  FileText,
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
} from "lucide-react";

interface Permit {
  id: number;
  noRegistrasi?: string;
  namaKontraktor?: string;
  lokasi?: string;
  tanggal?: string;
  waktuPukul?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
  createdAt?: string;
  jenisForm?: "hot-work" | "workshop" | "height-work";

  // Add these for height-work
  namaPetugas?: string[];
  berbadanSehat?: string[];

  // Generic fallback
  [key: string]: any;
}

export default function HistoryPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "submitted" | "approved" | "rejected">("all");
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPermits();
  }, []);

  const loadPermits = () => {
    const storedPermits = JSON.parse(localStorage.getItem("permits") || "[]");
    const storedDrafts = JSON.parse(localStorage.getItem("permitDrafts") || "[]");
    const allPermits = [...storedPermits, ...storedDrafts].sort((a, b) => b.id - a.id);
    setPermits(allPermits);
  };

  const filteredPermits = permits.filter((permit) => {
    if (filter === "all") return true;
    return permit.status === filter;
  });

  const handleViewPermit = (permit: Permit) => {
    setSelectedPermit(permit);
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { bg: "bg-gray-100", text: "text-gray-700", icon: AlertCircle, label: "Draft" },
      submitted: { bg: "bg-blue-100", text: "text-blue-700", icon: Clock, label: "Diajukan" },
      approved: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "Disetujui" },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Ditolak" },
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{badge.label}</span>
      </span>
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  };

  const formatTime = (timeString: string | undefined) => timeString || "-";

  const DetailModal = () => {
    if (!selectedPermit) return null;

    const renderSection = (title: string, content: React.ReactNode) => (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-100 px-4 py-2">
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-4">{content}</div>
      </div>
    );

    const renderPekerjaanPanas = (item: any, label: string) => {
      if (!item) return null;
      if (typeof item === "string") {
        return item ? <p key={label}>{label}: {item}</p> : null;
      }
      if (typeof item === "object" && (item.detail || item.mulai || item.selesai)) {
        return (
          <p key={label}>
            {label}: {item.detail || "-"} 
            {(item.mulai || item.selesai) && ` (Pukul ${item.mulai || "-"} - ${item.selesai || "-"})`}
          </p>
        );
      }
      return null;
    };

    // --- RENDER BERDASARKAN JENIS FORM ---
    const renderContentByType = () => {
      if (selectedPermit.jenisForm === "height-work") {
        return (
          <>
            {/* BAGIAN 1: INFORMASI PETUGAS KETINGGIAN */}
            {renderSection("BAGIAN 1: INFORMASI PETUGAS KETINGGIAN", (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'tipePerusahaan', label: 'Tipe Perusahaan' },
                  { key: 'deskripsiPekerjaan', label: 'Deskripsi Pekerjaan' },
                  { key: 'lokasi', label: 'Lokasi' },
                  { key: 'tanggal', label: 'Tanggal' },
                  { key: 'waktuMulai', label: 'Waktu Mulai' },
                  { key: 'waktuSelesai', label: 'Waktu Selesai' },
                  { key: 'namaPengawasKontraktor', label: 'Nama Pengawas Kontraktor' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {key === 'tanggal'
                        ? formatDate(selectedPermit[key])
                        : key === 'tipePerusahaan'
                        ? selectedPermit[key] === 'internal' ? 'Internal / Karyawan PT.JAI' : 'Eksternal / Subkontraktor'
                        : selectedPermit[key] || '-'}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* INFORMASI PETUGAS */}
            {renderSection("INFORMASI PETUGAS", (
              <div className="space-y-2">
                {selectedPermit.namaPetugas
                  ?.filter((n): n is string => typeof n === 'string' && n.trim() !== '')
                  .map((n, i) => (
                    <p key={`petugas-${i}`}>Petugas {i + 1}: {n}</p>
                  ))}
                {selectedPermit.berbadanSehat
                  ?.filter((s): s is string => typeof s === 'string' && s.trim() !== '')
                  .map((s, i) => (
                    <p key={`sehat-${i}`}>Sehat {i + 1}: {s}</p>
                  ))}
              </div>
            ))}

            {/* PEMINJAMAN PERALATAN */}
            {renderSection("PEMINJAMAN PERALATAN", (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'kunceePagar', label: 'Kunci Pagar Tangga Listrik' },
                  { key: 'rompiKetinggian', label: 'Rompi Ketinggian' },
                  { key: 'rompiAngka', label: 'No. Rompi' },
                  { key: 'safetyHelmetCount', label: 'Jumlah Safety Helmet' },
                  { key: 'fullBodyHarnessCount', label: 'Jumlah Full Body Harness' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {key === 'kunceePagar' || key === 'rompiKetinggian'
                        ? (selectedPermit[key] ? 'Ya' : 'Tidak')
                        : selectedPermit[key] || '-'}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* PEKERJAAN BERESIKO TINGGI */}
            {renderSection("PEKERJAAN BERESIKO TINGGI", (
              <div className="space-y-2">
                {[
                  { key: 'areaKerjaAman', label: 'Area kerja aman' },
                  { key: 'kebakaranProcedure', label: 'Prosedur kebakaran dipahami' },
                  { key: 'pekerjaanListrik', label: 'Ada pekerjaan listrik' },
                  { key: 'prosedurLoto', label: 'Melakukan prosedur LOTO' },
                  { key: 'perisakArea', label: 'Area ditutupi perisai tahan api' },
                  { key: 'safetyLineLine', label: 'Safety line tersedia & baik' },
                  { key: 'alatBantuKerja', label: 'Alat bantu kerja aman' },
                  { key: 'rompiSaatBekerja', label: 'Menggunakan rompi saat kerja' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit[key] === "ya" ? "Ya" : selectedPermit[key] === "tidak" ? "Tidak" : "-"}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* ALAT PELINDUNG DIRI */}
            {renderSection("ALAT PELINDUNG DIRI", (
              <div className="space-y-2">
                {[
                  { key: 'bebanBeratTubuh', label: 'Beban ≤ 5 kg' },
                  { key: 'helmStandar', label: 'Helm sesuai standar' },
                  { key: 'rambuSafetyWarning', label: 'Rambu safety tersedia' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit[key] === "ya" ? "Ya" : selectedPermit[key] === "tidak" ? "Tidak" : "-"}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* POINT PENGECEKAN HARNESS */}
            {renderSection("POINT PENGECEKAN HARNESS", (
              <div className="space-y-2">
                {[
                  { key: 'bodyHarnessWebbing', label: 'Webbing baik' },
                  { key: 'bodyHarnessDRing', label: 'D-Ring baik' },
                  { key: 'bodyHarnessAdjustment', label: 'Gesper baik' },
                  { key: 'lanyardAbsorber', label: 'Absorber baik' },
                  { key: 'lanyardSnapHook', label: 'Snap Hook baik' },
                  { key: 'lanyardRope', label: 'Rope baik' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit[key] === "ya" ? "Ya" : selectedPermit[key] === "tidak" ? "Tidak" : "-"}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* PERSETUJUAN */}
            {renderSection("PERSETUJUAN", (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'spvNama', label: 'SPV Terkait' },
                  { key: 'kontraktorNama', label: 'Kontraktor' },
                  { key: 'sfoNama', label: 'Safety Officer' },
                  { key: 'mrPgaNama', label: 'MR/PGA MGR' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit.persetujuan?.[key] || "-"}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </>
        );
      }

      // Default: hot-work / workshop
      return (
        <>
          {/* BAGIAN 1: INFORMASI UMUM */}
          {renderSection("BAGIAN 1: INFORMASI UMUM", (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['noRegistrasi', 'namaKontraktor', 'namaNIK', 'lokasi', 'tanggal', 'waktuPukul', 'namaFireWatch', 'namaNIKFireWatch', 'jabaranPemberiIzin', 'namaNIKPemberiIzin'].map(field => (
                <div key={field} className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">
                    {field
                      .replace(/([A-Z])/g, ' $1')
                      .replace('NIK', ' / NIK')
                      .replace('Pukul', '')
                      .trim()}
                  </span>
                  <p className="font-medium mt-1">
                    {field === 'tanggal' 
                      ? formatDate(selectedPermit[field]) 
                      : field === 'waktuPukul' 
                        ? formatTime(selectedPermit[field]) 
                        : selectedPermit[field] || '-'}
                  </p>
                </div>
              ))}
            </div>
          ))}

          {/* BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO */}
          {renderSection("BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO", (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 uppercase mb-2">Jenis Pekerjaan</p>
                <div className="space-y-1">
                  {selectedPermit.jenisPekerjaan?.preventive && <p key="preventive">✓ Preventive Genset / Pump room</p>}
                  {selectedPermit.jenisPekerjaan?.tangki && <p key="tangki">✓ Tangki Solar</p>}
                  {selectedPermit.jenisPekerjaan?.panel && <p key="panel">✓ Panel Listrik</p>}
                  {selectedPermit.jenisPekerjaan?.lainnya && selectedPermit.jenisPekerjaan.lainnyaKeterangan && (
                    <p key="lainnya">✓ Lainnya: {selectedPermit.jenisPekerjaan.lainnyaKeterangan}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 uppercase mb-2">Detail Pekerjaan Panas</p>
                <div className="space-y-1">
                  {renderPekerjaanPanas(selectedPermit.jenisPekerjaan?.cutting, "Cutting")}
                  {renderPekerjaanPanas(selectedPermit.jenisPekerjaan?.grinding, "Grinding")}
                  {renderPekerjaanPanas(selectedPermit.jenisPekerjaan?.welding, "Welding")}
                  {renderPekerjaanPanas(selectedPermit.jenisPekerjaan?.painting, "Painting")}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 uppercase mb-2">Area Berisiko</p>
                <div className="space-y-1">
                  {selectedPermit.areaBerisiko?.ruangTertutup && <p key="ruangTertutup">✓ Ruang tertutup</p>}
                  {selectedPermit.areaBerisiko?.bahanMudah && <p key="bahanMudah">✓ Bahan mudah terbakar</p>}
                  {selectedPermit.areaBerisiko?.gas && <p key="gas">✓ Gas</p>}
                  {selectedPermit.areaBerisiko?.ketinggian && <p key="ketinggian">✓ Ketinggian</p>}
                  {selectedPermit.areaBerisiko?.cairan && <p key="cairan">✓ Cairan/Gas bertekanan</p>}
                  {selectedPermit.areaBerisiko?.hydrocarbon && <p key="hydrocarbon">✓ Hydrocarbon</p>}
                  {selectedPermit.areaBerisiko?.lain && <p key="lain-area">✓ Lain: {selectedPermit.areaBerisiko.lain}</p>}
                </div>
              </div>
            </div>
          ))}

          {/* BAGIAN 3: UPAYA PENCEGAHAN */}
          {renderSection("BAGIAN 3: UPAYA PENCEGAHAN", (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(selectedPermit.pencegahan || {})
                .filter(([key]) => !['fireblank_jumlah', 'permintaan_tambahan'].includes(key))
                .map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
                  return (
                    <div key={key} className="text-sm mb-2">
                      <span className="text-xs text-slate-600 uppercase">{label}</span>
                      <p className="font-medium mt-1">
                        {typeof value === 'string'
                          ? value === 'ya'
                            ? 'Ya'
                            : value === 'tidak'
                            ? 'Tidak'
                            : value
                          : typeof value === 'boolean'
                          ? value ? 'Ya' : 'Tidak'
                          : '-'}
                      </p>
                    </div>
                  );
                })
              }
              {selectedPermit.pencegahan?.fireblank_jumlah && (
                <div key="fireblank_jumlah" className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">Jumlah Fire Blanket</span>
                  <p className="font-medium mt-1">{selectedPermit.pencegahan.fireblank_jumlah}</p>
                </div>
              )}
              {selectedPermit.pencegahan?.permintaan_tambahan && (
                <div key="permintaan_tambahan" className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">Permintaan Tambahan</span>
                  <p className="font-medium mt-1">{selectedPermit.pencegahan.permintaan_tambahan}</p>
                </div>
              )}
            </div>
          ))}

          {/* PERSETUJUAN */}
          {renderSection("PERSETUJUAN", (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'spvNama', label: 'SPV Terkait' },
                { key: 'kontraktorNama', label: 'Kontraktor' },
                { key: 'sfoNama', label: 'Safety Officer' },
                { key: 'pgaNama', label: 'PGA / Dept Head' },
              ].map(({ key, label }) => (
                <div key={key} className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">{label}</span>
                  <p className="font-medium mt-1">
                    {selectedPermit.persetujuan?.[key] || "-"}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </>
      );
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedPermit.jenisForm === "workshop"
                  ? "Detail Izin Kerja Workshop"
                  : selectedPermit.jenisForm === "height-work"
                  ? "Detail Izin Kerja Ketinggian"
                  : "Detail Izin Kerja Panas"}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                No. Registrasi: {selectedPermit.noRegistrasi || `#${selectedPermit.id}`}
              </p>
            </div>
            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-orange-200 rounded-lg">
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <span className="text-sm font-medium text-slate-700">Status:</span>
              {getStatusBadge(selectedPermit.status)}
            </div>

            {renderContentByType()}
          </div>

          <div className="sticky bottom-0 bg-slate-50 border-t p-4 flex justify-end gap-3">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
              Tutup
            </button>
            <button className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
              Print
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Home className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Riwayat Izin Kerja</h1>
                  <p className="text-sm text-slate-600">Daftar semua permit yang telah dibuat</p>
                </div>
              </div>
            </div>
            <Link
              href="/form/hot-work"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              + Buat Permit Baru
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className="text-sm font-semibold text-slate-700">Filter:</span>
            {(["all", "draft", "submitted", "approved", "rejected"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-orange-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {status === "all"
                  ? "Semua"
                  : status === "draft"
                  ? "Draft"
                  : status === "submitted"
                  ? "Diajukan"
                  : status === "approved"
                  ? "Disetujui"
                  : "Ditolak"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Permit</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{permits.length}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Draft</p>
                <p className="text-3xl font-bold text-slate-700 mt-1">
                  {permits.filter((p) => p.status === "draft").length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Diajukan</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {permits.filter((p) => p.status === "submitted").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Disetujui</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {permits.filter((p) => p.status === "approved").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredPermits.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-slate-200">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Belum ada permit</h3>
              <p className="text-slate-600 mb-6">
                Mulai dengan membuat permit baru untuk mengisi formulir izin kerja.
              </p>
              <Link
                href="/form/hot-work"
                className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                Buat Permit Baru
              </Link>
            </div>
          ) : (
            filteredPermits.map((permit) => (
              <div
                key={permit.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-bold text-slate-900">
                          {permit.noRegistrasi || `Permit #${permit.id}`}
                        </h3>
                        {getStatusBadge(permit.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <span>{permit.namaKontraktor || "-"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <span>{permit.lokasi || "-"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <span>{formatDate(permit.tanggal)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <span>{formatTime(permit.waktuPukul)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewPermit(permit)}
                      className="p-3 hover:bg-orange-50 rounded-lg transition-colors group"
                      title="Lihat Detail Form"
                    >
                      <Eye className="w-5 h-5 text-orange-600 group-hover:text-orange-700" />
                    </button>
                  </div>

                  {permit.submittedAt && (
                    <div className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-200">
                      Diajukan: {formatDate(permit.submittedAt)} |{" "}
                      {new Date(permit.submittedAt).toLocaleTimeString("id-ID")}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && <DetailModal />}
    </div>
  );
}
