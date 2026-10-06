// Register Coach: the proposed fix, tested in the browser before any app change (test-only; the app is untouched).
// In one page: the app's shared mic (initAudio: echo cancellation + noise suppression) keeps the pitch, and a second,
// unprocessed stream from the same device feeds a spectrum-only analyser (2048 points, default smoothing, as today).
// Checks both tracks keep their own processing settings, then scores each frame three ways:
//   today     getSpectralChestScore(f)                       (processed spectrum, magnitude-weighted)
//   raw mag   today's formula on the unprocessed spectrum
//   pow s0.8  power-weighted centroid on the unprocessed spectrum from an analyser with the default 0.8 smoothing
//             (which averages magnitude), turned into the score through the equivalent magnitude ratio (so a straight
//             harmonic tone keeps today's score exactly)
//   proposed  the same from an unsmoothed analyser, with the smoothing done on power per bin (same 0.8 per frame)
// Usage: node scripts/vq-verify/rcfix.js
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const TMP = TESTDATA; fs.mkdirSync(TMP, { recursive: true });
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
      const raw = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const spec = audioCtx.createAnalyser(); spec.fftSize = analyser.fftSize;
      const spec0 = audioCtx.createAnalyser(); spec0.fftSize = analyser.fftSize; spec0.smoothingTimeConstant = 0;
      const rawSrc = audioCtx.createMediaStreamSource(raw); rawSrc.connect(spec); rawSrc.connect(spec0);
      await new Promise(r => setTimeout(r, 2000));
      const S = t => (({ echoCancellation: ec, noiseSuppression: ns, autoGainControl: agc }) => ({ ec, ns, agc }))(t.getAudioTracks()[0].getSettings());
      const binHz = audioCtx.sampleRate / spec.fftSize, buf = new Float32Array(spec.frequencyBinCount), buf0 = new Float32Array(spec.frequencyBinCount), pw = new Float64Array(spec.frequencyBinCount);
      let pwInit = false;
      const cent = pow => { let w = 0, s = 0; const hi = Math.min(buf.length, Math.floor(6000 / binHz)); for (let i = 1; i < hi; i++) { const m = Math.pow(10, buf[i] / (pow ? 10 : 20)); w += i * binHz * m; s += m; } return w / s; };
      const mr = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -s); w += k * v; a += v; } return w / a; };
      const equivMag = (pr, K) => { let lo = 0.01, hi = 6; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (mr(2 * m, K) > pr) lo = m; else hi = m; } return mr((lo + hi) / 2, K); };
      const score = r => Math.max(0, Math.min(100, (r - 1.5) / 4 * 100));
      const out = { today: [], rawmag: [], pow08: [], proposed: [] }, end = performance.now() + 3000;
      await new Promise(res => (function fr() {
        analyser.getFloatTimeDomainData(dataArray); const f = autoCorrelate(dataArray, audioCtx.sampleRate);
        if (f > 0) {
          out.today.push(getSpectralChestScore(f));
          spec.getFloatFrequencyData(buf);
          out.rawmag.push(score(cent(false) / f));
          const K = Math.max(1, Math.floor(6000 / f));
          out.pow08.push(score(equivMag(cent(true) / f, K)));
          spec0.getFloatFrequencyData(buf0);
          for (let i = 0; i < pw.length; i++) { const v = Math.pow(10, buf0[i] / 10); pw[i] = pwInit ? 0.8 * pw[i] + 0.2 * v : v; } pwInit = true;
          let w = 0, sm = 0; const hi = Math.min(pw.length, Math.floor(6000 / binHz)); for (let i = 1; i < hi; i++) { w += i * binHz * pw[i]; sm += pw[i]; }
          out.proposed.push(score(equivMag(w / sm / f, K)));
        }
        if (performance.now() < end) requestAnimationFrame(fr); else res();
      })());
      const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
      const push = a => Math.round(100 * a.filter(v => v >= 62).length / a.length);
      return { shared: S(micStream), raw: S(raw), frames: out.today.length, ...Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { med: med(v), push: push(v) }])) };
    });
  } finally { await b.close(); }
}

(async () => {
  for (const [f0, target] of [[330, 35], [330, 50], [330, 62], [440, 35]]) {
    const K = Math.floor(6000 / f0), s = slopeFor(1.5 + target / 100 * 4, K), H = [...Array(K).keys()].map(k => Math.pow(k + 1, -s));
    console.log(`\n${f0} Hz, ${(6.02 * s).toFixed(1)} dB/oct (clean-spectrum score ${target})     median score [% frames ≥ 62]`);
    for (const d of [0, 25, 50, 100]) {
      const wav = path.join(TMP, 'rcfix.wav');
      execFileSync('python', [path.join(__dirname, 'gen.py'), wav, JSON.stringify({ f0, harmonics: H, ...(d ? { vibRate: 6, vibCents: d } : {}) })]);
      const r = await measure(wav), c = x => `${x.med.toFixed(1).padStart(5)} [${String(x.push).padStart(3)}%]`;
      console.log(`  ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)} today ${c(r.today)} | raw mag ${c(r.rawmag)} | pow s0.8 ${c(r.pow08)} | proposed ${c(r.proposed)}   (${r.frames} fr; shared mic ${JSON.stringify(r.shared)}, second ${JSON.stringify(r.raw)})`);
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
