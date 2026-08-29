ALTER TABLE form_ijin_kerja
  ADD COLUMN IF NOT EXISTS jsa_data jsonb;

ALTER TABLE form_ijin_kerja
  ADD COLUMN IF NOT EXISTS izin_kerja_tanggal_dari date,
  ADD COLUMN IF NOT EXISTS izin_kerja_tanggal_sampai date;

UPDATE form_ijin_kerja
SET jsa_data = jsonb_build_object(
  'legacyFileUrl', jsa_file_url
)
WHERE jsa_file_url IS NOT NULL
  AND jsa_data IS NULL;

UPDATE form_ijin_kerja
SET izin_kerja_tanggal_dari = tgl_mulai_kerja::date,
   izin_kerja_tanggal_sampai = tgl_akhir_kerja_rencana::date
WHERE izin_kerja_tanggal_dari IS NULL
  OR izin_kerja_tanggal_sampai IS NULL;
