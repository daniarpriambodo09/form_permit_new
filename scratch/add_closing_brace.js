const fs = require('fs');

const files = [
  'app/api/forms/hot-work/route.ts',
  'app/api/forms/height-work/route.ts',
  'app/api/forms/workshop/route.ts'
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf-8');
  c = c.replace(
    '// Multiple forms per jenis kerja diperbolehkan',
    '// Multiple forms per jenis kerja diperbolehkan\n    }'
  );
  fs.writeFileSync(file, c, 'utf-8');
  console.log(`[OK] Added closing brace in ${file}`);
}

