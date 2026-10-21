// feat/single-stream 1.3: replays RTF's "Steady" row offline on frames recorded by rtfsteady.js, with the app's own
// vibrato helper (this working tree's deploy/index.html), for the current criterion and candidate ones. Per stimulus and
// side: Steady as a % of voiced frames over the whole capture (median of runs), and over every 6 s window (vibfix's
// length, start every 0.5 s: min / median / max), so a criterion is judged on where any window can fall, not one.
// Usage: node scripts/vq-verify/rtfsteady-eval.js <rtfsteady json> [candidate names, comma-separated]
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../../deploy/index.html'), 'utf8');
const grab = (from, fn) => { const a = html.indexOf(from), z = html.indexOf(fn, a), m = /\r?\n}\r?\n/.exec(html.slice(z)); return html.slice(a, z + m.index + m[0].length); };
const H = new Function(grab('const VIB_TOL', 'function makeVibratoTolerantLive') + '\n' + grab('function freqToNote', 'function freqToNote').replace(/const name = [^\n]*\n\s*const octave = [^\n]*\n/, '')
  .replace('return {midi:rounded, name, octave, cents, freq};', 'return {midi:rounded, cents, freq};') + '\nreturn {makeVibratoTolerantLive, freqToNote, VIB_TOL};')();

// A criterion: the frames' cents go into a window of `win` frames (the vibrato centre only while the gate is sure, as
// today, unless centre says otherwise); Steady when 100 − k·SD ≥ th (today: 30, 3, 75, i.e. SD ≤ 8.3 ct).
const CANDIDATES = {
  today: { win: 30, k: 3, th: 75 },
  th80: { win: 30, k: 3, th: 80 },
  th85: { win: 30, k: 3, th: 85 },
  win45: { win: 45, k: 3, th: 75 },
  win60: { win: 60, k: 3, th: 75 },
  win60th80: { win: 60, k: 3, th: 80 },
  rawOnly: { win: 30, k: 3, th: 75, centre: 'never' },
};
function replay(frames, c) {
  const live = H.makeVibratoTolerantLive(), buf = [], out = []; let state = 'neutral';
  for (const [t, f] of frames) {
    const held = live(t, f > 0 ? 6900 + 1200 * Math.log2(f / 440) : null);
    if (f > 0) {
      const note = H.freqToNote(440 * Math.pow(2, (held - 6900) / 1200));
      buf.push(c.centre !== 'never' && live.vibratoSure ? note.cents : H.freqToNote(f).cents);
      if (buf.length > c.win) buf.shift();
      if (buf.length > 5) {
        const mean = buf.reduce((a, b) => a + b, 0) / buf.length, sd = Math.sqrt(buf.reduce((a, b) => a + (b - mean) ** 2, 0) / buf.length);
        state = Math.max(0, 100 - sd * c.k) >= c.th ? 'good' : 'warn';
      }
      out.push({ t, voiced: true, steady: state === 'good' });
    } else { state = 'neutral'; out.push({ t, voiced: false, steady: false }); }
  }
  return out;
}
const pct = fr => { const v = fr.filter(x => x.voiced); return v.length ? Math.round(100 * v.filter(x => x.steady).length / v.length) : null; };
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
function windows(fr, ms = 6000, step = 500) {
  const out = [], t0 = fr[0].t, t1 = fr[fr.length - 1].t;
  for (let s = t0; s + ms <= t1; s += step) out.push(pct(fr.filter(x => x.t >= s && x.t < s + ms)));
  return out.filter(x => x != null).sort((a, b) => a - b);
}

const rows = JSON.parse(fs.readFileSync(process.argv[2]));
const names = process.argv[3] ? process.argv[3].split(',') : Object.keys(CANDIDATES);
for (const name of names) {
  const c = CANDIDATES[name];
  console.log(`\n== ${name} ${JSON.stringify(c)}   whole loop (median of runs) · 6 s windows min/median/max`);
  for (const r of rows) {
    const cell = side => {
      const runs = r.runs[side].map(x => replay(x.frames, c)), whole = med(runs.map(pct)), w = runs.flatMap(x => windows(x)).sort((a, b) => a - b);
      return `${String(whole).padStart(3)}% · ${w.length ? `${w[0]}/${med(w)}/${w[w.length - 1]}` : '—'}`.padEnd(20);
    };
    const live = side => r.runs[side].map(x => x.steady).join('/');
    console.log(`${r.id.padEnd(3)} master ${cell('before')} branch ${cell('after')}   (as the page read it: ${live('before')} | ${live('after')})`);
  }
}
