// scripts/migrate.js
// Script migrasi otomatis PostgreSQL untuk project form-permit.
// Menjalankan file .sql dari folder "migration" yang belum pernah dieksekusi.
const fs = require('fs');
const path = require('path');

// ponytail: load .env.local jika dijalankan secara standalone tanpa Next.js env runner
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Buat tabel pencatat migrasi jika belum ada
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Ambil daftar file migrasi yang sudah pernah dieksekusi
    const { rows } = await client.query('SELECT filename FROM _schema_migrations');
    const executedFiles = new Set(rows.map((r) => r.filename));

    // 3. Baca folder migration, ambil hanya file .sql (kecuali dump/backup jika ada)
    const migrationDir = path.join(__dirname, '..', 'migration');
    if (!fs.existsSync(migrationDir)) {
      console.log('[Migrate] Folder migration tidak ditemukan, melewati proses.');
      return;
    }

    const files = fs
      .readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql') && !f.startsWith('temp_'))
      .sort(); // Urutkan secara alfabet/timestamp

    let appliedCount = 0;

    for (const file of files) {
      if (executedFiles.has(file)) {
        continue;
      }

      console.log(`[Migrate] Menjalankan migrasi baru: ${file}...`);
      const filePath = path.join(migrationDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Jalankan per file dalam satu transaksi
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        appliedCount++;
        console.log(`[Migrate] ✅ Berhasil: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrate] ❌ Gagal mengeksekusi ${file}:`, err.message);
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log('[Migrate] Database sudah mutakhir. Tidak ada migrasi baru.');
    } else {
      console.log(`[Migrate] Selesai! Sebanyak ${appliedCount} file migrasi telah diterapkan.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[Migrate] Fatal error:', err);
  process.exit(1);
});
