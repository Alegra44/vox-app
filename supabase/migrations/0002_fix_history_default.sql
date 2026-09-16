-- Every real usage of user_progress.history in the client treats it as a
-- date-keyed object (progress.history[today] = count — see recordActivity()
-- and the dashboard activity chart), but 0001 declared its default as
-- '[]'::jsonb (an empty array). JSON.stringify drops non-index properties
-- set on an array, so writes to history would silently vanish on save.
-- Fix the default for future rows and normalize any row already created
-- under the wrong default.

alter table public.user_progress
  alter column history set default '{}'::jsonb;

update public.user_progress
  set history = '{}'::jsonb
  where history = '[]'::jsonb;
