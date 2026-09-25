// Vocal Load Dosimetry engine (deploy/vocal-load.js), verified in isolation against synthetic frame sequences of known
// RMS and pitch. Every expected value below is a literal worked out by hand (the arithmetic is in the comments), not
// computed with the engine's formulas. Frames run at 60 per second (dt = 1/60 s) unless a case says otherwise, as the
// app's analysis loop does.
// Usage: node scripts/vocal-load-verify/verify.js
const V = require('../../deploy/vocal-load.js');
const hz = m => 440 * Math.pow(2, (m - 69) / 12); // test side: midi → Hz for the synthetic f0
let pass = 0, fail = 0;
const fmt = x => x == null ? '—' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')) : String(x);
function check(label, expected, actual, tol = 1e-9) {
  const ok = expected === null || typeof expected === 'string' ? expected === actual
    : Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected));
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(44)} expected ${fmt(expected).padStart(12)}   got ${fmt(actual).padStart(12)}`);
}
// One second of singing (or silence) as 60 frames; returns the state after its last frame.
function second(s, rms, midi) {
  let st;
  for (let i = 0; i < 60; i++) st = s.push({ dt: 1 / 60, rms, f0: midi == null ? -1 : hz(midi) });
  return st;
}
// Runs per-second steps [rms, midi, expectedRate (0 = inactive), expectedCumulative] and prints each against the engine;
// returns the session summary. A frame's pitch is decided 9 frames late (the slip check looks ahead), so each active
// second's rate and the cumulative load after it are read from its block as it becomes final (onBlock); an inactive
// second is checked through the load after its last frame (by then the frames before it are decided), and the number
// of blocks must equal the number of active seconds.
function steps(baseline, rows, opts = {}) {
  const got = [], after = [];
  const s = V.createSession(baseline, { ...opts, onBlock: b => got.push(b) });
  for (const [rms, midi] of rows) after.push(second(s, rms, midi).load);
  const f = s.finish();
  let k = 0;
  rows.forEach(([rms, midi, er, ec, note], i) => {
    const b = er > 0 ? got[k++] : null;
    const rate = er > 0 ? (b ? b.rate : NaN) : 0, cum = er > 0 ? (b ? b.load : NaN) : after[i];
    const ok = Math.abs(rate - er) <= 1e-9 * Math.max(1, er) && Math.abs(cum - ec) <= 1e-9 * Math.max(1, ec);
    ok ? pass++ : fail++;
    console.log(`  ${ok ? '✓' : '✗'} s${String(i + 1).padEnd(3)} rms ${String(rms).padEnd(6)} pitch ${midi == null ? 'none ' : String(midi).padEnd(5)}  load_rate expected ${fmt(er).padStart(8)} got ${(er > 0 ? fmt(rate) : 'no block').padStart(8)}   cumulative expected ${fmt(ec).padStart(8)} got ${fmt(cum).padStart(8)}${note ? '   ' + note : ''}`);
  });
  check('  blocks = active seconds', k, got.length);
  return f;
}

// Baseline A: RMS 0.05, range C3–C5 (48–72). Passaggio = 48 + 0.6 × 24 = 62.4; pitch_ratio = (m − 48) / 14.4.
const A = { rms: 0.05, low: 48, high: 72, passaggio: 62.4 };

console.log('\n== 1. Per-second load_rate and cumulative load, baseline A (RMS 0.05, C3–C5, passaggio 62.4)');
{
  const f = steps(A, [
    [0.05, 55.2, 1.5, 1.5, 'lr 1, pr 7.2/14.4 = 0.5 → 1 × 1.5'],
    [0.10, 55.2, 3.0, 4.5, 'lr 2, pr 0.5 → 2 × 1.5'],
    [0.025, 62.4, 2.0, 6.5, 'lr 0.5 → floored to 1, pr 1 (at the passaggio) → 1 × 2'],
    [0.003, null, 0, 6.5, 'silence: below the floor max(0.008, 0.1 × 0.05) = 0.008'],
    [0.004, null, 0, 6.5, 'unpitched and quiet'],
    [0.075, 72, 4.0, 10.5, 'lr 1.5, pr 24/14.4 = 1.6667 → 1.5 × 8/3'],
    [0.05, 40, 1.0, 11.5, 'below the range: pr floored to 0 → 1 × 1'],
    [0.20, 69.6, 10.0, 21.5, 'lr 4, pr 21.6/14.4 = 1.5 → 4 × 2.5'],
    [0.006, 60, 0, 21.5, 'pitched but under the 0.008 floor'],
    [0.009, 48, 1.0, 22.5, 'just over the floor; lr 0.18 → 1, pr 0'],
  ]);
  check('active seconds (s1–3, 6–8, 10)', 7, f.activeSeconds);
  check('session load', 22.5, f.load);
  check('% of daily budget: 22.5 / 6800 × 100', 0.330882352941, f.sessionPercent);
}

console.log('\n== 2. The silence floor follows the baseline: baseline RMS 0.2 → floor max(0.008, 0.02) = 0.02');
{
  steps({ ...A, rms: 0.2 }, [
    [0.015, 62.4, 0, 0, 'pitched, but under 0.02: not singing for this singer'],
    [0.025, 62.4, 2.0, 2.0, 'over the floor; lr 0.125 → 1, pr 1'],
    [0.0201, 48, 1.0, 3.0, 'just over the floor; pr 0'],
  ]);
}

console.log('\n== 3. Frame-level integration and block aggregation (60 frames/s)');
{
  const s = V.createSession(A);
  let st;
  for (let i = 0; i < 90; i++) st = s.push({ dt: 1 / 60, rms: 0.1, f0: hz(62.4) });
  // lr 2, pr 1 → rate 4. After 1.5 s: one closed block (4) + half a block at rate 4 (2).
  check('rate 4 for 1.5 s: load', 6.0, st.load);
  for (let i = 0; i < 90; i++) st = s.push({ dt: 1 / 60, rms: 0.1, f0: hz(62.4) });
  check('rate 4 for 3 s: load', 12.0, st.load);
  st = s.push({ dt: 5, rms: 0.05, f0: hz(62.4) });
  // a 5 s gap (tab in the background) counts 0.1 s: rate 1 × 2 → +0.2
  check('then a 5 s frame gap, counted as 0.1 s at rate 2', 12.2, st.load);
  check('active seconds', 3.1, st.activeSeconds);
}
{
  // One second: 30 frames at RMS 0.1 / pitch 55.2, then 30 at RMS 0.02 / pitch 69.6.
  // Block RMS = √((0.1² + 0.02²) / 2) = √0.0052 = 0.0721110; lr = 1.4422205. Block pitch = (55.2 + 69.6)/2 = 62.4 → pr 1.
  // load_rate = 1.4422205 × 2 = 2.8844410. (Per-frame ratios would give ((2 × 1.5) + (1 × 2.5))/2 = 2.75: the block is
  // the singer's second, not an average of its frames.)
  let rate = null;
  const s = V.createSession(A, { onBlock: b => { rate = b.rate; } });
  for (let i = 0; i < 60; i++) s.push({ dt: 1 / 60, rms: i < 30 ? 0.1 : 0.02, f0: hz(i < 30 ? 55.2 : 69.6) });
  s.finish();
  check('mixed second: block load_rate', 2.884441020371, rate);
}

console.log('\n== 4. Pitch dropouts: held for 0.25 s at singing level (frames of 1/16 s, all RMS 0.05 at 62.4 → rate 2)');
{
  const s = V.createSession(A);
  const fr = (n, rms, pitched) => { let st; for (let i = 0; i < n; i++) st = s.push({ dt: 1 / 16, rms, f0: pitched ? hz(62.4) : -1 }); return st; };
  fr(8, 0.05, true);
  // 6 unpitched frames start 0, 1/16, 2/16, 3/16, 4/16, 5/16 s after the last pitched one: the first 4 (< 0.25 s) are held
  let st = fr(6, 0.05, false);
  check('8 pitched + 4 held (of 6 unpitched): active s', 0.75, st.activeSeconds);
  check('  load = 0.75 × 2', 1.5, st.load);
  fr(8, 0.05, true);
  st = fr(1, 0.004, false);
  check('held but quiet (0.004) is not active: active s', 1.25, st.activeSeconds);
  st = fr(1, 0.05, false);
  check('held at singing level: active s', 1.3125, st.activeSeconds);
  check('  load = 1.3125 × 2', 2.625, s.finish().load);
}

console.log('\n== 5. New user: no history → A2–C5 (passaggio 45 + 0.6 × 27 = 61.2), 30 s calibration at loudness_ratio 1');
{
  const b = V.computeBaseline([], null);
  check('baseline RMS', null, b.rms);
  check('range source', 'default', b.rangeSource);
  check('passaggio', 61.2, b.passaggio);
  // pitch_ratio = (m − 45) / 16.2. Calibration blocks: 10 × 0.03, 11 × 0.05, 9 × 0.08 → sorted, the 15th of 30 is 0.05.
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push([0.03, 61.2, 2.0, 2 * (i + 1), i ? '' : 'calibrating: lr 1, pr 1 → 2']);
  rows.push([0.004, 61.2, 0, 20, 'silence doesn\'t count toward calibration']);
  for (let i = 0; i < 11; i++) rows.push([0.05, 61.2, 2.0, 20 + 2 * (i + 1), '']);
  for (let i = 0; i < 9; i++) rows.push([0.08, 61.2, 2.0, 42 + 2 * (i + 1), i === 8 ? '30th active second: baseline = median 0.05' : '']);
  rows.push([0.10, 61.2, 4.0, 64, 'lr 0.1/0.05 = 2, pr 1']);
  rows.push([0.05, 45, 1.0, 65, 'bottom of the range: pr 0']);
  rows.push([0.075, 72, 4.0, 69, 'lr 1.5, pr 27/16.2 = 1.6667 → 1.5 × 8/3']);
  rows.push([0.006, 61.2, 0, 69, 'floor now max(0.008, 0.005) = 0.008']);
  const f = steps(b, rows);
  check('baseline RMS after calibration', 0.05, f.baselineRms);
  check('active seconds', 33, f.activeSeconds);
  check('session load', 69, f.load);
  check('% of budget: 69 / 6800 × 100', 1.014705882353, f.sessionPercent);
  // summary for the rolling baseline: block RMS 10×0.03, 12×0.05, 0.075, 9×0.08, 0.1 → the 16.5th of 33 is 0.05;
  // pitch 45, 31 × 61.2, 72 → the 5th and 95th percentiles (1.65th, 31.35th of 33) are both 61.2
  check('summary median RMS', 0.05, f.medianRms);
  check('summary 5th percentile pitch', 61.2, f.p5Midi);
  check('summary 95th percentile pitch', 61.2, f.p95Midi);
}

console.log('\n== 6. Rolling baseline from session summaries (oldest first)');
{
  const S = (activeSeconds, medianRms, p5Midi, p95Midi) => ({ activeSeconds, medianRms, p5Midi, p95Midi });
  // 7 sessions; S2 has under 60 active seconds and is skipped; the last 5 qualifying are S3–S7.
  // RMS: median(0.04, 0.06, 0.05, 0.03, 0.07) = 0.05. Range: min p5 = 47, max p95 = 71; passaggio 47 + 0.6 × 24 = 61.4.
  let b = V.computeBaseline([S(300, 0.02, 40, 60), S(45, 0.5, 30, 90), S(600, 0.04, 50, 68), S(400, 0.06, 47, 70), S(900, 0.05, 49, 71), S(120, 0.03, 52, 66), S(200, 0.07, 48, 69)], { lowMidi: 40, highMidi: 80 });
  check('a. 7 sessions: sessions used', 5, b.sessionsUsed);
  check('   RMS = median of the last 5 qualifying', 0.05, b.rms);
  check('   range source (sessions win over Range Finder)', 'sessions', b.rangeSource);
  check('   low = min p5', 47, b.low); check('   high = max p95', 71, b.high); check('   passaggio', 61.4, b.passaggio);
  // 2 sessions (< 3 for a range): RMS (0.04 + 0.07)/2 = 0.055; range from the Range Finder 43–76 → 43 + 0.6 × 33 = 62.8
  b = V.computeBaseline([S(600, 0.04, 50, 68), S(400, 0.07, 47, 70)], { lowMidi: 43, highMidi: 76 });
  check('b. 2 sessions + Range Finder: RMS', 0.055, b.rms);
  check('   range source', 'rangeFinder', b.rangeSource); check('   passaggio', 62.8, b.passaggio);
  // 3 sessions spanning 55–62 (7 semitones < 12) and no Range Finder → default A2–C5; RMS median(0.03, 0.05, 0.04) = 0.04
  b = V.computeBaseline([S(100, 0.03, 55, 62), S(100, 0.05, 56, 61), S(100, 0.04, 55, 60)], null);
  check('c. narrow sessions: RMS', 0.04, b.rms);
  check('   range source', 'default', b.rangeSource); check('   passaggio', 61.2, b.passaggio);
  // Range Finder spanning 60–65 (5 semitones) is not trusted either
  b = V.computeBaseline([], { lowMidi: 60, highMidi: 65 });
  check('d. narrow Range Finder only: range source', 'default', b.rangeSource);
  check('   RMS (none: calibrate)', null, b.rms);
}

console.log('\n== 7. Daily budget (6800 load-seconds), steady reference: RMS at the baseline, mid-range pitch 60 → pr 12/14.4, rate 11/6');
{
  const s = V.createSession(A);
  let st;
  for (let i = 1; i <= 3600; i++) { st = second(s, 0.05, 60); if (i === 1800) { check('30 min: load = 1800 × 11/6', 3300, st.load, 1e-9); check('30 min: % = 3300 / 6800', 48.529411764706, st.percentOfDay, 1e-9); } }
  check('60 min: load = 3600 × 11/6', 6600, st.load, 1e-9);
  check('60 min: % = 6600 / 6800', 97.058823529412, st.percentOfDay, 1e-9);
  // Today's earlier sessions count: 3500 already + 1800 s × 11/6 = 3300 → 6800 = 100%
  const s2 = V.createSession(A, { priorLoadToday: 3500 });
  for (let i = 0; i < 1800; i++) st = second(s2, 0.05, 60);
  check('prior 3500 + 30 min: % of the day', 100, st.percentOfDay, 1e-9);
}

console.log('\n== 8. "Typical" singing, simulated (seeded): each sung second has a level 3 dB s.d. around the baseline and a pitch');
console.log('   uniform in the middle 60% of the range (52.8–67.2); expected values from the budget\'s derivation, not per step:');
console.log('   E[lr] = 0.5 + e^(σ²/2)·Φ(σ), σ = 0.345388 → 1.174133; E[1 + pr] = 1 + 12/14.4 = 1.833333; E[rate] = 2.152577');
{
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const sung = s => second(s, 0.05 * Math.pow(10, 3 * gauss() / 20), 52.8 + 14.4 * rnd());
  let s = V.createSession(A), st;
  for (let i = 0; i < 3150; i++) st = sung(s);
  check('52.5 min continuous: load ≈ 3150 × 2.152577', 6780.62, st.load, 0.015);
  check('   % of budget ≈ 6780.62 / 6800', 99.715, st.percentOfDay, 0.015);
  let f = s.finish();
  check('   summary median RMS ≈ baseline', 0.05, f.medianRms, 0.02);
  check('   summary p5 pitch ≈ 52.8 + 0.05 × 14.4', 53.52, f.p5Midi, 0.005);
  check('   summary p95 pitch ≈ 52.8 + 0.95 × 14.4', 66.48, f.p95Midi, 0.005);
  // A 45-minute rehearsal, 4 s phrases with 2 s rests (room noise RMS 0.002, no pitch): 450 × 4 = 1800 active seconds
  s = V.createSession(A);
  for (let c = 0; c < 450; c++) { for (let k = 0; k < 4; k++) st = sung(s); for (let k = 0; k < 2; k++) st = second(s, 0.002, null); }
  check('45 min wall clock, ⅓ rests: active seconds', 1800, st.activeSeconds, 1e-9);
  check('   load ≈ 1800 × 2.152577', 3874.64, st.load, 0.015);
  check('   % of budget ≈ 3874.64 / 6800', 56.98, st.percentOfDay, 0.015);
}

console.log('\n== 9. Pitch-detector slips (octave / fifth errors), baseline A. A real note at C3+2 = 50: pr 2/14.4 = 0.138889, rate 1.138889');
{
  // One or more seconds of 60 frames; frame i gets pitch pitchAt(i) (null = unpitched) and RMS rmsAt(i). Returns the block rates.
  const run = (n, pitchAt, rmsAt = () => 0.05) => {
    const rates = [], s = V.createSession(A, { onBlock: b => rates.push(b.rate) });
    for (let i = 0; i < 60 * n; i++) { const m = pitchAt(i); s.push({ dt: 1 / 60, rms: rmsAt(i), f0: m == null ? -1 : hz(m) }); }
    return { rates, f: s.finish() };
  };
  // 5 frames (25–29) read an octave up (62). Rejected → unpitched → held on 50: rate unchanged. Kept, they'd give a mean
  // pitch of (55 × 50 + 5 × 62)/60 = 51 → pr 3/14.4 → 1.208333.
  let r = run(1, i => i >= 25 && i < 30 ? 62 : 50);
  check('a. 5 frames an octave up: rate (not 1.208333)', 1.138888888889, r.rates[0]);
  check('   still 1 s of singing (held, not dropped)', 1, r.f.activeSeconds);
  r = run(1, i => i >= 25 && i < 30 ? 38 : 50);
  check('b. 5 frames an octave down: rate (not 1.069444)', 1.138888888889, r.rates[0]); // kept: mean 49 → pr 1/14.4
  r = run(1, i => i >= 25 && i < 30 ? 57 : 50);
  check('c. 5 frames a fifth up (7 st): rate', 1.138888888889, r.rates[0]);
  r = run(1, i => i >= 25 && i < 34 ? 62 : 50);
  check('d. 9 frames (0.15 s) an octave up: rate', 1.138888888889, r.rates[0]);
  // The limit: 10 frames are the majority of their own 19-frame window, so they read as a real note:
  // mean (50 × 50 + 10 × 62)/60 = 52 → pr 4/14.4 = 0.277778 → 1.277778.
  r = run(1, i => i >= 25 && i < 35 ? 62 : 50);
  check('e. 10 frames an octave up (the limit): kept', 1.277777777778, r.rates[0]);
  // A real octave leap is not delayed: 1 s at 50 → 1.138889, then 1 s at 62 → pr 14/14.4 → 1.972222; total 3.111111.
  r = run(2, i => i < 60 ? 50 : 62);
  check('f. real leap 50 → 62: first second', 1.138888888889, r.rates[0]);
  check('   second second (no frames lost to the check)', 1.972222222222, r.rates[1]);
  check('   total', 3.111111111111, r.f.load);
}

console.log('\n== 10. Loudness cap: loudness_ratio ≤ 4 (+12.0 dB), baseline A, pitch 55.2 (1 + pr = 1.5)');
{
  steps(A, [
    [0.7, 55.2, 6.0, 6.0, 'clipped buffer: 0.7/0.05 = 14 → capped at 4 → 4 × 1.5 (uncapped 21)'],
    [0.05, 55.2, 1.5, 7.5, 'back to normal: lr 1'],
    [0.19, 55.2, 5.7, 13.2, 'under the cap: 3.8 × 1.5'],
  ]);
  // A mic bump mid-note: frames 27–32 (0.1 s) at RMS 1.0 with no pitch, held on 55.2 (within 0.25 s of the note).
  // Block RMS = √((54 × 0.05² + 6 × 1²)/60) = √(6.135/60) = 0.319766 → 6.395 → capped at 4 → 6.0 (uncapped 9.592962).
  let rate = null;
  const s = V.createSession(A, { onBlock: b => { rate = b.rate; } });
  for (let i = 0; i < 60; i++) { const bump = i >= 27 && i < 33; s.push({ dt: 1 / 60, rms: bump ? 1.0 : 0.05, f0: bump ? -1 : hz(55.2) }); }
  s.finish();
  check('bump mid-note: rate (uncapped 9.592962)', 6.0, rate);
  steps(A, [
    [0.003, null, 0, 0, 'silence'],
    [1.0, null, 0, 0, 'a bump / cough with nothing sung before it: unpitched, nothing to hold → not singing'],
  ]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
