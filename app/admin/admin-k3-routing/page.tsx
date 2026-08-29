// app/admin/admin-k3-routing/page.tsx
// Halaman untuk mengatur: form hot-work/height-work/workshop, saat naik ke
// tahap Admin K3, dikirim ke Admin K3 mana. Admin only.
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck, Loader2, Save, CheckCircle } from "lucide-react";

interface AdminK3User {
  id: number;
  nama: string;
  email: string | null;
}

const JENIS_LIST: { key: string; label: string }[] = [
  { key: "hot-work",    label: "Hot Work Permit" },
  { key: "height-work", label: "Kerja Ketinggian" },
  { key: "workshop",    label: "Workshop Permit" },
];

export default function AdminK3RoutingPage() {
  const [users, setUsers]     = useState<AdminK3User[]>([]);
  const [routing, setRouting] = useState<Record<string, AdminK3User | null>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState<string | null>(null);
  const [error, setError]       = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/form-permit/api/admin-k3-routing", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.admin_k3_users ?? []);
      setRouting(data.routing ?? {});
      const initSelected: Record<string, string> = {};
      for (const j of JENIS_LIST) {
        initSelected[j.key] = data.routing?.[j.key]?.id ? String(data.routing[j.key].id) : "";
      }
      setSelected(initSelected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (jenisForm: string) => {
    const userId = selected[jenisForm];
    if (!userId) {
      setError("Pilih Admin K3 terlebih dahulu.");
      return;
    }
    setSaving(jenisForm);
    setError("");
    try {
      const res = await fetch("/form-permit/api/admin-k3-routing", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jenis_form: jenisForm, user_id: Number(userId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedFlag(jenisForm);
      setTimeout(() => setSavedFlag(null), 2000);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin-users" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="font-bold text-slate-900 text-base">Routing Email Admin K3</h1>
            <p className="text-xs text-slate-400">
              Atur Admin K3 mana yang menerima notifikasi untuk tiap jenis form
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Saat form mencapai tahap approval <strong>Admin K3</strong>, sistem akan mengirim
            email ke Admin K3 yang dipilih di sini untuk jenis form terkait. Jika belum diatur,
            sistem menggunakan perilaku lama (kirim ke seluruh Admin K3).
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {users.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
            Belum ada user dengan role Admin K3 yang aktif. Tambahkan dahulu di halaman kelola user.
          </div>
        )}

        <div className="space-y-3">
          {JENIS_LIST.map((j) => (
            <div key={j.key} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{j.label}</p>
                {routing[j.key] ? (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Saat ini: <strong>{routing[j.key]!.nama}</strong>
                    {routing[j.key]!.email ? ` (${routing[j.key]!.email})` : " — email belum diisi"}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-0.5">Belum diatur — pakai perilaku default</p>
                )}
              </div>

              <select
                value={selected[j.key] ?? ""}
                onChange={(e) => setSelected((prev) => ({ ...prev, [j.key]: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 min-w-[200px]"
              >
                <option value="">— Pilih Admin K3 —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama}{u.email ? ` (${u.email})` : " — tanpa email"}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleSave(j.key)}
                disabled={saving === j.key}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
              >
                {saving === j.key ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedFlag === j.key ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}