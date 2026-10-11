// Shared by the phase 2 checks (house.js, contrast.js, shots.js): a browser whose fake mic sings a file, the stimuli,
// and the steps that drive the Tuner, Pitch Match, Interval Match and a Breath hold through the app's own buttons.
// Stimuli (test data, scripts/testdata.js): a real straight-tone note (VocalSet straight-625, vibfix.js S1) centred on
// A4 and looped for 40 s ("steady"), the same note sung 40 cents sharp (vibfix.js W2, "sharp": the Tuner never locks),
// and 40 s of silence (built here once: Pitch Match's "no voice" result).
const path = require('path'), fs = require('fs');
const { execFileSync } = require('child_process');
const { TESTDATA } = require('../testdata');
const C = require('./common');

const STIM = {
  steady: path.join(TESTDATA, 'vibfix', 'stim-S1.wav'),
  sharp: path.join(TESTDATA, 'vibfix', 'stim-W2.wav'),
  silence: path.join(TESTDATA, 'design-silence.wav'),
};
const STEADY_MIDI = 69; // A4: S1 is centred on it

function ensureStimuli() {
  for (const k of ['steady', 'sharp']) if (!fs.existsSync(STIM[k])) throw new Error(`${STIM[k]} missing: run node scripts/vq-verify/vibfix.js ${k === 'steady' ? 'S1' : 'W2'} once first`);
  if (!fs.existsSync(STIM.silence)) execFileSync('python3', ['-I', '-c', [
    'import sys, wave',
    'w = wave.open(sys.argv[1], "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000)',
    'w.writeframes(b"\\x00\\x00" * 48000 * 40); w.close()'].join('\n'), STIM.silence]);
}
const launchMic = file => C.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });

// The shared mic is opened once before a measured start, so a timing measures the lights, not the first getUserMedia.
const warmMic = page => page.evaluate(async () => { await initAudio({ noWarmup: true }); });

async function startTuner(page) {
  await C.showPanel(page, 'tuner'); await C.clearOverlays(page);
  return page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('micBtn').click(); return window.__t0; });
}
const tunerRunning = page => page.evaluate(() => mode === 'tuner');
async function stopTuner(page) {
  return page.evaluate(() => { window.__t1 = performance.now(); document.getElementById('micBtn').click(); return window.__t1; });
}
// Pitch Match on the steady note (the target is set to it, so the take is heard and scored)
async function openPitch(page, midi = STEADY_MIDI) {
  await C.showPanel(page, 'exercises'); await C.clearOverlays(page);
  await page.evaluate(m => {
    document.querySelector('.ex-type-btn[data-extype="pitch"]').click();
    pitchTargetMidi = m; document.getElementById('pitchTargetNote').textContent = noteNameFromMidi(m);
  }, midi);
}
const clickPitch = page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('pitchListenBtn').click(); });
const pitchBusy = page => page.evaluate(() => document.getElementById('pitchListenBtn').disabled);
async function waitPitchDone(page, ms = 20000) {
  await page.waitForFunction(() => !document.getElementById('pitchListenBtn').disabled, null, { timeout: ms });
}

// The warm-up overlay, opened as warmupGate() opens it. noWarmup.js presses Skip whenever it shows, so this page's Skip
// button ignores that click while the overlay is measured, and gets it back on close.
async function openWarmup(page) {
  await page.evaluate(() => { const sb = document.getElementById('warmupSkipBtn'); sb.click = () => {}; wuOpen(); });
  await C.sleep(400);
}
const closeWarmup = page => page.evaluate(() => { delete document.getElementById('warmupSkipBtn').click; wuFinish('skipped'); });

const houseIs = (page, h, ms) => page.waitForFunction(h => document.body.dataset.house === h, h, { timeout: ms }).then(() => true, () => false);
// The phase 2 states, in the order a stimulus can reach them. onState(name, root) is awaited at each moment, with root
// the selector of what's on screen (a panel or the overlay). Per stimulus:
//   steady:  tuner-idle, tuner-live-locked, tuner-result, pitch-idle, pitch-cue (the reference playing), pitch-live,
//            pitch-result-heard, breath-live (not staged), warmup-overlay
//   sharp:   tuner-live-unlocked
//   silence: pitch-result-noheard
async function runStates(page, stim, onState, only = null) {
  const want = n => !only || only.includes(n);
  await C.clearOverlays(page); await warmMic(page);
  if (stim === 'steady') {
    if (want('tuner-idle') || want('tuner-live-locked') || want('tuner-result')) {
      await C.showPanel(page, 'tuner'); await C.clearOverlays(page);
      if (want('tuner-idle')) await onState('tuner-idle', '#panel-tuner');
      await startTuner(page); await houseIs(page, 'down', 3000);
      await page.waitForFunction(() => document.getElementById('centsDisplay').textContent === 'In tune', null, { timeout: 6000 }).catch(() => {});
      await C.sleep(700);
      if (want('tuner-live-locked')) await onState('tuner-live-locked', '#panel-tuner');
      await C.sleep(800); await stopTuner(page); await houseIs(page, 'up', 3000); await C.sleep(500);
      if (want('tuner-result')) await onState('tuner-result', '#panel-tuner');
    }
    if (['pitch-idle', 'pitch-cue', 'pitch-live', 'pitch-result-heard'].some(want)) {
      await openPitch(page); await C.sleep(300);
      if (want('pitch-idle')) await onState('pitch-idle', '#panel-exercises');
      await clickPitch(page);
      await page.waitForFunction(() => document.body.dataset.house === 'down' && document.getElementById('pitchListenBtn').textContent === t('ex_listen_ref'), null, { timeout: 3000 }).catch(() => {});
      if (want('pitch-cue')) await onState('pitch-cue', '#panel-exercises');
      await page.waitForFunction(() => { const p = document.querySelector('#pitchLane .pm-lane-voice'); return !!p && (p.getAttribute('d') || '').split(/[ML]/).length > 40; }, null, { timeout: 8000 }).catch(() => {});
      if (want('pitch-live')) await onState('pitch-live', '#panel-exercises');
      await waitPitchDone(page); await houseIs(page, 'up', 3000); await C.sleep(500);
      if (want('pitch-result-heard')) await onState('pitch-result-heard', '#panel-exercises');
    }
    if (want('breath-live')) {
      await C.showPanel(page, 'breath'); await C.clearOverlays(page);
      await page.evaluate(() => document.getElementById('breathStartBtn').click()); await C.sleep(1500);
      await onState('breath-live', '#panel-breath');
      await page.evaluate(() => { if (breathActive) document.getElementById('breathStartBtn').click(); }); await C.sleep(800);
    }
    if (want('warmup-overlay')) {
      await openWarmup(page); await onState('warmup-overlay', '#warmupOverlay'); await closeWarmup(page); await C.sleep(300);
    }
  }
  if (stim === 'sharp' && want('tuner-live-unlocked')) {
    await C.showPanel(page, 'tuner'); await C.clearOverlays(page);
    await startTuner(page); await houseIs(page, 'down', 3000); await C.sleep(1500);
    await onState('tuner-live-unlocked', '#panel-tuner');
    await stopTuner(page); await houseIs(page, 'up', 3000);
  }
  if (stim === 'silence' && want('pitch-result-noheard')) {
    await openPitch(page); await clickPitch(page); await C.sleep(300);
    await waitPitchDone(page, 20000); await houseIs(page, 'up', 3000); await C.sleep(500);
    await onState('pitch-result-noheard', '#panel-exercises');
  }
}
const STATE_STIM = { steady: ['tuner-idle', 'tuner-live-locked', 'tuner-result', 'pitch-idle', 'pitch-cue', 'pitch-live', 'pitch-result-heard', 'breath-live', 'warmup-overlay'],
  sharp: ['tuner-live-unlocked'], silence: ['pitch-result-noheard'] };

module.exports = { openWarmup, closeWarmup, houseIs, runStates, STATE_STIM, STIM, STEADY_MIDI, ensureStimuli, launchMic, warmMic, startTuner, tunerRunning, stopTuner, openPitch, clickPitch, pitchBusy, waitPitchDone };
