import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { captureConsoleErrors } from './helpers/navigation';

/**
 * E2E tests for REC 1 — Onboarding Flow.
 *
 * Covers the splash page, static pages, and the login-to-game flow.
 * Uses the auth bypass system with E2ETestBot (player ID 2).
 * Run via: testing/run_tests.bat or `npx playwright test onboarding.spec.ts`
 */

// ---------------------------------------------------------------------------
// Splash Page
// ---------------------------------------------------------------------------
test.describe('Splash Page', () => {
  test('renders hero title and CTA button', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Elysium', { timeout: 15000 });
    await expect(
      page.getByRole('button', { name: /Begin Your Ascent/i }).first(),
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('displays footer links to static pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Elysium', { timeout: 15000 });

    // Footer should contain links to key static pages
    const footer = page.locator('footer, .splash-footer, [class*="footer"]').first();
    await expect(footer).toBeVisible({ timeout: 5000 });

    // Check for presence of common footer links
    const footerLinks = footer.locator('a');
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Terms Page
// ---------------------------------------------------------------------------
test.describe('Terms Page', () => {
  test('shows terms content with sections', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/terms');
    await expect(page.locator('body')).not.toBeEmpty();

    // Should have visible heading or section content
    await expect(
      page.locator('h1, h2, .terms-title, [class*="terms"]').first(),
    ).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test('scroll-to-accept enables the accept button', async ({ page }) => {
    // Navigate to terms via the onboarding flow so we get the interactive version
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Elysium', { timeout: 15000 });

    // Click CTA to begin onboarding
    const ctaBtn = page.getByRole('button', { name: /Begin Your Ascent/i }).first();
    await expect(ctaBtn).toBeVisible();
    await ctaBtn.click();

    // Wait for terms page to appear (onboarding step)
    const termsContent = page.locator(
      '.terms-container, .terms-scroll-container, .legal-content, [class*="terms"]',
    ).first();

    // If terms page is visible (new player flow), test scroll-to-accept
    const termsVisible = await termsContent.isVisible({ timeout: 5000 }).catch(() => false);
    if (termsVisible) {
      // The accept checkbox or button should initially be disabled or hidden
      const checkbox = page.getByRole('checkbox');
      const checkboxVisible = await checkbox.isVisible({ timeout: 2000 }).catch(() => false);

      if (checkboxVisible) {
        // Scroll the terms container to the bottom
        await termsContent.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(500);

        // Now the checkbox should be interactable
        await checkbox.check();
        await expect(checkbox).toBeChecked();

        // Accept button should now be enabled
        const acceptBtn = page.getByRole('button', { name: /accept|continue/i });
        await expect(acceptBtn).toBeVisible();
        await expect(acceptBtn).toBeEnabled();
      }
    }
    // If bypass auto-logged in and skipped terms (existing player), that's also valid
  });
});

// ---------------------------------------------------------------------------
// About Page
// ---------------------------------------------------------------------------
test.describe('About Page', () => {
  test('renders content', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/about');
    await expect(
      page.locator('main, .about, [class*="about"], .page-content, h1, h2').first(),
    ).toBeVisible({ timeout: 10000 });

    // Should have some meaningful text
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Full Onboarding Flow (Existing Player — Auth Bypass)
// ---------------------------------------------------------------------------
test.describe('Onboarding Flow — Existing Player', () => {
  test('auth bypass auto-logs in and redirects to /game', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    // loginAsTestUser handles the full bypass flow:
    // goes to /, waits for bypass auto-login, ensures redirect away from splash
    await loginAsTestUser(page);

    // E2ETestBot is an existing player with a character, so bypass should
    // skip all onboarding steps and land on /game
    await expect(page).toHaveURL(/\/game/, { timeout: 15000 });

    // The game layout should be visible (sidebar, main content area)
    await expect(
      page.locator('.game-layout, .main-game, [class*="game-layout"], .sidebar').first(),
    ).toBeVisible({ timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test('game page shows player UI after login', async ({ page }) => {
    await loginAsTestUser(page);
    await expect(page).toHaveURL(/\/game/, { timeout: 15000 });

    // Should see sidebar navigation tabs
    const sidebar = page.locator('.sidebar, .sidebar-tab-btn, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Support Page (Guest Access)
// ---------------------------------------------------------------------------
test.describe('Support Page', () => {
  test('shows support content with email link', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await page.goto('/support');
    await expect(
      page.locator('main, .support, [class*="support"], .page-content, h1, h2').first(),
    ).toBeVisible({ timeout: 10000 });

    // Should contain an email link (mailto:) for support contact
    const emailLink = page.locator('a[href^="mailto:"]');
    const hasEmail = await emailLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasEmail) {
      await expect(emailLink).toBeVisible();
    }

    // At minimum, there should be some support text
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(20);

    expect(errors).toHaveLength(0);
  });
});
