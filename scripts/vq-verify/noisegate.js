// "Is someone singing" gate (autoCorrelate's clarity ≥ VOICE_MIN_CLARITY and f0 ≥ VOICE_MIN_HZ), through the real UI with
// nobody singing and with singing the gate must not lose, before (deploy/index.html at NG_BEFORE, default HEAD) and after
// (the working tree), or on a deployed URL (NG_URL) signed in as one throwaway account deleted at exit (testAccounts.js).
//   Pitch Match (Listen, Intermediate, 2 takes), Register Drills (5 notes), Real-Time Feedback (6 s), Tuner (6 s),
//   Stay in Key (6 s), Choir World capture + verdict (2 × 3.3 s) — the same drivers as vibfix.js, target A3 (57).
// Stimuli: %TEMP%/vq-verify/gate/*.wav from gatestim.py (see README). Noise alone is at the level it has 10 dB under a
// typical sung note on this mic chain; real speech and TV are public-domain recordings (LibriVox, Bonanza PD episodes).
// Checks: broadband noise and hum (no pitch in it) must be heard on ≤ 5% of frames and never held / scored; every noise
// may only hold or improve on every feature; breathy and soft (pp) singing must keep ≥ 95% of the frames heard before.
// Real speech and TV are reported, not checked (a speaking voice is periodic: this gate isn't meant to remove it).
// Usage: [NG_URL=<url>] [NG_PACE_MS=45000] [NG_RESUME=logs/<earlier>.json] node scripts/vq-verify/noisegate.js [stimulus names, comma-separated]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), DIR = path.join(os.tmpdir(), 'vq-verify', 'gate');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const PROD = process.env.NG_URL, SIDES = PROD ? ['prod'] : ['before', 'after'];
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `noisegate-${PROD ? 'prod' : 'local'}-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BEFORE = path.join(DIR, 'index-before.html');
if (!PROD) fs.writeFileSync(BEFORE, execFileSync('git', ['show', `${process.env.NG_BEFORE || 'HEAD'}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const HTML = { before: BEFORE, after: path.join(ROOT, 'deploy/index.html') };
const PACE = +(process.env.NG_PACE_MS ?? (PROD ? 45000 : 0));
let lastLoad = 0, ACCT = null, AUTH = null;
if (PROD) { const { track } = require('../choir-verify/testAccounts'); ACCT = { email: track(`voxcoach-noisegate-${Date.now()}@example.com`), password: 'NG-' + Math.random().toString(36).slice(2) + '!x9' }; }
const TARGET = 57;

const STIM = {
  'noise-white-10': 'broadband', 'noise-pink-10': 'broadband', 'noise-traffic-10': 'broadband', 'noise-rumble-10': 'broadband',
  'noise-babble-10': 'voices', 'noise-talker-10': 'voices', 'noise-tv-10': 'voices',
  'noise-realspeech-alice-10': 'real', 'noise-realspeech-holmes-10': 'real', 'noise-realtv-bonanza-a-10': 'real', 'noise-realtv-bonanza-b-10': 'real',
  'sing-breathy-5': 'soft', 'sing-breathy-562': 'soft', 'sing-breathy-1197': 'soft', 'sing-breathy-1743': 'soft', 'sing-breathy-2353': 'soft', 'sing-breathy-3002': 'soft',
  'sing-pp-92': 'soft', 'sing-pp-646': 'soft', 'sing-pp-1717': 'soft', 'sing-pp-2977': 'soft',
  'mix-breathy-1197-white-10': 'soft', 'mix-breathy-1743-traffic-10': 'soft', 'mix-breathy-3002-talker-10': 'soft',
};

const online = () => fetch('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/package.json', { method: 'HEAD' }).then(r => r.ok, () => false);
async function withPage(file, which, fn, attempt = 1) {
  const wait = lastLoad + PACE - Date.now(); if (wait > 0) await sleep(wait);
  lastLoad = Date.now();
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(which === 'prod' && AUTH ? { storageState: AUTH } : {}) });
    if (which !== 'prod') await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1);
      if (!p || p === 'index.html') return r.fulfill({ path: HTML[which], contentType: 'text/html' });
      if (!/^[\w.-]+\.js$/.test(p)) return r.fulfill({ status: 404, body: '' });
      const body = which === 'before' ? execFileSync('git', ['show', `${process.env.NG_BEFORE || 'HEAD'}:deploy/${p}`], { cwd: ROOT }) : fs.readFileSync(path.join(ROOT, 'deploy', p));
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
      if (errors.some(e => /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_NETWORK_CHANGED/.test(e))) {
        await b.close(); log('   offline — waiting for the network (up to 30 min)');
        const t0 = Date.now(); while (Date.now() - t0 < 1800000) { await sleep(15000); if (await online()) break; }
        return withPage(file, which, fn, attempt);
      }
      if (attempt < 3) { await b.close(); return withPage(file, which, fn, attempt + 1); }
      throw new Error(`${which} page failed to load 3 times`);
    }
    await page.evaluate(async () => { // the file-backed fake mic is silent for its first ~1–2 s: warm it up
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
        await page.locator('#authName').fill('Noisegate Check');
        await page.locator('#authEmail').fill(ACCT.email); await page.locator('#authPassword').fill(ACCT.password);
        await page.locator('#authCreateBtn').click();
      }
      await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display !== 'flex', null, { timeout: 20000 });
      if (!AUTH) { AUTH = await ctx.storageState(); log(`   signed up ${ACCT.email} on ${PROD}`); }
      const gate = await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; return { paid: isPaid(), trial: isInTrial(), hasFix: typeof VOICE_MIN_CLARITY === 'number' }; });
      if (!gate.paid || !gate.hasFix) throw new Error(`prod: account can't use the features or the page lacks the fix: ${JSON.stringify(gate)}`);
    } else await page.evaluate(() => { requireProFeature = () => true; blockExercise = () => false; });
    try { return await fn(page); } finally { if (errors.length) log(`   PAGE ERRORS during the run (${which}):`, JSON.stringify(errors)); }
  } finally { await b.close().catch(() => {}); }
}

async function runAll(page, target) {
  const out = {};
  out.pitch = [];
  for (let k = 0; k < 2; k++) out.pitch.push(await page.evaluate(async target => {
    setExerciseLevel('intermediate'); pitchTargetMidi = target;
    const btn = document.getElementById('pitchListenBtn'); btn.click();
    await new Promise(r => setTimeout(r, 100));
    const t0 = performance.now(); while (btn.disabled && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
    // nothing heard: the page shows 0% with the "didn't hear you" feedback and records no score
    if (document.getElementById('pitchFeedback').textContent === accuracyFeedback(0, false)) return null;
    const v = parseInt(document.getElementById('pitchAccuracyVal').textContent, 10); return Number.isNaN(v) ? null : v;
  }, target));
  out.drills = await page.evaluate(async target => {
    const rnd = Math.random; Math.random = () => 0;
    lowNote = freqToNote(noteToFreq(target)); highNote = freqToNote(noteToFreq(target + 24)); drillMode = 'chest';
    document.getElementById('drillStartBtn').click();
    const t0 = performance.now(); while (!(drillResults.length === DRILL_NOTE_COUNT && !drillActive) && performance.now() - t0 < 40000) await new Promise(r => setTimeout(r, 100));
    Math.random = rnd;
    return drillResults.map(r => r.heard ? r.pitchAcc : null);
  }, target);
  out.rtf = await page.evaluate(async () => {
    document.getElementById('liveFeedbackStartBtn').click();
    await new Promise(r => setTimeout(r, 1000));
    const s = [], t0 = performance.now();
    while (performance.now() - t0 < 6000) { s.push(document.getElementById('lfPitchIcon').dataset.state); await new Promise(r => setTimeout(r, 50)); }
    document.getElementById('liveFeedbackStartBtn').click();
    const v = s.filter(x => x !== 'neutral');
    return { voiced: Math.round(100 * v.length / s.length), inTune: Math.round(100 * v.filter(x => x === 'good').length / s.length) }; // % of all frames
  });
  out.tuner = await page.evaluate(async () => {
    document.getElementById('micBtn').click();
    await new Promise(r => setTimeout(r, 1000));
    const s = [], t0 = performance.now();
    while (performance.now() - t0 < 6000) { s.push(document.getElementById('centsDisplay').textContent); await new Promise(r => setTimeout(r, 50)); }
    document.getElementById('micBtn').click();
    const v = s.filter(x => x !== 'Listening…');
    return { voiced: Math.round(100 * v.length / s.length), inTune: Math.round(100 * v.filter(x => x === 'In tune').length / s.length) };
  });
  out.stayKey = await page.evaluate(async target => {
    chordTonePitchClasses = () => new Set([((target % 12) + 12) % 12]);
    document.getElementById('stayKeyStartBtn').click();
    await new Promise(r => setTimeout(r, 1000));
    const s = [], t0 = performance.now();
    while (performance.now() - t0 < 6000 && stayKeyActive) { s.push(document.getElementById('stayKeyStatus').textContent); await new Promise(r => setTimeout(r, 50)); }
    if (stayKeyActive) document.getElementById('stayKeyStartBtn').click();
    const v = s.filter(x => x !== 'Listening…');
    return { voiced: Math.round(100 * v.length / Math.max(1, s.length)), inKey: Math.round(100 * v.filter(x => x === 'In key').length / Math.max(1, s.length)) };
  }, target);
  out.choir = [];
  for (let k = 0; k < 2; k++) out.choir.push(await page.evaluate(async target => {
    await initAudio();
    const nt = { midi: target, start: 0, end: 3.3 }, run = { notes: [nt], cents: [[]], times: [[]], firstVoiced: [null], results: [] };
    const t0 = performance.now(); let n = 0;
    await new Promise(res => { (function f() { const songT = (performance.now() - t0) / 1000; captureNoteFrame(run, 0, nt, songT); n++; if (songT < nt.end) requestAnimationFrame(f); else res(); })(); });
    const r = judgeHeldNote(target, run.cents[0], run.times[0]);
    return { frames: run.cents[0].length, of: n, heard: r.heard, held: !!r.held, cents: r.cents ?? null };
  }, target));
  return out;
}
const avg = a => { a = a.filter(x => x != null && !Number.isNaN(x)); return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null; };
const brief = o => ({
  pm: o.pitch.map(x => x ?? '—').join('/'), pmScored: o.pitch.filter(x => x != null).length, drillsHeard: o.drills.filter(x => x != null).length, drills: o.drills.map(x => x ?? '—').join('/'),
  rtfVoiced: o.rtf.voiced, rtfInTune: o.rtf.inTune, tunerVoiced: o.tuner.voiced, tunerInTune: o.tuner.inTune, skVoiced: o.stayKey.voiced, skInKey: o.stayKey.inKey,
  cwFrames: Math.round(100 * o.choir.reduce((s, c) => s + c.frames, 0) / Math.max(1, o.choir.reduce((s, c) => s + c.of, 0))), cwHeld: o.choir.filter(c => c.held).length,
});

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(STIM);
  log(`noisegate ${stamp}  sides: ${SIDES.join(', ')}${PROD ? '  url: ' + PROD : '  before: ' + (process.env.NG_BEFORE || 'HEAD')}  target MIDI ${TARGET}`);
  // NG_RESUME=<earlier .json of the same code>: keep its finished stimuli, run only the rest
  const rows = process.env.NG_RESUME ? JSON.parse(fs.readFileSync(process.env.NG_RESUME)).filter(r => only.includes(r.id) && SIDES.every(w => r.res[w])) : [];
  if (rows.length) { log(`resumed from ${process.env.NG_RESUME}: ${rows.map(r => r.id).join(', ')}`); fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1)); }
  for (const id of only) {
    if (rows.some(r => r.id === id)) continue;
    const file = path.join(DIR, id + '.wav'); if (!fs.existsSync(file)) throw new Error(`missing ${file}: run gatestim.py`);
    log(`\n== ${id} (${STIM[id]})`);
    const res = {};
    for (const which of SIDES) {
      res[which] = brief(await withPage(file, which, page => runAll(page, TARGET)));
      const b = res[which];
      log(`   ${which.padEnd(6)} Pitch Match ${b.pm} | Drills ${b.drills} | RTF heard ${b.rtfVoiced}% in tune ${b.rtfInTune}% | Tuner heard ${b.tunerVoiced}% in tune ${b.tunerInTune}% | Stay in Key heard ${b.skVoiced}% in key ${b.skInKey}% | Choir World heard ${b.cwFrames}% of frames, held ${b.cwHeld}/2`);
    }
    rows.push({ id, kind: STIM[id], res }); fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
  }
  const P = [], F = [], check = (ok, s) => (ok ? P : F).push(s), A = PROD ? 'prod' : 'after';
  const HEARD = ['rtfVoiced', 'tunerVoiced', 'skVoiced', 'cwFrames'], SCORE = ['rtfInTune', 'tunerInTune', 'skInKey'];
  for (const r of rows) {
    const a = r.res[A], b = r.res.before;
    if (r.kind === 'broadband') {
      for (const k of HEARD) check(a[k] <= 5, `${r.id} ${k}: ${b ? b[k] + '% → ' : ''}${a[k]}% (no pitch in it: heard on ≤5% of frames)`);
      check(a.pmScored === 0 && a.drillsHeard === 0 && a.cwHeld === 0, `${r.id} scores: Pitch Match ${a.pm}, Drills ${a.drills}, Choir held ${a.cwHeld}/2 (nothing may be scored or held)`);
    }
    if (b && r.kind !== 'soft') {
      for (const k of [...HEARD, ...SCORE]) check(a[k] <= b[k] + 5, `${r.id} ${k}: ${b[k]}% → ${a[k]}% (noise alone: holds or improves, ±5)`);
      check(a.cwHeld <= b.cwHeld, `${r.id} Choir World held: ${b.cwHeld} → ${a.cwHeld} (holds or improves)`);
    }
    if (r.kind === 'soft') {
      if (b) for (const k of HEARD) check(a[k] >= Math.round(0.95 * b[k]), `${r.id} ${k}: ${b[k]}% → ${a[k]}% (real singing: keeps ≥95% of what was heard)`);
      else for (const k of HEARD) log(`   note: ${r.id} ${k} ${a[k]}%`);
    }
  }
  log('\n==== Summary (A = ' + A + ')');
  for (const r of rows) log(`   ${r.id.padEnd(28)} ${SIDES.map(w => { const x = r.res[w]; return `${w}: PM ${x.pm} RTF ${x.rtfVoiced}% Tuner ${x.tunerVoiced}% SiK ${x.skVoiced}% CW ${x.cwFrames}% held ${x.cwHeld}/2`; }).join('  →  ')}`);
  log(`\n==== VERDICT: ${P.length} passed, ${F.length} failed`);
  F.forEach(s => log('FAIL ' + s)); P.forEach(s => log('pass ' + s));
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
  logf.end();
  process.exitCode = F.length ? 1 : 0;
})().catch(e => { log('ERROR ' + (e.stack || e)); logf.end(); process.exitCode = 2; });
