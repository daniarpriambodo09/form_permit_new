const fs = require('fs');

let content = fs.readFileSync('lib/approval-sync.ts', 'utf-8');

// Update syncJobFormsStageAndStatus
content = content.replace(
  `                 AND mr_pga_approved = TRUE\r\n                THEN 'approved'`,
  `                 AND (mr_pga_approved = TRUE OR pga_approved = TRUE)\r\n                THEN 'approved'`
);
content = content.replace(
  `                 AND mr_pga_approved = TRUE\n                THEN 'approved'`,
  `                 AND (mr_pga_approved = TRUE OR pga_approved = TRUE)\n                THEN 'approved'`
);

// In role security, add child forms update to approved
const secTarget = `          WHERE id_form = $6\`,
        [JSON.stringify(si), approverName, now, approverNik, signatureUrl, idIjinKerja]
      );`;

const secReplacement = `          WHERE id_form = $6\`,
        [JSON.stringify(si), approverName, now, approverNik, signatureUrl, idIjinKerja]
      );

      // C. Pastikan seluruh lampiran izin kerja khusus ikut status approved
      for (const tbl of ["form_kerja_panas", "form_kerja_workshop", "form_kerja_ketinggian"]) {
        await query(
          \`UPDATE \${tbl}
              SET status = 'approved',
                  approved_by = COALESCE(approved_by, $1),
                  approved_at = COALESCE(approved_at, $2),
                  updated_at = $2
            WHERE id_ijin_kerja = $3\`,
          [approverName, now, idIjinKerja]
        );
      }`;

if (content.includes(secTarget)) {
  content = content.replace(secTarget, secReplacement);
  console.log('[OK] Updated security cascade in approval-sync.ts');
} else {
  console.log('[WARN] secTarget not found in approval-sync.ts');
}

fs.writeFileSync('lib/approval-sync.ts', content, 'utf-8');
console.log('Saved approval-sync.ts');

