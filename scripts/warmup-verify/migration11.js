// Release F5: migration 0011 (user_progress.last_warmup_day, warmup_streak) on the LOCAL Supabase stack, never production.
//   1. supabase db reset --local --version 0010: the schema as production has it today (release E), empty
//   2. an old row: a user's progress as release E's app writes it (a practice streak, warm-ups counted by Smart Warmup)
//   3. supabase migration up --local: 0011 applied
//   4. the old row is there and unchanged (streak, warmups_completed, xp), with last_warmup_day null and warmup_streak 0;
//      as the user (role authenticated, under RLS) both columns are written and read back; another user's row isn't
//      touched; a negative streak is refused; the api's allow-list (PROGRESS_PATCHABLE_COLUMNS) lists both
// Statements run in the local database container (psql), so nothing here can reach production. The run ends with every
// migration applied (0011 included), as the warm-up checks after it need.
// Usage: node scripts/warmup-verify/migration11.js
require('../runguard').auto();
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const CONTAINER = 'supabase_db_voxcoach-app';
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
const cli = (...a) => execFileSync('npx', ['supabase', ...a], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_OPTIONS: '' }, timeout: 300000 });
function sql(text) {
  try {
    const out = execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt'],
      { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
    return { ok: true, out: out.trim(), err: '' };
  } catch (e) { return { ok: false, out: String(e.stdout || '').trim(), err: String(e.stderr || e.message).trim() }; }
}
const A = '00000000-0000-4000-8000-0000000000f1', B = '00000000-0000-4000-8000-0000000000f2';
const as = (u, body) => `begin;
\\o /dev/null
select set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '${u}', true);
set local role authenticated;
\\o
${body}
commit;`;
const col = c => sql(`select data_type || '|' || is_nullable || '|' || coalesce(column_default, '') from information_schema.columns where table_schema='public' and table_name='user_progress' and column_name='${c}';`).out;

console.log('1. the local database at 0010 (production\'s schema today), empty');
cli('db', 'reset', '--local', '--version', '0010', '--no-seed');
const v = sql(`select max(version) from supabase_migrations.schema_migrations;`);
check('the local migrations end at 0010', v.out === '0010', v.out || v.err);
check('0010\'s schema: no last_warmup_day yet', col('last_warmup_day') === '');

console.log('2. old rows, as release E writes them');
const users = sql(`insert into auth.users (id, email, aud, role) values ('${A}', 'voxcoach-wuf-a@example.com', 'authenticated', 'authenticated'),
  ('${B}', 'voxcoach-wuf-b@example.com', 'authenticated', 'authenticated');`);
check('two users (handle_new_user makes their progress rows)', users.ok, users.err);
const old = sql(`update public.user_progress set streak = 6, last_practice_date = '2026-11-21', warmups_completed = 9, xp = 420 where user_id = '${A}';
  select streak || '|' || warmups_completed || '|' || xp from public.user_progress where user_id = '${A}';`);
check('A\'s old row: streak 6, warm-ups 9, xp 420', old.ok && old.out === '6|9|420', old.out || old.err);

console.log('3. 0011 applied');
let up; try { up = cli('migration', 'up', '--local'); } catch (e) { up = String(e.stderr || e.message); }
const v2 = sql(`select max(version) from supabase_migrations.schema_migrations;`);
check('the local migrations end at 0011', v2.out === '0011', v2.out || up);

console.log('4. after');
check('last_warmup_day: date, nullable, no default', col('last_warmup_day') === 'date|YES|', col('last_warmup_day'));
check('warmup_streak: integer, not null, default 0', col('warmup_streak') === 'integer|NO|0', col('warmup_streak'));
const kept = sql(`select streak || '|' || warmups_completed || '|' || xp || '|' || coalesce(last_warmup_day::text, 'null') || '|' || warmup_streak from public.user_progress where user_id = '${A}';`);
check('A\'s old row unchanged; last_warmup_day null, warmup_streak 0', kept.out === '6|9|420|null|0', kept.out || kept.err);
const w = sql(as(A, `update public.user_progress set last_warmup_day = '2026-11-22', warmup_streak = 4 where user_id = '${A}';
select last_warmup_day || '|' || warmup_streak from public.user_progress where user_id = '${A}';`));
check('as A (authenticated, RLS): both written and read back', w.ok && w.out === '2026-11-22|4', w.out || w.err);
const cross = sql(as(A, `update public.user_progress set warmup_streak = 99 where user_id = '${B}';`));
const b = sql(`select warmup_streak from public.user_progress where user_id = '${B}';`);
check('as A, B\'s row isn\'t touched', cross.ok && b.out === '0', `B's streak ${b.out}`);
const neg = sql(as(A, `update public.user_progress set warmup_streak = -1 where user_id = '${A}';`));
check('a negative streak is refused', !neg.ok && /user_progress_warmup_streak_nonneg/.test(neg.err), neg.err.split('\n')[0]);
const ts = fs.readFileSync(path.join(ROOT, 'supabase/functions/_shared/patchableColumns.ts'), 'utf8');
const allow = [...ts.split('PROGRESS_PATCHABLE_COLUMNS')[1].split('] as const')[0].matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1]);
check('PROGRESS_PATCHABLE_COLUMNS lists last_warmup_day and warmup_streak', allow.includes('last_warmup_day') && allow.includes('warmup_streak'));
sql(`delete from auth.users where id in ('${A}', '${B}');`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
