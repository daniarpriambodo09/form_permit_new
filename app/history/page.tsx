// app/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home, FileText, Calendar, Clock, User, MapPin,
  CheckCircle, XCircle, AlertCircle, Eye, X, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Permit {
  id: string;
  jenisForm: "hot-work" | "workshop" | "height-work";
  status: "draft" | "submitted" | "approved" | "rejected";
  tanggal?: string;
  tanggal_pelaksanaan?: string;
  [key: string]: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

// FIX 1: PostgreSQL TIME bisa datang "08:30:00" → potong jadi "08:30"
const formatTime = (t?: string | null) => {
  if (!t) return "-";
  return String(t).slice(0, 5);
};

// FIX 2: PostgreSQL boolean bisa datang sebagai true/false ATAU "t"/"f" (tergantung driver)
const isTruthy = (v: any): boolean =>
  v === true || v === "t" || v === "true";

// ─── Badge & label ────────────────────────────────────────────────────────────
const getStatusBadge = (status: string) => {
  const map: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    draft:     { bg: "bg-gray-100",  text: "text-gray-700",  icon: AlertCircle, label: "Draft" },
    submitted: { bg: "bg-blue-100",  text: "text-blue-700",  icon: Clock,       label: "Diajukan" },
    approved:  { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "Disetujui" },
    rejected:  { bg: "bg-red-100",   text: "text-red-700",   icon: XCircle,     label: "Ditolak" },
  };
  const b    = map[status] ?? map.submitted;
  const Icon = b.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>
      <Icon className="w-3.5 h-3.5" />{b.label}
    </span>
  );
};

const formTypeLabel: Record<string, string> = {
  "hot-work":    "Hot Work Permit",
  "workshop":    "Workshop Permit",
  "height-work": "Kerja Ketinggian",
};
const formTypeBadge: Record<string, string> = {
  "hot-work":    "bg-red-100 text-red-700",
  "workshop":    "bg-purple-100 text-purple-700",
  "height-work": "bg-orange-100 text-orange-700",
};

// ─── Modal sub-components ─────────────────────────────────────────────────────
const MS = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-slate-200 rounded-lg overflow-hidden">
    <div className="bg-slate-100 px-4 py-2.5">
      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const F = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="text-sm">
    <span className="text-xs text-slate-500 uppercase font-medium">{label}</span>
    <p className="font-semibold text-slate-800 mt-0.5">{value ?? "-"}</p>
  </div>
);

// FIX 2 applied here — handle both boolean and "t"/"f" string from pg
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

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ permit, onClose }: { permit: Permit; onClose: () => void }) => {
  const p = permit;

  const renderHeightWork = () => (
    <>
      <MS title="Bagian 1: Informasi Pekerjaan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Tipe Petugas"             value={p.petugas_ketinggian} />
          <F label="Deskripsi Pekerjaan"      value={p.deskripsi_pekerjaan} />
          <F label="Lokasi"                   value={p.lokasi} />
          <F label="Tanggal Pelaksanaan"      value={formatDate(p.tanggal_pelaksanaan)} />
          <F label="Waktu Mulai"              value={formatTime(p.waktu_mulai)} />
          <F label="Waktu Selesai"            value={formatTime(p.waktu_selesai)} />
          <F label="Pengawas Kontraktor"      value={p.nama_pengawas_kontraktor} />
        </div>
      </MS>

      <MS title="Daftar Petugas">
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, i) => {
            const nama = p[`nama_petugas_${i + 1}`];
            if (!nama) return null;
            const sehat = isTruthy(p[`petugas_${i + 1}_sehat`]);
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm"><span className="font-medium">Petugas {i + 1}:</span> {nama}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sehat ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {sehat ? "Sehat" : "Tidak Sehat"}
                </span>
              </div>
            );
          })}
        </div>
      </MS>

      <MS title="Bagian 2: Peminjaman APD">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BF label="Kunci Pagar Tangga Listrik"  value={p.ada_kunci_pagar} />
          <BF label="Rompi Ketinggian"            value={p.ada_rompi_ketinggian} />
          <F  label="No. Rompi"                   value={p.no_rompi} />
          <F  label="Jumlah Safety Helmet"        value={p.jumlah_safety_helmet} />
          <F  label="Jumlah Full Body Harness"    value={p.jumlah_full_body_harness} />
        </div>
      </MS>

      <MS title="Bagian 3: Pekerjaan Beresiko Tinggi">
        <BF label="Area kerja diperiksa & aman"                          value={p.area_diperiksa_aman} />
        <BF label="Paham cara menggunakan alat pemadam kebakaran"        value={p.paham_cara_menggunakan_alat_pemadam_kebakaran} />
        <BF label="Ada pekerjaan listrik"                                value={p.ada_kerja_listrik} />
        <BF label="Melakukan prosedur LOTO"                              value={p.prosedur_loto} />
        <BF label="Menutupi area bawah dengan perisai tahan api"         value={p.menutupi_area_bawah_prisai} />
        <BF label="Safety line tersedia & kondisi baik"                  value={p.safetyline_tersedia} />
        <BF label="Alat bantu kerja dalam keadaan aman"                  value={p.alat_bantu_kerja_aman} />
        <BF label="Menggunakan rompi saat bekerja di ketinggian"         value={p.menggunakan_rompi} />
      </MS>

      <MS title="Bagian 4: Alat Pelindung Diri">
        <BF label="Beban dibawa ≤ 5 kg"      value={p.beban_tidak_5kg} />
        <BF label="Helm sesuai standar SOP"  value={p.helm_sesuai_sop} />
        <BF label="Rambu-rambu safety ada"   value={p.rambu2_tersedia} />
      </MS>

      <MS title="Bagian 5: Pengecekan Body Harness & Lanyard">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Body Harness</p>
            <BF label="Webbing — jahitan baik"         value={p.webbing_kondisi_baik} />
            <BF label="D-Ring — tidak retak/berkarat"  value={p.dring_kondisi_baik} />
            <BF label="Gesper — mengunci sempurna"     value={p.gesper_kondisi_baik} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Lanyard</p>
            <BF label="Absorber & Timbes — baik"   value={p.absorter_dan_timbes_kondisi_baik} />
            <BF label="Snap Hook — dapat dikunci"  value={p.snap_hook_kondisi_baik} />
            <BF label="Rope Lanyard — tidak aus"   value={p.rope_lanyard_kondisi_baik} />
          </div>
        </div>
      </MS>

      <MS title="Persetujuan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="SPV Terkait"   value={p.spv_terkait} />
          <F label="Kontraktor"    value={p.nama_kontraktor} />
          <F label="SFO"           value={p.sfo} />
          <F label="MR / PGA MGR" value={p.mr_pga_mgr} />
        </div>
      </MS>
    </>
  );

  const renderHotOrWorkshop = () => (
    <>
      {/* FIX 3: Fire Watch & Jabatan Pemberi Izin ditampilkan dengan section terpisah */}
      <MS title="Bagian 1: Informasi Registrasi & Identitas">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <F label="No. Registrasi"        value={p.no_registrasi} />
          <F label="Nama Kontraktor / NIK" value={p.nama_kontraktor_nik} />
          <F label="Nama Pekerja / NIK"    value={p.nama_pekerja_nik} />
          <F label="Lokasi Pekerjaan"      value={p.lokasi_pekerjaan} />
          <F label="Tanggal Pelaksanaan"   value={formatDate(p.tanggal_pelaksanaan)} />
          {/* FIX 4: waktu_pukul dari Postgres sudah diformat dengan formatTime */}
          <F label="Waktu Pukul"           value={formatTime(p.waktu_pukul)} />
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
          <p className="text-xs font-bold text-blue-700 uppercase mb-2">Fire Watch (Pengawas Api)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Nama Fire Watch" value={p.nama_fire_watch} />
            <F label="NIK Fire Watch"  value={p.nik_fire_watch} />
          </div>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-bold text-green-700 uppercase mb-2">Pemberi Izin</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Jabatan Pemberi Izin" value={p.jabatan_pemberi_izin} />
            <F label="NIK Pemberi Izin"     value={p.nik_pemberi_ijin} />
          </div>
        </div>
      </MS>

      <MS title="Bagian 2A: Jenis Pekerjaan">
        <div className="space-y-1 mb-4">
          {isTruthy(p.preventive_genset_pump_room) && <p className="text-sm py-0.5">✓ Preventive Genset / Pump Room</p>}
          {isTruthy(p.tangki_solar)                && <p className="text-sm py-0.5">✓ Tangki Solar</p>}
          {isTruthy(p.panel_listrik)               && <p className="text-sm py-0.5">✓ Panel Listrik</p>}
          {isTruthy(p.ada_kerja_lainnya) && p.jenis_kerjaan_lainnya && (
            <p className="text-sm py-0.5">✓ Lainnya: {p.jenis_kerjaan_lainnya}</p>
          )}
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Detail Pekerjaan Panas</p>
        {[
          { label: "Cutting",  detail: p.detail_cutting,  mulai: p.t_mulai_cutting,  selesai: p.t_selesai_cutting },
          { label: "Grinding", detail: p.detail_grinding, mulai: p.t_mulai_grinding, selesai: p.t_selesai_grinding },
          { label: "Welding",  detail: p.detail_welding,  mulai: p.t_mulai_welding,  selesai: p.t_selesai_welding },
          { label: "Painting", detail: p.detail_painting, mulai: p.t_mulai_painting, selesai: p.t_selesai_painting },
        ].filter(x => x.detail || x.mulai || x.selesai).map(x => (
          <div key={x.label} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0 text-sm">
            <span className="font-semibold w-20 text-slate-700 shrink-0">{x.label}</span>
            <span className="text-slate-600 flex-1">{x.detail || "-"}</span>
            {(x.mulai || x.selesai) && (
              <span className="text-xs text-slate-500 shrink-0">
                {formatTime(x.mulai)} – {formatTime(x.selesai)}
              </span>
            )}
          </div>
        ))}
        {p.jenisForm === "workshop" && (
          <div className="mt-3 flex gap-2">
            {isTruthy(p.painting_spray)     && <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">SPRAY</span>}
            {isTruthy(p.painting_non_spray) && <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">NON SPRAY</span>}
          </div>
        )}
      </MS>

      <MS title="Bagian 2B: Area Berisiko Tinggi">
        <div className="space-y-1">
          {[
            { key: "ruang_tertutup",       label: "Ruang tertutup / area pembuangan / container" },
            { key: "bahan_mudah_terbakar", label: "Bahan mudah terbakar" },
            { key: "gas_bejana_tangki",    label: "Gas (bekerja dalam bejana / tangki)" },
            { key: "height_work",          label: "Bekerja di ketinggian" },
            { key: "cairan_gas_bertekan",  label: "Cairan / Gas bertekanan" },
            { key: "cairan_hydrocarbon",   label: "Cairan hydrocarbon (minyak, kondensat)" },
          ].filter(x => isTruthy(p[x.key])).map(x => (
            <p key={x.key} className="text-sm py-0.5">✓ {x.label}</p>
          ))}
          {p.bahaya_lain && <p className="text-sm py-0.5 text-amber-700">⚠ Bahaya lain: {p.bahaya_lain}</p>}
        </div>
      </MS>

      <MS title="Bagian 3: Upaya Pencegahan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">1. Umum</p>
            <BF label="Equipment / Tools kondisi baik"        value={p.kondisi_tools_baik} />
            <BF label="APAR / Hydrant tersedia"               value={p.tersedia_apar_hydrant} />
            <BF label="Sensor Smoke Detector non-aktif"       value={p.sensor_smoke_detector_non_aktif} />
            <BF label="APD lengkap dipakai"                   value={p.apd_lengkap} />

            <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">2. Daerah 11 Meter</p>
            <BF label="Tidak ada cairan mudah terbakar"       value={p.tidak_ada_cairan_mudah_terbakar} />
            <BF label="Lantai bersih"                         value={p.lantai_bersih} />
            <BF label="Lantai dibasahi / pasir basah"         value={p.lantai_sudah_dibasahi} />
            <BF label="Cairan mudah terbakar tertutup"        value={p.cairan_mudah_tebakar_tertutup} />
            <BF label="Lembaran di bawah pekerjaan"           value={p.lembaran_dibawah_pekerjaan} />
            <BF label="Lindungi conveyor, kabel, equipment"   value={p.lindungi_conveyor_dll} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">3. Ruangan Tertutup</p>
            <BF label="Alat dibersihkan dari bahan terbakar"  value={p.alat_telah_bersih} />
            <BF label="Uap menyala dibuang dari ruangan"      value={p.uap_menyala_telah_dibuang} />

            <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">4. Dinding / Langit-Langit</p>
            <BF label="Konstruksi tidak mudah terbakar"       value={p.kerja_pada_dinding_lagit} />
            <BF label="Bahan mudah terbakar dipindahkan"      value={p.bahan_mudah_terbakar_dipindahkan_dari_dinding} />

            <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">5. Fire Watch</p>
            <BF label="Fire watch memastikan area aman"       value={p.fire_watch_memastikan_area_aman} />
            <BF label="Fire watch terlatih pakai APAR"        value={p.firwatch_terlatih} />

            {p.jenisForm === "hot-work" && (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">6. Fire Blanket</p>
                <BF label="Fire blanket kondisi layak"        value={p.kondisi_fire_blanket} />
                {p.jumlah_fire_blanket != null && (
                  <F label="Jumlah Fire Blanket" value={p.jumlah_fire_blanket} />
                )}
              </>
            )}
          </div>
        </div>
        {p.permintaan_tambahan && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-bold text-amber-700 uppercase mb-1">Permintaan Tambahan</p>
            <p className="text-sm text-slate-700">{p.permintaan_tambahan}</p>
          </div>
        )}
      </MS>

      <MS title="Persetujuan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="SPV Terkait / Supervisor"  value={p.spv_terkait} />
          <F label="Kontraktor"                value={p.kontraktor} />
          <F label="Safety Fire Officer (SFO)" value={p.sfo} />
          <F label="PGA / Dept Head"           value={p.pga} />
        </div>
      </MS>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 px-6 py-5 rounded-t-2xl shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${formTypeBadge[p.jenisForm]}`}>
                {formTypeLabel[p.jenisForm]}
              </span>
              {getStatusBadge(p.status)}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{p.id}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Dibuat: {formatDate(p.tanggal)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-orange-200 rounded-lg transition-colors">
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {p.jenisForm === "height-work" ? renderHeightWork() : renderHotOrWorkshop()}
        </div>

        <div className="shrink-0 bg-slate-50 border-t px-6 py-4 flex justify-between items-center rounded-b-2xl">
          <span className="text-xs text-slate-400">ID: {p.id}</span>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-100 transition-colors"
            >Tutup</button>
            <button onClick={() => window.print()}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
            >Print</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [permits, setPermits]               = useState<Permit[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState<"all"|"hot-work"|"workshop"|"height-work">("all");
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);

  useEffect(() => { loadPermits(); }, []);

  const loadPermits = async () => {
    setLoading(true);
    try {
      // FIX ROOT CAUSE: tambah ?full=1 → API harus query SELECT * bukan SELECT sebagian kolom
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/forms/hot-work?limit=200&full=1"),
        fetch("/api/forms/workshop?limit=200&full=1"),
        fetch("/api/forms/height-work?limit=200&full=1"),
      ]);
      if (!r1.ok || !r2.ok || !r3.ok) throw new Error("Gagal mengambil data dari server");
      const [j1, j2, j3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

      const mapped = [
        ...(j1.data ?? []).map((x: any) => ({ ...x, id: x.id_form, jenisForm: "hot-work"    as const, status: x.status ?? "submitted" })),
        ...(j2.data ?? []).map((x: any) => ({ ...x, id: x.id_form, jenisForm: "workshop"     as const, status: x.status ?? "submitted" })),
        ...(j3.data ?? []).map((x: any) => ({ ...x, id: x.id_form, jenisForm: "height-work"  as const, status: x.status ?? "submitted" })),
      ].sort((a, b) => new Date(b.tanggal ?? 0).getTime() - new Date(a.tanggal ?? 0).getTime());

      setPermits(mapped);
    } catch (err: any) {
      console.error(err);
      alert("Gagal memuat data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = permits.filter(p => filter === "all" || p.jenisForm === filter);

  const stats = {
    total:     permits.length,
    submitted: permits.filter(p => p.status === "submitted").length,
    approved:  permits.filter(p => p.status === "approved").length,
    draft:     permits.filter(p => p.status === "draft").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg"><Home className="w-5 h-5 text-slate-600" /></Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><FileText className="w-5 h-5 text-orange-600" /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Riwayat Izin Kerja</h1>
                <p className="text-xs text-slate-500">PT Jatim Autocomp Indonesia</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadPermits} disabled={loading} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50" title="Refresh">
              <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/form/hot-work" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold shadow-sm">
              + Buat Permit Baru
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Permit", value: stats.total,     color: "text-slate-700", bg: "bg-white" },
            { label: "Diajukan",     value: stats.submitted, color: "text-blue-700",  bg: "bg-blue-50" },
            { label: "Disetujui",    value: stats.approved,  color: "text-green-700", bg: "bg-green-50" },
            { label: "Draft",        value: stats.draft,     color: "text-gray-600",  bg: "bg-gray-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-slate-200 rounded-xl p-4 shadow-sm`}>
              <p className="text-xs text-slate-500 uppercase font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-600 mr-1">Filter:</span>
            {(["all","hot-work","workshop","height-work"] as const).map(type => (
              <button key={type} onClick={() => setFilter(type)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === type ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {type === "all" ? "Semua" : type === "hot-work" ? "Hot Work" : type === "workshop" ? "Workshop" : "Ketinggian"}
                {type !== "all" && (
                  <span className="ml-1.5 bg-black/10 rounded-full px-1.5 text-xs">
                    {permits.filter(p => p.jenisForm === type).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-600" />
            <p className="mt-4 text-slate-500 text-sm">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Belum ada data</h3>
            <p className="text-slate-400 text-sm">Data akan muncul setelah Anda mengajukan izin kerja.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(permit => (
              <div key={permit.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200">
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{permit.id}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${formTypeBadge[permit.jenisForm]}`}>
                        {formTypeLabel[permit.jenisForm]}
                      </span>
                      {getStatusBadge(permit.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User     className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{permit.nama_kontraktor_nik || permit.nama_kontraktor || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin   className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{permit.lokasi_pekerjaan || permit.lokasi || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{formatDate(permit.tanggal_pelaksanaan)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock    className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{formatTime(permit.waktu_pukul || permit.waktu_mulai)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPermit(permit)}
                    className="p-2.5 hover:bg-orange-50 rounded-lg transition-colors group shrink-0"
                  >
                    <Eye className="w-5 h-5 text-orange-500 group-hover:text-orange-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPermit && <DetailModal permit={selectedPermit} onClose={() => setSelectedPermit(null)} />}
    </div>
  );
}