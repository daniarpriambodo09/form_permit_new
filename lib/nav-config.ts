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
  ShieldCheck,
} from "lucide-react";

export type UserRole =
  | "worker"
  | "firewatch"
  | "spv"
  | "kontraktor"
  | "admin_k3"
  | "sfo"
  | "smr"
  | "security"
  | "admin"
  | "purchasing"
  | "pengawas";

export const ROLE_LABEL: Record<UserRole, string> = {
  worker: "Worker",
  firewatch: "Fire Watch",
  spv: "SPV",
  kontraktor: "Kontraktor",
  admin_k3: "Admin K3",
  sfo: "SFO",
  smr: "SMR",
  security: "Security",
  admin: "Admin",
  purchasing: "Purchasing",
  pengawas: "Pengawas Dept",
};

const APPROVER_ROLES: UserRole[] = ["firewatch", "kontraktor", "admin_k3", "sfo", "smr", "security"];

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
          { label: "Kelola Departemen", href: "/kelola-departemen", icon: Building2 },
          { label: "Daftar File Form", href: "/form-files", icon: FileText },
          { label: "Pengaturan SMTP", href: "/smtp-settings", icon: Mail },
          { label: "Routing Email Admin K3", href: "/admin/admin-k3-routing", icon: Mail },
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

  if (role === "security") {
    return [
      {
        label: "Menu Utama",
        items: [
          beranda,
          { label: "Daftar Form", href: "/approval", icon: ClipboardList },
        ],
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

  if (role === "purchasing") {
    return [
      {
        label: "Menu Utama",
        items: [
          beranda,
          { label: "Penilaian Sub Kontraktor", href: "/purchasing", icon: ClipboardList },
        ],
      },
    ];
  }

  if (role === "pengawas") {
    return [
      {
        label: "Menu Utama",
        items: [
          beranda,
          { label: "Penilaian Sub Kontraktor", href: "/pengawas", icon: ClipboardList },
        ],
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
        description: "Statistik dan visualisasi seluruh pengajuan izin kerja secara real-time.",
        href: "/dashboard",
        icon: BarChart3,
      },
      {
        title: "Master Lisence",
        description: "Kelola lisensi sertifikasi Hot Work, Height Work, dan Workshop pekerja.",
        href: "/master-lisence",
        icon: BadgeCheck,
      },
      {
        title: "Kelola Pengguna",
        description: "Manajemen hak akses, role, dan akun pengguna seluruh departemen.",
        href: "/admin-users",
        icon: Users,
      },
    ];
  }

  if (role === "spv") {
    return [
      {
        title: "Form Menunggu Approval",
        description: "Daftar pengajuan izin kerja dari staf departemen yang perlu ditinjau.",
        href: "/approval",
        icon: ClipboardList,
      },
      {
        title: "Kelola Akun Departemen",
        description: "Kelola dan tinjau akun pekerja di bawah departemen Anda.",
        href: "/admin-users",
        icon: Users,
      },
      {
        title: "Riwayat Form Disetujui",
        description: "Arsip seluruh izin kerja yang telah disahkan oleh supervisor.",
        href: "/approval?status=approved",
        icon: History,
      },
    ];
  }

  if (role === "security") {
    return [
      {
        title: "Menunggu Safety Induction & TTD",
        description: "Izin kerja eksternal yang memerlukan verifikasi pos dan induksi K3.",
        href: "/approval",
        icon: ShieldCheck,
      },
      {
        title: "Riwayat Verifikasi Lapangan",
        description: "Arsip form eksternal yang telah diverifikasi oleh petugas security.",
        href: "/approval?status=approved",
        icon: History,
      },
    ];
  }

  if (role === "purchasing") {
    return [
      {
        title: "Penilaian Sub Kontraktor",
        description: "Verifikasi evaluasi K3 vendor dan otorisasi barcode persetujuan.",
        href: "/purchasing",
        icon: ClipboardList,
      },
      {
        title: "Ekspor Dokumen Penilaian",
        description: "Unduh rekap checklist evaluasi vendor ke format Excel atau PDF.",
        href: "/purchasing",
        icon: FileText,
      },
    ];
  }

  if (role === "pengawas") {
    return [
      {
        title: "Checklist Pengawasan Harian",
        description: "Input berkala evaluasi 8 item K3 selama masa pekerjaan subkontraktor.",
        href: "/pengawas",
        icon: ClipboardList,
      },
      {
        title: "Evaluasi Pasca Kerja",
        description: "Pemeriksaan housekeeping dan kebersihan area setelah pekerjaan tuntas.",
        href: "/pengawas",
        icon: ShieldCheck,
      },
    ];
  }

  if (APPROVER_ROLES.includes(role)) {
    return [
      {
        title: "Menunggu Tindakan Anda",
        description: "Daftar izin kerja yang memerlukan otorisasi dan barcode Anda saat ini.",
        href: "/approval",
        icon: ClipboardList,
      },
    ];
  }

  // worker
  return [
    {
      title: "Riwayat Pengajuan Saya",
      description: "Pantau status approval, QR digital, dan cetak dokumen izin kerja.",
      href: "/my-forms",
      icon: History,
    },
  ];
}