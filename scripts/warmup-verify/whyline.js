// Release F2's check (was WARMUP.md item 4's survey): every XP source names itself in the level-up sheet's why-line.
// Per case, on one throwaway account (local stack, silent): the case's starting state (prep), XP set 1 below the next
// level (a level is 50 XP) and the snapshot set to the counters now (levelupSnapshotNow, so only this case's change
// counts), one action that gives XP, called as the app calls it, then the sheet's text. Each case passes when the
// level-up shows, its why-line isn't empty and it contains the words of the source (the English keys' text, {n} = 1).
// F3: the warm-up's case (finishing the day's first exercise: +5, named once, as a warm-up; Smart Warmup's click is gone).
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/whyline.js [out.json] [url]
require('../runguard').auto();
const fs = require('fs');
const { sleep, launch, openPage, tone, check, totals } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OUT = process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : 'design/warmup/whyline-f.json';
// label → [prep, action, the why-line must contain, and must not contain]
const CASES = {
  'a session (recordActivity, +5)': ['', 'await recordActivity()', ['1 session']],
  'a skill score, first in its category (+5)': ['progress.expressionScores = []', "recordSkillScore('expression', 70); await saveProgress()", ['1 first best']],
  'a skill score, better than your average (+up to 40)': ['progress.pitchScores = [50, 50, 50]', "recordSkillScore('pitch', 80); await saveProgress()", ['1 score above your average']],
  'Bridge Crossing, a new best over a prior one (+8–40)': ['progress.bestBridgeSeconds = 5', 'await maybeSaveBestBridge(8)', ['1 new record']],
  'Bridge Crossing, the first best (+8–40)': ['progress.bestBridgeSeconds = null', 'await maybeSaveBestBridge(8)', ['1 first best']],
  'Glider, a new best over a prior one (+10–60)': ['progress.gliderBest = 20', 'gliderTookOff = true; gliderScoreVal = 60; finishGlider(); await new Promise(r => setTimeout(r, 1500))', ['1 new record']],
  'Glider, the first best (+10–60)': ['progress.gliderBest = 0', 'gliderTookOff = true; gliderScoreVal = 60; finishGlider(); await new Promise(r => setTimeout(r, 1500))', ['1 first best']],
  'a Boss Battle won (+50)': ['', 'progress.bossVictories = (progress.bossVictories || 0) + 1; progress.xp += 50; await saveProgress()', ['1 Boss Battle won']],
  // F3: the day's first finished warm-up exercise (wuEndRun → wuCount): +5, named once, as a warm-up and not a session
  'the warm-up, the first exercise of the day (+5)': ['progress.lastWarmupDay = null', 'await wuCount()', ['1 warm-up'], ['session']],
  'a curriculum day (+15, and its session)': ['progress.curriculumDaysCompleted = {}', "renderTodaysCurriculum(1); document.getElementById('curriculumDoneBtn').click(); await new Promise(r => setTimeout(r, 1500))", ['1 curriculum day']],
};
(async () => {
  const t = tone(60), b = await launch(t.wav), rows = [];
  try {
    const { page, errors } = await openPage(b, { viewport: { width: 390, height: 844 } });
    for (const [label, [prep, code, want, not = []]] of Object.entries(CASES)) {
      await page.evaluate(async prep => {
        const o = document.getElementById('levelupOverlay'); if (o.classList.contains('levelup-show')) momentClose(o);
        eval(prep);
        const lv = levelForXp(progress.xp || 0).level; progress.xp = lv * 50 - 1; // 1 below the next level
        progress.levelupSnapshot = levelupSnapshotNow(lv);
        await saveProgress(); // lastKnownLevel = this level
      }, prep);
      const xp0 = await page.evaluate(() => progress.xp);
      await page.evaluate(`(async () => { ${code}; })()`); await sleep(1200);
      const r = await page.evaluate(() => ({ xp: progress.xp, shown: document.getElementById('levelupOverlay').classList.contains('levelup-show'),
        level: document.getElementById('levelupNum').textContent, why: document.getElementById('levelupWhy').textContent }));
      const row = { case: label, xpGained: r.xp - xp0, levelUp: r.shown, level: r.level, why: r.why };
      rows.push(row);
      check(label, r.shown && !!r.why && want.every(w => r.why.includes(w)) && !not.some(w => r.why.includes(w)), `+${row.xpGained} XP: "${r.why}"`);
      if (r.shown) await page.evaluate(() => momentClose(document.getElementById('levelupOverlay')));
      await page.evaluate(() => { const o = document.getElementById('newRecordOverlay'); if (o && o.classList.contains('levelup-show')) momentClose(o); });
    }
    check('no page errors', errors.length === 0, errors.join(' | '));
    rows.push({ errors });
  } finally { await b.close(); await cleanup(); }
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  const { pass, fail } = totals(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
