/**
 * Auth helpers for E2E tests.
 *
 * NOTE: Auth bypass was removed in the spoofing lockdown (2026-03-22).
 * These helpers now require real Firebase authentication or a test-specific
 * auth mechanism to be implemented for E2E testing.
 */

import { type Page, expect } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';

/**
 * Login as a test user via Firebase auth.
 * TODO: Implement Firebase test auth (service account token or emulator).
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/');

  // Click the login button to trigger Firebase SSO
  const loginBtn = page.getByRole('button', { name: /begin your ascent|login|sign in/i });
  if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginBtn.click();
  }

  // Should now be on /game or /profile after Firebase auth
  await expect(page).not.toHaveURL('/', { timeout: 10000 });
}

/**
 * Login as admin via Firebase auth. Navigates to the admin app.
 * TODO: Implement Firebase test auth for admin users.
 */
export async function loginAsAdmin(page: Page, adminUrl?: string) {
  const base = adminUrl || 'http://localhost:5174';
  await page.goto(base);

  // Should see the admin navbar after Firebase auth
  await expect(page.locator('.admin-navbar, .admin-nav-links')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate through the onboarding flow (splash → terms → profile → character → welcome).
 */
export async function completeOnboarding(page: Page) {
  // Step 1: Splash — click "Begin Your Ascent"
  const startBtn = page.getByRole('button', { name: /begin your ascent/i });
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
  }

  // Step 2: Terms — scroll to bottom and accept
  const termsCheckbox = page.getByRole('checkbox');
  if (await termsCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Scroll the terms container to bottom
    const termsContainer = page.locator('.terms-scroll-container, .legal-content');
    await termsContainer.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);
    await termsCheckbox.check();

    const acceptBtn = page.getByRole('button', { name: /accept|continue/i });
    await acceptBtn.click();
  }

  // Step 3: Profile — skip or fill
  const skipProfileBtn = page.getByRole('button', { name: /skip/i });
  if (await skipProfileBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipProfileBtn.click();
  }

  // Step 4: Character creation
  const classCard = page.locator('.class-card, [data-testid="class-card"]').first();
  if (await classCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await classCard.click();

    const nameInput = page.getByPlaceholder(/character name|name/i);
    if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nameInput.fill('E2EHero' + Math.floor(Math.random() * 10000));
    }

    const createBtn = page.getByRole('button', { name: /create|confirm/i });
    await createBtn.click();
  }

  // Step 5: Welcome — click begin
  const beginBtn = page.getByRole('button', { name: /begin|start|enter/i });
  if (await beginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await beginBtn.click();
  }

  // Wait for game to load
  await page.waitForTimeout(1000);
}
