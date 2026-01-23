// app/form/hot-work/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Home, Flame, Save, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Helper: Konversi string waktu kosong → null
const cleanTime = (timeStr: string): string | null => {
  return timeStr === "" ? null : timeStr;
};

interface FormData {
  noRegistrasi: string;
  namaKontraktor: string;
  namaPekerjaNIK: string;
  namaFireWatch: string;
  namaNIKFireWatch: string;
  lokasi: string;
  tanggalPelaksanaan: string;
  waktuPukul: string;
  jabaranPemberiIzin: string;
  namaNIKPemberiIzin: string;
  jenisPekerjaan: {
    preventive: boolean;
    tangki: boolean;
    panel: boolean;
    cutting: { detail: string; mulai: string; selesai: string };
    grinding: { detail: string; mulai: string; selesai: string };
    welding: { detail: string; mulai: string; selesai: string };
    painting: { detail: string; mulai: string; selesai: string };
    lainnya: boolean;
    lainnyaKeterangan: string;
  };
  areaBerisiko: {
    ruangTertutup: boolean;
    bahanMudah: boolean;
    gas: boolean;
    ketinggian: boolean;
    cairan: boolean;
    hydrocarbon: boolean;
    lain: string;
  };
  pencegahan: {
    equipment: string;
    apar: string;
    sensor: string;
    apd: string;
    meter11_cairan: string;
    lantai: string;
    lantaiBasah: string;
    cairan_diproteksi: string;
    lembaran: string;
    lindungi_conveyor: string;
    ruang_tertutup_dibersihkan: string;
    uap_dibuang: string;
    dinding_konstruksi: string;
    bahan_dipindahkan: string;
    firewatch_ada: string;
    firewatch_pelatihan: string;
    fireblank: string;
    fireblank_jumlah: string;
    permintaan_tambahan: string;
  };
  persetujuan: {
    spvNama: string;
    kontraktorNama: string;
    sfoNama: string;
    pgaNama: string;
  };
}

const Section = ({ title, section, children, description, expanded, toggle }: any) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-slate-200">
    <button
      onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-slate-200 hover:from-orange-100 hover:to-orange-100 transition-colors"
    >
      <div className="text-left">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
        {description && <p className="text-xs text-slate-600 mt-1">{description}</p>}
      </div>
      {expanded[section as keyof typeof expanded] ? (
        <ChevronUp className="w-5 h-5 text-orange-600 flex-shrink-0" />
      ) : (
        <ChevronDown className="w-5 h-5 text-orange-600 flex-shrink-0" />
      )}
    </button>
    {expanded[section as keyof typeof expanded] && <div className="p-6">{children}</div>}
  </div>
);

const CheckboxField = ({ label, checked, onChange }: any) => (
  <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-orange-50 transition-colors group">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-2 focus:ring-orange-500 mt-0.5 flex-shrink-0"
    />
    <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
  </label>
);

const RadioField = ({ label, name, value, checked, onChange }: any) => (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-orange-600 border-slate-300 focus:ring-orange-500"
    />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

export default function HotWorkPermitForm() {
  const [formData, setFormData] = useState<FormData>({
    noRegistrasi: "",
    namaKontraktor: "",
    namaPekerjaNIK: "",
    namaFireWatch: "",
    namaNIKFireWatch: "",
    lokasi: "",
    tanggalPelaksanaan: "",
    waktuPukul: "",
    jabaranPemberiIzin: "",
    namaNIKPemberiIzin: "",
    jenisPekerjaan: {
      preventive: false,
      tangki: false,
      panel: false,
      cutting: { detail: "", mulai: "", selesai: "" },
      grinding: { detail: "", mulai: "", selesai: "" },
      welding: { detail: "", mulai: "", selesai: "" },
      painting: { detail: "", mulai: "", selesai: "" },
      lainnya: false,
      lainnyaKeterangan: "",
    },
    areaBerisiko: {
      ruangTertutup: false,
      bahanMudah: false,
      gas: false,
      ketinggian: false,
      cairan: false,
      hydrocarbon: false,
      lain: "",
    },
    pencegahan: {
      equipment: "tidak",
      apar: "tidak",
      sensor: "tidak",
      apd: "tidak",
      meter11_cairan: "tidak",
      lantai: "tidak",
      lantaiBasah: "tidak",
      cairan_diproteksi: "tidak",
      lembaran: "tidak",
      lindungi_conveyor: "tidak",
      ruang_tertutup_dibersihkan: "tidak",
      uap_dibuang: "tidak",
      dinding_konstruksi: "tidak",
      bahan_dipindahkan: "tidak",
      firewatch_ada: "tidak",
      firewatch_pelatihan: "tidak",
      fireblank: "",
      fireblank_jumlah: "",
      permintaan_tambahan: "",
    },
    persetujuan: {
      spvNama: "",
      kontraktorNama: "",
      sfoNama: "",
      pgaNama: "",
    },
  });

  const [expanded, setExpanded] = useState({
    bagian1: true,
    bagian2: true,
    bagian3: true,
    bagian4: true,
  });

  const toggle = (section: string) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section as keyof typeof prev] }));

  const generateIdForm = async (): Promise<string> => {
    const { data, error } = await supabase
      .from("form-kerja-panas")
      .select("id_form", { count: "exact" })
      .order("id_form", { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1000;
    if (data && data.length > 0) {
      const lastId = data[0].id_form;
      const num = parseInt(lastId.replace("HOW-", ""), 10);
      if (!isNaN(num)) nextNumber = num + 1;
    }
    return `HOW-${nextNumber}`;
  };

  const buildRecord = (idForm: string) => {
    const now = new Date().toISOString();
    const pelaksanaan = formData.tanggalPelaksanaan
      ? new Date(formData.tanggalPelaksanaan).toISOString()
      : null;

    return {
      id_form: idForm,
      tanggal: now,
      tanggal_pelaksanaan: pelaksanaan,
      no_registrasi: formData.noRegistrasi,
      nama_kontraktor_nik: formData.namaKontraktor,
      nama_pekerja_nik: formData.namaPekerjaNIK,
      lokasi_pekerjaan: formData.lokasi,
      waktu_pukul: cleanTime(formData.waktuPukul),

      nama_fire_watch: formData.namaFireWatch,
      nik_fire_watch: formData.namaNIKFireWatch,
      tanda_tangan_fw: "",

      jabatan_pemberi_izin: formData.jabaranPemberiIzin,
      nik_pemberi_ijin: formData.namaNIKPemberiIzin,

      preventive_genset_pump_room: formData.jenisPekerjaan.preventive,
      tangki_solar: formData.jenisPekerjaan.tangki,
      panel_listrik: formData.jenisPekerjaan.panel,

      detail_cutting: formData.jenisPekerjaan.cutting.detail,
      t_mulai_cutting: cleanTime(formData.jenisPekerjaan.cutting.mulai),
      t_selesai_cutting: cleanTime(formData.jenisPekerjaan.cutting.selesai),

      detail_grinding: formData.jenisPekerjaan.grinding.detail,
      t_mulai_grinding: cleanTime(formData.jenisPekerjaan.grinding.mulai),
      t_selesai_grinding: cleanTime(formData.jenisPekerjaan.grinding.selesai),

      detail_welding: formData.jenisPekerjaan.welding.detail,
      t_mulai_welding: cleanTime(formData.jenisPekerjaan.welding.mulai),
      t_selesai_welding: cleanTime(formData.jenisPekerjaan.welding.selesai),

      detail_painting: formData.jenisPekerjaan.painting.detail,
      t_mulai_painting: cleanTime(formData.jenisPekerjaan.painting.mulai),
      t_selesai_painting: cleanTime(formData.jenisPekerjaan.painting.selesai),

      ada_kerja_lainnya: formData.jenisPekerjaan.lainnya,
      jenis_kerjaan_lainnya: formData.jenisPekerjaan.lainnyaKeterangan,

      ruang_tertutup: formData.areaBerisiko.ruangTertutup,
      bahan_mudah_terbakar: formData.areaBerisiko.bahanMudah,
      gas_bejana_tangki: formData.areaBerisiko.gas,
      height_work: formData.areaBerisiko.ketinggian,
      cairan_gas_bertekan: formData.areaBerisiko.cairan,
      cairan_hydrocarbon: formData.areaBerisiko.hydrocarbon,
      bahaya_lain: formData.areaBerisiko.lain,

      kondisi_tools_baik: formData.pencegahan.equipment === "ya",
      tersedia_apar_hydrant: formData.pencegahan.apar === "ya",
      sensor_smoke_detector_non_aktif: formData.pencegahan.sensor === "ya",
      apd_lengkap: formData.pencegahan.apd === "ya",

      tidak_ada_cairan_mudah_terbakar: formData.pencegahan.meter11_cairan === "ya",
      lantai_bersih: formData.pencegahan.lantai === "ya",
      lantai_sudah_dibasahi: formData.pencegahan.lantaiBasah === "ya",
      cairan_mudah_tebakar_tertutup: formData.pencegahan.cairan_diproteksi === "ya",
      lembaran_dibawah_pekerjaan: formData.pencegahan.lembaran === "ya",
      lindungi_conveyor_dll: formData.pencegahan.lindungi_conveyor === "ya",

      alat_telah_bersih: formData.pencegahan.ruang_tertutup_dibersihkan === "ya",
      uap_menyala_telah_dibuang: formData.pencegahan.uap_dibuang === "ya",

      kerja_pada_dinding_lagit: formData.pencegahan.dinding_konstruksi === "ya",
      bahan_mudah_terbakar_dipindahkan_dari_dinding: formData.pencegahan.bahan_dipindahkan === "ya",

      fire_watch_memastikan_area_aman: formData.pencegahan.firewatch_ada === "ya",
      firwatch_terlatih: formData.pencegahan.firewatch_pelatihan === "ya",

      kondisi_fire_blanket: formData.pencegahan.fireblank === "layak",
      jumlah_fire_blanket: formData.pencegahan.fireblank_jumlah ? Number(formData.pencegahan.fireblank_jumlah) : null,
      permintaan_tambahan: formData.pencegahan.permintaan_tambahan,

      spv_terkait: formData.persetujuan.spvNama,
      kontraktor: formData.persetujuan.kontraktorNama,
      sfo: formData.persetujuan.sfoNama,
      pga: formData.persetujuan.pgaNama,
    };
  };

  const handleSave = async () => {
    try {
      const idForm = await generateIdForm();
      const record = buildRecord(idForm);
      const { error } = await supabase.from("form-kerja-panas").insert([record]);
      if (error) throw error;
      alert(`Draft berhasil disimpan! ID: ${idForm}`);
    } catch (err: any) {
      console.error("Error menyimpan ke Supabase:", err);
      alert("Gagal menyimpan draft: " + (err.message || "Coba lagi nanti."));
    }
  };

  const handleSubmit = async () => {
    try {
      const idForm = await generateIdForm();
      const record = buildRecord(idForm);
      const { error } = await supabase.from("form-kerja-panas").insert([record]);
      if (error) throw error;
      alert(`Izin berhasil diajukan! ID: ${idForm}`);
      window.location.href = "/history";
    } catch (err: any) {
      console.error("Error submit ke Supabase:", err);
      alert("Gagal mengajukan izin: " + (err.message || "Coba lagi nanti."));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Home className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Flame className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">FORM HOT WORK PERMIT</h1>
                  <p className="text-xs text-slate-600">(IJIN KERJA PANAS) - PT JATIM AUTOCOMP INDONESIA</p>
                </div>
              </div>
            </div>
            <Link
              href="/history"
              className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
            >
              Lihat Riwayat →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">Perhatian: Keselamatan Adalah Prioritas Utama</h3>
            <p className="text-sm text-amber-800 mt-1">
              Pastikan semua bagian formulir diisi dengan lengkap dan akurat sebelum pekerjaan dimulai. Dapatkan
              persetujuan dari pihak yang berwenang.
            </p>
          </div>
        </div>

        {/* BAGIAN 1 */}
        <Section
          title="BAGIAN 1: INFORMASI REGISTRASI & IDENTITAS PEKERJAAN"
          section="bagian1"
          description="Data registrasi, kontraktor, pekerja, lokasi, dan jadwal"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">No. Registrasi *</label>
                <input
                  type="text"
                  value={formData.noRegistrasi}
                  onChange={(e) => setFormData({ ...formData, noRegistrasi: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 text-black focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="HWP-2024-001"
                />
              </div>
            </div>

            {/* Nama Kontraktor */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kontraktor *</label>
              <input
                type="text"
                value={formData.namaKontraktor}
                onChange={(e) => setFormData({ ...formData, namaKontraktor: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-black"
                placeholder="Contoh: PT ABC Konstruksi"
              />
            </div>

            {/* Nama Pekerja / NIK */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pekerja / NIK *</label>
              <input
                type="text"
                value={formData.namaPekerjaNIK}
                onChange={(e) => setFormData({ ...formData, namaPekerjaNIK: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-black"
                placeholder="Nama lengkap atau NIK pekerja"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lokasi Pekerjaan *</label>
                <input
                  type="text"
                  value={formData.lokasi}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Pelaksanaan *</label>
                <input
                  type="date"
                  value={formData.tanggalPelaksanaan}
                  onChange={(e) => setFormData({ ...formData, tanggalPelaksanaan: e.target.value })}
                  className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu (Pukul)</label>
              <input
                type="time"
                value={formData.waktuPukul}
                onChange={(e) => setFormData({ ...formData, waktuPukul: e.target.value })}
                className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Fire Watch - Responsive Layout (Stacked) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="font-bold text-blue-900 text-sm mb-4">Fire Watch (Pengawas Api)</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-black block text-sm font-semibold text-slate-700 mb-2">Nama Fire Watch *</label>
                    <input
                      type="text"
                      value={formData.namaFireWatch}
                      onChange={(e) => setFormData({ ...formData, namaFireWatch: e.target.value })}
                      className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nama / NIK Fire Watch *</label>
                    <input
                      type="text"
                      value={formData.namaNIKFireWatch}
                      onChange={(e) => setFormData({ ...formData, namaNIKFireWatch: e.target.value })}
                      className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tanda Tangan Fire Watch</label>
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-600 min-h-24 flex items-center justify-center">
                    [Tanda Tangan]
                  </div>
                </div>
              </div>
            </div>

            {/* Pemberi Izin - Responsive Layout (Stacked) */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-900 text-sm mb-4">Pemberi Izin</h4>
              <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Jabatan Pemberi Izin *</label>
                  <input
                    type="text"
                    value={formData.jabaranPemberiIzin}
                    onChange={(e) => setFormData({ ...formData, jabaranPemberiIzin: e.target.value })}
                    className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="contoh: Site Supervisor, Safety Officer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nama / NIK Pemberi Izin *</label>
                  <input
                    type="text"
                    value={formData.namaNIKPemberiIzin}
                    onChange={(e) => setFormData({ ...formData, namaNIKPemberiIzin: e.target.value })}
                    className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tanda Tangan Pemberi Izin</label>
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-600 min-h-24 flex items-center justify-center">
                    [Tanda Tangan]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* BAGIAN 2: Jenis Pekerjaan & Area Berisiko */}
        <Section
          title="BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO TINGGI"
          section="bagian2"
          description="Pilih jenis pekerjaan dan identifikasi area atau equipment yang berisiko tinggi"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="space-y-8">
            {/* A. Jenis Pekerjaan */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">
                A. Pilihan Jenis Pekerjaan
              </h4>
              <div className="space-y-2">
                {[
                  { key: "preventive", label: "Preventive Genset / Pump room" },
                  { key: "tangki", label: "Tangki Solar" },
                  { key: "panel", label: "Panel Listrik" },
                ].map((item) => (
                  <CheckboxField
                    key={item.key}
                    label={item.label}
                    checked={(formData.jenisPekerjaan as any)[item.key]}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        jenisPekerjaan: {
                          ...formData.jenisPekerjaan,
                          [item.key]: !(formData.jenisPekerjaan as any)[item.key],
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {/* B. Detail Pekerjaan Panas — WAKTU TIDAK WAJIB */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">
                B. Detail Pekerjaan Panas (Jelaskan & Waktu Pukul)
              </h4>
              <div className="space-y-4">
                {[
                  { key: "cutting", label: "Cutting" },
                  { key: "grinding", label: "Grinding" },
                  { key: "welding", label: "Welding" },
                  { key: "painting", label: "Painting" },
                ].map((type) => {
                  const item = formData.jenisPekerjaan[type.key as keyof typeof formData.jenisPekerjaan] as {
                    detail: string;
                    mulai: string;
                    selesai: string;
                  };
                  return (
                    <div
                      key={type.key}
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center mb-3">
                        <label className="text-sm font-semibold text-slate-900">{type.label}</label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Detail Pekerjaan</label>
                          <input
                            type="text"
                            placeholder={`Detail ${type.label.toLowerCase()}...`}
                            value={item.detail}
                            onChange={(e) => {
                              const key = type.key as "cutting" | "grinding" | "welding" | "painting";
                              setFormData({
                                ...formData,
                                jenisPekerjaan: {
                                  ...formData.jenisPekerjaan,
                                  [key]: {
                                    ...formData.jenisPekerjaan[key],
                                    detail: e.target.value,
                                  },
                                },
                              });
                            }}
                            className="text-black w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Mulai</label>
                          <input
                            type="time"
                            value={item.mulai}
                            onChange={(e) => {
                              const key = type.key as "cutting" | "grinding" | "welding" | "painting";
                              setFormData({
                                ...formData,
                                jenisPekerjaan: {
                                  ...formData.jenisPekerjaan,
                                  [key]: {
                                    ...formData.jenisPekerjaan[key],
                                    mulai: e.target.value,
                                  },
                                },
                              });
                            }}
                            className="text-black w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Selesai</label>
                          <input
                            type="time"
                            value={item.selesai}
                            onChange={(e) => {
                              const key = type.key as "cutting" | "grinding" | "welding" | "painting";
                              setFormData({
                                ...formData,
                                jenisPekerjaan: {
                                  ...formData.jenisPekerjaan,
                                  [key]: {
                                    ...formData.jenisPekerjaan[key],
                                    selesai: e.target.value,
                                  },
                                },
                              });
                            }}
                            className="text-black w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* C. Pekerjaan Lainnya */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">C. Pekerjaan Lainnya</h4>
              <CheckboxField
                label="Ada pekerjaan lain yang menggunakan aplikasi panas lainnya"
                checked={formData.jenisPekerjaan.lainnya}
                onChange={() =>
                  setFormData({
                    ...formData,
                    jenisPekerjaan: { ...formData.jenisPekerjaan, lainnya: !formData.jenisPekerjaan.lainnya },
                  })
                }
              />
              {formData.jenisPekerjaan.lainnya && (
                <textarea
                  value={formData.jenisPekerjaan.lainnyaKeterangan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      jenisPekerjaan: { ...formData.jenisPekerjaan, lainnyaKeterangan: e.target.value },
                    })
                  }
                  placeholder="Sebutkan jenis pekerjaan lainnya..."
                  rows={2}
                  className="text-black w-full mt-3 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              )}
            </div>

            {/* Area Berisiko */}
            <div>
              <h4 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-200">
                Area / Equipment Berisiko Tinggi
              </h4>
              <div className="space-y-2 bg-red-50 p-4 rounded-lg border border-red-200">
                {[
                  { key: "ruangTertutup", label: "Ruang tertutup / area pembuangan / container" },
                  { key: "bahanMudah", label: "Bahan Mudah terbakar" },
                  { key: "gas", label: "Gas (bekerja dalam bejana / tangki)" },
                  { key: "ketinggian", label: "Bekerja di ketinggian" },
                  { key: "cairan", label: "Cairan / Gas bertekanan" },
                  { key: "hydrocarbon", label: "Cairan hydrocarbon (minyak, kondensat)" },
                ].map((item) => (
                  <CheckboxField
                    key={item.key}
                    label={item.label}
                    checked={(formData.areaBerisiko as any)[item.key]}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        areaBerisiko: {
                          ...formData.areaBerisiko,
                          [item.key]: !(formData.areaBerisiko as any)[item.key],
                        },
                      })
                    }
                  />
                ))}
                <div className="mt-4 pt-3 border-t border-red-300">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bahaya Lain (sebutkan)</label>
                  <input
                    type="text"
                    value={formData.areaBerisiko.lain}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        areaBerisiko: { ...formData.areaBerisiko, lain: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-black"
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* BAGIAN 3: UPAYA PENCEGAHAN */}
        <Section
          title="BAGIAN 3: HAL-HAL YANG PERLU DIPERHATIKAN SEBAGAI UPAYA PENCEGAHAN"
          section="bagian3"
          description="Checklist keselamatan untuk setiap kategori pekerjaan"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="space-y-6">
            {/* 1. UMUM */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">1. UMUM</h4>
              <div className="space-y-3">
                {[
                  { key: "equipment", label: "Equipment / Tools kondisi baik" },
                  { key: "apar", label: "Alat pemadam api (APAR, Hydrant) tersedia" },
                  { key: "sensor", label: "Sensor Area Smoke Detector sudah dinon-aktifkan" },
                  { key: "apd", label: "APD lengkap dipakai" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <div className="flex space-x-4">
                      <RadioField
                        name={item.key}
                        value="ya"
                        checked={(formData.pencegahan as any)[item.key] === "ya"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "ya",
                            },
                          })
                        }
                        label="YA"
                      />
                      <RadioField
                        name={item.key}
                        value="tidak"
                        checked={(formData.pencegahan as any)[item.key] === "tidak"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "tidak",
                            },
                          })
                        }
                        label="TIDAK"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. DAERAH 11 METER */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">2. DAERAH 11 METER DARI PEKERJAAN</h4>
              <div className="space-y-3">
                {[
                  { key: "meter11_cairan", label: "Tidak ada cairan mudah terbakar dan mudah menyala" },
                  { key: "lantai", label: "Lantai disapu bersih dari benda mudah terbakar" },
                  { key: "lantaiBasah", label: "Lantai dari bahan mudah terbakar dibasahi / ditutupi pasir basah / perisai metal" },
                  { key: "cairan_diproteksi", label: "Cairan mudah terbakar dan menyala diproteksi dengan tutup / perisai metal" },
                  { key: "lembaran", label: "Lembaran dibawah pekerjaan untuk menampung bunga api" },
                  { key: "lindungi_conveyor", label: "Lindungi conveyor, instalasi kabel, equipment penghantar listrik dengan perisai metal" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <div className="flex space-x-4">
                      <RadioField
                        name={item.key}
                        value="ya"
                        checked={(formData.pencegahan as any)[item.key] === "ya"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "ya",
                            },
                          })
                        }
                        label="YA"
                      />
                      <RadioField
                        name={item.key}
                        value="tidak"
                        checked={(formData.pencegahan as any)[item.key] === "tidak"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "tidak",
                            },
                          })
                        }
                        label="TIDAK"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. RUANGAN TERTUTUP */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">3. PEKERJAAN PADA RUANGAN TERTUTUP</h4>
              <div className="space-y-3">
                {[
                  { key: "ruang_tertutup_dibersihkan", label: "Peralatan dibersihkan dari semua bahan mudah terbakar" },
                  { key: "uap_dibuang", label: "Uap menyala di ruangan tertutup dibuang dari ruangan" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <div className="flex space-x-4">
                      <RadioField
                        name={item.key}
                        value="ya"
                        checked={(formData.pencegahan as any)[item.key] === "ya"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "ya",
                            },
                          })
                        }
                        label="YA"
                      />
                      <RadioField
                        name={item.key}
                        value="tidak"
                        checked={(formData.pencegahan as any)[item.key] === "tidak"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "tidak",
                            },
                          })
                        }
                        label="TIDAK"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. DINDING / LANGIT-LANGIT */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">4. PEKERJAAN PADA DINDING / LANGIT-LANGIT</h4>
              <div className="space-y-3">
                {[
                  {
                    key: "dinding_konstruksi",
                    label:
                      "Pekerjaan pada dinding/langit-langit konstruksi tidak mudah terbakar & tanpa penutup mudah terbakar",
                  },
                  {
                    key: "bahan_dipindahkan",
                    label: "Bahan mudah terbakar dipindahkan dari dinding yang berseberangan",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <div className="flex space-x-4">
                      <RadioField
                        name={item.key}
                        value="ya"
                        checked={(formData.pencegahan as any)[item.key] === "ya"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "ya",
                            },
                          })
                        }
                        label="YA"
                      />
                      <RadioField
                        name={item.key}
                        value="tidak"
                        checked={(formData.pencegahan as any)[item.key] === "tidak"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "tidak",
                            },
                          })
                        }
                        label="TIDAK"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. FIRE WATCH */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-bold text-blue-900 text-sm mb-4">5. PERAN API (FIRE WATCH)</h4>
              <div className="space-y-3">
                {[
                  {
                    key: "firewatch_ada",
                    label: "Fire Watch ada memastikan area aman selama proses dan 30 menit setelahnya",
                  },
                  {
                    key: "firewatch_pelatihan",
                    label:
                      "Fire Watch sudah mendapat pelatihan dan mampu menggunakan alat pemadam kebakaran & fire alarm",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <div className="flex space-x-4">
                      <RadioField
                        name={item.key}
                        value="ya"
                        checked={(formData.pencegahan as any)[item.key] === "ya"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "ya",
                            },
                          })
                        }
                        label="YA"
                      />
                      <RadioField
                        name={item.key}
                        value="tidak"
                        checked={(formData.pencegahan as any)[item.key] === "tidak"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            pencegahan: {
                              ...formData.pencegahan,
                              [item.key]: "tidak",
                            },
                          })
                        }
                        label="TIDAK"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. FIRE BLANKET */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 text-sm mb-4">6. FIRE BLANKET / PERISAI METAL</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kondisi Fire Blanket / Perisai Metal
                  </label>
                  <div className="flex space-x-6">
                    <RadioField
                      name="fireblank"
                      value="layak"
                      checked={formData.pencegahan.fireblank === "layak"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          pencegahan: {
                            ...formData.pencegahan,
                            fireblank: "layak",
                          },
                        })
                      }
                      label="Layak"
                    />
                    <RadioField
                      name="fireblank"
                      value="tidak_layak"
                      checked={formData.pencegahan.fireblank === "tidak_layak"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          pencegahan: {
                            ...formData.pencegahan,
                            fireblank: "tidak_layak",
                          },
                        })
                      }
                      label="Tidak Layak"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah yang Digunakan</label>
                  <input
                    type="number"
                    value={formData.pencegahan.fireblank_jumlah}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pencegahan: {
                          ...formData.pencegahan,
                          fireblank_jumlah: e.target.value,
                        },
                      })
                    }
                    className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Jumlah"
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Permintaan Tambahan Tindakan Pengamanan Lainnya
                </label>
                <textarea
                  value={formData.pencegahan.permintaan_tambahan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pencegahan: {
                        ...formData.pencegahan,
                        permintaan_tambahan: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Sebutkan tindakan pengamanan tambahan yang dibutuhkan..."
                />
              </div>
            </div>
          </div>
        </Section>

        {/* BAGIAN 4: PERSETUJUAN */}
        <Section
          title="BAGIAN 4: PERSETUJUAN"
          section="bagian4"
          description="Tanda tangan dan persetujuan dari pihak terkait"
          expanded={expanded}
          toggle={toggle}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: "spvNama", label: "SPV Terkait / Supervisor" },
                { key: "kontraktorNama", label: "Kontraktor" },
                { key: "sfoNama", label: "Safety Fire Officer (SFO)" },
                { key: "pgaNama", label: "PGA / Dept Head" },
              ].map((item) => (
                <div key={item.key} className="border border-slate-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">{item.label}</label>
                  <input
                    type="text"
                    value={(formData.persetujuan as any)[item.key]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        persetujuan: {
                          ...formData.persetujuan,
                          [item.key]: e.target.value,
                        },
                      })
                    }
                    className="text-black w-full px-4 py-2.5 border border-slate-300 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="Nama Lengkap"
                  />
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-600 min-h-32 flex items-center justify-center">
                    [Tanda Tangan]
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-md sticky bottom-4 border border-slate-200">
          <button
            onClick={handleSave}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold flex items-center space-x-2 transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>Simpan Draft</span>
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-semibold flex items-center space-x-2 transition-colors shadow-lg"
          >
            <Send className="w-5 h-5" />
            <span>Ajukan Izin</span>
          </button>
        </div>
      </div>
    </div>
  );
}