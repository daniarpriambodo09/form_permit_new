import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, verifyToken, COOKIE_NAME } from '@/lib/auth';
import { encryptPassword } from '@/lib/crypto';

const APPROVER_ROLES = [
  'spv', 'kontraktor', 'admin_k3', 'sfo', 'smr', 'security', 'admin', 'worker',
] as const;

const JABATAN_LABEL: Record<string, string> = {
  spv:        'Supervisor',
  kontraktor: 'Kontraktor',
  admin_k3:   'Admin K3',
  sfo:        'SFO',
  smr:        'SMR',
  security:   'Security',
  admin:      'Administrator',
  worker:     'Worker',
};

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Akses ditolak. Login sebagai admin terlebih dahulu.' },
      { status: 403 }
    );
  }

  const payload = verifyToken(token);

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { error: 'Akses ditolak. Hanya admin yang dapat menghapus akun.' },
      { status: 403 }
    );
  }

  const targetId = Number(id);

  if (isNaN(targetId) || targetId <= 0) {
    return NextResponse.json(
      { error: 'ID tidak valid.' },
      { status: 400 }
    );
  }

  if (targetId === payload.userId) {
    return NextResponse.json(
      { error: 'Tidak dapat menghapus akun Anda sendiri.' },
      { status: 400 }
    );
  }

  const user = await queryOne(
    `SELECT id, nama, username, role
     FROM users
     WHERE id = $1`,
    [targetId]
  );

  if (!user) {
    return NextResponse.json(
      { error: 'Akun tidak ditemukan.' },
      { status: 404 }
    );
  }

  await query(
    `DELETE FROM users WHERE id = $1`,
    [targetId]
  );

  return NextResponse.json({
    message: `Akun "${user.nama}" (${user.username}) berhasil dihapus.`,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
      { status: 403 }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Token tidak valid.' },
      { status: 403 }
    );
  }

  const callerRole = payload.role;
  const callerUserId = payload.userId;

  if (callerRole !== 'admin' && callerRole !== 'spv') {
    return NextResponse.json(
      { error: 'Akses ditolak. Hanya admin atau SPV yang dapat mengubah data akun.' },
      { status: 403 }
    );
  }

  const targetId = Number(id);
  if (isNaN(targetId) || targetId <= 0) {
    return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 });
  }

  const targetUser = await queryOne<{
    id: number;
    nama: string;
    username: string;
    role: string;
    departmen: string | null;
    email: string | null;
  }>(
    `SELECT id, nama, username, role, departmen, email FROM users WHERE id = $1`,
    [targetId]
  );

  if (!targetUser) {
    return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
  }

  // Jika SPV: hanya boleh edit worker di departemennya sendiri
  if (callerRole === 'spv') {
    if (targetUser.role !== 'worker') {
      return NextResponse.json(
        { error: 'Akses ditolak. SPV hanya dapat mengedit Administrator Departemen.' },
        { status: 403 }
      );
    }
    const spvRow = await queryOne<{ departmen: string | null }>(
      `SELECT departmen FROM users WHERE id = $1`,
      [callerUserId]
    );
    if (!spvRow?.departmen || spvRow.departmen !== targetUser.departmen) {
      return NextResponse.json(
        { error: 'Akses ditolak. Akun bukan milik departemen Anda.' },
        { status: 403 }
      );
    }
  }

  try {
    const body = await req.json();
    const {
      nama,
      username,
      nik,
      departmen,
      perusahaan,
      email,
      no_telp,
      role,
      is_active,
      password,
    } = body;

    // ── Validasi Nama ──
    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }

    // ── Validasi Username jika diubah ──
    let finalUsername = targetUser.username;
    if (username && username.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
      const uVal = username.trim().toLowerCase();
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(uVal)) {
        return NextResponse.json(
          { error: 'Username harus 3-20 karakter, hanya huruf, angka, dan underscore' },
          { status: 400 }
        );
      }
      const existing = await queryOne<{ id: number }>(
        `SELECT id FROM users WHERE username = $1 AND id != $2`,
        [uVal, targetId]
      );
      if (existing) {
        return NextResponse.json({ error: 'Username sudah digunakan oleh akun lain' }, { status: 409 });
      }
      finalUsername = uVal;
    }

    // ── Validasi Email jika diubah ──
    let finalEmail = targetUser.email;
    if (email !== undefined) {
      const eVal = (email || '').trim().toLowerCase();
      if (!eVal) {
        return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(eVal)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
      }
      // Catatan: Duplikat email diperbolehkan (satu email dapat digunakan untuk beberapa akun)
      finalEmail = eVal;
    }

    // ── Validasi NIK ──
    let finalNik = body.nik !== undefined ? (body.nik ? String(body.nik).trim() : null) : null;
    if (finalNik) {
      const nikRegex = /^[0-9]{4,20}$/;
      if (!nikRegex.test(finalNik)) {
        return NextResponse.json({ error: 'Format NIK tidak valid (4-20 digit angka)' }, { status: 400 });
      }
    }

    // ── Validasi Role & Departemen ──
    let finalRole = targetUser.role;
    let finalJabatan = JABATAN_LABEL[targetUser.role] || targetUser.role;
    if (callerRole === 'admin' && role && role !== targetUser.role) {
      if (!(APPROVER_ROLES as readonly string[]).includes(role)) {
        return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
      }
      finalRole = role;
      finalJabatan = JABATAN_LABEL[role] || role;
    }

    let finalDepartmen = targetUser.departmen;
    if (callerRole === 'admin' && departmen !== undefined) {
      finalDepartmen = departmen ? String(departmen).trim() : null;
      if (finalRole === 'spv' && !finalDepartmen) {
        return NextResponse.json({ error: 'Departemen wajib dipilih untuk SPV' }, { status: 400 });
      }
    }

    // ── Password jika ingin diubah ──
    let passwordClause = '';
    const updateParams: any[] = [
      nama.trim(),
      finalUsername,
      finalNik,
      finalEmail,
      no_telp ? String(no_telp).trim() : null,
      perusahaan ? String(perusahaan).trim() : null,
      finalDepartmen,
      finalRole,
      finalJabatan,
      is_active !== undefined ? Boolean(is_active) : true,
    ];

    if (password && String(password).trim().length > 0) {
      const pStr = String(password).trim();
      if (pStr.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      }
      const hashedPassword = await hashPassword(pStr);
      const encryptedPassword = encryptPassword(pStr);
      updateParams.push(hashedPassword, encryptedPassword);
      passwordClause = `, password = $${updateParams.length - 1}, password_encrypted = $${updateParams.length}`;
    }

    updateParams.push(targetId);
    const idParamIndex = updateParams.length;

    await query(
      `UPDATE users
       SET nama = $1,
           username = $2,
           nik = $3,
           email = $4,
           no_telp = $5,
           perusahaan = $6,
           departmen = $7,
           role = $8,
           jabatan = $9,
           is_active = $10
           ${passwordClause}
       WHERE id = $${idParamIndex}`,
      updateParams
    );

    return NextResponse.json({
      success: true,
      message: `Data akun "${nama.trim()}" berhasil diperbarui.`,
    });
  } catch (err: unknown) {
    console.error('[PATCH /api/admin-users/[id]]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server saat memperbarui akun.' }, { status: 500 });
  }
}