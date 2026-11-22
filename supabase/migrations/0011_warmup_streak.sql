-- Release F5 (design/warmup/RELEASE_F.md): the warm-up's own day and streak, on the server. Applied to production with
-- release F's deploy, not before; checked first on the local stack.
-- last_warmup_day: the app's day (the device's local date, release C) on which the warm-up last counted: the day's
-- first finished exercise, whichever entry (the pre-session warm-up or Coach → Warm-up). It is what says "warmed up
-- today" on every device (the browser's localStorage mark stays as a cache), and what holds the warm-up's +5 XP to once
-- a day. warmup_streak: days in a row that counted, as of last_warmup_day (the client shows 0 once a day is missed).
-- Separate from the practice streak (streak, last_practice_date) and from XP. Written by the client through
-- PATCH /me/progress (PROGRESS_PATCHABLE_COLUMNS), in the user's own row, like xp and streak: no new RLS.
alter table public.user_progress add column last_warmup_day date;
alter table public.user_progress add column warmup_streak integer not null default 0
  constraint user_progress_warmup_streak_nonneg check (warmup_streak >= 0);

comment on column public.user_progress.last_warmup_day is
  'the app''s (local) day the warm-up last counted: the day''s first finished exercise (release F5; client-written)';
comment on column public.user_progress.warmup_streak is
  'days in a row the warm-up counted, as of last_warmup_day (release F5; client-written; separate from streak)';
