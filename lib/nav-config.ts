// lib/nav-config.ts
// Satu sumber kebenaran untuk struktur navigasi aplikasi.
// Dipakai oleh components/Sidebar.tsx (menu utama) dan app/home/page.tsx
// (kartu "Akses Cepat"), supaya label, href, dan ikon antar keduanya
// selalu konsisten dan tidak perlu diubah di dua tempat berbeda.
import { LucideIcon, Building2 } from "lucide-react";
import {
  Home,
  BarChart3,
  ClipboardList,
  Users,
  FileText,
  Mail,
  BadgeCheck,
  History,
} from "lucide-react";

export type UserRole =
  | "worker"
  | "firewatch"
  | "spv"
  | "kontraktor"
  | "admin_k3"
  | "sfo"
  | "smr"
  | "admin";

export const ROLE_LABEL: Record<UserRole, string> = {
  worker: "Worker",
  firewatch: "Fire Watch",
  spv: "SPV",
  kontraktor: "Kontraktor",
  admin_k3: "Admin K3",
  sfo: "SFO",
  smr: "SMR",
  admin: "Admin",
};

const APPROVER_ROLES: UserRole[] = ["firewatch", "kontraktor", "admin_k3", "sfo", "smr"];

// ── Sidebar: grup menu utama ────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export function getNavSections(role: UserRole): NavSection[] {
  const beranda: NavItem = { label: "Beranda", href: "/home", icon: Home };

  if (role === "admin") {
    return [
      {
        label: "Menu Utama",
        items: [
          beranda,
          { label: "Dashboard Analitik", href: "/dashboard", icon: BarChart3 },
          { label: "Daftar Form", href: "/approval", icon: ClipboardList },
        ],
      },
      {
        label: "Administrasi",
        items: [
          { label: "Kelola Akun Users", href: "/admin-users", icon: Users },
          { label: "Master Lisence", href: "/master-lisence", icon: BadgeCheck },
          { label: "Kelola Departemen", href: "/kelola-departemen", icon: Building2 }, // ← baru
          { label: "Daftar File Form", href: "/form-files", icon: FileText },
          { label: "Pengaturan SMTP", href: "/smtp-settings", icon: Mail },
        ],
      },
    ];
  }

  if (role === "spv") {
    return [
      {
        label: "Menu Utama",
        items: [beranda, { label: "Daftar Form", href: "/approval", icon: ClipboardList }],
      },
      {
        label: "Administrasi",
        items: [{ label: "Kelola Akun Departemen", href: "/admin-users", icon: Users }],
      },
    ];
  }

  if (APPROVER_ROLES.includes(role)) {
    return [
      {
        label: "Menu Utama",
        items: [beranda, { label: "Daftar Form", href: "/approval", icon: ClipboardList }],
      },
    ];
  }

  // worker
  return [
    {
      label: "Menu Utama",
      items: [beranda, { label: "Riwayat Form", href: "/my-forms", icon: History }],
    },
  ];
}

// ── Home: kartu "Akses Cepat" (kurasi, bukan daftar lengkap) ────
export interface FeaturedCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export function getFeaturedCards(role: UserRole): FeaturedCard[] {
  if (role === "admin") {
    return [
      {
        title: "Dashboard Analitik",
        description: "Statistik dan visualisasi seluruh pengajuan izin kerja.",
        href: "/dashboard",
        icon: BarChart3,
      },
      {
        title: "Master Lisence",
        description: "Kelola lisence Hot Work, Height Work, dan Workshop pekerja.",
        href: "/master-lisence",
        icon: BadgeCheck,
      },
      {
        title: "Pengaturan SMTP",
        description: "Atur server email untuk notifikasi approval.",
        href: "/smtp-settings",
        icon: Mail,
      },
    ];
  }

  if (role === "spv") {
    return [
      {
        title: "Daftar Form",
        description: "Form yang menunggu approval dari departemen Anda.",
        href: "/approval",
        icon: ClipboardList,
      },
      {
        title: "Kelola Akun Departemen",
        description: "Tambah atau hapus akun administrator di departemen Anda.",
        href: "/admin-users",
        icon: Users,
      },
    ];
  }

  if (APPROVER_ROLES.includes(role)) {
    return [
      {
        title: "Daftar Form",
        description: "Lihat dan proses form yang memerlukan approval Anda.",
        href: "/approval",
        icon: ClipboardList,
      },
    ];
  }

  // worker
  return [
    {
      title: "Riwayat Form",
      description: "Lihat status dan kelola seluruh pengajuan izin kerja Anda.",
      href: "/my-forms",
      icon: History,
    },
  ];
}