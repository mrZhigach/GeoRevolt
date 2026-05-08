import { NextRequest, NextResponse } from 'next/server';
import { getAllMarkets, toGeoJSON, createMarket, isDbAvailable } from '@/lib/db';

export async function GET() {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }
    const markets = await getAllMarkets();
    const geoJson = toGeoJSON(markets);
    return NextResponse.json(geoJson);
  } catch (error) {
    console.error('GET /api/markets error:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available. Set DATABASE_URL for PostgreSQL.' }, { status: 503 });
    }

    const body = await request.json();

    const requiredFields = ['contract_address', 'name', 'lng', 'lat', 'end_time', 'resolution_time'] as const;
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (typeof body.lng !== 'number' || typeof body.lat !== 'number') {
      return NextResponse.json({ error: 'lng and lat must be numbers' }, { status: 400 });
    }
    if (body.lng < -180 || body.lng > 180 || body.lat < -90 || body.lat > 90) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const market = await createMarket({
      contract_address: body.contract_address,
      name: body.name,
      description: body.description ?? '',
      category: body.category ?? 'general',
      lng: body.lng,
      lat: body.lat,
      end_time: body.end_time,
      resolution_time: body.resolution_time,
    });

    return NextResponse.json(market, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === '23505') {
      return NextResponse.json({ error: 'Market with this contract address already exists' }, { status: 409 });
    }
    console.error('POST /api/markets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
