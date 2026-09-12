// app/api/forms/general-permit/[id]/penilaian-subkontraktor/route.ts
// Lampiran "Form Penilaian Sub Kontraktor" untuk Ijin Kerja Eksternal.
// Diisi oleh administrator departemen (worker) lewat tablet, bebas kapan
// saja (bukan bagian dari alur approval bertahap) — mirip filosofi tanda
// tangan Kontraktor yang bebas, bukan mirip Safety Induction yang terikat
// stage Security.
//
// GET   -> ambil data saat ini (untuk render form)
// PATCH -> simpan/replace seluruh data (entries + mengetahui). Frontend
//          mengirim objek PenilaianSubkontraktorData yang sudah lengkap
//          (component PenilaianSubkontraktorSection mengelola state-nya
//          sendiri lalu mengirim whole object ke sini setiap kali user
//          menekan "Simpan").

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

const MAX_ENTRIES = 5;
const VALID_RATINGS = ["baik_sekali", "baik", "sedang", "kurang", ""];
const ITEM_KEYS = [
  "kelengkapanApd",
  "kedisiplinanApd",
  "adanyaPengawasan",
  "bekerjaSesuaiIjin",
  "kepatuhanPeraturan",
  "bekerjaAman",
  "tidakAdaKecelakaan",
];

function isValidEntry(e: any): boolean {
  if (!e || typeof e !== "object") return false;
  if (typeof e.tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.tanggal)) return false;
  if (!e.items || typeof e.items !== "object") return false;
  for (const key of ITEM_KEYS) {
    if (!VALID_RATINGS.includes(e.items[key] ?? "")) return false;
  }
  return true;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const row = await queryOne<{ penilaian_subkontraktor: any; status: string }>(
      `SELECT penilaian_subkontraktor, status FROM form_ijin_kerja WHERE id_form = $1`,
      [id]
    );
    if (!row) return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ success: true, data: row.penilaian_subkontraktor ?? null });
  } catch (err: any) {
    console.error(`[GET .../penilaian-subkontraktor] ${id}`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { entries, mengetahui } = body;

  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) {
    return NextResponse.json(
      { error: `Data checklist tidak valid (maksimal ${MAX_ENTRIES} entry).` },
      { status: 400 }
    );
  }
  for (const e of entries) {
    if (!isValidEntry(e)) {
      return NextResponse.json({ error: "Salah satu entry checklist tidak valid." }, { status: 400 });
    }
  }
  if (mengetahui !== undefined && typeof mengetahui !== "object") {
    return NextResponse.json({ error: "Data 'Mengetahui' tidak valid." }, { status: 400 });
  }

  const existing = await queryOne<{ id_form: string; status: string }>(
    `SELECT id_form, status FROM form_ijin_kerja WHERE id_form = $1`,
    [id]
  );
  if (!existing) return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
  // Form penilaian ini adalah checklist lapangan harian — boleh diisi
  // selama form tidak dalam status draft (belum diajukan) atau sudah
  // dihapus/dibatalkan. Diperbolehkan untuk status submitted maupun
  // approved, karena pekerjaan lapangan bisa berlangsung setelah approval
  // penuh diberikan.
  if (existing.status === "draft") {
    return NextResponse.json(
      { error: "Form induk masih draft — ajukan form terlebih dahulu sebelum mengisi checklist ini." },
      { status: 409 }
    );
  }

  const payload = {
    entries: entries.map((e: any) => ({
      tanggal: e.tanggal,
      items: Object.fromEntries(ITEM_KEYS.map((k) => [k, e.items[k] ?? ""])),
      catatan: typeof e.catatan === "string" ? e.catatan : "",
      filledBy: e.filledBy ?? user.nama ?? user.username ?? null,
      filledAt: e.filledAt ?? new Date().toISOString(),
    })),
    mengetahui: mengetahui ?? {
      sfo: { nama: "", tanggal: "" },
      purchasing: { nama: "", tanggal: "" },
      picDept: { nama: "", tanggal: "" },
    },
  };

  await query(
    `UPDATE form_ijin_kerja
        SET penilaian_subkontraktor = $1,
            updated_at = NOW()
      WHERE id_form = $2`,
    [JSON.stringify(payload), id]
  );

  return NextResponse.json({ success: true, data: payload });
}