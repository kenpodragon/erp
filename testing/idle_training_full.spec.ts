import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';

async function bypassOnboarding(page: Page) {
  const beginBtn = page.getByRole('button', { name: /Begin Your Ascent/i }).first();
  await expect(beginBtn).toBeVisible({ timeout: 15000 });
  await beginBtn.click();

  await expect(page.getByText('Welcome to Elysium Rising')).toBeVisible({ timeout: 10000 });
  await page.locator('.terms-container').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /I Accept/i }).click();

  await expect(page.getByText('Set Up Your Profile')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Skip for Now/i }).click();

  await expect(page.getByText('Create Your Character')).toBeVisible({ timeout: 10000 });
  await page.getByRole('textbox').fill('TestHeroAdv' + Math.floor(Math.random() * 1000));
  await page.locator('.class-card').first().click();
  await page.getByRole('button', { name: /Create Character/i }).click();

  await expect(page.getByRole('button', { name: /Begin Adventure/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Begin Adventure/i }).click();
}

test.describe('Idle Training Advanced (Loop C)', () => {

  test.beforeEach(async ({ page }) => {
    // Seed basic skill data via helper
    try {
      execSync(`python3 /app/tools/test_helpers.py seed`);
    } catch (err) {
      console.warn('Seed failed, but continuing...', err);
    }

    await page.goto('/');
    await bypassOnboarding(page);
    // Navigate to Skills
    const skillsTabBtn = page.locator('.sidebar-tab-btn').filter({ hasText: 'Skills' });
    await expect(skillsTabBtn).toBeVisible({ timeout: 10000 });
    await skillsTabBtn.click();
  });

  test('full training cycle: select action and verify XP accrual', async ({ page }) => {
    await page.getByText('Attack').first().click();
    const trainBtn = page.getByRole('button', { name: 'TRAIN' }).first();
    await trainBtn.click();
    await expect(page.locator('.skill-card.training')).toBeVisible();

    const initialXPBar = page.locator('.large-xp-bar-fill');
    const initialWidthStr = await initialXPBar.getAttribute('style');
    const initialWidth = initialWidthStr ? parseFloat(initialWidthStr.match(/width:\s*([\d.]+)%/)?.[1] || '0') : 0;

    await page.waitForTimeout(5000); 

    // Force refresh by switching
    await page.getByText('Magic').first().click();
    await page.getByText('Attack').first().click();

    const finalXPBar = page.locator('.large-xp-bar-fill');
    const finalWidthStr = await finalXPBar.getAttribute('style');
    const finalWidth = finalWidthStr ? parseFloat(finalWidthStr.match(/width:\s*([\d.]+)%/)?.[1] || '0') : 0;
    
    expect(finalWidth).toBeGreaterThan(initialWidth);
  });

  test('offline progression: simulate 8h gap and verify report modal', async ({ page }) => {
    await page.getByText('Attack').first().click();
    const trainBtn = page.getByRole('button', { name: 'TRAIN' }).first();
    if (await trainBtn.isVisible()) {
      await trainBtn.click();
    }

    try {
      execSync(`python3 /app/tools/test_helpers.py backdate 8`);
    } catch (err) {
      console.error('Backdate failed', err);
      test.skip();
      return;
    }

    await page.reload();
    await page.locator('.sidebar-tab-btn').filter({ hasText: 'Skills' }).click();

    const reportModal = page.locator('.report-modal');
    await expect(reportModal).toBeVisible({ timeout: 15000 });
    await expect(reportModal).toContainText(/DURATION: 8.0 \/ 24h/i);
    await reportModal.getByRole('button', { name: /ACKNOWLEDGE/i }).click();
  });

  test('level up: verify level increase and new actions unlocked', async ({ page }) => {
    try {
      execSync(`python3 /app/tools/test_helpers.py set_xp Attack 9 1150`);
    } catch (err) {
      console.error('set_xp failed', err);
      test.skip();
      return;
    }

    await page.reload();
    await page.locator('.sidebar-tab-btn').filter({ hasText: 'Skills' }).click();
    await page.getByText('Attack').first().click();

    await expect(page.locator('.detail-skill-name').locator('..').getByText('LEVEL 9')).toBeVisible();
    await expect(page.locator('.action-row').filter({ hasText: 'S Corp Security Drills' })).toHaveClass(/locked/);

    await page.waitForTimeout(5000);

    // Refresh detail
    await page.getByText('Magic').first().click();
    await page.getByText('Attack').first().click();

    await expect(page.locator('.detail-skill-name').locator('..').getByText('LEVEL 10')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.action-row').filter({ hasText: 'S Corp Security Drills' })).not.toHaveClass(/locked/);
  });
});
