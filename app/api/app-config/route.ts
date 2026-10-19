// app/api/app-config/route.ts
import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await queryOne<{ app_url: string | null }>(
      `SELECT app_url FROM smtp_settings WHERE is_active = TRUE LIMIT 1`
    );

    const appUrl = (row?.app_url || "").trim().replace(/\/$/, "");

    return NextResponse.json({
      success: true,
      appUrl: appUrl || process.env.NEXT_PUBLIC_APP_URL || "",
    });
  } catch (error: any) {
    console.warn("[app-config] Gagal membaca app_url dari smtp_settings:", error);
    return NextResponse.json({
      success: false,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    });
  }
}
