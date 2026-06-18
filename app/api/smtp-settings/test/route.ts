// app/api/smtp-settings/test/route.ts
// Project: JAI Form Permit
// Test koneksi SMTP menggunakan payload dari form (bukan dari DB).
// Hanya role admin.

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Guard: hanya admin
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const { smtpHost, smtpPort, smtpUsername, smtpPassword, emailSender, useTls, useSsl } = body;

    if (!smtpHost || !smtpPort || !emailSender) {
      return NextResponse.json(
        { success: false, message: 'Host, port, dan email pengirim wajib diisi sebelum test' },
        { status: 400 }
      );
    }

    const transportConfig: any = {
      host:   smtpHost.trim(),
      port:   parseInt(smtpPort),
      secure: Boolean(useSsl),
    };

    const hasCredentials =
      smtpUsername && smtpUsername.trim().length > 0 &&
      smtpPassword && smtpPassword.trim().length > 0;

    transportConfig.auth = hasCredentials
      ? { user: smtpUsername.trim(), pass: smtpPassword.trim() }
      : false;

    if (useTls && !useSsl) {
      transportConfig.requireTLS = true;
      transportConfig.tls = { rejectUnauthorized: false };
    }

    if (!useSsl && !useTls) {
      transportConfig.tls = { rejectUnauthorized: false };
    }

    transportConfig.connectionTimeout = 8000;
    transportConfig.greetingTimeout   = 5000;
    transportConfig.socketTimeout     = 10000;

    const transporter = nodemailer.createTransport(transportConfig);
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: `Koneksi ke ${smtpHost}:${smtpPort} berhasil. SMTP server siap digunakan.`,
    });

  } catch (error: any) {
    console.error('[SMTP-TEST] error:', error);

    let message = 'Koneksi SMTP gagal.';
    if (error.code === 'ECONNREFUSED') {
      message = `Koneksi ditolak oleh ${error.address || 'host'}:${error.port || 'port'}. Pastikan SMTP server aktif dan port benar.`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      message = 'Koneksi timeout. Periksa host, port, dan firewall.';
    } else if (error.code === 'ENOTFOUND') {
      message = 'Host tidak ditemukan. Periksa kembali SMTP Host.';
    } else if (error.responseCode === 535 || error.responseCode === 534) {
      message = 'Autentikasi gagal. Periksa username dan password.';
    } else if (error.message) {
      message = `Error: ${error.message}`;
    }

    // Status 200 agar frontend bisa baca body-nya
    return NextResponse.json({ success: false, message }, { status: 200 });
  }
}