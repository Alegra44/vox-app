-- Release C, the UTC day (design/day/DAY.md; SCORING_SURVEY.md R3): the app's day is the device's local date.
-- Applied to production with release C's deploy, not before. Checked first on the local stack
-- (scripts/day-verify/migration.js: old rows still valid, new rows checked, a forged offset refused).
--
-- 1. vocal_load_sessions.tz_offset_min: minutes east of UTC on the device when the session started (the client sends
--    tzOffsetMin). A session keeps the offset it started with, so its day never moves. Real zones run UTC−12:00 to
--    UTC+14:00.
alter table public.vocal_load_sessions add column tz_offset_min smallint
  constraint vls_tz_offset_min check (tz_offset_min between -720 and 840);

comment on column public.vocal_load_sessions.tz_offset_min is
  'minutes east of UTC at the session''s start (release C); null: a session saved under the UTC day (old rows, old clients)';

-- 2. The day CHECK: with an offset, the local date of the start at that offset; without one, the old UTC rule (rows
--    saved before release C, and clients that haven't reloaded since). Every existing row has a null offset, so the
--    constraint is valid on them as it is added (Postgres checks every row here).
alter table public.vocal_load_sessions drop constraint vls_day_is_utc_start_date;
alter table public.vocal_load_sessions add constraint vls_day_is_start_date check (
  case when tz_offset_min is null then day = (started_at at time zone 'UTC')::date
       else day = ((started_at + make_interval(mins => tz_offset_min)) at time zone 'UTC')::date end);

-- 3. The guard: a session's offset can't change either (like its day and start).
create or replace function public.vocal_load_guard() returns trigger language plpgsql as $$
declare t timestamptz := public.vocal_load_now();
begin
  if new.started_at > t + interval '10 minutes' then
    raise exception 'vocal load: session starts in the future' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' and new.started_at < t - interval '36 hours' then
    raise exception 'vocal load: session started too long ago' using errcode = '22023';
  end if;
  -- no more active singing than wall-clock time since the start (10 min allowance for the client's clock)
  if new.active_seconds > extract(epoch from (t - new.started_at)) + 600 then
    raise exception 'vocal load: more active seconds than time since the session started' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    if new.day <> old.day or new.started_at <> old.started_at or new.tz_offset_min is distinct from old.tz_offset_min then
      raise exception 'vocal load: a session''s day, start and offset can''t change' using errcode = '22023';
    end if;
    if old.ended then
      raise exception 'vocal load: session already ended' using errcode = '22023';
    end if;
    if new.active_seconds < old.active_seconds or new.load < old.load then
      raise exception 'vocal load: a checkpoint can''t go backwards' using errcode = '22023';
    end if;
  end if;
  new.updated_at := t;
  return new;
end;
$$;

-- 4. Pruning: one more day of slack. Local days are up to 14 h ahead of or 12 h behind the UTC date, so "the last two
--    days" by `day` keeps every session of the last two local days whatever offset each was saved with.
create or replace function public.vocal_load_prune() returns trigger language plpgsql as $$
begin
  delete from public.vocal_load_sessions s
  where s.user_id = new.user_id
    and s.day < new.day - 2
    and s.session_id not in (
      select q.session_id from public.vocal_load_sessions q
      where q.user_id = new.user_id and q.active_seconds >= 60
      order by q.started_at desc limit 5);
  return null;
end;
$$;

-- 5. The checkpoint takes the offset (stored on the insert; an update never changes it). The old nine-argument function
--    is replaced: the api function's call without p_tz_offset_min (before its own deploy) gets the default, null.
drop function public.vocal_load_checkpoint(uuid, date, timestamptz, double precision, double precision,
  double precision, double precision, double precision, boolean);
create function public.vocal_load_checkpoint(
  p_session_id uuid, p_day date, p_started_at timestamptz, p_active_seconds double precision, p_load double precision,
  p_median_rms double precision, p_p5_midi double precision, p_p95_midi double precision, p_ended boolean,
  p_tz_offset_min smallint default null
) returns public.vocal_load_sessions language plpgsql security invoker set search_path = public as $$
declare r public.vocal_load_sessions;
begin
  insert into public.vocal_load_sessions as s
    (session_id, day, started_at, tz_offset_min, active_seconds, load, median_rms, p5_midi, p95_midi, ended)
  values (p_session_id, p_day, p_started_at, p_tz_offset_min, p_active_seconds, p_load, p_median_rms, p_p5_midi, p_p95_midi, p_ended)
  on conflict (user_id, session_id) do update set
    active_seconds = excluded.active_seconds, load = excluded.load, median_rms = excluded.median_rms,
    p5_midi = excluded.p5_midi, p95_midi = excluded.p95_midi, ended = excluded.ended
  where not s.ended and excluded.active_seconds >= s.active_seconds and excluded.load >= s.load
  returning * into r;
  if r is null then
    select * into r from public.vocal_load_sessions where user_id = auth.uid() and session_id = p_session_id;
  end if;
  return r;
end;
$$;

-- 6. The state: p_since (optional) counts only sessions started at or after it in the day's load. On the first local
--    day the client also reads the UTC-dated key that overlaps it (sessions saved before the switch), from its local
--    midnight on, so yesterday's sessions under that key aren't added to today.
drop function public.vocal_load_state(date);
create function public.vocal_load_state(p_day date, p_since timestamptz default null) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('activeSeconds', b.active_seconds, 'medianRms', b.median_rms,
               'p5Midi', b.p5_midi, 'p95Midi', b.p95_midi) order by b.started_at)
      from (select * from public.vocal_load_sessions
            where user_id = auth.uid() and active_seconds >= 60
            order by started_at desc limit 5) b), '[]'::jsonb),
    'dayLoad', coalesce((select sum(load) from public.vocal_load_sessions
                         where user_id = auth.uid() and day = p_day and (p_since is null or started_at >= p_since)), 0)
  )
$$;

-- 7. The account's day basis (decision 3): 'local' from the first save after the switch, once per account, and the local
--    date of that save (the first local day: the one day the gauge also reads the UTC-dated key). Client-written through
--    PATCH /me/progress, in the user's own row, like the other progress fields: no new RLS.
alter table public.user_progress add column day_basis text constraint up_day_basis check (day_basis = 'local');
alter table public.user_progress add column day_basis_since date;

comment on column public.user_progress.day_basis is 'release C: ''local'' once the account''s days are local dates; null before';
comment on column public.user_progress.day_basis_since is 'release C: the local date of the switch (the first local day)';
