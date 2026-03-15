import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, captureConsoleErrors } from './helpers/navigation';

/**
 * 2.3 E2E — Idle Training (Passive Play)
 * Covers: Skills tab, skill selection, training start/stop, active mode simulator,
 *         XP progress, action table, skill states (locked/unlocked/training).
 *
 * Merged from idle_training.spec.ts + idle_training_full.spec.ts.
 * Uses auth bypass (E2ETestBot, ID 2) — no onboarding needed.
 */

test.describe('2.3 Idle Training', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('skills tab loads with skill cards and header', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await navigateToTab(page, 'Skills');

    // Verify header
    await expect(page.locator('h1')).toContainText('SKILLS', { timeout: 10000 });

    // Verify skill cards exist
    const skillCards = page.locator('.skill-card');
    await expect(skillCards.first()).toBeVisible({ timeout: 10000 });
    const count = await skillCards.count();
    expect(count).toBeGreaterThanOrEqual(4); // Attack, Magic, Defense, Engineering minimum

    expect(errors.length).toBe(0);
  });

  test('selecting a skill shows action table and detail panel', async ({ page }) => {
    await navigateToTab(page, 'Skills');

    // Click Attack skill
    await page.getByText('Attack').first().click();

    // Action table should appear with sub-actions
    await expect(page.locator('.action-table')).toBeVisible({ timeout: 5000 });

    // Should show XP bar and level info
    const xpBar = page.locator('.large-xp-bar-fill, .xp-bar, .skill-xp-bar');
    await expect(xpBar.first()).toBeVisible({ timeout: 5000 });
  });

  test('can start training and see training badge on skill card', async ({ page }) => {
    await navigateToTab(page, 'Skills');

    // Select Attack skill
    await page.getByText('Attack').first().click();

    // Click TRAIN button
    const trainBtn = page.getByRole('button', { name: 'TRAIN' }).first();
    if (await trainBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trainBtn.click();

      // Verify training badge appears on the card
      await expect(page.locator('.skill-card.training')).toBeVisible({ timeout: 5000 });
    } else {
      // Skill may already be training — verify the badge exists
      const trainingCard = page.locator('.skill-card.training');
      await expect(trainingCard).toBeVisible({ timeout: 3000 });
    }
  });

  test('active mode simulator opens and can be terminated', async ({ page }) => {
    await navigateToTab(page, 'Skills');

    // Select Attack and ensure training is active
    await page.getByText('Attack').first().click();
    const trainBtn = page.getByRole('button', { name: 'TRAIN' }).first();
    if (await trainBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await trainBtn.click();
    }

    // Enter Active Mode
    const activeBtn = page.getByRole('button', { name: /ENTER ACTIVE MODE/i });
    if (await activeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await activeBtn.click();

      // Verify simulator overlay
      await expect(page.locator('.training-simulator-overlay')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.enemy-container')).toBeVisible({ timeout: 5000 });

      // Terminate simulation
      await page.getByRole('button', { name: /TERMINATE SIMULATION/i }).click();
      await expect(page.locator('.training-simulator-overlay')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('skill cards show locked/unlocked states', async ({ page }) => {
    await navigateToTab(page, 'Skills');

    const skillCards = page.locator('.skill-card');
    await expect(skillCards.first()).toBeVisible({ timeout: 10000 });

    // Check for locked skill indicators
    const lockedSkills = page.locator('.skill-card.locked, .skill-card--locked');
    const lockedCount = await lockedSkills.count();

    if (lockedCount > 0) {
      // Click a locked skill — should show prerequisite info
      await lockedSkills.first().click();
      await expect(page.getByText(/prerequisite|required|locked/i).first()).toBeVisible({ timeout: 5000 });
    }

    // At least one skill should be unlocked (Attack is always available)
    const unlockedSkills = page.locator('.skill-card:not(.locked):not(.skill-card--locked)');
    expect(await unlockedSkills.count()).toBeGreaterThanOrEqual(1);
  });

  test('XP rate information displayed for trained action', async ({ page }) => {
    await navigateToTab(page, 'Skills');

    await page.getByText('Attack').first().click();
    await expect(page.locator('.action-table')).toBeVisible({ timeout: 5000 });

    // Action rows should show XP rate info
    const actionRows = page.locator('.action-row, tr').filter({ hasText: /xp|XP/ });
    if (await actionRows.count() > 0) {
      await expect(actionRows.first()).toBeVisible();
    }
  });
});
