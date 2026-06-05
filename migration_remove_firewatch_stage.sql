-- ============================================================
-- MIGRATION: Hapus Fire Watch dari approval workflow
-- Jalankan SEKALI di database produksi/staging sebelum deploy.
-- ============================================================
--
-- LATAR BELAKANG:
--   Sebelumnya, form hot-work & workshop internal memulai di current_stage=0 (firewatch).
--   Eksternal: current_stage=0 adalah kontraktor, lalu stage=1 adalah firewatch.
--   Setelah refactor:
--     Internal:  stage 1=SPV, 2=admin_k3, 3=SFO, 4=MR/PGA
--     Eksternal: stage 1=kontraktor, 2=SPV, 3=admin_k3, 4=SFO, 5=MR/PGA
--
-- STRATEGI MIGRASI:
--   1. Form lama dengan current_stage=0 (firewatch) & status=submitted:
--      → Geser ke current_stage=1 (SPV untuk internal, kontraktor untuk eksternal sudah benar)
--   2. Form lama yang sudah melewati stage firewatch (fw_approved=true) & current_stage=1:
--      → Stage 1 lama adalah SPV, sekarang SPV juga stage 1 — TIDAK PERLU DIUBAH untuk internal.
--      → Untuk eksternal, stage lama 1=firewatch, stage 2=SPV dst.
--         Perlu digeser: current_stage = current_stage - 1.
--   3. Form yang sudah approved/rejected: tidak perlu diubah.
-- ============================================================

BEGIN;

-- ── 1. Hot-work: form INTERNAL yang masih stuck di stage 0 (firewatch) ──
-- Geser ke stage 1 (SPV) karena firewatch sudah tidak jadi approver.
UPDATE form_kerja_panas
SET
  current_stage = 1,
  fw_approved   = NULL  -- hapus flag fw_approved yang mungkin tersisa
WHERE
  status        = 'submitted'
  AND current_stage = 0
  AND (
    tipe_perusahaan = 'internal'
    OR tipe_perusahaan IS NULL
    OR tipe_perusahaan NOT IN ('internal', 'eksternal')
  );

-- ── 2. Workshop: form INTERNAL yang masih stuck di stage 0 (firewatch) ──
UPDATE form_kerja_workshop
SET
  current_stage = 1,
  fw_approved   = NULL
WHERE
  status        = 'submitted'
  AND current_stage = 0
  AND (
    tipe_perusahaan = 'internal'
    OR tipe_perusahaan IS NULL
    OR tipe_perusahaan NOT IN ('internal', 'eksternal')
  );

-- ── 3. Hot-work EKSTERNAL: stage lama 0=kontraktor, 1=firewatch, 2=SPV, dst.
--       Stage baru:          1=kontraktor, 2=SPV, 3=admin_k3, 4=SFO, 5=MR/PGA
--
-- Form yang current_stage=0 eksternal: geser ke 1 (kontraktor, sudah benar).
UPDATE form_kerja_panas
SET current_stage = 1
WHERE
  status        = 'submitted'
  AND current_stage = 0
  AND tipe_perusahaan = 'eksternal';

-- Form eksternal yang sudah lewat firewatch (fw_approved=true, current_stage=2 lama = SPV):
-- Stage 2 lama (setelah fw) = SPV.
-- Stage baru: setelah kontraktor (stage 1) = SPV (stage 2). Jadi current_stage += 0, sudah benar.
-- Namun stage penghitungan bergeser: stage lama 1=fw, 2=spv, 3=admin_k3, 4=sfo, 5=mr_pga
--                                   stage baru  1=kontraktor, 2=spv, 3=admin_k3, 4=sfo, 5=mr_pga
-- Karena current_stage=0 lama = kontraktor, dan current_stage baru juga mulai dari 1 untuk kontraktor,
-- form eksternal yang belum melewati kontraktor (current_stage=0) sudah ditangani di atas.
-- Form yang sudah melewati kontraktor dan sekarang di firewatch (current_stage=1, fw belum approve):
-- Geser ke stage 2 (SPV) karena firewatch dilewati.
UPDATE form_kerja_panas
SET
  current_stage = 2,
  fw_approved   = NULL
WHERE
  status        = 'submitted'
  AND current_stage = 1
  AND tipe_perusahaan = 'eksternal'
  AND (fw_approved IS NULL OR fw_approved = FALSE);

-- ── 4. Workshop EKSTERNAL: sama seperti hot-work ──
UPDATE form_kerja_workshop
SET current_stage = 1
WHERE
  status        = 'submitted'
  AND current_stage = 0
  AND tipe_perusahaan = 'eksternal';

UPDATE form_kerja_workshop
SET
  current_stage = 2,
  fw_approved   = NULL
WHERE
  status        = 'submitted'
  AND current_stage = 1
  AND tipe_perusahaan = 'eksternal'
  AND (fw_approved IS NULL OR fw_approved = FALSE);

-- ── 5. Verifikasi hasil migrasi ──
-- Tidak boleh ada form submitted dengan current_stage=0.
DO $$
DECLARE
  cnt_panas    INTEGER;
  cnt_workshop INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt_panas
  FROM form_kerja_panas
  WHERE status = 'submitted' AND current_stage = 0;

  SELECT COUNT(*) INTO cnt_workshop
  FROM form_kerja_workshop
  WHERE status = 'submitted' AND current_stage = 0;

  IF cnt_panas > 0 OR cnt_workshop > 0 THEN
    RAISE EXCEPTION 'MIGRASI GAGAL: Masih ada form dengan current_stage=0. panas=%, workshop=%',
      cnt_panas, cnt_workshop;
  END IF;

  RAISE NOTICE 'MIGRASI BERHASIL: Tidak ada form submitted dengan current_stage=0.';
END $$;

COMMIT;

-- ── Opsional: hapus kolom fw_approved jika tidak dipakai lagi ──
-- HATI-HATI: Jalankan ini hanya jika Anda yakin tidak ada komponen
-- frontend yang masih membaca fw_approved untuk tujuan apapun.
-- Disarankan untuk tetap menyimpan kolom ini sebagai arsip historis.
--
-- ALTER TABLE form_kerja_panas    DROP COLUMN IF EXISTS fw_approved;
-- ALTER TABLE form_kerja_panas    DROP COLUMN IF EXISTS fw_approved_by;
-- ALTER TABLE form_kerja_workshop DROP COLUMN IF EXISTS fw_approved;
-- ALTER TABLE form_kerja_workshop DROP COLUMN IF EXISTS fw_approved_by;