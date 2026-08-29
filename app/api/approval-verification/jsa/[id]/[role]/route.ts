import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

const roles = ["firewatch", "spv", "sfo"] as const;
type JsaRole = typeof roles[number];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; role: string }> }) {
  const { id, role } = await params;
  if (!roles.includes(role as JsaRole)) return NextResponse.json({ success: false, error: "Role JSA tidak valid" }, { status: 400 });

  try {
    const row = await queryOne<{ id_form: string; nama_kontraktor_pekerja: string | null; lokasi_pekerjaan: string | null; jsa_data: any }>(
      `SELECT id_form, nama_kontraktor_pekerja, lokasi_pekerjaan, jsa_data FROM form_ijin_kerja WHERE id_form = $1`, [id]
    );
    const entry = row?.jsa_data?.approval?.[role];
    if (!row || !entry?.approved) return NextResponse.json({ success: false, error: "Approval JSA belum dilakukan" }, { status: 404 });
    return NextResponse.json({ success: true, form: { id_form: row.id_form, nama: row.nama_kontraktor_pekerja, lokasi: row.lokasi_pekerjaan }, approver: { role, nama: entry.approvedBy, nik: entry.approvedNik, approved_at: entry.approvedAt } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
