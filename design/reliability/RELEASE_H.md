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
