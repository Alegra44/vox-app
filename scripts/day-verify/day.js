// Release C (design/day/DAY.md): the day is the device's local date. Against the LOCAL Supabase stack only: run through
// checksC.sh, or with VOX_BACKEND=local NODE_OPTIONS="--require <repo>/scripts/localBackend.js" (it refuses to run
// otherwise, so it can't touch production).
// Three device time zones (Playwright timezoneId): UTC−8 (Etc/GMT+8), UTC+5:30 (Asia/Kolkata), UTC+14 (Pacific/Kiritimati).
// In each, a throwaway account (deleted at exit), and the page's clock moved (Date only: an init script shifts
// Date.now() and new Date(); timers and performance.now() run as they are) to five minutes before and five minutes
// after two moments: the zone's own midnight and UTC midnight, the most recent ones that are over ten minutes ago (the
// server refuses a vocal-load session that starts in the future or over 36 h ago, by its own clock). At each pair:
//   - todayStr() is the zone's date (worked out here with Intl, not the app's code)
//   - history keys: recordActivity() before and after lands on those dates
//   - the streak: +1 across the zone's midnight, unchanged across UTC midnight
//   - the Journey day (renderJourney's label): day 2 after the zone's midnight, still day 1 after UTC midnight
//   - the trial day count, for an account made five minutes before (created_at, and trial_start_date as the server
//     stamps it: created_at's UTC date): day 2 after the zone's midnight, day 1 after UTC midnight
//   - One Take (renderOneTakeGate): today's take done before → the result card after UTC midnight, the start button
//     after the zone's midnight
//   - the warm-up (wuPassed): passed before → still passed after UTC midnight, offered again after the zone's midnight
//   - vocal load: a session (the app's own vlStart, frames, vlEnd, through the outbox and the api) before and after;
//     on the server each row's day is the zone's date at its start and tz_offset_min the zone's offset
// And the switch (decision 3), in each zone: the account's progress put back to a release-B state (day_basis null, a
// 5-day streak, lastPracticeDate the UTC date of a practice earlier today), the page reloaded and an activity recorded:
// the streak is kept (5, or 6 when the UTC date was yesterday's local date), lastPracticeDate becomes the local date,
// day_basis = 'local' and day_basis_since = today on the server; the next local day continues the streak; history keys
// already stored are untouched. The switch-day gauge: an old-style session (no offset, its UTC date) sung earlier
// today under the other UTC date is in today's gauge, and one sung yesterday under that same key is not.
// Usage: node scripts/day-verify/day.js [--zones Etc/GMT+8,Asia/Kolkata,Pacific/Kiritimati]
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('day.js runs against the local Supabase stack only (VOX_BACKEND=local, scripts/localBackend.js)'); process.exit(2); }
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ZONES = (arg('--zones') || 'Etc/GMT+8,Asia/Kolkata,Pacific/Kiritimati').split(',');
const NAME = { 'Etc/GMT+8': 'UTC−8', 'Asia/Kolkata': 'UTC+5:30', 'Pacific/Kiritimati': 'UTC+14' };
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail !== undefined ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
const MIN = 60000, HOUR = 3600000, DAY = 86400000;

// The zone's date and offset at a time, from Intl (independent of the app's code).
function zoneDay(zone, ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function zoneOffsetMin(zone, ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(ms).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000) / MIN);
}
const utcDay = ms => new Date(ms).toISOString().slice(0, 10); // this test's own UTC date, to compare with
// The most recent midnight in the zone (or UTC) at least `ago` before now.
function lastMidnight(zone, now, ago = 10 * MIN) {
  let t = Math.floor((now - ago) / MIN) * MIN;
  for (let i = 0; i < 48 * 60 + 1; i++, t -= MIN) {
    const ok = zone === 'UTC' ? new Date(t).getUTCHours() === 0 && new Date(t).getUTCMinutes() === 0 : zoneDay(zone, t) !== zoneDay(zone, t - MIN);
    if (ok) return t;
  }
  throw new Error('no midnight found for ' + zone);
}

// The page's clock: Date only, shifted by window.__setNow(ms) (null: real time again).
const CLOCK = () => {
  const Real = Date; let shift = 0;
  class ShiftedDate extends Real {
    constructor(...a) { if (a.length === 0) super(Real.now() + shift); else super(...a); }
    static now() { return Real.now() + shift; }
  }
  window.Date = ShiftedDate;
  window.__setNow = ms => { shift = ms === null ? 0 : ms - Real.now(); };
};

async function at(page, ms) { await page.evaluate(m => window.__setNow(m), ms); }
const todayIn = page => page.evaluate(() => todayStr());
// A vocal-load session sung now (the page's clock): the app's vlStart, 3 s of frames, vlEnd, then the outbox emptied.
async function sing(page) {
  return page.evaluate(async () => {
    vlStart(); const r = vlRun;
    for (let i = 0; i < 200 && !r.ready; i++) await new Promise(res => setTimeout(res, 50));
    if (!r.ready) return { ok: false, why: 'the session never got the server state' };
    for (let i = 0; i < 180; i++) vlPush(r, { dt: 1 / 60, rms: 0.06, f0: 220 });
    vlEnd();
    const box = vlOutbox();
    for (let i = 0; i < 300 && box.size(); i++) { await box.drain(); await new Promise(res => setTimeout(res, 100)); }
    return { ok: box.size() === 0, startedAtMs: r.startedAtMs, day: r.day };
  });
}
const sessionRow = (uid, startedAtMs) => db(`select day::text as day, tz_offset_min from public.vocal_load_sessions where user_id = '${uid}' and started_at = '${new Date(startedAtMs).toISOString()}'::timestamptz`)[0];

async function zoneRun(b, zone) {
  const name = NAME[zone] || zone;
  console.log(`\n== ${name} (${zone})`);
  const { page } = await C.openPage(b, { timezoneId: zone, prepare: ctx => ctx.addInitScript(CLOCK) });
  await page.evaluate(() => { window.__wuAllow = true; }); // the warm-up is checked here: the auto-skip stays off
  await C.signUp(page, 'dayc', 'Day Check'); await C.clearOverlays(page);
  const uid = await page.evaluate(() => profile.id);
  const real = Date.now();
  check(`${name}: the browser is in the zone (offset ${zoneOffsetMin(zone, real)} min)`,
    await page.evaluate(() => 0 - new Date().getTimezoneOffset()) === zoneOffsetMin(zone, real));
  check(`${name}: todayStr() now is the zone's date`, await todayIn(page) === zoneDay(zone, real), await todayIn(page));
  // the real account's trial: day 1 on the day it was made, wherever (the server stamped its UTC date)
  const acct = await page.evaluate(() => ({ created: profile.createdAt, trial: profile.trialStartDate, n: trialDayNumber() }));
  check(`${name}: the server stamps trial_start_date with created_at's UTC date`, acct.trial === utcDay(Date.parse(acct.created)), `${acct.trial} / ${acct.created}`);
  check(`${name}: a new account is on trial day 1`, acct.n === 1, acct.n);

  for (const kind of ['local', 'UTC']) {
    const T = lastMidnight(kind === 'local' ? zone : 'UTC', real), before = T - 5 * MIN, after = T + 5 * MIN;
    const crossesDay = zoneDay(zone, before) !== zoneDay(zone, after);
    const label = `${name}, ${kind} midnight (${new Date(T).toISOString().slice(0, 16)}Z)`;
    console.log(`  -- ${label}: ${zoneDay(zone, before)} → ${zoneDay(zone, after)}`);
    // a clean slate for this pair (the server's row, then the page)
    await page.evaluate(async () => {
      Object.assign(progress, { history: {}, streak: 0, lastPracticeDate: null, oneTakeLastDate: null, oneTakeHistory: {} });
      await saveProgress();
    });
    await at(page, before);
    check(`${label}: todayStr() 5 min before`, await todayIn(page) === zoneDay(zone, before), await todayIn(page));
    await page.evaluate(async b => {
      await recordActivity();
      profile.day1StartDate = todayStr(); profile.day1Goal = profile.day1Goal || 'pitch';
      profile.day1Snapshot = profile.day1Snapshot || { ...computeSkillProfile(), date: todayStr() };
      await Promise.allSettled([...progressSaving]); // saves the activity set off (each answer replaces the page's progress)
      profile.createdAt = new Date(b).toISOString(); profile.trialStartDate = VocalLoadStore.utcDayOf(b); // as the server stamps it
      progress.oneTakeHistory = { [todayStr()]: { pitch: 80, stability: 80, timing: 80, heard: true } }; progress.oneTakeLastDate = todayStr();
      await saveProgress(); await Promise.allSettled([...progressSaving]);
      wuMarkPassed('done');
    }, before);
    const s1 = await sing(page);
    check(`${label}: a vocal-load session 5 min before is saved`, s1.ok, JSON.stringify(s1));
    await at(page, after);
    check(`${label}: todayStr() 5 min after`, await todayIn(page) === zoneDay(zone, after), await todayIn(page));
    await page.evaluate(async () => { await recordActivity(); await Promise.allSettled([...progressSaving]); });
    const s2 = await sing(page);
    check(`${label}: a vocal-load session 5 min after is saved`, s2.ok, JSON.stringify(s2));
    const st = await page.evaluate(() => {
      renderJourney(); renderOneTakeGate();
      return { history: progress.history, streak: progress.streak, last: progress.lastPracticeDate,
        journey: document.getElementById('journeyDayLabel').textContent, trial: trialDayNumber(),
        oneTakeDone: document.getElementById('oneTakeResultCard').style.display === 'block', warm: wuPassed(),
        oneTake: { last: progress.oneTakeLastDate, days: Object.keys(progress.oneTakeHistory || {}) } };
    });
    const want = crossesDay ? { [zoneDay(zone, before)]: 1, [zoneDay(zone, after)]: 1 } : { [zoneDay(zone, before)]: 2 };
    check(`${label}: history keys`, JSON.stringify(st.history) === JSON.stringify(want), JSON.stringify(st.history));
    check(`${label}: the streak ${crossesDay ? 'goes on (2)' : 'stays 1'}`, st.streak === (crossesDay ? 2 : 1), st.streak);
    check(`${label}: lastPracticeDate is the zone's date`, st.last === zoneDay(zone, after), st.last);
    check(`${label}: the Journey reads day ${crossesDay ? 2 : 1}`, new RegExp(`\\b${crossesDay ? 2 : 1}\\b`).test(st.journey), st.journey);
    check(`${label}: trial day ${crossesDay ? 2 : 1}`, st.trial === (crossesDay ? 2 : 1), st.trial);
    check(`${label}: One Take ${crossesDay ? 'open again' : 'still done for today'}`, st.oneTakeDone === !crossesDay, (st.oneTakeDone ? 'result shown' : 'start shown') + ' ' + JSON.stringify(st.oneTake));
    check(`${label}: the warm-up ${crossesDay ? 'offered again' : 'still passed today'}`, st.warm === !crossesDay, st.warm);
    for (const [s, when] of [[s1, before], [s2, after]]) {
      const row = s.ok ? sessionRow(uid, s.startedAtMs) : null;
      const exp = { day: zoneDay(zone, when), tz_offset_min: zoneOffsetMin(zone, when) };
      check(`${label}: the session ${when === before ? 'before' : 'after'} is on the server under ${exp.day} (UTC ${utcDay(when)}), offset ${exp.tz_offset_min}`,
        !!row && row.day === exp.day && row.tz_offset_min === exp.tz_offset_min, JSON.stringify(row));
    }
    await at(page, null);
  }

  // ---- the switch (decision 3) ----
  console.log(`  -- ${name}: the switch from a release-B account`);
  const cases = [];
  // A practice earlier today saved by the old app: its key is the UTC date of then. West of UTC late in the evening that
  // is tomorrow's date (gap −1), east of UTC just after local midnight it is yesterday's (gap 1); otherwise the same (0).
  const off = zoneOffsetMin(zone, real);
  const Tm = lastMidnight(zone, real, 3 * HOUR); // a local midnight at least 3 h ago: "today" runs from it
  const F = off < 0 ? Tm - 30 * MIN : Tm + 3 * HOUR - 30 * MIN;   // the moment the new app opens: 23:30 local (west) or 02:30 (east)
  const oldPractice = F - 60 * MIN;                                // the old app's practice an hour earlier, same local day
  const utcKey = utcDay(oldPractice), localNow = zoneDay(zone, F);
  const gap = Math.round((Date.parse(localNow) - Date.parse(utcKey)) / DAY);
  cases.push({ utcKey, localNow, gap });
  await page.evaluate(async () => { Object.assign(progress, { history: {}, streak: 0, lastPracticeDate: null }); await saveProgress(); });
  db(`update public.user_progress set day_basis = null, day_basis_since = null, streak = 5, last_practice_date = '${utcKey}',
      history = '{"${utcKey}": 3, "2026-01-01": 1}'::jsonb where user_id = '${uid}' returning 1`);
  // the switch-day gauge: an old-style session (no offset, the UTC date) an hour before F, under the other key; and one
  // sung the local day before under that same key (east: the evening before; west: none can be, so it's skipped)
  db(`delete from public.vocal_load_sessions where user_id = '${uid}' returning 1`);
  const sA = oldPractice, keyA = utcDay(sA);
  db(`insert into public.vocal_load_sessions (user_id, session_id, day, started_at, active_seconds, load, median_rms, p5_midi, p95_midi, ended)
      values ('${uid}', gen_random_uuid(), '${keyA}', '${new Date(sA).toISOString()}', 100, 250, 0.05, 55, 67, true) returning 1`);
  let yesterdayUnderKey = null;
  for (let t = Tm - MIN; t > Tm - 20 * HOUR; t -= 30 * MIN) if (utcDay(t) === keyA && zoneDay(zone, t) !== localNow) { yesterdayUnderKey = t; break; }
  if (yesterdayUnderKey && yesterdayUnderKey > real - 34 * HOUR) {
    db(`insert into public.vocal_load_sessions (user_id, session_id, day, started_at, active_seconds, load, median_rms, p5_midi, p95_midi, ended)
        values ('${uid}', gen_random_uuid(), '${keyA}', '${new Date(yesterdayUnderKey).toISOString()}', 100, 400, 0.05, 55, 67, true) returning 1`);
  }
  // the page reopens at F (a new page, as after the release: the clock is set before the app loads)
  await page.addInitScript(f => { try { window.__setNow(f); } catch (e) {} }, F);
  await page.reload(); await page.waitForFunction(() => { try { return !!profile && !!progress && 'streak' in progress; } catch (e) { return false; } }, null, { timeout: 30000 });
  await C.clearOverlays(page);
  const g = await page.evaluate(async () => { await loadVocalLoadToday(); return { day: vlDay.day, load: vlDay.load }; });
  const keyIsLocal = keyA === localNow;
  check(`${name} switch: the gauge on the switch day counts the old session sung today (${keyIsLocal ? 'its UTC key is today\'s local date' : 'under ' + keyA})` +
    (yesterdayUnderKey ? ', not yesterday\'s under the same key' : ''), g.day === localNow && Math.abs(g.load - 250) < 1e-6, `${g.day} load ${g.load}`);
  const sw = await page.evaluate(async () => { await recordActivity(); return { streak: progress.streak, last: progress.lastPracticeDate, history: progress.history, basis: progress.dayBasis, since: progress.dayBasisSince }; });
  const wantStreak = gap === 1 ? 6 : 5;
  check(`${name} switch: UTC-era lastPracticeDate ${utcKey}, local today ${localNow} (gap ${gap}): the streak is ${wantStreak}`, sw.streak === wantStreak, sw.streak);
  check(`${name} switch: lastPracticeDate becomes local today`, sw.last === localNow, sw.last);
  check(`${name} switch: the history keys already stored are untouched`, sw.history['2026-01-01'] === 1 && sw.history[utcKey] === (utcKey === localNow ? 4 : 3) &&
    sw.history[localNow] === (utcKey === localNow ? 4 : 1), JSON.stringify(sw.history));
  const srv = db(`select day_basis, day_basis_since::text as since, streak from public.user_progress where user_id = '${uid}'`)[0];
  check(`${name} switch: on the server day_basis = 'local', day_basis_since = ${localNow}`, srv.day_basis === 'local' && srv.since === localNow, JSON.stringify(srv));
  // the next local day continues it
  let next = F; while (zoneDay(zone, next) === localNow) next += 30 * MIN;
  await at(page, next + HOUR); // an hour into the next local day
  const nx = await page.evaluate(async () => { await recordActivity(); return { streak: progress.streak, today: todayStr() }; });
  check(`${name} switch: the next local day (${nx.today}) continues the streak (${wantStreak + 1})`, nx.streak === wantStreak + 1, nx.streak);
  // a second save doesn't switch again
  const again = await page.evaluate(async () => { await saveProgress(); return progress.dayBasisSince; });
  check(`${name} switch: once per account (day_basis_since stays ${localNow})`, again === localNow, again);
  await page.close();
}

(async () => {
  const b = await C.chromium.launch();
  try { for (const z of ZONES) await zoneRun(b, z); }
  finally { await b.close(); C.cleanup(); }
  console.log(`\n${fail ? 'DAY: FAIL' : 'DAY: PASS'} (${pass} passed, ${fail} failed)`);
  process.exitCode = fail ? 1 : 0;
})();
