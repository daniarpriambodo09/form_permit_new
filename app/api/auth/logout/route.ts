// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

function handleLogout() {
  const res = NextResponse.json({ success: true });

  // Hapus cookie di path '/' (tempat cookie diset saat login)
  res.cookies.set(COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
  });

  // Hapus juga di path '/form-permit' via append Set-Cookie header
  // agar tidak menimpa cookie map Next.js untuk path '/'
  res.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/form-permit; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
  );

  return res;
}

export async function POST() {
  return handleLogout();
}

export async function GET() {
  return handleLogout();
}