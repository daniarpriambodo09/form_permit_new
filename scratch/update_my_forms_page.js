const fs = require('fs');

let content = fs.readFileSync('app/my-forms/page.tsx', 'utf-8');

const targetBlock = `        {jobTypes.map((jenis) => {
          const found = linked.find((jf) => jf.jenis_form === jenis);
          const meta = jenisTheme[jenis] || jenisTheme["hot-work"];
          const Icon = meta.icon;

          if (found) {
            const cfg = statusConfig[found.status] || statusConfig.submitted;
            return (
              <button
                key={jenis}
                type="button"
                onClick={() => onOpenJobForm(jenis, found.id_form)}
                className={\`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs hover:shadow-sm \${cfg.bg} \${cfg.color} \${cfg.border} hover:opacity-90 active:scale-95\`}
                title={\`\${jenisLabel[jenis]} — \${cfg.label}\`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{jenisLabel[jenis]}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/70 border border-black/5">
                  {cfg.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={jenis}
              href={\`/form/\${jenis}?id_ijin_kerja=\${form.id_form}\`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 text-slate-600 bg-white hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50 transition-all shadow-2xs active:scale-95"
              title={\`Tambah \${jenisLabel[jenis]}\`}
            >
              <Plus className="w-3.5 h-3.5 text-orange-500" />
              <span>{jenisLabel[jenis]}</span>
            </Link>
          );
        })}`;

const replacementBlock = `        {jobTypes.map((jenis) => {
          const foundList = linked.filter((jf) => jf.jenis_form === jenis);
          const meta = jenisTheme[jenis] || jenisTheme["hot-work"];
          const Icon = meta.icon;

          return (
            <div key={jenis} className="flex flex-wrap items-center gap-1.5">
              {foundList.map((found, idx) => {
                const cfg = statusConfig[found.status] || statusConfig.submitted;
                return (
                  <button
                    key={found.id_form || idx}
                    type="button"
                    onClick={() => onOpenJobForm(jenis, found.id_form)}
                    className={\`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs hover:shadow-sm \${cfg.bg} \${cfg.color} \${cfg.border} hover:opacity-90 active:scale-95\`}
                    title={\`\${jenisLabel[jenis]} \${found.id_form} — \${cfg.label}\`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{jenisLabel[jenis]} #{idx + 1}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/70 border border-black/5">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}

              <Link
                href={\`/form/\${jenis}?id_ijin_kerja=\${form.id_form}\`}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 text-slate-600 bg-white hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50 transition-all shadow-2xs active:scale-95"
                title={\`Tambah \${jenisLabel[jenis]}\`}
              >
                <Plus className="w-3 h-3 text-orange-500" />
                <span>+ {jenisLabel[jenis]}</span>
              </Link>
            </div>
          );
        })}`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetBlock.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const result = normContent.replace(normTarget, replacementBlock.replace(/\r\n/g, '\n'));
  fs.writeFileSync('app/my-forms/page.tsx', result.replace(/\n/g, '\r\n'), 'utf-8');
  console.log('[OK] Updated app/my-forms/page.tsx for multiple linked forms!');
} else {
  console.log('[WARN] Could not find targetBlock in app/my-forms/page.tsx');
}

