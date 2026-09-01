// components/DetailModal.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Loader2, AlertCircle, ZoomIn, FileText, Eye, Download, ShieldCheck } from "lucide-react";
import ApprovalQRCard from "@/components/ApprovalQRCard";
import SignaturePad from "@/components/SignaturePad";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formType: "hot-work" | "height-work" | "workshop" | "general-permit";
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

// ── Modal generik untuk konten "Lihat JSA" / "Lihat Safety Induction" ──
function InfoModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

const JsaDisplay = ({ perluJsa, jsaFileUrl, jsaData }: { perluJsa: boolean; jsaFileUrl?: string | null; jsaData?: any }) => {
  if (!perluJsa) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
        <span className="text-sm text-slate-600">JSA <strong>Tidak Diperlukan</strong> untuk pekerjaan ini.</span>
      </div>
    );
  }
  if (jsaData) {
    return (
      <div className="space-y-3 bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-3"><F label="Area" value={jsaData.area} /><F label="Jenis Pekerjaan" value={jsaData.jenisPekerjaan} /><F label="Sect/Dept" value={jsaData.sectDept} /><F label="PIC" value={jsaData.pic} /></div>
        <p className="text-xs font-semibold text-slate-600">Petugas: {(jsaData.petugas || []).filter(Boolean).join(", ") || "-"}</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-xs"><thead className="bg-white"><tr>{["Tanggal", "Jenis Pekerjaan", "Langkah Kerja", "Potensi Bahaya", "Pengendalian", "Saran"].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{(jsaData.rows || []).map((row: any, i: number) => <tr key={i} className="border-t border-green-200 align-top">{[row.tanggal, row.jenisPekerjaan, row.langkahKerja, row.potensiBahaya, row.pengendalian, row.saran].map((v: any, j: number) => <td key={j} className="p-2 whitespace-pre-wrap">{v || "-"}</td>)}</tr>)}</tbody></table></div>
      </div>
    );
  }
  if (jsaFileUrl) {
    const fileName = jsaFileUrl.split("/").pop() || "Dokumen JSA";
    const fileUrl = jsaFileUrl.startsWith("http") ? jsaFileUrl : `${window.location.origin}${jsaFileUrl}`;
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">File JSA Terlampir</p>
            <p className="text-xs text-green-600 truncate">{fileName}</p>
          </div>
        </div>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 ml-3">
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

function FotoLisensiPreview({ src, nama, index }: { src: string; nama: string; index: number }) {
  const [showFull, setShowFull] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setShowFull(true)}
        className="relative group rounded-lg overflow-hidden border-2 border-slate-200 hover:border-orange-400 transition-colors"
        title={`Lihat lisensi ${nama}`}>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowFull(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
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

function ApprovalGrid({
  p, formType, isEksternal,
}: {
  p: any;
  formType: "hot-work" | "height-work" | "workshop";
  isEksternal: boolean;
}) {
  const common = { formId: p.id_form, formType };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isEksternal && (
        <ApprovalQRCard {...common}
          label="Kontraktor" role="kontraktor"
          approved={p.kontraktor_approved} approvedBy={p.kontraktor_approved_by}
          approvedNik={p.kontraktor_nik} approvedAt={p.kontraktor_approved_at}
          fallbackName={p.nama_kontraktor}
        />
      )}
      <ApprovalQRCard {...common}
        label="SPV Terkait" role="spv"
        approved={p.spv_approved} approvedBy={p.spv_approved_by}
        approvedNik={p.spv_nik} approvedAt={p.spv_approved_at}
        fallbackName={p.spv_terkait}
      />
      <ApprovalQRCard {...common}
        label="Admin K3" role="admin_k3"
        approved={p.admin_k3_approved} approvedBy={p.admin_k3_approved_by}
        approvedNik={p.admin_k3_nik} approvedAt={p.admin_k3_approved_at}
      />
      <ApprovalQRCard {...common}
        label="SFO" role="sfo"
        approved={p.sfo_approved} approvedBy={p.sfo_approved_by}
        approvedNik={p.sfo_nik} approvedAt={p.sfo_approved_at}
        fallbackName={p.sfo}
      />
      <ApprovalQRCard {...common}
        label="MR / PGA MGR" role="mr_pga"
        approved={p.mr_pga_approved} approvedBy={p.mr_pga_approved_by}
        approvedNik={p.mr_pga_nik} approvedAt={p.mr_pga_approved_at}
        fallbackName={p.mr_pga_mgr}
      />
    </div>
  );
}

// ── Kotak tanda tangan sederhana (tanpa QR) — dipakai untuk Kontraktor & Security ──
function SignatureBox({ label, signatureUrl }: { label: string; signatureUrl?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-bold text-slate-500 uppercase mb-1">{label} (Tanda Tangan)</p>
      {signatureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={signatureUrl} alt={`TTD ${label}`} className="h-16 border border-slate-100 rounded bg-white" />
      ) : (
        <p className="text-xs text-slate-400 italic">Belum tanda tangan</p>
      )}
    </div>
  );
}

// ── Approval grid khusus general-permit (Kontraktor/SPV/Security/SFO/SMR) ──
// Kontraktor & Security memakai tanda tangan manual (bukan QR).
function GeneralPermitApprovalGrid({ p }: { p: any }) {
  const common = { formId: p.id_form, formType: "general-permit" };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SignatureBox label="Kontraktor" signatureUrl={p.kontraktor_signature_url} />
      <ApprovalQRCard {...common}
        label="SPV" role="spv"
        approved={p.spv_approved} approvedBy={p.spv_approved_by}
        approvedAt={p.spv_approved_at}
      />
      <div className="rounded-xl border border-slate-200 p-3 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className={`w-4 h-4 ${p.security_approved ? "text-green-600" : "text-slate-400"}`} />
          <p className="text-sm font-semibold text-slate-800">Security</p>
          {p.security_approved && (
            <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Disetujui</span>
          )}
        </div>
        {p.security_approved_by && (
          <p className="text-xs text-slate-500">{p.security_approved_by} — {formatDate(p.security_approved_at)}</p>
        )}
      </div>
      <SignatureBox label="Security" signatureUrl={p.security_signature_url} />
      <ApprovalQRCard {...common}
        label="SFO" role="sfo"
        approved={p.sfo_approved} approvedBy={p.sfo_approved_by}
        approvedAt={p.sfo_approved_at}
      />
      <ApprovalQRCard {...common}
        label="SMR / PGA Manager" role="pga"
        approved={p.pga_approved} approvedBy={p.pga_approved_by}
        approvedAt={p.pga_approved_at}
      />
    </div>
  );
}

// ── Job-forms terkait (khusus general-permit) ──────────────────
type LinkedJobForm = { id_form: string; status: string; tanggal: string; jenis: string } | null;
interface LinkedJobForms { hotWork: LinkedJobForm; heightWork: LinkedJobForm; workshop: LinkedJobForm }

const JOB_TYPE_META: Record<string, { label: string; shortLabel: string; icon: string; addHref: (id: string) => string }> = {
  hotWork: { label: "Ijin Kerja Panas (Hot Work)", shortLabel: "Hot Work", icon: "🔥", addHref: (id) => `/form-permit/form/hot-work?id_ijin_kerja=${id}` },
  heightWork: { label: "Ijin Kerja Ketinggian (Height Work)", shortLabel: "Height Work", icon: "⚠️", addHref: (id) => `/form-permit/form/height-work?id_ijin_kerja=${id}` },
  workshop: { label: "Ijin Kerja Workshop", shortLabel: "Workshop", icon: "🔧", addHref: (id) => `/form-permit/form/workshop?id_ijin_kerja=${id}` },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  submitted: { label: "Diajukan", cls: "bg-blue-100 text-blue-700" },
  approved: { label: "Disetujui", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
};

function LinkedJobFormsSection({ generalPermitId, onOpenDetail, onOpenEdit }: {
  generalPermitId: string;
  onOpenDetail: (jenis: string, idForm: string) => void;
  onOpenEdit: (jenis: string, idForm: string) => void;
}) {
  const [jobForms, setJobForms] = useState<LinkedJobForms | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/form-permit/api/forms/general-permit/${generalPermitId}/job-forms`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setJobForms(json?.data ?? null))
      .catch(() => setJobForms(null))
      .finally(() => setLoading(false));
  }, [generalPermitId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat form terkait...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(["hotWork", "heightWork", "workshop"] as const).map((key) => {
        const meta = JOB_TYPE_META[key];
        const jf = jobForms?.[key];

        if (jf) {
          const statusMeta = STATUS_META[jf.status] || STATUS_META.submitted;
          const canEdit = jf.status === "draft" || jf.status === "rejected";
          return (
            <div key={key} className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0">{meta.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      Form {meta.shortLabel} sudah diajukan
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate">{jf.id_form}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusMeta.cls}`}>
                  {statusMeta.label}
                </span>
              </div>
              {jf.status === "rejected" && (
                <p className="text-xs text-red-600 mt-2">Form ini ditolak — perbaiki dan kirim ulang, bukan buat baru.</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenDetail(jf.jenis, jf.id_form)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Lihat Detail
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onOpenEdit(jf.jenis, jf.id_form)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    {jf.status === "rejected" ? "Perbaiki" : "Edit"}
                  </button>
                )}
              </div>
            </div>
          );
        }

        return (
          <a key={key} href={meta.addHref(generalPermitId)}
            className="w-full flex items-center gap-2.5 p-3 border-2 border-dashed border-slate-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors">
            <span className="text-orange-500 font-bold text-lg leading-none">+</span>
            <span className="text-sm font-medium text-slate-600">Tambah {meta.label}</span>
          </a>
        );
      })}
    </div>
  );
}

// ── Download PDF Button ───────────────────────────────────────
function DownloadPdfButton({
  data, formType,
}: {
  data: any;
  formType: "hot-work" | "height-work" | "workshop";
}) {
  const [generating, setGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownload = async () => {
    setGenerating(true);
    setPdfError(null);
    try {
      const { generatePermitPdf } = await import("@/lib/generatePermitPdf");
      await generatePermitPdf(data, formType);
    } catch (err: any) {
      console.error("[PDF]", err);
      setPdfError("Gagal generate PDF. Silakan coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700
                   disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg
                   transition-colors shadow-sm"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating PDF…</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </>
        )}
      </button>
      {pdfError && <p className="text-xs text-red-500">{pdfError}</p>}
    </div>
  );
}

// ── Safety Induction Status Card (untuk job-type forms terkait) ───────────
function SafetyInductionStatusCard({ safetyInduction, parentIdForm }: { safetyInduction: any; parentIdForm: string }) {
  const status = safetyInduction?.status;
  const isApproved = status === "approved";
  const isDraft = status === "draft";
  const hasData = safetyInduction && (safetyInduction.namaSubcont || safetyInduction.aktivitasPekerjaan);

  if (!hasData) {
    return (
      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Belum Diisi</p>
          <p className="text-xs text-amber-600">Safety Induction untuk Ijin Kerja Eksternal {parentIdForm} belum diisi oleh Security.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${isApproved ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className={`w-4 h-4 ${isApproved ? "text-green-600" : "text-blue-600"}`} />
          <span className="text-sm font-semibold text-slate-800">Safety Induction</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isApproved ? "bg-green-100 text-green-700" : isDraft ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
          }`}>
          {isApproved ? "✓ Disetujui" : isDraft ? "Draft" : "Belum Selesai"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-xs text-slate-500">Nama Subcont</span><p className="font-semibold text-slate-800 mt-0.5">{safetyInduction.namaSubcont || "-"}</p></div>
        <div><span className="text-xs text-slate-500">Aktivitas Pekerjaan</span><p className="font-semibold text-slate-800 mt-0.5">{safetyInduction.aktivitasPekerjaan || "-"}</p></div>
      </div>
      {safetyInduction.namaPekerja?.filter(Boolean).length > 0 && (
        <div>
          <span className="text-xs text-slate-500">Jumlah Pekerja Terdaftar</span>
          <p className="font-semibold text-slate-800 mt-0.5">{safetyInduction.namaPekerja.filter(Boolean).length} orang</p>
        </div>
      )}
      {isApproved && safetyInduction.approvedBy && (
        <p className="text-xs text-green-700">✓ Disetujui oleh: <strong>{safetyInduction.approvedBy}</strong></p>
      )}
      <p className="text-xs text-slate-500">Dari form induk: <span className="font-mono font-semibold">{parentIdForm}</span></p>
    </div>
  );
}

// ── General Permit Safety Induction Card ──────────────────────
// UPDATED: "Koordinator Sub Contractor" dan "Security" sekarang menampilkan
// gambar tanda tangan asli (kontraktorSignatureUrl / securitySignatureUrl),
// bukan lagi field teks kosong. Tanda tangan Koordinator Sub Contractor
// SAMA dengan tanda tangan Kontraktor yang sudah dibubuhkan di stage 1
// (form induk) — tidak perlu tanda tangan terpisah.
function GeneralPermitSafetyInductionCard({
  safetyInduction, kontraktorSignatureUrl, securitySignatureUrl,
}: {
  safetyInduction: any;
  kontraktorSignatureUrl?: string | null;
  securitySignatureUrl?: string | null;
}) {
  const status = safetyInduction?.status;
  const isApproved = status === "approved";
  const isDraft = status === "draft";
  const hasData = safetyInduction && (safetyInduction.namaSubcont || safetyInduction.aktivitasPekerjaan);

  if (!hasData) {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Safety Induction Belum Diisi</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Menunggu Security untuk mengisi form Safety Induction berdasarkan data Ijin Kerja Eksternal ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between p-3 rounded-lg ${isApproved ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"
        }`}>
        <div className="flex items-center gap-2">
          <FileText className={`w-4 h-4 ${isApproved ? "text-green-600" : "text-blue-600"}`} />
          <span className={`text-sm font-semibold ${isApproved ? "text-green-800" : "text-blue-800"}`}>
            Status Safety Induction
          </span>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isApproved ? "bg-green-100 text-green-700" : isDraft ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
          }`}>
          {isApproved ? "✓ Disetujui Security" : isDraft ? "📝 Draft" : "⏳ Pending"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">Nama Subcont</span>
          <p className="font-semibold text-slate-800 mt-0.5">{safetyInduction.namaSubcont || "-"}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">Aktivitas Pekerjaan</span>
          <p className="font-semibold text-slate-800 mt-0.5">{safetyInduction.aktivitasPekerjaan || "-"}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">Koord. Kerja / No. HP</span>
          <p className="font-semibold text-slate-800 mt-0.5">{safetyInduction.koordinatNoHp || "-"}</p>
        </div>
      </div>

      {safetyInduction.namaPekerja?.filter(Boolean).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-600 mb-2">Daftar Nama Pekerja ({safetyInduction.namaPekerja.filter(Boolean).length} orang)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {safetyInduction.namaPekerja.filter(Boolean).map((name: string, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                <span className="text-xs text-slate-400 w-5 shrink-0 text-right">{i + 1}</span>
                <span className="text-slate-700">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tanda tangan: Koordinator Sub Contractor (= TTD Kontraktor) & Security ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-3">
        <div className="p-3 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">Koordinator Sub Contractor (Tanda Tangan)</span>
          {kontraktorSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kontraktorSignatureUrl} alt="TTD Koordinator Sub Contractor" className="h-14 mt-1.5 border border-slate-200 rounded bg-white" />
          ) : (
            <p className="text-xs text-slate-400 italic mt-1">Belum tanda tangan</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${isApproved ? "bg-green-50" : "bg-slate-50"}`}>
          <span className="text-xs text-slate-500">Security (Tanda Tangan)</span>
          {securitySignatureUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={securitySignatureUrl} alt="TTD Security" className="h-14 mt-1.5 border border-slate-200 rounded bg-white" />
              {isApproved && safetyInduction.approvedBy && (
                <p className="text-xs text-green-600 mt-1.5">✓ Disetujui oleh: {safetyInduction.approvedBy}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 italic mt-1">Belum tanda tangan</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Blok tanda tangan Kontraktor (dipakai di general-permit & job forms) ──
function ContractorSignatureBlock({
  endpoint, onSigned,
}: { endpoint: string; onSigned: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async (dataUrl: string) => {
    setSubmitting(true);
    setError("");
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, "signature.png");
      fd.append("context", "kontraktor");
      const uploadRes = await fetch("/form-permit/api/upload/signature", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload tanda tangan gagal");

      const signRes = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureUrl: uploadJson.url }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson.error || "Gagal menyimpan tanda tangan");
      onSigned();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-orange-800">Tanda Tangan Kontraktor Diperlukan</p>
      <p className="text-xs text-orange-700">
        Form ini sudah diajukan dan menunggu tanda tangan Kontraktor sebelum lanjut ke tahap approval berikutnya.
        Tanda tangan ini juga akan tercatat sebagai tanda tangan Koordinator Sub Contractor pada Safety Induction.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <SignaturePad
        onConfirm={handleConfirm}
        disabled={submitting}
        confirmLabel={submitting ? "Menyimpan..." : "Konfirmasi Tanda Tangan"}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function DetailModal({ isOpen, onClose, formId, formType }: DetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeInfoModal, setActiveInfoModal] = useState<"jsa" | "safety-induction" | null>(null);

  const loadFormData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/form-permit/api/forms/${formType}/${formId}`);
      if (!res.ok) throw new Error("Gagal memuat data form");
      const json = await res.json();
      let detail = json.data;
      if (detail?.id_ijin_kerja) {
        const parentRes = await fetch(`/form-permit/api/forms/general-permit/${detail.id_ijin_kerja}`);
        if (parentRes.ok) {
          const parent = await parentRes.json();
          const parentData = parent.data;
          detail = {
            ...detail,
            perlu_jsa: detail.perlu_jsa ?? parentData?.perlu_jsa,
            jsa_data: detail.jsa_data ?? parentData?.jsa_data,
            jsa_file_url: detail.jsa_file_url ?? parentData?.jsa_file_url,
            safety_induction: parentData?.safety_induction,
            _parent_id_form: parentData?.id_form,
            _parent_nama_kontraktor: parentData?.nama_kontraktor_pekerja,
            _parent_kontraktor_signature_url: parentData?.kontraktor_signature_url,
            _parent_security_signature_url: parentData?.security_signature_url,
          };
        }
      }
      setData(detail);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [formType, formId]);

  useEffect(() => {
    if (!isOpen || !formId) return;
    loadFormData();
  }, [isOpen, formId, loadFormData]);

  // Reset modal info setiap kali DetailModal dibuka/tutup
  useEffect(() => {
    if (!isOpen) setActiveInfoModal(null);
  }, [isOpen]);

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
          ].filter(x => x.d && x.m && x.m !== "00:00").map(x => (
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
          {p.jumlah_fire_blanket && <div className="mt-3"><F label="Jumlah Fire Blanket" value={p.jumlah_fire_blanket} /></div>}
          {p.permintaan_tambahan && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg">
              <span className="text-xs font-semibold text-amber-700">Permintaan Tambahan:</span>
              <p className="text-sm text-slate-700 mt-1">{p.permintaan_tambahan}</p>
            </div>
          )}
        </MS>
        {isEksternal && p.status === "submitted" && p.current_stage === 1 && !p.kontraktor_signature_url && (
          <MS title="Tanda Tangan Kontraktor">
            <ContractorSignatureBlock
              endpoint={`/form-permit/api/approval/hot-work/${p.id_form}/sign`}
              onSigned={loadFormData}
            />
          </MS>
        )}
        <MS title="Bagian 5: Persetujuan & Verifikasi QR">
          <ApprovalGrid p={p} formType="hot-work" isEksternal={isEksternal} />
        </MS>
        {p.catatan_reject && <MS title="Catatan Penolakan"><p className="text-sm text-red-600">{p.catatan_reject}</p></MS>}
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

  const renderHeightWork = () => {
    if (!data) return null;
    const p = data;
    const isEksternal = p.tipe_perusahaan === "eksternal";
    const petugasList = Array.from({ length: 10 }, (_, i) => i + 1)
      .map(i => ({
        index: i, nama: p[`nama_petugas_${i}`],
        sehat: isTruthy(p[`petugas_${i}_sehat`]), lisensi: p[`foto_lisensi_${i}`],
      }))
      .filter(row => row.nama);

    return (
      <>
        <MS title="Bagian 1: Informasi Dasar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="ID Form" value={p.id_form} />
            <F label="Tanggal Pembuatan" value={formatDate(p.tanggal)} />
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
        <MS title="Bagian 5: Pengecekan Helm, Body Harness & Lanyard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-2">Helm</h5>
              <BF label="Helm - Kondisi baik" value={p.helm_kondisi_baik} />
              <h5 className="text-xs font-semibold text-slate-600 mb-2 mt-3">Body Harness</h5>
              <BF label="Webbing - Kondisi baik" value={p.webbing_kondisi_baik} />
              <BF label="D-Ring - Kondisi baik" value={p.dring_kondisi_baik} />
              <BF label="Gesper - Kondisi baik" value={p.gesper_kondisi_baik} />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-2">Lanyard</h5>
              <BF label="Absorber & Timbes baik" value={p.absorter_dan_timbes_kondisi_baik} />
              <BF label="Snap Hook - Kondisi baik" value={p.snap_hook_kondisi_baik} />
              <BF label="Rope Lanyard - Kondisi baik" value={p.rope_lanyard_kondisi_baik} />
            </div>
          </div>
        </MS>
        {isEksternal && p.status === "submitted" && p.current_stage === 1 && !p.kontraktor_signature_url && (
          <MS title="Tanda Tangan Kontraktor">
            <ContractorSignatureBlock
              endpoint={`/form-permit/api/approval/height-work/${p.id_form}/sign`}
              onSigned={loadFormData}
            />
          </MS>
        )}
        <MS title="Bagian 6: Persetujuan & Verifikasi QR">
          <ApprovalGrid p={p} formType="height-work" isEksternal={isEksternal} />
        </MS>
        {p.catatan_reject && <MS title="Catatan Penolakan"><p className="text-sm text-red-600">{p.catatan_reject}</p></MS>}
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
          ].filter(x => x.d && x.m && x.m !== "00:00").map(x => (
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
        {isEksternal && p.status === "submitted" && p.current_stage === 1 && !p.kontraktor_signature_url && (
          <MS title="Tanda Tangan Kontraktor">
            <ContractorSignatureBlock
              endpoint={`/form-permit/api/approval/workshop/${p.id_form}/sign`}
              onSigned={loadFormData}
            />
          </MS>
        )}
        <MS title="Bagian 5: Persetujuan & Verifikasi QR">
          <ApprovalGrid p={p} formType="workshop" isEksternal={isEksternal} />
        </MS>
        {p.catatan_reject && <MS title="Catatan Penolakan"><p className="text-sm text-red-600">{p.catatan_reject}</p></MS>}
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

  // ── GENERAL PERMIT (IJIN KERJA EKSTERNAL) ──────────────────────
  const renderGeneralPermit = () => {
    if (!data) return null;
    const p = data;
    return (
      <>
        <MS title="Bagian 1: Informasi Kontraktor/Pekerja">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="ID Form" value={p.id_form} />
            <F label="Tanggal Pembuatan" value={formatDate(p.tanggal)} />
            <F label="Status" value={p.status} />
            <F label="Nama Kontraktor/Pekerja" value={p.nama_kontraktor_pekerja} />
            <F label="Nama Pengawas/PIC Subkont" value={p.nama_pengawas_pic_subkont} />
            <F label="Jumlah Tenaga Kerja" value={p.jumlah_tenaga_kerja} />
            <F label="Tanggal Mulai Kerja" value={formatDate(p.tgl_mulai_kerja)} />
            <F label="Tanggal Akhir Kerja" value={formatDate(p.tgl_akhir_kerja_rencana)} />
            <F label="Waktu Kerja" value={formatTime(p.waktu_kerja)} />
          </div>
        </MS>
        <MS title="Bagian 2 & 4: Spesifikasi & Lokasi Pekerjaan">
          <F label="Deskripsi Pekerjaan" value={p.deskripsi_pekerjaan} />
          <F label="Lokasi Pekerjaan" value={p.lokasi_pekerjaan} />
        </MS>

        {p.status === "submitted" && p.current_stage === 1 && !p.kontraktor_signature_url && (
          <MS title="Tanda Tangan Kontraktor">
            <ContractorSignatureBlock
              endpoint={`/form-permit/api/forms/general-permit/${p.id_form}/sign-kontraktor`}
              onSigned={loadFormData}
            />
          </MS>
        )}

        <MS title="Bagian 12: Form Jenis Pekerjaan Terkait">
          {p.kontraktor_signature_url ? (
            <LinkedJobFormsSection
              generalPermitId={p.id_form}
              onOpenDetail={(jenis, idForm) => {
                window.dispatchEvent(new CustomEvent("open-form-detail", { detail: { jenis, idForm } }));
              }}
              onOpenEdit={(jenis, idForm) => {
                window.dispatchEvent(new CustomEvent("open-form-edit", { detail: { jenis, idForm } }));
              }}
            />
          ) : (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">Tanda tangan Kontraktor pada form induk diperlukan sebelum menambahkan form jenis pekerjaan.</p>
            </div>
          )}
        </MS>

        <MS title="Bagian 13: Persetujuan & Verifikasi QR">
          <GeneralPermitApprovalGrid p={p} />
        </MS>
        {p.catatan_reject && <MS title="Catatan Penolakan"><p className="text-sm text-red-600">{p.catatan_reject}</p></MS>}
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

  const renderContent = () => {
    if (formType === "hot-work") return renderHotWork();
    if (formType === "height-work") return renderHeightWork();
    if (formType === "general-permit") return renderGeneralPermit();
    return renderWorkshop();
  };

  // Info untuk tombol header — berbeda tergantung formType
  const showJsaButton = !!data;
  const showSafetyInductionButton =
    !!data && (formType === "general-permit" || !!data._parent_id_form);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">

        {/* Sticky header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Detail Form</h2>
              {data && <p className="text-xs text-slate-400 mt-0.5 font-mono">{data.id_form}</p>}
            </div>
            <div className="flex items-center gap-3">
              {data && !loading && formType !== "general-permit" && (
                <DownloadPdfButton data={data} formType={formType} />
              )}
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tombol lampiran JSA / Safety Induction */}
          {(showJsaButton || showSafetyInductionButton) && !loading && (
            <div className="flex items-center gap-2 mt-3">
              {showJsaButton && (
                <button
                  type="button"
                  onClick={() => setActiveInfoModal("jsa")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                             bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Lihat JSA
                </button>
              )}
              {showSafetyInductionButton && (
                <button
                  type="button"
                  onClick={() => setActiveInfoModal("safety-induction")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                             bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Lihat Safety Induction
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
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
          ) : renderContent()}
        </div>
      </div>

      {/* ── Modal JSA ── */}
      {activeInfoModal === "jsa" && data && (
        <InfoModal title="Dokumen JSA (Job Safety Analysis)" onClose={() => setActiveInfoModal(null)}>
          <JsaDisplay perluJsa={!!data.perlu_jsa} jsaFileUrl={data.jsa_file_url} jsaData={data.jsa_data} />
        </InfoModal>
      )}

      {/* ── Modal Safety Induction ── */}
      {activeInfoModal === "safety-induction" && data && (
        <InfoModal title="Safety Induction" onClose={() => setActiveInfoModal(null)}>
          {formType === "general-permit" ? (
            data.security_approved ? (
              <GeneralPermitSafetyInductionCard
                safetyInduction={data.safety_induction}
                kontraktorSignatureUrl={data.kontraktor_signature_url}
                securitySignatureUrl={data.security_signature_url}
              />
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-500">Safety Induction akan tampil setelah Security menandatangani dan menyetujui.</p>
              </div>
            )
          ) : (
            <SafetyInductionStatusCard
              safetyInduction={data.safety_induction}
              parentIdForm={data._parent_id_form}
            />
          )}
        </InfoModal>
      )}
    </div>
  );
}