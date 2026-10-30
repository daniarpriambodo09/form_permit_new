const fs = require('fs');

let content = fs.readFileSync('app/my-forms/[jenisForm]/[id]/page.tsx', 'utf-8');

const startStr = 'const found = (linkedJobForms as any)?.[item.key];';
const endStr = '<span>+ Buat {item.label}</span>\r\n                              </Link>\r\n                            </div>\r\n                          );\r\n                        })}';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf('<span>+ Buat {item.label}</span>');

if (startIdx !== -1 && endIdx !== -1) {
  const fullEndIdx = content.indexOf('                        })}', endIdx) + '                        })}'.length;
  
  const replacement = `const list: any[] = (linkedJobForms as any)?.items?.[item.key] ?? ((linkedJobForms as any)?.[item.key] ? [(linkedJobForms as any)[item.key]] : []);
                          const Icon = item.icon;

                          return (
                            <div key={item.key} className="space-y-2">
                              {list.map((found: any, idx: number) => (
                                <div key={found.id_form || idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={\`w-7 h-7 rounded-lg flex items-center justify-center border \${item.color}\`}>
                                        <Icon className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-800">{item.label} #{idx + 1}</h4>
                                        <span className="text-[10px] font-mono text-slate-400">{found.id_form}</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                      {found.status}
                                    </span>
                                  </div>
                                  <Link
                                    href={\`/my-forms/\${item.type}/\${found.id_form}\`}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat Detail {item.label}</span>
                                  </Link>
                                </div>
                              ))}

                              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-600">
                                  {list.length > 0 ? \`Tambah \${item.label} lain\` : \`Belum ada \${item.label}\`}
                                </span>
                                <Link
                                  href={\`/form/\${item.type}?id_ijin_kerja=\${p.id_form}\`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Tambah</span>
                                </Link>
                              </div>
                            </div>
                          );
                        })}`;

  content = content.slice(0, startIdx) + replacement + content.slice(fullEndIdx);
  fs.writeFileSync('app/my-forms/[jenisForm]/[id]/page.tsx', content, 'utf-8');
  console.log('[OK] Successfully updated app/my-forms/[jenisForm]/[id]/page.tsx!');
} else {
  console.log(`[WARN] startIdx: ${startIdx}, endIdx: ${endIdx}`);
}
