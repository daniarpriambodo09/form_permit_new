// app/form/ijin-kerja-eksternal/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ClipboardList,
  Flame,
  Wrench,
  Lock,
  HardHat,
  Save,
  Send,
  Check,
  UserCheck,
  Calendar,
  Clock,
  FileText,
  Plus,
  Trash2,
  Home,
} from "lucide-react";
import TimeInput24, { normalizeTo24h } from "@/components/Time24Input";
import JsaMethodSection, { type JsaMode } from "@/components/JsaMethodSection";
import type { JsaFileInfo, JsaUploadStatus } from "@/components/JsaUploadSection";
import { createEmptyJsa, type JsaData } from "@/components/JsaBuilderSection";
import LicenseUploadSection, {
  type LicenseFileInfo,
} from "@/components/LicenseUploadSection";
import { createEmptySafetyInduction, type SafetyInductionData } from "@/components/SafetyInductionSection";

type Kondisi = "" | "ok" | "ng";
interface AlatItem { pakai: boolean; kondisi: Kondisi }
const emptyAlat = (): AlatItem => ({ pakai: false, kondisi: "" });

export interface AlatLainnyaItem {
  id: string;
  nama: string;
  kondisi: Kondisi;
}

interface FormState {
  namaKontraktorPekerja: string;
  namaPengawasPicSubkont: string;
  jumlahTenagaKerja: string;
  tglMulaiKerja: string;
  tglAkhirKerjaRencana: string;
  waktuKerja: string;
  waktuSelesai: string;
  actualTanggalKerja: string;
  spesifikasiPekerjaan: {
    areaWorkshop: boolean;
    ruangTertutup: boolean;
    ketinggian: boolean;
    teganganTinggi: boolean;
    pemakaianLoto: boolean;
    forklift: boolean;
    temperaturTinggi: boolean;
  };
  deskripsiPekerjaan: string;
  spesifikasiLainnya: string;
  alat: {
    mesinPotong: AlatItem;
    mesinLasGerinda: AlatItem;
    genset: AlatItem;
    tabungGas: AlatItem;
    tanggaListrikAwp: AlatItem;
    forklift: AlatItem;
    liftBarang: AlatItem;
  };
  alatLainnya: string;
  alatLainnyaKondisi: Kondisi;
  lokasiPekerjaan: string;
  lokasiTipe: { dalamGedung: boolean; luarGedung: boolean; luarPagarGedung: boolean; diAtasGedung: boolean };
  lokasiLainnya: string;
  pengawasBagian: string;
  departemenPengawas: string;
  picLotoStationLoto: string;
  bahan: { mudahTerbakar: boolean; mudahMeledak: boolean; kimiaBeracunIritan: boolean };
  bahanLainnya: string;
  dampak: {
    ledakanKebakaran: boolean;
    jatuhKetinggian: boolean;
    kepalaTertimpa: boolean;
    kakiTertimpa: boolean;
    tumpahanOliBbmB3: boolean;
    tersengatListrik: boolean;
    terjepitMesin: boolean;
    tersayatTertusuk: boolean;
    infeksiPernafasan: boolean;
    iritasiMata: boolean;
    radiasiSinarLas: boolean;
    iritasiKulit: boolean;
    kebisingan: boolean;
    keracunanZatKimia: boolean;
  };
  dampakLainnya: string;
  apd: {
    masker: boolean;
    maskerKimia: boolean;
    kacamataBiasa: boolean;
    kacamataLas: boolean;
    earPlug: boolean;
    gloves: boolean;
    fullBodyHarness: boolean;
    sarungTanganBintil: boolean;
    sarungTanganListrik: boolean;
    sarungTanganKulit: boolean;
    helm: boolean;
    safetyShoes: boolean;
    sepatuKaret: boolean;
    topiKerja: boolean;
  };
  apdLainnya: string;
  apar: { dryPowder: boolean; gasCair: boolean; tidakPerlu: boolean };
  aparLainnya: string;
  limbah: { kontraktor: boolean; ptJai: boolean; luarJai: boolean };
  limbahLokasiPt: string;
  pernyataanDiperiksa: boolean;
  pengawasPekerjaanUser: string;
}

const defaultForm = (): FormState => ({
  namaKontraktorPekerja: "",
  namaPengawasPicSubkont: "",
  jumlahTenagaKerja: "",
  tglMulaiKerja: "",
  tglAkhirKerjaRencana: "",
  waktuKerja: "",
  waktuSelesai: "",
  actualTanggalKerja: "",
  spesifikasiPekerjaan: {
    areaWorkshop: false,
    ruangTertutup: false,
    ketinggian: false,
    teganganTinggi: false,
    pemakaianLoto: false,
    forklift: false,
    temperaturTinggi: false,
  },
  deskripsiPekerjaan: "",
  spesifikasiLainnya: "",
  alat: {
    mesinPotong: emptyAlat(),
    mesinLasGerinda: emptyAlat(),
    genset: emptyAlat(),
    tabungGas: emptyAlat(),
    tanggaListrikAwp: emptyAlat(),
    forklift: emptyAlat(),
    liftBarang: emptyAlat(),
  },
  alatLainnya: "",
  alatLainnyaKondisi: "",
  lokasiPekerjaan: "",
  lokasiTipe: { dalamGedung: false, luarGedung: false, luarPagarGedung: false, diAtasGedung: false },
  lokasiLainnya: "",
  pengawasBagian: "",
  departemenPengawas: "",
  picLotoStationLoto: "",
  bahan: { mudahTerbakar: false, mudahMeledak: false, kimiaBeracunIritan: false },
  bahanLainnya: "",
  dampak: {
    ledakanKebakaran: false,
    jatuhKetinggian: false,
    kepalaTertimpa: false,
    kakiTertimpa: false,
    tumpahanOliBbmB3: false,
    tersengatListrik: false,
    terjepitMesin: false,
    tersayatTertusuk: false,
    infeksiPernafasan: false,
    iritasiMata: false,
    radiasiSinarLas: false,
    iritasiKulit: false,
    kebisingan: false,
    keracunanZatKimia: false,
  },
  dampakLainnya: "",
  apd: {
    masker: false,
    maskerKimia: false,
    kacamataBiasa: false,
    kacamataLas: false,
    earPlug: false,
    gloves: false,
    fullBodyHarness: false,
    sarungTanganBintil: false,
    sarungTanganListrik: false,
    sarungTanganKulit: false,
    helm: false,
    safetyShoes: false,
    sepatuKaret: false,
    topiKerja: false,
  },
  apdLainnya: "",
  apar: { dryPowder: false, gasCair: false, tidakPerlu: false },
  aparLainnya: "",
  limbah: { kontraktor: false, ptJai: false, luarJai: false },
  limbahLokasiPt: "",
  pernyataanDiperiksa: false,
  pengawasPekerjaanUser: "",
});

const inputCls =
  "w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400 transition-all bg-white";

function SectionCard({
  nomor,
  title,
  description,
  badge,
  children,
  id,
}: {
  nomor: number;
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-shadow overflow-hidden mb-6">
      <div className="bg-slate-50/80 border-b border-slate-200 px-5 sm:px-7 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 shrink-0">
            {nomor}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">{title}</h2>
              {badge && (
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {badge}
                </span>
              )}
            </div>
            {description && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-7 space-y-4">{children}</div>
    </section>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer p-3 sm:p-3.5 rounded-xl border transition-all ${
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
}

function AlatRow({
  label,
  item,
  onChange,
}: {
  label: string;
  item: AlatItem;
  onChange: (v: AlatItem) => void;
}) {
  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        item.pakai
          ? "bg-white border-orange-300 shadow-xs"
          : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-[160px]">
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
              item.pakai ? "bg-orange-600 border-orange-600 text-white" : "border-slate-300 bg-white"
            }`}
          >
            {item.pakai && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-800">{label}</span>
          <input
            type="checkbox"
            checked={item.pakai}
            onChange={(e) =>
              onChange({ pakai: e.target.checked, kondisi: e.target.checked ? item.kondisi || "ok" : "" })
            }
            className="sr-only"
          />
        </label>

        {item.pakai && (
          <div className="flex items-center gap-2 pl-8 sm:pl-0 self-end sm:self-auto shrink-0 animate-in fade-in duration-150">
            <span className="text-xs text-slate-400 font-medium mr-1">Kondisi:</span>
            {(["ok", "ng"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => onChange({ ...item, kondisi: k })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  item.kondisi === k
                    ? k === "ok"
                      ? "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500"
                      : "bg-rose-600 text-white shadow-xs ring-1 ring-rose-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IjinKerjaEksternalPageInner() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successId, setSuccessId] = useState("");
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);

  // ── JSA state (Bagian 4) ────────────────────────────────────────────
  const [jsaMode, setJsaMode] = useState<JsaMode>("build");
  const [perluJsa, setPerluJsa] = useState(false);
  const [jsa, setJsa] = useState<JsaData>(createEmptyJsa());
  const [jsaFile, setJsaFile] = useState<JsaFileInfo | null>(null);
  const [jsaUploadStatus, setJsaUploadStatus] = useState<JsaUploadStatus>("idle");
  const [jsaUploadError, setJsaUploadError] = useState("");
  const [safetyInduction, setSafetyInduction] = useState<SafetyInductionData>(createEmptySafetyInduction);

  // ── Peralatan Lainnya dinamis (Bagian 3) ─────────────────────────────
  const [alatLainnyaList, setAlatLainnyaList] = useState<AlatLainnyaItem[]>([]);

  const handleAddAlatLainnya = () => {
    setAlatLainnyaList((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, nama: "", kondisi: "ok" },
    ]);
  };

  const handleUpdateAlatLainnya = (id: string, patch: Partial<AlatLainnyaItem>) => {
    setAlatLainnyaList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveAlatLainnya = (id: string) => {
    setAlatLainnyaList((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Upload Lisensi state (Bagian 9) ─────────────────────────────────
  const [licenseFiles, setLicenseFiles] = useState<LicenseFileInfo[]>([]);
  const [pengawasOptions, setPengawasOptions] = useState<Array<{ id: number; nama: string; nik: string; departemen: string }>>([]);
  const [departemenOptions, setDepartemenOptions] = useState<string[]>([]);
  const [isPengawasOther, setIsPengawasOther] = useState(false);
  const [pengawasOtherManual, setPengawasOtherManual] = useState("");

  // ── SPV Terkait (Pemberi Izin) ──────────────────────────────────────
  const [userDepartment, setUserDepartment] = useState<string>("");
  const [spvOptions, setSpvOptions] = useState<
    Array<{ id: number; nama: string; nik: string | null; jabatan: string | null; departmen: string | null; username?: string }>
  >([]);
  const [spvPemberiIzin, setSpvPemberiIzin] = useState<{ nama: string; nik: string; jabatan: string }>({
    nama: "",
    nik: "",
    jabatan: "",
  });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        const departmen = data?.user?.departmen ?? "";
        setUserDepartment(departmen);
        setJsa((prev) => ({ ...prev, sectDept: departmen }));

        try {
          const spvRes = await fetch("/api/admin-users/approvers", { credentials: "include" });
          if (!spvRes.ok) return;
          const spvData = await spvRes.json();
          const allSpvs = (spvData.users ?? []).filter((u: any) => u.role === "spv");

          // Opsi SPV difilter berdasarkan departemen yang mengajukan / usernya
          let filteredSpvs = allSpvs;
          if (departmen && departmen !== "Unknown") {
            filteredSpvs = allSpvs.filter(
              (u: any) => u.departmen?.toLowerCase() === departmen.toLowerCase()
            );
          }
          if (filteredSpvs.length === 0) {
            filteredSpvs = allSpvs;
          }

          setSpvOptions(filteredSpvs);
          if (filteredSpvs.length > 0) {
            const defaultSpv = filteredSpvs[0];
            setSpvPemberiIzin((prev) => {
              if (prev.nama) return prev;
              return {
                nama: defaultSpv.nama ?? "",
                nik: defaultSpv.nik?.trim() || defaultSpv.username || "",
                jabatan: defaultSpv.jabatan ?? "Supervisor",
              };
            });
          }
        } catch {
          // Ignored
        }
      })
      .catch(() => undefined);
  }, []);

  // Jika user eksternal / tanpa departemen, filter opsi SPV mengikuti Departemen Pengawas di Bagian 5
  useEffect(() => {
    if ((!userDepartment || userDepartment === "Unknown") && form.departemenPengawas) {
      fetch("/api/admin-users/approvers", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((spvData) => {
          if (!spvData) return;
          const allSpvs = (spvData.users ?? []).filter((u: any) => u.role === "spv");
          const deptSpvs = allSpvs.filter(
            (u: any) => u.departmen?.toLowerCase() === form.departemenPengawas.toLowerCase()
          );
          if (deptSpvs.length > 0) {
            setSpvOptions(deptSpvs);
            setSpvPemberiIzin((prev) => {
              const matched = deptSpvs.find((s: any) => s.nama === prev.nama);
              if (matched) return prev;
              const def = deptSpvs[0];
              return {
                nama: def.nama ?? "",
                nik: def.nik?.trim() || def.username || "",
                jabatan: def.jabatan ?? "Supervisor",
              };
            });
          }
        })
        .catch(() => undefined);
    }
  }, [form.departemenPengawas, userDepartment]);

  useEffect(() => {
    Promise.all([
      fetch("/api/pengawas-departemen", { credentials: "include" }).then((res) =>
        res.ok ? res.json() : { data: [] }
      ),
      fetch("/api/departemen?activeOnly=1", { credentials: "include" }).then((res) =>
        res.ok ? res.json() : { data: [] }
      ),
    ])
      .then(([pengawas, departemen]) => {
        setPengawasOptions(pengawas.data ?? []);
        setDepartemenOptions((departemen.data ?? []).map((item: { nama_departemen: string }) => item.nama_departemen));
      })
      .catch(() => {
        setPengawasOptions([]);
        setDepartemenOptions([]);
      });
  }, []);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    if (key === "namaPengawasPicSubkont" || key === "pengawasPekerjaanUser") {
      setForm((prev) => ({
        ...prev,
        namaPengawasPicSubkont: val as string,
        pengawasPekerjaanUser: val as string,
      }));
    } else {
      setForm((prev) => ({ ...prev, [key]: val }));
    }
  };
  const setGroup = <K extends keyof FormState>(key: K, patch: Partial<FormState[K]>) =>
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] as any), ...patch } }));

  const buildBody = (isSubmit: boolean) => {
    const validAlatLainnya = alatLainnyaList.filter((a) => a.nama.trim());
    let computedAlatLainnya = "";
    let computedAlatLainnyaKondisi = "";
    if (validAlatLainnya.length > 0) {
      computedAlatLainnya = JSON.stringify(
        validAlatLainnya.map((a) => ({ nama: a.nama.trim(), kondisi: a.kondisi }))
      );
      const allSame = validAlatLainnya.every((a) => a.kondisi === validAlatLainnya[0].kondisi);
      computedAlatLainnyaKondisi = allSame ? (validAlatLainnya[0].kondisi || "ok") : "ok/ng";
    }

    const syncedPengawas = form.pengawasPekerjaanUser || form.namaPengawasPicSubkont || "";
    const finalPengawasBagian = isPengawasOther ? pengawasOtherManual.trim() : form.pengawasBagian;

    return {
      isSubmit,
      status: isSubmit ? "submitted" : "draft",
      ...form,
      pengawasBagian: finalPengawasBagian,
      namaPengawasPicSubkont: syncedPengawas,
      pengawasPekerjaanUser: syncedPengawas,
      alatLainnya: computedAlatLainnya,
      alatLainnyaKondisi: computedAlatLainnyaKondisi,
      waktuKerja: normalizeTo24h(form.waktuKerja),
      waktuSelesai: normalizeTo24h(form.waktuSelesai),
      izinKerjaDari: normalizeTo24h(form.waktuKerja),
      izinKerjaSampai: normalizeTo24h(form.waktuSelesai),
      perluJsa,
      jsaFileUrl: perluJsa && jsaMode === "upload" ? jsaFile?.url || null : null,
      jsaData: perluJsa && jsaMode === "build" ? jsa : null,
      safetyInduction,
      licenseFiles: licenseFiles
        .filter((f) => f.status === "success" && f.url)
        .map((f) => ({ url: f.url, name: f.name })),
      spvPemberiIzin,
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError("");
    try {
      const endpoint = createdFormId
        ? `/api/forms/general-permit/${createdFormId}`
        : `/api/forms/general-permit`;
      const method = createdFormId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(false)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan draft");
      const savedId = data.id_form || createdFormId;
      try {
        sessionStorage.setItem("last_ijin_kerja_eksternal", JSON.stringify({
          id_form: savedId,
          namaKontraktor: form.namaKontraktorPekerja,
          namaPengawasPicSubkont: form.namaPengawasPicSubkont,
          lokasi: form.lokasiPekerjaan,
          deskripsiPekerjaan: form.deskripsiPekerjaan,
          tanggalPelaksanaan: form.tglMulaiKerja,
          waktuMulai: form.waktuKerja,
          waktuSelesai: form.waktuSelesai,
          spvPemberiIzin,
          perluJsa,
          jsaMode,
          jsaFile,
          jsaFileUrl: perluJsa && jsaMode === "upload" ? jsaFile?.url || null : null,
          jsaData: perluJsa && jsaMode === "build" ? jsa : null,
        }));
      } catch {}
      setCreatedFormId(savedId);
      router.push("/my-forms");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.pernyataanDiperiksa) {
      setError("Pernyataan tentang ijin kerja (Bagian 15) wajib dicentang sebelum mengajukan.");
      document.getElementById("bagian-15")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const syncedPengawas = (form.pengawasPekerjaanUser || form.namaPengawasPicSubkont).trim();
    if (!syncedPengawas) {
      setError("Nama Pengawas / PIC Subkontraktor (Bagian 1 & 15) wajib diisi.");
      document.getElementById("bagian-1")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (perluJsa) {
      if (jsaMode === "upload") {
        if (!jsaFile?.url) {
          setError("Silakan upload file dokumen JSA terlebih dahulu.");
          document.getElementById("bagian-jsa")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      } else {
        if (
          !jsa.area.trim() ||
          !jsa.jenisPekerjaan.trim() ||
          !jsa.pic.trim() ||
          !jsa.petugas.some((petugas) => petugas.trim())
        ) {
          setError("Area, Jenis Pekerjaan, PIC, dan minimal satu Petugas pada JSA wajib diisi.");
          document.getElementById("bagian-jsa")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }
    const workerCountValue = form.jumlahTenagaKerja.trim();
    const workerCount = Number(workerCountValue);
    if (!workerCountValue || !Number.isInteger(workerCount) || workerCount < 0) {
      setError("Jumlah tenaga kerja wajib diisi dengan bilangan bulat minimal 0.");
      document.getElementById("bagian-1")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const successLicenseCount = licenseFiles.filter((f) => f.status === "success" && f.url).length;
    const finalPengawasBagian = (isPengawasOther ? pengawasOtherManual : form.pengawasBagian).trim();
    if (!form.departemenPengawas || !finalPengawasBagian) {
      setError("Departemen dan Pengawas (Bagian) wajib dipilih/diisi.");
      document.getElementById("bagian-5")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!spvPemberiIzin.nama || !spvPemberiIzin.nama.trim()) {
      setError("Pemberi Izin / Supervisor Departemen (SPV) wajib dipilih.");
      document.getElementById("bagian-1")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Upload lisensi dibuat OPSIONAL — hanya jika diisi tidak boleh melebihi jumlah tenaga kerja
    if (workerCount > 0 && successLicenseCount > workerCount) {
      setError(
        `Jumlah file Lisensi/Sertifikasi maksimal ${workerCount}, saat ini ${successLicenseCount} file berhasil diupload.`
      );
      document.getElementById("bagian-lisensi")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (licenseFiles.some((f) => f.status === "uploading")) {
      setError("Masih ada file Lisensi/Sertifikasi yang sedang diupload, harap tunggu.");
      document.getElementById("bagian-lisensi")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = createdFormId
        ? `/api/forms/general-permit/${createdFormId}`
        : `/api/forms/general-permit`;
      const method = createdFormId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(true)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan form");
      const savedId = data.id_form || createdFormId;
      try {
        sessionStorage.setItem("last_ijin_kerja_eksternal", JSON.stringify({
          id_form: savedId,
          namaKontraktor: form.namaKontraktorPekerja,
          namaPengawasPicSubkont: form.namaPengawasPicSubkont,
          lokasi: form.lokasiPekerjaan,
          deskripsiPekerjaan: form.deskripsiPekerjaan,
          tanggalPelaksanaan: form.tglMulaiKerja,
          waktuMulai: form.waktuKerja,
          waktuSelesai: form.waktuSelesai,
          spvPemberiIzin,
          perluJsa,
          jsaMode,
          jsaFile,
          jsaFileUrl: perluJsa && jsaMode === "upload" ? jsaFile?.url || null : null,
          jsaData: perluJsa && jsaMode === "build" ? jsa : null,
        }));
      } catch {}
      setCreatedFormId(savedId);
      setSuccessId(savedId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ijin Kerja Eksternal Berhasil Dikirim!</h2>
          <p className="text-slate-500 text-sm mb-4">
            Permohonan sedang menunggu alur persetujuan: <strong className="text-slate-700">SPV → Security → SFO → MGR</strong>.
          </p>
          {successId && (
            <p className="text-xs text-slate-400 mb-6 bg-slate-50 py-2 rounded-lg border border-slate-100">
              ID Permohonan: <span className="font-mono font-bold text-slate-800">{successId}</span>
            </p>
          )}

          <div className="text-left bg-orange-50/80 border border-orange-200 rounded-2xl p-5 mb-6">
            <p className="text-xs sm:text-sm font-bold text-orange-950 mb-3">
              Lanjutkan dengan formulir jenis pekerjaan khusus (jika diperlukan):
            </p>
            <div className="space-y-2.5">
              <Link
                href={`/form/hot-work?id_ijin_kerja=${successId}`}
                className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-orange-200 hover:border-orange-400 hover:shadow-xs transition-all group"
              >
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">Tambah Izin Kerja Panas (Hot Work)</span>
              </Link>
              <Link
                href={`/form/height-work?id_ijin_kerja=${successId}`}
                className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-orange-200 hover:border-orange-400 hover:shadow-xs transition-all group"
              >
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <HardHat className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">Tambah Izin Kerja Ketinggian (Height Work)</span>
              </Link>
              <Link
                href={`/form/workshop?id_ijin_kerja=${successId}`}
                className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-orange-200 hover:border-orange-400 hover:shadow-xs transition-all group"
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">Tambah Izin Kerja Workshop</span>
              </Link>
            </div>
            <p className="text-[11px] text-orange-700 mt-3 leading-relaxed">
              Anda juga dapat menghubungkan izin kerja khusus ini kapan saja melalui menu &quot;Lihat Detail&quot; di Riwayat Form.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/my-forms"
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-orange-600/20 text-center"
            >
              Lihat Riwayat
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors text-center cursor-pointer"
            >
              Kembali ke Formulir
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Formulir Izin Kerja Eksternal</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <Link href="/home" className="hover:text-orange-600 transition-colors">Beranda</Link>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-orange-600 font-medium">Vendor / Kontraktor</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-orange-700">
              <Shield className="w-3.5 h-3.5" /> JAI/F-01/P.SHE-19
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {createdFormId && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-900 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  Anda sedang meninjau formulir <strong>{createdFormId}</strong>. Silakan ubah data yang perlu diperbaiki lalu klik <strong>Kirim Permohonan</strong> kembali untuk menyimpan perbaikan.
                </span>
              </div>
            </div>
          )}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-900 leading-relaxed">
              <p className="font-bold mb-1">Panduan Pengajuan Kontraktor Eksternal</p>
              <p>
                Lengkapi formulir izin kerja umum ini terlebih dahulu. Setelah diajukan, Anda dapat menambahkan izin pekerjaan khusus (Hot Work, Height Work, atau Workshop) yang otomatis terhubung ke dokumen izin ini.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* ═══ BAGIAN 1: INFORMASI KONTRAKTOR ═══ */}
          <section id="bagian-1">
            <SectionCard
              nomor={1}
              title="Informasi Kontraktor & Jadwal Kerja"
              description="Data identitas subkontraktor, jumlah pekerja, dan durasi pelaksanaan"
              badge="Wajib Diisi"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Nama Perusahaan Kontraktor / Pekerja <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.namaKontraktorPekerja}
                      onChange={(e) => set("namaKontraktorPekerja", e.target.value)}
                      placeholder="Contoh: PT Bangun Prima Mandiri"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Nama Pengawas / PIC Subkontraktor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.namaPengawasPicSubkont}
                      onChange={(e) => set("namaPengawasPicSubkont", e.target.value)}
                      placeholder="Nama PIC kontraktor di lapangan"
                      required
                      className={inputCls}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Terhubung otomatis dengan Pengawas Pekerjaan / User di Bagian 15.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Jumlah Tenaga Kerja (Orang) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.jumlahTenagaKerja}
                      onChange={(e) => set("jumlahTenagaKerja", e.target.value)}
                      placeholder="0"
                      className={`${inputCls} font-bold`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Harus sesuai dengan jumlah sertifikat lisensi yang dilampirkan di Bagian 9.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Tanggal Mulai Kerja <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.tglMulaiKerja}
                      onChange={(e) => set("tglMulaiKerja", e.target.value)}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Tanggal Akhir Kerja (Rencana)
                    </label>
                    <input
                      type="date"
                      value={form.tglAkhirKerjaRencana}
                      onChange={(e) => set("tglAkhirKerjaRencana", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Waktu Mulai Kerja (Format 24 Jam)
                    </label>
                    <TimeInput24 value={form.waktuKerja} onChange={(v) => set("waktuKerja", v)} />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Waktu Selesai (Format 24 Jam)
                    </label>
                    <TimeInput24 value={form.waktuSelesai} onChange={(v) => set("waktuSelesai", v)} />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs sm:text-sm font-bold text-slate-500 mb-1.5 flex items-center gap-2">
                    <span>Aktual Tanggal Kerja Selesai</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      Disabled — Input di /my-forms
                    </span>
                  </label>
                  <input
                    type="date"
                    value={form.actualTanggalKerja}
                    disabled
                    readOnly
                    className={`${inputCls} bg-slate-100 cursor-not-allowed text-slate-400 border-dashed`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Field ini dinonaktifkan pada saat pengajuan. Pengisian dilakukan di halaman <strong>/my-forms</strong> saat pekerjaan selesai.
                  </p>
                </div>

                {/* ── Pemberi Izin / Supervisor Departemen ── */}
                <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h4 className="font-bold text-emerald-950 text-sm">Pemberi Izin / Supervisor Departemen</h4>
                  </div>
                  <p className="text-xs text-emerald-800/80 mb-3">
                    Pilih Supervisor (SPV) dari departemen Anda {userDepartment && userDepartment !== "Unknown" ? `(${userDepartment})` : (form.departemenPengawas ? `(${form.departemenPengawas})` : "")} yang bertindak sebagai approver tahap pertama.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pilih Nama SPV <span className="text-rose-500">*</span>
                      </label>
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
                          setError("");
                        }}
                        className={`${inputCls} bg-white ${!spvPemberiIzin.nama ? "border-amber-300 bg-amber-50/50" : ""}`}
                        required
                      >
                        <option value="">-- Pilih SPV Terkait --</option>
                        {spvOptions.map((spv) => (
                          <option key={spv.id} value={spv.nama}>
                            {spv.nama} {spv.departmen ? `(${spv.departmen})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">NIK SPV</label>
                      <input
                        type="text"
                        value={spvPemberiIzin.nik}
                        onChange={(e) => setSpvPemberiIzin((prev) => ({ ...prev, nik: e.target.value }))}
                        placeholder="Otomatis terisi / ketik manual"
                        className={`${inputCls} bg-white`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </section>

          {/* ═══ BAGIAN 2: SPESIFIKASI PEKERJAAN ═══ */}
          <SectionCard
            nomor={2}
            title="Spesifikasi & Deskripsi Pekerjaan"
            description="Klasifikasi jenis pekerjaan berisiko yang akan dilakukan"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckboxRow
                checked={form.spesifikasiPekerjaan.areaWorkshop}
                onChange={(v) => setGroup("spesifikasiPekerjaan", { areaWorkshop: v })}
                label="Bekerja di area Workshop (las, gerinda, cutting, pengecatan)"
              />
              <CheckboxRow
                checked={form.spesifikasiPekerjaan.ruangTertutup}
                onChange={(v) => setGroup("spesifikasiPekerjaan", { ruangTertutup: v })}
                label="Bekerja di ruang tertutup (confined space)"
              />
              <CheckboxRow
                checked={form.spesifikasiPekerjaan.ketinggian}
                onChange={(v) => setGroup("spesifikasiPekerjaan", { ketinggian: v })}
                label="Bekerja di ketinggian (> 1.8 meter)"
              />
              <CheckboxRow
                checked={form.spesifikasiPekerjaan.teganganTinggi}
                onChange={(v) => setGroup("spesifikasiPekerjaan", { teganganTinggi: v })}
                label="Bekerja di area tegangan tinggi (high voltage)"
              />
              <CheckboxRow
                checked={form.spesifikasiPekerjaan.pemakaianLoto}
                onChange={(v) => setGroup("spesifikasiPekerjaan", { pemakaianLoto: v })}
                label="Penerapan prosedur LOTO (Lockout / Tagout)"
              />
              <CheckboxRow
                checked={form.spesifikasiPekerjaan.forklift}
                onChange={(v) => setGroup("spesifikasiPekerjaan", { forklift: v })}
                label="Mengoperasikan unit Forklift"
              />
              <CheckboxRow
                checked={form.spesifikasiPekerjaan.temperaturTinggi}
                onChange={(v) => setGroup("spesifikasiPekerjaan", { temperaturTinggi: v })}
                label="Bekerja di lingkungan temperatur tinggi"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                Rincian Deskripsi Pekerjaan
              </label>
              <textarea
                rows={3}
                value={form.deskripsiPekerjaan}
                onChange={(e) => set("deskripsiPekerjaan", e.target.value)}
                placeholder="Tuliskan uraian detail pekerjaan yang akan dilaksanakan di area PT. JAI..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                Spesifikasi Lainnya
              </label>
              <input
                type="text"
                value={form.spesifikasiLainnya}
                onChange={(e) => set("spesifikasiLainnya", e.target.value)}
                className={inputCls}
                placeholder="Sebutkan jika ada spesifikasi khusus lainnya..."
              />
            </div>
          </SectionCard>

          {/* ═══ BAGIAN 3: ALAT YANG DIPAKAI ═══ */}
          <SectionCard
            nomor={3}
            title="Peralatan & Kondisi Mesin Kerja"
            description="Daftar mesin/alat kerja yang dibawa serta pemeriksaan kelayakan fisiknya"
          >
            <div className="space-y-2.5">
              <AlatRow
                label="Mesin Potong / Cut Off"
                item={form.alat.mesinPotong}
                onChange={(v) => setGroup("alat", { mesinPotong: v })}
              />
              <AlatRow
                label="Mesin Las / Gerinda"
                item={form.alat.mesinLasGerinda}
                onChange={(v) => setGroup("alat", { mesinLasGerinda: v })}
              />
              <AlatRow
                label="Genset / Generator Listrik"
                item={form.alat.genset}
                onChange={(v) => setGroup("alat", { genset: v })}
              />
              <AlatRow
                label="Tabung Gas (Oksigen / Acetylene / LPG)"
                item={form.alat.tabungGas}
                onChange={(v) => setGroup("alat", { tabungGas: v })}
              />
              <AlatRow
                label="Tangga Listrik / AWP (Aerial Work Platform)"
                item={form.alat.tanggaListrikAwp}
                onChange={(v) => setGroup("alat", { tanggaListrikAwp: v })}
              />
              <AlatRow
                label="Unit Forklift"
                item={form.alat.forklift}
                onChange={(v) => setGroup("alat", { forklift: v })}
              />
              <AlatRow
                label="Lift Barang / Hoist Crane"
                item={form.alat.liftBarang}
                onChange={(v) => setGroup("alat", { liftBarang: v })}
              />
            </div>

            {/* Peralatan Lainnya dengan Kondisi & Tambah Dinamis */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    Peralatan Lainnya
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambahkan mesin atau peralatan kerja tambahan serta periksa kelayakan fisiknya (OK / NG).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAlatLainnya}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Peralatan
                </button>
              </div>

              {alatLainnyaList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                  <p className="text-xs text-slate-400 italic">
                    Belum ada peralatan tambahan. Klik tombol &quot;+ Tambah Peralatan&quot; jika membawa alat lain di luar daftar di atas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alatLainnyaList.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                        <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={item.nama}
                          onChange={(e) => handleUpdateAlatLainnya(item.id, { nama: e.target.value })}
                          placeholder="Masukkan nama peralatan tambahan (contoh: Mesin Bor Duduk, Hand Grinder)..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-400 bg-white"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pl-7 sm:pl-0 shrink-0">
                        <span className="text-xs text-slate-400 font-medium mr-1">Kondisi:</span>
                        {(["ok", "ng"] as const).map((k) => (
                          <button
                            type="button"
                            key={k}
                            onClick={() => handleUpdateAlatLainnya(item.id, { kondisi: k })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              item.kondisi === k
                                ? k === "ok"
                                  ? "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500"
                                  : "bg-rose-600 text-white shadow-xs ring-1 ring-rose-500"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {k.toUpperCase()}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleRemoveAlatLainnya(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
                          title="Hapus peralatan ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* ═══ BAGIAN 4: JSA METHOD (BUAT / UPLOAD JSA) ═══ */}
          <section id="bagian-jsa">
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
              jsaData={jsa}
              setJsaData={setJsa}
              sectionTitle="Bagian 4: Job Safety Analysis (JSA)"
              sectionStyle="workshop"
            />
          </section>

          {/* ═══ BAGIAN 5: LOKASI & PENGAWAS DEPARTEMEN ═══ */}
          <section id="bagian-5">
            <SectionCard
              nomor={5}
              title="Informasi Lokasi Proyek & Pengawas Departemen"
              description="Zona kerja, departemen pengawas internal PT. JAI, dan PIC LOTO"
              badge="Wajib Diisi"
            >
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Lokasi Detail Pekerjaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={form.lokasiPekerjaan}
                  onChange={(e) => set("lokasiPekerjaan", e.target.value)}
                  placeholder="Contoh: Gedung Produksi 2 Area Line A, Rooftop Gedung Utama"
                  required
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <CheckboxRow
                  checked={form.lokasiTipe.dalamGedung}
                  onChange={(v) => setGroup("lokasiTipe", { dalamGedung: v })}
                  label="Dalam Gedung"
                />
                <CheckboxRow
                  checked={form.lokasiTipe.luarGedung}
                  onChange={(v) => setGroup("lokasiTipe", { luarGedung: v })}
                  label="Luar Gedung"
                />
                <CheckboxRow
                  checked={form.lokasiTipe.luarPagarGedung}
                  onChange={(v) => setGroup("lokasiTipe", { luarPagarGedung: v })}
                  label="Luar Pagar"
                />
                <CheckboxRow
                  checked={form.lokasiTipe.diAtasGedung}
                  onChange={(v) => setGroup("lokasiTipe", { diAtasGedung: v })}
                  label="Di Atas Gedung"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Departemen Pengawas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.departemenPengawas}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, departemenPengawas: e.target.value, pengawasBagian: "" }));
                      setIsPengawasOther(false);
                      setPengawasOtherManual("");
                    }}
                    required
                    className={inputCls}
                  >
                    <option value="">-- Pilih Departemen --</option>
                    {departemenOptions.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-slate-800">
                      Pengawas (Bagian) <span className="text-rose-500">*</span>
                    </label>
                    {isPengawasOther && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPengawasOther(false);
                          setPengawasOtherManual("");
                          set("pengawasBagian", "");
                        }}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1 transition-colors"
                        title="Batal manual & pilih dari daftar"
                      >
                        ← Pilih dari daftar
                      </button>
                    )}
                  </div>

                  {isPengawasOther ? (
                    <div className="relative animate-in fade-in duration-200">
                      <input
                        type="text"
                        value={pengawasOtherManual}
                        onChange={(e) => {
                          setPengawasOtherManual(e.target.value);
                          set("pengawasBagian", e.target.value);
                        }}
                        placeholder="Ketik nama pengawas bagian..."
                        required
                        autoFocus
                        className={inputCls}
                      />
                    </div>
                  ) : (
                    <select
                      value={form.pengawasBagian}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          setIsPengawasOther(true);
                          setPengawasOtherManual("");
                          set("pengawasBagian", "");
                        } else {
                          setIsPengawasOther(false);
                          set("pengawasBagian", e.target.value);
                        }
                      }}
                      required
                      disabled={!form.departemenPengawas}
                      className={`${inputCls} ${
                        !form.departemenPengawas ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="">
                        {form.departemenPengawas ? "-- Pilih Pengawas --" : "Pilih departemen terlebih dahulu"}
                      </option>
                      {pengawasOptions
                        .filter((item) => item.departemen === form.departemenPengawas)
                        .map((item) => (
                          <option key={item.id} value={item.nama}>
                            {item.nama} / {item.nik}
                          </option>
                        ))}
                      {form.departemenPengawas && (
                        <option value="__other__">Other (Ketik Manual)</option>
                      )}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  PIC LOTO / Station LOTO
                </label>
                <input
                  type="text"
                  value={form.picLotoStationLoto}
                  onChange={(e) => set("picLotoStationLoto", e.target.value)}
                  className={inputCls}
                  placeholder="Nama PIC LOTO terkait jika menggunakan prosedur LOTO"
                />
              </div>
            </SectionCard>
          </section>

          {/* ═══ BAGIAN 6: KARAKTER BAHAN ═══ */}
          <SectionCard
            nomor={6}
            title="Karakter Bahan yang Dipakai"
            description="Karakteristik bahan kimia atau material berbahaya yang digunakan"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CheckboxRow
                checked={form.bahan.mudahTerbakar}
                onChange={(v) => setGroup("bahan", { mudahTerbakar: v })}
                label="Bahan Mudah Terbakar"
              />
              <CheckboxRow
                checked={form.bahan.mudahMeledak}
                onChange={(v) => setGroup("bahan", { mudahMeledak: v })}
                label="Bahan Mudah Meledak"
              />
              <CheckboxRow
                checked={form.bahan.kimiaBeracunIritan}
                onChange={(v) => setGroup("bahan", { kimiaBeracunIritan: v })}
                label="Kimia Beracun / Iritan"
              />
            </div>
            <input
              type="text"
              value={form.bahanLainnya}
              onChange={(e) => set("bahanLainnya", e.target.value)}
              className={inputCls}
              placeholder="Bahan berbahaya lainnya..."
            />
          </SectionCard>

          {/* ═══ BAGIAN 7: POTENSI DAMPAK LK3 ═══ */}
          <SectionCard
            nomor={7}
            title="Potensi Bahaya & Dampak LK3"
            description="Identifikasi kemungkinan bahaya keselamatan dan lingkungan kerja"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckboxRow
                checked={form.dampak.ledakanKebakaran}
                onChange={(v) => setGroup("dampak", { ledakanKebakaran: v })}
                label="Bahaya Ledakan / Kebakaran"
              />
              <CheckboxRow
                checked={form.dampak.jatuhKetinggian}
                onChange={(v) => setGroup("dampak", { jatuhKetinggian: v })}
                label="Jatuh dari Ketinggian"
              />
              <CheckboxRow
                checked={form.dampak.kepalaTertimpa}
                onChange={(v) => setGroup("dampak", { kepalaTertimpa: v })}
                label="Kepala Tertimpa Benda Keras"
              />
              <CheckboxRow
                checked={form.dampak.kakiTertimpa}
                onChange={(v) => setGroup("dampak", { kakiTertimpa: v })}
                label="Kaki Tertimpa Benda Keras"
              />
              <CheckboxRow
                checked={form.dampak.tumpahanOliBbmB3}
                onChange={(v) => setGroup("dampak", { tumpahanOliBbmB3: v })}
                label="Tumpahan Oli, BBM, atau Limbah B3"
              />
              <CheckboxRow
                checked={form.dampak.tersengatListrik}
                onChange={(v) => setGroup("dampak", { tersengatListrik: v })}
                label="Bahaya Tersengat Aliran Listrik"
              />
              <CheckboxRow
                checked={form.dampak.terjepitMesin}
                onChange={(v) => setGroup("dampak", { terjepitMesin: v })}
                label="Terjepit Putaran Mesin / Komponen Bergerak"
              />
              <CheckboxRow
                checked={form.dampak.tersayatTertusuk}
                onChange={(v) => setGroup("dampak", { tersayatTertusuk: v })}
                label="Tersayat atau Tertusuk Material Tajam"
              />
              <CheckboxRow
                checked={form.dampak.infeksiPernafasan}
                onChange={(v) => setGroup("dampak", { infeksiPernafasan: v })}
                label="Gangguan / Infeksi Pernafasan (Debu/Uap)"
              />
              <CheckboxRow
                checked={form.dampak.iritasiMata}
                onChange={(v) => setGroup("dampak", { iritasiMata: v })}
                label="Iritasi Mata akibat Partikel atau Cairan"
              />
              <CheckboxRow
                checked={form.dampak.radiasiSinarLas}
                onChange={(v) => setGroup("dampak", { radiasiSinarLas: v })}
                label="Paparan Radiasi Sinar Pengelasan"
              />
              <CheckboxRow
                checked={form.dampak.iritasiKulit}
                onChange={(v) => setGroup("dampak", { iritasiKulit: v })}
                label="Iritasi Kulit akibat Paparan Bahan Kimia"
              />
              <CheckboxRow
                checked={form.dampak.kebisingan}
                onChange={(v) => setGroup("dampak", { kebisingan: v })}
                label="Kebisingan Melebihi Ambang Batas (> 85 dB)"
              />
              <CheckboxRow
                checked={form.dampak.keracunanZatKimia}
                onChange={(v) => setGroup("dampak", { keracunanZatKimia: v })}
                label="Keracunan / Intoksikasi Zat Kimia"
              />
            </div>
            <input
              type="text"
              value={form.dampakLainnya}
              onChange={(e) => set("dampakLainnya", e.target.value)}
              className={inputCls}
              placeholder="Dampak bahaya lainnya..."
            />
          </SectionCard>

          {/* ═══ BAGIAN 8: APD WAJIB ═══ */}
          <SectionCard
            nomor={8}
            title="Alat Pelindung Diri (APD) yang Wajib Digunakan"
            description="Perlengkapan proteksi standar dan khusus yang wajib dikenakan di area kerja"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <CheckboxRow checked={form.apd.masker} onChange={(v) => setGroup("apd", { masker: v })} label="Masker Debu" />
              <CheckboxRow checked={form.apd.maskerKimia} onChange={(v) => setGroup("apd", { maskerKimia: v })} label="Masker Kimia / Respirator" />
              <CheckboxRow checked={form.apd.kacamataBiasa} onChange={(v) => setGroup("apd", { kacamataBiasa: v })} label="Kacamata Safety" />
              <CheckboxRow checked={form.apd.kacamataLas} onChange={(v) => setGroup("apd", { kacamataLas: v })} label="Kedok / Kacamata Las" />
              <CheckboxRow checked={form.apd.earPlug} onChange={(v) => setGroup("apd", { earPlug: v })} label="Ear Plug / Muff" />
              <CheckboxRow checked={form.apd.gloves} onChange={(v) => setGroup("apd", { gloves: v })} label="Sarung Tangan Kerja" />
              <CheckboxRow checked={form.apd.fullBodyHarness} onChange={(v) => setGroup("apd", { fullBodyHarness: v })} label="Full Body Harness" />
              <CheckboxRow checked={form.apd.sarungTanganBintil} onChange={(v) => setGroup("apd", { sarungTanganBintil: v })} label="Sarung Tangan Bintil" />
              <CheckboxRow checked={form.apd.sarungTanganListrik} onChange={(v) => setGroup("apd", { sarungTanganListrik: v })} label="Sarung Tangan Listrik" />
              <CheckboxRow checked={form.apd.sarungTanganKulit} onChange={(v) => setGroup("apd", { sarungTanganKulit: v })} label="Sarung Tangan Kulit" />
              <CheckboxRow checked={form.apd.helm} onChange={(v) => setGroup("apd", { helm: v })} label="Safety Helmet" />
              <CheckboxRow checked={form.apd.safetyShoes} onChange={(v) => setGroup("apd", { safetyShoes: v })} label="Safety Shoes" />
              <CheckboxRow checked={form.apd.sepatuKaret} onChange={(v) => setGroup("apd", { sepatuKaret: v })} label="Sepatu Karet Boots" />
              <CheckboxRow checked={form.apd.topiKerja} onChange={(v) => setGroup("apd", { topiKerja: v })} label="Topi Kerja" />
            </div>
            <input
              type="text"
              value={form.apdLainnya}
              onChange={(e) => set("apdLainnya", e.target.value)}
              className={inputCls}
              placeholder="APD lainnya..."
            />
          </SectionCard>

          {/* ═══ BAGIAN 9: UPLOAD LISENSI ═══ */}
          <section id="bagian-lisensi">
            <LicenseUploadSection
              licenseFiles={licenseFiles}
              setLicenseFiles={setLicenseFiles}
              jumlahTenagaKerja={form.jumlahTenagaKerja}
              sectionTitle="Bagian 9: Upload Lisensi & Sertifikasi Kompetensi"
              sectionStyle="workshop"
              required={false}
            />
          </section>

          {/* ═══ BAGIAN 10: APAR ═══ */}
          <SectionCard
            nomor={10}
            title="Kesiapan Alat Pemadam Api Ringan (APAR)"
            description="Tipe APAR yang harus disiapkan di dekat lokasi pelaksanaan kerja"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CheckboxRow
                checked={form.apar.dryPowder}
                onChange={(v) =>
                  setGroup("apar", { dryPowder: v, tidakPerlu: v ? false : form.apar.tidakPerlu })
                }
                label="Dry Chemical Powder"
              />
              <CheckboxRow
                checked={form.apar.gasCair}
                onChange={(v) =>
                  setGroup("apar", { gasCair: v, tidakPerlu: v ? false : form.apar.tidakPerlu })
                }
                label="Gas Cair / CO2"
              />
              <CheckboxRow
                checked={form.apar.tidakPerlu}
                onChange={(v) =>
                  setGroup("apar", v ? { tidakPerlu: true, dryPowder: false, gasCair: false } : { tidakPerlu: false })
                }
                label="Tidak Memerlukan APAR"
              />
            </div>
            <input
              type="text"
              value={form.aparLainnya}
              onChange={(e) => set("aparLainnya", e.target.value)}
              className={inputCls}
              placeholder="Tipe APAR lainnya..."
            />
          </SectionCard>

          {/* ═══ BAGIAN 11: PENGELOLAAN LIMBAH ═══ */}
          <section id="bagian-11">
            <SectionCard
              nomor={11}
              title="Pengelolaan Limbah"
              description="Tanggung jawab pembersihan dan lokasi pembuangan sisa kegiatan pekerjaan"
              badge="Wajib Diisi"
            >
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">Tanggung Jawab Pembuangan Limbah</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CheckboxRow
                    checked={form.limbah.kontraktor}
                    onChange={(v) => setGroup("limbah", { kontraktor: v })}
                    label="Pihak Kontraktor"
                  />
                  <CheckboxRow
                    checked={form.limbah.ptJai}
                    onChange={(v) => setGroup("limbah", { ptJai: v })}
                    label="Pihak PT. JAI"
                  />
                  <CheckboxRow
                    checked={form.limbah.luarJai}
                    onChange={(v) => setGroup("limbah", { luarJai: v })}
                    label="Dibuang Keluar Area JAI"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">Lokasi Pembuangan Limbah di Area JAI</label>
                <input
                  type="text"
                  value={form.limbahLokasiPt}
                  onChange={(e) => set("limbahLokasiPt", e.target.value)}
                  className={inputCls}
                  placeholder="Lokasi penampungan limbah yang disepakati..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mulai Berlaku Izin</label>
                  <p className="w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm text-slate-800 font-semibold">
                    {form.tglMulaiKerja
                      ? new Date(`${form.tglMulaiKerja}T00:00:00`).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "Belum diatur"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sampai Dengan</label>
                  <p className="w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm text-slate-800 font-semibold">
                    {form.tglAkhirKerjaRencana
                      ? new Date(`${form.tglAkhirKerjaRencana}T00:00:00`).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "Belum diatur"}
                  </p>
                </div>
              </div>
            </SectionCard>
          </section>

          {/* ═══ BAGIAN 15: PERNYATAAN ═══ */}
          <section id="bagian-15">
            <SectionCard
              nomor={15}
              title="Pernyataan & Konfirmasi Izin Kerja"
              description="Pernyataan kepatuhan keselamatan kerja dan penanggung jawab user"
              badge="Wajib Konfirmasi"
            >
              <div className="space-y-4">
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    form.pernyataanDiperiksa
                      ? "bg-orange-50/80 border-orange-500 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      form.pernyataanDiperiksa
                        ? "bg-orange-600 border-orange-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {form.pernyataanDiperiksa && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed select-none">
                    Saya menyatakan telah memeriksa seluruh area kerja, memastikan upaya pencegahan bahaya telah diterapkan, dan telah dibahas bersama pihak-pihak terkait. <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.pernyataanDiperiksa}
                    onChange={(e) => set("pernyataanDiperiksa", e.target.checked)}
                    className="sr-only"
                  />
                </label>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-slate-800">
                      Nama Pengawas Pekerjaan / User PT. JAI <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      Terkunci &amp; Otomatis
                    </span>
                  </div>
                  <input
                    type="text"
                    value={form.namaPengawasPicSubkont || form.pengawasPekerjaanUser}
                    disabled
                    placeholder="Otomatis mengikuti Nama Pengawas / PIC Subkontraktor di Bagian 1"
                    className={`${inputCls} bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200 select-none shadow-none`}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Kolom ini dinonaktifkan (disable) dan otomatis terhubung dari <strong>Nama Pengawas / PIC Subkontraktor</strong> pada Bagian 1.
                  </p>
                </div>

                <div className="px-4 py-3 rounded-xl text-xs bg-blue-50/80 text-blue-800 border border-blue-200 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Alur Persetujuan Digital:</strong> SPV {spvPemberiIzin.nama ? `(${spvPemberiIzin.nama})` : ""} → SFO → MGR → Security.
                  </span>
                </div>
              </div>
            </SectionCard>
          </section>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-700">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* ── STICKY BOTTOM ACTION BAR ── */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-3 px-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-500">Izin Kerja Eksternal</span>
                <p className="text-sm font-bold text-slate-900 truncate max-w-xs">{form.namaKontraktorPekerja || "Kontraktor belum diisi"}</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || submitting || licenseFiles.some((f) => f.status === "uploading")}
                  className="flex-1 sm:flex-none px-5 py-2.5 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-600" /> : <Save className="w-4 h-4 text-slate-600" />}
                  <span>Simpan Draft</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || saving || licenseFiles.some((f) => f.status === "uploading")}
                  className="flex-1 sm:flex-none px-7 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : licenseFiles.some((f) => f.status === "uploading") ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Upload Lisensi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Ajukan Ijin Kerja</span>
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

export default function IjinKerjaEksternalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
          Memuat formulir ijin kerja eksternal...
        </div>
      }
    >
      <IjinKerjaEksternalPageInner />
    </Suspense>
  );
}