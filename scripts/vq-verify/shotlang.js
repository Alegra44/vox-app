// Screenshot of the Voice Quality result rows in each language at desktop width (after one real capture).
const { chromium } = require('playwright'); const path = require('path'), os = require('os');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${path.resolve(process.argv[2])}`] });
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
  const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
  const ov = p.locator('#languageSelectOverlay [data-lang="en"]'); if (await ov.isVisible()) await ov.click();
  await p.evaluate(async () => { blockExercise = () => false; enterPanel('voicequality'); document.getElementById('vqStartBtn').click(); });
  await p.waitForFunction(() => !vqActive && vqLast, null, { timeout: 15000 });
  for (const lg of ['en', 'fr', 'es', 'tr']) { await p.evaluate(l => setLanguage(l), lg); await p.waitForTimeout(300); await p.locator('#vqResult').screenshot({ path: path.join(TESTDATA, `vq-${lg}.png`) }); }
  await b.close();
})();
