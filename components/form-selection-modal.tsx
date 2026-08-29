// components/form-selection-modal.tsx
"use client";
import Link from "next/link";
import { X, Flame, AlertTriangle, Wrench, ClipboardList } from "lucide-react";

interface FormSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formTypes = [
  {
    id: "ijin-kerja-eksternal",
    title: "Ijin Kerja Eksternal",
    description: "Wajib untuk vendor/kontraktor. Isi ini dulu, lalu tambahkan form jenis kerja spesifik (Panas/Ketinggian/Workshop) sesuai kebutuhan.",
    icon: ClipboardList,
    href: "/form/ijin-kerja-eksternal",
    color: "from-purple-500 to-indigo-500",
  },
  {
    id: "hot-work",
    title: "Form Kerja Panas",
    description: "Untuk pekerjaan panas seperti pengelasan, pemotongan, dan grinding — karyawan internal PT.JAI",
    icon: Flame,
    href: "/form/hot-work",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "height-work",
    title: "Form Kerja Ketinggian",
    description: "Untuk pekerjaan di ketinggian seperti scaffolding dan tangga — karyawan internal PT.JAI",
    icon: AlertTriangle,
    href: "/form/height-work",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "workshop",
    title: "Form Kerja Workshop",
    description: "Untuk pekerjaan workshop seperti maintenance, perbaikan, dan instalasi — karyawan internal PT.JAI",
    icon: Wrench,
    href: "/form/workshop",
    color: "from-green-500 to-emerald-500",
  },
];

export default function FormSelectionModal({ isOpen, onClose }: FormSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pilih Jenis Form</h2>
            <p className="text-sm text-slate-500 mt-1">
              Vendor/kontraktor eksternal: pilih "Ijin Kerja Eksternal" terlebih dahulu.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-1 gap-4">
            {formTypes.map((form) => {
              const Icon = form.icon;
              const isEksternalEntry = form.id === "ijin-kerja-eksternal";
              return (
                <Link key={form.id} href={form.href} onClick={onClose} className="group">
                  <div className={`relative overflow-hidden rounded-xl border transition-all hover:shadow-lg bg-white h-full ${
                    isEksternalEntry ? "border-purple-300 hover:border-purple-500 ring-1 ring-purple-100" : "border-slate-200 hover:border-orange-400"
                  }`}>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-r ${form.color} transition-opacity`} />
                    <div className="relative p-6 flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${form.color} shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{form.title}</h3>
                          {isEksternalEntry && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full mb-1">MULAI DI SINI</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{form.description}</p>
                      </div>
                      <div className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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