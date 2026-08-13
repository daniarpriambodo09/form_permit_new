// app/home/page.tsx
// REDESIGN: Navigasi lama (grid kartu "Akses Cepat" penuh) dipindah ke <Sidebar />.
// Halaman ini sekarang fokus sebagai halaman sambutan: hero, beberapa kartu
// shortcut yang benar-benar relevan untuk role yang login, pilihan jenis form
// (khusus worker), dan info ringkas standar K3.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { getFeaturedCards, ROLE_LABEL, UserRole } from "@/lib/nav-config";
import {
  Flame,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  ClipboardCheck,
  Zap,
} from "lucide-react";

interface PermitType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  href: string;
}

const PERMIT_TYPES: PermitType[] = [
  {
    id: "hot-work",
    name: "Izin Kerja Panas",
    description:
      "Untuk pekerjaan yang menghasilkan panas, api, atau percikan (Cutting, Grinding, Welding, Painting).",
    icon: Flame,
    href: "/form/hot-work",
  },
  {
    id: "confined-space",
    name: "Izin Kerja Workshop",
    description:
      "Untuk pekerjaan di area workshop yang melibatkan mesin atau peralatan dengan potensi bahaya kerja.",
    icon: FileText,
    href: "/form/workshop",
  },
  {
    id: "height-work",
    name: "Izin Kerja di Ketinggian",
    description: "Untuk pekerjaan di atas 1.8 meter dengan potensi jatuh dari ketinggian.",
    icon: AlertTriangle,
    href: "/form/height-work",
  },
];

export default function HomePage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState("");
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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
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

  const featuredCards = role ? getFeaturedCards(role) : [];
  const firstName = userName.split(" ")[0] || "";

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Konten utama — padding kiri mengikuti lebar sidebar (lihat components/Sidebar.tsx) */}
      <div style={{ paddingLeft: "var(--sidebar-width, 0px)" }} className="transition-[padding] duration-300">
        {/* Topbar ringkas */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
          <div className="px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
            <div className="pl-14 lg:pl-0 min-w-0">
              <p className="text-xs text-slate-400 font-medium capitalize truncate">{todayLabel}</p>
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {loadingRole ? "Memuat…" : `Selamat datang${firstName ? `, ${firstName}` : ""}`}
              </h1>
            </div>
            {role && (
              <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                <ShieldCheck className="w-3.5 h-3.5" /> {ROLE_LABEL[role]}
              </span>
            )}
          </div>
        </header>

        <main className="px-5 sm:px-8 py-8 max-w-7xl mx-auto">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-8 sm:p-10 mb-10">
            <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-16 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 mb-4">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">Prioritas Keselamatan Kerja</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight max-w-2xl">
                Manajemen Izin Kerja <span className="text-orange-400">Berbasis Digital</span>
              </h2>
              <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
                Ajukan, setujui, dan pantau izin kerja panas, workshop, dan ketinggian sesuai
                standar keselamatan internasional — dalam satu sistem terintegrasi.
              </p>
            </div>
          </section>

          {/* Akses Cepat — kurasi sesuai role, bukan daftar penuh (sudah ada di sidebar) */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-orange-500" />
              <h3 className="text-base font-bold text-slate-900">Akses Cepat</h3>
            </div>

            {loadingRole ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                  featuredCards.length >= 3 ? "lg:grid-cols-3" : ""
                }`}
              >
                {featuredCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="group bg-white border border-slate-200 hover:border-orange-300
                                 hover:shadow-lg rounded-2xl p-5 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 bg-orange-50 group-hover:bg-orange-100 rounded-xl transition-colors">
                          <Icon className="w-5 h-5 text-orange-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">{card.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pilihan jenis form — hanya worker */}
          {!loadingRole && role === "worker" && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardCheck className="w-4 h-4 text-orange-500" />
                <h3 className="text-base font-bold text-slate-900">Pilih Jenis Izin Kerja</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PERMIT_TYPES.map((permit) => {
                  const Icon = permit.icon;
                  return (
                    <Link
                      key={permit.id}
                      href={permit.href}
                      className="group bg-white rounded-2xl border-2 border-orange-100 hover:border-orange-400
                                 hover:shadow-xl transition-all duration-300 p-6 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-xl bg-orange-100">
                          <Icon className="w-7 h-7 text-orange-600" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          AKTIF
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">{permit.name}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                        {permit.description}
                      </p>
                      <div className="flex items-center text-orange-600 text-sm font-semibold">
                        <span>Lihat Formulir</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Info ringkas */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-orange-600 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Keamanan Terjamin</h4>
                    <p className="text-sm text-slate-600">
                      Compliance dengan standar K3 internasional dan regulasi lokal.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Dokumentasi Lengkap</h4>
                    <p className="text-sm text-slate-600">
                      Pencatatan otomatis dan arsip digital untuk audit trail.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-red-600 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Proses Efisien</h4>
                    <p className="text-sm text-slate-600">
                      Persetujuan dan monitoring berjalan secara real-time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}