// Which notes the exercises ask for, before (deploy/index.html at PK_BEFORE, default master) and after (the working tree):
// the real picking code in the page, signed out, locally, for three ranges (none saved: A2–C5; C3–G4; a narrow A3–A4,
// set as this page's Range Finder capture) and each level. Per exercise: how many of the range's notes come up, the
// lowest and highest, how often the next note is the same as the one before, and (Scale Run) whether the whole pattern
// fits in the range.
//   Pitch Match / Interval Match / Scale Run: 300 notes "after an attempt" (what the page does after one; before: the note
//   doesn't change until New note is pressed) and 300 after "New note".
//   Register Drills: 12 drills × 5 notes. Sing It 5 Ways and Emotion Mode: 20 sessions. One Take: 20 sessions on one day,
//   and one session on each of 20 days. These run their real start code with the page's clock 20× faster and the
//   sound and scoring stubbed out; the picking itself is untouched.
// Checks (after): no immediate repeat anywhere a pick is made; every note of the allowed range comes up; beginners stay
// 2 semitones inside each end, intermediate / professional reach both ends; Scale Run's pattern always fits; One Take is
// one note per day; Five Ways / Emotion Mode vary between sessions within the comfortable 25–65 % of the range.
// PK_URL=<deployed url>: the same checks on that page alone (it takes the "after" side; there is no before side).
// Usage: [PK_BEFORE=<ref>] [PK_URL=<url>] node scripts/vq-verify/picker.js
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), REF = process.env.PK_BEFORE || 'master', URL_ = process.env.PK_URL;
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `picker-${URL_ ? 'prod' : 'local'}-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const BEFORE = path.join(TESTDATA, 'picker-before.html'); fs.mkdirSync(path.dirname(BEFORE), { recursive: true });
fs.writeFileSync(BEFORE, execFileSync('git', ['show', `${REF}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const HTML = { before: BEFORE, after: path.join(ROOT, 'deploy/index.html') };
const RANGES = { 'no saved range (A2–C5)': null, 'C3–G4': [48, 67], 'narrow A3–A4': [57, 69] };
const LEVELS = ['beginner', 'intermediate', 'professional'];
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; log(`  ${ok ? '✓' : '✗'} ${label.padEnd(84)} ${detail}`); };

async function sample(side, range) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1);
      if (!p || p === 'index.html') return r.fulfill({ path: HTML[side], contentType: 'text/html' });
      const body = side === 'before' ? execFileSync('git', ['show', `${REF}:deploy/${p}`], { cwd: ROOT }) : fs.readFileSync(path.join(ROOT, 'deploy', p));
      return r.fulfill({ body, contentType: 'application/javascript' });
    });
    const page = await ctx.newPage();
    await page.goto(URL_ || 'http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
    return await page.evaluate(async ({ range, LEVELS }) => {
      requireProFeature = () => true; blockExercise = () => false;
      if (range) { lowNote = freqToNote(noteToFreq(range[0])); highNote = freqToNote(noteToFreq(range[1])); }
      const bounds = registerRangeBounds(), out = { bounds, levels: {} };
      const hasNew = typeof pickNote === 'function';
      for (const lvl of LEVELS) {
        setExerciseLevel(lvl);
        const L = out.levels[lvl] = {};
        // after an attempt: what the page does to the note once an attempt is scored
        const after = (fn, read) => { const a = []; for (let i = 0; i < 300; i++) { if (hasNew) fn(true); a.push(read()); } return a; };
        const next = (fn, read) => { const a = []; for (let i = 0; i < 300; i++) { fn(); a.push(read()); } return a; };
        L.pitchAttempt = after(newPitchTarget, () => pitchTargetMidi);
        L.pitchNext = next(newPitchTarget, () => pitchTargetMidi);
        L.intervalNext = next(newIntervalTarget, () => [intervalRootMidi, intervalTargetMidi]);
        L.intervalAttempt = after(newIntervalTarget, () => [intervalRootMidi, intervalTargetMidi]);
        L.scaleNext = next(newScaleRoot, () => [scaleRootMidi, Math.max(...currentScaleSteps())]);
        L.scaleAttempt = after(newScaleRoot, () => [scaleRootMidi, Math.max(...currentScaleSteps())]);
      }
      setExerciseLevel('intermediate');
      // the rest run their real start code, 20× faster, without sound or scoring
      const realNow = performance.now.bind(performance), base = realNow(), realTO = window.setTimeout;
      performance.now = () => base + (realNow() - base) * 20;
      window.setTimeout = (fn, ms, ...a) => realTO(fn, (ms || 0) / 20, ...a);
      playTone = async () => {}; playBackingPad = async () => audioCtx.currentTime; captureAccuracyForTarget = async () => ({ accuracy: 50, heard: true, confidence: 'high' });
      saveProgress = async () => {}; recordActivity = async () => {}; vlSidecar = () => {}; vlFeed = () => {};
      await initAudio();
      const drills = [];
      for (let d = 0; d < 12; d++) {
        drillMode = 'chest'; drillActive = true; drillResults = [];
        try { await runDrillSequence(); } catch (e) {}
        drillActive = false; drills.push(drillResults.map(r => r.midi)); // the notes the drill asked for
      }
      out.drills = drills;
      const five = [], emo = [];
      for (let i = 0; i < 20; i++) {
        document.getElementById('fiveStartBtn').click(); await new Promise(r => realTO(r, 60)); five.push(fiveBaseMidi); fiveActive = false; await new Promise(r => realTO(r, 60));
        document.getElementById('emoStartBtn').click(); await new Promise(r => realTO(r, 60)); emo.push(emoTargetMidi); emoActive = false; await new Promise(r => realTO(r, 60));
      }
      out.five = five; out.emo = emo;
      const oneTake = async () => { runOneTake().catch(() => {}); await new Promise(r => realTO(r, 60)); const n = document.getElementById('oneTakeNote').textContent; oneTakeActive = false; await new Promise(r => realTO(r, 40)); return n; };
      out.oneDay = []; for (let i = 0; i < 20; i++) out.oneDay.push(await oneTake());
      const realToday = todayStr; out.manyDays = [];
      for (let d = 1; d <= 20; d++) { todayStr = () => `2026-11-${String(d).padStart(2, '0')}`; out.manyDays.push(await oneTake()); }
      todayStr = realToday;
      return out;
    }, { range, LEVELS });
  } finally { await b.close(); }
}

const name = m => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + (Math.floor(m / 12) - 1);
const stats = (a, lo, hi) => {
  const seen = new Set(a), reps = a.slice(1).filter((x, i) => x === a[i]).length;
  return { distinct: seen.size, pool: hi - lo + 1, min: Math.min(...a), max: Math.max(...a), repPct: 100 * reps / Math.max(1, a.length - 1), seen };
};
const fmt = s => `${String(s.distinct).padStart(2)} notes ${name(s.min)}–${name(s.max)}, same as the last one ${s.repPct.toFixed(1)}%`;

(async () => {
  log(`picker ${stamp}  ${URL_ ? `url: ${URL_} (no before side: "before" columns repeat it)` : `before: ${REF}  after: working tree`}`);
  for (const [rn, range] of Object.entries(RANGES)) {
    log(`\n==== ${rn}`);
    const R = {};
    for (const side of URL_ ? ['after'] : ['before', 'after']) R[side] = await sample(side, range);
    if (URL_) R.before = R.after;
    const { lowMidi: lo, highMidi: hi } = R.after.bounds;
    for (const lvl of LEVELS) {
      log(`-- ${lvl}`);
      const m = lvl === 'beginner' ? Math.max(0, Math.min(2, Math.floor((hi - lo) / 2) - 1)) : 0;
      for (const [label, key, f] of [['Pitch Match, after an attempt', 'pitchAttempt', x => x], ['Pitch Match, after New note', 'pitchNext', x => x],
        ['Interval Match root, after an attempt', 'intervalAttempt', x => x[0]], ['Interval Match root, after New interval', 'intervalNext', x => x[0]],
        ['Scale Run root, after an attempt', 'scaleAttempt', x => x[0]], ['Scale Run root, after New root', 'scaleNext', x => x[0]]]) {
        const sb = stats(R.before.levels[lvl][key].map(f), lo, hi), sa = stats(R.after.levels[lvl][key].map(f), lo, hi);
        log(`   ${label.padEnd(40)} before: ${fmt(sb)}  |  after: ${fmt(sa)}`);
        // Scale Run: when only one root lets the whole pattern fit (an octave pattern in a 12-semitone range), it repeats
        const one = key.startsWith('scale') && R.after.levels[lvl][key].every(([r]) => r === R.after.levels[lvl][key][0][0]) && R.after.levels[lvl][key].every(([r, top]) => r + top === hi) && R.after.levels[lvl][key][0][0] === lo;
        check(`${lvl} · ${label}: never the same note twice in a row${one ? ' (only one root fits: allowed)' : ''}`, sa.repPct === 0 || one, `${sa.repPct.toFixed(1)}%`);
      }
      // Pitch Match covers the level's whole span
      const pa = stats(R.after.levels[lvl].pitchNext, lo, hi), want = [lo + m, hi - m];
      let all = true; for (let n = want[0]; n <= want[1]; n++) if (!pa.seen.has(n)) all = false;
      check(`${lvl} · Pitch Match: every note ${name(want[0])}–${name(want[1])} comes up, nothing outside`, all && pa.min === want[0] && pa.max === want[1], `${name(pa.min)}–${name(pa.max)}, ${pa.distinct} of ${want[1] - want[0] + 1}`);
      const sc = R.after.levels[lvl].scaleNext, fitsAll = sc.every(([r, top]) => r >= lo && r + top <= hi);
      const scb = R.before.levels[lvl].scaleNext, fitsB = scb.filter(([r, top]) => r + top <= hi).length;
      check(`${lvl} · Scale Run: the whole pattern fits in the range every time`, fitsAll, `after ${sc.filter(([r, t]) => r + t <= hi).length}/${sc.length} · before ${fitsB}/${scb.length}`);
      const iv = R.after.levels[lvl].intervalNext, ivFit = iv.every(([r, t]) => r >= lo && t <= hi);
      check(`${lvl} · Interval Match: root and target inside the range`, ivFit, `${iv.filter(([r, t]) => r >= lo && t <= hi).length}/${iv.length}`);
    }
    const flat = x => x.flat(), dB = R.before.drills, dA = R.after.drills;
    const inDrill = a => a.reduce((n, d) => n + d.slice(1).filter((x, i) => x === d[i]).length, 0);
    log(`-- Register Drills (chest), 12 drills × 5 notes   before: ${fmt(stats(flat(dB), lo, hi))}, ${inDrill(dB)} repeats inside drills  |  after: ${fmt(stats(flat(dA), lo, hi))}, ${inDrill(dA)}`);
    check('Register Drills: no note twice in a row (within and across drills)', stats(flat(dA), lo, hi).repPct === 0, `${inDrill(dA)} inside drills`);
    for (const [label, key] of [['Sing It 5 Ways base note', 'five'], ['Emotion Mode note', 'emo']]) {
      const sb = stats(R.before[key], lo, hi), sa = stats(R.after[key], lo, hi), span = hi - lo;
      const cLo = lo + Math.round(span * 0.25), cHi = lo + Math.round(span * 0.65);
      log(`-- ${label}, 20 sessions   before: ${fmt(sb)}  |  after: ${fmt(sa)}`);
      check(`${label}: varies between sessions, never the same twice in a row, inside 25–65 % of the range`, sa.distinct > 1 && sa.repPct === 0 && sa.min >= Math.max(lo + (key === 'five' ? 1 : 0), Math.min(cLo, hi)) && sa.max <= Math.max(cLo, cHi), `${name(sa.min)}–${name(sa.max)} (comfortable ${name(cLo)}–${name(cHi)})`);
    }
    const od = new Set(R.after.oneDay), md = new Set(R.after.manyDays), odB = new Set(R.before.oneDay), mdB = new Set(R.before.manyDays);
    log(`-- One Take   before: 1 day ${odB.size} note(s), 20 days ${mdB.size} note(s) [${[...mdB].join(' ')}]  |  after: 1 day ${od.size}, 20 days ${md.size} [${[...md].join(' ')}]`);
    check('One Take: one note all day, and it changes from day to day', od.size === 1 && md.size > 1, `1 day: ${[...od].join(',')} · 20 days: ${md.size} different`);
  }
  log(`\n==== VERDICT: ${pass} passed, ${fail} failed`);
  log(`log: ${LOG}.log`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { log('ERROR ' + (e.stack || e)); process.exitCode = 2; });
