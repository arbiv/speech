const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('loads with game selector', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('משחקי דיבור');
    await expect(page.locator('h1')).toContainText('משחקי דיבור');
    await expect(page.locator('.game-card')).toBeVisible();
    await expect(page.locator('.game-card')).toHaveAttribute('href', 'games/verbs-game.html');
    await page.screenshot({ path: 'screenshots/index.png', fullPage: true });
  });
});

test.describe('Verbs game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games/verbs-game.html');
  });

  test('loads with all verb tabs and both characters', async ({ page }) => {
    await expect(page).toHaveTitle('פעלים - זכר ונקבה');
    await expect(page.locator('.verb-tab')).toHaveCount(8);
    await expect(page.locator('#jonathan-card')).toBeVisible();
    await expect(page.locator('#noa-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/verbs-game.png', fullPage: true });
  });

  test('first verb tab is active with correct words', async ({ page }) => {
    await expect(page.locator('.verb-tab').first()).toHaveClass(/active/);
    await expect(page.locator('#j-word')).toContainText('קופץ');
    await expect(page.locator('#n-word')).toContainText('קופצת');
  });

  test('clicking a verb tab updates the displayed words', async ({ page }) => {
    await page.locator('.verb-tab').nth(1).click();
    await expect(page.locator('.verb-tab').nth(1)).toHaveClass(/active/);
    await expect(page.locator('#j-word')).toContainText('אוֹכֵל');
    await expect(page.locator('#n-word')).toContainText('אוֹכֶלֶת');
    await page.screenshot({ path: 'screenshots/verb-eating.png', fullPage: true });
  });

  test('streak counter starts at zero', async ({ page }) => {
    await expect(page.locator('#streak-num')).toHaveText('0');
  });

  test('click mode is active by default', async ({ page }) => {
    await expect(page.locator('#mode-click')).toHaveClass(/active/);
    await expect(page.locator('#mode-voice')).toBeVisible();
  });
});
