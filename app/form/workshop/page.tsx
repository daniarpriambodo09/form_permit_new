// app/form/workshop/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Flame,
  Save,
  Send,
  AlertCircle,
  Lock,
  Wrench,
  Clock,
  Shield,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  Check,
  Loader2,
  AlertTriangle,
  Home,
  Info,
} from "lucide-react";
import JsaMethodSection, { type JsaMode } from "@/components/JsaMethodSection";
import { type JsaFileInfo, type JsaUploadStatus as JsaStatus } from "@/components/JsaUploadSection";
import LinkedJsaSection from "@/components/LinkedJsaSection";
import { createEmptyJsa } from "@/components/JsaBuilderSection";
import type { JsaData } from "@/components/JsaBuilderSection";
import TimeInput24, { normalizeTo24h } from "@/components/Time24Input";
import { useSearchParams } from "next/navigation";

interface WorkerOption {
  nik: string;
  nama: string;
  departemen: string | null;
  jenis_kerja: string;
  file_url: string | null;
  file_type: string | null;
  tanggal_exp: string | null;
}

type WorkDetail = { detail: string; mulai: string; selesai: string };

interface FormData {
  tipePerusahaan: "internal" | "eksternal";
  noRegistrasi: string;
  namaKontraktor: string;
  namaPekerja: string;
  nikPekerja: string;
  lokasi: string;
  tanggalPelaksanaan: string;
  waktuPukul: string;
  waktuSelesai: string;
  namaFireWatch: string;
  nikFireWatch: string;
  jenisPekerjaan: {
    preventive: boolean;
    tangki: boolean;
    panel: boolean;
    cutting: WorkDetail;
    grinding: WorkDetail;
    welding: WorkDetail;
    painting: WorkDetail;
    spray: boolean;
    nonSpray: boolean;
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
    permintaan_tambahan: string;
  };
  checklistPencegahan: Record<string, boolean>;
  persetujuan: { spvNama: string; kontraktorNama: string; sfoNama: string; pgaNama: string };
}

function calculateDuration(start: string, end: string): string | null {
  if (!start || !end) return null;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;

  let totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
  if (totalMinutes <= 0) return null;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hours} Jam`;
  return `${hours} Jam ${mins} Menit`;
}

// ── Card Section Modern & Rapi ───────────────────────────────────────
const Section = ({
  stepNumber,
  title,
  section,
  description,
  expanded,
  toggle,
  badge,
  id,
  children,
}: any) => (
  <div
    id={id || `section-${stepNumber}`}
    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden mb-6 shadow-xs hover:shadow-sm transition-shadow scroll-mt-20"
  >
    <button
      type="button"
      onClick={() => toggle(section)}
      className="w-full flex items-center justify-between cursor-pointer bg-slate-50/80 hover:bg-emerald-50/60 px-5 sm:px-7 py-4 border-b border-slate-200 transition-colors text-left"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/20 shrink-0">
          {stepNumber}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">{title}</h3>
            {badge && (
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          {expanded[section] ? "Tutup" : "Buka"}
        </span>
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
          {expanded[section] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
    </button>
    {expanded[section] && <div className="p-5 sm:p-7">{children}</div>}
  </div>
);

// ── Check Item Kotak Centang Modern ──────────────────────────────────
const CheckItem = ({ label, checked, onChange }: any) => (
  <label
    className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-xl border transition-all ${
      checked
        ? "bg-orange-50/80 border-orange-300 text-orange-950 font-medium shadow-xs"
        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
    }`}
  >
    <div
      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
        checked ? "bg-orange-600 border-orange-600 text-white" : "border-slate-300 bg-white"
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
    </div>
    <span className="text-xs sm:text-sm select-none leading-snug">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only"
    />
  </label>
);

const emptyWork = (): WorkDetail => ({ detail: "", mulai: "", selesai: "" });

const defaultForm = (): FormData => ({
  tipePerusahaan: "internal",
  noRegistrasi: "",
  namaKontraktor: "",
  namaPekerja: "",
  nikPekerja: "",
  lokasi: "",
  tanggalPelaksanaan: "",
  waktuPukul: "",
  waktuSelesai: "",
  namaFireWatch: "",
  nikFireWatch: "",
  jenisPekerjaan: {
    preventive: false,
    tangki: false,
    panel: false,
    cutting: emptyWork(),
    grinding: emptyWork(),
    welding: emptyWork(),
    painting: emptyWork(),
    spray: false,
    nonSpray: false,
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
    permintaan_tambahan: "",
  },
  checklistPencegahan: {
    equipment: false,
    apar: false,
    flammableNearby: false,
    b3Stored: false,
    cleanFloor: false,
    metalShield: false,
    completePpe: false,
    cleanMaterial: false,
    returnEquipment: false,
    disposeWaste: false,
    firewatchSafety: false,
    firewatchTraining: false,
  },
  persetujuan: { spvNama: "", kontraktorNama: "", sfoNama: "", pgaNama: "" },
});

const getApproverLabels = (isInternal: boolean) =>
  isInternal
    ? ["SPV / Pemberi Izin", "Admin K3", "SFO", "SMR / PGA SMGR"]
    : ["Kontraktor", "SPV / Pemberi Izin", "Admin K3", "SFO", "SMR / PGA SMGR"];

function WorkshopPermitFormInner() {
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({
    bagian1: true,
    bagian2: true,
    bagian3: true,
    bagian4: true,
  });
  const [user, setUser] = useState<any>(null);
  const [workerOptions, setWorkerOptions] = useState<WorkerOption[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [spvOptions, setSpvOptions] = useState<
    Array<{ id: number; nama: string; nik: string | null; jabatan: string | null; departmen: string | null }>
  >([]);
  const [spvPemberiIzin, setSpvPemberiIzin] = useState<{ nama: string; nik: string; jabatan: string }>({
    nama: "",
    nik: "",
    jabatan: "",
  });
  const [validationError, setValidationError] = useState<string>("");

  // ── JSA state ──────────────────────────────────────────────
  const [perluJsa, setPerluJsa] = useState(false);
  const [jsaFile, setJsaFile] = useState<JsaFileInfo | null>(null);
  const [jsaUploadStatus, setJsaUploadStatus] = useState<JsaStatus>("idle");
  const [jsaUploadError, setJsaUploadError] = useState("");
  const [jsaData, setJsaData] = useState<JsaData>(createEmptyJsa());
  const [jsaMode, setJsaMode] = useState<JsaMode>("upload");

  const searchParams = useSearchParams();
  const idIjinKerja = searchParams.get("id_ijin_kerja");

  // Otomatis sinkronisasi tipePerusahaan sesuai keberadaan idIjinKerja
  useEffect(() => {
    setFormData((prev) => {
      const targetTipe = idIjinKerja ? "eksternal" : "internal";
      if (prev.tipePerusahaan !== targetTipe) {
        return { ...prev, tipePerusahaan: targetTipe };
      }
      return prev;
    });
  }, [idIjinKerja]);

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const draftKey = idIjinKerja ? `draft_workshop_ext_${idIjinKerja}` : "draft_workshop_internal";

  useEffect(() => {
    try {
      localStorage.removeItem("draft_workshop");
      const saved = localStorage.getItem(draftKey);
      if (saved && !hasRestoredDraft) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const isSubmitted = Boolean(parsed._draftMeta?.isSubmitted || parsed.isSubmitted);
          const savedPermitId = parsed._draftMeta?.idIjinKerja ?? parsed.idIjinKerja ?? null;
          const currentPermitId = idIjinKerja || null;

          if (!isSubmitted && savedPermitId === currentPermitId) {
            const draftForm = parsed.formData || parsed;
            setFormData((prev) => ({ ...prev, ...draftForm }));
            setHasRestoredDraft(true);
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      }
    } catch {}
  }, [draftKey, idIjinKerja, hasRestoredDraft]);

  const saveLocalDraft = (data: FormData) => {
    try {
      const payload = {
        formData: data,
        _draftMeta: {
          idIjinKerja: idIjinKerja || null,
          savedAt: new Date().toISOString(),
          isSubmitted: false,
        },
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {}
  };

  const [loadingParent, setLoadingParent] = useState(false);
  const [parentPermit, setParentPermit] = useState<any>(null);

  useEffect(() => {
    if (!idIjinKerja) return;

    // Cek dulu dari sessionStorage untuk prefill instan
    try {
      const sess = sessionStorage.getItem("last_ijin_kerja_eksternal");
      if (sess) {
        const p = JSON.parse(sess);
        if (p && (!p.id_form || p.id_form === idIjinKerja)) {
          setFormData((prev) => ({
            ...prev,
            tipePerusahaan: "eksternal",
            namaKontraktor: p.namaKontraktor || prev.namaKontraktor,
            lokasi: p.lokasi || prev.lokasi,
            tanggalPelaksanaan: p.tanggalPelaksanaan ? p.tanggalPelaksanaan.slice(0, 10) : prev.tanggalPelaksanaan,
            waktuPukul: p.waktuMulai ? p.waktuMulai.slice(0, 5) : prev.waktuPukul,
            waktuSelesai: p.waktuSelesai ? p.waktuSelesai.slice(0, 5) : prev.waktuSelesai,
          }));
          if (p.spvPemberiIzin?.nama) {
            setSpvPemberiIzin({
              nama: p.spvPemberiIzin.nama,
              nik: p.spvPemberiIzin.nik || "",
              jabatan: p.spvPemberiIzin.jabatan || "Supervisor",
            });
          }
          if (p.perluJsa !== undefined) setPerluJsa(Boolean(p.perluJsa));
          if (p.jsaMode === "upload" || p.jsaFileUrl || p.jsaFile?.url) {
            setJsaMode("upload");
            const u = p.jsaFileUrl || p.jsaFile?.url;
            setJsaFile(p.jsaFile || { url: u, name: "Dokumen_JSA", size: 0 });
          } else if (p.jsaData) {
            setJsaMode("build");
            setJsaData(p.jsaData);
          }
          setJsaData((prev) => ({
            ...prev,
            area: p.lokasi || prev.area,
            pic: p.namaPengawasPicSubkont || prev.pic,
            jenisPekerjaan: p.deskripsiPekerjaan ? `Workshop - ${p.deskripsiPekerjaan}` : prev.jenisPekerjaan,
          }));
        }
      }
    } catch {}

    // Fetch langsung dari database via API general-permit
    setLoadingParent(true);
    fetch(`/api/forms/general-permit/${idIjinKerja}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.data) return;
        const p = data.data;

        const tgl = p.tgl_mulai_kerja ? new Date(p.tgl_mulai_kerja).toISOString().split("T")[0] : "";
        const wMulai = p.waktu_kerja ? p.waktu_kerja.slice(0, 5) : (p.izin_kerja_dari ? p.izin_kerja_dari.slice(0, 5) : "");
        const wSelesai = p.waktu_selesai ? p.waktu_selesai.slice(0, 5) : (p.izin_kerja_sampai ? p.izin_kerja_sampai.slice(0, 5) : "");

        setFormData((prev) => ({
          ...prev,
          tipePerusahaan: "eksternal",
          namaKontraktor: p.nama_kontraktor_pekerja || prev.namaKontraktor,
          lokasi: p.lokasi_pekerjaan || prev.lokasi,
          tanggalPelaksanaan: tgl || prev.tanggalPelaksanaan,
          waktuPukul: wMulai || prev.waktuPukul,
          waktuSelesai: wSelesai || prev.waktuSelesai,
        }));

        const spvName = p.spv_terkait_pj || p.spvPemberiIzin?.nama || "";
        const spvNik = p.nik_spv_terkait_pj || p.spvPemberiIzin?.nik || "";
        if (spvName) {
          setSpvPemberiIzin({
            nama: spvName,
            nik: spvNik,
            jabatan: "Supervisor",
          });
          setSpvOptions((prev) => {
            if (prev.some((s) => s.nama === spvName)) return prev;
            return [{ id: 999999, nama: spvName, nik: spvNik, jabatan: "Supervisor", departmen: p.departemen_pengawas || null }, ...prev];
          });
        }

        if (p.perlu_jsa !== undefined) setPerluJsa(Boolean(p.perlu_jsa));
        const fileUrl = p.jsa_file_url || (p.jsa_data as any)?.fileUrl;
        if (fileUrl || (p.jsa_data as any)?.mode === "upload") {
          setJsaMode("upload");
          setJsaFile({ url: fileUrl, name: fileUrl ? fileUrl.split("/").pop() || "Dokumen_JSA" : "Dokumen_JSA", size: 0 });
        } else if (p.jsa_data) {
          setJsaMode("build");
          setJsaData(p.jsa_data);
        }

        setJsaData((prev) => ({
          ...prev,
          area: p.lokasi_pekerjaan || prev.area,
          pic: p.nama_pengawas_pic_subkont || prev.pic,
          jenisPekerjaan: p.deskripsi_pekerjaan ? `Workshop - ${p.deskripsi_pekerjaan}` : prev.jenisPekerjaan,
        }));
      })
      .catch((err) => console.error("Gagal memuat data parent permit:", err))
      .finally(() => setLoadingParent(false));
  }, [idIjinKerja]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;

        const data = await res.json();
        setUser(data.user);

        if (data.user.departmen) {
          setJsaData((prev) => ({ ...prev, sectDept: data.user.departmen }));
        }

        const spvRes = await fetch("/api/admin-users/approvers");
        if (spvRes.ok) {
          const spvData = await spvRes.json();
          const allSpvs = (spvData.users ?? []).filter((u: any) => u.role === "spv" && u.is_active !== false);

          // Opsi SPV HANYA dari departemen yang sama dengan user
          const dept = data.user?.departmen;
          let filteredSpvs = allSpvs;
          if (dept && dept !== "Unknown") {
            const byDept = allSpvs.filter(
              (s: any) => s.departmen?.toLowerCase() === dept.toLowerCase()
            );
            if (byDept.length > 0) filteredSpvs = byDept;
          }

          setSpvOptions((prev) => {
            if (spvPemberiIzin.nama && !filteredSpvs.some((s: any) => s.nama === spvPemberiIzin.nama)) {
              return [
                {
                  id: 999999,
                  nama: spvPemberiIzin.nama,
                  nik: spvPemberiIzin.nik,
                  jabatan: spvPemberiIzin.jabatan || "Supervisor",
                  departmen: dept || null,
                },
                ...filteredSpvs,
              ];
            }
            return filteredSpvs;
          });

          if (!idIjinKerja) {
            setSpvPemberiIzin((prev) => {
              if (prev.nama) return prev;
              const defaultSpv = filteredSpvs[0];
              if (!defaultSpv) return prev;
              return {
                nama: defaultSpv.nama ?? "",
                nik: (defaultSpv.nik && defaultSpv.nik.trim()) ? defaultSpv.nik.trim() : (defaultSpv.username ?? ""),
                jabatan: defaultSpv.jabatan ?? "Supervisor",
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
    fetchUser();
  }, [idIjinKerja]);

  // ── Fetch pekerja Workshop dari Master Lisence saat Internal (filter by departemen user) ──
  useEffect(() => {
    if (formData.tipePerusahaan !== "internal") {
      setWorkerOptions([]);
      return;
    }
    const dept = user?.departmen;
    const url = dept && dept !== "Unknown"
      ? `/api/master-lisence/workers?jenisKerja=workshop&departemen=${encodeURIComponent(dept)}`
      : "/api/master-lisence/workers?jenisKerja=workshop";

    setLoadingWorkers(true);
    fetch(url, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWorkerOptions(d.data || []))
      .catch((err) => {
        console.error("Gagal memuat pekerja master lisence:", err);
        setWorkerOptions([]);
      })
      .finally(() => setLoadingWorkers(false));
  }, [formData.tipePerusahaan, user?.departmen]);

  const toggle = (s: string) =>
    setExpanded((prev) => ({ ...prev, [s]: !prev[s as keyof typeof prev] }));
  const setJ = (patch: any) =>
    setFormData((prev) => {
      const next = { ...prev, jenisPekerjaan: { ...prev.jenisPekerjaan, ...patch } };
      saveLocalDraft(next);
      return next;
    });
  const setA = (patch: any) =>
    setFormData((prev) => {
      const next = { ...prev, areaBerisiko: { ...prev.areaBerisiko, ...patch } };
      saveLocalDraft(next);
      return next;
    });
  const setP = (patch: any) =>
    setFormData((prev) => {
      const next = { ...prev, pencegahan: { ...prev.pencegahan, ...patch } };
      saveLocalDraft(next);
      return next;
    });
  const setWork = (key: "cutting" | "grinding" | "welding" | "painting", field: keyof WorkDetail, val: string) =>
    setJ({ [key]: { ...formData.jenisPekerjaan[key], [field]: val } });

  const isInternal = formData.tipePerusahaan === "internal";
  const approverLabels = getApproverLabels(isInternal);
  const inputCls =
    "w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400 transition-all bg-white";

  const totalDuration = calculateDuration(formData.waktuPukul, formData.waktuSelesai);

  const submit = async (isSubmit: boolean) => {
    setValidationError("");
    if (!formData.namaFireWatch || !formData.nikFireWatch) {
      setValidationError("Fire Watch wajib diisi nama dan NIK-nya");
      return;
    }
    if (!spvPemberiIzin.nama || !spvPemberiIzin.nama.trim()) {
      setValidationError("SPV / Pemberi Izin wajib dipilih");
      return;
    }
    if (isInternal && (!formData.namaPekerja.trim() || !formData.nikPekerja.trim())) {
      setValidationError("Nama Pekerja dan NIK wajib diisi");
      return;
    }
    if (!isInternal && !formData.namaKontraktor.trim()) {
      setValidationError("Nama Kontraktor wajib diisi");
      return;
    }

    if (
      jsaMode === "build" &&
      !jsaFile?.url &&
      perluJsa &&
      (!jsaData.area.trim() ||
        !jsaData.jenisPekerjaan.trim() ||
        !jsaData.pic.trim() ||
        !jsaData.petugas.some((name) => name.trim()))
    ) {
      setValidationError("Area, Jenis Pekerjaan, PIC, dan minimal satu Petugas pada JSA wajib diisi");
      return;
    }

    if (isSubmit) {
      setSubmitting(true);
    } else {
      setSaving(true);
    }

    try {
      const normalizeWork = (work: WorkDetail) => ({
        detail: work.detail || null,
        mulai: work.detail ? normalizeTo24h(work.mulai) : null,
        selesai: work.detail ? normalizeTo24h(work.selesai) : null,
      });

      const normalizedData = {
        ...formData,
        waktuPukul: normalizeTo24h(formData.waktuPukul),
        waktuSelesai: normalizeTo24h(formData.waktuSelesai),
        jenisPekerjaan: {
          ...formData.jenisPekerjaan,
          cutting: normalizeWork(formData.jenisPekerjaan.cutting),
          grinding: normalizeWork(formData.jenisPekerjaan.grinding),
          welding: normalizeWork(formData.jenisPekerjaan.welding),
          painting: normalizeWork(formData.jenisPekerjaan.painting),
        },
      };

      const res = await fetch("/api/forms/workshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...normalizedData,
          isSubmit,
          perluJsa,
          jsaFileUrl: jsaFile?.url ?? null,
          spvPemberiIzin: {
            ...spvPemberiIzin,
            nik: spvPemberiIzin.nik.trim() || "-",
          },
          ...(jsaMode === "build" && !jsaFile?.url ? { jsaData } : {}),
          idIjinKerja,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan server");

      // Hapus draft lokal setelah berhasil submit atau simpan ke server
      try {
        localStorage.removeItem(draftKey);
        localStorage.removeItem("draft_workshop");
      } catch {}
      setHasRestoredDraft(false);

      return data;
    } finally {
      setSubmitting(false);
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      const r = await submit(false);
      if (!r) return;
      alert(`Draft disimpan! ID: ${r.id_form}`);
    } catch (e: any) {
      alert("Gagal: " + e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) {
      alert(validationError);
      return;
    }
    try {
      const r = await submit(true);
      if (!r) return;
      alert(`Izin diajukan! ID: ${r.id_form}`);
      window.location.href = "/my-forms";
    } catch (e: any) {
      alert("Gagal: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              title="Kembali ke Beranda"
            >
              <Home className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20 text-white">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Form Izin Kerja Workshop</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <Link href="/home" className="hover:text-orange-600 transition-colors">Beranda</Link>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-orange-600 font-medium">Workshop Permit</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-orange-700">
              <Flame className="w-3.5 h-3.5" /> Workshop
            </span>
            <Link
              href="/my-forms"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/80 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors cursor-pointer"
            >
              Lihat Riwayat &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* ── HERO BANNER ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white p-6 sm:p-8 mb-8 border border-emerald-500/30 shadow-xl">
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 -bottom-20 w-60 h-60 bg-teal-600/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm">
                <Wrench className="w-3.5 h-3.5" /> Workshop Permit
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-200 border border-white/10 backdrop-blur-xs">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Standar K3: JAI/SHE/WKP-01
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-500/30">
                Pekerjaan Bengkel & Fabrikasi
              </span>
            </div>

            {/* Title & Description */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Izin Kerja Bengkel & Workshop (Workshop Permit)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Formulir otorisasi keselamatan kerja untuk operasional mesin bubut, milling, cutting wheel, gerinda duduk, dan fabrikasi logam di bengkel PT JAI.
            </p>

            {/* Quick Meta Chips */}
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 backdrop-blur-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Pemohon / User</span>
                <span className="font-bold text-white truncate block mt-0.5">
                  {user?.nama || "Daniar Priambodo"}
                </span>
                <span className="text-[11px] text-emerald-300 truncate block">Dept: {user?.departmen || "PGA"}</span>
              </div>

              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 backdrop-blur-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tipe Pelaksana</span>
                <span className="font-bold text-white block mt-0.5 capitalize">
                  {formData.tipePerusahaan === "eksternal" ? "Subkontraktor" : "Karyawan Internal"}
                </span>
                <span className="text-[11px] text-slate-300 truncate block">
                  {formData.tipePerusahaan === "eksternal" ? (idIjinKerja ? `Induk: ${idIjinKerja}` : "Eksternal") : "PT. JAI"}
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 backdrop-blur-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Estimasi Waktu</span>
                <span className="font-bold text-white block mt-0.5">±5 - 7 Menit</span>
                <span className="text-[11px] text-emerald-400">Verifikasi Mesin K3</span>
              </div>

              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 backdrop-blur-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Durasi Pekerjaan</span>
                <span className="font-bold text-white block mt-0.5 truncate">
                  {totalDuration || "Belum ditentukan"}
                </span>
                <span className="text-[11px] text-amber-300 truncate block">
                  {formData.waktuPukul && formData.waktuSelesai ? `${formData.waktuPukul} - ${formData.waktuSelesai}` : "Isi jam kerja"}
                </span>
              </div>
            </div>

            {/* Quick Section Jump Bar */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider shrink-0 mr-1">
                Lompat Ke:
              </span>
              {[
                { id: "section-1", num: "01", label: "Informasi Registrasi" },
                { id: "section-2", num: "02", label: "Klasifikasi & Mesin" },
                { id: "section-3", num: "03", label: "Ceklis Pengamanan (24 Poin)" },
                { id: "section-4", num: "04", label: "Alur Otorisasi" },
                { id: "bagian-jsa", num: "05", label: "Dokumen JSA" },
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => {
                    const el = document.getElementById(tab.id);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 transition-colors font-medium cursor-pointer"
                >
                  <span className="text-emerald-400 font-bold mr-1.5">{tab.num}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Banner Pemulihan Draft */}
          {hasRestoredDraft && (
            <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-900 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Memuat draft isian terakhir yang tersimpan di perangkat ini (belum diajukan).</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(draftKey);
                    localStorage.removeItem("draft_workshop");
                  } catch {}
                  setHasRestoredDraft(false);
                  const fresh = defaultForm();
                  if (parentPermit) {
                    fresh.tipePerusahaan = "eksternal";
                    fresh.namaKontraktor = parentPermit.nama_kontraktor_pekerja || "";
                    fresh.lokasi = parentPermit.lokasi_pekerjaan || "";
                    fresh.tanggalPelaksanaan = parentPermit.tgl_mulai_kerja
                      ? new Date(parentPermit.tgl_mulai_kerja).toISOString().split("T")[0]
                      : "";
                    fresh.waktuPukul = parentPermit.waktu_kerja ? parentPermit.waktu_kerja.slice(0, 5) : "";
                    fresh.waktuSelesai = parentPermit.waktu_selesai ? parentPermit.waktu_selesai.slice(0, 5) : "";
                  }
                  setFormData(fresh);
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 underline shrink-0 cursor-pointer"
              >
                Reset Formulir
              </button>
            </div>
          )}

          {validationError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{validationError}</p>
            </div>
          )}

          {idIjinKerja && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <Lock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-purple-900 flex-1">
                <p className="font-bold flex items-center gap-2">
                  Terhubung dengan Ijin Kerja Eksternal
                  {loadingParent && <span className="text-[11px] font-normal text-purple-600 animate-pulse">(Memuat data...)</span>}
                </p>
                <p className="mt-0.5 text-purple-700">
                  Formulir ini dikaitkan dengan nomor izin <strong className="font-mono bg-purple-100 px-1.5 py-0.5 rounded">{idIjinKerja}</strong>.
                  Data kontraktor, lokasi pekerjaan, tanggal pelaksanaan, jam kerja, dan SPV pemberi izin telah terisi otomatis.
                </p>
              </div>
            </div>
          )}

          {/* ── BAGIAN 1: INFORMASI REGISTRASI ── */}
          <Section
            stepNumber="1"
            title="Informasi Registrasi & Identitas Pekerjaan"
            section="bagian1"
            description="Data registrasi, kontraktor, pekerja, lokasi, dan jadwal pelaksanaan kerja bengkel"
            badge="Wajib Diisi"
            expanded={expanded}
            toggle={toggle}
          >
            <div className="space-y-5">
              {/* Tipe Pekerja */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                  Tipe Pekerja / Perusahaan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      value: "internal",
                      label: "Internal / Karyawan PT.JAI",
                      desc: "Alur: SPV → Admin K3 → SFO → SMR",
                      disabled: Boolean(idIjinKerja),
                      reason: "Terkunci: Lampiran Izin Kerja Eksternal",
                    },
                    {
                      value: "eksternal",
                      label: "Eksternal / Subkontraktor",
                      desc: "Alur: Kontraktor → SPV → Admin K3 → SFO → SMR",
                      disabled: !idIjinKerja,
                      reason: "Hanya dapat diajukan melalui formulir Izin Kerja Eksternal",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-col gap-1.5 p-4 rounded-xl border-2 transition-all ${
                        opt.disabled ? "cursor-not-allowed opacity-60 bg-slate-50" : "cursor-pointer"
                      } ${
                        formData.tipePerusahaan === opt.value
                          ? "border-emerald-500 bg-emerald-50/60 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="tipePerusahaan"
                          value={opt.value}
                          checked={formData.tipePerusahaan === opt.value}
                          disabled={opt.disabled}
                          onChange={() => {
                            if (opt.disabled) return;
                            setFormData((p) => ({
                              ...p,
                              tipePerusahaan: opt.value as any,
                              namaPekerja: "",
                              nikPekerja: "",
                            }));
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs sm:text-sm font-bold text-slate-800">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 ml-6">{opt.desc}</p>
                      {opt.disabled && (
                        <p className="text-[10px] text-amber-700 font-medium ml-6">
                          • {opt.reason}
                        </p>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Kontraktor */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Nama Kontraktor{" "}
                  {isInternal ? (
                    <span className="text-slate-400 font-normal text-xs">(tidak diperlukan untuk Internal)</span>
                  ) : (
                    <span className="text-rose-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  value={isInternal ? "" : formData.namaKontraktor}
                  onChange={(e) => setFormData((p) => ({ ...p, namaKontraktor: e.target.value }))}
                  disabled={isInternal}
                  required={!isInternal}
                  placeholder={isInternal ? "Tidak diperlukan untuk Karyawan Internal PT.JAI" : "Contoh: PT ABC Teknik Mandiri"}
                  className={`${inputCls} ${isInternal ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                />
              </div>

              {/* Pekerja & NIK */}
              {isInternal ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Nama Pekerja (Master Lisence) <span className="text-rose-500">*</span>
                    </label>
                    {loadingWorkers ? (
                      <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs sm:text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                        <span>Memuat data pekerja...</span>
                      </div>
                    ) : workerOptions.length > 0 ? (
                      <select
                        value={
                          formData.namaPekerja && formData.nikPekerja
                            ? `${formData.namaPekerja} / ${formData.nikPekerja}`
                            : ""
                        }
                        onChange={(e) => {
                          const selected = workerOptions.find((w) => `${w.nama} / ${w.nik}` === e.target.value);
                          setFormData((p) => ({
                            ...p,
                            namaPekerja: selected?.nama ?? "",
                            nikPekerja: selected?.nik ?? "",
                          }));
                          setValidationError("");
                        }}
                        required
                        className={inputCls}
                      >
                        <option value="">-- Pilih Pekerja Workshop --</option>
                        {workerOptions.map((w) => {
                          const isExpired = w.tanggal_exp
                            ? new Date(w.tanggal_exp).getTime() < new Date().setHours(0, 0, 0, 0)
                            : false;
                          return (
                            <option key={`${w.nama}-${w.nik}`} value={`${w.nama} / ${w.nik}`}>
                              {`${w.nama} / ${w.nik}`}{w.departemen ? ` (${w.departemen})` : ""}{isExpired ? " [Lisensi Kadaluarsa]" : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={formData.namaPekerja}
                          onChange={(e) => setFormData((p) => ({ ...p, namaPekerja: e.target.value }))}
                          className={inputCls}
                          placeholder="Nama pekerja"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">NIK Pekerja</label>
                    <input
                      type="text"
                      value={formData.nikPekerja}
                      onChange={
                        workerOptions.length === 0
                          ? (e) => setFormData((p) => ({ ...p, nikPekerja: e.target.value }))
                          : undefined
                      }
                      readOnly={workerOptions.length > 0}
                      placeholder={workerOptions.length > 0 ? "Terisi otomatis" : "NIK pekerja"}
                      className={`w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl ${
                        workerOptions.length > 0
                          ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                          : "text-slate-800 bg-white"
                      } text-xs sm:text-sm`}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Nama Pekerja &amp; NIK{" "}
                    <span className="text-slate-400 font-normal text-xs">(tidak diperlukan untuk Eksternal / Subkontraktor)</span>
                  </label>
                  <input
                    type="text"
                    value={
                      formData.namaPekerja
                        ? `${formData.namaPekerja}${formData.nikPekerja ? ` / ${formData.nikPekerja}` : ""}`
                        : ""
                    }
                    disabled
                    placeholder="Tidak perlu diisi untuk Eksternal / Subkontraktor"
                    className={`${inputCls} bg-slate-100 text-slate-400 cursor-not-allowed`}
                  />
                </div>
              )}

              {/* Lokasi & Tanggal Pelaksanaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Lokasi Pekerjaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lokasi}
                    onChange={(e) => setFormData((p) => ({ ...p, lokasi: e.target.value }))}
                    placeholder="Contoh: Bengkel MTC / Ruang Pompa"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Tanggal Pelaksanaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.tanggalPelaksanaan}
                    onChange={(e) => setFormData((p) => ({ ...p, tanggalPelaksanaan: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Waktu & Durasi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    Jadwal Waktu Kerja (Format 24 Jam)
                  </label>
                  {totalDuration && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Durasi: {totalDuration}</span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Waktu Mulai (HH:mm)</label>
                    <TimeInput24
                      value={formData.waktuPukul}
                      onChange={(val) => setFormData((p) => ({ ...p, waktuPukul: val }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Waktu Selesai (HH:mm)</label>
                    <TimeInput24
                      value={formData.waktuSelesai}
                      onChange={(val) => setFormData((p) => ({ ...p, waktuSelesai: val }))}
                    />
                  </div>
                </div>
              </div>

              {/* Fire Watch */}
              <div className="p-4 sm:p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-amber-700" />
                  <span className="text-xs sm:text-sm font-bold text-amber-900">
                    Petugas Fire Watch (Pengawas Api) <span className="text-rose-500">*</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Fire Watch</label>
                    <input
                      type="text"
                      value={formData.namaFireWatch}
                      onChange={(e) => setFormData((p) => ({ ...p, namaFireWatch: e.target.value }))}
                      className={inputCls}
                      placeholder="Nama lengkap Fire Watch"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIK Fire Watch</label>
                    <input
                      type="text"
                      value={formData.nikFireWatch}
                      onChange={(e) => setFormData((p) => ({ ...p, nikFireWatch: e.target.value }))}
                      className={inputCls}
                      placeholder="NIK Fire Watch"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pemberi Izin (SPV) */}
              <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs sm:text-sm font-bold text-emerald-900">
                    Pemberi Izin (SPV Terkait) <span className="text-rose-500">*</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Nama SPV</label>
                    <select
                      value={spvPemberiIzin.nama}
                      onChange={(e) => {
                        const selected = spvOptions.find((spv) => spv.nama === e.target.value);
                        const nikVal = selected?.nik?.trim() || (selected as any)?.username || "";
                        setSpvPemberiIzin({
                          nama: selected?.nama ?? e.target.value,
                          nik: nikVal,
                          jabatan: selected?.jabatan ?? "Supervisor",
                        });
                        setValidationError("");
                      }}
                      required
                      className={`${inputCls} ${!spvPemberiIzin.nama ? "border-amber-300 bg-amber-50/50" : ""}`}
                    >
                      <option value="">-- Pilih SPV --</option>
                      {spvOptions.map((spv) => (
                        <option key={spv.id} value={spv.nama}>
                          {spv.nama} {spv.departmen ? `(${spv.departmen})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIK SPV</label>
                    <input
                      type="text"
                      value={spvPemberiIzin.nik}
                      onChange={(e) => setSpvPemberiIzin((prev) => ({ ...prev, nik: e.target.value }))}
                      placeholder="Terisi otomatis / ketik manual"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── BAGIAN 2: JENIS PEKERJAAN & AREA BERISIKO ── */}
          <Section
            stepNumber="2"
            title="Jenis Pekerjaan & Area Berisiko Tinggi"
            section="bagian2"
            description="Detail jenis pekerjaan workshop, jadwal khusus, dan potensi bahaya area"
            expanded={expanded}
            toggle={toggle}
          >
            <div className="space-y-6">
              {/* Jenis Pekerjaan Umum */}
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">
                  A. Pilihan Jenis Pekerjaan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: "preventive", label: "Preventive Genset / Pump room" },
                    { key: "tangki", label: "Tangki Solar" },
                    { key: "panel", label: "Panel Listrik" },
                  ].map((item) => (
                    <CheckItem
                      key={item.key}
                      label={item.label}
                      checked={(formData.jenisPekerjaan as any)[item.key]}
                      onChange={() =>
                        setJ({ [item.key]: !(formData.jenisPekerjaan as any)[item.key] })
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Detail Pekerjaan */}
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">
                  B. Detail Aplikasi Kerja Panas & Mesin
                </h4>
                <div className="space-y-3.5">
                  {(["cutting", "grinding", "welding", "painting"] as const).map((key) => {
                    const item = formData.jenisPekerjaan[key];
                    const labels: Record<string, string> = {
                      cutting: "Cutting (Pemotongan)",
                      grinding: "Grinding (Penggerindaan)",
                      welding: "Welding (Pengelasan)",
                      painting: "Painting (Pengecatan)",
                    };
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
                      >
                        <p className="text-xs sm:text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          {labels[key]}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-6">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Deskripsi / Spesifikasi
                            </label>
                            <input
                              type="text"
                              value={item.detail}
                              onChange={(e) => setWork(key, "detail", e.target.value)}
                              className={inputCls}
                              placeholder={`Detail pekerjaan ${key}...`}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Mulai</label>
                            <TimeInput24
                              value={item.mulai}
                              onChange={(val) => setWork(key, "mulai", val)}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Selesai</label>
                            <TimeInput24
                              value={item.selesai}
                              onChange={(val) => setWork(key, "selesai", val)}
                            />
                          </div>
                        </div>

                        {key === "painting" && (
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                            <CheckItem
                              label="Metode SPRAY"
                              checked={formData.jenisPekerjaan.spray}
                              onChange={() => setJ({ spray: !formData.jenisPekerjaan.spray })}
                            />
                            <CheckItem
                              label="Metode NON-SPRAY"
                              checked={formData.jenisPekerjaan.nonSpray}
                              onChange={() => setJ({ nonSpray: !formData.jenisPekerjaan.nonSpray })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pekerjaan Lainnya */}
              <div>
                <CheckItem
                  label="Terdapat aplikasi panas atau alat kerja bengkel lainnya"
                  checked={formData.jenisPekerjaan.lainnya}
                  onChange={() => setJ({ lainnya: !formData.jenisPekerjaan.lainnya })}
                />
                {formData.jenisPekerjaan.lainnya && (
                  <div className="mt-3 pl-4 animate-in fade-in duration-150">
                    <textarea
                      rows={2}
                      value={formData.jenisPekerjaan.lainnyaKeterangan}
                      onChange={(e) => setJ({ lainnyaKeterangan: e.target.value })}
                      className={`${inputCls} resize-none`}
                      placeholder="Sebutkan detail pekerjaan lainnya..."
                    />
                  </div>
                )}
              </div>

              {/* Area Berisiko Tinggi */}
              <div className="p-4 sm:p-5 bg-rose-50/60 border border-rose-200/80 rounded-2xl">
                <h4 className="text-xs sm:text-sm font-bold text-rose-950 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Identifikasi Area / Equipment Berisiko Tinggi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "ruangTertutup", label: "Ruang tertutup / area pembuangan" },
                    { key: "bahanMudah", label: "Bahan mudah terbakar" },
                    { key: "gas", label: "Gas (bekerja dalam bejana / tangki)" },
                    { key: "ketinggian", label: "Bekerja di ketinggian" },
                    { key: "cairan", label: "Cairan / Gas bertekanan" },
                    { key: "hydrocarbon", label: "Cairan hydrocarbon" },
                  ].map((item) => (
                    <CheckItem
                      key={item.key}
                      label={item.label}
                      checked={(formData.areaBerisiko as any)[item.key]}
                      onChange={() => setA({ [item.key]: !(formData.areaBerisiko as any)[item.key] })}
                    />
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-rose-200">
                  <label className="block text-xs font-semibold text-rose-900 mb-1">Bahaya Lainnya</label>
                  <input
                    type="text"
                    value={formData.areaBerisiko.lain}
                    onChange={(e) => setA({ lain: e.target.value })}
                    className={inputCls}
                    placeholder="Sebutkan jika ada bahaya khusus lain..."
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ── BAGIAN 3: PENCEGAHAN & KESELAMATAN ── */}
          <Section
            stepNumber="3"
            title="Upaya Pencegahan & Checklist Keselamatan"
            section="bagian3"
            description="Langkah pencegahan kebakaran, kebersihan, dan keselamatan kerja workshop"
            expanded={expanded}
            toggle={toggle}
          >
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {[
                  ["equipment", "Equipment / tool / mesin berfungsi dengan baik"],
                  ["apar", "APAR tersedia dan mudah dijangkau dekat area kerja"],
                  ["flammableNearby", "Tidak ada cairan mudah terbakar dekat area kerja panas"],
                  ["b3Stored", "B3 & cairan mudah terbakar disimpan di lemari khusus"],
                  ["cleanFloor", "Lantai bersih dari serbuk dan benda mudah terbakar"],
                  ["metalShield", "Lantai ditutup dengan perisai metal untuk menampung bunga api"],
                  ["completePpe", "Memakai APD lengkap sesuai standar keselamatan kerja"],
                  ["cleanMaterial", "Membersihkan sisa material, serpihan logam, atau sampah"],
                  ["returnEquipment", "Mengembalikan Equipment / tool / mesin ke tempat penyimpanan"],
                  ["disposeWaste", "Membuang sampah sesuai jenisnya (organik, anorganik, B3)"],
                  ["firewatchSafety", "Fire watch memastikan kondisi aman selama dan setelah proses kerja"],
                  ["firewatchTraining", "Fire watch telah terlatih dalam pemakaian APAR"],
                ].map(([key, label], index) => {
                  const val = formData.checklistPencegahan[key];
                  return (
                    <div
                      key={key}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-800 leading-snug">{label}</span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pl-9 sm:pl-0">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              checklistPencegahan: { ...prev.checklistPencegahan, [key]: true },
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            val === true
                              ? "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          YA
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              checklistPencegahan: { ...prev.checklistPencegahan, [key]: false },
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            val === false
                              ? "bg-rose-600 text-white shadow-xs ring-1 ring-rose-500"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          TIDAK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Permintaan Tambahan Tindakan Pengamanan
                </label>
                <textarea
                  rows={2}
                  value={formData.pencegahan.permintaan_tambahan}
                  onChange={(e) => setP({ permintaan_tambahan: e.target.value })}
                  className={`${inputCls} resize-none`}
                  placeholder="Instruksi tambahan jika diperlukan..."
                />
              </div>
            </div>
          </Section>

          {/* ── BAGIAN 4: PERSETUJUAN ── */}
          <Section
            stepNumber="4"
            title="Persetujuan & Verifikasi Berjenjang"
            section="bagian4"
            description="Alur persetujuan digital berjenjang otomatis"
            badge="Digital Approval"
            expanded={expanded}
            toggle={toggle}
          >
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-900">
                  <p className="font-bold">Alur Approval yang Diterapkan:</p>
                  <p className="mt-1 font-semibold text-blue-800">
                    {isInternal ? "SPV → Admin K3 → SFO → SMR / PGA SMGR" : "Kontraktor → SPV → Admin K3 → SFO → SMR / PGA SMGR"}
                  </p>
                  <p className="text-[11px] text-blue-600 mt-1">Kolom persetujuan akan terisi otomatis dengan tanda tangan digital saat masing-masing approver menyetujui formulir.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {approverLabels.map((label) => (
                  <div key={label} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {label}
                    </span>
                    <span className="text-xs text-slate-400 italic">Menunggu Submit</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── BAGIAN 5: UPLOAD JSA ── */}
          <section id="bagian-jsa">
            {idIjinKerja ? (
              <LinkedJsaSection
                idIjinKerja={idIjinKerja}
                enabled={perluJsa}
                setEnabled={setPerluJsa}
                value={jsaData}
                setValue={setJsaData}
                jsaMode={jsaMode}
                setJsaMode={setJsaMode}
                jsaFile={jsaFile}
                setJsaFile={setJsaFile}
                onJsaInfoLoaded={({ mode, fileUrl, enabled }) => {
                  setJsaMode(mode);
                  setPerluJsa(enabled);
                  if (mode === "upload" && fileUrl) {
                    setJsaFile({ name: fileUrl.split("/").pop() || "Dokumen_JSA", size: 0, url: fileUrl });
                  }
                }}
              />
            ) : (
              <JsaMethodSection
                mode={jsaMode}
                setMode={setJsaMode}
                perluJsa={perluJsa}
                setPerluJsa={setPerluJsa}
                jsaFile={jsaFile}
                setJsaFile={setJsaFile}
                jsaUploadStatus={jsaUploadStatus}
                setJsaUploadStatus={setJsaUploadStatus}
                jsaUploadError={jsaUploadError}
                setJsaUploadError={setJsaUploadError}
                jsaData={jsaData}
                setJsaData={setJsaData}
                sectionTitle="Bagian 5: Dokumen Job Safety Analysis (JSA)"
                sectionStyle="workshop"
              />
            )}
          </section>

          {/* ── STICKY BOTTOM ACTION BAR ── */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-3 px-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-500">Izin Kerja Workshop</span>
                <p className="text-sm font-bold text-slate-900 truncate max-w-xs">{formData.lokasi || "Lokasi belum diisi"}</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || submitting || jsaUploadStatus === "uploading"}
                  className="flex-1 sm:flex-none px-5 py-2.5 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-600" /> : <Save className="w-4 h-4 text-slate-600" />}
                  <span>Simpan Draft</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || saving || jsaUploadStatus === "uploading"}
                  className="flex-1 sm:flex-none px-7 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengajukan...</span>
                    </>
                  ) : jsaUploadStatus === "uploading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Upload JSA...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Ajukan Izin Kerja</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function WorkshopPermitForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
          Memuat formulir workshop...
        </div>
      }
    >
      <WorkshopPermitFormInner />
    </Suspense>
  );
}