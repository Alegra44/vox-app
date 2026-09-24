// Spectral centroid with and without vibrato on the same tone: the panel's value (power-weighted since 2026-09-24),
// and the old magnitude-weighted one computed from the same spectra for comparison.
const { chromium } = require('playwright'); const path = require('path'), os = require('os'); const { execFileSync } = require('child_process');
(async () => {
  for (const [label, spec] of [['no vibrato', {}], ['6 Hz ±25 ct', { vibRate: 6, vibCents: 25 }], ['6 Hz ±50 ct', { vibRate: 6, vibCents: 50 }], ['6 Hz ±100 ct', { vibRate: 6, vibCents: 100 }]]) {
    const f = path.join(os.tmpdir(), 'vq-verify', 'cv.wav');
    execFileSync('python', [path.join(__dirname, 'gen.py'), f, JSON.stringify({ f0: 330, harmonics: [1, 0.5, 0.33, 0.25], ...spec })]);
    const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${f}`] });
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
    const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
    const r = await p.evaluate(async () => {
      // power-weighted centroid on the same frames: wrap vqCentroid to also compute it
      const pw = [], orig = vqCentroid;
      vqCentroid = (db, binHz) => { let w = 0, s = 0; const lo = Math.ceil(50 / binHz), hi = Math.floor(6000 / binHz); let pk = -Infinity; for (let i = lo; i <= hi; i++) pk = Math.max(pk, db[i]); for (let i = lo; i <= hi; i++) { if (!(db[i] >= pk - 60)) continue; const q = Math.pow(10, db[i] / 20); w += i * binHz * q; s += q; } pw.push(w / s); return orig(db, binHz); };
      vqActive = true; const fr = await vqCapture(); vqActive = false; vqCentroid = orig;
      return { pow: vqSummarize(fr).centroid, mag: vqMedian(pw) };
    });
    console.log(`${label.padEnd(14)} panel (power-weighted) ${r.pow.toFixed(0)} Hz | old magnitude-weighted ${r.mag.toFixed(0)} Hz`);
    await b.close();
  }
  // expected: magnitude Σf·a/Σa = 633 Hz; power Σf·a²/Σa² for a = 1, .5, .33, .25 at 330·k
  const a = [1, 0.5, 0.33, 0.25]; console.log('expected (clean spectrum): magnitude', (a.reduce((s, v, k) => s + 330 * (k + 1) * v, 0) / a.reduce((s, v) => s + v, 0)).toFixed(0), '| power', (a.reduce((s, v, k) => s + 330 * (k + 1) * v * v, 0) / a.reduce((s, v) => s + v * v, 0)).toFixed(0));
})();
