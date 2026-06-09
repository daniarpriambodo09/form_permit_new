// app/profile/page.tsx
// REFACTOR: Role 'pga' diganti 'smr' di ROLE_LABELS.
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Lock, ArrowLeft, Shield, CheckCircle,
  AlertCircle, Eye, EyeOff, Save, Loader2,
  Building2, Phone, Mail, Briefcase, BadgeInfo,
} from "lucide-react";

interface UserProfile {
  userId:    number;
  username:  string;
  nama:      string;
  jabatan:   string;
  role:      string;
  nik:       string | null;
  departmen: string | null;
  email?:    string | null;
  no_telp?:  string | null;
  perusahaan?: string | null;
}

// REFACTOR: 'pga' → 'smr', label 'PGA / MR' → 'SMR'
const ROLE_LABELS: Record<string, string> = {
  worker:     "Worker",
  firewatch:  "Fire Watch",
  spv:        "Supervisor",
  kontraktor: "Kontraktor",
  admin_k3:   "Admin K3",
  sfo:        "SFO",
  smr:        "SMR",          // sebelumnya: pga: "PGA / MR"
  admin:      "Administrator",
};

type ActiveTab = "info" | "username" | "password";

type ToastType = "success" | "error";
interface Toast { type: ToastType; message: string }

function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl
        text-white text-sm font-medium transition-all
        ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
    >
      {toast.type === "success"
        ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
      {toast.message}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 p-2 bg-orange-50 rounded-lg flex-shrink-0">
        <Icon className="w-4 h-4 text-orange-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-slate-800 font-semibold mt-0.5">{value || <span className="text-slate-400 font-normal italic">—</span>}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("info");
  const [toast, setToast]         = useState<Toast | null>(null);

  // Username form
  const [newUsername, setNewUsername] = useState("");
  const [usernameErr, setUsernameErr] = useState("");
  const [savingUser, setSavingUser]   = useState(false);

  // Password form
  const [oldPw, setOldPw]             = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [pwErr, setPwErr]             = useState("");
  const [savingPw, setSavingPw]       = useState(false);
  const [showOld, setShowOld]         = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch("/form-permit/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.user) { router.push("/"); return; }
        setProfile(data.user);
        setNewUsername(data.user.username);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [router]);

  const showToast = (type: ToastType, message: string) => setToast({ type, message });

  // ── Ubah Username ────────────────────────────────────────────
  const handleChangeUsername = async () => {
    setUsernameErr("");
    const trimmed = newUsername.trim();
    if (!trimmed)                          { setUsernameErr("Username tidak boleh kosong."); return; }
    if (trimmed === profile?.username)     { setUsernameErr("Username baru sama dengan username saat ini."); return; }
    if (trimmed.length < 4)               { setUsernameErr("Username minimal 4 karakter."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setUsernameErr("Username hanya boleh berisi huruf, angka, dan underscore."); return; }

    setSavingUser(true);
    try {
      const res = await fetch("/form-permit/api/profile/username", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setUsernameErr(data.error || "Gagal mengubah username."); return; }
      setProfile(p => p ? { ...p, username: trimmed } : p);
      sessionStorage.setItem("user_username", trimmed);
      showToast("success", "Username berhasil diubah.");
    } catch {
      setUsernameErr("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSavingUser(false);
    }
  };

  // ── Ubah Password ────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwErr("");
    if (!oldPw)              { setPwErr("Masukkan password lama."); return; }
    if (newPw.length < 6)    { setPwErr("Password baru minimal 6 karakter."); return; }
    if (newPw !== confirmPw) { setPwErr("Konfirmasi password tidak cocok."); return; }

    setSavingPw(true);
    try {
      const res = await fetch("/form-permit/api/profile/password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwErr(data.error || "Gagal mengubah password."); return; }
      setOldPw(""); setNewPw(""); setConfirmPw("");
      showToast("success", "Password berhasil diubah.");
    } catch {
      setPwErr("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="flex items-center gap-1.5 text-slate-500 hover:text-orange-600 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Beranda
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold text-sm">Profil Saya</span>
          </div>
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow">
            <Shield className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-grow min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{profile.nama}</h1>
            <p className="text-sm text-slate-500 truncate">@{profile.username}</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide flex-shrink-0">
            <Shield className="w-3.5 h-3.5" />
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {(["info", "username", "password"] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${activeTab === tab
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab === "info"     && <BadgeInfo className="w-4 h-4" />}
              {tab === "username" && <User className="w-4 h-4" />}
              {tab === "password" && <Lock className="w-4 h-4" />}
              {tab === "info" ? "Informasi" : tab === "username" ? "Username" : "Password"}
            </button>
          ))}
        </div>

        {/* Tab: Informasi */}
        {activeTab === "info" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Detail Akun</h2>
            <div className="divide-y divide-slate-100">
              <InfoRow icon={User}      label="Nama Lengkap" value={profile.nama} />
              <InfoRow icon={User}      label="Username"     value={profile.username} />
              <InfoRow icon={Shield}    label="Role"         value={ROLE_LABELS[profile.role] ?? profile.role} />
              <InfoRow icon={Briefcase} label="Jabatan"      value={profile.jabatan} />
              <InfoRow icon={Building2} label="Departemen"   value={profile.departmen} />
              <InfoRow icon={BadgeInfo} label="NIK"          value={profile.nik} />
              <InfoRow icon={Mail}      label="Email"        value={(profile as any).email} />
              <InfoRow icon={Phone}     label="No. Telepon"  value={(profile as any).no_telp} />
              <InfoRow icon={Building2} label="Perusahaan"   value={(profile as any).perusahaan} />
            </div>
          </div>
        )}

        {/* Tab: Ubah Username */}
        {activeTab === "username" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Ubah Username</h2>
            <p className="text-sm text-slate-500 mb-6">Username harus unik dan hanya boleh mengandung huruf, angka, dan underscore.</p>

            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Username Baru
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={e => { setNewUsername(e.target.value); setUsernameErr(""); }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                         text-sm font-medium"
              placeholder="Masukkan username baru"
            />
            {usernameErr && (
              <p className="flex items-center gap-1.5 mt-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {usernameErr}
              </p>
            )}

            <div className="mt-2 text-xs text-slate-400 space-y-0.5">
              <p>• Minimal 4 karakter</p>
              <p>• Hanya huruf, angka, dan underscore (_)</p>
              <p>• Harus berbeda dari username saat ini</p>
            </div>

            <button
              onClick={handleChangeUsername}
              disabled={savingUser}
              className="mt-6 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60
                         text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Username
            </button>
          </div>
        )}

        {/* Tab: Ubah Password */}
        {activeTab === "password" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Ubah Password</h2>
            <p className="text-sm text-slate-500 mb-6">Password baru minimal 6 karakter.</p>

            <div className="space-y-4">
              {[
                { label: "Password Lama",            val: oldPw,     setVal: setOldPw,     show: showOld,     setShow: setShowOld     },
                { label: "Password Baru",            val: newPw,     setVal: setNewPw,     show: showNew,     setShow: setShowNew     },
                { label: "Konfirmasi Password Baru", val: confirmPw, setVal: setConfirmPw, show: showConfirm, setShow: setShowConfirm },
              ].map(({ label, val, setVal, show, setShow }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={val}
                      onChange={e => { setVal(e.target.value); setPwErr(""); }}
                      className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl text-slate-900
                                 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                                 text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pwErr && (
              <p className="flex items-center gap-1.5 mt-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {pwErr}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={savingPw}
              className="mt-6 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60
                         text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Simpan Password
            </button>
          </div>
        )}
      </main>

      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}