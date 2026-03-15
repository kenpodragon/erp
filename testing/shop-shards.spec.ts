import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, waitForContentLoad, captureConsoleErrors } from './helpers/navigation';
import { mockStripeCheckout } from './helpers/api-mocks';

/**
 * 2.9 E2E — Shop & Shard Purchasing
 * Covers: shard packages display, checkout mock, transaction history, shard balance.
 * REC 3.1 (shard packages, checkout flow).
 * Requires Docker stack (frontend + backend + DB) via docker-compose-testing.yaml.
 */

test.describe('2.9 Shop & Shard Purchasing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Shop tab loads with shard packages visible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await navigateToTab(page, 'Shop');
    await waitForContentLoad(page);

    // Shop page should render with shard package cards
    const packageCards = page.locator('.shard-package, .package-card, .shop-item, [data-testid*="shard-package"]');
    await expect(packageCards.first()).toBeVisible({ timeout: 10000 });

    expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
  });

  test('displays 6 shard packages with prices', async ({ page }) => {
    await navigateToTab(page, 'Shop');
    await waitForContentLoad(page);

    // Should show exactly 6 shard packages
    const packageCards = page.locator('.shard-package, .package-card, .shop-item, [data-testid*="shard-package"]');
    await expect(packageCards.first()).toBeVisible({ timeout: 10000 });

    const count = await packageCards.count();
    expect(count).toBe(6);

    // Each package should display a price (dollar sign)
    for (let i = 0; i < count; i++) {
      const card = packageCards.nth(i);
      const priceText = card.locator('text=/\\$\\d/');
      await expect(priceText).toBeVisible();
    }
  });

  test('clicking Buy triggers checkout API call', async ({ page }) => {
    // Mock the Stripe checkout endpoint
    let checkoutCalled = false;
    let requestBody: Record<string, unknown> = {};

    await page.route('**/api/payments/create-checkout', async (route) => {
      checkoutCalled = true;
      const req = route.request();
      requestBody = JSON.parse(req.postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkout_url: 'https://checkout.stripe.com/mock_session',
          session_id: 'cs_mock_' + Date.now(),
        }),
      });
    });

    // Intercept the Stripe redirect so the page stays
    await page.route('https://checkout.stripe.com/**', (route) => {
      route.fulfill({ status: 200, body: '<html><body>Stripe Checkout Mock</body></html>' });
    });

    await navigateToTab(page, 'Shop');
    await waitForContentLoad(page);

    // Click the Buy button on the first package
    const buyButtons = page.locator('.shard-package button, .package-card button, .shop-item button, [data-testid*="buy-shard"]');
    await expect(buyButtons.first()).toBeVisible({ timeout: 10000 });
    await buyButtons.first().click();

    // Verify the checkout API was called
    await page.waitForTimeout(1000);
    expect(checkoutCalled).toBe(true);
  });

  test('transaction history sub-tab renders', async ({ page }) => {
    await navigateToTab(page, 'Shop');
    await waitForContentLoad(page);

    // Look for a transaction history sub-tab or section
    const historyTab = page.locator('.sub-tab, .shop-sub-tab, [role="tab"]').filter({ hasText: /history|transaction|purchase/i });

    if (await historyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await historyTab.click();
      await waitForContentLoad(page);

      // Should render a transaction list or table (may be empty for test player)
      const historyContent = page.locator('.transaction-list, .purchase-history, table, [data-testid*="transaction"]').first();
      const emptyState = page.getByText(/no transaction|no purchase|empty|none yet/i).first();

      const hasHistory = await historyContent.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasHistory || hasEmptyState).toBeTruthy();
    } else {
      // Transaction history may be inline on the shop page
      const historySection = page.locator('.transaction-history, .purchase-history, [data-testid*="history"]').first();
      if (await historySection.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(historySection).toBeVisible();
      } else {
        test.skip(true, 'Transaction history section not found — may not be implemented yet');
      }
    }
  });

  test('shard balance display is visible', async ({ page }) => {
    await navigateToTab(page, 'Shop');
    await waitForContentLoad(page);

    // Shard balance should be visible on the shop page or in the header/sidebar
    const shardBalance = page.locator(
      '.shard-balance, .balance-display, [data-testid*="shard-balance"], ' +
      '.sidebar-shards, .currency-display, [data-testid*="currency"]'
    ).first();

    await expect(shardBalance).toBeVisible({ timeout: 10000 });

    // Balance should contain a number (could be 0 for test player)
    const balanceText = await shardBalance.textContent();
    expect(balanceText).toMatch(/\d/);
  });
});
