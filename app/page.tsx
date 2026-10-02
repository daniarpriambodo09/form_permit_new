// app/page.tsx
"use client";

import { Suspense } from "react";
import UnifiedLoginPage from "@/components/UnifiedLoginPage";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      }
    >
      <UnifiedLoginPage defaultRole="worker" />
    </Suspense>
  );
}