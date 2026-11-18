// GUARD.md part c: a real voice that isn't the Mac's own output. The phone plays phonetrack.py's track next to the Mac;
// per block (a tool), this script reloads the page, takes the scratch build's speaker-delay measurement (for the chord's
// gain), stores a FIXED delay (--ms, the same in every condition, so only the guard differs between them), shows the
// tool, listens for the block's sync beep (2 kHz) on the app's own mic path, and starts the tool with its timeline's zero
// at the beep + X − the delay (window.__forceT0): the phone's voice then lands on the tool's timeline as a singer on time
// would. Conditions, one per pass of the track (--conditions approach:volume,…): the headphones file with off:<vol>,
// the speakers file with chord:50,leadin:50,chord:100,leadin:100. Arena sings the Alto part (set here, every condition).
// LOUD unless --synth: the system volume set per condition (put back at exit), a visible window, this Mac's mic.
// --synth <dir>: silent, headless: the voice fed in as the mic (synthmic.js) from <dir>/<tool>.wav, one block per file.
// The LOCAL stack, a throwaway account (choir plan, level 10), deleted at exit.
// Usage: VOX_BACKEND=local NODE_OPTIONS=… node scripts/guard-verify/guardvoice.js --track <wav.json> --conditions off:50
//   [--ms 150] [--def 0.3 --cap 0.6 --q 0.2] [--synth <dir>] [--ref scratch/guard] [--out <json>]
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('local stack only'); process.exit(2); }
const fs = require('fs'), path = require('path');
const C = require('../design-verify/common'), SYN = require('../design-verify/synthmic'), { db } = require('../choir-verify/testAccounts');
const { execFileSync } = require('child_process');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref') || 'scratch/guard', MS = +(arg('--ms') || 150), SYNTH = arg('--synth');
const DEF = +(arg('--def') || 0.3), CAP = +(arg('--cap') || 0.6), Q = +(arg('--q') || 0.2);
const LAYOUT = JSON.parse(fs.readFileSync(arg('--track'), 'utf8'));
const CONDS = arg('--conditions').split(',').map(s => { const [approach, vol] = s.split(':'); return { approach, vol: +vol }; });
const APPROACHES = { off: { mode: 'off' }, chord: { mode: 'chord', def: DEF, max: true }, leadin: { mode: 'leadin', def: DEF, q: Q, cap: CAP, pad: true, arenaLeadIn: true } };
const osa = cmd => execFileSync('osascript', ['-e', cmd]).toString().trim();
const D = 120;
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


// In the page: the sync beep's start on the audio clock. A recorder on the app's mic path (micG.raw); every 20 ms the
// newest 20 ms: its 2 kHz power (Goertzel) against its total; the beep is 30 ms where 2 kHz is over 60 % of the power and
// the level over 0.003; its start: the first sample, going back from there, where the 2 kHz envelope (5 ms) falls under
// half the beep's.
const LISTEN = async timeoutMs => {
  const g = await micGraph(), sr = audioCtx.sampleRate;
  if (!window.__gvRec2) window.__gvRec2 = audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob(["class R extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage({f:currentFrame,d:c.slice(0)});return true;}}registerProcessor('gv-rec2',R);"], { type: 'application/javascript' })));
  await window.__gvRec2;
  const node = new AudioWorkletNode(audioCtx, 'gv-rec2'), sink = audioCtx.createGain(); sink.gain.value = 0;
  let buf = new Float32Array(sr * 4), f0 = null, len = 0; // the last 4 s
  node.port.onmessage = e => { const { f, d } = e.data; if (f0 === null) f0 = f; if (len + d.length > buf.length) { buf.copyWithin(0, d.length); len -= d.length; f0 += d.length; } buf.set(d, len); len += d.length; };
  g.raw.connect(node); node.connect(sink).connect(audioCtx.destination);
  const W = Math.round(sr * 0.02), goertzel = (a, i0, n) => { const k = 2 * Math.cos(2 * Math.PI * 2000 / sr); let s1 = 0, s2 = 0, e = 0; for (let i = i0; i < i0 + n; i++) { const s = a[i] + k * s1 - s2; s2 = s1; s1 = s; e += a[i] * a[i]; } return { p: (s1 * s1 + s2 * s2 - k * s1 * s2) * 2 / n, e }; };
  const t0 = performance.now(); let hits = 0, res = null;
  while (performance.now() - t0 < timeoutMs) {
    await new Promise(r => setTimeout(r, 20));
    if (len < W * 3) continue;
    const { p, e } = goertzel(buf, len - W, W), rms = Math.sqrt(e / W);
    hits = (p / Math.max(e, 1e-12) > 0.6 && rms > 0.003) ? hits + 1 : 0;
    if (hits >= 2) { // the start: back from here while the 2 kHz envelope stays over half its level here
      const h = Math.round(sr * 0.005), lvl = goertzel(buf, len - h, h).p; let i = len - h;
      while (i - h > 0 && goertzel(buf, i - h, h).p > lvl * 0.25) i -= Math.round(h / 5);
      res = { at: (f0 + i) / sr, rms: +rms.toFixed(4), lag: +(audioCtx.currentTime - (f0 + i) / sr).toFixed(3) }; break;
    }
  }
  node.port.onmessage = null; try { g.raw.disconnect(node); } catch (e) {} node.disconnect(); sink.disconnect();
  return res;
};

(async () => {
  const dir = C.buildDir(REF), res = { ref: REF, ms: MS, conditions: CONDS, synth: !!SYNTH, cells: [] };
  const b = SYNTH ? await SYN.launch() : await C.chromium.launch({ headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  const volume0 = SYNTH ? null : osa('output volume of (get volume settings)'), muted0 = SYNTH ? null : osa('output muted of (get volume settings)');
  if (!SYNTH) osa('set volume without output muted');
  try {
    const { ctx: c0, page: p0 } = await C.openPage(b, { dir }); await C.signUp(p0, 'dvgvoice', 'Guard Voice');
    const uid = await p0.evaluate(() => profile.id);
    db(`update public.users set subscription_plan = 'choir', trial_start_date = current_date - 30 where id = '${uid}' returning 1`);
    db(`update public.user_progress set xp = 1000 where user_id = '${uid}' returning 1`);
    const state = await c0.storageState(); await c0.close();
    console.log(`== a real voice (the phone) · build ${REF} · fixed delay ${MS} ms · ${CONDS.map(c => c.approach + ':' + c.vol).join(', ')}${SYNTH ? ' · SYNTH (silent)' : ''}`);
    if (!SYNTH) console.log('READY: start the track on the phone now');
    for (const blk of LAYOUT.blocks) {
      const cond = CONDS[blk.pass - 1]; if (!cond) continue;
      const tool = TOOLS[blk.tool], cfg = APPROACHES[cond.approach];
      if (!SYNTH) osa(`set volume output volume ${cond.vol}`);
      const { ctx, page } = await C.openPage(b, { dir, storageState: state, prepare: async c => { await c.addInitScript(g => { window.__guard = g; }, cfg); if (SYNTH) await SYN.attach(c, path.join(SYNTH, blk.tool + '.wav'), { level: 1 }); } });
      let r;
      try {
        await C.clearOverlays(page);
        const sd = await page.evaluate(async ms => {
          const k = await sdOutputKey(); await initAudio(); const r = await sdMeasure({}); sdKeyNow = k;
          sdSave(k, { ms, how: 'measured', heard: r ? r.heard : 0, gain: (r && r.gain) || null, chordGain: r && r.chordGain, at: Date.now() });
          harmonySelectedPart = 'Alto'; partRehearsal.part = 'Alto';
          return r && { ok: r.ok, measuredMs: r.ms, heard: r.heard, gain: r.gain, chordGain: r.chordGain };
        }, MS);
        await C.showPanel(page, tool.panel); await C.clearOverlays(page);
        const beep = await page.evaluate(LISTEN, SYNTH ? 60000 : 180000);
        if (!beep) throw new Error('no sync beep heard');
        await page.evaluate(({ at, X, ms }) => { window.__forceT0 = at + X - ms / 1000; }, { at: beep.at, X: LAYOUT.X, ms: MS });
        await page.evaluate(`(${tool.start})()`);
        const t0 = Date.now();
        await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 15000 }).catch(() => {});
        await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: 90000 }).catch(() => {});
        await C.sleep(800);
        r = await page.evaluate(`(${tool.read})()`); r.secs = Math.round((Date.now() - t0) / 1000); r.sd = sd; r.beep = beep;
        r.used = await page.evaluate(() => ({ gain: +guardGain(sdStored()).toFixed(4), learned: window.__bleedLearn ? { g: window.__bleedLearn.g, n: window.__bleedLearn.n } : null }));
      } catch (e) { r = { error: String(e).split('\n')[0].slice(0, 160) }; }
      finally { await ctx.close(); }
      res.cells.push({ pass: blk.pass, ...cond, tool: blk.tool, ...r });
      console.log(`${cond.approach.padEnd(6)} vol ${String(cond.vol).padEnd(3)} ${blk.tool.padEnd(8)}: ${JSON.stringify(r)}`);
    }
  } finally { if (!SYNTH) { osa(`set volume output volume ${volume0}`); if (muted0 === 'true') osa('set volume with output muted'); } await b.close(); C.cleanup(); }
  if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res, null, 1));
  const score = c => c.error ? 'error' : c.credited ? `${c.credited} acc ${c.accuracy}` : c.held ? `${c.held} score ${c.score}` : `Acc ${c.Acc}`;
  console.log('\n== summary');
  for (const c of res.cells) console.log(`${c.approach.padEnd(6)} ${String(c.vol).padEnd(3)} ${c.tool.padEnd(8)} ${score(c)}`);
})();
