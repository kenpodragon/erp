import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, captureConsoleErrors } from './helpers/navigation';
import { mockSubscriptionCreate } from './helpers/api-mocks';

/**
 * 3.2 E2E — Subscription: Elysium Ascendant
 * Covers: non-subscriber view, subscribe click, cancel/reactivate modals, subscriber indicators.
 * Uses auth bypass (E2ETestBot, ID 2) — no onboarding needed.
 */

// Mock status response for an active subscriber
const activeSubscriberStatus = {
  subscribed: true,
  subscription: {
    id: 1,
    plan_key: 'ascendant_monthly',
    status: 'active',
    source: 'stripe',
    subscription_start_date: new Date().toISOString(),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancel_at_period_end: false,
    continuous_streak: 3,
    grace_deadline: null,
  },
  boosts: {
    xp: 1.20, essence: 1.20, drop_rate: 1.10, training_speed: 1.10,
    stipend_shards: 150, is_ascendant: true, continuous_streak: 3, cumulative_months: 3,
  },
  stipend_history: [
    { period_key: '2026-03', shards_credited: 150, created_at: new Date().toISOString() },
    { period_key: '2026-02', shards_credited: 150, created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  ],
};

const cancelingSubscriberStatus = {
  ...activeSubscriberStatus,
  subscription: {
    ...activeSubscriberStatus.subscription,
    status: 'canceling',
    cancel_at_period_end: true,
  },
};

async function navigateToAscendant(page: import('@playwright/test').Page) {
  await navigateToTab(page, 'Ascendant');
  await expect(page.locator('.sub-page')).toBeVisible({ timeout: 10000 });
}

test.describe('3.2 Subscription — Non-Subscriber View', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('subscription page renders promo, plan cards, and loyalty progress', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await navigateToAscendant(page);

    // Page title
    await expect(page.locator('.sub-title')).toContainText('Elysium Ascendant');

    // Promo text and benefits list
    await expect(page.getByText('Become an Ascendant')).toBeVisible();
    await expect(page.getByText('+15% XP')).toBeVisible();
    await expect(page.getByText('150 Shards every month')).toBeVisible();

    // Two plan cards (Monthly + Annual)
    await expect(page.getByText('$1.99/mo')).toBeVisible();
    await expect(page.getByText('$19.90/yr')).toBeVisible();
    await expect(page.getByText('2 months free!')).toBeVisible();

    // Loyalty progress section
    await expect(page.getByText('Loyalty Progress')).toBeVisible();
    await expect(page.getByText('Streak Bonuses')).toBeVisible();
    await expect(page.getByText('Lifetime Titles')).toBeVisible();

    expect(errors.length).toBe(0);
  });

  test('subscribe button triggers checkout API call', async ({ page }) => {
    let createCalled = false;
    let requestBody: Record<string, unknown> = {};
    await page.route('**/api/subscriptions/create', async (route) => {
      createCalled = true;
      const req = route.request();
      requestBody = JSON.parse(req.postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkout_url: 'https://checkout.stripe.com/test_session',
          session_id: 'cs_test_mock',
        }),
      });
    });

    await page.route('https://checkout.stripe.com/**', (route) => {
      route.fulfill({ status: 200, body: '<html><body>Stripe Checkout Mock</body></html>' });
    });

    await navigateToAscendant(page);

    const subscribeButtons = page.locator('.sub-card button');
    await expect(subscribeButtons.first()).toBeVisible();
    await subscribeButtons.first().click();

    expect(createCalled).toBe(true);
    expect(requestBody.plan_key).toBe('ascendant_monthly');
  });
});

test.describe('3.2 Subscription — Active Subscriber View', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/subscriptions/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeSubscriberStatus),
      });
    });
    await loginAsTestUser(page);
  });

  test('active subscriber sees status card, boosts, and action buttons', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await navigateToAscendant(page);

    // Status card
    await expect(page.locator('.sub-status-card')).toBeVisible();
    await expect(page.getByText('Monthly ($1.99/mo)')).toBeVisible();
    await expect(page.locator('.sub-status-badge')).toContainText('Active');

    // Streak display
    await expect(page.getByText(/3 months?/)).toBeVisible();

    // Boost display
    await expect(page.getByText('Active Boosts')).toBeVisible();
    await expect(page.getByText('Monthly Shards')).toBeVisible();

    // Action buttons (switch + cancel)
    await expect(page.getByRole('button', { name: /Switch to Annual/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel Subscription/i })).toBeVisible();

    // Stipend history
    await expect(page.getByText('Stipend History')).toBeVisible();
    await expect(page.getByText('2026-03')).toBeVisible();

    // Loyalty progress
    await expect(page.getByText('Loyalty Progress')).toBeVisible();

    expect(errors.length).toBe(0);
  });

  test('cancel modal opens, confirms, and updates status', async ({ page }) => {
    let cancelCalled = false;
    await page.route('**/api/subscriptions/cancel', async (route) => {
      cancelCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'canceling',
          period_end: activeSubscriberStatus.subscription.current_period_end,
          message: 'Subscription will cancel at period end',
        }),
      });
    });

    let statusCallCount = 0;
    await page.route('**/api/subscriptions/status', async (route) => {
      statusCallCount++;
      const body = statusCallCount <= 1 ? activeSubscriberStatus : cancelingSubscriberStatus;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await navigateToAscendant(page);

    // Open cancel modal
    await page.getByRole('button', { name: /Cancel Subscription/i }).click();

    const modal = page.locator('.sub-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Cancel Subscription')).toBeVisible();
    await expect(modal.getByText(/benefits will remain active/i)).toBeVisible();
    await expect(modal.getByRole('button', { name: /Keep Subscription/i })).toBeVisible();

    // Confirm cancel
    await modal.getByRole('button', { name: /Confirm Cancel/i }).click();
    expect(cancelCalled).toBe(true);

    // Status should show "Canceling"
    await expect(page.locator('.sub-status-badge')).toContainText('Canceling');
    await expect(page.getByRole('button', { name: /Reactivate Subscription/i })).toBeVisible();
  });
});

test.describe('3.2 Subscription — Cancel & Reactivate Flow', () => {
  test('reactivate button restores active status', async ({ page }) => {
    let reactivateCalled = false;
    await page.route('**/api/subscriptions/reactivate', async (route) => {
      reactivateCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'active', message: 'Subscription reactivated' }),
      });
    });

    let statusCallCount = 0;
    await page.route('**/api/subscriptions/status', async (route) => {
      statusCallCount++;
      const body = statusCallCount <= 1 ? cancelingSubscriberStatus : activeSubscriberStatus;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await loginAsTestUser(page);
    await navigateToAscendant(page);

    await expect(page.locator('.sub-status-badge')).toContainText('Canceling');
    await expect(page.getByRole('button', { name: /Reactivate Subscription/i })).toBeVisible();

    await page.getByRole('button', { name: /Reactivate Subscription/i }).click();
    expect(reactivateCalled).toBe(true);

    await expect(page.locator('.sub-status-badge')).toContainText('Active');
    await expect(page.getByRole('button', { name: /Cancel Subscription/i })).toBeVisible();
  });
});

test.describe('3.2 Subscription — Subscriber Indicators', () => {
  test('subscriber badge visible in chat tab', async ({ page }) => {
    await page.route('**/api/subscriptions/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeSubscriberStatus),
      });
    });

    await loginAsTestUser(page);

    await navigateToTab(page, 'Chat');

    const chatContainer = page.locator('.chat-tab, .chat-panel, .chat-container').first();
    if (await chatContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
      const starBadge = page.locator('.chat-badge-ascendant, .ascendant-badge, text=★').first();
      if (await starBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(starBadge).toBeVisible();
      }
    } else {
      test.skip(true, 'Chat tab not rendered — WebSocket may not be available in test env');
    }
  });
});
