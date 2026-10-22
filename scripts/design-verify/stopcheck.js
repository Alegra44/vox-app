// Stop EVE and Sing It 5 Ways mid-session with stopAllActiveSessions(): the card goes back to idle, Start is live, and a
// second session runs (phase 4a: a stopped session left Start disabled). Usage: node scripts/design-verify/stopcheck.js [--base <git ref>]
const C = require('./common'), S = require('./stage'), T = require('./tools');
(async () => {
  const dir = C.buildDir(process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : null);
  const b0 = await C.chromium.launch();
  const { ctx, page: p0 } = await C.openPage(b0, { dir, theme: 'light' }); await C.signUp(p0, 'dvc');
  const state = await ctx.storageState(); await ctx.close(); await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); let bad = 0;
  try {
    const { page } = await C.openPage(b, { dir, theme: 'light', storageState: state });
    await C.clearOverlays(page); await S.warmMic(page);
    for (const [key, btn, label, flag] of [['eve', 'eveStartBtn', 'eveStartLabel', 'eveActive'], ['five', 'fiveStartBtn', 'fiveStartLabel', 'fiveActive']]) {
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
  } finally { await b.close(); await C.cleanup(); }
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
