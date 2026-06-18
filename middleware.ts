// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

// FIX: BASE harus konsisten dengan basePath di next.config.ts
const BASE = '/form-permit';

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

export function middleware(req: NextRequest) {
  const allowedApproverRoles = ['spv', 'admin', 'kontraktor', 'sfo', 'pga', 'firewatch', 'admin_k3'];
  const { pathname } = req.nextUrl;

  // FIX: Skip middleware untuk _next/static, _next/image, favicon, dll.
  if (
    pathname.startsWith(`${BASE}/_next/`) ||
    pathname.startsWith('/_next/') ||
    pathname.includes('/favicon') ||
    pathname.includes('/__nextjs')
  ) {
    return NextResponse.next();
  }

  // 🔓 Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // FIX: Baca cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // ❌ Belum login
  if (!token) {
    const loginUrl = new URL(`${BASE}/login/worker`, req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [, payloadB64] = parts;
    const padded = payloadB64.padEnd(
      payloadB64.length + (4 - (payloadB64.length % 4)) % 4,
      '='
    );
    const payload = JSON.parse(
      Buffer.from(padded, 'base64').toString('utf8')
    );

    // ⛔ Token expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      const loginUrl = new URL(`${BASE}/login/worker`, req.url);
      loginUrl.searchParams.set('expired', '1');
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete({ name: COOKIE_NAME, path: '/form-permit' });
      return res;
    }

    const role = payload.role as string;

    // 🔐 Route khusus admin — tolak non-admin
    if (
      ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r)) &&
      role !== 'admin'
    ) {
      // Redirect ke home, bukan 403 page, agar UX halus
      return NextResponse.redirect(new URL(`${BASE}/home`, req.url));
    }

    // 🔐 Worker mencoba akses halaman approver
    if (
      APPROVER_ROUTES.some(r => pathname.startsWith(r)) &&
      !allowedApproverRoles.includes(role)
    ) {
      return NextResponse.redirect(new URL(`${BASE}/my-forms`, req.url));
    }

    // 🔐 Approver mencoba akses halaman worker
    if (
      WORKER_ROUTES.some(r => pathname.startsWith(r)) &&
      role !== 'worker'
    ) {
      return NextResponse.redirect(new URL(`${BASE}/approval`, req.url));
    }

    // ✅ Lolos semua check
    return NextResponse.next();

  } catch (err) {
    console.error('[Middleware] Token parse error:', err);
    const loginUrl = new URL(`${BASE}/login/worker`, req.url);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete({ name: COOKIE_NAME, path: '/form-permit' });
    return res;
  }
}

export const config = {
  matcher: ['/form-permit/:path*'],
};