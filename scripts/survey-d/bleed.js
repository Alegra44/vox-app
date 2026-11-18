// Survey D, item a: speaker bleed scored as singing. Nobody sings; the microphone hears only the app's own output
// (release B's loop rig, scoring-verify/loopmic.js, here with a bleed gain: the output, D ms late, × gain, over a
// −60 dBFS noise floor). What Entrance & Cutoff (both modes), Harmony Arena, Harmony Memory and Rhythm credit.
// The speaker delay is stored as release B's sheet measures it on this rig (D, "measured"), as a device that took the
// measurement would have it. A throwaway account on the LOCAL stack with the choir plan and level 10 (Arena), deleted at
// exit.
// Bleed: none (the noise floor only: the control) · gain 0.1 (−20 dB) · 0.3 (−10 dB) · 1 (0 dB). D = 120 ms.
// Echo cancellation: the loop is a synthetic MediaStream, which Chrome's echo canceller never processes (it runs on a
// capture device's audio only), so every number here is the canceller-off case, whatever the app asks for; a real
// device's canceller removes some of the bleed, by an amount this rig can't reproduce (see SURVEY_D.md).
// --guard: also with the scratch build's bleed guard (the page's window.__bleedGuard, if the build has it).
// Usage: VOX_BACKEND=local NODE_OPTIONS=… node scripts/survey-d/bleed.js [--ref <git ref>] [--runs 2] [--out <json>]
//   [--guard | --guard-only] [--gains 0,0.1,0.3,1] [--tools entrance,cutoff,arena,memory,rhythm] [--diag]
//   [--real --volumes 50,100]
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('bleed.js runs against the local Supabase stack only'); process.exit(2); }
const fs = require('fs');
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref'), RUNS = +(arg('--runs') || 2), D = 120;
// --real (release D3's real-device check): no loop. This Mac's own speakers and microphone (Chromium's real capture
// device, the echo canceller on as the app asks), the system output volume set to each of --volumes (osascript; put
// back at exit), the speaker delay and bleed gain measured by the app's own sheet code on this device. Nobody sings.
// A visible browser window: headless Chromium plays nothing through the speakers (a 440 Hz tone at full volume: mic RMS
// 0.0017 → 0.0027 headless, 0.0033 → 0.169 in a window; 2026-11-17).
const REAL = process.argv.includes('--real'), VOLUMES = (arg('--volumes') || '50,100').split(',').map(Number);
const { execFileSync } = require('child_process');
const osa = cmd => execFileSync('osascript', ['-e', cmd]).toString().trim();

// loopmic.js's LOOP with a gain on the loop
const LOOP = ({ D, gain }) => {
  const AC = window.AudioContext, conn = AudioNode.prototype.connect;
  let synth = null, dest = null, app = null;
  const ensure = () => {
    if (synth) return;
    synth = new AC(); dest = synth.createMediaStreamDestination();
    const n = synth.sampleRate * 2, nb = synth.createBuffer(1, n, synth.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.001 * Math.sqrt(3);
    const ns = synth.createBufferSource(); ns.buffer = nb; ns.loop = true; conn.call(ns, dest); ns.start();
  };
  const link = () => {
    if (!app || !synth || app.__linked || gain === 0) return;
    app.__linked = true;
    const src = synth.createMediaStreamSource(app.__tap.stream), dl = synth.createDelay(2), g = synth.createGain();
    dl.delayTime.value = D / 1000; g.gain.value = gain; conn.call(src, dl); conn.call(dl, g); conn.call(g, dest);
  };
  window.AudioContext = function (...a) {
    const ctx = new AC(...a);
    if (!app) { app = ctx; ctx.__tap = ctx.createMediaStreamDestination(); window.__appCtx = ctx; ensure(); link(); }
    return ctx;
  };
  window.AudioContext.prototype = AC.prototype; window.webkitAudioContext = window.AudioContext;
  AudioNode.prototype.connect = function (dst, ...r) {
    const out = conn.call(this, dst, ...r);
    if (app && this.context === app && dst === app.destination) conn.call(this, app.__tap);
    return out;
  };
  navigator.mediaDevices.getUserMedia = async () => { ensure(); if (synth.state !== 'running') await synth.resume(); link(); return new MediaStream(dest.stream.getAudioTracks().map(t => t.clone())); };
};

const TOOLS = {
  entrance: { panel: 'partrehearsal', start: () => { timingTrainer.mode = 'entrance'; return startTimingTrainer(); }, busy: () => timingTrainer.active,
    read: () => { const c = timingTrainer.results.filter(r => r.claimed); return { credited: `${c.length}/${timingTrainer.results.length}`, accuracy: c.length ? Math.round(c.reduce((a, r) => a + r.accuracy, 0) / c.length) : 0, bleedHits: timingTrainer.bleedHits, bleedNote: (document.getElementById('ttResults').textContent || '').includes(t('tt_bleed')) }; } },
  cutoff: { panel: 'partrehearsal', start: () => { timingTrainer.mode = 'cutoff'; return startTimingTrainer(); }, busy: () => timingTrainer.active,
    read: () => { const c = timingTrainer.results.filter(r => r.claimed); return { credited: `${c.length}/${timingTrainer.results.length}`, accuracy: c.length ? Math.round(c.reduce((a, r) => a + r.accuracy, 0) / c.length) : 0, bleedHits: timingTrainer.bleedHits }; } },
  arena: { panel: 'arcade', start: () => startHarmonyArena(), busy: () => harmonyActive,
    read: () => { const o = {}; document.querySelectorAll('[id^="harmony"][id$="Val"]').forEach(e => { if (e.offsetParent !== null || e.textContent) o[e.id.replace(/^harmony|Val$/g, '')] = e.textContent.trim(); }); return o; } },
  memory: { panel: 'partrehearsal', start: () => startHarmonyMemory(), busy: () => harmonyMemory.active,
    read: () => { const r = harmonyMemory.lastRun; return r ? { held: `${r.held}/${r.notes.length}`, score: r.score, passed: r.passed } : { run: 'none' }; } },
  rhythm: { panel: 'rhythm', start: () => document.getElementById('rhythmStartBtn').click(), busy: () => rhythmActive,
    read: () => { const c = rhythmResults.filter(r => r.claimed); return { credited: `${c.length}/${rhythmResults.length}`, accuracy: Math.round(rhythmResults.reduce((a, r) => a + (r.accuracy || 0), 0) / Math.max(1, rhythmResults.length)) }; } },
};

(async () => {
  const dir = C.buildDir(REF), res = { ref: REF || 'working copy', D, runs: RUNS, cells: [] };
  const b = await C.chromium.launch({ headless: !REAL, args: ['--autoplay-policy=no-user-gesture-required', ...(REAL ? ['--use-fake-ui-for-media-stream'] : [])] });
  const volume0 = REAL ? osa('output volume of (get volume settings)') : null, muted0 = REAL ? osa('output muted of (get volume settings)') : null;
  if (REAL) osa('set volume without output muted');
  try {
    const { ctx: c0, page: p0 } = await C.openPage(b, { dir }); await C.signUp(p0, 'dvbleed', 'Bleed Check');
    const uid = await p0.evaluate(() => profile.id);
    db(`update public.users set subscription_plan = 'choir', trial_start_date = current_date - 30 where id = '${uid}' returning 1`);
    db(`update public.user_progress set xp = 1000 where user_id = '${uid}' returning 1`);
    const state = await c0.storageState(); await c0.close();
    const guardModes = process.argv.includes('--guard-only') ? [true] : process.argv.includes('--guard') ? [false, true] : [false];
    console.log(`== speaker bleed, nobody singing · build ${res.ref} · D ${D} ms · ${RUNS} runs`);
    const GAINS = arg('--gains') ? arg('--gains').split(',').map(Number) : [0, 0.1, 0.3, 1], ONLY = arg('--tools') ? arg('--tools').split(',') : null;
    for (const guard of guardModes) for (const gain of REAL ? VOLUMES : GAINS) for (const [key, tool] of Object.entries(TOOLS)) for (let k = 0; k < RUNS; k++) {
      if (ONLY && !ONLY.includes(key)) continue;
      if (REAL) osa(`set volume output volume ${gain}`);
      const { ctx, page } = await C.openPage(b, { dir, storageState: state, prepare: REAL ? undefined : c => c.addInitScript(LOOP, { D, gain }) });
      let r;
      try {
        await C.clearOverlays(page);
        await page.evaluate(async ({ D, guard }) => {
          window.__bleedGuardOn = guard;
          const k = await sdOutputKey();
          if (guard) { // the build's own measurement on this rig (its delay and, in the guard build, the bleed's gain)
            await initAudio(); const r = await sdMeasure({});
            sdSave(k, { ms: r && r.ok ? r.ms : D, how: 'measured', heard: r ? r.heard : 0, gain: (r && r.gain) || null, rig: true, at: Date.now() });
            window.__sdResult = r;
          } else sdSave(k, { ms: D, how: 'measured', heard: 10, gain: null, rig: true, at: Date.now() });
        }, { D, guard });
        await C.showPanel(page, tool.panel); await C.clearOverlays(page);
        // --diag: every frame the guard judges, the mic's level over the bleed it predicts (gain × the output a delay ago),
        // for frames where the output is playing; with no gain stored, the ratio to the output itself
        if (process.argv.includes('--diag')) await page.evaluate(() => { const orig = overBleed; window.__diag = []; overBleed = raw => {
          const m = sdStored(), at = audioCtx.currentTime - ((m && m.ms) || 0) / 1000; let out = 0;
          for (const h of bleedHist) if (Math.abs(h.t - at) <= BLEED_SPAN_S && h.r > out) out = h.r;
          if (out > 0.005) window.__diag.push(computeRMS(raw) / (((m && m.gain) || 1) * out)); return orig(raw); }; });
        await page.evaluate(`(${tool.start})()`);
        const t0 = Date.now();
        await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 15000 }).catch(() => {});
        await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: 90000 }).catch(() => {});
        await C.sleep(800);
        r = await page.evaluate(`(${tool.read})()`); r.secs = Math.round((Date.now() - t0) / 1000);
        if (process.argv.includes('--diag')) r.diag = await page.evaluate(() => { const d = (window.__diag || []).slice().sort((a, b) => a - b), q = p => d.length ? +d[Math.min(d.length - 1, Math.floor(p * d.length))].toFixed(2) : null;
          return { frames: d.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: q(1), over2: d.filter(x => x > 2).length }; });
        if (guard) r.sd = await page.evaluate(() => window.__sdResult && { ms: window.__sdResult.ms, gain: window.__sdResult.gain, heard: window.__sdResult.heard });
        if (REAL) r.aec = await page.evaluate(() => micStream ? micStream.getAudioTracks()[0].getSettings().echoCancellation : null);
      } catch (e) { r = { error: String(e).split('\n')[0].slice(0, 120) }; }
      finally { await ctx.close(); }
      res.cells.push({ guard, [REAL ? 'volume' : 'gain']: gain, tool: key, run: k + 1, ...r });
      console.log(`${guard ? 'guard ' : 'master'} ${REAL ? 'volume' : 'gain'} ${String(gain).padEnd(3)} ${key.padEnd(8)} #${k + 1}: ${JSON.stringify(r)}`);
    }
  } finally { if (REAL && volume0 !== null) { osa(`set volume output volume ${volume0}`); if (muted0 === 'true') osa('set volume with output muted'); } await b.close(); C.cleanup(); }
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
})();
