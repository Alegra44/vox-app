// Pitch Match: which frames a take scores, before (deploy/index.html at PF_BEFORE, default master) and after (the working
// tree), on one vibfix stimulus. Same sequence as vibfix.js (two Intermediate takes, then two Professional, each held to
// 8 s), with captureAccuracyForTarget's scored frames read through vibratoTolerantCents (its input: {t, c} per frame with a
// pitch; its output: the cents that are scored) and every autoCorrelate frame of the take logged with its time since the
// click. Per take: count, mean cents, mean |cents|, frames in the first 400 ms of the scored stretch, the score the page
// showed, and 100 − mean|c| × multiplier recomputed from the logged frames.
// Usage: node scripts/vq-verify/pmframes.js [stimulus id, default W2] [target midi, default from rv.json]
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup');
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), TMP = path.join(TESTDATA, 'vibfix');
const LOGDIR = path.join(__dirname, 'logs'), stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG = path.join(LOGDIR, `pmframes-local-${stamp}`), logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REF = process.env.PF_BEFORE || 'master', id = process.argv[2] || 'W2';
const STIM = path.join(TMP, `stim-${id}.wav`);
if (!fs.existsSync(STIM)) throw new Error(`${STIM} missing: run vibfix.js ${id} once first`);
const target = +(process.argv[3] || 69);
const BEFORE = path.join(TMP, 'index-pmframes-before.html');
fs.writeFileSync(BEFORE, execFileSync('git', ['show', `${REF}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const HTML = { before: BEFORE, after: path.join(ROOT, 'deploy/index.html') };
const MULT = { intermediate: 0.6, professional: 0.9 };

async function side(which) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${STIM}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
    await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1);
      if (!p || p === 'index.html') return r.fulfill({ path: HTML[which], contentType: 'text/html' });
      if (!/^[\w.-]+\.js$/.test(p)) return r.fulfill({ status: 404, body: '' });
      const body = which === 'before' ? execFileSync('git', ['show', `${REF}:deploy/${p}`], { cwd: ROOT }) : fs.readFileSync(path.join(ROOT, 'deploy', p));
      return r.fulfill({ body, contentType: 'application/javascript' });
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    await page.evaluate(async () => { // warm the file-backed fake mic, as vibfix.js does
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close();
    });
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    await page.evaluate(() => {
      requireProFeature = () => true; blockExercise = () => false;
      window.__vt = []; window.__ac = null;
      const vt = vibratoTolerantCents; vibratoTolerantCents = s => { const out = vt(s); __vt.push({ in: s.map(x => ({ t: x.t, c: x.c })), out: [...out] }); return out; };
      const ac = autoCorrelate; autoCorrelate = (buf, sr) => { const f = ac(buf, sr); if (__ac) __ac.push({ t: performance.now() - __ac.t0, f }); return f; };
    });
    const takes = [];
    for (const level of ['intermediate', 'professional']) for (let k = 0; k < 2; k++) takes.push(await page.evaluate(async ({ level, target }) => {
      setExerciseLevel(level); pitchTargetMidi = target; __vt.length = 0;
      const btn = document.getElementById('pitchListenBtn'); __ac = []; __ac.t0 = performance.now(); btn.click();
      await new Promise(r => setTimeout(r, 100));
      const t0 = performance.now(); while (btn.disabled && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
      const shown = parseInt(document.getElementById('pitchAccuracyVal').textContent, 10);
      while (performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
      const frames = __ac.map(x => ({ t: Math.round(x.t), c: x.f > 0 ? Math.round(1200 * Math.log2(x.f / (440 * Math.pow(2, (target - 69) / 12))) * 10) / 10 : null })); __ac = null;
      return { level, shown, scored: __vt[0] || null, frames };
    }, { level, target }));
    return takes;
  } finally { await b.close().catch(() => {}); }
}

const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
(async () => {
  log(`pmframes ${stamp}  stimulus ${id} (${STIM}), target ${target}, before: ${REF}, after: working tree`);
  log('A steady 40 ct error under Professional: 100 − 40 × 0.9 = 64; under Intermediate: 100 − 40 × 0.6 = 76');
  const out = {};
  for (const which of ['before', 'after']) {
    out[which] = await side(which);
    log(`\n== ${which}`);
    for (const tk of out[which]) {
      const s = tk.scored; if (!s) { log(`   ${tk.level.padEnd(12)} shown ${tk.shown}: no frames scored`); continue; }
      const t0 = s.in[0].t, first = s.in.filter(x => x.t - t0 < 400).length;
      const recomputed = Math.max(0, Math.round(100 - mean(s.out.map(Math.abs)) * MULT[tk.level]));
      const moved = s.in.filter((x, i) => Math.abs(x.c - s.out[i]) > 0.05).length;
      // where the scored stretch sits in the take (ms since the click), and the cents of every pitched frame of the take
      const clickToFirst = tk.frames.find(f => f.c !== null)?.t, span = [Math.round(s.in[0].t), Math.round(s.in[s.in.length - 1].t)];
      log(`   ${tk.level.padEnd(12)} shown ${tk.shown} · recomputed ${recomputed} · ${s.in.length} frames scored, t ${span[0]}–${span[1]} ms (page's own clock: since the click before, since the first voiced frame after)` +
        ` · first 400 ms of the scored stretch: ${first} frames, mean |c| ${mean(s.out.slice(0, first).map(Math.abs)).toFixed(1)}` +
        ` · mean c ${mean(s.out).toFixed(1)}, mean |c| ${mean(s.out.map(Math.abs)).toFixed(1)}, min ${Math.min(...s.out).toFixed(1)}, max ${Math.max(...s.out).toFixed(1)}` +
        ` · vibratoTolerantCents changed ${moved} · first pitched frame ${clickToFirst} ms after the click`);
      // the take's pitched frames in 250 ms bins (mean cents), to see what part of the stimulus each side scored
      const bins = {}; for (const f of tk.frames) if (f.c !== null) (bins[Math.floor(f.t / 250)] = bins[Math.floor(f.t / 250)] || []).push(f.c);
      log(`      take, mean c per 250 ms since the click: ${Object.entries(bins).filter(([k]) => k < 20).map(([k, v]) => `${k * 250}:${mean(v).toFixed(0)}`).join(' ')}`);
    }
  }
  fs.writeFileSync(LOG + '.json', JSON.stringify(out));
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`); logf.end();
})().catch(e => { log('ERROR ' + (e.stack || e)); logf.end(); process.exitCode = 2; });
