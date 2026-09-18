// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get total forms from all tables (including external general-permit)
    const [hotWork, workshop, heightWork, generalPermit] = await Promise.all([
      query('SELECT COUNT(*) as count FROM form_kerja_panas'),
      query('SELECT COUNT(*) as count FROM form_kerja_workshop'),
      query('SELECT COUNT(*) as count FROM form_kerja_ketinggian'),
      query('SELECT COUNT(*) as count FROM form_ijin_kerja'),
    ]);

    const totalForms = 
      parseInt(hotWork[0]?.count || '0') + 
      parseInt(workshop[0]?.count || '0') + 
      parseInt(heightWork[0]?.count || '0') +
      parseInt(generalPermit[0]?.count || '0');

    // Get status distribution (combine all tables)
    const statusQuery = `
      SELECT status, COUNT(*) as count FROM (
        SELECT status FROM form_kerja_panas
        UNION ALL
        SELECT status FROM form_kerja_workshop
        UNION ALL
        SELECT status FROM form_kerja_ketinggian
        UNION ALL
        SELECT status FROM form_ijin_kerja
      ) as all_forms
      GROUP BY status
    `;
    const statusData = await query(statusQuery);

    // Get recent forms
    const recentQuery = `
      SELECT id_form, 'hot-work' as jenis_form, status, tanggal FROM form_kerja_panas
      UNION ALL
      SELECT id_form, 'workshop' as jenis_form, status, tanggal FROM form_kerja_workshop
      UNION ALL
      SELECT id_form, 'height-work' as jenis_form, status, tanggal FROM form_kerja_ketinggian
      UNION ALL
      SELECT id_form, 'general-permit' as jenis_form, status, tanggal FROM form_ijin_kerja
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
      draft: statusData.find((s: any) => s.status === 'draft')?.count || 0,
      submitted: statusData.find((s: any) => s.status === 'submitted')?.count || 0,
      approved: statusData.find((s: any) => s.status === 'approved')?.count || 0,
      rejected: statusData.find((s: any) => s.status === 'rejected')?.count || 0,
      pending: statusData.find((s: any) => s.status === 'submitted')?.count || 0,
      recentForms,
    };

    return NextResponse.json(stats);
  } catch (err: any) {
    console.error('[GET /api/dashboard/stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}