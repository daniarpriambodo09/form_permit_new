// middleware.ts  (letakkan di ROOT project, sejajar dengan app/)
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

// Route yang memerlukan login (approver/admin)
const PROTECTED_PREFIXES = [
  '/approval',
  '/history',
  '/dashboard',
];

// Route API yang memerlukan auth
const PROTECTED_API = [
  '/api/auth/me',
  '/api/approval',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cek apakah route perlu dilindungi
  const needsAuth =
    PROTECTED_PREFIXES.some(p => pathname.startsWith(p)) ||
    PROTECTED_API.some(p => pathname.startsWith(p));

  if (!needsAuth) return NextResponse.next();

  // Ambil token dari cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Jika tidak ada token → redirect ke login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname); // simpan halaman tujuan
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
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('expired', '1');
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(COOKIE_NAME);
      return res;
    }
    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/approval/:path*',
    '/history/:path*',
    '/dashboard/:path*',
    '/api/auth/me',
    '/api/approval/:path*',
  ],
};