// Survey I (design/accuracy/SURVEY_I.md): the pitch detector's octave decisions in noise. Offline, in a page of the
// build (no mic, no account), with RELEASE_G's method: each VocalSet voice (~/VoxCoachTestData/vocalset) mixed with
// white, babble, talker and TV noise (gate/raw-*.wav) at 20 and 10 dB SNR, through the pitch path's two 1.5 kHz
// low-passes, read frame by frame (2048 samples, 60 frames a second).
//   truth: the app's autoCorrelate on the same frame of the clean voice; a wrong octave: a reading 9–15 semitones from it
// Per frame: how often the detector picks the wrong octave (of the frames voiced in the clean take), up or down, and how
// long the wrong runs last (1–4 frames, 5–15, 16+).
// Trial (here only, never in the app): a continuity rule inside the detector. The same autocorrelation as the app's
// autoCorrelate (checked frame for frame: with the rule off it gives the app's reading exactly), then: the candidate an
// octave from the chosen one (the ACF's local peak near twice or half its lag); if that candidate continues the last
// steady pitch (±150 ct) and the chosen one doesn't, and the two are close in strength, the continuing one is kept.
// Strength: the ACF at the lag over its overlap (no short-lag bias; a voice periodic at T is as periodic at 2T, so a
// real upward leap reads ≈ equal at the old, lower octave). Two closeness settings, one per direction:
//   down  the continuing candidate is the shorter lag (the reading slipped an octave low): kept if ≥ (1 − δ) × the chosen
//   up    the continuing candidate is the longer lag (the reading slipped an octave high): kept if ≥ (1 + ε) × the chosen
// and a release: after K frames in a row kept by the rule, the reading goes as read (a real leap, at most K frames late).
// The steady pitch: the median of the last S outputs when they're within ±100 ct of it, kept through gaps of up to G frames.
// Leaps: a voice-like tone, clean and in each noise: A3→A4, A4→A3, A4→D4 (the falling fifth), D4→A4, D3→D4, D5→D4: ms
// from the change until the reading is on the new note (±300 ct) and stays there 5 frames.
// Usage: node scripts/survey-i/octave.js [--ref <git ref>] [--out <json>] [--grid] [--set δ,ε,K,S,G …]
require('../runguard').auto();
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('../design-verify/common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref'), OUT = arg('--out');
const TD = path.join(os.homedir(), 'VoxCoachTestData');
const VOICES = fs.readdirSync(path.join(TD, 'vocalset')).filter(f => /\.wav$/.test(f)).sort();
const NOISES = (arg('--noises') || 'white,babble,talker,tv').split(',');
const SNRS = (arg('--snrs') || '20,10').split(',').map(Number);
// rule settings: {d: δ, e: ε, K, S, G}; null = the app as it is
const parseSet = s => { if (s[0] === 'f') return { mode: 'first', k: Number(s.slice(1)) };
  if (s[0] === 'c') { const [k, S, G] = s.slice(1).split(',').map(Number); return { mode: 'cfirst', k, S, G }; } const [d, e, K, S, G] = s.split(',').map(Number); return { d, e, K, S, G }; };
let SETS = [{ d: 0.05, e: 0.02, K: 4, S: 4, G: 10 }];
if (process.argv.includes('--grid')) {
  SETS = [];
  for (const d of [0.02, 0.05, 0.1, 0.2]) for (const e of [0, 0.02, 0.05, 1e9]) for (const K of [4, 1e9]) SETS.push({ d, e, K, S: 4, G: 10 });
}
const si = process.argv.indexOf('--set'); if (si > 0) SETS = process.argv.slice(si + 1).filter(a => /^[fc]?[\d.e+,]+$/.test(a)).map(parseSet);
const label = s => s.mode === 'cfirst' ? `continuing first peak: an earlier ACF peak ≥ ${s.k} × the highest, kept when it continues the steady pitch · S ${s.S} · G ${s.G}` : s.mode === 'first' ? `first peak ≥ ${s.k} × the highest (no continuity)` : `δ ${s.d} · ε ${s.e >= 1e8 ? '∞ (never up)' : s.e} · K ${s.K >= 1e8 ? '∞' : s.K} · S ${s.S} · G ${s.G}`;

const SETUP = async files => {
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

// one take: the clean readings (truth), the app's noisy readings, and each rule setting's noisy readings
const TRACK = async ({ voice, noise, snr, leap, sets }) => {
  const SR = 48000;
  let x;
  if (leap) { // 1.5 s at a, then 1.5 s at b, a voice-like tone (three harmonics)
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
  const toMidi = f => f > 0 ? 69 + 12 * Math.log2(f / 440) : null;
  // the app's autoCorrelate, step for step (VOICE_MIN_HZ, VOICE_MIN_CLARITY from the page), with its ACF kept
  const analyse = (buf, sampleRate) => {
    const SIZE = buf.length;
    let rms = 0; for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / SIZE);
    if (rms < 0.008) return null;
    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thres) { r1 = i; break; } }
    for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; } }
    const t = buf.slice(r1, r2), n = t.length, c = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n - i; j++) s += t[j] * t[j + i]; c[i] = s; }
    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1; for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    return { c, n, d, maxpos };
  };
  const refine = (A, T0) => { const c = A.c, x1 = c[T0 - 1] || c[T0], x2 = c[T0], x3 = c[T0 + 1] || c[T0], a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2; return a ? T0 - b / (2 * a) : T0; };
  const accept = (buf, sampleRate, T) => { // the app's last two checks on a lag: the lowest pitch, the clarity
    const freq = sampleRate / T; if (!(freq >= VOICE_MIN_HZ)) return -1;
    const lag = Math.round(T); let ac = 0, m = 0;
    for (let j = 0; j + lag < buf.length; j++) { ac += buf[j] * buf[j + lag]; m += buf[j] * buf[j] + buf[j + lag] * buf[j + lag]; }
    if (!(m > 0) || 2 * ac / m < VOICE_MIN_CLARITY) return -1;
    return freq;
  };
  const appRead = (buf, A) => { if (!A || A.maxpos <= 0) return -1; return accept(buf, SR, refine(A, A.maxpos)); };
  // the ACF's local peak near lag L (±3 %, at least 2 samples), at or past the first descent
  const peakNear = (A, L) => {
    const w = Math.max(2, Math.round(L * 0.03)), lo = Math.max(A.d, Math.round(L) - w, 1), hi = Math.min(A.n - 2, Math.round(L) + w);
    let best = -1, bv = -Infinity; for (let i = lo; i <= hi; i++) if (A.c[i] > bv && A.c[i] >= A.c[i - 1] && A.c[i] >= A.c[i + 1]) { bv = A.c[i]; best = i; }
    return best;
  };
  const strength = (A, i) => A.c[i] / (A.n - i);
  // the comparison (no memory): the first ACF peak, from the first descent on, at least k × the highest; then the app's checks
  const makeFirst = s => {
    const out = [];
    return { out, step(buf, A) {
      if (!A || A.maxpos <= 0) { out.push(toMidi(-1)); return; }
      let pick = A.maxpos; const lim = s.k * A.c[A.maxpos];
      for (let i = Math.max(A.d, 1); i < A.maxpos; i++) if (A.c[i] >= lim && A.c[i] >= A.c[i - 1] && A.c[i] >= A.c[i + 1]) { pick = i; break; }
      let f = accept(buf, SR, refine(A, pick));
      if (!(f > 0) && pick !== A.maxpos) f = accept(buf, SR, refine(A, A.maxpos));
      out.push(toMidi(f));
    } };
  };
  const makeRule = s => {
    if (s.mode === 'first') return makeFirst(s);
    if (s.mode === 'cfirst') s = { ...s, K: 1e9 };
    const out = []; let kept = 0, gap = 0, steady = null;
    const update = m => {
      out.push(m);
      if (m === null) { if (++gap > s.G) steady = null; return; }
      gap = 0;
      const last = out.slice(-s.S).filter(v => v !== null);
      if (last.length >= s.S) { const med = [...last].sort((a, b) => a - b)[last.length >> 1]; if (last.every(v => Math.abs(v - med) <= 1)) steady = med; }
    };
    return { out, step(buf, A) {
      const f0 = appRead(buf, A); let m = toMidi(f0);
      // released: K frames kept in a row and the reading still elsewhere: a real leap; the steady pitch starts again from it
      if (m !== null && steady !== null && Math.abs(m - steady) > 1.5 && kept >= s.K) steady = null;
      if (m !== null && steady !== null && Math.abs(m - steady) > 1.5) {
        const T = refine(A, A.maxpos), cands = [];
        if (s.mode === 'cfirst') { for (let i = Math.max(A.d, 1); i < A.maxpos; i++) if (A.c[i] >= s.k * A.c[A.maxpos] && A.c[i] >= A.c[i - 1] && A.c[i] >= A.c[i + 1]) cands.push(i); }
        else for (const L of [T * 2, T / 2]) { const p = peakNear(A, L); if (p > 0) cands.push(p); }
        let pick = null;
        for (const p of cands) {
          const fa = accept(buf, SR, refine(A, p)), ma = toMidi(fa);
          if (ma === null || Math.abs(ma - steady) > 1.5) continue; // doesn't continue the steady pitch
          if (s.mode === 'cfirst') { pick = ma; break; }
          const r = strength(A, p) / strength(A, A.maxpos), longer = p > A.maxpos;
          if (longer ? r >= 1 + s.e : r >= 1 - s.d) { pick = ma; break; }
        }
        if (pick !== null) { kept++; update(pick); return; }
      }
      kept = 0; update(m);
    } };
  };
  const track = (a, rules) => {
    const app = [], d = new Float32Array(win);
    for (let k = 0; k * hop + win <= a.length; k++) {
      const at = Math.round(k * hop); d.set(a.subarray(at, at + win));
      const A = analyse(d, SR), f = appRead(d, A);
      app.push(toMidi(f));
      if (rules) for (const r of rules) r.step(d, A);
      if (k % 400 === 0) { const g = autoCorrelate(d, SR); if (Math.abs((g > 0 ? g : -1) - f) > 1e-9) throw new Error(`the copy differs from the app's autoCorrelate at frame ${k}: ${g} vs ${f}`); }
    }
    return app;
  };
  const cleanRules = sets.map(makeRule);
  const lx = await lowpass(x);
  const clean = track(lx, cleanRules);
  let noisy = clean, rules = cleanRules;
  if (noise) {
    const nz = window.__a['noise-' + noise];
    let p = 0, c = 0; clean.forEach((m, k) => { if (m === null) return; const at = Math.round(k * hop); for (let i = at; i < at + hop && i < N; i++) { p += x[i] * x[i]; c++; } });
    p /= Math.max(1, c); let q = 0; for (let i = 0; i < nz.length; i++) q += nz[i] * nz[i]; q /= nz.length;
    const g = Math.sqrt(p / q / Math.pow(10, snr / 10)), y = new Float32Array(N), off = 48000 * 3;
    for (let i = 0; i < N; i++) y[i] = x[i] + g * nz[(off + i) % nz.length];
    rules = sets.map(makeRule);
    noisy = track(await lowpass(y), rules);
  }
  return { clean, noisy, cleanRules: cleanRules.map(r => r.out), rules: rules.map(r => r.out) };
};

const isOct = (q, m) => q !== null && m !== null && Math.abs(Math.abs(q - m) - 12) <= 3;
// per frame: voiced (clean), wrong octave (up / down), runs by length; plus frames that read null and other errors
const z = () => ({ voiced: 0, oct: 0, up: 0, down: 0, r1: 0, r5: 0, r16: 0, runs: 0, longest: 0, afterSteady: 0, noSteady: 0, noteStart: 0, gap: 0, wrongBefore: 0 });
function frames(clean, read, acc) {
  let run = 0, steadyBefore = false;
  // a run's frames, by what came just before it: 4 frames on the same note (±1 st) read right (a steady pitch the rule
  // could continue), or not (a note's start, a gap, a wrong reading)
  // not steady: the note started within the 4 frames before (or the clean take was silent), else the reading dropped
  // out there (null), else it was wrong there
  const before = k0 => {
    let why = 'steady';
    for (let j = k0 - 4; j < k0; j++) if (j < 0 || clean[j] === null || Math.abs(clean[j] - clean[k0]) > 1) return 'noteStart';
    for (let j = k0 - 4; j < k0; j++) if (read[j] === null) why = 'gap';
    if (why === 'steady') for (let j = k0 - 4; j < k0; j++) if (Math.abs(read[j] - clean[j]) > 1.5) why = 'wrongBefore';
    return why;
  };
  const end = () => { if (!run) return; if (steadyBefore === 'steady') acc.afterSteady += run; else { acc.noSteady += run; acc[steadyBefore] += run; } acc.runs++; acc.longest = Math.max(acc.longest, run); if (run <= 4) acc.r1 += run; else if (run <= 15) acc.r5 += run; else acc.r16 += run; run = 0; };
  for (let k = 0; k < clean.length; k++) {
    if (clean[k] === null) { end(); continue; }
    acc.voiced++;
    if (isOct(read[k], clean[k])) { if (!run) steadyBefore = before(k); acc.oct++; read[k] > clean[k] ? acc.up++ : acc.down++; run++; } else end();
  }
  end(); return acc;
}
const addTo = (a, b) => { for (const k of Object.keys(a)) a[k] = k === 'longest' ? Math.max(a[k], b[k]) : a[k] + b[k]; return a; };
const pct = (n, d) => d ? (100 * n / d).toFixed(2) + '%' : '-';
// windows of len frames, half-overlapping, ≥20 voiced (RELEASE_G's): how many lose ≥25 % of their voiced frames to octave errors
function windows(clean, read, len, acc) {
  for (let w0 = 0; w0 + len <= clean.length; w0 += len >> 1) {
    let v = 0, o = 0;
    for (let k = w0; k < w0 + len; k++) { if (clean[k] === null) continue; v++; if (isOct(read[k], clean[k])) o++; }
    if (v < 20) continue; acc.wins++; if (o / v >= 0.25) acc.w25++; if (o / v >= 0.5) acc.w50++;
  }
  return acc;
}
const W = { 'Pitch Match, Interval, custom notes, Harmony Memory, Eve, Boss training (1.6 s)': 96, 'the five-note loop (1.5 s)': 90,
  'Scales, the Rift quick (0.65 s)': 39, 'the Rift pitch (1.4 s)': 84, 'Karaoke, Performance Director, Emotional Singing, Harmony Arena, Pitch Dragon, the other bosses (a chord, 2.86 s)': 172 };
// a leap's ms: from the change until the reading is within ±300 ct of the new note and stays 5 frames
function leapMs(read, to, from = 90) { for (let k = from; k + 5 <= read.length; k++) { let ok = true; for (let j = k; j < k + 5; j++) if (read[j] === null || Math.abs(read[j] - to) > 3) { ok = false; break; } if (ok) return Math.round((k - from) * 1000 / 60); } return null; }

(async () => {
  const files = {};
  for (const v of VOICES) files[v] = fs.readFileSync(path.join(TD, 'vocalset', v)).toString('base64');
  for (const n of NOISES) files['noise-' + n] = fs.readFileSync(path.join(TD, 'gate', `raw-${n}.wav`)).toString('base64');
  const b = await C.chromium.launch();
  const res = { ref: REF || 'working copy', sets: SETS, voices: VOICES.length, cells: [], clean: [], leaps: [], tools: [] };
  try {
    const { page } = await C.openPage(b, { dir: C.buildDir(REF) });
    await page.evaluate(SETUP, files);
    console.log(`== Survey I: octave decisions · build ${res.ref} · ${VOICES.length} VocalSet takes · ${SETS.length} rule setting(s)`);
    SETS.forEach((s, i) => console.log(`   rule ${i + 1}: ${label(s)}`));
    // clean: frames each setting changes (the rule must leave clean takes alone)
    const changed = SETS.map(() => ({ frames: 0, changed: 0, oct: 0 }));
    for (const voice of VOICES) {
      const r = await page.evaluate(TRACK, { voice, sets: SETS });
      r.cleanRules.forEach((o, i) => r.clean.forEach((m, k) => { if (m === null && o[k] === null) return; changed[i].frames++; if (m !== o[k]) { changed[i].changed++; if (isOct(o[k], m)) changed[i].oct++; } }));
    }
    res.clean = changed;
    console.log('\n-- clean VocalSet (no noise): frames the rule changes');
    changed.forEach((c, i) => console.log(`   rule ${i + 1}: ${c.changed} of ${c.frames} frames (${c.oct} to another octave)`));
    for (const snr of SNRS) for (const noise of NOISES) {
      const cell = { snr, noise, app: z(), rules: SETS.map(z), appW: {}, rulesW: SETS.map(() => ({})) };
      for (const [k] of Object.entries(W)) { cell.appW[k] = { wins: 0, w25: 0, w50: 0 }; cell.rulesW.forEach(o => { o[k] = { wins: 0, w25: 0, w50: 0 }; }); }
      for (const voice of VOICES) {
        const r = await page.evaluate(TRACK, { voice, noise, snr, sets: SETS });
        addTo(cell.app, frames(r.clean, r.noisy, z()));
        r.rules.forEach((o, i) => addTo(cell.rules[i], frames(r.clean, o, z())));
        for (const [k, len] of Object.entries(W)) { windows(r.clean, r.noisy, len, cell.appW[k]); r.rules.forEach((o, i) => windows(r.clean, o, len, cell.rulesW[i][k])); }
      }
      res.cells.push(cell);
      const a = cell.app;
      console.log(`\n-- ${snr} dB ${noise}: ${a.voiced} voiced frames`);
      const line = (name, o) => console.log(`   ${name.padEnd(8)} wrong octave ${String(o.oct).padStart(5)} (${pct(o.oct, o.voiced).padStart(6)}) · up ${o.up} down ${o.down} · in runs of 1–4 ${o.r1}, 5–15 ${o.r5}, 16+ ${o.r16} · ${o.runs} runs, longest ${o.longest} · after a steady pitch ${o.afterSteady}, not ${o.noSteady} (note start ${o.noteStart}, after a dropout ${o.gap}, after another wrong reading ${o.wrongBefore})`);
      line('app', a); cell.rules.forEach((o, i) => line(`rule ${i + 1}`, o));
    }
    // leaps, clean and in each noise at 20 and 10 dB
    console.log('\n-- leaps (ms until on the new note and staying 5 frames)');
    const LEAPS = [[57, 69], [69, 57], [69, 62], [62, 69], [50, 62], [74, 62]];
    for (const lp of LEAPS) for (const nz of [null, ...SNRS.flatMap(s => NOISES.map(n => [n, s]))]) {
      const r = await page.evaluate(TRACK, { leap: lp, noise: nz && nz[0], snr: nz && nz[1], sets: SETS });
      const row = { leap: lp, noise: nz ? `${nz[1]} dB ${nz[0]}` : 'clean', app: leapMs(r.noisy, lp[1]), rules: r.rules.map(o => leapMs(o, lp[1])) };
      res.leaps.push(row);
      console.log(`   ${lp[0]}→${lp[1]} ${row.noise.padEnd(13)} app ${row.app} ms · ${row.rules.map((m, i) => `rule ${i + 1} ${m}`).join(' · ')}`);
    }
    // the tools' windows (≥25 % lost to octave errors), app vs rule 1, at 10 and 20 dB
    console.log('\n-- the tools\' windows losing ≥25 % / ≥50 % of their voiced frames to octave errors (app → rule 1)');
    for (const cell of res.cells) for (const k of Object.keys(W)) {
      const a = cell.appW[k], r = cell.rulesW[0][k];
      res.tools.push({ snr: cell.snr, noise: cell.noise, tool: k, app: a, rule: r });
      console.log(`   ${cell.snr} dB ${cell.noise.padEnd(6)} ${k.slice(0, 60).padEnd(60)} ${a.w25}/${a.w50} → ${r.w25}/${r.w50} of ${a.wins}`);
    }
  } finally { await b.close(); }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('\ndone');
})().catch(e => { console.error(e); process.exit(1); });
