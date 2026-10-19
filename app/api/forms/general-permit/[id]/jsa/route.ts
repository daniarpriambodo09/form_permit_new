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

  const row = await queryOne<{
    id_form: string;
    perlu_jsa: boolean | null;
    jsa_file_url: string | null;
    jsa_data: any;
  }>(
    `SELECT id_form, perlu_jsa, jsa_file_url, jsa_data FROM form_ijin_kerja WHERE id_form = $1`,
    [id]
  );

  if (!row) return NextResponse.json({ error: "Form eksternal tidak ditemukan" }, { status: 404 });

  const jsaData = typeof row.jsa_data === "string" ? JSON.parse(row.jsa_data) : (row.jsa_data || null);
  const jsaFileUrl = row.jsa_file_url || jsaData?.fileUrl || null;
  const isUpload = Boolean(jsaFileUrl) || jsaData?.mode === "upload";

  return NextResponse.json({
    success: true,
    id_form: row.id_form,
    perluJsa: row.perlu_jsa ?? Boolean(jsaFileUrl || jsaData),
    jsaFileUrl,
    jsaData,
    jsaMode: isUpload ? "upload" : "build",
  });
}
