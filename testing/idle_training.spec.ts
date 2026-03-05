import { test, expect } from '@playwright/test';

test.describe('Idle Training (Loop C)', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  test('can navigate to skills tab and see training options', async ({ page }) => {
    // Assuming we are logged in or can bypass splash
    await page.goto('/');
    
    // 1. Splash to Main
    const beginBtn = page.getByRole('button', { name: /Begin Your Ascent/i }).first();
    if (await beginBtn.isVisible()) {
      await beginBtn.click();
    }

    // 2. Click Skills Tab in Sidebar
    await page.getByRole('button', { name: /SKILLS/i }).click();

    // 3. Verify Header
    await expect(page.locator('h1')).toContainText('SKILLS & CALIBRATION');

    // 4. Verify Skill Cards exist
    const skillCards = page.locator('.skill-card');
    await expect(skillCards).toHaveCount(4);

    // 5. Select Attack (should be unlocked by default or after first scene)
    await page.getByText('Attack').first().click();

    // 6. Check Action Table
    await expect(page.locator('.action-table')).toBeVisible();
    
    // 7. Start Training
    const trainBtn = page.getByRole('button', { name: 'TRAIN' }).first();
    await expect(trainBtn).toBeVisible();
    await trainBtn.click();

    // 8. Verify [TRAINING] badge appears on card
    await expect(page.locator('.skill-card.training')).toBeVisible();

    // 9. Enter Active Mode
    await page.getByRole('button', { name: /ENTER ACTIVE MODE/i }).click();
    
    // 10. Verify Simulator Overlay
    await expect(page.locator('.training-simulator-overlay')).toBeVisible();
    await expect(page.locator('.enemy-container')).toBeVisible();

    // 11. Click enemy a few times
    const enemy = page.locator('.enemy-container');
    await enemy.click();
    await enemy.click();
    await enemy.click();

    // 12. Terminate simulation
    await page.getByRole('button', { name: /TERMINATE SIMULATION/i }).click();
    
    // 13. Verify overlay is gone
    await expect(page.locator('.training-simulator-overlay')).not.toBeVisible();
  });
});
