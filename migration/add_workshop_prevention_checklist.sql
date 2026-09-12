-- Checklist pencegahan Workshop sesuai form checklist resmi (12 item)
ALTER TABLE form_kerja_workshop
  ADD COLUMN IF NOT EXISTS checklist_pencegahan JSONB;
