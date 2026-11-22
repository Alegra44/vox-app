// What the warm-up keeps (WARMUP.md items 1 and 2), checked against release F's expectations on a throwaway account
// (local stack, the fake mic: a C4 tone, silent). For each step the same snapshot:
//   progress   xp, totalSessions, streak, lastPracticeDate, warmupsCompleted, history[today] (the server's row, /me/progress)
//   vocal load today's vocal_load_sessions rows (count, active s, load, p5/p95 MIDI)
//   browser    the localStorage keys the step wrote (warmup:<id>:<day>, vlBreak:…)
//   page       anything the warm-up holds in memory about the run (wuDone, the trail's length)
// Steps: the pre-session warm-up opened by a session start (the Tuner), each of the four exercises run to the end (20 s),
// the song warm-up (the shortest song) run to the end, Start my session; then Coach → Warm-up (F3: the same warm-up):
// one exercise there the same day, then two the next day.
// Expected (F3): each exercise or song adds one vocal-load row; the day's first finished exercise counts the warm-up,
// +5 XP and warmups_completed + 1, and nothing else (no session, no history, no streak); the rest of the day adds no XP,
// whichever entry; Coach → Warm-up has no Play buttons and no Mark warmup done; the next day counts once again.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/keeps.js [out.json]
require('../runguard').auto();
const fs = require('fs');
const { sleep, tone, launch, openPage, uid, db, warm, rearm, check, totals } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OFF = -new Date().getTimezoneOffset(), LDAY = () => new Date(Date.now() + OFF * 60000).toISOString().slice(0, 10); // the app's day: local since release C
const OUT = process.argv[2] || 'design/warmup/keeps-f.json';
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

const d = (a, b, k) => b[k] - a[k];
// a step's change in XP and warm-ups, and nothing in sessions, history or the streak
function expect(label, a, b, xp, wu, extra = '') {
  check(label, d(a, b, 'xp') === xp && d(a, b, 'warmups_completed') === wu && d(a, b, 'total_sessions') === 0 && d(a, b, 'history_today') === 0 && d(a, b, 'streak') === 0,
    `xp ${d(a, b, 'xp')} · warm-ups ${d(a, b, 'warmups_completed')} · sessions ${d(a, b, 'total_sessions')} · history ${d(a, b, 'history_today')} · streak ${d(a, b, 'streak')}${extra}`);
}
const vlAdded = (a, b) => b.vl.n - a.vl.n;

(async () => {
  const t = tone(60), b = await launch(t.wav);
  try {
    const { page, errors } = await openPage(b, { viewport: { width: 1280, height: 900 } });
    await page.evaluate(() => { window.__wuAllow = true; });
    await rearm(page);
    let prev = await snap(page, 'signed up, nothing done');
    await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
    await page.locator('#panel-train-hub [data-enter-panel="tuner"]').click(); await sleep(800);
    await warm(page);
    await page.locator('#micBtn').click(); await sleep(1500);
    let cur = await snap(page, 'the warm-up opened by the Tuner'); expect('opening the warm-up: nothing kept', prev, cur, 0, 0); prev = cur;
    let first = true;
    for (const ex of ['trill', 'siren', 'glide', 'hum']) {
      await page.locator(`#warmupList [data-wu-item="${ex}"]`).click();
      await waitDone(page, ex, 40000); await sleep(2500); // the vocal-load session ends on the run's end and saves
      cur = await snap(page, `exercise ${ex} sung to the end (20 s)`);
      expect(`${ex} (overlay): ${first ? 'the first of the day counts: +5 XP, +1 warm-up' : 'adds no XP'}`, prev, cur, first ? 5 : 0, first ? 1 : 0);
      check(`${ex}: one vocal-load row`, vlAdded(prev, cur) === 1, `+${vlAdded(prev, cur)}`);
      first = false; prev = cur;
    }
    await page.locator('#warmupOverlay [data-wu-mode="song"]').click(); await sleep(300);
    const song = await page.evaluate(() => { const d = id => { const s = SONGS[id]; return (60 / s.tempo) * s.beatsPerChord * s.parts.Lead.notes.length; };
      return Object.keys(SONGS).sort((a, b) => d(a) - d(b))[0]; });
    await page.locator(`#warmupList [data-wu-item="song:${song}"]`).click();
    await waitDone(page, 'song:' + song, 240000); await sleep(2500);
    cur = await snap(page, `song warm-up ${song} to the end`);
    expect('the song warm-up: adds no XP', prev, cur, 0, 0); check('the song: one vocal-load row', vlAdded(prev, cur) === 1, `+${vlAdded(prev, cur)}`); prev = cur;
    await page.locator('#warmupContinueBtn').click(); await sleep(3000);
    await page.locator('#micBtn').click().catch(() => {}); await sleep(3000); // the Tuner off: its own session ends
    prev = await snap(page, 'Start my session (the Tuner ran ~3 s, then stopped)');
    // Coach → Warm-up (F3)
    await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
    await page.locator('#panel-train-hub [data-enter-panel="warmup"]').click(); await sleep(800);
    const ui = await page.evaluate(() => ({ old: ['warmupPlay1', 'warmupPlay2', 'warmupPlay3', 'warmupCompleteBtn'].filter(id => document.getElementById(id)),
      items: [...document.querySelectorAll('#panel-warmup #warmupList [data-wu-item]')].map(b => b.dataset.wuItem), context: document.getElementById('warmupContext').textContent,
      card: document.getElementById('wuXpTitle').textContent }));
    check('Coach → Warm-up: the same four exercises, no Play buttons, no Mark warmup done', !ui.old.length && ui.items.join() === 'trill,siren,glide,hum', JSON.stringify(ui));
    check('Coach → Warm-up: a context line, and "Warmed up today" after the overlay\'s exercise', !!ui.context && ui.card === 'Warmed up today', `"${ui.context}" · "${ui.card}"`);
    await page.locator('#panel-warmup [data-wu-item="siren"]').click();
    await waitDone(page, 'siren', 40000); await sleep(2500);
    cur = await snap(page, 'Coach → Warm-up: sirens, the same day');
    expect('Coach → Warm-up the same day: adds no XP', prev, cur, 0, 0); check('Coach → Warm-up: one vocal-load row', vlAdded(prev, cur) === 1, `+${vlAdded(prev, cur)}`); prev = cur;
    // the next day: the app's day moved on in the page
    const next = await page.evaluate(() => { const d = new Date(Date.now() + 86400000 + (-new Date().getTimezoneOffset()) * 60000).toISOString().slice(0, 10); window.__todayStr = todayStr; todayStr = () => d; renderWarmupContext(); return d; });
    const card0 = await page.evaluate(() => document.getElementById('wuXpTitle').textContent);
    prev = await snap(page, `the next day (${next}), nothing sung yet`); // history_today is the new day's
    for (const [i, ex] of [['first', 'glide'], ['second', 'hum']]) {
      await page.evaluate(() => { wuDone.clear(); wuRender(); });
      await page.locator(`#panel-warmup [data-wu-item="${ex}"]`).click();
      await waitDone(page, ex, 40000); await sleep(2500);
      cur = await snap(page, `the next day (${next}): ${ex} in Coach → Warm-up`);
      expect(`the next day, the ${i} exercise: ${i === 'first' ? 'counts again: +5 XP, +1 warm-up' : 'adds no XP'}`, prev, cur, i === 'first' ? 5 : 0, i === 'first' ? 1 : 0); prev = cur;
    }
    const card1 = await page.evaluate(() => document.getElementById('wuXpTitle').textContent);
    check('the next day: the card says "Today\'s warm-up", then "Warmed up today"', card0 === "Today's warm-up" && card1 === 'Warmed up today', `"${card0}" → "${card1}"`);
    await page.evaluate(() => { todayStr = window.__todayStr; });
    check('no page errors', errors.length === 0, errors.join(' | '));
    rows.push({ errors });
  } finally { await b.close(); await cleanup(); }
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  const { pass, fail } = totals(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
