const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.setTimeout(120_000);

test('capture animation frames for all verbs', async ({ page }) => {
  const verbs = ['jump', 'eat', 'sit', 'learn', 'cut', 'throw', 'think', 'run'];

  await page.goto('/games/verbs-game.html');
  await page.waitForLoadState('domcontentloaded');

  const card = page.locator('.char-card.boy-card');

  for (let verbIndex = 0; verbIndex < verbs.length; verbIndex++) {
    const verb = verbs[verbIndex];
    const dir = path.join('screenshots', 'frames', verb);
    fs.mkdirSync(dir, { recursive: true });

    // Click the verb tab → updates word display
    await page.locator('.verb-tab').nth(verbIndex).click();
    // Click the character card → triggers the real animation flow
    await card.click();

    // Capture 16 frames every 120ms
    for (let i = 0; i < 16; i++) {
      const framePath = path.join(dir, `frame-${String(i).padStart(2, '0')}.png`);
      await card.screenshot({ path: framePath });
      await page.waitForTimeout(120);
    }
  }
});
