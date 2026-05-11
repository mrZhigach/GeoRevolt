import { NextRequest, NextResponse } from 'next/server';
import { getCommentsByMarket, createComment, getCommentCount } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const [comments, total] = await Promise.all([
      getCommentsByMarket(params.address, page, limit),
      getCommentCount(params.address),
    ]);

    return NextResponse.json({
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/markets/by-address/[address]/comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (!body.user_address || typeof body.user_address !== 'string') {
      return NextResponse.json({ error: 'user_address is required' }, { status: 400 });
    }

    // Sanitize content length
    const content = body.content.trim().slice(0, 2000);

    const comment = await createComment({
      market_address: params.address,
      user_address: body.user_address.toLowerCase(),
      parent_id: body.parent_id ?? null,
      content,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('POST /api/markets/by-address/[address]/comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
