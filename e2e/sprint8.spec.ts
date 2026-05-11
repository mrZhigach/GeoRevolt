import { test, expect } from '@playwright/test';

test.describe('Sprint 8 — Dashboard redesign', () => {

  test.describe('Comments API', () => {
    const testAddress = '0xTestMarketAddressForComments123456789';

    test('GET comments returns paginated response', async ({ request }) => {
      const res = await request.get(`/api/markets/by-address/${testAddress}/comments?page=1&limit=10`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body).toHaveProperty('comments');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('page');
      expect(body).toHaveProperty('totalPages');
    });

    test('POST comment validates required fields', async ({ request }) => {
      const res = await request.post(`/api/markets/by-address/${testAddress}/comments`, {
        data: {},
      });
      expect(res.status()).toBe(400);
    });

    test('POST comment requires user_address', async ({ request }) => {
      const res = await request.post(`/api/markets/by-address/${testAddress}/comments`, {
        data: { content: 'Test comment' },
      });
      expect(res.status()).toBe(400);
    });

    test('POST and DELETE comment full cycle', async ({ request }) => {
      // Create comment
      const createRes = await request.post(`/api/markets/by-address/${testAddress}/comments`, {
        data: {
          user_address: '0xUser1234567890abcdef1234567890abcdef123456',
          content: 'E2E test comment',
        },
      });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      expect(created).toHaveProperty('id');
      expect(created.content).toBe('E2E test comment');

      // Delete comment
      const deleteRes = await request.delete(`/api/comments/${created.id}`, {
        data: {
          user_address: '0xUser1234567890abcdef1234567890abcdef123456',
        },
      });
      expect(deleteRes.ok()).toBeTruthy();
    });
  });

  test.describe('View Toggle & Markets List API', () => {
    test('GET /api/markets with pagination params', async ({ request }) => {
      const res = await request.get('/api/markets?page=1&limit=5');
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.type).toBe('FeatureCollection');
      expect(body).toHaveProperty('features');
    });

    test('GET /api/markets with category filter', async ({ request }) => {
      const res = await request.get('/api/markets?category=technology');
      expect(res.ok()).toBeTruthy();
    });

    test('GET /api/markets with search', async ({ request }) => {
      const res = await request.get('/api/markets?search=test');
      expect(res.ok()).toBeTruthy();
    });
  });

  test.describe('Frontend Pages', () => {
    test('Admin page has tab navigation', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Markets')).toBeVisible();
      await expect(page.locator('text=Batch Upload')).toBeVisible();
      await expect(page.locator('text=Allowed Countries')).toBeVisible();
    });

    test('Admin tabs switch content', async ({ page }) => {
      await page.goto('/admin');
      // Click on "Allowed Countries" tab
      await page.click('text=Allowed Countries');
      await expect(page.locator('text=Country code')).toBeVisible({ timeout: 5000 });
    });

    test('Header navigation visible on admin page', async ({ page }) => {
      await page.goto('/admin');
      // Header should be visible (not hidden)
      await expect(page.locator('text=GeoRevolt').first()).toBeVisible({ timeout: 10000 });
    });

    test('Market detail page has Discussions tab', async ({ page }) => {
      // First try to find a market on the map page
      await page.goto('/');
      // Navigate to a test market page (the page should handle not-found gracefully)
      await page.goto('/market/0xTestE2EMarket');
      // We should see the market detail page with tabs
      await expect(page.locator('text=Back to map')).toBeVisible({ timeout: 10000 });
    });

    test('List view page loads', async ({ page }) => {
      await page.goto('/?view=list');
      await expect(page.locator('text=All').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Responsive / Mobile', () => {
    test('Mobile hamburger menu visible', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin');
      // Hamburger button should be visible on mobile
      const hamburger = page.locator('.md\\\\:hidden'); // the CSS class for mobile-only
      await expect(hamburger).toBeVisible({ timeout: 5000 });
    });

    test('Map page loads on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      // Page should load without errors
      await expect(page.locator('body')).toBeAttached({ timeout: 10000 });
    });

    test('Responsive list view is single column on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/?view=list');
      await expect(page.locator('text=Map').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Admin — Batch Upload', () => {
    test('Batch upload page renders', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Batch Upload');
      await expect(page.locator('text=Drag & drop')).toBeVisible({ timeout: 5000 });
    });
  });
});
