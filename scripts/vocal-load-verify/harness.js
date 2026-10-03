// Vocal Load phase 3b, batches 2 onward: the checks of batch1.js, driven by a table of features, so every batch runs
// the same checks. A batch script lists its features and calls run(FEATURES). For each feature:
//   - it is reached through its hub, its gauge shows today's total so far
//   - it runs once with the load feed stubbed out (vlSidecar for a feature on the shared mic, vlFeed for one that reads
//     the register input or its own unprocessed stream itself: = the code before 3b) and once live, and its own result
//     is the same both times
//   - kind 'sidecar' (shared mic): while the sidecar runs, its own mic track is live, unmuted, NS/AGC/EC unchanged, and
//     its own analyser hears the same tone. Kind 'register' (reads the register input): no second register stream is
//     opened for the load. Kind 'own' (its own unprocessed capture, vqCapture): no extra stream, no register input
//   - the stored session: exactly one, active seconds ≈ how long the feature listened, load = active × rate by hand,
//     pitch ≈ the tone's; the gauge moved while it ran and ends at today's stored total / 6800
// Then: every gauge (these features' and Register Coach's) resumes today's total after a reload, the daily table is the
// sum of the sessions, all four languages, a Safari user agent (sidecar features: no second stream, nothing stored,
// gauge hidden; register-input features: gauge still shown), and signed out (all hidden).
// The test account is deleted however the run ends (testAccounts.js).
// Usage: node scripts/vocal-load-verify/batchN.js [url]   (no url: deploy/ served locally, against the production backend)
// VLB_ONLY=a,b runs only those features (debugging).
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track, db, cleanup } = require('../choir-verify/testAccounts');

const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const email = track(`voxcoach-vlh-${Date.now()}@example.com`), password = 'VH-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0, auth = null;
function check(label, ok, detail) { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(66)} ${detail}`); }

// The mic: C4 with a harmonic roll-off, 60 s, looped by Chromium. By hand, as in batch1.js: a new user has no stored
// sessions and no saved range of 12 st or more, so the range is A2–C5 (passaggio 61.2); no session reaches 60 active s,
// so each calibrates its own loudness (ratio 1): load_rate = 1 + (60 − 45) / 16.2 = 1.925926 per active second.
const BUDGET = 6800;
const TONE = { midi: 60, rate: 1 + 15 / 16.2 };
TONE.wav = path.join(TMP, 'vlh-c4.wav'); TONE.hz = 440 * Math.pow(2, (TONE.midi - 69) / 12);
execFileSync('python', [path.join(__dirname, '../vq-verify/gen.py'), TONE.wav, JSON.stringify({ f0: TONE.hz, harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 60 })]);
const TPL = { en: ['Vocal load today', n => `${n}% of daily budget`, 'en-US'], fr: ['Charge vocale du jour', n => `${n} % du budget quotidien`, 'fr-FR'],
  es: ['Carga vocal de hoy', n => `${n} % del presupuesto diario`, 'es-ES'], tr: ['Bugünkü ses yükü', n => `Günlük bütçe: %${n}`, 'tr-TR'] };
const shown = (pct, lang) => { const v = pct < 10 ? Math.round(pct * 10) / 10 : Math.round(pct); return TPL[lang][1](v.toLocaleString(TPL[lang][2], { maximumFractionDigits: 1 })); };
const SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

const INIT = () => {
  let s = 1; window.__seed = v => { s = v >>> 0 || 1; };
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  window.__gum = [];
  const md = navigator.mediaDevices, orig = md.getUserMedia.bind(md);
  md.getUserMedia = c => { window.__gum.push(JSON.stringify(c)); return orig(c); };
};
async function openPage(b, { signedIn = true, ua } = {}) {
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(ua ? { userAgent: ua } : {}), ...(signedIn && auth ? { storageState: auth } : {}) });
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /vocal load/i.test(m.text())) errors.push(m.text()); });
  const resp = await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(3000);
  if (!resp || resp.status() >= 400) throw new Error('page answered ' + (resp && resp.status()));
  if (!await page.evaluate(() => { try { return typeof sb !== 'undefined'; } catch { return false; } })) throw new Error('Supabase client missing (CDN script failed to load)');
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  if (signedIn && !auth) {
    await page.evaluate(() => openAuthModal());
    await page.locator('#authName').fill('VL Harness'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
    await page.locator('#authCreateBtn').click();
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
    auth = await ctx.storageState(); console.log(`   signed up ${email}`);
  }
  if (signedIn) await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  if (signedIn) await page.waitForFunction(() => getComputedStyle(document.getElementById('vlGauge')).display !== 'none', null, { timeout: 15000 }).catch(() => {});
  return { ctx, page, errors };
}
// Through the navigation bar and the hub, as a user would.
async function goTo(page, F) {
  if (F.xp) { // the level a game unlocks at: set on the server (an in-page change is overwritten by the next sync), then
    db(`update public.user_progress set xp = greatest(xp, ${F.xp}) where user_id = '${uid()}'`); // reloaded as the app does
    await page.evaluate(async () => { await loadProgress(); renderArcadeLocks(); });
  }
  await page.locator(`.snb-item[data-shell="${F.shell}"]`).click(); await sleep(500);
  await page.locator(F.enter).first().click(); await sleep(800);
  if (F.tab) { await page.locator(F.tab).click(); await sleep(300); } // a tab inside the panel
  if (F.show) { await page.evaluate(F.show); await sleep(300); }      // state the panel needs before its button shows
  const ok = await page.evaluate(sel => { const e = document.querySelector(sel); return !!e && e.offsetParent !== null; }, startSel(F));
  if (!ok) console.log('     (not visible:', await page.evaluate(sel => JSON.stringify({ xp: progress && progress.xp, level: progress && levelForXp(progress.xp || 0).level,
    panels: [...document.querySelectorAll('section[id^="panel-"]')].filter(s => s.offsetParent !== null).map(s => s.id),
    btn: !!document.querySelector(sel), toast: (document.querySelector('.toast, #toast') || {}).textContent || '' }), startSel(F)), ')');
  return ok;
}
const gauge = (page, id) => page.evaluate(id => {
  const g = document.getElementById(id);
  return { visible: !!g && getComputedStyle(g).display !== 'none', label: g?.querySelector('[data-i18n="vl_gauge_label"]')?.textContent, val: g?.querySelector('.vl-gauge-val')?.textContent,
    fill: g?.querySelector('.vl-gauge-fill')?.style.width, aria: g?.getAttribute('aria-valuetext'), labelledOk: !!g && !!document.getElementById(g.getAttribute('aria-labelledby')),
    pct: typeof vlPercent === 'function' ? vlPercent() : null };
}, id);
// Chromium's file mic is silent for its first ~1.5 s: warm it on a throwaway stream before the app opens its own.
const warm = page => page.evaluate(async () => {
  const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now(); ac.createMediaStreamSource(st).connect(an);
  let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
  st.getTracks().forEach(t => t.stop()); await ac.close(); window.__gum = []; return heard;
});

const startSel = F => F.startSel || '#' + F.startBtn;
const REG_STREAM = c => /"noiseSuppression":false/.test(c);
// The load feed a feature uses, stubbed out (live: false) or restored.
const STUB = {
  sidecar: live => { window.__vlSidecar = window.__vlSidecar || vlSidecar; vlSidecar = live ? window.__vlSidecar : () => {}; },
  register: live => { window.__vlFeed = window.__vlFeed || vlFeed; vlFeed = live ? window.__vlFeed : () => {}; },
};
STUB.own = STUB.register;
async function runOnce(page, F, { live }) {
  // the previous run's register input has closed itself
  await page.waitForFunction(() => !regIn, null, { timeout: 10000 }).catch(() => { throw new Error('register input still open before the run'); });
  await page.evaluate(STUB[F.kind], live);
  if (F.prep) await page.evaluate(F.prep);
  await sleep(300);
  if (!await warm(page)) throw new Error('fake mic silent');
  if (F.start) await F.start(page); else await page.locator(startSel(F)).click();
  await page.waitForFunction(F.active, null, { timeout: 15000 });
  const tStart = Date.now();
  await sleep(F.mid || 3000);
  const mid = await page.evaluate(() => {
    const tr = typeof micStream !== 'undefined' && micStream && micStream.getAudioTracks()[0], s = tr ? tr.getSettings() : {};
    let rms = null, freq = null;
    if (tr && analyser) { analyser.getFloatTimeDomainData(dataArray); rms = +computeRMS(dataArray).toFixed(4); freq = +autoCorrelate(dataArray, audioCtx.sampleRate).toFixed(1); }
    return { gum: window.__gum.slice(), shared: !!tr, regLive: !!regIn && regIn.stream.getAudioTracks()[0].readyState === 'live', live: tr && tr.readyState === 'live', muted: tr && tr.muted,
      ns: s.noiseSuppression, agc: s.autoGainControl, ec: s.echoCancellation, rms, freq, reg: !!regIn, pct: vlPercent() };
  });
  if (F.during) await F.during(page);
  if (F.stopAfter) { await sleep(Math.max(0, F.stopAfter - (Date.now() - tStart))); if (F.snap) F.snapped = await page.evaluate(F.snap); await F.stop(page); }
  await page.waitForFunction(`!(${F.active})`, null, { timeout: 180000, polling: 100 });
  const listened = (Date.now() - tStart) / 1000;
  await sleep(700);
  const result = F.snap && F.stopAfter ? F.snapped : await page.evaluate(F.result);
  return { result, mid, listened };
}
const uid = () => db(`select id from auth.users where email = '${email}'`)[0].id;
const rowsDb = () => db(`select active_seconds, load, ended, median_rms, p5_midi, p95_midi from public.vocal_load_sessions where user_id = '${uid()}' order by started_at`);
const dailyDb = () => db(`select day::text, total_load from public.vocal_load_daily where user_id = '${uid()}'`);
async function waitRows(n) {
  for (let i = 0; i < 12; i++) { const r = rowsDb(); if (r.length >= n && r.every(x => x.ended)) return r; await sleep(2000); }
  return rowsDb();
}

let rowsSeen = 0, totalLoad = 0;
async function feature(page, F) {
  console.log(`\n-- ${F.label}`);
  check('reached through its hub, start button visible', await goTo(page, F), '');
  let g = await gauge(page, F.gauge);
  check('gauge visible in the panel, today\'s total so far', g.visible && g.val === shown(totalLoad / BUDGET * 100, 'en') && g.labelledOk, `"${g.label}" "${g.val}"`);
  // the shared mic's auto gain moves for the first few seconds after it opens: let it settle before the first comparison
  if (F.kind === 'sidecar' && !await page.evaluate(() => !!micStream)) { await warm(page); await page.evaluate(() => initAudio()); await sleep(5000); }
  const off = await runOnce(page, F, { live: false });
  await sleep(1500);
  const rowsOff = rowsDb().length;
  check('load feed stubbed out: no session stored' + (F.kind === 'sidecar' ? ', no register input opened' : ''),
    rowsOff === rowsSeen && (F.kind !== 'sidecar' || (!off.mid.gum.some(REG_STREAM) && !off.mid.reg)), `opened [${off.mid.gum.join(' + ')}], rows ${rowsOff}`);
  const on = await runOnce(page, F, { live: true });
  const same = F.same ? F.same(off.result, on.result) : JSON.stringify(off.result) === JSON.stringify(on.result);
  check('feature result identical with the load feed live', same, `off ${JSON.stringify(off.result)} | on ${JSON.stringify(on.result)}`);
  const m = on.mid, o = off.mid;
  if (F.kind === 'sidecar') {
    check('both live at once: the feature\'s own mic + the register input', m.shared && m.live && m.regLive && m.gum.filter(REG_STREAM).length === 1, `opened this run [${m.gum.join(' + ')}]`);
    check('feature\'s own track still live, unmuted, NS/AGC/EC unchanged', m.live && !m.muted && m.ns === o.ns && m.agc === o.agc && m.ec === o.ec && m.ns === true,
      `on: ns ${m.ns} agc ${m.agc} ec ${m.ec} muted ${m.muted} | off: ns ${o.ns} agc ${o.agc} ec ${o.ec}`);
    check('feature\'s own analyser hears the same tone', Math.abs(m.freq - TONE.hz) < 0.03 * TONE.hz && Math.abs(m.freq - o.freq) < 2 && Math.abs(m.rms - o.rms) <= 0.15 * o.rms,
      `on ${m.freq} Hz rms ${m.rms} | off ${o.freq} Hz rms ${o.rms}`);
  } else if (F.kind === 'own') {
    // its own capture is the one the load reads: the same streams opened as without the feed, and no register input
    check('no extra stream opened for the load, no register input', m.gum.length === o.gum.length && m.gum.length <= 1 && !m.reg,
      `on [${m.gum.join(' + ')}] | off [${o.gum.join(' + ')}]`);
  } else {
    // its own register stream is the one the load reads: exactly as many register streams opened as without the feed
    check('no second register stream opened for the load', m.gum.filter(REG_STREAM).length === o.gum.filter(REG_STREAM).length && m.gum.filter(REG_STREAM).length <= 1 && m.regLive,
      `on [${m.gum.join(' + ')}] | off [${o.gum.join(' + ')}]`);
  }
  const rows = await waitRows(rowsSeen + 1);
  const mine = rows.slice(rowsSeen); rowsSeen = rows.length;
  check('stored: exactly 1 new session, ended', mine.length === 1 && mine[0].ended === true, JSON.stringify(mine));
  const a = Number(mine[0]?.active_seconds), l = Number(mine[0]?.load);
  // the register input opens after the feature starts (~0.4 s of silence into a running AudioContext) and the last
  // ~0.25 s hold can land either side of the stop, so active time sits a little under how long the feature listened
  if (F.expectActive) { // a feature that reads the mic only part of the time it runs (by hand, in its table entry)
    const [lo, hi, why] = F.expectActive(on.listened);
    check(`active seconds ≈ ${why} (${lo.toFixed(2)}–${hi.toFixed(2)} s)`, a >= lo && a <= hi, `${a.toFixed(3)} s`);
  } else check(`active seconds ≈ time the feature listened (${on.listened.toFixed(2)} s, −1.8/+0.3)`, a >= on.listened - 1.8 && a <= on.listened + 0.3, `${a.toFixed(3)} s`);
  check(`stored load = active × ${TONE.rate.toFixed(6)} (hand), within 0.5%`, Math.abs(l - a * TONE.rate) <= 0.005 * a * TONE.rate, `stored ${l.toFixed(4)} vs hand ${(a * TONE.rate).toFixed(4)}`);
  check(`pitch stored ≈ ${TONE.midi}`, Math.abs(mine[0]?.p5_midi - TONE.midi) < 0.2 && Math.abs(mine[0]?.p95_midi - TONE.midi) < 0.2, `p5 ${Number(mine[0]?.p5_midi).toFixed(3)}, p95 ${Number(mine[0]?.p95_midi).toFixed(3)}`);
  // (a capture under 2 s, like Pitch Match's in batch1.js, can be over before today's state has come back from the server)
  if (!F.shortCapture) check('gauge moved while the feature ran', m.pct > totalLoad / BUDGET * 100, `mid-run ${m.pct.toFixed(4)}% vs before ${(totalLoad / BUDGET * 100).toFixed(4)}%`);
  totalLoad += l;
  g = await gauge(page, F.gauge);
  const p = totalLoad / BUDGET * 100;
  check('gauge = today\'s stored total / 6800', Math.abs(g.pct - p) < 1e-6 && g.val === shown(p, 'en') && g.aria === g.val, `"${g.val}" pct ${g.pct.toFixed(6)} vs ${p.toFixed(6)}`);
}

async function run(FEATURES) {
  const ONLY = process.env.VLB_ONLY ? process.env.VLB_ONLY.split(',') : null;
  const list = FEATURES.filter(F => !ONLY || ONLY.includes(F.key));
  const GAUGES = Object.fromEntries([...list.map(F => [F.key, F.gauge]), ['coach', 'vlGauge']]);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${TONE.wav}`] });
  try {
    console.log(`== ${URL_ || 'local deploy/ + production backend'}`);
    console.log(`   mic: ${TONE.hz.toFixed(2)} Hz (MIDI ${TONE.midi})`);
    let { ctx, page, errors } = await openPage(b);
    check('sidecar allowed in this browser (desktop Chromium)', await page.evaluate(() => !VL_SIDECAR_BLOCKED), '');
    for (const F of list) {
      try { await feature(page, F); }
      catch (e) { check(`${F.key}: ran to the end`, false, e.message.split('\n')[0]); ({ ctx, page, errors } = await (async () => { await ctx.close(); return openPage(b); })()); }
    }
    check('page errors', errors.length === 0, errors.join(' | ') || 'none');
    await ctx.close();

    console.log('\n-- reload: every gauge resumes today\'s total from the server');
    ({ ctx, page, errors } = await openPage(b));
    await sleep(500);
    const p0 = totalLoad / BUDGET * 100;
    for (const [f, id] of Object.entries(GAUGES)) {
      const g = await gauge(page, id);
      check(`${f}: same total after reload, not 0`, g.visible && Math.abs(g.pct - p0) < 1e-6 && g.val === shown(p0, 'en'), `"${g.val}"`);
    }
    const daily = dailyDb();
    check('daily table = sum of every session', daily.length === 1 && Math.abs(Number(daily[0].total_load) - totalLoad) < 1e-6, `${JSON.stringify(daily)} vs ${totalLoad.toFixed(4)}`);

    console.log('\n-- all four languages (switched with the Profile language buttons)');
    for (const lang of ['fr', 'es', 'tr', 'en']) {
      await page.evaluate(l => document.querySelector(`#profileLanguageRow [data-profile-lang="${l}"]`).click(), lang); await sleep(700);
      const bad = [];
      for (const [f, id] of Object.entries(GAUGES)) {
        const g = await gauge(page, id);
        if (g.label !== TPL[lang][0] || g.val !== shown(p0, lang) || g.aria !== g.val || !g.fill) bad.push(`${f}: "${g.label}" "${g.val}"`);
      }
      check(`${lang}: all ${Object.keys(GAUGES).length} gauges' label and value in ${lang}`, bad.length === 0, bad.join('; ') || `"${TPL[lang][0]}" "${shown(p0, lang)}"`);
    }
    check('page errors', errors.length === 0, errors.join(' | ') || 'none');
    await ctx.close();

    console.log('\n-- Safari user agent: sidecar features open no second stream, store nothing, hide their gauge');
    ({ ctx, page, errors } = await openPage(b, { ua: SAFARI_UA }));
    check('sidecar blocked for this user agent', await page.evaluate(() => VL_SIDECAR_BLOCKED), '');
    const S = list.find(F => F.kind === 'sidecar' && F.safari);
    if (S) {
      const before = rowsDb().length;
      await goTo(page, S);
      await warm(page); await page.evaluate(() => initAudio()); await sleep(3000);
      const r = await runOnce(page, S, { live: true });
      await sleep(4000);
      check(`${S.key} ran on its own stream only, no session stored`, r.mid.live && !r.mid.gum.some(REG_STREAM) && !r.mid.reg && rowsDb().length === before, `opened [${r.mid.gum.join(' + ')}], rows ${before}→${rowsDb().length}`);
    }
    const bad = [];
    for (const F of [...list, { key: 'coach', gauge: 'vlGauge', kind: 'register' }]) { if (F.safariPrep) await page.evaluate(F.safariPrep); const g = await gauge(page, F.gauge); if (g.visible !== (F.kind !== 'sidecar')) bad.push(`${F.key} visible ${g.visible}`); }
    check('sidecar features\' gauges hidden, register-input features\' still shown', bad.length === 0, bad.join('; ') || 'ok');
    await ctx.close();

    console.log('\n-- signed out');
    ({ ctx, page, errors } = await openPage(b, { signedIn: false }));
    const shownOut = [];
    for (const [f, id] of Object.entries(GAUGES)) { const g = await gauge(page, id); if (g.visible) shownOut.push(f); }
    check('every gauge hidden when signed out', shownOut.length === 0, shownOut.join(', ') || 'all hidden');
    await ctx.close();
  } finally {
    // the test account goes first, whatever happened above, so a browser that hangs on close can't keep it; a kill that
    // skips this is covered by testAccounts.js (its watchdog, and the ledger the next run reaps)
    try { cleanup(); } finally { await Promise.race([b.close().catch(() => {}), sleep(10000)]); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
}

module.exports = { run, sleep };
