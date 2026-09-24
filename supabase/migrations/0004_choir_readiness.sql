-- Choir World phase 7: the Readiness Engine's per-part record, stored with the
-- rest of a user's progress so it follows them across devices. One jsonb
-- object, merge-patched as a whole by PATCH /api/me/progress like the other
-- progress blobs:
--   parts: { <song>: { <part>: { levels, hm, bosses, wins, losses, status, updated } } }
--   log:   readiness status changes, oldest first  [{ts, song, part, status}]
--   runs:  scored-run summaries, newest last       [{ts, kind, song, part, slot, score, passed, pitch, timing}]
--   ycTakes: Your Choir takes recorded (a running count)

alter table public.user_progress
  add column choir_readiness jsonb not null default '{}'::jsonb;
