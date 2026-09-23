const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, name] of [[1280, 'desk'], [390, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } }); await p.addInitScript(() => localStorage.setItem('language', 'en'));
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(3500);
    await p.evaluate(() => { localStorage.setItem('harmonyMemoryBest', JSON.stringify({hymn:{Alto:[88,60]}})); enterPanel('partrehearsal'); });
    await p.waitForTimeout(500);
    await (await p.$('#breathMapCard')).screenshot({ path: `bm-${name}.png` });
    await (await p.$('#harmonyMemoryCard')).screenshot({ path: `hm-${name}.png` });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); console.log(name, 'scrollWidth', sw);
  }
  await b.close();
})();
