const fs = require('fs');

function replaceExact(file, target, replacement) {
  let c = fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n');
  const t = target.replace(/\r\n/g, '\n');
  const r = replacement.replace(/\r\n/g, '\n');
  if (!c.includes(t)) {
    throw new Error(`Target not found in ${file}`);
  }
  c = c.replace(t, r);
  fs.writeFileSync(file, c.replace(/\n/g, '\r\n'), 'utf-8');
  console.log(`[OK] Replaced in ${file}`);
}

// 1. HOT-WORK
{
  const target1 = `      const existing = await queryOne(
        \`SELECT id_form FROM form_kerja_panas WHERE id_ijin_kerja = $1\`,
        [idIjinKerja]
      );
      if (existing) {
        return NextResponse.json(
          { error: \`Ijin Kerja Panas untuk \${idIjinKerja} sudah pernah dibuat (\${existing.id_form}). Maksimal 1 form per jenis kerja.\` },
          { status: 409 }
        );
      }`;

  const replacement1 = `      // Multiple forms per jenis kerja diperbolehkan`;

  const target2 = `      const parentForm = await queryOne<{
        spv_approved: boolean;
        spv_approved_by: string | null;
        spv_approved_at: string | null;
        spv_nik: string | null;
        spv_terkait_pj: string | null;
        nik_spv_terkait_pj: string | null;
        sfo_approved: boolean;
        sfo_approved_by: string | null;
        sfo_approved_at: string | null;
        sfo_nik: string | null;
        pga_approved: boolean;
        pga_approved_by: string | null;
        pga_approved_at: string | null;
        pga_nik: string | null;
      }>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`;

  const replacement2 = `      const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`;

  const target3 = `        if (parentForm.sfo_approved) {`;
  const replacement3 = `        if (parentForm.admin_k3_approved) {
          await query(
            \`UPDATE form_kerja_panas
                SET admin_k3_approved = TRUE,
                    admin_k3_approved_by = $1,
                    admin_k3_approved_at = $2,
                    admin_k3_nik = $3
              WHERE id_form = $4\`,
            [parentForm.admin_k3_approved_by, parentForm.admin_k3_approved_at || now, parentForm.admin_k3_nik, idForm]
          );
        }

        if (parentForm.status === 'approved') {
          await query(
            \`UPDATE form_kerja_panas
                SET status = 'approved',
                    approved_by = COALESCE($1, 'System Cascade'),
                    approved_at = $2
              WHERE id_form = $3\`,
            [parentForm.approved_by, parentForm.approved_at || now, idForm]
          );
        }

        if (parentForm.sfo_approved) {`;

  replaceExact('app/api/forms/hot-work/route.ts', target1, replacement1);
  replaceExact('app/api/forms/hot-work/route.ts', target2, replacement2);
  replaceExact('app/api/forms/hot-work/route.ts', target3, replacement3);
}

// 2. HEIGHT-WORK
{
  const target1 = `      const existing = await queryOne(
        \`SELECT id_form FROM form_kerja_ketinggian WHERE id_ijin_kerja = $1\`,
        [idIjinKerja]
      );
      if (existing) {
        return NextResponse.json(
          { error: \`Ijin Kerja Ketinggian untuk \${idIjinKerja} sudah pernah dibuat (\${existing.id_form}). Maksimal 1 form per jenis kerja.\` },
          { status: 409 }
        );
      }`;

  const replacement1 = `      // Multiple forms per jenis kerja diperbolehkan`;

  const target2 = `      const parentForm = await queryOne<{
        spv_approved: boolean;
        spv_approved_by: string | null;
        spv_approved_at: string | null;
        spv_nik: string | null;
        spv_terkait_pj: string | null;
        nik_spv_terkait_pj: string | null;
        sfo_approved: boolean;
        sfo_approved_by: string | null;
        sfo_approved_at: string | null;
        sfo_nik: string | null;
        pga_approved: boolean;
        pga_approved_by: string | null;
        pga_approved_at: string | null;
        pga_nik: string | null;
      }>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`;

  const replacement2 = `      const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`;

  const target3 = `        if (parentForm.sfo_approved) {`;
  const replacement3 = `        if (parentForm.admin_k3_approved) {
          await query(
            \`UPDATE form_kerja_ketinggian
                SET admin_k3_approved = TRUE,
                    admin_k3_approved_by = $1,
                    admin_k3_approved_at = $2,
                    admin_k3_nik = $3
              WHERE id_form = $4\`,
            [parentForm.admin_k3_approved_by, parentForm.admin_k3_approved_at || now, parentForm.admin_k3_nik, idForm]
          );
        }

        if (parentForm.status === 'approved') {
          await query(
            \`UPDATE form_kerja_ketinggian
                SET status = 'approved',
                    approved_by = COALESCE($1, 'System Cascade'),
                    approved_at = $2
              WHERE id_form = $3\`,
            [parentForm.approved_by, parentForm.approved_at || now, idForm]
          );
        }

        if (parentForm.sfo_approved) {`;

  replaceExact('app/api/forms/height-work/route.ts', target1, replacement1);
  replaceExact('app/api/forms/height-work/route.ts', target2, replacement2);
  replaceExact('app/api/forms/height-work/route.ts', target3, replacement3);
}

// 3. WORKSHOP
{
  const target1 = `      const existing = await queryOne(
        \`SELECT id_form FROM form_kerja_workshop WHERE id_ijin_kerja = $1\`,
        [idIjinKerja]
      );
      if (existing) {
        return NextResponse.json(
          { error: \`Ijin Kerja Workshop untuk \${idIjinKerja} sudah pernah dibuat (\${existing.id_form}). Maksimal 1 form per jenis kerja.\` },
          { status: 409 }
        );
      }`;

  const replacement1 = `      // Multiple forms per jenis kerja diperbolehkan`;

  const target2 = `      const parentForm = await queryOne<{
        spv_approved: boolean;
        spv_approved_by: string | null;
        spv_approved_at: string | null;
        spv_nik: string | null;
        spv_terkait_pj: string | null;
        nik_spv_terkait_pj: string | null;
        sfo_approved: boolean;
        sfo_approved_by: string | null;
        sfo_approved_at: string | null;
        sfo_nik: string | null;
        pga_approved: boolean;
        pga_approved_by: string | null;
        pga_approved_at: string | null;
        pga_nik: string | null;
      }>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`;

  const replacement2 = `      const parentForm = await queryOne<any>(
        \`SELECT spv_approved, spv_approved_by, spv_approved_at, spv_nik,
                spv_terkait_pj, nik_spv_terkait_pj,
                admin_k3_approved, admin_k3_approved_by, admin_k3_approved_at, admin_k3_nik,
                sfo_approved, sfo_approved_by, sfo_approved_at, sfo_nik,
                pga_approved, pga_approved_by, pga_approved_at, pga_nik,
                status, approved_by, approved_at
           FROM form_ijin_kerja
          WHERE id_form = $1\`,
        [idIjinKerja]
      );`;

  const target3 = `        if (parentForm.sfo_approved) {`;
  const replacement3 = `        if (parentForm.admin_k3_approved) {
          await query(
            \`UPDATE form_kerja_workshop
                SET admin_k3_approved = TRUE,
                    admin_k3_approved_by = $1,
                    admin_k3_approved_at = $2,
                    admin_k3_nik = $3
              WHERE id_form = $4\`,
            [parentForm.admin_k3_approved_by, parentForm.admin_k3_approved_at || now, parentForm.admin_k3_nik, idForm]
          );
        }

        if (parentForm.status === 'approved') {
          await query(
            \`UPDATE form_kerja_workshop
                SET status = 'approved',
                    approved_by = COALESCE($1, 'System Cascade'),
                    approved_at = $2
              WHERE id_form = $3\`,
            [parentForm.approved_by, parentForm.approved_at || now, idForm]
          );
        }

        if (parentForm.sfo_approved) {`;

  replaceExact('app/api/forms/workshop/route.ts', target1, replacement1);
  replaceExact('app/api/forms/workshop/route.ts', target2, replacement2);
  replaceExact('app/api/forms/workshop/route.ts', target3, replacement3);
}

console.log('Finished surgical replacements!');

