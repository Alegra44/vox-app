// exp/single-stream B4, the other half: what the bleed defences cost REAL singing. A sung stimulus is the fake mic (no
// bleed in it: the speakers aren't in the loop) while the app plays as it does for a user, and each mode with no
// defence, D1 and D2 is compared (frames heard and scores). The defences' bleed ratio k is fixed per mode (CS_K, from
// loopreal.js on this Mac's speakers): a calibration here would hear the singing and reject everything, which is the
// case of a user already singing on the session's first tone, reported separately.
// Per page, with the sung note measured first (median f0 over 1 s → the target):
//   guide   a guide tone (playGuideTone, as Harmony Arena's piano guide) ON the sung note for 5 s, every frame sampled:
//           D2's worst case (the singer is exactly on what the app plays)
//   stayKey Stay in Key for 8 s (the backing pad's chords): frames with a pitch
//   harmony Harmony Arena, piano guide on: frames heard, notes scored, Part Accuracy
//   hm1     Harmony Memory stage 1 (your part as the full guide): frames with a pitch, notes held
//   tt      the Entrance Trainer: entrances claimed (the stimulus's own onsets)
// Usage: CS_K=C1:<k>,C2:<k>,C3:<k> [CS_SIDES=C1,C1+D1,…] [CS_REPS=2] node scripts/audio-verify/costsing.js [stimuli]
//   stimuli: vibfix/stim-*.wav ids (S1, V1, …) or gate/ names (default S1,sing-pp-646)
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata');
require('../warmup-verify/noWarmup');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const K = Object.fromEntries((process.env.CS_K || '').split(',').filter(Boolean).map(x => x.split(':')).map(([m, k]) => [m, +k]));
const SIDES = (process.env.CS_SIDES || 'C1,C1+D1,C1+D2,C2,C2+D1,C2+D2,C3,C3+D1,C3+D2').split(','), REPS = +(process.env.CS_REPS || 2);
const STIMS = (process.argv[2] || 'S1,sing-pp-646').split(',');
const file = id => /^[A-Z]+\d+$/.test(id) ? path.join(TESTDATA, 'vibfix', `stim-${id}.wav`) : path.join(TESTDATA, 'gate', id + '.wav');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `costsing-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (SIDES.some(s => s.includes('+D') && !(s.split('+')[0] in K))) throw new Error('CS_K must give k for every mode with a defence');

async function measure(wav, side) {
  const [mode, def] = side.split('+');
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(([m, d, k]) => { window.__streamMode = m; if (d) { window.__bleedDefence = d; window.__bleedK = k; } }, [mode, def || null, K[mode] ?? null]);
    await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1) || 'index.html';
      if (!/^[\w.-]+\.(js|html)$/.test(p)) return r.fulfill({ status: 404, body: '' });
      return r.fulfill({ path: path.join(ROOT, 'deploy', p), contentType: p.endsWith('.js') ? 'application/javascript' : 'text/html' });
    });
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    const r = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms)), frame = () => new Promise(r => requestAnimationFrame(r));
      requireProFeature = () => true; blockExercise = () => false; requireChoirWorld = () => true;
      selectSong('hymn'); await initAudio({ noWarmup: true });
      document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]')?.click();
      await wait(2500); // the file-backed fake mic starts late
      const fs0 = []; const t0 = performance.now();
      while (performance.now() - t0 < 1000) { analyser.getFloatTimeDomainData(dataArray); const f = autoCorrelate(dataArray, audioCtx.sampleRate); if (f > 0) fs0.push(f); await frame(); }
      fs0.sort((a, b) => a - b); const f0 = fs0[fs0.length >> 1] || 220, target = Math.round(69 + 12 * Math.log2(f0 / 440));
      const out = { target };
      // guide on the sung note
      singingSession(() => !out.guideDone);
      await playGuideTone(noteToFreq(target), 5, 0.05);
      let n = 0, heard = 0, near = 0; const t1 = performance.now();
      while (performance.now() - t1 < 5000) { analyser.getFloatTimeDomainData(dataArray); const f = autoCorrelate(dataArray, audioCtx.sampleRate); n++; if (f > 0) { heard++; if (Math.abs(1200 * Math.log2(f / noteToFreq(target))) <= 50) near++; } await frame(); }
      out.guideDone = true; out.guide = { heard: Math.round(100 * heard / n), onNote: Math.round(100 * near / n) };
      await wait(600);
      // Stay in Key, 8 s
      let sn = 0, sh = 0;
      const sk = document.getElementById('stayKeyStartBtn'); sk.click(); await wait(300);
      const t2 = performance.now();
      while (performance.now() - t2 < 8000) { analyser.getFloatTimeDomainData(dataArray); if (autoCorrelate(dataArray, audioCtx.sampleRate) > 0) sh++; sn++; await frame(); }
      sk.click(); await wait(600);
      out.stayKey = { heard: Math.round(100 * sh / sn) };
      // Harmony Arena, piano guide on
      harmonySelectedLevel = 1; harmonySelectedPart = 'Alto'; harmonyPianoGuideOn = true; harmonyDistractionOn = false; harmonyMemoryModeOn = false;
      await startHarmonyArena(); while (harmonyActive) await wait(200); await wait(500);
      const hr = harmonyNoteResults.map(x => x ?? null);
      out.harmony = { heard: Math.round(100 * harmonyHeardFrames / Math.max(1, harmonyTotalFrames)), scored: hr.filter(x => x !== null).length, part: document.getElementById('harmonyPartVal').textContent };
      // Harmony Memory stage 1
      harmonyMemory.stage = 0; await startHarmonyMemory(); while (harmonyMemory.active) await wait(200); await wait(500);
      const run = harmonyMemory.lastRun;
      out.hm1 = { held: run.held, n: run.notes.length, frames: run.cents.map(c => c.length).reduce((a, b) => a + b, 0) };
      // Entrance Trainer
      document.querySelector('#ttModeRow [data-tt-mode="entrance"]')?.click();
      document.getElementById('ttStartBtn').click();
      const t3 = performance.now(); while (!timingTrainer.active && performance.now() - t3 < 5000) await wait(100);
      while (timingTrainer.active) await wait(200); await wait(500);
      out.tt = { entrances: timingTrainer.results.filter(x => x.claimed).length, n: timingTrainer.results.length };
      out.mode = ssMode(); out.def = bdMode(); out.k = window.__bleedK;
      return out;
    });
    return { ...r, errors };
  } finally { await b.close().catch(() => {}); }
}
const med = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
(async () => {
  const srv = require('child_process').spawn('python3', ['-m', 'http.server', '8765'], { cwd: path.join(ROOT, 'deploy'), stdio: 'ignore' });
  await sleep(1200);
  log(`costsing ${stamp}  k ${JSON.stringify(K)}  sides ${SIDES.join(',')}  reps ${REPS}  stimuli ${STIMS.join(',')}`);
  const rows = [];
  try {
    for (let rep = 1; rep <= REPS; rep++) for (const id of STIMS) for (const side of SIDES) {
      let r; for (let a = 1; ; a++) { try { r = await measure(file(id), side); break; } catch (e) { log(`   ${side} attempt ${a} failed: ${e.message.split('\n')[0]}`); if (a >= 3) throw e; } }
      rows.push({ rep, id, side, ...r }); fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
      log(`rep ${rep} ${id.padEnd(12)} ${side.padEnd(6)} target ${r.target} · guide-on-note heard ${r.guide.heard}% on note ${r.guide.onNote}% · Stay in Key heard ${r.stayKey.heard}% · Harmony heard ${r.harmony.heard}% scored ${r.harmony.scored} part ${r.harmony.part} · HM1 held ${r.hm1.held}/${r.hm1.n} frames ${r.hm1.frames} · entrances ${r.tt.entrances}/${r.tt.n}${r.errors.length ? ' · ERRORS ' + r.errors.join(' | ') : ''}`);
    }
  } catch (e) { log('ERROR ' + (e.stack || e)); process.exitCode = 2; }
  finally { srv.kill(); }
  log('\n== medians: each defence against the same mode without one');
  const cols = [['guide on-note %', r => r.guide.onNote], ['SiK heard %', r => r.stayKey.heard], ['HA heard %', r => r.harmony.heard], ['HA scored', r => r.harmony.scored], ['HM1 frames', r => r.hm1.frames], ['HM1 held', r => r.hm1.held], ['entrances', r => r.tt.entrances]];
  for (const id of STIMS) for (const side of SIDES) { const R = rows.filter(r => r.id === id && r.side === side); if (R.length) log(`${id.padEnd(12)} ${side.padEnd(6)} ` + cols.map(([n, f]) => `${n} ${med(R.map(f))}`).join(' · ')); }
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
})();
