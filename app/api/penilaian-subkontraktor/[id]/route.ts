// app/api/penilaian-subkontraktor/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { notifySfoPenilaianApproved } from "@/lib/approval-email";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const row = await queryOne<any>(
      `SELECT id_form, status, nama_kontraktor_pekerja, nama_pengawas_pic_subkont,
              lokasi_pekerjaan, tanggal, tanggal_pelaksanaan,
              izin_kerja_tanggal_dari, izin_kerja_tanggal_sampai,
              penilaian_subkontraktor, created_at, updated_at
         FROM form_ijin_kerja
        WHERE id_form = $1`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }

    const pen = typeof row.penilaian_subkontraktor === "string"
      ? JSON.parse(row.penilaian_subkontraktor)
      : (row.penilaian_subkontraktor || { entries: [], mengetahui: {} });

    return NextResponse.json({
      success: true,
      data: {
        id_form: row.id_form,
        status: row.status,
        nama_kontraktor_pekerja: row.nama_kontraktor_pekerja,
        pimpinan_kontraktor: row.nama_pengawas_pic_subkont || "-",
        lokasi_pekerjaan: row.lokasi_pekerjaan,
        tanggal: row.tanggal,
        tanggal_pelaksanaan: row.tanggal_pelaksanaan,
        izin_kerja_tanggal_dari: row.izin_kerja_tanggal_dari,
        izin_kerja_tanggal_sampai: row.izin_kerja_tanggal_sampai,
        penilaian_subkontraktor: pen,
      },
    });
  } catch (err: any) {
    console.error(`[GET /api/penilaian-subkontraktor/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { entries, mengetahui } = body;

    const row = await queryOne<any>(
      `SELECT id_form, penilaian_subkontraktor, status FROM form_ijin_kerja WHERE id_form = $1`,
      [id]
    );
    if (!row) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }

    const currentPen = typeof row.penilaian_subkontraktor === "string"
      ? JSON.parse(row.penilaian_subkontraktor)
      : (row.penilaian_subkontraktor || { entries: [], mengetahui: {} });

    const newPen = {
      entries: Array.isArray(entries) ? entries : currentPen.entries || [],
      mengetahui: {
        ...(currentPen.mengetahui || {}),
        ...(mengetahui || {}),
      },
    };

    await query(
      `UPDATE form_ijin_kerja
          SET penilaian_subkontraktor = $1,
              updated_at = NOW()
        WHERE id_form = $2`,
      [JSON.stringify(newPen), id]
    );

    return NextResponse.json({ success: true, data: newPen });
  } catch (err: any) {
    console.error(`[PATCH /api/penilaian-subkontraktor/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { action, nama, nik, tanggal, entries } = body;

    const row = await queryOne<any>(
      `SELECT id_form, status, nama_kontraktor_pekerja, lokasi_pekerjaan, tanggal,
              izin_kerja_tanggal_dari, izin_kerja_tanggal_sampai, penilaian_subkontraktor
         FROM form_ijin_kerja
        WHERE id_form = $1`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }

    const currentPen = typeof row.penilaian_subkontraktor === "string"
      ? JSON.parse(row.penilaian_subkontraktor)
      : (row.penilaian_subkontraktor || { entries: [], mengetahui: {} });

    const currentMengetahui = currentPen.mengetahui || {};
    const effectiveEntries = Array.isArray(entries) ? entries : currentPen.entries || [];

    const approverNama = (nama || user.nama || user.username || "").trim();
    const approverNik = (nik || user.nik || "").trim();
    const approverTanggal = tanggal || todayStr();

    if (action === "approve_pengawas") {
      // Pastikan ada entri yang diisi
      if (effectiveEntries.length === 0) {
        return NextResponse.json(
          { error: "Mohon isi checklist penilaian terlebih dahulu sebelum menyetujui." },
          { status: 400 }
        );
      }

      const updatedMengetahui = {
        ...currentMengetahui,
        pengawasDept: {
          nama: approverNama,
          nik: approverNik,
          tanggal: approverTanggal,
        },
        picDept: {
          nama: approverNama,
          nik: approverNik,
          tanggal: approverTanggal,
        },
      };

      const updatedPen = {
        entries: effectiveEntries,
        mengetahui: updatedMengetahui,
      };

      await query(
        `UPDATE form_ijin_kerja
            SET penilaian_subkontraktor = $1,
                updated_at = NOW()
          WHERE id_form = $2`,
        [JSON.stringify(updatedPen), id]
      );

      // Tidak perlu kirim email saat pengawas approve (langsung muncul di halaman Purchasing)
      return NextResponse.json({
        success: true,
        message: "Penilaian Sub Kontraktor berhasil disetujui oleh Pengawas Dept",
        data: updatedPen,
      });
    }

    if (action === "approve_purchasing") {
      const updatedMengetahui = {
        ...currentMengetahui,
        purchasing: {
          nama: approverNama,
          nik: approverNik,
          tanggal: approverTanggal,
        },
      };

      const updatedPen = {
        entries: effectiveEntries,
        mengetahui: updatedMengetahui,
      };

      await query(
        `UPDATE form_ijin_kerja
            SET penilaian_subkontraktor = $1,
                updated_at = NOW()
          WHERE id_form = $2`,
        [JSON.stringify(updatedPen), id]
      );

      // Sesuai requirement: ketika purchasing approve, kirim email ke SFO yang terdaftar
      await notifySfoPenilaianApproved({
        idForm: row.id_form,
        namaKontraktor: row.nama_kontraktor_pekerja,
        lokasi: row.lokasi_pekerjaan,
        tanggal: row.tanggal,
      });

      return NextResponse.json({
        success: true,
        message: "Penilaian Sub Kontraktor berhasil disetujui oleh Purchasing dan notifikasi dikirim ke SFO",
        data: updatedPen,
      });
    }

    return NextResponse.json({ error: "Aksi approval tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    console.error(`[POST /api/penilaian-subkontraktor/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
