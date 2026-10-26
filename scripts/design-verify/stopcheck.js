// Stop EVE and Sing It 5 Ways mid-session with stopAllActiveSessions(): the card goes back to idle, Start is live, and a
// second session runs (phase 4a: a stopped session left Start disabled).
// Phase 4b (PHASE4B.md §1d): the 10 tools with their own displays (tools4b.js), each left through the Home tab 0.8 s and
// 2.6 s after its start (Mirror also at 4.4 s, during the echo; 0.8 and 2.6 s are in its phrase). Expected: the house up,
// no marks; no mic loop left running (no autoCorrelate, readRegisterFrame or vlFeed call in the 5 s on Home from 1 s
// after leaving: a timer left behind, like Mirror's echo, fires in that time) and today's vocal load not growing
// (vlDay.load the same at both ends); back on the tool, its starting state (tools4b.js idleOk) and Start working (it
// starts again). One Take: the take left midway saves nothing (no take stored for today) and today's take is still
// available. Usage: node scripts/design-verify/stopcheck.js [--base <git ref>] [--only4b] [--tools onetake,mirror,…]
const C = require('./common'), S = require('./stage'), T = require('./tools'), T4 = require('./tools4b');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ONLY4B = process.argv.includes('--only4b'), ONLY = arg('--tools') ? arg('--tools').split(',') : null;
// in the page: counts the calls a running mic loop makes
const COUNTERS = () => {
  if (window.__cnt) return; window.__cnt = { ac: 0, reg: 0, vl: 0 };
  const wrap = (name, k) => { const f = window[name]; window[name] = function () { window.__cnt[k]++; return f.apply(this, arguments); }; };
  wrap('autoCorrelate', 'ac'); wrap('readRegisterFrame', 'reg'); wrap('vlFeed', 'vl');
};
async function leaveChecks(page, log) {
  let bad = 0;
  await page.evaluate(COUNTERS);
  for (const tool of T4.TOOLS.filter(t => !ONLY || ONLY.includes(t.key))) {
    for (const at of tool.key === 'mirror' ? [800, 2600, 4400] : [800, 2600]) {
      await tool.open(page); await C.sleep(500);
      await tool.act(page); await C.sleep(at);
      await page.evaluate(() => document.querySelector('.snb-item[data-shell="home"]').click());
      await C.sleep(1000);
      const a = await page.evaluate(() => ({ ...window.__cnt, load: vlDay.load }));
      await C.sleep(5000);
      const z = await page.evaluate(() => ({ ...window.__cnt, load: vlDay.load, house: document.body.dataset.house,
        marks: document.querySelectorAll('.is-live, .is-staged, [data-offstage], [data-stage-path]').length,
        onetake: typeof progress !== 'undefined' && progress ? { saved: !!(progress.oneTakeHistory && progress.oneTakeHistory[todayStr()]), last: progress.oneTakeLastDate === todayStr() } : null }));
      const calls = { autoCorrelate: z.ac - a.ac, readRegisterFrame: z.reg - a.reg, vlFeed: z.vl - a.vl };
      const loop = !calls.autoCorrelate && !calls.readRegisterFrame && !calls.vlFeed, load = z.load === a.load;
      // back on the tool: its starting state, and Start works
      await C.showPanel(page, tool.panel); await C.clearOverlays(page); await C.sleep(400);
      const idle = await page.evaluate(`(${tool.idleOk})()`);
      await tool.act(page);
      const again = await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 6000 }).then(() => true, () => false);
      await page.evaluate(() => stopAllActiveSessions()); await C.sleep(tool.key === 'mirror' ? 4500 : 3500);
      const ot = tool.key === 'onetake' ? !z.onetake.saved && !z.onetake.last : true;
      const pass = z.house === 'up' && !z.marks && loop && load && idle && again && ot;
      if (!pass) bad++;
      log(`${pass ? '✓' : '✗'} ${tool.name} left at ${at} ms: house ${z.house}, marks ${z.marks} · mic loop calls on Home ${JSON.stringify(calls)} · vocal load ${a.load} → ${z.load}`
        + ` · back: starting state ${idle}, starts again ${again}${tool.key === 'onetake' ? ` · take saved ${z.onetake.saved}, today used ${z.onetake.last}` : ''}`);
    }
    await T.restoreRange(page);
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
    const { page } = await C.openPage(b, { dir, theme: 'light', storageState: state });
    await C.clearOverlays(page); await S.warmMic(page);
    for (const [key, btn, label, flag] of ONLY4B ? [] : [['eve', 'eveStartBtn', 'eveStartLabel', 'eveActive'], ['five', 'fiveStartBtn', 'fiveStartLabel', 'fiveActive']]) {
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
    bad += await leaveChecks(page, console.log);
  } finally { await b.close(); await C.cleanup(); }
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
