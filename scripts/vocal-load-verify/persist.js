// Vocal Load Dosimetry phase 2, verified locally: supabase/migrations/0005_vocal_load.sql applied unchanged to a PGlite
// (in-process Postgres) database with a stub of what it depends on (auth.uid() from request.jwt.claim.sub, a
// public.users table, the `authenticated` role), then sessions over four days run through the real engine
// (deploy/vocal-load.js) and checkpointer (deploy/vocal-load-store.js), writing through the migration's SQL functions
// as the signed-in user, under RLS. After every session the stored rolling baseline and daily totals are compared with
// values worked out by hand (arithmetic in the comments). Frames at 60 per second on a simulated clock, which is also
// the server's clock (vocal_load.now). Nothing touches the linked project.
// Usage: node scripts/vocal-load-verify/persist.js
const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs'), path = require('path');
const V = require('../../deploy/vocal-load.js'), St = require('../../deploy/vocal-load-store.js');
const MIGRATION = path.resolve(__dirname, '../../supabase/migrations/0005_vocal_load.sql');
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const USER_A = '00000000-0000-4000-8000-00000000000a', USER_B = '00000000-0000-4000-8000-00000000000b';
let pass = 0, fail = 0, sid = 0;
const newSid = () => `10000000-0000-4000-8000-${String(++sid).padStart(12, '0')}`;
const fmt = x => x == null ? '—' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')) : String(x);
function check(label, expected, actual, tol = 1e-6) {
  const ok = typeof expected === 'number' && typeof actual === 'number' ? Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected))
    : JSON.stringify(expected) === JSON.stringify(actual);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(58)} expected ${fmt(typeof expected === 'object' ? JSON.stringify(expected) : expected).padStart(14)}   got ${fmt(typeof actual === 'object' ? JSON.stringify(actual) : actual).padStart(14)}`);
}

let db;
// Runs one statement as `uid` (authenticated role, RLS on) with the server clock at nowIso.
async function as(uid, nowIso, sql, params = []) {
  await db.query('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('vocal_load.now', $2, false)", [uid, nowIso]);
  await db.query('set role authenticated');
  try { return await db.query(sql, params); } finally { await db.query('reset role'); }
}
// The day's total in vocal_load_daily (null when there is no row), read as uid.
const daily = async (uid, day, nowIso) => { const r = (await as(uid, nowIso, 'select total_load from public.vocal_load_daily where day = $1::date', [day])).rows[0]; return r ? r.total_load : null; };
const state = async (uid, day, nowIso) => (await as(uid, nowIso, 'select public.vocal_load_state($1::date) as s', [day])).rows[0].s;
const checkpointSql = 'select * from public.vocal_load_checkpoint($1::uuid, $2::date, $3::timestamptz, $4, $5, $6, $7, $8, $9)';
const writeAs = (uid, clock) => p => as(uid, new Date(clock.ms).toISOString(), checkpointSql,
  [p.sessionId, p.day, p.startedAt, p.activeSeconds, p.load, p.medianRms, p.p5Midi, p.p95Midi, p.ended]);
async function rowsOf(uid, nowIso) {
  return (await as(uid, nowIso, 'select session_id, day::text as day, active_seconds, load, median_rms, p5_midi, p95_midi, ended from public.vocal_load_sessions order by started_at')).rows;
}

// One session: reads the stored state for its day, builds the baseline, sings `parts` ([seconds, rms, midi] or
// [seconds, 'rest']) at 60 frames/s, checkpointing as the app will, then ends it ('end'), hides the page ('hidden') or
// just stops ('crash': the tab died, no more writes). Returns what it used and wrote.
async function sing(uid, startIso, parts, endMode = 'end', onWrite = null) {
  const clock = { ms: Date.parse(startIso) }, day = St.dayOf(clock.ms);
  const st = await state(uid, day, startIso);
  const baseline = V.computeBaseline(st.sessions, null);
  const session = V.createSession(baseline, { priorLoadToday: Number(st.dayLoad) });
  const sessionId = newSid(), writes = [];
  const write = writeAs(uid, clock);
  const cp = St.createCheckpointer({ session, sessionId, startedAtMs: clock.ms, write: async (p, o) => { await write(p); writes.push({ reason: null, active: p.activeSeconds, load: p.load, at: new Date(clock.ms).toISOString(), keepalive: !!o.keepalive }); if (onWrite) await onWrite(p); } });
  const note = r => { if (r && r.ok) writes[writes.length - 1].reason = r.reason; else if (r) writes.push({ failed: r }); };
  for (const [secs, rms, midi] of parts) for (let i = 0; i < secs * 60; i++) {
    clock.ms += 1000 / 60;
    const s = rms === 'rest' ? session.push({ dt: 1 / 60, rms: 0.002, f0: -1 }) : session.push({ dt: 1 / 60, rms, f0: hz(midi) });
    const w = cp.frame(s, clock.ms); if (w) note(await w);
  }
  if (endMode === 'end') note(await cp.end(clock.ms));
  if (endMode === 'hidden') note(await cp.hidden(clock.ms));
  return { day, st, baseline, sessionId, writes, endIso: new Date(clock.ms).toISOString() };
}
const writesStr = w => w.map(x => x.failed ? `FAILED ${JSON.stringify(x.failed)}` : `${x.reason}@${fmt(x.active)}s`).join(', ');
async function rejects(label, uid, nowIso, sql, params, wantMsg) {
  let err = null; try { await as(uid, nowIso, sql, params); } catch (e) { err = e.message; }
  const ok = err !== null && (!wantMsg || err.includes(wantMsg));
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(58)} ${err ? 'rejected: ' + err.split('\n')[0] : 'NOT rejected'}`);
}

(async () => {
  db = new PGlite();
  // What 0005 depends on in Supabase, stubbed: auth.uid(), public.users, the authenticated role and its grants.
  await db.exec(`
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.users (id uuid primary key);
    insert into public.users values ('${USER_A}'), ('${USER_B}');
    create role authenticated;
    grant usage on schema public, auth to authenticated;
    grant execute on function auth.uid() to authenticated;`);
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  // Supabase grants the authenticated role everything on new public tables and leaves the rest to RLS; same here.
  await db.exec(`grant select, insert, update, delete on public.vocal_load_sessions, public.vocal_load_daily to authenticated;
    grant execute on all functions in schema public to authenticated;`);
  console.log('0005_vocal_load.sql applied to a local PGlite database (' + (await db.query('select version()')).rows[0].version.split(' on ')[0] + ')');

  const A = USER_A;
  // Rates per sung second, by hand: rate = max(1, rms / baseline RMS) × (1 + max(0, (m − low) / (passaggio − low))).
  // Default range A2–C5: low 45, passaggio 45 + 0.6 × 27 = 61.2, so pr = (m − 45) / 16.2.

  console.log('\n== Day 1, 2026-09-21 (UTC)');
  // S1, new user: no stored sessions → calibrate (30 s at ratio 1, then baseline = its own median 0.04 → ratio 1);
  // default range. m 50: pr 5/16.2 → rate 1.308642 → 120 s: 120 + 600/16.2 = 157.037037.
  let r = await sing(A, '2026-09-21T09:00:00Z', [[120, 0.04, 50]]);
  check('S1 baseline RMS (none: calibrates)', null, r.baseline.rms);
  check('S1 range source', 'default', r.baseline.rangeSource);
  check('S1 writes: every 60 s of singing, then the end', 'minute@60s, minute@120s, end@120s', writesStr(r.writes));
  let s = await state(A, '2026-09-21', r.endIso);
  check('day 1 total = 157.037037', 157.037037, Number(s.dayLoad));
  check('  daily table, 2026-09-21', 157.037037, await daily(A, '2026-09-21', r.endIso));
  check('stored baseline sessions: S1 (120 s, RMS 0.04, pitch 50–50)', [{ p5Midi: 50, p95Midi: 50, medianRms: 0.04, activeSeconds: 120 }], s.sessions.map(x => ({ p5Midi: +x.p5Midi.toFixed(6), p95Midi: +x.p95Midi.toFixed(6), medianRms: +x.medianRms.toFixed(6), activeSeconds: +x.activeSeconds.toFixed(6) })));
  // S2: 45 s (under 60: stored for the day's total, not for the baseline). Baseline RMS 0.04 (S1); ratio 0.06/0.04 = 1.5;
  // m 64: pr 19/16.2 → rate 1.5 × 35.2/16.2 → 45 s: 67.5 × 35.2 / 16.2 = 146.666667.
  r = await sing(A, '2026-09-21T18:00:00Z', [[45, 0.06, 64]]);
  check('S2 baseline RMS = S1 median', 0.04, r.baseline.rms);
  check('S2 prior load today', 157.037037, Number(r.st.dayLoad));
  check('S2 writes: under a minute, one write at the end', 'end@45s', writesStr(r.writes));
  s = await state(A, '2026-09-21', r.endIso);
  check('day 1 total = 157.037037 + 146.666667', 303.703704, Number(s.dayLoad));
  check('  daily table, 2026-09-21', 303.703704, await daily(A, '2026-09-21', r.endIso));
  check('baseline still S1 only (S2 < 60 s)', 1, s.sessions.length);

  console.log('\n== Day 2, 2026-09-22');
  // S3: baseline RMS 0.04 (S1), default range. 300 s at 0.05, m 64: ratio 1.25, rate 1.25 × 35.2/16.2 → 375 × 35.2/16.2 = 814.814815.
  r = await sing(A, '2026-09-22T08:00:00Z', [[300, 0.05, 64]]);
  check('S3 prior load today (new day starts at 0)', 0, Number(r.st.dayLoad));
  check('S3 writes', 'minute@60s, minute@120s, minute@180s, minute@240s, minute@300s, end@300s', writesStr(r.writes));
  check('day 2 total = 814.814815', 814.814815, Number((await state(A, '2026-09-22', r.endIso)).dayLoad));
  check('  daily table, 2026-09-22', 814.814815, await daily(A, '2026-09-22', r.endIso));
  check('day 1 total unchanged', 303.703704, Number((await state(A, '2026-09-21', r.endIso)).dayLoad));
  // S4 starts 23:59 on day 2 and runs 3 minutes, past midnight UTC: counted on day 2, the day it started.
  // Baseline RMS median(0.04, 0.05) = 0.045 → ratio 0.05/0.045 = 10/9; 2 sessions → default range; m 57: pr 12/16.2.
  // Rate (10/9) × 28.2/16.2 → 180 s: 200 × 28.2 / 16.2 = 348.148148.
  r = await sing(A, '2026-09-22T23:59:00Z', [[180, 0.05, 57]]);
  check('S4 baseline RMS = median(0.04, 0.05)', 0.045, r.baseline.rms);
  check('S4 first checkpoint lands after midnight', '2026-09-23T00:00:00.000Z', r.writes[0].at.replace(/\.\d+Z$/, '.000Z'));
  check('day 2 total = 814.814815 + 348.148148', 1162.962963, Number((await state(A, '2026-09-22', r.endIso)).dayLoad));
  check('day 3 total before any day-3 session', 0, Number((await state(A, '2026-09-23', r.endIso)).dayLoad));
  check('  daily table: S4 on 2026-09-22', 1162.962963, await daily(A, '2026-09-22', r.endIso));
  check('  daily table: no 2026-09-23 row yet', null, await daily(A, '2026-09-23', r.endIso));

  console.log('\n== Day 3, 2026-09-23');
  // S5: 3 qualifying sessions (S1, S3, S4): baseline RMS median(0.04, 0.05, 0.05) = 0.05; range from them: lowest p5 50,
  // highest p95 64 (a 14-semitone span, ≥ 12) → passaggio 50 + 0.6 × 14 = 58.4, pr = (m − 50)/8.4.
  // 40 s at 0.08, m 50 (ratio 1.6, pr 0 → rate 1.6), a 20 s rest, 50 s more. The pause is saved 5 s into the rest:
  // 40 × 1.6 = 64. Total 90 × 1.6 = 144.
  let atPause = null;
  r = await sing(A, '2026-09-23T10:00:00Z', [[40, 0.08, 50], [20, 'rest'], [50, 0.08, 50]], 'end', async p => { if (!atPause) atPause = (await rowsOf(A, '2026-09-23T10:00:45Z')).find(x => x.session_id === p.sessionId); });
  check('S5 baseline RMS = median(0.04, 0.05, 0.05)', 0.05, r.baseline.rms);
  check('S5 range from sessions: low', 50, r.baseline.low);
  check('S5 range from sessions: high', 64, r.baseline.high);
  check('S5 passaggio = 50 + 0.6 × 14', 58.4, r.baseline.passaggio);
  check('S5 writes: a pause checkpoint, then the end', 'pause@40s, end@90s', writesStr(r.writes));
  check('S5 stored at the pause: active seconds', 40, atPause.active_seconds);
  check('S5 stored at the pause: load 40 × 1.6', 64, atPause.load);
  check('day 3 total = 144', 144, Number((await state(A, '2026-09-23', r.endIso)).dayLoad));
  check('  daily table, 2026-09-23', 144, await daily(A, '2026-09-23', r.endIso));
  // S6: the tab dies after 150 s at 0.05, m 58.4 (ratio 1, pr 1 → rate 2). Baseline RMS median(0.04, 0.05, 0.05, 0.08)
  // = 0.05. Last checkpoint at 120 s: 240 stored, 30 s (60 load-seconds) lost.
  r = await sing(A, '2026-09-23T12:00:00Z', [[150, 0.05, 58.4]], 'crash');
  check('S6 baseline RMS = median(0.04, 0.05, 0.05, 0.08)', 0.05, r.baseline.rms);
  check('S6 writes before the crash', 'minute@60s, minute@120s', writesStr(r.writes));
  let row = (await rowsOf(A, r.endIso)).find(x => x.session_id === r.sessionId);
  check('S6 stored: 120 s, load 240, not ended', [120, 240, false], [+row.active_seconds.toFixed(6), +row.load.toFixed(6), row.ended]);
  check('day 3 total = 144 + 240', 384, Number((await state(A, '2026-09-23', r.endIso)).dayLoad));
  check('  daily table: the crashed session counts to its last checkpoint', 384, await daily(A, '2026-09-23', r.endIso));
  // S7: the same 150 s, then the page is hidden: saved with keepalive at 150 s → 300.
  r = await sing(A, '2026-09-23T15:00:00Z', [[150, 0.05, 58.4]], 'hidden');
  check('S7 writes: minutes, then on page hide', 'minute@60s, minute@120s, hidden@150s', writesStr(r.writes));
  check('S7 hide write sent with keepalive', true, r.writes[2].keepalive);
  check('day 3 total = 144 + 240 + 300', 684, Number((await state(A, '2026-09-23', r.endIso)).dayLoad));
  check('  daily table, 2026-09-23', 684, await daily(A, '2026-09-23', r.endIso));

  console.log('\n== Day 4, 2026-09-24');
  // Qualifying: S1, S3, S4, S5, S6 (120 s), S7 (150 s) → the last 5: S3–S7. RMS median(0.05, 0.05, 0.08, 0.05, 0.05)
  // = 0.05; lowest p5 50 (S5), highest p95 64 (S3) → passaggio 58.4. S8: 60 s at 0.05, m 71: pr 21/8.4 = 2.5 → rate 3.5 → 210.
  r = await sing(A, '2026-09-24T09:00:00Z', [[60, 0.05, 71]]);
  check('S8 baseline from the last 5 (S3–S7): RMS', 0.05, r.baseline.rms);
  check('S8 passaggio', 58.4, r.baseline.passaggio);
  check('day 4 total = 60 × 3.5', 210, Number((await state(A, '2026-09-24', r.endIso)).dayLoad));
  // S8's insert pruned what the engine no longer needs: rows from before day 3 (09-23) that aren't among the last 5
  // qualifying (S4–S8): S1, S2, S3 gone; S4 stays (in the last 5).
  const left = (await rowsOf(A, r.endIso)).map(x => x.day + ':' + fmt(x.active_seconds));
  check('rows kept: S4 (day 2), S5–S7 (day 3), S8', ['2026-09-22:180', '2026-09-23:90', '2026-09-23:120', '2026-09-23:150', '2026-09-24:60'], left);
  s = await state(A, '2026-09-24', r.endIso);
  check('stored baseline: last 5 qualifying, oldest first (median RMS)', [0.05, 0.08, 0.05, 0.05, 0.05], s.sessions.map(x => +x.medianRms.toFixed(6)));
  check('day 3 total kept (yesterday)', 684, Number((await state(A, '2026-09-24', r.endIso).then(() => state(A, '2026-09-23', r.endIso))).dayLoad));
  check('day 2 total after pruning: S4 only (S3 pruned by design)', 348.148148, Number((await state(A, '2026-09-22', r.endIso)).dayLoad));
  // vocal_load_daily is untouched by the pruning: every day keeps its full total
  check('daily table survives pruning: 2026-09-21 (S1, S2 rows gone)', 303.703704, await daily(A, '2026-09-21', r.endIso));
  check('daily table survives pruning: 2026-09-22 (S3 row gone)', 1162.962963, await daily(A, '2026-09-22', r.endIso));
  check('daily table: 2026-09-23', 684, await daily(A, '2026-09-23', r.endIso));
  check('daily table: 2026-09-24', 210, await daily(A, '2026-09-24', r.endIso));

  console.log('\n== Row-level security: user B');
  const now = '2026-09-24T12:00:00Z';
  s = await state(USER_B, '2026-09-23', now);
  check("B's state on A's busiest day", { sessions: [], dayLoad: 0 }, { sessions: s.sessions, dayLoad: Number(s.dayLoad) });
  check('B sees rows', 0, (await rowsOf(USER_B, now)).length);
  await rejects('B inserts a row owned by A', USER_B, now,
    `insert into public.vocal_load_sessions (user_id, session_id, day, started_at, active_seconds, load, median_rms, p5_midi, p95_midi) values ($1, $2, '2026-09-24', '2026-09-24T11:00:00Z', 100, 150, 0.05, 50, 60)`,
    [A, newSid()], 'row-level security');
  const aRows = await rowsOf(A, now);
  await as(USER_B, now, `update public.vocal_load_sessions set load = 9999`);
  await as(USER_B, now, `delete from public.vocal_load_sessions`);
  check("B's update and delete touch none of A's rows", aRows, await rowsOf(A, now));
  check("B reads A's daily totals", 0, (await as(USER_B, now, 'select * from public.vocal_load_daily')).rows.length);
  await rejects('A writes a daily total directly (read-only)', A, now, `insert into public.vocal_load_daily (user_id, day, total_load) values ($1, '2026-09-20', 5)`, [A], 'row-level security');
  await as(A, now, `update public.vocal_load_daily set total_load = 0`);
  await as(A, now, `delete from public.vocal_load_daily`);
  check("A's direct update/delete of daily totals changes nothing", 684, await daily(A, '2026-09-23', now));

  console.log('\n== Bounds: impossible values rejected by the database (and flagged by the client first)');
  const good = { sessionId: null, day: '2026-09-24', startedAt: '2026-09-24T11:00:00.000Z', activeSeconds: 100, load: 150, medianRms: 0.05, p5Midi: 50, p95Midi: 60, ended: false };
  const nowMs = Date.parse(now);
  const cpArgs = p => [p.sessionId, p.day, p.startedAt, p.activeSeconds, p.load, p.medianRms, p.p5Midi, p.p95Midi, p.ended];
  check('a sane checkpoint: client finds no problem', [], St.validateCheckpoint({ ...good, sessionId: newSid() }, nowMs));
  const bad = [
    ['median RMS 1.5 (over full scale)', { medianRms: 1.5 }, 'vls_median_rms'],
    ['median RMS 0.001 (under what the engine counts)', { medianRms: 0.001 }, 'vls_median_rms'],
    ['pitch 20 (under 50 Hz)', { p5Midi: 20 }, 'vls_pitch'],
    ['pitch 95 (over 1500 Hz)', { p95Midi: 95 }, 'vls_pitch'],
    ['p5 67 above p95 60', { p5Midi: 67 }, 'vls_pitch'],
    ['load 50 for 100 s (rate under 1)', { load: 50 }, 'vls_load_bounds'],
    ['load 4000 for 100 s (rate over 37.1)', { load: 4000 }, 'vls_load_bounds'],
    ['singing with no summary', { medianRms: null, p5Midi: null, p95Midi: null }, 'vls_summary_present'],
    ['5000 active s, started 1 h ago', { activeSeconds: 5000, load: 6000 }, 'more active seconds'],
    ['9 h of active singing', { startedAt: '2026-09-23T20:00:00.000Z', day: '2026-09-23', activeSeconds: 32400, load: 40000 }, 'vls_active_seconds'],
    ['started 1 h in the future', { startedAt: '2026-09-24T13:00:00.000Z', activeSeconds: 0, load: 0, medianRms: null, p5Midi: null, p95Midi: null }, 'in the future'],
    ['started 3 days ago', { startedAt: '2026-09-21T12:00:00.000Z', day: '2026-09-21', activeSeconds: 10, load: 15 }, 'too long ago'],
    ["day isn't the start's UTC date", { day: '2026-09-25' }, 'vls_day_is_utc_start_date'],
  ];
  for (const [label, change, want] of bad) {
    const p = { ...good, sessionId: newSid(), ...change };
    const clientErrors = St.validateCheckpoint(p, nowMs);
    check(`client flags: ${label}`, true, clientErrors.length > 0);
    await rejects(`database rejects: ${label}`, A, now, checkpointSql, cpArgs(p), want);
  }

  console.log('\n== Checkpoints only move forward (and so does the day total)');
  // two old daily rows, written directly as the table owner: 2025-09-23 is 366 days before 2026-09-24, 2025-09-24 is 365
  await db.query(`insert into public.vocal_load_daily (user_id, day, total_load) values ($1, '2025-09-23', 11), ($1, '2025-09-24', 22)`, [A]);
  check('rejected checkpoints above added nothing to 2026-09-24', 210, await daily(A, '2026-09-24', now));
  const id = newSid();
  await as(A, now, checkpointSql, cpArgs({ ...good, sessionId: id }));
  check('a new session at 100 s / 150: day total 210 + 150', 360, await daily(A, '2026-09-24', now));
  check('a year kept: 2025-09-24 (365 days back) stays', 22, await daily(A, '2025-09-24', now));
  check('a year kept: 2025-09-23 (366 days back) is gone', null, await daily(A, '2025-09-23', now));
  await as(A, now, checkpointSql, cpArgs({ ...good, sessionId: id }));
  check('the same checkpoint again adds nothing', 360, await daily(A, '2026-09-24', now));
  let got = await as(A, now, checkpointSql, cpArgs({ ...good, sessionId: id, activeSeconds: 80, load: 120 }));
  check('a stale checkpoint (80 s after 100 s) is a no-op: stored', [100, 150], [got.rows[0].active_seconds, got.rows[0].load]);
  check('  and adds nothing to the day', 360, await daily(A, '2026-09-24', now));
  await rejects('writing it straight to the table is rejected', A, now, `update public.vocal_load_sessions set active_seconds = 80, load = 120 where session_id = $1`, [id], "can't go backwards");
  got = await as(A, now, checkpointSql, cpArgs({ ...good, sessionId: id, activeSeconds: 110, load: 165, ended: true }));
  check('the end checkpoint (110 s, ended)', [110, 165, true], [got.rows[0].active_seconds, got.rows[0].load, got.rows[0].ended]);
  check('  day total rises by the difference, 165 - 150', 375, await daily(A, '2026-09-24', now));
  got = await as(A, now, checkpointSql, cpArgs({ ...good, sessionId: id, activeSeconds: 120, load: 180 }));
  check('a late checkpoint after the end is a no-op', [110, 165, true], [got.rows[0].active_seconds, got.rows[0].load, got.rows[0].ended]);
  check('  and adds nothing to the day', 375, await daily(A, '2026-09-24', now));
  await rejects('changing an ended session directly is rejected', A, now, `update public.vocal_load_sessions set active_seconds = 120, load = 180 where session_id = $1`, [id], 'already ended');
  await rejects("moving a session's day is rejected", A, '2026-09-24T12:00:00Z', `update public.vocal_load_sessions set day = '2026-09-23', started_at = '2026-09-23T11:00:00Z' where session_id = $1`, [(await rowsOf(A, now)).find(x => !x.ended).session_id], "can't change");

  check('rejected direct edits added nothing to the day', 375, await daily(A, '2026-09-24', now));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
