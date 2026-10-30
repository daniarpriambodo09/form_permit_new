const fs = require('fs');

// 1. Fix Plus in app/my-forms/[jenisForm]/[id]/page.tsx
{
  let content = fs.readFileSync('app/my-forms/[jenisForm]/[id]/page.tsx', 'utf-8');
  content = content.replace("import { Plus, useState", "import { useState");
  content = content.replace("import { Plus, useEffect", "import { useEffect");
  content = content.replace('import { Plus,', 'import {');
  content = content.replace('import {', 'import { Plus,'); // wait, import from lucide-react!
  // find lucide-react import
  const lucideIdx = content.indexOf('from "lucide-react"');
  if (lucideIdx !== -1) {
    const importStart = content.lastIndexOf('import {', lucideIdx);
    content = content.slice(0, importStart + 8) + ' Plus,' + content.slice(importStart + 8);
    // remove Plus from react import if present
    content = content.replace(/import\s*\{\s*Plus,\s*useState/g, 'import { useState');
  }
  fs.writeFileSync('app/my-forms/[jenisForm]/[id]/page.tsx', content, 'utf-8');
  console.log('[OK] Fixed Plus import in my-forms detail');
}

// 2. Fix parentForm queries
const formFiles = [
  'app/api/forms/hot-work/route.ts',
  'app/api/forms/height-work/route.ts',
  'app/api/forms/workshop/route.ts'
];

for (const file of formFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  const startStr = 'const parentForm = await queryOne<{';
  const endStr = 'WHERE id_form = $1`,\n        [idIjinKerja]\n      );';
  const endStrCRLF = 'WHERE id_form = $1`,\r\n        [idIjinKerja]\r\n      );';
  
  const startIdx = content.indexOf(startStr);
  let endIdx = content.indexOf(endStr);
  let len = endStr.length;
  if (endIdx === -1) {
    endIdx = content.indexOf(endStrCRLF);
    len = endStrCRLF.length;
  }
  
  if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`;
    content = content.slice(0, startIdx) + replacement + content.slice(endIdx + len);
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`[OK] Replaced parentForm query in ${file}`);
  } else {
    console.log(`[WARN] Could not find range in ${file}: start=${startIdx}, end=${endIdx}`);
  }
}

