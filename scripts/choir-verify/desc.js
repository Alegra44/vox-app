const H = require('./harness'); // its own test account, time limits, cleanup however it ends (PHASE5A.md)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const url = process.argv[2] || 'http://localhost:8765/';
(async () => {
  H.start('desc');
  const b = await H.launch(); const p = await b.newPage();
  await p.addInitScript(() => localStorage.setItem('language', 'en'));
  H.step('load'); await p.goto(url); await p.waitForTimeout(3500);
  await H.signUp(p, 'cvdesc');
  H.step('stage descriptions in en/fr/es/tr');
  console.log(await p.evaluate(async () => {
    localStorage.setItem('harmonyMemoryBest', JSON.stringify({hymn:{Alto:[80,80,80,80,80]}})); enterPanel('partrehearsal');
    const out = [];
    for (const l of ['en','fr','es','tr']) { await setLanguage(l); for (const s of [0,1,2,3,4,5]) { document.querySelector(`#hmemStages [data-hm-stage="${s}"]`).click(); out.push(`${l} ${s+1}: ${document.getElementById('hmemStageDesc').textContent} | btn: ${document.getElementById('hmemStartLabel').textContent}`); } }
    return out.join('\n');
  }));
  await H.finish();
})();
