import { NextResponse } from 'next/server';
import { getPriceHistory } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const history = await getPriceHistory(params.address.toLowerCase(), 200);
    return NextResponse.json(history);
  } catch (error) {
    console.error('GET /api/price-history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
