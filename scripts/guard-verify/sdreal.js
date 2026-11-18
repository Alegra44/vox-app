// GUARD.md part a: release B's speaker-delay sheet on this Mac's own speakers and microphone, with the echo canceller
// on (as the app asks), against a reference with the canceller off; and three probes for the measurement (the click, a
// short chirp, a held chord), each on the app's own stream (canceller on) and on a separate canceller-off stream opened
// only for that measurement. Nobody sings; a quiet room. LOUD: the system output volume is set to each of --volumes
// (osascript; put back at exit) and the probes play out of the speakers. A visible window (headless plays nothing).
// No account (signed out), the master build. Per volume:
//   sheet      the app's own sdMeasure ×RUNS, canceller on                     → heard (of 10), ms, ok
//   sheet-ref  the app's own sdMeasure ×REF on a page whose mic has the canceller off (getUserMedia's constraints
//              rewritten for that page only)                                  → the reference ms
//   probes     click / chirp / chord × (app stream | a separate canceller-off stream) ×RUNS: per probe heard (of K),
//              delay (median of the heard), gain (output → mic amplitude: the recorded probe over the probe sent)
// The gain is what the guard needs: the click's gain against the chord's (a sustained tone, as music is) says whether
// the canceller treats them alike.
// Usage: node scripts/guard-verify/sdreal.js [--volumes 50,100] [--runs 10] [--ref-runs 5] [--out <json>]
require('../runguard').auto();
const fs = require('fs');
const C = require('../design-verify/common');
const { execFileSync } = require('child_process');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const VOLUMES = (arg('--volumes') || '50,100').split(',').map(Number), RUNS = +(arg('--runs') || 10), REF = +(arg('--ref-runs') || 5);
const osa = cmd => execFileSync('osascript', ['-e', cmd]).toString().trim();

// For the reference page: every getUserMedia asks for the canceller off.
const AEC_OFF = () => {
  const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = c => gum(c && c.audio ? { ...c, audio: { ...(typeof c.audio === 'object' ? c.audio : {}), echoCancellation: false } } : c);
};

// In the page: one measurement with a probe on a stream. Same analysis as sdMeasure (a quiet stretch before the first
// probe for the floor; a matched filter within SD_SEARCH_S after each probe; heard when its SNR is over SD_SNR); the
// chord (periodic, so its matched filter is ambiguous by a period) by its envelope instead, heard when its level over the
// floor is above SD_SNR too.
const PROBE = async ({ kind, aecOff }) => {
  await initAudio({ noWarmup: true }); const g = await micGraph();
  const sr = audioCtx.sampleRate;
  let src = g.raw, extra = null;
  if (aecOff) { extra = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); src = audioCtx.createMediaStreamSource(extra); }
  if (!window.__gvRec) window.__gvRec = audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob(["class GvRec extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage({f:currentFrame,d:c.slice(0)});return true;}}registerProcessor('gv-rec',GvRec);"], { type: 'application/javascript' })));
  await window.__gvRec;
  const node = new AudioWorkletNode(audioCtx, 'gv-rec'), sink = audioCtx.createGain(); sink.gain.value = 0;
  const blocks = []; node.port.onmessage = e => blocks.push(e.data);
  src.connect(node); node.connect(sink).connect(audioCtx.destination);
  // the probe, as sent (after its gain node)
  const G = 1.6; let p;
  if (kind === 'click') { const L = Math.round(sr * 0.002); p = new Float32Array(L); for (let i = 0; i < L; i++) p[i] = Math.sin(2 * Math.PI * 3000 * i / sr) * 0.5 * (1 - Math.cos(2 * Math.PI * i / (L - 1))); }
  else if (kind === 'chirp') { const L = Math.round(sr * 0.02), f0 = 500, f1 = 6000, T = L / sr; p = new Float32Array(L); for (let i = 0; i < L; i++) { const t = i / sr, w = Math.min(1, i / (sr * 0.003), (L - 1 - i) / (sr * 0.003)); p[i] = 0.5 * w * Math.sin(2 * Math.PI * (f0 * t + (f1 - f0) * t * t / (2 * T))); } }
  else { const L = Math.round(sr * 0.3), fs_ = [261.63, 329.63, 392.0, 523.25]; p = new Float32Array(L); for (let i = 0; i < L; i++) { const w = Math.min(1, i / (sr * 0.01), (L - 1 - i) / (sr * 0.01)); let s = 0; for (const f of fs_) s += Math.sin(2 * Math.PI * f * i / sr); p[i] = 0.125 * w * s; } }
  const L = p.length, buf = audioCtx.createBuffer(1, L, sr); buf.copyToChannel(p, 0);
  const K = kind === 'chord' ? 6 : SD_CLICKS, at = k => kind === 'chord' ? k * 0.7 : sdClickAt(k);
  const T0 = audioCtx.currentTime + SD_FIRST_S, times = [];
  for (let k = 0; k < K; k++) { const b = audioCtx.createBufferSource(), gn = audioCtx.createGain(); gn.gain.value = G; b.buffer = buf; b.connect(gn).connect(audioCtx.destination); b.start(T0 + at(k)); times.push(T0 + at(k)); }
  const endAt = T0 + at(K - 1) + Math.max(SD_SEARCH_S, L / sr + 0.35) + 0.05;
  while (audioCtx.currentTime < endAt) await new Promise(r => setTimeout(r, 50));
  node.port.onmessage = null; try { src.disconnect(node); } catch (e) {} node.disconnect(); sink.disconnect();
  if (extra) extra.getTracks().forEach(t => t.stop());
  const aec = (extra || g.stream).getAudioTracks()[0].getSettings().echoCancellation;
  if (!blocks.length) return { kind, aecOff, aec, heard: 0, of: K, error: 'no audio recorded' };
  const f0 = blocks[0].f, last = blocks[blocks.length - 1], n = last.f - f0 + last.d.length, x = new Float32Array(n);
  for (const b of blocks) { const o = b.f - f0; if (o >= 0 && o + b.d.length <= n) x.set(b.d, o); }
  const q0 = Math.max(0, Math.round(times[0] * sr) - f0 - Math.round(0.4 * sr)), q1 = Math.round(times[0] * sr) - f0 - Math.round(0.02 * sr);
  let e = 0; for (let i = q0; i < q1; i++) e += x[i] * x[i];
  const floor = Math.sqrt(e / Math.max(1, q1 - q0)); let pk = 0; for (let i = 0; i < L; i++) pk += p[i] * p[i];
  const S = Math.round(SD_SEARCH_S * sr), per = [];
  for (const t of times) {
    const i0 = Math.round(t * sr) - f0; if (i0 < 0 || i0 + S + L > n) continue;
    if (kind !== 'chord') {
      let best = -1, bi = -1;
      for (let d = 0; d < S; d++) { let c = 0; const j = i0 + d; for (let i = 0; i < L; i++) c += x[j + i] * p[i]; c = Math.abs(c); if (c > best) { best = c; bi = d; } }
      per.push({ snr: best / (floor * Math.sqrt(pk * L) + 1e-12), ms: bi / sr * 1000, gain: best / (pk * G) });
    } else { // the envelope: 2 ms mean of |x| against the probe's envelope (a box with 10 ms ramps)
      const h = Math.round(sr * 0.002), env = new Float32Array(S + L); let acc = 0;
      for (let i = 0; i < S + L; i++) { acc += Math.abs(x[i0 + i]); if (i >= h) acc -= Math.abs(x[i0 + i - h]); env[i] = acc / h; }
      let best = -1, bi = -1; const step = Math.round(sr * 0.0005);
      for (let d = 0; d < S; d += step) { let c = 0; for (let i = 0; i < L; i += 8) c += env[d + i] * Math.min(1, i / (sr * 0.01), (L - 1 - i) / (sr * 0.01)); if (c > best) { best = c; bi = d; } }
      let r = 0; const a = i0 + bi + Math.round(sr * 0.05), z = i0 + bi + L - Math.round(sr * 0.05); for (let i = a; i < z; i++) r += x[i] * x[i];
      const rms = Math.sqrt(r / (z - a)), sent = 0.125 * Math.sqrt(4 / 2) * G; // four unit sines × 0.125, × G
      per.push({ snr: rms / (floor + 1e-12), ms: bi / sr * 1000, gain: rms / sent });
    }
  }
  const heard = per.filter(q => q.snr > SD_SNR), med = a => { if (!a.length) return null; const q = a.slice().sort((u, v) => u - v); return q.length % 2 ? q[q.length >> 1] : (q[q.length / 2 - 1] + q[q.length / 2]) / 2; };
  return { kind, aecOff, aec, of: K, heard: heard.length, ms: med(heard.map(q => q.ms)) && +med(heard.map(q => q.ms)).toFixed(1), gain: heard.length ? +med(heard.map(q => q.gain)).toFixed(4) : null,
    floor: +floor.toFixed(5), snrs: per.map(q => +q.snr.toFixed(1)), dbg: window.__gvDbg ? { n, f0, t0f: Math.round(times[0] * sr), nblocks: blocks.length, rmsTail: Math.sqrt(x.slice(n >> 1).reduce((s, v) => s + v * v, 0) / (n >> 1)) } : undefined };
};

(async () => {
  const b = await C.chromium.launch({ headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  const volume0 = osa('output volume of (get volume settings)'), muted0 = osa('output muted of (get volume settings)');
  osa('set volume without output muted');
  const res = { volumes: VOLUMES, runs: RUNS, refRuns: REF, at: new Date().toISOString(), cells: [] };
  const put = (o) => { res.cells.push(o); console.log(JSON.stringify(o)); };
  try {
    for (const vol of VOLUMES) {
      osa(`set volume output volume ${vol}`); console.log(`== volume ${vol} %`);
      // the reference: the sheet's own code, the canceller off
      { const { ctx, page } = await C.openPage(b, { dir: C.DEPLOY, prepare: c => c.addInitScript(AEC_OFF) });
        try { await C.clearOverlays(page);
          for (let k = 0; k < REF; k++) { const r = await page.evaluate(async () => { await initAudio({ noWarmup: true }); const r = await sdMeasure({}); return { ...r, aec: micStream.getAudioTracks()[0].getSettings().echoCancellation }; }); put({ vol, what: 'sheet-ref', run: k + 1, ...r }); }
        } finally { await ctx.close(); } }
      // the sheet as the app runs it, then the probes, on one page (the app's stream stays open, as in a session)
      { const { ctx, page } = await C.openPage(b, { dir: C.DEPLOY });
        try { await C.clearOverlays(page);
          for (let k = 0; k < RUNS; k++) { const r = await page.evaluate(async () => { await initAudio({ noWarmup: true }); const r = await sdMeasure({}); return { ...r, aec: micStream.getAudioTracks()[0].getSettings().echoCancellation }; }); put({ vol, what: 'sheet', run: k + 1, ...r }); }
          for (const aecOff of [false, true]) for (const kind of ['click', 'chirp', 'chord']) for (let k = 0; k < RUNS; k++) {
            const r = await page.evaluate(PROBE, { kind, aecOff }); put({ vol, what: 'probe', run: k + 1, ...r });
          }
        } finally { await ctx.close(); } }
    }
  } finally {
    osa(`set volume output volume ${volume0}`); if (muted0 === 'true') osa('set volume with output muted');
    await b.close();
    if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
  }
  // summary
  const med = a => { const v = a.filter(x => x !== null && x !== undefined).sort((p, q) => p - q); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
  console.log('\n== summary (median; heard as the share of runs where the sheet would have stored a delay, or heard/of for probes)');
  for (const vol of VOLUMES) {
    const ref = res.cells.filter(c => c.vol === vol && c.what === 'sheet-ref'), sh = res.cells.filter(c => c.vol === vol && c.what === 'sheet');
    const refMs = med(ref.filter(c => c.ok).map(c => c.ms));
    console.log(`volume ${vol}: reference (canceller off) ok ${ref.filter(c => c.ok).length}/${ref.length}, ${refMs} ms · sheet (canceller on) ok ${sh.filter(c => c.ok).length}/${sh.length}, heard ${sh.map(c => c.heard).join('/')}, ms ${sh.filter(c => c.ok).map(c => c.ms).join('/')} (reference ${refMs})`);
    for (const aecOff of [false, true]) for (const kind of ['click', 'chirp', 'chord']) {
      const p = res.cells.filter(c => c.vol === vol && c.what === 'probe' && c.kind === kind && c.aecOff === aecOff);
      console.log(`  ${kind.padEnd(5)} ${aecOff ? 'separate canceller-off stream' : "app's stream (canceller on)  "}: heard ${p.map(c => c.heard).join('/')} of ${p[0] && p[0].of} · ms ${med(p.map(c => c.ms))} · gain ${med(p.map(c => c.gain))} (${p.map(c => c.gain).join('/')}) · aec ${[...new Set(p.map(c => c.aec))].join(',')}`);
    }
  }
})();
