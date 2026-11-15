// Release B, B8: "Erase my progress" deletes what its text names (range, streak, sessions, scores and history).
// A throwaway account (deleted at exit), local build (DV_URL=https://…: that site), the production backend:
//   1. seeded with youSeed's active Choir World singer (every score list, bests, sessions, history, Choir World runs)
//      plus the bests the seed leaves at their defaults, saved, and read back from the server
//   2. Erase my progress (the confirm accepted), then a reload
//   3. every column PROGRESS_ERASED names is at its default, in the page and on the server; XP (not named) is kept;
//      the Skill Profile has no score (every skill null) and Home's focus reads "No score yet"
// expression_scores: checked when the backend has the column (migration 0009); before, reported as not on the backend.
// Usage: [DV_URL=https://…] node scripts/backend-verify/erasecheck.js
require('../runguard').auto();
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const { seedInPage } = require('../design-verify/youSeed');
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
const snake = k => k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// empty all the way down: what the app rebuilds on load counts (today's session snapshot with no skill, Choir World's
// {log: [], runs: [], parts: {}}); a date it stamps (capturedAt) isn't a score
const empty = v => v === null || v === undefined || v === 0 || v === '' || (Array.isArray(v) ? v.every(empty) : typeof v === 'object' ? Object.entries(v).every(([k, x]) => k === 'capturedAt' || empty(x)) : false);
// today's plan weighting, rebuilt on load: with no scores every skill weighs the same (20 each), which isn't a score
const neutral = v => v && typeof v === 'object' && Object.values(v).every(w => w && typeof w === 'object' && new Set(Object.values(w)).size === 1);
const erased = (v, d, k) => same(v, d) || (typeof d === 'object' && d !== null && empty(v)) || (k === 'dailyWeighting' && neutral(v));
const num = v => (v === null || v === undefined ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? +v : v);

(async () => {
  const b = await C.chromium.launch();
  try {
    const { ctx, page } = await C.openPage(b, {});
    await C.signUp(page, 'dverase', 'Erase Check'); await C.clearOverlays(page);
    const uid = await page.evaluate(() => profile.id);
    const hasExpr = db(`select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = 'user_progress' and column_name = 'expression_scores'`)[0].n === 1;
    const ERASED = await page.evaluate(() => JSON.parse(JSON.stringify(PROGRESS_ERASED)));
    const keys = Object.keys(ERASED).filter(k => hasExpr || k !== 'expressionScores');
    const row = () => db(`select * from public.user_progress where user_id = '${uid}'`)[0];

    await C.G.step('seed and save', 60, () => page.evaluate(async seed => {
      const real = window.saveProgress; new Function(`return (${seed})`)()('activecw'); window.saveProgress = real;
      Object.assign(progress, { riftBest: 7, bridgeBest: 4, oneTakeLastDate: todayStr(), lastExerciseDate: todayStr(), exercisesToday: 3,
        sessionSnapshot: { date: todayStr(), pitch: 70 }, oneTakeHistory: { [todayStr()]: { score: 64 } }, dailyWeighting: { pitch: 2 },
        lastBossWeakness: { kind: 'pitch' }, xp: 345 });
      await saveProgress();
    }, seedInPage.toString()));
    const r0 = row();
    const seeded = keys.filter(k => !same(num(r0[snake(k)]), ERASED[k]));
    check(`seeded on the server: ${seeded.length} of ${keys.length} erasable columns away from their defaults`, seeded.length === keys.length,
      `still at default: ${keys.filter(k => !seeded.includes(k)).join(', ') || 'none'}`);
    if (!hasExpr) console.log('  · expression_scores: not on this backend (migration 0009 not applied): not checked');

    await C.G.step('reload, erase, reload', 90, async () => {
      await page.reload(); await page.waitForFunction(() => { try { return !!profile && Array.isArray(progress.pitchScores) && progress.pitchScores.length > 0; } catch (e) { return false; } }, null, { timeout: 30000 });
      await C.clearOverlays(page);
      page.once('dialog', d => d.accept());
      await page.evaluate(async () => { document.getElementById('dashResetBtn').click(); });
      await C.sleep(4000);
      await page.reload(); await page.waitForFunction(() => { try { return !!profile && 'xp' in progress; } catch (e) { return false; } }, null, { timeout: 30000 });
      await C.clearOverlays(page);
    });
    const r1 = row();
    const pg = await page.evaluate(ks => { const o = {}; ks.forEach(k => { o[k] = progress[k] === undefined ? null : progress[k]; }); return o; }, keys);
    const badServer = keys.filter(k => !erased(num(r1[snake(k)]), ERASED[k], k));
    // the page normalises two bests the server keeps as {} (gliderBest, bossVictories): absent there is the default too
    const badPage = keys.filter(k => !erased(pg[k], ERASED[k], k) && !(pg[k] === null && (k === 'gliderBest' || k === 'bossVictories')));
    check('after the erase and a reload: every named column at its default on the server', badServer.length === 0,
      badServer.map(k => `${k} = ${JSON.stringify(r1[snake(k)])}`).join('; ') || `${keys.length} columns`);
    check('… and in the page', badPage.length === 0, badPage.map(k => `${k} = ${JSON.stringify(pg[k])}`).join('; ') || `${keys.length} values`);
    check('XP (not named) is kept', r1.xp === 345, `xp ${r1.xp}`);
    const ui = await page.evaluate(() => {
      const sp = computeSkillProfile(); if (typeof renderHomeScreen === 'function') renderHomeScreen();
      return { sp, home: document.body.innerText.includes(t('home_focus_noscore')) };
    });
    check('the Skill Profile has no score: every skill empty', Object.values(ui.sp).every(v => v === null), JSON.stringify(ui.sp));
    check('Home\'s focus reads "No score yet"', ui.home);
    await ctx.close();
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${fail ? 'ERASE: FAIL' : 'ERASE: PASS'} (${pass} passed, ${fail} failed)`);
  process.exitCode = fail ? 1 : 0;
})();
