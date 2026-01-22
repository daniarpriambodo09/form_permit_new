// app/home/page.tsx
"use client";
import Link from "next/link";
import { FileText, Flame, Shield, AlertTriangle, History, BarChart3 } from "lucide-react";
import Image from "next/image";

export default function HomePage() {
  const permitTypes = [
    {
      id: "hot-work",
      name: "Izin Kerja Panas",
      description:
        "Formulir untuk pekerjaan yang menghasilkan panas, api, atau percikan (Cutting, Grinding, Welding, Painting)",
      icon: Flame,
      active: true,
      color: "orange",
      href: "/form/hot-work",
      badge: "AKTIF",
    },
    {
      id: "confined-space",
      name: "Izin Kerja Workshop",
      description: "Formulir untuk pekerjaan di area workshop yang melibatkan penggunaan mesin atau peralatan dengan potensi bahaya kerja.",
      icon: FileText,
      active: true,
      color: "blue",
      href: "/form/workshop",
      badge: "AKTIF",
    },
    {
      id: "height-work",
      name: "Izin Kerja di Ketinggian",
      description: "Formulir untuk pekerjaan di atas 1.8 meter dengan potensi jatuh tinggi",
      icon: AlertTriangle,
      active: true,
      color: "orange",
      href: "/form/height-work",
      badge: "AKTIF",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header Section */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4">
            {/* Logo Container */}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
              <Image
                src="/logo-k3.png"
                alt="Logo K3"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Title Container */}
            <div className="flex flex-col justify-center text-center sm:text-left">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                PT. JATIM AUTOCOMP INDONESIA
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                WIRING HARNESS MANUFACTURER
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
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
              Sistem terintegrasi untuk mengajukan, menyetujui, dan memantau izin kerja panas dengan standar keselamatan internasional.
            </p>
          </div>
        </section>

        {/* Quick Access Section */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Akses Cepat
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all duration-300 rounded-xl p-6 group"
            >
              <div className="p-3 bg-slate-100 group-hover:bg-orange-100 rounded-lg transition-colors flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-slate-600 group-hover:text-orange-600" />
              </div>
              
              <div className="flex-grow">
                <h4 className="font-bold text-slate-900 text-lg">
                  Dashboard Analitik
                </h4>
                <p className="text-sm text-slate-600">
                  Lihat statistik dan visualisasi data izin kerja
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>
            </Link>

            <Link
              href="/history"
              className="flex items-center space-x-3 bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all duration-300 rounded-xl p-6 group"
            >
              <div className="p-3 bg-slate-100 group-hover:bg-orange-100 rounded-lg transition-colors flex-shrink-0">
                <History className="w-6 h-6 text-slate-600 group-hover:text-orange-600" />
              </div>
              
              <div className="flex-grow">
                <h4 className="font-bold text-slate-900 text-lg">
                  Riwayat Form
                </h4>
                <p className="text-sm text-slate-600">
                  Lihat dan kelola semua pengajuan izin kerja Anda
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>
            </Link>
          </div>
        </section>

        {/* Permit Types Section */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Pilih Jenis Izin Kerja
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {permitTypes.map((permit) => {
              const Icon = permit.icon;
              
              const CardContent = (
                <div key={permit.id} className="h-full flex flex-col">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${
                      permit.active ? "bg-orange-100" : "bg-slate-100"
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        permit.active ? "text-orange-600" : "text-slate-400"
                      }`} />
                    </div>
                    
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      permit.active 
                        ? "bg-green-100 text-green-700" 
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {permit.badge}
                    </span>
                  </div>
                  
                  {/* Card Body */}
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      {permit.name}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {permit.description}
                    </p>
                  </div>
                  
                  {/* Card Footer */}
                  {permit.active && (
                    <div className="mt-auto pt-4">
                      <div className="flex items-center text-orange-600 text-sm font-semibold group">
                        <span>Buka Formulir</span>
                        <svg
                          className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2.5} 
                            d="M9 5l7 7-7 7" 
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );

              return permit.active ? (
                <Link
                  key={permit.id}
                  href={permit.href}
                  className="group bg-white rounded-xl shadow-md border-2 border-orange-200 hover:border-orange-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6 h-full">
                    {CardContent}
                  </div>
                </Link>
              ) : (
                <div
                  key={permit.id}
                  className="bg-white rounded-xl shadow-md border-2 border-slate-200 opacity-70 cursor-not-allowed overflow-hidden"
                >
                  <div className="p-6 h-full">
                    {CardContent}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Info Cards Section */}
        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Security Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Shield className="w-6 h-6 text-orange-600 mt-1" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-900 mb-1">
                    Keamanan Terjamin
                  </h4>
                  <p className="text-sm text-slate-600">
                    Compliance dengan standar K3 internasional dan regulasi lokal
                  </p>
                </div>
              </div>
            </div>

            {/* Documentation Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600 mt-1" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-900 mb-1">
                    Dokumentasi Lengkap
                  </h4>
                  <p className="text-sm text-slate-600">
                    Pencatatan otomatis dan arsip digital untuk audit trail
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Access Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Flame className="w-6 h-6 text-red-600 mt-1" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-900 mb-1">
                    Akses Cepat
                  </h4>
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
