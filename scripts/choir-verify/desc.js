const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => localStorage.setItem('language', 'en'));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(3500);
  console.log(await p.evaluate(async () => {
    localStorage.setItem('harmonyMemoryBest', JSON.stringify({hymn:{Alto:[80,80,80,80,80]}})); enterPanel('partrehearsal');
    const out = [];
    for (const l of ['en','fr','es','tr']) { await setLanguage(l); for (const s of [0,1,2,3,4,5]) { document.querySelector(`#hmemStages [data-hm-stage="${s}"]`).click(); out.push(`${l} ${s+1}: ${document.getElementById('hmemStageDesc').textContent} | btn: ${document.getElementById('hmemStartLabel').textContent}`); } }
    return out.join('\n');
  }));
  await b.close();
})();
