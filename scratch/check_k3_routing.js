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

async function checkRouting() {
  const res = await pool.query(`
    SELECT r.jenis_form, r.user_id, u.username, u.nama, u.email
    FROM admin_k3_email_routing r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.jenis_form
  `);
  console.table(res.rows);
  await pool.end();
}

checkRouting().catch(console.error);

