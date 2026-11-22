// Scoring accuracy batch, part S (design/scoring/SCORING.md): today's scores on fixed stimuli, for the three scored song
// tools whose Timing, Dynamics and Expression the batch is about (Performance Director, Karaoke Coach, Emotional
// Singing), driven through the app's own Start buttons (tools6.js), signed in on a throwaway account.
// The mic is synthetic (an AudioContext of the page's own behind getUserMedia, like synthmic.js), so every stimulus
// follows the tool's own clock. The voice is stage.js's steady A4 (a real straight-tone note, VocalSet S1, from 5 s in:
// past its own onset), moved onto each Lead note by playback rate. Stimuli:
//   steady   the A4 held through the whole song at one level, sounding from 1.2 s before Start (no onset in the take)
//   ontime   the Lead line sung note by note: each note starts on its chord (a 40 ms rise), is held for 85 % of the
//            chord and released over 60 ms, silence until the next
//   late150  the same, every note 150 ms late
//   silence  nothing
//   loud     ontime, in a loud room (pink noise, −23 dB under the voice) with the backing leaking into the mic (the four
//            backing parts as soft triangle tones on the tool's backing clock, −19 dB under the voice)
//   dynamic  ontime with a planned loudness shape (note levels −12 … 0 dB): a measure of dynamics has something to find
//   skips    ontime with notes 3 and 6 left out (the two Timing averages, item 4)
//   loudlate late150 in the loud room: the backing's own chord starts are on time, the voice is not (does a rule hear
//            the backing as the singer's onset?)
// Each take records, besides the tool's own numbers: every computeRMS and autoCorrelate call of the take (time, value),
// and every vibratoTolerantCents call (readings in, values out: item 3).
// Release B added, for its own measurements (SCORING.md):
//   --voice <wav> [--voice-from <s>, default 5] [--voice-to <s>, default its end] [--voice-gain-db <dB>, default 0]
//                [--voice-midi <m>: the voice's own pitch; each Lead note then sung on pitch, in the voice's nearest octave (release E)]
//                                                another recording as the voice, looped from..to, at a gain (B5: VocalSet)
//   --stub-lanes  Performance Director's lanes not drawn (cwLanesFrame, cwVoicePush stubbed): does drawing move its onsets?
//   each take also keeps the tool's onsets (time, the frame it was found in, kind) and its frame intervals (B3: PD's ~20 ms)
// Usage: node scripts/scoring-verify/survey.js [--ref <git ref>] [--runs 2] [--stims a,b] [--tools pd,karaoke,emotion] [--out f.json]
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const C = require('../design-verify/common'), S = require('../design-verify/stage'), T6 = require('../design-verify/tools6');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref'), RUNS = +(arg('--runs') || 2);
const STIMS = (arg('--stims') || 'steady,ontime,late150,silence,loud,dynamic,skips,loudlate').split(',');
const TOOLS = (arg('--tools') || 'pd,karaoke,emotion').split(',').map(k => T6.byKey(k));
const VOICE_MIDI = arg('--voice-midi') ? +arg('--voice-midi') : null; // the voice's own pitch (MIDI, may be fractional): shifted onto the nearest octave of each Lead note (the tools fold octaves), so a vibrato's rate changes by ×1.41 at most
const VOICE = arg('--voice'), VOICE_FROM = +(arg('--voice-from') || 5), VOICE_TO = arg('--voice-to') ? +arg('--voice-to') : null, VOICE_GAIN_DB = +(arg('--voice-gain-db') || 0), STUB_LANES = process.argv.includes('--stub-lanes');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = arg('--out') || path.join(__dirname, 'logs', `survey-${REF || 'working'}-${stamp}.json`.replace(/\//g, '_'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const PLANS = {
  steady: { steady: true }, ontime: {}, late150: { late: 150 }, silence: { silent: true },
  loud: { noise: 0.015, backing: 0.025 }, dynamic: { gains: [0.25, 0.35, 0.5, 0.7, 1, 0.6, 0.4, 0.8] }, skips: { skip: [2, 5] }, loudlate: { late: 150, noise: 0.015, backing: 0.025 },
};

// in the page, before it loads: the synthetic mic and the taps
const INIT = () => {
  const md = navigator.mediaDevices; if (!md) return;
  let S = null, opening = null;
  const make = async () => {
    const ac = new AudioContext({ sampleRate: 48000 });
    const buf = await ac.decodeAudioData(await (await fetch('/__stim.wav')).arrayBuffer());
    const src = ac.createBufferSource(), g = ac.createGain(), dest = ac.createMediaStreamDestination();
    const to = window.__voiceTo ? Math.min(window.__voiceTo, buf.duration) : buf.duration, from = Math.min(window.__voiceFrom ?? 5, window.__voiceTo ? to - 0.5 : buf.duration / 2);
    const vg = ac.createGain(); vg.gain.value = Math.pow(10, (window.__voiceGainDb || 0) / 20);
    src.buffer = buf; src.loop = true; src.loopStart = from; src.loopEnd = to; g.gain.value = 0;
    src.connect(vg).connect(g).connect(dest); src.start(0, from);
    // pink noise (Voss–McCartney-ish: summed octave-held white), 10 s looped
    const n = ac.sampleRate * 10, nb = ac.createBuffer(1, n, ac.sampleRate), d = nb.getChannelData(0); const rows = new Float32Array(8); let sum = 0;
    for (let i = 0; i < n; i++) { for (let k = 0; k < 8; k++) if ((i & ((1 << k) - 1)) === 0) { sum -= rows[k]; rows[k] = Math.random() * 2 - 1; sum += rows[k]; } d[i] = sum / 8; }
    let e = 0; for (let i = 0; i < n; i++) e += d[i] * d[i]; const k0 = 1 / Math.sqrt(e / n); for (let i = 0; i < n; i++) d[i] *= k0; // rms 1
    const ns = ac.createBufferSource(), ng = ac.createGain(); ns.buffer = nb; ns.loop = true; ng.gain.value = 0; ns.connect(ng).connect(dest); ns.start();
    const bg = ac.createGain(); bg.gain.value = 0; bg.connect(dest);
    if (ac.state !== 'running') await ac.resume();
    return (S = { ac, g, dest, src, ng, bg, oscs: [] });
  };
  const at = (ms, now, base) => base + (ms - now) / 1000;
  // {perf, ctx} of an AudioContext read at the start of a render burst (Chrome renders ~10.7 ms of quanta at once, then
  // waits): a currentTime that moves after ≥ 4 ms still, so performance.now() and currentTime belong to the same moment
  const fresh = ac => { let c0 = ac.currentTime, p0 = performance.now(); const u = p0 + 60;
    for (;;) { const c = ac.currentTime, p = performance.now(); if (c !== c0) { if (p - p0 >= 4 || p > u) return { perf: p, ctx: c }; c0 = c; p0 = p; } else if (p > u) return { perf: p, ctx: c }; } };
  window.__freshClock = fresh;
  window.__synth = {
    ready: () => !!S,
    idle: () => { if (!S) return; const t = S.ac.currentTime; for (const p of [S.g.gain, S.ng.gain, S.bg.gain, S.src.playbackRate]) p.cancelScheduledValues(t);
      S.g.gain.setValueAtTime(0, t); S.ng.gain.setValueAtTime(0, t); S.bg.gain.setValueAtTime(0, t); S.src.playbackRate.setValueAtTime(1, t); S.oscs.forEach(o => { try { o.stop(); } catch (e) {} }); S.oscs = []; },
    steadyOn: () => { const t = S.ac.currentTime; S.g.gain.cancelScheduledValues(t); S.g.gain.setValueAtTime(1, t); },
    // notes: [{semis, on, off, gain}] in performance.now() ms; noise, backing {t0, dur, chords:[[midi…]], level}
    play: (notes, noise, backing) => {
      const { ac, g, src } = S, fc = fresh(ac), now = fc.perf, base = fc.ctx;
      g.gain.cancelScheduledValues(base); g.gain.setValueAtTime(0, base); src.playbackRate.cancelScheduledValues(base);
      for (const n of notes) {
        const on = Math.max(base, at(n.on, now, base)), off = at(n.off, now, base);
        src.playbackRate.setValueAtTime(Math.pow(2, n.semis / 12), Math.max(base, on - 0.004));
        g.gain.setValueAtTime(0, on); g.gain.linearRampToValueAtTime(n.gain, on + 0.04);
        g.gain.setValueAtTime(n.gain, off); g.gain.linearRampToValueAtTime(0, off + 0.06);
      }
      if (noise) S.ng.gain.setValueAtTime(noise, base);
      if (backing) {
        S.bg.gain.setValueAtTime(1, base);
        backing.chords.forEach((ch, i) => ch.forEach(m => {
          const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
          const s = Math.max(base, at(backing.t0 + i * backing.dur, now, base)), e = s + backing.dur / 1000 * 0.94, lv = backing.level / Math.sqrt(ch.length) * Math.SQRT2;
          og.gain.setValueAtTime(0, s); og.gain.linearRampToValueAtTime(lv, s + 0.08); og.gain.setValueAtTime(lv, e - 0.1); og.gain.linearRampToValueAtTime(0, e);
          o.connect(og).connect(S.bg); o.start(s); o.stop(e + 0.02); S.oscs.push(o);
        }));
      }
    },
  };
  md.getUserMedia = async () => { if (!S) { if (!opening) opening = make(); await opening; } return new MediaStream(S.dest.stream.getAudioTracks().map(t => t.clone())); };
};
// the taps (after the page's script): every reading of a take, and vibratoTolerantCents' in/out counts
const TAP = () => {
  if (window.__tapped) return; window.__tapped = true; window.__rec = null;
  if (window.__stubLanes) { cwLanesFrame = () => {}; cwVoicePush = () => {}; }
  const r0 = computeRMS, a0 = autoCorrelate, v0 = vibratoTolerantCents, b0 = playBackingPad;
  // the backing's own t0 (on the audio clock), as a performance.now() time: where its leak goes in the loud stimuli
  playBackingPad = async function () { const t0 = await b0.apply(this, arguments); window.__bkPerf = performance.now() + (t0 - audioCtx.currentTime) * 1000; return t0; };
  computeRMS = function (b) { const v = r0.apply(this, arguments); if (window.__rec) window.__rec.rms.push([performance.now(), v]); return v; };
  autoCorrelate = function () { const v = a0.apply(this, arguments); if (window.__rec) window.__rec.f.push([performance.now(), v]); return v; };
  vibratoTolerantCents = function (pts) { const out = v0.apply(this, arguments); if (window.__rec) window.__rec.vtc.push([pts.length, out.length]); return out; };
};

const START = { pd: ['pdStartBtn', 'pdActive', 'pdStartTime', 'pdStartCtx'], karaoke: ['karaokeStartBtn', 'karaokeActive', 'karaokeStartTime', 'karaokeStartCtx'], emotion: ['emotionStartBtn', 'emotionActive', 'emotionStartTime', 'emotionStartCtx'] };
// From release B the four tools score on the audio clock (micClockMs): the stimulus is put on the tool's audio-clock
// start, mapped to performance.now() at the start of a render burst; a build without one (master) keeps its own clock.
// Start, and once the tool's clock is known, the stimulus on it. The backing's leak (Karaoke, Emotional Singing) goes where
// the backing really starts: its own t0, read from playBackingPad (on master 80 ms after the tool's clock; from release
// B's B1 the tool's clock is the backing's). PD plays no backing: its leak, harsher than the app, is put on its clock.
const startTake = (page, key, plan) => page.evaluate(async ({ ids: [btn, active, startVar, ctxVar], plan, key }) => {
  const g = v => new Function('return (' + v + ')')();
  __synth.idle(); if (plan.steady) { __synth.steadyOn(); await new Promise(r => setTimeout(r, 1200)); } // held: sounding well before Start
  window.__rec = { rms: [], f: [], vtc: [] }; window.__bkPerf = null;
  document.getElementById(btn).click();
  const until = performance.now() + 8000;
  while (!g(active) && performance.now() < until) await new Promise(r => setTimeout(r, 2));
  if (!g(active)) return { started: false };
  let hasCtx = false; try { hasCtx = typeof g(ctxVar) === 'number'; } catch (e) {}
  const t0 = hasCtx ? (fc => fc.perf + (g(ctxVar) - fc.ctx) * 1000)(__freshClock(audioCtx)) : g(startVar), D = songChordDurMs(), lead = SONG.parts.Lead.notes, late = plan.late || 0;
  window.__rec.t0 = t0; window.__rec.bk = window.__bkPerf; window.__rec.D = D; window.__rec.lead = lead.slice();
  if (!plan.steady && !plan.silent) {
    const notes = lead.map((m, i) => ({ semis: window.__voiceMidi ? (d => d - 12 * Math.round(d / 12))(m - window.__voiceMidi) : m - 69, on: t0 + i * D + late, off: t0 + (i + 0.85) * D + late, gain: plan.gains ? plan.gains[i % plan.gains.length] : 1 }))
      .filter((_, i) => !(plan.skip || []).includes(i));
    const backing = plan.backing ? { t0: key === 'pd' || hasCtx || window.__bkPerf == null ? t0 : window.__bkPerf, dur: D, level: plan.backing, chords: lead.map((_, i) => ['Soprano', 'Alto', 'Tenor', 'Bass'].map(p => SONG.parts[p].notes[i])) } : null;
    __synth.play(notes, plan.noise || 0, backing);
    window.__rec.lateBy = Math.max(0, performance.now() - t0); // how late the first note's schedule was made
  } else if (plan.noise) __synth.play([], plan.noise, null);
  return { started: true };
}, { ids: START[key], plan, key });

(async () => {
  S.ensureStimuli();
  const b = await C.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  const data = { ref: REF || 'working copy', runs: RUNS, stims: STIMS, plans: PLANS, takes: [] };
  try {
    const dir = C.buildDir(REF);
    const a = await C.openPage(b, { dir }); await C.signUp(a.page, 'dvscore', 'Score Survey'); const state = await a.ctx.storageState(); await a.ctx.close();
    const body = fs.readFileSync(VOICE || S.STIM.steady);
    for (let run = 0; run < RUNS; run++) for (const stim of STIMS) {
      const { ctx, page, errors } = await C.openPage(b, { dir, theme: 'light', storageState: state,
        prepare: async c => { await c.route('**/__stim.wav', r => r.fulfill({ status: 200, contentType: 'audio/wav', body })); await c.addInitScript(([f, t, gdb, vm]) => { window.__voiceFrom = f; window.__voiceTo = t; window.__voiceGainDb = gdb; window.__voiceMidi = vm; }, [VOICE_FROM, VOICE_TO, VOICE_GAIN_DB, VOICE_MIDI]); await c.addInitScript(INIT); } });
      try {
        await C.clearOverlays(page); await page.evaluate(stub => { window.__stubLanes = stub; }, STUB_LANES); await page.evaluate(TAP); await S.warmMic(page);
        for (const tool of TOOLS) {
          await C.G.step(`${stim} ${tool.key} run ${run + 1}`, 75, async () => { // normally 27 s of song + 3 s
            await tool.open(page); await C.sleep(300);
            await page.evaluate(() => { window.__skills = []; });
            const st = await startTake(page, tool.key, PLANS[stim]);
            if (st.started) await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: 45000, polling: 200 });
            await C.sleep(900);
            const nums = st.started ? await page.evaluate(`(${tool.nums})()`) : null;
            const extra = await page.evaluate(k => {
              const o = { emotionShown: null };
              if (k === 'pd') o.results = pdResults.map(r => r && { ...r }), o.rmsSamples = pdRmsSamples.length, o.dynamicsShown = document.getElementById('pdDynamicsVal').textContent;
              if (k === 'karaoke') o.results = karaokeResults.map(r => r && { ...r }), o.songBest = progress.songBestScores && progress.songBestScores[currentSongId];
              if (k === 'emotion') o.emotionShown = { pitch: document.getElementById('emotionPitchVal').textContent, expr: document.getElementById('emotionExpressionVal').textContent, fb: document.getElementById('emotionFeedback').textContent };
              o.skills = (window.__skills || []).map(s => [s.cat, s.score]);
              const tr = k === 'pd' ? window.pdOnset || (typeof pdOnset !== 'undefined' ? pdOnset : null) : k === 'karaoke' ? (typeof karaokeOnset !== 'undefined' ? karaokeOnset : null) : null;
              if (tr) o.onsets = tr.onsets.map(x => ({ t: +x.t.toFixed(1), at: x.at === undefined ? null : +x.at.toFixed(1), kind: x.kind, db: +x.db.toFixed(1) }));
              o.shape = typeof levelShape === 'function' && (k === 'pd' || k === 'emotion') ? levelShape(k === 'pd' ? pdFrames : emotionFrames) : null; // release B (B5)
              return o;
            }, tool.key);
            const rec = await page.evaluate(() => { const r = window.__rec; window.__rec = null; return r; });
            if (rec && rec.f.length > 2) { // the frame intervals: one autoCorrelate call per frame of the tool's loop
              const dt = rec.f.slice(1).map((x, i) => x[0] - rec.f[i][0]).sort((a, b) => a - b), q = p => +dt[Math.min(dt.length - 1, Math.floor(dt.length * p))].toFixed(1);
              extra.frameMs = { median: q(0.5), p90: q(0.9), max: q(0.999) };
            }
            await page.evaluate(() => { __synth.idle(); try { stopAllActiveSessions(); } catch (e) {} }); await C.sleep(300);
            data.takes.push({ run: run + 1, stim, tool: tool.key, started: st.started, nums, extra, rec, errors: errors.slice() });
            const pick = nums ? Object.fromEntries(Object.entries(nums).filter(([n]) => !/^note |^mission/.test(n))) : 'not started';
            console.log(`${stim.padEnd(8)} ${tool.key.padEnd(8)} #${run + 1} ${JSON.stringify(pick)} · frames ${rec ? rec.rms.length : 0}${rec && rec.lateBy ? ` · scheduled ${rec.lateBy.toFixed(1)} ms after the clock` : ''}`);
            fs.writeFileSync(OUT, JSON.stringify(data));
          });
        }
      } finally { await ctx.close(); }
    }
  } finally { await b.close(); C.cleanup(); }
  console.log(`\njson: ${path.relative(C.ROOT, OUT)}`);
})();
