// Release F's screenshots for review/warmupF (RELEASE_F.md, SCREENSHOTS): at 390 Light, 390 Dark and 1280 Light, on the
// local stack (a throwaway account, deleted however the run ends), the file mic singing the sirens on their guide
// (guidewav.py, the stored range C3–C5), so the summary's numbers are measured, not set:
//   coach-warmup-<size>   Coach → Warm-up: the context line, the streak line, the exercises, the XP card
//   header-streak-<size>  the pre-session warm-up's header with the streak ("3 days warmed up in a row · one exercise keeps it")
//   summary-<size>        the summary after the sirens
//   home-stats-<size>     Home's stats line with "4 days warmed up"
//   whyline-score-<size>, whyline-firstbest-<size>   two level-up sheets: a skill score above the average, a first best
// The warm-up streak is set to 3 as of yesterday (the server's row, as a user who warmed up three days running), so
// today's sirens make it 4. The banner inside the warm-up: bannerbehind.js's shots.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/shotsF.js <outdir>
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const { sleep, launch, openPage, TMP, db, uid } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OUT = process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : 'design/warmup/shots-f';
fs.mkdirSync(OUT, { recursive: true });
const RANGE = { lo: 48, hi: 72 };
const OFF = -new Date().getTimezoneOffset(), DAY = n => new Date(Date.now() + n * 86400000 + OFF * 60000).toISOString().slice(0, 10);
const CONFIGS = [['390', { width: 390, height: 844 }, 'light'], ['390-dark', { width: 390, height: 844 }, 'dark'], ['1280', { width: 1280, height: 900 }, 'light']];

(async () => {
  const wav = path.join(TMP, 'wu-guide-shots.wav');
  execFileSync('python', [path.join(__dirname, 'guidewav.py'), wav, JSON.stringify({ ex: 'siren', lo: RANGE.lo, hi: RANGE.hi })]);
  const b = await launch(wav);
  try {
    for (const [name, viewport, colorScheme] of CONFIGS) {
      const { page, ctx } = await openPage(b, { viewport, colorScheme });
      const shot = async f => { await sleep(500); await page.screenshot({ path: path.join(OUT, `${f}-${name}.png`) }); console.log(`  ${f}-${name}`); };
      const closeSheets = () => page.evaluate(() => ['levelupOverlay', 'newRecordOverlay', 'breakthroughOverlay'].forEach(id => { const o = document.getElementById(id); if (o && o.classList.contains('levelup-show')) momentClose(o); }));
      // three days warmed up, the last yesterday; today not yet; the stored range C3–C5. After the sign-up's own saves
      // (a save still in flight would write its older row back over these), and checked in the database before the reload.
      await sleep(3000);
      for (let i = 0; i < 3; i++) {
      await page.evaluate(async ({ r, y }) => {
        window.__wuAllow = true; lowNote = null; highNote = null;
        progress.lowestMidi = r.lo; progress.highestMidi = r.hi; progress.lastWarmupDay = y; progress.warmupStreak = 3;
        wuPassedKey = null; try { localStorage.removeItem(wuKey()); } catch (e) {}
        await saveProgress();
      }, { r: RANGE, y: DAY(-1) });
        await sleep(1500);
        const row = db(`select lowest_midi, last_warmup_day::text as d, warmup_streak as s from public.user_progress where user_id = '${uid()}'`)[0];
        if (+row.lowest_midi === RANGE.lo && row.d === DAY(-1) && +row.s === 3) break;
        if (i === 2) throw new Error('the seeded state did not stick: ' + JSON.stringify(row));
      }
      await page.reload({ waitUntil: 'load' }); await sleep(3000);
      await page.evaluate(() => { window.__wuAllow = true; const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
      await closeSheets();
      // Coach → Warm-up
      await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
      await page.locator('#panel-train-hub [data-enter-panel="warmup"]').click(); await sleep(800);
      await page.evaluate(() => window.scrollTo(0, 0));
      const seen = await page.evaluate(() => ({ lo: progress.lowestMidi, streak: wuStreakNow() }));
      if (seen.lo !== 48 || seen.streak !== 3) throw new Error('the page did not load the seeded state: ' + JSON.stringify(seen));
      await shot('coach-warmup');
      // the pre-session warm-up's header
      await page.evaluate(() => { initAudio({ noWarmup: true }); }); await page.waitForFunction(() => !!analyser, null, { timeout: 15000 });
      await page.evaluate(() => { enterPanel('tuner'); warmupGate(); });
      await page.waitForFunction(() => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', null, { timeout: 8000 });
      await shot('header-streak');
      // the sirens, started in the file's silence so the clock starts on the first sung frame
      await page.evaluate(async () => {
        const buf = new Float32Array(2048), rms = () => { analyser.getFloatTimeDomainData(buf); let a = 0; for (const v of buf) a += v * v; return Math.sqrt(a / buf.length); };
        let heard = false, q = null; const t0 = performance.now();
        while (performance.now() - t0 < 40000) { await new Promise(r => setTimeout(r, 20)); if (rms() > 0.01) { heard = true; q = null; } else if (heard) { q = q || performance.now(); if (performance.now() - q > 300) break; } }
        wuStartExercise('siren');
      });
      await page.waitForFunction(() => wuDone.has('siren') && !wuRun, null, { timeout: 45000 }); await sleep(1500);
      await closeSheets();
      await page.locator('#warmupContinueBtn').click(); await sleep(400);
      await page.evaluate(() => { const c = document.querySelector('#warmupOverlay .wu-card'); c.scrollTop = 0; });
      await shot('summary');
      await page.locator('#warmupContinueBtn').click(); await sleep(600);
      await page.evaluate(() => stopAllActiveSessions());
      await closeSheets();
      await page.locator('.snb-item[data-shell="home"]').click(); await sleep(800);
      await shot('home-stats');
      // two level-up sheets
      const levelUp = async (prep, act, f) => {
        await closeSheets();
        await page.evaluate(async prep => { eval(prep); const lv = levelForXp(progress.xp || 0).level; progress.xp = lv * 50 - 1; progress.levelupSnapshot = levelupSnapshotNow(lv); await saveProgress(); }, prep);
        await page.evaluate(`(async () => { ${act}; })()`); await sleep(900);
        await page.evaluate(() => { const o = document.getElementById('newRecordOverlay'); if (o && o.classList.contains('levelup-show')) momentClose(o); clearTimeout(window._levelupTimer); });
        await shot(f);
      };
      await levelUp('progress.pitchScores = [50, 50, 50]', "recordSkillScore('pitch', 80); await saveProgress()", 'whyline-score');
      await levelUp('progress.bestBridgeSeconds = null', 'await maybeSaveBestBridge(8)', 'whyline-firstbest');
      await closeSheets();
      await ctx.close();
    }
  } finally { await b.close(); await cleanup(); }
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
