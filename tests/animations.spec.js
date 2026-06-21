const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.setTimeout(120_000);

test('capture animation frames for all verbs', async ({ page }) => {
  const verbs = ['jump', 'eat', 'sit', 'learn', 'cut', 'throw', 'think', 'run'];

  await page.goto('/games/verbs-game.html');
  await page.waitForLoadState('domcontentloaded');

  for (const verb of verbs) {
    const dir = path.join('screenshots', 'frames', verb);
    fs.mkdirSync(dir, { recursive: true });

    // Trigger animation: force reflow then add the anim class
    try {
      await page.locator('#j-svg-wrap svg').evaluate((svg, v) => {
        // Remove all anim-* classes
        [...svg.classList].forEach(cls => {
          if (cls.startsWith('anim-')) svg.classList.remove(cls);
        });
        // Force reflow
        void svg.offsetWidth;
        // Add the new animation class
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
