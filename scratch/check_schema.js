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
  const tables = ['form_ijin_kerja_eksternal', 'form_kerja_panas', 'form_kerja_ketinggian', 'form_kerja_workshop'];
  for (const t of tables) {
    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [t]
    );
    console.log(`=== ${t} columns ===`);
    console.log(res.rows.map(r => r.column_name).join(', '));
  }
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });

