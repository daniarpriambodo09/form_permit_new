// components/form-selection-modal.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { X, Flame, AlertTriangle, Wrench, ClipboardList, Building2, Briefcase } from "lucide-react";

interface FormSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormCategory = "internal" | "eksternal";

interface FormTypeItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  category: FormCategory;
  categoryLabel: string;
  badge?: string;
}

const formTypes: FormTypeItem[] = [
  {
    id: "ijin-kerja-eksternal",
    title: "Ijin Kerja Eksternal",
    description: "Wajib untuk vendor/kontraktor. Isi ini dulu, lalu tambahkan form jenis kerja spesifik (Panas/Ketinggian/Workshop) sesuai kebutuhan.",
    icon: ClipboardList,
    href: "/form/ijin-kerja-eksternal",
    color: "from-purple-500 to-indigo-500",
    category: "eksternal",
    categoryLabel: "Eksternal",
    badge: "MULAI DI SINI",
  },
  {
    id: "hot-work",
    title: "Form Kerja Panas",
    description: "Untuk pekerjaan panas seperti pengelasan, pemotongan, dan grinding — karyawan internal PT.JAI",
    icon: Flame,
    href: "/form/hot-work",
    color: "from-red-500 to-orange-500",
    category: "internal",
    categoryLabel: "Internal",
  },
  {
    id: "height-work",
    title: "Form Kerja Ketinggian",
    description: "Untuk pekerjaan di ketinggian seperti scaffolding dan tangga — karyawan internal PT.JAI",
    icon: AlertTriangle,
    href: "/form/height-work",
    color: "from-blue-500 to-cyan-500",
    category: "internal",
    categoryLabel: "Internal",
  },
  {
    id: "workshop",
    title: "Form Kerja Workshop",
    description: "Untuk pekerjaan workshop seperti maintenance, perbaikan, dan instalasi — karyawan internal PT.JAI",
    icon: Wrench,
    href: "/form/workshop",
    color: "from-green-500 to-emerald-500",
    category: "internal",
    categoryLabel: "Internal",
  },
];

export default function FormSelectionModal({ isOpen, onClose }: FormSelectionModalProps) {
  const [filter, setFilter] = useState<"internal" | "eksternal">("internal");

  if (!isOpen) return null;

  const internalCount = formTypes.filter((f) => f.category === "internal").length;
  const eksternalCount = formTypes.filter((f) => f.category === "eksternal").length;

  const filteredForms = formTypes.filter((form) => form.category === filter);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header & Filter Sticky */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 pb-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Pilih Jenis Form</h2>
              <p className="text-sm text-slate-500 mt-1">
                Pilih kategori pengajuan: <strong>Internal</strong> untuk karyawan PT. JAI atau <strong>Eksternal</strong> untuk vendor/kontraktor.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filter Bar: Internal vs Eksternal */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl mt-4">
            <button
              type="button"
              onClick={() => setFilter("internal")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === "internal"
                  ? "bg-white text-orange-600 shadow-sm ring-1 ring-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Internal</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  filter === "internal" ? "bg-orange-100 text-orange-700" : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {internalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("eksternal")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === "eksternal"
                  ? "bg-white text-purple-600 shadow-sm ring-1 ring-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Eksternal</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  filter === "eksternal" ? "bg-purple-100 text-purple-700" : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {eksternalCount}
              </span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-6">
          <div className="grid md:grid-cols-1 gap-4">
            {filteredForms.map((form) => {
              const Icon = form.icon;
              const isEksternalEntry = form.category === "eksternal";

              return (
                <Link key={form.id} href={form.href} onClick={onClose} className="group">
                  <div
                    className={`relative overflow-hidden rounded-xl border transition-all hover:shadow-lg bg-white h-full ${
                      isEksternalEntry
                        ? "border-purple-300 hover:border-purple-500 ring-1 ring-purple-100 hover:shadow-purple-500/10"
                        : "border-slate-200 hover:border-orange-400 hover:shadow-orange-500/10"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-r ${form.color} transition-opacity`}
                    />
                    <div className="relative p-6 flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${form.color} shrink-0 shadow-sm`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{form.title}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isEksternalEntry
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-orange-50 text-orange-700 border border-orange-200"
                            }`}
                          >
                            {form.categoryLabel.toUpperCase()}
                          </span>
                          {form.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-600 text-white rounded-full">
                              {form.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{form.description}</p>
                      </div>
                      <div
                        className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                          isEksternalEntry ? "text-purple-600" : "text-orange-600"
                        }`}
                      >
                        <svg
                          className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}