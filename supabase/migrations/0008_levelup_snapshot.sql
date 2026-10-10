-- (d) Level-up explanation: the counters at the last level-up, so the next one can say what changed since.
-- Null until the first level-up after (d) ships; that one counts from the start of the account (a null snapshot = 0).
-- Written by the client through PATCH /me/progress (PROGRESS_PATCHABLE_COLUMNS); it only feeds a sentence the user
-- sees, in the user's own row, like xp: no new RLS.
alter table public.user_progress add column levelup_snapshot jsonb;

comment on column public.user_progress.levelup_snapshot is
  '{level, at, sessions, records, streak, breakthroughs, warmups, boss_wins, curriculum_days} at the last level-up (client-written)';
