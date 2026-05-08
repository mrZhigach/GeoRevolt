import { NextRequest, NextResponse } from 'next/server';
import { getMarketById, resolveMarket } from '@/lib/db';

export async function PATCH(
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

    const body = await _request.json();
    if (typeof body.outcome !== 'boolean') {
      return NextResponse.json({ error: 'outcome must be a boolean' }, { status: 400 });
    }

    const updated = await resolveMarket(id, body.outcome);
    return NextResponse.json(updated);
  } catch (error) {
    console.error(`PATCH /api/markets/${params.id}/resolve error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
