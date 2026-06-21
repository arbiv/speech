const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.setTimeout(120_000);

test('capture animation frames for all verbs', async ({ page }) => {
  const verbs = ['jump', 'eat', 'sit', 'learn', 'cut', 'throw', 'think', 'run'];

  await page.goto('/games/verbs-game.html');
  await page.waitForLoadState('domcontentloaded');

  for (let verbIndex = 0; verbIndex < verbs.length; verbIndex++) {
    const verb = verbs[verbIndex];
    const dir = path.join('screenshots', 'frames', verb);
    fs.mkdirSync(dir, { recursive: true });

    // Click the verb tab so selectVerb() runs and the word display updates
    await page.locator('.verb-tab').nth(verbIndex).click();
    await page.waitForTimeout(80);

    // Trigger animation: force reflow then add the anim class
    try {
      await page.locator('#j-svg-wrap svg').evaluate((svg, v) => {
        [...svg.classList].forEach(cls => {
          if (cls.startsWith('anim-')) svg.classList.remove(cls);
        });
        void svg.offsetWidth;
        svg.classList.add(`anim-${v}`);
      }, verb);
    } catch (err) {
      console.warn(`Failed to trigger animation for verb "${verb}":`, err.message);
    }

    // Capture 16 frames every 120ms
    const card = page.locator('.char-card.boy-card');
    for (let i = 0; i < 16; i++) {
      const framePath = path.join(dir, `frame-${String(i).padStart(2, '0')}.png`);
      await card.screenshot({ path: framePath });
      await page.waitForTimeout(120);
    }
  }
});
