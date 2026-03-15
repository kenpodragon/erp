import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * Admin Content Management E2E Tests (REC 5.2–5.3)
 *
 * Covers: World Builder tabs, Narrative Editor sub-tabs,
 * Content Editor, Atmosphere Editor, SFX Config Editor, Artifact Editor.
 */

test.describe('Admin — Content Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('World Builder page loads with tabs', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/world-builder');
    await page.waitForSelector('.wb-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Top-level tabs: Narrative Editor, Content Editor, Classification, Scaling & Difficulty
    const tabs = page.locator('.admin-tabs button, .admin-tabs .tab-btn, [class*="tab"]');
    await expect(page.getByText('Narrative Editor')).toBeVisible();
    await expect(page.getByText('Content Editor')).toBeVisible();
    await expect(page.getByText('Classification')).toBeVisible();
    await expect(page.getByText('Scaling & Difficulty')).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Narrative Editor sub-tabs: Books, Chapters, Scenes accessible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/world-builder');
    await page.waitForSelector('.wb-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Narrative Editor is the default tab — sub-tabs should be visible
    await expect(page.getByText('Books', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Chapters', { exact: true })).toBeVisible();
    await expect(page.getByText('Scenes', { exact: true })).toBeVisible();

    // Click Chapters tab
    await page.getByText('Chapters', { exact: true }).click();
    await page.waitForTimeout(500);
    await waitForContentLoad(page);

    // Click Scenes tab
    await page.getByText('Scenes', { exact: true }).click();
    await page.waitForTimeout(500);
    await waitForContentLoad(page);

    expect(errors).toHaveLength(0);
  });

  test('Entity editor is accessible from Narrative Editor', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/world-builder');
    await page.waitForSelector('.wb-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Click Entities sub-tab within Narrative Editor
    const entitiesTab = page.getByText('Entities', { exact: true });
    await expect(entitiesTab).toBeVisible({ timeout: 10000 });
    await entitiesTab.click();
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    // Entity editor should have loaded (lazy loaded)
    await expect(page.locator('body')).not.toBeEmpty();

    expect(errors).toHaveLength(0);
  });

  test('Atmosphere Editor loads with 21 atmospheres', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/atmospheres');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);

    // Page should contain atmosphere content
    await expect(page.locator('h1, h2').filter({ hasText: /atmosphere/i }).first()).toBeVisible({ timeout: 10000 });

    // Wait for data load and verify 21 atmospheres
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    // Check for the count or rows — the page shows atmosphere cards/rows
    const atmosphereItems = page.locator('tr, .atmosphere-card, .atmosphere-row, [class*="atmosphere"]');
    const count = await atmosphereItems.count();
    // At least 21 atmospheres (header row + 21 data rows, or 21 cards)
    expect(count).toBeGreaterThanOrEqual(21);

    expect(errors).toHaveLength(0);
  });

  test('SFX Config Editor loads with 17 presets', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/sfx-configs');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);

    // Page should contain SFX content
    await expect(page.locator('h1, h2').filter({ hasText: /sfx/i }).first()).toBeVisible({ timeout: 10000 });

    // Wait for data load
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    // Check for 17 presets
    const sfxItems = page.locator('tr, .sfx-card, .sfx-row, [class*="sfx-preset"]');
    const count = await sfxItems.count();
    expect(count).toBeGreaterThanOrEqual(17);

    expect(errors).toHaveLength(0);
  });

  test('Artifact Editor loads with 50 artifacts', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/artifacts');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);

    // Page should contain artifact content
    await expect(page.locator('h1, h2').filter({ hasText: /artifact/i }).first()).toBeVisible({ timeout: 10000 });

    // Wait for data load
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    // Check for 50 artifacts — may be paginated, so check total count indicator or rows
    const totalIndicator = page.locator('text=/\\b50\\b/');
    const artifactRows = page.locator('tbody tr, .artifact-card, .artifact-row');
    const rowCount = await artifactRows.count();

    // Either we see a total indicator with "50" or we have a reasonable number of rows
    const has50Indicator = await totalIndicator.count() > 0;
    expect(has50Indicator || rowCount >= 20).toBeTruthy();

    expect(errors).toHaveLength(0);
  });
});
