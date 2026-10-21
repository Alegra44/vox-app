// feat/single-stream 1.4: what the Tuner's stability feeds, master vs the branch, from tunerstab.js's readings (the
// page's own sessionStabilityReadings over a whole loop of each vibfix stimulus):
//   - per stimulus: the session average (shown, and recorded as the day's "stability" for the Voice Health trend) and the
//     share of readings ≥ 75;
//   - checkVocalHealthSignal's within-session drop (first half's mean − second half's; it warns at ≥ 12, the rule
//     copied from deploy/index.html): each stimulus alone, and sessions made of two stimuli one after the other
//     (readings concatenated): steady then wobbly (should warn as on master), wobbly then steady (must not);
//   - the Voice Health trend (recent 3 days − prior 3, warns below −10) sees the session averages: the mean shift per kind.
// Usage: node scripts/vq-verify/tunerstab-eval.js <tunerstab json>
const fs = require('fs');
const rows = JSON.parse(fs.readFileSync(process.argv[2]));
const KIND = { V1: 'vibrato', V2: 'vibrato', V3: 'vibrato', V4: 'vibrato', V5: 'vibrato', V6: 'vibrato', S1: 'straight', S2: 'straight',
  W1: 'wrong', W5: 'wrong', W2: 'wrong', N3: 'wrong', W3: 'wobbly', W4: 'wobbly', N1: 'wobbly', N2: 'wobbly', N4: 'wobbly' };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const drop = r => { if (r.length < 20) return null; const h = Math.floor(r.length / 2); return mean(r.slice(0, h)) - mean(r.slice(h)); };
const by = Object.fromEntries(rows.map(r => [r.id, r]));
const f1 = x => x == null ? '—' : x.toFixed(1);

console.log('per stimulus (median of runs): session average · share ≥ 75 · health drop alone (warns at ≥ 12)');
const shift = {};
for (const r of rows) {
  const cell = side => {
    const runs = r.runs[side].map(x => x.readings);
    return { avg: med(runs.map(mean)), hi: med(runs.map(x => x.length ? 100 * x.filter(v => v >= 75).length / x.length : null)), drop: med(runs.map(drop)) };
  };
  const a = cell('before'), b = cell('after');
  (shift[KIND[r.id]] = shift[KIND[r.id]] || []).push(b.avg - a.avg);
  console.log(`${r.id.padEnd(3)} ${KIND[r.id].padEnd(8)} master ${f1(a.avg).padStart(5)} · ${f1(a.hi).padStart(5)}% · ${f1(a.drop).padStart(5)}   branch ${f1(b.avg).padStart(5)} · ${f1(b.hi).padStart(5)}% · ${f1(b.drop).padStart(5)}   Δavg ${(b.avg - a.avg >= 0 ? '+' : '') + f1(b.avg - a.avg)}`);
}
console.log('\nsession average shift by kind (branch − master): ' + Object.entries(shift).map(([k, v]) => `${k} ${f1(mean(v))} (${f1(Math.min(...v))}…${f1(Math.max(...v))})`).join(' · '));

const PAIRS = [['S1', 'N1'], ['S1', 'W3'], ['S1', 'W4'], ['S2', 'N2'], ['S2', 'N4'], ['V3', 'N1'], ['V4', 'W3'], ['V6', 'N2'], ['N1', 'S1'], ['W3', 'S1'], ['N2', 'S2'], ['N1', 'V3'], ['V1', 'V2'], ['S1', 'V3']];
console.log('\ncheckVocalHealthSignal on two-note sessions (first then second; drop = first half − second half, warns at ≥ 12)');
let agree = 0, n = 0;
for (const [x, y] of PAIRS) {
  if (!by[x] || !by[y]) continue;
  const d = side => med(by[x].runs[side].map((rx, i) => drop([...rx.readings, ...(by[y].runs[side][i] || by[y].runs[side][0]).readings])));
  const a = d('before'), b = d('after'), wa = a >= 12, wb = b >= 12;
  n++; if (wa === wb) agree++;
  console.log(`${(x + ' → ' + y).padEnd(9)} master ${f1(a).padStart(5)} ${wa ? 'WARNS' : 'quiet'}   branch ${f1(b).padStart(5)} ${wb ? 'WARNS' : 'quiet'}${wa === wb ? '' : '   ← differs'}`);
}
console.log(`\nsame verdict on ${agree} of ${n} sessions`);
