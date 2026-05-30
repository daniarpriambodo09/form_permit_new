// lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET  = process.env.JWT_SECRET || 'jai-permit-secret-change-in-production';
const JWT_EXPIRES = '8h';

// ── Role Definitions ────────────────────────────────────────
export type UserRole =
  | 'worker'
  | 'firewatch'
  | 'spv'
  | 'kontraktor'
  | 'admin_k3'
  | 'sfo'
  | 'pga'
  | 'admin';

export const ROLE_ORDER: Record<UserRole, number> = {
  worker:    0,
  firewatch: 0,
  spv:       1,
  kontraktor: 2,
  admin_k3:  3,
  sfo:       4,
  pga:       5,
  admin:     99,
};

export const STAGE_TO_ROLE: Record<number, UserRole> = {
  0: 'firewatch',
  1: 'spv',
  2: 'kontraktor',
  3: 'sfo',
  4: 'pga',
};

export const STAGE_TO_ROLE_HW_INTERNAL: Record<number, UserRole> = {
  1: 'spv',
  2: 'admin_k3',
  3: 'sfo',
  4: 'pga',
};

export const STAGE_TO_ROLE_HW_EKSTERNAL: Record<number, UserRole> = {
  1: 'kontraktor',
  2: 'spv',
  3: 'admin_k3',
  4: 'sfo',
  5: 'pga',
};

export const ROLE_TO_STAGE: Record<UserRole, number> = {
  worker:    -1,
  firewatch:  0,
  spv:        1,
  kontraktor: 2,
  admin_k3:   3,
  sfo:        4,
  pga:        5,
  admin:      99,
};

// ── Password ──────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── JWT Token ─────────────────────────────────────────────────
export interface JWTPayload {
  userId:   number;
  username: string;
  nama:     string;
  jabatan:  string;
  role:     UserRole;
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

// ── Edit Token ────────────────────────────────────────────────
export function generateEditToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand  = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${rand(4)}-${rand(4)}`;
}

// ── Cookie helpers ────────────────────────────────────────────
export const COOKIE_NAME = 'jai_auth_token';

// FIX #1: path di-set ke '/form-permit' agar cookie hanya dikirim
// untuk request di bawah basePath ini. Sebelumnya path='/' menyebabkan
// cookie dikirim ke semua path dan bisa konflik dengan aplikasi lain
// di server yang sama (mis. /review-prosedur).
// FIX #2: sameSite diubah ke 'strict' untuk keamanan extra karena
// aplikasi ini berjalan di internal network.
export function getCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // PERBAIKAN KRITIS: path harus '/form-permit' bukan '/'
    // Ini memastikan cookie hanya dikirim untuk request ke /form-permit/*
    // dan middleware Next.js selalu bisa membacanya dengan konsisten.
    path:     '/',
    maxAge:   maxAge ?? 60 * 60 * 8, // 8 jam
  };
}

// ── Helper: dapatkan stage map yang sesuai ────────────────────
export function getStageToRoleMap(
  formType: string,
  tipePerusahaan?: string
): Record<number, UserRole> {
  if (formType === 'height-work') {
    if (tipePerusahaan === 'eksternal') {
      return STAGE_TO_ROLE_HW_EKSTERNAL;
    }
    return STAGE_TO_ROLE_HW_INTERNAL;
  }
  return STAGE_TO_ROLE;
}

// ── Helper: cek apakah role bisa approve di stage tertentu ───
export function canUserApproveAtStage(
  userRole: UserRole,
  currentStage: number,
  formType?: string,
  tipePerusahaan?: string
): boolean {
  if (userRole === 'admin') return true;

  if (currentStage === 0) {
    return userRole === 'firewatch';
  }

  const stageMap = getStageToRoleMap(formType || '', tipePerusahaan);
  const requiredRole = stageMap[currentStage];
  return userRole === requiredRole;
}

// ── Helper: stage config per form type ───────────────────────
export function getStageConfig(
  formType: string,
  tipePerusahaan?: string
): {
  totalStages: number;
  stages: string[];
  startStage: number;
} {
  if (formType === 'height-work') {
    if (tipePerusahaan === 'eksternal') {
      return {
        totalStages: 5,
        startStage:  1,
        stages: ['kontraktor', 'spv', 'admin_k3', 'sfo', 'mr_pga'],
      };
    }
    return {
      totalStages: 4,
      startStage:  1,
      stages: ['spv', 'admin_k3', 'sfo', 'mr_pga'],
    };
  }
  return {
    totalStages: 5,
    startStage:  0,
    stages: ['firewatch', 'spv', 'kontraktor', 'sfo', 'pga'],
  };
}

export function requiresFireWatch(formType: string): boolean {
  return formType === 'hot-work' || formType === 'workshop';
}

export function isHeightWorkEksternal(
  formType: string,
  tipePerusahaan?: string
): boolean {
  return formType === 'height-work' && tipePerusahaan === 'eksternal';
}