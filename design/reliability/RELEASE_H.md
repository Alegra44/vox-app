# Release H: saves whose answers arrive out of order

Branch `save/h`, from master fb430a0 (release F live, dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h). Silent: no visible change.
Background: HANDOFF's note from release F ("saveProgress merges each PATCH's answer into progress, so overlapping
saves answered out of order leave the older values in memory until the next save").

## The user's step (verbatim)

NEXT, silent: release H, saves whose answers arrive out of order (HANDOFF's note from F). New branch save/h from master. Save this step as design/reliability/RELEASE_H.md and commit it first. AC power, the run lock and time limits on. Start caffeinate and stop it at the end.
- Reproduce it first: two progress saves whose responses arrive out of order leave the older values in memory. Write down the exact case (which calls, which fields), and a check that fails on master.
- Fix: every save carries a sequence number, and a response is applied only if it answers the newest save sent (or is merged field by field from the newest). Release A's outbox and saveProgress's retry keep working. Do the same for every other save path that writes the server's answer back into memory (vocal load, the warm-up day, any others), and list them in RELEASE_H.md.
- Pass: the new check passes on the branch and fails on master; progresssave, the vocal-load suite with the outbox, roundtrip, streak, warmup-tracking (with your in-flight fix), levelup, youstates, house, bootcheck. Everything that needs a database runs on the local stack, never production. Stop the local stack at the end.
- Secret check, push save/h. REPORT, then stop. Nothing merges until I've reviewed.

## The case, reproduced (scripts/reliability-verify/outoforder.js, on master's deploy/: 7 of 13 fail)

The check holds back the delivery of an older request's answer (the server has already done that request) until a newer
request has been answered, then lets it land. On master:

| case | the calls | the fields | on master |
|---|---|---|---|
| progress | `saveProgress` #1 (PATCH /me/progress), then #2 sent and answered, then #1's answer | `xp` (+3, then +4), `warmupsCompleted` (+1, +1) | the page goes back to #1's xp 3 / 1 warm-up; **the next save (of any field) writes them to the server**: the server ends on xp 3, warmups_completed 1. Not only memory: the newer values are lost |
| retry | #1 answered late (a success) after #2 failed with a 503 | `xp` | #1's late success ran `progressRetryClear(true)` and cancelled #2's retry: the server stays on #1's values |
| profile | `saveProfile` #1 (PATCH /me), #2, then #1's answer | `name` (A, then B) | the page shows A; the next profile save writes A to the server |
| warm-up day | `wuServerSync`'s GET /me/progress (read while the server had yesterday), then the save counting today's warm-up, then the GET's answer | `lastWarmupDay`, `warmupStreak` | the page goes back to yesterday, streak 2 (`wuCountedToday()` false) until the next read |
| vocal load | `loadVocalLoadToday`'s GET /me/vocal-load, then a checkpoint the outbox sends and has confirmed, then the GET's answer | `vlDay.load` (the gauge's total) | the gauge reads 0 with 120 on the server: the checkpoint is in neither the server's answer (read before it landed) nor the outbox (confirmed, removed) |

How it happens in the app: any two saves close together (a score, its XP and the level-up's own save; the warm-up's
count and a session's save), over a slow or uneven connection. The warm-up day: the gate's 1.5 s read (wuServerDone)
when a session starts, racing the count from Coach → Warm-up. Vocal load: the day read at sign-in or at a session's
start, while an earlier session's final checkpoint is still being sent.

## The fix (H1, deploy/index.html and deploy/vocal-load-store.js)

Every save path that writes the server's answer back into memory:

| path | before | now |
|---|---|---|
| `saveProgress` (PATCH /me/progress) | merged every answer | numbered (`progressSeq`); only the answer to the newest save sent is merged (it carries everything the older ones sent). Only the newest save's result touches the retry: its success resets it, its failure schedules it; an older save's success no longer cancels it, and an older save's failure needs none (the newer save sent its fields again) |
| `saveProfile` (PATCH /me) | `profile = {...p, ...row}` on every answer | numbered (`profileSeq`); only the newest save's answer |
| `wuServerSync` (GET /me/progress: the warm-up day and streak, F5) | applied its answer | applied only if no progress save went out while it was out (`progressSeq` unchanged); a save's answer is newer and carries the same two fields |
| vocal load: `loadVocalLoadToday` / `vlFinish` (`vlDay`) | the day read overwrote vlDay when it came | numbered (`vlDaySeq`): a read's answer is applied only if no newer read started and no session finished meanwhile |
| vocal load: `vlFetchDay` (the day's total: the server's plus the outbox's pending) | one read | read again (at most twice more) when the outbox had a checkpoint confirmed while the read was out (counted nowhere) or still has one out when the answer comes (possibly counted twice); it waits for the sends out first. The outbox gains `confirmedCount()` and `sending()` |

Not changed, and why:
- The vocal-load **writes** (PUT /me/vocal-load/sessions/:id through the outbox) never write an answer back, and the
  outbox already numbers each session's payload (`seq`) and keeps one send in flight per session (release A).
- `loadProgress` / `loadProfile` at sign-in and at page load: they run before the app renders anything that saves
  (onSignedIn and the app's start await them). An exercise started during sign-in is HANDOFF's `recordActivity()`
  race, which the user has said not to fix yet; skipping the load's answer there would leave progress empty, so it is
  left as it was.
- Erase my progress already waits for the saves in flight; its own save is now the newest, so an older answer can't
  bring the old row back either.
- The feedback insert (sb.from('feedback')) writes nothing back.
- Still possible, not this release's case: a field changed and not saved yet when the newest save's answer arrives is
  overwritten by the answer (the app saves right after each change, in the same task, so no path does this today).
- The server applies PATCHes in the order they reach it; two saves sent close together over different connections
  can still reach it out of order (then the server keeps the older one until the next save, which sends the page's
  values, now the newest, again). That is the requests, not the answers, and a fix would need a version column on
  the server; not in this release.

## Results (scripts/reliability-verify/checksH.sh, local stack, 2026-11-23 08:45–10:21; logs scripts/reliability-verify/logs/checksH-2026-11-23T03-15-58/)

| check | result |
|---|---|
| outoforder (the new check, this branch) | PASS 13/13 |
| outoforder on master's deploy/ | FAILS as it should: 7 of 13 (every case: progress ×2, retry, profile ×2, warm-up day, vocal load) |
| progresssave (release A's retry) | PASS 5/5 |
| erasecheck | PASS 6/6 |
| vocal-load suite: verify, persist, live, batch1, batch2, batch3a, batch3b, batch3c | PASS 118, 101, 10, 112, 150, 169, 179, 40 |
| outbox (release A's outbox) | 40/41 in the suite run; see below |
| pilot | 28/31; see below |
| roundtrip | PASS 4/4 |
| streak | PASS 15/15 |
| warmup-tracking (with F's in-flight fix) | PASS 30/30 |
| levelup | PASS 47/47 |
| youstates | PASS (equal except the expected changes) |
| house | PASS 1051/1051 |
| hooks (against master) | PASS 21/21 |
| bootcheck | PASS 9/9 |

The two that didn't pass, run again on master and this branch in the same run, twice each (master's deploy/ and scripts
from a worktree of master; logs scripts/reliability-verify/logs/cmp-*):

| | master 1 | branch 1 | master 2 | branch 2 |
|---|---|---|---|---|
| outbox: "two tabs at once: one tab sent it" | ✗ (2 PUTs) | ✗ (2 PUTs) | ✗ (2 PUTs) | ✓ 41/41 |
| pilot: the page-leave keepalive save, and the two checks that follow from it | ✗ ×3 | ✗ ×3 | ✗ ×3 | ✗ ×3 |

- **outbox:** the two-tab case fails on master too (2 of 2), and on the branch 2 of 3 runs. In every run the session is
  stored once and both outboxes end empty (that check passes); only "one tab sent it" varies: both tabs read the
  entry before either wrote its lease. It doesn't come from H (H adds a counter and a list of the sends out; the
  sending is untouched).
- **pilot:** the same 3 checks fail on master, the same way. That's the local stack's known limitation (design/day/
  REPORT.md, release C): a keepalive request sent as the page unloads isn't routed to the local stack. On production
  pilot passed with release B.

Nothing in H touched production: every check ran with VOX_BACKEND=local.

## Review and deploy (the user's message, verbatim)

Release H approved: I've read the diff on GitHub. Add this message to design/reliability/RELEASE_H.md under "Review and deploy" and commit it first on save/h. AC power, the run lock and time limits on. Rollback target: dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h.

FIRST, a test-only fix: the outbox check's "two tabs at once: one tab sent it" case is racy (it fails on master too). Make it assert the outcome (the session stored exactly once on the server, both outboxes empty) instead of which tab sent it. Run it 5 times on master and the branch; it should pass every time on both. Secret check, push save/h.

1. WAIT FOR "deploy". Say you're ready and wait for me to type it.
2. AFTER I TYPE "deploy": H is app-only (no migration, no Edge Function). Merge save/h into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself. Confirm deploy-alegra1122.vercel.app serves the new deployment; otherwise give me the exact promote line with the real dpl id.
3. PRODUCTION CHECKS: prod.sh (core), outoforder, progresssave, outbox, roundtrip, streak, warmup-tracking, levelup, youstates, house, bootcheck. Rollback rule as before. Delete the test accounts; push the results to review/saveH-prod. When everything passes: delete save/h and review/warmupF-prod. HANDOFF: release H live, its dpl id the rollback target. Keep accuracy/g (the record) and survey/guard (parked).

4. THEN SURVEY I, silent: the pitch detector's octave decisions in noise (the deeper fix release G couldn't make). Branch survey/octave from master. Save this step as design/accuracy/SURVEY_I.md and commit it first. No app changes; trial ideas on a local scratch branch only.
- Measure per detector frame, on VocalSet takes in babble, talker, TV and white at 10 and 20 dB: how often the detector picks the wrong octave, and how long the wrong runs last.
- Try a continuity rule in the detector itself: when the candidate an octave away and the one continuing the last steady pitch are close in strength, keep the one that continues. Tune how close "close" is.
- Pass to aim for: wrong-octave frames at 10 dB cut by half or more; at 20 dB, 1% or less; a real octave leap recognised within 67 ms; clean takes unchanged in every tool (scores, scores4b, scores6, gamestates, survey.js within their gates).
- Every tool uses this detector, so list them all and what each would gain.
- Secret check, push survey/octave. REPORT, then stop.

## The outbox check's two-tab case (test-only fix, before the deploy)

scripts/vocal-load-verify/outbox.js: "two tabs at once" now asserts the outcome only: the session stored exactly once on
the server and both outboxes empty. How many PUTs went out is printed, not checked: both tabs can read the entry before
either writes its lease, and then both send; the server's upsert takes absolute totals, so the second PUT changes
nothing. Run 5 times on master's deploy/ and 5 on this branch, alternating, local stack: **10 of 10 PASS (40/40 each)**.
The session went out as 2 PUTs in 8 runs and 1 PUT in 2, every time stored once.
prodH.sh (the production checks) and outoforder.js's DV_URL mode (the deployed page, production backend) are ready.

## Rolled back (2026-11-24)

Deployed as dpl_486d1VkPCWcntBPadLbHLyaMuh39 (merge 6bc489f). On production, warmup-tracking timed out twice on H and
passed 28/28 on F's deployment in the same run (review/saveH-prod, design/reliability/review-h-prod/NOTES.md), so the
user promoted F back (dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h) and master reverted the merge (c0c11f9). Likely cause: H drops
wuServerSync's read when a progress save went out while it was out, so the warm-up count decides from memory alone; a
warm-up already counted today (on another device, or written back by a save) can be counted again.

## H2: the user's step (verbatim)

I've run the rollback line. AC power, the run lock and time limits on.

1. CONFIRM AND REVERT
- Confirm deploy-alegra1122.vercel.app serves dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h again.
- Revert the H merge on master (git revert -m 1 6bc489f), so master matches production. Secret check, push. HANDOFF: H rolled back and why (a read thrown away when a save went out, so a warm-up done on another device could count twice); the rollback target stays F.

2. THE TWO CHECKS THAT ALSO FAIL ON F
batch3c (7 failures) and warmup-entries (1) failed on F's live deployment too, and both passed during F's own production run. Find out what changed: the check, the time of day (the run was around 4 AM, near the local-day switch), data, or the app. Report the cause. Don't change the app without my review.

3. H AGAIN, on a new branch save/h2 from master
- Bring H back (revert the revert), then the fix: wuServerSync merges the server's answer field by field instead of throwing it away. The later warm-up day wins; on the same day, the higher streak. Check every other read that H throws away when a save goes out, and use a merge wherever its fields only move forward. List each in RELEASE_H.md.
- New cases in outoforder.js: a save goes out while the warm-up read is out, and the warm-up was already counted on another device: counted once (XP +5 once, streak +1 once). And the reverse: not yet counted anywhere: counted once.
- Slow, shuffled answers for every local-stack check from now on: a proxy in front of the local stack that delays each response by a random 200–1500 ms (and sometimes swaps two), so races show up before production. Run outoforder, warmup-tracking, streak, progresssave and the outbox through it, 5 times each, on master and the branch.
- The rest as before: progresssave, the vocal-load suite with the outbox, roundtrip, levelup, youstates, house, bootcheck. Secret check, push save/h2.

4. THEN SURVEY I, silent, exactly as in my last message (the detector's octave decisions in noise, on survey/octave from master; no app changes).

REPORT, then stop. Nothing merges or deploys until I've reviewed H2.

## H2: what changed

### Every read H throws away when a save goes out, and what H2 does

| read | its fields | H | H2 |
|---|---|---|---|
| `wuServerSync` (GET /me/progress: the warm-up count's read, 5 s; the gate's, 1.5 s) | `lastWarmupDay`, `warmupStreak`; and, H2, `xp`, `warmupsCompleted` | thrown away if any progress save went out while it was out: the count then ran from the page's memory, on a warm-up already counted (production's warmup-tracking timeout) | **merged field by field** (`wuMergeServer`), whether or not a save went out. A later warm-up day than the page's is a count the page hasn't seen: the page takes its day and streak and what it added, XP the higher of (the page's + 5) and the server's, the warm-up count the higher of (the page's + 1) and the server's, so a score's XP saved meanwhile isn't lost and the count isn't added twice. Same day: the higher streak. If a save went out meanwhile (it sent the page's whole row, so the server may now be behind) and the merge moved anything, progress is saved again. All four fields only move forward: Erase my progress keeps them (PROGRESS_ERASED). Applied only to the account the read was for |
| `loadVocalLoadToday` (GET /me/vocal-load: the day's total, `vlDay`) | `vlDay.load` for `vlDay.day` | thrown away if a newer read started or a session finished (`vlFinish`) meanwhile | applied as before when nothing newer wrote vlDay; otherwise **merged** when it is the same account's same day: the higher total (a day's load only grows; both totals count what had reached the server or the outbox by then). A read for another day or account is still thrown away |

Not merged, and why: an **older save's answer** (`saveProgress`, `saveProfile`) is still dropped. It is the server's
row after an older write; the newest save's answer carries everything the older ones sent, and merging an older row
(even forward-only fields) would bring back values a newer save replaced. `loadProgress` / `loadProfile` were never
dropped (they run before anything saves).

Also found, F's and H's both (outoforder's new "quiet" case): with no save in between, the read took only the other
device's day and streak, not its +5 XP and warm-up, so this page's next save wrote over them. H2's merge takes them.

Still not fixed (not this release's): saveProgress sends the page's whole row, so two devices saving close together
still overwrite each other's other fields (the last write wins). Only a server that adds (xp + 5) instead of storing
totals would fix that.

### The check that timed out on production

warmup-tracking's `rearm` (scripts/warmup-verify/common.js) clears the warm-up day and saves; a count still out (its
read, then its save) put today back. `rearm` now waits out `wuCounting` first, as it already waited out saves. With
H2's merge, a read answered before the clear still brings today back (correctly: the server said so when it answered),
so the wait is needed for any build.

### outoforder.js's new cases (H2)

A save (a score: +2 XP, the page's whole row) goes out while the warm-up count's read is out:
- **elsewhere:** the warm-up already counted today on another device (on the server when the read was served: today,
  streak 3, XP +5, warm-ups +1): counted once, on the page and the server: today, streak 3, XP +5 once (+2), warm-ups +1.
- **nowhere:** not counted anywhere yet: counted once, the same.
- **quiet** (no save in between): counted on another device: the page takes its +5 and +1, and keeps them at its next save.

Requests are now held from when they are sent on to the stack (the stack does the work at once; only the answer to
the page waits), so the warm-up count's 5 s read limit holds under the slow proxy.

### The slow, shuffled proxy (scripts/localBackend.js, from now on for every local-stack check)

Every answer from the local stack reaches the page or the script 200–1500 ms late (random; the stack itself answers
at once), and about one answer in four, when another request is out, waits for the next answer and is delivered right
after it. On by default with VOX_BACKEND=local; VOX_SLOW=0 turns it off; each process prints its VOX_SLOW_SEED, and
setting it repeats the draws. CORS preflights go straight. Checked: 12 requests at once answered in 255–1509 ms, in a
shuffled order; with VOX_SLOW=0, 15 ms.

First runs through it (scripts/reliability-verify/logs/h2-dev-03-44/): outoforder on this branch 22/22; on H1 (save/h)
20/22 (both "quiet" checks); on master 10/22 (every H case, and H2's: on master the proxy's own swap put an older save's
answer over the count, the original H bug, unprompted).

## H2: results (local stack through the slow proxy, 2026-11-24 09:17–14:10 IST)

Logs: scripts/reliability-verify/logs/checksH2-2026-11-24T03-47-14/ (phases A and B), checksH2-2026-11-24T06-38-33/
(phase C), pd-cmp-08-10/ (Performance Director alone). Master = master's deploy/ (6913a1e, = production) with this
branch's scripts. Nothing touched production.

**Phase A: the race checks, 5 times each, master and branch alternating:**

| check | master | branch |
|---|---|---|
| outoforder (22 checks) | **fails 5/5** (10–12 failed each run) | **passes 5/5** (22/22) |
| warmup-tracking (30) | 5/5 | 5/5 |
| streak (15) | 5/5 | 5/5 |
| progresssave (5) | 5/5 | 5/5 |
| outbox (40), as it was | 2/5 | 4/5 |
| outbox, after its fix (phase C) | 5/5 | 5/5 |

Every outbox failure, on both sides, was "after a reload the gauge reads the server's total" reading 0 at a fixed 2.5 s
(the same check failed once on production with H). Through the proxy the day's read can take longer; the check now
waits up to 15 s for the value (test-only, e7ac02f) and then still checks it: 10/10.

**Phase B: the rest, this branch:** erasecheck 6/6, verify 118, persist 101, live 10, batch1 112, batch3a 169,
batch3c 40 (with its local-day fix), roundtrip 4/4, levelup 47/47, youstates (equal except the expected changes),
house 1051/1051, hooks 21/21 (against master), bootcheck 9/9: **pass**. Three didn't, compared in the same run (phase C):

| check | branch | master | verdict |
|---|---|---|---|
| pilot: the keepalive save on leaving the page, and two that follow | ✗ 3 (B, C) | ✗ 3 (C) | the local stack's known limit (keepalive isn't routed to it); same as H1 and C |
| batch2 / batch3b: "gauge moved while the feature ran" | ✗ 1 of 3 batch2, 1 of 3 batch3b | ✗ 1 of 2 batch2, 1 of 2 batch3b | the harness's own note: a capture can end before the day's state has come back; slow answers make it more likely. Both builds |
| batch3b: One Take "ran to the end" (15 s) | ✗ 1 of 3 | ✗ 1 of 2 | both builds |
| batch3b: "feature result identical with the load feed live" (Performance Director's first note, timing 82 or 88) | ✗ 3 of 3 | ✓ 2 of 2 | see below |

Performance Director alone (VLB_ONLY=pd), alternating, 6 through the proxy and 3 without: the first note's timing
score lands on 82 or 88 (one frame of onset) run to run, also with the load feed off, and on master too: master
mismatched 2 of 9 (once with the proxy off, once where the run *without* the feed read 88), the branch 3 of 9. Over all
runs: branch 6 of 12, master 2 of 11. It is the check's timing (one frame at the song's start), on both builds; the
branch's rate is higher in these runs, and that is said as measured, not explained away. The note's pitch score was
100 in every run.

Earlier on 2026-11-24: batch3c reproduced its production failure on master with the browser on a date different from
UTC's (TZ=America/New_York: the same 7 failures, 101 % on the Home card) and passed on UTC (logs
scripts/reliability-verify/logs/localday-03-34/ in the main checkout).

## H2 review and deploy (the user's message, verbatim)

H2 approved: I've read wuMergeServer and the vocal-load merge. Add this message to RELEASE_H.md under "H2 review and deploy" and commit it first on save/h2. AC power, the run lock and time limits on. Rollback target: dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h.

BEFORE "deploy"
- The two other checks with the UTC-date assumption, live.js and the daysAgo helper (youstates, house): switch them to the local day now, test-only.
- Performance Director's first-note timing mismatched in 6 of 12 runs on the branch against 2 of 11 on master. H2 touches no audio code, but show it: 20 runs each, master and the branch, in the same session, proxy off. If the branch is still clearly worse, stop and tell me.
- Secret check, push save/h2. Then say you're ready and wait for me to type "deploy".

AFTER I TYPE "deploy": app-only. Merge save/h2 into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself. Confirm deploy-alegra1122.vercel.app serves the new deployment; otherwise give me the exact promote line with the real dpl id.

PRODUCTION CHECKS: prod.sh (core), outoforder, warmup-tracking, streak, progresssave, outbox, roundtrip, levelup, youstates, house, bootcheck, batch3c, warmup-entries. Rollback rule as before, and before calling a rollback, run the failing check against F's deployment in the same run, as you did last time. Delete the test accounts; push the results to review/saveH2-prod. When everything passes: delete save/h, save/h2 and review/saveH-prod. HANDOFF: H2 live, its dpl id the rollback target. Keep survey/octave as Survey I's record.

QUEUE (HANDOFF): "Octave slips, part 2: the continuity rule gains only 13–19% at 10 dB (most wrong frames come where there's no steady pitch). Next idea: take the first peak within 85% of the highest (babble 15.5% → 8.5%), but it changes clean frames, so it needs its own survey. Low priority."

THEN SURVEY J, silent: a tab left open overwriting another device's progress. Branch survey/stale from master. Save this step as design/reliability/SURVEY_J.md and commit it first. No app changes.
- saveProgress sends the whole row. Reproduce it through the slow proxy on the local stack: a laptop tab loaded in the morning and left open; the phone then earns XP, scores and a session; then one save from the laptop tab. What does the server keep, field by field?
- Size it: which fields are counters or lists (XP, sessions, warm-ups, history, score lists) and which are plain values.
- Propose the fix with its effort, tried on a scratch branch: for example, counters sent as increments and merged on the server, score lists appended, plain values last-writer-wins; or a version number on the row, with a conflict answer that makes the page reload and merge. Say what each needs (a migration, the api function, the app) and what it does to release A's retry and to H2.
- Push survey/stale. REPORT, then stop.
