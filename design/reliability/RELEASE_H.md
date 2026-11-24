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
