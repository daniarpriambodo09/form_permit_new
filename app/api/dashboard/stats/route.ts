// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Ambil total form yang bukan draft dan bukan sub-permit terkait (id_ijin_kerja)
    // agar sinkron dengan daftar form utama di /approval
    const [hotWork, workshop, heightWork, generalPermit] = await Promise.all([
      query("SELECT COUNT(*) as count FROM form_kerja_panas WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'"),
      query("SELECT COUNT(*) as count FROM form_kerja_workshop WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'"),
      query("SELECT COUNT(*) as count FROM form_kerja_ketinggian WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'"),
      query("SELECT COUNT(*) as count FROM form_ijin_kerja WHERE status != 'draft'"),
    ]);

    const totalForms = 
      parseInt(hotWork[0]?.count || '0') + 
      parseInt(workshop[0]?.count || '0') + 
      parseInt(heightWork[0]?.count || '0') + 
      parseInt(generalPermit[0]?.count || '0');

    // Distribusi status (hanya form mandiri / non-draft)
    const statusQuery = `
      SELECT status, COUNT(*) as count FROM (
        SELECT status FROM form_kerja_panas WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'
        UNION ALL
        SELECT status FROM form_kerja_workshop WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'
        UNION ALL
        SELECT status FROM form_kerja_ketinggian WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'
        UNION ALL
        SELECT status FROM form_ijin_kerja WHERE status != 'draft'
      ) as all_forms
      GROUP BY status
    `;
    const statusData = await query(statusQuery);

    // Form terbaru (hanya form mandiri / non-draft)
    const recentQuery = `
      SELECT id_form, 'hot-work' as jenis_form, status, tanggal FROM form_kerja_panas WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'
      UNION ALL
      SELECT id_form, 'workshop' as jenis_form, status, tanggal FROM form_kerja_workshop WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'
      UNION ALL
      SELECT id_form, 'height-work' as jenis_form, status, tanggal FROM form_kerja_ketinggian WHERE (id_ijin_kerja IS NULL OR TRIM(id_ijin_kerja) = '') AND status != 'draft'
      UNION ALL
      SELECT id_form, 'general-permit' as jenis_form, status, tanggal FROM form_ijin_kerja WHERE status != 'draft'
      ORDER BY tanggal DESC
      LIMIT 10
    `;
    const recentForms = await query(recentQuery);

    const stats = {
      totalForms,
      byType: {
        hotWork: parseInt(hotWork[0]?.count || '0'),
        workshop: parseInt(workshop[0]?.count || '0'),
        heightWork: parseInt(heightWork[0]?.count || '0'),
        generalPermit: parseInt(generalPermit[0]?.count || '0'),
      },
      draft: 0,
      submitted: parseInt(statusData.find((s: any) => s.status === 'submitted')?.count || '0'),
      approved: parseInt(statusData.find((s: any) => s.status === 'approved')?.count || '0'),
      rejected: parseInt(statusData.find((s: any) => s.status === 'rejected')?.count || '0'),
      pending: parseInt(statusData.find((s: any) => s.status === 'submitted')?.count || '0'),
      recentForms,
    };

    return NextResponse.json(stats);
  } catch (err: any) {
    console.error('[GET /api/dashboard/stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
