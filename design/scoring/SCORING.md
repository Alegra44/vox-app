# Scoring accuracy batch, part S: a survey only (the user's message, 2026-11-15, verbatim)

Scoring accuracy batch, part S: a survey only. Branch scoring/survey from master. Save this message as design/scoring/SCORING.md and commit it first. No score changes on this branch. AC power, the run lock and time limits on. Rollback target: dpl_2g7Gq6fiY782p75a2tmokH2dJFLF.

THE SIX ITEMS (HANDOFF, "Scoring accuracy batch")
For each one:
1. Measure it on master with fixed stimuli, reusing the scores scripts' where they exist: a steady tone held through the whole song, the melody sung on time, the same melody 150 ms late, silence, and the on-time melody in a loud room with the backing playing. Today's score for each, so the bug shows in numbers.
2. Propose the fix in a few lines: the rule or formula, and what a correct score would be for each stimulus.
3. Try the fix on a local scratch branch (never pushed, never merged) and give old and new scores side by side.
4. Say what the app stores for that tool: the raw readings behind a saved score, or only the score. This decides whether past scores could be recalculated.

What I'm looking for on each:
- 1 Timing: a held tone must not be "on time" on every note. Propose an onset rule (a new onset in the note's window, not just a voice present).
- 2 Dynamics and Expression: a steady tone should score low. Propose a measure that ignores the onset ramp, the room and the backing.
- 3 The divide count: mechanical; give the size of the change.
- 4 The two Timing averages: one rule for both. My lean: over every note, a note not heard is 0, because a skipped note is a timing miss. The label says so.
- 5 Latency (Rhythm, Entrance & Cutoff, and Your Choir's ~67 ms): measure output plus input latency on this Mac in Chrome and Safari (AudioContext outputLatency and baseLatency, and a speaker-to-mic click round trip). Compare a one-time "tap along" calibration with a default taken from those values, and say what each gives here.
- 6 Expression in the Skill Profile: once 2 is fixed, how the profile would change for the test accounts.

THREE RELIABILITY ITEMS: size them, don't fix them
- The vocal-load save gives up on a network error, and the session is lost: where it happens, and a plan to retry with back-off and keep unsaved sessions on the device until the server confirms.
- The Supabase 503s: how often across the logs since October, which calls, and any pattern (time of day, bursts, cold starts).
- The UTC day: a plan that moves the app's day and the server's vocal-load day to the person's local day together, and what happens to streaks and history on the day it switches.

OUTPUT
- design/scoring/SCORING_SURVEY.md: a table per item (stimulus, today's score, proposed score), the stored-data answer per tool, the latency numbers, and the three reliability sizes, each with a rough effort (small / medium / large).
- Secret check, push scoring/survey. REPORT, then stop.

## Decisions and release A (the user's message, 2026-11-15, verbatim)

Scoring batch: decisions, then release A. Start a new branch scoring/a from master (scoring/survey stays as it is). Add this message to the end of design/scoring/SCORING.md under "Decisions and release A" and commit it first. AC power, the run lock and time limits on. Rollback target: dpl_2g7Gq6fiY782p75a2tmokH2dJFLF.

DECISIONS (record them in HANDOFF, and correct its line saying Emotional Singing and Harmony Arena "already store expressionScores")
1. Past scores stay as they are: only scores are stored, and production has 12 accounts. Your Choir is the exception: the item 5 correction applies at playback, past takes included.
2. Two releases. A: the reliability fixes and item 3 (no score changes). B: items 1, 2, 4, 5 and 6 together, with Karaoke's backing clock, Harmony Arena and Rhythm's clock. The UTC day (R3) is its own release after B, with its own spec; its migration becomes 0010.
3. Item 1: the onset rule as proposed, for PD, Karaoke and Harmony Arena's Timing. Before it ships: find PD's extra ~20 ms (fix it if it's the app's, document it if it's the rig's), and add the backing filter (drop level onsets within 120 ms of a backing chord start, moved by the item 5 offset, unless they're 6 dB or more above the backing), proven on loudlate: 0 of 8 false onsets in both tools.
4. Item 2: levelShape for both tools. The dead zone and the 100 point are set from the VocalSet takes: one-level real takes score 10 or less, the dynamic stimulus 85 or more. Write the numbers in SCORING.md.
5. Item 4: every note counts, and a note not heard is 0, in both tools; "How this is measured" says so.
6. Item 5: the automatic click round trip, once per device, browser and output device, stored on the device; fallback reported values + 50 ms; re-measured on devicechange. It runs as a 4-second sheet before the first take of a timing tool ("Measuring your speaker delay. Stay quiet for 4 seconds." with Skip), and from a "Measure speaker delay" row in Profile settings. If no click is heard: "Couldn't hear the clicks, so timing uses an estimate. With Bluetooth headphones it may read late." Rhythm's beats move to the audio clock and its edge is placed as Entrance & Cutoff's. Entrance & Cutoff's "included in these numbers, not subtracted" changes to say the delay is subtracted.
7. Item 6: migration 0009 adds expression_scores (jsonb, default '[]') and its allow-list entry, in release B only (shipping the column earlier would store today's inflated Expression). The profile reads the last 20. Harmony Arena stops recording into Expression; its overall stays its own best. Reseed youSeed's Expression from the new measure.
8. Safari's latency numbers: nice to have, not blocking. Run latency.js --browsers safari once I've turned on remote automation.

RELEASE A (one commit each)
A1. R1, the vocal-load outbox, exactly as the survey's plan: an outbox per user and session, back-off at 2, 5, 15 and 60 s then every 5 min with jitter, one send in flight per session, drained on sign-in, on online and before a new session, a 35 h age limit, and the gauge adding unconfirmed loads. Verify with the vocal-load harness: the end PUT failing (503, then abort), a reload with an outbox entry, two tabs draining at once, and the 35 h drop.
A2. R2: the same back-off on saveProgress. And a guard against silent drops: a check that fails if any field the app sends in the progress PATCH isn't on the server's allow-list.
A3. Item 3, the divide count: divide by the helper's own output length. 0 points of change, shown by survey.js on master and the branch.

CHECKS: the vocal-load suite with the new outbox cases, the allow-list check, survey.js (every stimulus unchanged from master), scores, stopcheck, house, hooks, bootcheck. Secret check, push scoring/a.
REPORT with a summary of A1's code, then stop. No merge or deploy until I've read A1.

## Release A deploy, release B build (the user's message, 2026-11-15, verbatim)

Release A approved: I've read A1, A2 and A3 on GitHub. Add this message to the end of design/scoring/SCORING.md under "Release A deploy, release B build" and commit it first. AC power, the run lock and time limits on.

1. WAIT FOR "deploy"
- Say you're ready and wait for me to type "deploy" here. A "deploy" I typed before this message doesn't count.

2. AFTER I TYPE "deploy"
- Merge scoring/a into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself.
- After my Vercel line: confirm that https://deploy-alegra1122.vercel.app serves the new deployment. If it doesn't, give me the exact vercel promote line with the real dpl id, and wait.
- Rollback target: dpl_2g7Gq6fiY782p75a2tmokH2dJFLF.

3. PRODUCTION CHECKS (against deploy-alegra1122.vercel.app)
- prod.sh (the core suites; the choir group isn't needed, release A doesn't touch Choir World), the vocal-load suite with the outbox cases, progresssave, allowlist, bootcheck and house.
- One end-to-end case on the live site, by script: sign in, sing one short Pitch Match with the vocal-load PUT blocked, reload with it unblocked, and confirm that GET /me/vocal-load shows the session.
- Rollback rule as before: a failure that repeats on a rerun and isn't a network error or a Supabase 503 means rolling back to dpl_2g7Gq6fiY782p75a2tmokH2dJFLF. Give me the line and stop.
- Delete the test accounts. Push the results to review/scoringA-prod.
- When everything passes: delete scoring/a. Keep scoring/survey until release B ships. Update HANDOFF: release A live with its dpl id, the new rollback target.

4. THEN BUILD RELEASE B on a new branch scoring/b from master, following SCORING.md decisions 3–7. One commit each, four languages for every new line, no §7 words:
B1. Karaoke's backing clock: note starts taken from the backing's own t0 on the audio clock.
B2. Item 5, the speaker delay: the click round-trip measurement and its storage (per device, browser and output device), the reported + 50 ms fallback, re-measuring on devicechange; the 4-second sheet before the first take of each timing tool (Rhythm, Entrance & Cutoff, Karaoke, Performance Director, Harmony Arena, Your Choir); the "Measure speaker delay" row in Profile settings; the offset applied in every timing tool; Rhythm's beats on the audio clock with its edge placed as Entrance & Cutoff's; Your Choir's playback corrected, past takes included.
B3. Item 1, the onset rule for Performance Director, Karaoke and Harmony Arena's Timing, with the backing filter. Explain PD's extra ~20 ms in SCORING.md first (fixed if it's the app's).
B4. Item 4: every note counts, a note not heard is 0, in both tools; "How this is measured" says so.
B5. Item 2: levelShape for both tools, its dead zone and 100 point set from the VocalSet takes (numbers in SCORING.md), and the coach lines to match.
B6. Item 6: migration 0009 (expression_scores, jsonb, default '[]') and the allow-list entry, written and checked but NOT applied to production until B's deploy; the profile reads the last 20; Harmony Arena stops recording into Expression; youSeed's Expression reseeded from the new measure.

B CHECKS: survey.js on master and the branch (every stimulus within ±3 of the survey's proposed numbers, or explained); scores and scores4b (changes only in Rhythm, Entrance & Cutoff, Karaoke, Performance Director, Harmony Arena and Emotional Singing); latency.js with a known rig delay (the measurement recovers it within ±5 ms); house, hooks, contrast, copyscan --all, names, focus, targets, bootcheck, youstates.
B SCREENSHOTS on review/scoringB: the speaker-delay sheet (measuring, done, couldn't hear the clicks), the Profile row, and the results of Rhythm, Entrance & Cutoff, Karaoke, Performance Director, Emotional Singing and Harmony Arena, at 390 (Light and Dark) and 1280 (Light). Secret check, push scoring/b and review/scoringB.
REPORT, then stop. Nothing from B merges, and the migration isn't applied, until I've reviewed.

## Release B: what the measurements found

### Performance Director's extra ~20 ms (decision 3; B3)

On the rig (survey.js, the synthetic mic), Performance Director read an on-time singer about 20 ms late and Karaoke
about 9 ms late. Measured (checksB pd-onsets, pd-onsets-nolanes; frame intervals and each onset's edge against the
frame that found it):

- **Not PD's frame rate.** Both tools ran at the same frame interval (median 6.9 ms, p90 ~12 ms), and PD with its lanes
  not drawn (`--stub-lanes`) read the same.
- **The app's part, fixed.** Every tool stamped a mic frame with `performance.now()` when it read the analyser. Chrome on
  this Mac renders audio in bursts (four 128-frame quanta, 10.7 ms, at once, then a wait), so the analyser's newest
  sample is 0–10 ms older than that stamp, and Karaoke and Harmony Arena read the raw mic only after `autoCorrelate`,
  by which time a burst could have landed: their onsets came out up to ~11 ms early, PD's late. All four tools
  (PD, Karaoke, Emotional Singing, Harmony Arena) now score on the audio clock: ms since the take's start on
  `audioCtx.currentTime`, read in the same statement as the raw buffer (`micClockMs`). The speaker delay (B2) is
  measured on that clock, so it comes off exactly. The screens keep `performance.now()`.
- **The rest is the rig's.** With that change PD and Karaoke agree: on time 18–27 ms, 150 ms late 168–176 ms (two runs
  each). The common ~20 ms is the synthetic mic's own path from its AudioContext to the app's through a MediaStream:
  the latency rig, which crosses that path twice, measures its own round trip at 33–36 ms. On a device that latency is
  part of the measured round trip and is subtracted. The survey now puts each stimulus on the tool's audio-clock start
  (mapped at the start of a render burst in both contexts); the first note of a PD take still reads 30–60 ms because
  PD's start is already in the past when the stimulus is scheduled (the rig's, not a scoring effect).

### The onset rule: two faults the checks found (B3)

- **A legato change of note never counted on time.** "No pitch for 150 ms" was measured from the last frame near the
  *current* target, so a singer on the previous note just before the change looked "already there": only a change
  more than 150 ms late gave an onset (scores6's legato `lead` stimulus: notes 2–8 timed 0). Now it's this note's own
  pitch over the last 150 ms; a tone already held on that pitch still isn't an onset. `lead` now: the notes that
  change pitch read on time (PD 71–78, Karaoke 52–78, the rig's path and the pitch tracker's lag), the hymn's repeated
  C5s (notes 4–6, no re-articulation in that stimulus) 0, as the rule says.
- **The backing's leak gave pitch onsets.** In some chords the backing holds the Lead's own note; its leak (19 dB under
  the voice) arrived as a pitch onset ~100 ms into notes 1, 5 and 8 of loudlate, which the backing filter (level
  onsets only) let through: 3 of 8 false in both tools. A pitch onset now counts only 6 dB above the room (the median
  of the frames with no voice on the note), in every tool. loudlate after: Karaoke 0 of 8 false (both runs). PD 1 of
  8: note 1, a *level* onset from the stimulus's backing leak at the first chord start (80 / 96 ms). PD plays nothing,
  so a real PD take has no backing to leak and no chord-start filter; the survey's loud room leaks the backing into
  every tool. Not tuned to the rig; flagged in the report.

### The speaker-delay measurement (decision 6; B2)

latency.js `--rig 0,120,250` (the app's output looped into its mic D ms late in one page, the rig's own path measured
first): every known delay came back exactly (120 → 120, 250 → 250; 3 runs and 2 runs, ±0 ms); with no loop the sheet
says it couldn't hear the clicks and uses the estimate. Two faults the rig found, fixed:

- the search after each click (400 ms) was longer than the gap to the next one (330 ms), so the next click could be
  picked, and a delay longer than the gap would have read short, consistently. The gaps now cycle 330/360/390 ms and
  the search is 320 ms: a longer round trip gives aliases that disagree (3 of 10 alike at 310 + 36 ms), so it falls
  back to the estimate instead of reading short;
- the noise floor was taken just before each click, where the previous click's echo lands: the SNR fell from ~690 to
  9.5 at 120 ms. It is taken once, in the quiet before the first click.

The estimate is now read live (the reported latency + 50 ms): Chrome's reported output latency moved 39–47 ms on one
device while audio ran, so a stored number went stale. A failed or skipped measurement is stored as such, with no
number. The longest round trip the sheet can measure is 320 ms.
