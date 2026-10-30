const fs = require('fs');

// 1. Update hot-work/route.ts
{
  let content = fs.readFileSync('app/api/forms/hot-work/route.ts', 'utf-8');
  
  // Remove existing check
  const checkBlock = /const existing = await queryOne\([\s\S]*?if \(existing\) \{[\s\S]*?\}\s*\}/;
  if (checkBlock.test(content)) {
    content = content.replace(checkBlock, '// Multiple forms per jenis kerja diperbolehkan');
    console.log('[OK] Removed existing limit in hot-work');
  }

  // Include admin_k3_approved and final approved status in parent sync
  const parentSyncBlock = `        if (parentForm.admin_k3_approved) {
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
        }`;

  content = content.replace('if (parentForm.sfo_approved) {', `${parentSyncBlock}\n\n        if (parentForm.sfo_approved) {`);
  fs.writeFileSync('app/api/forms/hot-work/route.ts', content, 'utf-8');
}

// 2. Update height-work/route.ts
{
  let content = fs.readFileSync('app/api/forms/height-work/route.ts', 'utf-8');

  // Remove existing check
  const checkBlock = /const existing = await queryOne\([\s\S]*?if \(existing\) \{[\s\S]*?\}\s*\}/;
  if (checkBlock.test(content)) {
    content = content.replace(checkBlock, '// Multiple forms per jenis kerja diperbolehkan');
    console.log('[OK] Removed existing limit in height-work');
  }

  const parentSyncBlock = `        if (parentForm.admin_k3_approved) {
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
        }`;

  content = content.replace('if (parentForm.sfo_approved) {', `${parentSyncBlock}\n\n        if (parentForm.sfo_approved) {`);
  fs.writeFileSync('app/api/forms/height-work/route.ts', content, 'utf-8');
}

// 3. Update workshop/route.ts
{
  let content = fs.readFileSync('app/api/forms/workshop/route.ts', 'utf-8');

  // Remove existing check
  const checkBlock = /const existing = await queryOne\([\s\S]*?if \(existing\) \{[\s\S]*?\}\s*\}/;
  if (checkBlock.test(content)) {
    content = content.replace(checkBlock, '// Multiple forms per jenis kerja diperbolehkan');
    console.log('[OK] Removed existing limit in workshop');
  }

  const parentSyncBlock = `        if (parentForm.admin_k3_approved) {
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
        }`;

  content = content.replace('if (parentForm.sfo_approved) {', `${parentSyncBlock}\n\n        if (parentForm.sfo_approved) {`);
  fs.writeFileSync('app/api/forms/workshop/route.ts', content, 'utf-8');
}

console.log('Finished updating form creation routes');

