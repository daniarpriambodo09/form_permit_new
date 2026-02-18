// app/register/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle, Shield } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nik:        "",
    nama:       "",
    email:      "",
    perusahaan: "",
    no_telp:    "",
    password:   "",
    password2:  "",
  });
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const handleChange = (key: string, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi
    if (formData.password !== formData.password2) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    if (formData.nik.length < 10) {
      setError("NIK tidak valid (minimal 10 digit)");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrasi gagal");
        return;
      }

      setSuccess(true);
      // Auto-redirect ke login setelah 2 detik
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors";

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Registrasi Berhasil!</h2>
          <p className="text-slate-500 text-sm mb-4">
            Akun Anda telah dibuat. Mengarahkan ke halaman login...
          </p>
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-orange-200 border-t-orange-600" />
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
                Registrasi Akun Pekerja
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Buat akun untuk mengajukan izin kerja dan tracking form Anda.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NIK */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                NIK (Nomor Induk Kependudukan) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.nik}
                onChange={e => handleChange("nik", e.target.value)}
                placeholder="16 digit NIK"
                maxLength={16}
                required
                className={inputCls}
              />
            </div>

            {/* Nama */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nama Lengkap <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={e => handleChange("nama", e.target.value)}
                placeholder="Nama sesuai KTP"
                required
                className={inputCls}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange("email", e.target.value)}
                placeholder="email@example.com"
                required
                className={inputCls}
              />
              <p className="text-xs text-slate-500 mt-1">Untuk notifikasi status izin kerja</p>
            </div>

            {/* Perusahaan */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Perusahaan / Kontraktor <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.perusahaan}
                onChange={e => handleChange("perusahaan", e.target.value)}
                placeholder="PT JAI / PT Kontraktor ABC"
                required
                className={inputCls}
              />
            </div>

            {/* No Telp */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                No. Telepon
              </label>
              <input
                type="tel"
                value={formData.no_telp}
                onChange={e => handleChange("no_telp", e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={inputCls}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={formData.password}
                  onChange={e => handleChange("password", e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className={`${inputCls} pr-11`}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Konfirmasi Password <span className="text-red-400">*</span>
              </label>
              <input
                type={showPass ? "text" : "password"}
                value={formData.password2}
                onChange={e => handleChange("password2", e.target.value)}
                placeholder="Ulangi password"
                required
                className={inputCls}
              />
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
                <>
                  <UserPlus className="w-4 h-4" /> Daftar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
            Login di sini →
          </Link>
        </p>
      </div>
    </div>
  );
}