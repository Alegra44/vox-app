// Scoring batch release A, A2: saveProgress retried with the vocal-load outbox's back-off. A throwaway account (deleted at
// exit), local build, production backend; PATCH /me/progress made to fail in the browser:
//   a. a 503 three times: retried after ~2 s, ~5 s, ~15 s (±20 %), then stored: the server has the new XP
//   b. the request aborted (no response) once: retried, stored
//   c. a 400 (the server refusing the body): not retried
//   d. signed out with a retry waiting: the retry is cancelled, nothing is sent
// Usage: node scripts/backend-verify/progresssave.js
require('../runguard').auto();
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };

(async () => {
  const b = await C.chromium.launch();
  try {
    let plan = []; const seen = []; // plan: what the next PATCHes get ('503' | 'abort' | '400'), then they pass
    const { ctx, page } = await C.openPage(b, { prepare: c => c.route('**/me/progress', r => {
      if (r.request().method() !== 'PATCH') return r.continue();
      const what = plan.shift() || 'pass'; let xp = null; try { xp = JSON.parse(r.request().postData()).xp; } catch (e) {}
      seen.push({ t: Date.now(), what, xp });
      if (what === '503') return r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Service Unavailable"}' });
      if (what === '400') return r.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"bad body"}' });
      if (what === 'abort') return r.abort('failed');
      return r.continue();
    }) });
    await C.signUp(page, 'dvsave', 'Save Retry'); await C.clearOverlays(page);
    const uid = await page.evaluate(() => profile.id);
    const serverXp = () => db(`select xp from public.user_progress where user_id = '${uid}'`)[0].xp;
    const waitFor = async (fn, ms) => { const t = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > t) return v; await C.sleep(250); } };

    await C.G.step('503 three times', 60, async () => { // normally 25 s
      plan = ['503', '503', '503']; const s0 = seen.length;
      const xp = await page.evaluate(async () => { progress.xp = (progress.xp || 0) + 111; await saveProgress(); return progress.xp; });
      const ok = await waitFor(() => seen.length - s0 >= 4, 40000);
      const mine = seen.slice(s0), gaps = mine.slice(1).map((x, i) => (x.t - mine[i].t) / 1000);
      check('a 503: retried after ~2 s, ~5 s, ~15 s (±20 %, plus the request\'s own time), then sent', ok && mine.slice(0, 3).every(x => x.what === '503') && mine[3].what === 'pass'
        && gaps[0] >= 1.6 && gaps[0] <= 3.2 && gaps[1] >= 4 && gaps[1] <= 7 && gaps[2] >= 12 && gaps[2] <= 19.5, `${mine.map(x => x.what).join(', ')}; gaps ${gaps.map(g => g.toFixed(1)).join(', ')} s`);
      await C.sleep(1500);
      check('…and stored: the server has the new XP', serverXp() === xp, `server ${serverXp()}, page ${xp}`);
    });
    await C.G.step('abort once', 40, async () => {
      plan = ['abort']; const s0 = seen.length;
      const xp = await page.evaluate(async () => { progress.xp += 7; await saveProgress(); return progress.xp; });
      await waitFor(() => seen.length - s0 >= 2, 10000); await C.sleep(1500);
      const mine = seen.slice(s0);
      check('a request aborted (no response): retried and stored', mine.length >= 2 && mine[0].what === 'abort' && mine[1].what === 'pass' && serverXp() === xp, `${mine.map(x => x.what).join(', ')}, server ${serverXp()}`);
    });
    await C.G.step('400', 40, async () => {
      plan = ['400']; const s0 = seen.length;
      await page.evaluate(async () => { progress.xp += 1; await saveProgress(); });
      await C.sleep(9000);
      check('a 400 (the server refusing the body): not retried', seen.length - s0 === 1, `${seen.length - s0} PATCH in 9 s`);
    });
    await C.G.step('sign out with a retry waiting', 40, async () => {
      plan = ['503']; const s0 = seen.length;
      await page.evaluate(async () => { progress.xp += 1; await saveProgress(); });
      const waiting = await page.evaluate(() => !!progressRetry.timer);
      await page.evaluate(() => document.getElementById('dashSignOutBtn').click()); await C.sleep(9000);
      check('signed out with a retry waiting: cancelled, nothing more sent', waiting && seen.length - s0 === 1 && await page.evaluate(() => !progressRetry.timer && !profile), `waiting ${waiting}, ${seen.length - s0} PATCH`);
    });
    await ctx.close();
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${fail ? 'PROGRESSSAVE: FAIL' : 'PROGRESSSAVE: PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
