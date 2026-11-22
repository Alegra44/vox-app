// WARMUP.md items 1 and 2: what the daily warm-up and Smart Warmup keep, measured on a throwaway account (local stack,
// the fake mic: a C4 tone, silent). For each step the same snapshot before and after:
//   progress   xp, totalSessions, streak, lastPracticeDate, warmupsCompleted, history[today] (the server's row, /me/progress)
//   vocal load today's vocal_load_sessions rows (count, active s, load, p5/p95 MIDI)
//   browser    the localStorage keys the step wrote (warmup:<id>:<day>, vlBreak:…)
//   page       anything the warm-up holds in memory about the run (wuDone, the trail's length)
// Steps: the pre-session warm-up opened by a session start (the Tuner), each of the four exercises run to the end (20 s),
// the song warm-up (the shortest song) run to the end, Start my session; then Smart Warmup: its Play buttons, then
// "Mark warmup done" three times on the same day.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/keeps.js [out.json]
require('../runguard').auto();
const fs = require('fs');
const { sleep, tone, launch, openPage, uid, db, warm, rearm } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OFF = -new Date().getTimezoneOffset(), LDAY = () => new Date(Date.now() + OFF * 60000).toISOString().slice(0, 10); // the app's day: local since release C
const OUT = process.argv[2] || 'design/warmup/keeps.json';
const rows = [];

const snap = async (page, label) => {
  const p = await page.evaluate(async () => {
    const row = await apiFetch('/me/progress'); const today = todayStr();
    const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(warmup|vlBreak|wu)/.test(k)) ls[k] = localStorage.getItem(k); }
    return { xp: row.xp, total_sessions: row.total_sessions, streak: row.streak, last_practice_date: row.last_practice_date, warmups_completed: row.warmups_completed,
      history_today: (row.history || {})[today] || 0, timeline: (row.timeline_events || []).length, ls, wuDone: [...wuDone], trail: wuRun && wuRun.trail ? wuRun.trail.length : null };
  });
  const vl = db(`select count(*) as n, coalesce(sum(active_seconds),0) as act, coalesce(sum(load),0) as load, min(p5_midi) as p5, max(p95_midi) as p95 from public.vocal_load_sessions where user_id = '${uid()}' and day = '${LDAY()}'`)[0];
  const r = { label, ...p, vl: { n: +vl.n, active_s: +(+vl.act).toFixed(1), load: +(+vl.load).toFixed(1), p5: vl.p5 == null ? null : +(+vl.p5).toFixed(2), p95: vl.p95 == null ? null : +(+vl.p95).toFixed(2) } };
  rows.push(r); console.log(JSON.stringify(r));
  return r;
};
const waitDone = (page, key, ms) => page.waitForFunction(k => wuDone.has(k) && !wuRun, key, { timeout: ms });

(async () => {
  const t = tone(60), b = await launch(t.wav);
  try {
    const { page, errors } = await openPage(b, { viewport: { width: 1280, height: 900 } });
    await page.evaluate(() => { window.__wuAllow = true; });
    await rearm(page);
    await snap(page, 'signed up, nothing done');
    await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
    await page.locator('#panel-train-hub [data-enter-panel="tuner"]').click(); await sleep(800);
    await warm(page);
    await page.locator('#micBtn').click(); await sleep(1500);
    await snap(page, 'the warm-up opened by the Tuner');
    for (const ex of ['trill', 'siren', 'glide', 'hum']) {
      await page.locator(`#warmupList [data-wu-item="${ex}"]`).click();
      await waitDone(page, ex, 40000); await sleep(2500); // the vocal-load session ends on the run's end and saves
      await snap(page, `exercise ${ex} sung to the end (20 s)`);
    }
    await page.locator('#warmupOverlay [data-wu-mode="song"]').click(); await sleep(300);
    const song = await page.evaluate(() => { const d = id => { const s = SONGS[id]; return (60 / s.tempo) * s.beatsPerChord * s.parts.Lead.notes.length; };
      return Object.keys(SONGS).sort((a, b) => d(a) - d(b))[0]; });
    await page.locator(`#warmupList [data-wu-item="song:${song}"]`).click();
    await waitDone(page, 'song:' + song, 240000); await sleep(2500);
    await snap(page, `song warm-up ${song} to the end`);
    await page.locator('#warmupContinueBtn').click(); await sleep(3000);
    await page.locator('#micBtn').click().catch(() => {}); await sleep(3000); // the Tuner off: its own session ends
    await snap(page, 'Start my session (the Tuner ran ~3 s, then stopped)');
    // Smart Warmup
    await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
    await page.locator('#panel-train-hub [data-enter-panel="warmup"]').click(); await sleep(800);
    const gum0 = await page.evaluate(() => window.__gum.length);
    for (const id of ['warmupPlay1', 'warmupPlay2', 'warmupPlay3']) { await page.locator('#' + id).click(); await sleep(5000); }
    const gum1 = await page.evaluate(() => window.__gum.length);
    await snap(page, `Smart Warmup: Play ×3 (getUserMedia calls: ${gum1 - gum0})`);
    for (let i = 1; i <= 3; i++) { await page.locator('#warmupCompleteBtn').click(); await sleep(2500); await snap(page, `Smart Warmup: Mark warmup done ×${i}`); }
    rows.push({ errors });
  } finally { await b.close(); await cleanup(); }
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
