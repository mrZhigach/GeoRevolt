import { NextRequest, NextResponse } from 'next/server';
import { getAdminMarkets, isDbAvailable } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const result = await getAdminMarkets({
      status: (searchParams.get('status') as any) || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/admin/markets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
