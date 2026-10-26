// Phase 4b (PHASE4B.md §1a): a synthetic mic, for the stimuli that must follow the app's own clock: Rhythm's sung onsets
// on its beats (and the same 60 ms late), and Emotion Mode's second take 6 dB louder. getUserMedia answers with a
// MediaStream from an AudioContext of the page's own, playing a stimulus file (looped) through a gain the check drives;
// everything after getUserMedia (micGraph, the analysers, the scoring) is the app's own path, on master and the branch alike.
// Usage: openPage(b, { prepare: ctx => synth.attach(ctx, file, { level }) }) in a browser from synth.launch(); in the page:
//   __synth.level(g)            the gain from now on (1 = the file as it is)
//   __synth.pulses(times, ms)   an onset at each performance.now() time: the gain up for ms, silent between
const fs = require('fs');
const C = require('./common');

const launch = () => C.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });

const INIT = level0 => {
  const md = navigator.mediaDevices; if (!md) return;
  let S = null, opening = null, level = level0;
  const make = async () => {
    const ac = new AudioContext({ sampleRate: 48000 });
    const buf = await ac.decodeAudioData(await (await fetch('/__stim.wav')).arrayBuffer());
    const src = ac.createBufferSource(), g = ac.createGain(), dest = ac.createMediaStreamDestination();
    src.buffer = buf; src.loop = true; g.gain.value = level;
    src.connect(g).connect(dest); src.start();
    if (ac.state !== 'running') await ac.resume();
    return (S = { ac, g, dest });
  };
  window.__synth = {
    level: v => { level = v; if (S) { S.g.gain.cancelScheduledValues(S.ac.currentTime); S.g.gain.setValueAtTime(v, S.ac.currentTime); } },
    pulses: (times, ms = 150) => {
      const { ac, g } = S, now = performance.now(), base = ac.currentTime;
      g.gain.cancelScheduledValues(base); g.gain.setValueAtTime(0, base);
      for (const ts of times) {
        const at = base + (ts - now) / 1000; if (at <= base) continue;
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at + 0.005);
        g.gain.setValueAtTime(1, at + ms / 1000); g.gain.linearRampToValueAtTime(0, at + ms / 1000 + 0.02);
      }
    },
  };
  md.getUserMedia = async () => {
    if (!S) { if (!opening) opening = make(); await opening; }
    return new MediaStream(S.dest.stream.getAudioTracks().map(t => t.clone()));
  };
};

// Serves `file` at /__stim.wav (registered after openPage's own route, so it wins) and installs the mic.
async function attach(ctx, file, { level = 1 } = {}) {
  const body = fs.readFileSync(file);
  await ctx.route('**/__stim.wav', r => r.fulfill({ status: 200, contentType: 'audio/wav', body }));
  await ctx.addInitScript(INIT, level);
}

module.exports = { launch, attach };
