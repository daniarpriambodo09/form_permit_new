const fs = require('fs');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  for (const [target, replacement] of replacements) {
    if (!content.includes(target)) {
      console.warn(`[WARN] Target not found in ${filePath}:`, target.slice(0, 50));
    } else {
      content = content.replace(target, replacement);
      console.log(`[OK] Replaced in ${filePath}`);
    }
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Saved ${filePath}`);
  }
}

// 1. DetailModal.tsx
replaceInFile('components/DetailModal.tsx', [
  [
    '<span className="text-sm font-semibold text-slate-800">Safety Induction</span>',
    '<span className="text-sm font-semibold text-slate-800">Safety Induction</span>\r\n          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">JAI/F-04/P.SHE-19 Rev. 1</span>'
  ],
  [
    'Status Safety Induction',
    'Status Safety Induction (JAI/F-04/P.SHE-19 Rev. 1)'
  ],
  [
    '<ShieldCheck className="w-3.5 h-3.5" /> Lihat Safety Induction',
    '<ShieldCheck className="w-3.5 h-3.5" /> Lihat Safety Induction (JAI/F-04/P.SHE-19 Rev. 1)'
  ],
  [
    '<FileText className="w-3.5 h-3.5" /> Lihat Penilaian Sub Kontraktor',
    '<FileText className="w-3.5 h-3.5" /> Lihat Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1)'
  ],
  [
    '<InfoModal title="Safety Induction" onClose={() => setActiveInfoModal(null)}>',
    '<InfoModal title="Safety Induction - JAI/F-04/P.SHE-19 Rev. 1" onClose={() => setActiveInfoModal(null)}>'
  ],
  [
    '<InfoModal title="Form Penilaian Sub Kontraktor" onClose={() => setActiveInfoModal(null)}>',
    '<InfoModal title="Form Penilaian Sub Kontraktor - JAI/F-08/P.SHE-19 Rev. 1" onClose={() => setActiveInfoModal(null)}>'
  ]
]);

// 2. my-forms/page.tsx
replaceInFile('app/my-forms/page.tsx', [
  [
    'title="Safety Induction"',
    'title="Safety Induction JAI/F-04/P.SHE-19 Rev. 1"'
  ],
  [
    'title="Form Penilaian Sub Kontraktor"',
    'title="Form Penilaian Sub Kontraktor JAI/F-08/P.SHE-19 Rev. 1"'
  ],
  [
    'title="Dilengkapi Safety Induction"',
    'title="Safety Induction JAI/F-04/P.SHE-19 Rev. 1"'
  ],
  [
    'title="Dilengkapi Penilaian Subkontraktor"',
    'title="Form Penilaian Sub Kontraktor JAI/F-08/P.SHE-19 Rev. 1"'
  ]
]);

// 3. my-forms/[jenisForm]/[id]/page.tsx
replaceInFile('app/my-forms/[jenisForm]/[id]/page.tsx', [
  [
    'title: "Safety Induction Security",',
    'title: "Safety Induction JAI/F-04/P.SHE-19 Rev. 1",\r\n        docNo: "JAI/F-04/P.SHE-19 Rev. 1",'
  ],
  [
    'title: "Penilaian K3 Subkontraktor",',
    'title: "Penilaian Subkontraktor JAI/F-08/P.SHE-19 Rev. 1",\r\n        docNo: "JAI/F-08/P.SHE-19 Rev. 1",'
  ],
  [
    '<h3 className="font-bold text-slate-800 text-xs sm:text-sm">Safety Induction Pos Security</h3>',
    '<div className="flex items-center gap-2"><h3 className="font-bold text-slate-800 text-xs sm:text-sm">Safety Induction Pos Security</h3><span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">JAI/F-04/P.SHE-19 Rev. 1</span></div>'
  ],
  [
    '<h3 className="font-bold text-slate-800 text-xs sm:text-sm">Penilaian K3 Subkontraktor</h3>',
    '<div className="flex items-center gap-2"><h3 className="font-bold text-slate-800 text-xs sm:text-sm">Form Penilaian Sub Kontraktor</h3><span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">JAI/F-08/P.SHE-19 Rev. 1</span></div>'
  ]
]);

// 4. pengawas/page.tsx & purchasing/page.tsx
replaceInFile('app/pengawas/page.tsx', [
  [
    'Penilaian Sub Kontraktor - Pengawas Dept',
    'Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) - Pengawas Dept'
  ]
]);
replaceInFile('app/purchasing/page.tsx', [
  [
    'Penilaian Sub Kontraktor - Purchasing',
    'Form Penilaian Sub Kontraktor (JAI/F-08/P.SHE-19 Rev. 1) - Purchasing'
  ]
]);

