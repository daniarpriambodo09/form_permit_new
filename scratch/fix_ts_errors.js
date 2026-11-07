const fs = require('fs');

// 1. app/api/approval/[jenisForm]/[id]/route.ts
{
  const file = 'app/api/approval/[jenisForm]/[id]/route.ts';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(
    "if (!cols && userRole !== 'admin') {",
    "if (!cols) {"
  );
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed', file);
}

// 2. app/api/approval/general-permit/[id]/route.ts
{
  const file = 'app/api/approval/general-permit/[id]/route.ts';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(
    'if (!stageInfo && userRole !== "admin") {',
    'if (!stageInfo) {'
  );
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed', file);
}
