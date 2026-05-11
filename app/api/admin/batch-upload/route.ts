import { NextRequest, NextResponse } from 'next/server';
import { createMarket, createEvent, isDbAvailable } from '@/lib/db';

const MAX_BATCH = 10;

interface BatchItem {
  name: string;
  description?: string;
  category?: string;
  lng: number;
  lat: number;
  endTime: number;
  resolutionTime: number;
  liquidity?: number;
  radius?: number;
}

interface BatchResult {
  success: boolean;
  contract_address?: string;
  name: string;
  error?: string;
}

function toUnixTimestamp(value: string): number | null {
  // Try Unix timestamp first
  const ts = parseInt(value, 10);
  if (!isNaN(ts) && ts > 1000000000) return ts;
  // Try ISO 8601 (e.g. "2025-12-31T23:59:00Z" or "2025-12-31")
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) return Math.floor(parsed / 1000);
  return null;
}

function parseCSV(text: string): { items: BatchItem[]; errors: string[] } {
  const lines = text.trim().split('\n');
  const errors: string[] = [];
  const items: BatchItem[] = [];

  if (lines.length < 2) {
    errors.push('CSV must have a header row and at least one data row');
    return { items, errors };
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = ['name', 'lng', 'lat', 'endtime', 'resolutiontime'];
  for (const col of required) {
    if (!header.includes(col)) {
      errors.push(`Missing required column: ${col}`);
      return { items, errors };
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    header.forEach((h, idx) => { row[h] = vals[idx] || ''; });

    const lng = parseFloat(row.lng);
    const lat = parseFloat(row.lat);
    const endTime = toUnixTimestamp(row.endtime);
    const resolutionTime = toUnixTimestamp(row.resolutiontime);

    if (!row.name) {
      errors.push(`Row ${i}: name is required`);
      continue;
    }
    if (isNaN(lng) || isNaN(lat)) {
      errors.push(`Row ${i}: invalid coordinates`);
      continue;
    }
    if (endTime === null || resolutionTime === null) {
      errors.push(`Row ${i}: invalid timestamps (use Unix epoch or ISO 8601)`);
      continue;
    }

    items.push({
      name: row.name,
      description: row.description || '',
      category: row.category || 'general',
      lng,
      lat,
      endTime,
      resolutionTime,
      liquidity: row.liquidity ? parseFloat(row.liquidity) : 200,
      radius: row.radius ? parseFloat(row.radius) : 100,
    });
  }

  return { items, errors };
}

function parseGeoJSON(json: any): { items: BatchItem[]; errors: string[] } {
  const errors: string[] = [];
  const items: BatchItem[] = [];

  if (!json || json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
    errors.push('Invalid GeoJSON: must be a FeatureCollection');
    return { items, errors };
  }

  for (let i = 0; i < json.features.length; i++) {
    const f = json.features[i];
    const props = f.properties || {};
    const coords = f.geometry?.coordinates;

    if (!Array.isArray(coords) || coords.length < 2) {
      errors.push(`Feature ${i}: invalid coordinates`);
      continue;
    }
    if (!props.name) {
      errors.push(`Feature ${i}: name is required in properties`);
      continue;
    }

    const endTime = toUnixTimestamp(String(props.endTime || props.end_time || ''));
    const resolutionTime = toUnixTimestamp(String(props.resolutionTime || props.resolution_time || ''));

    if (endTime === null || resolutionTime === null) {
      errors.push(`Feature ${i}: invalid timestamps`);
      continue;
    }

    items.push({
      name: props.name,
      description: props.description || '',
      category: props.category || 'general',
      lng: coords[0],
      lat: coords[1],
      endTime,
      resolutionTime,
      liquidity: props.liquidity ?? 200,
      radius: props.radius ?? 100,
    });
  }

  return { items, errors };
}

export async function POST(request: NextRequest) {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const contentType = request.headers.get('content-type') || '';
    let items: BatchItem[] = [];
    let parseErrors: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }
      const text = await file.text();
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        const parsed = parseCSV(text);
        items = parsed.items;
        parseErrors = parsed.errors;
      } else if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const parsed = parseGeoJSON(JSON.parse(text));
        items = parsed.items;
        parseErrors = parsed.errors;
      } else {
        return NextResponse.json({ error: 'Unsupported file format. Use .csv or .geojson' }, { status: 400 });
      }
    } else {
      const body = await request.json();
      if (body.type === 'FeatureCollection') {
        const parsed = parseGeoJSON(body);
        items = parsed.items;
        parseErrors = parsed.errors;
      } else if (Array.isArray(body.items)) {
        items = body.items;
      } else if (body.csv) {
        const parsed = parseCSV(body.csv);
        items = parsed.items;
        parseErrors = parsed.errors;
      } else {
        return NextResponse.json({ error: 'Invalid body. Send CSV string, GeoJSON, or {items: [...]}' }, { status: 400 });
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ errors: parseErrors, results: [] }, { status: 400 });
    }

    if (items.length > MAX_BATCH) {
      items = items.slice(0, MAX_BATCH);
      parseErrors.push(`Limited to ${MAX_BATCH} items per batch`);
    }

    const useBlockchain = !!process.env.ADMIN_PRIVATE_KEY;
    const results: BatchResult[] = [];

    for (const item of items) {
      try {
        let contractAddress: string;

        if (useBlockchain) {
          // For future: deploy via viem using ADMIN_PRIVATE_KEY
          // For now, generate a simulated address
          contractAddress = '0x' + 'sim' + '000000' + Math.random().toString(16).slice(2, 42);
        } else {
          contractAddress = '0x' + 'sim' + Date.now().toString(16).slice(-8) + Math.random().toString(16).slice(2, 34);
        }

        const market = await createMarket({
          contract_address: contractAddress,
          name: item.name,
          description: item.description || '',
          category: item.category || 'general',
          lng: item.lng,
          lat: item.lat,
          end_time: item.endTime,
          resolution_time: item.resolutionTime,
          liquidity: item.liquidity ?? 200,
          radius: item.radius ?? 100,
          simulated: !useBlockchain,
        });

        await createEvent({
          market_id: market.id,
          event_type: 'batch_created',
          data: { name: item.name, batch: true, simulated: !useBlockchain },
        });

        results.push({ success: true, contract_address: contractAddress, name: item.name });
      } catch (e: any) {
        results.push({ success: false, name: item.name, error: e?.message || 'Creation failed' });
      }
    }

    return NextResponse.json({
      total: items.length,
      successCount: results.filter((r) => r.success).length,
      failCount: results.filter((r) => !r.success).length,
      parseErrors,
      results,
    });
  } catch (error) {
    console.error('POST /api/admin/batch-upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
