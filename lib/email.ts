// lib/email.ts
// Core email utilities menggunakan Nodemailer.
// Prioritas konfigurasi:
//   1. Tabel smtp_settings (is_active = TRUE)
//   2. Environment variables (.env.local) — fallback

import nodemailer, { TransportOptions } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import pool from '@/lib/db';

// ── Tipe data ────────────────────────────────────────────────

export interface EmailOptions {
  to:      string | string[];
  subject: string;
  text:    string;
  html?:   string;
}

export interface ApprovalEmailData {
  idForm:        string;
  jenisForm:     string;   // "Hot Work" | "Workshop" | "Height Work"
  namaPemohon:   string;
  tanggal:       string;   // formatted DD MMM YYYY
  approverName:  string;
  approverEmail: string;
  formTypeSlug?: string;   // "hot-work" | "workshop" | "height-work"
}

export interface RejectionEmailData {
  idForm:        string;
  jenisForm:     string;
  namaApprover:  string;
  catatanReject: string;
  pembuatEmail:  string;
  pembuatName:   string;
  formTypeSlug?: string;
}

// ── Tipe konfigurasi SMTP internal ──────────────────────────

interface SmtpConfig {
  host:      string;
  port:      number;
  user:      string;
  pass:      string;
  from:      string;
  appUrl:    string;
  useTls:    boolean;
  useSsl:    boolean;
  source:    'database' | 'env';
}

// ── Baca konfigurasi aktif dari DB ───────────────────────────

async function getSmtpConfigFromDb(): Promise<SmtpConfig | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT smtp_host, smtp_port, smtp_username, smtp_password,
              email_sender, app_url, use_tls, use_ssl
       FROM smtp_settings
       WHERE is_active = TRUE
       LIMIT 1`
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const from = row.email_sender;

    return {
      host:    row.smtp_host,
      port:    Number(row.smtp_port),
      user:    row.smtp_username,
      pass:    row.smtp_password,
      from,
      appUrl:  (row.app_url || '').replace(/\/$/, ''),
      useTls:  Boolean(row.use_tls),
      useSsl:  Boolean(row.use_ssl),
      source:  'database',
    };
  } catch (err) {
    console.warn('[EMAIL] Gagal membaca smtp_settings dari DB, fallback ke env:', err);
    return null;
  } finally {
    client.release();
  }
}

// ── Baca konfigurasi fallback dari .env.local ─────────────────

function getSmtpConfigFromEnv(): SmtpConfig {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || user;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  return {
    host,
    port,
    user,
    pass,
    from,
    appUrl,
    useTls: port === 587,
    useSsl: port === 465,
    source: 'env',
  };
}

// ── Helper utama: dapatkan konfigurasi aktif ──────────────────

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const dbConfig = await getSmtpConfigFromDb();
  if (dbConfig) {
    console.log('[EMAIL] Menggunakan konfigurasi SMTP dari database.');
    return dbConfig;
  }
  console.log('[EMAIL] Menggunakan konfigurasi SMTP dari environment variables.');
  return getSmtpConfigFromEnv();
}

// ── Buat instance Nodemailer transporter ─────────────────────

function buildTransporter(cfg: SmtpConfig): Transporter {
  const transportConfig: any = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.useSsl,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  };

  if (cfg.useTls && !cfg.useSsl) {
    transportConfig.requireTLS = true;
    transportConfig.tls = {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    };
  }

  return nodemailer.createTransport(
    transportConfig as TransportOptions
  );
}

// ── sendEmail: fungsi dasar ──────────────────────────────────

export async function sendEmail(options: EmailOptions): Promise<void> {
  const cfg = await getSmtpConfig();
  const transporter = buildTransporter(cfg);

  const toDisplay = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  console.log(`[EMAIL] Sending to: ${toDisplay} | Subject: ${options.subject}`);

  try {
    const info = await transporter.sendMail({
      from:    cfg.from,
      to:      options.to,
      subject: options.subject,
      text:    options.text,
      html:    options.html,
    });
    console.log(`[EMAIL] Sent successfully. MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send email:`, err);
    throw err;
  }
}

// ── Helper: Format HTML Template K3 ──────────────────────────

function buildEmailHtml(params: {
  badgeText: string;
  badgeColor: string;
  title: string;
  greeting: string;
  description: string;
  details: { label: string; value: string }[];
  alertBox?: { title: string; content: string; color: string };
  actionText?: string;
  actionUrl?: string;
}): string {
  const { badgeText, badgeColor, title, greeting, description, details, alertBox, actionText, actionUrl } = params;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px 12px; color: #1e293b; }
    .wrapper { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 4px solid #ea580c; }
    .brand-title { color: #ffffff; margin: 10px 0 2px 0; font-size: 19px; font-weight: 700; }
    .brand-sub { color: #94a3b8; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
    .badge { display: inline-block; padding: 4px 12px; background: ${badgeColor}; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 15px; margin: 0 0 12px 0; color: #1e293b; }
    .desc { font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0; }
    .table-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; margin: 20px 0; }
    .row { display: table; width: 100%; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .row:last-child { border-bottom: none; }
    .cell-label { display: table-cell; width: 38%; font-size: 13px; color: #64748b; font-weight: 500; vertical-align: top; }
    .cell-value { display: table-cell; width: 62%; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; vertical-align: top; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; margin: 20px 0; }
    .alert-title { font-size: 13px; font-weight: 700; color: #991b1b; margin: 0 0 4px 0; }
    .alert-desc { font-size: 13px; color: #7f1d1d; margin: 0; line-height: 1.4; }
    .btn-wrap { text-align: center; margin: 28px 0 16px 0; }
    .btn { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 13px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(234,88,12,0.3); }
    .link-alt { text-align: center; font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 12px; }
    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">${badgeText}</div>
      <h1 class="brand-title">Work Permit System</h1>
      <p class="brand-sub">PT Jatim Autocomp Indonesia</p>
    </div>
    <div class="content">
      <p class="greeting">Halo Bapak/Ibu <strong>${greeting}</strong>,</p>
      <p class="desc">${description}</p>

      <div class="table-card">
        ${details.map(d => `
          <div class="row">
            <span class="cell-label">${d.label}</span>
            <span class="cell-value">${d.value}</span>
          </div>
        `).join('')}
      </div>

      ${alertBox ? `
        <div class="alert-box" style="background-color: ${alertBox.color};">
          <p class="alert-title">${alertBox.title}</p>
          <p class="alert-desc">${alertBox.content}</p>
        </div>
      ` : ''}

      ${actionText && actionUrl ? `
        <div class="btn-wrap">
          <a href="${actionUrl}" class="btn">${actionText} &rarr;</a>
        </div>
        <p class="link-alt">Jika tombol di atas tidak dapat diklik, salin tautan berikut ke browser:<br><a href="${actionUrl}" style="color: #ea580c;">${actionUrl}</a></p>
      ` : ''}
    </div>
    <div class="footer">
      <strong>PT Jatim Autocomp Indonesia &bull; Divisi Keselamatan & Kesehatan Kerja (K3)</strong><br>
      Pesan ini dikirimkan otomatis oleh sistem perizinan kerja terpadu.
    </div>
  </div>
</body>
</html>`;
}

// ── sendApprovalNotification: email ke approver berikutnya ──

export async function sendApprovalNotification(data: ApprovalEmailData): Promise<void> {
  const cfg = await getSmtpConfig();
  const subject = `[PERMIT] Approval Diperlukan - ${data.jenisForm} (${data.idForm})`;

  const formType = data.formTypeSlug || 'approval';
  const targetPath = data.formTypeSlug ? `/approval/${data.formTypeSlug}/${data.idForm}` : `/approval`;
  const directUrl = `${cfg.appUrl}/login/approver?redirect=${encodeURIComponent(targetPath)}`;

  const textBody = `Halo Bapak/Ibu ${data.approverName},

Terdapat permit baru yang memerlukan verifikasi dan approval Anda:

Jenis Form : ${data.jenisForm}
ID Form    : ${data.idForm}
Pemohon    : ${data.namaPemohon}
Tanggal    : ${data.tanggal}

Silakan buka tautan berikut untuk memproses approval:
${directUrl}

Terima kasih.
PT Jatim Autocomp Indonesia (K3 HSE)`;

  const htmlBody = buildEmailHtml({
    badgeText: 'Pemberitahuan Approval K3',
    badgeColor: '#059669',
    title: subject,
    greeting: data.approverName,
    description: `Terdapat pengajuan formulir izin kerja baru yang menunggu verifikasi dan tanda tangan persetujuan (approval) Anda.`,
    details: [
      { label: 'Jenis Izin Kerja', value: data.jenisForm },
      { label: 'Nomor Izin (ID)', value: data.idForm },
      { label: 'Nama Pemohon', value: data.namaPemohon },
      { label: 'Tanggal Pelaksanaan', value: data.tanggal },
      { label: 'Status Saat Ini', value: 'Menunggu Approval' },
    ],
    actionText: 'Buka & Proses Persetujuan',
    actionUrl: directUrl,
  });

  console.log(`[EMAIL] Sending approval notification for ${data.idForm} to ${data.approverEmail}...`);

  await sendEmail({
    to:      data.approverEmail,
    subject,
    text:    textBody,
    html:    htmlBody,
  });
}

// ── sendRejectionNotification: email ke pembuat form ────────

export async function sendRejectionNotification(data: RejectionEmailData): Promise<void> {
  const cfg = await getSmtpConfig();
  const subject = `[PERMIT] Form Ditolak - ${data.idForm}`;

  const targetPath = data.formTypeSlug ? `/form/${data.formTypeSlug}/edit` : `/my-forms`;
  const directUrl = `${cfg.appUrl}/login/worker?from=${encodeURIComponent(targetPath)}`;

  const textBody = `Halo Bapak/Ibu ${data.pembuatName},

Formulir izin kerja Anda telah ditolak oleh approver.

Jenis Form : ${data.jenisForm}
ID Form    : ${data.idForm}
Approver   : ${data.namaApprover}
Catatan    : ${data.catatanReject}

Silakan lakukan perbaikan dan submit ulang formulir Anda:
${directUrl}

Terima kasih.`;

  const htmlBody = buildEmailHtml({
    badgeText: 'Form Ditolak (Revision Required)',
    badgeColor: '#dc2626',
    title: subject,
    greeting: data.pembuatName,
    description: `Formulir perizinan kerja Anda memerlukan perbaikan berdasarkan hasil evaluasi approver di lapangan.`,
    details: [
      { label: 'Jenis Izin Kerja', value: data.jenisForm },
      { label: 'Nomor Izin (ID)', value: data.idForm },
      { label: 'Dievaluasi Oleh', value: data.namaApprover },
      { label: 'Status', value: 'Ditolak / Perlu Revisi' },
    ],
    alertBox: {
      title: 'Catatan Penolakan / Alasan Revisi:',
      content: data.catatanReject || 'Silakan cek catatan perbaikan di sistem.',
      color: '#fef2f2',
    },
    actionText: 'Buka & Perbaiki Formulir',
    actionUrl: directUrl,
  });

  console.log(`[EMAIL] Sending rejection notification for ${data.idForm} to ${data.pembuatEmail}...`);

  await sendEmail({
    to:      data.pembuatEmail,
    subject,
    text:    textBody,
    html:    htmlBody,
  });
}

export interface ExternalApprovalEmailData {
  idForm: string;
  namaPemohon: string;
  tanggal: string;
  approverName: string;
  approverEmail: string;
  attachmentCount: number;
}

export async function sendExternalApprovalNotification(data: ExternalApprovalEmailData): Promise<void> {
  const cfg = await getSmtpConfig();
  const subject = `[PERMIT] Approval Ijin Kerja Eksternal - ${data.idForm}`;
  const targetPath = `/approval/external/${data.idForm}`;
  const directUrl = `${cfg.appUrl}/login/approver?redirect=${encodeURIComponent(targetPath)}`;

  const textBody = `Halo Bapak/Ibu ${data.approverName},

Terdapat pengajuan Ijin Kerja Eksternal yang memerlukan review Anda:

ID Form    : ${data.idForm}
Pemohon    : ${data.namaPemohon}
Tanggal    : ${data.tanggal}
Lampiran   : ${data.attachmentCount} jenis pekerjaan/JSA tersedia

Buka halaman approval:
${directUrl}

Terima kasih.`;

  const htmlBody = buildEmailHtml({
    badgeText: 'Ijin Kerja Eksternal',
    badgeColor: '#2563eb',
    title: subject,
    greeting: data.approverName,
    description: `Terdapat pengajuan Ijin Kerja Eksternal (Kontraktor) baru yang memerlukan otorisasi Anda. Seluruh form induk, JSA, dan lampiran dapat direview dari satu halaman.`,
    details: [
      { label: 'Nomor Ijin Eksternal', value: data.idForm },
      { label: 'Nama Pemohon', value: data.namaPemohon },
      { label: 'Tanggal Pelaksanaan', value: data.tanggal },
      { label: 'Status', value: 'Menunggu Review & Approval' },
    ],
    actionText: 'Buka Halaman Approval Eksternal',
    actionUrl: directUrl,
  });

  await sendEmail({
    to:      data.approverEmail,
    subject,
    text:    textBody,
    html:    htmlBody,
  });
}