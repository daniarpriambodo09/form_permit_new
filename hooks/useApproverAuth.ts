// hooks/useApproverAuth.ts
// Reusable hook untuk memproteksi halaman approver.
// Memanggil GET /form-permit/api/auth/me dengan credentials: "include".
// Jika 401/403/user tidak ditemukan → redirect ke /login/approver?redirect=<currentPath>
// Jika role bukan approver → redirect ke /home
"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface ApproverUser {
  userId:    number;
  username:  string;
  nama:      string;
  jabatan:   string;
  role:      string;
  nik:       string | null;
  departmen: string | null;
}

const APPROVER_ROLES = ["spv", "admin", "kontraktor", "sfo", "smr", "firewatch", "admin_k3"];

interface UseApproverAuthResult {
  user:    ApproverUser | null;
  loading: boolean;
}

export function useApproverAuth(): UseApproverAuthResult {
  const router   = useRouter();
  const pathname = usePathname();

  const [user,    setUser]    = useState<ApproverUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const res = await fetch("/form-permit/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          redirectToLogin(pathname);
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        if (!data?.user) {
          redirectToLogin(pathname);
          return;
        }

        const u: ApproverUser = data.user;

        // Jika role bukan approver, kirim ke /home
        if (!APPROVER_ROLES.includes(u.role)) {
          router.replace("/home");
          return;
        }

        // Sinkronkan sessionStorage (hanya untuk tampilan nama, bukan auth)
        sessionStorage.setItem("user_nama",    u.nama);
        sessionStorage.setItem("user_jabatan", u.jabatan);
        sessionStorage.setItem("user_role",    u.role);

        setUser(u);
      } catch {
        if (!cancelled) redirectToLogin(pathname);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function redirectToLogin(path: string) {
      const redirect = encodeURIComponent(path);
      router.replace(`/login/approver?redirect=${redirect}`);
    }

    checkAuth();

    return () => { cancelled = true; };
  }, []);                // eslint-disable-line react-hooks/exhaustive-deps
  // pathname hanya dibaca sekali saat mount — intentional

  return { user, loading };
}