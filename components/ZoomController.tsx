// components/ZoomController.tsx
// Mengontrol skala zoom tampilan:
// - Halaman awal / root (/) dan login tetap 100% (zoom normal)
// - Seluruh halaman internal lainnya menggunakan skala 80% (zoom: 0.8)
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ZoomController() {
  const pathname = usePathname();

  useEffect(() => {
    const isRoot = pathname === "/" || pathname === "/login" || pathname?.startsWith("/login/");
    if (isRoot) {
      document.documentElement.classList.add("no-zoom");
    } else {
      document.documentElement.classList.remove("no-zoom");
    }
  }, [pathname]);

  return null;
}

