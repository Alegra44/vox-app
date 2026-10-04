// Vocal Load phase 3b, batch 1, end to end: six features on the shared mic (Pitch Match, Stay in Key, Karaoke, Harmony
// Memory, Glider, the Pitch Dragon boss) feed today's load through vlSidecar. A throwaway account (deleted at exit by
// testAccounts.js), every feature reached through its hub and run with its own buttons, a known tone as the mic
// (Chromium's file-backed fake mic: C4, and for Glider the middle of the default range, so the flight lasts). For each:
//   - the feature's own result, run once with the sidecar stubbed out (= the code before 3b) and once live: identical
//   - while the sidecar runs, the feature's own mic track is still live, unmuted, with its own settings (NS/AGC on)
//   - the stored session: active seconds ≈ how long the feature listened, load = active × rate by hand
//   - its gauge = today's stored total / 6800
// Then: every gauge resumes today's total after a reload, all four languages, hidden when signed out, and with a Safari
// user agent no second stream is opened, no load is stored and the gauges of these features stay hidden.
// Usage: node scripts/vocal-load-verify/batch1.js [url]   (no url: deploy/ served locally, against the production backend)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track, db, cleanup, sweep } = require('../choir-verify/testAccounts');
sweep('vlb'); // backstop for accounts left before testAccounts.js kept a ledger
const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const email = track(`voxcoach-vlb-${Date.now()}@example.com`), password = 'VB-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0, auth = null;
function check(label, ok, detail) { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(66)} ${detail}`); }

// The mic: a tone with a harmonic roll-off, 60 s, looped by Chromium. By hand: a new user has no stored sessions and no
// saved range, so the range is A2–C5 (45–72, passaggio 45 + 0.6 × 27 = 61.2), and no session here reaches 60 active s,
// so none becomes a baseline session: every session calibrates its own loudness (ratio 1), and
// load_rate = 1 + (midi − 45) / 16.2 per active second. Budget 6800.
//   C4, MIDI 60: 1 + 15 / 16.2 = 1.925926
//   MIDI 55.546875 (Glider only, Melody Road: the hymn's C and D gaps sit at y = 230 and 160 of 320, and this tone at
//   y = 320 − (55.546875 − 45) / 27 × 320 = 195, midway, so it flies until the gaps narrow): 1 + 10.546875 / 16.2 = 1.651042
//   Glider waits in the first gap (starting at its centre, y = 230 here) until the first sung note, with no scroll, score
//   or crash. The mic is warmed first, so the tone is there on the first frame: it takes off on frame 1, and the time
//   the feature listened is all singing. Both are checked on every Glider run.
const BUDGET = 6800;
const TONES = { c4: { midi: 60, rate: 1 + 15 / 16.2 }, glider: { midi: 55.546875, rate: 1 + 10.546875 / 16.2 } };
for (const [k, tn] of Object.entries(TONES)) {
  tn.wav = path.join(TMP, `vlb-${k}.wav`); tn.hz = 440 * Math.pow(2, (tn.midi - 69) / 12);
  execFileSync('python', [path.join(__dirname, '../vq-verify/gen.py'), tn.wav, JSON.stringify({ f0: tn.hz, harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 60 })]);
}
let TONE = TONES.c4;
const TPL = { en: ['Vocal load today', n => `${n}% of daily budget`, 'en-US'], fr: ['Charge vocale du jour', n => `${n} % du budget quotidien`, 'fr-FR'],
  es: ['Carga vocal de hoy', n => `${n} % del presupuesto diario`, 'es-ES'], tr: ['Bugünkü ses yükü', n => `Günlük bütçe: %${n}`, 'tr-TR'] };
const shown = (pct, lang) => { const v = pct < 10 ? Math.round(pct * 10) / 10 : Math.round(pct); return TPL[lang][1](v.toLocaleString(TPL[lang][2], { maximumFractionDigits: 1 })); };
const GAUGES = { pitch: 'vlGaugePitch', staykey: 'vlGaugeStayKey', karaoke: 'vlGaugeKaraoke', hmem: 'vlGaugeHmem', glider: 'vlGaugeGlider', boss: 'vlGaugeBoss', coach: 'vlGauge' };
const SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

// Every page: a seedable Math.random (so Glider's course is the same with and without the sidecar) and a count of the
// mic streams opened, with the constraints asked for.
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
    await page.locator('#authName').fill('VL Batch'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
    await page.locator('#authCreateBtn').click();
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
    auth = await ctx.storageState(); console.log(`   signed up ${email}`);
  }
  if (signedIn) await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  if (signedIn) await page.waitForFunction(() => getComputedStyle(document.getElementById('vlGauge')).display !== 'none', null, { timeout: 15000 }).catch(() => {});
  return { ctx, page, errors };
}
// Through the navigation bar and the hubs, as a user would.
async function goTo(page, f) {
  const shell = { pitch: 'train', staykey: 'songs', karaoke: 'songs', hmem: 'songs', glider: 'world', boss: 'world' }[f];
  await page.locator(`.snb-item[data-shell="${shell}"]`).click(); await sleep(500);
  if (f === 'pitch') await page.locator('#panel-train-hub [data-enter-panel="exercises"]').click();
  if (f === 'staykey' || f === 'karaoke') await page.locator(`#panel-songs-hub [data-enter-panel="${f}"]`).click();
  if (f === 'hmem') await page.locator('#panel-songs-hub [data-enter-panel="partrehearsal"]').click();
  if (f === 'glider' || f === 'boss') await page.locator(`.arcade-game-card[data-game="${f}"]`).click();
  await sleep(800);
  return page.evaluate(id => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; },
    { pitch: 'pitchListenBtn', staykey: 'stayKeyStartBtn', karaoke: 'karaokeStartBtn', hmem: 'hmemStartBtn', glider: 'gliderStartBtn', boss: 'bossStartBtn' }[f]);
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
const ACTIVE = { pitch: '!!document.getElementById("pitchListenBtn").disabled', staykey: 'stayKeyActive', karaoke: 'karaokeActive', hmem: 'harmonyMemory.active', glider: 'gliderActive', boss: 'bossActive' };
// When the feature starts listening, if that's later than ACTIVE: Pitch Match plays its reference and a cue first, and the
// load feed starts with the "Listening…" label (on master too, where it shows at once)
const LISTENING = { pitch: 'document.getElementById("pitchListenBtn").textContent === t("action_listening")' };
const START = { pitch: '#pitchListenBtn', staykey: '#stayKeyStartBtn', karaoke: '#karaokeStartBtn', hmem: '#hmemStartBtn', glider: '#gliderStartBtn', boss: '#bossStartBtn' };
// The feature's own outcome, read from its own state and result display.
const RESULT = {
  pitch: () => ({ acc: document.getElementById('pitchAccuracyVal').textContent, fb: document.getElementById('pitchFeedback').textContent }),
  staykey: () => ({ shown: document.getElementById('stayKeyAccuracyVal').textContent, inKeyShare: +(stayKeyInKeyFrames / Math.max(1, stayKeyTotalFrames)).toFixed(3) }),
  karaoke: () => ({ notes: karaokeResults.map(r => r ? `${r.pitchAcc}/${r.timingScore}/${r.heard ? 'h' : '-'}` : 'x').join(' '), pitch: document.getElementById('karaokePitchVal').textContent, timing: document.getElementById('karaokeTimingVal').textContent }),
  hmem: () => ({ held: harmonyMemory.lastRun?.results.map(r => r.held ? 1 : 0).join(''), score: harmonyMemory.lastRun?.score, passed: harmonyMemory.lastRun?.passed }),
  glider: () => ({ score: gliderScoreVal, coins: gliderCoins, title: document.getElementById('gliderGameOverTitle').textContent.replace(/New best!?|Crashed!?/i, 'end'),
    startY: __gstart && __gstart.y, firstGapY: __gstart && __gstart.first, tookOffOnFrame: __gstart && __gstart.offAt }),
  boss: () => ({ boss: Math.round(bossHealth), player: Math.round(playerHealth), notes: bossNoteResults.map(r => r && r.pitchAcc !== undefined ? r.pitchAcc : (typeof r === 'number' ? r : JSON.stringify(r))).join(' ') }),
};
// Compared with and without the sidecar: exact, except per-frame counts (Stay in Key's in-key share) and Glider's
// frame-paced score, which may differ by a frame or two of rAF timing.
const SAME = {
  staykey: (a, b) => Math.abs(a.inKeyShare - b.inKeyShare) <= 0.02 && Math.abs(parseInt(a.shown) - parseInt(b.shown)) <= 2,
  glider: (a, b) => Math.abs(a.score - b.score) <= 2 && a.coins === b.coins && a.title === b.title && a.startY === b.startY && a.tookOffOnFrame === b.tookOffOnFrame,
};
// Before each run: the same start state for both runs.
const PREP = {
  pitch: target => `pitchTargetMidi = ${target}; document.getElementById('pitchTargetNote').textContent = noteNameFromMidi(${target});`,
  hmem: () => `document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]').click(); document.querySelector('[data-hm-stage="0"]')?.click();`,
  // also records, per run, where the glider starts, the first gap's centre, and the frame it takes off on (a wrapper
  // around gliderLoop, installed once; startGlider and requestAnimationFrame call it by its global name)
  glider: () => `document.querySelector('[data-glider-mode="melody"]')?.click(); document.querySelector('[data-glider-difficulty="beginner"]')?.click(); __seed(7);
    window.__gstart = null;
    if (!window.__gWrapped) { const loop = gliderLoop; window.__gWrapped = true;
      window.gliderLoop = function () {
        if (gliderActive && !__gstart) __gstart = { y: gliderY, first: gliderPoints[0].gapY, frames: 0, offAt: null };
        if (__gstart && gliderActive) __gstart.frames++;
        const r = loop.apply(this, arguments);
        if (__gstart && __gstart.offAt === null && gliderTookOff) __gstart.offAt = __gstart.frames;
        return r;
      }; }`,
  boss: () => `document.querySelector('[data-boss-type="pitch"]').click(); document.querySelector('[data-boss-difficulty="beginner"]').click(); __seed(7)`,
};

const REG_STREAM = c => /"noiseSuppression":false/.test(c);
async function runOnce(page, f, { live, target }) {
  // the previous run's register input has closed itself (on a timeout: who is still reading it)
  await page.waitForFunction(() => !regIn, null, { timeout: 10000 }).catch(async e => {
    const who = await page.evaluate(async () => {
      let stack = null; const orig = readRegisterFrame;
      readRegisterFrame = function () { stack = stack || new Error().stack; return orig.apply(this, arguments); };
      await new Promise(r => setTimeout(r, 1000)); readRegisterFrame = orig;
      return { stack, idleMs: regIn && performance.now() - regIn.lastRead, vlSideGen, vlRun: !!vlRun, hm: harmonyMemory.active };
    });
    throw new Error('register input still open: ' + JSON.stringify(who));
  });
  if (!live) await page.evaluate(() => { window.__vlSidecar = window.__vlSidecar || vlSidecar; vlSidecar = () => {}; });
  else await page.evaluate(() => { if (window.__vlSidecar) vlSidecar = window.__vlSidecar; });
  if (PREP[f]) await page.evaluate(PREP[f](target));
  await sleep(300);
  if (!await warm(page)) throw new Error('fake mic silent');
  const t0 = Date.now();
  await page.locator(START[f]).click();
  await page.waitForFunction(ACTIVE[f], null, { timeout: 10000 });
  if (LISTENING[f]) await page.waitForFunction(LISTENING[f], null, { timeout: 10000, polling: 20 });
  const tStart = Date.now();
  // Mid-run: the feature's own mic, and what streams are open.
  await sleep({ pitch: 900 }[f] || 5000);
  const mid = await page.evaluate(() => {
    const tr = micStream && micStream.getAudioTracks()[0], s = tr ? tr.getSettings() : {};
    analyser.getFloatTimeDomainData(dataArray);
    return { gum: window.__gum.slice(), shared: !!micStream, regLive: !!regIn && regIn.stream.getAudioTracks()[0].readyState === 'live', live: tr && tr.readyState === 'live', muted: tr && tr.muted, ns: s.noiseSuppression, agc: s.autoGainControl, ec: s.echoCancellation,
      rms: +computeRMS(dataArray).toFixed(4), freq: +autoCorrelate(dataArray, audioCtx.sampleRate).toFixed(1), reg: !!regIn, pct: vlPercent() };
  });
  await page.waitForFunction(`!(${ACTIVE[f]})`, null, { timeout: 90000, polling: 100 });
  const listened = (Date.now() - tStart) / 1000;
  await sleep(700);
  const result = await page.evaluate(RESULT[f]);
  return { result, mid, listened, t0 };
}
const uid = () => db(`select id from auth.users where email = '${email}'`)[0].id;
const rowsDb = () => db(`select active_seconds, load, ended, median_rms, p5_midi, p95_midi from public.vocal_load_sessions where user_id = '${uid()}' order by started_at`);
const dailyDb = () => db(`select day::text, total_load from public.vocal_load_daily where user_id = '${uid()}'`);
async function waitRows(n) {
  for (let i = 0; i < 12; i++) { const r = rowsDb(); if (r.length >= n && r.every(x => x.ended)) return r; await sleep(2000); }
  return rowsDb();
}

let rowsSeen = 0, totalLoad = 0;
const ONLY = process.env.VLB_ONLY ? process.env.VLB_ONLY.split(',') : null; // debugging: run only these features
async function feature(page, f, label, { target } = {}) {
  if (ONLY && !ONLY.includes(f)) return;
  console.log(`\n-- ${label}`);
  check('reached through its hub, start button visible', await goTo(page, f), '');
  let g = await gauge(page, GAUGES[f]);
  check('gauge visible in the panel, today\'s total so far', g.visible && g.val === shown(totalLoad / BUDGET * 100, 'en') && g.labelledOk, `"${g.label}" "${g.val}"`);
  // the shared mic's auto gain moves for the first few seconds after it opens: let it settle before the first comparison
  if (!await page.evaluate(() => !!micStream)) { await warm(page); await page.evaluate(() => initAudio()); await sleep(5000); }
  const off = await runOnce(page, f, { live: false, target });
  await sleep(1500);
  check('sidecar stubbed out: no register input opened, no session stored', rowsDb().length === rowsSeen && !off.mid.gum.some(REG_STREAM) && !off.mid.reg, `opened [${off.mid.gum.join(' + ')}], rows ${rowsDb().length}`);
  const on = await runOnce(page, f, { live: true, target });
  const same = SAME[f] ? SAME[f](off.result, on.result) : JSON.stringify(off.result) === JSON.stringify(on.result);
  check('feature result identical with the sidecar live', same, `off ${JSON.stringify(off.result)} | on ${JSON.stringify(on.result)}`);
  if (f === 'glider') for (const [k, r] of [['off', off.result], ['on', on.result]])
    check(`${k}: starts at the first gap's centre, takes off on frame 1 (no wait)`, r.startY === r.firstGapY && r.tookOffOnFrame === 1, `start y ${r.startY}, first gap ${r.firstGapY}, took off on frame ${r.tookOffOnFrame}`);
  const m = on.mid, o = off.mid;
  // the shared mic opens once per page (on the first run); the register input opens on every live run
  check('both live at once: the feature\'s own mic + the register input', m.shared && m.live && m.regLive && m.gum.filter(REG_STREAM).length === 1, `opened this run [${m.gum.join(' + ')}]`);
  check('feature\'s own track still live, unmuted, NS/AGC/EC unchanged', m.live && !m.muted && m.ns === o.ns && m.agc === o.agc && m.ec === o.ec && m.ns === true,
    `on: ns ${m.ns} agc ${m.agc} ec ${m.ec} muted ${m.muted} | off: ns ${o.ns} agc ${o.agc} ec ${o.ec}`);
  check('feature\'s own analyser hears the same tone', Math.abs(m.freq - TONE.hz) < 0.03 * TONE.hz && Math.abs(m.freq - o.freq) < 2 && Math.abs(m.rms - o.rms) <= 0.15 * o.rms,
    `on ${m.freq} Hz rms ${m.rms} | off ${o.freq} Hz rms ${o.rms}`);
  const rows = await waitRows(rowsSeen + 1);
  const mine = rows.slice(rowsSeen); rowsSeen = rows.length;
  check('stored: exactly 1 new session, ended', mine.length === 1 && mine[0].ended === true, JSON.stringify(mine));
  const a = Number(mine[0]?.active_seconds), l = Number(mine[0]?.load);
  // the register input opens after the feature starts (~0.4 s of silence into a running AudioContext) and the last
  // ~0.25 s hold can land either side of the stop, so active time sits a little under how long the feature listened
  check(`active seconds ≈ time the feature listened (${on.listened.toFixed(2)} s, −1.8/+0.3)`, a >= on.listened - 1.8 && a <= on.listened + 0.3, `${a.toFixed(3)} s`);
  check(`stored load = active × ${TONE.rate.toFixed(6)} (hand), within 0.5%`, Math.abs(l - a * TONE.rate) <= 0.005 * a * TONE.rate, `stored ${l.toFixed(4)} vs hand ${(a * TONE.rate).toFixed(4)}`);
  check(`pitch stored ≈ ${TONE.midi}`, Math.abs(mine[0].p5_midi - TONE.midi) < 0.2 && Math.abs(mine[0].p95_midi - TONE.midi) < 0.2, `p5 ${Number(mine[0].p5_midi).toFixed(3)}, p95 ${Number(mine[0].p95_midi).toFixed(3)}`);
  // (a 1.6 s capture can be over before today's state has come back from the server, so not for Pitch Match)
  if (f !== 'pitch') check('gauge moved while the feature ran', m.pct > totalLoad / BUDGET * 100, `mid-run ${m.pct.toFixed(4)}% vs before ${(totalLoad / BUDGET * 100).toFixed(4)}%`);
  totalLoad += l;
  g = await gauge(page, GAUGES[f]);
  const p = totalLoad / BUDGET * 100;
  check('gauge = today\'s stored total / 6800', Math.abs(g.pct - p) < 1e-6 && g.val === shown(p, 'en') && g.aria === g.val, `"${g.val}" pct ${g.pct.toFixed(6)} vs ${p.toFixed(6)}`);
}

(async () => {
  const launch = tn => chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${tn.wav}`] });
  let b = await launch(TONE);
  try {
    console.log(`== ${URL_ || 'local deploy/ + production backend'}`);
    console.log(`   mic: ${TONE.hz.toFixed(2)} Hz (MIDI ${TONE.midi})`);
    let { ctx, page, errors } = await openPage(b);
    check('sidecar allowed in this browser (desktop Chromium)', await page.evaluate(() => !VL_SIDECAR_BLOCKED), '');
    await feature(page, 'pitch', 'Pitch Match (drill): target C4, a pass', { target: 60 });
    await feature(page, 'pitch', 'Pitch Match (drill): target D4, a miss', { target: 62 });
    await feature(page, 'staykey', 'Stay in Key (song drill, runs to the end)');
    await feature(page, 'karaoke', 'Karaoke (song game, runs to the end)');
    await feature(page, 'hmem', 'Harmony Memory stage 1, Lead (Choir World individual practice)');
    check('page errors', errors.length === 0, errors.join(' | ') || 'none');
    await ctx.close();

    // the boss unlocks at level 5 (200 XP)
    db(`update public.user_progress set xp = 250 where user_id = '${uid()}'`);
    console.log('\n-- reload: every gauge resumes today\'s total from the server');
    ({ ctx, page, errors } = await openPage(b));
    await sleep(500);
    const p0 = totalLoad / BUDGET * 100;
    for (const [f, id] of Object.entries(GAUGES)) {
      const g = await gauge(page, id);
      check(`${f}: same total after reload, not 0`, g.visible && Math.abs(g.pct - p0) < 1e-6 && g.val === shown(p0, 'en'), `"${g.val}"`);
    }
    await feature(page, 'boss', 'Pitch Dragon boss, beginner (runs to the end)');
    check('page errors', errors.length === 0, errors.join(' | ') || 'none');
    await ctx.close(); await b.close();

    // Glider: a steady C4 crashes within a second or so; a tone between Melody Road's two gap heights flies for a while
    TONE = TONES.glider; b = await launch(TONE);
    console.log(`\n   mic: ${TONE.hz.toFixed(2)} Hz (MIDI ${TONE.midi})`);
    ({ ctx, page, errors } = await openPage(b));
    await feature(page, 'glider', 'Glider (arcade game, Melody Road, beginner; runs until the crash)');
    const daily = dailyDb();
    check('daily table = sum of every session', daily.length === 1 && Math.abs(Number(daily[0].total_load) - totalLoad) < 1e-6, `${JSON.stringify(daily)} vs ${totalLoad.toFixed(4)}`);

    console.log('\n-- all four languages (switched with the Profile language buttons)');
    const p1 = totalLoad / BUDGET * 100;
    for (const lang of ['fr', 'es', 'tr', 'en']) {
      await page.evaluate(l => document.querySelector(`#profileLanguageRow [data-profile-lang="${l}"]`).click(), lang); await sleep(700);
      const bad = [];
      for (const [f, id] of Object.entries(GAUGES)) {
        const g = await gauge(page, id);
        if (g.label !== TPL[lang][0] || g.val !== shown(p1, lang) || g.aria !== g.val || !g.fill) bad.push(`${f}: "${g.label}" "${g.val}"`);
      }
      check(`${lang}: all 7 gauges' label and value in ${lang}`, bad.length === 0, bad.join('; ') || `"${TPL[lang][0]}" "${shown(p1, lang)}"`);
    }
    check('page errors', errors.length === 0, errors.join(' | ') || 'none');
    await ctx.close();

    console.log('\n-- Safari user agent: no second stream, nothing stored, these gauges hidden');
    ({ ctx, page, errors } = await openPage(b, { ua: SAFARI_UA }));
    check('sidecar blocked for this user agent', await page.evaluate(() => VL_SIDECAR_BLOCKED), '');
    const before = rowsDb().length;
    await goTo(page, 'glider');
    await warm(page); await page.evaluate(() => initAudio()); await sleep(5000);
    const r = await runOnce(page, 'glider', { live: true }).catch(async e => {
      const st = await page.evaluate(() => ({ gliderActive, gliderScoreVal, gliderY, analyser: !!analyser, mic: !!micStream })).catch(x => String(x));
      throw new Error(`${e.message}\n   state ${JSON.stringify(st)}\n   page errors: ${errors.join(' | ') || 'none'}`);
    });
    await sleep(4000);
    check('Glider ran on its own stream only, no session stored', r.mid.live && !r.mid.gum.some(REG_STREAM) && !r.mid.reg && rowsDb().length === before, `opened [${r.mid.gum.join(' + ')}], rows ${before}→${rowsDb().length}, score ${r.result.score}`);
    check('Glider started at the first gap\'s centre and took off on frame 1', r.result.startY === r.result.firstGapY && r.result.tookOffOnFrame === 1, `start y ${r.result.startY}, first gap ${r.result.firstGapY}, frame ${r.result.tookOffOnFrame}`);
    const hid = [];
    for (const [f, id] of Object.entries(GAUGES)) { const g = await gauge(page, id); if (g.visible !== (f === 'coach')) hid.push(`${f} visible ${g.visible}`); }
    check('the six features\' gauges hidden, Register Coach\'s still shown', hid.length === 0, hid.join('; ') || 'ok');
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
})().catch(e => { console.error(e); process.exitCode = 1; });
