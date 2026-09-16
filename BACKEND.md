# VoxCoach Backend

Implements migration plan (spec §7) steps 1–5: the Postgres schema (§3), the
API layer (§4), and the client wiring (`voxcoach-prototype.html`) that calls
it — real Supabase auth, `apiFetch()` sending a Bearer token to the deployed
edge function, and `loadProfile`/`saveProfile`/`loadProgress`/`saveProgress`
reading and writing through it. `window.storage` has been fully removed from
the client. Verified as of 2026-09-16: live end-to-end (browser → API →
Postgres) for profile/progress; see "Confirmed working end-to-end" below for
what's actually been confirmed vs. just wired.

## What's here

```
supabase/
  config.toml                    local dev config; [functions.api] verify_jwt = false
  migrations/
    0001_init.sql                 §3 schema: users, user_progress, teacher_*,
                                  voice_clips, RLS policies (§5.3), storage bucket
    0002_fix_history_default.sql  fixes user_progress.history default
    0003_feedback.sql             feedback table (see below)
  functions/
    _shared/                     cors, Supabase client helpers, patch allow-lists
    api/
      index.ts                   Hono router, mounted at /functions/v1/api/*
      routes/
        me.ts                    GET/PATCH /api/me
        progress.ts               GET/PATCH /api/me/progress (merge-patch)
        preferences.ts            GET/PATCH /api/me/preferences
        teacher.ts                students/assignments/completions
        clips.ts                  POST /api/me/clips (multipart -> Storage)
        billing.ts                §6 checkout-session + webhook
        feedback.ts                POST /api/feedback (public, insert-only)
scripts/
  smoke-test.sh                  curl walkthrough of every non-billing endpoint
  smoke-test-billing.md          manual steps for §6 (needs Stripe test mode)
```

## One deliberate addition beyond the literal spec

§3.1 doesn't list a `language` column, but §4 requires
`GET/PATCH /api/me/preferences` to persist it somewhere — added as a column
on `users`. Likewise §6.3's `invoice.payment_failed` handler needs somewhere
to "flag the account" — added `payment_failed_at timestamptz`, cleared on the
next successful payment event. Both are called out with comments at their
definition in `0001_init.sql`.

Not in the spec at all: `feedback` (0003_feedback.sql) gives the in-app
feedback form real persistence instead of a `window.storage` blob.
`POST /api/feedback` is deliberately outside the auth gate — signed-out
users can submit — and insert-only: the table has no select policy for
anon/authenticated, so there's no matching GET route. It's read via the
dashboard or service role, as an admin inbox.

## One deliberate security tightening beyond the literal spec

§6.3 says `subscription_plan` must only change server-side via the Stripe
webhook, not the client-side check. `PATCH /api/me`'s allow-list
(`_shared/patchableColumns.ts`) enforces that at the API layer too —
`subscription_plan` and `stripe_customer_id` are silently dropped from any
client PATCH body, in addition to RLS. The smoke test exercises this
directly (test 3).

## Setup

1. **Link this repo to your Supabase project** (needs the project ref and DB
   password, from Project Settings):
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```
2. **Push the schema:**
   ```bash
   npx supabase db push
   ```
3. **Set the Edge Function secrets** (Stripe keys — see §6.1 for the 4 Price
   IDs you need to create in Stripe test mode first):
   ```bash
   npx supabase secrets set \
     STRIPE_SECRET_KEY=sk_test_... \
     STRIPE_WEBHOOK_SECRET=whsec_... \
     STRIPE_PRICE_MONTHLY=price_... \
     STRIPE_PRICE_YEARLY=price_... \
     STRIPE_PRICE_TEACHER=price_... \
     STRIPE_PRICE_CHOIR=price_... \
     APP_URL=http://localhost:8080
   ```
   (`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are
   injected automatically — don't set those.)
4. **Deploy the function:**
   ```bash
   npx supabase functions deploy api
   ```

## API testing via curl (not through the client)

```bash
export SUPABASE_URL=https://<your-ref>.supabase.co
export SUPABASE_ANON_KEY=<from Project Settings -> API>
export SUPABASE_SERVICE_ROLE_KEY=<from Project Settings -> API>
./scripts/smoke-test.sh
```

Walks: signup-triggered row creation, `GET/PATCH /me` (and that
`subscription_plan` can't be client-set), `GET/PATCH /me/progress`
(verifying the merge-patch actually merges), `/me/preferences`, the full
teacher flow (create student → create assignment → toggle completion twice →
delete student), and RLS cross-user isolation.

Billing (§6) needs a real Stripe test-mode setup and isn't scripted — see
`scripts/smoke-test-billing.md`.

## Confirmed working end-to-end (2026-09-16)

Verified live, not just read from code, twice independently in this session
(a second Pitch Match attempt on top of an existing test account, `Pitch
Match E2E` / `voxcoach-e2e-1789551000@example.com`, `user_id
579f1d80-269c-40d5-8087-f3175ddce645`): opened the deployed site
(`https://deploy-alegra1122.vercel.app`), used the already-authenticated
session, went to Train → Pitch Match, target note B3. Overrode
`navigator.mediaDevices.getUserMedia` in the live page to return a real
`MediaStreamDestination` fed by a Web Audio `OscillatorNode` at B3's exact
frequency (246.94 Hz) — a real audio signal running through the app's
unmodified `autoCorrelate`/`captureAccuracyForTarget` pitch-detection and
scoring code, not a fabricated result — then clicked "Listen & score" for
real. Scored 100%. Confirmed the write landed in Postgres with a **raw SQL
query run directly against the database** (`npx supabase db query --linked
"select ... from public.user_progress where user_id = '...'"`, which goes
through the Supabase Management API straight to Postgres — no CLI-extracted
service-role key, no Docker/pg_dump, and no code path shared with the app's
own API):

| field | before this attempt | after (DB query result) |
|---|---|---|
| `xp` | 10 | **16** |
| `streak` | 1 | 1 |
| `total_sessions` | 1 | **2** |
| `pitch_scores` | `[100]` | `[100, 100]` |
| `exercises_today` | 1 | **2** |
| `last_practice_date` | 2026-09-16 | 2026-09-16 |

The `xp` delta (+6, not +10) is correct, not a bug: `recordSkillScore()`
only pays the flat +5 "first data point" bonus once per category
(`voxcoach-prototype.html` ~L6850); a repeat 100% with no improvement over
the prior average earns `recordActivity()`'s flat +5 plus a +1 "genuine
attempt" consolation (~L6858) = 6. A UI-only check wouldn't have distinguished
"saved correctly" from "looks right because the client already knew the
number" — the DB query is what actually rules that out.

So: real signup → real auth session → real audio → `apiFetch` PATCH
`/me/progress` → RLS-scoped Postgres write → **independently confirmed by
SQL SELECT**, not by re-reading the same API. Confirmed working for this one
slice (Pitch Match / progress). Not yet re-verified this way: teacher
dashboard, clips/Storage upload, billing, and the other ~40 panels — treat
those as wired-but-unconfirmed until each is checked the same way, not as
"solid because this one was."

Note: this test account was reused across at least two sessions working in
this repo concurrently (same browser profile, already-authenticated when
this check started) — if you're comparing notes with another session's
output, the account and its running totals are shared, not two isolated
runs.

### Achievements and XP (2026-09-16)

Achievements are **not** a separate unlocked/awarded record — `ACHIEVEMENTS`
(`voxcoach-prototype.html` ~L7352) is a client-side array of `{id, name,
check()}`, where `check()` reads live off fields already in the `progress`
object (`pitchScores`, `streak`, `usedKeyRecommendation`, etc.). An
achievement is "unlocked" purely by those underlying fields crossing a
threshold — there's no dedicated achievements table, so verifying it is
verifying the same `user_progress` row XP already writes through.
`checkNewAchievementsForTimeline()` additionally appends to a
`notifiedAchievements` array (for the timeline feed) the first time each
`check()` flips true, and that array round-trips through `saveProgress()`
too.

Confirmed both paths for real, on the same live site/account as the Pitch
Match test above:

- **XP**: every XP-awarding call site (`recordActivity()`,
  `recordSkillScore()`, boss-victory bonus, curriculum-day bonus, etc.)
  mutates `progress.xp` in memory and is always followed by a `saveProgress()`
  call in the same function — same `apiFetch` PATCH `/me/progress` path
  verified for Pitch Match. No separate/parallel XP code path exists.
- **Achievement**: picked "First Key Change" (`usedKeyRecommendation`,
  simplest — a single boolean flag, no audio needed) because it was
  confirmed still locked for this account beforehand. Triggered it for real:
  Train → Key Trainer → Find My Key → filled the (pre-populated) song/voice
  range fields → clicked "Recommend a key". That handler
  (`voxcoach-prototype.html` ~L4531) sets `progress.usedKeyRecommendation =
  true` and calls `saveProgress()`. Confirmed in the UI: Profile →
  Achievements grid — "First Key Change" rendered with the `unlocked` class
  (screenshotted, teal-bordered, alongside the two achievements the Pitch
  Match session had already earned). Independently confirmed in Postgres via
  the same raw-SQL method (`npx supabase db query --linked`, Management API,
  no app code path):

  | field | before | after (DB query result) |
  |---|---|---|
  | `used_key_recommendation` | `false` | **`true`** |
  | `notified_achievements` | (missing `key_change`) | `["first_note", "key_change"]` |
  | `xp` | 16 | 16 (unchanged — this action has no XP reward) |

So: real click → real handler → `apiFetch` PATCH `/me/progress` → Postgres
write → independently confirmed by SQL SELECT. Confirmed for this one
achievement; the other eight in `ACHIEVEMENTS` are wired the same way
(same `check()`/`saveProgress()` pattern) but not each individually
triggered and DB-checked yet.

## What's still genuinely open

- `teacherRoster`/`teacherAssignments`/`day1AudioClip`/`todayAudioClip` are
  still client-only fields (see `loadProfile()` in
  `voxcoach-prototype.html`) — not backed by the `teacher_*` tables or
  `voice_clips` storage yet, despite those tables existing in the schema.
- Billing (§6) needs a real Stripe test-mode setup — not scripted, not
  verified live.
- Streaks and the rest of the 21-Day Journey (baseline/day-by-day
  completion) are wired per the code but not yet triggered-and-DB-verified
  the same way as Pitch Match and "First Key Change".
- The remaining 8 of 9 `ACHIEVEMENTS` entries: wired per the same
  `check()`/`saveProgress()` pattern, not each individually verified live.
- Noticed in passing, unrelated to this check: Profile → Personal Records
  renders "Best Vocal Journey score" and "Boss Battles won" as literal
  `[object Object]` / `[object Object]x` — a display formatting bug, not
  investigated further.
- Every other exercise/panel beyond Pitch Match progress-save and "First Key
  Change": wired per the code, unconfirmed live.
