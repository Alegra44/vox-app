-- Vocal Load Dosimetry, phase 2: what the engine (deploy/vocal-load.js) needs between sessions.
-- Verified locally in PGlite by scripts/vocal-load-verify/persist.js (it applies this file unchanged).
--
-- One row per singing session: its summary (for the rolling baseline) and its load (for today's running total),
-- pruned to what the engine needs; plus vocal_load_daily, one total per day kept a year for a future trend view.
-- Why a table and not another jsonb blob on user_progress: checkpoints overwrite one session's own row (an idempotent
-- upsert), so a retry never double-counts and two tabs can't erase each other's sessions, which a whole-blob
-- merge-patch (last writer wins) would; and the bounds below are column CHECKs Postgres enforces on every path,
-- including a client writing straight through PostgREST with its own JWT.
--
-- "Today": `day` is the client's todayStr() when the session started, the same key streaks, exercisesToday and the
-- activity history use. todayStr() is the UTC date, so `day` must equal started_at's UTC date. A session is counted on
-- the day it started, like recordActivity() counts an exercise on the day it started. The server never computes its
-- own "today".

create table public.vocal_load_sessions (
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  session_id uuid not null,                  -- made by the client when the session starts
  day date not null,                         -- todayStr() at the start (the UTC date)
  started_at timestamptz not null,
  updated_at timestamptz not null default now(),
  ended boolean not null default false,      -- false: the last checkpoint of a session that is running or was cut off
  active_seconds double precision not null,  -- active singing seconds so far
  load double precision not null,            -- load-seconds so far
  median_rms double precision,               -- median block RMS (null until there is any active singing)
  p5_midi double precision,                  -- 5th / 95th percentile of the pitch sung (MIDI, fractional)
  p95_midi double precision,
  primary key (user_id, session_id),

  -- Bounds: values the engine cannot produce are rejected, not clamped.
  constraint vls_day_is_utc_start_date check (day = (started_at at time zone 'UTC')::date),
  -- at most 8 hours of active singing in one session
  constraint vls_active_seconds check (active_seconds >= 0 and active_seconds <= 28800),
  -- every second's load_rate is ≥ 1 (both ratios are floored) and ≤ 4 × (1 + 8.26) = 37.05 (loudness capped at 4; the
  -- highest pitch the engine accepts, MIDI 90.84 = 1500 Hz, over the narrowest range it trusts, 12 semitones from its
  -- lowest pitch 31.35 = 50 Hz, so a passaggio 7.2 above it)
  constraint vls_load_bounds check (load >= active_seconds - 0.001 and load <= 37.1 * active_seconds + 0.001),
  -- a float audio buffer's RMS is at most 1 (full-scale square wave); the engine counts nothing under 0.008
  constraint vls_median_rms check (median_rms is null or (median_rms >= 0.008 and median_rms <= 1)),
  -- the engine only takes pitches between 50 and 1500 Hz: MIDI 31.35–90.84
  constraint vls_pitch check (p5_midi is null or (p5_midi >= 31.3 and p95_midi <= 90.9 and p5_midi <= p95_midi)),
  -- a summary exists exactly when there was active singing
  constraint vls_summary_present check (
    (active_seconds = 0) = (median_rms is null) and (median_rms is null) = (p5_midi is null) and (p5_midi is null) = (p95_midi is null))
);

comment on table public.vocal_load_sessions is 'Vocal Load Dosimetry: per-session summary + load. Rolling baseline = last 5 sessions with ≥ 60 active s; daily total = sum(load) for a day.';

-- Server time for the checks below. Tests can pin it with set_config('vocal_load.now', …); API clients can't, since
-- set_config is not an exposed RPC (PostgREST only exposes the public schema's functions).
create function public.vocal_load_now() returns timestamptz language sql stable as $$
  select coalesce(nullif(current_setting('vocal_load.now', true), '')::timestamptz, now())
$$;

-- Checks that need server time or the previous row, on every write path.
create function public.vocal_load_guard() returns trigger language plpgsql as $$
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
    if new.day <> old.day or new.started_at <> old.started_at then
      raise exception 'vocal load: a session''s day and start can''t change' using errcode = '22023';
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

create trigger vocal_load_guard before insert or update on public.vocal_load_sessions
  for each row execute function public.vocal_load_guard();

-- Keep only what the engine needs: the last 5 qualifying sessions, plus every session of the last two days (for the
-- daily total, and for a session started yesterday that is still writing checkpoints). Runs when a session starts.
create function public.vocal_load_prune() returns trigger language plpgsql as $$
begin
  delete from public.vocal_load_sessions s
  where s.user_id = new.user_id
    and s.day < new.day - 1
    and s.session_id not in (
      select q.session_id from public.vocal_load_sessions q
      where q.user_id = new.user_id and q.active_seconds >= 60
      order by q.started_at desc limit 5);
  return null;
end;
$$;

create trigger vocal_load_prune after insert on public.vocal_load_sessions
  for each row execute function public.vocal_load_prune();

alter table public.vocal_load_sessions enable row level security;

create policy "user manages own vocal load sessions" on public.vocal_load_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Daily history for a future trend view: one number per user per day, kept a year, never touched by the session
-- pruning above. It is not written by the client: every time a session row moves forward (a checkpoint), the rise in
-- its load is added to its day here, in the same transaction. So it changes at exactly the session checkpoints, can't
-- drift from them, and a repeated or stale checkpoint (which changes no row) adds nothing. Deleting a session row
-- (pruning) leaves the day's total as it was.
create table public.vocal_load_daily (
  user_id uuid not null references public.users (id) on delete cascade,
  day date not null,                       -- the sessions' day: todayStr() at their start
  total_load double precision not null default 0 check (total_load >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

comment on table public.vocal_load_daily is 'Vocal Load Dosimetry: total load per day, kept 1 year. Written only by the vocal_load_sessions trigger.';

alter table public.vocal_load_daily enable row level security;

-- Read-only for the user: no insert/update/delete policy, so only the trigger below (security definer) writes it.
create policy "user reads own vocal load days" on public.vocal_load_daily
  for select using (user_id = auth.uid());

-- Security definer so it can write a table users can only read. It only ever uses new.user_id, which the
-- vocal_load_sessions policy has already required to be the caller.
create function public.vocal_load_add_to_day() returns trigger language plpgsql security definer set search_path = public as $$
declare delta double precision := new.load - (case when tg_op = 'UPDATE' then old.load else 0 end);
begin
  if delta > 0 then
    insert into public.vocal_load_daily as d (user_id, day, total_load, updated_at)
    values (new.user_id, new.day, delta, public.vocal_load_now())
    on conflict (user_id, day) do update set total_load = d.total_load + excluded.total_load, updated_at = excluded.updated_at;
  end if;
  -- keep a year: the day of this session and the 365 before it
  delete from public.vocal_load_daily where user_id = new.user_id and day < new.day - 365;
  return null;
end;
$$;

create trigger vocal_load_add_to_day after insert or update on public.vocal_load_sessions
  for each row execute function public.vocal_load_add_to_day();

-- Checkpoint: writes this session's totals so far. A stale or repeated checkpoint (fewer active seconds than stored,
-- or the session already ended) changes nothing and returns the stored row, so retries and late writes are harmless.
create function public.vocal_load_checkpoint(
  p_session_id uuid, p_day date, p_started_at timestamptz, p_active_seconds double precision, p_load double precision,
  p_median_rms double precision, p_p5_midi double precision, p_p95_midi double precision, p_ended boolean
) returns public.vocal_load_sessions language plpgsql security invoker set search_path = public as $$
declare r public.vocal_load_sessions;
begin
  insert into public.vocal_load_sessions as s
    (session_id, day, started_at, active_seconds, load, median_rms, p5_midi, p95_midi, ended)
  values (p_session_id, p_day, p_started_at, p_active_seconds, p_load, p_median_rms, p_p5_midi, p_p95_midi, p_ended)
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

-- What a new session needs: the last 5 qualifying sessions (oldest first, the engine's computeBaseline input) and the
-- load already sung on p_day (the client's todayStr()).
create function public.vocal_load_state(p_day date) returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('activeSeconds', b.active_seconds, 'medianRms', b.median_rms,
               'p5Midi', b.p5_midi, 'p95Midi', b.p95_midi) order by b.started_at)
      from (select * from public.vocal_load_sessions
            where user_id = auth.uid() and active_seconds >= 60
            order by started_at desc limit 5) b), '[]'::jsonb),
    'dayLoad', coalesce((select sum(load) from public.vocal_load_sessions where user_id = auth.uid() and day = p_day), 0)
  )
$$;
