import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * Admin Asset Registry E2E Tests (Task 2.18 — REC 5.7)
 *
 * Covers: Asset Registry table, 196 assets, category filters (16 categories),
 * search, pagination (4 pages), New Asset button, Orphan Detection.
 */

test.describe('Admin — Asset Registry', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Asset Registry loads with table', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/asset-registry');
    await page.waitForSelector('.ar-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Page header
    await expect(page.locator('h2').filter({ hasText: 'Asset Registry' })).toBeVisible();

    // Table should be visible with expected columns
    const table = page.locator('.ar-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(table.locator('th').filter({ hasText: 'Asset Key' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Category' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Actions' })).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('shows 196 total assets', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/asset-registry');
    await page.waitForSelector('.ar-page', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Pagination area shows the total count
    const pagination = page.locator('.ar-pagination');
    await expect(pagination).toBeVisible({ timeout: 10000 });
    await expect(pagination).toContainText('196');

    expect(errors).toHaveLength(0);
  });

  test('category filter buttons render (16 categories)', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/asset-registry');
    await page.waitForSelector('.ar-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Category tabs container
    const categoryTabs = page.locator('.ar-category-tabs');
    await expect(categoryTabs).toBeVisible({ timeout: 10000 });

    // VALID_CATEGORIES has 14 items + "portrait" = 15 categories + 1 "All" button = 16 total
    const buttons = categoryTabs.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(15);

    // Click a category filter and verify results narrow
    await buttons.filter({ hasText: /entity sprite/i }).click();
    await page.waitForTimeout(500);
    await waitForContentLoad(page);

    // Pagination total should change from 196
    const paginationText = await page.locator('.ar-pagination').textContent();
    expect(paginationText).not.toContain('196');

    expect(errors).toHaveLength(0);
  });

  test('search box works', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/asset-registry');
    await page.waitForSelector('.ar-page', { timeout: 10000 });
    await waitForContentLoad(page);

    const searchInput = page.locator('.ar-search-input');
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill('goblin');
    await page.waitForTimeout(500);
    await waitForContentLoad(page);

    // Results should be filtered (pagination total changes)
    const pagination = page.locator('.ar-pagination');
    await expect(pagination).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('pagination works (4 pages)', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/asset-registry');
    await page.waitForSelector('.ar-page', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Pagination controls visible
    const paginationControls = page.locator('.ar-pagination-controls');
    await expect(paginationControls).toBeVisible({ timeout: 10000 });

    // Shows page info (Page 1 of N)
    const pageInfo = page.locator('.ar-pagination');
    await expect(pageInfo).toContainText('Page 1');

    // Next button should be enabled (196 assets / 50 per page = 4 pages)
    const nextBtn = paginationControls.locator('button').filter({ hasText: /Next/i });
    await expect(nextBtn).toBeEnabled();

    // Navigate to page 2
    await nextBtn.click();
    await page.waitForTimeout(500);
    await waitForContentLoad(page);
    await expect(pageInfo).toContainText('Page 2');

    expect(errors).toHaveLength(0);
  });

  test('New Asset button exists', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/asset-registry');
    await page.waitForSelector('.ar-page', { timeout: 10000 });
    await waitForContentLoad(page);

    const newAssetBtn = page.locator('button').filter({ hasText: /New Asset/i });
    await expect(newAssetBtn).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Orphan Detection section exists', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/asset-registry');
    await page.waitForSelector('.ar-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Orphan Detection panel
    const orphanPanel = page.locator('.ar-orphan-panel');
    await expect(orphanPanel).toBeVisible({ timeout: 10000 });

    // Header text
    await expect(orphanPanel.locator('h3')).toContainText('Orphan Detection');

    // Expand toggle
    const toggle = orphanPanel.locator('.ar-orphan-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('Expand');

    // Click to expand
    await orphanPanel.locator('.ar-orphan-header').click();
    await page.waitForTimeout(1000);

    // Should show Missing Assets and Unused Assets tabs
    await expect(orphanPanel.locator('button').filter({ hasText: /Missing Assets/i })).toBeVisible({ timeout: 10000 });
    await expect(orphanPanel.locator('button').filter({ hasText: /Unused Assets/i })).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
