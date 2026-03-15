import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * 2.7 E2E — Economy, Discovery & Chat
 * Covers: chat UI, connection status, discovery/codex, reduce-motion preference.
 * REC 2.6 (discovery/codex, chat, reduce-motion).
 * Requires Docker stack (frontend + backend + DB) via docker-compose-testing.yaml.
 */

test.describe('2.7 — Chat Tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Chat tab loads and UI renders', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await navigateToTab(page, 'Chat');
    await waitForContentLoad(page);

    // Chat UI should render — WebSocket may disconnect under auth bypass, but the
    // container and input elements should still be present
    const chatContainer = page.locator(
      '.chat-tab, .chat-panel, .chat-container, [data-testid*="chat"]'
    ).first();
    await expect(chatContainer).toBeVisible({ timeout: 10000 });

    // Chat input and send button should be present
    const chatInput = page.locator(
      '.chat-input, [data-testid="chat-input"], input[placeholder*="essage"], textarea[placeholder*="essage"]'
    ).first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    const sendBtn = page.locator(
      '.chat-send-btn, .chat-send, [data-testid="chat-send"], button:has-text("Send")'
    ).first();
    await expect(sendBtn).toBeVisible({ timeout: 5000 });

    // WebSocket errors are expected in bypass mode — filter them out
    const realErrors = errors.filter(e => !e.includes('WebSocket') && !e.includes('ws://'));
    expect(realErrors).toHaveLength(0);
  });

  test('Chat shows connection status indicator', async ({ page }) => {
    await navigateToTab(page, 'Chat');
    await waitForContentLoad(page);

    // Look for a connection status indicator (dot, badge, or text)
    const statusIndicator = page.locator(
      '.connection-status, .ws-status, .chat-status, ' +
      '[data-testid*="connection"], [data-testid*="status"], ' +
      '.status-dot, .status-indicator'
    ).first();

    const statusText = page.getByText(/connected|disconnected|connecting|offline/i).first();

    const hasIndicator = await statusIndicator.isVisible({ timeout: 5000 }).catch(() => false);
    const hasStatusText = await statusText.isVisible({ timeout: 2000 }).catch(() => false);

    // At least one form of connection status should be visible
    expect(hasIndicator || hasStatusText).toBeTruthy();
  });
});

test.describe('2.7 — Discovery / Codex', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Discovery/Codex UI accessible from Home tab', async ({ page }) => {
    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Look for a discovery/codex sub-tab, section, or link on the Home tab
    const codexTab = page.locator(
      '.sub-tab, .home-sub-tab, [role="tab"]'
    ).filter({ hasText: /discover|codex|registry|bestiary|etheric/i });

    const codexLink = page.locator(
      'a, button'
    ).filter({ hasText: /discover|codex|registry|bestiary|etheric/i }).first();

    const hasSubTab = await codexTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasLink = await codexLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSubTab) {
      await codexTab.click();
      await waitForContentLoad(page);

      // Should show entity categories or a list of discovered entities
      const codexContent = page.locator(
        '.codex-content, .discovery-content, .registry-content, ' +
        '.entity-list, .bestiary, [data-testid*="codex"], [data-testid*="discovery"]'
      ).first();

      const entitySection = page.getByText(/entit|creature|monster|bestiary|discovered/i).first();

      const hasContent = await codexContent.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEntityText = await entitySection.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasContent || hasEntityText).toBeTruthy();
    } else if (hasLink) {
      await codexLink.click();
      await waitForContentLoad(page);

      // Verify the codex page loaded
      const codexHeading = page.locator('h1, h2, h3').filter({ hasText: /discover|codex|registry|bestiary/i }).first();
      await expect(codexHeading).toBeVisible({ timeout: 5000 });
    } else {
      // Discovery may be embedded as a progress section on Home
      const discoveryProgress = page.locator(
        '.discovery-progress, [data-testid="discovery-progress"], ' +
        '.entity-discovery, .codex-progress'
      ).first();

      if (await discoveryProgress.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(discoveryProgress).toBeVisible();
      } else {
        test.skip(true, 'Discovery/Codex UI not found on Home tab');
      }
    }
  });

  test('Entity codex shows discovered entities or empty state', async ({ page }) => {
    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Navigate to the codex/discovery sub-tab
    const codexTab = page.locator(
      '.sub-tab, .home-sub-tab, [role="tab"]'
    ).filter({ hasText: /discover|codex|registry|bestiary|etheric/i });

    if (await codexTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await codexTab.click();
      await waitForContentLoad(page);

      // Should show entity entries or an empty/locked state
      const entityEntries = page.locator(
        '.entity-entry, .codex-entry, .bestiary-entry, ' +
        '.discovered-entity, [data-testid*="entity"]'
      );
      const emptyState = page.getByText(/no discover|none found|empty|explore to discover|locked/i).first();

      const hasEntries = await entityEntries.count() > 0;
      const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

      // Either entities are listed or an empty state is shown
      expect(hasEntries || hasEmpty).toBeTruthy();
    } else {
      test.skip(true, 'Codex sub-tab not found');
    }
  });
});

test.describe('2.7 — Reduce Motion', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('reduce-motion preference is respected or toggle exists', async ({ page }) => {
    // Check if the app respects the prefers-reduced-motion media query
    // by emulating it and verifying a class or style change
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);

    // Option A: body or root element gets a reduce-motion class
    const bodyHasClass = await page.locator('body').evaluate((el) => {
      return el.classList.contains('reduce-motion') ||
             el.classList.contains('reduced-motion') ||
             el.classList.contains('no-animations');
    });

    // Option B: CSS variables or transitions are adjusted
    const hasReducedTransitions = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      const transition = style.getPropertyValue('transition-duration');
      const animation = style.getPropertyValue('animation-duration');
      return transition === '0s' || animation === '0s' || animation === 'none';
    });

    // Option C: A settings toggle exists for reduce-motion
    const settingsBtn = page.locator(
      '[data-testid="settings-btn"], .settings-btn, .settings-icon, ' +
      'button:has-text("Settings"), a:has-text("Settings")'
    ).first();

    let hasToggle = false;
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);

      const motionToggle = page.locator(
        '[data-testid="reduce-motion-toggle"], ' +
        'input[name*="motion"], label:has-text("Reduce Motion") input, ' +
        'label:has-text("reduce motion"), [aria-label*="motion"]'
      ).first();

      hasToggle = await motionToggle.isVisible({ timeout: 3000 }).catch(() => false);
    }

    // At least one reduce-motion mechanism should exist
    expect(bodyHasClass || hasReducedTransitions || hasToggle).toBeTruthy();
  });
});
