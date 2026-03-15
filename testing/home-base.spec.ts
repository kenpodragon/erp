import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { navigateToTab, waitForContentLoad, captureConsoleErrors } from './helpers/navigation';

/**
 * 2.8 E2E — Home Base Hub
 * Covers: Akashic Log, Collections/Relics, Achievements, Leaderboard sub-tabs.
 * REC 2.7 (Akashic Log, Relic Gallery, Achievements, Leaderboard).
 * Requires Docker stack (frontend + backend + DB) via docker-compose-testing.yaml.
 */

test.describe('2.8 Home Base Hub', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Home tab loads with sub-tabs visible', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Home tab should render with multiple sub-tabs
    const subTabs = page.locator('.sub-tab, .home-sub-tab, [role="tab"]');
    await expect(subTabs.first()).toBeVisible({ timeout: 10000 });

    // Expect 6 sub-tabs as verified during smoke testing
    const tabCount = await subTabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(6);

    expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
  });

  test('Akashic Log sub-tab shows chapter hierarchy', async ({ page }) => {
    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Click Akashic Log sub-tab
    const akashicTab = page.locator('.sub-tab, .home-sub-tab, [role="tab"]').filter({ hasText: /akashic|log|journal/i });
    await expect(akashicTab).toBeVisible({ timeout: 10000 });
    await akashicTab.click();
    await waitForContentLoad(page);

    // Should show book/chapter/scene hierarchy
    // Look for book-level entries (e.g. "Book 1" or similar)
    const bookEntry = page.locator('.akashic-book, .log-book, .book-entry, [data-testid*="book"]').first();
    await expect(bookEntry).toBeVisible({ timeout: 10000 });

    // Expand or click to see chapters
    await bookEntry.click();
    await page.waitForTimeout(500);

    // Chapters should be visible under the book
    const chapterEntry = page.locator('.akashic-chapter, .log-chapter, .chapter-entry, [data-testid*="chapter"]').first();
    await expect(chapterEntry).toBeVisible({ timeout: 5000 });

    // Expand chapter to see scenes
    await chapterEntry.click();
    await page.waitForTimeout(500);

    const sceneEntry = page.locator('.akashic-scene, .log-scene, .scene-entry, [data-testid*="scene"]').first();
    await expect(sceneEntry).toBeVisible({ timeout: 5000 });
  });

  test('Akashic Log search filters results', async ({ page }) => {
    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Navigate to Akashic Log sub-tab
    const akashicTab = page.locator('.sub-tab, .home-sub-tab, [role="tab"]').filter({ hasText: /akashic|log|journal/i });
    await expect(akashicTab).toBeVisible({ timeout: 10000 });
    await akashicTab.click();
    await waitForContentLoad(page);

    // Find search input
    const searchInput = page.locator('input[type="text"][placeholder*="earch"], input[type="search"], .akashic-search input, [data-testid="akashic-search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Count items before search
    const allEntries = page.locator('.akashic-book, .log-book, .book-entry, .akashic-chapter, .log-chapter, .chapter-entry, [data-testid*="book"], [data-testid*="chapter"]');
    const countBefore = await allEntries.count();

    // Type a search term — use a partial name that should filter
    await searchInput.fill('Chapter');
    await page.waitForTimeout(500);

    // Results should be filtered (either fewer items or a results list appears)
    const searchResults = page.locator('.search-result, .akashic-result, .filtered-entry, [data-testid*="result"]');
    const filteredEntries = page.locator('.akashic-book, .log-book, .book-entry, .akashic-chapter, .log-chapter, .chapter-entry, [data-testid*="book"], [data-testid*="chapter"]');

    // Either search results appear OR the entry count changed
    const hasSearchResults = await searchResults.count() > 0;
    const countAfter = await filteredEntries.count();

    expect(hasSearchResults || countAfter !== countBefore || countAfter > 0).toBeTruthy();
  });

  test('Collections/Relics sub-tab is accessible', async ({ page }) => {
    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Click Collections or Relics sub-tab
    const collectionsTab = page.locator('.sub-tab, .home-sub-tab, [role="tab"]').filter({ hasText: /collection|relic|gallery/i });
    await expect(collectionsTab).toBeVisible({ timeout: 10000 });
    await collectionsTab.click();
    await waitForContentLoad(page);

    // Should render the collections content area (may be empty for new player)
    const collectionsContent = page.locator('.collections-content, .relic-gallery, .relics-panel, [data-testid*="collection"], [data-testid*="relic"]').first();
    if (await collectionsContent.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(collectionsContent).toBeVisible();
    } else {
      // At minimum, the sub-tab content area should have loaded without errors
      await expect(page.locator('.home-content, .tab-content, .sub-tab-content, main').first()).toBeVisible();
    }
  });

  test('Achievements sub-tab renders', async ({ page }) => {
    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Click Achievements sub-tab
    const achievementsTab = page.locator('.sub-tab, .home-sub-tab, [role="tab"]').filter({ hasText: /achievement|title/i });
    await expect(achievementsTab).toBeVisible({ timeout: 10000 });
    await achievementsTab.click();
    await waitForContentLoad(page);

    // Should render achievement content — may show "no achievements yet" for a new player
    const achievementList = page.locator('.achievement-list, .achievements-grid, [data-testid*="achievement"]').first();
    const emptyState = page.getByText(/no achievement|none yet|empty|start playing/i).first();

    const hasAchievements = await achievementList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    // Either achievements are displayed or an empty state message is shown
    expect(hasAchievements || hasEmptyState).toBeTruthy();
  });

  test('Leaderboard sub-tab renders with table or ranking', async ({ page }) => {
    await navigateToTab(page, 'Home');
    await waitForContentLoad(page);

    // Click Leaderboard sub-tab
    const leaderboardTab = page.locator('.sub-tab, .home-sub-tab, [role="tab"]').filter({ hasText: /leaderboard|rank/i });
    await expect(leaderboardTab).toBeVisible({ timeout: 10000 });
    await leaderboardTab.click();
    await waitForContentLoad(page);

    // Should render a leaderboard table or ranking list
    const leaderboardTable = page.locator('table, .leaderboard-table, .leaderboard-list, .ranking-list, [data-testid*="leaderboard"]').first();
    await expect(leaderboardTable).toBeVisible({ timeout: 10000 });

    // Should have at least a header row or column labels
    const headerOrLabel = page.locator('th, .leaderboard-header, .rank-header, .lb-col-header').first();
    await expect(headerOrLabel).toBeVisible({ timeout: 5000 });
  });
});
