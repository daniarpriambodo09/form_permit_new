// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

const BASE = '/form-permit';
const JWT_SECRET = process.env.JWT_SECRET || 'jai-permit-secret-change-in-production';

// 🔓 Route yang boleh diakses tanpa login
const PUBLIC_ROUTES = [
  `${BASE}/login`,
  `${BASE}/login/worker`,
  `${BASE}/login/approver`,
  `${BASE}/api/auth/login`,
  `${BASE}/api/auth/logout`,
];

// 🔐 Route khusus worker
const WORKER_ROUTES = [
  `${BASE}/my-forms`,
  `${BASE}/form`,
];

// 🔐 Route khusus approver
const APPROVER_ROUTES = [
  `${BASE}/approval`,
];

// 🔐 Route khusus admin
const ADMIN_ONLY_ROUTES = [
  `${BASE}/smtp-settings`,
  `${BASE}/api/smtp-settings`,
];

// Helper untuk membersihkan cookie secara konsisten di semua path
function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
  });
  res.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=${BASE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
  );
}

// Verifikasi kriptografis JWT signature menggunakan Web Crypto API (cepat & kompatibel Edge/Node)
async function verifyJwt(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const sigStr = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const paddedSig = sigStr.padEnd(sigStr.length + (4 - (sigStr.length % 4)) % 4, '=');
    const sigBytes = Uint8Array.from(atob(paddedSig), (c) => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!isValid) return null;

    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payloadStr.padEnd(payloadStr.length + (4 - (payloadStr.length % 4)) % 4, '=');
    const payload = JSON.parse(atob(paddedPayload));
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const allowedApproverRoles = [
    'spv',
    'admin',
    'kontraktor',
    'sfo',
    'smr',
    'pga',
    'firewatch',
    'admin_k3',
    'security',
  ];
  const { pathname } = req.nextUrl;

  // Skip middleware untuk asset static & internal Next.js
  if (
    pathname.startsWith(`${BASE}/_next/`) ||
    pathname.startsWith('/_next/') ||
    pathname.includes('/favicon') ||
    pathname.includes('/__nextjs') ||
    pathname.startsWith(`${BASE}/images/`) ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // 🔓 Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 🔐 Baca cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // ❌ Belum login
  if (!token) {
    const loginUrl = new URL(`${BASE}/login/worker`, req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifyJwt(token);

    // Signature tidak valid atau token rusak
    if (!payload) {
      console.warn('[Middleware] Invalid JWT signature or corrupted token');
      const loginUrl = new URL(`${BASE}/login/worker`, req.url);
      const res = NextResponse.redirect(loginUrl);
      clearAuthCookie(res);
      return res;
    }

    // ⛔ Token expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      const loginUrl = new URL(`${BASE}/login/worker`, req.url);
      loginUrl.searchParams.set('expired', '1');
      const res = NextResponse.redirect(loginUrl);
      clearAuthCookie(res);
      return res;
    }

    const role = payload.role as string;

    // 🔐 Route khusus admin — tolak non-admin
    if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'admin') {
      return NextResponse.redirect(new URL(`${BASE}/home`, req.url));
    }

    // 🔐 Worker mencoba akses halaman approver
    if (APPROVER_ROUTES.some((r) => pathname.startsWith(r)) && !allowedApproverRoles.includes(role)) {
      return NextResponse.redirect(new URL(`${BASE}/my-forms`, req.url));
    }

    // 🔐 Approver mencoba akses halaman worker
    if (WORKER_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'worker') {
      return NextResponse.redirect(new URL(`${BASE}/approval`, req.url));
    }

    // ✅ Lolos semua check
    return NextResponse.next();
  } catch (err) {
    console.error('[Middleware] Token error:', err);
    const loginUrl = new URL(`${BASE}/login/worker`, req.url);
    const res = NextResponse.redirect(loginUrl);
    clearAuthCookie(res);
    return res;
  }
}

export const config = {
  matcher: ['/form-permit/:path*'],
};