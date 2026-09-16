# VoxCoach — Backend Migration & Monetization Specification

**Purpose:** This document maps the existing client-only prototype (`voxcoach-prototype.html`) to a real, multi-device backend and a real Stripe integration. Every table, field, and endpoint below is derived directly from the actual code — not invented — by auditing every `window.storage` call, every `profile.*` and `progress.*` field reference, and the real plan structure already built into Pricing. The goal is that an engineer could implement this without re-reading the prototype's JavaScript line by line.

**What this document is not:** a redesign. The prototype's data model is already clean — this spec formalizes it, it doesn't change it. The UI, features, and game logic described elsewhere need zero changes to work against this backend; only the storage layer moves from `window.storage` to real API calls.

---

## 1. Current State (honest baseline)

The prototype persists exactly two top-level objects, plus one preference:

| Client-side call | What it holds |
|---|---|
| `window.storage.get/set('profile')` | Identity, subscription state, onboarding answers, teacher roster/assignments |
| `window.storage.get/set('progress')` | Every score, streak, history, and achievement — the bulk of the app's real data |
| `window.storage.get/set('language')` | UI language preference (`en`/`fr`/`es`/`tr`) |

All three are scoped to **one browser, one device**. There is no server, no authentication beyond a name+email form with no verification, and no way for the same user to see their data on a second device. This is the entire gap between "prototype" and "product."

---

## 2. Target Architecture

```
┌─────────────────┐      HTTPS/JSON       ┌──────────────────┐
│  Client (same    │ ───────────────────▶  │   API Server      │
│  HTML/JS/CSS,     │ ◀───────────────────  │  (REST, below)    │
│  storage layer     │                       └────────┬─────────┘
│  swapped only)     │                                │
└─────────────────┘                                │
                                                    ▼
                                          ┌──────────────────┐
                                          │   Postgres DB      │
                                          │  (schema in §3)    │
                                          └──────────────────┘
                                                    │
                                          ┌────────┴─────────┐
                                          ▼                    ▼
                                  ┌───────────────┐   ┌─────────────────┐
                                  │  Stripe        │   │  Object storage  │
                                  │  (§6)          │   │  (audio clips)    │
                                  └───────────────┘   └─────────────────┘
```

**Recommended stack:** Supabase (Postgres + Auth + Storage + real-time, all managed) over a custom Node/Express + Postgres build. Reasoning: the data model below is already relational and modest in size (no table exceeds what Postgres handles trivially), Supabase's row-level security maps cleanly onto "a user can only read/write their own rows" (the only real authorization rule this app needs), and it gets a real backend live in days, not months. A custom build is the right call later if there's a reason (there usually isn't, this early).

---

## 3. Data Model

### 3.1 `users` (replaces the client-only part of `profile`)

Owned by the auth provider (Supabase Auth / any OAuth+email provider) — this table just extends it.

| Column | Type | Source in prototype |
|---|---|---|
| `id` | uuid, PK | New — real user identity, doesn't exist client-side today |
| `email` | text, unique | `profile.email` |
| `name` | text | `profile.name` |
| `created_at` | timestamptz | `profile.createdAt` |
| `trial_start_date` | date | `profile.trialStartDate` |
| `subscription_plan` | text, nullable | `profile.subscriptionPlan` (`monthly`/`yearly`/`teacher`/`choir`/`null`) |
| `stripe_customer_id` | text, nullable | New — required for §6 |
| `exercise_level` | text | `profile.exerciseLevel` (`beginner`/`intermediate`/`professional`) |
| `genre` | text, nullable | `profile.genre` |
| `onboarding_singer_type` | text, nullable | `profile.onboardingSingerType` |
| `onboarding_priority` | text, nullable | `profile.onboardingPriority` |
| `onboarding_goals` | text[], nullable | `profile.onboardingGoals` |
| `day1_start_date` | date, nullable | `profile.day1StartDate` |
| `day1_goal` | text, nullable | `profile.day1Goal` |
| `day1_snapshot` | jsonb, nullable | `profile.day1Snapshot` (real Skill Profile snapshot: `{pitch, range, breath, agility, expression}`) |

### 3.2 `user_progress` (the bulk of the real data — replaces `progress`)

One row per user. Most fields map 1:1; a handful of counters are simple enough to stay as columns, everything with internal structure becomes `jsonb` (Postgres indexes into `jsonb` natively, so this isn't a performance compromise).

| Column | Type | Source | Notes |
|---|---|---|---|
| `user_id` | uuid, PK/FK | — | |
| `xp` | integer | `progress.xp` | |
| `streak` | integer | `progress.streak` | |
| `total_sessions` | integer | `progress.totalSessions` | |
| `last_practice_date` | date | `progress.lastPracticeDate` | |
| `last_exercise_date` | date | `progress.lastExerciseDate` | |
| `lowest_midi` | integer, nullable | `progress.lowestMidi` | Real Range Finder result |
| `highest_midi` | integer, nullable | `progress.highestMidi` | |
| `breakthrough_count` | integer | `progress.breakthroughCount` | |
| `curriculum_days_completed` | jsonb | `progress.curriculumDaysCompleted` | `{1: true, 2: true, ...}` |
| `pitch_scores` | jsonb | `progress.pitchScores` | Capped array of last 20, per `recordSkillScore` |
| `agility_scores` | jsonb | `progress.agilityScores` | Same shape |
| `breath_scores` | jsonb | `progress.breathScores` | Same shape |
| `note_attempt_history` | jsonb | `progress.noteAttemptHistory` | `{[midi]: {attempts, sumAccuracy, bestAccuracy, streak, preStreakAvg}}` |
| `daily_metrics` | jsonb | `progress.dailyMetrics` | `{[date]: {[type]: [values]}}` — feeds Voice Health charts |
| `weekly_log` | jsonb | `progress.weeklyLog` | `[{type, score, date}]`, capped at 80 — feeds Unified Progress |
| `timeline_events` | jsonb | `progress.timelineEvents` | `[{date, type, label, ts}]` — Breakthrough Timeline |
| `notified_achievements` | jsonb | `progress.notifiedAchievements` | Array of achievement IDs, prevents duplicate timeline logging |
| `one_take_history` | jsonb | `progress.oneTakeHistory` | `{[date]: {pitch, stability, timing, heard}}` |
| `one_take_last_date` | date, nullable | `progress.oneTakeLastDate` | The real daily-gate check |
| `song_best_scores` | jsonb | `progress.songBestScores` | `{[songId]: bestScore}` |
| `session_snapshot` | jsonb | `progress.sessionSnapshot` | |
| `history` | jsonb | `progress.history` | |
| `daily_weighting` | jsonb | `progress.dailyWeighting` | Today's Mission's adaptive weighting |
| `exercises_today` | integer | `progress.exercisesToday` | |
| `warmups_completed` | integer | `progress.warmupsCompleted` | |
| `boss_victories` | jsonb | `progress.bossVictories` | Per-boss-type win tracking |
| `last_boss_weakness` | jsonb, nullable | `progress.lastBossWeakness` | |
| `glider_best` | jsonb | `progress.gliderBest` | Per-mode bests |
| `bridge_best` | integer, nullable | `progress.bridgeBest` | |
| `harmony_best` | integer, nullable | `progress.harmonyBest` | |
| `rift_best` | integer, nullable | `progress.riftBest` | |
| `best_breath_duration` | numeric, nullable | `progress.bestBreathDuration` | |
| `best_bridge_seconds` | numeric, nullable | `progress.bestBridgeSeconds` | |
| `tried_karaoke` | boolean | `progress.triedKaraoke` | |
| `tried_emotion` | boolean | `progress.triedEmotion` | |
| `used_choir_solo` | boolean | `progress.usedChoirSolo` | |
| `used_key_recommendation` | boolean | `progress.usedKeyRecommendation` | |

### 3.3 `teacher_students` (replaces `profile.teacherRoster`)

One row per student, not a jsonb blob — this is the one place a real relational table beats jsonb, since Phase 2 (real student logins, per the app's own honest disclosure) needs students to be first-class rows anyway.

| Column | Type | Source |
|---|---|---|
| `id` | uuid, PK | `s.id` |
| `teacher_id` | uuid, FK → users | — |
| `name` | text | `s.name` |
| `created_at` | timestamptz | New |

### 3.4 `teacher_assignments` + `teacher_assignment_completions`

| Table | Columns | Source |
|---|---|---|
| `teacher_assignments` | `id, teacher_id, exercise_type, note, created_at` | `profile.teacherAssignments[].{id, exerciseType, note}` |
| `teacher_assignment_completions` | `assignment_id, student_id, completed_at` | `a.completions[studentId]` |

### 3.5 `voice_clips` (audio, object storage not the database)

The three real fields that currently hold base64 audio directly — `profile.day1AudioClip`, `profile.todayAudioClip`, and `progress.studioTakes` (an array, up to 3 per the app's own real cap) — all collapse into this one table, distinguished by `context`. This does not scale past a handful of clips as base64-in-jsonb and should not be replicated as-is; real audio blobs belong in object storage (S3-compatible), with the database holding only a reference.

| Column | Type | Source |
|---|---|---|
| `id` | uuid, PK | New |
| `user_id` | uuid, FK | — |
| `context` | text | `'day1'` ← `profile.day1AudioClip` / `'today'` ← `profile.todayAudioClip` / `'studio_take'` ← `progress.studioTakes[]` |
| `storage_path` | text | Real S3/Supabase Storage object key |
| `mime_type` | text | `clip.mimeType` (already captured correctly client-side) |
| `recorded_at` | timestamptz | `clip.recordedAt` |

This is the one place the migration is a genuine improvement, not just a lift-and-shift — base64-in-jsonb was always a prototype shortcut, disclosed as such.

---

## 4. API Contract

Every `window.storage` call in the prototype has exactly one real endpoint equivalent. This table is the literal find-and-replace an engineer would do.

| Prototype call | Real endpoint | Method |
|---|---|---|
| `window.storage.get('profile')` | `GET /api/me` | GET |
| `window.storage.set('profile', data)` | `PATCH /api/me` | PATCH |
| `window.storage.get('progress')` | `GET /api/me/progress` | GET |
| `window.storage.set('progress', data)` | `PATCH /api/me/progress` | PATCH |
| `window.storage.get('language')` | `GET /api/me/preferences` | GET |
| `window.storage.set('language', code)` | `PATCH /api/me/preferences` | PATCH |
| *(new)* Add student | `POST /api/teacher/students` | POST |
| *(new)* Remove student | `DELETE /api/teacher/students/:id` | DELETE |
| *(new)* Create assignment | `POST /api/teacher/assignments` | POST |
| *(new)* Toggle completion | `PATCH /api/teacher/assignments/:id/completions/:studentId` | PATCH |
| *(new)* Upload voice clip | `POST /api/me/clips` (multipart) | POST |
| *(new)* Checkout | `POST /api/billing/checkout-session` | POST — see §6 |
| *(new)* Webhook | `POST /api/billing/webhook` | POST — see §6 |

**One real implementation decision:** `PATCH /api/me/progress` should accept a partial object and merge server-side, mirroring exactly how the client already does `progress.xp = ...; saveProgress();` today — dozens of call sites mutate one or two fields and save the whole object. Requiring the client to send the *entire* progress object on every save would work but wastes bandwidth on `note_attempt_history` and `daily_metrics`, which grow large. A merge-patch endpoint is a straightforward change and meaningfully cheaper.

---

## 5. Authentication

The prototype's "sign up" is a name+email form with no verification — anyone can claim any email. Real auth needs, at minimum:

1. **Email/password or magic link** via Supabase Auth (or equivalent) — replaces `authCreateBtn`'s handler.
2. **Session token** stored in an HTTP-only cookie, sent with every API call — replaces the implicit "profile exists in local storage" check the whole app currently uses as its `if(profile)` gate.
3. **Row-level security**: every table above has a `user_id`/`teacher_id` column; the RLS policy is uniformly "a user may only read/write rows where this column equals their authenticated ID." This is the *only* authorization rule the entire app needs — there's no cross-user data sharing anywhere in the current design except the teacher/student relationship, which is already modeled as an explicit foreign key.

---

## 6. Stripe Integration

### 6.1 Real plan mapping

The four real plans already exist in the UI (`data-plan` attributes on the Pricing buttons) — this is a direct mapping, not a redesign:

| App plan ID | Stripe Product | Stripe Price | Billing |
|---|---|---|---|
| `monthly` | VoxCoach Individual | $9.99 | Recurring, monthly |
| `yearly` | VoxCoach Individual | $79.00 | Recurring, yearly |
| `teacher` | VoxCoach Teacher | $29.00 | Recurring, monthly, up to 20 students |
| `choir` | VoxCoach Choir/Studio | $79.00 | Recurring, monthly, unlimited singers |

### 6.2 What replaces the simulated checkout

Today, clicking a plan button sets `pendingCheckoutPlan` and — after this session's toast fix — shows a real (but simulated) confirmation via `showToast()`. The real flow:

1. Client calls `POST /api/billing/checkout-session` with `{planId}`.
2. Server creates a real Stripe Checkout Session (`stripe.checkout.sessions.create`) with the matching Price ID from §6.1, `customer` set to the user's `stripe_customer_id` (creating one via `stripe.customers.create` on first checkout), and `success_url`/`cancel_url` pointing back into the app.
3. Client redirects to `session.url` — **this replaces the entire client-side checkout modal.** The modal's plan-comparison content (features, pricing) stays exactly as designed; only the "Continue with X" button's action changes from a local state mutation to a real redirect.
4. Stripe redirects back on success. The app should not trust the redirect alone — it should wait for the webhook (next).

### 6.3 Required webhook handling

`POST /api/billing/webhook`, verifying Stripe's signature, handling at minimum:

| Event | Action |
|---|---|
| `checkout.session.completed` | Set `users.subscription_plan` from the session's Price ID, set `users.stripe_customer_id` |
| `customer.subscription.updated` | Handle plan changes (e.g., monthly → yearly) |
| `customer.subscription.deleted` | Set `users.subscription_plan = null` — this is what actually gates Pro features, not a client-side flag |
| `invoice.payment_failed` | Real dunning: flag the account, surface a real (non-blocking, toast-style) notice on next login |

**Important:** `requireProFeature()` throughout the client currently checks `profile.subscriptionPlan` from local storage, which anyone can edit in devtools. Post-migration, this check must happen server-side on any endpoint that gates real value (e.g., feature-specific data writes), not just client-side UI hiding. The client-side check stays — it's good UX (instant feedback) — but it stops being the security boundary.

### 6.4 The 21-day trial

`profile.trialStartDate` already exists and is honestly used throughout (Pricing's own copy: *"21 days free — every new account gets full access... After that, a subscription continues"*). Post-migration: `users.trial_start_date` set at signup, checked server-side (`now() - trial_start_date > 21 days AND subscription_plan IS NULL` → gate). No Stripe object needed for the trial itself — it's a real date comparison, not a billing state.

---

## 7. Migration Plan (phased, so nothing ships broken)

1. **Stand up the schema** (§3) in a real Postgres instance. No client changes yet.
2. **Build the API layer** (§4) against that schema. Test against Postman/curl, not the client.
3. **Add a one-time import script**: on first login post-migration, if a `window.storage` profile/progress blob exists client-side and no server record exists yet, POST it once to seed the server — so existing prototype users (if any exist by then) don't lose data.
4. **Swap the storage layer**: every `window.storage.get/set` call becomes a `fetch()` to the matching endpoint from §4. Because the prototype already funnels all persistence through `saveProfile()`/`saveProgress()`/`recordActivity()` rather than scattering raw storage calls everywhere, this is a small-surface-area change — a handful of functions, not hundreds of call sites.
5. **Wire real auth** (§5), gating the whole app behind it instead of the current "does a local profile object exist" check.
6. **Wire Stripe** (§6) last, once accounts are real — a subscription tied to a fake account is a liability, not a feature.

---

## 8. What does *not* need to change

Worth stating plainly: every game (Boss Battle, Vocal Journey, Harmony Arena, Vocal Rift, Register Runner), every real-time capture engine, every scoring formula, the entire UI, and all client-side audio processing (`autoCorrelate`, `getSpectralChestScore`, `computeRMS`) work identically against this backend. This migration touches the storage layer and nothing else — which is exactly why the prototype was worth building this thoroughly before a backend existed at all.
