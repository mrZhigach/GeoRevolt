import { NextResponse } from 'next/server';
import { getAdminStats, isDbAvailable } from '@/lib/db';

export async function GET() {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
