const H = require('./harness'); // its own test account, time limits, cleanup however it ends (PHASE5A.md)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const url = process.argv[2] || 'http://localhost:8765/';
(async () => {
  H.start('shot');
  const b = await H.launch(); let state;
  for (const [w, name] of [[1280, 'desk'], [390, 'phone']]) {
    H.step(`${name}: load`);
    const p = await b.newPage({ viewport: { width: w, height: 900 }, storageState: state }); await p.addInitScript(() => localStorage.setItem('language', 'en'));
    await p.goto(url); await p.waitForTimeout(3500);
    if (!state) { await H.signUp(p, 'cvshot'); state = await p.context().storageState(); } // one account for both widths
    H.step(`${name}: screenshots`);
    await p.evaluate(() => { localStorage.setItem('harmonyMemoryBest', JSON.stringify({hymn:{Alto:[88,60]}})); enterPanel('partrehearsal'); });
    await p.waitForTimeout(500);
    await H.cwFor(p, '#breathMapCard');
    await (await p.$('#breathMapCard')).screenshot({ path: `${require("os").tmpdir()}/bm-${name}.png` });
    await H.cwFor(p, '#harmonyMemoryCard');
    await (await p.$('#harmonyMemoryCard')).screenshot({ path: `${require("os").tmpdir()}/hm-${name}.png` });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); console.log(name, 'scrollWidth', sw);
  }
  await H.finish();
})();
