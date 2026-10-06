// Vocal Load phase 3a (Register Coach pilot), end to end: a throwaway account signed up through the auth modal (deleted
// at exit by testAccounts.js), Register Coach reached through the Train hub and started/stopped with its own mic
// button, a known tone as the mic (Chromium's file-backed fake mic). Checks the gauge against a hand calculation, that
// it resumes today's total after a reload, a page-hide save, all four languages, that it isn't plan-gated, and that it
// is hidden when signed out.
// Usage: node scripts/vocal-load-verify/pilot.js [url]   (no url: deploy/ served locally, against the production backend)
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track, db } = require('../choir-verify/testAccounts');
const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const TMP = TESTDATA; fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const email = track(`voxcoach-vlp-${Date.now()}@example.com`), password = 'VP-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0, auth = null;
function check(label, ok, detail) { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(62)} ${detail}`); }

// The mic: 220 Hz (MIDI 57) with a harmonic roll-off, 60 s, looped by Chromium.
const WAV = path.join(TMP, 'vlp-220.wav');
execFileSync('python', [path.join(__dirname, '../vq-verify/gen.py'), WAV, JSON.stringify({ f0: 220, harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 60 })]);
// By hand: a new user has no stored sessions and no saved range, so the range is A2–C5 (45–72, passaggio 45 + 0.6 × 27 =
// 61.2) and loudness calibrates (ratio 1 for the first 30 active seconds; a steady tone is at its own median after).
// pitch_ratio = (57 − 45) / 16.2 = 0.740741 → load_rate = 1.740741 per active second. Budget 6800.
const RATE = 1 + 12 / 16.2, BUDGET = 6800;
const TPL = { en: ['Vocal load today', n => `${n}% of daily budget`, 'en-US'], fr: ['Charge vocale du jour', n => `${n} % du budget quotidien`, 'fr-FR'],
  es: ['Carga vocal de hoy', n => `${n} % del presupuesto diario`, 'es-ES'], tr: ['Bugünkü ses yükü', n => `Günlük bütçe: %${n}`, 'tr-TR'] };
const shown = (pct, lang) => { const v = pct < 10 ? Math.round(pct * 10) / 10 : Math.round(pct); return TPL[lang][1](v.toLocaleString(TPL[lang][2], { maximumFractionDigits: 1 })); };

async function openPage(b, { signedIn = true } = {}) {
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(signedIn && auth ? { storageState: auth } : {}) });
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /vocal load/i.test(m.text())) errors.push(m.text()); });
  const resp = await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(3000);
  if (!resp || resp.status() >= 400) throw new Error('page answered ' + (resp && resp.status()));
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  if (signedIn && !auth) {
    await page.evaluate(() => openAuthModal());
    await page.locator('#authName').fill('VL Pilot'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
    await page.locator('#authCreateBtn').click();
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
    auth = await ctx.storageState(); console.log(`   signed up ${email}`);
  }
  if (signedIn) await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  return { ctx, page, errors };
}
async function toRegisterCoach(page) {
  await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
  await page.locator('#panel-train-hub [data-enter-panel="register"]').click(); await sleep(800);
  return page.evaluate(() => document.getElementById('panel-register').classList.contains('active') || getComputedStyle(document.getElementById('panel-register')).display !== 'none');
}
// The gauge stays hidden until today's total has come back from the server (never a wrong 0% meanwhile).
const gaugeShown = page => page.waitForFunction(() => getComputedStyle(document.getElementById('vlGauge')).display !== 'none', null, { timeout: 15000 }).catch(() => {});
const gauge = page => page.evaluate(() => {
  const g = document.getElementById('vlGauge');
  return { visible: !!g && getComputedStyle(g).display !== 'none', label: document.getElementById('vlGaugeLabel')?.textContent, val: document.getElementById('vlGaugeVal')?.textContent,
    hasFill: !!document.getElementById('vlGaugeFill'), fill: document.getElementById('vlGaugeFill')?.style.width, pct: typeof vlPercent === 'function' ? vlPercent() : null, ariaText: g && g.getAttribute('aria-valuetext') };
});
// Chromium's file mic is silent for its first ~1.5 s: warm it on a throwaway stream before the app opens its own.
const warm = page => page.evaluate(async () => {
  const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now(); ac.createMediaStreamSource(st).connect(an);
  let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
  st.getTracks().forEach(t => t.stop()); await ac.close(); return heard;
});
async function sing(page, seconds, stop = true) {
  if (!await warm(page)) throw new Error('fake mic silent');
  await page.locator('#regMicBtn').click();
  await sleep(seconds * 1000);
  if (stop) { await page.locator('#regMicBtn').click(); await sleep(500); }
}
const uid = () => db(`select id from auth.users where email = '${email}'`)[0].id;
const rowsDb = () => db(`select active_seconds, load, ended, median_rms, p5_midi, p95_midi from public.vocal_load_sessions where user_id = '${uid()}' order by started_at`);
const dailyDb = () => db(`select day::text, total_load from public.vocal_load_daily where user_id = '${uid()}'`);
async function waitRows(n, endedAll) {
  for (let i = 0; i < 12; i++) { const r = rowsDb(); if (r.length >= n && (!endedAll || r.every(x => x.ended))) return r; await sleep(2000); }
  return rowsDb();
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] });
  try {
    console.log(`== ${URL_ || 'local deploy/ + production backend'}`);
    let { ctx, page, errors } = await openPage(b);
    check('Register Coach reached through the Train hub', await toRegisterCoach(page), '');
    await gaugeShown(page);
    let g = await gauge(page);
    check('gauge visible to a signed-in user, starts at 0 for a new account', g.visible && g.val === shown(0, 'en'), `"${g.label}" "${g.val}"`);

    console.log('\n-- session 1: 20 s through the mic button, then stop');
    await sing(page, 20);
    let rows = await waitRows(1, true);
    const a1 = Number(rows[0].active_seconds), l1 = Number(rows[0].load);
    check('stored: 1 session, ended', rows.length === 1 && rows[0].ended === true, JSON.stringify(rows[0]));
    check('active seconds plausible for 20 s of tone (18.5–20.1)', a1 >= 18.5 && a1 <= 20.1, `${a1.toFixed(3)} s`);
    check('stored load = active × 1.740741 (hand), within 0.5%', Math.abs(l1 - a1 * RATE) <= 0.005 * a1 * RATE, `stored ${l1.toFixed(4)} vs hand ${(a1 * RATE).toFixed(4)}`);
    check('median RMS and pitch stored (pitch ≈ 57)', rows[0].median_rms > 0 && Math.abs(rows[0].p5_midi - 57) < 0.2 && Math.abs(rows[0].p95_midi - 57) < 0.2, `rms ${Number(rows[0].median_rms).toFixed(4)}, p5 ${Number(rows[0].p5_midi).toFixed(3)}, p95 ${Number(rows[0].p95_midi).toFixed(3)}`);
    g = await gauge(page);
    const p1 = l1 / BUDGET * 100;
    check('gauge % = stored load / 6800 × 100', Math.abs(g.pct - p1) < 1e-6, `page ${g.pct.toFixed(6)} vs ${p1.toFixed(6)}`);
    check('gauge shows it', g.val === shown(p1, 'en'), `"${g.val}" (expected "${shown(p1, 'en')}")`);
    check('page errors', errors.length === 0, errors.join(' | ') || 'none');
    await ctx.close();

    console.log('\n-- reload: resumes today\'s total from the server');
    ({ ctx, page, errors } = await openPage(b));
    await toRegisterCoach(page); await gaugeShown(page); await sleep(500);
    g = await gauge(page);
    check('after reload, before singing: same total, not 0', Math.abs(g.pct - p1) < 1e-6 && g.val === shown(p1, 'en'), `"${g.val}" pct ${g.pct.toFixed(6)}`);

    console.log('\n-- session 2: 15 s more');
    await sing(page, 15);
    rows = await waitRows(2, true);
    const a2 = Number(rows[1].active_seconds), l2 = Number(rows[1].load);
    // session 1 had under 60 active s, so it isn't a baseline session: session 2 calibrates again, same rate
    check('session 2 load = active × 1.740741 (hand), within 0.5%', Math.abs(l2 - a2 * RATE) <= 0.005 * a2 * RATE, `${a2.toFixed(3)} s → stored ${l2.toFixed(4)} vs hand ${(a2 * RATE).toFixed(4)}`);
    g = await gauge(page);
    const p2 = (l1 + l2) / BUDGET * 100;
    check('gauge = (session 1 + session 2) / 6800', Math.abs(g.pct - p2) < 1e-6 && g.val === shown(p2, 'en'), `"${g.val}" pct ${g.pct.toFixed(6)} vs ${p2.toFixed(6)}`);
    let daily = dailyDb();
    check('daily table = session 1 + session 2', daily.length === 1 && Math.abs(Number(daily[0].total_load) - (l1 + l2)) < 1e-6, JSON.stringify(daily));

    console.log('\n-- all four languages (switched with the Profile language buttons, gauge open)');
    for (const lang of ['fr', 'es', 'tr', 'en']) {
      await page.evaluate(l => document.querySelector(`#profileLanguageRow [data-profile-lang="${l}"]`).click(), lang); await sleep(700);
      g = await gauge(page);
      check(`${lang}: label`, g.label === TPL[lang][0], `"${g.label}"`);
      check(`${lang}: value re-rendered in the new language`, g.val === shown(p2, lang), `"${g.val}"`);
      check(`${lang}: structure intact, aria text matches`, g.hasFill && g.ariaText === g.val && !/vl_gauge/.test(g.label + g.val), `fill ${g.fill}`);
    }
    check('page errors', errors.length === 0, errors.join(' | ') || 'none');

    console.log('\n-- session 3: 8 s, then the page is left (navigation) without stopping');
    await sing(page, 8, false);
    await page.goto('about:blank'); await sleep(3000);
    rows = await waitRows(3, false);
    const a3 = Number(rows[2]?.active_seconds), l3 = Number(rows[2]?.load);
    check('saved on leaving the page (keepalive): ~8 s, not ended', rows.length === 3 && a3 >= 6.5 && a3 <= 8.1 && rows[2].ended === false, `${rows.length} rows; ${a3.toFixed(3)} s, load ${l3.toFixed(4)}, ended ${rows[2]?.ended}`);
    check('  its load = active × 1.740741', Math.abs(l3 - a3 * RATE) <= 0.005 * a3 * RATE, `hand ${(a3 * RATE).toFixed(4)}`);
    await ctx.close();

    console.log('\n-- not plan-gated: trial ended, no plan');
    db(`update public.users set trial_start_date = current_date - 30 where email = '${email}'`);
    ({ ctx, page, errors } = await openPage(b));
    await toRegisterCoach(page); await gaugeShown(page); await sleep(500);
    g = await gauge(page);
    const paid = await page.evaluate(() => isPaid());
    const p3 = (l1 + l2 + l3) / BUDGET * 100;
    check('isPaid() false, gauge still shows today (3 sessions)', paid === false && g.visible && Math.abs(g.pct - p3) < 1e-6 && g.val === shown(p3, 'en'), `paid ${paid}, "${g.val}"`);
    await page.locator('#regMicBtn').click(); await sleep(1500);
    const paywall = await page.evaluate(() => { const o = [...document.querySelectorAll('[id*="aywall"]')].find(e => getComputedStyle(e).display !== 'none' && e.offsetParent !== null); return !!o; });
    check('the Coach itself still asks for a plan (no session started)', paywall && (await page.evaluate(() => vlRun === null)), `paywall shown ${paywall}`);
    await ctx.close();

    console.log('\n-- signed out');
    ({ ctx, page, errors } = await openPage(b, { signedIn: false }));
    await page.evaluate(() => enterPanel('register')); await sleep(500);
    g = await gauge(page);
    check('gauge hidden when signed out', !g.visible, `visible ${g.visible}`);
    await ctx.close();
  } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
