// feat/single-stream 1.3: Real-Time Feedback's "Steady" row frame by frame, master vs this branch, on vibfix's stimuli
// (built by vibfix.js in $VOXCOACH_TESTDATA/vibfix). Per stimulus and side, RFS_RUNS runs (default 3): the page opens
// the shared mic first (initAudio, as Pitch Match and Drills do before RTF in vibfix: on master RTF's register input
// is then a second capture), then RTF's real Start button; after a 1 s settle, for 6 s (vibfix's window), every frame RTF
// reads (readRegisterFrame, wrapped: time and pitch) and the Stability row's state every 50 ms. RFS_MS=40000 records a
// whole loop of the stimulus instead (no dependence on where in the loop the window falls). RFS_RESUME=<json> keeps the
// stimuli a stopped run finished.
// The frames are what an offline replay of a Steady criterion needs (scripts/vq-verify/rtfsteady-eval.js).
// Usage: node scripts/vq-verify/rtfsteady.js [V1,S1,N2,...]   (RFS_BEFORE=master by default)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { TESTDATA } = require('../testdata');
const ROOT = path.join(__dirname, '../..'), DIR = path.join(TESTDATA, 'vibfix');
const BEFORE_REF = process.env.RFS_BEFORE || 'master', RUNS = +(process.env.RFS_RUNS || 3), MS = +(process.env.RFS_MS || 6000);
const IDS = (process.argv[2] || 'V1,V2,V3,V4,V5,V6,S1,S2,W1,W5,W2,W3,W4,N1,N2,N3,N4').split(',');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `rtfsteady-${stamp}`);
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
    // the file-backed fake mic is silent for its first ~1–2 s: warm it on a throwaway stream (as vibfix does)
    await page.evaluate(async () => {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close();
    });
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    const r = await page.evaluate(async MS => {
      requireProFeature = () => true; blockExercise = () => false;
      await initAudio({ noWarmup: true });
      const frames = []; let rec = false;
      const orig = readRegisterFrame;
      readRegisterFrame = () => { const fr = orig(); if (rec) frames.push([+performance.now().toFixed(1), fr.freq > 0 ? +fr.freq.toFixed(3) : -1]); return fr; };
      document.getElementById('liveFeedbackStartBtn').click();
      await new Promise(r => setTimeout(r, 1000));
      rec = true;
      const stab = [], pitch = [], t0 = performance.now();
      while (performance.now() - t0 < MS) {
        stab.push(document.getElementById('lfStabilityIcon').dataset.state); pitch.push(document.getElementById('lfPitchIcon').dataset.state);
        await new Promise(r => setTimeout(r, 50));
      }
      rec = false;
      document.getElementById('liveFeedbackStartBtn').click();
      readRegisterFrame = orig;
      const voiced = pitch.map(x => x !== 'neutral'), nv = voiced.filter(Boolean).length;
      return { frames, steady: nv ? Math.round(100 * stab.filter((x, i) => voiced[i] && x === 'good').length / nv) : null, voiced: nv, n: pitch.length };
    }, MS);
    return { ...r, errors };
  } finally { await b.close().catch(() => {}); }
}

(async () => {
  log(`rtfsteady ${stamp}  before: ${BEFORE_REF}  after: working tree  ${RUNS} runs per side, ${MS / 1000} s each  stimuli ${IDS.join(',')}`);
  const out = process.env.RFS_RESUME ? JSON.parse(fs.readFileSync(process.env.RFS_RESUME)).filter(r => IDS.includes(r.id)) : [];
  if (out.length) log(`resumed from ${process.env.RFS_RESUME}: ${out.map(r => r.id).join(', ')}`);
  for (const id of IDS) {
    if (out.some(r => r.id === id)) continue;
    const file = path.join(DIR, `stim-${id}.wav`);
    if (!fs.existsSync(file)) { log(`${id}: ${file} missing (run vibfix.js once to build it)`); continue; }
    const row = { id, runs: { before: [], after: [] } };
    for (let k = 0; k < RUNS; k++) for (const side of ['before', 'after']) {
      const r = await capture(file, side);
      row.runs[side].push(r);
      log(`${id.padEnd(3)} ${side.padEnd(6)} #${k + 1} Steady ${r.steady}% of ${r.voiced}/${r.n} voiced · ${r.frames.length} frames${r.errors.length ? ' · ERRORS ' + r.errors.join(' | ') : ''}`);
    }
    out.push(row);
    fs.writeFileSync(LOG + '.json', JSON.stringify(out));
  }
  log(`log: ${LOG}.log  json: ${LOG}.json`);
})();
