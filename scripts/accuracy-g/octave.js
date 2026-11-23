// Release G (design/accuracy/RELEASE_G.md): the octave hold in Pitch Dragon and the Rift. Offline, in a page of the build
// (no mic, no account), as scripts/survey-d/glider.js (RELEASE_D.md D2 measured the baseline with it): each VocalSet voice
// (~/VoxCoachTestData/vocalset) mixed with white, babble, talker and TV noise (gate/raw-*.wav) at 20 and 10 dB SNR, through
// the pitch path's two 1.5 kHz low-passes, autoCorrelate frame by frame (2048 samples, 60 frames a second).
//   truth: the same frame of the clean voice; an octave error: a reading 9–15 semitones from the truth.
//   A frame 300 ct or more from the note is dropped by both games, so an octave error costs the frame.
// Windows (voiced frames ≥ 20, half-overlapping) losing ≥ 25 % / ≥ 50 % of their voiced frames to octave errors:
//   none       the reading as it is (master)
//   dragon     through one makeOctaveHold for the whole take (Pitch Dragon: one hold a battle)
//   rift       through a new makeOctaveHold at each window's start (the Rift: one hold a round)
// at 1.6 s (D's 279 windows a cell: the gate), and each game's own lengths: Pitch Dragon a chord (2.86 s at 84 bpm,
// 3.33 s at 72), the Rift a round (0.65, 1.4, 2.4 s). Clean (no noise): frames the hold changes.
// Leaps: a clean voice-like tone A3 → A4, A4 → A3, A4 → D4 (the falling fifth), D4 → A4: ms from the change until the
// reading is on the new note (within ±300 ct, so the games count it) and stays there 5 frames, with and without the hold.
// Also --tools: the other tools that drop frames ±300 ct from the note (no hold; measure only), at their window lengths.
// Usage: node scripts/accuracy-g/octave.js [--ref <git ref>] [--out <json>] [--snrs 20,10] [--noises white,babble,talker,tv]
require('../runguard').auto();
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('../design-verify/common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref');
const TD = path.join(os.homedir(), 'VoxCoachTestData');
const VOICES = fs.readdirSync(path.join(TD, 'vocalset')).filter(f => /\.wav$/.test(f)).sort();
const NOISES = (arg('--noises') || 'white,babble,talker,tv').split(',');
const SNRS = (arg('--snrs') || '20,10').split(',').map(Number);
// window lengths in frames (60 a second): the gate's, Pitch Dragon's chords, the Rift's rounds, and the other tools'
const W = { gate: 96, dragon84: 172, dragon72: 200, riftQuick: 39, riftPitch: 84, riftSustain: 144, five: 90 };
const OTHER = { // the other tools that drop a frame ±300 ct from the note (deploy/index.html), by window length (W key)
  'Pitch Match, Interval, custom notes, Harmony Memory, Eve, Boss training (1.6 s)': 'gate',
  'the five-note loop (1.5 s)': 'five',
  'Scales (0.65 s at the fastest level)': 'riftQuick',
  'Karaoke, Performance Director, Emotional Singing, Harmony Arena, the other bosses (a chord, 2.86 s)': 'dragon84',
};

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
// clean and noisy readings (midi or null) for a voice in a noise, or for a clean leap
const TRACK = async ({ voice, noise, snr, leap, riftLens }) => {
  const SR = 48000;
  let x;
  if (leap) { // 1.5 s at a, then 1.5 s at b
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
    let p = 0, c = 0; clean.forEach((m, k) => { if (m === null) return; const at = Math.round(k * hop); for (let i = at; i < at + hop && i < N; i++) { p += x[i] * x[i]; c++; } });
    p /= Math.max(1, c); let q = 0; for (let i = 0; i < nz.length; i++) q += nz[i] * nz[i]; q /= nz.length;
    const g = Math.sqrt(p / q / Math.pow(10, snr / 10)), y = new Float32Array(N), off = 48000 * 3;
    for (let i = 0; i < N; i++) y[i] = x[i] + g * nz[(off + i) % nz.length];
    noisy = track(await lowpass(y));
  }
  // through the app's own hold: one for the whole take, and (the Rift) a new one at each window start, per length
  const hold = typeof makeOctaveHold === 'function' ? makeOctaveHold : null;
  const through = (start, len) => { const h = hold(); return noisy.slice(start, start + len).map(m => h(m)); };
  const dragon = hold ? (() => { const h = hold(); return noisy.map(m => h(m)); })() : null;
  const rift = {};
  if (hold) for (const len of Object.values(riftLens || {})) { rift[len] = {}; for (let w0 = 0; w0 + len <= noisy.length; w0 += len >> 1) rift[len][w0] = through(w0, len); }
  return { clean, noisy, dragon, rift, shared: hold !== null && window.gliderPitchGuard === makeOctaveHold };
};

const isOct = (q, m) => q !== null && m !== null && Math.abs(Math.abs(q - m) - 12) <= 3;
// windows of len frames, half-overlapping, ≥20 voiced: how many lose ≥25 % / ≥50 % of their voiced frames to octave errors
function windows(clean, readAt, len) {
  let wins = 0, w25 = 0, w50 = 0;
  for (let w0 = 0; w0 + len <= clean.length; w0 += len >> 1) {
    let v = 0, o = 0;
    for (let k = w0; k < w0 + len; k++) { if (clean[k] === null) continue; v++; if (isOct(readAt(w0, k), clean[k])) o++; }
    if (v < 20) continue; wins++; if (o / v >= 0.25) w25++; if (o / v >= 0.5) w50++;
  }
  return { wins, w25, w50 };
}
const add = (a, b) => { a.wins += b.wins; a.w25 += b.w25; a.w50 += b.w50; return a; };
const z = () => ({ wins: 0, w25: 0, w50: 0 });
const fmt = r => `${String(r.w25).padStart(3)} / ${String(r.w50).padStart(3)} of ${r.wins}`;

(async () => {
  const files = {};
  for (const v of VOICES) files[v] = fs.readFileSync(path.join(TD, 'vocalset', v)).toString('base64');
  for (const n of NOISES) files['noise-' + n] = fs.readFileSync(path.join(TD, 'gate', `raw-${n}.wav`)).toString('base64');
  const b = await C.chromium.launch(); const res = { ref: REF || 'working copy', cells: [], clean: {}, leaps: [], other: [] };
  const riftLens = { q: W.riftQuick, p: W.riftPitch, s: W.riftSustain, g: W.gate };
  try {
    const { page } = await C.openPage(b, { dir: C.buildDir(REF) });
    await page.evaluate(SETUP, files);
    const has = await page.evaluate(() => typeof makeOctaveHold === 'function');
    console.log(`== the octave hold in Pitch Dragon and the Rift · build ${res.ref} · makeOctaveHold ${has ? 'present' : 'absent (no hold: master)'}`);
    // clean: frames the hold changes
    { let frames = 0, changedD = 0, changedR = 0, shared = null;
      for (const voice of VOICES) {
        const r = await page.evaluate(TRACK, { voice, riftLens });
        shared = r.shared;
        r.clean.forEach((m, k) => { if (m === null) return; frames++; if (has && r.dragon[k] !== m) changedD++; });
        if (has) for (const [w0, seq] of Object.entries(r.rift[W.riftPitch])) seq.forEach((m, i) => { if (m !== null && m !== r.clean[+w0 + i]) changedR++; });
      }
      res.clean = { frames, dragonChanged: changedD, riftChanged1400: changedR, shared };
      console.log(`clean VocalSet: ${frames} voiced frames; changed by the hold: Pitch Dragon ${changedD}, the Rift (1.4 s rounds, overlapping) ${changedR}; makeOctaveHold is window.gliderPitchGuard (Pitch Mountain's): ${shared}`);
    }
    for (const snr of SNRS) for (const noise of NOISES) {
      const cell = { snr, noise, none: {}, dragon: {}, rift: {} };
      for (const k of Object.keys(W)) { cell.none[k] = z(); cell.dragon[k] = z(); cell.rift[k] = z(); }
      for (const voice of VOICES) {
        const r = await page.evaluate(TRACK, { voice, noise, snr, riftLens });
        for (const [k, len] of Object.entries(W)) {
          add(cell.none[k], windows(r.clean, (w0, i) => r.noisy[i], len));
          if (!has) continue;
          add(cell.dragon[k], windows(r.clean, (w0, i) => r.dragon[i], len));
          if (r.rift[len]) add(cell.rift[k], windows(r.clean, (w0, i) => r.rift[len][w0][i - w0], len));
        }
      }
      // how long the slips last: octave-error frames by the length of the run they're in (a run: consecutive frames with
      // an octave error; any other frame ends it). The hold covers runs of 1–4 frames (67 ms) at most.
      cell.runs = { '1-4': 0, '5-15': 0, '16+': 0 };
      for (const voice of VOICES) {
        const r = await page.evaluate(TRACK, { voice, noise, snr, riftLens: {} });
        let n = 0; const flush = () => { if (n) cell.runs[n <= 4 ? '1-4' : n <= 15 ? '5-15' : '16+'] += n; n = 0; };
        r.clean.forEach((m, k) => { if (isOct(r.noisy[k], m)) n++; else flush(); }); flush();
      }
      res.cells.push(cell);
      const tot = Object.values(cell.runs).reduce((a, b) => a + b, 0) || 1;
      console.log(`   octave-error frames by the run they're in: ${Object.entries(cell.runs).map(([k, v]) => `${k} frames ${v} (${Math.round(v / tot * 100)} %)`).join(', ')}`);
      const g = cell.none.gate;
      console.log(`${String(snr).padStart(2)} dB ${noise.padEnd(7)} 1.6 s: none ${fmt(g)} · Pitch Dragon ${has ? fmt(cell.dragon.gate) : '-'} · the Rift ${has ? fmt(cell.rift.gate) : '-'}` +
        (has ? ` | own lengths: Dragon chord 2.86 s ${fmt(cell.none.dragon84)} → ${fmt(cell.dragon.dragon84)}, 3.33 s ${fmt(cell.none.dragon72)} → ${fmt(cell.dragon.dragon72)}; Rift 0.65 s ${fmt(cell.none.riftQuick)} → ${fmt(cell.rift.riftQuick)}, 1.4 s ${fmt(cell.none.riftPitch)} → ${fmt(cell.rift.riftPitch)}, 2.4 s ${fmt(cell.none.riftSustain)} → ${fmt(cell.rift.riftSustain)}` : ''));
    }
    for (const leap of [[57, 69], [69, 57], [69, 62], [62, 69]]) {
      const r = await page.evaluate(TRACK, { leap, riftLens: {} });
      const k0 = 90, on = q => q !== null && Math.abs(q - leap[1]) < 3;
      const settle = seq => { let k = k0; while (k < seq.length && !seq.slice(k, k + 5).every(on)) k++; return Math.round((k - k0) * 1000 / 60); };
      const row = { leap, none: settle(r.noisy), hold: has ? settle(r.dragon) : null };
      res.leaps.push(row);
      console.log(`leap ${leap.join('→')}: on the new note after ${row.none} ms without the hold, ${row.hold} ms with it`);
    }
    console.log('\n== the other tools that drop a frame ±300 ct from the note (no hold; measure only): windows losing ≥25 % / ≥50 %');
    for (const [name, k] of Object.entries(OTHER)) {
      const cols = res.cells.filter(c => c.noise !== 'white').map(c => `${c.snr} dB ${c.noise} ${c.none[k].w25}/${c.none[k].w50} of ${c.none[k].wins}`);
      res.other.push({ name, key: k, cells: res.cells.map(c => ({ snr: c.snr, noise: c.noise, ...c.none[k] })) });
      console.log(`${name}: ${cols.join(' · ')}`);
    }
  } finally { await b.close(); C.cleanup(); }
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
})();
