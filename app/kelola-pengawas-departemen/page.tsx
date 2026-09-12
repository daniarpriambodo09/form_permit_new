"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Loader2, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

interface Supervisor { id: number; nama: string; nik: string; departemen: string; is_active: boolean; created_at: string; updated_at: string }
interface Department { nama_departemen: string; }

export default function KelolaPengawasDepartemenPage() {
  const [items, setItems] = useState<Supervisor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [modal, setModal] = useState<Supervisor | "add" | null>(null);
  const [form, setForm] = useState({ nama: "", nik: "", departemen: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supervisorRes, departmentRes] = await Promise.all([
        fetch("/form-permit/api/pengawas-departemen", { credentials: "include" }),
        fetch("/form-permit/api/departemen?activeOnly=1", { credentials: "include" }),
      ]);
      const supervisorData = await supervisorRes.json();
      const departmentData = await departmentRes.json();
      if (!supervisorRes.ok) throw new Error(supervisorData.error || "Gagal memuat pengawas");
      setItems(supervisorData.data ?? []);
      setDepartments(departmentData.data ?? []);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) =>
      (!q || item.nama.toLowerCase().includes(q) || item.nik.toLowerCase().includes(q)) &&
      (!filterDept || item.departemen === filterDept)
    );
  }, [items, search, filterDept]);

  const openAdd = () => { setForm({ nama: "", nik: "", departemen: "", isActive: true }); setModal("add"); };
  const openEdit = (item: Supervisor) => { setForm({ nama: item.nama, nik: item.nik, departemen: item.departemen, isActive: item.is_active }); setModal(item); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const isEdit = modal !== "add" && modal !== null;
      const res = await fetch(isEdit ? `/form-permit/api/pengawas-departemen/${(modal as Supervisor).id}` : "/form-permit/api/pengawas-departemen", {
        method: isEdit ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan data");
      setMessage({ type: "success", text: isEdit ? "Data pengawas diperbarui." : "Data pengawas ditambahkan." });
      setModal(null); load();
    } catch (error: any) { setMessage({ type: "error", text: error.message }); }
    finally { setSaving(false); }
  };

  const remove = async (item: Supervisor) => {
    if (!window.confirm(`Hapus pengawas ${item.nama}?`)) return;
    const res = await fetch(`/form-permit/api/pengawas-departemen/${item.id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json();
    if (!res.ok) { setMessage({ type: "error", text: data.error || "Gagal menghapus data" }); return; }
    setMessage({ type: "success", text: "Data pengawas dihapus." }); load();
  };

  const toggle = async (item: Supervisor) => {
    const res = await fetch(`/form-permit/api/pengawas-departemen/${item.id}`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: item.nama, nik: item.nik, departemen: item.departemen, isActive: !item.is_active }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage({ type: "error", text: data.error || "Gagal mengubah status" }); return; }
    setItems((current) => current.map((entry) => entry.id === item.id ? data.data : entry));
  };

  return <div className="min-h-screen bg-slate-50">
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href="/kelola-departemen" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-5 h-5" /></Link><div><h1 className="text-lg font-bold text-slate-900">Kelola Pengawas Departemen</h1><p className="text-xs text-slate-500">Sumber pilihan Pengawas (Bagian) pada form ijin kerja eksternal</p></div></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl"><Plus className="w-4 h-4" /> Tambah</button>
      </div>
    </header>
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {message && <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}><button onClick={() => setMessage(null)}><CheckCircle className="w-4 h-4" /></button>{message.text}</div>}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau NIK..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900" /></div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700"><option value="">Semua Departemen</option>{departments.map((dept) => <option key={dept.nama_departemen} value={dept.nama_departemen}>{dept.nama_departemen}</option>)}</select>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Belum ada pengawas yang sesuai.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200 text-left"><th className="px-5 py-3 text-xs text-slate-500">Nama</th><th className="px-5 py-3 text-xs text-slate-500">NIK</th><th className="px-5 py-3 text-xs text-slate-500">Departemen</th><th className="px-5 py-3 text-xs text-slate-500">Status</th><th className="px-5 py-3 text-xs text-slate-500 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id}><td className="px-5 py-3.5 font-semibold text-slate-800">{item.nama}</td><td className="px-5 py-3.5 text-slate-600">{item.nik}</td><td className="px-5 py-3.5 text-slate-600">{item.departemen}</td><td className="px-5 py-3.5"><button onClick={() => toggle(item)} className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${item.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{item.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}{item.is_active ? "Aktif" : "Nonaktif"}</button></td><td className="px-5 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => openEdit(item)} title="Edit" className="p-2 text-slate-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button><button onClick={() => remove(item)} title="Hapus" className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div>}
      </div>
    </main>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}><form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"><div className="flex justify-between items-center"><h2 className="font-bold text-slate-900">{modal === "add" ? "Tambah Pengawas" : "Edit Pengawas"}</h2><button type="button" onClick={() => setModal(null)}>X</button></div>{[["nama", "Nama Pengawas"], ["nik", "NIK"]].map(([key, label]) => <div key={key}><label className="block text-sm font-semibold text-slate-700 mb-1.5">{label} *</label><input required value={form[key as "nama" | "nik"]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900" /></div>)}<div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Departemen *</label><select required value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900"><option value="">Pilih Departemen</option>{departments.map((dept) => <option key={dept.nama_departemen} value={dept.nama_departemen}>{dept.nama_departemen}</option>)}</select></div><div className="flex gap-3 pt-2"><button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl">Batal</button><button disabled={saving} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl flex justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Simpan</button></div></form></div>}
  </div>;
}
