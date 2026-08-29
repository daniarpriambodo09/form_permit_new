import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "security" && user.role !== "admin") return NextResponse.json({ error: "Hanya Security yang dapat mengisi Safety Induction." }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const value = body.safetyInduction;
  if (!value || typeof value !== "object") return NextResponse.json({ error: "Data Safety Induction wajib diisi." }, { status: 400 });
  if (!String(value.namaSubcont || "").trim() || !String(value.aktivitasPekerjaan || "").trim() || !Array.isArray(value.namaPekerja) || !value.namaPekerja.some((name: unknown) => typeof name === "string" && name.trim())) {
    return NextResponse.json({ error: "Nama Subcont, Aktivitas Pekerjaan, dan minimal satu pekerja wajib diisi." }, { status: 400 });
  }
  const existing = await queryOne<{ safety_induction: any }>(`SELECT safety_induction FROM form_ijin_kerja WHERE id_form = $1`, [id]);
  if (!existing) return NextResponse.json({ error: "Form eksternal tidak ditemukan." }, { status: 404 });
  const current = existing.safety_induction || {};
  const next = { ...value, status: body.submit ? "approved" : "draft", approvedBy: body.submit ? (user.nama || user.username) : current.approvedBy || null, approvedAt: body.submit ? new Date().toISOString() : current.approvedAt || null };
  await query(
    `UPDATE form_ijin_kerja
        SET safety_induction = $1,
            security_approved = CASE WHEN $3 = TRUE THEN TRUE ELSE security_approved END,
            security_approved_by = CASE WHEN $3 = TRUE THEN $4 ELSE security_approved_by END,
            security_approved_at = CASE WHEN $3 = TRUE THEN NOW() ELSE security_approved_at END,
            updated_at = NOW()
      WHERE id_form = $2`,
    [JSON.stringify(next), id, Boolean(body.submit), user.nama || user.username]
  );
  return NextResponse.json({ success: true, data: next });
}
