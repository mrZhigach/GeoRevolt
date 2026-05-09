import { NextResponse } from 'next/server';
import { getRecentEvents, isDbAvailable } from '@/lib/db';

export async function GET() {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json([]);
    }
    const events = await getRecentEvents(20);
    return NextResponse.json(events);
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
