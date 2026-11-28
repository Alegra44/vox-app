# Release J: a version on the progress row (Survey J, option 2)

## The step, verbatim

H2: good. Merge the batch3c test fix (2d626e6) into master now: it's test-only, so no deploy.

Survey J: approved, the version on the row. Build it as release J on a new branch save/j from master (the scratch patch is your starting point). Save this message as design/reliability/RELEASE_J.md and commit it first. AC power, the run lock and time limits on; every local check through the slow proxy. Rollback target: dpl_A5EJRUAnPUdykqW7nckBa8957xx3.

J1. Migration 0012 (version, the last 8 save ids, the trigger) and the api: a PATCH carrying a version that doesn't match gets a 409 with the current row. A PATCH without a version (an older app, a page already open, a rollback) is accepted as today, so rolling the app back stays safe.
J2. The app: one progress save in flight at a time (later saves wait and go as one). On a 409, a three-way merge from the version this page loaded (the base), what this page has now, and the server's row, using the survey's class for each of the 44 columns: counters as server + (mine − base); lists combined without duplicates; bests the best; a day and its streak, the later day with its streak; flags on if either is; per-day records merged by day; the 5 plain values, mine. Then save again with the server's version. Write the table (column → class → rule) in RELEASE_J.md.
J3. No giving up: after 5 conflicts in a row, fall back to release A's retry with back-off; never drop the save.
J4. H2's save numbering and warm-up merge: replace them where J covers them, and say exactly what's removed and why in RELEASE_J.md.
J5. Level-ups: a merge must not announce the same level twice; announce only if the merged XP crosses a level this page hasn't announced.

CHECKS (local stack, through the proxy, 5 runs each on master and the branch)
- Survey J's five repro cases: nothing lost (master loses).
- The retry case: +7 once; +107 with the other device's 100 in between.
- Erase on the phone, then a stale laptop save: the server keeps the erase plus only the laptop's gains since it loaded.
- An old-app save (no version) still works.
- Two tabs on the same device saving in turn; a level crossed during a merge announced once.
- outoforder.js rewritten for J (the old out-of-order case can't happen now; test what replaces it).
- progresssave, erasecheck, streak, roundtrip, levelup, outbox, warmup-tracking, youstates, house, hooks, bootcheck.
Secret check, push save/j. REPORT, then stop: J changes how every save works, so it waits for my review of the code and your typed "deploy" (order: 0012, then the api, then the app).

## What was built (save/j)

Starting point: Survey J's scratch build (design/reliability/survey-j-scratch.patch, on survey/stale), then the
changes J2–J5 ask for. Code: `deploy/index.html` (the "Release J" block before `saveProgress`, `wuServerSync`, the
retry, load, sign-out and erase), `supabase/functions/api/routes/progress.ts`, `supabase/migrations/0012_progress_version.sql`.

### J1: migration 0012 and the api

- **0012:** `user_progress.version bigint not null default 0`, `last_save_id uuid`, `recent_save_ids uuid[]`. A
  `before update` trigger bumps `version` on every update, whatever wrote it (the api, an older app, SQL), and, when
  `last_save_id` changes, appends it to `recent_save_ids`, keeping the last 8. No client writes `version`: it isn't in
  PROGRESS_PATCHABLE_COLUMNS.
- **api, PATCH /me/progress:** two new body fields, outside the allow-list.
  - `save_id` (a uuid): written as `last_save_id`.
  - `if_version` (a number): the update is made `where version = if_version`. If no row matches, the answer is
    **409 `{error: "version conflict", row}`**, with the row as it is now.
  - Without `if_version` (an older app, a page open since before the deploy, a rollback of the app), the update is
    made as before J: last writer wins. The trigger still bumps the version, so a J page open at the same time gets
    a 409 at its next save and merges on top of it (oldapp.js).
- GET is unchanged and now also returns the three columns. An older app copies them into its progress object and
  sends them back; the allow-list drops them.

### J2: one save in flight; the three-way merge

- `saveProgress()` sends one PATCH at a time. A save asked for while one is out sets `progressAgain`, and goes once
  that one is answered, with everything since: several saves asked for meanwhile go as one.
- The page keeps the row it last saw, `progressBase`, and its `progressVersion`, from the load, every 200 and every
  merge. Each PATCH carries `if_version` and a fresh `save_id`.
- **On a 409:** `progressMergeIn(row)` runs `progressMerge3(base, mine, theirs)` over the 44 columns, then the page
  sends again at the row's version.
  - base: the row this page last saw;
  - mine: the page's progress now;
  - theirs: the server's row.
- **Own saves are never counted twice.** The page keeps each send whose answer it hasn't had (`progressUnacked`,
  the last 8). If the server's row lists one of those ids in `recent_save_ids`, that send landed (release A's retry
  after a lost answer, or a read answered after the save landed). The merge then starts from what that send carried,
  not from `progressBase`.
- **The rule for every column:** the side that changed it since the base wins. Only when both sides changed it does
  the class rule below apply. A value this page never touched is always the server's, so a merge never undoes the
  other side's change.

| column (camelCase in the page) | class | rule when both sides changed it |
|---|---|---|
| xp | counter | server + (mine − base) |
| totalSessions | counter | server + (mine − base) |
| breakthroughCount | counter | server + (mine − base) |
| warmupsCompleted | counter | server + (mine − base) |
| bossVictories | counter | server + (mine − base) |
| pitchScores | list (last 20) | the server's, then this page's new items; capped at 20 |
| agilityScores | list (last 20) | the same |
| breathScores | list (last 20) | the same |
| expressionScores | list (last 20) | the same |
| weeklyLog | list (last 80) | the same; an entry already among the server's new ones isn't added twice |
| timelineEvents | list | the same, uncapped; an event (it has its `ts`) isn't added twice |
| notifiedAchievements | list (a set) | the union |
| highestMidi | best | the higher |
| gliderBest | best | the higher |
| bridgeBest | best | the higher |
| harmonyBest | best | the higher |
| riftBest | best | the higher |
| bestBreathDuration | best | the higher |
| bestBridgeSeconds | best | the higher |
| lowestMidi | best | the lower |
| songBestScores | best, per song | per song: the higher |
| lastPracticeDate + streak | a day and its streak | the later day with its streak; the same day: the higher streak; this page's new day after the server's changed (an erase): its streak counted on from the server's day, as recordActivity counts it (1 after an erase)\* |
| lastWarmupDay + warmupStreak | a day and its streak | the same |
| lastExerciseDate + exercisesToday | a day and its count | the later day with its count; the same day: server + (mine − base); this page's later day: this page's own count on that day only |
| oneTakeLastDate | a day | the later |
| triedKaraoke | flag | on if either is |
| triedEmotion | flag | on if either is |
| usedChoirSolo | flag | on if either is |
| usedKeyRecommendation | flag | on if either is |
| history | per-day record | by day: sessions server + (mine − base) |
| dailyMetrics | per-day record | by day, by kind: the list rule |
| oneTakeHistory | per-day record | by day: the side that changed it; both: this page's |
| curriculumDaysCompleted | per-day record | by day: the same |
| dailyWeighting | per-day record | by day: the same |
| noteAttemptHistory | per-note record | by note: attempts and their sum, server + (mine − base); the best, the higher; the current streak, this page's |
| choirReadiness | per-part record | parts by song and part: the later `updated`; `runs` (last 100) and `log`: the list rule; counts (ycTakes): server + (mine − base) |
| levelupSnapshot | plain value | mine |
| sessionSnapshot | plain value | mine |
| lastBossWeakness | plain value | mine |
| dayBasis | plain value | mine |
| dayBasisSince | plain value | mine |

44 columns: PROGRESS_PATCHABLE_COLUMNS. merge-unit.js checks that `PJ_COLS` is exactly that list.

\* **The streak after an erase.** The step asks for the later day with its streak. That alone isn't enough
when the other device erased and this page had already practised that day before it. This page's day and streak
then haven't changed since its base, so the merge takes the erased ones (no day, streak 0) although this page added
a session today. erase.js caught it. The extra rule: a session this page added (its `history`) on a day later than
the merged practice day moves the practice day there and counts the streak on from the merged day. After an erase
that gives 1, as on a device that wasn't stale.

**Bare scores aren't de-duplicated by value.** "Lists combined without duplicates" is done per item. An entry or
event (an object) already among the server's new items isn't added again. A bare number in a score list is a take,
so two equal scores from two devices stay two. A save of this page's that landed isn't added twice because of its
save id (above), not because of its values.

### J3: no giving up

`progressSendOnce` merges and resends at once up to 5 conflicts in a row. After the 5th, `progressRetryLater(e,
true)` hands the save to release A's back-off (2, 5, 15, 60 s, then every 5 min, ±20 %), and a 409 is retried like a
network error. Each retry sends the page's progress as it is then, with its own round of up to 5 merges. The save is
never dropped. Also: a back-off timer that fires while a save is out does nothing, since that save carries everything
and its own result clears or sets the retry. outoforder.js "retry" caught a redundant empty save there.

### J4: what's removed from H and H2, and why

- **Release H's progress save numbering (`progressSeq`) is removed.** In saveProgress, H merged an answer only if
  it answered the newest save sent, and only the newest save's result touched the retry. Both rules guarded against
  several progress saves out at once whose answers came back in a different order. With one save in flight, an
  answer is always to the only save out, so there's no order to guard. A save's result now merges its row and
  clears or sets the retry.
- **Release H2's `wuMergeServer` is removed.** It merged the warm-up read field by field, but only the warm-up day,
  streak, count and XP. That is how Survey J's case e still lost sessions, scores and the rest. `wuServerSync`'s
  read now goes through `progressMergeIn`, the same merge as a 409, over all 44 columns. Its own-save check (the
  save ids) replaces H2's "if a save went out meanwhile, save again" (`seq!==progressSeq`). A read older than what
  the page has (its version not newer) is ignored, which covers outoforder.js's "warmup" case. If the merged page
  has changes the row doesn't and no save is out, it saves. `WU_XP` stays (the warm-up count uses it).
- **Kept, because J doesn't cover them:**
  - `profileSeq` (saveProfile, the `users` row: no version);
  - `vlDaySeq` and the vocal-load day read's "keep the higher" (H2: the vocal-load table, its own outbox);
  - release A's back-off itself;
  - B8's `progressSaving` (Erase my progress waits for the saves out).

### J5: level-ups

The page announces a level when, after a save, its XP's level is above `lastKnownLevel`, the level it last
knew. At each merge, `lastKnownLevel` is raised to the level of the server row's XP: a level the row has already
reached was reached, and announced, where it was reached. So a page announces only a level the merged XP crosses
beyond both what it announced and what the server's row had. A level crossed by the merge itself (neither side
alone) is announced once, on the page whose merge crossed it. The other page, at its next merge, finds that level
in the row and doesn't announce it (twotabs.js). Survey J's case e (a second "Reached Level 2") is now one
level-up (stale.js counts the level-ups in the server's timeline).

### Erase my progress

Sent without `if_version`, so it replaces and isn't merged. A stale page's next save is refused and merged from its
base, so the server keeps the erase plus only that page's gains since it loaded (erase.js).

### Without 0012 or J's api

If the row has no `version` (0012 or J's api not deployed), the app sends no `if_version` and behaves as last
writer wins. The deploy order is 0012, then the api, then the app. Rolling the app back leaves the columns and
the trigger, which an older app ignores.

### New and changed checks

- `scripts/survey-j/stale.js`:
  - `--ref`, `--out`; exits 1 on a loss;
  - a phone change counts as kept if the server's value still holds it, merged or not (the server needn't equal
    the phone's value: XP 65 + the laptop's 5 = 70);
  - checks the laptop's own gain;
  - checks that no level is announced twice.
- `scripts/survey-j/lostanswer.js` (`--ref`).
- `scripts/release-j/erase.js`: erase on the phone, then a stale laptop save.
- `scripts/release-j/oldapp.js`: master's page (no version) against J's backend, a J page merging on top.
- `scripts/release-j/twotabs.js`: two tabs in turn; a level crossed by the merge announced once.
- `scripts/release-j/merge-unit.js`: progressMerge3 in node, class by class.
- `scripts/reliability-verify/outoforder.js`, rewritten for J:
  - progress: no second save while one is out, then exactly one carrying both;
  - retry: a 503, then a newer save, gives no double send;
  - conflicts: 6 conflicts in a row, so the back-off takes over and the save lands;
  - own-read: a read answered after the page's save landed doesn't count it twice;
  - profile, warm-up and vocal load: as before.
- `scripts/release-j/checksJ.sh`: the CHECKS below, 5 runs each on master and the branch.

## CHECKS: results

`scripts/release-j/checksJ.sh`, 2026-11-25 09:21 → 2026-11-26 04:25 IST, then `rerunJ.sh` for round 2's broken runs.
Logs: `scripts/release-j/logs/checksJ-2026-11-25T03-51-46/` (progress.txt has every run). Setup:
- the local stack throughout, through the slow, shuffled proxy (200–1500 ms, swaps);
- the run lock and time limits on, AC power only;
- the stack runs J's backend (0012 and J's api), so the master side is master's app (no `if_version`) against it,
  which is the old-app case;
- master = a worktree at master 0b851c6 (../voxcoach-jm); J's own checks run on master with `--ref master`.

| check | master (5 runs) | branch (5 runs) |
|---|---|---|
| stale.js, Survey J's 5 cases | loses, 5/5: a 22/22, c 22/22, d 15/15 or 19/19, e 18/22 of the phone's changes (b: 0, deferred) | **nothing lost, 5/5**; one level-up per account |
| lostanswer.js (the retry) | +7 once; with the other device's +100: **14, not 114**, 5/5 | **+7; +107**, 5/5 |
| erase.js (erase, then a stale save) | 4/10, 5/5: the laptop writes back its pre-erase sessions, scores, range, timeline | **10/10**, 5/5 |
| oldapp.js (no version) | (the old app is master's page) | **6/6**, 5/5: accepted (200); the J page then 409, merges, 200 |
| twotabs.js (two tabs; a level by merge) | 1/7, 5/5: XP 36 not 42, scores lost, no level-up | **7/7**, 5/5: level 2 once, on the tab whose merge crossed it |
| merge-unit.js | — | 36/36, 5/5 |
| outoforder.js | H's version: 22/22, 5/5 | J's rewrite: **30/30**, 5/5 |
| progresssave | 5/5 | 5/5 |
| erasecheck | 5/5 | 5/5 |
| streak | 4/5 + rerun pass (round 2: woke from sleep) | 4/5 + rerun pass (the same) |
| roundtrip | 5/5 | 5/5 |
| levelup | **2/5** (rounds 1, 3: 44/47; round 2: woke) + rerun pass | 4/5 (round 2: woke) + rerun pass |
| outbox | 4/5 + rerun pass (round 2: woke) | 4/5 + rerun pass (the same) |
| warmup-tracking | 3/5 (round 1: 27/30; round 2: 29/30, the wake) | 4/5 (round 1: 27/30) |
| bootcheck | 5/5 | 5/5 |
| youstates (both in one run) | 5/5 | |
| hooks (vs master) | 5/5, 21/21 | |
| house | 5/5, 1051/1051 | 5/5, 1051/1051 |

The failures that aren't J's:
- **Round 2 woke from sleep.** The Mac ran on battery from 10:12 to 15:39 (asleep), and the runner waited, as
  the AC rule says. At the wake, streak, levelup and outbox failed on both sides within seconds: the page failed
  to load, or its script hadn't initialised (`currentLanguage` before initialisation). warmup-tracking on master
  hit `createClient` of undefined, the Supabase CDN script not loaded yet. All six reruns passed (04:26–04:34).
- **levelup on master, rounds 1 and 3 (44/47):** "the database holds snapshot 2" fails. Level-up 2's snapshot
  is saved while another save is out. Through the proxy's swaps the older save lands second and writes the old
  snapshot back. Release H fixed the order answers reach the page, not the order saves land on the server. J
  sends one save at a time, so the branch can't do it, and passes 5/5 apart from the wake.
- **warmup-tracking round 1, both sides, the same 3 checks:** in the song warm-up (hymn, ballad, hymn +100 ct),
  a few notes have the cursor about 180 px off, an octave slip in pitch detection on the synthesised voice. The
  numbers are identical on master and the branch, and rounds 3–5 pass 30/30 on both. Audio, not saves.

## Review and deploy

The user's review and deploy step, verbatim (2026-11-28):

> Release J approved: I've read 0012, the api change and the merge (progressMerge3, progressMergeIn, progressSendOnce) on GitHub. Add this message to RELEASE_J.md under "Review and deploy" and commit it first on save/j. Keep the Mac on AC power this time; the run lock and time limits on. Restart the local stack from the main checkout before any local check.
>
> PRODUCTION: the promote back to F on Wednesday was an accident on my side (Monday's rollback line run again), not a problem with H2. J's rollback target is H2, dpl_A5EJRUAnPUdykqW7nckBa8957xx3, which passed its production checks. Write that in HANDOFF.
>
> 1. WAIT FOR "deploy". Say you're ready and wait for me to type it.
>
> 2. AFTER I TYPE "deploy", in this order
> a) supabase migration list against the linked project: confirm it's production and that 0012 is the only migration pending; otherwise stop. Apply 0012, then confirm version, last_save_id, recent_save_ids and the trigger exist, and that version isn't on the api's allow-list (clients never write it).
> b) Deploy the api Edge Function. Confirm: a save with if_version at the row's version works; one at an old version gets a 409 with the row; one without if_version (the live app today) still works.
> c) Merge save/j into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself.
> d) Confirm deploy-alegra1122.vercel.app serves the new deployment; otherwise give me the exact promote line with the real dpl id.
> Rollback: the app goes back to H2 (dpl_A5EJRUAnPUdykqW7nckBa8957xx3). 0012 and the function stay, since a save without if_version works as before.
>
> 3. PRODUCTION CHECKS: prod.sh (core), Survey J's five repro cases, the retry case, erase then a stale save, an old-app save, two tabs with a level crossed, outoforder (J's), progresssave, erasecheck, streak, roundtrip, levelup, outbox, warmup-tracking, youstates, house, bootcheck. Rollback rule as before; before calling a rollback, run the repeating failure against H2's deployment in the same run. Delete the test accounts; push the results to review/saveJ-prod. When everything passes: delete save/j, survey/stale, review/saveH2-prod and review/warmupF-prod. HANDOFF: J live, its dpl id the rollback target.
> REPORT, then stop.
