// Release C (design/day/DAY.md): migration 0010 on the LOCAL Supabase stack (supabase start), never production.
// The local database is production's schema: the same migrations 0001–0009 production has applied, in order, by the
// Supabase CLI on the same Postgres image (17.6.1.166). Steps:
//   1. supabase db reset --local --version 0009: the schema as production has it today, empty
//   2. old rows, written the way release B's app writes them (no offset; day = the UTC date of started_at), for two
//      users, including a session that is "tomorrow" in UTC for a singer west of UTC
//   3. supabase migration up --local: 0010 applied (Postgres checks the new CHECK on every existing row as it is added)
//   4. the old rows are still there and valid (the constraint is marked validated); an old client's write (no offset)
//      still works under the UTC rule; new rows with an offset are checked by it: the right local day goes in, a forged
//      offset (a day that isn't started_at plus the offset), an offset out of range, an offset that changes, and an
//      old-style row with a non-UTC day are refused; pruning keeps one more day; vocal_load_state's `since`;
//      user_progress.day_basis takes 'local' only
// Every write goes through the same SQL functions the api calls, as the user (role authenticated, auth.uid() from the
// JWT claims), under RLS. Statements run in the local database container (psql), so nothing here can reach production.
// Usage: node scripts/day-verify/migration.js
require('../runguard').auto();
const { execFileSync } = require('child_process');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const CONTAINER = 'supabase_db_voxcoach-app';
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
const cli = (...a) => execFileSync('npx', ['supabase', ...a], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_OPTIONS: '' }, timeout: 300000 });
// one psql session; returns { ok, out, err }
function sql(text) {
  try {
    const out = execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt'],
      { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
    return { ok: true, out: out.trim(), err: '' };
  } catch (e) { return { ok: false, out: String(e.stdout || '').trim(), err: String(e.stderr || e.message).trim() }; }
}
const A = '00000000-0000-4000-8000-0000000000c1', B = '00000000-0000-4000-8000-0000000000c2';
const sid = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// as user u, server clock pinned at nowIso
const as = (u, nowIso, body) => `begin;
\\o /dev/null
select set_config('vocal_load.now', '${nowIso}', true);
select set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '${u}', true);
set local role authenticated;
\\o
${body}
commit;`;
const cp = (u, nowIso, n, day, startIso, active, load, off, ended = false) => sql(as(u, nowIso,
  `select day, tz_offset_min from public.vocal_load_checkpoint('${sid(n)}'::uuid, '${day}'::date, '${startIso}'::timestamptz, ${active}, ${load}, ` +
  `${active > 0 ? '0.05, 55, 67' : 'null, null, null'}, ${ended}${off === undefined ? '' : `, ${off === null ? 'null' : off}::smallint`});`));
const refused = (r, re) => !r.ok && re.test(r.err);

console.log('1. the local database at 0009 (production\'s schema), empty');
cli('db', 'reset', '--local', '--version', '0009', '--no-seed');
const v = sql(`select max(version) from supabase_migrations.schema_migrations;`);
check('the local migrations end at 0009', v.out === '0009', v.out || v.err);
check('0009\'s schema: no tz_offset_min yet', sql(`select count(*) from information_schema.columns where table_name='vocal_load_sessions' and column_name='tz_offset_min';`).out === '0');

console.log('2. old rows, as release B writes them (no offset, the UTC date)');
const users = sql(`insert into auth.users (id, email, aud, role) values ('${A}', 'voxcoach-dayc-a@example.com', 'authenticated', 'authenticated'),
  ('${B}', 'voxcoach-dayc-b@example.com', 'authenticated', 'authenticated');`);
check('two users', users.ok, users.err);
const NOW = '2026-11-16T07:00:00Z';
const OLD = [
  [1, A, '2026-11-15', '2026-11-15T22:30:00Z', 120],   // a singer in UTC−8 at 14:30 local, 15 Nov
  [2, A, '2026-11-16', '2026-11-16T03:00:00Z', 90],    // UTC−8 at 19:00 local on the 15th: "tomorrow" in UTC
  [3, B, '2026-11-15', '2026-11-15T20:00:00Z', 300],   // UTC+5:30 at 01:30 local on the 16th: "yesterday" in UTC
  [4, B, '2026-11-16', '2026-11-16T06:00:00Z', 40],
];
for (const [n, u, day, start, act] of OLD) {
  const r = sql(as(u, NOW, `select day from public.vocal_load_checkpoint('${sid(n)}'::uuid, '${day}'::date, '${start}'::timestamptz, ${act}, ${act * 2}, 0.05, 55, 67, true);`));
  if (!r.ok) check(`old row ${n}`, false, r.err);
}
check('four old rows stored', sql(`select count(*) from public.vocal_load_sessions;`).out === '4');

console.log('3. migration 0010 applied (supabase migration up --local)');
let up; try { up = cli('migration', 'up', '--local'); check('applied', true); } catch (e) { check('applied', false, String(e.stderr || e.message).slice(0, 400)); }
check('the local migrations end at 0010', sql(`select max(version) from supabase_migrations.schema_migrations;`).out === '0010');

console.log('4. the rules after 0010');
const rows = sql(`select session_id, day, tz_offset_min is null from public.vocal_load_sessions order by session_id;`).out.split('\n');
check('the old rows are all still there, offset null', rows.length === 4 && rows.every(r => r.endsWith('|t')), rows.join(' '));
const conv = sql(`select convalidated from pg_constraint where conname = 'vls_day_is_start_date';`).out;
check('the new day CHECK is validated on every existing row', conv === 't', conv);
check('the old UTC-only CHECK is gone', sql(`select count(*) from pg_constraint where conname = 'vls_day_is_utc_start_date';`).out === '0');
// an old client, not yet reloaded: no offset, the UTC rule
let r = cp(A, NOW, 10, '2026-11-16', '2026-11-16T06:30:00Z', 30, 60, undefined);
check('an old client\'s write (no offset, the UTC day) is accepted', r.ok && /2026-11-16\|$/.test(r.out), r.err || r.out);
r = cp(A, NOW, 11, '2026-11-15', '2026-11-16T06:30:00Z', 30, 60, null);
check('no offset and not the UTC day: refused', refused(r, /vls_day_is_start_date/), r.err.split('\n')[0]);
// new rows: the day at the offset
const NEW = [
  // [n, user, day sent, start, offset, expected ok, what]
  [20, A, '2026-11-15', '2026-11-16T06:00:00Z', -480, true, 'UTC−8 at 22:00 local: day 15 Nov (UTC is the 16th)'],
  [21, A, '2026-11-16', '2026-11-16T06:00:00Z', -480, false, 'UTC−8, the UTC date sent instead: refused'],
  [22, B, '2026-11-16', '2026-11-15T19:00:00Z', 330, true, 'UTC+5:30 at 00:30 local on the 16th: day 16 Nov (UTC is the 15th)'],
  [23, B, '2026-11-15', '2026-11-15T19:00:00Z', 330, false, 'UTC+5:30, the UTC date sent: refused'],
  [24, B, '2026-11-16', '2026-11-15T10:30:00Z', 840, true, 'UTC+14 at 00:30 local on the 16th: day 16 Nov (UTC is the 15th)'],
  [25, B, '2026-11-15', '2026-11-15T10:31:00Z', 840, false, 'UTC+14, the UTC date sent: refused'],
  [26, A, '2026-11-16', '2026-11-15T18:00:00Z', 360, true, 'UTC+6 at exactly local midnight: the new day'],
  [27, A, '2026-11-15', '2026-11-16T05:59:59Z', 360, false, 'forged: UTC+6 a second before noon claimed as the 15th'],
  [28, A, '2026-11-16', '2026-11-16T06:00:00Z', 0, true, 'offset 0: the UTC date'],
];
for (const [n, u, day, start, off, ok, what] of NEW) {
  r = cp(u, NOW, n, day, start, 20, 40, off);
  check(what, ok ? r.ok && r.out.endsWith(`|${off}`) : refused(r, /vls_day_is_start_date/), ok ? (r.err || r.out) : r.err.split('\n')[0]);
}
r = cp(A, NOW, 30, '2026-11-16', '2026-11-16T06:00:00Z', 20, 40, 841);
check('offset +841 (past UTC+14): refused', refused(r, /vls_tz_offset_min/), r.err.split('\n')[0]);
r = cp(A, NOW, 31, '2026-11-15', '2026-11-16T06:00:00Z', 20, 40, -721);
check('offset −721 (past UTC−12): refused', refused(r, /vls_tz_offset_min/), r.err.split('\n')[0]);
// a later checkpoint of the same session can't move its offset (the guard), straight through PostgREST's table path
r = sql(as(A, NOW, `update public.vocal_load_sessions set tz_offset_min = -420, day = '2026-11-15' where session_id = '${sid(20)}';`));
check('a session\'s offset can\'t change (direct update)', refused(r, /day, start and offset can't change/), r.err.split('\n')[0]);
r = cp(A, NOW, 20, '2026-11-15', '2026-11-16T06:00:00Z', 25, 50, -420);
const kept = sql(`select tz_offset_min, active_seconds from public.vocal_load_sessions where session_id = '${sid(20)}';`).out;
check('a later checkpoint with another offset updates the totals, keeps the first offset', r.ok && kept === '-480|25', r.err || kept);
// RLS: another user's session id can't be written into
r = sql(as(B, NOW, `update public.vocal_load_sessions set load = 999 where session_id = '${sid(20)}' returning 1;`));
check('RLS: user B can\'t touch user A\'s session', r.ok && r.out === '', r.err || r.out);
// vocal_load_state: day totals and since
const st = (u, day, since) => JSON.parse(sql(as(u, NOW, `select public.vocal_load_state('${day}'::date${since ? `, '${since}'::timestamptz` : ''});`)).out.split('\n').find(l => l.startsWith('{')));
const a16 = st(A, '2026-11-16'), a16since = st(A, '2026-11-16', '2026-11-16T05:00:00Z');
// A on the 16th: old row 2 (load 180) + old-client row 10 (60) + row 26 (40) + row 28 (40) = 320; since 05:00Z: row 10 (06:30), 28 (06:00) = 100
check('vocal_load_state: the day\'s load', a16.dayLoad === 320, JSON.stringify(a16.dayLoad));
check('vocal_load_state: since counts sessions from then on', a16since.dayLoad === 100, JSON.stringify(a16since.dayLoad));
check('vocal_load_state: the call without since still works (the api before its deploy)', sql(as(A, NOW, `select public.vocal_load_state('2026-11-16'::date)->'dayLoad';`)).out.split('\n').includes('320'));
// pruning: one more day of slack (sessions under 60 active s, so the "last 5 qualifying" rule keeps none of them)
const PNOW = '2026-11-19T07:00:00Z';
sql(`delete from public.vocal_load_sessions where user_id = '${B}';`);
for (const [n, day, start] of [[40, '2026-11-16', '2026-11-16T07:00:00Z'], [41, '2026-11-17', '2026-11-17T07:00:00Z'], [42, '2026-11-18', '2026-11-18T07:00:00Z']]) {
  r = sql(as(B, day === '2026-11-16' ? '2026-11-16T08:00:00Z' : day === '2026-11-17' ? '2026-11-17T08:00:00Z' : '2026-11-18T08:00:00Z',
    `select 1 from public.vocal_load_checkpoint('${sid(n)}'::uuid, '${day}'::date, '${start}'::timestamptz, 20, 40, 0.05, 55, 67, true, 0::smallint);`));
  if (!r.ok) check(`prune seed ${n}`, false, r.err);
}
r = sql(as(B, PNOW, `select 1 from public.vocal_load_checkpoint('${sid(43)}'::uuid, '2026-11-19'::date, '2026-11-19T06:30:00Z'::timestamptz, 20, 40, 0.05, 55, 67, true, 0::smallint);`));
const left = sql(`select string_agg(day::text, ',' order by day) from public.vocal_load_sessions where user_id = '${B}';`).out;
check('pruning on the 19th keeps the 17th, 18th and 19th (day − 2), drops the 16th', r.ok && left === '2026-11-17,2026-11-18,2026-11-19', r.err || left);
// day_basis
r = sql(as(A, NOW, `update public.user_progress set day_basis = 'local', day_basis_since = '2026-11-15' where user_id = '${A}' returning day_basis, day_basis_since;`));
check('user_progress.day_basis = \'local\' and day_basis_since: written by the user', r.ok && r.out === 'local|2026-11-15', r.err || r.out);
r = sql(as(A, NOW, `update public.user_progress set day_basis = 'utc' where user_id = '${A}';`));
check('day_basis other than \'local\': refused', refused(r, /up_day_basis/), r.err.split('\n')[0]);

sql(`delete from auth.users where id in ('${A}', '${B}');`);
console.log(`\n${fail ? 'MIGRATION 0010: FAIL' : 'MIGRATION 0010: PASS'} (${pass} passed, ${fail} failed)`);
process.exitCode = fail ? 1 : 0;
