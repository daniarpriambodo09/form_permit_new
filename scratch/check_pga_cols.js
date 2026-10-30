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

async function checkCols() {
  for (const tbl of ['form_kerja_panas', 'form_kerja_ketinggian', 'form_kerja_workshop', 'form_ijin_kerja']) {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND (column_name LIKE '%pga%' OR column_name LIKE '%mr%')`,
      [tbl]
    );
    console.log(tbl, 'columns:', res.rows.map(r => r.column_name));
  }
  await pool.end();
}
checkCols().catch(console.error);

