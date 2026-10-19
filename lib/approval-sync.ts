// lib/approval-sync.ts
// Helper sinkronisasi approval otomatis antara form ijin kerja eksternal (form_ijin_kerja)
// dan seluruh lampiran terkait (Safety Induction, JSA, Penilaian Subkontraktor,
// serta form kerja panas, form kerja ketinggian, form kerja workshop).
//
// Saat approver (SPV, SFO, SMR/PGA, Security, atau Admin K3) mengklik setujui / approve di
// halaman approval (baik di form utama maupun di salah satu lampiran), helper ini memastikan
// seluruh lampiran dan form induk yang memiliki slot approval untuk role tersebut otomatis
// ikut disetujui (cascade approve).

import { query, queryOne } from "@/lib/db";
import { UserRole } from "@/lib/auth";
import { notifyGeneralPermitNextApprover } from "@/lib/approval-email";

export interface SyncCascadeParams {
  idIjinKerja: string;
  role: UserRole;
  approverName: string;
  approverNik?: string | null;
  signatureUrl?: string | null;
  now?: string;
  origin?: "general-permit" | "jsa" | "penilaian-subkontraktor" | "safety-induction" | "job-form";
  originFormId?: string;
}

export async function syncJobFormsStageAndStatus(idIjinKerja: string, now: string): Promise<void> {
  for (const tbl of ["form_kerja_panas", "form_kerja_workshop", "form_kerja_ketinggian"]) {
    await query(
      `UPDATE ${tbl}
          SET status = CASE
                WHEN spv_approved = TRUE
                 AND admin_k3_approved = TRUE
                 AND sfo_approved = TRUE
                 AND mr_pga_approved = TRUE
                THEN 'approved'
                ELSE status
              END,
              current_stage = CASE
                WHEN spv_approved IS NOT TRUE THEN 1
                WHEN admin_k3_approved IS NOT TRUE THEN 2
                WHEN sfo_approved IS NOT TRUE THEN 3
                ELSE 4
              END,
              updated_at = $2
        WHERE id_ijin_kerja = $1
          AND status IN ('submitted', 'draft')`,
      [idIjinKerja, now]
    );
  }
}

export async function syncCascadeApproval(params: SyncCascadeParams): Promise<void> {
  const {
    idIjinKerja,
    role,
    approverName,
    approverNik = null,
    signatureUrl = null,
    now = new Date().toISOString(),
  } = params;

  if (!idIjinKerja) return;

  try {
    const general = await queryOne<any>(
      `SELECT id_form, status, current_stage,
              spv_approved, sfo_approved, pga_approved, security_approved,
              spv_terkait_pj, nik_spv_terkait_pj,
              jsa_data, penilaian_subkontraktor, safety_induction,
              user_id, nama_kontraktor_pekerja, tanggal
         FROM form_ijin_kerja
        WHERE id_form = $1`,
      [idIjinKerja]
    );

    if (!general || general.status === "rejected") {
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ROLE SPV
    // ─────────────────────────────────────────────────────────────
    if (role === "spv") {
      const spvName = general.spv_terkait_pj || approverName;
      const spvNik = general.nik_spv_terkait_pj || approverNik;

      // A. Update form_ijin_kerja jika belum approve
      const nextStage = general.current_stage === 1 ? 2 : general.current_stage;
      await query(
        `UPDATE form_ijin_kerja
            SET spv_approved = TRUE,
                spv_approved_by = $1,
                spv_approved_at = $2,
                spv_nik = $3,
                current_stage = $4,
                updated_at = $2
          WHERE id_form = $5
            AND (spv_approved IS NOT TRUE OR current_stage = 1)`,
        [spvName, now, spvNik, nextStage, idIjinKerja]
      );

      if (general.current_stage === 1) {
        notifyGeneralPermitNextApprover({
          idForm: idIjinKerja,
          nextStage: 2,
          userId: general.user_id,
          namaPemohon: general.nama_kontraktor_pekerja || "-",
          tanggal: general.tanggal,
        }).catch((err) => console.error("[CASCADE EMAIL] error SPV:", err));
      }

      // B. Update JSA data jika ada
      if (general.jsa_data) {
        const jsa = typeof general.jsa_data === "string" ? JSON.parse(general.jsa_data) : general.jsa_data;
        if (jsa && typeof jsa === "object") {
          jsa.approval = jsa.approval || { currentStage: 2, status: "submitted" };
          jsa.approval.spv = {
            approved: true,
            approvedBy: spvName,
            approvedNik: spvNik,
            approvedAt: now,
          };
          if (jsa.approval.currentStage <= 2) {
            jsa.approval.currentStage = 3;
          }
          await query(
            `UPDATE form_ijin_kerja SET jsa_data = $1, updated_at = $2 WHERE id_form = $3`,
            [JSON.stringify(jsa), now, idIjinKerja]
          );
        }
      }

      // C. Update linked job forms (form_kerja_panas, form_kerja_workshop, form_kerja_ketinggian)
      for (const tbl of ["form_kerja_panas", "form_kerja_workshop", "form_kerja_ketinggian"]) {
        await query(
          `UPDATE ${tbl}
              SET spv_approved = TRUE,
                  spv_approved_by = $1,
                  spv_approved_at = $2,
                  spv_nik = $3,
                  nik_pemberi_ijin = COALESCE(nik_pemberi_ijin, $3),
                  updated_at = $2
            WHERE id_ijin_kerja = $4 AND status IN ('submitted', 'draft')`,
          [spvName, now, spvNik, idIjinKerja]
        );
      }

      await syncJobFormsStageAndStatus(idIjinKerja, now);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ROLE SFO
    // ─────────────────────────────────────────────────────────────
    else if (role === "sfo") {
      // A. Update form_ijin_kerja
      const nextStage = general.current_stage === 2 ? 3 : general.current_stage;
      await query(
        `UPDATE form_ijin_kerja
            SET sfo_approved = TRUE,
                sfo_approved_by = $1,
                sfo_approved_at = $2,
                sfo_nik = $3,
                current_stage = $4,
                updated_at = $2
          WHERE id_form = $5
            AND (sfo_approved IS NOT TRUE OR current_stage = 2)`,
        [approverName, now, approverNik, nextStage, idIjinKerja]
      );

      if (general.current_stage === 2) {
        notifyGeneralPermitNextApprover({
          idForm: idIjinKerja,
          nextStage: 3,
          userId: general.user_id,
          namaPemohon: general.nama_kontraktor_pekerja || "-",
          tanggal: general.tanggal,
        }).catch((err) => console.error("[CASCADE EMAIL] error SFO:", err));
      }

      // B. Update JSA data
      if (general.jsa_data) {
        const jsa = typeof general.jsa_data === "string" ? JSON.parse(general.jsa_data) : general.jsa_data;
        if (jsa && typeof jsa === "object") {
          jsa.approval = jsa.approval || { currentStage: 3, status: "submitted" };
          jsa.approval.sfo = {
            approved: true,
            approvedBy: approverName,
            approvedNik: approverNik,
            approvedAt: now,
          };
          jsa.approval.status = "approved";
          jsa.approval.currentStage = 3;
          await query(
            `UPDATE form_ijin_kerja SET jsa_data = $1, updated_at = $2 WHERE id_form = $3`,
            [JSON.stringify(jsa), now, idIjinKerja]
          );
        }
      }

      // C. Update Penilaian Subkontraktor
      const pen = typeof general.penilaian_subkontraktor === "string"
        ? JSON.parse(general.penilaian_subkontraktor)
        : (general.penilaian_subkontraktor || { entries: [], mengetahui: {} });
      const currentMengetahui = pen.mengetahui || {};
      pen.mengetahui = {
        ...currentMengetahui,
        sfo: {
          nama: approverName,
          nik: approverNik || "",
          tanggal: now.slice(0, 10),
        },
      };
      await query(
        `UPDATE form_ijin_kerja SET penilaian_subkontraktor = $1, updated_at = $2 WHERE id_form = $3`,
        [JSON.stringify(pen), now, idIjinKerja]
      );

      // D. Update linked job forms
      for (const tbl of ["form_kerja_panas", "form_kerja_ketinggian", "form_kerja_workshop"]) {
        await query(
          `UPDATE ${tbl}
              SET sfo_approved = TRUE,
                  sfo_approved_by = $1,
                  sfo_approved_at = $2,
                  sfo_nik = $3,
                  updated_at = $2
            WHERE id_ijin_kerja = $4 AND status IN ('submitted', 'draft')`,
          [approverName, now, approverNik, idIjinKerja]
        );
      }

      await syncJobFormsStageAndStatus(idIjinKerja, now);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ROLE SMR / PGA MANAGER
    // ─────────────────────────────────────────────────────────────
    else if (role === "smr") {
      // A. Update form_ijin_kerja
      const nextStage = general.current_stage === 3 ? 4 : general.current_stage;
      await query(
        `UPDATE form_ijin_kerja
            SET pga_approved = TRUE,
                pga_approved_by = $1,
                pga_approved_at = $2,
                pga_nik = $3,
                current_stage = $4,
                updated_at = $2
          WHERE id_form = $5
            AND (pga_approved IS NOT TRUE OR current_stage = 3)`,
        [approverName, now, approverNik, nextStage, idIjinKerja]
      );

      if (general.current_stage === 3) {
        notifyGeneralPermitNextApprover({
          idForm: idIjinKerja,
          nextStage: 4,
          userId: general.user_id,
          namaPemohon: general.nama_kontraktor_pekerja || "-",
          tanggal: general.tanggal,
        }).catch((err) => console.error("[CASCADE EMAIL] error SMR:", err));
      }

      // B. Update linked job forms
      for (const tbl of ["form_kerja_panas", "form_kerja_workshop", "form_kerja_ketinggian"]) {
        if (tbl === "form_kerja_ketinggian") {
          await query(
            `UPDATE form_kerja_ketinggian
                SET mr_pga_approved = TRUE,
                    mr_pga_approved_by = $1,
                    mr_pga_approved_at = $2,
                    mr_pga_nik = $3,
                    updated_at = $2
              WHERE id_ijin_kerja = $4 AND status IN ('submitted', 'draft')`,
            [approverName, now, approverNik, idIjinKerja]
          );
        } else {
          await query(
            `UPDATE ${tbl}
                SET mr_pga_approved = TRUE,
                    pga_approved = TRUE,
                    mr_pga_approved_by = $1,
                    pga_approved_by = $1,
                    mr_pga_approved_at = $2,
                    pga_approved_at = $2,
                    mr_pga_nik = $3,
                    updated_at = $2
              WHERE id_ijin_kerja = $4 AND status IN ('submitted', 'draft')`,
            [approverName, now, approverNik, idIjinKerja]
          );
        }
      }

      await syncJobFormsStageAndStatus(idIjinKerja, now);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ROLE SECURITY
    // ─────────────────────────────────────────────────────────────
    else if (role === "security") {
      // A. Update safety induction
      const si = typeof general.safety_induction === "string"
        ? JSON.parse(general.safety_induction)
        : (general.safety_induction || {});
      si.status = "approved";
      si.approvedBy = approverName;
      si.approvedAt = now;
      if (signatureUrl) {
        si.signatureUrl = signatureUrl;
      }

      // B. Update form_ijin_kerja (Stage 4 / final)
      await query(
        `UPDATE form_ijin_kerja
            SET safety_induction = $1,
                security_approved = TRUE,
                security_approved_by = $2,
                security_approved_at = $3,
                security_nik = $4,
                security_signature_url = COALESCE($5, security_signature_url),
                status = 'approved',
                approved_by = $2,
                approved_at = $3,
                current_stage = 4,
                updated_at = $3
          WHERE id_form = $6`,
        [JSON.stringify(si), approverName, now, approverNik, signatureUrl, idIjinKerja]
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ROLE ADMIN K3
    // ─────────────────────────────────────────────────────────────
    else if (role === "admin_k3") {
      for (const tbl of ["form_kerja_panas", "form_kerja_ketinggian", "form_kerja_workshop"]) {
        await query(
          `UPDATE ${tbl}
              SET admin_k3_approved = TRUE,
                  admin_k3_approved_by = $1,
                  admin_k3_approved_at = $2,
                  admin_k3_nik = $3,
                  updated_at = $2
            WHERE id_ijin_kerja = $4 AND status IN ('submitted', 'draft')`,
          [approverName, now, approverNik, idIjinKerja]
        );
      }

      await syncJobFormsStageAndStatus(idIjinKerja, now);
    }
  } catch (err) {
    console.error(`[syncCascadeApproval] Error for idIjinKerja=${idIjinKerja}, role=${role}:`, err);
  }
}
