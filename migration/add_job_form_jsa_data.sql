-- Simpan JSA terstruktur untuk pilihan "Buat JSA" pada form internal
ALTER TABLE form_kerja_panas
  ADD COLUMN IF NOT EXISTS jsa_data JSONB;

ALTER TABLE form_kerja_workshop
  ADD COLUMN IF NOT EXISTS jsa_data JSONB;

ALTER TABLE form_kerja_ketinggian
  ADD COLUMN IF NOT EXISTS jsa_data JSONB;
