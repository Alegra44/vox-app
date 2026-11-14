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
