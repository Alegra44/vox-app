// Phase 8 gate (PHASE8.md §1a): each of the five Vocal World games (Pitch Mountain, Register Canyon, Boss Arena with the
// Pitch Dragon and with the Register Wraith, Harmony Castle, The Rift) idle → live → result, on master (--base, default
// master) and on the branch (the working copy, --branch-ref <ref>, or --branch-url <site>), the fake mic singing the
// steady A4 (stage.js) — Glider, Boss and Harmony told a steered pitch (games8.js STEER_TAP) —, Math.random seeded identically on both sides right before Start (games8.js).
// Before each game the page's progress is reset to the same values (no bests, xp 0, no boss wins) and saveProgress is
// stubbed, so a run on one side can't change the other's numbers.
// Gate:
//   - every number on the result (games8.js nums: score, best, coins, combo, lives, rounds, average, the boss's outcome,
//     health, per-note scores and weakest note) equal within ±2 (text values equal);
//   - the vocal load fed during the run (vlFeed calls) on both sides;
//   - the branch: the house down while playing for all five (Bridge and the Wraith included), up after the result;
//     the result shown and, where the game has a score, containing it. Master's house is reported (Bridge and the
//     Wraith stay up there: an expected change).
// Out: scripts/design-verify/logs/gamestates-<stamp>.log / .json.
// Usage: node scripts/design-verify/gamestates.js [--base <ref>] [--branch-ref <ref> | --branch-url <site>] [--games glider,boss,…] [--runs n]
const fs = require('fs'), path = require('path');
const C = require('./common'), S = require('./stage'), G = require('./games8');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master', ONLY = arg('--games') ? arg('--games').split(',') : null, RUNS = Number(arg('--runs')) || 1, TOL = 2;
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), OUT = path.join(__dirname, 'logs', `gamestates-${stamp}`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const lines = []; const log = s => { console.log(s); lines.push(s); };
const RESET = () => {
  saveProgress = () => {};
  Object.assign(progress, { xp: 0, gliderBest: 0, bridgeBest: 0, harmonyBest: 0, riftBest: 0, bossVictories: 0 });
};

async function runGame(page, g, n) {
  await g.open(page); await page.evaluate(RESET); await page.evaluate(G.STEER_TAP); await page.evaluate(`(${g.setup})()`);
  await page.evaluate(G.FEED_TAP); await page.evaluate(G.BOSS_TAP);
  await page.evaluate(() => { window.__feeds = 0; window.__bossOutcome = null; });
  await G.seed(page, 1000 + n);
  await page.evaluate(id => document.getElementById(id).click(), g.start);
  const started = await page.waitForFunction(`(${g.busy})()`, null, { timeout: 8000 }).then(() => true, () => false);
  await C.sleep(g.liveAt);
  const live = await page.evaluate(sel => ({ house: document.body.dataset.house, stage: !!document.querySelector(sel) }), g.stage);
  const t0 = Date.now();
  const ended = await page.waitForFunction(`!(${g.busy})()`, null, { timeout: g.cap }).then(() => true, () => false);
  if (!ended) await page.evaluate(id => document.getElementById(id).click(), g.start); // Glider and Bridge: ended at the cap
  await C.sleep(2000);
  const r = await page.evaluate(({ nums, result, vis }) => {
    const shown = new Function('return (' + vis + ')')()(result), el = document.querySelector(result);
    return { nums: new Function('return (' + nums + ')()')(), feeds: window.__feeds, house: document.body.dataset.house, shown, text: el ? el.innerText : '' };
  }, { nums: g.nums.toString(), result: g.result, vis: G.vis.toString() });
  await C.clearOverlays(page);
  return { started, ended, cappedAfter: ended ? null : Date.now() - t0, live, ...r };
}

(async () => {
  const dirs = { master: C.buildDir(BASE), branch: arg('--branch-url') || C.buildDir(arg('--branch-ref') || null) };
  const games = G.GAMES.filter(g => !ONLY || ONLY.includes(g.key));
  log(`gamestates ${stamp}  ${BASE} vs ${arg('--branch-url') || arg('--branch-ref') || 'working copy'}  ${RUNS} run(s) per side  games ${games.map(g => g.key).join(', ')}`);
  const b0 = await C.chromium.launch();
  const o = await C.openPage(b0, { dir: dirs.master }); await C.signUp(o.page, 'dvgs', 'Game States'); const state = await o.ctx.storageState(); await o.ctx.close(); await b0.close();
  if (/^https?:\/\//.test(dirs.branch)) { const og = new URL(dirs.branch).origin; state.origins = [...state.origins, ...state.origins.map(x => ({ ...x, origin: og }))]; }
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady);
  const data = { base: BASE, games: {} }; let fail = 0;
  try {
    for (const side of ['master', 'branch']) {
      const { ctx, page, errors } = await C.openPage(b, { dir: dirs[side], storageState: state, prepare: async c => c.addInitScript(G.SEED_INIT) });
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await C.clearOverlays(page); await S.warmMic(page);
        for (const g of games) for (let n = 0; n < RUNS; n++) {
          const r = await runGame(page, g, n);
          ((data.games[g.key] = data.games[g.key] || { master: [], branch: [] })[side]).push(r);
          log(`  ${side} ${g.key} #${n + 1}: started ${r.started}, ${r.ended ? 'ended itself' : `ended at the ${g.cap / 1000} s cap`} · house live ${r.live.house}, after ${r.house} · vlFeed ${r.feeds} · ${JSON.stringify(r.nums)}`);
        }
        data[side + 'Errors'] = errors.slice();
      } finally { await ctx.close(); }
    }
    const med = a => { const v = a.filter(x => typeof x === 'number').sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : (a.length ? a[0] : null); };
    for (const g of games) {
      const d = data.games[g.key]; log(`\n-- ${g.name}`);
      const names = [...new Set([...d.master, ...d.branch].flatMap(r => Object.keys(r.nums)))];
      for (const k of names) {
        const m = med(d.master.map(r => r.nums[k])), br = med(d.branch.map(r => r.nums[k]));
        const ok = typeof m === 'number' && typeof br === 'number' ? Math.abs(m - br) <= TOL : m === br;
        if (!ok) fail++;
        log(`   ${ok ? '✓' : '✗'} ${k.padEnd(18)} ${String(m).padStart(6)} → ${br}`);
      }
      for (const [side, rs] of Object.entries(d)) rs.forEach((r, i) => {
        const fed = r.feeds > 0, ok = r.started && fed; if (!ok) fail++;
        log(`   ${ok ? '✓' : '✗'} ${side} #${i + 1}: started ${r.started}, vocal load fed (${r.feeds} vlFeed calls)`);
      });
      d.branch.forEach((r, i) => {
        const score = g.key === 'glider' || g.key === 'bridge' ? r.nums.score : g.key === 'harmony' ? r.nums.overall : g.key === 'rift' ? r.nums.average : null;
        const has = score === null || new RegExp(`(^|\\D)${score}(\\D|$)`).test(r.text);
        const ok = r.live.house === 'down' && r.house === 'up' && r.shown && has; if (!ok) fail++;
        log(`   ${ok ? '✓' : '✗'} branch #${i + 1}: house down while playing (${r.live.house}), up after (${r.house}) · result shown ${r.shown}${score !== null ? ` · shows the score ${score} ${has}` : ''}`);
      });
      d.master.forEach((r, i) => log(`   · master #${i + 1}: house while playing ${r.live.house}${g.regin ? ' (expected up on master: no house session)' : ''}, after ${r.house}`));
    }
    for (const side of ['master', 'branch']) { const e = data[side + 'Errors'] || []; if (e.length) fail++; log(`${e.length ? '✗' : '✓'} ${side}: page errors ${e.length}${e.length ? ' ' + e.slice(0, 3).join(' | ') : ''}`); }
    log(`\nGAMESTATES: ${fail ? `FAIL: ${fail}` : 'PASS'} (numbers within ±${TOL}, load fed, the branch's house down while playing and up after)`);
    process.exitCode = fail ? 1 : 0;
  } finally {
    fs.writeFileSync(OUT + '.json', JSON.stringify(data, null, 1)); fs.writeFileSync(OUT + '.log', lines.join('\n') + '\n');
    console.log(`log: ${path.relative(C.ROOT, OUT)}.log  json: ${path.relative(C.ROOT, OUT)}.json`);
    await b.close(); C.cleanup();
  }
})();
