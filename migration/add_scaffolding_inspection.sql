-- migration/add_scaffolding_inspection.sql
-- Tambah kolom perlu_scaffolding di form_kerja_ketinggian
ALTER TABLE form_kerja_ketinggian 
ADD COLUMN IF NOT EXISTS perlu_scaffolding BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN form_kerja_ketinggian.perlu_scaffolding IS 'TRUE jika form eksternal memerlukan inspeksi scaffolding';

-- Buat tabel inspeksi_scaffolding
CREATE TABLE IF NOT EXISTS inspeksi_scaffolding (
  id SERIAL PRIMARY KEY,
  id_form VARCHAR(50) NOT NULL,
  id_ijin_kerja VARCHAR(50),
  nama_inspektor VARCHAR(255),
  tanggal_inspeksi DATE,
  lokasi VARCHAR(255),
  tipe_perancah VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  current_stage INTEGER DEFAULT 1,
  
  -- Checklist items (17 item bagian scaffolding)
  items JSONB DEFAULT '[]'::jsonb,
  
  -- Ketentuan lainnya (3 item ketentuan)
  ketentuan_lainnya JSONB DEFAULT '[]'::jsonb,
  
  -- Inspektor (Pengawas)
  pengawas_id INTEGER,
  pengawas_nama VARCHAR(255),
  pengawas_submitted_at TIMESTAMPTZ,
  
  -- Stage 1: SPV Terkait
  spv_approved BOOLEAN DEFAULT FALSE,
  spv_approved_by VARCHAR(255),
  spv_approved_at TIMESTAMPTZ,
  
  -- Stage 2: SFO
  sfo_approved BOOLEAN DEFAULT FALSE,
  sfo_approved_by VARCHAR(255),
  sfo_approved_at TIMESTAMPTZ,
  
  -- Stage 3: Kontraktor
  kontraktor_approved BOOLEAN DEFAULT FALSE,
  kontraktor_approved_by VARCHAR(255),
  kontraktor_approved_at TIMESTAMPTZ,
  
  catatan_reject TEXT,
  rejected_by VARCHAR(255),
  rejected_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_inspeksi_scaffolding_id_form UNIQUE (id_form)
);

CREATE INDEX IF NOT EXISTS idx_inspeksi_scaffolding_id_form ON inspeksi_scaffolding (id_form);
CREATE INDEX IF NOT EXISTS idx_inspeksi_scaffolding_status ON inspeksi_scaffolding (status);
CREATE INDEX IF NOT EXISTS idx_inspeksi_scaffolding_stage ON inspeksi_scaffolding (current_stage);
