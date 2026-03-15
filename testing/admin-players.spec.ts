import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * Admin Players Management E2E Tests (REC 5.1)
 *
 * Covers: Player list, search/filter, player detail page,
 * action buttons, and character display.
 */

test.describe('Admin — Player Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('players list page loads with table', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/players');
    await page.waitForSelector('.players-list-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Page header
    await expect(page.locator('h2')).toContainText('Player Management');

    // Table is visible with expected columns
    const table = page.locator('.players-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(table.locator('th')).toHaveCount(7);

    // At least one player row (E2ETestBot exists)
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // Summary cards visible
    await expect(page.locator('.summary-cards')).toBeVisible();
    await expect(page.locator('.summary-card').first()).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('search and filter works', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/players');
    await page.waitForSelector('.players-table', { timeout: 10000 });
    await waitForContentLoad(page);

    // Type in search box
    const searchInput = page.locator('.search-box input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('E2ETestBot');

    // Wait for debounced search to fire and table to update
    await page.waitForTimeout(500);
    await waitForContentLoad(page);

    // Should see results (the test player matches)
    const rows = page.locator('.players-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Status filter exists and is usable
    const statusSelect = page.locator('.filters select').first();
    await expect(statusSelect).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('player detail page loads with all sections', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/players/2');
    await page.waitForSelector('.player-detail-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Account Information section
    await expect(page.locator('h3').filter({ hasText: 'Account Information' })).toBeVisible();

    // Character(s) section
    await expect(page.locator('h3').filter({ hasText: 'Character(s)' })).toBeVisible();

    // Support Tickets section
    await expect(page.locator('h3').filter({ hasText: /Support Tickets/ })).toBeVisible();

    // Finance section
    await expect(page.locator('h3').filter({ hasText: 'Finance' })).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('player detail has Edit Alias and Ban Player buttons', async ({ page }) => {
    await page.goto('/players/2');
    await page.waitForSelector('.player-detail-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Edit Alias button
    const editAliasBtn = page.getByRole('button', { name: /Edit Alias/i });
    await expect(editAliasBtn).toBeVisible();

    // Ban Player button (E2ETestBot is not banned, so Ban should be shown)
    const banBtn = page.locator('.btn-ban, .btn-unban');
    await expect(banBtn).toBeVisible();
  });

  test('player detail has Force Logout button', async ({ page }) => {
    await page.goto('/players/2');
    await page.waitForSelector('.player-detail-page', { timeout: 10000 });
    await waitForContentLoad(page);

    const logoutBtn = page.getByRole('button', { name: /Force Logout/i });
    await expect(logoutBtn).toBeVisible();
  });

  test('character section shows TestHero (Engineer, L1)', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/players/2');
    await page.waitForSelector('.player-detail-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Wait for character cards to render
    const charSection = page.locator('.characters-section');
    await expect(charSection).toBeVisible({ timeout: 10000 });

    // Character name
    await expect(charSection.locator('.char-name').first()).toContainText('TestHero');

    // Character class
    await expect(charSection.locator('.char-class').first()).toContainText('Engineer');

    // Character level
    await expect(charSection.locator('.char-level').first()).toContainText('Level 1');

    expect(errors).toHaveLength(0);
  });
});
