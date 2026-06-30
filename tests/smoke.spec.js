const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('loads with game selector', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('משחקי דיבור');
    await expect(page.locator('h1')).toContainText('משחקי דיבור');
    await expect(page.locator('.game-card').first()).toBeVisible();
    await expect(page.locator('.game-card').first()).toHaveAttribute('href', 'games/verbs-game.html');
    await expect(page.locator('.game-card')).toHaveCount(3);
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
    await expect(page.locator('#j-word')).toContainText('צוחק');
    await expect(page.locator('#n-word')).toContainText('צוחקת');
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

test.describe('Forest route game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games/forest-route-game.html');
  });

  test('loads with title and subtitle', async ({ page }) => {
    await expect(page).toHaveTitle('היער הקסום לארמון');
    await expect(page.locator('h1')).toContainText('הדרך ביער הקסום לארמון');
    await expect(page.locator('.subtitle')).toBeVisible();
    await page.screenshot({ path: 'screenshots/forest-route-game.png', fullPage: true });
  });

  test('shows 14 tiles on the board', async ({ page }) => {
    await expect(page.locator('.tile')).toHaveCount(14);
  });

  test('first tile is current and rest are locked', async ({ page }) => {
    await expect(page.locator('.tile.current')).toHaveCount(1);
    await expect(page.locator('.tile.locked')).toHaveCount(13);
  });

  test('progress label starts at 0/14', async ({ page }) => {
    await expect(page.locator('#progressLabel')).toContainText('0 / 14');
  });

  test('clicking the current tile advances progress', async ({ page }) => {
    await page.locator('.tile.current').click();
    await expect(page.locator('#progressLabel')).toContainText('1 / 14');
    await expect(page.locator('.tile.done')).toHaveCount(1);
  });

  test('sound toggle button is visible', async ({ page }) => {
    await expect(page.locator('#soundToggle')).toBeVisible();
  });
});
