import { test, expect } from '@playwright/test';

test.describe('Admin API — Sprint 5', () => {

  test('GET /api/health returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('status');
  });

  test('GET /api/admin/stats returns metrics', async ({ request }) => {
    const res = await request.get('/api/admin/stats');
    if (res.status() === 503) {
      test.skip('DB not available');
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('totalMarkets');
    expect(body).toHaveProperty('totalLiquidityUSDC');
    expect(body).toHaveProperty('activeMarkets');
    expect(body).toHaveProperty('resolvedMarkets');
    expect(body).toHaveProperty('topMarketsByLiquidity');
    expect(body).toHaveProperty('liquidityByCategory');
  });

  test('GET /api/admin/markets returns paginated list', async ({ request }) => {
    const res = await request.get('/api/admin/markets');
    if (res.status() === 503) {
      test.skip('DB not available');
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('markets');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
  });

  test('GET /api/admin/markets with filters', async ({ request }) => {
    const res = await request.get('/api/admin/markets?status=open&page=1&limit=5');
    if (res.status() === 503) test.skip();
    expect(res.ok()).toBeTruthy();
  });

  test('GET /api/events returns list', async ({ request }) => {
    const res = await request.get('/api/events');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('GET /api/markets returns GeoJSON', async ({ request }) => {
    const res = await request.get('/api/markets');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.type).toBe('FeatureCollection');
    expect(body).toHaveProperty('features');
  });

  test('POST /api/admin/allowed-countries validates country codes', async ({ request }) => {
    const res = await request.post('/api/admin/allowed-countries', {
      data: { countries: ['US', 'GB', 'XX'] },
    });
    if (res.status() === 503) test.skip();
    expect(res.status()).toBe(400);
  });

  test('POST /api/admin/allowed-countries works with valid codes', async ({ request }) => {
    const res = await request.post('/api/admin/allowed-countries', {
      data: { countries: ['US', 'GB'] },
    });
    if (res.status() === 503) test.skip();
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.countries).toContain('US');
    expect(body.countries).toContain('GB');
  });

  test('GET /api/admin/allowed-countries returns list', async ({ request }) => {
    const res = await request.get('/api/admin/allowed-countries');
    if (res.status() === 503) test.skip();
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('countries');
  });

  test('Frontend admin page loads', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('Frontend map page loads', async ({ page }) => {
    await page.goto('/');
    // Map page uses 'use client' + wagmi — check body is rendered (Web3 hydration depends on browser)
    await expect(page.locator('body')).toBeAttached({ timeout: 15000 });
    // Map container should be rendered
    await expect(page.locator('[class*="maplibregl"]').first()).toBeAttached({ timeout: 5000 });
  });
});
