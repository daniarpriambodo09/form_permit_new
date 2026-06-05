// app/register/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle, Shield } from "lucide-react";

const DEPARTMENT_OPTIONS = [
  "QA",
  "ENG",
  "MTC",
  "PRODUKSI",
  "NYS",
  "FATP-Exim",
  "MPC-WHS",
  "PGA",
] as const;

export default function RegisterPage() {
  const router = useRouter();

  // ── Auth guard — hanya admin ──────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      // Cek sessionStorage dulu (cepat)
      const cachedRole = sessionStorage.getItem("user_role");
      if (cachedRole) {
        if (cachedRole !== "admin") {
          router.replace("/home");
          return;
        }
        setAuthChecked(true);
        return;
      }
      // Fallback: verifikasi dari API jika sessionStorage kosong
      try {
        const res = await fetch("/form-permit/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          router.replace("/login/approver");
          return;
        }
        const data = await res.json();
        if (data.user?.role !== "admin") {
          router.replace("/home");
          return;
        }
        setAuthChecked(true);
      } catch {
        router.replace("/home");
      }
    };
    checkAdmin();
  }, [router]);
  // ── AKHIR auth guard ─────────────────────────────────────────

  const [formData, setFormData] = useState({
    nama:       "",
    username:   "",
    perusahaan: "",
    departmen:  "",
    email:      "",
    no_telp:    "",
    password:   "",
    password2:  "",
  });
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"available" | "taken" | "invalid" | null>(null);
  const [usernameError, setUsernameError] = useState("");

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === "username") {
      setUsernameStatus(null);
      setUsernameError("");
    }
  };

  useEffect(() => {
    if (!formData.username) {
      setUsernameStatus(null);
      setUsernameError("");
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(formData.username)) {
      setUsernameStatus("invalid");
      setUsernameError("Username harus 3-20 karakter, hanya huruf, angka, dan underscore");
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await fetch(
          `/form-permit/api/auth/check-username?username=${encodeURIComponent(formData.username)}`
        );
        if (res.ok) {
          const data = await res.json();
          setUsernameStatus(data.available ? "available" : "taken");
          if (!data.available) setUsernameError("Username sudah digunakan");
        }
      } catch (err) {
        console.error("Error checking username:", err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi username
    if (!formData.username) { setError("Username wajib diisi"); return; }
    if (usernameStatus !== "available") { setError("Username tidak tersedia atau tidak valid"); return; }

    // Validasi departemen
    if (!formData.departmen) { setError("Departemen wajib dipilih"); return; }

    // Validasi email (opsional, tapi jika diisi harus valid)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Format email tidak valid");
        return;
      }
    }

    // Validasi password
    if (formData.password !== formData.password2) { setError("Password dan konfirmasi password tidak cocok"); return; }
    if (formData.password.length < 6) { setError("Password minimal 6 karakter"); return; }

    setLoading(true);
    try {
      const res = await fetch("/form-permit/api/auth/register", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registrasi gagal"); return; }
      setSuccess(true);
    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Tampilkan loading saat cek auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  const inputCls = "w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors";
  const selectCls = "w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors appearance-none";

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Akun Berhasil Dibuat!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Akun Administrator Departemen baru telah berhasil didaftarkan ke sistem.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500
                       text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Kembali ke Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4"
      style={{
        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,.015) 20px, rgba(255,255,255,.015) 21px)`,
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Work Permit System</h1>
          <p className="text-slate-400 text-sm mt-1">PT Jatim Autocomp Indonesia</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2 mb-1">
              <UserPlus className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
                Daftarkan Administrator Departemen
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Buat akun administrator departemen yang bertugas membuat Form Permit.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nama Lengkap <span className="text-red-400">*</span>
              </label>
              <input type="text" value={formData.nama}
                onChange={e => handleChange("nama", e.target.value)}
                placeholder="Nama sesuai KTP" required className={inputCls} />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Username <span className="text-red-400">*</span>
              </label>
              <input type="text" value={formData.username}
                onChange={e => handleChange("username", e.target.value)}
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
                    <p className="text-xs text-slate-400">Memeriksa ketersediaan...</p>
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

            {/* Perusahaan */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Perusahaan / Kontraktor <span className="text-red-400">*</span>
              </label>
              <input type="text" value={formData.perusahaan}
                onChange={e => handleChange("perusahaan", e.target.value)}
                placeholder="PT JAI / PT Kontraktor ABC" required className={inputCls} />
            </div>

            {/* Departemen */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Departemen <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.departmen}
                  onChange={e => handleChange("departmen", e.target.value)}
                  required
                  className={`${selectCls} ${
                    formData.departmen ? "text-white" : "text-slate-500"
                  }`}
                >
                  <option value="" disabled>- Pilih Departemen -</option>
                  {DEPARTMENT_OPTIONS.map(dept => (
                    <option key={dept} value={dept} className="text-white bg-slate-700">
                      {dept}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Email (opsional) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange("email", e.target.value)}
                placeholder="user@company.com (opsional)"
                className={inputCls}
              />
            </div>

            {/* No. Telepon */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                No. Telepon
              </label>
              <input type="text" value={formData.no_telp}
                onChange={e => handleChange("no_telp", e.target.value)}
                placeholder="08xx-xxxx-xxxx (opsional)" className={inputCls} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={formData.password}
                  onChange={e => handleChange("password", e.target.value)}
                  placeholder="Minimal 6 karakter" required className={`${inputCls} pr-11`} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Konfirmasi Password <span className="text-red-400">*</span>
              </label>
              <input type={showPass ? "text" : "password"} value={formData.password2}
                onChange={e => handleChange("password2", e.target.value)}
                placeholder="Ulangi password" required className={inputCls} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50
                         text-white font-semibold rounded-lg text-sm
                         transition-colors shadow-lg shadow-orange-600/20
                         flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <><UserPlus className="w-4 h-4" /> Buat Akun Administrator Departemen</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          <Link href="/home" className="text-orange-400 hover:text-orange-300 transition-colors">
            ← Kembali ke Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}