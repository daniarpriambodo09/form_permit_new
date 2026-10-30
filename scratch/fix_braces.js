const fs = require('fs');

const files = [
  'app/api/forms/hot-work/route.ts',
  'app/api/forms/height-work/route.ts',
  'app/api/forms/workshop/route.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(
    '// Multiple forms per jenis kerja diperbolehkan',
    '// Multiple forms per jenis kerja diperbolehkan\n    }'
  );
  fs.writeFileSync(file, content, 'utf-8');
  console.log(`[OK] Added closing brace in ${file}`);
}

