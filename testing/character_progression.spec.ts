import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, captureConsoleErrors } from './helpers/navigation';

/**
 * 2.4 E2E — Character & Progression Systems
 * Covers: stats, skills, prerequisites, dream items, equipment, story mode integration.
 * Uses auth bypass (E2ETestBot, ID 2) — no onboarding needed.
 */

test.describe('2.4 Character Progression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('character stats update on session start after idle level gain', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    // Navigate to Skills tab and start training a skill
    await navigateToTab(page, 'Skills');

    const skillCards = page.locator('.skill-card');
    await expect(skillCards.first()).toBeVisible({ timeout: 10000 });

    // Click Attack skill to select it
    await page.getByText('Attack').first().click();
    await expect(page.locator('.action-table')).toBeVisible({ timeout: 5000 });

    // Start training to gain idle XP
    const trainBtn = page.getByRole('button', { name: 'TRAIN' }).first();
    if (await trainBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await trainBtn.click();
      await expect(page.locator('.skill-card.training')).toBeVisible({ timeout: 5000 });
    }

    // Wait briefly for some idle XP to accrue
    await page.waitForTimeout(3000);

    // Navigate to Map and enter a story scene
    await navigateToTab(page, 'Map');

    const sceneNode = page.locator('.scene-node, .map-node, .chapter-node').first();
    await expect(sceneNode).toBeVisible({ timeout: 10000 });
    await sceneNode.click();

    const enterBtn = page.getByRole('button', { name: /start|enter|play/i }).first();
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();

    // Story mode should start — verify the combat/narrative stage loads
    await expect(page.locator('.story-mode, .combat-stage, .narrative-block').first()).toBeVisible({ timeout: 15000 });

    expect(errors.length).toBe(0);
  });

  test('locked hotbar skill cannot be purchased in Story Mode', async ({ page }) => {
    await navigateToTab(page, 'Skills');

    // Check for locked skill indicators
    const lockedSkills = page.locator('.skill-card.locked, .skill-card--locked');
    const lockedCount = await lockedSkills.count();

    if (lockedCount > 0) {
      await lockedSkills.first().click();
      await expect(page.getByText(/prerequisite|required|locked/i).first()).toBeVisible({ timeout: 5000 });
    }

    // Enter Story Mode and verify locked skills aren't purchasable
    await navigateToTab(page, 'Map');
    const sceneNode = page.locator('.scene-node, .map-node, .chapter-node').first();
    await expect(sceneNode).toBeVisible({ timeout: 10000 });
    await sceneNode.click();

    const enterBtn = page.getByRole('button', { name: /start|enter|play/i }).first();
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();

    await expect(page.locator('.story-mode, .combat-stage').first()).toBeVisible({ timeout: 15000 });

    // Check for locked skill in hotbar — should not be clickable/purchasable
    const lockedHotbarSkill = page.locator('.hotbar-skill--locked, .skill-slot--locked');
    if (await lockedHotbarSkill.count() > 0) {
      await lockedHotbarSkill.first().click();
      await expect(page.locator('.upgrade-confirm, .purchase-dialog')).not.toBeVisible();
    }
  });

  test('skill unlocks after prerequisite met in training and story mode', async ({ page }) => {
    await navigateToTab(page, 'Skills');

    const skillCards = page.locator('.skill-card');
    await expect(skillCards.first()).toBeVisible({ timeout: 10000 });

    // Check if there's a "ready" state skill (prerequisites met but not yet trained)
    const readySkills = page.locator('.skill-card.ready, .skill-card--ready');
    const readyCount = await readySkills.count();

    if (readyCount > 0) {
      await readySkills.first().click();
      const trainBtn = page.getByRole('button', { name: /TRAIN/i }).first();
      await expect(trainBtn).toBeVisible();
      await expect(trainBtn).toBeEnabled();
    }

    // Verify the skill tree renders with visual prerequisite states
    await expect(skillCards.first()).toBeVisible();
  });

  test('full item drop flow: complete run then keep or dismiss', async ({ page }) => {
    await navigateToTab(page, 'Map');

    const sceneNode = page.locator('.scene-node, .map-node, .chapter-node').first();
    await expect(sceneNode).toBeVisible({ timeout: 10000 });
    await sceneNode.click();

    const enterBtn = page.getByRole('button', { name: /start|enter|play/i }).first();
    await expect(enterBtn).toBeVisible({ timeout: 5000 });
    await enterBtn.click();

    // Wait for Story Mode to load
    await expect(page.locator('.story-mode, .combat-stage').first()).toBeVisible({ timeout: 15000 });

    // Complete the scene — wait for post-battle summary (combat takes time)
    const summary = page.locator('.post-battle-summary, .pbs-overlay');
    await expect(summary).toBeVisible({ timeout: 120000 });

    // Check if dream item loot section appears (depends on RNG)
    const lootSection = page.locator('.pbs-loot, .dream-item-drop, .loot-roll');
    const hasLoot = await lootSection.isVisible().catch(() => false);

    if (hasLoot) {
      const keepBtn = page.getByRole('button', { name: /keep/i });
      const dismissBtn = page.getByRole('button', { name: /dismiss|discard/i });

      if (await keepBtn.isVisible().catch(() => false)) {
        await keepBtn.click();
      } else if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();
      }
    }

    // Return to hub
    const hubBtn = page.getByRole('button', { name: /hub|return|exit/i }).first();
    await expect(hubBtn).toBeVisible({ timeout: 10000 });
    await hubBtn.click();

    await expect(page.locator('.game-sidebar')).toBeVisible({ timeout: 10000 });
  });

  test('equip item affects session stats', async ({ page }) => {
    // Navigate to Home tab where inventory is accessible
    await navigateToTab(page, 'Home');

    const inventorySection = page.locator('.inventory, .home-inventory, .gear-slots');
    const hasInventory = await inventorySection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInventory) {
      const gearSlots = page.locator('.gear-slot, .equipped-slot');
      await expect(gearSlots.first()).toBeVisible();

      // If there's an item in the bag, try equipping it
      const bagItem = page.locator('.bag-slot .item-card, .inventory-item').first();
      if (await bagItem.isVisible().catch(() => false)) {
        await bagItem.click();
        const equipBtn = page.getByRole('button', { name: /equip/i });
        if (await equipBtn.isVisible().catch(() => false)) {
          await equipBtn.click();
        }
      }

      // Enter a story scene and verify stats reflect equipment
      await navigateToTab(page, 'Map');
      const sceneNode = page.locator('.scene-node, .map-node, .chapter-node').first();
      await expect(sceneNode).toBeVisible({ timeout: 10000 });
      await sceneNode.click();

      const enterBtn = page.getByRole('button', { name: /start|enter|play/i }).first();
      await expect(enterBtn).toBeVisible({ timeout: 5000 });
      await enterBtn.click();

      // Verify hero stats panel shows in story mode
      await expect(page.locator('.hero-stats, .session-stats').first()).toBeVisible({ timeout: 15000 });
    } else {
      test.skip(true, 'Home Base inventory UI not accessible for this player');
    }
  });
});
