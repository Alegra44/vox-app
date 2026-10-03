// Paywall sentence check in en/fr/es/tr with a stand-in profile (no account needed): real clicks on a Choir World
// action (Choir Boss start) and on the basic mixer (MUTE Alto) for an expired trial and a Teacher plan, then the
// paywall text. Flags a space before a full stop, and whether the trial-ended Choir World sentence names the plan.
// Usage: node scripts/choir-verify/paywall.js [url]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const lang = p.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) await lang.click();
  const ev = (f, a) => p.evaluate(f, a);
  const cases = {
    expired: () => { profile = { trialStartDate: new Date(Date.now() - 30 * 864e5).toISOString(), subscriptionPlan: null }; },
    teacher: () => { profile = { trialStartDate: new Date(Date.now() - 30 * 864e5).toISOString(), subscriptionPlan: 'teacher' }; },
  };
  let bad = 0;
  for (const [name, setup] of Object.entries(cases)) {
    for (const lg of ['en', 'fr', 'es', 'tr']) {
      await ev(setup); await ev(l => { setLanguage(l); applyChoirWorldGateUI(); }, lg); await sleep(200);
      for (const [what, panel, sel] of [['boss', 'partrehearsal', '#cbStartBtn'], ['mixer', 'choir', '#muteAlto']]) {
        await ev(pn => { enterPanel(pn); document.body.classList.remove('cw-locked'); }, panel); await sleep(300);
        await p.locator(sel).scrollIntoViewIfNeeded(); await p.locator(sel).click(); await sleep(300);
        const shown = await ev(() => document.getElementById('paywallModalOverlay').style.display === 'flex');
        if (!shown) { console.log(`${name} ${lg} ${what}: no paywall`); bad++; continue; }
        const txt = await ev(() => paywallReason.textContent), chip = await ev(() => paywallPlanChip.textContent);
        const space = / \./.test(txt), named = txt.includes(chip.split(' · ')[0]);
        if (space) bad++;
        console.log(`${name.padEnd(7)} ${lg} ${what.padEnd(5)} | ${txt} [${chip}]${space ? '  <-- SPACE BEFORE FULL STOP' : ''}${named ? '  (names plan)' : ''}`);
        await p.locator('#paywallCancelBtn').click(); await ev(() => applyChoirWorldGateUI());
      }
    }
  }
  console.log('bad:', bad, 'page errors:', errors);
  await b.close();
})();
