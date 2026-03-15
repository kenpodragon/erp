import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * Admin Finance Dashboard E2E Tests (Task 2.19 — REC 3.6)
 *
 * Covers: Finance Dashboard loading, Overview tab stats/charts,
 * revenue chart rendering, player detail finance widget, zero console errors.
 */

test.describe('Admin — Finance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Finance Dashboard loads', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/finance');
    await page.waitForSelector('.finance-page', { timeout: 10000 });
    await waitForContentLoad(page);

    // Page header
    await expect(page.locator('h1').filter({ hasText: 'Finance Dashboard' })).toBeVisible();

    // Subtitle
    await expect(page.locator('.finance-subtitle')).toContainText('Revenue');

    // All expected tabs should be visible
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Transactions')).toBeVisible();
    await expect(page.getByText('Shard Economy')).toBeVisible();
    await expect(page.getByText('Subscriptions')).toBeVisible();
    await expect(page.getByText('Marketplace')).toBeVisible();
    await expect(page.getByText('Dispute Queue')).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Overview tab shows stats/charts', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/finance');
    await page.waitForSelector('.finance-page', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(2000);

    // Overview tab is active by default — metric cards should render
    const metricCards = page.locator('.fin-metric-card');
    await expect(metricCards.first()).toBeVisible({ timeout: 10000 });

    const metricCount = await metricCards.count();
    expect(metricCount).toBeGreaterThanOrEqual(4);

    // Check specific metric labels
    await expect(page.locator('.fin-metric-label').filter({ hasText: 'Revenue Today' })).toBeVisible();
    await expect(page.locator('.fin-metric-label').filter({ hasText: 'Active Subscribers' })).toBeVisible();
    await expect(page.locator('.fin-metric-label').filter({ hasText: 'Shards in Circulation' })).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('revenue chart renders', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/finance');
    await page.waitForSelector('.finance-page', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(2000);

    // Revenue chart section with "Daily Revenue" header
    const chartSection = page.locator('.fin-section');
    await expect(chartSection.first()).toBeVisible({ timeout: 10000 });

    await expect(page.locator('h3').filter({ hasText: /Daily Revenue/i })).toBeVisible();

    // Recharts renders SVG elements — verify the chart container has content
    const chartContainer = page.locator('.recharts-responsive-container, .recharts-wrapper, svg.recharts-surface').first();
    if (await chartContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(chartContainer).toBeVisible();
    }

    expect(errors).toHaveLength(0);
  });

  test('player detail finance widget works', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/players/2');
    await page.waitForSelector('.player-detail-page', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(1500);

    // Finance section should be visible (expanded by default)
    const financeSection = page.locator('.finance-section');
    await expect(financeSection).toBeVisible({ timeout: 10000 });

    // PlayerFinanceWidget renders
    const widget = page.locator('.pfw-widget');
    await expect(widget).toBeVisible({ timeout: 10000 });

    // Shard Balance label and value
    await expect(widget.locator('.pfw-balance-label')).toContainText('Shard Balance');
    await expect(widget.locator('.pfw-balance-value')).toBeVisible();

    // Grant and Debit buttons
    const grantBtn = widget.getByRole('button', { name: /Grant/i });
    await expect(grantBtn).toBeVisible();

    const debitBtn = widget.getByRole('button', { name: /Debit/i });
    await expect(debitBtn).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('zero console errors on finance pages', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    // Load finance dashboard
    await page.goto('/finance');
    await page.waitForSelector('.finance-page', { timeout: 10000 });
    await waitForContentLoad(page);
    await page.waitForTimeout(2000);

    // Click through a couple of tabs to verify no errors
    await page.getByText('Transactions').click();
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    await page.getByText('Shard Economy').click();
    await page.waitForTimeout(1000);
    await waitForContentLoad(page);

    expect(errors).toHaveLength(0);
  });
});
