// app/api/admin-k3-routing/route.ts
// GET  → daftar user role=admin_k3 + mapping routing saat ini (admin only)
// PUT  → update satu mapping jenis_form → user_id (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getAllRouting, setRouting, JenisFormK3 } from '@/lib/admin-k3-routing';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const adminK3Users = await query<{ id: number; nama: string; email: string | null }>(
      `SELECT id, nama, email FROM users
       WHERE role = 'admin_k3' AND is_active = TRUE
       ORDER BY nama ASC`
    );
    const routing = await getAllRouting();

    return NextResponse.json({ admin_k3_users: adminK3Users, routing });
  } catch (err: any) {
    console.error('[GET /api/admin-k3-routing]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = getUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const jenisForm = body.jenis_form as JenisFormK3;
    const userId = Number(body.user_id);

    const validJenis: JenisFormK3[] = ['hot-work', 'height-work', 'workshop'];
    if (!validJenis.includes(jenisForm)) {
      return NextResponse.json({ error: 'Jenis form tidak valid' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'user_id wajib diisi' }, { status: 400 });
    }

    // Pastikan target user memang admin_k3 aktif
    const target = await query<{ id: number; role: string }>(
      `SELECT id, role FROM users WHERE id = $1 AND is_active = TRUE`,
      [userId]
    );
    if (target.length === 0 || target[0].role !== 'admin_k3') {
      return NextResponse.json(
        { error: 'User yang dipilih bukan Admin K3 aktif' },
        { status: 400 }
      );
    }

    await setRouting(jenisForm, userId, user.userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PUT /api/admin-k3-routing]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}