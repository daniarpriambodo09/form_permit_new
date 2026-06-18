// app/login/approver/ApproverLoginPage.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Eye, EyeOff, AlertCircle, Lock } from "lucide-react";
import Link from "next/link";

export default function ApproverLoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const expired      = searchParams.get("expired")  === "1";
  const redirectTo   = searchParams.get("redirect") ?? "";   // ← path tujuan dari link email

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (expired) setError("Sesi Anda telah berakhir. Silakan login kembali.");
  }, [expired]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/form-permit/api/auth/login", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
        return;
      }

      const allowedRoles = ["spv", "admin", "kontraktor", "sfo", "smr", "firewatch", "admin_k3"];
      if (!allowedRoles.includes(data.user.role)) {
        await fetch("/form-permit/api/auth/logout", { method: "POST", credentials: "include" });
        sessionStorage.clear();
        setError("Akun ini bukan approver. Silakan gunakan halaman login pekerja.");
        return;
      }

      sessionStorage.setItem("user_nama",    data.user.nama);
      sessionStorage.setItem("user_jabatan", data.user.jabatan);
      sessionStorage.setItem("user_role",    data.user.role);

      // Redirect setelah login berhasil:
      // Jika ada ?redirect=... (dari link email approval), arahkan ke sana.
      // Validasi diawali "/" agar tidak bisa dipakai sebagai open redirect.
      if (redirectTo) {
        const decoded = decodeURIComponent(redirectTo);
        if (decoded.startsWith("/")) {
          router.replace(decoded);
          return;
        }
      }

      // Default: ke /home
      router.replace("/home");

    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-900 flex items-center justify-center p-4"
      style={{
        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,.015) 20px, rgba(255,255,255,.015) 21px)`,
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Work Permit System</h1>
          <p className="text-slate-400 text-sm mt-1">PT Jatim Autocomp Indonesia</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2 mb-1">
              <Lock className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
                Akses Approver / Admin
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Halaman ini khusus untuk Safety Officer, Supervisor, PGA, dan Manager.
            </p>
            {/* Banner kontekstual jika datang dari redirect link email */}
            {redirectTo && !expired && (
              <div className="mt-3 flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
                <Lock className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-orange-300 text-xs">
                  Silakan login untuk melanjutkan ke halaman approval yang dituju.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username"
                required
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg
                           text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                           transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full px-4 py-2.5 pr-11 bg-slate-700 border border-slate-600 rounded-lg
                             text-white placeholder-slate-500 text-sm
                             focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
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
                "Masuk"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Bukan approver?{" "}
          <Link
            href="/"
            onClick={() => sessionStorage.clear()}
            className="text-orange-400 hover:text-orange-300 transition-colors"
          >
            Kembali ke halaman utama →
          </Link>
        </p>
      </div>
    </div>
  );
}