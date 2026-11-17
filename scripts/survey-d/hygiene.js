// Survey D, item d: why scores4b's Register Drills and Voice Quality change with whatever ran before them, and why
// Emotion Mode swings between two values on master. Against the LOCAL Supabase stack (VOX_BACKEND=local, a throwaway
// account deleted at exit); the steady stimulus (stage.js: vibfix stim-S1.wav) as Chromium's file-backed fake mic, as
// scores4b runs it.
// Part 1, Register Drills and Voice Quality, N runs each of four conditions (a fresh page per run):
//   alone        the tool alone in a fresh page
//   after        the tools scores4b runs before it in the same page (Mirror, Rhythm[, Register Drills, Vibrato])
//   alone, AEC off / after, AEC off   the same with the mic's echoCancellation forced off (getUserMedia patched)
// The spread of each number within a condition and the shift between conditions say whether it is carried state, and
// whether the echo canceller (the only adaptive stage between the file and the app with echoCancellation on: auto gain and
// noise suppression are off) is what carries it.
// Part 2, Emotion Mode: N runs alone (its stability per take), and offline: the steady stimulus decoded and read the way
// runEmoRound reads it (3 s of frames at 60 per second through the pitch path's low-passes, autoCorrelate, then
// vibratoTolerantCents and 100 − 3 × SD), starting at every 50 ms of the file. The file loops, so a take starts wherever
// the loop happens to be: if stability depends on the start, that is the swing.
// Usage: VOX_BACKEND=local NODE_OPTIONS=--require=…/localBackend.js node scripts/survey-d/hygiene.js [--runs 5] [--ref <git ref>] [--out <json>]
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('hygiene.js runs against the local Supabase stack only'); process.exit(2); }
const fs = require('fs');
const C = require('../design-verify/common'), S = require('../design-verify/stage'), T = require('../design-verify/tools'), T4 = require('../design-verify/tools4b');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const RUNS = +(arg('--runs') || 5), REF = arg('--ref');
const AEC_OFF = () => {
  const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = c => gum(c && c.audio ? { ...c, audio: { ...(typeof c.audio === 'object' ? c.audio : {}), echoCancellation: false } } : c);
};

async function run(b, dir, state, keys, aecOff) {
  const { ctx, page } = await C.openPage(b, { dir, theme: 'light', storageState: state, prepare: aecOff ? c => c.addInitScript(AEC_OFF) : undefined });
  const out = {};
  try {
    await C.clearOverlays(page); await page.evaluate(T.CAPTURE_TAP); await S.warmMic(page);
    out.aec = await page.evaluate(() => micStream ? micStream.getAudioTracks()[0].getSettings().echoCancellation : null);
    for (const key of keys) {
      const tool = T4.byKey[key] || T4.TAKE.find(t => t.key === key);
      await tool.open(page); await C.sleep(300);
      await page.evaluate(() => { window.__caps = []; });
      await T.runTake(page, tool); await C.sleep(800);
      out[key] = await page.evaluate(`(${tool.nums})()`); await T.restoreRange(page);
      await page.evaluate(() => stopAllActiveSessions()); await C.sleep(300);
    }
  } finally { await ctx.close(); }
  return out;
}
const pick = (o, re) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => re.test(k) && typeof v === 'number'));
const stats = vs => { const v = vs.filter(x => typeof x === 'number'); if (!v.length) return '—'; const m = v.reduce((a, c) => a + c, 0) / v.length; return `${Math.min(...v)}–${Math.max(...v)} (mean ${m.toFixed(1)})`; };

const EMO_SWEEP = async ({ b64, target }) => {
  const SR = 48000, bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
  const dec = await new OfflineAudioContext(1, SR, SR).decodeAudioData(bytes);
  const n = Math.ceil(dec.duration * SR), oc = new OfflineAudioContext(1, n, SR), s = oc.createBufferSource(); s.buffer = dec;
  const lp = [0, 1].map(() => { const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = VQ_PITCH_LP_HZ; f.Q.value = Math.SQRT1_2; return f; });
  s.connect(lp[0]).connect(lp[1]).connect(oc.destination); s.start();
  const y = (await oc.startRendering()).getChannelData(0), L = y.length, hop = SR / 60, win = 2048, d = new Float32Array(win);
  const out = [];
  for (let startMs = 0; startMs < L / SR * 1000; startMs += 50) {
    const pts = [];
    for (let k = 0; k * 1000 / 60 < EMO_CAPTURE_MS; k++) {
      const at = Math.round(startMs * SR / 1000 + k * hop);
      for (let i = 0; i < win; i++) d[i] = y[(at + i) % L];
      const f = autoCorrelate(d, SR);
      if (f > 0) { const c = centsFromTarget(f, target); if (c !== null && Math.abs(c) < 400) pts.push({ t: k * 1000 / 60, c }); }
    }
    let stability = 0, vib = false;
    if (pts.length > 3) {
      vib = !!vibratoGate(pts).vibrato;
      const cents = vibratoTolerantCents(pts), m = cents.reduce((a, c) => a + c, 0) / cents.length;
      stability = Math.max(0, 100 - Math.sqrt(cents.reduce((a, c) => a + (c - m) ** 2, 0) / cents.length) * 3);
    }
    out.push({ startMs, stability: Math.round(stability), vib, n: pts.length });
  }
  return out;
};

(async () => {
  S.ensureStimuli();
  const dir = C.buildDir(REF), res = { ref: REF || 'working copy', runs: RUNS, rd: {}, vq: {}, emo: {} };
  const b0 = await C.chromium.launch(); const { ctx: c0, page: p0 } = await C.openPage(b0, { dir }); await C.signUp(p0, 'dvhyg', 'Hygiene');
  const state = await c0.storageState(); await c0.close(); await b0.close();
  const b = await S.launchMic(S.STIM.steady);
  try {
    console.log(`== part 1 · build ${res.ref} · ${RUNS} runs per condition · steady stimulus`);
    const COND = { 'alone': [false, false], 'after': [true, false], 'alone, AEC off': [false, true], 'after, AEC off': [true, true] };
    for (const [key, before, re] of [['registerdrills', ['mirror', 'rhythm'], /chest|pitch/], ['voicequality', ['mirror', 'rhythm', 'registerdrills', 'vibrato'], /centroid|HNR|f0/]]) {
      res[key === 'registerdrills' ? 'rd' : 'vq'] = {};
      for (const [cond, [after, aecOff]] of Object.entries(COND)) {
        const rows = [];
        for (let i = 0; i < RUNS; i++) { const r = await run(b, dir, state, after ? [...before, key] : [key], aecOff); rows.push({ aec: r.aec, nums: pick(r[key], re) }); }
        res[key === 'registerdrills' ? 'rd' : 'vq'][cond] = rows;
        const names = Object.keys(rows[0].nums);
        console.log(`-- ${key}, ${cond} (track echoCancellation ${rows.map(r => r.aec).join('/')})`);
        for (const n of names) console.log(`   ${n.padEnd(24)} ${rows.map(r => r.nums[n] ?? '—').join(' / ').padEnd(34)} ${stats(rows.map(r => r.nums[n]))}`);
      }
    }
    console.log(`\n== part 2 · Emotion Mode`);
    const rows = [];
    for (let i = 0; i < RUNS * 2; i++) { const r = await run(b, dir, state, ['emotionmode'], false); rows.push(pick(r.emotionmode, /stability/)); }
    res.emo.alone = rows;
    console.log(`   alone, ${rows.length} runs: take 1 ${rows.map(r => r['take 1 stability']).join('/')} · take 2 ${rows.map(r => r['take 2 stability']).join('/')}`);
  } finally { await b.close(); }
  const b2 = await C.chromium.launch();
  try {
    const { page } = await C.openPage(b2, { dir });
    const sweep = await page.evaluate(EMO_SWEEP, { b64: fs.readFileSync(S.STIM.steady).toString('base64'), target: 69 });
    res.emo.sweep = sweep;
    const hist = {}; sweep.forEach(s => { hist[s.stability] = (hist[s.stability] || 0) + 1; });
    console.log(`   offline sweep, a take starting at every 50 ms of the ${(sweep.length * 50 / 1000).toFixed(1)} s file: stability → starts: ${Object.entries(hist).sort((a, c) => c[0] - a[0]).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    console.log(`   vibrato gate on: ${sweep.filter(s => s.vib).length} of ${sweep.length} starts; stability with the gate on ${stats(sweep.filter(s => s.vib).map(s => s.stability))}, off ${stats(sweep.filter(s => !s.vib).map(s => s.stability))}`);
  } finally { await b2.close(); C.cleanup(); }
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
})();
