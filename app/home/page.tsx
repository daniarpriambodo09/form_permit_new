// app/home/page.tsx  — PATCH: nama user di header menjadi link ke /profile
// Hanya bagian header yang berubah; seluruh sisa file identik dengan aslinya.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Flame, Shield, AlertTriangle,
  History, BarChart3, ClipboardList, LogOut, User, Users,
} from "lucide-react";

type UserRole =
  | "worker"
  | "firewatch"
  | "spv"
  | "kontraktor"
  | "admin_k3"
  | "sfo"
  | "smr"
  | "admin";

const APPROVER_ROLES: UserRole[] = [
  "firewatch", "spv", "kontraktor", "admin_k3", "sfo", "smr",
];

interface QuickAccessCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

function getQuickAccessCards(role: UserRole): QuickAccessCard[] {
  if (role === "admin") {
    return [
      {
        title: "Dashboard Analitik",
        description: "Lihat statistik dan visualisasi data izin kerja",
        href: "/dashboard",
        icon: BarChart3,
      },
      {
        title: "Daftar Form",
        description: "Lihat dan proses seluruh form yang memerlukan approval",
        href: "/approval",
        icon: ClipboardList,
      },
      {
        title: "Kelola Akun Users",
        description: "Kelola seluruh akun user dan approver dalam satu halaman.",
        href: "/admin-users",
        icon: Users,
      },
      {
        title: "Daftar File Form",
        description: "Lihat dan buka file PDF form tanpa perlu mengunduh terlebih dahulu.",
        href: "/form-files",
        icon: FileText,
      },
    ];
  }

  if (APPROVER_ROLES.includes(role)) {
    return [
      {
        title: "Daftar Form",
        description: "Lihat dan proses form yang memerlukan approval",
        href: "/approval",
        icon: ClipboardList,
      },
    ];
  }

  // worker
  return [
    {
      title: "Riwayat Form",
      description: "Lihat dan kelola semua pengajuan izin kerja Anda",
      href: "/my-forms",
      icon: History,
    },
  ];
}

export default function HomePage() {
  const router = useRouter();

  const [role, setRole]               = useState<UserRole | null>(null);
  const [userName, setUserName]       = useState("");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const cachedRole = sessionStorage.getItem("user_role") as UserRole | null;
    const cachedName = sessionStorage.getItem("user_nama") || "";
    setUserName(cachedName);

    if (cachedRole) {
      setRole(cachedRole);
      setLoadingRole(false);
      return;
    }
    fetch("/form-permit/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.role) {
          setRole(data.user.role as UserRole);
          sessionStorage.setItem("user_role", data.user.role);
          sessionStorage.setItem("user_nama", data.user.nama || "");
          setUserName(data.user.nama || "");
        }
      })
      .catch(() => null)
      .finally(() => setLoadingRole(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/form-permit/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    sessionStorage.clear();
    router.push("/");
  };

  const permitTypes = [
    {
      id: "hot-work",
      name: "Izin Kerja Panas",
      description:
        "Formulir untuk pekerjaan yang menghasilkan panas, api, atau percikan (Cutting, Grinding, Welding, Painting)",
      icon: Flame,
      active: true,
      href: "/form/hot-work",
      badge: "AKTIF",
    },
    {
      id: "confined-space",
      name: "Izin Kerja Workshop",
      description:
        "Formulir untuk pekerjaan di area workshop yang melibatkan penggunaan mesin atau peralatan dengan potensi bahaya kerja.",
      icon: FileText,
      active: true,
      href: "/form/workshop",
      badge: "AKTIF",
    },
    {
      id: "height-work",
      name: "Izin Kerja di Ketinggian",
      description:
        "Formulir untuk pekerjaan di atas 1.8 meter dengan potensi jatuh tinggi",
      icon: AlertTriangle,
      active: true,
      href: "/form/height-work",
      badge: "AKTIF",
    },
  ];

  const quickAccessCards = role ? getQuickAccessCards(role) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Logo + Title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col justify-center text-center sm:text-left">
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  PT. JATIM AUTOCOMP INDONESIA
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  WIRING HARNESS MANUFACTURER
                </p>
              </div>
            </div>

            {/* User info (link ke profil) + Logout */}
            <div className="flex items-center gap-3">
              {userName && (
                // ── PERUBAHAN: bungkus dengan Link ke /profile ──────────
                <Link
                  href="/profile"
                  className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-orange-50
                             hover:text-orange-600 rounded-lg px-3 py-2 transition-colors group"
                >
                  <User className="w-4 h-4 text-slate-500 group-hover:text-orange-500 transition-colors" />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">
                    {userName}
                  </span>
                </Link>
                // ── AKHIR PERUBAHAN ──────────────────────────────────────
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600
                           hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <section className="mb-12">
          <div className="inline-flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-2 mb-4">
            <Flame className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-700">
              Prioritas Keselamatan
            </span>
          </div>
          <div className="mb-6">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Manajemen Izin Kerja{" "}
              <span className="text-orange-600">Berbasis Digital</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl">
              Sistem terintegrasi untuk mengajukan, menyetujui, dan memantau
              izin kerja panas dengan standar keselamatan internasional.
            </p>
          </div>
        </section>

        {/* Quick Access */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Akses Cepat
          </h3>

          {loadingRole ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map(i => (
                <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickAccessCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="flex items-center space-x-3 bg-white border-2 border-slate-200
                               hover:border-orange-400 hover:shadow-lg transition-all duration-300
                               rounded-xl p-6 group"
                  >
                    <div className="p-3 bg-slate-100 group-hover:bg-orange-100 rounded-lg transition-colors flex-shrink-0">
                      <Icon className="w-6 h-6 text-slate-600 group-hover:text-orange-600" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-slate-900 text-lg">{card.title}</h4>
                      <p className="text-sm text-slate-600">{card.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Permit Types — hanya worker */}
        {!loadingRole && role === "worker" && (
          <section className="mb-12">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              Pilih Jenis Izin Kerja
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {permitTypes.map((permit) => {
                const Icon = permit.icon;
                const CardContent = (
                  <div key={permit.id} className="h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg flex-shrink-0 bg-orange-100">
                        <Icon className="w-8 h-8 text-orange-600" />
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
                        {permit.badge}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{permit.name}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-4">{permit.description}</p>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="flex items-center text-orange-600 text-sm font-semibold group">
                        <span>Lihat Formulir</span>
                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <Link
                    key={permit.id}
                    href={permit.href}
                    className="group bg-white rounded-xl shadow-md border-2 border-orange-200
                               hover:border-orange-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-6 h-full">{CardContent}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Info Cards */}
        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Shield className="w-6 h-6 text-orange-600 mt-1" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-900 mb-1">Keamanan Terjamin</h4>
                  <p className="text-sm text-slate-600">
                    Compliance dengan standar K3 internasional dan regulasi lokal
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600 mt-1" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-900 mb-1">Dokumentasi Lengkap</h4>
                  <p className="text-sm text-slate-600">
                    Pencatatan otomatis dan arsip digital untuk audit trail
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Flame className="w-6 h-6 text-red-600 mt-1" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-900 mb-1">Akses Cepat</h4>
                  <p className="text-sm text-slate-600">
                    Proses persetujuan dan monitoring real-time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}