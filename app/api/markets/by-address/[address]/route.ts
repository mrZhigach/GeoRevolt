import { NextResponse } from 'next/server';
import { getMarketByContractAddress } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const market = await getMarketByContractAddress(params.address.toLowerCase());
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }
    return NextResponse.json(market);
  } catch (error) {
    console.error('GET /api/markets/by-address error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
