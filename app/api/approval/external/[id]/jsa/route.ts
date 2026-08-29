import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME, UserRole } from "@/lib/auth";

const STAGE_ROLES: UserRole[] = ["firewatch", "spv", "sfo"];

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const action = body.action as "approve" | "reject";
  if (!(["approve", "reject"] as string[]).includes(action)) {
    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  }
  if (action === "reject" && !String(body.catatan_reject || "").trim()) {
    return NextResponse.json({ error: "Catatan penolakan JSA wajib diisi" }, { status: 400 });
  }

  try {
    const row = await queryOne<{ jsa_data: any; user_id: number | null }>(
      `SELECT jsa_data, user_id FROM form_ijin_kerja WHERE id_form = $1`,
      [id]
    );
    if (!row?.jsa_data) return NextResponse.json({ error: "JSA tidak ditemukan" }, { status: 404 });

    const jsa = row.jsa_data;
    const approval = jsa.approval;
    if (!approval || !Number.isInteger(approval.currentStage) || approval.currentStage < 1 || approval.currentStage > 3) {
      return NextResponse.json({ error: "Status approval JSA tidak valid" }, { status: 409 });
    }

    const requiredRole = STAGE_ROLES[approval.currentStage - 1];
    if (user.role !== requiredRole && user.role !== "admin") {
      return NextResponse.json({ error: `Approval JSA tahap ini membutuhkan role ${requiredRole}.` }, { status: 403 });
    }

    if (user.role === "spv") {
      const allowed = await queryOne(
        `SELECT 1 FROM form_ijin_kerja f JOIN users creator ON creator.id = f.user_id JOIN users approver ON approver.id = $2
          WHERE f.id_form = $1 AND creator.departmen = approver.departmen`,
        [id, user.userId]
      );
      if (!allowed) return NextResponse.json({ error: "SPV hanya dapat menyetujui JSA dari departemennya." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const role = requiredRole === "firewatch" ? "firewatch" : requiredRole;
    const entry = approval[role] || { approved: false, approvedBy: null, approvedNik: null, approvedAt: null };
    if (action === "reject") {
      approval.status = "rejected";
      approval.catatanReject = String(body.catatan_reject).trim();
    } else {
      entry.approved = true;
      entry.approvedBy = user.nama || user.username;
      entry.approvedNik = (user as { nik?: string | null }).nik ?? null;
      entry.approvedAt = now;
      approval[role] = entry;
      if (approval.currentStage === 3) {
        approval.status = "approved";
      } else {
        approval.currentStage += 1;
      }
    }

    await query(`UPDATE form_ijin_kerja SET jsa_data = $1, updated_at = $2 WHERE id_form = $3`, [JSON.stringify(jsa), now, id]);
    return NextResponse.json({ success: true, action, status: approval.status, currentStage: approval.currentStage });
  } catch (error: any) {
    console.error(`[PATCH /api/approval/external/${id}/jsa]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}