// Survey D, item c: when does the Tuner say "steady"? Synthetic voices, frame by frame through the app's own chain:
// autoCorrelate (2048 samples at 48 kHz, a frame every 1/60 s, as the analyser loop reads it) → tunerVib (the vibrato-
// tolerant live reading) → updateTunerUI, whose Stability readout (100 − 3 × the SD of the last 30 frames' cents) and
// "In tune" lock are read back after every frame. No microphone, no account, no network: the page is a local build.
// The mic chain's two 1.5 kHz low-passes are applied here too (a biquad, as the app's).
// "Says steady": the Stability readout at 90 % or more (the readout a singer reads as steady; the app has no word for it).
// Inputs (A4 unless said, 6 s each, a voice-like tone: harmonics 1, 0.5, 0.33, 0.25):
//   steady · vibrato 5.5 Hz ±40 ct (a real vibrato: should read steady) · slow glides 10 / 20 / 40 ct/s ·
//   an irregular wobble ±20 and ±25 ct with its rate wandering 3–7 Hz · a random walk (pitch drifting, 15 ct/s rms) ·
//   steady + white noise at 20 / 10 / 5 dB SNR · a wobble + noise at 10 dB
// Usage: node scripts/survey-d/tuner.js [--ref <git ref>] [--out <json>]
require('../runguard').auto();
const fs = require('fs');
const C = require('../design-verify/common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref');

const INPUTS = [
  ['steady', { kind: 'steady' }],
  ['vibrato 5.5 Hz ±40 ct', { kind: 'vib', rate: 5.5, depth: 40 }],
  ['glide 10 ct/s', { kind: 'glide', speed: 10 }],
  ['glide 20 ct/s', { kind: 'glide', speed: 20 }],
  ['glide 40 ct/s', { kind: 'glide', speed: 40 }],
  ['wobble ±20 ct, 3–7 Hz', { kind: 'wobble', depth: 20 }],
  ['wobble ±25 ct, 3–7 Hz', { kind: 'wobble', depth: 25 }],
  ['random walk 15 ct/s', { kind: 'walk', speed: 15 }],
  ['steady + noise 20 dB', { kind: 'steady', snr: 20 }],
  ['steady + noise 10 dB', { kind: 'steady', snr: 10 }],
  ['steady + noise 5 dB', { kind: 'steady', snr: 5 }],
  ['wobble ±25 ct + noise 10 dB', { kind: 'wobble', depth: 25, snr: 10 }],
];

// In the page: build the input, run it frame by frame, return per-frame readouts.
const RUN = async ({ spec, seed }) => {
  const SR = 48000, SEC = 6, N = SR * SEC, x = new Float32Array(N);
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  // cents offset over time
  const cents = new Float32Array(N);
  if (spec.kind === 'vib') for (let i = 0; i < N; i++) cents[i] = spec.depth * Math.sin(2 * Math.PI * spec.rate * i / SR);
  if (spec.kind === 'glide') for (let i = 0; i < N; i++) cents[i] = -spec.speed * SEC / 2 + spec.speed * i / SR;
  if (spec.kind === 'wobble') { // a sine whose rate wanders between 3 and 7 Hz (changes every ~150 ms) and depth ±20 %
    let ph = 0, rate = 5, depth = spec.depth, next = 0;
    for (let i = 0; i < N; i++) {
      if (i >= next) { rate = 3 + 4 * rnd(); depth = spec.depth * (0.8 + 0.4 * rnd()); next = i + Math.round(SR * (0.1 + 0.1 * rnd())); }
      ph += 2 * Math.PI * rate / SR; cents[i] = depth * Math.sin(ph);
    }
  }
  if (spec.kind === 'walk') { let c = 0; const step = spec.speed / Math.sqrt(SR); for (let i = 0; i < N; i++) { c += step * gauss(); c *= 0.99999; cents[i] = c; } }
  let ph = 0; const H = [1, 0.5, 0.33, 0.25];
  for (let i = 0; i < N; i++) {
    const f = 440 * Math.pow(2, cents[i] / 1200); ph += 2 * Math.PI * f / SR;
    let v = 0; H.forEach((a, k) => { v += a * Math.sin((k + 1) * ph); }); x[i] = 0.12 * v;
  }
  if (spec.snr !== undefined) {
    let p = 0; for (let i = 0; i < N; i++) p += x[i] * x[i]; p /= N;
    const g = Math.sqrt(p / Math.pow(10, spec.snr / 10));
    for (let i = 0; i < N; i++) x[i] += g * gauss();
  }
  // the pitch path's two 1.5 kHz low-passes (Butterworth biquads), through an OfflineAudioContext
  const oc = new OfflineAudioContext(1, N, SR), buf = oc.createBuffer(1, N, SR); buf.copyToChannel(x, 0);
  const src = oc.createBufferSource(); src.buffer = buf;
  const lp = [0, 1].map(() => { const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = VQ_PITCH_LP_HZ; f.Q.value = Math.SQRT1_2; return f; });
  src.connect(lp[0]).connect(lp[1]).connect(oc.destination); src.start();
  const y = (await oc.startRendering()).getChannelData(0);
  // frame by frame, as the analyser loop does
  tunerVib = makeVibratoTolerantLive(); stabilityBuffer = []; sessionStabilityReadings = [];
  const out = [], hop = SR / 60, win = 2048, d = new Float32Array(win);
  for (let k = 0, t = 0; k * hop + win <= N; k++, t += 1000 / 60) {
    const at = Math.round(k * hop); d.set(y.subarray(at, at + win));
    const freq = autoCorrelate(d, SR);
    const c0 = freq > 0 ? 6900 + 1200 * Math.log2(freq / 440) : null, held = typeof tunerReading === "function" ? tunerReading(t, c0) : tunerVib(t, c0);
    updateTunerUI(freq > 0 ? 440 * Math.pow(2, (held - 6900) / 1200) : freq);
    const st = parseFloat(stabilityStat.textContent), locked = centsDisplay.className.includes('locked');
    out.push({ t, st: Number.isFinite(st) ? st : null, locked, trueCents: cents[at + win / 2] });
  }
  return out;
};

(async () => {
  const b = await C.chromium.launch();
  const res = {};
  try {
    const { page } = await C.openPage(b, { dir: C.buildDir(REF) });
    console.log(`== Tuner "steady" (Stability ≥ 90 %), build ${REF || 'working copy'}; frames after the first second`);
    console.log(`${'input'.padEnd(30)} ${'steady %'.padStart(9)} ${'In tune %'.padStart(10)} ${'median stab'.padStart(12)} ${'true SD ct (0.5 s)'.padStart(19)}`);
    for (const [name, spec] of INPUTS) {
      const runs = [];
      for (const seed of [1, 2, 3]) runs.push(await page.evaluate(RUN, { spec, seed }));
      const fr = runs.flatMap(r => r.filter(f => f.t >= 1000 && f.st !== null));
      const steady = fr.filter(f => f.st >= 90).length / Math.max(1, fr.length) * 100;
      const inTune = runs.flatMap(r => r.filter(f => f.t >= 1000)).filter(f => f.locked).length / Math.max(1, runs.flatMap(r => r.filter(f => f.t >= 1000)).length) * 100;
      const sts = fr.map(f => f.st).sort((a, c) => a - c), med = sts.length ? sts[Math.floor(sts.length / 2)] : null;
      // the truth: the SD of the true cents over each 0.5 s window, averaged
      const sds = runs.flatMap(r => { const o = []; for (let i = 30; i < r.length; i++) { const w = r.slice(i - 30, i).map(f => f.trueCents), m = w.reduce((a, c) => a + c, 0) / w.length; o.push(Math.sqrt(w.reduce((a, c) => a + (c - m) ** 2, 0) / w.length)); } return o; });
      const trueSd = sds.reduce((a, c) => a + c, 0) / Math.max(1, sds.length);
      res[name] = { steady: +steady.toFixed(1), inTune: +inTune.toFixed(1), median: med, trueSd: +trueSd.toFixed(1), frames: fr.length };
      console.log(`${name.padEnd(30)} ${steady.toFixed(1).padStart(9)} ${inTune.toFixed(1).padStart(10)} ${String(med).padStart(12)} ${trueSd.toFixed(1).padStart(19)}`);
    }
  } finally { await b.close(); C.cleanup(); }
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
})();
