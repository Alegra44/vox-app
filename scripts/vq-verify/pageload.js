// Measures the signed-in page load on production, as a returning user gets it: one throwaway account (testAccounts.js,
// deleted at exit) signs up once, then PL_LOADS fresh browsers open the page with its saved session. For each load:
// time from navigation start until the app has both `profile` and `progress` (onSignedIn), each Supabase request's
// duration (auth, /me for the profile, /me/progress, ...) and every 401 / 403 / 429 (or other 4xx/5xx) response. Nothing is fixed.
// Usage: [PL_URL=<url>] [PL_LOADS=20] [PL_PACE_MS=30000] [PL_TIMEOUT_MS=60000] node scripts/vq-verify/pageload.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { track } = require('../choir-verify/testAccounts');
const URL_ = process.env.PL_URL || 'https://deploy-alegra1122.vercel.app', LOADS = +(process.env.PL_LOADS || 20);
const PACE = +(process.env.PL_PACE_MS ?? 30000), TIMEOUT = +(process.env.PL_TIMEOUT_MS || 60000);
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `pageload-prod-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ACCT = { email: track(`voxcoach-pageload-${Date.now()}@example.com`), password: 'PL-' + Math.random().toString(36).slice(2) + '!x9' };
let lastLoad = 0;

async function load(auth, i) {
  const w = lastLoad + PACE - Date.now(); if (w > 0) await sleep(w); lastLoad = Date.now();
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, ...(auth ? { storageState: auth } : {}) });
    const page = await ctx.newPage(), reqs = [], bad = [];
    page.on('requestfinished', async r => {
      const u = new URL(r.url()); if (!/supabase\.co$/.test(u.hostname) && u.hostname !== new URL(URL_).hostname) return;
      const resp = await r.response().catch(() => null), t = r.timing();
      const st = resp ? resp.status() : 0, name = `${r.method()} ${u.hostname.endsWith('supabase.co') ? u.pathname.replace('/functions/v1/api', 'api') : u.pathname}`;
      reqs.push({ name, status: st, ms: Math.round(t.responseEnd), startMs: Math.round(t.startTime) });
      if (st >= 400) bad.push(`${name} → ${st}`);
    });
    page.on('requestfailed', r => bad.push(`${r.method()} ${r.url()} failed: ${r.failure()?.errorText}`));
    const resp = await page.goto(URL_, { waitUntil: 'commit' });
    if (resp && resp.status() >= 400) bad.push(`page → ${resp.status()}`);
    const t0 = await page.evaluate(() => performance.timeOrigin);
    if (!auth) {
      await page.waitForLoadState('load'); await sleep(1500);
      const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
      await page.evaluate(() => openAuthModal());
      await page.locator('#authName').fill('Pageload Check');
      await page.locator('#authEmail').fill(ACCT.email); await page.locator('#authPassword').fill(ACCT.password);
      await page.locator('#authCreateBtn').click();
    }
    let readyMs = null;
    try {
      await page.waitForFunction(() => typeof profile !== 'undefined' && !!profile && typeof progress !== 'undefined' && !!progress, null, { timeout: TIMEOUT, polling: 50 });
      readyMs = Math.round(await page.evaluate(() => performance.now()));
    } catch (e) { bad.push(`profile/progress not set within ${TIMEOUT} ms (profile ${await page.evaluate(() => !!(typeof profile !== 'undefined' && profile)).catch(() => '?')}, progress ${await page.evaluate(() => !!(typeof progress !== 'undefined' && progress)).catch(() => '?')})`); }
    await sleep(1000);
    const state = auth ? null : await ctx.storageState();
    return { i, readyMs, reqs, bad, state };
  } finally { await b.close().catch(() => {}); }
}

(async () => {
  log(`pageload ${stamp}  url: ${URL_}  loads: ${LOADS}  pace ${PACE} ms  timeout ${TIMEOUT} ms`);
  const rows = [];
  try {
    const first = await load(null, 0);
    if (!first.readyMs) throw new Error('sign-up load never became ready: ' + first.bad.join('; '));
    log(`sign-up load: ready ${first.readyMs} ms  (${ACCT.email})`);
    for (let i = 1; i <= LOADS; i++) {
      const r = await load(first.state, i); delete r.state; rows.push(r);
      const prog = r.reqs.filter(q => /GET api\/me\/progress/.test(q.name)), prof = r.reqs.filter(q => /^GET api\/me$/.test(q.name));
      const auth = r.reqs.filter(q => /auth\/v1/.test(q.name));
      log(`load ${String(i).padStart(2)}  ready ${r.readyMs ?? 'TIMEOUT'} ms  | /me/progress ${prog.map(q => `${q.status} ${q.ms} ms`).join(', ') || 'none'}  | /me ${prof.map(q => `${q.status} ${q.ms} ms`).join(', ') || 'none'}  | auth ${auth.map(q => `${q.name.replace('/auth/v1/', '')} ${q.status} ${q.ms} ms`).join(', ') || 'none'}${r.bad.length ? '  | BAD: ' + r.bad.join('; ') : ''}`);
      fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
    }
  } catch (e) { log('ERROR ' + (e.stack || e)); process.exitCode = 2; }
  const ready = rows.map(r => r.readyMs).filter(x => x != null).sort((a, b) => a - b), q = p => ready[Math.min(ready.length - 1, Math.floor(p * ready.length))];
  const prog = rows.flatMap(r => r.reqs.filter(x => /GET api\/me\/progress/.test(x.name)).map(x => x.ms)).sort((a, b) => a - b);
  log(`\n== ${rows.length} loads: ready (profile+progress) min ${ready[0]} / median ${q(0.5)} / p90 ${q(0.9)} / max ${ready[ready.length - 1]} ms; over 20 s: ${ready.filter(x => x > 20000).length}; timeouts: ${rows.length - ready.length}`);
  log(`   /me/progress: min ${prog[0]} / median ${prog[Math.floor(prog.length / 2)]} / max ${prog[prog.length - 1]} ms over ${prog.length} requests`);
  const codes = rows.flatMap(r => r.reqs.filter(x => [401, 403, 429].includes(x.status)).map(x => `load ${r.i}: ${x.name} ${x.status}`));
  log(`   401 / 403 / 429: ${codes.length ? codes.join('; ') : 'none'}`);
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
})();
