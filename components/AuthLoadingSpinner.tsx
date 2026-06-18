// components/AuthLoadingSpinner.tsx
// Spinner fullscreen yang ditampilkan saat auth check berlangsung.
// Dipakai di semua halaman approver agar konsisten.
export default function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Memverifikasi sesi...</p>
    </div>
  );
}