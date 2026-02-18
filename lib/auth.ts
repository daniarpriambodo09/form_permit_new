import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jai-permit-secret-change-in-production';
const JWT_EXPIRES = '8h'; // Session 8 jam kerja

// ── Password ──────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── JWT Token ─────────────────────────────────────────────────
export interface JWTPayload {
  userId:  number;
  username: string;
  nama:    string;
  jabatan: string;
  role:    string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ── Edit Token (untuk pengaju) ────────────────────────────────
// Format: "XXXX-XXXX" — 8 karakter acak, mudah dibaca
export function generateEditToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // hilangkan karakter mirip (O/0, I/1)
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${rand(4)}-${rand(4)}`;
}

// ── Cookie helpers ────────────────────────────────────────────
export const COOKIE_NAME = 'jai_auth_token';

export function getCookieOptions(maxAge?: number) {
  return {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    sameSite:  'lax' as const,
    path:      '/',
    maxAge:    maxAge ?? 60 * 60 * 8, // 8 jam default
  };
}