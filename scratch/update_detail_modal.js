const fs = require('fs');

let content = fs.readFileSync('components/DetailModal.tsx', 'utf-8');

const targetSection = `  return (
    <div className="space-y-2">
      {(["hotWork", "heightWork", "workshop"] as const).map((key) => {
        const meta = JOB_TYPE_META[key];
        const jf = jobForms?.[key];

        if (jf) {
          const statusMeta = STATUS_META[jf.status] || STATUS_META.submitted;
          const canEdit = jf.status === "draft" || jf.status === "rejected";
          return (
            <div key={key} className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0">{meta.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      Form {meta.shortLabel} sudah diajukan
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate">{jf.id_form}</p>
                  </div>
                </div>
                <span className={\`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 \${statusMeta.cls}\`}>
                  {statusMeta.label}
                </span>
              </div>
              {jf.status === "rejected" && (
                <p className="text-xs text-red-600 mt-2">Form ini ditolak — perbaiki dan kirim ulang, bukan buat baru.</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenDetail(jf.jenis, jf.id_form)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Lihat Detail
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onOpenEdit(jf.jenis, jf.id_form)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    {jf.status === "rejected" ? "Perbaiki" : "Edit"}
                  </button>
                )}
              </div>
            </div>
          );
        }

        return (
          <a key={key} href={meta.addHref(generalPermitId)}
            className="w-full flex items-center gap-2.5 p-3 border-2 border-dashed border-slate-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors">
            <span className="text-orange-500 font-bold text-lg leading-none">+</span>
            <span className="text-sm font-medium text-slate-600">Tambah {meta.label}</span>
          </a>
        );
      })}
    </div>
  );`;

const replacementSection = `  return (
    <div className="space-y-3">
      {(["hotWork", "heightWork", "workshop"] as const).map((key) => {
        const meta = JOB_TYPE_META[key];
        const list: any[] = (jobForms as any)?.items?.[key] ?? (jobForms?.[key] ? [jobForms[key]!] : []);

        return (
          <div key={key} className="space-y-2">
            {list.map((jf: any, idx: number) => {
              const statusMeta = STATUS_META[jf.status] || STATUS_META.submitted;
              const canEdit = jf.status === "draft" || jf.status === "rejected";
              return (
                <div key={jf.id_form || idx} className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0">{meta.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {meta.shortLabel} #{idx + 1}
                        </p>
                        <p className="text-xs text-slate-400 font-mono truncate">{jf.id_form}</p>
                      </div>
                    </div>
                    <span className={\`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 \${statusMeta.cls}\`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  {jf.status === "rejected" && (
                    <p className="text-xs text-red-600 mt-2">Form ini ditolak — perbaiki dan kirim ulang.</p>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(jf.jenis, jf.id_form)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Lihat Detail
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onOpenEdit(jf.jenis, jf.id_form)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        {jf.status === "rejected" ? "Perbaiki" : "Edit"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <a
              href={meta.addHref(generalPermitId)}
              className="w-full flex items-center gap-2.5 p-2.5 border-2 border-dashed border-slate-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition-colors"
            >
              <span className="font-bold text-base leading-none text-orange-500">+</span>
              <span className="text-xs font-semibold">
                Tambah {meta.label} {list.length > 0 ? \`(Lampiran #\${list.length + 1})\` : ''}
              </span>
            </a>
          </div>
        );
      })}
    </div>
  );`;

// Normalize \r\n for replacement
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetSection.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const result = normalizedContent.replace(normalizedTarget, replacementSection.replace(/\r\n/g, '\n'));
  fs.writeFileSync('components/DetailModal.tsx', result.replace(/\n/g, '\r\n'), 'utf-8');
  console.log('[OK] DetailModal.tsx updated for multiple linked forms!');
} else {
  console.log('[WARN] Could not find targetSection in DetailModal.tsx');
}

