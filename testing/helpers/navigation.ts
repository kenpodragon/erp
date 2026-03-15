/**
 * Navigation helpers for E2E tests.
 */

import { type Page, expect } from '@playwright/test';

/**
 * Navigate to a game tab via the sidebar.
 */
export async function navigateToTab(page: Page, tabName: string) {
  const tab = page.locator('.sidebar-tab-btn, .nav-tab').filter({ hasText: new RegExp(tabName, 'i') });
  await expect(tab).toBeVisible({ timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(500);
}

/**
 * Navigate to an admin page by path.
 */
export async function navigateToAdminPage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForTimeout(1000);
}

/**
 * Wait for page content to load (no loading spinners visible).
 */
export async function waitForContentLoad(page: Page) {
  // Wait for any loading indicators to disappear
  const loadingIndicator = page.locator('.loading, [data-loading="true"], .config-loading');
  if (await loadingIndicator.isVisible({ timeout: 500 }).catch(() => false)) {
    await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
  }
}

/**
 * Check for console errors on the page.
 * Returns an array of error messages.
 */
export function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}
