// The survey's tables: today's scores (master) and the proposed ones (the local scratch build) side by side, per
// stimulus, from two survey.js JSON files. Each cell: the median of the runs (the runs in brackets when they differ).
// Usage: node scripts/scoring-verify/compare.js <master.json> <scratch.json> [--md]
const fs = require('fs');
const [A, B] = process.argv.slice(2).filter(a => !a.startsWith('--')).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const MD = process.argv.includes('--md');
const med = v => { v = v.filter(x => typeof x === 'number'); if (!v.length) return null; const s = v.slice().sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const cell = v => { const n = v.filter(x => typeof x === 'number'); if (!n.length) return v.some(x => x === 'none' || x === null) ? '—' : '—'; const m = med(n); const u = [...new Set(n)]; return u.length > 1 ? `${m} (${n.join('/')})` : `${m}`; };
const takes = (d, stim, tool) => d.takes.filter(t => t.stim === stim && t.tool === tool && t.started);
const all = (rs, f) => rs.map(f);
// values per tool, from a take
const V = {
  pd: {
    'Pitch': t => t.nums['result: pitch'],
    'Timing (shown)': t => t.nums['result: timing'],
    'Timing, notes heard': t => { const r = t.extra.results.filter(x => x && x.heard); return r.length ? Math.round(r.reduce((a, b) => a + b.timingScore, 0) / r.length) : 0; },
    'Timing, every note': t => { const r = t.extra.results; return r.length ? Math.round(r.reduce((a, b) => a + (b ? b.timingScore : 0), 0) / r.length) : 0; },
    'Dynamics': t => t.nums['result: dynamics'],
    'Technique': t => t.nums['result: technique'],
    'notes heard': t => t.nums['notes heard'],
  },
  karaoke: {
    'Pitch': t => t.nums['result: pitch'],
    'Timing (shown)': t => t.nums['result: timing'],
    'Timing, notes heard': t => { const r = t.extra.results.filter(x => x && x.heard); return r.length ? Math.round(r.reduce((a, b) => a + b.timingScore, 0) / r.length) : 0; },
    'song best (pitch+timing)/2': t => typeof t.nums['song best'] === 'number' ? t.nums['song best'] : null,
    'notes heard': t => t.nums['notes heard'],
  },
  emotion: {
    'Pitch': t => t.nums['result: pitch'],
    'Expression': t => t.nums['result: expression'],
    'coach line': t => t.nums['coach line'],
  },
};
const out = [];
const p = s => out.push(s);
const stims = [...new Set([...A.takes, ...B.takes].map(t => t.stim))];
for (const tool of ['pd', 'karaoke', 'emotion']) {
  p(MD ? `\n#### ${tool}\n` : `\n== ${tool}`);
  const cols = Object.keys(V[tool]);
  for (const c of cols) {
    if (MD) { p(`\n${c}\n\n| stimulus | today (master) | proposed (scratch) |\n|---|---|---|`); }
    else p(`-- ${c}`);
    for (const st of stims) {
      const a = takes(A, st, tool), b = takes(B, st, tool);
      if (!a.length && !b.length) continue;
      const f = V[tool][c];
      const va = all(a, f), vb = all(b, f);
      const txt = v => typeof v[0] === 'string' ? [...new Set(v)].join('/') : cell(v);
      p(MD ? `| ${st} | ${txt(va)} | ${txt(vb)} |` : `   ${st.padEnd(9)} ${txt(va).padEnd(18)} → ${txt(vb)}`);
    }
  }
}
// item 3: vibratoTolerantCents in/out counts
const mism = d => d.takes.flatMap(t => (t.rec && t.rec.vtc) || []).filter(([i, o]) => i !== o).length;
const calls = d => d.takes.flatMap(t => (t.rec && t.rec.vtc) || []).length;
p(`\nitem 3: vibratoTolerantCents calls whose output count differs from its input count: master ${mism(A)} of ${calls(A)}, scratch ${mism(B)} of ${calls(B)}`);
// onsets and level shapes on the scratch build
for (const st of stims) {
  const b = takes(B, st, 'pd');
  if (!b.length) continue;
  const offs = b.map(t => t.extra.results.map(r => r && r.offsetMs != null ? r.offsetMs : '·').join(' '));
  const sh = b.map(t => t.extra.shape ? `sd ${t.extra.shape.sd} dB [${(t.extra.shape.levels || []).map(x => x.toFixed(1)).join(' ')}]` : '—');
  p(`scratch pd ${st.padEnd(9)} onset offsets (ms) per note: ${offs.join(' | ')} · levels: ${sh.join(' | ')}`);
}
for (const st of stims) {
  const b = takes(B, st, 'emotion');
  if (!b.length) continue;
  p(`scratch emotion ${st.padEnd(9)} levels: ${b.map(t => t.extra.shape ? `sd ${t.extra.shape.sd} dB [${(t.extra.shape.levels || []).map(x => x.toFixed(1)).join(' ')}]` : '—').join(' | ')}`);
}
console.log(out.join('\n'));
