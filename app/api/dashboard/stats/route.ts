// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get total forms from all tables
    const [hotWork, workshop, heightWork] = await Promise.all([
      query('SELECT COUNT(*) as count FROM form_kerja_panas'),
      query('SELECT COUNT(*) as count FROM form_kerja_workshop'),
      query('SELECT COUNT(*) as count FROM form_kerja_ketinggian'),
    ]);

    const totalForms = 
      parseInt(hotWork[0].count) + 
      parseInt(workshop[0].count) + 
      parseInt(heightWork[0].count);

    // Get status distribution (combine all tables)
    const statusQuery = `
      SELECT status, COUNT(*) as count FROM (
        SELECT status FROM form_kerja_panas
        UNION ALL
        SELECT status FROM form_kerja_workshop
        UNION ALL
        SELECT status FROM form_kerja_ketinggian
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
      ORDER BY tanggal DESC
      LIMIT 10
    `;
    const recentForms = await query(recentQuery);

    const stats = {
      totalForms,
      byType: {
        hotWork: parseInt(hotWork[0].count),
        workshop: parseInt(workshop[0].count),
        heightWork: parseInt(heightWork[0].count),
      },
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