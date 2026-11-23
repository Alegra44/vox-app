# Release F on production: checks (2026-11-23)

Site: https://deploy-alegra1122.vercel.app/ = **dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h** (its page byte-identical to master
dc3abb2's deploy/index.html). Backend: production (ccharikhpeqtzpobarxi), 0011 applied, the api function deployed from
warmup/f. Rollback target before F: dpl_12MtZ8zxUpCcdzRBUjBDsQw7osHB (E). Every check under the run lock, on AC power,
under its time limit; `scripts/warmup-verify/prodF.sh`. SCORES_BASE / home's base = 2bd0d18 (master before F's merge,
E's build, served locally).

## Deploy steps a/b

- a) `supabase migration list --linked`: production, 0001–0010 applied, 0011 the only one pending. `db push`: 0011
  applied. `last_warmup_day` date null, `warmup_streak` integer not null default 0, constraint
  `user_progress_warmup_streak_nonneg`: present.
- b) `functions deploy api`. `roundtrip.js` (4/4): a PATCH with both fields round-trips through GET; one without them
  (the old app's) saves and leaves them as they were.

## Results: everything passes

| run | what | result |
|---|---|---|
| `prodF-…T18-49-15/` | bannerbehind, whyline, keeps, summary, streak, streakline, allowlist, home, roundtrip | all pass but whyline (10/11) |
| `prodF-…T19-11-48/` | whyline again | 11/11 |
| `prod-…T19-12-40/` (prodF core) | prod.sh core, 26 suites | all pass but batch1 (111/1), batch3c (33/7), warmup-entries (51/1), warmup-tracking (timeout), live (2) |
| `prod-…T23-50-45/` (rerun) | those five | batch1 112/0, batch3c 40/0, warmup-entries 52/0, live all within the gate; warmup-tracking: the same timeout |
| `tracking-diagnosis/` | warmup-tracking with the gate's state printed; then with `rearm` fixed | the cause (below); 28/28 |
| `prod-…T00-48-39/` | warmup-tracking through prodF.sh | 28/0 |

Test accounts: 39 cleanups, all "0 left"; `auth.users` has no `voxcoach-…@example.com` address afterwards.

## The failures, one by one

- **whyline**, Glider "a new best over a prior one": +42 XP but an empty line; the next case then read "1 first best
  **and 1 session**". The level-up landed after the check's 1.5 s wait and was counted in the next case. Passed on
  the rerun, both lines as expected.
- **batch1**, Rhythm with the Vocal Load sidecar on/off: one note's timing 34 vs 36 (timing 4 % vs 5 %). Passed on the rerun.
- **batch3c**, the 100 % section: singing started at 100.32 % with 99.80 % seeded. The seed is computed from the
  stored sessions; the 80 % section's last session hadn't reached the database yet, so it came on top. The Home card
  then read 101 %, consistently. Passed on the rerun (40/40).
- **warmup-entries**, "the next day: shown again": the overlay didn't show within 5 s. Passed on the rerun (52/52).
- **live**, Resonance on the sharp stimulus at 4.1 s: steadiness 53 → 45, ripple 72 → 18 (all three runs each side;
  5.1 and 7.1 s equal). F doesn't touch Resonance. Every value within the gate on the rerun.
- **warmup-tracking** (repeated): part C timed out waiting for the song warm-up's overlay. The gate's state at the
  timeout (`tracking-diagnosis/1-…`): the server `last_warmup_day` null, the page's progress null, but the page had
  marked today passed again. The check's `rearm` moves the day **back** (today → null) to warm up again; part B's
  last save (today's day, from the exercise that counted) was still in flight, and its answer, landing after rearm's,
  put today back into progress, so the gate passed. The local stack answers fast enough that this never showed there.
  Fix, in the check only: `rearm` waits out saves in flight before and after (common.js). With it, 28/28 (twice). A
  user's day only moves forward, so the app isn't affected by this order. Not a rollback.

  Observed, not changed: saveProgress merges each PATCH's answer into progress, so two overlapping saves whose answers
  arrive out of order leave the older values in memory until the next save. That is how every progress field already
  works (not new with F).

## Script changes (on this branch)

- `scripts/warmup-verify/prodF.sh`: the run (core, rerun with RERUN="…", and F's checks against the site).
- `scripts/warmup-verify/common.js`: `WU_URL` (the site, for scripts whose argv[2] is an output path); `rearm` waits
  out saves in flight.
- `scripts/warmup-verify/tracking.js`: part C prints the gate's state if its overlay doesn't open.
