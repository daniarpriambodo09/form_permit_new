// app/api/approval-verification/[jenisForm]/[id]/[role]/route.ts
// GET — endpoint publik (tidak butuh login) untuk verifikasi QR Code approval.
//
// REFACTOR: Logic query dipindah ke lib/approval-verification.ts supaya bisa
// dipakai langsung (in-process) oleh app/approval-verification/.../page.tsx
// tanpa perlu HTTP self-fetch (lihat catatan di lib/approval-verification.ts).
// Endpoint ini tetap dipertahankan untuk pemanggil eksternal (mis. testing
// manual, integrasi lain).
//
// Response sukses: { success: true, form: {...}, approver: {...} }
// Response gagal:  { success: false, error: "..." }

import { NextRequest, NextResponse } from "next/server";
import { getApprovalVerification } from "@/lib/approval-verification";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jenisForm: string; id: string; role: string }> }
) {
  const { jenisForm, id, role } = await params;
  const result = await getApprovalVerification(jenisForm, id, role);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, form: result.form, approver: result.approver });
}