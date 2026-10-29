// app/api/inspeksi-scaffolding/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { notifyFirstApprover } from "@/lib/approval-email";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

// ── GET: Ambil detail inspeksi scaffolding beserta data form ketinggian ──
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const form = await queryOne<any>(
      `SELECT 
        k.*,
        s.id AS inspection_id,
        s.nama_inspektor,
        s.tanggal_inspeksi,
        s.lokasi AS inspection_lokasi,
        s.tipe_perancah,
        COALESCE(s.status, 'menunggu_inspeksi') AS inspection_status,
        COALESCE(s.current_stage, 1) AS current_stage,
        COALESCE(s.spv_approved, false) AS spv_approved,
        s.spv_approved_by,
        s.spv_approved_at,
        COALESCE(s.sfo_approved, false) AS sfo_approved,
        s.sfo_approved_by,
        s.sfo_approved_at,
        COALESCE(s.kontraktor_approved, false) AS kontraktor_approved,
        s.kontraktor_approved_by,
        s.kontraktor_approved_at,
        s.pengawas_nama,
        s.pengawas_submitted_at,
        s.catatan_reject,
        s.rejected_by,
        s.rejected_at,
        s.items,
        s.ketentuan_lainnya
      FROM form_kerja_ketinggian k
      LEFT JOIN inspeksi_scaffolding s ON k.id_form = s.id_form
      WHERE k.id_form = $1`,
      [id]
    );

    if (!form) {
      return NextResponse.json({ error: "Form ketinggian tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: form });
  } catch (err: any) {
    console.error("[GET /api/inspeksi-scaffolding/[id]]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT / POST: Pengawas menyimpan draft atau mengajukan hasil inspeksi ──
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pengawas dan Admin yang berhak mengisi/mengedit inspeksi
  if (user.role !== "pengawas" && user.role !== "admin") {
    return NextResponse.json({ error: "Hanya Pengawas atau Admin yang dapat mengisi inspeksi scaffolding" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const {
      nama_inspektor,
      tanggal_inspeksi,
      lokasi,
      tipe_perancah,
      items,
      ketentuan_lainnya,
      isSubmit,
    } = body;

    const form = await queryOne<any>(
      `SELECT id_form, id_ijin_kerja, lokasi, status FROM form_kerja_ketinggian WHERE id_form = $1`,
      [id]
    );
    if (!form) {
      return NextResponse.json({ error: "Form ketinggian tidak ditemukan" }, { status: 404 });
    }

    const newStatus = isSubmit ? "submitted" : "draft";
    const currentStage = isSubmit ? 1 : 1; // Stage 1: SPV Terkait
    const inspectorName = nama_inspektor || user.nama || user.username;
    const inspectDate = tanggal_inspeksi ? new Date(tanggal_inspeksi).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const loc = lokasi || form.lokasi || "-";
    const perancah = tipe_perancah || "Frame Scaffolding";

    const saved = await queryOne<any>(
      `INSERT INTO inspeksi_scaffolding (
        id_form,
        id_ijin_kerja,
        nama_inspektor,
        tanggal_inspeksi,
        lokasi,
        tipe_perancah,
        status,
        current_stage,
        items,
        ketentuan_lainnya,
        pengawas_id,
        pengawas_nama,
        pengawas_submitted_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ${isSubmit ? 'NOW()' : 'NULL'}, NOW()
      )
      ON CONFLICT (id_form) DO UPDATE SET
        nama_inspektor = EXCLUDED.nama_inspektor,
        tanggal_inspeksi = EXCLUDED.tanggal_inspeksi,
        lokasi = EXCLUDED.lokasi,
        tipe_perancah = EXCLUDED.tipe_perancah,
        status = EXCLUDED.status,
        current_stage = CASE WHEN inspeksi_scaffolding.status = 'rejected' OR EXCLUDED.status = 'submitted' THEN 1 ELSE inspeksi_scaffolding.current_stage END,
        items = EXCLUDED.items,
        ketentuan_lainnya = EXCLUDED.ketentuan_lainnya,
        pengawas_id = EXCLUDED.pengawas_id,
        pengawas_nama = EXCLUDED.pengawas_nama,
        pengawas_submitted_at = CASE WHEN EXCLUDED.status = 'submitted' THEN NOW() ELSE inspeksi_scaffolding.pengawas_submitted_at END,
        catatan_reject = NULL,
        rejected_by = NULL,
        rejected_at = NULL,
        updated_at = NOW()
      RETURNING *`,
      [
        id,
        form.id_ijin_kerja || null,
        inspectorName,
        inspectDate,
        loc,
        perancah,
        newStatus,
        currentStage,
        JSON.stringify(items || []),
        JSON.stringify(ketentuan_lainnya || []),
        user.userId || null,
        user.nama || user.username || "Pengawas",
      ]
    );

    // Trigger kirim email ke approver pertama (SPV) jika status form height-work submitted dan baru saja di-submit inspeksinya
    if (isSubmit && form && form.status === 'submitted' && form.user_id && !form.id_ijin_kerja) {
      notifyFirstApprover({
        formType: 'height-work',
        idForm: form.id_form,
        tipePerusahaan: form.tipe_perusahaan || 'internal',
        userId: form.user_id,
        namaPemohon: form.nama_pengawas_departemen || form.petugas_ketinggian || form.nama_kontraktor || user.nama || 'Pengawas',
        tanggal: new Date().toISOString(),
      }).catch((err) => {
        console.error(`[EMAIL] Background first-approver email error for ${form.id_form} after scaffolding submitted:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      message: isSubmit
        ? "Inspeksi scaffolding berhasil diajukan ke tahap approval (SPV Terkait)."
        : "Draft inspeksi scaffolding berhasil disimpan.",
      data: saved,
    });
  } catch (err: any) {
    console.error("[PUT /api/inspeksi-scaffolding/[id]]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Alur Approval Berjenjang (SPV Terkait -> SFO -> Kontraktor) ──
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, catatan } = body; // action: 'approve' | 'reject'

    const inspection = await queryOne<any>(
      `SELECT * FROM inspeksi_scaffolding WHERE id_form = $1`,
      [id]
    );

    if (!inspection) {
      return NextResponse.json({ error: "Data inspeksi scaffolding belum tersedia" }, { status: 404 });
    }

    if (action === "reject") {
      const updated = await queryOne<any>(
        `UPDATE inspeksi_scaffolding
         SET status = 'rejected',
             catatan_reject = $1,
             rejected_by = $2,
             rejected_at = NOW(),
             updated_at = NOW()
         WHERE id_form = $3
         RETURNING *`,
        [catatan || "Ditolak saat pemeriksaan approval scaffolding", user.nama || user.username, id]
      );
      return NextResponse.json({
        success: true,
        message: "Inspeksi scaffolding telah ditolak.",
        data: updated,
      });
    }

    if (action === "approve") {
      const stage = inspection.current_stage || 1;
      const userRole = user.role;

      // Stage 1: SPV Terkait
      if (stage === 1) {
        if (userRole !== "spv" && userRole !== "admin") {
          return NextResponse.json({ error: "Hanya SPV Terkait atau Admin yang berhak menyetujui pada Tahap 1" }, { status: 403 });
        }

        const updated = await queryOne<any>(
          `UPDATE inspeksi_scaffolding
           SET spv_approved = TRUE,
               spv_approved_by = $1,
               spv_approved_at = NOW(),
               current_stage = 2,
               updated_at = NOW()
           WHERE id_form = $2
           RETURNING *`,
          [user.nama || user.username, id]
        );
        return NextResponse.json({
          success: true,
          message: "Tahap 1 disetujui (SPV Terkait). Berlanjut ke SFO.",
          data: updated,
        });
      }

      // Stage 2: SFO
      if (stage === 2) {
        if (userRole !== "sfo" && userRole !== "admin_k3" && userRole !== "admin") {
          return NextResponse.json({ error: "Hanya SFO / Admin K3 atau Admin yang berhak menyetujui pada Tahap 2" }, { status: 403 });
        }

        const updated = await queryOne<any>(
          `UPDATE inspeksi_scaffolding
           SET sfo_approved = TRUE,
               sfo_approved_by = $1,
               sfo_approved_at = NOW(),
               current_stage = 3,
               updated_at = NOW()
           WHERE id_form = $2
           RETURNING *`,
          [user.nama || user.username, id]
        );
        return NextResponse.json({
          success: true,
          message: "Tahap 2 disetujui (SFO). Berlanjut ke Kontraktor.",
          data: updated,
        });
      }

      // Stage 3: Kontraktor / Pelaksana Internal
      if (stage === 3) {
        const parentKetinggian = await queryOne<{ tipe_perusahaan: string }>(
          `SELECT tipe_perusahaan FROM form_kerja_ketinggian WHERE id_form = $1`,
          [id]
        );
        const isInternal = parentKetinggian?.tipe_perusahaan === "internal";

        if (isInternal) {
          if (userRole !== "worker" && userRole !== "spv" && userRole !== "pengawas" && userRole !== "admin") {
            return NextResponse.json(
              { error: "Hanya Pelaksana Internal (Worker/SPV/Pengawas) atau Admin yang berhak menyetujui pada Tahap 3 (Final)" },
              { status: 403 }
            );
          }
        } else {
          if (userRole !== "kontraktor" && userRole !== "admin") {
            return NextResponse.json({ error: "Hanya Kontraktor atau Admin yang berhak menyetujui pada Tahap 3 (Final)" }, { status: 403 });
          }
        }

        const updated = await queryOne<any>(
          `UPDATE inspeksi_scaffolding
           SET kontraktor_approved = TRUE,
               kontraktor_approved_by = $1,
               kontraktor_approved_at = NOW(),
               current_stage = 4,
               status = 'approved',
               updated_at = NOW()
           WHERE id_form = $2
           RETURNING *`,
          [user.nama || user.username, id]
        );
        return NextResponse.json({
          success: true,
          message: isInternal
            ? "Tahap 3 disetujui (Pelaksana Internal). Inspeksi Scaffolding telah disetujui penuh!"
            : "Tahap 3 disetujui (Kontraktor). Inspeksi Scaffolding telah disetujui penuh!",
          data: updated,
        });
      }

      return NextResponse.json({ error: "Inspeksi scaffolding sudah disetujui penuh sebelumnya" }, { status: 400 });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    console.error("[PATCH /api/inspeksi-scaffolding/[id]]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
