/**
 * Auth helpers for E2E tests.
 *
 * Leverages the auth bypass system: the backend must have
 * ALLOW_AUTH_BYPASS=true in .env and ops.auth_bypass_enabled=true in DB.
 * The /api/config/public endpoint returns auth_bypass_available + bypass_player_id.
 * The frontend auto-detects this and uses the X-Spoof-Player-Id header.
 */

import { type Page, expect } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';

/**
 * Wait for the frontend to load, detect auth bypass from /api/config/public,
 * and auto-login as the bypass player. Waits for the game layout or profile.
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/');

  // Wait for the app to process the public config and auto-login via bypass
  // The frontend calls /api/config/public on mount, detects bypass, and calls verifyUserWithBackend
  await page.waitForTimeout(2000);

  // If we're still on splash, the bypass didn't auto-redirect — click the login button
  const loginBtn = page.getByRole('button', { name: /begin your ascent|login|sign in/i });
  if (await loginBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await loginBtn.click();
    await page.waitForTimeout(1500);
  }

  // Should now be on /game or /profile
  await expect(page).not.toHaveURL('/', { timeout: 10000 });
}

/**
 * Login as admin via bypass. Navigates to the admin app.
 */
export async function loginAsAdmin(page: Page, adminUrl?: string) {
  const base = adminUrl || 'http://localhost:5174';
  await page.goto(base);

  // Admin app also checks /api/config/public for bypass
  // The verifyBypass() function in admin App.tsx handles this
  await page.waitForTimeout(2000);

  // Should see the admin navbar if bypass worked
  await expect(page.locator('.admin-navbar, .admin-nav-links')).toBeVisible({ timeout: 10000 });
}

/**
 * Bypass the onboarding flow (splash → terms → profile → character → welcome).
 * Used when auth bypass auto-logs in but the player hasn't completed onboarding.
 *
 * This is the existing pattern from character_progression.spec.ts, extracted here.
 */
export async function bypassOnboarding(page: Page) {
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
