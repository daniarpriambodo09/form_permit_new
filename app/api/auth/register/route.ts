// app/api/auth/register-approver/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, verifyToken, COOKIE_NAME } from '@/lib/auth';

const APPROVER_ROLES = [
  'spv',
  'kontraktor',
  'admin_k3',
  'sfo',
  'pga',
  'admin',
] as const;

type ApproverRole = (typeof APPROVER_ROLES)[number];

const DEPARTMENT_OPTIONS = [
  "QA",
  "ENG",
  "MTC",
  "PRODUKSI",
  "NYS",
  "FATP-Exim",
  "MPC-WHS",
  "PGA",
] as const;

const JABATAN_LABEL: Record<ApproverRole, string> = {
  spv:       'Supervisor',
  kontraktor: 'Kontraktor',
  admin_k3:  'Admin K3',
  sfo:       'SFO',
  pga:       'PGA',
  admin:     'Administrator',
};

export async function POST(req: NextRequest) {
  // ── Validasi admin ────────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Akses ditolak. Login sebagai admin terlebih dahulu.' },
      { status: 403 }
    );
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { error: 'Akses ditolak. Hanya admin yang dapat membuat akun.' },
      { status: 403 }
    );
  }
  // ── AKHIR validasi admin ──────────────────────────────────────

  try {
    const { nama, username, role, departmen, email, no_telp, password } =
      await req.json();

    // Validasi password
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // Validasi username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username harus 3-20 karakter, hanya huruf, angka, dan underscore' },
        { status: 400 }
      );
    }

    // Validasi role
    if (!role || !(APPROVER_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Role approver tidak valid' }, { status: 400 });
    }

    const approverRole = role as ApproverRole;

    // Validasi departemen — wajib hanya untuk SPV
    if (approverRole === 'spv') {
      if (!departmen) {
        return NextResponse.json({ error: 'Departemen wajib dipilih untuk role SPV' }, { status: 400 });
      }
      if (!(DEPARTMENT_OPTIONS as readonly string[]).includes(departmen)) {
        return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
      }
    }

    // Validasi email — opsional, tapi jika diisi harus valid
    const emailValue: string | null =
      email && typeof email === 'string' && email.trim() !== ''
        ? email.trim()
        : null;

    if (emailValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
      }
    }

    // Cek duplikat username
    const existingUsername = await queryOne(
      `SELECT id FROM users WHERE username = $1`,
      [username.toLowerCase().trim()]
    );
    if (existingUsername) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    // Cek duplikat email
    if (emailValue) {
      const existingEmail = await queryOne(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
        [emailValue]
      );
      if (existingEmail) {
        return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 });
      }
    }

    const hashedPassword = await hashPassword(password);

    // departemen: diisi untuk SPV, null untuk role lainnya
    const departmenValue =
      approverRole === 'spv' ? departmen : null;

    await query(
      `INSERT INTO users (username, password, nama, departmen, email, no_telp, jabatan, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        username.toLowerCase().trim(),
        hashedPassword,
        nama,
        departmenValue ?? null,
        emailValue ? emailValue.toLowerCase() : null,
        no_telp || null,
        JABATAN_LABEL[approverRole],
        approverRole,
        true,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Akun ${JABATAN_LABEL[approverRole]} berhasil dibuat.`,
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/auth/register-approver]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}