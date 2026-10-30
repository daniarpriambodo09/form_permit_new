const fs = require('fs');

// HOT WORK
{
  let c = fs.readFileSync('app/api/forms/hot-work/route.ts', 'utf-8');
  // 1. Remove limit
  c = c.replace(
    /const existing = await queryOne\([\s\S]*?form_kerja_panas WHERE id_ijin_kerja = \$1[\s\S]*?Maksimal 1 form per jenis kerja\.`[\s\S]*?\}\);\s*\}/,
    '// Multiple forms per jenis kerja diperbolehkan'
  );
  // 2. Parent form query
  c = c.replace(
    /const parentForm = await queryOne<\{[\s\S]*?pga_nik: string \| null;\s*\}\>\(\s*`SELECT[\s\S]*?FROM form_ijin_kerja\s*WHERE id_form = \$1`,\s*\[idIjinKerja\]\s*\);/,
    `const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`
  );
  // 3. Admin K3 and status approved sync
  c = c.replace(
    'if (parentForm.sfo_approved) {',
    `if (parentForm.admin_k3_approved) {
          await query(
            \`UPDATE form_kerja_panas
                SET admin_k3_approved = TRUE,
                    admin_k3_approved_by = $1,
                    admin_k3_approved_at = $2,
                    admin_k3_nik = $3
              WHERE id_form = $4\`,
            [parentForm.admin_k3_approved_by, parentForm.admin_k3_approved_at || now, parentForm.admin_k3_nik, idForm]
          );
        }

        if (parentForm.status === 'approved') {
          await query(
            \`UPDATE form_kerja_panas
                SET status = 'approved',
                    approved_by = COALESCE($1, 'System Cascade'),
                    approved_at = $2
              WHERE id_form = $3\`,
            [parentForm.approved_by, parentForm.approved_at || now, idForm]
          );
        }

        if (parentForm.sfo_approved) {`
  );
  fs.writeFileSync('app/api/forms/hot-work/route.ts', c, 'utf-8');
  console.log('[OK] hot-work route updated.');
}

// HEIGHT WORK
{
  let c = fs.readFileSync('app/api/forms/height-work/route.ts', 'utf-8');
  // 1. Remove limit
  c = c.replace(
    /const existing = await queryOne\([\s\S]*?form_kerja_ketinggian WHERE id_ijin_kerja = \$1[\s\S]*?Maksimal 1 form per jenis kerja\.`[\s\S]*?\}\);\s*\}/,
    '// Multiple forms per jenis kerja diperbolehkan'
  );
  // 2. Parent form query
  c = c.replace(
    /const parentForm = await queryOne<\{[\s\S]*?pga_nik: string \| null;\s*\}\>\(\s*`SELECT[\s\S]*?FROM form_ijin_kerja\s*WHERE id_form = \$1`,\s*\[idIjinKerja\]\s*\);/,
    `const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`
  );
  // 3. Admin K3 and status approved sync
  c = c.replace(
    'if (parentForm.sfo_approved) {',
    `if (parentForm.admin_k3_approved) {
          await query(
            \`UPDATE form_kerja_ketinggian
                SET admin_k3_approved = TRUE,
                    admin_k3_approved_by = $1,
                    admin_k3_approved_at = $2,
                    admin_k3_nik = $3
              WHERE id_form = $4\`,
            [parentForm.admin_k3_approved_by, parentForm.admin_k3_approved_at || now, parentForm.admin_k3_nik, idForm]
          );
        }

        if (parentForm.status === 'approved') {
          await query(
            \`UPDATE form_kerja_ketinggian
                SET status = 'approved',
                    approved_by = COALESCE($1, 'System Cascade'),
                    approved_at = $2
              WHERE id_form = $3\`,
            [parentForm.approved_by, parentForm.approved_at || now, idForm]
          );
        }

        if (parentForm.sfo_approved) {`
  );
  fs.writeFileSync('app/api/forms/height-work/route.ts', c, 'utf-8');
  console.log('[OK] height-work route updated.');
}

// WORKSHOP
{
  let c = fs.readFileSync('app/api/forms/workshop/route.ts', 'utf-8');
  // 1. Remove limit
  c = c.replace(
    /const existing = await queryOne\([\s\S]*?form_kerja_workshop WHERE id_ijin_kerja = \$1[\s\S]*?Maksimal 1 form per jenis kerja\.`[\s\S]*?\}\);\s*\}/,
    '// Multiple forms per jenis kerja diperbolehkan'
  );
  // 2. Parent form query
  c = c.replace(
    /const parentForm = await queryOne<\{[\s\S]*?pga_nik: string \| null;\s*\}\>\(\s*`SELECT[\s\S]*?FROM form_ijin_kerja\s*WHERE id_form = \$1`,\s*\[idIjinKerja\]\s*\);/,
    `const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`
  );
  // 3. Admin K3 and status approved sync
  c = c.replace(
    'if (parentForm.sfo_approved) {',
    `if (parentForm.admin_k3_approved) {
          await query(
            \`UPDATE form_kerja_workshop
                SET admin_k3_approved = TRUE,
                    admin_k3_approved_by = $1,
                    admin_k3_approved_at = $2,
                    admin_k3_nik = $3
              WHERE id_form = $4\`,
            [parentForm.admin_k3_approved_by, parentForm.admin_k3_approved_at || now, parentForm.admin_k3_nik, idForm]
          );
        }

        if (parentForm.status === 'approved') {
          await query(
            \`UPDATE form_kerja_workshop
                SET status = 'approved',
                    approved_by = COALESCE($1, 'System Cascade'),
                    approved_at = $2
              WHERE id_form = $3\`,
            [parentForm.approved_by, parentForm.approved_at || now, idForm]
          );
        }

        if (parentForm.sfo_approved) {`
  );
  fs.writeFileSync('app/api/forms/workshop/route.ts', c, 'utf-8');
  console.log('[OK] workshop route updated.');
}

