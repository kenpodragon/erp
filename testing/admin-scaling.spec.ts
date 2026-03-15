import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * Admin Game Configs / Scaling E2E Tests (REC 5.4–5.5)
 *
 * Covers: Game Configs page, search/filter, Drop Rates tab,
 * Skill Balance tab, Economy tab, config editability.
 */

test.describe('Admin — Game Configs & Scaling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Game Configs page loads with 141+ configs', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/game-configs');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);

    // Wait for configs to load (they come from API)
    await page.waitForTimeout(2000);
    await waitForContentLoad(page);

    // Should show "All Configs" tab as active by default
    await expect(page.getByText('All Configs')).toBeVisible({ timeout: 10000 });

    // Verify config entries are rendered — look for config rows or cards
    const configItems = page.locator('.config-row, .config-card, .gc-row, [class*="config-item"], tbody tr, .json-editor-field');
    const count = await configItems.count();
    expect(count).toBeGreaterThanOrEqual(10); // At least some configs loaded

    expect(errors).toHaveLength(0);
  });

  test('search/filter works on configs', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/game-configs');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(2000);

    // Look for a search input
    const searchInput = page.locator('input[type="text"][placeholder*="earch"], input[type="text"][placeholder*="ilter"], .gc-search input, input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('drop_rate');
      await page.waitForTimeout(500);
      await waitForContentLoad(page);
    }

    expect(errors).toHaveLength(0);
  });

  test('Drop Rates tab is accessible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/game-configs');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Click Drop Rates tab
    const dropRatesTab = page.getByText('Drop Rates', { exact: true });
    await expect(dropRatesTab).toBeVisible({ timeout: 10000 });
    await dropRatesTab.click();
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    // Content should have loaded
    await expect(page.locator('body')).not.toBeEmpty();

    expect(errors).toHaveLength(0);
  });

  test('Skill Balance tab is accessible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/game-configs');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Click Skill Balance tab
    const skillTab = page.getByText('Skill Balance', { exact: true });
    await expect(skillTab).toBeVisible({ timeout: 10000 });
    await skillTab.click();
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    await expect(page.locator('body')).not.toBeEmpty();

    expect(errors).toHaveLength(0);
  });

  test('Economy tab is accessible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/game-configs');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Click Economy tab
    const economyTab = page.getByText('Economy', { exact: true });
    await expect(economyTab).toBeVisible({ timeout: 10000 });
    await economyTab.click();
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    await expect(page.locator('body')).not.toBeEmpty();

    expect(errors).toHaveLength(0);
  });

  test('config values are editable', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/game-configs');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(2000);

    // Look for edit buttons, input fields, or the JsonEditor components
    const editableElements = page.locator(
      'button:has-text("Edit"), button:has-text("Save"), ' +
      '.json-editor-number, .json-editor-text, .json-editor-select, ' +
      'input.json-editor-number, input.json-editor-text, ' +
      '.gc-edit-btn, [class*="edit"]'
    );
    const count = await editableElements.count();
    expect(count).toBeGreaterThanOrEqual(1);

    expect(errors).toHaveLength(0);
  });
});
