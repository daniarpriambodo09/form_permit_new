"use client";

import { useState, useEffect } from "react";
import { UserCheck, Mail, Loader2, X, CheckCircle2, Building2, BadgeCheck } from "lucide-react";

export interface ApproverUserOption {
  id: number;
  nama: string;
  username: string;
  role: string;
  nik?: string | null;
  jabatan?: string | null;
  departmen?: string | null;
  email?: string | null;
  is_active?: boolean;
}

interface NextApproverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedUserId: number, selectedUser: ApproverUserOption) => void;
  targetRole: "sfo" | "smr";
  submitting?: boolean;
}

const ROLE_DISPLAY: Record<"sfo" | "smr", { short: string; full: string }> = {
  sfo: {
    short: "SFO",
    full: "Safety Officer (SFO)",
  },
  smr: {
    short: "SMR / Manager",
    full: "SMR / PGA Manager",
  },
};

export default function NextApproverModal({
  isOpen,
  onClose,
  onConfirm,
  targetRole,
  submitting = false,
}: NextApproverModalProps) {
  const [users, setUsers] = useState<ApproverUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`/api/admin-users/approvers?role=${encodeURIComponent(targetRole)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat daftar approver");
        if (cancelled) return;
        const activeUsers: ApproverUserOption[] = (data.users || []).filter(
          (u: ApproverUserOption) => u.is_active !== false
        );
        setUsers(activeUsers);
        if (activeUsers.length > 0) {
          setSelectedId(activeUsers[0].id);
        } else {
          setSelectedId(null);
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Gagal memuat daftar user");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, targetRole]);

  if (!isOpen) return null;

  const roleMeta = ROLE_DISPLAY[targetRole];
  const selectedUser = users.find((u) => u.id === selectedId) || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Pilih Approver Selanjutnya ({roleMeta.short})
              </h3>
              <p className="text-[11px] text-orange-100 mt-0.5">
                Pilih user {roleMeta.full} yang akan menerima pengajuan ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
              <p className="text-xs font-medium">Memuat daftar user {roleMeta.short}...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-sm font-bold text-slate-700">
                Belum ada user dengan role {roleMeta.short} yang aktif
              </p>
              <p className="text-xs text-slate-500">
                Silakan tambahkan user {roleMeta.short} melalui menu Kelola User terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-600">
                Daftar User {roleMeta.full} ({users.length} tersedia):
              </p>
              {users.map((u) => {
                const isSelected = selectedId === u.id;
                return (
                  <label
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 shadow-xs"
                        : "border-slate-200 hover:border-orange-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="next-approver-user"
                      checked={isSelected}
                      onChange={() => setSelectedId(u.id)}
                      className="mt-1 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {u.nama}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                          {roleMeta.short}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                        {u.nik && (
                          <span className="inline-flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3 text-slate-400" />
                            NIK: {u.nik}
                          </span>
                        )}
                        {u.departmen && u.departmen !== "Unknown" && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {u.departmen}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {u.email ? u.email : "Email belum diisi"}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!selectedUser || submitting}
            onClick={() => {
              if (selectedUser) {
                onConfirm(selectedUser.id, selectedUser);
              }
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {selectedUser
                ? `Setujui & Kirim ke ${selectedUser.nama}`
                : "Setujui & Kirim"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

