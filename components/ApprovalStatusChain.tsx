// components/ApprovalStatusChain.tsx
"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface ApprovalStage {
  role: string;
  label: string;
  isApproved: boolean;
}

interface ApprovalStatusChainProps {
  formStatus: "draft" | "submitted" | "approved" | "rejected";
  currentStage?: number;
  formType: "hot-work" | "height-work" | "workshop" | "general-permit";
  /** Hanya relevan untuk height-work: "internal" | "eksternal" */
  tipePerusahaan?: "internal" | "eksternal";
}

// REFACTOR: Kontraktor dikeluarkan dari alur approval bertahap — kontraktor
// sekarang tanda tangan bebas kapan saja (lihat ContractorSignatureBlock /
// SignatureBox di DetailModal), bukan lagi salah satu "stage" di sini.
// Internal & eksternal sekarang punya urutan stage yang SAMA:
// SPV → Admin K3 → SFO → SMR, untuk hot-work, height-work, maupun workshop.
// Untuk general-permit (ijin kerja eksternal): SPV → Security → SFO → SMR.
const getStages = (
  formType: string,
  tipePerusahaan?: string
): ApprovalStage[] => {
  if (formType === "general-permit") {
    return [
      { role: "spv",      label: "SPV",      isApproved: false },
      { role: "security", label: "Security", isApproved: false },
      { role: "sfo",      label: "SFO",      isApproved: false },
      { role: "smr",      label: "SMR",      isApproved: false },
    ];
  }

  return [
    { role: "spv",      label: "SPV",      isApproved: false },
    { role: "admin_k3", label: "Admin K3", isApproved: false },
    { role: "sfo",      label: "SFO",      isApproved: false },
    { role: "smr",      label: "SMR",      isApproved: false },
  ];
};

export default function ApprovalStatusChain({
  formStatus,
  currentStage = 1,
  formType,
  tipePerusahaan,
}: ApprovalStatusChainProps) {
  const stages = getStages(formType, tipePerusahaan);

  const isApproved = formStatus === "approved";
  const isRejected = formStatus === "rejected";
  const isSubmitted = formStatus === "submitted";

  // stages[0]=spv(stage1), stages[1]=admin_k3/security(stage2), stages[2]=sfo(stage3), stages[3]=smr(stage4)
  const currentIndex = currentStage - 1;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, idx) => {
          const isCurrentOrPast = isApproved || idx < currentIndex;
          const isCurrent = !isApproved && idx === currentIndex;

          return (
            <React.Fragment key={stage.role}>
              {/* Stage Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    isApproved
                      ? "bg-green-100 text-green-700 border-2 border-green-500"
                      : isRejected && isCurrent
                      ? "bg-red-100 text-red-700 border-2 border-red-500"
                      : isCurrentOrPast
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                      : isCurrent
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-500 ring-2 ring-blue-200"
                      : "bg-slate-100 text-slate-500 border-2 border-slate-300"
                  }`}
                >
                  {(isCurrentOrPast || isApproved) && !isRejected ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold mt-2 text-center ${
                    (isCurrentOrPast || isApproved) && !isRejected
                      ? "text-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector */}
              {idx < stages.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-1 rounded-full transition-all ${
                    isApproved
                      ? "bg-green-300"
                      : isRejected
                      ? "bg-red-300"
                      : isCurrentOrPast
                      ? "bg-blue-300"
                      : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status Text */}
      <div className="mt-4 text-center text-xs font-medium">
        {isApproved && (
          <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">
            Disetujui pada semua tahap
          </span>
        )}
        {isRejected && (
          <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full inline-block">
            Ditolak - Silakan perbaiki dan kirim ulang
          </span>
        )}
        {isSubmitted && currentIndex >= 0 && currentIndex < stages.length && (
          <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
            Menunggu persetujuan {stages[currentIndex]?.label}
          </span>
        )}
      </div>
    </div>
  );
}