// Vibrato tolerance (shared helper vibratoTolerantCents / makeVibratoTolerantLive), verified with REAL singing against the
// four features named for it, before (deploy/index.html at VF_BEFORE, default HEAD) and after (the working tree), or on a
// deployed URL (VF_URL) signed in as one throwaway account that is deleted at exit (testAccounts.js).
//   Pitch Match      its Listen button, Intermediate and Professional, target set to the sung note          (shared mic)
//   Register Drills  its Start button, 5 notes, the random target stubbed to the sung note                  (register input)
//   Real-Time Feedback its Start button; the Pitch ("In tune") and Stability ("Steady") rows sampled for 6 s (register input)
//   Tuner            its mic button; the "In tune" readout and Stability % sampled for 6 s — measured, not checked (shared mic)
//   Stay in Key      its Start button, every chord tone stubbed to the sung note; "In key" sampled for 6 s — measured, not checked (shared mic)
//   Choir World      its capture and verdict code (captureNoteFrame → judgeHeldNote → Performance Report), one held
//                    note of 3.3 s on the sung note (the song timing is the only part replaced)                  (shared mic)
// The singing: sustained notes from VocalSet (Wilkins et al. 2018, CC BY 4.0, doi:10.5281/zenodo.1442513; clips from the
// Hugging Face mirror Bill13579/vocalset-mirror, in %TEMP%/vq-verify/vocalset with manifest.json), each centred on its
// semitone and looped forward/backward (realstim.py). Plus real notes made deliberately wrong: shifted +60 / +40 ct, a
// slow ±60 ct wander, an 11 Hz ±40 ct flutter. Full log and JSON go to scripts/vq-verify/logs/.
// VF_MODE=regress (local only): a master-vs-branch regression run, for changes that aren't the vibrato fix. Both sides
// already have the fix, so every "must rise" check becomes "must not move". Each side runs VF_RUNS times (default 3,
// alternating sides) and the medians are compared: ±3 on a per-note grader; on the noisy readings (RTF In tune / Steady,
// Tuner In tune / stability ≥75) the spread of master's own runs, no tighter than ±5 and no looser than ±10. Every check is sorted into
// Regression (passes on master, fails on the branch, or moves past tolerance the wrong way: blocks a deploy), Fixed
// (fails on master, passes on the branch, or moves past tolerance the right way) and Already failing (fails on both).
// Without it, the checks prove the vibrato fix itself (run against d7a5691, the last commit before it).
// Usage: [VF_URL=<url>] [VF_MODE=regress] [VF_PACE_MS=45000] [VF_RESUME=logs/<earlier>.json] node scripts/vq-verify/vibfix.js [stimulus ids, comma-separated]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), TMP = path.join(os.tmpdir(), 'vq-verify', 'vibfix'), VS = path.join(os.tmpdir(), 'vq-verify', 'vocalset');
fs.mkdirSync(TMP, { recursive: true });
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const PROD = process.env.VF_URL, SIDES = PROD ? ['prod'] : ['before', 'after'];
const REGRESS = !PROD && process.env.VF_MODE === 'regress', RUNS = REGRESS ? +(process.env.VF_RUNS || 3) : 1;
if (process.env.VF_MODE && process.env.VF_MODE !== 'regress') throw new Error(`VF_MODE=${process.env.VF_MODE}: only "regress" is known`);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `vibfix-${PROD ? 'prod' : 'local'}-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BEFORE = path.join(TMP, 'index-before.html');
if (!PROD) fs.writeFileSync(BEFORE, execFileSync('git', ['show', `${process.env.VF_BEFORE || 'HEAD'}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const HTML = { before: BEFORE, after: path.join(ROOT, 'deploy/index.html') };
const PACE = +(process.env.VF_PACE_MS ?? (PROD ? 45000 : 0));
let lastLoad = 0, ACCT = null, AUTH = null;
if (PROD) { const { track } = require('../choir-verify/testAccounts'); ACCT = { email: track(`voxcoach-vibfix-${Date.now()}@example.com`), password: 'VF-' + Math.random().toString(36).slice(2) + '!x9' }; }

// Real notes (clip, segment start as realvib.js reports it, length after its 100 ms trims, sung semitone, where the singer
// centred it) — from `node realvib.js --json`; the kind says what the grader should do with it.
const NOTES = {
  V1: { clip: 'vibrato-628', t0: 2896, kind: 'vibrato' }, V2: { clip: 'vibrato-3131', t0: 8046, kind: 'vibrato' },
  V3: { clip: 'vibrato-1154', t0: 4013, kind: 'vibrato' }, V4: { clip: 'vibrato-772', t0: 4946, kind: 'vibrato' },
  V5: { clip: 'vibrato-2417', t0: 7396, kind: 'vibrato-irregular' }, // a real vibrato the gate reads as irregular (r 0.32): scored as read
  V6: { clip: 'vibrato-2961', t0: 630, kind: 'vibrato' },
  S1: { clip: 'straight-625', t0: 3246, kind: 'straight' }, S2: { clip: 'straight-286', t0: 630, kind: 'straight' },
};
const STIM = {
  ...Object.fromEntries(Object.entries(NOTES).map(([id, n]) => [id, { ...n, label: `${n.clip}@${n.t0} centred` }])),
  W1: { ...NOTES.V1, kind: 'wrong', extra: 60, label: 'V1 (real vibrato) sung 60 ct sharp' },
  W5: { ...NOTES.V1, kind: 'wrong', extra: 80, label: 'V1 (real vibrato) sung 80 ct sharp' },
  W2: { ...NOTES.S1, kind: 'wrong', extra: 40, label: 'S1 (real straight) sung 40 ct sharp' },
  W3: { ...NOTES.S1, kind: 'wander', wander: [60, 0.8], label: 'S1 with a slow ±60 ct wander at 0.8 Hz' },
  W4: { ...NOTES.S1, kind: 'flutter', wander: [40, 11], label: 'S1 with an 11 Hz ±40 ct flutter' },
  // negative controls for the vibrato-aware "In tune" window: really off pitch with natural, irregular unsteadiness (no
  // vibrato: must not be rescued at all), and a real vibrato sung off pitch just past the widest window (±20 ct)
  N1: { ...NOTES.S1, kind: 'unsteady', extra: -20, jitter: [12, 1], label: 'S1 sung 20 ct flat, irregular ±12 ct (RMS) unsteadiness' },
  N2: { ...NOTES.S2, kind: 'unsteady', extra: 25, jitter: [18, 2], label: 'S2 sung 25 ct sharp, irregular ±18 ct (RMS) unsteadiness' },
  N3: { ...NOTES.V3, kind: 'wrong', extra: -25, label: 'V3 (real vibrato ±91 ct) sung 25 ct flat' },
  // a wobbly note centred just past Stay in Key's ±35 ct window: its wobble must not be averaged into "In key"
  N4: { ...NOTES.S2, kind: 'unsteady', extra: 45, jitter: [18, 3], label: 'S2 sung 45 ct sharp, irregular ±18 ct (RMS) unsteadiness' },
};
function stimulus(id) {
  const s = STIM[id], rv = JSON.parse(fs.readFileSync(path.join(TMP, 'rv.json'))).find(r => r.file === s.clip + '.wav' && r.t0 === s.t0);
  if (!rv) throw new Error(`note ${s.clip}@${s.t0} not found in realvib output`);
  const f = path.join(TMP, `stim-${id}.wav`);
  execFileSync('python', [path.join(__dirname, 'realstim.py'), f, JSON.stringify({ clip: path.join(VS, s.clip + '.wav'), startMs: rv.t0 + 100, durMs: rv.dur,
    shiftCents: -rv.centre + (s.extra || 0), wanderCents: s.wander ? s.wander[0] : 0, wanderHz: s.wander ? s.wander[1] : 0,
    jitterCents: s.jitter ? s.jitter[0] : 0, jitterSeed: s.jitter ? s.jitter[1] : 1, seconds: 40 })]);
  return { file: f, target: rv.target, rv };
}

const online = () => fetch('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/package.json', { method: 'HEAD' }).then(r => r.ok, () => false);
async function withPage(file, which, fn, attempt = 1) {
  const wait = lastLoad + PACE - Date.now(); if (wait > 0) await sleep(wait);
  lastLoad = Date.now();
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(which === 'prod' && AUTH ? { storageState: AUTH } : {}) });
    if (which !== 'prod') await ctx.route('http://localhost:8765/**', r => { // the page and the scripts next to it (vocal-load*.js), from the same version
      const p = new URL(r.request().url()).pathname.slice(1);
      if (!p || p === 'index.html') return r.fulfill({ path: HTML[which], contentType: 'text/html' });
      if (!/^[\w.-]+\.js$/.test(p)) return r.fulfill({ status: 404, body: '' });
      const body = which === 'before' ? execFileSync('git', ['show', `${process.env.VF_BEFORE || 'HEAD'}:deploy/${p}`], { cwd: ROOT }) : fs.readFileSync(path.join(ROOT, 'deploy', p));
      return r.fulfill({ body, contentType: 'application/javascript' });
    });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('requestfailed', r => { if (['script', 'stylesheet'].includes(r.resourceType())) errors.push(`load failed: ${r.url()} (${r.failure()?.errorText})`); });
    const resp = await page.goto(which === 'prod' ? PROD : 'http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    if (resp && resp.status() >= 400) errors.push(`page answered HTTP ${resp.status()}`);
    const ok = await page.evaluate(() => { try { return typeof sb === 'object' && !!BOSS_DIFFICULTY && typeof captureNoteFrame === 'function'; } catch (e) { return false; } }).catch(() => false);
    if (errors.length || !ok) {
      log(`   PAGE LOAD ERRORS (${which}, attempt ${attempt}):`, JSON.stringify(errors));
      if (errors.some(e => /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_NETWORK_CHANGED/.test(e))) { // the machine is offline: wait for it, don't spend an attempt
        await b.close(); log('   offline — waiting for the network (up to 30 min)');
        const t0 = Date.now(); while (Date.now() - t0 < 1800000) { await sleep(15000); if (await online()) break; }
        return withPage(file, which, fn, attempt);
      }
      if (attempt < 3) { await b.close(); return withPage(file, which, fn, attempt + 1); }
      throw new Error(`${which} page failed to load 3 times`);
    }
    // the file-backed fake mic is silent for its first ~1–2 s: warm it up on a throwaway stream first
    await page.evaluate(async () => {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close();
    });
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    if (which === 'prod') {
      if (!AUTH) {
        await page.evaluate(() => openAuthModal());
        await page.locator('#authName').fill('Vibfix Check');
        await page.locator('#authEmail').fill(ACCT.email); await page.locator('#authPassword').fill(ACCT.password);
        await page.locator('#authCreateBtn').click();
      }
      await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display !== 'flex', null, { timeout: 20000 });
      if (!AUTH) { AUTH = await ctx.storageState(); log(`   signed up ${ACCT.email} on ${PROD}`); }
      const gate = await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; return { paid: isPaid(), trial: isInTrial(), hasFix: typeof vibratoTolerantCents === 'function' }; });
      if (!gate.paid || !gate.hasFix) throw new Error(`prod: account can't use the features or the page lacks the fix: ${JSON.stringify(gate)}`);
    } else await page.evaluate(() => { requireProFeature = () => true; blockExercise = () => false; });
    try { return await fn(page); } finally { if (errors.length) log(`   PAGE ERRORS during the run (${which}):`, JSON.stringify(errors)); }
  } finally { await b.close().catch(() => {}); }
}

async function runAll(page, target) {
  const out = {};
  // Pitch Match: the real Listen button, two takes per level
  out.pitch = {};
  for (const level of ['intermediate', 'professional']) {
    out.pitch[level] = [];
    for (let k = 0; k < 2; k++) out.pitch[level].push(await page.evaluate(async ({ level, target }) => {
      setExerciseLevel(level); pitchTargetMidi = target;
      const btn = document.getElementById('pitchListenBtn'); btn.click();
      await new Promise(r => setTimeout(r, 100));
      const t0 = performance.now(); while (btn.disabled && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
      const v = parseInt(document.getElementById('pitchAccuracyVal').textContent, 10);
      // every take lasts 8 s on both sides, so the features after it hear the same stretch of the stimulus (Pitch Match's
      // own length differs between versions)
      while (performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
      return v;
    }, { level, target }));
  }
  // Register Drills: the real Start button; every note's target is the sung note (range set so the chest zone starts on it)
  out.drills = await page.evaluate(async target => {
    const rnd = Math.random; Math.random = () => 0;
    if (typeof pickNote === 'function') { window.__pick = window.__pick || pickNote; pickNote = (k, lo, hi) => k === 'drill' ? lo : __pick(k, lo, hi); } // every drill note on the sung one (the picker never repeats a note)
    lowNote = freqToNote(noteToFreq(target)); highNote = freqToNote(noteToFreq(target + 24)); drillMode = 'chest';
    document.getElementById('drillStartBtn').click();
    const t0 = performance.now(); while (!(drillResults.length === DRILL_NOTE_COUNT && !drillActive) && performance.now() - t0 < 40000) await new Promise(r => setTimeout(r, 100));
    Math.random = rnd; if (window.__pick) pickNote = __pick;
    return drillResults.map(r => ({ midi: r.midi, pitchAcc: r.heard ? r.pitchAcc : null }));
  }, target);
  // Real-Time Feedback: the real Start button; the Pitch and Stability rows' states every 50 ms for 6 s after a 1 s settle
  out.rtf = await page.evaluate(async () => {
    document.getElementById('liveFeedbackStartBtn').click();
    await new Promise(r => setTimeout(r, 1000));
    const s = { pitch: [], stab: [], pitchText: {} }, t0 = performance.now();
    while (performance.now() - t0 < 6000) {
      s.pitch.push(document.getElementById('lfPitchIcon').dataset.state); s.stab.push(document.getElementById('lfStabilityIcon').dataset.state);
      const tx = document.getElementById('lfPitchText').textContent; s.pitchText[tx] = (s.pitchText[tx] || 0) + 1;
      await new Promise(r => setTimeout(r, 50));
    }
    document.getElementById('liveFeedbackStartBtn').click();
    // a frame with no pitch ("Listening…") is neither in tune nor out: it's left out of both percentages
    const voiced = s.pitch.map(x => x !== 'neutral'), nv = voiced.filter(Boolean).length;
    const pct = a => nv ? Math.round(100 * a.filter((x, i) => voiced[i] && x === 'good').length / nv) : null;
    const top = Object.entries(s.pitchText).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}×${v}`).join(', ');
    return { inTune: pct(s.pitch), steady: pct(s.stab), n: s.pitch.length, voiced: nv, top };
  });
  // Tuner: the real mic button; its readout every 50 ms for 6 s after a 1 s settle (measured, not checked)
  out.tuner = await page.evaluate(async () => {
    document.getElementById('micBtn').click();
    await new Promise(r => setTimeout(r, 1000));
    const s = [], t0 = performance.now();
    while (performance.now() - t0 < 6000) {
      s.push({ text: document.getElementById('centsDisplay').textContent, stab: parseInt(document.getElementById('stabilityStat').textContent, 10) });
      await new Promise(r => setTimeout(r, 50));
    }
    document.getElementById('micBtn').click();
    const v = s.filter(x => x.text !== 'Listening…'), st = v.filter(x => !Number.isNaN(x.stab));
    return { voiced: v.length, n: s.length, inTune: v.length ? Math.round(100 * v.filter(x => x.text === 'In tune').length / v.length) : null,
      stable: st.length ? Math.round(100 * st.filter(x => x.stab >= 75).length / st.length) : null, stabMean: st.length ? Math.round(st.reduce((a, x) => a + x.stab, 0) / st.length) : null };
  });
  // Stay in Key: the real Start button, every chord tone stubbed to the sung note; "In key" every 50 ms for 6 s (measured, not checked)
  out.stayKey = await page.evaluate(async target => {
    chordTonePitchClasses = () => new Set([((target % 12) + 12) % 12]);
    document.getElementById('stayKeyStartBtn').click();
    await new Promise(r => setTimeout(r, 1000));
    const s = [], t0 = performance.now();
    while (performance.now() - t0 < 6000 && stayKeyActive) { s.push(document.getElementById('stayKeyStatus').textContent); await new Promise(r => setTimeout(r, 50)); }
    if (stayKeyActive) document.getElementById('stayKeyStartBtn').click();
    const v = s.filter(x => x !== 'Listening…');
    return { voiced: v.length, n: s.length, inKey: v.length ? Math.round(100 * v.filter(x => x === 'In key').length / v.length) : null, result: document.getElementById('stayKeyAccuracyVal').textContent };
  }, target);
  // Choir World: its capture (captureNoteFrame, shared mic), verdict (judgeHeldNote) and Performance Report (prNoteStats)
  out.choir = [];
  for (let k = 0; k < 2; k++) out.choir.push(await page.evaluate(async target => {
    await initAudio();
    const nt = { midi: target, start: 0, end: 3.3 }, run = { notes: [nt], cents: [[]], times: [[]], firstVoiced: [null], results: [] };
    const t0 = performance.now();
    await new Promise(res => { (function f() { const songT = (performance.now() - t0) / 1000; captureNoteFrame(run, 0, nt, songT); if (songT < nt.end) requestAnimationFrame(f); else res(); })(); });
    const r = run.results[0] = judgeHeldNote(target, run.cents[0], run.times[0]);
    const s = prNoteStats(run, 0);
    return { heard: r.heard, held: r.held, cents: r.cents, prPitch: s.pitchAcc, inTune: `${s.inTune}/${s.cents.length}` };
  }, target));
  return out;
}
const avg = a => { a = a.filter(x => x != null && !Number.isNaN(x)); return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null; };
const brief = o => ({ pmInt: avg(o.pitch.intermediate), pmPro: avg(o.pitch.professional), drills: avg(o.drills.map(d => d.pitchAcc)), rtfInTune: o.rtf.inTune, rtfSteady: o.rtf.steady,
  cwHeld: o.choir.every(c => c.held), cwCents: o.choir.map(c => c.cents).join('/'), cwPitch: avg(o.choir.map(c => c.prPitch)) });
// One run's readings, as regress mode compares them
const readings = o => ({ ...brief(o), cwMedian: avg(o.choir.map(c => c.cents)), tunerInTune: o.tuner.inTune, tunerStable: o.tuner.stable });
const median = a => { a = a.filter(x => x != null && !Number.isNaN(x)).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

// VF_MODE=regress verdict: master ('before') against the branch ('after'), by the medians of RUNS runs per side. A check
// has `ok` (judged on each side's median by itself) and/or `better` + `tol` (the branch's median against master's).
function regressVerdict(rows) {
  const C = { regression: [], fixed: [], already: [], pass: [] };
  const vals = (r, side, k) => r.runs[side].map(x => x[k]);
  const med = (r, side, k) => median(vals(r, side, k));
  const spread = (r, k) => { const v = vals(r, 'before', k).filter(x => x != null); return v.length ? Math.max(...v) - Math.min(...v) : 0; };
  // a noisy reading's tolerance: master's own spread, at least ±5, at most ±10 (one odd run among three, e.g. a Tuner
  // stability of 68 among 42 / 44, would otherwise make the check meaningless; the medians already ignore that run)
  const noisyTol = sp => Math.min(10, Math.max(5, sp));
  const sref = (side, k) => avg(rows.filter(r => r.kind === 'straight').map(r => med(r, side, k)));
  const add = (r, k, label, { ok, better, tol }, rule) => {
    let cls = 'pass';
    if (ok) { const m = ok('before'), b = ok('after'); cls = m && !b ? 'regression' : !m && !b ? 'already' : !m && b ? 'fixed' : 'pass'; }
    const d = med(r, 'after', k) - med(r, 'before', k);
    if (better && Math.abs(d) > tol) { if (better === 'higher' ? d < 0 : d > 0) cls = 'regression'; else if (cls === 'pass') cls = 'fixed'; }
    const pct = /^(rtf|tuner)/.test(k) ? '%' : '';
    C[cls].push(`${r.id} ${label} ${k}: master ${vals(r, 'before', k).join('/')}${pct} (median ${med(r, 'before', k)}, spread ${spread(r, k)}) → branch ${vals(r, 'after', k).join('/')}${pct} (median ${med(r, 'after', k)})${better ? `, change ${d > 0 ? '+' : ''}${d} (±${tol})` : ''} · ${rule}`);
  };
  const MULT = { pmInt: 0.6, pmPro: 0.9, drills: 0.6, cwPitch: 0.6 };
  for (const r of rows) {
    const hasVib = r.rv.gate, offset = Math.abs(med(r, 'before', 'cwMedian')), v = k => side => med(r, side, k);
    for (const k of ['pmInt', 'pmPro', 'drills', 'cwPitch']) {
      const a = v(k), sr = side => sref(side, k);
      if (r.kind === 'vibrato') add(r, k, 'vibrato', { ok: s => a(s) >= sr(s) - 8, better: 'higher', tol: 3 }, `within 8 of the straight notes (${sr('before')} / ${sr('after')}), must not drop more than 3`);
      if (r.kind === 'straight') add(r, k, 'straight', { better: 'higher', tol: 3 }, 'must not drop more than 3');
      if (r.kind === 'wrong' && hasVib) { const e = Math.max(0, Math.round(100 - offset * MULT[k])); add(r, k, r.label, { ok: s => Math.abs(a(s) - e) <= 6 && (offset < 40 || a(s) <= sr(s) - 10) }, `a straight note ${offset} ct off scores ${e}: within 6 of that${offset < 40 ? '' : ', and ≥10 below the straight notes'}`); }
      if (['wrong', 'wander', 'flutter', 'unsteady'].includes(r.kind) && !hasVib) add(r, k, r.kind, { better: 'lower', tol: 3 }, 'no vibrato in it: must not rise more than 3');
      if (r.kind === 'vibrato-irregular') log(`   note: ${r.id} (real vibrato read as irregular) ${k}: ${med(r, 'before', k)} → ${med(r, 'after', k)}`);
    }
    for (const k of ['rtfInTune', 'rtfSteady']) {
      const a = v(k), sr = side => sref(side, k), tol = noisyTol(spread(r, k));
      if (r.kind === 'vibrato') add(r, k, 'vibrato RTF', { ok: s => a(s) >= sr(s) - 20, better: 'higher', tol }, `within 20 of the straight notes (${sr('before')}% / ${sr('after')}%), must not drop past the tolerance`);
      if (r.kind === 'straight') add(r, k, 'straight RTF', { better: 'higher', tol }, 'must not drop past the tolerance');
      if (['wrong', 'flutter', 'unsteady'].includes(r.kind) && k === 'rtfInTune') add(r, k, `${r.kind} RTF`, { better: 'lower', tol }, 'must not rise past the tolerance');
      if (['wander', 'flutter', 'unsteady'].includes(r.kind) && k === 'rtfSteady') add(r, k, `${r.label} RTF`, { ok: s => a(s) <= 25, better: 'lower', tol }, 'wobbly, no vibrato: Steady on ≤25% of voiced frames, must not rise past the tolerance');
      if ((r.kind === 'unsteady' || (r.kind === 'wrong' && Math.abs(r.extra) <= 30)) && k === 'rtfInTune') add(r, k, `${r.label} RTF`, { ok: s => a(s) <= 25 }, 'off pitch past the window: in tune on ≤25% of voiced frames');
    }
    // Tuner (measured only outside this mode): in tune and steady are good on a vibrato or straight note; a wrong note
    // shouldn't read in tune, and a wobbly one shouldn't read steady
    const wobbly = ['wander', 'flutter', 'unsteady'].includes(r.kind), good = ['vibrato', 'straight', 'vibrato-irregular'].includes(r.kind);
    add(r, 'tunerInTune', 'Tuner', { better: good ? 'higher' : 'lower', tol: noisyTol(spread(r, 'tunerInTune')) }, `must not ${good ? 'drop' : 'rise'} past the tolerance`);
    add(r, 'tunerStable', 'Tuner', { better: wobbly ? 'lower' : 'higher', tol: noisyTol(spread(r, 'tunerStable')) }, `must not ${wobbly ? 'rise' : 'drop'} past the tolerance`);
    // Choir World: held in most runs
    const held = side => r.runs[side].filter(x => x.cwHeld).length * 2 > r.runs[side].length;
    const heldStr = side => r.runs[side].map(x => x.cwHeld ? '✓' : '✗').join('');
    if (r.kind === 'vibrato' || r.kind === 'straight') (held('before') && !held('after') ? C.regression : !held('before') && !held('after') ? C.already : !held('before') ? C.fixed : C.pass)
      .push(`${r.id} ${r.kind} Choir World held: master ${heldStr('before')} → branch ${heldStr('after')} · must be held`);
    if (r.kind === 'wrong' && r.extra >= 80) (!held('before') && held('after') ? C.regression : held('before') && held('after') ? C.already : held('before') ? C.fixed : C.pass)
      .push(`${r.id} ${r.label} Choir World held: master ${heldStr('before')} → branch ${heldStr('after')} · must not be held (past ±50)`);
  }
  log(`\n==== Regression: passes on master and fails on the branch, or moves past the tolerance the wrong way (blocks a deploy)`);
  C.regression.forEach(x => log('REGRESSION ' + x));
  log(`\n==== Fixed: fails on master and passes on the branch, or moves past the tolerance the right way`);
  C.fixed.forEach(x => log('FIXED ' + x));
  log(`\n==== Already failing: fails on master and on the branch (not caused by the branch)`);
  C.already.forEach(x => log('ALREADY ' + x));
  log(`\n==== VERDICT (regress, ${RUNS} runs per side, medians): ${C.regression.length} regression(s), ${C.fixed.length} fixed, ${C.already.length} already failing, ${C.pass.length} passed`);
  C.pass.forEach(x => log('pass ' + x));
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
  logf.end();
  process.exitCode = C.regression.length ? 1 : 0;
}

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(STIM);
  log(`vibfix ${stamp}  sides: ${SIDES.join(', ')}${PROD ? '  url: ' + PROD : '  before: ' + (process.env.VF_BEFORE || 'HEAD')}${REGRESS ? '  mode: regress (rises become "must not move")' : ''}`);
  execFileSync('node', [path.join(__dirname, 'realvib.js'), VS, '--json', path.join(TMP, 'rv.json')]);
  // VF_RESUME=<earlier .json of the same code>: keep its finished stimuli, run only the rest
  const rows = process.env.VF_RESUME ? JSON.parse(fs.readFileSync(process.env.VF_RESUME)).filter(r => only.includes(r.id) && SIDES.every(w => r.res[w]) && (!REGRESS || r.runs)) : [];
  if (rows.length) log(`resumed from ${process.env.VF_RESUME}: ${rows.map(r => r.id).join(', ')}`);
  for (const id of only) {
    if (rows.some(r => r.id === id)) continue;
    const st = stimulus(id), s = STIM[id];
    log(`\n== ${id}: ${s.label} — target ${st.target} (sung ${st.rv.centre > 0 ? '+' : ''}${st.rv.centre} ct, re-centred${s.extra ? `, then ${s.extra > 0 ? '+' : ''}${s.extra}` : ''}); offline gate: ${st.rv.gate ? 'vibrato' : 'as read'} ${st.rv.rate ?? '—'} Hz ±${st.rv.depth ?? '—'} r ${st.rv.r ?? '—'}`);
    const res = {}, runs = Object.fromEntries(SIDES.map(w => [w, []]));
    for (let k = 0; k < RUNS; k++) for (const which of SIDES) { // regress mode: the sides alternate, so drift reaches both alike
      const o = await withPage(st.file, which, page => runAll(page, st.target));
      if (k === 0) res[which] = o;
      runs[which].push(readings(o));
      const b = brief(o), tag = (which + (RUNS > 1 ? ` #${k + 1}` : '')).padEnd(RUNS > 1 ? 9 : 6);
      log(`   ${tag} Tuner in tune ${o.tuner.inTune}% stability ≥75 ${o.tuner.stable}% (mean ${o.tuner.stabMean}) of ${o.tuner.voiced}/${o.tuner.n} | Stay in Key in key ${o.stayKey.inKey}% of ${o.stayKey.voiced}/${o.stayKey.n} (result ${o.stayKey.result})`);
      log(`   ${tag} Pitch Match int ${o.pitch.intermediate.join('/')} pro ${o.pitch.professional.join('/')} | Drills ${o.drills.map(d => d.pitchAcc ?? '—').join('/')} | RTF in tune ${b.rtfInTune}% steady ${b.rtfSteady}% of ${o.rtf.voiced}/${o.rtf.n} voiced frames (${o.rtf.top}) | Choir World held ${o.choir.map(c => c.held ? '✓' : '✗').join('')} median ${b.cwCents} ct, report pitch ${o.choir.map(c => c.prPitch).join('/')} in tune ${o.choir.map(c => c.inTune).join(', ')}`);
    }
    rows.push({ id, ...s, target: st.target, rv: st.rv, res, ...(REGRESS ? { runs } : {}) });
    fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
  }
  // Verdicts
  if (REGRESS) return regressVerdict(rows);
  const P = [], F = [];
  const check = (ok, s) => (ok ? P : F).push(s);
  const val = (r, side, k) => brief(r.res[side])[k];
  const straightRef = side => { const s = rows.filter(r => r.kind === 'straight'); return k => avg(s.map(r => val(r, side, k))); };
  const A = PROD ? 'prod' : 'after';
  // Criteria (fixed 2026-09-30 after the first run showed two of the first set measured the wrong thing):
  //  vibrato (the gate reads it as vibrato): within 8 of the straight real notes on every per-note grader, and up ≥ 3
  //  wrong note sung WITH vibrato: scored like a straight note that far off — 100 − |offset|×multiplier ± 6, offset = the
  //    note's median as Choir World measured it before the change — and ≥ 10 below the straight notes
  //  wrong / wander / flutter WITHOUT vibrato: no new tolerance — the score may not rise more than 3
  //  straight: no grader moves more than 3
  //  Real-Time Feedback (per frame, "In tune" = ±8 ct, plus the note's vibratoCentreSlack when it's recognised as
//    vibrato; percentages over frames with a pitch, "Listening…" left out): vibrato within 20 points of the straight real notes and up ≥ 20;
  //    straight doesn't drop more than 10; wrong / flutter / unsteady "In tune" doesn't rise more than 5, and
//    unsteady or a vibrato ≤30 ct off reads in tune on ≤25% of frames; wander / flutter / unsteady (no vibrato in it)
//    "Steady" doesn't rise more than 5 and reads Steady on ≤25% of frames (added 2026-09-30: the vibrato centre had
//    smoothed irregular wobble into "Steady" and no check caught it)
  //  Choir World verdict: vibrato and straight notes held; a note 80 ct off not held
  const MULT = { pmInt: 0.6, pmPro: 0.9, drills: 0.6, cwPitch: 0.6 };
  for (const r of rows) {
    const ref = straightRef(A), hasVib = r.rv.gate;
    const offset = PROD ? null : Math.abs(avg(r.res.before.choir.map(c => c.cents)));
    for (const k of ['pmInt', 'pmPro', 'drills', 'cwPitch']) {
      const a = val(r, A, k), b = PROD ? null : val(r, 'before', k), sr = ref(k);
      if (r.kind === 'vibrato') check(a >= sr - 8 && (PROD || (REGRESS ? Math.abs(a - b) <= 3 : a >= b + 3)), `${r.id} vibrato ${k}: ${PROD ? '' : b + ' → '}${a} (straight notes ${sr}; must be within 8${PROD ? '' : REGRESS ? ' and not move more than 3' : ' and up ≥3'})`);
      if (r.kind === 'straight' && !PROD) check(Math.abs(a - b) <= 3, `${r.id} straight ${k}: ${b} → ${a} (must not move more than 3)`);
      if (r.kind === 'wrong' && hasVib && !PROD) { const e = Math.max(0, Math.round(100 - offset * MULT[k])); check(Math.abs(a - e) <= 6 && (offset < 40 || a <= sr - 10), `${r.id} ${r.label} ${k}: ${b} → ${a} (a straight note ${offset} ct off scores ${e}; must be within 6 of that${offset < 40 ? '' : ` and ≥10 below the straight notes ${sr}`})`); }
      if (['wrong', 'wander', 'flutter', 'unsteady'].includes(r.kind) && !hasVib && !PROD) check(a <= b + 3, `${r.id} ${r.kind} ${k}: ${b} → ${a} (no vibrato in it: must not rise more than 3)`);
      if (['wrong', 'wander', 'flutter'].includes(r.kind) && PROD) check(a <= sr - 10, `${r.id} ${r.kind} ${k}: ${a} (straight notes ${sr}; must stay ≥10 below)`);
      if (r.kind === 'vibrato-irregular') log(`   note: ${r.id} (real vibrato read as irregular) ${k}: ${PROD ? '' : b + ' → '}${a}`);
    }
    for (const k of ['rtfInTune', 'rtfSteady']) {
      const a = val(r, A, k), b = PROD ? null : val(r, 'before', k), sr = ref(k);
      if (r.kind === 'vibrato') check(a >= sr - 20 && (PROD || (REGRESS ? Math.abs(a - b) <= 5 : a >= b + 20)), `${r.id} vibrato RTF ${k}: ${PROD ? '' : b + '% → '}${a}% (straight notes ${sr}%; must be within 20${PROD ? '' : REGRESS ? ' and not move more than 5' : ' and up ≥20'})`);
      if (r.kind === 'straight' && !PROD) check(a >= b - 10, `${r.id} straight RTF ${k}: ${b}% → ${a}% (must not drop >10)`);
      if (['wrong', 'flutter', 'unsteady'].includes(r.kind) && k === 'rtfInTune' && !PROD) check(a <= b + 5, `${r.id} ${r.kind} RTF "In tune": ${b}% → ${a}% (must not rise >5)`);
      if (['wander', 'flutter', 'unsteady'].includes(r.kind) && k === 'rtfSteady') {
        if (!PROD) check(a <= b + 5, `${r.id} ${r.kind} RTF "Steady": ${b}% → ${a}% (no vibrato in it: must not rise >5)`);
        check(a <= 25, `${r.id} ${r.label} RTF "Steady": ${PROD ? '' : b + '% → '}${a}% (wobbly, no vibrato: must read Steady on ≤25% of voiced frames)`);
      }
      if ((r.kind === 'unsteady' || (r.kind === 'wrong' && Math.abs(r.extra) <= 30)) && k === 'rtfInTune') check(a <= 25, `${r.id} ${r.label} RTF "In tune": ${PROD ? '' : b + '% → '}${a}% (off pitch past the window: must read in tune ≤25% of voiced frames)`);
    }
    const held = r.res[A].choir.every(c => c.held);
    if (r.kind === 'vibrato' || r.kind === 'straight') check(held, `${r.id} ${r.kind} Choir World held: ${held}`);
    if (r.kind === 'wrong' && r.extra >= 80) check(r.res[A].choir.every(c => !c.held), `${r.id} ${r.label} Choir World held: ${r.res[A].choir.map(c => c.held)} (must fail: past the ±50 tolerance)`);
    if (r.kind === 'wrong' && r.extra === 60) log(`   note: ${r.id} sits at ~${offset} ct, next to Choir World's ±50 line: held ${r.res[A].choir.map(c => c.held)} (median ${r.res[A].choir.map(c => c.cents)})`);
  }
  // Tuner and Stay in Key: measured only (their readouts use the same live vibrato centre as RTF)
  log('\n==== Tuner / Stay in Key (measured, not checked)');
  for (const r of rows) if (r.res[A].tuner) log(`   ${r.id.padEnd(3)} ${r.kind.padEnd(17)} Tuner in tune ${SIDES.map(w => r.res[w].tuner.inTune + '%').join(' → ')}, stability ≥75 ${SIDES.map(w => r.res[w].tuner.stable + '%').join(' → ')} | Stay in Key in key ${SIDES.map(w => r.res[w].stayKey.inKey + '%').join(' → ')}`);
  log(`\n==== VERDICT: ${P.length} passed, ${F.length} failed`);
  F.forEach(s => log('FAIL ' + s)); P.forEach(s => log('pass ' + s));
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
  logf.end();
  process.exitCode = F.length ? 1 : 0;
})().catch(e => { log('ERROR ' + (e.stack || e)); logf.end(); process.exitCode = 2; });
