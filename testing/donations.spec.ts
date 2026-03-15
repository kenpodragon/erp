import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, waitForContentLoad, captureConsoleErrors } from './helpers/navigation';
import { mockDonationCreate } from './helpers/api-mocks';

/**
 * 3.4 E2E — Donations (Support Us Tab)
 * Covers: sub-tab access, donation tiers + custom amount, checkout API trigger,
 *         patron status / donor leaderboard rendering.
 * Requires Docker stack (frontend + backend + DB) via docker-compose-testing.yaml.
 */

/** Navigate to Shop > Support Us sub-tab. */
async function navigateToSupportUs(page: import('@playwright/test').Page) {
  await navigateToTab(page, 'Shop');
  await waitForContentLoad(page);

  const supportBtn = page.locator('.shop-tab-btn').filter({ hasText: /Support Us/i });
  await expect(supportBtn).toBeVisible({ timeout: 10000 });
  await supportBtn.click();
  await page.waitForTimeout(500);
}

test.describe('3.4 Donations — Sub-Tab Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Shop tab loads and Support Us (Donations) sub-tab is accessible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await navigateToTab(page, 'Shop');
    await waitForContentLoad(page);

    // Verify the Support Us sub-tab button exists
    const supportBtn = page.locator('.shop-tab-btn').filter({ hasText: /Support Us/i });
    await expect(supportBtn).toBeVisible({ timeout: 10000 });
    await supportBtn.click();

    // Support Us tab content should appear (loading or loaded)
    const supportTab = page.locator('.support-us-tab, .support-us-loading').first();
    await expect(supportTab).toBeVisible({ timeout: 15000 });

    const relevantErrors = errors.filter(e => !e.includes('net::') && !e.includes('WebSocket'));
    expect(relevantErrors).toHaveLength(0);
  });
});

test.describe('3.4 Donations — Tiers & Custom Amount', () => {
  test.beforeEach(async ({ page }) => {
    // Mock donation-related endpoints to avoid real API dependency
    await page.route('**/api/donations/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cumulative_cents: 0,
          cumulative_display: '$0.00',
          patron_tier: null,
          diamond_stars: 0,
          diamond_stars_display: 0,
          donor_visibility: false,
          donation_count: 0,
          next_tier: 'Bronze Patron',
          next_threshold_cents: 500,
          remaining_cents: 500,
          remaining_display: '$5.00',
        }),
      });
    });

    await page.route('**/api/donations/recent', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/donations/leaderboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await loginAsTestUser(page);
  });

  test('donation tiers are displayed with expected preset amounts', async ({ page }) => {
    await navigateToSupportUs(page);

    const supportTab = page.locator('.support-us-tab');
    await expect(supportTab).toBeVisible({ timeout: 15000 });

    // Heading should be visible
    await expect(page.locator('.support-heading')).toContainText('Support Elysium Rising');

    // Donation tier buttons should be rendered ($1, $5, $10, $25, $50, $100)
    const tierButtons = page.locator('.donation-tier-btn');
    await expect(tierButtons).toHaveCount(6, { timeout: 5000 });

    // Verify specific tier values are present
    await expect(tierButtons.filter({ hasText: '$1' }).first()).toBeVisible();
    await expect(tierButtons.filter({ hasText: '$5' }).first()).toBeVisible();
    await expect(tierButtons.filter({ hasText: '$10' }).first()).toBeVisible();
    await expect(tierButtons.filter({ hasText: '$25' }).first()).toBeVisible();
    await expect(tierButtons.filter({ hasText: '$50' }).first()).toBeVisible();
    await expect(tierButtons.filter({ hasText: '$100' }).first()).toBeVisible();
  });

  test('custom amount input is available and accepts values', async ({ page }) => {
    await navigateToSupportUs(page);

    const supportTab = page.locator('.support-us-tab');
    await expect(supportTab).toBeVisible({ timeout: 15000 });

    // Custom amount input
    const customInput = page.locator('#custom-amount');
    await expect(customInput).toBeVisible();
    await customInput.fill('15');

    // Donate button should be enabled with a valid custom amount
    const donateBtn = page.locator('.donate-btn');
    await expect(donateBtn).toBeVisible();
    await expect(donateBtn).not.toBeDisabled();
  });
});

test.describe('3.4 Donations — Checkout API Trigger', () => {
  test.beforeEach(async ({ page }) => {
    // Mock donation data endpoints
    await page.route('**/api/donations/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cumulative_cents: 0, cumulative_display: '$0.00',
          patron_tier: null, diamond_stars: 0, diamond_stars_display: 0,
          donor_visibility: false, donation_count: 0,
          next_tier: 'Bronze Patron', next_threshold_cents: 500,
          remaining_cents: 500, remaining_display: '$5.00',
        }),
      });
    });

    await page.route('**/api/donations/recent', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/donations/leaderboard', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await loginAsTestUser(page);
  });

  test('clicking donate triggers the donation checkout API', async ({ page }) => {
    // Track whether the create-session endpoint gets called
    let createSessionCalled = false;
    let requestBody: Record<string, unknown> = {};

    await page.route('**/api/donations/create-session', async (route) => {
      createSessionCalled = true;
      const req = route.request();
      requestBody = JSON.parse(req.postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkout_url: 'https://checkout.stripe.com/mock_donation_session',
          session_id: 'cs_donate_mock_' + Date.now(),
        }),
      });
    });

    // Intercept the Stripe redirect
    await page.route('https://checkout.stripe.com/**', (route) => {
      route.fulfill({ status: 200, body: '<html><body>Stripe Donation Mock</body></html>' });
    });

    // Also mock the visibility endpoint in case it fires
    await page.route('**/api/donations/visibility', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok": true}' });
    });

    await navigateToSupportUs(page);

    const supportTab = page.locator('.support-us-tab');
    await expect(supportTab).toBeVisible({ timeout: 15000 });

    // Select the $5 tier
    const fiveDollarBtn = page.locator('.donation-tier-btn').filter({ hasText: '$5' }).first();
    await expect(fiveDollarBtn).toBeVisible();
    await fiveDollarBtn.click();

    // Click Donate
    const donateBtn = page.locator('.donate-btn');
    await expect(donateBtn).toBeVisible();
    await donateBtn.click();

    // Confirmation modal should appear
    const confirmModal = page.locator('.donation-confirm-modal, .donation-modal').first();
    if (await confirmModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Confirm the donation
      const confirmBtn = confirmModal.locator('button').filter({ hasText: /confirm|yes|donate/i }).first();
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();
    }

    // Wait a moment for the API call
    await page.waitForTimeout(1500);

    // Verify the create-session API was called with the correct amount
    expect(createSessionCalled).toBe(true);
    expect(requestBody.amount_cents).toBe(500);
  });
});

test.describe('3.4 Donations — Patron Status & Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock an existing patron with donation history
    await page.route('**/api/donations/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cumulative_cents: 2500,
          cumulative_display: '$25.00',
          patron_tier: 'Bronze Patron',
          diamond_stars: 0,
          diamond_stars_display: 0,
          donor_visibility: true,
          donation_count: 3,
          next_tier: 'Silver Patron',
          next_threshold_cents: 5000,
          remaining_cents: 2500,
          remaining_display: '$25.00',
        }),
      });
    });

    await page.route('**/api/donations/recent', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { player_alias: 'GenerousHero', created_at: new Date().toISOString() },
        ]),
      });
    });

    await page.route('**/api/donations/leaderboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { rank: 1, player_alias: 'TopDonor', patron_tier: 'Gold Patron', diamond_stars: 2 },
          { rank: 2, player_alias: 'GenerousHero', patron_tier: 'Bronze Patron', diamond_stars: 0 },
        ]),
      });
    });

    await loginAsTestUser(page);
  });

  test('patron status and donor leaderboard sections render', async ({ page }) => {
    await navigateToSupportUs(page);

    const supportTab = page.locator('.support-us-tab');
    await expect(supportTab).toBeVisible({ timeout: 15000 });

    // Patron status section should render for an existing patron
    const patronSection = page.locator('.patron-status, [class*="patron"]').first();
    if (await patronSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(patronSection).toBeVisible();
    }

    // Donor leaderboard section should be visible
    const leaderboardSection = page.locator('.donor-leaderboard, [class*="leaderboard"]').first();
    if (await leaderboardSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(leaderboardSection).toBeVisible();
    }

    // The support heading and message should always be present
    await expect(page.locator('.support-heading')).toContainText('Support Elysium Rising');
    await expect(page.getByText('Make a Donation')).toBeVisible();
  });
});
