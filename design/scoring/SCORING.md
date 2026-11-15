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

### levelShape's dead zone and 100 point (decision 5; B5)

Set from VocalSet (18 clips: breathy, pp, straight, vibrato) through the real tools on the rig (checksB vocalset,
survey.js `--voice`, one run each, PD and Emotional Singing). The sd is the spread of the notes' levels in dB.

- **One level, the clips' steady stretches** (the longest stretch of each clip held at one level, normalised to −20
  dBFS; vocalset.sh has the table): sd 0.03–0.37 across all 36 takes. Score 0 every time (rule: ≤ 10).
- **The dynamic stimulus** (note levels from −12 to 0 dB): sd 3.71–3.76, score 90–92 (2 runs; rule: ≥ 85). The on-time
  stimulus at one level: sd 0.09–0.23, score 0.
- So `LS_FLAT_SD = 1.0` (2.7× the widest one-level wander) and `LS_FULL_SD = 4.0` stay: the 10 point is at 1.3 dB, the
  85 point at 3.55 dB. The texts already say 1 dB and 4 dB.
- **The whole clips aren't one-level takes,** kept for the record: VocalSet clips drift 10–25 dB over a clip and have
  phrase gaps, so notes land on breaths (straight-286 alternates −37 / −13 dBFS). They score 0–100 (sd 0.2–12.5);
  three (breathy-1743, breathy-562, pp-1717) are under the 0.012 rms gate and give no score. They can't meet the ≤ 10
  rule and weren't used to set it.
- youSeed's Expression is reseeded from real takes on this measure: [36, 49, 54] (vibrato-3131, -2961, -2417 whole
  clips, Emotional Singing).

## Release B review and deploy

Release B review: approved apart from one finding, plus one bug. Add this message to the end of design/scoring/SCORING.md under "Release B review and deploy" and commit it first on scoring/b. AC power, the run lock and time limits on. Rollback target: dpl_m7QV3oh9ZRHG6MNiqBcQxfQq6WEb.

YOUR TWO MISSES
1. PD on loudlate, 1 of 8: accepted. PD plays no backing, so a chord-start filter there would filter against a backing that doesn't exist. Note it in SCORING.md.
2. Karaoke ~7 below the proposal: your cause is right, but it shows something bigger (B7).

B7. THE ~20 ms LEFT AFTER CALIBRATION
- Every timing result in your screenshots reads an on-time singer about 19–20 ms late after the speaker delay is subtracted: Rhythm's beats 16–20 ms late (88–90%), Entrance & Cutoff's average offset 19 ms, Karaoke Timing 85, PD 88. That's ~12 points off every perfectly timed note.
- Find where it comes from and write it in SCORING.md: the onset detector (frame or hop delay), a path the click measurement doesn't include, or only the rig.
- Model a real device on the latency rig: a known output delay and a known input delay, with the "singer" starting each note exactly when the beat reaches them. After the measured delay is subtracted, an on-time singer must read 0 ± 5 ms in Rhythm, Entrance & Cutoff, Karaoke, PD and Harmony Arena, and the 150 ms late singer 150 ± 5.
- If it's the detector: one measured constant in the shared onset code, applied everywhere onsets are timed. If it's only the rig: show it, and change nothing in the app.
- Then rerun survey.js and update the proposed-numbers table in SCORING.md with the new values.

B8. "ERASE MY PROGRESS" KEEPS THE SCORES
- Its text says it deletes "range, streak, sessions, scores and history", but the score lists survive. Make it delete everything the text names: every score list (pitch, breath, agility, range, expression and the rest), the personal and song bests, the practice session count and the history. Vocal-load sessions aren't named in the text: leave them as they are.
- Test: erase on a seeded account, reload, and every list is empty and the Skill Profile reads "No score yet".

CHECKS after B7 and B8: latency-rig with the device model, survey, scores, scores4b, scores6, youstates, an erase check, hooks, bootcheck, allowlist. Secret check, push scoring/b.

If B7's 0 ± 5 ms and B8's test pass, say you're ready and wait for me to type "deploy". If either fails, report and stop.

AFTER I TYPE "deploy" (in this order)
1. Apply migration 0009 to production and confirm the column exists.
2. Deploy the api Edge Function with expression_scores on the allow-list, and confirm a progress save with expressionScores round-trips.
3. Merge scoring/b into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself.
4. Confirm that https://deploy-alegra1122.vercel.app serves the new deployment. If it doesn't, give me the exact vercel promote line with the real dpl id, and wait.
Rollback: the app goes back to dpl_m7QV3oh9ZRHG6MNiqBcQxfQq6WEb. The column and the function stay (the old app doesn't send expression_scores, so the function accepting it changes nothing for it).

PRODUCTION CHECKS
- prod.sh with WITH_CHOIR=1 (Your Choir's playback changed), scores, scores4b, scores6, the speaker-delay sheet and Profile row, an Expression score surviving a reload, the erase check, allowlist, house, bootcheck.
- Rollback rule as before. Delete the test accounts and push the results to review/scoringB-prod.

WHEN EVERYTHING PASSES
- Delete scoring/b, scoring/survey, review/scoringB and review/scoringA-prod. Keep review/phase10-prod (the redesign's record) and review/scoringB-prod. Remove the local backup/b-pre-fold branch and the scratch worktree.
- HANDOFF: release B live with its dpl id, the new rollback target; the scoring batch done.
REPORT, then stop.

(Added with the message: "after completed "deploy" directly okay": if B7 and B8 pass, go on to the deploy steps without waiting for "deploy".)

## Release B review: what B7 and B8 found

### PD on loudlate, 1 of 8 (accepted)

Performance Director plays no backing, so it has no chord-start filter: a filter there would filter against a backing
that doesn't exist. The survey's loud room leaks the backing into every tool, PD included, and its first chord's start
reads as an onset on note 1. On a real device PD's mic hears no backing of the app's.

### B7: the ~20 ms left after calibration

**Where it came from: mostly the rig, and 5–10 ms of detector.** The screenshots (shotsB) and the survey sing through
synthmic.js: the "singer" is a second AudioContext whose MediaStream reaches the app's mic about 20 ms late (the hop
measured in B3). On those pages the stored speaker delay is the rig's 0 ms, so that hop is never subtracted; on a real
device the singer's voice and the click take the same path into the mic, and the click round trip covers it.

To see what's left, device.js models a real device inside the app's own AudioContext, with no hop: the app's output
goes through a known output delay (a DelayNode: the speaker) into a room (−30 dB, a −60 dBFS noise floor), and through a
known input delay (the mic) to the app; the device reports its latencies honestly. The singer is a source in the room
that starts each note exactly when its beat reaches the room (PD: when the song's time reaches it, PD plays nothing).
On that rig, with the app as it was, an on-time singer read:

| Tool | On time | 150 ms late |
|---|---|---|
| Rhythm | +10 (click leak at −20 dB) / +6 | +4 / +8 |
| Entrance & Cutoff | +4 to +6 | +4 to +6 |
| Karaoke | +2 or +10 (per note) | +1 to +25 |
| Performance Director | +12 (notes 2–8), +0 to +4 | +0 to +12 |
| Harmony Arena | +2 to +3 | +9 (note 1 +30) |

Not one constant: three faults in the detector, each now fixed in the shared onset code.

1. **A pitch onset wasn't back-dated.** When a voice starts from silence, the pitch tracker often finds it a frame
   before the level has risen 9 dB, and that pitch onset was stamped at the frame's time, ~10 ms after the edge (the
   per-note +2 or +10). Now a pitch onset whose level rose is placed at the level edge, as a level onset is; a legato
   change of note (the voice sounding throughout, no edge) has the pitch tracker's lag taken off: **ONSET_PITCH_LAG_MS
   = 30**, measured on the device rig (`--legato`: 20–38 ms over 24 changes in Karaoke, PD and Harmony Arena).
2. **Rhythm and Entrance & Cutoff placed an edge at the voicing threshold (0.02 rms)**: 4–8 ms into a 40 ms attack, later
   for a quieter singer, so a constant can't correct it. Every tool now places an edge by one shared rule
   (`onsetEdgeThr`: 4.5 dB over the floor before the voice, at least 0.01).
3. **A pitch onset held off the next onset for 150 ms.** Where a backing chord holds the Lead's note, the backing's leak
   gives a quiet pitch onset just after the chord start; it is dropped at the end (not above the room), but it had
   already held off the singer's onset just after it (Karaoke, 150 ms late, +20–25). Now only a level onset holds off.
   With a legato singer no frame shows the room, so a pitch onset is also dropped when it is more than
   ONSET_PITCH_UNDER_DB (15 dB) under the singer's own level (the take's 90th-percentile frame).

The ~2–3 ms left is where a 40 ms attack crosses the edge threshold: when the voice becomes audible over the room, which
is what "the note's start" means here.

**The device rig after the fixes** (device.js, the checksB `device` step, run checksB-2026-11-15T20-12-53: two
devices, output/input 40/25 ms and 150/40 ms; the sheet measures each round trip exactly, 65 and 190 ms). Mean error
per take, ms (reading − where the singer actually started), 8 of 8 notes heard in every take. **DEVICE: PASS, 22 of 22.**

| Tool | 40/25 on time | 40/25 150 late | 150/40 on time | 150/40 150 late |
|---|---|---|---|---|
| Rhythm | +3.0 | +2.0 | +2.0 | +1.0 |
| Entrance & Cutoff | +2.6 | −0.3 | +2.5 | +0.8 |
| Karaoke | +2.3 | +1.4 | +2.5 | +1.9 |
| Performance Director | +2.4 | +2.0 | +1.8 | +2.3 |
| Harmony Arena | +1.9 | +2.0 | +2.0 | +3.0 |

Single notes: −4 to +4 ms. (PD's first note is scheduled 14 ms late by the rig, since its start time had already
passed; its reading, 16, is compared with that.)

For the record (not gates): at a −20 dB room (the app's own sound as loud at the mic as a singer's attack; a mic with
echo cancellation, as the app's, takes most of it out) Rhythm, PD and Harmony Arena still read 0 ± 5 and 150 ± 5, and
every tool reads 0 ± 5 on time, but two late cases don't: Entrance & Cutoff takes the choir's own sound for the late
singer's entrance (~30 ms), and Karaoke's late singer reads +15 (the backing raises the floor the edge is placed from).
Legato (`--legato`): the mean of each take within ±5 except Harmony Arena 150 ms late on 40/25 (+5.2); single changes
−9 to +9 ms (the frame interval).

### B8: "Erase my progress" keeps the scores

PATCH /me/progress merges, and the erase saved only the range, streak, session count, last practice date and history,
so every score list, every best and the Choir World record survived, and came back with the save's reply. Now
PROGRESS_ERASED names every column the text covers, each at its default: the range; the streak; the session count, its
dates, today's count and the session snapshot; every score list (pitch, agility, breath, expression, note attempts,
One Take, daily metrics, weekly log, breakthroughs); every best (song bests, glider, bridge, harmony, rift, breath,
bridge seconds, boss wins and the last boss weakness); Choir World's readiness (its runs are scores and history); the
history, timeline and daily weighting. Kept, not named: XP and level, the Journey's days, the achievements already
shown, the "tried"/"used" flags, the warm-up count, and the vocal-load sessions (their own table).

Also found: a save already in flight when you erase (the page's own, sent a few ms before) could land after the erase
and its reply merged the old row back (1 of the first 2 runs). The erase now waits for any save in flight first.

erasecheck.js: an account seeded with every one of those columns, erased, reloaded: every column at its default on the
server and in the page (what the app rebuilds on load, empty: today's session snapshot with no skill, Choir World's
empty lists, an even plan weighting), XP kept, the Skill Profile empty and Home's focus "No score yet". Expression's
list is checked once 0009 is on the backend (production, after the deploy).

### The survey after B7 (proposed numbers, updated)

survey.js on the branch, 2 runs (checksB-2026-11-15T20-12-53 `survey-branch`). A cell is the median, with both runs in
brackets when they differ. "Survey" is the number the survey proposed (SCORING_SURVEY.md, measured on the scratch
build); "B" is this branch now. The survey's rig still carries its own ~20 ms MediaStream hop, which no stored speaker
delay subtracts there (0 ms on the rig). At 0.6 points per ms that is ~12 points, so on time reads ~88, not 100. On a
real device the click's round trip covers that path (the device rig above: 0 ± 3 ms).

| Stimulus | PD Timing, survey | PD Timing, B | Karaoke Timing, survey | Karaoke Timing, B |
|---|---|---|---|---|
| steady | 0 | 0 | 0 | 0 |
| ontime | 83.5 (83/84) | 86.5 (86/87) | 96 | 89 (88/90) |
| late150 | 0 | 0 | 6.5 (7/6) | 0 |
| silence | 0 | 0 | 0 | 0 |
| loud | 87 | 84.5 (84/85) | 90.5 (90/91) | 87.5 (86/89) |
| dynamic | 81.5 (82/81) | 82.5 (83/82) | 92.5 (92/93) | 86 |
| skips (every note) | 65.5 (65/66) | 64 | 70 (69/71) | 66 (67/65) |
| loudlate | 16.5 (17/16) | 6.5 (7/6) | 2.5 (3/2) | 0 |

| Stimulus | PD Dynamics, survey | PD Dynamics, B | Expression, survey | Expression, B |
|---|---|---|---|---|
| steady, ontime, late150, loud, skips, loudlate | 0 | 0 | 0 | 0 |
| silence | — | — | — | — |
| dynamic | 91 | 91.5 (92/91) | 90 | 90 |

- **PD and Karaoke now read the same on time** (86.5 and 89, within the run-to-run spread). Both read the rig's hop
  and nothing else. Before B7, PD read 83.5 against Karaoke's ~86.5, which was the pitch-onset fault (fix 1).
- **Karaoke's survey 96 was too high.** The scratch build stamped Karaoke's frames ~11 ms early (B3), which cancelled
  most of the hop.
- **late150:** 0 in both tools. 150 ms late plus the hop is ~170 ms, past the formula's zero (166.7 ms).
- **loudlate:** PD 1 of 8 notes takes the backing leak for an onset (accepted, above); its score is 6.5 against the
  survey's 16.5 (3 of 8 then).

### Checks after B7 and B8 (checksB-2026-11-15T20-12-53)

latency-rig, device, allowlist, survey-branch, scores, hooks, bootcheck, youstates and erasecheck all PASS. scores4b and
scores6 "fail" their master-versus-branch gate only where B changes scores, as expected:
- **scores:** no differences.
- **scores4b:** Rhythm only. onbeat 82 → 91 and late60 48 → 55 (the audio clock, B2, and now the shared edge rule).
  Emotion Mode's stability 77/87 is the same swing master shows.
- **scores6:** Performance Director, Karaoke and Emotional Singing only (held tone: Timing and Expression 0; legato
  Lead: the notes that change pitch near on time, the repeated C5s 0). After B7 the legato notes read higher than in B
  before B7 (PD 74 → 86–92 per note, Karaoke 65–78 → 83–92): the legato lag is taken off. Stay in Key is unchanged.
- **erasecheck:** 6 of 6. Expression's list will be checked on production once 0009 is applied.
