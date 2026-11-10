// PHASE9.md 1b: through all 7 onboarding steps with each choice, Back included, on master and the branch (the working
// copy, or --branch-ref). Signed in (a fresh account), the onboarding opened as the app opens it (openOnboarding), every
// step through the app's own Next and Back buttons and the choices' own buttons ([data-ob-value]); the final Next saves
// through saveProfile, stubbed here to record the profile instead of sending it. Per path: the saved fields (singer type,
// experience, genres, goal, priority: onboardingSingerType, exerciseLevel, genre, onboardingGoals, onboardingPriority)
// and the summary rows (label: value) on the last step.
// Paths: "none" (Next through every step, nothing chosen); "pick i" for i = 0..n (the i-th choice on every step, the
// multi-choice steps also the next one, so every choice of every step is picked on some path); "toggle" (a genre and a
// goal picked, then picked again: off); "back" (to the last step, Back to step 2, a different level and priority, then
// forward again: the later choice is saved); "back-to-0" (Back from step 1 to the welcome, then through).
// Expected changes (PHASE9.md 2.3): Expression is not offered (its paths are skipped on the branch and reported); the
// unset summary values read differently. Everything else equal.
// Usage: node scripts/design-verify/onboard.js [--base master] [--branch-ref <ref>] [--out <dir>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-onboard');
const SIDES = { master: C.buildDir(arg('--base') || 'master'), branch: C.buildDir(arg('--branch-ref') || null) };
const GRIDS = [['obSingerTypeGrid', 1], ['obLevelGrid', 2], ['obGenreGrid', 3], ['obGoalsGrid', 4], ['obPriorityGrid', 5]];
const MULTI = { obGenreGrid: true, obGoalsGrid: true };

async function runPath(page, plan) {
  // plan: { picks: {step: [values…]} (by data-ob-value), backTo, after: {step: [values…]} }
  await page.evaluate(() => { window.__saved = null; window.saveProfile = async p => { window.__saved = JSON.parse(JSON.stringify(p)); profile = p; }; openOnboarding(); });
  await C.sleep(200);
  const next = () => page.evaluate(() => document.getElementById('obNextBtn').click());
  const back = () => page.evaluate(() => document.getElementById('obBackBtn').click());
  const step = () => page.evaluate(() => obStepIndex);
  const pick = (grid, v) => page.evaluate(([g, v]) => { const b = document.querySelector(`#${g} [data-ob-value="${v}"]`); if (!b) return false; b.click(); return true; }, [grid, v]);
  const log = [];
  const doPicks = async (picks, s) => { for (const [g, n] of GRIDS) if (n === s && picks[n]) for (const v of picks[n]) { const ok = await pick(g, v); log.push(`${s}:${v}${ok ? '' : ' (absent)'}`); } };
  if (plan.backFrom1) { await next(); await back(); log.push(`back to ${await step()}`); }
  for (let s = 0; s < 6; s++) { await doPicks(plan.picks || {}, await step()); await next(); }
  if (plan.backTo !== undefined) {
    while (await step() > plan.backTo) await back();
    log.push(`back to ${await step()}`);
    while (await step() < 6) { await doPicks(plan.after || {}, await step()); await next(); }
  }
  const summary = await page.evaluate(() => [...document.querySelectorAll('#obPlanSummary .obp-row')].map(r => [r.querySelector('.obp-label'), r.querySelector('.obp-val')].map(e => e ? e.textContent.replace(/\s+/g, ' ').trim() : null)));
  const atLast = await step();
  await next(); await C.sleep(400);
  const saved = await page.evaluate(() => { const p = window.__saved; return p && { singerType: p.onboardingSingerType, level: p.exerciseLevel, genre: p.genre, goals: p.onboardingGoals, priority: p.onboardingPriority }; });
  const closed = await page.evaluate(() => getComputedStyle(document.getElementById('onboardingOverlay')).display === 'none');
  return { log, atLast, summary, saved, closed };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await C.chromium.launch(); const out = {}; let fails = 0, plans;
  try {
    const a = await C.openPage(b, { dir: SIDES.master }); await C.signUp(a.page, 'dvob', 'Onboard Check'); const state = await a.ctx.storageState(); await a.ctx.close();
    for (const side of ['master', 'branch']) {
      const { ctx, page, errors } = await C.openPage(b, { dir: SIDES[side], storageState: state });
      await C.clearOverlays(page);
      await page.evaluate(() => { window.saveProgress = async () => {}; enterPanel = () => {}; }); // the last Next opens the Journey: kept on this page
      const values = await page.evaluate(g => { openOnboarding(); const o = {}; for (const [id] of g) o[id] = [...document.querySelectorAll(`#${id} [data-ob-value]`)].map(x => x.dataset.obValue); return o; }, GRIDS);
      // the paths are built from master's choices and run by value on both sides (Expression is absent on the branch)
      if (side === 'master') {
      const n = Math.max(...Object.values(values).map(v => v.length));
      plans = { none: {} };
      for (let i = 0; i < n; i++) {
        const picks = {}; for (const [g, s] of GRIDS) { const v = values[g]; if (!v.length) continue; picks[s] = MULTI[g] ? [v[i % v.length], v[(i + 1) % v.length]].filter((x, j, a) => a.indexOf(x) === j) : [v[i % v.length]]; }
        plans[`pick ${i}`] = { picks };
      }
      plans.toggle = { picks: { 3: [values.obGenreGrid[0], values.obGenreGrid[0], values.obGenreGrid[1]], 4: [values.obGoalsGrid[0], values.obGoalsGrid[0]] } };
      plans.back = { picks: { 1: [values.obSingerTypeGrid[0]], 2: [values.obLevelGrid[0]], 5: [values.obPriorityGrid[0]] }, backTo: 2, after: { 2: [values.obLevelGrid[1]], 5: [values.obPriorityGrid[1]] } };
      plans['back-to-0'] = { backFrom1: true, picks: { 1: [values.obSingerTypeGrid[1]] } };
      }
      out[side] = { values, paths: {} };
      for (const [name, plan] of Object.entries(plans)) out[side].paths[name] = await runPath(page, plan);
      out[side].errors = errors.slice();
      console.log(`== ${side}: choices ${JSON.stringify(values)}; page errors ${errors.length}`);
      await ctx.close();
    }
    const M = out.master, B = out.branch, eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const check = (ok, s) => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${s}`); };
    for (const [g] of GRIDS) {
      const gone = M.values[g].filter(v => !B.values[g].includes(v)), added = B.values[g].filter(v => !M.values[g].includes(v));
      check(!added.length && (!gone.length || (g === 'obPriorityGrid' && eq(gone, ['expression']))), `${g}: ${eq(M.values[g], B.values[g]) ? 'same choices' : `master ${M.values[g].join(',')} → branch ${B.values[g].join(',')}${gone.length ? ` (gone: ${gone.join(',')}${g === 'obPriorityGrid' ? ', expected: Expression off the list' : ''})` : ''}`}`);
    }
    for (const name of Object.keys(M.paths)) {
      const m = M.paths[name], br = B.paths[name];
      if (!br) { console.log(`· ${name}: not on the branch`); continue; }
      const expr = m.log.some(l => /:expression/.test(l));
      if (expr) { console.log(`· ${name}: picks Expression on master (${JSON.stringify(m.saved)}); on the branch ${JSON.stringify(br.saved)}, expected: not offered`); continue; }
      check(eq(m.saved, br.saved) && m.atLast === 6 && br.atLast === 6 && m.closed && br.closed, `${name}: saved ${JSON.stringify(br.saved)}${eq(m.saved, br.saved) ? '' : ` (master ${JSON.stringify(m.saved)})`}; last step ${br.atLast}; closed ${br.closed}`);
      const rowsEq = eq(m.summary, br.summary);
      console.log(`   summary  master ${JSON.stringify(m.summary)}\n            branch ${JSON.stringify(br.summary)}${rowsEq ? '  (equal)' : ''}`);
      if (!rowsEq) { // only the unset values may read differently (2.3)
        // a row is set when the path chose on its step (level 2, genres 3, priority 5); a default level isn't a choice
        const chose = st => m.log.some(l => l.startsWith(st + ':') && !l.includes('(absent)'));
        const setRows = rows => rows.filter((r, i) => chose([2, 3, 5][i]));
        const val = r => r[1];
        check(eq(setRows(m.summary).map(val), setRows(br.summary).map(val)), `${name}: the summary's set values equal (labels and unset values may read differently, 2.3)`);
      }
    }
    check(!M.errors.length && !B.errors.length, `page errors: master ${M.errors.length}, branch ${B.errors.length} ${[...M.errors, ...B.errors].slice(0, 2).join(' | ')}`);
    console.log(`\nONBOARD: ${fails ? `FAIL: ${fails}` : 'PASS'}`); process.exitCode = fails ? 1 : 0;
  } finally { fs.writeFileSync(path.join(OUT, 'onboard.json'), JSON.stringify(out, null, 1)); await b.close(); await C.cleanup(); }
})();
