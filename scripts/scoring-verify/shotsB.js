// Scoring batch release B: screenshots for the user's review (not a pass/fail check). Local build, production backend,
// a throwaway account (deleted at exit). At 390 Light, 390 Dark and 1280 Light:
//   - the speaker-delay sheet: measuring (1.5 s in), done (the app's output looped into its mic 90 ms late:
//     loopmic.js) and couldn't hear the clicks (no loop); the Speaker delay row in Profile & settings after each
//   - the results of Rhythm, Entrance & Cutoff (entrances, Lead), Karaoke Coach, Performance Director, Emotional
//     Singing and Harmony Arena (Soprano, level 1), each sung on its own clock by the synthetic mic (synthmic.js): every
//     note its own onset on time, held 85 % of the note; Emotional Singing with note levels from −12 to 0 dB
// Out: <out>/<width>-<theme>/<name>.png, and <out>/index.txt (what each take scored).
// Usage: node scripts/scoring-verify/shotsB.js [--out dir]   (default <tmp>/voxcoach-shots-scoringB)
require('../runguard').auto();
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('../design-verify/common'), S = require('../design-verify/stage'), synth = require('../design-verify/synthmic');
const { LOOP } = require('./loopmic');
const { enterHub } = require('../choir-verify/cwreach');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.resolve(arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots-scoringB'));
const COMBOS = [[390, 'light'], [390, 'dark'], [1280, 'light']];
const VIEW = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const index = [];

// in the page: the notes of a line on a clock (performance.now() ms), each on its start
const singLine = (t0, D, midis, gains) => __synth.sing(midis.map((m, i) => ({ semis: m - 69, on: t0 + i * D, off: t0 + (i + 0.85) * D, gain: gains ? gains[i % gains.length] : 1 })));
async function shoot(page, dir, name, sel) {
  if (sel) await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -12); }, sel);
  await C.sleep(400);
  await page.screenshot({ path: path.join(dir, name + '.png') });
}

async function sheet(b, state, w, theme, dir) {
  for (const [D, name] of [[90, 'sheet-done'], [null, 'sheet-failed']]) {
    const { ctx, page } = await C.openPage(b, { viewport: VIEW[w], theme, storageState: state, prepare: c => c.addInitScript(LOOP, D) });
    try {
      await C.clearOverlays(page);
      await page.evaluate(async () => { window.__sdAllow = true; localStorage.removeItem(SD_STORE_KEY); await initAudio({ noWarmup: true }); sdKeyNow = await sdOutputKey(); sdOpen(); });
      if (D !== null) { await C.sleep(1500); await shoot(page, dir, 'sheet-measuring'); }
      await page.waitForFunction(() => document.getElementById('speakerDelayOverlay').dataset.sdState !== 'measuring', null, { timeout: 15000 });
      await shoot(page, dir, name);
      const st = await page.evaluate(() => { const r = sdStored(); document.getElementById('sdContinueBtn').click(); return r; });
      index.push(`${w}-${theme} ${name}: ${JSON.stringify(st)}`);
      await C.showPanel(page, 'profile'); await shoot(page, dir, `profile-row-${D === null ? 'estimate' : 'measured'}`, '#speakerDelayTitle');
    } finally { await ctx.close(); }
  }
}

async function tools(b, state, w, theme, dir) {
  const { ctx, page } = await C.openPage(b, { viewport: VIEW[w], theme, storageState: state, prepare: c => synth.attach(c, S.STIM.steady, { level: 0 }) });
  try {
    await C.clearOverlays(page); await S.warmMic(page);
    const take = async (name, start, sing, busy, sel, nums) => C.G.step(`${w}-${theme} ${name}`, 90, async () => { // normally 30 s
      await start(); await page.evaluate(sing); await page.waitForFunction(`!(${busy})`, null, { timeout: 60000, polling: 200 });
      await C.sleep(1000); await shoot(page, dir, name, sel);
      index.push(`${w}-${theme} ${name}: ${JSON.stringify(await page.evaluate(nums))}`);
      await page.evaluate(() => { __synth.sing([]); try { stopAllActiveSessions(); } catch (e) {} });
    });
    // Rhythm: an onset on every scored beat (its beats are on the audio clock)
    await take('rhythm-result', async () => { await C.showPanel(page, 'rhythm'); await C.clearOverlays(page);
      await page.evaluate(async () => { document.getElementById('rhythmStartBtn').click(); const u = performance.now() + 8000; while (!(rhythmActive && rhythmBeatTimestamps.length === 8) && performance.now() < u) await new Promise(r => setTimeout(r, 5)); }); },
      () => { const perf = rhythmBeatTimestamps.map(ts => performance.now() + (ts - audioCtx.currentTime) * 1000); __synth.sing(perf.map(p => ({ semis: 0, on: p, off: p + 150 }))); },
      'rhythmActive', '#rhythmResultCard', () => document.getElementById('rhythmResultAvg').textContent);
    // Entrance & Cutoff, entrances, Lead: each note on its entrance (song clock: choirStartCtxTime on the audio clock)
    await take('entrance-result', async () => {
      await page.evaluate(() => showShellSection('songs')); await C.sleep(400);
      await enterHub(page, '#panel-songs-hub [data-enter-panel="partrehearsal"]', '#ttStartBtn');
      await page.evaluate(async () => { document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]').click(); timingTrainer.mode = 'entrance'; document.getElementById('ttStartBtn').click();
        const u = performance.now() + 8000; while (!(timingTrainer.active && choirIsPlaying) && performance.now() < u) await new Promise(r => setTimeout(r, 20)); }); },
      () => { const t0 = performance.now() + (choirStartCtxTime - audioCtx.currentTime) * 1000, D = songChordDurMs(); __synth.sing(SONG.parts.Lead.notes.map((m, i) => ({ semis: m - 69, on: t0 + i * D, off: t0 + (i + 0.85) * D }))); },
      'timingTrainer.active', '#ttResults', () => document.querySelector('#ttResults .vc-result-num') && document.querySelector('#ttResults .vc-result-num').textContent);
    for (const [name, panel, btn, active, startVar, sel, gains, nums] of [
      ['karaoke-result', 'karaoke', 'karaokeStartBtn', 'karaokeActive', 'karaokeStartTime', '#karaokeResult', null, () => ({ pitch: document.getElementById('karaokePitchVal').textContent, timing: document.getElementById('karaokeTimingVal').textContent })],
      ['pd-result', 'performancedirector', 'pdStartBtn', 'pdActive', 'pdStartTime', '#pdResultCard', null, () => ({ pitch: document.getElementById('pdPitchVal').textContent, timing: document.getElementById('pdTimingVal').textContent, dynamics: document.getElementById('pdDynamicsVal').textContent })],
      ['emotion-result', 'emotion', 'emotionStartBtn', 'emotionActive', 'emotionStartTime', '#emotionResult', [0.25, 0.35, 0.5, 0.7, 1, 0.6, 0.4, 0.8], () => ({ pitch: document.getElementById('emotionPitchVal').textContent, expression: document.getElementById('emotionExpressionVal').textContent, coach: document.getElementById('emotionFeedback').textContent })],
    ]) await take(name, async () => { await C.showPanel(page, panel); await C.clearOverlays(page);
      await page.evaluate(async ([btn, active]) => { document.getElementById(btn).click(); const u = performance.now() + 8000; while (!window.eval(active) && performance.now() < u) await new Promise(r => setTimeout(r, 2)); }, [btn, active]); },
      new Function(`(${singLine})(${startVar}, songChordDurMs(), SONG.parts.Lead.notes, ${JSON.stringify(gains)})`), active, sel, nums);
    // Harmony Arena, Soprano, level 1 (it opens at level 10: the XP set in this page only)
    await take('harmony-result', async () => {
      await page.evaluate(() => { progress.xp = Math.max(progress.xp || 0, 20000); window.saveProgress = async () => {}; showShellSection('world'); });
      await C.sleep(400); await page.evaluate(() => showArcadeGame('harmony')); await C.sleep(600);
      await page.evaluate(async () => { document.querySelector('#harmonyPartRow [data-harmony-part="Soprano"]').click(); document.querySelector('#harmonyLevelRow [data-harmony-level="1"]').click();
        document.getElementById('harmonyStartBtn').click(); const u = performance.now() + 8000; while (!harmonyActive && performance.now() < u) await new Promise(r => setTimeout(r, 2)); }); },
      new Function(`(${singLine})(harmonyStartTime, songChordDurMs(), SONG.parts.Soprano.notes)`), 'harmonyActive', '#harmonyResult',
      () => ({ overall: document.getElementById('harmonyAccVal').textContent, timing: document.getElementById('harmonyTimingVal').textContent }));
  } finally { await ctx.close(); }
}

(async () => {
  S.ensureStimuli();
  const b = await synth.launch();
  try {
    const a = await C.openPage(b, {}); await C.signUp(a.page, 'dvshotb', 'Shots B'); const state = await a.ctx.storageState(); await a.ctx.close();
    for (const [w, theme] of COMBOS) {
      const dir = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(dir, { recursive: true });
      await C.G.step(`${w}-${theme} sheet`, 90, () => sheet(b, state, w, theme, dir));
      await tools(b, state, w, theme, dir);
      console.log(`${w}-${theme}: done`);
    }
  } finally { await b.close(); C.cleanup(); fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'index.txt'), index.join('\n') + '\n'); }
  console.log(index.join('\n')); console.log(`\nshots: ${OUT}`);
})();
