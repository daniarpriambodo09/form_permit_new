-- Master pengawas departemen untuk pilihan Pengawas (Bagian)
CREATE TABLE IF NOT EXISTS pengawas_departemen (
  id              SERIAL PRIMARY KEY,
  nama            VARCHAR(255) NOT NULL,
  nik             VARCHAR(50) NOT NULL,
  departemen      VARCHAR(100) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pengawas_departemen_nama_nik_departemen_key UNIQUE (nama, nik, departemen)
);

CREATE INDEX IF NOT EXISTS idx_pengawas_departemen_active
  ON pengawas_departemen (is_active);
CREATE INDEX IF NOT EXISTS idx_pengawas_departemen_departemen
  ON pengawas_departemen (departemen);
