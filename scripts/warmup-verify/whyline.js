// WARMUP.md item 4: does the level-up sheet's why-line name the XP that levelled you up? Per case, on one throwaway
// account (local stack, silent): XP set 1 below the next level (a level is 50 XP) and the snapshot set to the counters
// now (so only this case's change counts), one action that gives XP, then the sheet's text. Cases: each XP source the
// app has (deploy/index.html), called as the app calls it.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/whyline.js [out.json]
require('../runguard').auto();
const fs = require('fs');
const { sleep, launch, openPage, tone } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OUT = process.argv[2] || 'design/warmup/whyline.json';
const CASES = {
  'a session (recordActivity, +5)': 'await recordActivity()',
  'Smart Warmup: Mark warmup done (+5)': "document.getElementById('warmupCompleteBtn').click(); await new Promise(r => setTimeout(r, 1500))",
  'a skill score, first in its category (+5)': "progress.pitchScores = []; recordSkillScore('pitch', 70); await saveProgress()",
  'a skill score, better than your average (+up to 40)': "progress.pitchScores = [50, 50, 50]; recordSkillScore('pitch', 80); await saveProgress()",
  'Bridge Crossing, a new best over a prior one (+8–40)': 'progress.bestBridgeSeconds = 5; await maybeSaveBestBridge(8)',
  'Bridge Crossing, the first best (+8–40)': 'progress.bestBridgeSeconds = null; await maybeSaveBestBridge(8)',
  'Glider, a new best over a prior one (+10–60)': 'progress.gliderBest = 20; gliderTookOff = true; gliderScoreVal = 60; finishGlider(); await new Promise(r => setTimeout(r, 1500))',
  'Glider, the first best (+10–60)': 'progress.gliderBest = 0; gliderTookOff = true; gliderScoreVal = 60; finishGlider(); await new Promise(r => setTimeout(r, 1500))',
  'a Boss Battle won (+50)': 'progress.bossVictories = (progress.bossVictories || 0) + 1; progress.xp += 50; await saveProgress()',
};
(async () => {
  const t = tone(60), b = await launch(t.wav), rows = [];
  try {
    const { page, errors } = await openPage(b, { viewport: { width: 390, height: 844 } });
    for (const [label, code] of Object.entries(CASES)) {
      await page.evaluate(async () => {
        const o = document.getElementById('levelupOverlay'); if (o.classList.contains('levelup-show')) momentClose(o);
        const lv = levelForXp(progress.xp || 0).level; progress.xp = lv * 50 - 1; // 1 below the next level
        progress.levelupSnapshot = { level: lv, at: new Date().toISOString(), ...levelupCounters() };
        await saveProgress(); // lastKnownLevel = this level
      });
      const xp0 = await page.evaluate(() => progress.xp);
      await page.evaluate(`(async () => { ${code}; })()`); await sleep(1200);
      const r = await page.evaluate(() => ({ xp: progress.xp, shown: document.getElementById('levelupOverlay').classList.contains('levelup-show'),
        level: document.getElementById('levelupNum').textContent, why: document.getElementById('levelupWhy').textContent }));
      const row = { case: label, xpGained: r.xp - xp0, levelUp: r.shown, level: r.level, why: r.why };
      rows.push(row); console.log(JSON.stringify(row));
      if (r.shown) await page.evaluate(() => momentClose(document.getElementById('levelupOverlay')));
      await page.evaluate(() => { const o = document.getElementById('newRecordOverlay'); if (o && o.classList.contains('levelup-show')) momentClose(o); });
    }
    rows.push({ errors });
  } finally { await b.close(); await cleanup(); }
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
