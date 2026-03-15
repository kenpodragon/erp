import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * E2E tests for 2.0–2.2 Story Mode (Map, Combat, Narrative, Boss, Upgrades).
 *
 * Test player: E2ETestBot (ID 2), character "TestHero" (Engineer, L1).
 * Expected state: early game content (Book 1, Chapters 1–3).
 *
 * Requires full Docker stack (frontend + backend + db).
 * Run via: npx playwright test story-mode.spec.ts --project=frontend
 */

test.describe('Story Mode — Map & Scene Entry', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Map tab shows overworld with chapter nodes', async ({ page }) => {
    await navigateToTab(page, 'Map');
    await waitForContentLoad(page);

    // Overworld wrapper should be visible
    const overworldMap = page.locator('.overworld-map-wrapper');
    await expect(overworldMap).toBeVisible({ timeout: 15000 });

    // Should render at least one chapter row with scene nodes
    const chapterRows = page.locator('.chapter-row');
    await expect(chapterRows.first()).toBeVisible({ timeout: 10000 });

    // Should have scene nodes within the chapter
    const sceneNodes = page.locator('.scene-node');
    const nodeCount = await sceneNodes.count();
    expect(nodeCount).toBeGreaterThan(0);

    // Map title should be present
    await expect(page.locator('.map-title')).toContainText('Towers of Elysium');
  });

  test('clicking a scene node opens the info panel with enter button', async ({ page }) => {
    await navigateToTab(page, 'Map');
    await waitForContentLoad(page);

    // Find an unlocked scene node (not locked)
    const availableNode = page.locator('.scene-node:not(.locked)').first();
    await expect(availableNode).toBeVisible({ timeout: 10000 });
    await availableNode.click();

    // ChapterInfoPanel should appear
    const infoPanel = page.locator('.chapter-info-panel');
    await expect(infoPanel).toBeVisible({ timeout: 5000 });

    // Should have an "Enter Story Mode" or boss challenge button
    const enterBtn = page.locator('.enter-scene-btn');
    await expect(enterBtn).toBeVisible();
    const btnText = await enterBtn.textContent();
    expect(btnText).toMatch(/Enter Story Mode|Challenge.*Boss/i);
  });

  test('starting a scene loads Story Mode with combat or narrative', async ({ page }) => {
    await navigateToTab(page, 'Map');
    await waitForContentLoad(page);

    // Click an available non-boss scene node
    const sceneNode = page.locator('.scene-node:not(.locked):not(.scene-node--boss)').first();
    await expect(sceneNode).toBeVisible({ timeout: 10000 });
    await sceneNode.click();

    // Click Enter Story Mode
    const enterBtn = page.locator('.enter-scene-btn');
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();

    // Story Mode container should load — either normal or boss variant
    const storyMode = page.locator('.story-mode');
    await expect(storyMode).toBeVisible({ timeout: 15000 });

    // At least one of combat stage or narrative block should be visible
    const combatStage = page.locator('.combat-stage-wrap');
    const narrativeBlock = page.locator('.narrative-block');
    const hasCombat = await combatStage.isVisible().catch(() => false);
    const hasNarrative = await narrativeBlock.isVisible().catch(() => false);
    expect(hasCombat || hasNarrative).toBeTruthy();
  });
});

test.describe('Story Mode — Key UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Enter a story scene for all tests in this group
    await navigateToTab(page, 'Map');
    await waitForContentLoad(page);

    const sceneNode = page.locator('.scene-node:not(.locked):not(.scene-node--boss)').first();
    await expect(sceneNode).toBeVisible({ timeout: 10000 });
    await sceneNode.click();

    const enterBtn = page.locator('.enter-scene-btn');
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();

    await expect(page.locator('.story-mode')).toBeVisible({ timeout: 15000 });
  });

  test('shows gold counter, skills hotbar, upgrade menu, and hero stats', async ({ page }) => {
    // Gold odometer
    const goldOdometer = page.locator('.gold-odometer');
    await expect(goldOdometer).toBeVisible({ timeout: 10000 });

    // Skills hotbar
    const skillsHotbar = page.locator('.skills-hotbar');
    await expect(skillsHotbar.first()).toBeVisible({ timeout: 10000 });

    // Upgrade menu
    const upgradeMenu = page.locator('.upgrade-menu');
    await expect(upgradeMenu).toBeVisible({ timeout: 10000 });

    // Hero stats panel
    const heroStats = page.locator('.hero-stats');
    await expect(heroStats).toBeVisible({ timeout: 10000 });
    // Verify it shows the COMBAT STATS title
    await expect(page.locator('.hero-stats-title')).toContainText('COMBAT STATS');
  });

  test('narrative progress shows with WPM text reveal', async ({ page }) => {
    // Narrative block should display paragraphs
    const narrativeBlock = page.locator('.narrative-block');
    const hasNarrative = await narrativeBlock.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasNarrative) {
      // At least one paragraph should be visible
      const paragraphs = page.locator('.narrative-paragraph');
      await expect(paragraphs.first()).toBeVisible({ timeout: 10000 });

      // WPM slider control should exist in narrative controls
      const wpmSlider = page.locator('.wpm-slider-wrap');
      await expect(wpmSlider).toBeVisible({ timeout: 5000 });

      // The "incoming" indicator or "End of Scene Narrative" tag eventually appears
      const incoming = page.locator('.narrative-incoming, .narrative-complete-tag');
      await expect(incoming).toBeVisible({ timeout: 30000 });
    } else {
      // Scene may be previously completed (narrative auto-skipped)
      // Verify story mode is still running
      await expect(page.locator('.story-mode')).toBeVisible();
    }
  });

  test('global header shows chapter breadcrumb', async ({ page }) => {
    const globalHeader = page.locator('.story-global-header');
    await expect(globalHeader).toBeVisible({ timeout: 10000 });

    // Breadcrumb with chapter and scene labels
    const breadcrumb = page.locator('.story-header-breadcrumb');
    await expect(breadcrumb).toBeVisible();

    const chapterLabel = page.locator('.breadcrumb-chapter');
    await expect(chapterLabel).toBeVisible();
    const chapterText = await chapterLabel.textContent();
    expect(chapterText).toBeTruthy();
    expect(chapterText!.length).toBeGreaterThan(0);

    const sceneLabel = page.locator('.breadcrumb-scene');
    await expect(sceneLabel).toBeVisible();
  });
});

test.describe('Story Mode — Scene Completion', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('post-battle summary appears after scene completion', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes — combat runs in real time

    await navigateToTab(page, 'Map');
    await waitForContentLoad(page);

    const sceneNode = page.locator('.scene-node:not(.locked):not(.scene-node--boss)').first();
    await expect(sceneNode).toBeVisible({ timeout: 10000 });
    await sceneNode.click();

    const enterBtn = page.locator('.enter-scene-btn');
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();

    await expect(page.locator('.story-mode')).toBeVisible({ timeout: 15000 });

    // Wait for the post-battle summary to appear (combat + narrative must both complete)
    const postBattle = page.locator('.post-battle-backdrop');
    await expect(postBattle).toBeVisible({ timeout: 120000 });

    // Should show "SCENE COMPLETE" or "DREAM FORGE" title
    const title = page.locator('.post-battle-title');
    await expect(title).toBeVisible();
    const titleText = await title.first().textContent();
    expect(titleText).toMatch(/SCENE COMPLETE|DREAM FORGE/i);

    // Should show gold earned stat
    await expect(page.locator('.post-battle-stat-value--gold').first()).toBeVisible({ timeout: 5000 });
  });

  test('can return to hub from post-battle summary', async ({ page }) => {
    test.setTimeout(180000);

    await navigateToTab(page, 'Map');
    await waitForContentLoad(page);

    const sceneNode = page.locator('.scene-node:not(.locked):not(.scene-node--boss)').first();
    await expect(sceneNode).toBeVisible({ timeout: 10000 });
    await sceneNode.click();

    const enterBtn = page.locator('.enter-scene-btn');
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();

    await expect(page.locator('.story-mode')).toBeVisible({ timeout: 15000 });

    // Wait for post-battle summary
    const postBattle = page.locator('.post-battle-backdrop');
    await expect(postBattle).toBeVisible({ timeout: 120000 });

    // Handle any dropped items first (if Dream Forge is shown)
    const dreamForge = page.locator('.post-battle-title:has-text("DREAM FORGE")');
    if (await dreamForge.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Handle loot items — click keep or dismiss for each
      const lootBtns = page.locator('.post-battle-btn');
      const btnCount = await lootBtns.count();
      for (let i = 0; i < btnCount; i++) {
        const btn = lootBtns.nth(i);
        const text = await btn.textContent();
        if (text && /keep|dismiss|discard/i.test(text)) {
          await btn.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    }

    // Click "Return to Hub" button
    const hubBtn = page.locator('.post-battle-btn--hub');
    await expect(hubBtn).toBeVisible({ timeout: 15000 });
    // Wait until the button is not disabled (all items must be handled)
    await expect(hubBtn).toBeEnabled({ timeout: 10000 });
    await hubBtn.click();

    // Should return to the game layout with the sidebar visible
    await expect(page.locator('.game-sidebar, .sidebar-tab-btn').first()).toBeVisible({ timeout: 15000 });

    // Story mode should no longer be visible
    await expect(page.locator('.story-mode')).not.toBeVisible({ timeout: 5000 });
  });
});
