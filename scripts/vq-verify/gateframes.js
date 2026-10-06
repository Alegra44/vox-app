// "Is someone singing" scope: per-frame features on the app's own mic path (initAudio → analyser → autoCorrelate, or
// openRegisterInput → readRegisterFrame) for each WAV in $VOXCOACH_TESTDATA (~/VoxCoachTestData)/gate. Scope only; the app is unchanged.
// Usage: node gate.js [filter substring] [paths: shared,register]
const { chromium } = require('C:/Users/Alegra Kunda/OneDrive/Documents/voxcoach-app/node_modules/playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
const path = require('path'), fs = require('fs'), os = require('os');
const ROOT = 'C:/Users/Alegra Kunda/OneDrive/Documents/voxcoach-app', DIR = path.join(TESTDATA, 'gate');
const OUT = path.join(DIR, 'frames.json'), res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : {};
const filt = process.argv[2] || '', paths = (process.argv[3] || 'shared').split(',');
async function run(wav, pth) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: process.env.GATE_HTML || ROOT + '/deploy/index.html', contentType: 'text/html' }));
    const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
    return await p.evaluate(async (pth) => {
      let get;
      if (pth === 'shared') { await initAudio(); get = () => { analyser.getFloatTimeDomainData(dataArray); return { buf: dataArray, f: autoCorrelate(dataArray, audioCtx.sampleRate) }; }; }
      else { await openRegisterInput(); get = () => { const r = readRegisterFrame(); return { buf: regIn && regIn.time ? regIn.time : null, f: r.freq }; }; }
      const sr = audioCtx.sampleRate;
      const feat = (x, f) => {
        const N = x.length; let e = 0; for (let i = 0; i < N; i++) e += x[i] * x[i]; const rms = Math.sqrt(e / N);
        const nsdf = tau => { let ac = 0, m = 0; for (let j = 0; j + tau < N; j++) { ac += x[j] * x[j + tau]; m += x[j] * x[j] + x[j + tau] * x[j + tau]; } return m > 0 ? 2 * ac / m : 0; };
        const clar = f > 0 ? nsdf(Math.round(sr / f)) : null;
        let peak = 0; for (let tau = Math.floor(sr / 1100); tau <= Math.min(N / 2, Math.ceil(sr / 70)); tau += 2) { const v = nsdf(tau); if (v > peak) peak = v; }
        return { rms: +rms.toFixed(5), clar: clar === null ? null : +clar.toFixed(3), peak: +peak.toFixed(3) };
      };
      const loop = dur => new Promise(res => { const out = [], s = performance.now(); (function fr() { const g = get(), t = performance.now() - s; if (g.buf) out.push({ t: Math.round(t), f: g.f > 0 ? +g.f.toFixed(2) : -1, ...feat(g.buf, g.f) }); if (t < dur) requestAnimationFrame(fr); else res(out); })(); });
      await loop(3000); return loop(12000);
    }, pth);
  } finally { await b.close().catch(() => {}); }
}
(async () => {
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.wav') && !f.startsWith('raw-') && f.includes(filt))) for (const pth of paths) {
    const key = `${f.replace('.wav', '')}|${pth}`; if (res[key]) continue;
    res[key] = await run(path.join(DIR, f), pth); fs.writeFileSync(OUT, JSON.stringify(res));
    const fr = res[key]; console.log(key, 'frames', fr.length, 'voiced now', Math.round(100 * fr.filter(x => x.f > 0).length / fr.length) + '%');
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
