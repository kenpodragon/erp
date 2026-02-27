import { test, expect } from '@playwright/test';

test('Frontend home page has title', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('h1')).toContainText('ERP Frontend');
});

test('Admin home page has title', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await expect(page.locator('h1')).toContainText('ERP Admin');
});
