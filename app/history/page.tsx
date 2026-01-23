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
import { supabase } from "@/lib/supabase";

interface Permit {
  id: string;
  noRegistrasi?: string;
  namaKontraktor?: string;
  lokasi?: string;
  tanggal?: string;
  waktuPukul?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
  createdAt?: string;
  jenisForm: "hot-work" | "workshop" | "height-work";

  // Generic fallback
  [key: string]: any;
}

export default function HistoryPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "hot-work" | "workshop" | "height-work">("all");
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPermits();
  }, []);

  const loadPermits = async () => {
    setLoading(true);
    try {
      // Ambil data dari 3 tabel
      const { data: hotWorkData, error: hotWorkError } = await supabase
        .from("form-kerja-panas")
        .select("*");

      const { data: workshopData, error: workshopError } = await supabase
        .from("form_kerja_workshop")
        .select("*");

      const { data: heightWorkData, error: heightWorkError } = await supabase
        .from("form-kerja-ketinggian")
        .select("*");

      if (hotWorkError || workshopError || heightWorkError) {
        console.error("Error fetching data:", { hotWorkError, workshopError, heightWorkError });
        alert("Gagal memuat data riwayat.");
        return;
      }

      // Gabungkan dan tandai jenis form
      const mappedHotWork = (hotWorkData || []).map((item) => ({
        ...item,
        id: item.id_form,
        jenisForm: "hot-work" as const,
        status: "submitted" as const,
        submittedAt: item.tanggal_pelaksanaan || item.tanggal,
        createdAt: item.tanggal,
      }));

      const mappedWorkshop = (workshopData || []).map((item) => ({
        ...item,
        id: item.id_form,
        jenisForm: "workshop" as const,
        status: "submitted" as const,
        submittedAt: item.tanggal_pelaksanaan || item.tanggal,
        createdAt: item.tanggal,
      }));

      const mappedHeightWork = (heightWorkData || []).map((item) => ({
        ...item,
        id: item.id_form,
        jenisForm: "height-work" as const,
        status: "submitted" as const,
        submittedAt: item.tanggal_pelaksanaan || item.tanggal,
        createdAt: item.tanggal,
      }));

      const allPermits = [...mappedHotWork, ...mappedWorkshop, ...mappedHeightWork].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setPermits(allPermits);
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPermits = permits.filter((permit) => {
    if (filter === "all") return true;
    return permit.jenisForm === filter;
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
    const badge = badges[status as keyof typeof badges] || badges.submitted;
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
                  { key: 'petugas_ketinggian', label: 'Tipe Perusahaan' },
                  { key: 'deskripsi_pekerjaan', label: 'Deskripsi Pekerjaan' },
                  { key: 'lokasi', label: 'Lokasi' },
                  { key: 'tanggal_pelaksanaan', label: 'Tanggal Pelaksanaan' },
                  { key: 'waktu_mulai', label: 'Waktu Mulai' },
                  { key: 'waktu_selesai', label: 'Waktu Selesai' },
                  { key: 'nama_pengawas_kontraktor', label: 'Nama Pengawas Kontraktor' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {key === 'petugas_ketinggian'
                        ? selectedPermit[key] || '-'
                        : key === 'tanggal_pelaksanaan'
                        ? formatDate(selectedPermit[key])
                        : key === 'waktu_mulai' || key === 'waktu_selesai'
                        ? formatTime(selectedPermit[key])
                        : selectedPermit[key] || '-'}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* INFORMASI PETUGAS */}
            {renderSection("INFORMASI PETUGAS", (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => {
                  const namaKey = `nama_petugas_${i + 1}`;
                  const sehatKey = `petugas_${i + 1}_sehat`;
                  const nama = selectedPermit[namaKey];
                  const sehat = selectedPermit[sehatKey];
                  if (!nama) return null;
                  return (
                    <div key={i} className="flex justify-between">
                      <span>Petugas {i + 1}: {nama}</span>
                      <span>{sehat ? "Sehat" : "Tidak Sehat"}</span>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* PEMINJAMAN PERALATAN */}
            {renderSection("PEMINJAMAN PERALATAN", (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'ada_kunci_pagar', label: 'Kunci Pagar Tangga Listrik' },
                  { key: 'ada_rompi_ketinggian', label: 'Rompi Ketinggian' },
                  { key: 'no_rompi', label: 'No. Rompi' },
                  { key: 'jumlah_safety_helmet', label: 'Jumlah Safety Helmet' },
                  { key: 'jumlah_full_body_harness', label: 'Jumlah Full Body Harness' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {key === 'ada_kunci_pagar' || key === 'ada_rompi_ketinggian'
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
                  { key: 'area_diperiksa_aman', label: 'Area kerja aman' },
                  { key: 'paham_cara_menggunakan_alat_pemadam_kebakaran', label: 'Prosedur kebakaran dipahami' },
                  { key: 'ada_kerja_listrik', label: 'Ada pekerjaan listrik' },
                  { key: 'prosedur_LOTO', label: 'Melakukan prosedur LOTO' },
                  { key: 'menutupi_area_bawah_prisai', label: 'Area ditutupi perisai tahan api' },
                  { key: 'safetyline_tersedia', label: 'Safety line tersedia & baik' },
                  { key: 'alat_bantu_kerja_aman', label: 'Alat bantu kerja aman' },
                  { key: 'menggunakan_rompi', label: 'Menggunakan rompi saat kerja' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit[key] ? "Ya" : "Tidak"}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* ALAT PELINDUNG DIRI */}
            {renderSection("ALAT PELINDUNG DIRI", (
              <div className="space-y-2">
                {[
                  { key: 'beban_tidak_5kg', label: 'Beban ≤ 5 kg' },
                  { key: 'helm_sesuai_sop', label: 'Helm sesuai standar' },
                  { key: 'rambu2_tersedia', label: 'Rambu safety tersedia' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit[key] ? "Ya" : "Tidak"}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* POINT PENGECEKAN HARNESS */}
            {renderSection("POINT PENGECEKAN HARNESS", (
              <div className="space-y-2">
                {[
                  { key: 'webbing_kondisi_baik', label: 'Webbing baik' },
                  { key: 'dring_kondisi_baik', label: 'D-Ring baik' },
                  { key: 'gesper_kondisi_baik', label: 'Gesper baik' },
                  { key: 'absorter_dan_timbes_kondisi_baik', label: 'Absorber baik' },
                  { key: 'snap_hook_kondisi_baik', label: 'Snap Hook baik' },
                  { key: 'rope_lanyard_kondisi_baik', label: 'Rope baik' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit[key] ? "Ya" : "Tidak"}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* PERSETUJUAN */}
            {renderSection("PERSETUJUAN", (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'spv_terkait', label: 'SPV Terkait' },
                  { key: 'nama_kontraktor', label: 'Kontraktor' },
                  { key: 'sfo', label: 'Safety Officer' },
                  { key: 'mr_pga_mgr', label: 'MR/PGA MGR' },
                ].map(({ key, label }) => (
                  <div key={key} className="text-sm mb-2">
                    <span className="text-xs text-slate-600 uppercase">{label}</span>
                    <p className="font-medium mt-1">
                      {selectedPermit[key] || "-"}
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
              {[
                { key: 'no_registrasi', label: 'No Registrasi' },
                { key: 'nama_kontraktor_nik', label: 'Nama Kontraktor / NIK' },
                { key: 'nama_nik', label: 'Nama Pekerja / NIK' },
                { key: 'lokasi_pekerjaan', label: 'Lokasi' },
                { key: 'tanggal_pelaksanaan', label: 'Tanggal Pelaksanaan' },
                { key: 'waktu_pukul', label: 'Waktu Pukul' },
                { key: 'nama_fire_watch', label: 'Nama Fire Watch' },
                { key: 'nik_fire_watch', label: 'NIK Fire Watch' },
                { key: 'jabatan_pemberi_izin', label: 'Jabatan Pemberi Izin' },
                { key: 'nik_pemberi_ijin', label: 'NIK Pemberi Izin' },
              ].map(({ key, label }) => (
                <div key={key} className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">{label}</span>
                  <p className="font-medium mt-1">
                    {key === 'tanggal_pelaksanaan'
                      ? formatDate(selectedPermit[key])
                      : key === 'waktu_pukul'
                      ? formatTime(selectedPermit[key])
                      : selectedPermit[key] || '-'}
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
                  {selectedPermit.preventive_genset_pump_room && <p key="preventive">✓ Preventive Genset / Pump room</p>}
                  {selectedPermit.tangki_solar && <p key="tangki">✓ Tangki Solar</p>}
                  {selectedPermit.panel_listrik && <p key="panel">✓ Panel Listrik</p>}
                  {selectedPermit.painting_spray && <p key="spray">✓ Painting Spray</p>}
                  {selectedPermit.ada_kerja_lainnya && selectedPermit.jenis_kerjaan_lainnya && (
                    <p key="lainnya">✓ Lainnya: {selectedPermit.jenis_kerjaan_lainnya}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 uppercase mb-2">Detail Pekerjaan Panas</p>
                <div className="space-y-1">
                  {renderPekerjaanPanas({ detail: selectedPermit.detail_cutting, mulai: selectedPermit.t_mulai_cutting, selesai: selectedPermit.t_selesai_cutting }, "Cutting")}
                  {renderPekerjaanPanas({ detail: selectedPermit.detail_grinding, mulai: selectedPermit.t_mulai_grinding, selesai: selectedPermit.t_selesai_grinding }, "Grinding")}
                  {renderPekerjaanPanas({ detail: selectedPermit.detail_welding, mulai: selectedPermit.t_mulai_welding, selesai: selectedPermit.t_selesai_welding }, "Welding")}
                  {renderPekerjaanPanas({ detail: selectedPermit.detail_painting, mulai: selectedPermit.t_mulai_painting, selesai: selectedPermit.t_selesai_painting }, "Painting")}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 uppercase mb-2">Area Berisiko</p>
                <div className="space-y-1">
                  {selectedPermit.ruang_tertutup && <p key="ruangTertutup">✓ Ruang tertutup</p>}
                  {selectedPermit.bahan_mudah_terbakar && <p key="bahanMudah">✓ Bahan mudah terbakar</p>}
                  {selectedPermit.gas_bejana_tangki && <p key="gas">✓ Gas</p>}
                  {selectedPermit.height_work && <p key="ketinggian">✓ Ketinggian</p>}
                  {selectedPermit.cairan_gas_bertekan && <p key="cairan">✓ Cairan/Gas bertekanan</p>}
                  {selectedPermit.cairan_hydrocarbon && <p key="hydrocarbon">✓ Hydrocarbon</p>}
                  {selectedPermit.bahaya_lain && <p key="lain-area">✓ Lain: {selectedPermit.bahaya_lain}</p>}
                </div>
              </div>
            </div>
          ))}

          {/* BAGIAN 3: UPAYA PENCEGAHAN */}
          {renderSection("BAGIAN 3: UPAYA PENCEGAHAN", (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'kondisi_tools_baik', label: 'Equipment / Tools kondisi baik' },
                { key: 'tersedia_apar_hydrant', label: 'APAR / Hydrant tersedia' },
                { key: 'sensor_smoke_detector_non_aktif', label: 'Sensor Smoke Detector non-aktif' },
                { key: 'apd_lengkap', label: 'APD lengkap' },
                { key: 'tidak_ada_cairan_mudah_terbakar', label: 'Tidak ada cairan mudah terbakar' },
                { key: 'lantai_bersih', label: 'Lantai bersih' },
                { key: 'lantai_sudah_dibasahi', label: 'Lantai sudah dibasahi' },
                { key: 'cairan_mudah_tebakar_tertutup', label: 'Cairan mudah terbakar tertutup' },
                { key: 'lembaran_dibawah_pekerjaan', label: 'Lembaran di bawah pekerjaan' },
                { key: 'lindungi_conveyor_dll', label: 'Lindungi conveyor dll' },
                { key: 'alat_telah_bersih', label: 'Alat telah dibersihkan' },
                { key: 'uap_menyala_telah_dibuang', label: 'Uap menyala telah dibuang' },
                { key: 'kerja_pada_dinding_lagit', label: 'Kerja pada dinding/langit-langit' },
                { key: 'bahan_mudah_terbakar_dipindahkan_dari_dinding', label: 'Bahan mudah terbakar dipindahkan' },
                { key: 'fire_watch_memastikan_area_aman', label: 'Fire watch pastikan area aman' },
                { key: 'firwatch_terlatih', label: 'Fire watch terlatih' },
              ].map(({ key, label }) => (
                <div key={key} className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">{label}</span>
                  <p className="font-medium mt-1">
                    {selectedPermit[key] ? "Ya" : "Tidak"}
                  </p>
                </div>
              ))}
              {selectedPermit.jumlah_fire_blanket && (
                <div key="jumlah_fire_blanket" className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">Jumlah Fire Blanket</span>
                  <p className="font-medium mt-1">{selectedPermit.jumlah_fire_blanket}</p>
                </div>
              )}
              {selectedPermit.permintaan_tambahan && (
                <div key="permintaan_tambahan" className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">Permintaan Tambahan</span>
                  <p className="font-medium mt-1">{selectedPermit.permintaan_tambahan}</p>
                </div>
              )}
            </div>
          ))}

          {/* PERSETUJUAN */}
          {renderSection("PERSETUJUAN", (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'spv_terkait', label: 'SPV Terkait' },
                { key: 'kontraktor', label: 'Kontraktor' },
                { key: 'sfo', label: 'Safety Officer' },
                { key: 'pga', label: 'PGA / Dept Head' },
              ].map(({ key, label }) => (
                <div key={key} className="text-sm mb-2">
                  <span className="text-xs text-slate-600 uppercase">{label}</span>
                  <p className="font-medium mt-1">
                    {selectedPermit[key] || "-"}
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
                ID Form: {selectedPermit.id}
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
            <span className="text-sm font-semibold text-slate-700">Filter Jenis Form:</span>
            {(["all", "hot-work", "workshop", "height-work"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === type
                    ? "bg-orange-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {type === "all"
                  ? "Semua"
                  : type === "hot-work"
                  ? "Hot Work"
                  : type === "workshop"
                  ? "Workshop"
                  : "Ketinggian"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-600"></div>
            <p className="mt-4 text-slate-600">Memuat data riwayat...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPermits.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-slate-200">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Belum ada data</h3>
                <p className="text-slate-600 mb-6">
                  Data akan muncul setelah Anda mengajukan izin kerja.
                </p>
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
                            {permit.id}
                          </h3>
                          {getStatusBadge(permit.status)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-600">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 flex-shrink-0 text-slate-400" />
                            <span>{permit.nama_kontraktor_nik || permit.nama_kontraktor || "-"}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 flex-shrink-0 text-slate-400" />
                            <span>{permit.lokasi_pekerjaan || permit.lokasi || "-"}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 flex-shrink-0 text-slate-400" />
                            <span>{formatDate(permit.tanggal_pelaksanaan)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 flex-shrink-0 text-slate-400" />
                            <span>{formatTime(permit.waktu_pukul)}</span>
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
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showModal && <DetailModal />}
    </div>
  );
}