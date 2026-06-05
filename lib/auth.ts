// lib/auth.ts
// REFACTOR: Hapus Fire Watch dari approval workflow.
// Fire Watch sekarang hanya sebagai informasi di form (nama + NIK tersimpan di DB),
// bukan sebagai approver. Role 'firewatch' tetap ada untuk keperluan login,
// tapi tidak punya stage approval.
//
// WORKFLOW BARU:
//   Hot-work & Workshop INTERNAL:  spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Hot-work & Workshop EKSTERNAL: kontraktor(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)
//   Height-work INTERNAL:          spv(1) → admin_k3(2) → sfo(3) → mr_pga(4)
//   Height-work EKSTERNAL:         kontraktor(1) → spv(2) → admin_k3(3) → sfo(4) → mr_pga(5)

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET  = process.env.JWT_SECRET || 'jai-permit-secret-change-in-production';
const JWT_EXPIRES = '8h';

// ── Role Definitions ────────────────────────────────────────
export type UserRole =
  | 'worker'
  | 'firewatch'   // tetap ada untuk login, tapi tidak bisa approve
  | 'spv'
  | 'kontraktor'
  | 'admin_k3'
  | 'sfo'
  | 'pga'
  | 'admin';

// ROLE_ORDER: dipakai untuk perbandingan hierarki role (bukan stage approval).
// firewatch = 0, sama dengan worker — tidak punya hak approve.
export const ROLE_ORDER: Record<UserRole, number> = {
  worker:     0,
  firewatch:  0,  // tidak punya hak approve
  spv:        1,
  kontraktor: 2,
  admin_k3:   3,
  sfo:        4,
  pga:        5,
  admin:      99,
};

// ── Stage maps HOT-WORK & WORKSHOP ───────────────────────────
// Stage dimulai dari 1 (tidak ada stage 0 untuk firewatch lagi).
// Internal:  1=spv, 2=admin_k3, 3=sfo, 4=pga
// Eksternal: 1=kontraktor, 2=spv, 3=admin_k3, 4=sfo, 5=pga
export const STAGE_TO_ROLE_FW_INTERNAL: Record<number, UserRole> = {
  1: 'spv',
  2: 'admin_k3',
  3: 'sfo',
  4: 'pga',
};

export const STAGE_TO_ROLE_FW_EKSTERNAL: Record<number, UserRole> = {
  1: 'kontraktor',
  2: 'spv',
  3: 'admin_k3',
  4: 'sfo',
  5: 'pga',
};

// ── Stage maps HEIGHT-WORK ────────────────────────────────────
// Internal:  1=spv, 2=admin_k3, 3=sfo, 4=pga
// Eksternal: 1=kontraktor, 2=spv, 3=admin_k3, 4=sfo, 5=pga
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

// ── STAGE_TO_ROLE default (backward-compat, dipakai getStageToRoleMap) ───
// Alias ke FW_INTERNAL karena hot-work/workshop internal adalah default.
export const STAGE_TO_ROLE = STAGE_TO_ROLE_FW_INTERNAL;

// ── ROLE_TO_STAGE ─────────────────────────────────────────────
// Mapping role → stage default untuk hot-work/workshop internal.
// firewatch diberi -1 karena tidak punya stage approval.
// worker diberi -1 karena tidak punya hak approve.
export const ROLE_TO_STAGE: Record<UserRole, number> = {
  worker:     -1,
  firewatch:  -1,  // TIDAK punya stage approval
  spv:         1,
  kontraktor:  1,  // stage 1 di alur eksternal
  admin_k3:    2,
  sfo:         3,
  pga:         4,
  admin:       99,
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
    maxAge:   maxAge ?? 60 * 60 * 8, // 8 jam
  };
}

// ── Helper: dapatkan stage map yang sesuai ────────────────────
// Mengembalikan mapping stage → role berdasarkan jenis form dan tipe perusahaan.
export function getStageToRoleMap(
  formType: string,
  tipePerusahaan?: string
): Record<number, UserRole> {
  if (formType === 'height-work') {
    return tipePerusahaan === 'eksternal'
      ? STAGE_TO_ROLE_HW_EKSTERNAL
      : STAGE_TO_ROLE_HW_INTERNAL;
  }
  // hot-work & workshop
  return tipePerusahaan === 'eksternal'
    ? STAGE_TO_ROLE_FW_EKSTERNAL
    : STAGE_TO_ROLE_FW_INTERNAL;
}

// ── Helper: cek apakah role bisa approve di stage tertentu ───
// firewatch TIDAK PERNAH bisa approve — selalu return false kecuali admin.
export function canUserApproveAtStage(
  userRole: UserRole,
  currentStage: number,
  formType?: string,
  tipePerusahaan?: string
): boolean {
  if (userRole === 'admin') return true;

  // firewatch tidak punya hak approve sama sekali
  if (userRole === 'firewatch' || userRole === 'worker') return false;

  const stageMap   = getStageToRoleMap(formType || '', tipePerusahaan);
  const requiredRole = stageMap[currentStage];
  return userRole === requiredRole;
}

// ── Helper: stage config per form type ───────────────────────
// startStage selalu 1 (tidak ada stage 0 untuk firewatch).
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
  // hot-work & workshop
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

// ── Helper: apakah form membutuhkan Fire Watch ───────────────
// Fire Watch sekarang hanya sebagai informasi di form, bukan approver.
// Fungsi ini mengembalikan true untuk form yang MENAMPILKAN kolom fire watch,
// bukan untuk menentukan alur approval.
export function requiresFireWatch(formType: string): boolean {
  return formType === 'hot-work' || formType === 'workshop';
}

export function isHeightWorkEksternal(
  formType: string,
  tipePerusahaan?: string
): boolean {
  return formType === 'height-work' && tipePerusahaan === 'eksternal';
}