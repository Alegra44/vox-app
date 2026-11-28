// Release J (RELEASE_J.md; Survey J): release A's retry on the versioned save (0012). A save reaches the server and is written, but
// its answer never reaches the page (the request aborted after the server answered); the retry is refused (409, the
// row moved on) and must not count the save twice. LOCAL stack, the slow proxy. Throwaway account, deleted at exit.
// Usage: node scripts/survey-j/lostanswer.js [--ref <git ref>]   (default: the working copy's deploy/; master: loses the +100)
//   1. lost answer, nothing else: XP + 7 once → the server has + 7
//   2. lost answer, then another device adds 100 XP before the retry → the server has + 107
require('../runguard').auto();
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const ri = process.argv.indexOf('--ref'), REF = ri > 0 ? process.argv[ri + 1] : null;
let pass = 0, fail = 0;
const check = (n, ok, d) => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); ok ? pass++ : fail++; };
(async () => {
  const b = await C.chromium.launch();
  try {
    let lose = 0; const seen = [];
    const { page } = await C.openPage(b, { dir: C.buildDir(REF), prepare: c => c.route('**/me/progress', async r => {
      if (r.request().method() !== 'PATCH') return r.continue();
      if (lose > 0) { lose--; const res = await r.fetch(); seen.push(`written ${res.status()}, answer lost`); return r.abort('failed'); }
      const res = await r.fetch(); seen.push(String(res.status())); return r.fulfill({ response: res });
    }) });
    await C.signUp(page, 'svjlost', 'Lost Answer'); await C.clearOverlays(page);
    const uid = await page.evaluate(() => profile.id), xp = () => db(`select xp from public.user_progress where user_id = '${uid}'`)[0].xp;
    const settle = async () => { for (let i = 0; i < 120; i++) { await C.sleep(250); if (await page.evaluate(() => (typeof progressInFlight === 'undefined' || !progressInFlight) && !progressRetry.timer)) return; } };
    await settle();
    for (const [name, other] of [['lost answer', 0], ['lost answer, then another device +100', 100]]) {
      await settle(); const x0 = xp(); seen.length = 0; lose = 1;
      await page.evaluate(() => { progress.xp = (progress.xp || 0) + 7; return saveProgress(); });
      if (other) db(`update public.user_progress set xp = xp + ${other} where user_id = '${uid}'`);
      await C.sleep(4000); await settle();
      const x1 = xp(), pageXp = await page.evaluate(() => progress.xp);
      check(`${name}: the server has + ${7 + other}, not more`, x1 === x0 + 7 + other, `server ${x0} → ${x1}, page ${pageXp}; PATCHes ${seen.join(', ')}`);
    }
  } finally { await b.close(); C.cleanup(); }
  console.log(`\nLOSTANSWER: ${fail ? 'FAIL' : 'PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
