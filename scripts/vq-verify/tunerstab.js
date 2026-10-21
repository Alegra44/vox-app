// feat/single-stream 1.4: the Tuner's stability, master vs this branch, on vibfix's stimuli ($VOXCOACH_TESTDATA/vibfix).
// Per stimulus and side, TS_RUNS runs (default 2): the Tuner's real mic button, then every frame's frequency as
// updateTunerUI receives it (the vibrato centre when the gate holds one; wrapped: time and frequency) over TS_MS
// (default 40 s, a whole loop). The page's own sessionStabilityReadings come back too. What the stability feeds is then
// checked on both sides:
//   - the reading itself: its mean (the session average the Tuner shows and records as the day's "stability"), and the
//     share of readings ≥ 75 (the band vibfix reports);
//   - checkVocalHealthSignal's within-session drop (first half's mean − second half's, warns at ≥ 12): on each stimulus
//     alone (a steady session must not warn), and on pairs played one after the other, a steady note then a wobbly
//     one (S1 → N1 / W3 / W4, S2 → N2 / N4: should warn as on master) and the reverse (must not);
//   - the Voice Health trend (recent 3 days − prior 3 days, warns below −10) gets the session averages, so a shift of
//     the averages is what it sees: reported as the mean shift per kind of note.
// Usage: node scripts/vq-verify/tunerstab.js [V1,S1,...]   (TS_BEFORE=master by default; TS_RESUME=<json> keeps finished stimuli)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { TESTDATA } = require('../testdata');
const ROOT = path.join(__dirname, '../..'), DIR = path.join(TESTDATA, 'vibfix');
const BEFORE_REF = process.env.TS_BEFORE || 'master', RUNS = +(process.env.TS_RUNS || 2), MS = +(process.env.TS_MS || 40000);
const IDS = (process.argv[2] || 'V1,V2,V3,V4,V5,V6,S1,S2,W1,W5,W2,W3,W4,N1,N2,N3,N4').split(',');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `tunerstab-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cache = {}, show = p => cache[p] || (cache[p] = execFileSync('git', ['show', `${BEFORE_REF}:deploy/${p}`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const SRC = { before: p => show(p), after: p => fs.readFileSync(path.join(ROOT, 'deploy', p)) };

async function capture(file, side) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
    await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1) || 'index.html';
      if (!/^[\w.-]+\.(html|js)$/.test(p)) return r.fulfill({ status: 404, body: '' });
      return r.fulfill({ body: SRC[side](p), contentType: p.endsWith('.js') ? 'application/javascript' : 'text/html' });
    });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
    await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    await page.evaluate(async () => { // the file-backed fake mic is silent for its first ~1–2 s
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close();
    });
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    const r = await page.evaluate(async MS => {
      requireProFeature = () => true; blockExercise = () => false;
      checkVocalHealthSignal = () => {}; // replayed offline on the readings; the banner would only stop later checks
      const frames = []; let rec = false;
      const orig = updateTunerUI;
      updateTunerUI = f => { if (rec) frames.push([+performance.now().toFixed(1), f > 0 ? +f.toFixed(3) : -1]); return orig(f); };
      document.getElementById('micBtn').click();
      await new Promise(r => setTimeout(r, 1000));
      sessionStabilityReadings = []; rec = true;
      await new Promise(r => setTimeout(r, MS));
      rec = false;
      const readings = sessionStabilityReadings.map(x => +x.toFixed(2));
      document.getElementById('micBtn').click();
      updateTunerUI = orig;
      return { frames, readings };
    }, MS);
    return { ...r, errors };
  } finally { await b.close().catch(() => {}); }
}

(async () => {
  log(`tunerstab ${stamp}  before: ${BEFORE_REF}  after: working tree  ${RUNS} runs per side, ${MS / 1000} s each  stimuli ${IDS.join(',')}`);
  const out = process.env.TS_RESUME ? JSON.parse(fs.readFileSync(process.env.TS_RESUME)).filter(r => IDS.includes(r.id)) : [];
  if (out.length) log(`resumed from ${process.env.TS_RESUME}: ${out.map(r => r.id).join(', ')}`);
  for (const id of IDS) {
    if (out.some(r => r.id === id)) continue;
    const file = path.join(DIR, `stim-${id}.wav`);
    if (!fs.existsSync(file)) { log(`${id}: ${file} missing (run vibfix.js once to build it)`); continue; }
    const row = { id, runs: { before: [], after: [] } };
    for (let k = 0; k < RUNS; k++) for (const side of ['before', 'after']) {
      const r = await capture(file, side);
      row.runs[side].push(r);
      const m = r.readings.length ? Math.round(r.readings.reduce((a, b) => a + b, 0) / r.readings.length) : null;
      log(`${id.padEnd(3)} ${side.padEnd(6)} #${k + 1} stability mean ${m} over ${r.readings.length} readings · ${r.frames.length} frames${r.errors.length ? ' · ERRORS ' + r.errors.join(' | ') : ''}`);
    }
    out.push(row);
    fs.writeFileSync(LOG + '.json', JSON.stringify(out));
  }
  log(`log: ${LOG}.log  json: ${LOG}.json`);
})();
