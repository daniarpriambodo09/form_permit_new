// app/api/auth/check-username/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username parameter required' }, { status: 400 });
    }

    // Validasi format username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ available: false, error: 'Format username tidak valid' }, { status: 200 });
    }

    // Cek apakah username sudah ada
    const existing = await queryOne(
      `SELECT id FROM users WHERE username = $1`,
      [username.toLowerCase().trim()]
    );

    return NextResponse.json({
      available: !existing,
    }, { status: 200 });
  } catch (err: any) {
    console.error('[GET /api/auth/check-username]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
