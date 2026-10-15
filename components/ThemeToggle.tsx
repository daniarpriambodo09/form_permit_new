// components/ThemeToggle.tsx
"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "floating" | "compact";
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`}
      />
    );
  }

  const isDark = theme === "dark";

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle tema gelap atau terang"
        title={isDark ? "Beralih ke Tema Terang" : "Beralih ke Tema Gelap"}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-2xl border backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 ${
          isDark
            ? "bg-slate-800/95 text-amber-300 border-slate-700 hover:bg-slate-700 hover:border-amber-400/60 shadow-black/60"
            : "bg-white/95 text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-slate-400/20"
        } ${className}`}
      >
        <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0">
          {isDark ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-in spin-in-90 duration-300" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 animate-in spin-in-90 duration-300" />
          )}
        </div>
        <span className="text-xs font-bold tracking-tight">
          {isDark ? "Mode Terang" : "Mode Gelap"}
        </span>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle tema gelap atau terang"
        title={isDark ? "Beralih ke Tema Terang" : "Beralih ke Tema Gelap"}
        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 cursor-pointer active:scale-95 ${
          isDark
            ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700 hover:border-slate-600"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 animate-in spin-in-90 duration-300" />
        ) : (
          <Moon className="w-4 h-4 animate-in spin-in-90 duration-300" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle tema gelap atau terang"
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer active:scale-95 ${
        isDark
          ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700 hover:border-slate-600"
          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
      } ${className}`}
    >
      <div className="w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600" />
        )}
      </div>
      <span>{isDark ? "Mode Terang" : "Mode Gelap"}</span>
    </button>
  );
}

export default ThemeToggle;
