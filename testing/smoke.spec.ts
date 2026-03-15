import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { captureConsoleErrors } from './helpers/navigation';

/**
 * Smoke tests for the ERP stack.
 *
 * Covers backend health, frontend static pages, and admin dashboard.
 * Run via: testing/run_tests.bat or `npx playwright test smoke.spec.ts`
 */

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------
test.describe('Backend', () => {
  test('health endpoint returns database connected', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.database).toBe('connected');
  });

  test('hello endpoint responds', async ({ request }) => {
    const res = await request.get(`${API_URL}/hello`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Frontend
// ---------------------------------------------------------------------------
test.describe('Frontend', () => {
  test('splash page loads with hero title and CTA', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Elysium', { timeout: 15000 });
    await expect(
      page.getByRole('button', { name: /Begin Your Ascent/i }).first(),
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('about page loads', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/about');
    await expect(page.locator('body')).not.toBeEmpty();
    // Page should contain meaningful content
    await expect(page.locator('main, .about, [class*="about"], .page-content, h1, h2').first()).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test('terms page loads', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/terms');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('main, .terms, [class*="terms"], .page-content, h1, h2').first()).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test('privacy page loads', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/privacy');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('main, .privacy, [class*="privacy"], .page-content, h1, h2').first()).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test('license page loads', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/license');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('main, .license, [class*="license"], .page-content, h1, h2').first()).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test('support page loads', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/support');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('main, .support, [class*="support"], .page-content, h1, h2').first()).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
test.describe('Admin', () => {
  // Admin tests must use the admin baseURL from config.
  // The admin project in playwright.config.ts sets baseURL to the admin app,
  // but smoke.spec.ts runs in the frontend project too. We use explicit URLs.
  const ADMIN_URL = process.env.PLAYWRIGHT_ADMIN_URL || 'http://localhost:5174';

  test('login page loads with sign-in button', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto(ADMIN_URL);
    await expect(
      page.getByRole('button', { name: /Login with Google/i }),
    ).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test('dashboard loads via auth bypass', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await loginAsAdmin(page, ADMIN_URL);

    // Navbar is visible (loginAsAdmin already asserts this)
    // Verify we see some dashboard content
    await expect(page.locator('body')).not.toBeEmpty();

    expect(errors).toHaveLength(0);
  });
});
