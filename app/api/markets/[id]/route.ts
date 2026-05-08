import { NextRequest, NextResponse } from 'next/server';
import { getMarketById, toGeoJSON } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const market = await getMarketById(id);
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    const geoJson = toGeoJSON([market]);
    return NextResponse.json(geoJson);
  } catch (error) {
    console.error(`GET /api/markets/${params.id} error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
