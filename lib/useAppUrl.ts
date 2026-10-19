// lib/useAppUrl.ts
"use client";
import { useEffect, useState } from "react";

let cachedAppUrl: string | null = null;

export function useAppUrl(): string {
  const [appUrl, setAppUrl] = useState<string>(() => {
    if (cachedAppUrl) return cachedAppUrl;
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  });

  useEffect(() => {
    if (cachedAppUrl) {
      setAppUrl(cachedAppUrl);
      return;
    }

    fetch("/api/app-config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.appUrl && typeof data.appUrl === "string" && data.appUrl.trim()) {
          const cleanUrl = data.appUrl.trim().replace(/\/$/, "");
          cachedAppUrl = cleanUrl;
          setAppUrl(cleanUrl);
        } else if (typeof window !== "undefined") {
          cachedAppUrl = window.location.origin;
          setAppUrl(window.location.origin);
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          setAppUrl(window.location.origin);
        }
      });
  }, []);

  return appUrl;
}
