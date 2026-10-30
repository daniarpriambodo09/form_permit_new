const fs = require('fs');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
});

async function main() {
  const hash = await bcrypt.hash('12345678', 10);

  const testUsers = [
    { username: 'test_pengawas', nama: 'Test Pengawas PGA', role: 'pengawas', dept: 'PGA', jabatan: 'Pengawas Lapangan' },
    { username: 'test_purchasing', nama: 'Test Purchasing', role: 'purchasing', dept: 'Purchasing', jabatan: 'Staff Purchasing' },
  ];

  for (const u of testUsers) {
    const existing = await pool.query('SELECT id, username FROM users WHERE username = $1', [u.username]);
    if (existing.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO users (username, password, nama, jabatan, role, departmen, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
         RETURNING id, username, role, departmen`,
        [u.username, hash, u.nama, u.jabatan, u.role, u.dept]
      );
      console.log('Created test user:', ins.rows[0]);
    } else {
      console.log('Test user already exists:', existing.rows[0]);
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
