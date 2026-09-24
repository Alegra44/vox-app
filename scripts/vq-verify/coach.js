// The Vibrato Analyzer panel's own capture (shared, noise-suppressed mic) vs the Voice Quality capture (unprocessed mic),
// on the same WAV: raw per-cycle swing before the window correction, and the trace's frame-to-frame jitter.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const wav = path.resolve(process.argv[2]);
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  const ctx = await b.newContext({ permissions: ['microphone'] });
  await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
  const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
  for (let i = 0; i < 2; i++) console.log(JSON.stringify(await p.evaluate(async () => {
    const jit = s => { const d = s.slice(2).map((x, i) => x.midi - 2 * s[i + 1].midi + s[i].midi); return +(Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length) * 100).toFixed(2); };
    const c = await captureVibratoTrace(4000);
    vqActive = true; const fr = await vqCapture(); vqActive = false; const v = fr.map(f => ({ t: f.t, midi: f.midi }));
    const a0 = analyzeVibrato(c, analyser.fftSize / audioCtx.sampleRate), a1 = analyzeVibrato(v, 2048 / audioCtx.sampleRate), raw = analyzeVibrato(c, 0);
    return { coach: `${a0.rate} Hz ±${a0.depth} (uncorrected ±${raw.depth}) jitter ${jit(c)} ct, ${c.length} frames`, vq: `${a1.rate} Hz ±${a1.depth} jitter ${jit(v)} ct, ${v.length} frames` };
  })));
  await b.close();
})();
