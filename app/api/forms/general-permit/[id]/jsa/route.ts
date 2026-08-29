import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await queryOne<{ jsa_data: unknown }>(
    `SELECT jsa_data FROM form_ijin_kerja WHERE id_form = $1 AND user_id = $2`,
    [id, user.userId]
  );
  if (!row) return NextResponse.json({ error: "Form eksternal tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ jsaData: row.jsa_data ?? null });
}
