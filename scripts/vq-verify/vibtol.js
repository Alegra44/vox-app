// The shared vibrato-tolerance helper (deploy/index.html: VIB_TOL … makeVibratoTolerantLive), tested in isolation on
// pitch traces of known shape at 60 readings/s, each read through a simulated 2048-sample detector window (the swing
// shrunk by sin(x)/x as the real detector does). Checks: vibrato in the 4–8 Hz band up to ±150 ct is tolerated (the
// scored cents sit on the centre line); flutter, too-wide swings, slow wander, drift and wrong notes are still scored
// as read. Usage: node scripts/vq-verify/vibtol.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../../deploy/index.html'), 'utf8');
const a = html.indexOf('const VIB_TOL'), z = html.indexOf('function makeVibratoTolerantLive'), m = /\r?\n}\r?\n/.exec(html.slice(z));
if (a < 0 || z < 0 || !m) throw new Error('helper not found in deploy/index.html');
const b = z + m.index + m[0].length;
const H = new Function(html.slice(a, b) + '\nreturn {VIB_TOL, vibratoGate, vibratoTolerantCents, makeVibratoTolerantLive};')();

let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const WIN = 2048 / 48000, sh = f => { const x = Math.PI * f * WIN; return x ? Math.sin(x) / x : 1; };
// trace(ms, fn(tSec) → cents components {vib:[rate, ext], ...}) at 60 fps with ±1.5 ms frame jitter and ~1.5 ct detector noise
function trace(ms, parts) {
  const out = []; let walk = 0;
  for (let t = 0; t <= ms; t += 1000 / 60) {
    const tt = t + (rnd() - 0.5) * 3, s = tt / 1000; let c = parts.offset || 0;
    for (const [rate, ext, ph = 0] of parts.sines || []) c += ext * sh(rate) * Math.sin(2 * Math.PI * rate * s + ph);
    if (parts.drift) c += parts.drift * s;
    if (parts.walk) { walk += gauss() * parts.walk; c += walk; }
    if (parts.rateGlide) { const [r0, r1, ext] = parts.rateGlide; const ph = 2 * Math.PI * (r0 * s + (r1 - r0) * s * s / (2 * ms / 1000)); c += ext * sh((r0 + r1) / 2) * Math.sin(ph); }
    c += gauss() * 1.5;
    out.push({ t: tt, c });
  }
  return out;
}
const meanAbs = a => a.reduce((s, x) => s + Math.abs(x), 0) / a.length;
const score = (a, m = 0.6) => Math.max(0, Math.round(100 - meanAbs(a) * m));

// [name, trace, expect vibrato?]
const C = [];
for (const rate of [4.2, 5, 6, 7, 7.8]) for (const ext of [25, 50, 100, 150]) C.push([`vibrato ${rate} Hz ±${ext}`, { sines: [[rate, ext]] }, true]);
C.push(['vibrato 6 Hz ±50, rate glides 5→7 Hz', { rateGlide: [5, 7, 50] }, true]);
C.push(['vibrato 6 Hz ±50 + 40 ct/s drift', { sines: [[6, 50]], drift: 40 }, true]);
C.push(['vibrato 5.5 Hz ±60, centred 40 ct sharp', { sines: [[5.5, 60]], offset: 40 }, true]);
C.push(['vibrato 6 Hz ±80 + 11 Hz ±8 flutter', { sines: [[6, 80], [11, 8]] }, true]);
C.push(['straight, dead on', {}, false]);
C.push(['straight, 35 ct sharp (wrong note)', { offset: 35 }, false]);
C.push(['straight, 60 ct flat (wrong note)', { offset: -60 }, false]);
C.push(['flutter 11 Hz ±40', { sines: [[11, 40]] }, false]);
C.push(['flutter 13 Hz ±60', { sines: [[13, 60]] }, false]);
C.push(['too wide: 6 Hz ±220', { sines: [[6, 220]] }, false]);
C.push(['too wide: 5 Hz ±190', { sines: [[5, 190]] }, false]);
C.push(['too slow: 2.5 Hz ±80 wobble', { sines: [[2.5, 80]] }, false]);
C.push(['too slow: 3.3 Hz ±60 wobble', { sines: [[3.3, 60]] }, false]);
C.push(['wandering pitch (random walk)', { walk: 6 }, 'score']); // 'score': the gate may call it either way; the score must not rise
C.push(['slow drift 60 ct/s', { drift: 60, offset: -45 }, false]);
C.push(['irregular: 3 incommensurate swings 2.3/5.1/9.7 Hz ±45', { sines: [[2.3, 45], [5.1, 45, 1], [9.7, 45, 2]] }, false]);

let pass = 0, fail = 0;
const line = (ok, s) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${s}`); };
for (const ms of [1600, 650, 3300]) {
  console.log(`\n== ${ms} ms notes (score: 100 − mean|cents|×0.6, before → after)`);
  for (const [name, spec, expect] of C) {
    if (ms === 650 && /slow|glide|drift|walk|wander/.test(name)) continue; // a 650 ms note can't show a slow trend
    const tr = trace(ms, spec), g = H.vibratoGate(tr), tol = H.vibratoTolerantCents(tr);
    const before = score(tr.map(p => p.c)), after = score(tol);
    const centreAt = t => (spec.offset || 0) + (spec.drift || 0) * t / 1000, centreErr = meanAbs(tol.map((c, i) => c - centreAt(tr[i].t)));
    let ok = expect === 'score' ? after <= before + 1 : g.vibrato === expect;
    // tolerated: the scored cents stay within 12 ct of the true centre on average. Not tolerated: scored exactly as read.
    if (expect === true) ok = ok && centreErr <= 12 && (!spec.drift || after < 100); else if (expect === false) ok = ok && tol.every((c, i) => c === tr[i].c);
    line(ok, `${name.padEnd(52)} gate ${g.vibrato ? 'vibrato' : 'as read'} (${g.rateHz ? g.rateHz.toFixed(1) + ' Hz' : '—'}, r ${g.periodicity ? g.periodicity.toFixed(2) : '—'}, ±${g.depth ? Math.round(g.depth) : '—'})  score ${before} → ${after}`);
  }
}
// Live form: frame by frame, as Real-Time Feedback / Tuner / Stay in Key use it; share of frames within ±8 ct after 0.5 s.
console.log('\n== live, per frame (share within ±8 ct of the centre after the first 0.5 s; within ±35 for Stay in Key)');
for (const [name, spec, expect, band] of [['vibrato 6 Hz ±50', { sines: [[6, 50]] }, true, 8], ['vibrato 5 Hz ±100', { sines: [[5, 100]] }, true, 8], ['vibrato 7.5 Hz ±150', { sines: [[7.5, 150]] }, true, 35],
  ['flutter 11 Hz ±40', { sines: [[11, 40]] }, false, 8], ['straight 35 ct sharp', { offset: 35 }, false, 8], ['too wide 6 Hz ±220', { sines: [[6, 220]] }, false, 35]]) {
  const tr = trace(4000, spec), live = H.makeVibratoTolerantLive(), off = spec.offset || 0;
  const v = tr.map(p => ({ t: p.t, c: live(p.t, p.c) })).filter(p => p.t > 500);
  const inBand = Math.round(100 * v.filter(p => Math.abs(p.c - off) <= band).length / v.length);
  const raw = Math.round(100 * tr.filter(p => p.t > 500 && Math.abs(p.c - off) <= band).length / v.length);
  const inTune = Math.round(100 * v.filter(p => Math.abs(p.c) <= band).length / v.length);
  const ok = expect ? inBand >= 95 : inTune <= Math.max(raw, 5) + 5 && (off ? inTune === 0 : true);
  line(ok, `${name.padEnd(28)} within ±${band} of centre: raw ${raw}% → live ${inBand}%   "in tune" (±${band} of target) ${inTune}%`);
}
// A silence resets the live buffer; a new note isn't averaged with the previous one.
{ const live = H.makeVibratoTolerantLive(); let t = 0, last;
  for (; t < 1500; t += 1000 / 60) live(t, 50 * Math.sin(2 * Math.PI * 6 * t / 1000));
  live(t + 100, null); t += 400; last = live(t, 300);
  line(last === 300, `live: after a 400 ms silence the next reading is its own (${Math.round(last)} ct, expected 300)`); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
