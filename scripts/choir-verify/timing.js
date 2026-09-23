// Phase 3: Entrance and Cutoff Trainer scoring with a stand-in singer whose note edges are scheduled at
// known offsets from the real targets; the measured offsets should match to within a few ms.
// Usage: node scripts/choir-verify/timing.js [url]
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
const OFFSETS_MS = [0, 60, -50, 20, -120, 100, 0, 35];
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const page = await (await browser.newContext({ permissions: ['microphone'] })).newPage();
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { enterPanel('partrehearsal'); selectSong('hymn'); setRehearsalPart('Alto'); });
  for (const mode of ['entrance', 'cutoff']) {
    await ev(m => document.querySelector(`#ttModeRow [data-tt-mode="${m}"]`).click(), mode);
    await ev(async () => { document.getElementById('ttStartBtn').click(); while (!(timingTrainer.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await ev(([m, offs]) => {
      const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
      an.fftSize = 2048; g.gain.value = 0; osc.frequency.value = 392; osc.connect(g).connect(an); osc.start();
      songTimeline().parts.Alto.forEach((nt, i) => {
        const on = nt.start + (m === 'entrance' ? offs[i] / 1000 : 0), off = nt.end + (m === 'cutoff' ? offs[i] / 1000 : 0);
        g.gain.setValueAtTime(0.4, choirStartCtxTime + on);
        g.gain.setValueAtTime(0, choirStartCtxTime + off);
      });
      analyser = an;
    }, [mode, OFFSETS_MS]);
    await ev(async () => { while (timingTrainer.active) await new Promise(r => setTimeout(r, 50)); });
    const got = await ev(() => timingTrainer.results.map(r => r.claimed ? r.offsetMs : null));
    const err = got.map((g, i) => g === null ? 'miss' : g - OFFSETS_MS[i]);
    console.log(`${mode}: injected ${JSON.stringify(OFFSETS_MS)} measured ${JSON.stringify(got)} error ms ${JSON.stringify(err)} maxAbs ${Math.max(...err.map(e => e === 'miss' ? Infinity : Math.abs(e)))}`);
  }
  console.log('page errors:', errors);
  await browser.close();
})();
