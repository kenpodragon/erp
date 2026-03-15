import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * Admin Audit Log & Dev Content Audit E2E Tests (REC 5.6)
 *
 * Covers: Audit Log page, filters, entries, Dev Content Audit page,
 * summary cards, and dev audit filters.
 */

test.describe('Admin — Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Audit Log page loads with table', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/audit-log');
    await page.waitForSelector('.audit-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Header
    await expect(page.locator('h1').filter({ hasText: 'Audit Log' })).toBeVisible();

    // Table is visible
    const table = page.locator('.audit-table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Table has expected column headers
    await expect(table.locator('th').filter({ hasText: 'Action' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Target Type' })).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('audit log filters render and are usable', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/audit-log');
    await page.waitForSelector('.audit-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Action type filter (select)
    const actionSelect = page.locator('.audit-select').first();
    await expect(actionSelect).toBeVisible();

    // Target type filter (select)
    const targetTypeSelect = page.locator('.audit-select').nth(1);
    await expect(targetTypeSelect).toBeVisible();

    // Admin email filter (input)
    const adminInput = page.locator('.audit-input');
    await expect(adminInput).toBeVisible();

    // Apply button
    const applyBtn = page.locator('.audit-btn').filter({ hasText: 'Apply' });
    await expect(applyBtn).toBeVisible();

    // Select an action filter and apply
    await actionSelect.selectOption('config_changed');
    await applyBtn.click();
    await page.waitForTimeout(500);
    await waitForContentLoad(page);

    expect(errors).toHaveLength(0);
  });

  test('at least 1 audit entry is visible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/audit-log');
    await page.waitForSelector('.audit-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Wait for entries to load
    await page.waitForTimeout(1500);

    // Check that there is at least 1 row in the table
    const rows = page.locator('.audit-table tbody tr.audit-row, .audit-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Also check the total entries meta text
    const metaText = page.locator('.audit-meta');
    await expect(metaText).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

test.describe('Admin — Dev Content Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Dev Content Audit page loads with summary cards', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/dev-audit');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Summary cards section should be visible
    const summaryCards = page.locator('.audit-summary-cards');
    await expect(summaryCards).toBeVisible({ timeout: 10000 });

    // Individual status cards: Open, Acknowledged, In Progress, Resolved, Won't Fix
    await expect(summaryCards.locator('.audit-summary-card')).toHaveCount(5);

    expect(errors).toHaveLength(0);
  });

  test('Dev Audit shows 17 open issues', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/dev-audit');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(2000);

    // The Open card should show count of 17
    const openCard = page.locator('.audit-summary-card.card-open');
    await expect(openCard).toBeVisible({ timeout: 10000 });

    const openCount = openCard.locator('.audit-card-count');
    await expect(openCount).toContainText('17');

    expect(errors).toHaveLength(0);
  });

  test('Dev Audit filters (type, status, entity type) render', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/dev-audit');
    await page.waitForSelector('body', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Filter bar should have select dropdowns for audit_type, status, entity_type
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThanOrEqual(2);

    // Search input should exist
    const searchInput = page.locator('input[placeholder*="earch"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
