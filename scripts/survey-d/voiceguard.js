// Survey D, item a: does the bleed guard also block a real voice? Rhythm with the "onbeat" voice (synthmic.js: a sung
// onset of the steady note on each scored beat, as scores4b runs it) and NO bleed, on the scratch build with a speaker-
// delay measurement stored whose bleed gain is 0 (the guard off), 0.1, 0.3 or 1: the guard then expects the click's
// bleed at that level and needs the voice above twice it. LOCAL stack (a throwaway account, deleted at exit).
// Usage: VOX_BACKEND=local NODE_OPTIONS=… node scripts/survey-d/voiceguard.js [--ref <git ref>, default the working copy] [--runs 2]
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('local stack only'); process.exit(2); }
const C = require('../design-verify/common'), S = require('../design-verify/stage'), T = require('../design-verify/tools'), T4 = require('../design-verify/tools4b'), SYN = require('../design-verify/synthmic');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref') || null, RUNS = +(arg('--runs') || 2);
(async () => {
  S.ensureStimuli();
  const dir = C.buildDir(REF);
  const b0 = await C.chromium.launch(); const { ctx: c0, page: p0 } = await C.openPage(b0, { dir }); await C.signUp(p0, 'dvvg', 'Voice Guard');
  const state = await c0.storageState(); await c0.close(); await b0.close();
  const b = await SYN.launch(), rhythm = T4.TAKE.find(t => t.key === 'rhythm');
  try {
    console.log(`== Rhythm, the on-beat voice, no bleed · build ${REF || "working copy"}`);
    for (const gain of [0, 0.1, 0.3, 1]) for (let k = 0; k < RUNS; k++) {
      const { ctx, page } = await C.openPage(b, { dir, storageState: state, prepare: c => SYN.attach(c, S.STIM.steady, { level: 0 }) });
      try {
        await C.clearOverlays(page); await page.evaluate(T.CAPTURE_TAP); await S.warmMic(page);
        await page.evaluate(async g => { window.__rhythmLate = 0; const k = await sdOutputKey(); sdSave(k, { ms: 0, how: 'measured', heard: 10, gain: g || null, rig: true, at: Date.now() }); }, gain);
        await rhythm.open(page); await C.sleep(300); await T.runTake(page, rhythm); await C.sleep(800);
        const n = await page.evaluate(`(${rhythm.nums})()`);
        console.log(`gain ${String(gain).padEnd(3)} #${k + 1}: average ${n.average} · beats ${Object.entries(n).filter(([x]) => /^beat \d+$/.test(x)).map(([, v]) => v).join(',')}`);
      } finally { await ctx.close(); }
    }
  } finally { await b.close(); C.cleanup(); }
})();
