// components/DetailModal.tsx
"use client";
import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, ZoomIn, FileText, Eye } from "lucide-react";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formType: "hot-work" | "height-work" | "workshop";
}

const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

const formatTime = (t?: string | null) => {
  if (!t) return "-";
  return String(t).slice(0, 5);
};

const isTruthy = (v: any): boolean => v === true || v === "t" || v === "true";

const MS = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
    <div className="bg-slate-100 px-4 py-2.5">
      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const F = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="text-sm mb-3 last:mb-0">
    <span className="text-xs text-slate-500 uppercase font-medium">{label}</span>
    <p className="font-semibold text-slate-800 mt-0.5">{value ?? "-"}</p>
  </div>
);

const BF = ({ label, value }: { label: string; value: any }) => {
  const yes = isTruthy(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700 flex-1 pr-4">{label}</span>
      <span className={`text-sm font-semibold shrink-0 ${yes ? "text-green-600" : "text-red-500"}`}>
        {yes ? "✓ Ya" : "✗ Tidak"}
      </span>
    </div>
  );
};

// ── Komponen Tampilan JSA ─────────────────────────────────────
const JsaDisplay = ({ perluJsa, jsaFileUrl }: { perluJsa: boolean; jsaFileUrl?: string | null }) => {
  if (!perluJsa) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
        <span className="text-sm text-slate-600">JSA <strong>Tidak Diperlukan</strong> untuk pekerjaan ini.</span>
      </div>
    );
  }

  if (jsaFileUrl) {
    // Extract filename dari URL
    const fileName = jsaFileUrl.split("/").pop() || "Dokumen JSA";
    
    // Pastikan URL lengkap dengan origin untuk akses dari tab baru
    const fileUrl = jsaFileUrl.startsWith('http') 
      ? jsaFileUrl 
      : `${window.location.origin}${jsaFileUrl}`;
    
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">File JSA Terlampir</p>
            <p className="text-xs text-green-600 truncate">{fileName}</p>
          </div>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 ml-3"
        >
          <Eye className="w-3.5 h-3.5" /> Lihat File
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
      <span className="text-sm text-amber-800">JSA <strong>Diperlukan</strong>, namun file belum diupload.</span>
    </div>
  );
};

// ── Komponen card approver ────────────────────────────────────
const ApprovalCard = ({
  label,
  approved,
  approvedBy,
  fallbackName,
}: {
  label: string;
  approved: any;
  approvedBy?: string;
  fallbackName?: string;
}) => (
  <div className={`p-3 rounded-lg border ${isTruthy(approved) ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
    <div className="flex items-center gap-2 mb-2">
      <p className="text-xs font-bold text-slate-700">{label}</p>
      {isTruthy(approved) && (
        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">✓ Disetujui</span>
      )}
    </div>
    <F label="Nama" value={approvedBy || fallbackName || "-"} />
  </div>
);

// ── Foto Lisensi Preview ──────────────────────────────────────
function FotoLisensiPreview({ src, nama, index }: { src: string; nama: string; index: number }) {
  const [showFull, setShowFull] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setShowFull(true)}
        className="relative group rounded-lg overflow-hidden border-2 border-slate-200 hover:border-orange-400 transition-colors"
        title={`Lihat lisensi ${nama}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Lisensi ${nama}`} className="w-16 h-16 object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
          <p className="text-white text-[9px] text-center truncate">P{index}</p>
        </div>
      </button>
      {showFull && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowFull(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800 text-sm">Foto Lisensi — Petugas {index}</p>
                <p className="text-xs text-slate-500">{nama}</p>
              </div>
              <button onClick={() => setShowFull(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Lisensi ${nama}`} className="w-full max-h-[65vh] object-contain rounded-lg bg-slate-50" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DetailModal({ isOpen, onClose, formId, formType }: DetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !formId) return;
    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formId]);

  const loadFormData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/form-permit/api/forms/${formType}/${formId}`);
      if (!res.ok) throw new Error("Gagal memuat data form");
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  // ── HOT WORK ────────────────────────────────────────────────
  const renderHotWork = () => {
    if (!data) return null;
    const p = data;
    const isEksternal = p.tipe_perusahaan === "eksternal";
    return (
      <>
        <MS title="Bagian 1: Informasi Dasar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="ID Form" value={p.id_form} />
            <F label="Tanggal Pembuatan" value={formatDate(p.tanggal)} />
            <F label="Tanggal Pelaksanaan" value={formatDate(p.tanggal_pelaksanaan)} />
            <F label="Status" value={p.status} />
            <F label="No. Registrasi" value={p.no_registrasi} />
            <F label="Nama Kontraktor / NIK" value={p.nama_kontraktor_nik} />
            <F label="Nama Pekerja / NIK" value={p.nama_pekerja_nik} />
            <F label="Lokasi Pekerjaan" value={p.lokasi_pekerjaan} />
            <F label="Waktu Pukul" value={formatTime(p.waktu_pukul)} />
          </div>
        </MS>

        <MS title="Bagian 2: Fire Watch & Pemberi Izin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-bold text-blue-800 text-xs mb-2">Fire Watch</h4>
              <F label="Nama" value={p.nama_fire_watch} />
              <F label="NIK" value={p.nik_fire_watch} />
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-bold text-green-800 text-xs mb-2">Pemberi Izin (SPV)</h4>
              <F label="Jabatan" value={p.jabatan_pemberi_izin} />
              <F label="NIK" value={p.nik_pemberi_ijin} />
            </div>
          </div>
        </MS>

        <MS title="Bagian 3: Jenis Pekerjaan">
          <div className="mb-4">
            <h4 className="font-semibold text-slate-700 text-sm mb-2">Jenis Pekerjaan Panas:</h4>
            <div className="flex flex-wrap gap-2">
              {isTruthy(p.preventive_genset_pump_room) && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Preventive Genset</span>}
              {isTruthy(p.tangki_solar) && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Tangki Solar</span>}
              {isTruthy(p.panel_listrik) && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Panel Listrik</span>}
            </div>
          </div>
          {[
            { l: "Cutting", d: p.detail_cutting, m: p.t_mulai_cutting, s: p.t_selesai_cutting },
            { l: "Grinding", d: p.detail_grinding, m: p.t_mulai_grinding, s: p.t_selesai_grinding },
            { l: "Welding", d: p.detail_welding, m: p.t_mulai_welding, s: p.t_selesai_welding },
            { l: "Painting", d: p.detail_painting, m: p.t_mulai_painting, s: p.t_selesai_painting },
          ].filter(x => x.d || x.m).map(x => (
            <div key={x.l} className="mb-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-700">{x.l}</span>
                {(x.m || x.s) && <span className="text-xs text-slate-500">{formatTime(x.m)} – {formatTime(x.s)}</span>}
              </div>
              <p className="text-sm text-slate-600">{x.d || "-"}</p>
            </div>
          ))}
        </MS>

        <MS title="Bagian 4: Upaya Pencegahan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <BF label="Equipment/Tools kondisi baik" value={p.kondisi_tools_baik} />
              <BF label="APAR dan Hydrant tersedia" value={p.tersedia_apar_hydrant} />
              <BF label="Sensor smoke detector non-aktif" value={p.sensor_smoke_detector_non_aktif} />
              <BF label="APD lengkap" value={p.apd_lengkap} />
              <BF label="Tidak ada cairan mudah terbakar" value={p.tidak_ada_cairan_mudah_terbakar} />
              <BF label="Lantai bersih" value={p.lantai_bersih} />
              <BF label="Lantai sudah dibasahi" value={p.lantai_sudah_dibasahi} />
              <BF label="Cairan mudah terbakar tertutup" value={p.cairan_mudah_tebakar_tertutup} />
            </div>
            <div>
              <BF label="Lembaran dibawah pekerjaan" value={p.lembaran_dibawah_pekerjaan} />
              <BF label="Lindungi conveyor dll" value={p.lindungi_conveyor_dll} />
              <BF label="Alat telah bersih" value={p.alat_telah_bersih} />
              <BF label="Uap menyala telah dibuang" value={p.uap_menyala_telah_dibuang} />
              <BF label="Kerja pada dinding langit" value={p.kerja_pada_dinding_lagit} />
              <BF label="Bahan mudah terbakar dipindahkan" value={p.bahan_mudah_terbakar_dipindahkan_dari_dinding} />
              <BF label="Fire watch memastikan area aman" value={p.fire_watch_memastikan_area_aman} />
              <BF label="Firewatch terlatih" value={p.firwatch_terlatih} />
            </div>
          </div>
          {p.jumlah_fire_blanket && (
            <div className="mt-3"> <F label="Jumlah Fire Blanket" value={p.jumlah_fire_blanket} /> </div>
          )}
          {p.permintaan_tambahan && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-xs font-semibold text-amber-700">Permintaan Tambahan:</span>
              <p className="text-sm text-slate-700 mt-1">{p.permintaan_tambahan}</p>
            </div>
          )}
        </MS>

        {/* ── DOKUMEN JSA ── */}
        <MS title="Dokumen JSA (Job Safety Analysis)">
          <JsaDisplay perluJsa={!!p.perlu_jsa} jsaFileUrl={p.jsa_file_url} />
        </MS>

        <MS title="Bagian 5: Persetujuan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEksternal ? (
              <>
                <ApprovalCard label="Kontraktor" approved={p.kontraktor_approved} approvedBy={p.kontraktor_approved_by} fallbackName={p.nama_kontraktor} />
                <ApprovalCard label="SPV" approved={p.spv_approved} approvedBy={p.spv_approved_by} fallbackName={p.spv_terkait} />
                <ApprovalCard label="Admin K3" approved={p.admin_k3_approved} approvedBy={p.admin_k3_approved_by} />
                <ApprovalCard label="SFO" approved={p.sfo_approved} approvedBy={p.sfo_approved_by} fallbackName={p.sfo} />
                <ApprovalCard label="MR / PGA MGR" approved={p.mr_pga_approved} approvedBy={p.mr_pga_approved_by} fallbackName={p.mr_pga_mgr} />
              </>
            ) : (
              <>
                <ApprovalCard label="SPV Terkait" approved={p.spv_approved} approvedBy={p.spv_approved_by} fallbackName={p.spv_terkait} />
                <ApprovalCard label="Admin K3" approved={p.admin_k3_approved} approvedBy={p.admin_k3_approved_by} />
                <ApprovalCard label="SFO" approved={p.sfo_approved} approvedBy={p.sfo_approved_by} fallbackName={p.sfo} />
                <ApprovalCard label="MR / PGA MGR" approved={p.mr_pga_approved} approvedBy={p.mr_pga_approved_by} fallbackName={p.mr_pga_mgr} />
              </>
            )}
          </div>
        </MS>

        {p.catatan_reject && <MS title="Catatan Penolakan"> <p className="text-sm text-red-600">{p.catatan_reject}</p> </MS>}
        {p.status === "rejected" && (
          <MS title="Informasi Penolakan">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Ditolak Oleh" value={p.approved_by} />
              <F label="Tanggal Penolakan" value={formatDate(p.approved_at)} />
            </div>
          </MS>
        )}
        {p.status === "approved" && (
          <MS title="Informasi Approval">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Disetujui Oleh" value={p.approved_by} />
              <F label="Tanggal Approval" value={formatDate(p.approved_at)} />
            </div>
          </MS>
        )}
      </>
    );
  };

  // ── HEIGHT WORK ─────────────────────────────────────────────
  const renderHeightWork = () => {
    if (!data) return null;
    const p = data;
    const isEksternal = p.tipe_perusahaan === 'eksternal' || p.petugas_ketinggian === 'Eksternal / Subkontraktor';

    const petugasList = Array.from({ length: 10 })
      .map((_, i) => ({
        index: i + 1,
        nama: p[`nama_petugas_${i + 1}`] as string | null,
        sehat: isTruthy(p[`petugas_${i + 1}_sehat`]),
        lisensi: p[`foto_lisensi_${i + 1}`] as string | null,
      }))
      .filter((row) => row.nama);

    return (
      <>
        <MS title="Bagian 1: Informasi Pekerjaan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="ID Form" value={p.id_form} />
            <F label="Tanggal Pembuatan" value={formatDate(p.tanggal)} />
            <F label="Tipe Petugas" value={
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isEksternal ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                {isEksternal ? "Eksternal / Subkontraktor" : "Internal / Karyawan PT.JAI"}
              </span>
            } />
            <F label="Status" value={p.status} />
            <F label="Deskripsi Pekerjaan" value={p.deskripsi_pekerjaan} />
            <F label="Lokasi" value={p.lokasi} />
            <F label="Tanggal Pelaksanaan" value={formatDate(p.tanggal_pelaksanaan)} />
            <F label="Waktu Mulai" value={formatTime(p.waktu_mulai)} />
            <F label="Waktu Selesai" value={formatTime(p.waktu_selesai)} />
            <F label="Pengawas Kontraktor" value={p.nama_pengawas_kontraktor} />
            <F label="Pengawas Departemen" value={p.nama_pengawas_departemen} />
            <F label="Departemen" value={p.nama_departemen} />
          </div>
        </MS>

        <MS title="Bagian 2: Daftar Petugas Ketinggian">
          {petugasList.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Tidak ada petugas yang terdaftar.</p>
          ) : (
            <div className="space-y-3">
              {petugasList.map((row) => (
                <div key={row.index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">{row.index}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{row.nama}</p>
                    <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${row.sehat ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {row.sehat ? "✓ Berbadan Sehat" : "✗ Tidak Sehat"}
                    </span>
                  </div>
                  {row.lisensi ? (
                    <FotoLisensiPreview src={row.lisensi} nama={row.nama!} index={row.index} />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-slate-400 text-center leading-tight px-1">Tidak ada foto</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </MS>

        <MS title="Bagian 3: Peminjaman APD">
          <div className="space-y-3">
            <BF label="Kunci Pagar Tangga Listrik" value={p.ada_kunci_pagar} />
            <BF label="Rompi Ketinggian" value={p.ada_rompi_ketinggian} />
            {isTruthy(p.ada_rompi_ketinggian) && <F label="No. Rompi" value={p.no_rompi} />}
            <BF label="Safety Helmet" value={p.ada_safety_helmet} />
            {isTruthy(p.ada_safety_helmet) && <F label="Jumlah Safety Helmet" value={p.jumlah_safety_helmet} />}
            <BF label="Full Body Harness" value={p.ada_full_body_harmess} />
            {isTruthy(p.ada_full_body_harmess) && <F label="Jumlah Full Body Harness" value={p.jumlah_full_body_harness} />}
          </div>
        </MS>

        <MS title="Bagian 4: Keselamatan Kerja Ketinggian">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <BF label="Area diperiksa & aman" value={p.area_diperiksa_aman} />
              <BF label="Paham alat pemadam kebakaran" value={p.paham_cara_menggunakan_alat_pemadam_kebakaran} />
              <BF label="Ada pekerjaan listrik" value={p.ada_kerja_listrik} />
              <BF label="Prosedur LOTO" value={p.prosedur_loto} />
              <BF label="Menutupi area bawah prisai" value={p.menutupi_area_bawah_prisai} />
              <BF label="Safety line tersedia" value={p.safetyline_tersedia} />
            </div>
            <div>
              <BF label="Alat bantu kerja aman" value={p.alat_bantu_kerja_aman} />
              <BF label="Menggunakan rompi" value={p.menggunakan_rompi} />
              <BF label="Beban tidak >5kg" value={p.beban_tidak_5kg} />
              <BF label="Helm sesuai SOP" value={p.helm_sesuai_sop} />
              <BF label="Rambu-rambu tersedia" value={p.rambu2_tersedia} />
            </div>
          </div>
        </MS>

        <MS title="Bagian 5: Pengecekan Body Harness & Lanyard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-2">Body Harness</h5>
              <BF label="Webbing - Kondisi baik" value={p.webbing_kondisi_baik} />
              <BF label="D-Ring - Kondisi baik" value={p.dring_kondisi_baik} />
              <BF label="Gesper - Kondisi baik" value={p.gesper_kondisi_baik} />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-2">Lanyard</h5>
              <BF label="Absorber & Timbes - Kondisi baik" value={p.absorter_dan_timbes_kondisi_baik} />
              <BF label="Snap Hook - Kondisi baik" value={p.snap_hook_kondisi_baik} />
              <BF label="Rope Lanyard - Kondisi baik" value={p.rope_lanyard_kondisi_baik} />
            </div>
          </div>
        </MS>

        {/* ── DOKUMEN JSA ── */}
        <MS title="Dokumen JSA (Job Safety Analysis)">
          <JsaDisplay perluJsa={!!p.perlu_jsa} jsaFileUrl={p.jsa_file_url} />
        </MS>

        <MS title="Bagian 6: Persetujuan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEksternal ? (
              <>
                <ApprovalCard label="Kontraktor" approved={p.kontraktor_approved} approvedBy={p.kontraktor_approved_by} fallbackName={p.nama_kontraktor} />
                <ApprovalCard label="SPV" approved={p.spv_approved} approvedBy={p.spv_approved_by} fallbackName={p.spv_terkait} />
                <ApprovalCard label="Admin K3" approved={p.admin_k3_approved} approvedBy={p.admin_k3_approved_by} />
                <ApprovalCard label="SFO" approved={p.sfo_approved} approvedBy={p.sfo_approved_by} fallbackName={p.sfo} />
                <ApprovalCard label="MR / PGA MGR" approved={p.mr_pga_approved} approvedBy={p.mr_pga_approved_by} fallbackName={p.mr_pga_mgr} />
              </>
            ) : (
              <>
                <ApprovalCard label="SPV Terkait" approved={p.spv_approved} approvedBy={p.spv_approved_by} fallbackName={p.spv_terkait} />
                <ApprovalCard label="Admin K3" approved={p.admin_k3_approved} approvedBy={p.admin_k3_approved_by} />
                <ApprovalCard label="SFO" approved={p.sfo_approved} approvedBy={p.sfo_approved_by} fallbackName={p.sfo} />
                <ApprovalCard label="MR / PGA MGR" approved={p.mr_pga_approved} approvedBy={p.mr_pga_approved_by} fallbackName={p.mr_pga_mgr} />
              </>
            )}
          </div>
        </MS>

        {p.catatan_reject && <MS title="Catatan Penolakan"> <p className="text-sm text-red-600">{p.catatan_reject}</p> </MS>}
        {p.status === "rejected" && (
          <MS title="Informasi Penolakan">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Ditolak Oleh" value={p.approved_by} />
              <F label="Tanggal Penolakan" value={formatDate(p.approved_at)} />
            </div>
          </MS>
        )}
        {p.status === "approved" && (
          <MS title="Informasi Approval">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Disetujui Oleh" value={p.approved_by} />
              <F label="Tanggal Approval" value={formatDate(p.approved_at)} />
            </div>
          </MS>
        )}
      </>
    );
  };

  // ── WORKSHOP ────────────────────────────────────────────────
  const renderWorkshop = () => {
    if (!data) return null;
    const p = data;
    const isEksternal = p.tipe_perusahaan === "eksternal";
    return (
      <>
        <MS title="Bagian 1: Informasi Dasar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="ID Form" value={p.id_form} />
            <F label="Tanggal Pembuatan" value={formatDate(p.tanggal)} />
            <F label="Tanggal Pelaksanaan" value={formatDate(p.tanggal_pelaksanaan)} />
            <F label="Status" value={p.status} />
            <F label="No. Registrasi" value={p.no_registrasi} />
            <F label="Nama Kontraktor / NIK" value={p.nama_kontraktor_nik} />
            <F label="Nama Pekerja / NIK" value={p.nama_pekerja_nik} />
            <F label="Lokasi Pekerjaan" value={p.lokasi_pekerjaan} />
            <F label="Waktu Pukul" value={formatTime(p.waktu_pukul)} />
          </div>
        </MS>

        <MS title="Bagian 2: Fire Watch & Pemberi Izin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-bold text-blue-800 text-xs mb-2">Fire Watch</h4>
              <F label="Nama" value={p.nama_fire_watch} />
              <F label="NIK" value={p.nik_fire_watch} />
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-bold text-green-800 text-xs mb-2">Pemberi Izin (SPV)</h4>
              <F label="Jabatan" value={p.jabatan_pemberi_izin} />
              <F label="NIK" value={p.nik_pemberi_ijin} />
            </div>
          </div>
        </MS>

        <MS title="Bagian 3: Jenis Pekerjaan">
          <div className="mb-4">
            <h4 className="font-semibold text-slate-700 text-sm mb-2">Jenis Pekerjaan:</h4>
            <div className="flex flex-wrap gap-2">
              {isTruthy(p.preventive_genset_pump_room) && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Preventive Genset</span>}
              {isTruthy(p.tangki_solar) && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Tangki Solar</span>}
              {isTruthy(p.panel_listrik) && <span className="px-2 py-1 bg-slate-100 rounded text-xs">✓ Panel Listrik</span>}
              {isTruthy(p.painting_spray) && <span className="px-2 py-1 bg-orange-100 rounded text-xs">✓ Painting Spray</span>}
              {isTruthy(p.painting_non_spray) && <span className="px-2 py-1 bg-orange-100 rounded text-xs">✓ Painting Non-Spray</span>}
            </div>
          </div>
          {[
            { l: "Cutting", d: p.detail_cutting, m: p.t_mulai_cutting, s: p.t_selesai_cutting },
            { l: "Grinding", d: p.detail_grinding, m: p.t_mulai_grinding, s: p.t_selesai_grinding },
            { l: "Welding", d: p.detail_welding, m: p.t_mulai_welding, s: p.t_selesai_welding },
            { l: "Painting", d: p.detail_painting, m: p.t_mulai_painting, s: p.t_selesai_painting },
          ].filter(x => x.d || x.m).map(x => (
            <div key={x.l} className="mb-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-700">{x.l}</span>
                {(x.m || x.s) && <span className="text-xs text-slate-500">{formatTime(x.m)} – {formatTime(x.s)}</span>}
              </div>
              <p className="text-sm text-slate-600">{x.d || "-"}</p>
            </div>
          ))}
        </MS>

        <MS title="Bagian 4: Upaya Pencegahan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <BF label="Equipment/Tools kondisi baik" value={p.kondisi_tools_baik} />
              <BF label="APAR dan Hydrant tersedia" value={p.tersedia_apar_hydrant} />
              <BF label="Sensor smoke detector non-aktif" value={p.sensor_smoke_detector_non_aktif} />
              <BF label="APD lengkap" value={p.apd_lengkap} />
              <BF label="Tidak ada cairan mudah terbakar" value={p.tidak_ada_cairan_mudah_terbakar} />
              <BF label="Lantai bersih" value={p.lantai_bersih} />
              <BF label="Lantai sudah dibasahi" value={p.lantai_sudah_dibasahi} />
              <BF label="Cairan mudah terbakar tertutup" value={p.cairan_mudah_tebakar_tertutup} />
            </div>
            <div>
              <BF label="Lembaran dibawah pekerjaan" value={p.lembaran_dibawah_pekerjaan} />
              <BF label="Lindungi conveyor dll" value={p.lindungi_conveyor_dll} />
              <BF label="Alat telah bersih" value={p.alat_telah_bersih} />
              <BF label="Uap menyala telah dibuang" value={p.uap_menyala_telah_dibuang} />
              <BF label="Kerja pada dinding langit" value={p.kerja_pada_dinding_lagit} />
              <BF label="Bahan mudah terbakar dipindahkan" value={p.bahan_mudah_terbakar_dipindahkan_dari_dinding} />
              <BF label="Fire watch memastikan area aman" value={p.fire_watch_memastikan_area_aman} />
              <BF label="Firewatch terlatih" value={p.firwatch_terlatih} />
            </div>
          </div>
          {p.permintaan_tambahan && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-xs font-semibold text-amber-700">Permintaan Tambahan:</span>
              <p className="text-sm text-slate-700 mt-1">{p.permintaan_tambahan}</p>
            </div>
          )}
        </MS>

        {/* ── DOKUMEN JSA ── */}
        <MS title="Dokumen JSA (Job Safety Analysis)">
          <JsaDisplay perluJsa={!!p.perlu_jsa} jsaFileUrl={p.jsa_file_url} />
        </MS>

        <MS title="Bagian 5: Persetujuan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEksternal ? (
              <>
                <ApprovalCard label="Kontraktor" approved={p.kontraktor_approved} approvedBy={p.kontraktor_approved_by} fallbackName={p.nama_kontraktor} />
                <ApprovalCard label="SPV" approved={p.spv_approved} approvedBy={p.spv_approved_by} fallbackName={p.spv_terkait} />
                <ApprovalCard label="Admin K3" approved={p.admin_k3_approved} approvedBy={p.admin_k3_approved_by} />
                <ApprovalCard label="SFO" approved={p.sfo_approved} approvedBy={p.sfo_approved_by} fallbackName={p.sfo} />
                <ApprovalCard label="MR / PGA MGR" approved={p.mr_pga_approved} approvedBy={p.mr_pga_approved_by} fallbackName={p.mr_pga_mgr} />
              </>
            ) : (
              <>
                <ApprovalCard label="SPV Terkait" approved={p.spv_approved} approvedBy={p.spv_approved_by} fallbackName={p.spv_terkait} />
                <ApprovalCard label="Admin K3" approved={p.admin_k3_approved} approvedBy={p.admin_k3_approved_by} />
                <ApprovalCard label="SFO" approved={p.sfo_approved} approvedBy={p.sfo_approved_by} fallbackName={p.sfo} />
                <ApprovalCard label="MR / PGA MGR" approved={p.mr_pga_approved} approvedBy={p.mr_pga_approved_by} fallbackName={p.mr_pga_mgr} />
              </>
            )}
          </div>
        </MS>

        {p.catatan_reject && <MS title="Catatan Penolakan"> <p className="text-sm text-red-600">{p.catatan_reject}</p> </MS>}
        {p.status === "rejected" && (
          <MS title="Informasi Penolakan">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Ditolak Oleh" value={p.approved_by} />
              <F label="Tanggal Penolakan" value={formatDate(p.approved_at)} />
            </div>
          </MS>
        )}
        {p.status === "approved" && (
          <MS title="Informasi Approval">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Disetujui Oleh" value={p.approved_by} />
              <F label="Tanggal Approval" value={formatDate(p.approved_at)} />
            </div>
          </MS>
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Detail Form</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
          ) : formType === "hot-work" ? (
            renderHotWork()
          ) : formType === "height-work" ? (
            renderHeightWork()
          ) : (
            renderWorkshop()
          )}
        </div>
      </div>
    </div>
  );
}