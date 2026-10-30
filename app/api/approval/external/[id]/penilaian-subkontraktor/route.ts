// app/api/approval/external/[id]/penilaian-subkontraktor/route.ts
// Endpoint khusus untuk SFO / Admin menyetujui (approve) Form Penilaian Sub Kontraktor.

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { syncCascadeApproval } from "@/lib/approval-sync";
import { setAssignedApproverCascade } from "@/lib/admin-k3-routing";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "sfo" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya role SFO atau Admin yang dapat menyetujui Penilaian Sub Kontraktor." },
      { status: 403 }
    );
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  try {
    const existing = await queryOne<{ id_form: string; status: string; penilaian_subkontraktor: any }>(
      `SELECT id_form, status, penilaian_subkontraktor FROM form_ijin_kerja WHERE id_form = $1`,
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: "Form Ijin Kerja Eksternal tidak ditemukan" }, { status: 404 });
    }

    const currentData = existing.penilaian_subkontraktor || {
      entries: [],
      mengetahui: {
        sfo: { nama: "", tanggal: "" },
        purchasing: { nama: "", tanggal: "" },
        picDept: { nama: "", tanggal: "" },
      },
    };

    const entries = Array.isArray(currentData.entries) ? currentData.entries : [];
    const mengetahui = currentData.mengetahui || {};

    const updatedData = {
      entries,
      mengetahui: {
        ...mengetahui,
        sfo: {
          nama: user.nama || user.username || "SFO",
          nik: (user as any).nik || "",
          tanggal: new Date().toISOString().slice(0, 10),
        },
      },
    };

    await query(
      `UPDATE form_ijin_kerja
          SET penilaian_subkontraktor = $1,
              updated_at = NOW()
        WHERE id_form = $2`,
      [JSON.stringify(updatedData), id]
    );

    const nextApproverUserId = Number(body?.next_approver_user_id || 0);
    if (nextApproverUserId > 0) {
      await setAssignedApproverCascade(id, "smr", nextApproverUserId, user.userId);
    }

    // Sinkronisasi approval otomatis ke form induk, JSA, dan lampiran kerja untuk role SFO
    await syncCascadeApproval({
      idIjinKerja: id,
      role: "sfo",
      approverName: user.nama || user.username || "SFO",
      approverNik: (user as any).nik ?? null,
      now: new Date().toISOString(),
      origin: "penilaian-subkontraktor",
    });

    return NextResponse.json({
      success: true,
      message: "Form Penilaian Sub Kontraktor berhasil disetujui oleh SFO.",
      data: updatedData,
    });
  } catch (err: any) {
    console.error(`[PATCH /api/approval/external/${id}/penilaian-subkontraktor]`, err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
