import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test-georevolt.db');

beforeEach(() => {
  process.env.DB_PATH = TEST_DB_PATH;
  const dir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

function mockRequest(method: string, body?: any, url?: string): NextRequest {
  const req = {
    method,
    json: async () => body,
    nextUrl: { searchParams: new URLSearchParams() },
    url: url ?? 'http://localhost:3000/api/markets',
  } as any;
  return req;
}

describe('GET /api/markets', () => {
  it('returns empty GeoJSON when no markets exist', async () => {
    const { GET } = await import('@/app/api/markets/route');
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toEqual([]);
  });

  it('returns GeoJSON with markets after creation', async () => {
    const { POST, GET } = await import('@/app/api/markets/route');

    const postRes = await POST(mockRequest('POST', {
      contract_address: '0x123',
      name: 'Test Market',
      lng: 37.62,
      lat: 55.75,
      end_time: Math.floor(Date.now() / 1000) + 86400,
      resolution_time: Math.floor(Date.now() / 1000) + 172800,
    }));
    expect(postRes.status).toBe(201);

    const getRes = await GET();
    const data = await getRes.json();

    expect(data.features).toHaveLength(1);
    expect(data.features[0].geometry.coordinates).toEqual([37.62, 55.75]);
    expect(data.features[0].properties.name).toBe('Test Market');
    expect(data.features[0].properties.status).toBe('open');
  });
});

describe('POST /api/markets', () => {
  it('creates a market with valid data', async () => {
    const { POST } = await import('@/app/api/markets/route');

    const res = await POST(mockRequest('POST', {
      contract_address: '0xabc',
      name: 'New Market',
      description: 'Test description',
      category: 'politics',
      lng: 30.3,
      lat: 59.9,
      end_time: Math.floor(Date.now() / 1000) + 86400,
      resolution_time: Math.floor(Date.now() / 1000) + 172800,
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.contract_address).toBe('0xabc');
    expect(data.name).toBe('New Market');
    expect(data.category).toBe('politics');
    expect(data.resolved).toBe(false);
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('@/app/api/markets/route');

    const res = await POST(mockRequest('POST', {
      name: 'Incomplete',
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Missing required field');
  });

  it('returns 400 when coordinates are invalid', async () => {
    const { POST } = await import('@/app/api/markets/route');

    const res = await POST(mockRequest('POST', {
      contract_address: '0xbad',
      name: 'Bad coords',
      lng: 200,
      lat: 55,
      end_time: Math.floor(Date.now() / 1000) + 86400,
      resolution_time: Math.floor(Date.now() / 1000) + 172800,
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid coordinates');
  });

  it('returns 409 for duplicate contract address', async () => {
    const { POST } = await import('@/app/api/markets/route');

    const payload = {
      contract_address: '0xdup',
      name: 'First',
      lng: 0, lat: 0,
      end_time: Math.floor(Date.now() / 1000) + 86400,
      resolution_time: Math.floor(Date.now() / 1000) + 172800,
    };

    const res1 = await POST(mockRequest('POST', payload));
    expect(res1.status).toBe(201);

    const res2 = await POST(mockRequest('POST', payload));
    expect(res2.status).toBe(409);
  });
});

describe('GET /api/markets/[id]', () => {
  it('returns a single market by id', async () => {
    const { POST } = await import('@/app/api/markets/route');
    const postRes = await POST(mockRequest('POST', {
      contract_address: '0xsingle',
      name: 'Single',
      lng: 10, lat: 20,
      end_time: Math.floor(Date.now() / 1000) + 86400,
      resolution_time: Math.floor(Date.now() / 1000) + 172800,
    }));
    const created = await postRes.json();

    const { GET: GetById } = await import('@/app/api/markets/[id]/route');
    const req = mockRequest('GET');
    const res = await GetById(req, { params: { id: String(created.id) } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.features[0].properties.id).toBe(created.id);
  });

  it('returns 404 for non-existent id', async () => {
    const { GET: GetById } = await import('@/app/api/markets/[id]/route');
    const req = mockRequest('GET');
    const res = await GetById(req, { params: { id: '999999' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const { GET: GetById } = await import('@/app/api/markets/[id]/route');
    const req = mockRequest('GET');
    const res = await GetById(req, { params: { id: 'abc' } });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/markets/[id]/resolve', () => {
  it('resolves a market with outcome true', async () => {
    const { POST } = await import('@/app/api/markets/route');
    const postRes = await POST(mockRequest('POST', {
      contract_address: '0xresolve1',
      name: 'Resolve Test',
      lng: 10, lat: 20,
      end_time: Math.floor(Date.now() / 1000) + 86400,
      resolution_time: Math.floor(Date.now() / 1000) + 172800,
    }));
    const created = await postRes.json();

    const { PATCH } = await import('@/app/api/markets/[id]/resolve/route');
    const req = mockRequest('PATCH', { outcome: true });
    const res = await PATCH(req, { params: { id: String(created.id) } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.resolved).toBe(true);
    expect(data.outcome).toBe(true);
  });

  it('returns 400 when outcome is missing', async () => {
    const { POST } = await import('@/app/api/markets/route');
    const postRes = await POST(mockRequest('POST', {
      contract_address: '0xresolve2',
      name: 'Bad Resolve',
      lng: 10, lat: 20,
      end_time: Math.floor(Date.now() / 1000) + 86400,
      resolution_time: Math.floor(Date.now() / 1000) + 172800,
    }));
    const created = await postRes.json();

    const { PATCH } = await import('@/app/api/markets/[id]/resolve/route');
    const req = mockRequest('PATCH', {});
    const res = await PATCH(req, { params: { id: String(created.id) } });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent market', async () => {
    const { PATCH } = await import('@/app/api/markets/[id]/resolve/route');
    const req = mockRequest('PATCH', { outcome: true });
    const res = await PATCH(req, { params: { id: '99999' } });
    expect(res.status).toBe(404);
  });
});
