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
  Trash2, Pencil, ChevronDown,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ── Types ──────────────────────────────────────────────────────
interface AdminUser {
  id:         number;
  nama:       string;
  username:   string;
  nik:        string | null;
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
  nik:        string | null;
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
  { value: "security",   label: "Security" },
  { value: "admin",      label: "Admin" },
  { value: "pengawas",   label: "Pengawas Dept" },
  { value: "purchasing", label: "Purchasing" },
] as const;

const ROLE_LABEL: Record<string, string> = {
  spv:        "SPV",
  kontraktor: "Kontraktor",
  admin_k3:   "Admin K3",
  sfo:        "SFO",
  smr:        "SMR",
  security:   "Security",
  admin:      "Admin",
  worker:     "Worker",
  firewatch:  "Fire Watch",
  pengawas:   "Pengawas Dept",
  purchasing: "Purchasing",
};

const ROLE_COLOR: Record<string, string> = {
  spv:        "bg-blue-50 text-blue-700 border-blue-200",
  kontraktor: "bg-purple-50 text-purple-700 border-purple-200",
  admin_k3:   "bg-orange-50 text-orange-700 border-orange-200",
  sfo:        "bg-teal-50 text-teal-700 border-teal-200",
  smr:        "bg-rose-50 text-rose-700 border-rose-200",
  admin:      "bg-slate-50 text-slate-700 border-slate-300",
  pengawas:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  purchasing: "bg-amber-50 text-amber-700 border-amber-200",
  worker:     "bg-cyan-50 text-cyan-700 border-cyan-200",
  firewatch:  "bg-amber-50 text-amber-700 border-amber-200",
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
        const res = await fetch("/api/auth/me", { credentials: "include" });
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
      const res = await fetch("/api/admin-users", { credentials: "include" });
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
      const res = await fetch("/api/admin-users/approvers", { credentials: "include" });
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
        `/api/admin-users/${userId}/password`,
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
      const res = await fetch(`/api/admin-users/${deleteTarget.id}`, {
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
    departmen: "", email: "", nik: "", no_telp: "",
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
    departmen: "", email: "", nik: "", no_telp: "",
    password: "", password2: "",
  };
  const [approverForm, setApproverForm] = useState(emptyApproverForm);

  // ── State Tambah Purchasing / Pengawas ──────────────────────
  const [ppModalOpen, setPpModalOpen] = useState(false);
  const [ppRole, setPpRole] = useState<"purchasing" | "pengawas">("purchasing");
  const [ppNama, setPpNama] = useState("");
  const [ppNik, setPpNik] = useState("");
  const [ppUsername, setPpUsername] = useState("");
  const [ppDepartmen, setPpDepartmen] = useState("");
  const [ppPassword, setPpPassword] = useState("");
  const [ppPassword2, setPpPassword2] = useState("");
  const [ppShowPass, setPpShowPass] = useState(false);
  const [ppSubmitting, setPpSubmitting] = useState(false);
  const [ppError, setPpError] = useState("");
  const [ppSuccess, setPpSuccess] = useState(false);

  const openPpModal = () => {
    setPpRole("purchasing");
    setPpNama("");
    setPpNik("");
    setPpUsername("");
    setPpDepartmen("");
    setPpPassword("");
    setPpPassword2("");
    setPpShowPass(false);
    setPpError("");
    setPpSuccess(false);
    setPpModalOpen(true);
  };

  const closePpModal = () => {
    if (ppSubmitting) return;
    setPpModalOpen(false);
  };

  const handlePpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPpError("");

    if (!ppNama.trim()) {
      setPpError("Nama lengkap wajib diisi");
      return;
    }
    if (!ppNik.trim()) {
      setPpError("NIK wajib diisi");
      return;
    }
    const nikRe = /^[0-9]{4,20}$/;
    if (!nikRe.test(ppNik.trim())) {
      setPpError("Format NIK tidak valid (4-20 digit angka)");
      return;
    }
    if (!ppUsername.trim()) {
      setPpError("Username wajib diisi");
      return;
    }
    const userRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!userRegex.test(ppUsername.trim())) {
      setPpError("Username harus 3-20 karakter, hanya huruf, angka, dan underscore");
      return;
    }
    if (ppRole === "pengawas" && !ppDepartmen) {
      setPpError("Departemen wajib dipilih untuk Pengawas Dept");
      return;
    }
    if (ppPassword.length < 6) {
      setPpError("Password minimal 6 karakter");
      return;
    }
    if (ppPassword !== ppPassword2) {
      setPpError("Password dan konfirmasi password tidak cocok");
      return;
    }

    setPpSubmitting(true);
    try {
      const res = await fetch("/api/auth/register-approver", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: ppNama.trim(),
          nik: ppNik.trim(),
          username: ppUsername.trim(),
          role: ppRole,
          departmen: ppRole === "pengawas" ? ppDepartmen : null,
          password: ppPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPpError(data.error || "Registrasi gagal");
        return;
      }

      setPpSuccess(true);
      await fetchApproverUsers();
      setTimeout(() => {
        setPpModalOpen(false);
        const roleLabel = ppRole === "purchasing" ? "Purchasing" : `Pengawas Dept (${ppDepartmen})`;
        setSuccessMsg(`Akun ${roleLabel} "${ppNama}" berhasil dibuat.`);
        setTimeout(() => setSuccessMsg(""), 4000);
      }, 1200);
    } catch {
      setPpError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setPpSubmitting(false);
    }
  };

  // ── Edit modal state ──────────────────────────────────────────
  interface EditUserData {
    id: number;
    type: "admin" | "approver";
    nama: string;
    username: string;
    nik: string;
    departmen: string;
    perusahaan: string;
    email: string;
    no_telp: string;
    role: string;
    is_active: boolean;
    password: string;
  }

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<EditUserData | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState("");
  const [editShowPass, setEditShowPass] = useState(false);

  const handleOpenEditAdmin = (u: AdminUser) => {
    setEditUser({
      id: u.id,
      type: "admin",
      nama: u.nama,
      username: u.username,
      nik: u.nik ?? "",
      departmen: u.departmen ?? "",
      perusahaan: u.perusahaan ?? "",
      email: u.email ?? "",
      no_telp: u.no_telp ?? "",
      role: "worker",
      is_active: u.is_active,
      password: "",
    });
    setEditFormError("");
    setEditShowPass(false);
    setEditModalOpen(true);
  };

  const handleOpenEditApprover = (u: ApproverUser) => {
    setEditUser({
      id: u.id,
      type: "approver",
      nama: u.nama,
      username: u.username,
      nik: u.nik ?? "",
      departmen: u.departmen ?? "",
      perusahaan: "",
      email: u.email ?? "",
      no_telp: u.no_telp ?? "",
      role: u.role,
      is_active: u.is_active,
      password: "",
    });
    setEditFormError("");
    setEditShowPass(false);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditFormError("");

    if (!editUser.nama.trim()) {
      setEditFormError("Nama lengkap wajib diisi");
      return;
    }
    if (!editUser.username.trim()) {
      setEditFormError("Username wajib diisi");
      return;
    }
    if (!editUser.email.trim()) {
      setEditFormError("Email wajib diisi");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(editUser.email)) {
      setEditFormError("Format email tidak valid");
      return;
    }
    if (editUser.nik.trim()) {
      const nikRe = /^[0-9]{4,20}$/;
      if (!nikRe.test(editUser.nik.trim())) {
        setEditFormError("Format NIK tidak valid (4-20 digit angka)");
        return;
      }
    }
    if (editUser.type === "approver" && editUser.role === "spv" && !editUser.departmen) {
      setEditFormError("Departemen wajib dipilih untuk SPV");
      return;
    }
    if (editUser.password && editUser.password.length < 6) {
      setEditFormError("Password baru minimal 6 karakter");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/admin-users/${editUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editUser.nama,
          username: editUser.username,
          nik: editUser.nik || null,
          departmen: editUser.departmen || null,
          perusahaan: editUser.perusahaan || null,
          email: editUser.email,
          no_telp: editUser.no_telp || null,
          role: editUser.role,
          is_active: editUser.is_active,
          ...(editUser.password ? { password: editUser.password } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditFormError(data.error || "Gagal memperbarui data user");
        return;
      }

      setEditModalOpen(false);
      setSuccessMsg(data.message || `Akun "${editUser.nama}" berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(""), 4000);

      if (editUser.type === "admin") {
        await fetchAdminUsers();
      } else {
        await fetchApproverUsers();
      }
    } catch {
      setEditFormError("Terjadi kesalahan koneksi saat memperbarui user.");
    } finally {
      setEditSubmitting(false);
    }
  };

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
          `/api/auth/check-username?username=${encodeURIComponent(currentUsername)}`
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
    if (!adminForm.email.trim())        { setFormError("Email wajib diisi"); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(adminForm.email)) { setFormError("Format email tidak valid"); return; }
    if (!adminForm.nik.trim())          { setFormError("NIK wajib diisi"); return; }
    const nikRe = /^[0-9]{4,20}$/;
    if (!nikRe.test(adminForm.nik.trim())) { setFormError("Format NIK tidak valid"); return; }
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
        nik:       adminForm.nik,
        no_telp:   adminForm.no_telp,
        password:  adminForm.password,
      };
      // Hanya admin yang boleh mengirim departemen
      if (pageMode === "admin") payload.departmen = adminForm.departmen;

      const res = await fetch("/api/auth/register", {
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
    if (!approverForm.email.trim())       { setFormError("Email wajib diisi"); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(approverForm.email)) { setFormError("Format email tidak valid"); return; }
    if (!approverForm.nik.trim())         { setFormError("NIK wajib diisi"); return; }
    const nikRe = /^[0-9]{4,20}$/;
    if (!nikRe.test(approverForm.nik.trim())) { setFormError("Format NIK tidak valid"); return; }
    if (approverForm.password !== approverForm.password2) { setFormError("Password dan konfirmasi password tidak cocok"); return; }
    if (approverForm.password.length < 6) { setFormError("Password minimal 6 karakter"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register-approver", {
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
      <Sidebar />
      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-orange-600 shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {pageMode === "spv" ? spvPageTitle : "Manajemen Pengguna"}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                {pageMode === "spv"
                  ? `Kelola akun yang bertugas membuat Form Permit di departemen ${spvDepartmen ?? "Anda"}.`
                  : "Kelola akun administrator departemen dan approver sistem izin kerja."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              {pageMode === "admin" && (
                <button
                  type="button"
                  onClick={openPpModal}
                  className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs sm:text-sm border border-indigo-200/80 transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  title="Tambah Akun Purchasing atau Pengawas Departemen"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>+ Purchasing / Pengawas</span>
                </button>
              )}
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-orange-600/20 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>{ctaLabel}</span>
              </button>
            </div>
          </div>

          {/* Tab Switch — hanya untuk admin */}
          {pageMode === "admin" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5 mb-5">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => switchTab("admin")}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isAdminTab
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Administrator Departemen</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${
                      isAdminTab
                        ? "bg-orange-50 text-orange-700 border border-orange-200/60"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {adminUsers.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("approver")}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isApproverTab
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Approver</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${
                      isApproverTab
                        ? "bg-orange-50 text-orange-700 border border-orange-200/60"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {approverUsers.length}
                  </span>
                </button>
              </div>

              <div className="text-xs font-medium text-slate-400 hidden sm:block">
                {isAdminTab
                  ? `Total ${adminUsers.length} akun administrator terdaftar`
                  : `Total ${approverUsers.length} akun approver terdaftar`}
              </div>
            </div>
          )}

          {/* Success / Error toast */}
          {successMsg && (
            <div className={`flex items-center gap-2 border rounded-xl px-4 py-3 mb-5 animate-in fade-in
              ${isErrorMsg ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
              {isErrorMsg
                ? <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                : <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
              <p className={`text-sm font-medium ${isErrorMsg ? "text-red-700" : "text-emerald-700"}`}>
                {isErrorMsg ? successMsg.replace("ERROR: ", "") : successMsg}
              </p>
            </div>
          )}

          {/* Filters & Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-1 items-center gap-2.5 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={
                    pageMode === "spv" || isAdminTab
                      ? "Cari nama, username, perusahaan, email..."
                      : "Cari nama, username, email..."
                  }
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm
                            text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2
                            focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Filter departmen: hanya admin yang perlu, SPV sudah auto-filter dari backend */}
              {pageMode === "admin" && (
                <div className="relative shrink-0">
                  <select
                    value={filterDept}
                    onChange={e => setFilterDept(e.target.value)}
                    className="pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm
                              text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500
                              focus:border-transparent transition-all appearance-none cursor-pointer shadow-2xs font-medium"
                  >
                    <option value="">Semua Departemen</option>
                    {DEPARTMENT_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
              {isAdminTab
                ? `Menampilkan ${filteredAdmin.length} dari ${adminUsers.length} akun`
                : `Menampilkan ${filteredApprovers.length} dari ${approverUsers.length} akun`}
            </div>
          </div>

          {/* ── Tabel Administrator Departemen ── */}
          {/* Tampil jika: mode SPV (selalu), atau mode admin dengan tab "admin" */}
          {(pageMode === "spv" || (pageMode === "admin" && isAdminTab)) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama</th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Username</th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">NIK</th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Departemen</th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Perusahaan</th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">No. Telepon</th>
                        <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                        <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Dibuat Pada</th>
                        <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Password</th>
                        <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdmin.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/60 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {user.nama ? user.nama.slice(0, 2).toUpperCase() : "??"}
                              </div>
                              <p className="font-semibold text-slate-900 leading-snug">{user.nama}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <code className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-mono font-medium">
                              {user.username}
                            </code>
                          </td>
                            <td className="px-4 py-4">
                              {user.nik ? (
                                <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                  {user.nik}
                                </code>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
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
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditAdmin(user)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold
                                            text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors
                                            border border-blue-200"
                                  title="Edit akun"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({
                                    id: user.id, nama: user.nama,
                                    username: user.username, role: "worker",
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold
                                            text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors
                                            border border-red-200"
                                  title="Hapus akun"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          )}

          {/* ── TAB: Approver — hanya untuk admin ── */}
          {pageMode === "admin" && isApproverTab && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Nama</th>
                          <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Username</th>
                          <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">NIK</th>
                          <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                          <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Departemen</th>
                          <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                          <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">No. Telepon</th>
                          <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                          <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Dibuat Pada</th>
                          <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Password</th>
                          <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApprovers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {user.nama ? user.nama.slice(0, 2).toUpperCase() : "??"}
                                </div>
                                <p className="font-semibold text-slate-900 leading-snug">{user.nama}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                {user.username}
                              </code>
                            </td>
                            <td className="px-4 py-4">
                              {user.nik ? (
                                <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                  {user.nik}
                                </code>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
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
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditApprover(user)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold
                                            text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors
                                            border border-blue-200"
                                  title="Edit akun"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({
                                    id: user.id, nama: user.nama,
                                    username: user.username, role: user.role,
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold
                                            text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors
                                            border border-red-200"
                                  title="Hapus akun"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          )}
        </main>
      </div>

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
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <input type="email" value={adminForm.email}
                          onChange={e => handleAdminChange("email", e.target.value)}
                          placeholder="user@company.com" required className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          NIK <span className="text-red-400">*</span>
                        </label>
                        <input type="text" inputMode="numeric" value={adminForm.nik}
                          onChange={e => handleAdminChange("nik", e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="4-20 digit angka" required maxLength={20} className={inputCls} />
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
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <input type="email" value={approverForm.email}
                          onChange={e => handleApproverChange("email", e.target.value)}
                          placeholder="user@company.com" required className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          NIK <span className="text-red-400">*</span>
                        </label>
                        <input type="text" inputMode="numeric" value={approverForm.nik}
                          onChange={e => handleApproverChange("nik", e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="4-20 digit angka" required maxLength={20} className={inputCls} />
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

      {/* ── Edit User Modal ── */}
      {editModalOpen && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Pencil className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editUser.type === "admin"
                      ? "Edit Administrator Departemen"
                      : `Edit Approver (${ROLE_LABEL[editUser.role] || editUser.role})`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perbarui profil, informasi kontak, status, atau password akun.
                  </p>
                </div>
              </div>
              <button
                onClick={() => !editSubmitting && setEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
              {editFormError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-3 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{editFormError}</p>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nama Lengkap <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editUser.nama}
                    onChange={(e) => setEditUser((p) => (p ? { ...p, nama: e.target.value } : null))}
                    placeholder="Nama sesuai KTP"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editUser.username}
                    onChange={(e) => setEditUser((p) => (p ? { ...p, username: e.target.value } : null))}
                    placeholder="Username"
                    required
                    className={inputCls}
                  />
                </div>

                {editUser.type === "admin" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Perusahaan / Kontraktor <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editUser.perusahaan}
                      onChange={(e) => setEditUser((p) => (p ? { ...p, perusahaan: e.target.value } : null))}
                      placeholder="PT JAI / PT Kontraktor ABC"
                      required
                      className={inputCls}
                    />
                  </div>
                )}

                {editUser.type === "approver" && pageMode === "admin" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Role Approver <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={editUser.role}
                        onChange={(e) => setEditUser((p) => (p ? { ...p, role: e.target.value } : null))}
                        required
                        className={`${selectCls} text-white`}
                      >
                        {APPROVER_ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value} className="text-white bg-slate-700">
                            {r.label}
                          </option>
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

                {/* Departemen */}
                {pageMode === "admin" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Departemen{" "}
                      {editUser.type === "approver" && editUser.role === "spv" ? (
                        <span className="text-red-400">*</span>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">(opsional)</span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={editUser.departmen}
                        onChange={(e) => setEditUser((p) => (p ? { ...p, departmen: e.target.value } : null))}
                        required={editUser.type === "approver" && editUser.role === "spv"}
                        className={`${selectCls} ${editUser.departmen ? "text-white" : "text-slate-400"}`}
                      >
                        <option value="">- Tanpa Departemen / Umum -</option>
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <option key={d} value={d} className="text-white bg-slate-700">
                            {d}
                          </option>
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

                {pageMode === "spv" && editUser.departmen && (
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2.5">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-blue-300 text-xs">
                      Departemen: <span className="font-bold">{editUser.departmen}</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser((p) => (p ? { ...p, email: e.target.value } : null))}
                    placeholder="user@company.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    NIK <span className="text-xs text-slate-400 font-normal">(4-20 digit angka)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editUser.nik}
                    onChange={(e) => setEditUser((p) => (p ? { ...p, nik: e.target.value.replace(/[^0-9]/g, "") } : null))}
                    placeholder="4-20 digit angka"
                    maxLength={20}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">No. Telepon</label>
                  <input
                    type="text"
                    value={editUser.no_telp}
                    onChange={(e) => setEditUser((p) => (p ? { ...p, no_telp: e.target.value } : null))}
                    placeholder="08xx-xxxx-xxxx (opsional)"
                    className={inputCls}
                  />
                </div>

                {/* Status Akun */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status Akun</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                      <input
                        type="radio"
                        name="edit_is_active"
                        checked={editUser.is_active}
                        onChange={() => setEditUser((p) => (p ? { ...p, is_active: true } : null))}
                        className="text-orange-500 focus:ring-orange-400"
                      />
                      <span className="flex items-center gap-1 text-green-400 font-medium">
                        <BadgeCheck className="w-3.5 h-3.5" /> Aktif
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                      <input
                        type="radio"
                        name="edit_is_active"
                        checked={!editUser.is_active}
                        onChange={() => setEditUser((p) => (p ? { ...p, is_active: false } : null))}
                        className="text-orange-500 focus:ring-orange-400"
                      />
                      <span className="flex items-center gap-1 text-slate-400 font-medium">
                        <BadgeX className="w-3.5 h-3.5" /> Nonaktif
                      </span>
                    </label>
                  </div>
                </div>

                {/* Ubah Password (Opsional) */}
                <div className="pt-3 border-t border-slate-700/60">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Password Baru <span className="text-xs text-slate-400 font-normal">(kosongkan jika tidak ingin mengubah)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={editShowPass ? "text" : "password"}
                      value={editUser.password}
                      onChange={(e) => setEditUser((p) => (p ? { ...p, password: e.target.value } : null))}
                      placeholder="Minimal 6 karakter"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {editShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    disabled={editSubmitting}
                    className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-semibold rounded-lg text-sm transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {editSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menyimpan…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Tambah Purchasing / Pengawas ── */}
      {ppModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tambah Akun Khusus</h3>
                  <p className="text-xs text-slate-400">Purchasing & Pengawas Departemen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePpModal}
                disabled={ppSubmitting}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePpSubmit} className="p-6 space-y-4">
              {ppError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ppError}</span>
                </div>
              )}

              {ppSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Akun berhasil dibuat! Menutup form…</span>
                </div>
              )}

              {/* Pilih Role */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Pilih Role Pengguna <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPpRole("purchasing")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      ppRole === "purchasing"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                        : "bg-slate-700/60 border-slate-600 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Purchasing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPpRole("pengawas")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      ppRole === "pengawas"
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm"
                        : "bg-slate-700/60 border-slate-600 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Pengawas Dept</span>
                  </button>
                </div>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={ppNama}
                  onChange={(e) => setPpNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className={inputCls}
                />
              </div>

              {/* NIK */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  NIK <span className="text-red-400">*</span> <span className="text-xs text-slate-400 font-normal">(4-20 digit angka)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={ppNik}
                  onChange={(e) => setPpNik(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Contoh: 123456"
                  required
                  maxLength={20}
                  className={inputCls}
                />
              </div>

              {/* Departemen khusus Pengawas */}
              {ppRole === "pengawas" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Departemen <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={ppDepartmen}
                      onChange={(e) => setPpDepartmen(e.target.value)}
                      required
                      className={`${selectCls} ${ppDepartmen ? "text-white" : "text-slate-400"}`}
                    >
                      <option value="" disabled>- Pilih Departemen -</option>
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d} className="text-white bg-slate-700">
                          {d}
                        </option>
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

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Username <span className="text-red-400">*</span> <span className="text-xs text-slate-400 font-normal">(3-20 karakter)</span>
                </label>
                <input
                  type="text"
                  value={ppUsername}
                  onChange={(e) => setPpUsername(e.target.value)}
                  placeholder="3-20 karakter, huruf/angka/underscore"
                  required
                  className={inputCls}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password <span className="text-red-400">*</span> <span className="text-xs text-slate-400 font-normal">(minimal 6 karakter)</span>
                </label>
                <div className="relative">
                  <input
                    type={ppShowPass ? "text" : "password"}
                    value={ppPassword}
                    onChange={(e) => setPpPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setPpShowPass(!ppShowPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {ppShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Konfirmasi Password <span className="text-red-400">*</span>
                </label>
                <input
                  type={ppShowPass ? "text" : "password"}
                  value={ppPassword2}
                  onChange={(e) => setPpPassword2(e.target.value)}
                  placeholder="Ulangi password"
                  required
                  className={inputCls}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={closePpModal}
                  disabled={ppSubmitting}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={ppSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {ppSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Simpan Akun</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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