-- Migration: add separate worker NIK field to workshop form
ALTER TABLE form_kerja_workshop
  ADD COLUMN IF NOT EXISTS nik_pekerja character varying(100);

-- Optional: populate the new column from existing combined values like "Nama / NIK"
UPDATE form_kerja_workshop
SET nik_pekerja = NULLIF(split_part(nama_pekerja_nik, ' / ', 2), '')
WHERE nama_pekerja_nik LIKE '% / %';
