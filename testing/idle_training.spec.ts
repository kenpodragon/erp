import { test, expect, Page } from '@playwright/test';

async function bypassOnboarding(page: Page) {
  console.log('Bypassing onboarding...');
  
  // 1. Splash
  const beginBtn = page.getByRole('button', { name: /Begin Your Ascent/i }).first();
  await expect(beginBtn).toBeVisible({ timeout: 15000 });
  await beginBtn.click();

  // 2. Terms
  await expect(page.getByText('Welcome to Elysium Rising')).toBeVisible({ timeout: 10000 });
  await page.locator('.terms-container').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /I Accept/i }).click();

  // 3. Profile
  await expect(page.getByText('Set Up Your Profile')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Skip for Now/i }).click();

  // 4. Character Creation
  await expect(page.getByText('Create Your Character')).toBeVisible({ timeout: 10000 });
  // The name input is a standard textbox in CharacterCreator
  await page.getByRole('textbox').fill('TestHero' + Math.floor(Math.random() * 1000));
  
  // Select first class card
  await page.locator('.class-card').first().click();
  await page.getByRole('button', { name: /Create Character/i }).click();

  // 5. Welcome Screen
  await expect(page.getByRole('button', { name: /Begin Adventure/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Begin Adventure/i }).click();
  
  console.log('Onboarding bypass complete.');
}

test.describe('Idle Training (Loop C)', () => {
  test('can navigate to skills tab and see training options', async ({ page }) => {
    await page.goto('/');
    await bypassOnboarding(page);

    // Sidebar navigation
    const skillsTabBtn = page.locator('.sidebar-tab-btn').filter({ hasText: 'Skills' });
    await expect(skillsTabBtn).toBeVisible({ timeout: 10000 });
    await skillsTabBtn.click();

    // Verify Header
    await expect(page.locator('h1')).toContainText('SKILLS & CALIBRATION');

    // Verify Skill Cards exist
    const skillCards = page.locator('.skill-card');
    await expect(skillCards.first()).toBeVisible();

    // Select Attack
    await page.getByText('Attack').first().click();

    // Check Action Table
    await expect(page.locator('.action-table')).toBeVisible();
    
    // Start Training
    const trainBtn = page.getByRole('button', { name: 'TRAIN' }).first();
    await expect(trainBtn).toBeVisible();
    await trainBtn.click();

    // Verify [TRAINING] badge appears on card
    await expect(page.locator('.skill-card.training')).toBeVisible();

    // Enter Active Mode
    await page.getByRole('button', { name: /ENTER ACTIVE MODE/i }).click();
    
    // Verify Simulator Overlay
    await expect(page.locator('.training-simulator-overlay')).toBeVisible();
    await expect(page.locator('.enemy-container')).toBeVisible();

    // Terminate simulation
    await page.getByRole('button', { name: /TERMINATE SIMULATION/i }).click();
    
    // Verify overlay is gone
    await expect(page.locator('.training-simulator-overlay')).not.toBeVisible();
  });
});
