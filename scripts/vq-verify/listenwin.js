// Pitch Match and Interval Match listening window, before (deploy/index.html at LW_BEFORE, default master) and after (the
// working tree). The page's real Listen buttons; the singer is synthetic, wired in place of the mic analyser: silent until
// `delay` after the moment the app asks for the note (after: its "Sing now" cue; before: the click, the only moment there
// is), then a realistic start: 100 ct flat, gliding onto the note in 250 ms, then held for 3 s (a harmonic-rich tone).
// Delays 0.3 / 0.6 / 0.9 / 1.2 s (reaction time), every level. Plus: nobody sings at all.
// Checks (after): at every delay and level the score is ≥ 90 (a held, in-tune note) and the attack half isn't
// dragged down by the scoop (≥ 85); no voice → "I didn't hear you, try again", no score, no attempt counted, same note;
// a scored attempt moves to a new note, and "Sing it again" sings the same one.
// LW_URL=<deployed url>: the same checks on that page alone (it takes the "after" side; there is no before side).
// Usage: [LW_BEFORE=<ref>] [LW_URL=<url>] node scripts/vq-verify/listenwin.js
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), REF = process.env.LW_BEFORE || 'master', URL_ = process.env.LW_URL;
const SIDES = URL_ ? ['after'] : ['before', 'after'];
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `listenwin-${URL_ ? 'prod' : 'local'}-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const BEFORE = path.join(TESTDATA, 'listenwin-before.html'); fs.mkdirSync(path.dirname(BEFORE), { recursive: true });
fs.writeFileSync(BEFORE, execFileSync('git', ['show', `${REF}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const HTML = { before: BEFORE, after: path.join(ROOT, 'deploy/index.html') };
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; log(`  ${ok ? '✓' : '✗'} ${label.padEnd(78)} ${detail}`); };

async function open(side) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'] });
  await ctx.route('http://localhost:8765/**', r => {
    const p = new URL(r.request().url()).pathname.slice(1);
    if (!p || p === 'index.html') return r.fulfill({ path: HTML[side], contentType: 'text/html' });
    const body = side === 'before' ? execFileSync('git', ['show', `${REF}:deploy/${p}`], { cwd: ROOT }) : fs.readFileSync(path.join(ROOT, 'deploy', p));
    return r.fulfill({ body, contentType: 'application/javascript' });
  });
  const page = await ctx.newPage();
  await page.goto(URL_ || 'http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    requireProFeature = () => true; blockExercise = () => false;
    window.__attempts = 0; registerExerciseCompletion = async () => { window.__attempts++; };
    recordSkillScore = () => {}; recordWeeklyLog = () => {};
    enterPanel('exercises');
    await initAudio({ noWarmup: true });
    // the synthetic singer, in place of the mic's analyser
    const an = audioCtx.createAnalyser(); an.fftSize = 2048;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(); osc.type = 'sawtooth';
    const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; // a voice-like harmonic roll-off
    g.gain.value = 0; osc.connect(lp).connect(g).connect(an); osc.start();
    analyser = an;
    window.__sing = (delay, midi) => { // silent, then a 100 ct-flat start gliding onto the note in 250 ms, held 3 s
      const t0 = audioCtx.currentTime + delay, f = 440 * Math.pow(2, (midi - 69) / 12);
      osc.frequency.cancelScheduledValues(0); g.gain.cancelScheduledValues(0);
      g.gain.setValueAtTime(0, audioCtx.currentTime); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.4, t0 + 0.03);
      g.gain.setValueAtTime(0.4, t0 + 3.25); g.gain.linearRampToValueAtTime(0, t0 + 3.3);
      osc.frequency.setValueAtTime(f * Math.pow(2, -100 / 1200), t0); osc.frequency.linearRampToValueAtTime(f, t0 + 0.25);
    };
    window.__silence = () => { g.gain.cancelScheduledValues(0); g.gain.setValueAtTime(0, audioCtx.currentTime); };
  });
  return { b, page };
}

// One attempt: click Listen; the singer starts `delay` after the cue (or after the click when there is none).
async function attempt(page, which, level, delay, target) {
  return page.evaluate(async ({ which, level, delay, target }) => {
    setExerciseLevel(level);
    if (which === 'pitch') { pitchTargetMidi = target; document.querySelector('[data-extype="pitch"]')?.click(); }
    else { intervalRootMidi = target - 4; intervalDef = { name: 'Major 3rd', semi: 4 }; intervalTargetMidi = target; document.querySelector('[data-extype="interval"]')?.click(); }
    const btn = document.getElementById(which + 'ListenBtn'), cueText = typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS.en.ex_sing_now;
    const attempts0 = window.__attempts, t0 = performance.now();
    __silence(); btn.click();
    if (cueText) { while (btn.textContent !== cueText && performance.now() - t0 < 4000) await new Promise(r => setTimeout(r, 5)); }
    if (delay !== null) __sing(delay, target);
    await new Promise(r => setTimeout(r, 100));
    while (btn.disabled && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 30));
    const acc = document.getElementById(which + 'AccuracyVal').textContent, fb = document.getElementById(which + 'Feedback').textContent;
    const att = document.getElementById(which + 'AttackVal')?.textContent, land = document.getElementById(which + 'LandingVal')?.textContent;
    return { acc: parseInt(acc, 10), accText: acc, fb, attack: parseInt(att, 10), landing: parseInt(land, 10), counted: window.__attempts - attempts0, busyMs: Math.round(performance.now() - t0),
      nextTarget: which === 'pitch' ? pitchTargetMidi : intervalTargetMidi, again: document.getElementById(which + 'AgainBtn')?.style.display !== 'none' && !!document.getElementById(which + 'AgainBtn') };
  }, { which, level, delay, target });
}

(async () => {
  log(`listenwin ${stamp}  ${URL_ ? `url: ${URL_} (no before side)` : `before: ${REF}  after: working tree`}`);
  const DELAYS = [0.3, 0.6, 0.9, 1.2], LEVELS = ['beginner', 'intermediate', 'professional'], TARGET = 60;
  const R = {};
  for (const side of SIDES) {
    const { b, page } = await open(side);
    try {
      R[side] = {};
      for (const which of ['pitch', 'interval']) for (const level of LEVELS) for (const d of DELAYS) {
        R[side][`${which}|${level}|${d}`] = await attempt(page, which, level, d, TARGET);
      }
      R[side].none = { pitch: await attempt(page, 'pitch', 'intermediate', null, TARGET), interval: await attempt(page, 'interval', 'intermediate', null, TARGET) };
      if (side === 'after') { // "Sing it again" sings the same note; a scored attempt moved on
        const a = await attempt(page, 'pitch', 'intermediate', 0.3, 62);
        const again = await page.evaluate(async () => {
          const btn = document.getElementById('pitchListenBtn'), cue = TRANSLATIONS.en.ex_sing_now, t0 = performance.now();
          __silence(); document.getElementById('pitchAgainBtn').click();
          while (btn.textContent !== cue && performance.now() - t0 < 4000) await new Promise(r => setTimeout(r, 5));
          const sung = pitchTargetMidi; __sing(0.3, sung);
          while (btn.disabled || performance.now() - t0 < 500) await new Promise(r => setTimeout(r, 30));
          return { sung, acc: parseInt(document.getElementById('pitchAccuracyVal').textContent, 10) };
        });
        R.after.again = { first: a, again };
      }
    } finally { await b.close(); }
  }
  for (const which of ['pitch', 'interval']) {
    log(`\n-- ${which === 'pitch' ? 'Pitch Match' : 'Interval Match'}: score (attack / landing), singer starting 0.3 … 1.2 s after the cue`);
    for (const level of LEVELS) {
      const row = side => DELAYS.map(d => { const r = R[side][`${which}|${level}|${d}`]; return `${d}s ${isNaN(r.acc) ? r.accText : r.acc}${level === 'beginner' || isNaN(r.attack) ? '' : ` (${r.attack}/${r.landing})`}`; }).join('  ');
      if (R.before) log(`   ${level.padEnd(13)} before: ${row('before')}`);
      log(`   ${(R.before ? '' : level).padEnd(13)} ${URL_ ? 'prod: ' : 'after: '} ${row('after')}`);
      for (const d of DELAYS) {
        const r = R.after[`${which}|${level}|${d}`];
        check(`${which} ${level} ${d}s late: held note scores ≥ 90, attack ≥ 85 when split, counted once`, r.acc >= 90 && (level === 'beginner' || r.attack >= 85) && r.counted === 1, `${r.acc} (${r.attack}/${r.landing}) counted ${r.counted} · ${r.busyMs} ms`);
      }
    }
    const nb = R.before && R.before.none[which], na = R.after.none[which];
    log(`   nobody sings  ${nb ? `before: "${nb.accText}" "${nb.fb}" counted ${nb.counted} · ${nb.busyMs} ms  |  ` : ''}after: "${na.accText}" "${na.fb}" counted ${na.counted} · ${na.busyMs} ms`);
    check(`${which}: nobody sings → "I didn't hear you, try again", no score, not counted, same note`, na.accText === '—' && na.fb === "I didn't hear you, try again." && na.counted === 0 && na.nextTarget === TARGET, `"${na.accText}" "${na.fb}" counted ${na.counted} next ${na.nextTarget}`);
  }
  const ag = R.after.again;
  check('Pitch Match: a scored attempt moves to a new note; "Sing it again" sings the same one', ag.first.nextTarget !== 62 && ag.first.again && ag.again.sung === 62 && ag.again.acc >= 90, `next ${ag.first.nextTarget} · again on ${ag.again.sung} → ${ag.again.acc}`);
  log(`\n==== VERDICT: ${pass} passed, ${fail} failed`);
  log(`log: ${LOG}.log`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { log('ERROR ' + (e.stack || e)); process.exitCode = 2; });
