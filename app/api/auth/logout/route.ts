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

  return res;
}

export async function POST() {
  return handleLogout();
}

export async function GET() {
  return handleLogout();
}