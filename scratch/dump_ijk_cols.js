const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'jai_permit_db',
  user: 'postgres',
  password: '12345678'
});
async function run() {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'form_ijin_kerja' ORDER BY ordinal_position");
  fs.writeFileSync('scratch/ijk_cols.txt', r.rows.map(x => `${x.column_name}: ${x.data_type}`).join('\n'));
  console.log('Done, count:', r.rows.length);
  await pool.end();
}
run();
