import { test, expect } from '@playwright/test';

test.describe('Frontend', () => {
  test.use({ baseURL: 'http://frontend:5173' });

  test('splash page has hero title and CTA button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Elysium');
    await expect(page.getByRole('button', { name: /Begin Your Ascent/i }).first()).toBeVisible();
  });
});

test.describe('Admin', () => {
  test.use({ baseURL: 'http://admin:5174' });

  test('login page has Google sign-in button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Login with Google/i })).toBeVisible();
  });
});
