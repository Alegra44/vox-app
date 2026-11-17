# Release C: the UTC day

The review message, verbatim:

```
The UTC day, release C. Branch day/local from master. Save this message as design/day/DAY.md and commit it first. AC power, the run lock and time limits on. Rollback target: dpl_7n6H9JiTjJzz71wWpw948MUMD4a5. This release changes a rule on a live table, so the typed "deploy" gate is back: no deploy step runs until I type "deploy" after my review.

Build the plan in design/scoring/SCORING_SURVEY.md R3, with these decisions:
1. One function, localDayOf(ms): the device's local date (YYYY-MM-DD). todayStr(), last14Days(), VocalLoadStore.dayOf and every other place that makes a day from a time use it. List every use in DAY.md with what it's for, and grep that no UTC-sliced day (toISOString().slice(0,10) and the like) is left.
2. Vocal-load payloads carry tzOffsetMin (minutes east of UTC at the session's start). Migration 0010: tz_offset_min smallint with a CHECK of −720…+840, and the day CHECK becomes: when tz_offset_min is present, day = ((started_at + tz_offset_min minutes) at time zone 'UTC')::date; when it's null, the old UTC rule (old rows and old clients). Pruning gets one more day of slack. The api Edge Function accepts tzOffsetMin (allow-list, and the allowlist check).
3. progress.dayBasis = 'local', set at the first save after the switch, once per account. The switch-day rules exactly as R3 sets them out: the streak is kept (a gap of −1 or 0 against a UTC-era date counts as today or yesterday); history keys stay as they are; on the first local day the vocal-load gauge reads both keys.
4. Travel and clock changes: the day follows the device's current time zone, and a session keeps the offset it started with. No merging of days across a zone change; say so in DAY.md.
5. HANDOFF's release note: "Your day now ends at your midnight. On the day of the switch, one day of history may show twice or not at all; no streak is lost."

CHECKS
- day.js (new): Playwright timezoneId at UTC−8, UTC+5:30 and UTC+14, each across its own midnight and across UTC midnight: todayStr, a streak carried over the switch, history keys, the Journey day, the trial day count, One Take and the warm-up once a day, and a vocal-load session saved before and after midnight landing on the right day on the server.
- Everything that touches a database runs against a local Supabase (supabase start) or a throwaway project, never production before the deploy. If neither is possible on this Mac, report and stop.
- The migration on a copy of the production schema: old rows (null offset) still valid, new rows checked, a forged offset (day not matching started_at plus the offset) refused.
- The vocal-load suite with the outbox, allowlist, progresssave, home, youstates, warmup-verify, house, hooks, bootcheck.
Secret check, push day/local. REPORT, then stop.
```

---

## What release C does

The app's day is the device's local date, in the time zone the device is in now. Before release C it was the UTC
date: in India the day rolled over at 05:30, and across the Americas the evening was already "tomorrow".

### 1. One day function: `localDayOf(ms)`

`localDayOf(ms)` is defined once, in `deploy/vocal-load-store.js`, because that file runs both in the page and in
Node. It returns the device's local date of a time as YYYY-MM-DD, and index.html takes the same function
(`const localDayOf = VocalLoadStore.localDayOf`). Three helpers sit next to it:
- `tzOffsetOf(ms)`: minutes east of UTC at that time.
- `dayAtOffset(ms, off)`: the date at a fixed offset. This is the database's rule. For any time,
  `dayAtOffset(ms, tzOffsetOf(ms)) === localDayOf(ms)`.
- `utcDayOf(ms)`: the old UTC rule. It is kept for three places only: old rows, the switch day, and the server's
  trial stamp (below).

Every place that makes a day from a time (index.html line numbers on day/local):

| Where | Line | What the day is for |
|---|---|---|
| `todayStr()` | 14286 | `localDayOf(Date.now())`: "today" for everything below |
| `ensureDayBasis()` | 14306 | the switch (decision 3): local today, compared with a UTC-era `lastPracticeDate` |
| `recordActivity()` | 14500 | the `history` key, the streak's gap, `lastPracticeDate` |
| `renderDashboard()` 14-day chart | 14746, 14751 | `last14Days()`; each bar's weekday label (`dayStartMs`) |
| `loadVocalLoadToday()` | 15164 | today's vocal-load key (the gauge) |
| `vlSwitchKey()` / `vlFetchDay()` | ~15125 | on the switch day: local midnight (`dayStartMs`) and the UTC key that overlaps it (`utcDayOf`) |
| `vlStart()` | 15198 | the session's day: `VocalLoadStore.dayOf` (= `localDayOf`) at its start |
| `vlPercent()` | 15249 | whether the stored total is today's |
| Your Choir recording file name | 18584 | `your-choir-<song>-<day>.wav` |
| `trialStartDay()` / `daysSinceTrialStart()` | 19410, 19414 | the trial's first day (created_at's local date when the server stamped its UTC date), and the day count |
| `dailyNote()` | 19828 | One Take's note of the day (a hash of the account and the day) |
| `registerExerciseCompletion()` | 19896 | `lastExerciseDate`, `exercisesToday` |
| `recordDailyMetric()` | 20417 | the `dailyMetrics` key |
| `last14Days()` | 20429–20431 | the 14 local days ending today (Voice Health charts, the load chart, the trend) |
| Voice Health charts | 20435, 20442 | `last14Days()`; weekday labels (`dayStartMs`) |
| the 14-day vocal-load chart | 20458, 20463 | `last14Days()`, today's bar; weekday labels (`dayStartMs`) |
| Voice Health summary | 20484 | `last14Days()` |
| warm-up gap note | 20527 | days since `lastPracticeDate` |
| `recordWeeklyLog()` | 20608 | the `weeklyLog` entry's date |
| Weekly Challenge | 20621 | the last 7 days of `weeklyLog` (`dayStartMs`: the entry's local midnight) |
| Today's plan | 20644 | days since `lastPracticeDate` |
| Journey start | 20841, 20843 | `day1Snapshot.date`, `day1StartDate` |
| `dailyWeighting` | 20981 | today's plan weighting key |
| Journey day | 21015 | `daysBetween(day1StartDate, today) + 1` |
| `wuKey()` | 21481 | the warm-up once a day (this device's storage key) |
| Boss battle record | 21925 | its date |
| You hub rows | 22973, 22976 | the Journey day; the Weekly Challenge's last 7 days (`dayStartMs`) |
| Today's Report | 23448, 23457 | `sessionSnapshot.capturedAt`; whether there was practice today |
| `recordTimelineEvent()` | 24986 | the event's date |
| One Take | 25379, 25411, 25493 | the once-a-day gate; the take's `oneTakeHistory` key and `oneTakeLastDate` |
| Unified Progress | 26363 | `last14Days()` |
| `createCheckpointer()` | vocal-load-store.js | a session's `tzOffsetMin` and `day` (`dayAtOffset` at its start) |
| `validateCheckpoint()` | vocal-load-store.js | the day against `startedAt` plus `tzOffsetMin`, or the UTC date when there is no offset |

`daysBetween(a, b)` counts between two YYYY-MM-DD dates and reads both the same way, so it is unchanged.
`isoWeekNumber(d)` takes the local year, month and day (it already did) and uses UTC only for calendar arithmetic.

**Grep, on day/local:** `toISOString().slice/substr/substring/split`, `toJSON().slice`, `.toDateString()`,
`toISOString().replace` → none in `deploy/` or `supabase/functions/`.
`getUTC*` and `Date.UTC` → only two places:
- `dayAtOffset` (vocal-load-store.js), the fixed-offset rule;
- `isoWeekNumber` (index.html), the calendar arithmetic above.

The only UTC date left on the client is `utcDayOf`, used for the old rows, the switch day and the trial stamp.

The other `toISOString()` calls are timestamps, not days: `levelupSnapshot.at`, Choir World's `updated`, teacher
assignments, recordings, feedback, and a session's `startedAt`.

**On the server:**
- `trial_start_date` is still stamped with `current_date` (UTC) when an account is made. The client reads it as
  created_at's local date whenever it equals created_at's UTC date (`trialStartDay()`), so day 1 is the day the singer
  signed up, wherever they are.
- Existing accounts' trials can move by one day, once, as R3 said.
- No migration touches this.

### 2. The session offset: migration 0010 and the api function

**Migration 0010** (`supabase/migrations/0010_local_day.sql`):
- **Offset column:** `tz_offset_min smallint` with CHECK −720…+840.
- **Day CHECK** (`vls_day_is_start_date`): when `tz_offset_min` is present,
  `day = ((started_at + tz_offset_min minutes) at time zone 'UTC')::date`; when it is null, the old UTC rule (old
  rows, old clients).
- **Guard:** the trigger also refuses a change to a session's offset.
- **Pruning:** `day < new.day - 2` (was `- 1`).
- **`vocal_load_checkpoint`:** gains `p_tz_offset_min smallint default null`.
- **`vocal_load_state`:** gains `p_since timestamptz default null` (see 3). Both functions are replaced, and a call
  without the new argument still works: the api function still live when the migration lands keeps working. The
  migration goes first; the new api function, which passes the new arguments, goes after it.
- **`user_progress`:** gains `day_basis` (CHECK `= 'local'`) and `day_basis_since date`.

**The api function** (`routes/vocalLoad.ts`):
- The PUT accepts an optional `tzOffsetMin`, an integer from −720 to 840, and passes it on as `p_tz_offset_min`.
- The GET accepts an optional `since`.
- `PROGRESS_PATCHABLE_COLUMNS` gains `day_basis` and `day_basis_since`.

**`allowlist.js`** gains part 3: every field `vlSend` puts in the checkpoint body (now with `tzOffsetMin`) must be read
by the route and passed to `vocal_load_checkpoint`.

### 3. The switch, once per account

`ensureDayBasis()` runs at the start of `saveProgress()` and `recordActivity()`. While `progress.dayBasis` isn't
`'local'`, it does three things:
- If there is a UTC-era `lastPracticeDate` with a gap of −1 or 0 to local today, it becomes local today. The streak is
  kept: a gap of −1 happens west of UTC late in the day; 0 means the same date. A gap of 1, east of UTC early in the
  day, stays "yesterday", so that day's practice adds one.
- It sets `dayBasis = 'local'` and `dayBasisSince` to local today.
- The save then stores both. Every later save finds `'local'` and does nothing.

`history`, `dailyMetrics`, `weeklyLog` and the other keys stay as they were stored.

**The vocal-load gauge** (`vlSwitchKey`, `vlFetchDay`):
- On the switch day it also reads the UTC-dated key that overlaps the local day: the date before east of UTC, the date
  after west of it.
- On the switch day and the day after, each key counts only sessions started since local midnight (`since`).
- Why the narrowing: read as it was, east of UTC that key also holds yesterday's sessions. West of UTC, today's key also
  holds the old app's sessions from yesterday evening, and the day after the switch it holds the switch day's evening.
  Counting from local midnight takes exactly today's sessions on both days.
- From the second day after the switch, every key holds one local day.

### 4. Travel and clock changes

- The day follows the device's current time zone: `localDayOf` reads the zone in effect now, daylight saving included.
- A vocal-load session keeps the offset it started with (`tzOffsetMin` is fixed at its start, and the database refuses
  a change). Its day never moves.
- **Days are not merged across a zone change.** A flight east can make a local day shorter; one key then holds less
  than 24 h, and the next day starts sooner. A flight west makes a day longer; one key holds more.
- Two sessions sung on the same calendar date in two zones are both under that date. A session started just before a
  zone change stays on the day it started.
- The streak, history and One Take go by the date shown on the device at the time. A flight can make "today" repeat
  or skip, and that is accepted.

### 5. Release note (HANDOFF)

"Your day now ends at your midnight. On the day of the switch, one day of history may show twice or not at all; no
streak is lost."

## Deploy, and release D

The message, verbatim (2026-11-17):

> Release C approved: I've read REPORT.md, migration 0010 and ensureDayBasis on GitHub. The pilot's page-leave failure is the local test setup (master fails it the same way there, and pilot passed on production with B); it runs again on production after the deploy. Add this message to design/day/DAY.md under "Deploy, and release D" and commit it first on day/local. AC power, the run lock and time limits on.
>
> 1. WAIT FOR "deploy"
> - Say you're ready and wait for me to type "deploy". Nothing touches production before it.
>
> 2. AFTER I TYPE "deploy", in this order
> a) supabase migration list against the linked project: confirm it's production (ccharikhpeqtzpobarxi) and that 0010 is the only migration pending. If anything else is pending, stop and tell me. Apply 0010, then confirm the new columns, the CHECK and both functions exist.
> b) Deploy the api Edge Function. Confirm a vocal-load checkpoint with tzOffsetMin saves, and one without it (an old client) still saves.
> c) Merge day/local into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself.
> d) Confirm that https://deploy-alegra1122.vercel.app serves the new deployment. If it doesn't, give me the exact vercel promote line with the real dpl id, and wait.
> Rollback: the app goes back to dpl_7n6H9JiTjJzz71wWpw948MUMD4a5. The migration and the function stay: an old app sends no offset, which the UTC rule still accepts, and both functions take the new arguments as optional.
>
> 3. PRODUCTION CHECKS
> - day.js against production (all three zones and the switch), pilot (the page-leave save), the vocal-load suite with the outbox, allowlist, progresssave, erasecheck, home, youstates, warmup-entries, warmup-tracking, bootcheck, house.
> - Rollback rule as before. Delete the test accounts and their vocal-load rows. Push the results to review/dayC-prod.
> - When everything passes: delete day/local and review/scoringB-prod. HANDOFF: release C live, its dpl id the new rollback target. Remove ../voxcoach-master-wt if it has no uncommitted changes; otherwise leave it and tell me.
>
> 4. THEN BUILD RELEASE D on a new branch accuracy/d from master (survey/d stays until D ships). Save this step as design/accuracy/RELEASE_D.md and commit it first. One commit per item; four languages for any new line.
> D1. Tuner: c2 (the vibrato centre only when vibratoSure). Then try the follow-up: a 1.5 s stability window that starts afresh when the readout switches to the vibrato centre. Keep it only if real vibrato stays 95% or more steady and the 10–20 ct/s glides read 20% or less; otherwise ship c2 alone and write down why.
> D2. Pitch Mountain: the octave-jump hold, with the falling-fifth case fixed first (hold only when the jump is away from the frame before it, or compare with the median of the last 3 frames; ship whichever measures better). Pass: octave crashes no worse than the survey's hold numbers, the falling fifth 70 ms or less, a real octave leap no more than +67 ms. Also measure Pitch Dragon and the Rift for the same octave crash (numbers only, into the queue).
> D3. The speaker guard, for Entrance & Cutoff, Rhythm, Harmony Arena and Harmony Memory:
> - One output bus: the app's destination connections all go through one master gain with the analyser on it (no patching of AudioNode.prototype).
> - The bleed gain measured with the speaker delay and stored with it. Devices measured before D (no gain stored) see the speaker-delay sheet once more before their next timing take.
> - When the gain is 0.5 or more, the sheet adds: "Your speakers are loud at the mic. Headphones will give truer scores." (four languages).
> - Pass: the bleed rig credits 0 in all four tools at −20, −10 and 0 dB; a real voice (voiceguard.js) within ±2 of no guard at −20 and −10 dB.
> - A real-device check on this Mac: its own speakers and mic, echo canceller on, volume at 50% and at 100%, nobody singing, a quiet room. The four tools credit nothing. (It plays sound out loud; do it during the day.)
> D4. Tests: the fake-mic browser launched per run in scores.js, and the canceller off in score runs (master and branch the same way); rebaseline.
> CHECKS: tuner, glider, bleed, voiceguard, hygiene (master against the branch); scores, scores4b, scores6 (changes only in the Tuner, Pitch Mountain, Entrance & Cutoff, Rhythm, Harmony Arena and Harmony Memory); house, hooks, contrast, copyscan --all, names, focus, targets, bootcheck.
> SCREENSHOTS on review/accuracyD: the sheet's headphones line and the re-measure prompt, at 390 Light and Dark and 1280 Light. Secret check, push accuracy/d and review/accuracyD.
> REPORT, then stop. Nothing from D merges until I've reviewed.
