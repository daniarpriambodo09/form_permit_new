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
async function check() {
  const hw = await pool.query('SELECT id_form, status, current_stage, spv_approved, admin_k3_approved, sfo_approved, mr_pga_approved FROM form_kerja_panas WHERE id_form = $1', ['HW-0013']);
  console.log('HW row for HW-0013:', hw.rows[0]);
  const ha = await pool.query('SELECT id_form, status, current_stage, spv_approved, admin_k3_approved, sfo_approved, mr_pga_approved FROM form_kerja_ketinggian WHERE id_form = $1', ['HAW-0011']);
  console.log('Height row for HAW-0011:', ha.rows[0]);
  const sc = await pool.query('SELECT id_form, nama_inspektor, status, current_stage FROM inspeksi_scaffolding WHERE id_form = $1', ['HAW-0011']);
  console.log('Scaffolding row for HAW-0011:', sc.rows[0]);
  const ws = await pool.query('SELECT id_form, status, current_stage, spv_approved, admin_k3_approved, sfo_approved, mr_pga_approved FROM form_kerja_workshop WHERE id_form = $1', ['WS-0007']);
  console.log('WS row for WS-0007:', ws.rows[0]);
  await pool.end();
}
check().catch(console.error);
