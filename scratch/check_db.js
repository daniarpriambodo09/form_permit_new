const fs = require('fs');
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
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
  console.log("Users columns:");
  console.table(cols.rows);

  const users = await pool.query("SELECT * FROM users");
  console.log("Users rows:");
  console.table(users.rows.map(u => ({ id: u.id, username: u.username, role: u.role, dept: u.dept || u.department || u.departemen, nama: u.nama || u.name, email: u.email })));
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });

