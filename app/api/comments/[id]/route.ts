import { NextRequest, NextResponse } from 'next/server';
import { deleteComment } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const userAddress = body.user_address;

    if (!userAddress) {
      return NextResponse.json({ error: 'user_address is required' }, { status: 400 });
    }

    const deleted = await deleteComment(id, userAddress.toLowerCase());

    if (!deleted) {
      return NextResponse.json(
        { error: 'Comment not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/comments/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
