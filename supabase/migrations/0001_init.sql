-- VoxCoach backend schema — implements spec §3 (Data Model)
-- Source: voxcoach-backend-migration-spec.md §3.1–§3.5

create extension if not exists "pgcrypto";

-- ============================================================
-- §3.1 users (extends auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  name text,
  created_at timestamptz not null default now(),
  trial_start_date date not null default current_date,
  subscription_plan text check (subscription_plan in ('monthly', 'yearly', 'teacher', 'choir')),
  stripe_customer_id text unique,
  exercise_level text not null default 'beginner'
    check (exercise_level in ('beginner', 'intermediate', 'professional')),
  genre text,
  onboarding_singer_type text,
  onboarding_priority text,
  onboarding_goals text[],
  day1_start_date date,
  day1_goal text,
  day1_snapshot jsonb,
  -- Not enumerated in spec §3.1, but §4 requires GET/PATCH /api/me/preferences
  -- (window.storage.get/set('language')) to persist somewhere — added here as
  -- the simplest home for a single-value per-user preference.
  language text not null default 'en' check (language in ('en', 'fr', 'es', 'tr')),
  -- Not enumerated in spec §3.1, but §6.3's invoice.payment_failed handler
  -- ("flag the account, surface a real notice on next login") needs
  -- somewhere to persist that flag. Cleared on the next successful
  -- checkout.session.completed / customer.subscription.updated event.
  payment_failed_at timestamptz
);

comment on table public.users is 'Spec §3.1 — replaces the client-only part of profile.';

-- ============================================================
-- §3.2 user_progress
-- ============================================================
create table public.user_progress (
  user_id uuid primary key references public.users (id) on delete cascade,
  xp integer not null default 0,
  streak integer not null default 0,
  total_sessions integer not null default 0,
  last_practice_date date,
  last_exercise_date date,
  lowest_midi integer,
  highest_midi integer,
  breakthrough_count integer not null default 0,
  curriculum_days_completed jsonb not null default '{}'::jsonb,
  pitch_scores jsonb not null default '[]'::jsonb,
  agility_scores jsonb not null default '[]'::jsonb,
  breath_scores jsonb not null default '[]'::jsonb,
  note_attempt_history jsonb not null default '{}'::jsonb,
  daily_metrics jsonb not null default '{}'::jsonb,
  weekly_log jsonb not null default '[]'::jsonb,
  timeline_events jsonb not null default '[]'::jsonb,
  notified_achievements jsonb not null default '[]'::jsonb,
  one_take_history jsonb not null default '{}'::jsonb,
  one_take_last_date date,
  song_best_scores jsonb not null default '{}'::jsonb,
  session_snapshot jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  daily_weighting jsonb not null default '{}'::jsonb,
  exercises_today integer not null default 0,
  warmups_completed integer not null default 0,
  boss_victories jsonb not null default '{}'::jsonb,
  last_boss_weakness jsonb,
  glider_best jsonb not null default '{}'::jsonb,
  bridge_best integer,
  harmony_best integer,
  rift_best integer,
  best_breath_duration numeric,
  best_bridge_seconds numeric,
  tried_karaoke boolean not null default false,
  tried_emotion boolean not null default false,
  used_choir_solo boolean not null default false,
  used_key_recommendation boolean not null default false
);

comment on table public.user_progress is 'Spec §3.2 — replaces progress. One row per user.';

-- ============================================================
-- §3.3 teacher_students
-- ============================================================
create table public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index teacher_students_teacher_id_idx on public.teacher_students (teacher_id);

-- ============================================================
-- §3.4 teacher_assignments + teacher_assignment_completions
-- ============================================================
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users (id) on delete cascade,
  exercise_type text not null,
  note text,
  created_at timestamptz not null default now()
);

create index teacher_assignments_teacher_id_idx on public.teacher_assignments (teacher_id);

create table public.teacher_assignment_completions (
  assignment_id uuid not null references public.teacher_assignments (id) on delete cascade,
  student_id uuid not null references public.teacher_students (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

-- ============================================================
-- §3.5 voice_clips (metadata only — audio bytes live in Storage)
-- ============================================================
create table public.voice_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  context text not null check (context in ('day1', 'today', 'studio_take')),
  storage_path text not null,
  mime_type text,
  recorded_at timestamptz not null default now()
);

create index voice_clips_user_id_idx on public.voice_clips (user_id);

-- ============================================================
-- Auto-provision users/user_progress rows on signup (§5, §7 step 1)
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, trial_start_date)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name', current_date);

  insert into public.user_progress (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row-Level Security (§5.3): a user may only read/write rows
-- where the owning column equals their authenticated ID.
-- ============================================================
alter table public.users enable row level security;
alter table public.user_progress enable row level security;
alter table public.teacher_students enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.teacher_assignment_completions enable row level security;
alter table public.voice_clips enable row level security;

create policy "users select own row" on public.users
  for select using (id = auth.uid());
create policy "users update own row" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "progress select own row" on public.user_progress
  for select using (user_id = auth.uid());
create policy "progress update own row" on public.user_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "teacher manages own students" on public.teacher_students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "teacher manages own assignments" on public.teacher_assignments
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "teacher manages completions on own assignments" on public.teacher_assignment_completions
  for all using (
    exists (
      select 1 from public.teacher_assignments a
      where a.id = assignment_id and a.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.teacher_assignments a
      where a.id = assignment_id and a.teacher_id = auth.uid()
    )
  );

create policy "user manages own voice clips" on public.voice_clips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Storage bucket for §3.5 audio clips
-- ============================================================
insert into storage.buckets (id, name, public)
values ('voice-clips', 'voice-clips', false)
on conflict (id) do nothing;

create policy "user reads own voice clip objects" on storage.objects
  for select using (bucket_id = 'voice-clips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user writes own voice clip objects" on storage.objects
  for insert with check (bucket_id = 'voice-clips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user deletes own voice clip objects" on storage.objects
  for delete using (bucket_id = 'voice-clips' and (storage.foldername(name))[1] = auth.uid()::text);
