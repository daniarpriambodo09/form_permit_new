const fs = require('fs');
const bcrypt = require('bcryptjs');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);
const { Pool } = require('pg');
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
});

async function main() {
  const users = await pool.query("SELECT id, username, role, departmen, password, is_active FROM users ORDER BY id");
  const testPw = '12345678';
  const results = [];
  for (const u of users.rows) {
    const matches = u.password ? await bcrypt.compare(testPw, u.password) : false;
    results.push({ id: u.id, username: u.username, role: u.role, dept: u.departmen, active: u.is_active, pwMatchesDefault: matches });
  }
  console.table(results);
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });

