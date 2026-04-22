// app/page.tsx
// Landing page dengan redirect otomatis berdasarkan role
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, Shield, AlertTriangle, LogIn, UserPlus, Loader2, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Cek apakah user sudah login
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          // Auto-redirect berdasarkan role
          if (data.user.role === "worker") {
            router.push("/my-forms");
          } else if (["approver", "admin"].includes(data.user.role)) {
            router.push("/approval");
          }
        }
      } catch {
        // User belum login, tampilkan landing page
      } finally {
        setChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Jika sudah ada user tapi belum redirect, tampilkan sebentar
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600">Mengarahkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  // Landing page untuk user yang belum login
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-3xl shadow-2xl shadow-orange-500/40 mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Work Permit System
          </h1>
          <p className="text-slate-300 text-lg">
            PT Jatim Autocomp Indonesia
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Sistem Perizinan Kerja Digital untuk Keselamatan K3
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-4 mb-16">
          <Link href="/login/worker"
            className="flex items-center justify-center gap-3 py-4 bg-orange-600 hover:bg-orange-500
                       text-white rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-orange-600/30"
          >
            <LogIn className="w-5 h-5" />
            Login Pekerja
          </Link>
          <Link href="/login/approver"
            className="flex items-center justify-center gap-3 py-4 bg-slate-700 hover:bg-slate-600
                       text-white rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-slate-700/30 border border-slate-600"
          >
            <ShieldCheck className="w-5 h-5" />
            Login Approver
          </Link>
          <Link href="/register"
            className="md:col-span-2 flex items-center justify-center gap-3 py-4 bg-white/10 hover:bg-white/20
                       text-white rounded-xl font-semibold text-lg transition-colors border border-white/20"
          >
            <UserPlus className="w-5 h-5" />
            Daftar Akun Baru (Pekerja)
          </Link>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
              <Flame className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Hot Work Permit</h3>
            <p className="text-slate-400 text-sm">
              Izin kerja untuk pekerjaan panas (pengelasan, pemotongan, grinding)
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Height Work Permit</h3>
            <p className="text-slate-400 text-sm">
              Izin kerja untuk pekerjaan di ketinggian (scaffolding, tangga)
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Workshop Permit</h3>
            <p className="text-slate-400 text-sm">
              Izin kerja workshop (maintenance, perbaikan, instalasi)
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
          <p className="text-amber-300 text-sm">
            <strong>Catatan:</strong> Untuk mengisi form izin kerja, Anda harus login terlebih dahulu.
            Jika belum memiliki akun, silakan <Link href="/register" className="underline hover:text-amber-200">daftar di sini</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
