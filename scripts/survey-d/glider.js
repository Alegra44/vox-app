// Survey D, item b: Pitch Mountain's octave crash under noise. Offline, in a page of the build (no mic, no account):
// each VocalSet voice (~/VoxCoachTestData/vocalset: straight, vibrato, breathy, pp) mixed with each noise
// (gate/raw-*.wav: white, pink, babble, talker, traffic, tv, rumble) at 20, 10, 5 and 0 dB SNR (noise power against the
// voice's power over its voiced frames), resampled to 48 kHz, through the pitch path's two 1.5 kHz low-passes, then
// autoCorrelate frame by frame (2048 samples, a frame every 1/60 s), as gliderLoop reads it.
//   truth: the same frame of the clean voice (autoCorrelate on it), where it found a pitch
//   octave error: a noisy frame 9–15 semitones from the truth (one octave, either way; 19 st = a twelfth counted apart)
// The glider, simulated with the app's own rule (glideFollow: a quarter of the way to the pitch's height each frame,
// falling 3.2 px a frame with no pitch; gliderMidiToY over the signed-out range, H = 320), flying a gap centred on the
// truth's height. A crash: the glider's edge (±8 px) outside the gap. Gaps: 135 px (beginner's standard gap, 100 ×
// 1.35) and 100 px (intermediate). Each crash is put down to octave errors when the same flight with those frames
// replaced by the truth doesn't crash there.
// The frames also go through window.gliderPitchGuard(--variant: last | prev | median3), if the build has it;
// --guard-only skips the unguarded pass.
// A real leap: a clean voice-like tone holding A3 then leaping to A4 (and A4 → A3, and a fifth), the frames until the
// glider is within 10 px of the new height, with and without the guard.
// Usage: node scripts/survey-d/glider.js [--ref <git ref>] [--out <json>]
require('../runguard').auto();
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('../design-verify/common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref'), VARIANT = arg('--variant') || 'last', GUARD_ONLY = process.argv.includes('--guard-only');
const TD = path.join(os.homedir(), 'VoxCoachTestData');
const VOICES = fs.readdirSync(path.join(TD, 'vocalset')).filter(f => /\.wav$/.test(f)).sort();
const NOISES = arg('--noises') ? arg('--noises').split(',') : ['white', 'pink', 'babble', 'talker', 'traffic', 'tv', 'rumble'];
const SNRS = arg('--snrs') ? arg('--snrs').split(',').map(Number) : [20, 10, 5, 0];

const SETUP = async files => { // decode every file to 48 kHz mono, kept on window
  window.__a = {};
  for (const [k, b64] of Object.entries(files)) {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    const tmp = new OfflineAudioContext(1, 48000, 48000), dec = await tmp.decodeAudioData(bytes);
    const n = Math.ceil(dec.duration * 48000), oc = new OfflineAudioContext(1, n, 48000), s = oc.createBufferSource();
    s.buffer = dec; s.connect(oc.destination); s.start();
    window.__a[k] = (await oc.startRendering()).getChannelData(0);
  }
  return Object.keys(window.__a).length;
};
const TRACK = async ({ voice, noise, snr, useGuard, leap, variant }) => {
  const SR = 48000;
  let x;
  if (leap) { // a clean leap: 1.5 s at a, then 1.5 s at b
    const N = SR * 3; x = new Float32Array(N); let ph = 0;
    for (let i = 0; i < N; i++) { const f = 440 * Math.pow(2, ((i < SR * 1.5 ? leap[0] : leap[1]) - 69) / 12); ph += 2 * Math.PI * f / SR; x[i] = 0.12 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.33 * Math.sin(3 * ph)); }
  } else x = window.__a[voice].slice();
  const N = x.length, hop = SR / 60, win = 2048;
  const lowpass = async a => {
    const oc = new OfflineAudioContext(1, a.length, SR), buf = oc.createBuffer(1, a.length, SR); buf.copyToChannel(a, 0);
    const s = oc.createBufferSource(); s.buffer = buf;
    const lp = [0, 1].map(() => { const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = VQ_PITCH_LP_HZ; f.Q.value = Math.SQRT1_2; return f; });
    s.connect(lp[0]).connect(lp[1]).connect(oc.destination); s.start(); return (await oc.startRendering()).getChannelData(0);
  };
  const track = a => { const out = [], d = new Float32Array(win); for (let k = 0; k * hop + win <= a.length; k++) { const at = Math.round(k * hop); d.set(a.subarray(at, at + win)); const f = autoCorrelate(d, SR); out.push(f > 0 ? 69 + 12 * Math.log2(f / 440) : null); } return out; };
  const clean = track(await lowpass(x));
  let noisy = clean;
  if (noise) {
    const nz = window.__a['noise-' + noise];
    // the voice's power over its voiced frames
    let p = 0, c = 0; clean.forEach((m, k) => { if (m === null) return; const at = Math.round(k * hop); for (let i = at; i < at + hop && i < N; i++) { p += x[i] * x[i]; c++; } });
    p /= Math.max(1, c); let q = 0; for (let i = 0; i < nz.length; i++) q += nz[i] * nz[i]; q /= nz.length;
    const g = Math.sqrt(p / q / Math.pow(10, snr / 10)), y = new Float32Array(N), off = 48000 * 3;
    for (let i = 0; i < N; i++) y[i] = x[i] + g * nz[(off + i) % nz.length];
    noisy = track(await lowpass(y));
  }
  const guard = useGuard && typeof window.gliderPitchGuard === 'function' ? window.gliderPitchGuard(variant) : (m => m);
  const seen = noisy.map(m => guard(m));
  const H = 320, toY = m => gliderMidiToY(m, H);
  return { clean, noisy, seen, cleanY: clean.map(m => m === null ? null : toY(m)), seenY: seen.map(m => m === null ? null : toY(m)), range: registerRangeBounds() };
};

// the glider over a track: y each frame (glideFollow), the truth's height as the gap centre
function fly(seenY, truthY, gapH) {
  let y = null, last = null, crashes = 0, inCrash = false; const ys = [];
  for (let k = 0; k < seenY.length; k++) {
    if (truthY[k] !== null) last = truthY[k];
    if (y === null) { if (last === null) { ys.push(null); continue; } y = last; }
    const d = seenY[k];
    y = Math.max(6, Math.min(320 - 6, d !== null ? y + (d - y) * 0.25 : y + 3.2));
    ys.push(y);
    const out = last !== null && truthY[k] !== null && Math.abs(y - last) + 8 > gapH / 2; // judged where the singer is singing
    if (out && !inCrash) crashes++; inCrash = out;
  }
  return { crashes, ys };
}

(async () => {
  const files = {};
  for (const v of VOICES) files[v] = fs.readFileSync(path.join(TD, 'vocalset', v)).toString('base64');
  for (const n of NOISES) files['noise-' + n] = fs.readFileSync(path.join(TD, 'gate', `raw-${n}.wav`)).toString('base64');
  const b = await C.chromium.launch(); const res = { ref: REF || 'working copy', cells: [], leaps: [] };
  try {
    const { page } = await C.openPage(b, { dir: C.buildDir(REF) });
    await page.evaluate(SETUP, files);
    const hasGuard = await page.evaluate(() => typeof window.gliderPitchGuard === 'function');
    console.log(`== Pitch Mountain under noise · build ${res.ref} · guard ${hasGuard ? 'present, variant ' + VARIANT : 'none'}`);
    for (const useGuard of hasGuard ? (GUARD_ONLY ? [true] : [false, true]) : [false]) {
      for (const snr of SNRS) for (const noise of NOISES) {
        let frames = 0, oct = 0, c135 = 0, c100 = 0, o135 = 0, o100 = 0, wins = 0, w25 = 0, w50 = 0; const who = {};
        for (const voice of VOICES) {
          const r = await page.evaluate(TRACK, { voice, noise, snr, useGuard, variant: VARIANT });
          let vo = 0;
          r.clean.forEach((m, k) => { if (m === null) return; frames++; const s = r.noisy[k]; if (s !== null && Math.abs(Math.abs(s - m) - 12) <= 3) { oct++; vo++; } });
          if (vo) who[voice.replace('.wav', '')] = vo;
          // Pitch Dragon and the Rift: frames 300 ct or more from the target are dropped, not scored, so an octave slip
          // costs frames, not a crash. Per 1.6 s window (96 frames, a Rift round) with 20+ voiced frames: the share of
          // its voiced frames lost to octave slips (25 % or more, 50 % or more: the note then scored on half or less).
          for (let w0 = 0; w0 + 96 <= r.clean.length; w0 += 48) {
            let v = 0, o = 0; for (let k = w0; k < w0 + 96; k++) { if (r.clean[k] === null) continue; v++; const q = r.noisy[k]; if (q !== null && Math.abs(Math.abs(q - r.clean[k]) - 12) <= 3) o++; }
            if (v < 20) continue; wins++; if (o / v >= 0.25) w25++; if (o / v >= 0.5) w50++;
          }
          // the counterfactual: octave frames replaced by the truth
          const fixedY = r.seenY.map((y, k) => (r.clean[k] !== null && r.noisy[k] !== null && Math.abs(Math.abs(r.noisy[k] - r.clean[k]) - 12) <= 3) ? r.cleanY[k] : y);
          for (const [gap, set] of [[135, 'a'], [100, 'b']]) {
            const f = fly(r.seenY, r.cleanY, gap).crashes, g = fly(fixedY, r.cleanY, gap).crashes;
            if (set === 'a') { c135 += f; o135 += Math.max(0, f - g); } else { c100 += f; o100 += Math.max(0, f - g); }
          }
        }
        const cell = { guard: useGuard, snr, noise, frames, windows: wins, windowsOct25: w25, windowsOct50: w50, octavePct: +(oct / Math.max(1, frames) * 100).toFixed(2), crashes135: c135, octaveCrashes135: o135, crashes100: c100, octaveCrashes100: o100, voicesWithOctave: who };
        res.cells.push(cell);
        console.log(`${useGuard ? 'guard ' : 'master'} ${String(snr).padStart(2)} dB ${noise.padEnd(8)} octave frames ${cell.octavePct.toFixed(2).padStart(5)} %  crashes 135px ${String(c135).padStart(3)} (octave ${String(o135).padStart(3)})  100px ${String(c100).padStart(3)} (octave ${String(o100).padStart(3)})  1.6 s windows ${wins}: ≥25 % octave ${w25}, ≥50 % ${w50}  ${Object.entries(who).map(([k, v]) => k + ':' + v).join(' ')}`);
      }
      for (const leap of [[57, 69], [69, 57], [62, 69], [69, 62]]) {
        const r = await page.evaluate(TRACK, { leap, useGuard, variant: VARIANT });
        const ys = fly(r.seenY, r.cleanY, 1e9).ys, k0 = 90, target = r.cleanY[r.cleanY.length - 5];
        let k = k0; while (k < ys.length && !(ys[k] !== null && Math.abs(ys[k] - target) <= 10)) k++;
        const ms = Math.round((k - k0) * 1000 / 60);
        res.leaps.push({ guard: useGuard, leap, ms });
        console.log(`${useGuard ? 'guard ' : 'master'} leap ${leap.join('→')}: within 10 px of the new height after ${ms} ms`);
      }
    }
  } finally { await b.close(); C.cleanup(); }
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
})();
