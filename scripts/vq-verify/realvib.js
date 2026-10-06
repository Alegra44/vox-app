// Real singing through the vibrato-tolerance helper, offline: VocalSet clips (Wilkins et al. 2018, CC BY 4.0,
// doi:10.5281/zenodo.1442513, via the Hugging Face mirror Bill13579/vocalset-mirror) labelled vibrato / straight / trill.
// Each clip is read with the app's own autoCorrelate (2048 samples, 60 readings/s, as the analyser loop does), split
// into sustained notes (≥ 700 ms whose 250 ms-smoothed pitch stays within ±50 ct of the note's median), and each note is
// scored against its nearest semitone before (as read) and after (vibratoTolerantCents), with the gate's reading.
// Usage: node scripts/vq-verify/realvib.js [dir=$VOXCOACH_TESTDATA (~/VoxCoachTestData)/vocalset] [--json out.json]
const fs = require('fs'), path = require('path'), os = require('os');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(TESTDATA, 'vocalset');
const html = fs.readFileSync(path.resolve(__dirname, '../../deploy/index.html'), 'utf8');
const grab = (from, fn) => { const a = html.indexOf(from), z = html.indexOf(fn, a), m = /\r?\n}\r?\n/.exec(html.slice(z)); return html.slice(a, z + m.index + m[0].length); };
// the voicing gate's constants sit just above autoCorrelate (since the singing-detection gate); older pages have none
const H = new Function(grab(html.includes('const VOICE_MIN_CLARITY') ? 'const VOICE_MIN_CLARITY' : 'function autoCorrelate', 'function autoCorrelate') + grab('const VIB_TOL', 'function makeVibratoTolerantLive')
  + '\nreturn {autoCorrelate, vibratoGate, vibratoTolerantCents, makeVibratoTolerantLive, VIB_TOL};')();

function readWav(f) {
  const b = fs.readFileSync(f); let p = 12, fmt, data;
  while (p < b.length - 8) { const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4); if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) }; if (id === 'data') data = b.subarray(p + 8, p + 8 + n); p += 8 + n + (n & 1); }
  if (fmt.bits !== 16) throw new Error(f + ': not 16-bit');
  const N = data.length / 2 / fmt.ch, x = new Float32Array(N);
  for (let i = 0; i < N; i++) x[i] = data.readInt16LE(i * 2 * fmt.ch) / 32768;
  return { sr: fmt.sr, x };
}
function frames(w) {
  const out = [], hop = w.sr / 60;
  for (let s = 0; s + 2048 <= w.x.length; s += hop) { const i = Math.round(s), f = H.autoCorrelate(w.x.subarray(i, i + 2048), w.sr); out.push({ t: (i + 2048) / w.sr * 1000, midi: f > 0 && f >= 50 && f <= 1400 ? 69 + 12 * Math.log2(f / 440) : null }); }
  return out;
}
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function notes(fr) {
  const sm = fr.map((f, i) => { const w = fr.slice(Math.max(0, i - 7), i + 8).filter(x => x.midi !== null).map(x => x.midi); return f.midi === null || w.length < 5 ? null : median(w); });
  const out = []; let i = 0;
  while (i < fr.length) {
    if (sm[i] === null) { i++; continue; }
    let j = i, vals = [sm[i]];
    while (j + 1 < fr.length && (sm[j + 1] === null ? (fr[j + 1].t - fr[j].t < 60) : Math.abs(sm[j + 1] - median(vals)) <= 0.5)) { j++; if (sm[j] !== null) vals.push(sm[j]); }
    const seg = fr.slice(i, j + 1).filter(x => x.midi !== null);
    // trim 100 ms each end (the scoop in and out of the note), as Choir World skips the attack
    const t0 = fr[i].t + 100, t1 = fr[j].t - 100, core = seg.filter(x => x.t >= t0 && x.t <= t1);
    if (t1 - t0 >= 700 && core.length >= 0.8 * (t1 - t0) / (1000 / 60)) out.push({ t0: fr[i].t, dur: Math.round(t1 - t0), pts: core });
    i = j + 1;
  }
  return out;
}
const sc = (a, m) => Math.max(0, Math.round(100 - a.reduce((s, x) => s + Math.abs(x), 0) / a.length * m));
const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json')));
const rows = [];
for (const m of man) {
  const fr = frames(readWav(path.join(DIR, m.file)));
  for (const n of notes(fr)) {
    const target = Math.round(median(n.pts.map(p => p.midi)));
    // cents as the app's centsFromTarget gives them: folded into ±6 semitones (an octave slip reads near 0), then graders drop |c| ≥ 300
    const fold = d => { while (d > 6) d -= 12; while (d < -6) d += 12; return d * 100; };
    const pts = n.pts.map(p => ({ t: p.t, c: fold(p.midi - target) })).filter(p => Math.abs(p.c) < 300);
    const g = H.vibratoGate(pts), tol = H.vibratoTolerantCents(pts), raw = pts.map(p => p.c);
    const live = H.makeVibratoTolerantLive(), lv = pts.map(p => live(p.t, p.c));
    const centre = median(raw);
    rows.push({ file: m.file, label: m.label, t0: Math.round(n.t0), dur: n.dur, target, centre: Math.round(centre),
      gate: g.vibrato, rate: g.rateHz && +g.rateHz.toFixed(2), depth: g.depth && Math.round(g.depth), r: g.periodicity && +g.periodicity.toFixed(2),
      int: [sc(raw, 0.6), sc(tol, 0.6)], pro: [sc(raw, 0.9), sc(tol, 0.9)], ideal: [sc([centre], 0.6), sc([centre], 0.9)], // ideal: the note's centre alone
      // per-frame checks relative to where the singer centres the note (their own tuning offset left out)
      in35: [raw, lv].map(a => Math.round(100 * a.filter(c => Math.abs(c - centre) <= 35).length / a.length)),
      in8: [raw, lv].map(a => Math.round(100 * a.filter(c => Math.abs(c - centre) <= 8).length / a.length)) });
  }
}
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('clip', 18) + pad('t0', 7) + pad('ms', 6) + pad('ctr', 5) + pad('gate', 9) + pad('Hz', 6) + pad('±ct', 5) + pad('r', 6) + pad('int (ideal)', 16) + pad('pro (ideal)', 16) + pad('±35 frames', 12) + '±8 frames');
for (const r of rows) console.log(pad(r.file.replace('.wav', ''), 18) + pad(r.t0, 7) + pad(r.dur, 6) + pad(r.centre, 5) + pad(r.gate ? 'vibrato' : 'as read', 9) + pad(r.rate ?? '—', 6) + pad(r.depth ?? '—', 5) + pad(r.r ?? '—', 6) + pad(r.int.join('→') + ` (${r.ideal[0]})`, 16) + pad(r.pro.join('→') + ` (${r.ideal[1]})`, 16) + pad(r.in35.join('→') + '%', 12) + r.in8.join('→') + '%');
for (const lab of ['vibrato', 'straight', 'trill']) {
  const L = rows.filter(r => r.label === lab); if (!L.length) continue;
  const avg = f => Math.round(L.reduce((s, r) => s + f(r), 0) / L.length);
  console.log(`\n${lab}: ${L.length} notes from ${new Set(L.map(r => r.file)).size} clips; gated as vibrato ${L.filter(r => r.gate).length}; `
    + `int ${avg(r => r.int[0])}→${avg(r => r.int[1])} (centre-only ${avg(r => r.ideal[0])}), pro ${avg(r => r.pro[0])}→${avg(r => r.pro[1])} (centre-only ${avg(r => r.ideal[1])}), frames within ±35 of centre ${avg(r => r.in35[0])}→${avg(r => r.in35[1])}%, ±8 ${avg(r => r.in8[0])}→${avg(r => r.in8[1])}%`);
}
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(rows, null, 1));
