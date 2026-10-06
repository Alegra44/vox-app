// Vibrato Analyzer: processed mic (today: echo cancellation + noise suppression on) vs unprocessed mic (the proposed
// switch), with a clean vibrato tone under realistic background noise (noisy.py), both with the Analyzer's old capture loop
// (kept inline here as `legacy`), and the Analyzer as it is now (captureVibratoTrace: unprocessed + 1.5 kHz low-pass on the pitch). Each path gets its own browser context (so Chrome can't
// share one audio source's processing between them), its stream runs 3 s before the first capture (noise suppression
// adapts), then N captures.
// Usage: node noisemic.js [captures=3]    Writes WAVs to $VOXCOACH_TESTDATA (~/VoxCoachTestData).
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const N = +(process.argv[2] || 3), TMP = TESTDATA; fs.mkdirSync(TMP, { recursive: true });
const RATE = 6, CENTS = 50;
const OFF = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };

function gen(name, spec) { const f = path.join(TMP, name + '.wav'); execFileSync('python', [path.join(__dirname, 'noisy.py'), f, JSON.stringify(spec)]); return f; }
async function page(browser) {
  const ctx = await browser.newContext({ permissions: ['microphone'] });
  await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
  const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
  return p;
}
// mode: processed | unprocessed (the old capture loop on each mic setting) | analyzer (the panel's current capture)
const LEGACY = `window.legacyCapture = durationMs => new Promise(resolve => { const samples = [], start = performance.now();
  (function frame() { analyser.getFloatTimeDomainData(dataArray); const freq = autoCorrelate(dataArray, audioCtx.sampleRate), t = performance.now() - start;
    if (freq > 0) samples.push({ t, midi: 69 + 12 * Math.log2(freq / 440) }); if (t < durationMs) requestAnimationFrame(frame); else resolve(samples); })(); });`;
async function runPath(wav, mode) {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const p = await page(browser);
    await p.evaluate(LEGACY);
    const settings = await p.evaluate(async ({ mode, OFF }) => {
      if (mode === 'unprocessed') micStream = await navigator.mediaDevices.getUserMedia({ audio: OFF });
      if (mode !== 'analyzer') { await initAudio(); await new Promise(r => setTimeout(r, 3000)); const s = micStream.getAudioTracks()[0].getSettings(); return { ns: s.noiseSuppression, ec: s.echoCancellation, agc: s.autoGainControl }; }
      return { ns: false, ec: false, agc: false };
    }, { mode, OFF });
    const res = [];
    for (let i = 0; i < N; i++) res.push(await p.evaluate(async mode => {
      if (mode === 'analyzer') { vibratoActive = true; const s = await captureVibratoTrace(4000); vibratoActive = false; const a = analyzeVibrato(s, VQ_PITCH_WIN / audioCtx.sampleRate); return { ok: a.ok, rate: a.rate, depth: a.depth, frames: s.length }; }
      const s = await legacyCapture(4000), a = analyzeVibrato(s, analyser.fftSize / audioCtx.sampleRate);
      return { ok: a.ok, rate: a.rate, depth: a.depth, frames: s.length };
    }, mode));
    return { settings, res };
  } finally { await browser.close(); }
}
// RMS through each mic setting with noise only (the tone switched off): how much the suppressor removes.
async function noiseLevel(wav, processed) {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const p = await page(browser);
    return await p.evaluate(async ({ processed, OFF }) => {
      if (!processed) micStream = await navigator.mediaDevices.getUserMedia({ audio: OFF });
      await initAudio(); await new Promise(r => setTimeout(r, 3000));
      const buf = new Float32Array(analyser.fftSize); let sum = 0, k = 0;
      const end = performance.now() + 3000;
      while (performance.now() < end) { analyser.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; k++; } await new Promise(r => setTimeout(r, 40)); }
      return 20 * Math.log10(Math.sqrt(sum / k));
    }, { processed, OFF });
  } finally { await browser.close(); }
}
const summ = rs => {
  const ok = rs.filter(r => r.ok);
  const re = ok.length ? ok.reduce((a, r) => a + Math.abs(r.rate - RATE), 0) / ok.length : null, de = ok.length ? ok.reduce((a, r) => a + Math.abs(r.depth - CENTS), 0) / ok.length : null;
  return { txt: rs.map(r => r.ok ? `${r.rate}Hz ±${r.depth}` : 'none').join(', '), found: ok.length, re, de };
};

(async () => {
  console.log(`Injected: ${RATE} Hz ±${CENTS} ct vibrato on a 262 Hz voice-like tone; ${N} captures per path.`);
  console.log('\n== Is noise suppression really acting on the fake mic? Noise only (tone off), level through each setting:');
  for (const kind of ['pink', 'rumble', 'babble', 'white']) {
    const f = gen('nonly', { noise: kind, snrDb: 10, toneOff: true, seed: 11 });
    const a = await noiseLevel(f, true), b = await noiseLevel(f, false);
    console.log(`  ${kind.padEnd(7)} processed ${a.toFixed(1)} dBFS | unprocessed ${b.toFixed(1)} dBFS | suppressed by ${(b - a).toFixed(1)} dB`);
  }
  const rows = [];
  for (const [kind, snrs] of [['none', [null]], ['pink', [20, 10, 5, 0]], ['rumble', [20, 10, 5, 0]], ['babble', [20, 10, 5, 0]], ['white', [20, 10, 5]]]) {
    for (const snr of snrs) {
      const f = gen('nm', { noise: kind, snrDb: snr, seed: 5 });
      const label = kind === 'none' ? 'no noise' : `${kind} @ ${snr} dB SNR`;
      const out = {};
      for (const mode of ['processed', 'unprocessed', 'analyzer']) out[mode] = await runPath(f, mode);
      if (kind === 'none') console.log('\ntrack settings:', JSON.stringify({ processed: out.processed.settings, unprocessed: out.unprocessed.settings }));
      console.log(`\n${label}`);
      for (const mode of ['processed', 'unprocessed', 'analyzer']) {
        const s = summ(out[mode].res);
        rows.push({ label, mode, ...s });
        console.log(`  ${mode.padEnd(12)} found ${s.found}/${N}  |rate err| ${s.re === null ? '—' : s.re.toFixed(2) + ' Hz'}  |depth err| ${s.de === null ? '—' : s.de.toFixed(1) + ' ct'}   [${s.txt}]`);
      }
    }
  }
  fs.writeFileSync(path.join(TMP, 'noisemic.json'), JSON.stringify(rows, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });
