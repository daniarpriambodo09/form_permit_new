// app/smtp-settings/page.tsx
// Project: JAI Form Permit
// Halaman konfigurasi SMTP — hanya role admin.
// Redirect ke /home jika bukan admin (dicek sisi client via sessionStorage).

'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Server, Lock, KeyRound, Mail, Wifi } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SmtpConfig {
  id?:          number;
  smtpHost:     string;
  smtpPort:     string;
  smtpUsername: string;
  smtpPassword: string;
  emailSender:  string;
  useTls:       boolean;
  useSsl:       boolean;
  appUrl:       string;
  isActive:     boolean;
  updatedAt?:   string;
}

const EMPTY_CONFIG: SmtpConfig = {
  smtpHost:     '',
  smtpPort:     '25',
  smtpUsername: '',
  smtpPassword: '',
  emailSender:  '',
  useTls:       false,
  useSsl:       false,
  appUrl:       '',
  isActive:     true,
};

// ── Sub-components ────────────────────────────────────────────────────────────
interface FieldProps {
  label:     string;
  htmlFor:   string;
  required?: boolean;
  hint?:     string;
  children:  React.ReactNode;
}

function Field({ label, htmlFor, required, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function inputClass(hasError?: boolean) {
  return `w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    hasError
      ? 'border-red-400 bg-red-50 focus:ring-red-400'
      : 'border-slate-300 bg-white hover:border-slate-400'
  }`;
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="px-6 py-4 bg-slate-50 border-y border-slate-200 flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <div>
        <h2 className="font-bold text-sm text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function TestResult({ result }: { result: { success: boolean; message: string } | null }) {
  if (!result) return null;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
      result.success
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <span className="text-lg leading-none mt-0.5 shrink-0">
        {result.success ? '✅' : '❌'}
      </span>
      <div>
        <p className="font-semibold mb-0.5">{result.success ? 'Koneksi berhasil' : 'Koneksi gagal'}</p>
        <p className="text-xs opacity-90">{result.message}</p>
      </div>
    </div>
  );
}

// ── Spinner inline ────────────────────────────────────────────────────────────
function Spinner({ className = '' }: { className?: string }) {
  return (
    <span className={`animate-spin inline-block border-2 border-current border-t-transparent rounded-full ${className}`} />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SmtpSettingsPage() {
  const router = useRouter();

  // Guard: hanya admin
  useEffect(() => {
    const role = sessionStorage.getItem('user_role');
    if (role && role !== 'admin') {
      router.replace('/home');
    }
  }, [router]);

  const [config,     setConfig]     = useState<SmtpConfig>(EMPTY_CONFIG);
  const [errors,     setErrors]     = useState<Partial<Record<keyof SmtpConfig, string>>>({});
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedAt,    setSavedAt]    = useState<string | null>(null);
  const [showPass,   setShowPass]   = useState(false);
  const [isNew,      setIsNew]      = useState(true);
  const [saveMsg,    setSaveMsg]    = useState<string | null>(null);

  // ── Load konfigurasi aktif ────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/form-permit/api/smtp-settings', { credentials: 'include' });
      if (!res.ok) {
        // Mungkin belum login atau bukan admin
        if (res.status === 401 || res.status === 403) {
          router.replace('/home');
          return;
        }
      }
      const json = await res.json();
      if (json.data) {
        setConfig({
          id:           json.data.id,
          smtpHost:     json.data.smtpHost,
          smtpPort:     String(json.data.smtpPort),
          smtpUsername: json.data.smtpUsername ?? '',
          smtpPassword: json.data.smtpPassword ?? '',
          emailSender:  json.data.emailSender,
          useTls:       json.data.useTls,
          useSsl:       json.data.useSsl,
          appUrl:       json.data.appUrl,
          isActive:     json.data.isActive,
          updatedAt:    json.data.updatedAt,
        });
        setIsNew(false);
        if (json.data.updatedAt) {
          setSavedAt(
            new Date(json.data.updatedAt).toLocaleString('id-ID', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          );
        }
      } else {
        setIsNew(true);
      }
    } catch (e) {
      console.error('Gagal load konfigurasi SMTP:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (field: keyof SmtpConfig, value: any) => {
    setConfig(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'useTls' && value === true) next.useSsl = false;
      if (field === 'useSsl' && value === true) next.useTls = false;
      return next;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    setTestResult(null);
    setSaveMsg(null);
  };

  function validate(): boolean {
    const e: Partial<Record<keyof SmtpConfig, string>> = {};
    if (!config.smtpHost.trim())    e.smtpHost    = 'SMTP Host wajib diisi';
    const port = parseInt(config.smtpPort);
    if (isNaN(port) || port < 1 || port > 65535)
      e.smtpPort = 'Port harus angka antara 1–65535';
    if (!config.emailSender.trim()) e.emailSender = 'Email pengirim wajib diisi';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (config.emailSender.trim() && !emailRegex.test(config.emailSender.trim()))
      e.emailSender = 'Format email tidak valid';
    if (!config.appUrl.trim())      e.appUrl      = 'App URL wajib diisi';
    if (config.useTls && config.useSsl)
      e.useTls = 'TLS dan SSL tidak boleh aktif bersamaan';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const method  = isNew ? 'POST' : 'PUT';
      const payload = isNew ? config : { ...config, id: config.id };
      const res     = await fetch('/form-permit/api/smtp-settings', {
        method,
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveMsg(`❌ ${json.error || 'Gagal menyimpan konfigurasi'}`);
        return;
      }
      setIsNew(false);
      setConfig(prev => ({ ...prev, id: json.data.id }));
      const ts = new Date(json.data.updatedAt).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      setSavedAt(ts);
      setSaveMsg('✅ Konfigurasi SMTP berhasil disimpan!');
    } catch {
      setSaveMsg('❌ Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.smtpHost.trim() || !config.smtpPort || !config.emailSender.trim()) {
      setTestResult({ success: false, message: 'Isi Host, Port, dan Email Pengirim terlebih dahulu.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res  = await fetch('/form-permit/api/smtp-settings/test', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(config),
      });
      const json = await res.json();
      setTestResult(json);
    } catch {
      setTestResult({ success: false, message: 'Gagal menghubungi server. Periksa koneksi jaringan.' });
    } finally {
      setTesting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-10 h-10 border-orange-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat konfigurasi...</p>
        </div>
      </div>
    );
  }

  // ── Checkbox custom ───────────────────────────────────────────────────────
  const CheckboxRow = ({
    id, checked, onChange, label, hint,
  }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) => (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input id={id} type="checkbox" checked={checked}
          onChange={e => onChange(e.target.checked)} className="sr-only" />
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? 'bg-orange-500 border-orange-500' : 'border-slate-300 group-hover:border-orange-400'
        }`}>
          {checked && (
            <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </label>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Pengaturan SMTP</h1>
              <p className="text-xs text-slate-500">Konfigurasi server email notifikasi approval</p>
            </div>
          </div>
          {savedAt && (
            <span className="hidden sm:inline text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
              Tersimpan: {savedAt}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Warning: belum ada konfigurasi */}
        {isNew && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="text-sm">
              <p className="font-semibold mb-0.5">Konfigurasi SMTP belum tersedia</p>
              <p className="text-xs opacity-90">
                Email approval tidak akan terkirim hingga konfigurasi disimpan.
                Saat ini sistem menggunakan fallback dari <code className="bg-amber-100 px-1 rounded">.env.local</code> (jika dikonfigurasi).
              </p>
            </div>
          </div>
        )}

        {/* Save message */}
        {saveMsg && (
          <div className={`p-3 rounded-xl text-sm font-medium ${
            saveMsg.startsWith('✅')
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {saveMsg}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Section: Server */}
          <SectionHeader
            icon={<Server className="w-4 h-4" />}
            title="Konfigurasi Server SMTP"
            subtitle="Alamat dan port SMTP server"
          />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="SMTP Host" htmlFor="smtpHost" required hint="Contoh: 10.62.231.17 atau mail.domain.com">
              <input id="smtpHost" type="text" value={config.smtpHost}
                onChange={e => handleChange('smtpHost', e.target.value)}
                placeholder="10.62.231.17" className={inputClass(!!errors.smtpHost)} />
              {errors.smtpHost && <p className="text-xs text-red-600 mt-1">{errors.smtpHost}</p>}
            </Field>
            <Field label="SMTP Port" htmlFor="smtpPort" required hint="Port umum: 25 (plain), 587 (TLS), 465 (SSL)">
              <input id="smtpPort" type="number" min={1} max={65535} value={config.smtpPort}
                onChange={e => handleChange('smtpPort', e.target.value)}
                placeholder="25" className={inputClass(!!errors.smtpPort)} />
              {errors.smtpPort && <p className="text-xs text-red-600 mt-1">{errors.smtpPort}</p>}
            </Field>
          </div>

          {/* Section: Enkripsi */}
          <SectionHeader
            icon={<Lock className="w-4 h-4" />}
            title="Enkripsi"
            subtitle="Pilih satu metode, atau kosongkan untuk SMTP tanpa enkripsi"
          />
          <div className="p-6 space-y-3">
            <CheckboxRow
              id="useTls"
              checked={config.useTls}
              onChange={v => handleChange('useTls', v)}
              label="Gunakan TLS (STARTTLS)"
              hint="Enkripsi upgrade setelah koneksi terbuka. Umum dipakai di port 587."
            />
            <CheckboxRow
              id="useSsl"
              checked={config.useSsl}
              onChange={v => handleChange('useSsl', v)}
              label="Gunakan SSL"
              hint="Koneksi terenkripsi penuh sejak awal. Umum dipakai di port 465."
            />
            {errors.useTls && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <span>⚠</span> {errors.useTls}
              </p>
            )}
          </div>

          {/* Section: Autentikasi */}
          <SectionHeader
            icon={<KeyRound className="w-4 h-4" />}
            title="Autentikasi"
            subtitle="Kosongkan jika SMTP server tidak memerlukan login"
          />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Username SMTP" htmlFor="smtpUsername" hint="Opsional — kosongkan jika tanpa autentikasi">
              <input id="smtpUsername" type="text" value={config.smtpUsername}
                onChange={e => handleChange('smtpUsername', e.target.value)}
                placeholder="user@jai.co.id" autoComplete="off" className={inputClass()} />
            </Field>
            <Field label="Password SMTP" htmlFor="smtpPassword" hint="Opsional — kosongkan jika tanpa autentikasi">
              <div className="relative">
                <input id="smtpPassword" type={showPass ? 'text' : 'password'} value={config.smtpPassword}
                  onChange={e => handleChange('smtpPassword', e.target.value)}
                  placeholder="••••••••" autoComplete="new-password"
                  className={`${inputClass()} pr-10`} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}>
                  {showPass
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </Field>
          </div>

          {/* Section: Email & App */}
          <SectionHeader
            icon={<Mail className="w-4 h-4" />}
            title="Email & Aplikasi"
          />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Email Pengirim" htmlFor="emailSender" required hint="Alamat email di header 'From'">
              <input id="emailSender" type="email" value={config.emailSender}
                onChange={e => handleChange('emailSender', e.target.value)}
                placeholder="noreply@jai.co.id" className={inputClass(!!errors.emailSender)} />
              {errors.emailSender && <p className="text-xs text-red-600 mt-1">{errors.emailSender}</p>}
            </Field>
            <Field label="App URL" htmlFor="appUrl" required hint="Digunakan di body email sebagai link approval">
              <input id="appUrl" type="text" value={config.appUrl}
                onChange={e => handleChange('appUrl', e.target.value)}
                placeholder="http://10.62.230.51:3000/form-permit" className={inputClass(!!errors.appUrl)} />
              {errors.appUrl && <p className="text-xs text-red-600 mt-1">{errors.appUrl}</p>}
            </Field>
          </div>

          {/* Test result */}
          {testResult && (
            <div className="px-6 pb-4">
              <TestResult result={testResult} />
            </div>
          )}

          {/* Footer actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button onClick={handleTest} disabled={testing || saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              {testing ? (
                <><Spinner className="w-4 h-4" /> Menguji koneksi...</>
              ) : (
                <><Wifi className="w-4 h-4" /> Test SMTP</>
              )}
            </button>
            <button onClick={handleSave} disabled={saving || testing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? (
                <><Spinner className="w-4 h-4 border-white/50 border-t-white" /> Menyimpan...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Simpan Konfigurasi
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 space-y-1.5">
          <p className="font-semibold text-sm">ℹ️ Catatan Penting</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Konfigurasi di sini akan langsung digunakan saat email approval dikirim — tidak perlu restart server.</li>
            <li>
              Jika tabel <code className="bg-orange-100 px-1 rounded font-mono">smtp_settings</code> kosong,
              sistem fallback ke <code className="bg-orange-100 px-1 rounded font-mono">.env.local</code>.
            </li>
            <li>Username dan password boleh dikosongkan untuk SMTP internal tanpa autentikasi.</li>
            <li>Gunakan tombol <strong>Test SMTP</strong> untuk memverifikasi koneksi sebelum menyimpan.</li>
          </ul>
        </div>

      </main>
    </div>
  );
}