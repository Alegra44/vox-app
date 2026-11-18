// Release D3: screenshots for the user's review (not a pass/fail check). The local build, signed out, no account. At
// 390 Light, 390 Dark and 1280 Light, with the app's output looped into its mic 90 ms late at full level (loopmic.js:
// a speaker loud at the mic, bleed gain ~1):
//   remeasure-measuring  a device measured before release D (a delay stored, no gain) at its next timing take: the sheet
//                        opens once more, measuring (1.5 s in), with the once-more line
//   remeasure-done       that measurement done: the delay, and the headphones line (gain 0.5 or more)
//   new-done             a device measured for the first time with the same loud speaker: the headphones line
// Out: <out>/<width>-<theme>/<name>.png and <out>/index.txt (what was stored). Usage: node scripts/survey-d/shotsD.js [--out dir]
require('../runguard').auto();
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('../design-verify/common');
const { LOOP } = require('../scoring-verify/loopmic');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.resolve(arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots-accuracyD'));
const COMBOS = [[390, 'light'], [390, 'dark'], [1280, 'light']];
const VIEW = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const index = [];
const shoot = async (page, dir, name) => { await C.sleep(400); await page.screenshot({ path: path.join(dir, name + '.png') }); };

(async () => {
  const b = await C.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const [w, theme] of COMBOS) {
      const dir = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(dir, { recursive: true });
      for (const old of [true, false]) {
        const { ctx, page } = await C.openPage(b, { viewport: VIEW[w], theme, prepare: c => c.addInitScript(LOOP, 90) });
        try {
          await C.clearOverlays(page);
          await page.evaluate(async old => {
            window.__sdAllow = true; localStorage.removeItem(SD_STORE_KEY); await initAudio({ noWarmup: true }); sdKeyNow = await sdOutputKey();
            if (old) sdSave(sdKeyNow, { ms: 90, how: 'measured', heard: 10, at: Date.now() - 864e5 }); // as release B/C stored it
            window.__gate = sdGate(); // what a timing take calls first
          }, old);
          if (old) { await C.sleep(1500); await shoot(page, dir, 'remeasure-measuring'); }
          await page.waitForFunction(() => document.getElementById('speakerDelayOverlay').dataset.sdState !== 'measuring', null, { timeout: 15000 });
          await shoot(page, dir, old ? 'remeasure-done' : 'new-done');
          const st = await page.evaluate(() => ({ stored: sdStored(), loudShown: !document.getElementById('sdLoud').hidden, body: document.getElementById('sdBody').textContent }));
          index.push(`${w}-${theme} ${old ? 'remeasure' : 'new'}: ${JSON.stringify(st)}`);
        } finally { await ctx.close(); }
      }
    }
  } finally { await b.close(); C.cleanup(); }
  fs.writeFileSync(path.join(OUT, 'index.txt'), index.join('\n') + '\n'); console.log(index.join('\n')); console.log('out', OUT);
})();
