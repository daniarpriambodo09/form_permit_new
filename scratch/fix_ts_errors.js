const fs = require('fs');

// 1. Fix Plus import in app/my-forms/[jenisForm]/[id]/page.tsx
{
  let content = fs.readFileSync('app/my-forms/[jenisForm]/[id]/page.tsx', 'utf-8');
  if (!content.includes('Plus,') && !content.includes(', Plus')) {
    content = content.replace('import {', 'import { Plus,');
    fs.writeFileSync('app/my-forms/[jenisForm]/[id]/page.tsx', content, 'utf-8');
    console.log('[OK] Added Plus import to my-forms/[jenisForm]/[id]/page.tsx');
  }
}

// 2. Fix parentForm queries in hot-work, height-work, workshop
const formFiles = [
  'app/api/forms/hot-work/route.ts',
  'app/api/forms/height-work/route.ts',
  'app/api/forms/workshop/route.ts'
];

for (const file of formFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace the typed parentForm query with queryOne<any> and all columns
  const regex = /const parentForm = await queryOne<\{[\s\S]*?\}\>\(\s*`SELECT[\s\S]*?FROM form_ijin_kerja WHERE id_form = \$1`,\s*\[idIjinKerja\]\s*\);/;
  
  const replacement = `const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
         FROM form_ijin_kerja WHERE id_form = $1\`,
        [idIjinKerja]
      );`;

  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`[OK] Updated parentForm query in ${file}`);
  } else {
    console.log(`[WARN] regex not matched in ${file}`);
  }
}

