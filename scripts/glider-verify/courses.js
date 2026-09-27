// Glider start, freeze and no-pitch behaviour on 200 seeded courses per course type, through the app's own
// startGlider() and gliderLoop(), stepped one frame at a time. Only the audio input is replaced: autoCorrelate returns
// whatever the scenario sings (-1 = no pitch), and requestAnimationFrame is taken over so each frame is one call.
//   - start: the glider starts at the first gap's centre, inside the gap under it
//   - freeze: 600 silent frames before the first note: no scroll, no score, no crash, the position unchanged, the hint
//     drawn on every frozen frame and never after take-off
//   - take-off with an ideal singer (aiming at the gap centre just ahead): the run doesn't end at take-off; frames
//     flown (cap 1800, ~30 s) are reported
//   - silence after take-off: it falls and crashes within 180 frames (3 s at 60 fps; the fall alone can take ~97), never NaN
//   - exploit bounds: a tone pinned below / above the range (glider on the floor / ceiling) from take-off, for up to
//     20000 frames (~5.5 min at 60 fps): every run ends; the highest score is reported
// Signed out, so the range is A2–C5. Beginner difficulty (the widest gaps). No account; nothing is saved.
// A fresh page per course type (memory). GLIDER_MODES=highway,melody limits the course types.
// Usage: node scripts/glider-verify/courses.js [url]   (no url: deploy/ served locally)
const { chromium } = require('playwright');
const path = require('path');
const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
let pass = 0, fail = 0;
function check(label, ok, detail = '') { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(72)} ${detail}`); }
const MODES = process.env.GLIDER_MODES ? process.env.GLIDER_MODES.split(',') : ['highway', 'melody', 'interval', 'sustain', 'agility', 'keyshift', 'memory'];
const SEEDS = 200, FROZEN = 600, FLY = 1800, SILENT_MAX = 180, PINNED = 20000;

const SETUP = () => {
  // the stand-ins: no mic, no paywall, no account side effects, one frame per call
  requireProFeature = () => true; initAudio = async () => true; vlSidecar = () => {}; recordActivity = () => {};
  analyser = { getFloatTimeDomainData() {} }; audioCtx = { sampleRate: 48000 }; dataArray = new Float32Array(2048);
  window.__rafQ = null; requestAnimationFrame = f => { __rafQ = f; return 1; }; cancelAnimationFrame = () => { __rafQ = null; };
  window.__sing = () => -1; autoCorrelate = () => __sing();
  window.__hints = 0; const ft = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { if (s === t('glider_takeoff_hint')) __hints++; return ft.call(this, s, ...a); };
  window.__step = n => { let i = 0; for (; i < n && gliderActive && __rafQ; i++) { const f = __rafQ; __rafQ = null; f(); } return i; };
  const H = document.getElementById('gliderCanvas').height;
  window.__yToHz = y => { const { lowMidi, highMidi } = registerRangeBounds(); const m = lowMidi + (1 - y / H) * (highMidi - lowMidi); return 440 * Math.pow(2, (m - 69) / 12); };
  window.__ideal = () => __yToHz(gliderGapAtWorldX(gliderScroll + 90 + 20).gapY);
  window.__seed = v => { let s = v >>> 0 || 1; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
};

const RUN = async ([m, C]) => {
  const res = { startInside: 0, frozenOk: 0, hint: 0, hintAfter: 0, tookOffAlive: 0, fly: [], silentMax: 0, silentAlive: 0, nan: 0, floorMax: 0, ceilMax: 0, unbounded: 0 };
  const start = async seed => { __seed(seed); gliderMode = m; gliderDifficulty = 'beginner'; __sing = () => -1; __hints = 0; await startGlider(); };
  const stop = () => { if (gliderActive) { gliderActive = false; __rafQ = null; } };
  for (let seed = 1; seed <= C.SEEDS; seed++) {
    await start(seed);
    const first = gliderPoints[0], g = gliderGapAtWorldX(gliderScroll + 90);
    if (gliderY === first.gapY && gliderY - 8 >= g.gapY - g.gapH / 2 && gliderY + 8 <= g.gapY + g.gapH / 2) res.startInside++;
    const y0 = gliderY; __step(C.FROZEN);
    if (gliderActive && !gliderTookOff && gliderScroll === 0 && gliderScoreVal === 0 && gliderY === y0) res.frozenOk++;
    if (__hints >= C.FROZEN) res.hint++;
    __sing = __ideal; __step(1); __hints = 0;
    if (gliderActive && gliderTookOff) res.tookOffAlive++;
    res.fly.push(gliderActive ? 1 + __step(C.FLY - 1) : 1);
    if (__hints > 0) res.hintAfter++;
    if (gliderActive) { __sing = () => -1; const c = __step(1000); if (gliderActive) res.silentAlive++; res.silentMax = Math.max(res.silentMax, c); }
    if (Number.isNaN(gliderY)) res.nan++;
    stop();
    for (const [key, hz] of [['floorMax', 82.4], ['ceilMax', 1046.5]]) { // E2 and C6: below and above A2–C5
      await start(seed); __sing = () => hz; __step(C.PINNED);
      if (gliderActive) res.unbounded++;
      if (Number.isNaN(gliderY)) res.nan++;
      res[key] = Math.max(res[key], gliderScoreVal); stop();
    }
  }
  const s = [...res.fly].sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { ...res, fly: undefined, flyMin: s[0], flyP10: q(0.1), flyMedian: q(0.5), flyFull: s.filter(v => v >= C.FLY).length };
};

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext();
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  const errors = []; let page;
  try {
    console.log(`== ${URL_ || 'local deploy/'}\n`);
    for (const m of MODES) {
      if (page) await page.close();
      page = await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
      await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await page.waitForTimeout(3000);
      await page.evaluate(SETUP);
      const r = await page.evaluate(RUN, [m, { SEEDS, FROZEN, FLY, PINNED }]);
      console.log(`-- ${m}`);
      check('starts at the first gap\'s centre, inside the gap', r.startInside === SEEDS, `${r.startInside}/${SEEDS}`);
      check(`${FROZEN} silent frames before the first note: frozen, score 0, no crash`, r.frozenOk === SEEDS, `${r.frozenOk}/${SEEDS}`);
      check('hint drawn on every frozen frame, never after take-off', r.hint === SEEDS && r.hintAfter === 0, `${r.hint}/${SEEDS}, after take-off ${r.hintAfter}`);
      check('take-off on the first note doesn\'t end the run', r.tookOffAlive === SEEDS, `${r.tookOffAlive}/${SEEDS}`);
      console.log(`     ideal singer, frames flown (cap ${FLY}): min ${r.flyMin}, p10 ${r.flyP10}, median ${r.flyMedian}; full ${FLY}: ${r.flyFull}/${SEEDS}`);
      check(`silence after take-off: crashes within ${SILENT_MAX} frames, every time`, r.silentAlive === 0 && r.silentMax <= SILENT_MAX, `max ${r.silentMax} frames`);
      check('never NaN', r.nan === 0, `${r.nan}`);
      check(`pinned to the floor / ceiling: every run ends within ${PINNED} frames`, r.unbounded === 0, `unbounded ${r.unbounded}; max score floor ${r.floorMax}, ceiling ${r.ceilMax}`);
    }
    check('page errors', errors.length === 0, errors[0] || 'none');
  } catch (e) { check('ran to the end', false, e.message.split('\n')[0]); }
  finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
