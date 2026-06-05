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

export function middleware(req: NextRequest) {
  const allowedApproverRoles = ['spv', 'admin', 'kontraktor', 'sfo', 'pga', 'firewatch', 'admin_k3'];
  const { pathname } = req.nextUrl;

  // FIX: Skip middleware untuk _next/static, _next/image, favicon, dll.
  // Ini penting agar asset loading tidak ikut di-intercept
  if (
    pathname.startsWith(`${BASE}/_next/`) ||
    pathname.startsWith('/_next/') ||
    pathname.includes('/favicon') ||
    pathname.includes('/__nextjs')
  ) {
    return NextResponse.next();
  }

  // 🔓 Skip public routes (exact match prefix)
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // FIX: Baca cookie — pastikan nama cookie sama persis dengan yang diset di route.ts
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // ❌ Belum login — redirect ke halaman login worker
  if (!token) {
    const loginUrl = new URL(`${BASE}/login/worker`, req.url);
    // FIX: Simpan tujuan asal di query param 'from' agar setelah login
    // bisa redirect kembali ke halaman yang dituju
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // FIX: Parse JWT payload dengan aman
    // Split harus menghasilkan tepat 3 bagian (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [, payloadB64] = parts;

    // FIX: Padding base64url yang benar sebelum decode
    // Base64url tidak punya padding, Buffer.from bisa handle ini tapi
    // kita tambahkan padding manual untuk keamanan
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
      // FIX: Delete cookie dengan path yang sama persis seperti saat diset
      res.cookies.delete({
        name: COOKIE_NAME,
        path: '/form-permit',
      });
      return res;
    }

    const role = payload.role as string;

    // 🔐 Worker mencoba akses halaman approver
    if (
      APPROVER_ROUTES.some(r => pathname.startsWith(r)) &&
      !allowedApproverRoles.includes(role)
    ) {
      return NextResponse.redirect(
        new URL(`${BASE}/my-forms`, req.url)
      );
    }

    // 🔐 Approver mencoba akses halaman worker
    if (
      WORKER_ROUTES.some(r => pathname.startsWith(r)) &&
      role !== 'worker'
    ) {
      return NextResponse.redirect(
        new URL(`${BASE}/approval`, req.url)
      );
    }

    // ✅ Lolos semua check — lanjutkan request
    return NextResponse.next();

  } catch (err) {
    console.error('[Middleware] Token parse error:', err);

    // Token corrupt/invalid — hapus dan redirect ke login
    const loginUrl = new URL(`${BASE}/login/worker`, req.url);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete({
      name: COOKIE_NAME,
      path: '/form-permit',
    });
    return res;
  }
}

export const config = {
  matcher: [
    // FIX: Matcher ini menangkap semua sub-path /form-permit/*
    // KECUALI file statis Next.js (_next/static, _next/image)
    // yang ditangani di awal fungsi middleware di atas.
    '/form-permit/:path*',
  ],
};