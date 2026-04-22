// lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET  = process.env.JWT_SECRET || 'jai-permit-secret-change-in-production';
const JWT_EXPIRES = '8h';

// ── Role Definitions ────────────────────────────────────────
// Alur approval:
//   hot-work / workshop  : firewatch(0) → spv(1) → kontraktor(2) → sfo(3) → pga(4)
//
//   height-work INTERNAL : spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   height-work EKSTERNAL: kontraktor(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
//
// Stage 0 (firewatch) khusus untuk hot-work & workshop.
// SPV di hot-work/workshop: jabatan Pemberi Izin diisi otomatis dari profil SPV.

export type UserRole =
  | 'worker'
  | 'firewatch'
  | 'spv'
  | 'kontraktor'
  | 'admin_k3'   // ← BARU: Admin K3, khusus height-work
  | 'sfo'
  | 'pga'
  | 'admin';

export const ROLE_ORDER: Record<UserRole, number> = {
  worker:    0,
  firewatch: 0,
  spv:       1,
  kontraktor: 2,
  admin_k3:  3,  // posisi relatif, stage aktual tergantung form type
  sfo:       4,
  pga:       5,
  admin:     99,
};

// Stage → Role untuk alur UMUM (hot-work / workshop)
export const STAGE_TO_ROLE: Record<number, UserRole> = {
  0: 'firewatch',
  1: 'spv',
  2: 'kontraktor',
  3: 'sfo',
  4: 'pga',
};

// Stage → Role untuk height-work INTERNAL: spv→admin_k3→sfo→mr_pga
export const STAGE_TO_ROLE_HW_INTERNAL: Record<number, UserRole> = {
  1: 'spv',
  2: 'admin_k3',
  3: 'sfo',
  4: 'pga',  // mr_pga menggunakan role pga
};

// Stage → Role untuk height-work EKSTERNAL: kontraktor→spv→admin_k3→sfo→mr_pga
export const STAGE_TO_ROLE_HW_EKSTERNAL: Record<number, UserRole> = {
  1: 'kontraktor',
  2: 'spv',
  3: 'admin_k3',
  4: 'sfo',
  5: 'pga',  // mr_pga menggunakan role pga
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

export function getCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge:   maxAge ?? 60 * 60 * 8,
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

  // Stage 0 hanya ada di hot-work dan workshop
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
    // Internal
    return {
      totalStages: 4,
      startStage:  1,
      stages: ['spv', 'admin_k3', 'sfo', 'mr_pga'],
    };
  }
  // hot-work dan workshop: mulai dari stage 0 (firewatch)
  return {
    totalStages: 5,
    startStage:  0,
    stages: ['firewatch', 'spv', 'kontraktor', 'sfo', 'pga'],
  };
}

// ── Helper: apakah form type memerlukan fire watch approval ──
export function requiresFireWatch(formType: string): boolean {
  return formType === 'hot-work' || formType === 'workshop';
}

// ── Helper: apakah height-work eksternal ─────────────────────
export function isHeightWorkEksternal(
  formType: string,
  tipePerusahaan?: string
): boolean {
  return formType === 'height-work' && tipePerusahaan === 'eksternal';
}