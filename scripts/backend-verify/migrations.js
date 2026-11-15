// Scoring batch release B, B6: migration 0009 (expression_scores) checked without touching production. Every migration in
// supabase/migrations, in order, on PGlite (Postgres compiled to WebAssembly, in this process), over a stub of what
// Supabase provides (the auth and storage schemas, auth.uid() read from a setting, the anon/authenticated/service_role
// roles). Then:
//   - user_progress.expression_scores is jsonb, not null, default '[]'
//   - a new account's row (handle_new_user, on an auth.users insert) has expression_scores = []
//   - as that user (role authenticated, auth.uid() = the user), PATCH's update of expression_scores goes through RLS
//     and reads back; another user's row isn't touched
//   - PROGRESS_PATCHABLE_COLUMNS lists it
// PGlite isn't a dependency of the app: set PGLITE_DIR to a folder where `npm i @electric-sql/pglite@0.2.17` was run.
// Usage: PGLITE_DIR=<dir> node scripts/backend-verify/migrations.js
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), MIG = path.join(ROOT, 'supabase/migrations');
const dir = process.env.PGLITE_DIR;
const { PGlite } = require(dir ? require.resolve('@electric-sql/pglite', { paths: [dir] }) : '@electric-sql/pglite');
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };

const STUB = `
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
grant usage on schema public, auth to anon, authenticated, service_role;
`;

(async () => {
  const db = new PGlite();
  await db.exec(STUB);
  const files = fs.readdirSync(MIG).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort();
  console.log(`== ${files.length} migrations on PGlite`);
  for (const f of files) {
    // pgcrypto: PGlite has no such extension; gen_random_uuid() is in core Postgres (13+), which is what 0001 uses it for
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8').replace(/create extension if not exists "pgcrypto";/i, '-- (pgcrypto: core gen_random_uuid() on PGlite)');
    try { await db.exec(sql); check(`${f} applies`, true); }
    catch (e) { check(`${f} applies`, false, e.message); }
  }
  const col = (await db.query(`select data_type, is_nullable, column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'user_progress' and column_name = 'expression_scores'`)).rows[0];
  check('user_progress.expression_scores is jsonb, not null, default \'[]\'', !!col && col.data_type === 'jsonb' && col.is_nullable === 'NO' && /'\[\]'::jsonb/.test(col.column_default || ''),
    col ? `${col.data_type}, nullable ${col.is_nullable}, default ${col.column_default}` : 'no such column');
  // two accounts, as a sign-up makes them
  await db.exec(`grant select, insert, update on public.user_progress to authenticated`);
  const [a, b] = [(await db.query(`insert into auth.users (email) values ('a@example.com') returning id`)).rows[0].id,
    (await db.query(`insert into auth.users (email) values ('b@example.com') returning id`)).rows[0].id];
  const row = id => db.query(`select expression_scores from public.user_progress where user_id = $1`, [id]).then(r => r.rows[0]);
  const ra = await row(a);
  check('a new account\'s row has expression_scores = []', !!ra && JSON.stringify(ra.expression_scores) === '[]', ra ? JSON.stringify(ra.expression_scores) : 'no row (handle_new_user)');
  // as user a, the way PATCH /me/progress writes (the Edge Function runs as the caller): RLS lets a write its own row only
  await db.exec(`set role authenticated; select set_config('test.uid', '${a}', false);`);
  let upd = null, err = null;
  try { upd = await db.query(`update public.user_progress set expression_scores = '[41, 63]'::jsonb where user_id = $1 returning expression_scores`, [a]); } catch (e) { err = e.message; }
  let other = null; try { other = await db.query(`update public.user_progress set expression_scores = '[99]'::jsonb where user_id = $1 returning user_id`, [b]); } catch (e) { other = { rows: [], err: e.message }; }
  await db.exec(`reset role; select set_config('test.uid', '', false);`);
  check('as the user: the update goes through RLS and reads back', !err && upd && upd.rows.length === 1 && JSON.stringify(upd.rows[0].expression_scores) === '[41,63]', err || JSON.stringify(upd && upd.rows));
  const rb = await row(b);
  check('another user\'s row isn\'t touched', other.rows.length === 0 && JSON.stringify(rb.expression_scores) === '[]', `${other.rows.length} row(s) updated, b's ${JSON.stringify(rb.expression_scores)}`);
  const ts = fs.readFileSync(path.join(ROOT, 'supabase/functions/_shared/patchableColumns.ts'), 'utf8');
  const allow = [...ts.split('PROGRESS_PATCHABLE_COLUMNS')[1].split('] as const')[0].matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1]);
  check('PROGRESS_PATCHABLE_COLUMNS lists expression_scores', allow.includes('expression_scores'), `${allow.length} columns`);
  await db.close();
  console.log(`\n${fail ? 'MIGRATIONS: FAIL' : 'MIGRATIONS: PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
