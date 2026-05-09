import { NextRequest, NextResponse } from 'next/server';
import { savePriceSnapshot, isDbAvailable } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = await request.json();
    const { market_id, price_yes, price_no, liquidity } = body;

    if (!market_id || price_yes === undefined || price_no === undefined) {
      return NextResponse.json({ error: 'Missing required fields: market_id, price_yes, price_no' }, { status: 400 });
    }

    const snapshot = await savePriceSnapshot(
      market_id.toLowerCase(),
      Number(price_yes),
      Number(price_no),
      liquidity !== undefined ? Number(liquidity) : null
    );

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error('POST /api/price-snapshot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
