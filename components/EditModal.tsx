// components/EditModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import EditableForms from "./EditableForms";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formType: "hot-work" | "height-work" | "workshop";
  onSuccess?: () => void;
}

export default function EditModal({ isOpen, onClose, formId, formType, onSuccess }: EditModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !formId) return;
    loadFormData();
    setSuccess(false);
    setError("");
  }, [isOpen, formId]);

  const loadFormData = async () => {
    setFetchingData(true);
    setError("");
    try {
      const res = await fetch(`/api/forms/${formType}/${formId}`);
      if (!res.ok) {
        throw new Error("Gagal memuat data form");
      }
      const json = await res.json();
      setFormData(json.data);
      setEditData(json.data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // ✅ PENTING: Tambahkan status: 'submitted' secara eksplisit
      const res = await fetch(`/api/forms/${formType}/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          status: 'submitted', // ✅ Force status ke 'submitted'
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan perubahan");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Edit Form & Kirim Ulang</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 font-semibold text-sm">Berhasil!</p>
                <p className="text-green-600 text-sm">Form telah diperbaiki dan dikirim ulang untuk review.</p>
              </div>
            </div>
          )}

          {fetchingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  <strong>Catatan:</strong> Form ini sebelumnya ditolak. Silakan perbaiki data di bawah ini dan kirim ulang untuk review.
                </p>
              </div>

              {/* Tampilkan catatan reject jika ada */}
              {formData?.catatan_reject && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">
                    <strong>Alasan Penolakan:</strong>
                    <span className="block mt-1 text-red-600">{formData.catatan_reject}</span>
                  </p>
                </div>
              )}

              {/* Form Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-800">Informasi Form:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">ID Form</span>
                    <p className="font-mono font-semibold text-slate-800">{formId}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Jenis Form</span>
                    <p className="font-semibold text-slate-800 capitalize">{formType.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Status Saat Ini</span>
                    <p className="font-semibold text-slate-800 capitalize">{formData?.status}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Tanggal Dibuat</span>
                    <p className="font-semibold text-slate-800">
                      {formData?.tanggal ? new Date(formData.tanggal).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Form Fields */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-4">Edit Data Form</h3>
                {editData && (
                  <EditableForms
                    formType={formType}
                    formData={editData}
                    onChange={setEditData}
                  />
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50
                           text-slate-700 rounded-lg font-semibold transition-colors"
                  disabled={loading || success}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300
                           text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  disabled={loading || success}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Perbaiki & Kirim Ulang"
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}