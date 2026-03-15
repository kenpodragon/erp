/**
 * API route interception helpers for E2E tests.
 *
 * These mock Stripe and other external services so tests don't require
 * live API keys. Pattern from subscription.spec.ts.
 */

import { type Page } from '@playwright/test';

/**
 * Mock Stripe checkout creation — returns a fake checkout URL.
 */
export async function mockStripeCheckout(page: Page) {
  await page.route('**/api/payments/create-checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkout_url: 'https://checkout.stripe.com/mock_session',
        session_id: 'cs_mock_' + Date.now(),
      }),
    });
  });
}

/**
 * Mock subscription creation — returns a fake checkout URL.
 */
export async function mockSubscriptionCreate(page: Page) {
  await page.route('**/api/subscriptions/create', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkout_url: 'https://checkout.stripe.com/mock_sub',
        session_id: 'cs_sub_mock_' + Date.now(),
      }),
    });
  });
}

/**
 * Mock subscription status — returns an active subscription.
 */
export async function mockActiveSubscription(page: Page) {
  await page.route('**/api/subscriptions/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        is_active: true,
        plan: 'monthly',
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancel_at_period_end: false,
      }),
    });
  });
}

/**
 * Mock subscription status — returns no subscription.
 */
export async function mockNoSubscription(page: Page) {
  await page.route('**/api/subscriptions/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        is_active: false,
        plan: null,
      }),
    });
  });
}

/**
 * Mock donation creation.
 */
export async function mockDonationCreate(page: Page) {
  await page.route('**/api/donations/create', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkout_url: 'https://checkout.stripe.com/mock_donation',
        session_id: 'cs_donate_mock_' + Date.now(),
      }),
    });
  });
}

/**
 * Mock all Stripe-related endpoints at once.
 */
export async function mockAllStripe(page: Page) {
  await mockStripeCheckout(page);
  await mockSubscriptionCreate(page);
  await mockNoSubscription(page);
  await mockDonationCreate(page);
}
