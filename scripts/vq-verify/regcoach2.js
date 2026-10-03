// Register Coach vibrato bias: which part causes it, and would a power-weighted centroid fix it? Test-only: the app is
// not changed. On the same frames from the shared mic, four chest scores:
//   now       getSpectralChestScore (magnitude-weighted, the analyser's 0.8 smoothing)
//   mag s0    magnitude-weighted, a second analyser with no smoothing
//   pow s0.8  power-weighted on the smoothed spectrum, converted to the score through the "equivalent magnitude ratio":
//             the slope s whose clean harmonic spectrum (a_k = k^-s up to 6 kHz) gives this power centroid, then that
//             spectrum's magnitude ratio, so straight tones keep exactly today's score
//   pow s0    the same with no smoothing
// Usage: node scripts/vq-verify/regcoach2.js
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os');
const TMP = path.join(os.tmpdir(), 'vq-verify');
const magRatio = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -s); w += k * v; a += v; } return w / a; };
const slopeFor = (ratio, K) => { let lo = 0.01, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (magRatio(m, K) > ratio) lo = m; else hi = m; } return (lo + hi) / 2; };

async function measure(wav) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
    const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
    return await p.evaluate(async () => {
      await initAudio();
      const raw = audioCtx.createAnalyser(); raw.fftSize = analyser.fftSize; raw.smoothingTimeConstant = 0;
      audioCtx.createMediaStreamSource(micStream).connect(raw);
      await new Promise(r => setTimeout(r, 2000));
      const binHz = audioCtx.sampleRate / analyser.fftSize, buf = new Float32Array(analyser.frequencyBinCount), buf0 = new Float32Array(raw.frequencyBinCount);
      const cent = (db, pow) => { let w = 0, s = 0; const hi = Math.min(db.length, Math.floor(6000 / binHz)); for (let i = 1; i < hi; i++) { const m = Math.pow(10, db[i] / (pow ? 10 : 20)); w += i * binHz * m; s += m; } return w / s; };
      const powRatio = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -2 * s); w += k * v; a += v; } return w / a; };
      const magR = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -s); w += k * v; a += v; } return w / a; };
      const equivMag = (pr, K) => { let lo = 0.01, hi = 6; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (powRatio(m, K) > pr) lo = m; else hi = m; } return magR((lo + hi) / 2, K); };
      const score = r => Math.max(0, Math.min(100, (r - 1.5) / 4 * 100));
      const out = { now: [], mag0: [], pow: [], pow0: [] }, end = performance.now() + 3000;
      await new Promise(res => (function fr() {
        analyser.getFloatTimeDomainData(dataArray); const f = autoCorrelate(dataArray, audioCtx.sampleRate);
        if (f > 0) {
          const K = Math.max(1, Math.floor(6000 / f));
          out.now.push(getSpectralChestScore(f));
          analyser.getFloatFrequencyData(buf); raw.getFloatFrequencyData(buf0);
          out.mag0.push(score(cent(buf0, false) / f));
          out.pow.push(score(equivMag(cent(buf, true) / f, K)));
          out.pow0.push(score(equivMag(cent(buf0, true) / f, K)));
        }
        if (performance.now() < end) requestAnimationFrame(fr); else res();
      })());
      const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
      const push = a => Math.round(100 * a.filter(v => v >= 62).length / a.length);
      return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { med: med(v), push: push(v) }]));
    });
  } finally { await b.close(); }
}

(async () => {
  for (const [f0, target] of [[330, 35], [330, 50], [330, 62], [440, 35], [440, 62]]) {
    const K = Math.floor(6000 / f0), s = slopeFor(1.5 + target / 100 * 4, K), H = [...Array(K).keys()].map(k => Math.pow(k + 1, -s));
    console.log(`\n${f0} Hz, ${(6.02 * s).toFixed(1)} dB/oct (clean-spectrum score ${target})      median score [% frames ≥ 62 "pushing chest"]`);
    for (const d of [0, 25, 50, 100]) {
      const wav = path.join(TMP, 'reg2.wav');
      execFileSync('python', [path.join(__dirname, 'gen.py'), wav, JSON.stringify({ f0, harmonics: H, ...(d ? { vibRate: 6, vibCents: d } : {}) })]);
      const r = await measure(wav), c = x => `${x.med.toFixed(1).padStart(5)} [${String(x.push).padStart(3)}%]`;
      console.log(`  ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)}  now ${c(r.now)} | mag s0 ${c(r.mag0)} | pow s0.8 ${c(r.pow)} | pow s0 ${c(r.pow0)}`);
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
