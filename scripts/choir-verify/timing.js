// Phase 3: Entrance and Cutoff Trainer scoring with a stand-in singer whose note edges are scheduled at
// known offsets from the real targets; the measured offsets should match to within a few ms.
// The stand-in enters where a real voice does (5a.1): getUserMedia answers with a MediaStream from the app's own
// audioCtx (an oscillator through a gain the script schedules on the song clock), so every path the app reads
// (micGraph: analyser, micG.rawAn) hears it. A ~30 ms late reading is the known output/input latency item (HANDOFF).
// Usage: node scripts/choir-verify/timing.js [url]
const H = require('./harness'); // its own test account, time limits, cleanup however it ends (PHASE5A.md)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
const OFFSETS_MS = [0, 60, -50, 20, -120, 100, 0, 35];
(async () => {
  H.start('timing');
  const browser = await H.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const page = await (await browser.newContext({ permissions: ['microphone'] })).newPage();
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.addInitScript(() => {
    MediaDevices.prototype.getUserMedia = async () => {
      if (!audioCtx) await initAudioOnly(); // the app opens the mic before it makes its audioCtx
      if (!window.__mic) {
        const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), dest = audioCtx.createMediaStreamDestination();
        osc.frequency.value = 392; g.gain.value = 0; osc.connect(g).connect(dest); osc.start();
        window.__mic = { osc, g, dest };
      }
      return new MediaStream(__mic.dest.stream.getAudioTracks().map(t => t.clone()));
    };
  });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  H.step('load'); await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  await H.signUp(page, 'cvtiming');
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { enterPanel('partrehearsal'); selectSong('hymn'); setRehearsalPart('Alto'); });
  for (const mode of ['entrance', 'cutoff']) {
    H.step(`${mode} run`, 150);
    await ev(m => document.querySelector(`#ttModeRow [data-tt-mode="${m}"]`).click(), mode);
    await ev(async () => { document.getElementById('ttStartBtn').click(); while (!(timingTrainer.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await ev(([m, offs]) => {
      const { g } = __mic; g.gain.cancelScheduledValues(0); g.gain.setValueAtTime(0, audioCtx.currentTime);
      songTimeline().parts.Alto.forEach((nt, i) => {
        const on = nt.start + (m === 'entrance' ? offs[i] / 1000 : 0), off = nt.end + (m === 'cutoff' ? offs[i] / 1000 : 0);
        g.gain.setValueAtTime(0.4, choirStartCtxTime + on);
        g.gain.setValueAtTime(0, choirStartCtxTime + off);
      });
    }, [mode, OFFSETS_MS]);
    await ev(async () => { while (timingTrainer.active) await new Promise(r => setTimeout(r, 50)); });
    const got = await ev(() => timingTrainer.results.map(r => r.claimed ? r.offsetMs : null));
    const err = got.map((g, i) => g === null ? 'miss' : g - OFFSETS_MS[i]);
    console.log(`${mode}: injected ${JSON.stringify(OFFSETS_MS)} measured ${JSON.stringify(got)} error ms ${JSON.stringify(err)} maxAbs ${Math.max(...err.map(e => e === 'miss' ? Infinity : Math.abs(e)))}`);
  }
  console.log('page errors:', errors);
  await H.finish();
})();
