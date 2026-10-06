// Scores candidate "someone is singing" gates on frames.json from gate.js.
// noise-*: % of frames a gate still passes, and phantom notes (≥300 ms runs of passed frames within ±50 ct of their median,
// which Choir World / Pitch Match would score as a held note). sing-* / mix-*: % of today's voiced frames the gate keeps.
const fs = require('fs'), path = require('path'), os = require('os');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
const F = JSON.parse(fs.readFileSync(path.join(TESTDATA, 'gate', 'frames.json')));
const cents = f => 1200 * Math.log2(f / 440);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
// continuity: keep a voiced frame only when it sits in a run (gaps ≤ 60 ms, frame-to-frame jump ≤ JUMP ct) lasting ≥ D ms
function runs(fr, ok, JUMP = 100) {
  const out = []; let cur = [];
  fr.forEach((x, i) => {
    if (!ok[i]) return;
    const p = cur[cur.length - 1];
    if (p !== undefined && (x.t - fr[p].t > 60 || Math.abs(cents(x.f) - cents(fr[p].f)) > JUMP)) { out.push(cur); cur = []; }
    cur.push(i);
  });
  if (cur.length) out.push(cur); return out;
}
function cont(fr, ok, D) { const keep = fr.map(() => false); for (const r of runs(fr, ok)) if (fr[r[r.length - 1]].t - fr[r[0]].t >= D) r.forEach(i => keep[i] = true); return keep; }
function phantom(fr, ok) { // held notes found in 1 s windows, as a note-length grader would
  let n = 0; for (let t0 = 0; t0 + 1000 <= 12000; t0 += 1000) {
    const c = fr.map((x, i) => i).filter(i => ok[i] && fr[i].t >= t0 && fr[i].t < t0 + 1000).map(i => cents(fr[i].f));
    if (c.length < 18) continue; const m = med(c); if (c.filter(x => Math.abs(x - m) <= 50).length >= 0.5 * c.length) n++;
  } return n; // out of 12
}
const floorOf = key => { const m = key.match(/^mix-\w+-(\w+)-10\|(\w+)/) || key.match(/^noise-(\w+)-(\d+)\|(\w+)/); if (!m) return null;
  const k = key.startsWith('mix') ? `noise-${m[1]}-10|${m[2]}` : key; const fr = F[k]; return fr ? med(fr.map(x => x.rms)) : null; };
const GATES = process.env.FIXA ? {
  'today (rms ≥ 0.008)': (fr) => fr.map(x => x.f > 0),
  'fix A (clar ≥ 0.6, f ≥ 63)': fr => fr.map(x => x.f >= 63 && x.clar >= 0.6),
} : {
  'today (rms ≥ 0.008)': (fr) => fr.map(x => x.f > 0),
  'clarity ≥ 0.6': fr => fr.map(x => x.f > 0 && x.clar >= 0.6),
  'clarity ≥ 0.8': fr => fr.map(x => x.f > 0 && x.clar >= 0.8),
  'clarity ≥ 0.9': fr => fr.map(x => x.f > 0 && x.clar >= 0.9),
  'held ≥ 250 ms': fr => cont(fr, fr.map(x => x.f > 0), 250),
  'clar ≥ 0.8 + held 250': fr => cont(fr, fr.map(x => x.f > 0 && x.clar >= 0.8), 250),
  'clar ≥ 0.8 + held 400': fr => cont(fr, fr.map(x => x.f > 0 && x.clar >= 0.8), 400),
  'room floor ×2 (6 dB)': (fr, key) => { const fl = floorOf(key); return fr.map(x => x.f > 0 && (fl === null || x.rms >= 2 * fl)); },
  'clar 0.8 + held 250 + floor ×2': (fr, key) => { const fl = floorOf(key); return cont(fr, fr.map(x => x.f > 0 && x.clar >= 0.8 && (fl === null || x.rms >= 2 * fl)), 250); },
};
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const pth = process.argv[2] || 'shared';
const keys = Object.keys(F).filter(k => k.endsWith('|' + pth)).sort();
const rows = [];
for (const k of keys) {
  const fr = F[k], base = fr.filter(x => x.f > 0).length, row = { k: k.split('|')[0] };
  for (const [g, fn] of Object.entries(GATES)) { const ok = fn(fr, k), n = ok.filter(Boolean).length;
    row[g] = k.startsWith('noise') || k.startsWith('silence') ? `${pct(n, fr.length)}% ph${phantom(fr, ok)}` : `${pct(n, base)}%`; }
  row.base = pct(base, fr.length) + '%'; rows.push(row);
}
const gs = Object.keys(GATES);
console.log(['stimulus', 'voiced now', ...gs].join(' | '));
for (const r of rows) console.log([r.k, r.base, ...gs.map(g => r[g])].join(' | '));
// Glider: octave errors in singing over noise (sustained notes only): voiced frames > 600 ct from the clean take's median
if (process.env.FIXA) {
  console.log('\noctave errors (frames >600 ct off the clean note, % of voiced; and jumps >600 ct between voiced frames)');
  for (const k of keys.filter(k => /^mix-(S|V)\d/.test(k))) {
    const s = k.match(/^mix-(\w+?)-/)[1], clean = F[`sing-${s}|${pth}`]; if (!clean) continue;
    const ref = med(clean.filter(x => x.f > 0).map(x => cents(x.f)));
    const m = ok => { const v = F[k].filter((x, i) => ok[i]); const off = v.filter(x => Math.abs(cents(x.f) - ref) > 600).length;
      let j = 0; for (let i = 1; i < v.length; i++) if (Math.abs(cents(v[i].f) - cents(v[i - 1].f)) > 600) j++; return `${pct(off, v.length)}% (${j} jumps)`; };
    console.log(`   ${k.split('|')[0].padEnd(22)} today ${m(F[k].map(x => x.f > 0))}  →  fix A ${m(F[k].map(x => x.f >= 63 && x.clar >= 0.6))}`);
  }
}
// clarity distribution: noise vs singing
const dist = pre => { const v = keys.filter(k => k.startsWith(pre)).flatMap(k => F[k].filter(x => x.f > 0).map(x => x.clar)).sort((a, b) => a - b); return [10, 50, 90].map(p => v[Math.floor(v.length * p / 100)]); };
console.log('clarity p10/p50/p90  noise:', dist('noise').join('/'), ' sing:', dist('sing').join('/'), ' mix:', dist('mix').join('/'));
