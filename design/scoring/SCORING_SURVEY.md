# Scoring accuracy batch, part S: the survey (2026-11-15)

Spec: SCORING.md. Branch scoring/survey. **No score changes on this branch.** The proposed fixes were tried on a local
scratch branch (`scratch/scoring-fix`, a worktree at ../voxcoach-scratch, commit 18231fa). That branch is never pushed
and never merged. Its diff against master is kept here as `scratch-fix.patch`, for reading only.

## How it was measured

- **Tools:** Performance Director (PD), Karaoke Coach and Emotional Singing, on the Demo Hymn (8 notes, 3.33 s each,
  26.7 s). Each was driven through its own Start button on a signed-in throwaway account (deleted afterwards), against
  the production backend.
- **Runner:** `scripts/scoring-verify/survey.js`, under the run lock and time limits (each take a 75 s step, the script
  50 min). It reuses scores.js's pieces: tools6.js opens and reads the tools, stage.js supplies the stimuli.
- **The mic:** a synthetic mic (an AudioContext behind getUserMedia, like synthmic.js), so every stimulus follows the
  tool's own clock.
- **The voice:** stage.js's steady A4 (VocalSet S1, a real straight-tone note), moved onto each Lead note.
- **Runs:** two per build, same session. A table cell is the median, with both runs in brackets when they differ.
  The full tables are in `survey-tables.txt`.

| Stimulus | What the mic sings |
|---|---|
| steady | A4 held through the whole song, one level, sounding from 1.2 s before Start |
| ontime | the Lead line, each note on its chord (40 ms rise, held 85 % of the chord, 60 ms release, silence until the next) |
| late150 | ontime, every note 150 ms late |
| silence | nothing |
| loud | ontime in a loud room: pink noise 23 dB under the voice, and the backing leaking in 19 dB under (the four backing parts on the tool's backing clock) |
| dynamic | ontime with planned note levels from −12 to 0 dB (a positive control for item 2) |
| skips | ontime with notes 3 and 6 left out (item 4) |
| loudlate | late150 in the loud room. The backing's own chord starts are on time and the voice is not, so this tests whether a rule mistakes the backing for the singer. |

## Item 1: Timing counts a voice that is already sounding (PD, Karaoke)

**Today:** a note gets 100 if *any* pitch is detected in the first 40 % of its window, and 50 if later. The take never
asks whether that voice *started* there.

**Proposed rule.** A note's timing comes from an **onset** in its window:
- **What counts as an onset:**
  - a level rise of ≥ 9 dB within 120 ms to above the voicing threshold (an entrance or a re-articulation; the hymn
    has four C5s in a row, so pitch alone can't separate them);
  - or a pitch arriving within 100 ct of the note when none was there for 150 ms (a legato change of note).
- **Confirmation:** an onset is kept only if the next 150 ms hold 3 frames within ±300 ct of the note, so a click or a
  noise burst doesn't count.
- **Which onset is the note's:** the first in [start − 150 ms, start + 40 % of the note]. A level onset is placed to
  ~1.3 ms with the analyser window's hops (the trainers' `edgeSecondsAgo`, with a threshold relative to the rise).
- **Score:** `timingAccuracy(onset − start)` = 100 − 0.6 × |ms|, the formula Rhythm and Entrance & Cutoff already use.
  No onset: 0.

**What a correct score is:**
- held tone: 0 (no entrance anywhere);
- on time: ≈ 100, less the rig's own delay;
- 150 ms late: ≈ 10;
- silence: 0;
- skips: 0 on the skipped notes.

| Stimulus | PD Timing today | PD proposed | Karaoke Timing today | Karaoke proposed |
|---|---|---|---|---|
| steady | **100** | 0 | **100** | 0 |
| ontime | 100 | 83.5 (83/84) | 100 | 96 |
| late150 | **100** | 0 | **100** | 6.5 (7/6) |
| silence | 0 | 0 | 0 | 0 |
| loud | 100 | 87 | 100 | 90.5 (90/91) |
| dynamic | 100 | 81.5 (82/81) | 100 | 92.5 (92/93) |
| skips | 100 | 65.5 (65/66) | 75 | 70 (69/71) |
| loudlate | 100 | 16.5 (17/16) | 100 | 2.5 (3/2) |

Measured onset offsets on the scratch build, ms per note:

| Stimulus | Karaoke | PD |
|---|---|---|
| ontime | +2…+7 | +18…+26 (first note +40) |
| late150 | +150…+157 | +164…+174 |

Findings:
- **The rule does what it should.** The held tone gets no onsets, a late singer is late, and the room's noise doesn't
  move it.
- **PD reads ~20 ms later than Karaoke on the same rig.** The cause isn't found. It costs PD ~12 points on time, and it
  must be explained before this ships. PD's first note is also scheduled ~15 ms late by the rig, which is the rig's
  fault, not the app's.
- **The backing can still fool the rule in PD.** On `loudlate`, PD heard the backing's own chord starts as onsets on 3
  of 8 notes (read at +77…+105 ms). Karaoke did not.
  - PD plays no backing in the app, so this stimulus is harsher than PD's reality. In the app, the mic's echo
    cancellation (on for this mic; the rig bypasses it) removes most of a backing leak.
  - Still, before shipping: for tools with a backing, drop level onsets that come within 120 ms of a backing chord
    start (moved by the item 5 latency) unless they are ≥ 6 dB above the backing's level.
- **Karaoke's backing starts 80 ms after its scoring clock.** `playBackingPad` schedules at `currentTime + 0.08` and
  the clock is read afterwards, and the singer then hears it a further output latency later. A singer who follows the
  backing is scored late by 80 ms plus the round trip (item 5). The fix: take the note starts from the backing's own t0
  on the audio clock. Emotional Singing has the same backing, but it has no Timing.

**Stored:** only the score. PD saves only `pitchScores` (its Pitch); its Timing, Dynamics and Technique are shown and
never stored. Karaoke saves `pitchScores` and `songBestScores[song]` = (Pitch + Timing)/2, the best ever, so Timing
lives on only inside that combined best. No readings are stored, so **past scores can't be recalculated**. A song
best set by a held tone (steady: 50 today, 0 proposed) stays until beaten.

Karaoke's (Pitch + Timing)/2 per take: steady 50 → 0, ontime 98 → 96, late150 98 → 51, skips 86 → 83, loud 98 → 94,
loudlate 98 → 50.

**Effort: medium.** About 80 lines shared by both tools, the backing clock for Karaoke, the PD offset to explain, and
scores.js's gates moved to the new values.

## Item 2: Dynamics (PD) and Expression (Emotional Singing) on a steady tone

**Today:**
- **PD Dynamics** = (max − min)/max × 150 over every frame louder than 0.008. Any onset or gap gives 100.
- **Emotional Singing Expression** = the frames' coefficient of variation × 250 (frames > 0.012). Gaps between notes,
  onset ramps and the room all count as "expression".

**Proposed measure** (one function, `levelShape`, for both). How much the *sung level* moves from note to note:
- **Per note:** the voice's frames (pitched, within 15 dB of the note's peak).
- **Left out:** the first 150 ms (the onset ramp) and the last 100 ms (the release).
- **The room:** the median power of the note's other frames, taken off the power.
- **Level:** the median of what's left, in dB.
- **Score:** from the spread (sd) of the note levels: sd ≤ 1 dB → 0, 4 dB (about a 12 dB phrase) → 100, linear
  between. Under 3 notes: no score.

**What a correct score is:**
- steady, ontime, late150, skips, loud, loudlate (all sung at one level): ≈ 0;
- silence: none;
- dynamic (−12 … 0 dB): high.

| Stimulus | PD Dynamics today | PD proposed | Expression today | Expression proposed | Expression coach line, today → proposed |
|---|---|---|---|---|---|
| steady | **75** (100 when the take starts on the tone's onset) | 0 | **51** | 0 | more needed → more needed (its Pitch is 0) |
| ontime | 100 | 0 | 58.5 (58/59) | 0 | **good dynamics** → flat dynamics |
| late150 | 100 | 0 | 58.5 (58/59) | 0 | good dynamics → flat dynamics |
| silence | 0 | — (0 shown) | — | — | no signal → no signal |
| loud | 100 | 0 | **83** | 0 | good dynamics → flat dynamics |
| dynamic | 100 | 91 | 100 | 90 | good dynamics → good dynamics |
| skips | 100 | 0 | 61 | 0 | good dynamics → flat dynamics |
| loudlate | 100 | 0 | 67.5 (68/67) | 0 | good dynamics → flat dynamics |

**Measured note levels on the scratch build:** sd 0.02–0.3 dB for every one-level stimulus, and 3.7 dB for `dynamic`
(levels −24.3 … −12.3 dB, as planned).

**Caveats:**
- **The steady stimulus is very steady.** S1 from 5 s on has under 0.3 dB of note-to-note wander, while a real held
  voice wanders 1–2 dB. The 1 dB dead zone was chosen for that, but it should be set from real takes (the VocalSet
  recordings in the test data) before shipping.
- **Within-note shape isn't scored.** A crescendo inside one long note has no score here; it's a possible second term.

**Stored:**
- **PD Dynamics:** never stored (shown only).
- **Expression:** `recordSkillScore('expression', …)` pushes onto `progress.expressionScores`, but **the server drops
  it**. `user_progress` has no `expression_scores` column (checked on the live schema today), and the progress PATCH
  keeps only its allow-list, silently. So an Expression score lives only until the page reloads.
  - Nothing to recalculate.
  - **HANDOFF's line "Emotional Singing and Harmony Arena already store `expressionScores`" is wrong.** They record
    it in memory only.

**Effort: small** for the measure (about 30 lines), plus the column (item 6).

## Item 3: Karaoke and PD divide note pitch by the wrong count

`vibratoTolerantCents(buf)` returns `pts.map(…)`, exactly one value per reading, on both of its paths.
- Across all 352 calls in the survey's takes (both builds), the output count equalled the input count every time:
  0 mismatches.
- Dividing by the returned array's length instead (scratch) changes **nothing today: 0 points on every stimulus**.
  Pitch was identical within the runs' own ±1.
- It only guards a future change to the helper.

**Stored:** Pitch (`pitchScores`). It's unchanged, so there is nothing to recalculate. **Effort: small** (two lines).

## Item 4: The two Timing averages

**Today:** Karaoke averages Timing over every note, with a note not heard as 0. PD averages over the notes heard, with
the same formula and the same label. Under today's presence rule this only shows when notes are skipped:

| Stimulus | PD today (notes heard) | Karaoke today (every note) | PD proposed (every note) | Karaoke proposed (every note) |
|---|---|---|---|---|
| skips | 100 | 75 | 65.5 | 70 |
| silence | 0 | 0 | 0 | 0 |
| every other stimulus | the same in both (see item 1) | | | |

**Proposed (your lean):** both average over **every note, a note not heard = 0** (a skipped note is a timing miss).
PD's Technique = (Pitch + Timing)/2 follows. The label says so: "Timing — every note; a note you didn't sing counts 0"
(the `pd_dim_timing` / `karaoke_timing` labels, with a short note under each, in four languages).

Pitch stays an average over the notes heard. A skipped note has no pitch to judge; it is counted by Karaoke's "N of 8
notes" row.

**Stored:** PD Timing is never stored. Karaoke's is only inside the song best. **Effort: small.**

## Item 5: Latency (Rhythm, Entrance & Cutoff, Your Choir)

### This Mac, Chrome

Chrome 157 is the installed Google Chrome, driven by Playwright in a real window, with the MacBook Pro speakers at
volume 44 and the MacBook Pro microphone. The script is `scripts/scoring-verify/latency.js` with `latency.html`. The
round trip is measured by playing ten 2 ms clicks and finding each in the mic recording on the same AudioContext clock
(the clock the app scores on), by a matched filter.

| | mic echo cancellation off | echo cancellation on (the app's mic) |
|---|---|---|
| `baseLatency` | 5.3 ms | 5.3 ms |
| `outputLatency` | 28.0 ms | 33–39 ms |
| mic track `getSettings().latency` | 2.7 ms | 10.0 ms |
| sum of the three | **36 ms** | **48–54 ms** |
| click round trip, speaker → mic | **108.9 / 109.1 ms** (2 runs, 8 and 7 of 10 clicks heard, the same to 0.1 ms within a run; the first run's recorder overran, fixed since) | **94.8 / 97.1 ms** (7 and 3 of 10 clicks heard; one run 0 of 10: the echo canceller removed them) |

**The reported values account for only a third to a half of the real round trip** (36–54 ms of 95–109 ms). The rest
is buffering that Chrome doesn't report.

### Safari

**Not measured.** safaridriver refused: "You must enable 'Allow remote automation' in the Developer section of Safari
Settings". To measure it:
1. In Safari, turn on Settings ▸ Advanced ▸ "Show features for web developers", then Developer ▸ "Allow remote
   automation".
2. Run `node scripts/scoring-verify/latency.js --browsers safari`.

Safari will ask for the mic once. Alternatively, open `latency.html` in Safari and press Measure.

### What the app adds on top

- **Rhythm's detector:** it uses the frame time, not the edge. On the synthetic rig, on-beat onsets read +14…+35 ms
  late (scores.js A/A, 2026-10-26, Rhythm average 82–87), including the rig's own path. Entrance & Cutoff place the
  edge to ~1.3 ms (`edgeSecondsAgo`). Karaoke's onsets under the item 1 rule read +2…+7 ms on the same kind of rig.
- **Rhythm's beats:** they are `performance.now()` times, with the clicks scheduled through `playTone`, so the whole
  round trip lands in every offset as "late". Entrance & Cutoff is on the audio clock, with the same round trip. It
  says so on screen ("included in these numbers, not subtracted").
- **Your Choir:** takes recorded in headless Chromium landed 65–68 ms after the song clock (recorder latency,
  CHOIR_WORLD_ROADMAP.md). On a real device the singer also hears the guide late by the output latency, so the shift a
  take needs is the round trip plus the recorder offset. Takes keep `lead` (the downbeat's offset) **with their audio
  on the device**, so a correction can be applied to past takes at playback, without re-recording.

### What each calibration gives here (Chrome, app mic, round trip ≈ 96 ms)

| | Correction applied | An on-time singer then reads | Rhythm per beat (100 − 0.6 × ms, + ~20 ms detector) |
|---|---|---|---|
| none (today) | 0 | ~96 ms late | **~30** |
| default from the reported values (out + base + track) | 48–54 ms | ~45 ms late | ~61 |
| one-time **tap along** (16 clicks, tap on each, `latency.html` ▸ Tap along) | output latency + the tap's input lag + the person's own tapping habit (people tap 20–50 ms *ahead* of a beat) | it never sees the mic's input path, so ~35–60 ms of the ~96 stays, minus whatever the habit adds; not measured here (it needs a person) | roughly 55–80, varying by person |
| automatic **click round trip** (as measured above; a 4 s step before the first take) | ~96 ms | ~0 ms + detector | ~88 (≈ 100 with Rhythm's edge fixed as Entrance & Cutoff's) |

**Recommendation:**
- **Use the automatic click round trip, once per device and browser, stored on the device.** It is the only one of
  the three that measures the path the score sees, and it was stable to 0.1 ms within a run and ±1 ms between runs.
- **Fall back to the reported values plus a fixed 50 ms** when the click isn't heard (headphones, a muted speaker, or
  the echo canceller removing it, as in one run of three here).
- **Re-measure when the output device changes** (`devicechange`).
- **Tap along is worse than the default here:** it misses the mic half and adds the person's habit.
- **Bluetooth headphones** add 150–250 ms of output latency that no click can measure (the mic doesn't hear them).
  Only a sing-along would.

**Stored:**
- **Rhythm:** only its average, in `agilityScores` (as agility).
- **Entrance & Cutoff:** nothing; the result is shown and not saved.
- **Your Choir:** the audio and `lead` per take (on the device), so it can be corrected.
- Past Rhythm scores can't be recalculated; at most they could be marked as recorded before calibration.

**Effort: medium.** A calibration step and its storage, the offset applied in four places (Rhythm, Entrance & Cutoff,
Your Choir, PD/Karaoke from item 1), Rhythm's edge placed as Entrance & Cutoff's, and verify scripts with a known
rig delay.

## Item 6: Expression in the Skill Profile

`computeSkillProfile()` has `expression: null` hard-coded ("Not in your profile yet"). Adding it after item 2:
1. **A column:** migration `expression_scores jsonb default '[]'` plus the allow-list entry. Without it nothing
   persists (item 2).
2. **Only the fixed measure:** `computeSkillProfile` reads `avgOf(progress.expressionScores)` (the last 20).
3. **Harmony Arena's `overall`:** today it also calls `recordSkillScore('expression', overall)`, where overall is the
   average of its Pitch, a "Timing" that is the share of frames with a pitch (the same presence bug as item 1), Part
   Accuracy and Independence. That is not expression. Either it stops recording into expression, or its Timing gets
   item 1's rule and it moves to its own ring. Mixing the two would make the ring meaningless.

**How the profile changes for the test accounts:**
- **Production:** 12 progress rows in all, checked today. **None** has tried Emotional Singing (`tried_emotion` false
  on all 12) or has a Harmony best. The four test accounts still there (e2e-progress-test, voxcoach.qa.smoketest,
  voxcoach.test ×2) hold Pitch [100] or Breath [95] or nothing, and no Expression anywhere.
  - **So nothing changes for any production account on the day it ships.** Expression stays "Not in your profile yet"
    until each person sings Emotional Singing once after the fix.
  - Since nothing was ever stored, no old inflated score (the steady tone's 51) can enter anyone's profile.
- **The seeded local test states** (youSeed.js "active": Pitch [62, 70, 76, 81, 84], Breath [55, 60], Agility [64, 72],
  Expression [48]): today the summary reads four rings and lists Expression as "not scored". After the change it reads
  five, and Expression 48 becomes the weakest ring ("Needs work: Expression"). The 48 is a hand-written seed, not a
  measured score, so it should be reseeded with a value from the new measure. youstates.js's expectations change with it.

**Effort: small** (a migration, an allow-list line, one line in the profile, and the youstates/youSeed expectations),
once items 2 and 3 of Harmony are decided.

## Reliability items (sized, not fixed)

### R1. The vocal-load save gives up on a network error: **medium**

Where (deploy/vocal-load-store.js `createCheckpointer`; deploy/index.html `vlWrite` / `vlFinish`):
- `save()` catches a failed PUT and returns `{ok:false}`; `vlLogWrite` logs "vocal load checkpoint not saved". Nothing
  retries it.
- A failed **minute** or **pause** checkpoint goes again at the next checkpoint (the totals are absolute), but only
  while the session runs.
- **A failed end write is final.** `end()` sets `ended = true` before it saves, so `frame()`, `hidden()` and `end()` all
  return null afterwards, and `vlRun` is already null. Everything since the last good checkpoint is lost: up to 60 s,
  and for a session under 60 s with no 5 s pause (one Pitch Match, one Karaoke run) **the whole session**, because the
  end write was its only write.
- **A failed hidden write** (keepalive at page hide) is never retried either.
- **In the logs:** every one of the 9 failed checkpoint writes since October was an end write (9 runs), and each lost
  its whole test session.

Plan:
1. **An outbox on the device:** `localStorage['vl-outbox:<user id>']`, by sessionId, holding the latest unconfirmed
   payload. Every checkpoint writes there first, then sends. A 2xx removes the entry only if it is still the latest
   payload for that session.
2. **Retry with back-off:** on a network error, a 5xx or a 429, retry at 2 s, 5 s, 15 s and 60 s, then every 5 min while
   the page is open (±20 % jitter, one in flight per session). Any other 4xx is a rejected payload: log it and drop it.
3. **Drain the outbox** on load after sign-in, on `online`, and before a new session starts. The server's upsert is
   idempotent (absolute totals per session), so a payload that already landed changes nothing.
4. **Age limit:** drop entries older than 35 h, logged, since the database rejects starts more than 36 h ago.
5. **The gauge** adds today's unconfirmed outbox loads to the server's `dayLoad`.
6. **Verify:** the vocal-load-verify harness with the end PUT failing (503, then abort), a reload with an outbox entry,
   and two tabs draining at once.

About a day. No migration.

### R2. The Supabase 503s: **small**

Across every run log since 1 October (scripts/*/logs: 738 dated runs, ~2,200 log files):
- **21 runs saw a 503** (41 "status of 503" resource lines and 22 "Request failed: 503" errors).
- **All between 22 Oct and 5 Nov:** 21 of ~177 runs in that period (12 %). There were none in ~340 runs from 1–21 Oct
  and none in ~220 runs since 6 Nov.
- **Which calls:** only the Edge Function `api`:
  - PUT /me/vocal-load/sessions: 9
  - GET /me/vocal-load: 5
  - PATCH /me/progress: 5
  - resource lines that don't name the call: 16 (choir-verify logs)
  - **Never auth.** The sign-up timeouts in production checks are a different thing: slow, not 503.
- **Pattern:**
  - **Bursts:** 1–2 failing requests a few seconds apart (one take's end write, then the next take's state read), with
    requests just before and after succeeding.
  - **Not cold starts:** they fall mid-run, after many good calls to the same function.
  - **Time of day:** 18 of the 19 dated runs started 02:00–11:00 UTC (07:30–16:30 IST), against 46 % of all runs.
    Suggestive only: these are run start times, and the sample is small.
  - It reads as a platform-side episode that ended by 6 Nov.

R1's retry covers the vocal-load calls. The same back-off on `saveProgress` is ~10 lines (today the next save carries
the change, so only an app closed right after a failed save loses it). Watch the Supabase function logs for a 503
with a request id.

### R3. The UTC day: **large**

**Today:**
- **The app:** `todayStr()` is the UTC date (26 uses: streaks, `history`, `dailyMetrics`, `weeklyLog`, the Journey
  day, trial days, One Take and the warm-up once a day).
- **Vocal load:** uses the same expression (`VocalLoadStore.dayOf`).
- **The database enforces it:** `vls_day_is_utc_start_date check (day = (started_at at time zone 'UTC')::date)`, and
  `vocal_load_state` reads by that day.
- **The effect:** in IST the day rolls over at 05:30, and in the Americas the evening is "tomorrow".

Plan (one release, the app and the server together):
1. **One local-day function:** `localDayOf(ms)`, the device's local date, used by `todayStr()`, `last14Days()` and
   `VocalLoadStore.dayOf`.
2. **The session offset:** session payloads carry `tzOffsetMin`. Migration 0009 adds `tz_offset_min smallint`
   (−720…+840) and replaces the CHECK with `day = ((started_at + tz_offset_min minutes) at time zone 'UTC')::date` when
   it is present, and the old UTC rule when it is null (old rows, old clients until they reload). Pruning gets one more
   day of slack. The baseline is by time, so it is unaffected.
3. **A one-time flag:** `progress.dayBasis = 'local'`, set at the first save after the switch, so the switch happens
   once per account.

On the switch day:
- **Streaks:** `lastPracticeDate` is a UTC date.
  - **East of UTC:** it can be a day behind local, so the gap reads 1 and the streak goes on.
  - **West of UTC:** it can be a day ahead, so the gap reads 0 or −1. Today's code ignores gap ≤ 0, so the streak
    isn't broken, but that day isn't added.
  - **Rule:** on the first save with `dayBasis` unset, treat a gap of −1 or 0 against a UTC-era date as "today or
    yesterday": keep the streak and set `lastPracticeDate` to local today. No streak is lost; at most one day is
    counted twice or not at all.
- **History / dailyMetrics / weeklyLog:** past keys stay as UTC days. There is no record of past local times (history
  holds counts per day), so nothing can be moved. One local day can collect counts under two keys on the switch day:
  a one-day blip, said once in the release notes.
- **Vocal load:** sessions saved earlier that day under the UTC key aren't in the local key, so the gauge can read low
  for that one day. Mitigation: on the first local day only, the client reads both keys and adds them. The 36 h break
  rule is by time, so it is unaffected.
- **Journey day, trial days, One Take and the warm-up:** "today" moves by at most one day, once. A trial can look one
  day longer or shorter, and One Take or the warm-up can be allowed twice, or not at all, that day. Noted, no migration.

Effort: large. The 26 uses read through, a CHECK change on a live table, the client and server in one release, and
verify scripts that pin the timezone (Playwright `timezoneId` for UTC−8, UTC+5:30 and UTC+14 across a midnight).

## Summary

| Item | Today on the bad stimulus | Proposed | Past scores recalculable? | Effort |
|---|---|---|---|---|
| 1 Timing | held tone 100, 150 ms late 100 (PD and Karaoke) | onset rule: held 0, late ≈ 0–7, on time 84–96 | no (scores only) | medium |
| 2 Dynamics / Expression | held tone 75 / 51; one-level melody 100 / 58; loud room 100 / 83 | level shape across notes: one-level 0 / 0, planned dynamics 91 / 90 | nothing stored (Expression is dropped by the server; PD Dynamics never saved) | small |
| 3 Divide count | 0 mismatches in 352 calls | divide by the returned length: 0 points of change | n/a | small |
| 4 Two Timing averages | skips: PD 100, Karaoke 75 | every note, unheard = 0: 65.5 / 70 | no | small |
| 5 Latency | Chrome round trip 95–109 ms, of which 36–54 ms is reported; Rhythm on time ≈ 30 | automatic click round trip, values + 50 ms fallback | Your Choir yes (audio + `lead` on the device); Rhythm no | medium |
| 6 Expression in the profile | "Not in your profile yet" | the ring from the fixed measure, once a column exists; Harmony's overall out of it | no account in production has any to carry over | small |
| R1 Vocal-load save | a failed end write loses the session (9 of 9 in the logs) | device outbox + back-off retry | — | medium |
| R2 503s | 21 runs, 22 Oct – 5 Nov, `api` function only, bursts mid-run | R1's retry; save retry | — | small |
| R3 UTC day | the day rolls over at UTC midnight | local day in the app and the DB CHECK, with the switch-day rules above | — | large |

Open before any fix ships:
1. PD's extra ~20 ms on the rig (item 1).
2. The backing's chord starts as onsets in PD's loud room (item 1).
3. Item 2's dead zone, set from real voices.
4. Safari's latency numbers.
5. Where Harmony Arena's score belongs (item 6).

## Files

- `scripts/scoring-verify/survey.js`: the stimuli, through the three tools, any build (`--ref`).
- `scripts/scoring-verify/compare.js`: the tables.
- `scripts/scoring-verify/latency.js` and `latency.html`: the latency probe; tap along by hand.
- `survey-tables.txt`: the full tables, both runs. `scratch-fix.patch`: the local scratch build's diff (not applied
  anywhere).
- Raw JSON (every frame of every take): scripts/scoring-verify/logs/, untracked like the other logs.
