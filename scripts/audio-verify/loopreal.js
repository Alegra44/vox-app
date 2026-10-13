// exp/single-stream B4: speaker bleed on THIS Mac's real speakers and real mic, nobody singing. The page's own playback
// goes out of the speakers and whatever the mic hears is scored, exactly as for a user on a laptop (echo cancellation as
// the browser does it for the constraints each configuration asks for). The drivers are loopback.js's (Harmony Arena
// with the piano guide and with Distraction Mode, Scale Run professional, a 5-note Custom exercise, ~12 s of Pitch Rift,
// the Entrance Trainer, Harmony Memory stages 1 and 6) plus three Pitch Match takes (intermediate).
// Sides (LR_SIDES): today (master), C1 / C2 / C3 (the branch's window.__streamMode), and Cn+D1 / Cn+D2 (the branch's
// window.__bleedDefence on that mode). LR_REPS rounds (default 3), sides alternating within each round.
// Before every side: the Mac's output volume (osascript) and the room's own level on the mic for 2 s (nothing playing).
// A phantom: a Harmony Arena note landed (≥ 75) or scored, a Harmony Memory note held, an entrance claimed, a Scale Run /
// Custom / Rift / Pitch Match step heard.
// Runs Chromium headed (the full browser, so real audio in and out): a window opens while it runs.
// Usage: [LR_SIDES=…] [LR_REPS=3] [LR_SCEN=harmony,scale,custom,rift,tt,hm,pm] node scripts/audio-verify/loopreal.js
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `loopreal-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const SIDES = (process.env.LR_SIDES || 'today,C1,C2,C3,C1+D1,C1+D2,C2+D1,C2+D2,C3+D1,C3+D2').split(',');
const REPS = +(process.env.LR_REPS || 3);
const SC = (process.env.LR_SCEN || 'harmony,scale,custom,rift,tt,hm,pm').split(','), want = k => SC.includes(k);
const BASE = process.env.LR_BASE || 'master';
const volume = () => { try { return execFileSync('osascript', ['-e', 'get volume settings']).toString().trim(); } catch (e) { return 'unknown'; } };

async function open(b, side) {
  const [mode, def] = side === 'today' ? [null, null] : side.split('+');
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, permissions: ['microphone'] });
  await ctx.route('http://localhost:8765/**', r => {
    const p = new URL(r.request().url()).pathname.slice(1) || 'index.html', type = p.endsWith('.js') ? 'text/javascript' : 'text/html';
    if (side === 'today') return r.fulfill({ body: execFileSync('git', ['show', `${BASE}:deploy/${p}`], { cwd: ROOT, maxBuffer: 1 << 28 }), contentType: type });
    r.fulfill({ path: path.join(ROOT, 'deploy', p), contentType: type });
  });
  await ctx.addInitScript(([m, d]) => { if (m) window.__streamMode = m; if (d) window.__bleedDefence = d; }, [mode, def]);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await page.waitForTimeout(200); }
  const room = await page.evaluate(async () => {
    requireProFeature = () => true; blockExercise = () => false; requireChoirWorld = () => true;
    selectSong('hymn'); await initAudio();
    document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]')?.click();
    await new Promise(r => setTimeout(r, 1500)); // the mic settles
    let s = 0, n = 0, f = 0; const t0 = performance.now();
    while (performance.now() - t0 < 2000) { analyser.getFloatTimeDomainData(dataArray); let q = 0; for (const v of dataArray) q += v * v; s += q / dataArray.length; n++; if (autoCorrelate(dataArray, audioCtx.sampleRate) > 0) f++; await new Promise(r => requestAnimationFrame(r)); }
    const tr = micStream.getAudioTracks()[0], st = tr.getSettings ? tr.getSettings() : {};
    return { dbfs: +(10 * Math.log10(s / n + 1e-20)).toFixed(1), pitched: Math.round(100 * f / n), label: tr.label, ec: st.echoCancellation, ns: st.noiseSuppression, agc: st.autoGainControl, mode: typeof ssMode === 'function' ? ssMode() : null, def: typeof bdMode === 'function' ? bdMode() : null };
  });
  return { ctx, page, errors, room };
}
const capWrap = `if (!window.__capWrapped) { const cap = captureAccuracyForTarget; window.__capWrapped = true; captureAccuracyForTarget = async (...a) => { const r = await cap(...a); (window.__steps = window.__steps || []).push(r); return r; }; }`;
async function harmony(page, { guide, distraction }) {
  return page.evaluate(async ({ guide, distraction }) => {
    harmonySelectedLevel = 1; harmonySelectedPart = 'Alto'; harmonyPianoGuideOn = guide; harmonyDistractionOn = distraction; harmonyMemoryModeOn = false;
    await startHarmonyArena();
    while (harmonyActive) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 500));
    const res = harmonyNoteResults.map(r => r ?? null);
    return { heard: harmonyHeardFrames, total: harmonyTotalFrames, landed: res.filter(r => r !== null && r >= 75).length, scored: res.filter(r => r !== null).length };
  }, { guide, distraction });
}
async function steps(page, fn, arg) { await page.evaluate(capWrap); await page.evaluate(() => { window.__steps = []; }); return page.evaluate(fn, arg); }
const scaleRun = page => steps(page, async () => {
  setExerciseLevel('professional');
  const btn = document.getElementById('scaleStartBtn'); btn.click(); await new Promise(r => setTimeout(r, 300));
  while (btn.disabled) await new Promise(r => setTimeout(r, 200));
  return { steps: __steps.length, heard: __steps.filter(r => r.heard).length, scores: __steps.map(r => r.accuracy) };
});
const custom = page => steps(page, async () => {
  customSequence = [57, 59, 60, 62, 64];
  document.getElementById('customResultCard').style.display = 'none';
  document.getElementById('customStartBtn').click();
  const t0 = performance.now(); while (document.getElementById('customResultCard').style.display !== 'block' && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200));
  return { steps: __steps.length, heard: __steps.filter(r => r.heard).length, scores: __steps.map(r => r.accuracy) };
});
const rift = page => page.evaluate(async () => {
  riftRounds = []; riftActive = true; riftStartTime = performance.now(); riftRunNextRound();
  await new Promise(r => setTimeout(r, 12000)); riftActive = false; await new Promise(r => setTimeout(r, 2500));
  return { steps: riftRounds.length, heard: riftRounds.filter(r => r.heard).length, scores: riftRounds.map(r => r.accuracy) };
});
const pitchMatch = page => steps(page, async () => {
  for (let k = 0; k < 3; k++) {
    setExerciseLevel('intermediate'); pitchTargetMidi = 57;
    const btn = document.getElementById('pitchListenBtn'); btn.click(); await new Promise(r => setTimeout(r, 100));
    const t0 = performance.now(); while (btn.disabled && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 400));
  }
  return { steps: __steps.length, heard: __steps.filter(r => r.heard).length, scores: __steps.map(r => r.accuracy) };
});
const entrance = page => page.evaluate(async () => {
  document.querySelector('#ttModeRow [data-tt-mode="entrance"]')?.click();
  document.getElementById('ttStartBtn').click();
  const t0 = performance.now(); while (!timingTrainer.active && performance.now() - t0 < 5000) await new Promise(r => setTimeout(r, 100));
  while (timingTrainer.active) await new Promise(r => setTimeout(r, 200));
  await new Promise(r => setTimeout(r, 500));
  return { bleed: timingTrainer.bleedHits, entrances: timingTrainer.results.filter(x => x.claimed).length, n: timingTrainer.results.length };
});
const memory = (page, stage) => page.evaluate(async stage => {
  harmonyMemory.stage = stage; await startHarmonyMemory();
  while (harmonyMemory.active) await new Promise(r => setTimeout(r, 200));
  await new Promise(r => setTimeout(r, 500));
  const run = harmonyMemory.lastRun;
  return { held: run.held, n: run.notes.length, frames: run.cents.map(c => c.length).reduce((a, b) => a + b, 0) };
}, stage);

(async () => {
  const srv = require('child_process').spawn('python3', ['-m', 'http.server', '8765'], { cwd: path.join(ROOT, 'deploy'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const b = await chromium.launch({ headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  const rows = [];
  log(`loopreal ${stamp} · real speakers and mic · nobody singing · today: ${BASE} · sides ${SIDES.join(', ')} · reps ${REPS} · song hymn, Harmony part Alto, rehearsal part Lead`);
  try {
    for (let rep = 1; rep <= REPS; rep++) for (const side of SIDES) {
      const { ctx, page, errors, room } = await open(b, side), o = { rep, side, room, volume: volume() };
      log(`\n== rep ${rep} · ${side} · mic "${room.label}" ec ${room.ec} ns ${room.ns} agc ${room.agc} · room ${room.dbfs} dBFS, pitched ${room.pitched}% · output ${o.volume}`);
      if (want('harmony')) {
        for (const [k, a] of [['harmonyGuide', { guide: true, distraction: false }], ['harmonyDistraction', { guide: false, distraction: true }]]) {
          const r = o[k] = await harmony(page, a);
          log(`   ${k.padEnd(20)} heard ${r.heard}/${r.total} frames · notes scored ${r.scored} · landed ${r.landed}`);
        }
      }
      if (want('scale')) { const r = o.scale = await scaleRun(page); log(`   ${'Scale Run pro'.padEnd(20)} steps heard ${r.heard}/${r.steps} · scores ${r.scores.join('/')}`); }
      if (want('custom')) { const r = o.custom = await custom(page); log(`   ${'Custom 5 notes'.padEnd(20)} steps heard ${r.heard}/${r.steps} · scores ${r.scores.join('/')}`); }
      if (want('rift')) { const r = o.rift = await rift(page); log(`   ${'Pitch Rift ~12 s'.padEnd(20)} rounds heard ${r.heard}/${r.steps} · scores ${r.scores.join('/')}`); }
      if (want('pm')) { const r = o.pm = await pitchMatch(page); log(`   ${'Pitch Match ×3'.padEnd(20)} takes heard ${r.heard}/${r.steps} · scores ${r.scores.join('/')}`); }
      if (want('tt')) { const r = o.tt = await entrance(page); log(`   ${'Entrance Trainer'.padEnd(20)} entrances ${r.entrances}/${r.n} · bleed hits ${r.bleed}`); }
      if (want('hm')) for (const st of [0, 5]) { const r = o['hm' + st] = await memory(page, st); log(`   ${`Harmony Memory ${st + 1}`.padEnd(20)} held ${r.held}/${r.n} · frames with a pitch ${r.frames}`); }
      o.k = await page.evaluate(() => typeof BD === 'object' ? BD.log.map(x => +x.k.toFixed(4)) : null).catch(() => null);
      if (o.k && o.k.length) log(`   calibrated bleed ratio k per session: ${o.k.join(', ')}`);
      o.errors = errors; if (errors.length) log(`   page errors: ${errors.slice(0, 2).join(' | ')}`);
      rows.push(o); fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
      await ctx.close();
    }
  } catch (e) { log('ERROR ' + (e.stack || e)); process.exitCode = 2; }
  finally { await b.close().catch(() => {}); srv.kill(); }
  // phantom totals per side (medians over reps)
  const med = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  log('\n== phantoms, nobody singing (median over reps; [each rep])');
  const cols = [['HA guide landed', o => o.harmonyGuide?.landed], ['HA guide scored', o => o.harmonyGuide?.scored], ['HA distr. scored', o => o.harmonyDistraction?.scored], ['Scale heard', o => o.scale?.heard], ['Custom heard', o => o.custom?.heard], ['Rift heard', o => o.rift?.heard], ['PM heard', o => o.pm?.heard], ['Entrances', o => o.tt?.entrances], ['HM1 held', o => o.hm0?.held], ['HM6 held', o => o.hm5?.held]];
  for (const side of SIDES) {
    const R = rows.filter(r => r.side === side); if (!R.length) continue;
    log(`${side.padEnd(7)} ` + cols.map(([n, f]) => `${n} ${med(R.map(f))} [${R.map(f).join('/')}]`).join(' · ') + ` · room ${med(R.map(r => r.room.dbfs))} dBFS`);
  }
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`); logf.end();
})();
