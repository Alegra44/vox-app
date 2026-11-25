# Survey J: a tab left open overwriting another device's progress (silent)

Branch `survey/stale`, cut from master 6913a1e and moved onto master fee7bcf after H2 was merged (release H2 live,
dpl_A5EJRUAnPUdykqW7nckBa8957xx3; the slow, shuffled proxy came with it). No app changes on this branch; the trial fix
is on a local scratch branch only (`scratch/stale`, never pushed; its diff is design/reliability/survey-j-scratch.patch). Background: RELEASE_H.md (H2, on save/h2) "Still not fixed:
saveProgress sends the page's whole row, so two devices saving close together still overwrite each other's other fields."

## The user's step (verbatim, 2026-11-24)

THEN SURVEY J, silent: a tab left open overwriting another device's progress. Branch survey/stale from master. Save this step as design/reliability/SURVEY_J.md and commit it first. No app changes.
- saveProgress sends the whole row. Reproduce it through the slow proxy on the local stack: a laptop tab loaded in the morning and left open; the phone then earns XP, scores and a session; then one save from the laptop tab. What does the server keep, field by field?
- Size it: which fields are counters or lists (XP, sessions, warm-ups, history, score lists) and which are plain values.
- Propose the fix with its effort, tried on a scratch branch: for example, counters sent as increments and merged on the server, score lists appended, plain values last-writer-wins; or a version number on the row, with a conflict answer that makes the page reload and merge. Say what each needs (a migration, the api function, the app) and what it does to release A's retry and to H2.
- Push survey/stale. REPORT, then stop.

## 1. Reproduced: what the server keeps

scripts/survey-j/stale.js, on the local stack through the slow, shuffled proxy (scripts/localBackend.js; every answer
200–1500 ms late, some swapped), master's page (H2). Per case, a throwaway account:

1. **Laptop, morning:** signs up, a pitch score (60), one exercise (a session). Then the tab is left open.
2. **Phone:** a second browser, same account. Through the app's own functions it adds:
   - pitch 85 and agility 72, a note attempt;
   - an exercise (a session, +5 XP) and a range capture (a second session);
   - a daily metric, the weekly log, a timeline event, a song best, a One Take, `tried_karaoke`;
   - the day's warm-up (+5 XP).

   That's XP 10 → 65 and sessions 1 → 3; level 2 is reached and announced there.
3. **Laptop:** one save from the morning tab, never reloaded.

| case | the laptop's save | PATCHes | XP on the server | sessions | the phone's changed columns lost |
|---|---|---|---|---|---|
| a | a breath score (55), saveProgress | 1 | 15 (phone 65) | 1 (phone 3) | **22 of 22** |
| c | saveProgress, nothing new (a setting, a level-up snapshot) | 1 | 10 | 1 | **22 of 22** |
| d | the warm-up counted, the phone didn't warm up | 1 | 15 (phone 60) | 1 | **15 of 15** |
| e | the warm-up counted (H2's merge first), then a breath score | 3 | 70 | 1 | **19 of 22** |
| b | the warm-up counted, the phone already warmed up | 0 | 65 | 3 | 0, for now |

Field by field (case a; c and d are the same), each of these went back to the laptop's morning copy:
- XP and sessions;
- `history` and `exercises_today`;
- the warm-up count, its day and streak;
- `pitch_scores` [60, 85] → [60] and `agility_scores` [72] → [];
- `note_attempt_history`, `daily_metrics`, `weekly_log`, `timeline_events` (the phone's record event);
- `song_best_scores`, `one_take_history` and `one_take_last_date`;
- `lowest_midi` and `highest_midi` (the phone's range);
- `tried_karaoke`, `choir_readiness`, `daily_weighting` and `levelup_snapshot`.

The server kept only what the laptop changed itself: its breath score.

- **Both ways:** in case a, the phone's page (still open, never reloaded) then saved once. Its copy went back: XP 65,
  sessions 3, and the laptop's breath score gone ([]). Each device's next save wipes the other's.
- **b only puts the loss off.** H2's merge (wuMergeServer) sees the phone's warm-up and doesn't count again, so
  nothing is sent. But it brings in only the warm-up fields and XP, so the tab's next save is case e.
- **e:**
  - XP survives, because H2's merge took the higher XP before the save.
  - Sessions, scores, history, range and the rest are lost.
  - The laptop announced level 2 a second time: a second "Reached Level 2" moment and timeline event. It also
    replaced the phone's level-up snapshot and dropped its record event.
- **Release A's retry has the same hole** (scripts/survey-j/lostanswer.js, `out/lostanswer-master.log`). Sequence:
  a save is written but its answer is lost; another device adds 100 XP; the retry resends the page's row. The
  server ends at 14 instead of 114, so the other device's 100 XP is gone. Without the other device, the retry is
  right (+7 once).

Why: saveProgress PATCHes `objCamelToSnake(progress)`, every column the page holds. The api's PATCH is a plain
`update(...)` of the allowed columns, so the last writer wins on every column. The page reads the row only at
sign-in or load and in wuServerSync (warm-up fields only, H2). There is no read on focus or visibility.

## 2. Size: the 44 columns the page writes (PROGRESS_PATCHABLE_COLUMNS)

How each column is written (deploy/index.html), and what a merge has to do with it:

| kind | columns | a correct merge |
|---|---|---|
| counters (8) | `xp`, `total_sessions`, `breakthrough_count`, `warmups_completed`, `boss_victories`; `exercises_today` (per day, with `last_exercise_date`); maps of counts: `history` {day: sessions}, `note_attempt_history` {note: attempts, sum, best, streak} | add what each side added |
| lists (8) | `pitch_scores`, `agility_scores`, `breath_scores`, `expression_scores` (last 20), `weekly_log` (last 80), `timeline_events`, `notified_achievements` (a set), `daily_metrics` {day: {kind: [values]}} | keep both sides' new items, then cap |
| bests (9) | `highest_midi`, `glider_best`, `bridge_best`, `harmony_best`, `rift_best`, `best_breath_duration`, `best_bridge_seconds` (max); `lowest_midi` (min); `song_best_scores` {song: best} | the best |
| days and their streaks (6) | `last_practice_date` + `streak`, `last_warmup_day` + `warmup_streak`, `last_exercise_date`, `one_take_last_date` | the later day, with its own streak |
| flags (4) | `tried_karaoke`, `tried_emotion`, `used_choir_solo`, `used_key_recommendation` | either side's true |
| keyed records (4) | `one_take_history` {day}, `curriculum_days_completed` {day: done, a toggle}, `daily_weighting` {day}, `choir_readiness` (parts by song and part, each with its `updated`; `runs` and `log` lists; `ycTakes` a count) | per key, the side that changed it (the later `updated` for a part; lists and counts as above) |
| plain values (5) | `levelup_snapshot`, `session_snapshot`, `last_boss_weakness`, `day_basis`, `day_basis_since` | last writer wins |

39 of 44 columns need a merge. Last writer wins is right only for the 5 plain values.

## 3. The fix

### Option 1: increments and appends, merged on the server (not tried)

- **Migration:** a SQL function applying a patch per column kind to all 44 columns. That includes the nested ones:
  `history` sums per day, `daily_metrics` lists per day and kind, `note_attempt_history`, and `choir_readiness`
  parts by `updated`. My estimate: 250–300 lines of plpgsql over jsonb, hard to test.
- **api:** PATCH calls the function (rpc) instead of `update`. It must still take the old whole-row body from pages
  open since before the deploy.
- **App:** each save has to send what changed (+5 XP, one new score), not the values. Either every write site
  changes (dozens of them), or saveProgress diffs against the last row it saw. The diff needs the same "last row
  seen" tracking as option 2.
- **Release A's retry:** an increment isn't idempotent. A retry after a lost answer adds twice (the lost-answer case
  would give +14, not +7) unless the server also keeps save ids, the same bookkeeping as option 2.
- **H2:** several saves can still be out at once, so H's numbering stays. wuMergeServer stays too, and every read
  needs its own merge rules on the page.
- **Effort:** about 3–5 days with checks, most of the risk in SQL.

### Option 2: a version on the row; a conflict answer the page merges (tried on `scratch/stale`)

Diff: design/reliability/survey-j-scratch.patch. index.html +144/−15, the api's progress.ts +13/−6, migration 0012
(23 lines).

**Migration 0012:**
- `version bigint` on user_progress, bumped by a trigger on every update, whatever wrote it.
- `last_save_id uuid`, and `recent_save_ids uuid[]` holding the last 8, kept by the same trigger.

**api, PATCH /me/progress:**
- Takes `if_version` and `save_id`.
- With `if_version`, it updates only `where version = if_version`. If the row has moved on, it answers 409 with the
  row as it is.
- Without `if_version` it behaves as today, for pages open since before the deploy.

**App:**
- The page keeps the last row it saw (`progressBase`) and its version.
- One save in flight at a time. A save asked for while one is out goes after the answer, with everything since.
- On a 409, `progressMerge3(base, mine, theirs)` merges field by field, using section 2's rules for each kind of
  column, then the page sends again.
- If the row holds this page's own save id (a retry after a lost answer, or a read answered after the page's save
  landed), the merge starts from what that save sent, so it isn't counted twice.
- wuServerSync's read goes through the same merge, replacing H2's wuMergeServer.
- A level the other device reached isn't announced again.
- Erase my progress is sent without a version: it replaces, it doesn't merge.

Results on the scratch build, local stack, through the proxy (`scripts/survey-j/out/scratch/`, two runs of stale.js,
the same both times):

| case | PATCHes | XP | sessions | the phone's changes lost |
|---|---|---|---|---|
| a | 2 (409, merged, sent again) | 70 = 65 + the laptop's first breath score (+5) | 3 | 0 |
| c | 2 | 65 | 3 | 0 |
| d | 1 | 65 = 60 + the laptop's warm-up | 3 | 0 |
| e | 1 | 70 | 3 | 0, one "Reached Level 2" only |
| b | 0 | 65 | 3 | 0 |

- **Merged values (case a):** pitch [60, 85], agility [72], breath [55], history {today: 3}, one warm-up today,
  exercises 2. The timeline has the level-up once plus the phone's record event.
- **Both ways:** the phone's next save kept the laptop's breath score.
- **lostanswer.js (scratch):** a save written with its answer lost gives +7 once. With another device adding 100
  in between, the total is +107. The sequence: written, answer lost, 409, merged, 200.
- **Other checks on the scratch build, through the proxy:**
  - pass: progresssave 5/5, erasecheck 6/6, streak 15/15, roundtrip 4/4, levelup 47/47, outbox 40/40;
  - warmup-tracking: 30/30 on two reruns; the first run timed out at sign-up (20 s), the same sign-up flake as on
    production.
  - outoforder: times out on its first step, by design. It holds save #1's answer and waits for save #2 to go out.
    Here #2 waits for #1's answer, so the out-of-order case it tests can't happen.

**What it does to release A's retry:**
- The back-off stays the same (2, 5, 15, 60 s, then every 5 min).
- A retry sends the page's progress at the version it last saw. If the first try had landed, the retry is refused
  (409), the page finds its own save id in the row, and it sends only what came after. No double count, and no
  other device overwritten. Master today loses the other device's change here (§1).
- A 409 isn't retried with the back-off. It's merged and sent again at once, up to 5 times in a row. After 5 the
  scratch build gives up until the next save; that needs fixing before shipping (fall back to the back-off).

**What it does to H2:**
- With one save in flight, answers can't come back out of order. H's save numbering (`progressSeq`) and H2's
  wuMergeServer are replaced by the version and the merge.
- outoforder.js tests H's rules and would be rewritten for the new ones. For example: hold #1's answer, make a
  change, check that #2 goes only after #1's answer and that nothing is lost.
- warmup-tracking, streak and the warm-up count pass unchanged.

**Effects to know before shipping:**
- **Saves made while one is out wait for its answer**, then go as one. Through the proxy that's up to about
  1.5 s; on a bad network, longer. Each save carries everything since, so nothing is lost by waiting.
- **Rollout:**
  - 0012 and the api go first, the app after. The api takes both kinds of save, so the order is safe both ways.
  - A page open from before the deploy still writes last-writer-wins. The versioned pages' next save then gets a
    409 and merges on top of it.
  - A rollback of the app leaves the columns and the trigger; they're harmless to H2.
- **The merge rules are a judgement per column (section 2).** A wrong rule shows as a wrongly merged value, not a
  lost one.
- Things that live only in a page's memory or localStorage aren't covered. Neither is the vocal-load table
  (already per session, release C).

**Effort to ship:**
- The scratch build has the core. Still to do:
  - rewrite outoforder.js for the new rules;
  - add stale.js and lostanswer.js to the pass list;
  - run the 5× race set on master and the branch;
  - production migration 0012, then the api, then the app.
- About 1–2 days with checks.

### A cheaper part-fix (not tried)

Re-read the row when a tab becomes visible again, and merge it. It needs the same merge rules but no migration or
api change. It fixes the morning-tab case only when the tab is brought to the front before it saves. A background
save (a retry, the vocal-load or level-up saves), or two devices open at once, still loses data. Not enough alone.

**Recommendation: option 2.** It's the smaller change of the two complete fixes, it keeps release A's retry correct,
and it replaces H's numbering and H2's warm-up merge with one rule.

Local stack: after the survey, 0012 was dropped from the local database and the stack was started again from the main
checkout (master), as before the survey.
