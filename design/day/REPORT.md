# Release C: report (2026-11-17, overnight)

**Status: built and checked on the local Supabase stack, not deployed. Waiting for the user's review and a typed "deploy".**

## What changed
See DAY.md. In short:
- **The day:** `localDayOf(ms)` is the only day function, so the day is the device's local date.
- **Vocal load:** sessions carry `tzOffsetMin`.
- **Migration 0010:** `tz_offset_min`, the day CHECK at that offset (the UTC rule when it's null), the guard, pruning at
  day − 2, `vocal_load_state(p_day, p_since)`, `user_progress.day_basis` / `day_basis_since`.
- **The api route:** accepts `tzOffsetMin` and `since`.
- **The allow-list:** gains `day_basis` and `day_basis_since`.
- **The switch:** `ensureDayBasis()` runs once per account and keeps the streak.
- **The switch-day gauge:** reads both keys, counted from local midnight.
- **The trial:** counts from created_at's local date.

## Checks (all against the local stack; nothing touched production)
| Check | Result |
|---|---|
| migration (0010 on 0009's schema: old rows valid, new rows checked, forged offset refused) | PASS 31/31 |
| migrations (PGlite, all migrations) | PASS |
| day.js (UTC−8, UTC+5:30, UTC+14 × own midnight and UTC midnight, plus the switch) | PASS 111/111 (twice) |
| verify, persist (TZ=UTC), outbox, live | PASS |
| batch2, batch3a, batch3b, batch3c | PASS |
| allowlist (with the new vocal-load body part), progresssave, erasecheck | PASS |
| home, youstates, warmup-entries, warmup-tracking, hooks, bootcheck | PASS |
| batch1 | 111/112: Karaoke's held-tone timing 34 vs 40 ms between two takes. This is release B's known onset noise; C doesn't touch timing. |
| house | 1050/1051: "reduced motion: up within 700 ms of the stop" took 733 ms. Timing noise; C doesn't touch the house lights. Not rerun. |
| pilot | 28/31: the page-leave keepalive save didn't reach the local server (the other two failures follow from it). **Not yet settled:** it may come from the test harness's request interception during unload rather than from C. The comparison run on master's build was prepared (worktree `../voxcoach-pilotmaster`) but **not run**: the usage limit came first. Run it before deploying. |

## Harness fixes made along the way
- **`scripts/localBackend.js`:** routes the app's production requests to the local stack. The production host resolves
  to nowhere, and a script's own `route.continue()` can't reach production.
- **`testAccounts.js`:** `--local` mode.
- **bootcheck:** builds the warm-up key from the app's day.
- **warmup-tracking:** its limit is 8 minutes.

## Deploy order (after the user types "deploy")
1. Migration 0010 (`npx supabase db push --linked`).
2. The api Edge Function.
3. The app (the user runs Vercel). The rollback target stays dpl_7n6H9JiTjJzz71wWpw948MUMD4a5.
