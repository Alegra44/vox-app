// Release E (design/accuracy/RELEASE_E.md): the vibrato gate's switch (vibratoTolerantCents: the centre line when the gate
// says yes, the readings as they are when it says no) against a blend, offline and silent, in one page of a build.
// Inputs, each read the way the app reads pitch (the pitch path's two 1.5 kHz low-passes, autoCorrelate on 2048 samples
// every 1/60 s):
//   s1        vibfix stim-S1 (the steady voice survey D's sweep used): a 3 s take (Emotion Mode's EMO_CAPTURE_MS)
//             starting at every 50 ms of the 40 s file, target A4: 800 starts
//   vocalset  the 6 VocalSet vibrato takes and the 2 straight ones, cut into notes (a voiced run, split where the pitch
//             moves more than 70 ct from the note's running median (1.3 semitones for a take that gives no note at 70:
//             a deep vibrato) or a gap of 200 ms; 0.5 s at least), each note's
//             target its own median rounded to a semitone
//   wobble    survey D's irregular wobble (tuner.js: a sine whose rate wanders 3–7 Hz every 100–200 ms, depth ±20 %),
//             ±20 and ±25 ct, 10 seeds each, 6 s, as one note and as 1, 2 and 3 s notes
//   vib       a 5.5 Hz ±40 ct vibrato (the sanity case: the centre in full)
// Per note, the switch (the build's own vibratoTolerantCents) and the blend (CAND below, or --cand <file>), and the
// numbers the affected tools make from them: 0.6 × mean |c| and 0.9 × (the strictest Pitch Match) as accuracy points,
// 3 × SD as stability points (Emotion Mode, One Take), the median (Harmony Memory). --ref <git ref> picks the build.
// Usage: node scripts/accuracy-e/blend.js [--ref master] [--cand <js file: function body of (pts) returning {cents, s}>] [--out f.json]
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const C = require('../design-verify/common'), S = require('../design-verify/stage');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref'), VS = path.join(process.env.VOXCOACH_TESTDATA || path.join(require('os').homedir(), 'VoxCoachTestData'), 'vocalset');
const TAKES = ['vibrato-1154', 'vibrato-2417', 'vibrato-2961', 'vibrato-3131', 'vibrato-628', 'vibrato-772', 'straight-286', 'straight-625'];
const CAND = arg('--cand') ? fs.readFileSync(arg('--cand'), 'utf8') : null;

const PAGE = async ({ files, cand }) => {
  const SR = 48000, hop = SR / 60, win = 2048, d = new Float32Array(win);
  const read = async b64 => {
    const dec = await new OfflineAudioContext(1, SR, SR).decodeAudioData(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer);
    return lowpass(dec);
  };
  const lowpass = async dec => {
    const n = Math.ceil(dec.duration * SR), oc = new OfflineAudioContext(1, n, SR), s = oc.createBufferSource(); s.buffer = dec;
    const lp = [0, 1].map(() => { const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = VQ_PITCH_LP_HZ; f.Q.value = Math.SQRT1_2; return f; });
    s.connect(lp[0]).connect(lp[1]).connect(oc.destination); s.start();
    return (await oc.startRendering()).getChannelData(0);
  };
  const midiAt = (y, at) => { for (let i = 0; i < win; i++) d[i] = y[(at + i) % y.length]; const f = autoCorrelate(d, SR); return f > 0 ? 69 + 12 * Math.log2(f / 440) : null; };
  const blend = cand ? new Function('pts', cand) : null;
  const nums = cs => {
    const m = cs.reduce((a, c) => a + c, 0) / cs.length, abs = cs.reduce((a, c) => a + Math.abs(c), 0) / cs.length;
    const sd = Math.sqrt(cs.reduce((a, c) => a + (c - m) ** 2, 0) / cs.length), med = [...cs].sort((a, b) => a - b)[cs.length >> 1];
    return { acc6: 100 - 0.6 * abs, acc9: 100 - 0.9 * abs, stab: 100 - 3 * sd, med };
  };
  const note = (label, pts) => {
    const g = vibratoGate(pts), sw = nums(vibratoTolerantCents(pts));
    const r = { label, n: pts.length, vib: !!g.vibrato, per: g.periodicity, depth: g.depth, rate: g.rateHz, dur: g.periodMs ? (pts[pts.length - 1].t - pts[0].t) / g.periodMs : null, sw };
    if (blend) { const b = blend(pts); r.s = b.s; r.bl = nums(b.cents); }
    return r;
  };
  const out = [];
  // s1: 800 starts of a 3 s take
  const y1 = await read(files.s1), F = Math.floor(y1.length / hop), m1 = []; // a start every 50 ms = every 3rd frame: the file read once, looped
  for (let j = 0; j < F; j++) m1.push(midiAt(y1, Math.round(j * hop)));
  for (let startMs = 0; startMs < y1.length / SR * 1000; startMs += 50) {
    const pts = [];
    for (let k = 0; k * 1000 / 60 < EMO_CAPTURE_MS; k++) { const m = m1[(startMs / 50 * 3 + k) % F]; if (m !== null && Math.abs((m - 69) * 100) < 400) pts.push({ t: k * 1000 / 60, c: (m - 69) * 100 }); }
    if (pts.length > 3) out.push({ set: 's1', ...note('s1@' + startMs, pts) });
  }
  // vocalset: notes
  for (const [name, b64] of Object.entries(files.vs)) {
    const y = await read(b64), ms = [];
    for (let k = 0; k * hop + win < y.length; k++) ms.push({ t: k * 1000 / 60, m: midiAt(y, Math.round(k * hop)) });
    for (const split of [0.7, 1.3]) { // a deep vibrato swings past 70 ct from the median: then split at 1.3 semitones
    const before = out.length;
    let cur = [];
    const flush = () => { if (cur.length >= 30) { const med = [...cur].map(p => p.m).sort((a, b) => a - b)[cur.length >> 1], tgt = Math.round(med); out.push({ set: name.startsWith('vibrato') ? 'vs-vibrato' : 'vs-straight', take: name, ...note(`${name}@${Math.round(cur[0].t)}`, cur.map(p => ({ t: p.t, c: (p.m - tgt) * 100 }))) }); } cur = []; };
    for (const p of ms) {
      if (p.m === null) { if (cur.length && p.t - cur[cur.length - 1].t > 200) flush(); continue; }
      if (cur.length) { const med = [...cur.slice(-30)].map(q => q.m).sort((a, b) => a - b)[Math.min(30, cur.length) >> 1]; if (Math.abs(p.m - med) > split) flush(); }
      cur.push(p);
    }
    flush();
    if (out.length > before) break;
    }
  }
  // synthetic: wobbles and a vibrato (tuner.js's generator), 6 s
  const synth = async (spec, seed) => {
    const SEC = 6, N = SR * SEC, x = new Float32Array(N); let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const cents = new Float32Array(N);
    if (spec.kind === 'vib') for (let i = 0; i < N; i++) cents[i] = spec.depth * Math.sin(2 * Math.PI * spec.rate * i / SR);
    if (spec.kind === 'wobble') { let ph = 0, rate = 5, depth = spec.depth, next = 0; for (let i = 0; i < N; i++) { if (i >= next) { rate = 3 + 4 * rnd(); depth = spec.depth * (0.8 + 0.4 * rnd()); next = i + Math.round(SR * (0.1 + 0.1 * rnd())); } ph += 2 * Math.PI * rate / SR; cents[i] = depth * Math.sin(ph); } }
    let ph = 0; const H = [1, 0.5, 0.33, 0.25];
    for (let i = 0; i < N; i++) { const f = 440 * Math.pow(2, cents[i] / 1200); ph += 2 * Math.PI * f / SR; let v = 0; H.forEach((a, k) => { v += a * Math.sin((k + 1) * ph); }); x[i] = 0.12 * v; }
    const buf = new AudioBuffer({ length: N, sampleRate: SR, numberOfChannels: 1 }); buf.copyToChannel(x, 0);
    const y = await lowpass(buf), pts = [];
    for (let k = 0; k * hop + win < N; k++) { const m = midiAt(y, Math.round(k * hop)); if (m !== null) pts.push({ t: k * 1000 / 60, c: (m - 69) * 100 }); }
    return pts;
  };
  for (const depth of [20, 25]) for (let seed = 1; seed <= 10; seed++) {
    const pts = await synth({ kind: 'wobble', depth }, seed);
    out.push({ set: `wobble${depth}`, ...note(`wobble±${depth} seed ${seed} 6 s`, pts) });
    for (const L of [1000, 2000, 3000]) for (let a = 0; a + L <= 6000; a += L) { const p = pts.filter(q => q.t >= a && q.t < a + L).map(q => ({ t: q.t - a, c: q.c })); if (p.length > 12) out.push({ set: `wobble${depth}`, ...note(`wobble±${depth} seed ${seed} ${L / 1000} s @${a}`, p) }); }
  }
  out.push({ set: 'vib', ...note('vibrato 5.5 Hz ±40', await synth({ kind: 'vib', rate: 5.5, depth: 40 }, 1)) });
  return out;
};

(async () => {
  S.ensureStimuli();
  const files = { s1: fs.readFileSync(S.STIM.steady).toString('base64'), vs: Object.fromEntries(TAKES.map(n => [n, fs.readFileSync(path.join(VS, n + '.wav')).toString('base64')])) };
  const b = await C.chromium.launch();
  try {
    const { page } = await C.openPage(b, { dir: C.buildDir(REF) });
    const rows = await page.evaluate(PAGE, { files, cand: CAND });
    const outF = arg('--out'); if (outF) fs.writeFileSync(outF, JSON.stringify(rows));
    const sets = [...new Set(rows.map(r => r.set))], f1 = v => v == null ? '—' : (+v).toFixed(1);
    const q = (a, p) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
    console.log(`== build ${REF || 'working copy'} · candidate ${arg('--cand') || 'none'}`);
    for (const set of sets) {
      const R = rows.filter(r => r.set === set);
      console.log(`-- ${set}: ${R.length} notes · gate yes ${R.filter(r => r.vib).length}`);
      console.log(`   periodicity p5/50/95 ${f1(q(R.map(r => r.per), .05))}/${f1(q(R.map(r => r.per), .5))}/${f1(q(R.map(r => r.per), .95))} · depth ${f1(q(R.map(r => r.depth), .05))}/${f1(q(R.map(r => r.depth), .5))}/${f1(q(R.map(r => r.depth), .95))} · rate ${f1(q(R.map(r => r.rate), .05))}/${f1(q(R.map(r => r.rate), .5))}/${f1(q(R.map(r => r.rate), .95))} · periods ${f1(q(R.map(r => r.dur), .05))}/${f1(q(R.map(r => r.dur), .5))}`);
      const st = k => R.map(r => r.sw[k]), rng = a => `${Math.round(Math.min(...a))}–${Math.round(Math.max(...a))}`;
      console.log(`   switch: stab ${rng(st('stab'))} · acc6 ${rng(st('acc6'))}`);
      if (R[0].bl) {
        const bl = k => R.map(r => r.bl[k]), dmax = k => Math.max(...R.map(r => Math.abs(Math.round(r.bl[k]) - Math.round(r.sw[k])))), better = k => R.filter(r => Math.round(r.bl[k]) > Math.round(r.sw[k])).length;
        console.log(`   blend:  stab ${rng(bl('stab'))} · acc6 ${rng(bl('acc6'))} · strength p5/50/95 ${f1(q(R.map(r => r.s), .05))}/${f1(q(R.map(r => r.s), .5))}/${f1(q(R.map(r => r.s), .95))}`);
        console.log(`   |Δ| max: acc6 ${dmax('acc6')} acc9 ${dmax('acc9')} stab ${dmax('stab')} median ${Math.max(...R.map(r => Math.abs(r.bl.med - r.sw.med))).toFixed(1)} ct · notes scoring better than the switch: acc6 ${better('acc6')} acc9 ${better('acc9')} stab ${better('stab')}`);
      }
    }
  } finally { await b.close(); C.cleanup(); }
})().catch(e => { console.error(e); process.exit(2); });
