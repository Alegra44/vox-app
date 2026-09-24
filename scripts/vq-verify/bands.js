// Brightness reading bands at their edges: harmonic tones rolling off ½ dB/oct either side of each boundary (dark
// steeper than 13 dB/oct, bright shallower than 9), straight and with 6 Hz ±50 / ±100 ct vibrato, through the panel's
// own capture. Every tone should land on its side of the line.
// Usage: node scripts/vq-verify/bands.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });

async function measure(wav) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
    const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
    return await p.evaluate(async () => {
      vqActive = true; const fr = await vqCapture(); vqActive = false; const r = vqSummarize(fr);
      const [dk, br] = vqBrightBounds(r.f0), ratio = r.centroid / r.f0;
      return { ratio, dk, br, band: ratio < dk ? 'dark' : ratio > br ? 'bright' : 'balanced' };
    });
  } finally { await b.close(); }
}

(async () => {
  let ok = 0, n = 0;
  for (const f0 of [220, 440]) {
    const K = Math.floor(6000 / f0);
    for (const [dbo, want] of [[13.5, 'dark'], [12.5, 'balanced'], [9.5, 'balanced'], [8.5, 'bright']]) {
      const H = [...Array(K).keys()].map(k => Math.pow(k + 1, -dbo / 6.0206)), out = [];
      for (const d of [0, 50, 100]) {
        const wav = path.join(TMP, 'bands.wav');
        execFileSync('python', [path.join(__dirname, 'gen.py'), wav, JSON.stringify({ f0, harmonics: H, ...(d ? { vibRate: 6, vibCents: d } : {}) })]);
        const g = await measure(wav); n++; if (g.band === want) ok++;
        out.push(`${d ? '±' + d : 'straight'} ${g.ratio.toFixed(3)}× → ${g.band}${g.band === want ? ' ✓' : ' ✗'}`);
      }
      console.log(`${f0} Hz ${String(dbo).padStart(4)} dB/oct (want ${want.padEnd(8)}) ${out.join(' | ')}`);
    }
  }
  console.log(`\n${ok}/${n} on the right side of the line`);
})().catch(e => { console.error(e); process.exitCode = 1; });
