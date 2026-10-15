// app/form/hot-work/edit/[token]/page.tsx
// Halaman edit form Hot Work yang sudah ditolak
// Akses: /form/hot-work/edit/XXXX-XXXX
"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Home, Flame, Save, Send, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
type WorkDetail = { detail: string; mulai: string; selesai: string };
interface FormData {
  noRegistrasi: string; namaKontraktor: string; namaPekerjaNIK: string;
  namaFireWatch: string; namaNIKFireWatch: string; lokasi: string;
  tanggalPelaksanaan: string; waktuPukul: string;
  jabaranPemberiIzin: string; namaNIKPemberiIzin: string;
  jenisPekerjaan: {
    preventive: boolean; tangki: boolean; panel: boolean;
    cutting: WorkDetail; grinding: WorkDetail; welding: WorkDetail; painting: WorkDetail;
    lainnya: boolean; lainnyaKeterangan: string;
  };
  areaBerisiko: { ruangTertutup: boolean; bahanMudah: boolean; gas: boolean; ketinggian: boolean; cairan: boolean; hydrocarbon: boolean; lain: string; };
  pencegahan: {
    equipment: string; apar: string; sensor: string; apd: string;
    meter11_cairan: string; lantai: string; lantaiBasah: string; cairan_diproteksi: string;
    lembaran: string; lindungi_conveyor: string;
    ruang_tertutup_dibersihkan: string; uap_dibuang: string;
    dinding_konstruksi: string; bahan_dipindahkan: string;
    firewatch_ada: string; firewatch_pelatihan: string;
    fireblank: string; fireblank_jumlah: string; permintaan_tambahan: string;
  };
  persetujuan: { spvNama: string; kontraktorNama: string; sfoNama: string; pgaNama: string };
}

// ─── Helper: konversi row DB → FormData ──────────────────────
const bool = (v: any) => v === true || v === 't';
const boolStr = (v: any): string => (v === true || v === 't') ? 'ya' : 'tidak';
const timeStr = (v?: string) => (!v ? '' : String(v).slice(0, 5));
const emptyWork = (): WorkDetail => ({ detail: '', mulai: '', selesai: '' });

function dbToForm(row: any): FormData {
  return {
    noRegistrasi:       row.no_registrasi       || '',
    namaKontraktor:     row.nama_kontraktor_nik  || '',
    namaPekerjaNIK:     row.nama_pekerja_nik     || '',
    namaFireWatch:      row.nama_fire_watch       || '',
    namaNIKFireWatch:   row.nik_fire_watch        || '',
    lokasi:             row.lokasi_pekerjaan      || '',
    tanggalPelaksanaan: row.tanggal_pelaksanaan
      ? new Date(row.tanggal_pelaksanaan).toISOString().split('T')[0]
      : '',
    waktuPukul: timeStr(row.waktu_pukul),
    jabaranPemberiIzin: row.jabatan_pemberi_izin || '',
    namaNIKPemberiIzin: row.nik_pemberi_ijin     || '',
    jenisPekerjaan: {
      preventive:         bool(row.preventive_genset_pump_room),
      tangki:             bool(row.tangki_solar),
      panel:              bool(row.panel_listrik),
      cutting:  { detail: row.detail_cutting  || '', mulai: timeStr(row.t_mulai_cutting),  selesai: timeStr(row.t_selesai_cutting)  },
      grinding: { detail: row.detail_grinding || '', mulai: timeStr(row.t_mulai_grinding), selesai: timeStr(row.t_selesai_grinding) },
      welding:  { detail: row.detail_welding  || '', mulai: timeStr(row.t_mulai_welding),  selesai: timeStr(row.t_selesai_welding)  },
      painting: { detail: row.detail_painting || '', mulai: timeStr(row.t_mulai_painting), selesai: timeStr(row.t_selesai_painting) },
      lainnya:            bool(row.ada_kerja_lainnya),
      lainnyaKeterangan:  row.jenis_kerjaan_lainnya || '',
    },
    areaBerisiko: {
      ruangTertutup: bool(row.ruang_tertutup), bahanMudah: bool(row.bahan_mudah_terbakar),
      gas: bool(row.gas_bejana_tangki),        ketinggian: bool(row.height_work),
      cairan: bool(row.cairan_gas_bertekan),   hydrocarbon: bool(row.cairan_hydrocarbon),
      lain: row.bahaya_lain || '',
    },
    pencegahan: {
      equipment:                   boolStr(row.kondisi_tools_baik),
      apar:                        boolStr(row.tersedia_apar_hydrant),
      sensor:                      boolStr(row.sensor_smoke_detector_non_aktif),
      apd:                         boolStr(row.apd_lengkap),
      meter11_cairan:              boolStr(row.tidak_ada_cairan_mudah_terbakar),
      lantai:                      boolStr(row.lantai_bersih),
      lantaiBasah:                 boolStr(row.lantai_sudah_dibasahi),
      cairan_diproteksi:           boolStr(row.cairan_mudah_tebakar_tertutup),
      lembaran:                    boolStr(row.lembaran_dibawah_pekerjaan),
      lindungi_conveyor:           boolStr(row.lindungi_conveyor_dll),
      ruang_tertutup_dibersihkan:  boolStr(row.alat_telah_bersih),
      uap_dibuang:                 boolStr(row.uap_menyala_telah_dibuang),
      dinding_konstruksi:          boolStr(row.kerja_pada_dinding_lagit),
      bahan_dipindahkan:           boolStr(row.bahan_mudah_terbakar_dipindahkan_dari_dinding),
      firewatch_ada:               boolStr(row.fire_watch_memastikan_area_aman),
      firewatch_pelatihan:         boolStr(row.firwatch_terlatih),
      fireblank:                   bool(row.kondisi_fire_blanket) ? 'layak' : '',
      fireblank_jumlah:            row.jumlah_fire_blanket != null ? String(row.jumlah_fire_blanket) : '',
      permintaan_tambahan:         row.permintaan_tambahan || '',
    },
    persetujuan: {
      spvNama:         row.spv_terkait || '',
      kontraktorNama:  row.kontraktor  || '',
      sfoNama:         row.sfo         || '',
      pgaNama:         row.pga         || '',
    },
  };
}

// ─── UI components ────────────────────────────────────────────
const Section = ({ title, section, description, expanded, toggle, children }: any) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-slate-200">
    <button onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200 transition-colors"
    >
      <div className="text-left">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {expanded[section] ? <ChevronUp className="w-5 h-5 text-orange-600" /> : <ChevronDown className="w-5 h-5 text-orange-600" />}
    </button>
    {expanded[section] && <div className="p-6">{children}</div>}
  </div>
);

const CheckItem = ({ label, checked, onChange }: any) => (
  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-orange-50 transition-colors">
    <input type="checkbox" checked={checked} onChange={onChange} className="w-5 h-5 text-orange-600 rounded mt-0.5 shrink-0" />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

const YesNoRow = ({ label, fieldKey, pencegahan, setPencegahan }: any) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
    <span className="text-sm text-slate-700 flex-1 mr-4">{label}</span>
    <div className="flex gap-4 shrink-0">
      {["ya", "tidak"].map(v => (
        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name={fieldKey} value={v}
            checked={pencegahan[fieldKey] === v}
            onChange={() => setPencegahan({ ...pencegahan, [fieldKey]: v })}
            className="w-4 h-4 text-orange-600"
          />
          <span className="text-sm">{v === "ya" ? "YA" : "TIDAK"}</span>
        </label>
      ))}
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────
export default function HotWorkEditPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router    = useRouter();

  const [formData,   setFormData]   = useState<FormData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [idForm,     setIdForm]     = useState('');
  const [catatan,    setCatatan]    = useState('');
  const [error,      setError]      = useState('');
  const [expanded,   setExpanded]   = useState({ bagian1: true, bagian2: true, bagian3: true, bagian4: true });
  // Modal sukses
  const [successData, setSuccessData] = useState<{ id_form: string } | null>(null);

  useEffect(() => { loadForm(); }, []);

  const loadForm = async () => {
    try {
      const res  = await fetch(`/api/forms/track?q=${token}`);
      const data = await res.json();
      if (!res.ok || !data.found) { setError('Form tidak ditemukan. Pastikan kode edit benar.'); return; }

      const row = data.data;
      if (!['rejected', 'draft'].includes(row.status)) {
        setError(`Form dengan status "${row.status}" tidak bisa diedit.`);
        return;
      }
      // Ambil data lengkap via approval API (tanpa auth) — atau langsung dari track
      // Track sudah cukup untuk identifikasi, tapi untuk prefill kita butuh full data
      const resFull = await fetch(`/api/forms/hot-work?full=1&limit=1`);
      // Ambil langsung dengan id_form
      const resDetail = await fetch(`/api/forms/track?q=${row.id_form}`);
      const dataDetail = await resDetail.json();

      // Gunakan GET full by id_form
      const resById = await fetch(`/api/forms/hot-work/by-token?token=${token}`);
      const dataById = await resById.json();

      if (dataById.data) {
        setFormData(dbToForm(dataById.data));
        setIdForm(dataById.data.id_form);
        setCatatan(dataById.data.catatan_reject || '');
      } else {
        setError('Gagal memuat data form.');
      }
    } catch (e: any) {
      setError('Gagal memuat form: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (s: string) => setExpanded(prev => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));
  const setJ   = (patch: any) => setFormData(prev => prev ? ({ ...prev, jenisPekerjaan: { ...prev.jenisPekerjaan, ...patch } }) : prev);
  const setA   = (patch: any) => setFormData(prev => prev ? ({ ...prev, areaBerisiko: { ...prev.areaBerisiko, ...patch } }) : prev);
  const setP   = (patch: any) => setFormData(prev => prev ? ({ ...prev, pencegahan: { ...prev.pencegahan, ...patch } }) : prev);
  const setS   = (patch: any) => setFormData(prev => prev ? ({ ...prev, persetujuan: { ...prev.persetujuan, ...patch } }) : prev);
  const setWork = (key: 'cutting'|'grinding'|'welding'|'painting', field: keyof WorkDetail, val: string) =>
    setJ({ [key]: { ...formData!.jenisPekerjaan[key], [field]: val } });

  const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black";

  const submit = async (isSubmit: boolean) => {
    if (!formData) return;
    setSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/forms/hot-work', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...formData, editToken: token, isSubmit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      return data;
    } finally { setSubmitting(false); }
  };

  const handleSave   = async () => { try { await submit(false); alert('Draft berhasil disimpan!'); } catch (e: any) { setError(e.message); } };
  const handleSubmit = async () => {
    try {
      const r = await submit(true);
      setSuccessData(r);
    } catch (e: any) { setError(e.message); }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  // ── Error state ───────────────────────────────────────────
  if (error && !formData) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-4">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-slate-700 font-semibold text-center">{error}</p>
      <Link href="/form/track" className="text-orange-600 hover:underline text-sm">← Kembali ke Cek Status</Link>
    </div>
  );

  // ── Success Modal ─────────────────────────────────────────
  if (successData) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Form Berhasil Diajukan Ulang!</h2>
        <p className="text-slate-500 text-sm mb-2">ID Form: <span className="font-mono font-bold text-slate-800">{successData.id_form}</span></p>
        <p className="text-slate-500 text-sm mb-6">Kode Edit: <span className="font-mono font-bold text-orange-600">{token}</span></p>
        <p className="text-xs text-slate-400 mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Simpan kode edit Anda. Gunakan kode ini untuk cek status di halaman <strong>/form/track</strong>.
        </p>
        <div className="flex flex-col gap-2">
          <Link href={`/form/track?q=${token}`}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >Cek Status Form →</Link>
          <Link href="/"
            className="px-5 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-sm transition-colors"
          >Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );

  if (!formData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/form/track?q=${token}`} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Flame className="w-5 h-5 text-orange-600" /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">PERBAIKI FORM HOT WORK</h1>
                <p className="text-xs text-slate-500">ID: {idForm} · Kode: {token}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Banner catatan penolakan */}
        {catatan && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 text-sm mb-1">Alasan Penolakan Sebelumnya:</p>
              <p className="text-red-700 text-sm">{catatan}</p>
              <p className="text-red-500 text-xs mt-2">Perbaiki bagian yang ditolak, kemudian ajukan ulang.</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ─── BAGIAN 1 ─── */}
        <Section title="Bagian 1: Informasi Registrasi & Identitas" section="bagian1"
          description="Isi data registrasi dan identitas pekerja" expanded={expanded} toggle={toggle}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { label: "No. Registrasi",         key: "noRegistrasi" },
              { label: "Nama Kontraktor / NIK",   key: "namaKontraktor" },
              { label: "Nama Pekerja / NIK",      key: "namaPekerjaNIK" },
              { label: "Lokasi Pekerjaan",        key: "lokasi" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                <input type="text" value={(formData as any)[key]}
                  onChange={e => setFormData(p => p ? ({ ...p, [key]: e.target.value }) : p)}
                  className={inputCls} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Pelaksanaan</label>
              <input type="date" value={formData.tanggalPelaksanaan}
                onChange={e => setFormData(p => p ? ({ ...p, tanggalPelaksanaan: e.target.value }) : p)}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Waktu Pukul</label>
              <input type="time" value={formData.waktuPukul}
                onChange={e => setFormData(p => p ? ({ ...p, waktuPukul: e.target.value }) : p)}
                className={inputCls} />
            </div>
          </div>
          <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-bold text-blue-700 uppercase mb-3">Fire Watch</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Fire Watch</label>
                <input type="text" value={formData.namaFireWatch}
                  onChange={e => setFormData(p => p ? ({ ...p, namaFireWatch: e.target.value }) : p)} className={inputCls} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">NIK Fire Watch</label>
                <input type="text" value={formData.namaNIKFireWatch}
                  onChange={e => setFormData(p => p ? ({ ...p, namaNIKFireWatch: e.target.value }) : p)} className={inputCls} /></div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-bold text-green-700 uppercase mb-3">Pemberi Izin</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Jabatan Pemberi Izin</label>
                <input type="text" value={formData.jabaranPemberiIzin}
                  onChange={e => setFormData(p => p ? ({ ...p, jabaranPemberiIzin: e.target.value }) : p)} className={inputCls} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">NIK Pemberi Izin</label>
                <input type="text" value={formData.namaNIKPemberiIzin}
                  onChange={e => setFormData(p => p ? ({ ...p, namaNIKPemberiIzin: e.target.value }) : p)} className={inputCls} /></div>
            </div>
          </div>
        </Section>

        {/* ─── BAGIAN 2 ─── */}
        <Section title="Bagian 2: Jenis Pekerjaan & Area Berisiko" section="bagian2" expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
            {[["preventive","Preventive Genset / Pump Room"],["tangki","Tangki Solar"],["panel","Panel Listrik"]].map(([k,l]) => (
              <CheckItem key={k} label={l} checked={(formData.jenisPekerjaan as any)[k]} onChange={() => setJ({ [k]: !(formData.jenisPekerjaan as any)[k] })} />
            ))}
          </div>
          {(["cutting","grinding","welding","painting"] as const).map(key => (
            <div key={key} className="mb-4 p-4 border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-700 capitalize mb-3 text-sm">{key}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Detail</label>
                  <input type="text" value={formData.jenisPekerjaan[key].detail}
                    onChange={e => setWork(key, 'detail', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mulai</label>
                  <input type="time" value={formData.jenisPekerjaan[key].mulai}
                    onChange={e => setWork(key, 'mulai', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Selesai</label>
                  <input type="time" value={formData.jenisPekerjaan[key].selesai}
                    onChange={e => setWork(key, 'selesai', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          ))}
          <div className="mt-4">
            <p className="font-semibold text-slate-700 mb-3 text-sm">Area Berisiko Tinggi</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[["ruangTertutup","Ruang Tertutup"],["bahanMudah","Bahan Mudah Terbakar"],["gas","Gas / Bejana / Tangki"],
                ["ketinggian","Bekerja di Ketinggian"],["cairan","Cairan / Gas Bertekanan"],["hydrocarbon","Cairan Hydrocarbon"]].map(([k,l]) => (
                <CheckItem key={k} label={l} checked={(formData.areaBerisiko as any)[k]} onChange={() => setA({ [k]: !(formData.areaBerisiko as any)[k] })} />
              ))}
            </div>
          </div>
        </Section>

        {/* ─── BAGIAN 3 ─── */}
        <Section title="Bagian 3: Upaya Pencegahan" section="bagian3" expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">1. Umum</p>
              <YesNoRow label="Equipment / Tools kondisi baik" fieldKey="equipment" pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="APAR / Hydrant tersedia"        fieldKey="apar"      pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Sensor Smoke Detector non-aktif" fieldKey="sensor"   pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="APD lengkap dipakai"            fieldKey="apd"       pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">2. Daerah 11 Meter</p>
              <YesNoRow label="Tidak ada cairan mudah terbakar"   fieldKey="meter11_cairan"    pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Lantai bersih"                     fieldKey="lantai"            pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Lantai dibasahi / pasir basah"     fieldKey="lantaiBasah"       pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Cairan mudah terbakar tertutup"    fieldKey="cairan_diproteksi" pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Lembaran di bawah pekerjaan"      fieldKey="lembaran"          pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Lindungi conveyor, kabel, dll"    fieldKey="lindungi_conveyor" pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">3. Ruangan Tertutup</p>
              <YesNoRow label="Alat dibersihkan dari bahan terbakar" fieldKey="ruang_tertutup_dibersihkan" pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Uap menyala dibuang dari ruangan"     fieldKey="uap_dibuang"               pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">4. Dinding / Langit-Langit</p>
              <YesNoRow label="Konstruksi tidak mudah terbakar"      fieldKey="dinding_konstruksi" pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Bahan mudah terbakar dipindahkan"     fieldKey="bahan_dipindahkan"  pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">5. Fire Watch</p>
              <YesNoRow label="Fire watch memastikan area aman"      fieldKey="firewatch_ada"        pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <YesNoRow label="Fire watch terlatih pakai APAR"       fieldKey="firewatch_pelatihan"  pencegahan={formData.pencegahan} setPencegahan={(p: any) => setP(p)} />
              <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">6. Fire Blanket</p>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg mb-2">
                <span className="text-sm text-slate-700 flex-1">Fire blanket kondisi layak</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={formData.pencegahan.fireblank === 'layak'}
                    onChange={e => setP({ fireblank: e.target.checked ? 'layak' : '' })}
                    className="w-4 h-4 text-orange-600" />
                  <span className="text-sm">Layak</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Jumlah Fire Blanket</label>
                <input type="number" min="0" value={formData.pencegahan.fireblank_jumlah}
                  onChange={e => setP({ fireblank_jumlah: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Permintaan Tambahan</label>
            <textarea rows={3} value={formData.pencegahan.permintaan_tambahan}
              onChange={e => setP({ permintaan_tambahan: e.target.value })}
              className={`${inputCls} resize-none`} />
          </div>
        </Section>

        {/* ─── BAGIAN 4 ─── */}
        <Section title="Bagian 4: Persetujuan" section="bagian4" expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[["spvNama","SPV Terkait / Supervisor"],["kontraktorNama","Kontraktor"],["sfoNama","Safety Fire Officer (SFO)"],["pgaNama","PGA / Dept Head"]].map(([k,l]) => (
              <div key={k}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{l}</label>
                <input type="text" value={(formData.persetujuan as any)[k]}
                  onChange={e => setS({ [k]: e.target.value })} className={inputCls} />
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 shadow-lg px-4 py-4 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href={`/form/track?q=${token}`} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ← Batal
          </Link>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 border border-orange-300 text-orange-700 hover:bg-orange-50 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Simpan Draft
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 shadow-sm transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Ajukan Ulang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}