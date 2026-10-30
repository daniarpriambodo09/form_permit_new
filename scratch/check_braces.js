const fs = require('fs');

const content = fs.readFileSync('app/api/forms/hot-work/route.ts', 'utf-8');
const lines = content.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let diff = 0;
  for (const ch of line) {
    if (ch === '{') diff++;
    if (ch === '}') diff--;
  }
  depth += diff;
  if (i > 95 && i < 140) {
    console.log(`${i + 1} (d=${depth}): ${line}`);
  }
}
