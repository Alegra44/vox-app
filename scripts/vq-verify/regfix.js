// Register scoring fix (register input: unprocessed mic, low-passed pitch path, power-weighted chest score), verified
// against the version before it. "before" is deploy/index.html at 8a87796, the last commit before the fix (or REG_BEFORE=<rev>),
// "after" the working tree; both get the same WAVs as the mic and are driven through their real start buttons (the Pro
// gate stubbed; with REG_URL, the deployed app with a real account instead, see below).
//   steady    the pitch path over the first 20 s after the mic opens, on a steady straight tone (per-window detection)
//   bug       Register Coach: tones set near each decision line (35 / 50 / 62) and above, straight and ±25/50/100 ct
//   bridge    Register Runner: a low chest-voice note alternating with a high head-voice note every 2 s; lane per frame
//   drills    Register Drills, chest and head mode, with a chest tone and a head tone (matches and mismatches)
//   boss      Register Wraith: per-note chest average and cents; which mic each boss type opens
//   feedback  Real-Time Feedback register row and the Resonance Visualizer's zone
//   levels    the pitch path: detection and cents error per note, at four input levels
//   noise     room noise (pink, HVAC rumble, babble, white) at 20 and 10 dB SNR under a head and a chest tone
// Usage: [REG_URL=<deployed url>] node scripts/vq-verify/regfix.js [steady|bug|bridge|drills|boss|feedback|levels|noise|all]   (REG_BLOCK_CDN=1: block the Supabase CDN, to check that a failed page load stops the run)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const BEFORE = path.join(TMP, 'index-before.html');
fs.writeFileSync(BEFORE, execFileSync('git', ['show', `${process.env.REG_BEFORE || '8a87796'}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const HTML = { before: BEFORE, after: path.join(ROOT, 'deploy/index.html') };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// REG_URL=<url>: measure the deployed app only ("prod"), signed in as one throwaway account (signed up through the auth
// modal, its session reused for every page, deleted at exit by testAccounts.js), with the real Pro gate (a new account's
// trial) instead of the stubs.
const PROD = process.env.REG_URL;
const SIDES = PROD ? ['prod'] : ['before', 'after'];
let ACCT = null, AUTH = null;
// REG_PACE_MS: least time between two page loads (default 45 s against a URL): Vercel's automatic mitigation challenges
// an IP that opens dozens of headless sessions in a few minutes (a 403 challenge page, which the load check reports).
// REG_BUG_TONES="440:62,440:80": only those Register Coach tones (f0:target) in the bug section.
const PACE = +(process.env.REG_PACE_MS ?? (PROD ? 45000 : 0));
let lastLoad = 0;
if (PROD) { const { track } = require('../choir-verify/testAccounts'); ACCT = { email: track(`voxcoach-regfix-${Date.now()}@example.com`), password: 'RF-' + Math.random().toString(36).slice(2) + '!x9' }; }

const magRatio = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -s); w += k * v; a += v; } return w / a; };
const slopeFor = (ratio, K) => { let lo = 0.01, hi = 8; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (magRatio(m, K) > ratio) lo = m; else hi = m; } return (lo + hi) / 2; };
// Harmonic amplitudes for a tone at f0 whose clean spectrum gives chest score `score` (today's definition, to 6 kHz)
const timbre = (f0, score) => { const K = Math.floor(6000 / f0), s = slopeFor(1.5 + score / 100 * 4, K); return [...Array(K).keys()].map(k => Math.pow(k + 1, -s)); };
const wav = (name, spec, script = 'gen.py') => { const f = path.join(TMP, `rf-${name}.wav`); execFileSync('python', [path.join(__dirname, script), f, JSON.stringify(spec)]); return f; };
const vib = d => d ? { vibRate: 6, vibCents: d } : {};
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const pct = (a, f) => a.length ? Math.round(100 * a.filter(f).length / a.length) : 0;
const f1 = x => x == null || Number.isNaN(x) ? '  —  ' : x.toFixed(1).padStart(5);

// A page whose load failed (e.g. the Supabase CDN script didn't arrive: `createClient` of undefined, and every top-level
// `let` after it stays uninitialized) would otherwise be measured as if it were the app. Load errors are always printed,
// and a page that didn't load cleanly is retried, then the run stops.
async function withPage(file, which, fn, attempt = 1) {
  const wait = lastLoad + PACE - Date.now(); if (wait > 0) await sleep(wait);
  lastLoad = Date.now();
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(which === 'prod' && AUTH ? { storageState: AUTH } : {}) });
    if (which !== 'prod') await ctx.route('http://localhost:8765/', r => r.fulfill({ path: HTML[which], contentType: 'text/html' }));
    if (process.env.REG_BLOCK_CDN) await ctx.route('**/supabase.js', r => r.abort()); // to check the load-failure handling
    await ctx.addInitScript(() => {
      window.__gum = [];
      const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async c => { const st = await g(c); __gum.push({ asked: c.audio, track: st.getAudioTracks()[0] }); return st; };
    });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('requestfailed', r => { if (['script', 'stylesheet'].includes(r.resourceType())) errors.push(`load failed: ${r.url()} (${r.failure()?.errorText})`); });
    page.on('response', r => { if (r.status() >= 400 && ['script', 'stylesheet'].includes(r.request().resourceType())) errors.push(`load failed: ${r.url()} (HTTP ${r.status()})`); });
    const resp = await page.goto(which === 'prod' ? PROD : 'http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    if (resp && resp.status() >= 400) errors.push(`page answered HTTP ${resp.status()}${resp.status() === 403 && which === 'prod' ? ' (a Vercel challenge page: see `vercel firewall persistent-actions ls`)' : ''}`);
    const globals = await page.evaluate(() => ({ sb: typeof sb, bridgeActive: typeof bridgeActive, url: location.href, ready: document.readyState, title: document.title }))
      .catch(e => ({ threw: String(e).split('\n')[0], url: page.url() }));
    if (errors.length || globals.sb !== 'object' || globals.bridgeActive !== 'boolean') {
      console.log(`   PAGE LOAD ERRORS (${which}, attempt ${attempt}):`, errors.length ? errors : [], 'globals:', JSON.stringify(globals));
      if (attempt < 3) { await b.close(); return withPage(file, which, fn, attempt + 1); }
      throw new Error(`${which} page failed to load 3 times`);
    }
    // Chromium's file-backed fake mic is silent for its first ~1.1–1.7 s (a bare page shows the same), which would land on
    // the first drill note. Warm it up on a throwaway stream, stopped before the app opens its own: the app's stream then
    // sounds within ~50 ms and still gets the processing it asks for.
    const warm = await page.evaluate(async () => {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false;
      while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close(); __gum = [];
      return heard ? performance.now() - t0 : null;
    });
    if (warm === null) throw new Error(`${which}: the fake mic gave no sound within 5 s`);
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    if (which === 'prod') {
      if (!AUTH) {
        await page.evaluate(() => openAuthModal());
        await page.locator('#authName').fill('Regfix Check');
        await page.locator('#authEmail').fill(ACCT.email); await page.locator('#authPassword').fill(ACCT.password);
        await page.locator('#authCreateBtn').click();
      }
      await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display !== 'flex', null, { timeout: 20000 });
      if (!AUTH) { AUTH = await ctx.storageState(); console.log(`   signed up ${ACCT.email} on ${PROD}`); }
      const gate = await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; return { paid: isPaid(), trial: isInTrial(), plan: profile.subscriptionPlan || null, hasFix: typeof readRegisterFrame === 'function' }; });
      if (!gate.paid || !gate.hasFix) throw new Error(`prod: account can't use the features or the page lacks the fix: ${JSON.stringify(gate)}`);
    }
    await page.evaluate(prod => {
      if (!prod) { requireProFeature = () => true; blockExercise = () => false; }
      // record every pitch the page computes, and (before) every chest score getSpectralChestScore returns
      const ac = autoCorrelate; autoCorrelate = (b, sr) => (window.__lastF = ac(b, sr));
      if (typeof getSpectralChestScore === 'function') { const g = getSpectralChestScore; getSpectralChestScore = f => (window.__lastChest = g(f)); }
      if (typeof chestScoreFromPower === 'function') { const g = chestScoreFromPower; chestScoreFromPower = (...a) => (window.__lastChest = g(...a)); }
    }, which === 'prod');
    try { return await fn(page); } finally { if (errors.length) console.log(`   PAGE ERRORS during the run (${which}):`, errors); }
  } finally { await b.close().catch(() => {}); }
}

// Register Coach through its own button; per frame: the pitch and the chest score updateRegisterUI got, and the label
async function registerCoach(file, which, ms = 3000) {
  return withPage(file, which, async page => {
    await page.evaluate(() => {
      window.__rc = []; const u = updateRegisterUI;
      updateRegisterUI = function (freq, chest) {
        const out = u.apply(this, arguments);
        __rc.push(freq > 50 && freq < 1200 ? { f: freq, chest: chest !== undefined ? chest : window.__lastChest, label: document.getElementById('regLabel').textContent } : { f: -1 });
        return out;
      };
      document.getElementById('regMicBtn').click();
    });
    await sleep(2000); await page.evaluate(() => { __rc = []; }); await sleep(ms);
    return page.evaluate(() => { document.getElementById('regMicBtn').click(); return { all: __rc.length, frames: __rc.filter(x => x.f > 0), gum: __gum.map(g => g.asked) }; });
  });
}
const summary = fr => { const c = fr.map(x => x.chest).filter(v => v != null); return { n: c.length, med: q(c, 0.5), p10: q(c, 0.1), p90: q(c, 0.9), push: pct(c, v => v >= 62), mixed: pct(c, v => v >= 35 && v < 62), head: pct(c, v => v < 35) }; };

async function bug() {
  console.log('\n==== 1. THE BUG: Register Coach chest score, straight vs 6 Hz vibrato (median, p10–p90, % frames pushing/mixed/head)');
  const only = process.env.REG_BUG_TONES?.split(',');
  for (const f0 of [330, 440]) for (const target of [35, 50, 62, 80]) {
    if (only && !only.includes(`${f0}:${target}`)) continue;
    const H = timbre(f0, target);
    console.log(`\n${f0} Hz, timbre scoring ${target} on a clean spectrum`);
    let straight = {};
    for (const d of [0, 25, 50, 100]) {
      const file = wav('bug', { f0, harmonics: H, ...vib(d) }), row = [];
      for (const which of SIDES) {
        const r = await registerCoach(file, which), s = summary(r.frames);
        if (!s.n) { row.push(`${which} no chest readings (${r.all} frames, ${r.frames.length} with a pitch)`); continue; }
        if (!d) straight[which] = s.med;
        row.push(`${which} ${f1(s.med)} (${s.p10.toFixed(0)}–${s.p90.toFixed(0)}) Δ${(s.med - straight[which] >= 0 ? '+' : '') + (s.med - straight[which]).toFixed(1)} · ${s.push}/${s.mixed}/${s.head}%`);
      }
      console.log(`  ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)} ${row.join('   |   ')}`);
    }
  }
}

async function bridge() {
  console.log('\n==== 2a. REGISTER RUNNER: chest note C4 262 Hz (timbre 80) ↔ head note G4 392 Hz (timbre 15), then a closer pair (60 ↔ 40); 2 s each');
  for (const [lo, hi] of [[80, 15], [60, 40]]) for (const d of [0, 50, 100]) {
    const file = wav('bridge', { segments: [{ f0: 261.63, harmonics: timbre(261.63, lo), seconds: 2 }, { f0: 392, harmonics: timbre(392, hi), seconds: 2 }], seconds: 14, ...vib(d) }), row = [];
    for (const which of SIDES) {
      const r = await withPage(file, which, async page => {
        await page.evaluate(async () => {
          window.__br = []; const L = bridgeLoop;
          bridgeLoop = function () { const out = L.apply(this, arguments); if (bridgeActive) __br.push({ f: window.__lastF, chest: window.__lastChest, lane: bridgeLane, t: performance.now() }); return out; };
          document.getElementById('bridgeStartBtn').click(); // the real button (and its Pro gate)
          const t0 = performance.now(); while (!bridgeActive && performance.now() - t0 < 5000) await new Promise(r => setTimeout(r, 20));
          if (!bridgeActive) throw new Error('Register Runner did not start from its button');
          bridgeLives = 1e9; // obstacles still spawn and hit; lives only so the run lasts
        });
        await sleep(10000);
        return page.evaluate(() => { const out = __br; stopBridgeRunner(); return out; });
      });
      // truth from the detected pitch: near 262 Hz wants chest, near 392 Hz head; frames within 150 ms of a note change
      // are counted separately (the lane is expected to follow within a few frames)
      let lastNote = null, changeT = 0, ok = 0, n = 0, settle = [], pendingSince = null;
      const per = { chest: [], head: [] };
      for (const x of r) {
        const note = x.f > 0 ? (Math.abs(1200 * Math.log2(x.f / 261.63)) < 150 ? 'chest' : Math.abs(1200 * Math.log2(x.f / 392)) < 150 ? 'head' : null) : null;
        if (!note) continue;
        if (note !== lastNote) { if (lastNote) { changeT = x.t; pendingSince = x.t; } lastNote = note; }
        if (pendingSince !== null && x.lane === note) { settle.push(x.t - pendingSince); pendingSince = null; }
        if (x.t - changeT < 150) continue;
        n++; if (x.lane === note) ok++; per[note].push({ c: x.chest, ok: x.lane === note });
      }
      row.push(`${which} lane right ${pct([...Array(n)].map((_, i) => i < ok), v => v)}% of ${n} frames, lane followed each switch in median ${settle.length ? q(settle, 0.5).toFixed(0) : '—'} ms (max ${settle.length ? Math.max(...settle).toFixed(0) : '—'}) over ${settle.length} switches; chest score p10/med/p90, % wrong lane: ${Object.entries(per).map(([k, v]) => { const c = v.map(x => x.c).filter(x => x != null); return `${k} note ${c.length ? [0.1, 0.5, 0.9].map(p => q(c, p).toFixed(0)).join('/') : 'n/a (inline in the old code)'} ${pct(v, x => !x.ok)}%`; }).join(', ')}`);
    }
    console.log(`  ${lo}↔${hi} ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)}\n     ${row.join('\n     ')}`);
  }
}

async function drills() {
  console.log('\n==== 2b. REGISTER DRILLS: 5 notes each; chest mode targets A3 220 Hz, head mode C#5 554 Hz (range A3–A5, random stubbed to the zone\'s first note)');
  for (const d of [0, 50, 100]) for (const [mode, f0, score, expect] of [['chest', 220, 80, 'match'], ['chest', 220, 15, 'drift'], ['head', 554.37, 15, 'match'], ['head', 554.37, 80, 'drift']]) {
    const file = wav('drill', { f0, harmonics: timbre(f0, score), ...vib(d) }), row = [];
    for (const which of SIDES) {
      const r = await withPage(file, which, async page => {
        await page.evaluate(m => {
          Math.random = () => 0; if (typeof pickNote === 'function') { window.__pick = window.__pick || pickNote; pickNote = (k, lo, hi) => k === 'drill' ? lo : __pick(k, lo, hi); }; lowNote = freqToNote(220); highNote = freqToNote(880); drillMode = m;
          document.getElementById('drillStartBtn').click();
        }, mode);
        await page.waitForFunction(() => !drillActive && drillResults.length === DRILL_NOTE_COUNT, null, { timeout: 60000 });
        return page.evaluate(() => drillResults);
      });
      row.push(`${which} ${r.map(x => x.heard ? `${x.avgChest}${x.registerMatch ? '✓' : '✗'}/${x.pitchAcc}%` : 'no signal').join(' ')}`);
    }
    console.log(`  ${mode} drill, timbre ${score} (${expect === 'match' ? 'should match' : 'should drift'}) ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)} chest✓match/pitch per note: ${row.join('  |  ')}`);
  }
}

async function boss() {
  console.log('\n==== 2c. REGISTER WRAITH (the only boss type that scores register): per-note chest average and |cents|, first 12 s of the song');
  for (const d of [0, 50]) for (const [f0, score] of [[220, 80], [440, 15]]) {
    const file = wav('boss', { f0, harmonics: timbre(f0, score), ...vib(d), seconds: 20 }), row = [];
    for (const which of SIDES) {
      const r = await withPage(file, which, async page => {
        await page.evaluate(async () => {
          window.__notes = []; const F = bossFinalizeNote;
          bossFinalizeNote = function (idx) {
            const c = bossChestBuf.slice(), cents = bossCentsBuf.slice();
            __notes.push({ target: bossCurrentTargetMidi, chest: c.length ? c.reduce((a, b) => a + b, 0) / c.length : null, cents: cents.length ? cents.reduce((a, b) => a + Math.abs(b), 0) / cents.length : null, n: c.length });
            return F.apply(this, arguments);
          };
          document.querySelector('[data-boss-type="register"]').click(); selectedBossDifficulty = 'beginner';
          if (selectedBossType !== 'register') throw new Error('the Register Wraith button did not select the register boss');
          document.getElementById('bossStartBtn').click(); // the real button (and its Pro gate)
          const t0 = performance.now(); while (!bossActive && performance.now() - t0 < 5000) await new Promise(r => setTimeout(r, 20));
          if (!bossActive) throw new Error('Register Wraith did not start from its button');
        });
        await sleep(12000);
        return page.evaluate(() => { stopBoss(); return { notes: __notes, gum: __gum.map(g => g.asked) }; });
      });
      const ch = r.notes.filter(x => x.chest != null);
      row.push(`${which} chest per note ${ch.map(x => x.chest.toFixed(0)).join(' ')} (median ${f1(q(ch.map(x => x.chest), 0.5))}) · |cents| median ${f1(q(ch.map(x => x.cents).filter(v => v != null), 0.5))} · mic ${JSON.stringify(r.gum)}`);
    }
    console.log(`  ${f0} Hz timbre ${score} ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)}\n     ${row.join('\n     ')}`);
  }
  const file = wav('boss2', { f0: 220, harmonics: timbre(220, 50) });
  for (const which of SIDES) {
    const gum = await withPage(file, which, async page => { await page.evaluate(() => { document.querySelector('[data-boss-type="pitch"]').click(); document.getElementById('bossStartBtn').click(); }); await sleep(3000); return page.evaluate(() => { stopBoss(); return __gum.map(g => g.asked); }); });
    console.log(`  Pitch boss (not register) ${which}: mic opened with ${JSON.stringify(gum)}`);
  }
}

async function feedback() {
  console.log('\n==== 2d. REAL-TIME FEEDBACK register row and RESONANCE VISUALIZER zone (440 Hz, above the passaggio)');
  for (const score of [15, 45, 80]) for (const d of [0, 50]) {
    const file = wav('lf', { f0: 440, harmonics: timbre(440, score), ...vib(d) }), row = [];
    for (const which of SIDES) {
      const r = await withPage(file, which, async page => {
        await page.evaluate(async () => {
          window.__lf = []; const L = lfLoop;
          lfLoop = function () { const o = L.apply(this, arguments); if (lfActive) __lf.push({ reg: document.getElementById('lfRegisterText').textContent, pitch: document.getElementById('lfPitchText').textContent, breath: document.getElementById('lfBreathText').textContent }); return o; };
          await startLiveFeedback();
        });
        await sleep(4000);
        const lf = await page.evaluate(() => { const o = __lf.slice(60); stopLiveFeedback(); return o; });
        await page.evaluate(async () => {
          window.__res = []; const R = resonanceLoop;
          resonanceLoop = function () { const o = R.apply(this, arguments); if (resonanceActive) __res.push(document.getElementById('resRegisterStat').textContent); return o; };
          await startResonanceVisualizer();
        });
        await sleep(4000);
        const res = await page.evaluate(() => { const o = __res.slice(60); stopResonanceVisualizer(); return o; });
        return { lf, res };
      });
      const share = (a, v) => pct(a, x => x === v);
      row.push(`${which} register "pushing" ${pct(r.lf, x => /Pushing/.test(x.reg))}% · pitch "In tune" ${pct(r.lf, x => x.pitch === 'In tune')}% · breath "Steady" ${pct(r.lf, x => /Steady/.test(x.breath))}% | resonance Head/Mixed/Chest ${share(r.res, 'Head')}/${share(r.res, 'Mixed')}/${share(r.res, 'Chest')}%`);
    }
    console.log(`  timbre ${score} ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)} ${row.join('   ||   ')}`);
  }
}

async function levels() {
  console.log('\n==== 2e. PITCH PATH through Register Coach: % frames with a pitch, median |cents| vs the true note, per input level (peak)');
  for (const amp of [0.5, 0.1, 0.03, 0.015]) {
    const row = [];
    for (const f0 of [110, 165, 220, 330, 440, 660, 880]) {
      const file = wav('lvl', { f0, harmonics: timbre(f0, 50), amp }), cell = [];
      for (const which of SIDES) {
        const r = await registerCoach(file, which, 2000);
        const cents = r.frames.map(x => Math.abs(1200 * Math.log2(x.f / f0)));
        cell.push(`${Math.round(100 * r.frames.length / r.all)}%/${cents.length ? q(cents, 0.5).toFixed(1) : '—'}`);
      }
      row.push(`${f0}: ${cell.join(' → ')}`);
    }
    console.log(`  peak ${String(amp).padEnd(5)} (before → after)  ${row.join(' | ')}`);
  }
}

async function noise() {
  console.log('\n==== 3. NOISE: Register Coach at 330 Hz under room noise (noisy.py); median chest, % frames pushing, % of frames with a pitch within 50 ct of the note');
  for (const [score, label] of [[35, 'head-ish tone (35)'], [80, 'chest tone (80)']]) {
    console.log(`\n${label}`);
    for (const d of [0, 50]) for (const [kind, snr] of [['none', null], ['pink', 20], ['pink', 10], ['rumble', 20], ['rumble', 10], ['babble', 20], ['babble', 10], ['white', 20], ['white', 10]]) {
      const file = wav('noise', { f0: 330, harmonics: timbre(330, score), vibRate: 6, vibCents: d, noise: kind, snrDb: snr ?? 20, seed: 5, seconds: 12 }, 'noisy.py'), row = [];
      for (const which of SIDES) {
        const r = await registerCoach(file, which, 2000), s = summary(r.frames);
        const onNote = r.frames.filter(x => Math.abs(1200 * Math.log2(x.f / 330)) < 50).length;
        row.push(`${which} ${f1(s.med)} push ${String(s.push).padStart(3)}% · pitch on the note ${String(Math.round(100 * onNote / r.all)).padStart(3)}%`);
      }
      console.log(`  ${(d ? '±50 ct' : 'straight').padEnd(8)} ${(kind === 'none' ? 'no noise' : `${kind} ${snr} dB`).padEnd(12)} ${row.join('  |  ')}`);
    }
  }
}

// The pitch path over time from the moment the mic opens, on a steady straight tone: % of frames with a pitch within
// 50 ct of the note and the median RMS of the buffer autoCorrelate got, per window. Baseline for the early-note pitch loss.
async function steady() {
  const W = [[0, 0.5], [0.5, 1], [1, 2], [2, 3], [3, 5], [5, 10], [10, 15], [15, 20]];
  console.log(`\n==== 0. STEADY TONE over time, Register Coach from the click, 20 s: % frames on the note (±50 ct) / median RMS, windows ${W.map(w => w.join('–') + ' s').join(', ')}`);
  for (const [f0, score] of [[220, 80], [330, 50], [554.37, 15]]) {
    const file = wav('steady', { f0, harmonics: timbre(f0, score), seconds: 30 });
    for (const which of SIDES) {
      const fr = await withPage(file, which, async page => {
        await page.evaluate(() => {
          window.__st = []; const ac = autoCorrelate;
          autoCorrelate = (b, sr) => { const f = ac(b, sr); let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; __st.push({ t: performance.now() - __t0, f, rms: Math.sqrt(s / b.length) }); return f; };
          window.__t0 = performance.now(); document.getElementById('regMicBtn').click();
        });
        await sleep(20500);
        return page.evaluate(() => { document.getElementById('regMicBtn').click(); return __st; });
      });
      const cells = W.map(([a, b]) => {
        const x = fr.filter(v => v.t >= a * 1000 && v.t < b * 1000);
        if (!x.length) return '   —    ';
        const on = pct(x, v => v.f > 0 && Math.abs(1200 * Math.log2(v.f / f0)) < 50);
        return `${String(on).padStart(3)}%/${q(x.map(v => v.rms), 0.5).toFixed(3)}`;
      });
      console.log(`  ${String(f0).padEnd(6)} Hz timbre ${String(score).padEnd(2)} ${which.padEnd(6)} first frame at ${fr.length ? (fr[0].t / 1000).toFixed(2) : '—'} s   ${cells.join('  ')}`);
    }
  }
}

const sections = { steady, bug, bridge, drills, boss, feedback, levels, noise };
module.exports = { registerCoach, summary, wav, timbre, vib };
(async () => {
  const which = process.argv[2] || 'all';
  for (const [k, fn] of Object.entries(sections)) if (which === 'all' || which.split(',').includes(k)) await fn();
})().catch(e => { console.error(e); process.exitCode = 1; });
