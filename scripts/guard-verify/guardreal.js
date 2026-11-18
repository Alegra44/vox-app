// GUARD.md part b: the guard approaches on this Mac's own speakers and microphone, the echo canceller on, nobody
// singing. The scratch build (scratch/guard: D3's output bus and guard, with window.__guard choosing where the bleed's
// gain comes from). Each page: the build's own speaker-delay measurement first (clicks, then three held chords; stored as
// the app stores it: measured, or the estimate when the clicks aren't heard), then the tool. Approaches (--approaches):
//   off       no guard (the control: what the room's bleed credits)
//   click     D3 as it was: the clicks' gain, off when none measured
//   chord     the held chord's gain, or the cautious default (--def) when none measured, the larger of the two (max)
//   leadin    learned in the take's lead-in (the count-in with a pad of the first chord; Arena gets a 4-beat lead-in):
//             the --q quantile of mic ÷ predicted bleed, at most --cap; none learned → --def
// LOUD with --real (the system output volume set to each of --volumes, put back at exit; a visible window). Without
// --real: the loop rig (bleed.js's LOOP, --gains, headless, silent), for checking the mechanics.
// A throwaway account on the LOCAL stack (choir plan, level 10), deleted at exit.
// Usage: VOX_BACKEND=local NODE_OPTIONS=… node scripts/guard-verify/guardreal.js [--real --volumes 50,100 | --gains 0.3]
//   [--approaches off,chord,leadin] [--def 0.3] [--cap 0.6] [--q 0.2] [--sd-stream app|aecoff] [--tools …] [--runs 2] [--ref scratch/guard] [--out <json>]
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('guardreal.js runs against the local Supabase stack only'); process.exit(2); }
const fs = require('fs');
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const { execFileSync } = require('child_process');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref') || 'scratch/guard', RUNS = +(arg('--runs') || 2), D = 120, REAL = process.argv.includes('--real');
const LEVELS = REAL ? (arg('--volumes') || '50,100').split(',').map(Number) : (arg('--gains') || '0.3').split(',').map(Number);
const DEF = +(arg('--def') || 0.3), CAP = +(arg('--cap') || 0.6), Q = +(arg('--q') || 0.2), SDS = arg('--sd-stream') || 'app';
const APPROACHES = { off: { mode: 'off' }, click: { mode: 'click' }, chord: { mode: 'chord', def: DEF, max: true },
  leadin: { mode: 'leadin', def: DEF, q: Q, cap: CAP, pad: true, arenaLeadIn: true } };
const ONLY = arg('--tools') ? arg('--tools').split(',') : null;
const NAMES = (arg('--approaches') || 'off,chord,leadin').split(',');
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
  const dir = C.buildDir(REF), res = { ref: REF, real: REAL, def: DEF, cap: CAP, q: Q, sdStream: SDS, runs: RUNS, cells: [] };
  const b = await C.chromium.launch({ headless: !REAL, args: ['--autoplay-policy=no-user-gesture-required', ...(REAL ? ['--use-fake-ui-for-media-stream'] : [])] });
  const volume0 = REAL ? osa('output volume of (get volume settings)') : null, muted0 = REAL ? osa('output muted of (get volume settings)') : null;
  if (REAL) osa('set volume without output muted');
  try {
    const { ctx: c0, page: p0 } = await C.openPage(b, { dir }); await C.signUp(p0, 'dvguard', 'Guard Check');
    const uid = await p0.evaluate(() => profile.id);
    db(`update public.users set subscription_plan = 'choir', trial_start_date = current_date - 30 where id = '${uid}' returning 1`);
    db(`update public.user_progress set xp = 1000 where user_id = '${uid}' returning 1`);
    const state = await c0.storageState(); await c0.close();
    console.log(`== the guard, nobody singing · ${REAL ? 'this Mac, volumes ' + LEVELS.join('/') : 'the loop rig, gains ' + LEVELS.join('/')} · build ${REF} · def ${DEF} cap ${CAP} q ${Q} sd ${SDS} · ${RUNS} runs`);
    for (const lvl of LEVELS) for (const name of NAMES) for (const [key, tool] of Object.entries(TOOLS)) for (let k = 0; k < RUNS; k++) {
      if (ONLY && !ONLY.includes(key)) continue;
      if (REAL) osa(`set volume output volume ${lvl}`);
      const cfg = { ...APPROACHES[name], sdStream: SDS };
      const { ctx, page } = await C.openPage(b, { dir, storageState: state, prepare: async c => { await c.addInitScript(g => { window.__guard = g; }, cfg); if (!REAL) await c.addInitScript(LOOP, { D, gain: lvl }); } });
      let r;
      try {
        await C.clearOverlays(page);
        const sd = await page.evaluate(async () => { // the measurement, stored as the app stores it
          const k = await sdOutputKey(); await initAudio(); const r = await sdMeasure({}); sdKeyNow = k;
          sdSave(k, r && r.ok ? { ms: r.ms, how: 'measured', heard: r.heard, gain: r.gain || null, chordGain: r.chordGain, at: Date.now() } : { how: 'estimate', heard: r ? r.heard : 0, gain: null, chordGain: r && r.chordGain, at: Date.now() });
          return r && { ok: r.ok, ms: r.ms, heard: r.heard, gain: r.gain, chordGain: r.chordGain, chordMs: r.chordMs, delayUsed: sdDelayMs() };
        });
        await C.showPanel(page, tool.panel); await C.clearOverlays(page);
        await page.evaluate(`(${tool.start})()`);
        const t0 = Date.now();
        await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 15000 }).catch(() => {});
        await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: 90000 }).catch(() => {});
        await C.sleep(800);
        r = await page.evaluate(`(${tool.read})()`); r.secs = Math.round((Date.now() - t0) / 1000); r.sd = sd;
        r.used = await page.evaluate(() => ({ gain: +guardGain(sdStored()).toFixed(4), learned: window.__bleedLearn ? { g: window.__bleedLearn.g, n: window.__bleedLearn.n || window.__bleedLearn.r.length } : null }));
        if (REAL) r.aec = await page.evaluate(() => micStream ? micStream.getAudioTracks()[0].getSettings().echoCancellation : null);
      } catch (e) { r = { error: String(e).split('\n')[0].slice(0, 120) }; }
      finally { await ctx.close(); }
      res.cells.push({ approach: name, level: lvl, tool: key, run: k + 1, ...r });
      console.log(`${name.padEnd(6)} ${REAL ? 'vol' : 'gain'} ${String(lvl).padEnd(4)} ${key.padEnd(8)} #${k + 1}: ${JSON.stringify(r)}`);
    }
  } finally { if (REAL && volume0 !== null) { osa(`set volume output volume ${volume0}`); if (muted0 === 'true') osa('set volume with output muted'); } await b.close(); C.cleanup(); }
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
  // summary: credited per approach × level × tool
  const credit = c => c.credited || c.held || c.Acc || c.error;
  console.log('\n== summary (each run: credited / held / Arena accuracy)');
  for (const lvl of LEVELS) for (const name of NAMES) console.log(`${String(lvl).padEnd(4)} ${name.padEnd(6)} ` + Object.keys(TOOLS).filter(t => !ONLY || ONLY.includes(t)).map(t => `${t} ${res.cells.filter(c => c.level === lvl && c.approach === name && c.tool === t).map(credit).join(',')}`).join(' · '));
})();
