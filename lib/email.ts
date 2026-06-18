// lib/email.ts
// Core email utilities menggunakan Nodemailer.
// Prioritas konfigurasi:
//   1. Tabel smtp_settings (is_active = TRUE)
//   2. Environment variables (.env.local) — fallback
//
// Tidak ada perubahan pada signature fungsi publik,
// sehingga approval-email.ts tidak perlu diubah.

import nodemailer, { TransportOptions } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import pool from '@/lib/db';

// ── Tipe data ────────────────────────────────────────────────

export interface EmailOptions {
  to:      string | string[];
  subject: string;
  text:    string;
}

export interface ApprovalEmailData {
  idForm:        string;
  jenisForm:     string;   // "Hot Work" | "Workshop" | "Height Work"
  namaPemohon:   string;
  tanggal:       string;   // formatted DD MMM YYYY
  approverName:  string;
  approverEmail: string;
}

export interface RejectionEmailData {
  idForm:        string;
  jenisForm:     string;
  namaApprover:  string;
  catatanReject: string;
  pembuatEmail:  string;
  pembuatName:   string;
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
              email_sender, use_tls, use_ssl, app_url
       FROM smtp_settings
       WHERE is_active = TRUE
       LIMIT 1`
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      host:   row.smtp_host,
      port:   row.smtp_port,
      user:   row.smtp_username ?? '',
      pass:   row.smtp_password ?? '',
      from:   row.email_sender,
      appUrl: row.app_url,
      useTls: row.use_tls,
      useSsl: row.use_ssl,
      source: 'database',
    };
  } catch (err) {
    console.warn('[EMAIL] Gagal membaca smtp_settings dari DB, fallback ke ENV:', err);
    return null;
  } finally {
    client.release();
  }
}

// ── Baca konfigurasi dari ENV (fallback) ─────────────────────

function getSmtpConfigFromEnv(): SmtpConfig {
  const port   = Number(process.env.SMTP_PORT) || 25;
  const useTls = port === 587;
  const useSsl = port === 465;
  return {
    host:   process.env.SMTP_HOST  || 'localhost',
    port,
    user:   process.env.SMTP_USER  || '',
    pass:   process.env.SMTP_PASS  || '',
    from:   process.env.SMTP_FROM  || process.env.SMTP_USER || 'no-reply@jai.co.id',
    appUrl: process.env.APP_URL    || 'http://localhost:3000',
    useTls,
    useSsl,
    source: 'env',
  };
}

// ── getSmtpConfig: DB terlebih dahulu, ENV sebagai fallback ──

async function getSmtpConfig(): Promise<SmtpConfig> {
  const dbConfig = await getSmtpConfigFromDb();
  if (dbConfig) return dbConfig;
  return getSmtpConfigFromEnv();
}

// ── Buat Nodemailer transporter dari SmtpConfig ──────────────

function buildTransporter(cfg: SmtpConfig) {
  const hasAuth = Boolean(cfg.user && cfg.pass);

  const transportConfig: any = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.useSsl,
    tls: {
      rejectUnauthorized: false,
    },
  };

  if (cfg.useTls) {
    transportConfig.requireTLS = true;
  }

  if (hasAuth) {
    transportConfig.auth = {
      user: cfg.user,
      pass: cfg.pass,
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
    });
    console.log(`[EMAIL] Sent successfully. MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send email:`, err);
    throw err;
  }
}

// ── sendApprovalNotification: email ke approver berikutnya ──

export async function sendApprovalNotification(data: ApprovalEmailData): Promise<void> {
  // App URL dari DB/ENV sudah ada di sendEmail via cfg,
  // tapi kita perlu appUrl untuk body email → baca config sekali lagi.
  const cfg = await getSmtpConfig();

  const subject = `[PERMIT] Approval Diperlukan - ${data.idForm}`;

  const body = `Halo Bapak/Ibu ${data.approverName},

Terdapat permit baru yang memerlukan approval Anda.

Jenis Form : ${data.jenisForm}
ID Form    : ${data.idForm}
Pemohon    : ${data.namaPemohon}
Tanggal    : ${data.tanggal}

Silakan login ke sistem untuk melakukan approval.

Link:
${cfg.appUrl}/approval

Terima kasih.`;

  console.log(`[EMAIL] Sending approval notification for ${data.idForm} to ${data.approverEmail}...`);

  await sendEmail({
    to:      data.approverEmail,
    subject,
    text:    body,
  });
}

// ── sendRejectionNotification: email ke pembuat form ────────

export async function sendRejectionNotification(data: RejectionEmailData): Promise<void> {
  const subject = `[PERMIT] Form Ditolak - ${data.idForm}`;

  const body = `Halo Bapak/Ibu ${data.pembuatName},

Form Anda telah ditolak.

Jenis Form : ${data.jenisForm}
ID Form    : ${data.idForm}
Approver   : ${data.namaApprover}
Catatan    : ${data.catatanReject}

Silakan lakukan perbaikan dan submit ulang.

Terima kasih.`;

  console.log(`[EMAIL] Sending rejection notification for ${data.idForm} to ${data.pembuatEmail}...`);

  await sendEmail({
    to:      data.pembuatEmail,
    subject,
    text:    body,
  });
}