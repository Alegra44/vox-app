// Register Coach vibrato bias: is it the shared mic's processing? The same WAVs through getUserMedia with each
// processing setting (one browser per setting, so nothing is shared), scored with the app's own initAudio analyser,
// autoCorrelate() and getSpectralChestScore(), frame by frame for 3 s as updateRegisterUI does. Also reports what that
// setting delivered: harmonic levels (dB re the fundamental, averaged over frames) and the floor between harmonics.
// Usage: node scripts/vq-verify/rcmic.js
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const TMP = TESTDATA; fs.mkdirSync(TMP, { recursive: true });
const magRatio = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -s); w += k * v; a += v; } return w / a; };
const slopeFor = (ratio, K) => { let lo = 0.01, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (magRatio(m, K) > ratio) lo = m; else hi = m; } return (lo + hi) / 2; };
const SETTINGS = {
  'app (EC+NS, AGC default)': null, // initAudio's own getUserMedia call
  'all off': { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  'NS only': { echoCancellation: false, noiseSuppression: true, autoGainControl: false },
  'EC only': { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
  'AGC only': { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
};

async function measure(wav, audio) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
    const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
    return await p.evaluate(async audio => {
      if (audio) micStream = await navigator.mediaDevices.getUserMedia({ audio });
      await initAudio(); await new Promise(r => setTimeout(r, 2000));
      const st = micStream.getAudioTracks()[0].getSettings();
      const binHz = audioCtx.sampleRate / analyser.fftSize, spec = new Float32Array(analyser.frequencyBinCount);
      const scores = [], harm = [], floor = [], end = performance.now() + 3000;
      await new Promise(res => (function fr() {
        analyser.getFloatTimeDomainData(dataArray); const f = autoCorrelate(dataArray, audioCtx.sampleRate);
        if (f > 0) {
          const s = getSpectralChestScore(f); if (s !== null) scores.push(s);
          spec.set(freqDataArr); // the spectrum getSpectralChestScore just read
          const H = []; for (let k = 1; k * f < 6000; k++) { const c = Math.round(k * f / binHz); let m = -Infinity; for (let i = c - 2; i <= c + 2; i++) m = Math.max(m, spec[i]); H.push(m); }
          harm.push(H.map(v => v - H[0]));
          const between = []; for (let k = 1; (k + 1) * f < 6000; k++) between.push(spec[Math.round((k + 0.5) * f / binHz)]);
          floor.push(between.sort((a, b) => a - b)[between.length >> 1] - H[0]);
        }
        if (performance.now() < end) requestAnimationFrame(fr); else res();
      })());
      const sorted = [...scores].sort((a, b) => a - b), n = Math.min(...harm.map(h => h.length));
      return {
        settings: { ec: st.echoCancellation, ns: st.noiseSuppression, agc: st.autoGainControl },
        med: sorted[sorted.length >> 1], push: Math.round(100 * scores.filter(s => s >= 62).length / scores.length), frames: scores.length,
        harm: [...Array(Math.min(n, 12)).keys()].map(k => harm.reduce((a, h) => a + h[k], 0) / harm.length),
        floor: floor.reduce((a, v) => a + v, 0) / floor.length,
      };
    }, audio);
  } finally { await b.close(); }
}

(async () => {
  const f0 = 330, K = Math.floor(6000 / f0);
  for (const target of [35, 50]) {
    const s = slopeFor(1.5 + target / 100 * 4, K), H = [...Array(K).keys()].map(k => Math.pow(k + 1, -s));
    console.log(`\n==== ${f0} Hz, ${(6.02 * s).toFixed(1)} dB/oct (clean-spectrum score ${target}); injected harmonic levels dB re H1: ${H.slice(0, 12).map(a => (20 * Math.log10(a)).toFixed(0)).join(' ')}`);
    for (const d of [0, 25, 50, 100]) {
      const wav = path.join(TMP, 'rcmic.wav');
      execFileSync('python', [path.join(__dirname, 'gen.py'), wav, JSON.stringify({ f0, harmonics: H, ...(d ? { vibRate: 6, vibCents: d } : {}) })]);
      console.log(`-- ${d ? '±' + d + ' ct' : 'straight'}`);
      for (const [name, audio] of Object.entries(SETTINGS)) {
        const r = await measure(wav, audio);
        console.log(`   ${name.padEnd(25)} got ${JSON.stringify(r.settings)} | score median ${r.med.toFixed(1).padStart(5)} [≥62 ${String(r.push).padStart(3)}%] (${r.frames} fr) | harmonics dB re H1: ${r.harm.map(v => v.toFixed(0)).join(' ')} | floor between harmonics ${r.floor.toFixed(0)} dB`);
      }
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
