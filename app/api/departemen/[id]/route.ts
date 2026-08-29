// app/api/departemen/[id]/route.ts
// PUT & DELETE untuk satu departemen — HANYA role admin.
//
// CATATAN PENTING soal DELETE:
// Sebelum benar-benar menghapus baris, kita cek dulu apakah nama
// departemen itu masih dipakai di tabel lain (form_kerja_ketinggian,
// users, master_lisence). Kalau masih dipakai, hapus DITOLAK supaya
// data histori tidak jadi rusak/yatim — user diarahkan untuk
// menonaktifkan (is_active = false) saja lewat PUT.
//
// ⚠️ Sesuaikan nama tabel/kolom di bagian cek pemakaian (usedInForm,
// usedInUsers, usedInLisence) dengan skema database project Anda yang
// sebenarnya jika berbeda dari asumsi di sini:
//   - form_kerja_ketinggian.nama_departemen  (sudah sesuai route.ts height-work)
//   - users.departmen                        (dipakai di admin-users)
//   - master_lisence.departemen              (dipakai di master-lisence)
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// ── PUT: update nama / keterangan / status aktif ───────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa mengubah departemen' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const namaDepartemen: string = (body.namaDepartemen || '').trim().toUpperCase();
    const keterangan: string | null = body.keterangan?.trim() || null;
    const isActive: boolean = body.isActive !== undefined ? !!body.isActive : true;

    if (!namaDepartemen) {
      return NextResponse.json({ error: 'Nama departemen wajib diisi' }, { status: 400 });
    }

    const existing = await queryOne(`SELECT id FROM departemen WHERE id = $1`, [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Departemen tidak ditemukan' }, { status: 404 });
    }

    const duplicate = await queryOne(
      `SELECT id FROM departemen WHERE UPPER(nama_departemen) = $1 AND id != $2`,
      [namaDepartemen, id]
    );
    if (duplicate) {
      return NextResponse.json(
        { error: 'Departemen dengan nama ini sudah terdaftar' },
        { status: 409 }
      );
    }

    const updated = await queryOne(
      `UPDATE departemen
       SET nama_departemen = $1, keterangan = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, nama_departemen, keterangan, is_active, created_at, updated_at`,
      [namaDepartemen, keterangan, isActive, id]
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[PUT /api/departemen/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: hapus departemen (ditolak jika masih dipakai) ──────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa menghapus departemen' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await queryOne(
      `SELECT id, nama_departemen FROM departemen WHERE id = $1`,
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Departemen tidak ditemukan' }, { status: 404 });
    }

    const namaDept = existing.nama_departemen;

    // Cek pemakaian di tabel-tabel lain sebelum menghapus.
    // Sesuaikan nama tabel/kolom bila skema Anda berbeda (lihat catatan di atas).
    const [usedInForm, usedInUsers, usedInLisence] = await Promise.all([
      queryOne(
        `SELECT id_form FROM form_kerja_ketinggian WHERE nama_departemen = $1 LIMIT 1`,
        [namaDept]
      ).catch(() => null),
      queryOne(`SELECT id FROM users WHERE departmen = $1 LIMIT 1`, [namaDept]).catch(
        () => null
      ),
      queryOne(
        `SELECT id FROM master_lisence WHERE departemen = $1 LIMIT 1`,
        [namaDept]
      ).catch(() => null),
    ]);

    if (usedInForm || usedInUsers || usedInLisence) {
      const dipakaiDi = usedInForm
        ? 'Form Izin Kerja Ketinggian'
        : usedInUsers
        ? 'data akun user'
        : 'Master Lisence';
      return NextResponse.json(
        {
          error: `Departemen "${namaDept}" tidak bisa dihapus karena masih dipakai di ${dipakaiDi}. Nonaktifkan saja jika ingin menyembunyikannya dari pilihan form baru.`,
        },
        { status: 409 }
      );
    }

    await query(`DELETE FROM departemen WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Departemen berhasil dihapus',
      id,
    });
  } catch (err: any) {
    console.error('[DELETE /api/departemen/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}