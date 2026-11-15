// Scoring batch release A on production: one end-to-end case for the vocal-load outbox (A1). A throwaway account (deleted
// at exit), Chromium's file-backed fake mic playing C4:
//   1. signed up and signed in; every PUT /me/vocal-load/sessions/:id blocked (the request fails, no response)
//   2. one short Pitch Match (target C4) through its own buttons; the idle timer ends the session
//      → nothing on the server, the session waiting in this device's outbox, the gauge counting it
//   3. the PUT unblocked, the page reloaded → the outbox sends it on sign-in: one ended row on the server, the outbox
//      empty, and GET /me/vocal-load (through the app's own apiFetch) has today's dayLoad = that row's load
// Usage: node scripts/scoring-verify/prodE2E.js [url]   (default https://deploy-alegra1122.vercel.app/)
require('../runguard').auto();
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata');
require('../warmup-verify/noWarmup');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const { track, db, cleanup } = require('../choir-verify/testAccounts');
const G = require('../runguard');
const URL_ = process.argv[2] || 'https://deploy-alegra1122.vercel.app/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
fs.mkdirSync(TESTDATA, { recursive: true });
const WAV = path.join(TESTDATA, 'prode2e-c4.wav');
execFileSync('python', [path.join(__dirname, '../vq-verify/gen.py'), WAV, JSON.stringify({ f0: 440 * Math.pow(2, -9 / 12), harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 60 })]);
const email = track(`voxcoach-dve2e-${Date.now()}@example.com`), password = 'DV-' + Math.random().toString(36).slice(2) + '!x9';

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
    let block = true; const puts = [];
    await ctx.route('**/me/vocal-load/sessions/**', r => {
      if (r.request().method() !== 'PUT') return r.continue();
      puts.push({ block, t: Date.now() }); return block ? r.abort('failed') : r.continue();
    });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const ready = async () => {
      await page.waitForFunction(() => typeof sb !== 'undefined', null, { timeout: 30000 });
      const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible().catch(() => false)) await lang.click();
    };
    await G.step('open and sign up', 90, async () => {
      await page.goto(URL_, { waitUntil: 'load' }); await ready();
      await page.evaluate(() => { openAuthModal(); setAuthMode('signup'); });
      await page.locator('#authName').fill('Outbox Live'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
      await page.locator('#authCreateBtn').click();
      await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 30000 });
      await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
    });
    const uid = await page.evaluate(() => profile.id);
    const rows = () => db(`select session_id::text as id, active_seconds, load, ended, day::text from public.vocal_load_sessions where user_id = '${uid}' order by started_at`);
    const box = () => page.evaluate(u => { try { const s = JSON.parse(localStorage.getItem('vl-outbox:' + u) || '{}'); const e = Object.entries(s.entries || {}); return { n: e.length, ids: e.map(x => x[0]), load: e.map(x => x[1].payload.load), ended: e.map(x => x[1].payload.ended) }; } catch (e) { return { n: -1 }; } }, uid);
    console.log(`== ${URL_}\n   signed up ${email}`);

    let ob;
    await G.step('Pitch Match with the PUT blocked', 120, async () => {
      await page.locator('.snb-item[data-shell="train"]').click(); await sleep(500);
      await page.locator('#panel-train-hub [data-enter-panel="exercises"]').click(); await sleep(800);
      await page.evaluate(() => { pitchTargetMidi = 60; document.getElementById('pitchTargetNote').textContent = noteNameFromMidi(60); });
      // Chromium's file mic is silent for its first ~1.5 s: warmed on a throwaway stream first (as batch1.js)
      await page.evaluate(async () => { const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now(); ac.createMediaStreamSource(st).connect(an);
        let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
        st.getTracks().forEach(t => t.stop()); await ac.close(); });
      await page.locator('#pitchListenBtn').click();
      await page.waitForFunction(() => !!document.getElementById('pitchListenBtn').disabled, null, { timeout: 10000 });
      await page.waitForFunction(() => !document.getElementById('pitchListenBtn').disabled, null, { timeout: 60000, polling: 100 });
      // the idle timer ends the session (3 s) and writes its end, which fails; wait for the ended payload in the outbox
      const t = Date.now() + 30000; for (;;) { ob = await box(); if ((ob.n === 1 && ob.ended[0]) || Date.now() > t) break; await sleep(500); }
    });
    const acc = await page.evaluate(() => document.getElementById('pitchAccuracyVal').textContent);
    check('Pitch Match ran and scored', !!acc && acc !== '—' && acc !== '', `accuracy "${acc}"`);
    check('the PUT was tried and blocked', puts.length > 0 && puts.every(p => p.block), `${puts.length} PUT, all blocked`);
    check('nothing on the server', rows().length === 0, `${rows().length} rows`);
    check('the ended session waits in this device\'s outbox', ob.n === 1 && ob.ended[0] === true && ob.load[0] > 0, `${ob.n} waiting, load ${ob.load && ob.load[0]}`);
    const pend = await page.evaluate(() => { const bx = vlOutbox(); return bx ? bx.pendingLoad(todayStr()) : null; });
    check('the gauge counts it (pending load = the waiting load)', pend !== null && Math.abs(pend - ob.load[0]) < 1e-6, `pending ${pend}`);

    block = false; const p0 = puts.length;
    await G.step('reload, PUT unblocked', 90, async () => {
      await page.reload({ waitUntil: 'load' }); await ready();
      await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 30000 });
      const t = Date.now() + 40000; for (;;) { const r = rows(); if ((r.length && r[0].ended && (await box()).n === 0) || Date.now() > t) break; await sleep(1000); }
    });
    const r = rows(), after = await box();
    check('after the reload the outbox sent it: one ended row, the same session', r.length === 1 && r[0].ended && r[0].id === ob.ids[0] && puts.slice(p0).length >= 1, `${r.length} row(s), ended ${r[0] && r[0].ended}, ${puts.slice(p0).length} PUT after reload`);
    check('stored load = the load that waited', r.length === 1 && Math.abs(Number(r[0].load) - ob.load[0]) < 1e-3, `stored ${r[0] && r[0].load}, waited ${ob.load[0]}`);
    check('the outbox is empty', after.n === 0, `${after.n} waiting`);
    const st = await page.evaluate(async d => apiFetch('/me/vocal-load?day=' + d), r[0] && r[0].day);
    check('GET /me/vocal-load shows the session: today\'s dayLoad = its load', st && r.length === 1 && Math.abs(Number(st.dayLoad) - Number(r[0].load)) < 1e-3, `dayLoad ${st && st.dayLoad}, day ${r[0] && r[0].day}`);
    check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  } finally { await b.close(); cleanup(); }
  console.log(`\n${fail ? 'PRODE2E: FAIL' : 'PRODE2E: PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
