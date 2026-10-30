const fs = require('fs');

function inspectAndReplace(filePath, regex, replacement) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[OK] Replaced in ${filePath}`);
  } else {
    console.log(`[NOT MATCHED] in ${filePath}`);
  }
}

// 1. my-forms/[jenisForm]/[id]/page.tsx
inspectAndReplace(
  'app/my-forms/[jenisForm]/[id]/page.tsx',
  /title:\s*"Penilaian Subkontraktor",/g,
  'title: "Penilaian Subkontraktor JAI/F-08/P.SHE-19 Rev. 1",'
);

// 2. pengawas/page.tsx
inspectAndReplace(
  'app/pengawas/page.tsx',
  /Penilaian Sub Kontraktor/g,
  'Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1)'
);

// 3. purchasing/page.tsx
inspectAndReplace(
  'app/purchasing/page.tsx',
  /Penilaian Sub Kontraktor/g,
  'Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1)'
);

