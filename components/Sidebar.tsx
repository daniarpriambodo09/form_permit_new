// components/Sidebar.tsx
// Sidebar navigasi utama aplikasi Form Permit.
// - Desktop: fixed di kiri, bisa di-collapse jadi mode ikon saja (lebar disimpan
//   di CSS variable --sidebar-width supaya halaman lain tinggal
//   `style={{ paddingLeft: "var(--sidebar-width, 0px)" }}` tanpa perlu lifting state).
// - Mobile (<lg): jadi drawer overlay, dipicu tombol hamburger fixed di pojok kiri atas.
// - Auth: pola sama seperti halaman lain di app ini — baca cache sessionStorage dulu,
//   lalu refresh dari /api/auth/me.
// - Isi menu (grup + item) TIDAK didefinisikan di file ini — diambil dari
//   getNavSections() di lib/nav-config.ts, supaya Sidebar & kartu "Akses
//   Cepat" di /home selalu konsisten. Untuk menambah menu baru (misalnya
//   "Kelola Departemen"), edit lib/nav-config.ts, bukan file ini.
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Shield,
  X,
} from "lucide-react";
import { getNavSections, ROLE_LABEL, UserRole } from "@/lib/nav-config";

const SIDEBAR_WIDTH_EXPANDED = 272;
const SIDEBAR_WIDTH_COLLAPSED = 80;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // ── Auth: role & nama user (cache dulu, lalu refresh) ─────────
  useEffect(() => {
    const cachedRole = sessionStorage.getItem("user_role") as UserRole | null;
    const cachedName = sessionStorage.getItem("user_nama") || "";
    setUserName(cachedName);

    if (cachedRole) {
      setRole(cachedRole);
      setReady(true);
    }

    fetch("/form-permit/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.role) {
          setRole(data.user.role as UserRole);
          setUserName(data.user.nama || "");
          sessionStorage.setItem("user_role", data.user.role);
          sessionStorage.setItem("user_nama", data.user.nama || "");
        }
      })
      .catch(() => null)
      .finally(() => setReady(true));
  }, []);

  // ── Restore preferensi collapsed dari localStorage ────────────
  useEffect(() => {
    const stored = localStorage.getItem("jai_sidebar_collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  // ── Sinkronkan lebar sidebar ke CSS variable global ───────────
  // Dipakai oleh halaman lain lewat: style={{ paddingLeft: "var(--sidebar-width, 0px)" }}
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const applyWidth = () => {
      const width = mql.matches
        ? (collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED)
        : 0;
      document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
    };
    applyWidth();
    mql.addEventListener("change", applyWidth);
    return () => mql.removeEventListener("change", applyWidth);
  }, [collapsed]);

  // ── Tutup drawer mobile setiap kali pindah halaman ────────────
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("jai_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  const handleLogout = async () => {
    await fetch("/form-permit/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    sessionStorage.clear();
    router.push("/");
  };

  const sections = role ? getNavSections(role) : [];
  const initials = getInitials(userName);

  const isActive = (href: string) =>
    href === "/home" ? pathname === "/home" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Tombol hamburger — hanya mobile/tablet */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Buka menu navigasi"
        className="lg:hidden fixed top-4 left-4 z-40 flex items-center justify-center
                   w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-sm
                   text-slate-600 hover:text-orange-600 hover:border-orange-300 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop — hanya saat drawer mobile terbuka */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full flex flex-col
                    bg-slate-900 border-r border-slate-800
                    transition-transform duration-300 lg:transition-[width] lg:duration-300
                    w-[272px] ${collapsed ? "lg:w-20" : "lg:w-[272px]"}
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Header / brand */}
        <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-slate-800">
          <Link href="/home" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-bold text-white truncate">PT. JAI</p>
                <p className="text-[10px] text-slate-400 truncate">Form Permit System</p>
              </div>
            )}
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="lg:hidden p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigasi */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {!ready
            ? // Skeleton loading
              [0, 1].map((g) => (
                <div key={g} className="space-y-2">
                  {!collapsed && <div className="h-2.5 w-20 bg-slate-800 rounded animate-pulse mx-3 mb-2" />}
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 bg-slate-800/60 rounded-xl animate-pulse" />
                  ))}
                </div>
              ))
            : sections.map((section) => (
                <div key={section.label}>
                  {!collapsed && (
                    <p className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {section.label}
                    </p>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                      transition-colors ${collapsed ? "justify-center" : ""}
                                      ${
                                        active
                                          ? "bg-orange-500/15 text-orange-400"
                                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                      }`}
                        >
                          <Icon
                            className={`w-[18px] h-[18px] shrink-0 ${
                              active ? "text-orange-400" : "text-slate-400 group-hover:text-white"
                            }`}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && active && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
        </nav>

        {/* Footer: profil + logout */}
        <div className="shrink-0 border-t border-slate-800 p-3">
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-9 h-9 shrink-0 rounded-full bg-orange-500/15 text-orange-400 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{userName || "Pengguna"}</p>
                <p className="text-[11px] text-slate-400 truncate">{role ? ROLE_LABEL[role] : "—"}</p>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className={`mt-1 w-full flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-medium
                        text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors ${
                          collapsed ? "justify-center" : ""
                        }`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && "Keluar"}
          </button>
        </div>
      </aside>
    </>
  );
}