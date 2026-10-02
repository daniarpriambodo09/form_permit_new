// components/UnifiedLoginPage.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  HardHat,
  ShieldCheck,
  FileCheck,
  Loader2,
  Sparkles
} from "lucide-react";

interface UnifiedLoginPageProps {
  defaultRole?: "worker" | "approver";
}

export default function UnifiedLoginPage({ defaultRole = "worker" }: UnifiedLoginPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode role: "worker" atau "approver"
  const [role, setRole] = useState<"worker" | "approver">(defaultRole);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const expired = searchParams.get("expired") === "1";
  const rawFrom = searchParams.get("from") || "";
  const redirectTo = searchParams.get("redirect") ?? "";

  // Cek apakah user sudah login sebelumnya
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/form-permit/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            router.replace("/home");
            return;
          }
        }
      } catch {
        // Belum login, lanjut tampilkan form
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (expired) {
      setError("Sesi Anda telah berakhir. Silakan login kembali.");
    }
  }, [expired]);

  // Handle pergantian tab role
  const handleRoleChange = (selectedRole: "worker" | "approver") => {
    if (selectedRole === role) return;
    setRole(selectedRole);
    setError(""); // reset pesan error saat berganti role
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/form-permit/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal, silakan periksa username dan password Anda.");
        return;
      }

      // Validasi role sesuai tab yang dipilih
      if (role === "worker") {
        if (data.user.role !== "worker") {
          await fetch("/form-permit/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          sessionStorage.clear();
          setError("Akun ini bukan pekerja/departemen. Silakan klik tombol 'Login Approver / Admin' di atas.");
          return;
        }
      } else {
        const allowedRoles = ["spv", "admin", "kontraktor", "sfo", "smr", "firewatch", "admin_k3", "security"];
        if (!allowedRoles.includes(data.user.role)) {
          await fetch("/form-permit/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          sessionStorage.clear();
          setError("Akun ini bukan approver. Silakan klik tombol 'Login Pekerja / Dept' di atas.");
          return;
        }
      }

      // Simpan data user ke sessionStorage
      sessionStorage.setItem("user_nama", data.user.nama);
      sessionStorage.setItem("user_jabatan", data.user.jabatan);
      sessionStorage.setItem("user_role", data.user.role);

      // Tentukan target redirect
      if (role === "approver" && redirectTo) {
        const decoded = decodeURIComponent(redirectTo);
        if (decoded.startsWith("/")) {
          router.replace(decoded);
          return;
        }
      }

      if (rawFrom) {
        const cleanFrom = rawFrom.startsWith("/form-permit")
          ? rawFrom.replace("/form-permit", "") || "/home"
          : rawFrom.startsWith("/")
          ? rawFrom
          : "/home";
        router.replace(cleanFrom);
        return;
      }

      // Default redirect ke /home
      router.replace("/home");
    } catch {
      setError("Terjadi gangguan koneksi jaringan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
            <Shield className="w-5 h-5 text-orange-400 absolute" />
          </div>
          <p className="text-slate-400 text-xs font-medium tracking-wide">Memuat halaman login...</p>
        </div>
      </div>
    );
  }

  const isWorker = role === "worker";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-orange-500 selection:text-white p-4 sm:p-6 lg:p-8">
      {/* Ambient background glows */}
      <div
        className={`pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] blur-[130px] rounded-full transition-all duration-700 ${
          isWorker ? "bg-orange-600/10" : "bg-emerald-600/10"
        }`}
      />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-amber-600/10 blur-[130px] rounded-full" />

      {/* Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Header Mini Bar */}
      <div className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shadow-inner">
            <img src="/form-permit/logo-k3.png" alt="K3 Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
            PT Jatim Autocomp Indonesia
          </span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-400">
          <div className={`w-2 h-2 rounded-full ${isWorker ? "bg-orange-500" : "bg-emerald-500"} animate-pulse`} />
          <span className="hidden sm:inline font-medium text-slate-300">Work Permit System (WPS)</span>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
          <span className="text-[11px] text-slate-400">Secure Access</span>
        </div>
      </div>

      {/* Main Dual-Column Login Card */}
      <div className="relative z-10 max-w-5xl w-full mx-auto my-auto py-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: K3 Safety Officer Visual Image Banner (5 Cols) */}
          <div className="lg:col-span-5 relative min-h-[380px] lg:min-h-full overflow-hidden flex flex-col justify-between p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-800">
            {/* Background Photography */}
            <img
              src="/form-permit/images/k3_login_banner.jpg?v=2"
              alt="K3 HSE Safety Inspection"
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05] transition-transform duration-700 hover:scale-105"
            />

            {/* Gradient Overlays for Readability & Depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/75 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent pointer-events-none" />

            {/* Top Brand Identity Pill */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-2 pr-4 shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/form-permit/logo-k3.png"
                    alt="Logo K3"
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block leading-tight">
                    PT Jatim Autocomp Indonesia
                  </span>
                  <span className="text-xs font-bold text-white tracking-tight">
                    Work Permit System
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Glassmorphic Card Overlay */}
            <div className="relative z-10 mt-auto pt-8">
              <div className="bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    K3 & HSE Digitalization
                  </span>
                </div>
                <h4 className="text-white font-bold text-base sm:text-lg leading-snug mb-1.5">
                  Utamakan Keselamatan & Kesehatan Kerja
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed mb-3">
                  Inspeksi lapangan, evaluasi potensi bahaya, dan verifikasi izin kerja digital untuk keselamatan bersama.
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-white/10">
                  <span>Zero Accident Goal</span>
                  <span className="text-orange-400 font-semibold">ISO 45001 Compliance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Form (7 Cols) */}
          <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
            {/* 2 Tombol Pemilihan Login (Worker vs Approver) */}
            <div className="mb-8">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Pilih Jenis Akses Login:
              </div>
              <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-1.5 shadow-inner">
                {/* Tombol 1: Worker / Dept */}
                <button
                  type="button"
                  onClick={() => handleRoleChange("worker")}
                  className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                    isWorker
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30 ring-1 ring-orange-500/50"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <HardHat className={`w-4 h-4 ${isWorker ? "text-white" : "text-slate-400"}`} />
                  <span>Pekerja / Dept</span>
                </button>

                {/* Tombol 2: Approver / Admin */}
                <button
                  type="button"
                  onClick={() => handleRoleChange("approver")}
                  className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                    !isWorker
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30 ring-1 ring-orange-500/50"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${!isWorker ? "text-white" : "text-slate-400"}`} />
                  <span>Approver / K3</span>
                </button>
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5">
                {isWorker ? "Masuk ke Akun Pekerja" : "Masuk ke Portal Approver"}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                {isWorker
                  ? "Gunakan akun pekerja atau administrator departemen Anda untuk mengisi & memantau izin kerja."
                  : "Khusus personel berwenang: Supervisor, Safety Officer, K3, SMR & Security."}
              </p>
            </div>

            {/* Contextual Banner jika ada redirect link email */}
            {!isWorker && redirectTo && !expired && (
              <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 animate-in fade-in">
                <FileCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Otorisasi Diperlukan
                  </h5>
                  <p className="text-amber-200/90 text-xs mt-0.5 leading-snug">
                    Silakan login untuk langsung diarahkan ke formulir izin kerja yang memerlukan persetujuan Anda.
                  </p>
                </div>
              </div>
            )}

            {/* Error / Alert Box */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-red-400 uppercase tracking-wide">
                    Gagal Masuk
                  </h5>
                  <p className="text-red-300 text-xs sm:text-sm mt-0.5 leading-snug">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                  {isWorker ? "Username Pekerja / Departemen" : "Username Akun Approver"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isWorker ? "Masukkan username pekerja Anda" : "Masukkan username approver Anda"}
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    required
                    className="w-full pl-10 pr-12 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 inset-y-0 flex items-center text-slate-400 hover:text-slate-200 transition-colors px-1"
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 text-white font-semibold rounded-xl text-sm sm:text-base transition-all duration-200 shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 group active:scale-[0.99] mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memvalidasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>{isWorker ? "Masuk sebagai Pekerja" : "Masuk sebagai Approver"}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Support Info */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-500">
                Butuh bantuan akun atau lupa password?{" "}
                <span className="text-slate-400">
                  Hubungi Administrator K3 atau Safety Officer Departemen Anda.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="relative z-10 max-w-5xl w-full mx-auto text-center py-2 text-[11px] text-slate-500">
        &copy; 2026 PT Jatim Autocomp Indonesia &bull; Sistem Keselamatan Kerja & Perizinan Terpadu
      </div>
    </div>
  );
}
