// app/admin-users/page.tsx
// UPDATED v3: Tambah fitur "Lihat Password" per baris.
//   - Password diambil on-demand (klik tombol mata), tidak di-load semua sekaligus.
//   - State per row disimpan di Map<id, { visible, password, loading, error }>.
//   - Backend /api/admin-users/[id]/password memvalidasi ulang role & departmen.
//   - Kolom Password muncul di tabel Administrator Departemen dan tabel Approver.
//   - SPV: tombol Password hanya aktif di tabel worker (tabel Approver tidak ada untuk SPV).
//
// UPDATED v2: Halaman sekarang mendukung dua mode berdasarkan role login:
//
//   role = admin  → tampilan lengkap: Tab "Administrator Departemen" + Tab "Approver"
//                   Auth check tetap memastikan hanya admin yang bisa akses.
//
//   role = spv    → hanya tampil tab "Kelola Akun Departemen"
//                   Tidak ada tab Approver.
//                   Form tambah tidak menampilkan field departemen
//                   (otomatis mengikuti departemen SPV dari backend).
//
// SECURITY:
//   - Departemen TIDAK dikirim dari form SPV ke backend.
//   - Backend (/api/auth/register) memaksa departemen = departemen SPV dari DB.
//   - Middleware tetap melindungi route /admin-users hanya untuk approver roles.
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, UserPlus, Eye, EyeOff, AlertCircle,
  CheckCircle, X, Users, ChevronLeft, Search,
  Building2, Mail, Phone, Calendar, BadgeCheck, BadgeX,
  Trash2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface AdminUser {
  id:         number;
  nama:       string;
  username:   string;
  departmen:  string | null;
  perusahaan: string | null;
  email:      string | null;
  no_telp:    string | null;
  is_active:  boolean;
  created_at: string;
}

interface ApproverUser {
  id:         number;
  nama:       string;
  username:   string;
  role:       string;
  departmen:  string | null;
  email:      string | null;
  no_telp:    string | null;
  is_active:  boolean;
  created_at: string;
}

interface DeleteTarget {
  id:       number;
  nama:     string;
  username: string;
  role:     string;
}

// Mode tampilan halaman
type PageMode = "admin" | "spv" | null;
type ActiveTab = "admin" | "approver";

const DEPARTMENT_OPTIONS = [
  "QA", "ENG", "MTC", "PRODUKSI",
  "NYS", "FATP-Exim", "MPC-WHS", "PGA",
] as const;

const APPROVER_ROLE_OPTIONS = [
  { value: "spv",        label: "SPV" },
  { value: "kontraktor", label: "Kontraktor" },
  { value: "admin_k3",   label: "Admin K3" },
  { value: "sfo",        label: "SFO" },
  { value: "smr",        label: "SMR" },
  { value: "admin",      label: "Admin" },
] as const;

const ROLE_LABEL: Record<string, string> = {
  spv:        "SPV",
  kontraktor: "Kontraktor",
  admin_k3:   "Admin K3",
  sfo:        "SFO",
  smr:        "SMR",
  admin:      "Admin",
  worker:     "Worker",
  firewatch:  "Fire Watch",
};

const ROLE_COLOR: Record<string, string> = {
  spv:        "bg-blue-50 text-blue-700 border-blue-200",
  kontraktor: "bg-purple-50 text-purple-700 border-purple-200",
  admin_k3:   "bg-orange-50 text-orange-700 border-orange-200",
  sfo:        "bg-teal-50 text-teal-700 border-teal-200",
  smr:        "bg-rose-50 text-rose-700 border-rose-200",
  admin:      "bg-slate-50 text-slate-700 border-slate-300",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Delete Modal (tidak berubah) ──────────────────────────────
function DeleteModal({
  target, onConfirm, onCancel, loading,
}: {
  target:    DeleteTarget;
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Hapus Akun</h3>
              <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-300 mb-4">
          Yakin ingin menghapus akun ini? Histori form yang sudah dibuat akan tetap tersimpan.
        </p>
        <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 font-medium">Nama</span>
            <span className="font-bold text-white">{target.nama}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 font-medium">Username</span>
            <code className="text-xs bg-slate-600 text-slate-200 px-2 py-0.5 rounded font-mono">
              @{target.username}
            </code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 font-medium">Role</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
              ${ROLE_COLOR[target.role] ?? "bg-slate-600 text-slate-200 border-slate-500"}`}>
              {ROLE_LABEL[target.role] ?? target.role}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300
                       font-semibold rounded-lg text-sm transition-colors disabled:opacity-60">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600
                       hover:bg-red-500 text-white font-bold rounded-lg text-sm transition-colors
                       disabled:opacity-60">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Trash2 className="w-4 h-4" />}
            Hapus Akun
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function AdminUsersPage() {
  const router = useRouter();

  // ── Auth: tentukan mode halaman ───────────────────────────────
  const [pageMode,     setPageMode]     = useState<PageMode>(null);
  const [authChecked,  setAuthChecked]  = useState(false);
  // Departemen SPV yang sedang login (dipakai untuk label di UI)
  const [spvDepartmen, setSpvDepartmen] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/form-permit/api/auth/me", { credentials: "include" });
        if (!res.ok) { router.replace("/login/approver"); return; }
        const data = await res.json();
        const role = data.user?.role;

        if (role === "admin") {
          setPageMode("admin");
          setAuthChecked(true);
        } else if (role === "spv") {
          setPageMode("spv");
          setSpvDepartmen(data.user?.departmen ?? null);
          setAuthChecked(true);
        } else {
          // Role lain tidak boleh akses halaman ini
          router.replace("/home");
        }
      } catch {
        router.replace("/home");
      }
    };
    checkAuth();
  }, [router]);

  // ── Tab state (hanya untuk admin) ────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>("admin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "approver") setActiveTab("approver");
  }, []);

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    router.replace(`/admin-users${tab === "approver" ? "?tab=approver" : ""}`);
  };

  // ── Data: Administrator Departemen (worker) ───────────────────
  const [adminUsers,   setAdminUsers]   = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError,   setAdminError]   = useState("");

  const fetchAdminUsers = useCallback(async () => {
    setAdminLoading(true);
    setAdminError("");
    try {
      const res = await fetch("/form-permit/api/admin-users", { credentials: "include" });
      if (!res.ok) { setAdminError("Gagal memuat data."); return; }
      const data = await res.json();
      setAdminUsers(data.users ?? []);
      // Update spvDepartmen dari response jika ada (fresh dari DB)
      if (data.spv_departmen) setSpvDepartmen(data.spv_departmen);
    } catch {
      setAdminError("Terjadi kesalahan koneksi.");
    } finally {
      setAdminLoading(false);
    }
  }, []);

  // ── Data: Approver (hanya untuk admin) ───────────────────────
  const [approverUsers,   setApproverUsers]   = useState<ApproverUser[]>([]);
  const [approverLoading, setApproverLoading] = useState(true);
  const [approverError,   setApproverError]   = useState("");

  const fetchApproverUsers = useCallback(async () => {
    setApproverLoading(true);
    setApproverError("");
    try {
      const res = await fetch("/form-permit/api/admin-users/approvers", { credentials: "include" });
      if (!res.ok) { setApproverError("Gagal memuat data."); return; }
      const data = await res.json();
      setApproverUsers(data.users ?? []);
    } catch {
      setApproverError("Terjadi kesalahan koneksi.");
    } finally {
      setApproverLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    fetchAdminUsers();
    if (pageMode === "admin") fetchApproverUsers();
  }, [authChecked, pageMode, fetchAdminUsers, fetchApproverUsers]);

  // ── Shared filter state ───────────────────────────────────────
  const [search,     setSearch]     = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => { setSearch(""); setFilterDept(""); }, [activeTab]);

  // ── Filtered lists ────────────────────────────────────────────
  const filteredAdmin = adminUsers.filter(u => {
    const q = search.toLowerCase();
    const matchSearch =
      u.nama.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.perusahaan ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q);
    const matchDept = filterDept ? u.departmen === filterDept : true;
    return matchSearch && matchDept;
  });

  const filteredApprovers = approverUsers.filter(u => {
    const q = search.toLowerCase();
    const matchSearch =
      u.nama.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q);
    const matchDept = filterDept ? u.departmen === filterDept : true;
    return matchSearch && matchDept;
  });

  // ── Delete state ──────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Password reveal state ─────────────────────────────────────
  // Map<userId, { visible, password, loading, error }>
  // Disimpan per baris, diambil on-demand saat tombol mata diklik.
  // Tidak pernah dikirim lewat endpoint daftar user.
  type PassState = { visible: boolean; password: string | null; loading: boolean; error: string | null };
  const [revealedPasswords, setRevealedPasswords] = useState<Map<number, PassState>>(new Map());

  const getPassState = (id: number): PassState =>
    revealedPasswords.get(id) ?? { visible: false, password: null, loading: false, error: null };

  const setPassState = (id: number, patch: Partial<PassState>) =>
    setRevealedPasswords(prev => {
      const next = new Map(prev);
      next.set(id, { ...getPassState(id), ...patch });
      return next;
    });

  const handleTogglePassword = async (userId: number) => {
    const state = getPassState(userId);

    // Sudah ada password di state → toggle visible saja, tanpa fetch ulang
    if (state.password !== null) {
      setPassState(userId, { visible: !state.visible });
      return;
    }

    // Belum ada → fetch dari backend
    setPassState(userId, { loading: true, error: null, visible: false });
    try {
      const res = await fetch(
        `/form-permit/api/admin-users/${userId}/password`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        setPassState(userId, {
          loading: false,
          error: data.error ?? "Gagal mengambil password.",
          visible: false,
        });
        return;
      }
      setPassState(userId, { loading: false, password: data.password, visible: true, error: null });
    } catch {
      setPassState(userId, { loading: false, error: "Terjadi kesalahan koneksi.", visible: false });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/form-permit/api/admin-users/${deleteTarget.id}`, {
        method: "DELETE", credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteTarget(null);
        setSuccessMsg(`ERROR: ${data.error || "Gagal menghapus akun."}`);
        setTimeout(() => setSuccessMsg(""), 5000);
        return;
      }
      setDeleteTarget(null);
      setSuccessMsg("Akun berhasil dihapus.");
      setTimeout(() => setSuccessMsg(""), 4000);
      if (deleteTarget.role === "worker") fetchAdminUsers();
      else fetchApproverUsers();
    } catch {
      setDeleteTarget(null);
      setSuccessMsg("ERROR: Terjadi kesalahan koneksi.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } finally {
      setDeleting(false);
    }
  };

  // ── Modal state ───────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const openModal  = () => { resetForm(); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); resetForm(); };

  // ── Form state — Administrator Departemen ─────────────────────
  const emptyAdminForm = {
    nama: "", username: "", perusahaan: "",
    departmen: "", email: "", no_telp: "",
    password: "", password2: "",
  };
  const [adminForm,   setAdminForm]   = useState(emptyAdminForm);
  const [showPass,    setShowPass]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // ── Form state — Approver ─────────────────────────────────────
  const emptyApproverForm = {
    nama: "", username: "", role: "",
    departmen: "", email: "", no_telp: "",
    password: "", password2: "",
  };
  const [approverForm, setApproverForm] = useState(emptyApproverForm);

  // ── Username check ────────────────────────────────────────────
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus,   setUsernameStatus]   =
    useState<"available" | "taken" | "invalid" | null>(null);
  const [usernameError, setUsernameError] = useState("");

  // Mode SPV selalu di tab "admin"; mode admin ikut activeTab
  const isAdminFormActive = pageMode === "spv" || activeTab === "admin";

  const currentUsername = isAdminFormActive
    ? adminForm.username
    : approverForm.username;

  const resetForm = () => {
    setAdminForm(emptyAdminForm);
    setApproverForm(emptyApproverForm);
    setFormError("");
    setFormSuccess(false);
    setShowPass(false);
    setUsernameStatus(null);
    setUsernameError("");
  };

  const handleAdminChange = (key: string, value: string) => {
    setAdminForm(prev => ({ ...prev, [key]: value }));
    if (key === "username") { setUsernameStatus(null); setUsernameError(""); }
  };

  const handleApproverChange = (key: string, value: string) => {
    setApproverForm(prev => ({ ...prev, [key]: value }));
    if (key === "username") { setUsernameStatus(null); setUsernameError(""); }
    if (key === "role" && value !== "spv") {
      setApproverForm(prev => ({ ...prev, role: value, departmen: "" }));
      return;
    }
  };

  useEffect(() => {
    if (!currentUsername) { setUsernameStatus(null); setUsernameError(""); return; }
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!regex.test(currentUsername)) {
      setUsernameStatus("invalid");
      setUsernameError("Username harus 3-20 karakter, hanya huruf, angka, dan underscore");
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await fetch(
          `/form-permit/api/auth/check-username?username=${encodeURIComponent(currentUsername)}`
        );
        if (res.ok) {
          const data = await res.json();
          setUsernameStatus(data.available ? "available" : "taken");
          if (!data.available) setUsernameError("Username sudah digunakan");
        }
      } catch { /* ignore */ }
      finally { setCheckingUsername(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentUsername]);

  // ── Submit: Administrator Departemen ─────────────────────────
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!adminForm.username)            { setFormError("Username wajib diisi"); return; }
    if (usernameStatus !== "available") { setFormError("Username tidak tersedia atau tidak valid"); return; }
    // Departemen wajib hanya untuk mode admin (SPV: backend tentukan sendiri)
    if (pageMode === "admin" && !adminForm.departmen) {
      setFormError("Departemen wajib dipilih"); return;
    }
    if (adminForm.email) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(adminForm.email)) { setFormError("Format email tidak valid"); return; }
    }
    if (adminForm.password !== adminForm.password2) { setFormError("Password dan konfirmasi password tidak cocok"); return; }
    if (adminForm.password.length < 6)  { setFormError("Password minimal 6 karakter"); return; }

    setSubmitting(true);
    try {
      // SECURITY: SPV tidak mengirim field departemen — backend akan tentukan sendiri
      const payload: Record<string, string> = {
        nama:      adminForm.nama,
        username:  adminForm.username,
        perusahaan: adminForm.perusahaan,
        email:     adminForm.email,
        no_telp:   adminForm.no_telp,
        password:  adminForm.password,
      };
      // Hanya admin yang boleh mengirim departemen
      if (pageMode === "admin") payload.departmen = adminForm.departmen;

      const res = await fetch("/form-permit/api/auth/register", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Registrasi gagal"); return; }
      setFormSuccess(true);
      await fetchAdminUsers();
      setTimeout(() => {
        closeModal();
        const dept = data.departmen ? ` (${data.departmen})` : "";
        setSuccessMsg(`Akun "${adminForm.nama}"${dept} berhasil dibuat.`);
        setTimeout(() => setSuccessMsg(""), 4000);
      }, 1200);
    } catch {
      setFormError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit: Approver (hanya untuk admin) ──────────────────────
  const handleApproverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!approverForm.username)           { setFormError("Username wajib diisi"); return; }
    if (usernameStatus !== "available")   { setFormError("Username tidak tersedia atau tidak valid"); return; }
    if (!approverForm.role)               { setFormError("Role Approver wajib dipilih"); return; }
    if (approverForm.role === "spv" && !approverForm.departmen) {
                                            setFormError("Departemen wajib dipilih untuk SPV"); return; }
    if (approverForm.email) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(approverForm.email)) { setFormError("Format email tidak valid"); return; }
    }
    if (approverForm.password !== approverForm.password2) { setFormError("Password dan konfirmasi password tidak cocok"); return; }
    if (approverForm.password.length < 6) { setFormError("Password minimal 6 karakter"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/form-permit/api/auth/register-approver", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approverForm),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Registrasi gagal"); return; }
      setFormSuccess(true);
      await fetchApproverUsers();
      setTimeout(() => {
        closeModal();
        setSuccessMsg(`Akun approver "${approverForm.nama}" berhasil dibuat.`);
        setTimeout(() => setSuccessMsg(""), 4000);
      }, 1200);
    } catch {
      setFormError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading auth ──────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  const inputCls  = "w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors";
  const selectCls = "w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors appearance-none";

  const isAdminTab    = activeTab === "admin";
  const isApproverTab = activeTab === "approver";
  const isErrorMsg    = successMsg.startsWith("ERROR:");

  // Tombol CTA berganti label sesuai mode & tab
  const ctaLabel = pageMode === "spv"
    ? "Tambah Akun"
    : isAdminTab ? "Tambah Administrator" : "Tambah Approver";

  // Judul tabel untuk mode SPV
  const spvPageTitle = spvDepartmen
    ? `Kelola Akun Departemen ${spvDepartmen}`
    : "Kelola Akun Departemen";

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  PT. JATIM AUTOCOMP INDONESIA
                </h1>
                <p className="text-xs text-slate-500">WIRING HARNESS MANUFACTURER</p>
              </div>
            </div>
            <Link href="/home"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600
                         hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page title + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-orange-500" />
              <h2 className="text-2xl font-bold text-slate-900">
                {pageMode === "spv" ? spvPageTitle : "Manajemen Pengguna"}
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {pageMode === "spv"
                ? `Kelola akun yang bertugas membuat Form Permit di departemen ${spvDepartmen ?? "Anda"}.`
                : "Kelola akun administrator departemen dan approver sistem izin kerja."}
            </p>
          </div>
          <button onClick={openModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500
                       text-white font-semibold rounded-xl text-sm transition-colors
                       shadow-md shadow-orange-600/20 whitespace-nowrap self-start sm:self-auto">
            <UserPlus className="w-4 h-4" />
            {ctaLabel}
          </button>
        </div>

        {/* Tab Switch — hanya untuk admin */}
        {pageMode === "admin" && (
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
            <button onClick={() => switchTab("admin")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isAdminTab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              Administrator Departemen
            </button>
            <button onClick={() => switchTab("approver")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isApproverTab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              Approver
            </button>
          </div>
        )}

        {/* Success / Error toast */}
        {successMsg && (
          <div className={`flex items-center gap-2 border rounded-xl px-4 py-3 mb-5
            ${isErrorMsg ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            {isErrorMsg
              ? <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              : <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
            <p className={`text-sm font-medium ${isErrorMsg ? "text-red-700" : "text-green-700"}`}>
              {isErrorMsg ? successMsg.replace("ERROR: ", "") : successMsg}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={
                pageMode === "spv" || isAdminTab
                  ? "Cari nama, username, perusahaan, email..."
                  : "Cari nama, username, email..."
              }
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm
                         text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2
                         focus:ring-orange-400 focus:border-transparent transition-colors"
            />
          </div>
          {/* Filter departmen: hanya admin yang perlu, SPV sudah auto-filter dari backend */}
          {pageMode === "admin" && (
            <div className="relative">
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="pl-4 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm
                           text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400
                           focus:border-transparent transition-colors appearance-none cursor-pointer">
                <option value="">Semua Departemen</option>
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabel Administrator Departemen ── */}
        {/* Tampil jika: mode SPV (selalu), atau mode admin dengan tab "admin" */}
        {(pageMode === "spv" || (pageMode === "admin" && isAdminTab)) && (
          <>
            <p className="text-xs text-slate-400 mb-3">
              {adminLoading
                ? "Memuat data…"
                : `Menampilkan ${filteredAdmin.length} dari ${adminUsers.length} akun`}
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {adminError ? (
                <div className="flex items-center gap-2 p-6 text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{adminError}</span>
                </div>
              ) : adminLoading ? (
                <div className="space-y-0 divide-y divide-slate-100">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4 px-6 py-4">
                      <div className="w-36 h-4 bg-slate-100 animate-pulse rounded" />
                      <div className="w-24 h-4 bg-slate-100 animate-pulse rounded" />
                      <div className="w-20 h-4 bg-slate-100 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredAdmin.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Users className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Belum ada data administrator</p>
                  <p className="text-xs mt-1">
                    {pageMode === "spv"
                      ? `Klik "Tambah Akun" untuk membuat akun baru di departemen ${spvDepartmen ?? "Anda"}.`
                      : `Klik "Tambah Administrator" untuk membuat akun baru.`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Nama</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Username</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Departemen</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Perusahaan</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">No. Telepon</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Dibuat Pada</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Password</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdmin.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{user.nama}</p>
                          </td>
                          <td className="px-4 py-4">
                            <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                              {user.username}
                            </code>
                          </td>
                          <td className="px-4 py-4">
                            {user.departmen ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                {user.departmen}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[140px]">{user.perusahaan ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {user.email ? (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate max-w-[160px]">{user.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {user.no_telp ? (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span>{user.no_telp}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {user.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                <BadgeCheck className="w-3 h-3" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <BadgeX className="w-3 h-3" /> Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs">{formatDate(user.created_at)}</span>
                            </div>
                          </td>
                          {/* ── Kolom Password ── */}
                          <td className="px-4 py-4 text-center">
                            {(() => {
                              const ps = getPassState(user.id);
                              return (
                                <div className="flex items-center gap-2 justify-center min-w-[120px]">
                                  {ps.loading ? (
                                    <span className="w-4 h-4 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin inline-block" />
                                  ) : ps.error ? (
                                    <span
                                      title={ps.error}
                                      className="text-xs text-red-500 truncate max-w-[100px]"
                                    >
                                      {ps.error.includes("sebelum fitur") ? "Belum tersedia" : ps.error}
                                    </span>
                                  ) : ps.visible && ps.password ? (
                                    <>
                                      <code className="text-xs font-mono bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded select-all">
                                        {ps.password}
                                      </code>
                                      <button
                                        onClick={() => handleTogglePassword(user.id)}
                                        title="Sembunyikan password"
                                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                                      >
                                        <EyeOff className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleTogglePassword(user.id)}
                                      title="Lihat password"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                                                 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg
                                                 transition-colors border border-slate-200"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Lihat
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => setDeleteTarget({
                                id: user.id, nama: user.nama,
                                username: user.username, role: "worker",
                              })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold
                                         text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors
                                         border border-red-200">
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB: Approver — hanya untuk admin ── */}
        {pageMode === "admin" && isApproverTab && (
          <>
            <p className="text-xs text-slate-400 mb-3">
              {approverLoading
                ? "Memuat data…"
                : `Menampilkan ${filteredApprovers.length} dari ${approverUsers.length} akun`}
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {approverError ? (
                <div className="flex items-center gap-2 p-6 text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{approverError}</span>
                </div>
              ) : approverLoading ? (
                <div className="space-y-0 divide-y divide-slate-100">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4 px-6 py-4">
                      <div className="w-36 h-4 bg-slate-100 animate-pulse rounded" />
                      <div className="w-24 h-4 bg-slate-100 animate-pulse rounded" />
                      <div className="w-20 h-4 bg-slate-100 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredApprovers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Users className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Belum ada data approver</p>
                  <p className="text-xs mt-1">Klik &quot;Tambah Approver&quot; untuk membuat akun baru.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Nama</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Username</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Role</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Departemen</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">No. Telepon</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Dibuat Pada</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Password</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredApprovers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{user.nama}</p>
                          </td>
                          <td className="px-4 py-4">
                            <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                              {user.username}
                            </code>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLOR[user.role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {ROLE_LABEL[user.role] ?? user.role}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {user.departmen && user.departmen !== "Unknown" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                {user.departmen}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {user.email ? (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate max-w-[160px]">{user.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {user.no_telp ? (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span>{user.no_telp}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {user.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                <BadgeCheck className="w-3 h-3" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <BadgeX className="w-3 h-3" /> Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs">{formatDate(user.created_at)}</span>
                            </div>
                          </td>
                          {/* ── Kolom Password (hanya admin) ── */}
                          <td className="px-4 py-4 text-center">
                            {(() => {
                              const ps = getPassState(user.id);
                              return (
                                <div className="flex items-center gap-2 justify-center min-w-[120px]">
                                  {ps.loading ? (
                                    <span className="w-4 h-4 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin inline-block" />
                                  ) : ps.error ? (
                                    <span
                                      title={ps.error}
                                      className="text-xs text-red-500 truncate max-w-[100px]"
                                    >
                                      {ps.error.includes("sebelum fitur") ? "Belum tersedia" : ps.error}
                                    </span>
                                  ) : ps.visible && ps.password ? (
                                    <>
                                      <code className="text-xs font-mono bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded select-all">
                                        {ps.password}
                                      </code>
                                      <button
                                        onClick={() => handleTogglePassword(user.id)}
                                        title="Sembunyikan password"
                                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                                      >
                                        <EyeOff className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleTogglePassword(user.id)}
                                      title="Lihat password"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                                                 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg
                                                 transition-colors border border-slate-200"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Lihat
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => setDeleteTarget({
                                id: user.id, nama: user.nama,
                                username: user.username, role: user.role,
                              })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold
                                         text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors
                                         border border-red-200">
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════
          Modal Register
      ══════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md
                         max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-500/20 rounded-lg">
                  <UserPlus className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {pageMode === "spv"
                      ? `Tambah Akun Departemen ${spvDepartmen ?? ""}`
                      : isAdminTab ? "Tambah Administrator Departemen" : "Tambah Akun Approver"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pageMode === "spv"
                      ? `Akun baru akan otomatis masuk departemen ${spvDepartmen ?? "Anda"}.`
                      : isAdminTab
                        ? "Buat akun administrator yang bertugas membuat Form Permit."
                        : "Buat akun approver untuk proses persetujuan izin kerja."}
                  </p>
                </div>
              </div>
              <button onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              {formSuccess ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-7 h-7 text-green-400" />
                  </div>
                  <p className="text-white font-semibold mb-1">Akun Berhasil Dibuat!</p>
                  <p className="text-slate-400 text-sm">Menutup modal dan memperbarui tabel…</p>
                </div>
              ) : (
                <>
                  {formError && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-3 mb-5">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-400 text-sm">{formError}</p>
                    </div>
                  )}

                  {/* ── FORM: Administrator Departemen ──
                      Tampil: mode SPV (selalu), atau mode admin dengan tab "admin"
                  ── */}
                  {(pageMode === "spv" || (pageMode === "admin" && isAdminTab)) && (
                    <form onSubmit={handleAdminSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Nama Lengkap <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={adminForm.nama}
                          onChange={e => handleAdminChange("nama", e.target.value)}
                          placeholder="Nama sesuai KTP" required className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Username <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={adminForm.username}
                          onChange={e => handleAdminChange("username", e.target.value)}
                          placeholder="3-20 karakter, huruf/angka/underscore" required
                          className={`${inputCls} ${
                            usernameStatus === "available" ? "border-green-500" :
                            usernameStatus === "taken" || usernameStatus === "invalid" ? "border-red-500" : ""
                          }`}
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                          {checkingUsername && (
                            <>
                              <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                              <p className="text-xs text-slate-400">Memeriksa ketersediaan…</p>
                            </>
                          )}
                          {!checkingUsername && usernameStatus === "available" && (
                            <p className="text-xs text-green-400">✓ Username tersedia</p>
                          )}
                          {!checkingUsername && (usernameStatus === "taken" || usernameStatus === "invalid") && (
                            <p className="text-xs text-red-400">✗ {usernameError}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Perusahaan / Kontraktor <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={adminForm.perusahaan}
                          onChange={e => handleAdminChange("perusahaan", e.target.value)}
                          placeholder="PT JAI / PT Kontraktor ABC" required className={inputCls} />
                      </div>

                      {/* Departemen: hanya tampil untuk admin, bukan SPV */}
                      {pageMode === "admin" && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Departemen <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <select value={adminForm.departmen}
                              onChange={e => handleAdminChange("departmen", e.target.value)}
                              required
                              className={`${selectCls} ${adminForm.departmen ? "text-white" : "text-slate-500"}`}>
                              <option value="" disabled>- Pilih Departemen -</option>
                              {DEPARTMENT_OPTIONS.map(d => (
                                <option key={d} value={d} className="text-white bg-slate-700">{d}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info departmen untuk SPV */}
                      {pageMode === "spv" && spvDepartmen && (
                        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2.5">
                          <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                          <p className="text-blue-300 text-xs">
                            Akun akan otomatis masuk departemen <span className="font-bold">{spvDepartmen}</span>
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                        <input type="email" value={adminForm.email}
                          onChange={e => handleAdminChange("email", e.target.value)}
                          placeholder="user@company.com (opsional)" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">No. Telepon</label>
                        <input type="text" value={adminForm.no_telp}
                          onChange={e => handleAdminChange("no_telp", e.target.value)}
                          placeholder="08xx-xxxx-xxxx (opsional)" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input type={showPass ? "text" : "password"} value={adminForm.password}
                            onChange={e => handleAdminChange("password", e.target.value)}
                            placeholder="Minimal 6 karakter" required className={`${inputCls} pr-11`} />
                          <button type="button" onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Konfirmasi Password <span className="text-red-400">*</span>
                        </label>
                        <input type={showPass ? "text" : "password"} value={adminForm.password2}
                          onChange={e => handleAdminChange("password2", e.target.value)}
                          placeholder="Ulangi password" required className={inputCls} />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={closeModal}
                          className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg text-sm transition-colors">
                          Batal
                        </button>
                        <button type="submit" disabled={submitting}
                          className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                          {submitting
                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses…</>
                            : <><UserPlus className="w-4 h-4" /> Buat Akun</>}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ── FORM: Approver — hanya untuk admin ── */}
                  {pageMode === "admin" && isApproverTab && (
                    <form onSubmit={handleApproverSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Nama Lengkap <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={approverForm.nama}
                          onChange={e => handleApproverChange("nama", e.target.value)}
                          placeholder="Nama sesuai KTP" required className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Username <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={approverForm.username}
                          onChange={e => handleApproverChange("username", e.target.value)}
                          placeholder="3-20 karakter, huruf/angka/underscore" required
                          className={`${inputCls} ${
                            usernameStatus === "available" ? "border-green-500" :
                            usernameStatus === "taken" || usernameStatus === "invalid" ? "border-red-500" : ""
                          }`}
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                          {checkingUsername && (
                            <>
                              <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                              <p className="text-xs text-slate-400">Memeriksa ketersediaan…</p>
                            </>
                          )}
                          {!checkingUsername && usernameStatus === "available" && (
                            <p className="text-xs text-green-400">✓ Username tersedia</p>
                          )}
                          {!checkingUsername && (usernameStatus === "taken" || usernameStatus === "invalid") && (
                            <p className="text-xs text-red-400">✗ {usernameError}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Role Approver <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <select value={approverForm.role}
                            onChange={e => handleApproverChange("role", e.target.value)}
                            required
                            className={`${selectCls} ${approverForm.role ? "text-white" : "text-slate-500"}`}>
                            <option value="" disabled>- Pilih Role -</option>
                            {APPROVER_ROLE_OPTIONS.map(r => (
                              <option key={r.value} value={r.value} className="text-white bg-slate-700">{r.label}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      {approverForm.role === "spv" && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Departemen <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <select value={approverForm.departmen}
                              onChange={e => handleApproverChange("departmen", e.target.value)}
                              required
                              className={`${selectCls} ${approverForm.departmen ? "text-white" : "text-slate-500"}`}>
                              <option value="" disabled>- Pilih Departemen -</option>
                              {DEPARTMENT_OPTIONS.map(d => (
                                <option key={d} value={d} className="text-white bg-slate-700">{d}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                        <input type="email" value={approverForm.email}
                          onChange={e => handleApproverChange("email", e.target.value)}
                          placeholder="user@company.com (opsional)" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">No. Telepon</label>
                        <input type="text" value={approverForm.no_telp}
                          onChange={e => handleApproverChange("no_telp", e.target.value)}
                          placeholder="08xx-xxxx-xxxx (opsional)" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input type={showPass ? "text" : "password"} value={approverForm.password}
                            onChange={e => handleApproverChange("password", e.target.value)}
                            placeholder="Minimal 6 karakter" required className={`${inputCls} pr-11`} />
                          <button type="button" onClick={() => setShowPass(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Konfirmasi Password <span className="text-red-400">*</span>
                        </label>
                        <input type={showPass ? "text" : "password"} value={approverForm.password2}
                          onChange={e => handleApproverChange("password2", e.target.value)}
                          placeholder="Ulangi password" required className={inputCls} />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={closeModal}
                          className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg text-sm transition-colors">
                          Batal
                        </button>
                        <button type="submit" disabled={submitting}
                          className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                          {submitting
                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses…</>
                            : <><UserPlus className="w-4 h-4" /> Buat Akun</>}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}