import { test, expect } from '@playwright/test';

test('Frontend home page has title and login button', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('h1')).toContainText('ERP Frontend');
  await expect(page.getByRole('button', { name: /Login with Google/i })).toBeVisible();
});

test('Admin home page has title and login button', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await expect(page.locator('h1')).toContainText('ERP Admin');
  await expect(page.getByRole('button', { name: /Login with Google \(Admin\)/i })).toBeVisible();
});
