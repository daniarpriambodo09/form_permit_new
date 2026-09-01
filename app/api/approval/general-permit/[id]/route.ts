// app/api/approval/general-permit/[id]/route.ts
// Approve/Reject untuk form Ijin Kerja Eksternal (form_ijin_kerja) pada
// stage yang diproses dengan "klik approve" biasa (bukan tanda tangan):
//   stage 2 = SPV
//   stage 4 = SFO
//   stage 5 = SMR / PGA Manager
// Stage 1 (Kontraktor) dan 3 (Security) diproses lewat endpoint TTD
// terpisah (sign-kontraktor & safety-induction/sign).

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME, UserRole } from "@/lib/auth";
import { notifyGeneralPermitNextApprover, notifyGeneralPermitRejected } from "@/lib/approval-email";

function getUser(req: NextRequest) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    return token ? verifyToken(token) : null;
}

const STAGE_ROLE_MAP: Record<
    number,
    { role: UserRole; approvedCol: string; byCol: string; atCol: string; nikCol: string }
> = {
    2: { role: "spv", approvedCol: "spv_approved", byCol: "spv_approved_by", atCol: "spv_approved_at", nikCol: "spv_nik" },
    4: { role: "sfo", approvedCol: "sfo_approved", byCol: "sfo_approved_by", atCol: "sfo_approved_at", nikCol: "sfo_nik" },
    5: { role: "smr", approvedCol: "pga_approved", byCol: "pga_approved_by", atCol: "pga_approved_at", nikCol: "pga_nik" },
};

// ── GET: detail ringkas untuk keperluan approval (opsional, dipakai
//    kalau nanti dibutuhkan halaman approval khusus general-permit) ──
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    try {
        const row = await queryOne(`SELECT * FROM form_ijin_kerja WHERE id_form = $1`, [id]);
        if (!row) return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
        return NextResponse.json({ success: true, data: row });
    } catch (err: any) {
        console.error(`[GET /api/approval/general-permit/${id}]`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── PATCH: Approve / Reject ───────────────────────────────────
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = user.role as UserRole;

    const { id } = await params;
    const body = await req.json();
    const action = body.action as "approve" | "reject";
    const catatanReject = body.catatan_reject ?? "";

    if (!["approve", "reject"].includes(action)) {
        return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }
    if (action === "reject" && !catatanReject.trim()) {
        return NextResponse.json({ error: "Catatan reject wajib diisi" }, { status: 400 });
    }

    try {
        const form = await queryOne<any>(
            `SELECT id_form, status, current_stage, user_id, tanggal, nama_kontraktor_pekerja
             FROM form_ijin_kerja WHERE id_form = $1`,
            [id]
        );
        if (!form) return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
        if (form.status !== "submitted") {
            return NextResponse.json(
                { error: `Form status "${form.status}" tidak bisa diproses` },
                { status: 400 }
            );
        }

        const currentStage = form.current_stage;
        const now = new Date().toISOString();
        const userName = user.nama || user.username;

        // ── REJECT ─────────────────────────────────────────────────
        if (action === "reject") {
            await query(
                `UPDATE form_ijin_kerja
            SET status = 'rejected',
                catatan_reject = $1,
                approved_by = $2,
                approved_at = $3,
                updated_at = $3
          WHERE id_form = $4`,
                [catatanReject, userName, now, id]
            );

            notifyGeneralPermitRejected({
                idForm: id,
                userId: form.user_id,
                namaApprover: userName,
                catatanReject,
            }).catch((err) => {
                console.error(`[EMAIL] rejection email error for ${id}:`, err);
            });

            return NextResponse.json({ success: true, action: "rejected", id_form: id });
        }

        // ── APPROVE ────────────────────────────────────────────────
        const stageInfo = STAGE_ROLE_MAP[currentStage];
        if (!stageInfo && userRole !== "admin") {
            return NextResponse.json(
                { error: "Stage form ini tidak dapat diproses lewat endpoint ini." },
                { status: 400 }
            );
        }

        const canApprove = userRole === "admin" || (stageInfo && userRole === stageInfo.role);
        if (!canApprove) {
            return NextResponse.json(
                { error: `Stage ini membutuhkan role "${stageInfo?.role}". Anda adalah "${userRole}".` },
                { status: 403 }
            );
        }

        const isLastStage = currentStage === 5;
        const nextStage = currentStage + 1;
        const cols = stageInfo!;

        const setClauses: string[] = [
            `${cols.approvedCol} = $1`,
            `${cols.byCol} = $2`,
            `${cols.atCol} = $3`,
            `${cols.nikCol} = $4`,
        ];
        const values: any[] = [true, userName, now, (user as any).nik ?? null];
        let idx = values.length + 1;

        if (isLastStage) {
            setClauses.push(`status = $${idx++}`); values.push("approved");
            setClauses.push(`approved_by = $${idx++}`); values.push(userName);
            setClauses.push(`approved_at = $${idx++}`); values.push(now);
        } else {
            setClauses.push(`current_stage = $${idx++}`); values.push(nextStage);
        }
        setClauses.push(`updated_at = $${idx++}`); values.push(now);
        values.push(id);

        await query(
            `UPDATE form_ijin_kerja SET ${setClauses.join(", ")} WHERE id_form = $${idx}`,
            values
        );

        if (!isLastStage) {
            notifyGeneralPermitNextApprover({
                idForm: id,
                nextStage,
                userId: form.user_id,
                namaPemohon: form.nama_kontraktor_pekerja || "-",
                tanggal: form.tanggal,
            }).catch((err) => {
                console.error(`[EMAIL] notify next after stage ${currentStage} approve ${id}:`, err);
            });
        }

        return NextResponse.json({
            success: true,
            action: "approved",
            id_form: id,
            next_stage: isLastStage ? null : nextStage,
            is_completed: isLastStage,
        });
    } catch (err: any) {
        console.error(`[PATCH /api/approval/general-permit/${id}]`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}