// exp/single-stream: smoke check of window.__streamMode. For today (unset) and C1–C3, signed out, local build, fake mic
// (a straight sung note): how many getUserMedia streams open after the shared mic, the register input and a Voice
// Quality capture, with which constraints; and that the shared analyser, computeRMS and readRegisterFrame read signal.
// Usage: node scripts/audio-verify/modecheck.js
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup');
const path = require('path'), { TESTDATA } = require('../testdata');
const WAV = path.join(TESTDATA, 'vibfix/stim-S1.wav');
(async () => {
  const srv = require('child_process').spawn('python3', ['-m', 'http.server', '8766'], { cwd: path.join(__dirname, '../../deploy'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  let fail = 0;
  try {
    for (const mode of [null, 'C1', 'C2', 'C3']) {
      const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] });
      const ctx = await b.newContext({ permissions: ['microphone'] });
      await ctx.addInitScript(m => {
        if (m) window.__streamMode = m;
        window.__gum = []; const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = c => { window.__gum.push(JSON.stringify(c.audio)); return g(c); };
      }, mode);
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
      await page.goto('http://localhost:8766/'); await page.waitForTimeout(2500);
      const r = await page.evaluate(async () => {
        await initAudio({ noWarmup: true }); await new Promise(r => setTimeout(r, 2500));
        analyser.getFloatTimeDomainData(dataArray); const f = autoCorrelate(dataArray, audioCtx.sampleRate), rms = computeRMS(dataArray);
        await openRegisterInput({ quiet: true }); await new Promise(r => setTimeout(r, 600));
        const fr = readRegisterFrame();
        vqActive = true; const vq = await vqCapture({ ms: 600, active: () => true, spectrum: false });
        const live = [micStream, regIn && regIn.stream].map(s => s && s.getAudioTracks()[0].readyState);
        return { gum: window.__gum, mode: ssMode(), shared: { f: Math.round(f), rms: +rms.toFixed(4) }, reg: { f: Math.round(fr.freq), chest: fr.chest && Math.round(fr.chest) }, vqFrames: vq.length, sameStream: !!regIn && regIn.stream === micStream, live };
      });
      const want = mode ? 1 : 3, ok = r.gum.length === want && r.shared.f > 0 && r.reg.f > 0 && r.vqFrames > 0 && !errors.length && (!mode || r.sameStream);
      if (!ok) fail++;
      console.log(`${ok ? '✓' : '✗'} ${String(mode || 'today').padEnd(5)} streams opened ${r.gum.length} (${r.gum.join(' | ')}) · shared f0 ${r.shared.f} Hz rms ${r.shared.rms} · register f0 ${r.reg.f} chest ${r.reg.chest} · VQ frames ${r.vqFrames} · one stream ${r.sameStream} · tracks ${r.live.join('/')}${errors.length ? ' · ERRORS ' + errors.join(' | ') : ''}`);
      await b.close();
    }
  } finally { srv.kill(); }
  console.log(fail ? `${fail} failed` : 'all passed'); process.exitCode = fail ? 1 : 0;
})();
