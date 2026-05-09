import { NextRequest, NextResponse } from 'next/server';
import { getAllowedCountries, setAllowedCountries, isDbAvailable } from '@/lib/db';

export async function GET() {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    const countries = await getAllowedCountries();
    return NextResponse.json({ countries });
  } catch (error) {
    console.error('GET /api/admin/allowed-countries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    const body = await request.json();
    const { countries } = body;
    if (!Array.isArray(countries)) {
      return NextResponse.json({ error: 'countries must be an array of ISO-3166-1 alpha-2 codes' }, { status: 400 });
    }
    for (const code of countries) {
      if (typeof code !== 'string' || !/^[A-Z]{2}$/i.test(code)) {
        return NextResponse.json({ error: `Invalid country code: ${code}` }, { status: 400 });
      }
    }
    await setAllowedCountries(countries);
    return NextResponse.json({ countries: await getAllowedCountries() });
  } catch (error) {
    console.error('POST /api/admin/allowed-countries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
