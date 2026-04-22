// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

// Route yang memerlukan login approver/admin
const APPROVER_ROUTES = [
  '/approval',
  '/history',
  '/dashboard',
];

// Route yang memerlukan login worker
const WORKER_ROUTES = [
  '/my-forms',
  '/form',
];

// Route untuk home (admin & worker)
const HOME_ROUTES = [
  '/home',
];

// Route API
const PROTECTED_API = [
  '/api/auth/me',
  '/api/approval',
  '/api/my-forms',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApproverRoute = APPROVER_ROUTES.some(p => pathname.startsWith(p));
  const isWorkerRoute   = WORKER_ROUTES.some(p => pathname.startsWith(p));
  const isHomeRoute     = HOME_ROUTES.some(p => pathname.startsWith(p));
  const isProtectedApi  = PROTECTED_API.some(p => pathname.startsWith(p));

  const needsAuth = isApproverRoute || isWorkerRoute || isHomeRoute || isProtectedApi;

  if (!needsAuth) return NextResponse.next();

  // Ambil token dari cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Jika tidak ada token → redirect ke login yang sesuai
  if (!token) {
    const loginPath = isApproverRoute || isHomeRoute ? '/login/approver' : '/login/worker';
    const loginUrl  = new URL(loginPath, req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verifikasi token (decode tanpa import jwt supaya edge-compatible)
  try {
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    // Cek expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      const loginPath = isApproverRoute || isHomeRoute ? '/login/approver' : '/login/worker';
      const loginUrl  = new URL(loginPath, req.url);
      loginUrl.searchParams.set('expired', '1');
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    const userRole = payload.role as string;

    // Jika home route, hanya admin yang boleh
    if (isHomeRoute) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/my-forms', req.url));
      }
    }

    // Jika approver route — ✅ tambahkan 'firewatch'
    if (isApproverRoute) {
      const allowedRoles = ['spv', 'admin', 'sfo', 'kontraktor', 'pga', 'firewatch'];

      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL('/my-forms', req.url));
      }
    }

    // Jika worker route, hanya worker yang boleh
    if (isWorkerRoute) {
      if (userRole !== 'worker') {
        return NextResponse.redirect(new URL('/approval', req.url));
      }
    }

    return NextResponse.next();
  } catch {
    const loginPath = isApproverRoute || isHomeRoute ? '/login/approver' : '/login/worker';
    const loginUrl  = new URL(loginPath, req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/approval/:path*',
    '/history/:path*',
    '/dashboard/:path*',
    '/home/:path*',
    '/my-forms/:path*',
    '/form/:path*',
    '/api/auth/me',
    '/api/approval/:path*',
    '/api/my-forms/:path*',
  ],
};