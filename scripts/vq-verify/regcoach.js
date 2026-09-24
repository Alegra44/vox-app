// Register Coach: does vibrato move its magnitude-weighted chest score enough to change what it decides?
// Its own path: initAudio (the shared, noise-suppressed mic; 2048-point analyser, default 0.8 smoothing) and
// getSpectralChestScore(freq) sampled every frame for 3 s, as its UI loop does. Tones above the passaggio (330 and
// 440 Hz) with a harmonic roll-off chosen so the straight tone's score lands near each decision line (35 mixed/head,
// 50 Bridge lane, 62 "pushing chest") and one clearly above; each played straight and with 6 Hz ±25/±50/±100 ct.
// Usage: node scripts/vq-verify/regcoach.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const magRatio = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -s); w += k * v; a += v; } return w / a; };
const slopeFor = (ratio, K) => { let lo = 0.01, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (magRatio(m, K) > ratio) lo = m; else hi = m; } return (lo + hi) / 2; };
const scoreOf = r => Math.max(0, Math.min(100, (r - 1.5) / 4 * 100));

async function measure(wav) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
    const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
    return await p.evaluate(async () => {
      await initAudio(); await new Promise(r => setTimeout(r, 2000));
      const scores = [], end = performance.now() + 3000;
      await new Promise(res => (function fr() {
        analyser.getFloatTimeDomainData(dataArray); const freq = autoCorrelate(dataArray, audioCtx.sampleRate);
        if (freq > 0) { const s = getSpectralChestScore(freq); if (s !== null) scores.push(s); }
        if (performance.now() < end) requestAnimationFrame(fr); else res();
      })());
      scores.sort((a, b) => a - b);
      const q = x => scores[Math.min(scores.length - 1, Math.floor(x * scores.length))];
      const frac = f => Math.round(100 * scores.filter(f).length / scores.length);
      return { n: scores.length, med: q(0.5), p10: q(0.1), p90: q(0.9), push: frac(s => s >= 62), mixed: frac(s => s >= 35 && s < 62), head: frac(s => s < 35), chestLane: frac(s => s >= 50) };
    });
  } finally { await b.close(); }
}

(async () => {
  for (const f0 of [330, 440]) {
    const K = Math.floor(6000 / f0);
    for (const target of [35, 50, 62, 80]) {
      const s = slopeFor(1.5 + target / 100 * 4, K), H = [...Array(K).keys()].map(k => Math.pow(k + 1, -s));
      console.log(`\n${f0} Hz, roll-off ${(6.02 * s).toFixed(1)} dB/oct (clean-spectrum score ${scoreOf(magRatio(s, K)).toFixed(0)})`);
      for (const d of [0, 25, 50, 100]) {
        const wav = path.join(TMP, 'reg.wav');
        execFileSync('python', [path.join(__dirname, 'gen.py'), wav, JSON.stringify({ f0, harmonics: H, ...(d ? { vibRate: 6, vibCents: d } : {}) })]);
        const r = await measure(wav);
        console.log(`  ${(d ? '±' + d + ' ct' : 'straight').padEnd(8)} score median ${r.med.toFixed(1).padStart(5)} (p10–p90 ${r.p10.toFixed(0)}–${r.p90.toFixed(0)}) | frames: pushing ${r.push}% · mixed ${r.mixed}% · head ${r.head}% | Bridge chest lane ${r.chestLane}%  [${r.n} frames]`);
      }
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
