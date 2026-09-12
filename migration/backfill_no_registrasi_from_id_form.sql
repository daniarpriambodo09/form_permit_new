-- Backfill No. Registrasi untuk form lama.
-- Form baru dan form yang diedit sudah mengisi kolom ini dari id_form.
UPDATE form_kerja_panas
SET no_registrasi = id_form
WHERE no_registrasi IS NULL OR BTRIM(no_registrasi) = '';

UPDATE form_kerja_workshop
SET no_registrasi = id_form
WHERE no_registrasi IS NULL OR BTRIM(no_registrasi) = '';
