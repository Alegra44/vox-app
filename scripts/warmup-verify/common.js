// Shared by the warm-up checks: the browser with a file mic, one throwaway account (deleted however the run ends, see
// testAccounts.js), and a page on the deployed URL or on deploy/ served locally against the production backend.
// Run from the main checkout (the Supabase CLI link lives there): node scripts/warmup-verify/<script>.js [url]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track, db } = require('../choir-verify/testAccounts');

const URL_ = process.argv[2] && /^https?:/.test(process.argv[2]) ? process.argv[2] : null;
const LOCAL = 'http://localhost:8765/', DEPLOY = process.env.WU_DEPLOY || path.resolve(__dirname, '../../deploy');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function check(label, ok, detail = '') { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(70)} ${detail}`); return ok; }
const totals = () => ({ pass, fail });

// C4 with a harmonic roll-off, looped by Chromium
function tone(midi = 60) {
  const wav = path.join(TMP, `wu-${midi}.wav`), hz = 440 * Math.pow(2, (midi - 69) / 12);
  execFileSync('python', [path.join(__dirname, '../vq-verify/gen.py'), wav, JSON.stringify({ f0: hz, harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 60 })]);
  return { wav, hz, midi };
}
function launch(wav) {
  return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
}
const INIT = () => {
  let s = 1; window.__seed = v => { s = v >>> 0 || 1; };
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  window.__gum = [];
  const md = navigator.mediaDevices, orig = md.getUserMedia.bind(md);
  md.getUserMedia = c => { window.__gum.push(JSON.stringify(c)); return orig(c); };
};
const account = { email: null, password: 'WU-' + Math.random().toString(36).slice(2) + '!x9', auth: null };
// html: serve this file as index.html instead of deploy/index.html (local only)
async function openPage(b, { signedIn = true, viewport = { width: 1280, height: 900 }, html } = {}) {
  const ctx = await b.newContext({ permissions: ['microphone'], viewport, ...(signedIn && account.auth ? { storageState: account.auth } : {}) });
  if (!URL_) await ctx.route(LOCAL + '**', r => {
    const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html';
    r.fulfill({ path: p === 'index.html' && html ? html : path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' });
  });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  let resp;
  for (let i = 1; ; i++) {
    resp = await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(3000);
    const ok = resp && resp.status() < 400 && await page.evaluate(() => { try { return typeof sb !== 'undefined'; } catch { return false; } });
    if (ok) break;
    if (i >= 3) throw new Error('page failed to load (status ' + (resp && resp.status()) + ' or Supabase CDN missing)');
    await sleep(5000);
  }
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  if (signedIn && !account.auth) {
    account.email = track(`voxcoach-wu-${Date.now()}@example.com`);
    await page.evaluate(() => openAuthModal());
    await page.locator('#authName').fill('WU Harness'); await page.locator('#authEmail').fill(account.email); await page.locator('#authPassword').fill(account.password);
    await page.locator('#authCreateBtn').click();
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
    account.auth = await ctx.storageState(); console.log(`   signed up ${account.email}`);
  }
  if (signedIn) await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
  // keep the newest session: Supabase rotates the refresh token (1 h access tokens), so a later page that starts from the
  // sign-up's tokens after an earlier page refreshed them can't sign in
  if (signedIn) account.auth = await ctx.storageState();
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  return { ctx, page, errors };
}
const uid = () => db(`select id from auth.users where email = '${account.email}'`)[0].id;
// Chromium's file mic is silent for its first ~1.5 s: warm it on a throwaway stream before the app opens its own.
const warm = page => page.evaluate(async () => {
  const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now(); ac.createMediaStreamSource(st).connect(an);
  let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
  st.getTracks().forEach(t => t.stop()); await ac.close(); window.__gum = []; return heard;
});
// Arms the gate again as if no warm-up had happened today.
const rearm = page => page.evaluate(() => { wuPassedKey = null; try { localStorage.removeItem(wuKey()); } catch (e) {} });
const overlayShown = page => page.evaluate(() => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none');

module.exports = { URL_, LOCAL, DEPLOY, TMP, sleep, check, totals, tone, launch, openPage, account, uid, db, warm, rearm, overlayShown };
