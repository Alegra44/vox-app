// Stop EVE and Sing It 5 Ways mid-session with stopAllActiveSessions(): the card goes back to idle, Start is live, and a
// second session runs (phase 4a: a stopped session left Start disabled).
// Phase 4b (PHASE4B.md §1d): the 10 tools with their own displays (tools4b.js), each left through the Home tab 0.8 s and
// 2.6 s after its start (Mirror also at 4.4 s, during the echo; 0.8 and 2.6 s are in its phrase). Expected: the house up,
// no marks; no mic loop left running (no autoCorrelate, readRegisterFrame or vlFeed call in the 5 s on Home from 1 s
// after leaving: a timer left behind, like Mirror's echo, fires in that time); back on the tool, its starting state (tools4b.js idleOk) and Start working (it
// starts again). One Take: the take left midway saves nothing (no take stored for today) and today's take is still
// available. Usage: node scripts/design-verify/stopcheck.js [--base <git ref>] [--only4b | --onlychoir | --only6 | --only8] [--tools onetake,mirror,…]
// 4b.3 (PHASE4B.md): the vocal load is checked from the trace (vocal-load-verify/vltrace.js), not from the gauge: from the
// moment of leaving to the end of the 5 s on Home, no vlFeed call, and every loop flag off (no session open). The gauge
// may still settle once from a session that ended by the time you left: vlEnd defers a session whose server state hasn't
// arrived, and it lands in today's total when the server answers (seconds later on a slow server). That is recorded as
// allowed; any other change of vlDay fails, and so does a session finishing twice.
// Phase 5 (PHASE5.md §1c): Choir World (choir5.js), the five trainers, a Your Choir take and rehearsal playback (Hear me
// off and on), each left at 0.8 s and 2.6 s the same way: the house up, no marks, no vlFeed after leaving, every loop flag
// off (Harmony Memory, the challenges, the timing trainer, the rehearsal, a recording, the stacked playback) and the
// playback stopped (choirIsPlaying false); back on it (its tab, its trainer), its starting state and Start working.
// --onlychoir runs these alone; without it they run after the 4b tools.
// Phase 6 (PHASE6.md §1c): the six Songs-tab solo tools (tools6.js), each left at 0.8 s and 2.6 s the same way, and
// besides: every loop flag off and no sound left (the backing pad's and the choir's oscillators counted: none), no
// result shown and no skill score recorded after leaving, Studio's take left midway not saved (checked past its 15 s),
// Sing With the Choir's mixer as it was before the start (your part unmuted again); back on it, its starting state and
// Start working. --only6 runs these alone; without it they run after Choir World.
// Phase 8 (PHASE8.md §1b): the five Vocal World games (games8.js: Pitch Mountain, Register Canyon, Boss Arena with the
// Pitch Dragon and the Register Wraith, Harmony Castle, The Rift), each left at 0.8 s and 2.6 s the same way: listening
// stops (no mic loop call, no vlFeed after leaving, every loop flag off, the backing pad and the choir silent), the house
// up; back on it, its starting state and Start working. And the Rift's own "← Back to Vocal World" during a run, at 0.8 s
// and 2.6 s: the run stops (riftActive off, no mic loop call or vlFeed after), the house comes up, the Rift is hidden and
// the hub shown; opened again, Start works. --only8 runs these alone; without it they run after the Songs tools.
// Test-only switches: --trace prints each case's trace; --slow-input <ms> delays every mic opener (initAudio,
// openRegisterInput, vqCapture, through warmupGate) by that much (a slow mic open, hypothesis A); --slow-state <ms>
// delays the vocal-load state GET (/me/vocal-load?day=…) by that much (a slow server, hypothesis B).
const C = require('./common'), S = require('./stage'), T = require('./tools'), T4 = require('./tools4b'), VT = require('../vocal-load-verify/vltrace');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ONLY4B = process.argv.includes('--only4b'), ONLYCHOIR = process.argv.includes('--onlychoir'), ONLY6 = process.argv.includes('--only6'), ONLY = arg('--tools') ? arg('--tools').split(',') : null;
const CW = require('./choir5'), T6 = require('./tools6'), G8 = require('./games8');
const ONLY8 = process.argv.includes('--only8');
const TRACE = process.argv.includes('--trace'), SLOW_INPUT = Number(arg('--slow-input')) || 0, SLOW_STATE = Number(arg('--slow-state')) || 0;
const prepare = async ctx => {
  await ctx.addInitScript(VT.INIT);
  // warmupGate() is the first await of every mic opener (initAudio, openRegisterInput, vqCapture): delaying it delays them all
  if (SLOW_INPUT) await ctx.addInitScript(ms => document.addEventListener('DOMContentLoaded', () => {
    const gate = warmupGate;
    window.warmupGate = async function () { await new Promise(r => setTimeout(r, ms)); return gate.apply(this, arguments); };
  }), SLOW_INPUT);
  if (SLOW_STATE) await ctx.route(u => /\/me\/vocal-load\?day=/.test(u.href), async r => { await C.sleep(SLOW_STATE); r.continue().catch(() => {}); });
};
// in the page: counts the calls a running mic loop makes
const COUNTERS = () => {
  if (window.__cnt) return; window.__cnt = { ac: 0, reg: 0, vl: 0 };
  const wrap = (name, k) => { const f = window[name]; window[name] = function () { window.__cnt[k]++; return f.apply(this, arguments); }; };
  wrap('autoCorrelate', 'ac'); wrap('readRegisterFrame', 'reg'); wrap('vlFeed', 'vl');
};
async function leaveChecks(page, log, tools = T4.TOOLS) {
  let bad = 0;
  await page.evaluate(COUNTERS);
  for (const tool of tools.filter(t => !ONLY || ONLY.includes(t.key))) {
    for (const at of tool.key === 'mirror' ? [800, 2600, 4400] : [800, 2600]) {
      await tool.open(page); await C.sleep(500);
      const snap0 = tool.snap ? await page.evaluate(`(${tool.snap})()`) : null;
      await VT.take(page); await VT.mark(page, `start ${tool.name}`);
      await tool.act(page); await C.sleep(at);
      const left = await page.evaluate(() => { // the mark and the click in one task: no frame of the tool between them
        window.__vlTrace.push({ op: 'mark', label: 'leave', t: Math.round(performance.now()) }); window.__leaveT = performance.now();
        document.querySelector('.snb-item[data-shell="home"]').click(); return vlDay.load;
      });
      await C.sleep(1000);
      await page.waitForFunction(() => vlRun === null, null, { timeout: 6000 }).catch(() => {}); await C.sleep(1500); // the stopped session closes
      const a = await page.evaluate(() => ({ ...window.__cnt, load: vlDay.load }));
      await C.sleep(5000);
      if (tool.settle) await C.sleep(tool.settle); // Studio: past the take's own end
      const z = await page.evaluate(cwFlags => ({ ...window.__cnt, load: vlDay.load, house: document.body.dataset.house,
        cw: cwFlags ? Object.entries(new Function('return (' + cwFlags + ')()')()).filter(([, v]) => v).map(([k]) => k) : [],
        flags: ['mode', 'lfActive', 'resonanceActive', 'drillActive', 'vibratoActive', 'vqActive', 'rhythmActive', 'mirrorActive', 'emoActive',
          'oneTakeActive', 'eveActive', 'fiveActive', 'vlRun'].filter(k => { try { const v = eval(k); return v !== null && v !== false && v !== undefined; } catch (e) { return false; } }),
        marks: document.querySelectorAll('.is-live, .is-staged, [data-offstage], [data-stage-path]').length,
        onetake: typeof progress !== 'undefined' && progress ? { saved: !!(progress.oneTakeHistory && progress.oneTakeHistory[todayStr()]), last: progress.oneTakeLastDate === todayStr() } : null }), tool.flags ? tool.flags.toString() : null);
      z.flags.push(...z.cw); // Choir World: its loop flags, and the playback (choirIsPlaying)
      const calls = { autoCorrelate: z.ac - a.ac, readRegisterFrame: z.reg - a.reg, vlFeed: z.vl - a.vl };
      await VT.mark(page, 'window ends'); const tr = await VT.take(page);
      const li = tr.findIndex(e => e.op === 'mark' && e.label === 'leave'), after = tr.slice(li + 1);
      const feeds = after.filter(e => e.op === 'feed'), fedAfter = feeds.map(e => `${e.n} on ${e.panel}`).join(', ') || 'none';
      // the gauge: each change after leaving is a session that started before you left finishing once
      const before = new Set(tr.slice(0, li).filter(e => e.op === 'start').map(e => e.run)), fin = after.filter(e => e.op === 'finish');
      const settleOk = fin.every(e => before.has(e.run)) && new Set(fin.map(e => e.run)).size === fin.length
        && Math.abs(z.load - (fin.length ? fin[fin.length - 1].load : left)) < 0.01;
      const settled = fin.map(e => `#${e.run} ${e.deferred ? `${e.after} ms after its end` : 'at its end'} ${e.before} → ${e.load}`).join(', ') || 'none';
      const loop = !calls.autoCorrelate && !calls.readRegisterFrame && !calls.vlFeed && !feeds.length && !z.flags.length && settleOk;
      const kept = tool.leaveOk ? await page.evaluate(`(${tool.leaveOk})(${JSON.stringify(snap0)})`) : { ok: true, detail: '' };
      // back on the tool: its starting state, and Start works
      if (tool.flags) await tool.open(page); else await C.showPanel(page, tool.panel);
      await C.clearOverlays(page); await C.sleep(400);
      const idle = await page.evaluate(`(${tool.idleOk})()`);
      await tool.act(page);
      const again = await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 6000 }).then(() => true, () => false);
      await page.evaluate(() => stopAllActiveSessions()); await C.sleep(tool.key === 'mirror' ? 4500 : 3500);
      if (tool.key === 'yctake') await page.waitForFunction(() => !yourChoir.recording, null, { timeout: 15000 }).catch(() => {}); // a cancelled take finishes
      if (tool.drain) await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: 20000 }).catch(() => {}); // a take stopAllActiveSessions didn't end runs out
      const ot = tool.key === 'onetake' ? !z.onetake.saved && !z.onetake.last : true;
      const pass = z.house === 'up' && !z.marks && loop && idle && again && ot && kept.ok;
      if (!pass) bad++;
      log(`${pass ? '✓' : '✗'} ${tool.name} left at ${at} ms: house ${z.house}, marks ${z.marks} · mic loop calls on Home ${JSON.stringify(calls)}`
        + ` · vlFeed after leaving ${fedAfter} · flags on ${z.flags.join(', ') || 'none'} · vocal load ${left.toFixed(2)} → ${z.load.toFixed(2)}, settled (allowed) ${settled}${settleOk ? '' : ' NOT EXPLAINED'}`
        + ` · back: starting state ${idle}, starts again ${again}${tool.key === 'onetake' ? ` · take saved ${z.onetake.saved}, today used ${z.onetake.last}` : ''}`
        + (tool.leaveOk ? ` · ${kept.detail}` : ''));
      if (TRACE || !pass) log(VT.format(tr));
    }
    await T.restoreRange(page);
  }
  return bad;
}
// The Rift's "← Back to Vocal World" during a run (phase 8): the run stops, the house comes up, the Rift is hidden, the
// hub shown; opened again, Start works.
async function riftBack(page, log) {
  let bad = 0; const rift = G8.byKey('rift');
  await page.evaluate(COUNTERS);
  for (const at of [800, 2600]) {
    await rift.open(page); await C.sleep(500);
    await rift.act(page); await page.waitForFunction(() => riftActive, null, { timeout: 8000 }).catch(() => {}); await C.sleep(at);
    await page.evaluate(() => { window.__leaveT = performance.now(); document.querySelector('#gameRift [data-back-to-hub]').click(); });
    await C.sleep(1000);
    const a = await page.evaluate(() => ({ ...window.__cnt }));
    await C.sleep(4000);
    const z = await page.evaluate(vis => {
      const v = new Function('return (' + vis + ')')();
      return { ...window.__cnt, rift: riftActive, house: document.body.dataset.house, riftShown: v('#gameRift'), hubShown: v('#arcadeHub'), vlRun: vlRun !== null };
    }, G8.vis.toString());
    const calls = { autoCorrelate: z.ac - a.ac, vlFeed: z.vl - a.vl };
    await rift.open(page); await C.sleep(400);
    const idle = await page.evaluate(`(${rift.idleOk})()`);
    await rift.act(page);
    const again = await page.waitForFunction(() => riftActive, null, { timeout: 8000 }).then(() => true, () => false);
    await page.evaluate(() => stopAllActiveSessions()); await C.sleep(3000);
    const pass = !z.rift && z.house === 'up' && !z.riftShown && z.hubShown && !calls.autoCorrelate && !calls.vlFeed && !z.vlRun && idle && again;
    if (!pass) bad++;
    log(`${pass ? '✓' : '✗'} The Rift, "Back to Vocal World" at ${at} ms: riftActive ${z.rift} · house ${z.house} · Rift shown ${z.riftShown}, hub shown ${z.hubShown}`
      + ` · mic loop calls after ${JSON.stringify(calls)} · vlRun ${z.vlRun} · back: starting state ${idle}, starts again ${again}`);
  }
  return bad;
}
(async () => {
  const dir = C.buildDir(process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : null);
  const b0 = await C.chromium.launch();
  const { ctx, page: p0 } = await C.openPage(b0, { dir, theme: 'light' }); await C.signUp(p0, 'dvc');
  const state = await ctx.storageState(); await ctx.close(); await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); let bad = 0;
  try {
    const { page } = await C.openPage(b, { dir, theme: 'light', storageState: state, prepare });
    await C.clearOverlays(page); await S.warmMic(page);
    for (const [key, btn, label, flag] of ONLY4B || ONLYCHOIR || ONLY6 || ONLY8 ? [] : [['eve', 'eveStartBtn', 'eveStartLabel', 'eveActive'], ['five', 'fiveStartBtn', 'fiveStartLabel', 'fiveActive']]) {
      for (const at of [800, 2600]) {
        const tool = T.TOOLS.find(t => t.key === key); await tool.open(page); await C.sleep(500);
        await page.evaluate(id => document.getElementById(id).click(), btn); await C.sleep(at);
        await page.evaluate(() => stopAllActiveSessions());
        const ok = await page.waitForFunction(({ btn }) => !document.getElementById(btn).disabled, { btn }, { timeout: 5000 }).then(() => true, () => false);
        await C.sleep(3500); // any later step of the stopped loop has run by now
        const st = await page.evaluate(({ btn, label, key }) => ({ disabled: document.getElementById(btn).disabled, label: document.getElementById(label).textContent,
          runner: document.getElementById(key + 'RunnerCard').style.display, house: document.body.dataset.house }), { btn, label, key });
        await page.evaluate(id => document.getElementById(id).click(), btn); await C.sleep(600);
        const again = await page.evaluate(f => window[f] === true || eval(f), flag);
        await page.evaluate(() => stopAllActiveSessions()); await C.sleep(3500);
        const pass = ok && !st.disabled && st.runner === 'none' && again;
        if (!pass) bad++;
        console.log(`${pass ? '✓' : '✗'} ${key} stopped at ${at} ms: enabled within 5 s ${ok} · ${JSON.stringify(st)} · restarts ${again}`);
      }
    }
    if (!ONLYCHOIR && !ONLY6 && !ONLY8) bad += await leaveChecks(page, console.log);
    if (!ONLY4B && !ONLY6 && !ONLY8) bad += await leaveChecks(page, console.log, CW.TOOLS);
    if (!ONLY4B && !ONLYCHOIR && !ONLY8) bad += await leaveChecks(page, console.log, T6.TOOLS);
    if (!ONLY4B && !ONLYCHOIR && !ONLY6) { bad += await leaveChecks(page, console.log, G8.GAMES); bad += await riftBack(page, console.log); }
  } finally { await b.close(); await C.cleanup(); }
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
