// components/form-selection-modal.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { X, Flame, AlertTriangle, Wrench } from "lucide-react";

interface FormSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formTypes = [
  {
    id: "hot-work",
    title: "Form Kerja Panas",
    description: "Untuk pekerjaan panas seperti pengelasan, pemotongan, dan grinding",
    icon: Flame,
    href: "/form/hot-work",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "height-work",
    title: "Form Kerja Ketinggian",
    description: "Untuk pekerjaan di ketinggian seperti scaffolding dan tangga",
    icon: AlertTriangle,
    href: "/form/height-work",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "workshop",
    title: "Form Kerja Workshop",
    description: "Untuk pekerjaan workshop seperti maintenance, perbaikan, dan instalasi",
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
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pilih Jenis Form</h2>
            <p className="text-sm text-slate-500 mt-1">Pilih jenis izin kerja yang Anda butuhkan</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-1 gap-4">
            {formTypes.map((form) => {
              const Icon = form.icon;
              return (
                <Link
                  key={form.id}
                  href={form.href}
                  onClick={onClose}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 hover:border-orange-400 transition-all hover:shadow-lg bg-white h-full">
                    {/* Background gradient */}
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-r ${form.color} transition-opacity`}
                    />

                    <div className="relative p-6 flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`p-3 rounded-lg bg-gradient-to-br ${form.color} shrink-0`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {form.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {form.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
