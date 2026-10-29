Redesign phase 4b: the 10 Coach tools with their own displays. Work on redesign/phase4b (it already has PHASE4B_SURVEY.md). No merge or deploy until I've reviewed the screenshots. Rollback target for this phase: dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg. AC power only, one verify script at a time.

0. SETUP
- Save this message as design/house-lights/PHASE4B.md and commit it first.
- HOUSE_LIGHTS.md → v1.7, recording:
  (a) every tool that opens the mic gets a stage, take tools and live tools alike;
  (b) live tools (no take) go down on Start and up on Stop, and have no result;
  (c) a tool that already feeds vocal load itself (vlFeed / vlEnd) takes houseSession, not singingSession, so the load isn't counted twice;
  (d) where the lights should go down earlier than an existing singingSession call, add a houseSession for the lighting and leave singingSession where it is, so the load is unchanged;
  (e) "Estimate" replaces the BETA tags;
  (f) the decisions below.

1. GUARDS FIRST (commit before touching the app)
a) scores.js gets the seven take tools: One Take, Mirror, Rhythm, Register Drills, Vibrato, Voice Quality, Emotion Mode.
   - Master vs branch in the same run, 3 runs per side.
   - Every number in each result must be within ±2: scores, sub-scores, rate, depth, consistency, HNR, brightness, per-note and per-beat values, the comparisons.
   - Stimuli: the steady and sharp notes as in 4a. Rhythm: short sung onsets on the beats, plus a set 60 ms late. Vibrato and Voice Quality: also a 5.5 Hz ±40 ct vibrato tone. Emotion Mode: a second take 6 dB louder.
   - One Take: a fresh test account per run (one take a day).
b) live.js (new) covers the three live tools: Register Coach, Live Feedback, Resonance.
   - Sample their readouts at fixed times while the fake mic sings; master and branch must match.
   - Register Coach only works on master after another tool has opened the mic, so on master open the Tuner first in the same page. On the branch, use a fresh page (that's fix 2.8).
c) house.js: add all ten.
   - Take tools: down for the whole exercise as described per tool below, up after.
   - Live tools: down on Start, up on Stop.
   - stopAllActiveSessions brings the lights up at once; #vlBreak is visible on the stage; the start/stop button is topmost; no marks are left.
d) stopcheck.js: all ten, leaving at 0.8 s and 2.6 s (Mirror also while its phrase plays).
   - Expected: back to the starting state with Start working, the house up, and no mic loop left running. Vocal load must not grow over 5 s on Home afterwards.
   - One Take: a take left midway saves nothing, and today's take is still available.
e) Vocal load: the batch2 and batch3a–c loads for these tools equal master ±2.
f) contrast.js; shots.js (idle, stage, and result or stopped, at 390 and 1280, Light and Dark); copyscan.js over the ten in four languages; hooks.js.
g) navcheck (in home.js or new): opening each of the 23 Coach tools from the Coach tab highlights Coach in the tab bar, and tools in the other hubs highlight their own tab.

2. BUILD (one commit per item, every string in en, fr, es and tr)

2.1 Shared
- Tab bar: SHELL_SECTION_MAP is missing most Coach tools (One Take, Mirror, Rhythm, Register Drills, Resonance, Emotion Mode and others), so Home stays highlighted on them. Map every panel to its hub.
- Each tool gets a new .vc-stage wrapper with a new id (e.g. oneTakeStage) around its live parts. Reuse the vcTake parts: the big note, the lane, the cents meter, the readout, the status pill. Add two shared parts:
  · a time meter: .hl-meter with the elapsed share of the take, labelled with the seconds left, ink-3 on the stage;
  · a level meter labelled "Loudness" (like Breath's), for tools that read loudness.
- A tool with its own loop feeds the stage from that loop, read-only and in try/catch, logging the first error (the 4a onFrame rule). vqCapture gets the same opts.onFrame(ms, hz).
- New icon hl-alert (24 px, 1.6 stroke: a circle with an exclamation mark) for warnings. No ⚠ ✓ ○ ✅ characters anywhere in these ten tools.
- Status pills use action_listening for "Listening…" (protected English string; its en value stays the same).
- BETA HEURISTIC and BETA ANALYSIS become "Estimate" (fr "Estimation", es "Estimación", tr "Tahmin"): a quiet ink-3 condensed label after the title, no border. The limits go into hl-measure.
- Titles lose their emoji.
  · "Register Bridge" becomes "Register Coach", the name used everywhere else.
  · "Real-Time Feedback" becomes "Live Feedback" (fr "Retour en direct", es "Retroalimentación en vivo", tr "Canlı geri bildirim"), in its title and its Coach row.
  · Grep scripts/ for both old names first.
- Ear → Voice → Ear's stage headers become keys eve_stage_step1 … eve_stage_step5 (step 2 uses eve_step2_label's wording).
- Mirror's "No signal at this moment" uses take_not_heard.

2.2 One Take: singingSession stays at its call; pass the new stage.
- Stage, for the whole take (listen once, then sing): the step label, today's note big, the time meter for the 6 s, and a recording mark in --hl-miss while you sing (red is for recording). No lane and no meter: no pitch guide is the point of the challenge.
- Result:
  · big number Pitch (the stored score), label "Pitch accuracy";
  · coach line accuracyFeedback(pitch, heard);
  · the trace from the loop's own frames (keep a timestamp with each frame in its local array; display only);
  · rows Stability and Timing;
  · the expression note moves into hl-measure.
  For the rest of the day the result shows on paper with a keyed "Your next take: tomorrow".
- Fix: a take ended by leaving saves nothing, and today's take stays available.

2.3 Mirror: add a houseSession from the start of the phrase, so the lights are down for the phrase and the echo; singingSession stays at the echo.
- Stage:
  · label "Listen", then "Your turn";
  · the contour chart: the phrase in --hl-ink-3 with its note names, and a playhead across it while it plays (from its 700 ms note timing);
  · then your contour drawn live in --hl-voice;
  · legend "Phrase" / "You".
- Result:
  · big number: echo accuracy; coach line; the chart;
  · per-note rows (1 · C#3 · 82%) from finishMirrorEcho's per-note values;
  · then the replay: input.hl-fader under the chart with a playhead line on the chart, and four compact rows: Time, Phrase, You, Off by.
  · "Off by" text: within ±6 ct "On the note"; under 100 ct "{n} ct sharp/flat"; from 100 ct "{n} semitones sharp/flat" (one decimal); nothing heard: take_not_heard.
- Fixes: Play stays disabled from the phrase start until the echo ends; leaving cancels the timer that starts the echo.
- Copy: no "AI": it's a synthesised phrase.

2.4 Rhythm: singingSession stays; pass the stage. Lights down from the count-in to the last beat.
- Stage: the tempo label; "Count-in" with two small dots; then the eight beat dots (.scale-dot). The current dot is ringed, and each claimed beat takes done-good / done-mid / done-low from its accuracy. Status "Sing on each click". No lane.
- Result:
  · big number: average timing accuracy; coach line accuracyFeedback;
  · a beat chart: the 8 beats across, the offset in ms up or down from a dashed zero line, ±half a beat; your beats as voice-colour dots; missed beats as ink-3 rings at the edge, labelled "Missed";
  · a row "Beats caught: n of 8";
  · then the per-beat rows (Beat n · 23 ms late · 86%).
- Fix: leaving mid-run puts Start back.
- Output and input latency aren't compensated today: out of scope; add it to HANDOFF as a later accuracy item.

2.5 Register Drills: houseSession; pass the stage. Lights down for all five notes.
- Stage:
  · "Note n of 5", with the target register as the label (Chest voice / Head voice);
  · the note big; the lane and cents meter fed from its loop (vcTakeStart / vcTakeFrame);
  · a Chest ↔ Head .hl-meter showing the live chest score, with the target side marked;
  · the five dots.
- Result:
  · big number: average pitch; coach line from drill_result_template (rewritten);
  · a row "Register matched: n of 5";
  · then the per-note rows (1 · A#2 · 41% · Chest, with hl-check / hl-close for the match).
- Fixes: add action_listen (en "Listen", fr "Écoutez", es "Escucha", tr "Dinleyin"); leaving mid-drill resets the cards.

2.6 Vibrato and 2.7 Voice Quality: houseSession; pass the stage. Lights down for the 4 s hold.
- Stage (the same for both):
  · "Hold one note";
  · the note you're holding big, taken from the first frames, with Hz under it;
  · a lane centred on that note: no cents meter and no lock, because there's no target;
  · the time meter for the 4 s.
- Vibrato result:
  · big number: the rate ("5.6 Hz", locale decimal), label "Vibrato rate";
  · rows Depth (ct) and Consistency;
  · coach line from its existing sentences, now keyed;
  · no vibrato found → no big number, and the coach line says so;
  · the trace on a fixed scale (±100 ct, grid at ±50, axis 0 s / 4 s) instead of auto-scaling, so a straight tone looks straight.
- Voice Quality result: no big number, because it gives three readings and none of them is a score.
  · the "Measured on …" line, then the three .vq-row as ruled rows: name and value on one line, the reading under it in ink-2;
  · vq_how moves into hl-measure;
  · vq_fine becomes one visible sentence: en "These are training estimates from your microphone, not a medical assessment." The rest moves into hl-measure.

2.8 Register Coach: houseSession; pass the stage. Lights down while listening, up on Stop. No result.
- Stage:
  · the bridge diagram fitted to the stage height, so it isn't cut off at 390: head zone above, chest zone below, on stage surfaces with ink-3 labels;
  · the passaggio as a dashed line labelled with its note;
  · the marker in --hl-voice, with a --hl-warn ring while you're pushing chest;
  · under it: the zone label big, the feedback line, then Note and Clean crossing.
- Paper (idle and after Stop): Start; rows "Last crossing" (#regBridgeStat) and "Best" (#regBestStat); the sign-in line ("no best yet" gets its own key); hl-measure.
- Fixes:
  · it works on a fresh page: updateRegisterUI must not wait for analyser (only initAudio sets it); use the register input;
  · leaving resets the button;
  · crossing seconds come from elapsed time (performance.now()), not frames ÷ 60.
- Copy: no PRD or §; the mic toast drops "demo".

2.9 Live Feedback: houseSession; pass the stage. No result.
- Stage: the four checks as big rows:
  · label in condensed caps, ink-3; state at h3 size in ink;
  · icon: hl-check in --hl-ok, hl-alert in --hl-warn, a hairline ring while listening;
  · the state text carries the meaning, never colour alone.
- Paper: the four rows quiet with "—"; Start; hl-measure (what each row measures, and that nasality isn't measured).
- Fix: lfActive goes into stopAllActiveSessions, through stopLiveFeedback. Today the loop keeps reading the mic and feeding vocal load after you leave.
- Keep the protected strings "In tune", "Steady", "Pushing", "Listening…".

2.10 Resonance: houseSession; pass the stage. No result.
- Stage:
  · the particle field sized to the stage;
  · no colour literals: chest --hl-voice; mixed a 50/50 mix of --hl-voice and --hl-voice-soft; head --hl-voice-soft; idle --hl-ink-3; read from the tokens when the theme changes;
  · the zone label big (Head / Mixed / Chest, protected); Steadiness and Ripple small.
- Paper: Start and hl-measure; the canvas is live-only.
- Fix: leaving calls stopResonanceVisualizer.
- Copy: the subtitle no longer names amber, cyan or violet.

2.11 Emotion Mode: singingSession stays; pass the stage. Lights down across both takes.
- Paper: the five intentions as .hl-chip (aria-pressed), no emoji; names keyed, EMOTION_LABELS included.
- Stage: "Take n of 2 · Tender"; the note big; the Loudness meter; the time meter for the 3 s.
- Result: no big number, because it compares two takes and gives no score.
  · the heading "Powerful compared with Tender";
  · rows Dynamic range, Loudness and Pitch stability, with their differences;
  · the coach line from the existing note (rewritten); hl-measure.
- Fix: leaving mid-take resets the cards.

2.12 Copy
- Every hard-coded English string the survey lists moves to keys.
- §7 words are rewritten.
- Method text moves into hl-measure, written from the code with every number checked.
- PHASE4B_COPY.md: a table of old → new in all four languages, as in 4a.

3. CHECKS (one at a time)
- hooks, scores.js (the gate), live.js, house.js, stopcheck.js, vocal load (batch2, batch3a–c), contrast, copyscan, navcheck.
- The existing suites for these tools: vibfix, noisegate, rtfsteady, rtfsoft, regfix, vq.js, bands, cvib, brightui.
- modecheck (one mic request), batch1, picker, warm-up entries and tracking, levelup.
- Expected changes from master (list them in the report; nothing else may change):
  · Register Coach works on a fresh page;
  · a One Take left midway isn't saved;
  · crossing seconds are time-based (equal at 60 Hz);
  · the Vibrato trace scale;
  · the tab highlight.
- Failures are re-run on master and classified.

4. SCREENSHOTS
- Each tool idle, stage, and result (or stopped), at 390 and 1280, Light and Dark.
- Also: Mirror's replay mid-scrub; Register Coach at 390 (the diagram must fit); the new icon; a contact sheet.
- Push to an orphan review/phase4b, and push redesign/phase4b, with the secret check before both.

5. REPORT, then stop
- Commits; the scores.js and live.js tables; house, stopcheck and contrast results; the suite table; the copy table; anything that didn't fit the pattern.

---

## 4b.1 (the user's review, 2026-10-29, verbatim)

Phase 4b review: approved after a short fix round (4b.1). Write this into PHASE4B.md as "4b.1" and commit it first. AC power, one script at a time.

YOUR DECISIONS
1. Rhythm: accepted. Gate the average only, against the range master shows when run against itself. Per-beat values are reported, not gated (they move by one frame, 16.7 ms). Record this in scores.js.
2. Resonance: accepted. Ripple and steadiness are compared by the range of three runs.
3. batch1: not accepted yet. The branch adds vlEnd() to four stop paths, and vlEnd() ends whatever session is open, not its own, so a 4b path ending another tool's session is plausible. Before the merge:
   a) Add a test-only trace: a small in-memory ring buffer of every vlStart / vlEnd, with its caller and the run it ended. No console logging (that hid the failure last time). batch1 dumps the buffer when a session doesn't arrive.
   b) Run batch1 5 times on master and 5 on the branch, alternating.
   c) If the trace shows any vlEnd ending a session it didn't start, on either side, fix it with ownership:
      - vlStart returns its run, and each caller ends only its own: vlEnd(run) does nothing if vlRun isn't that run.
      - The idle timeout and vlSidecar's clean-up of a leftover session still end whatever is open.
      - Then check that the batch2 and batch3a–c loads equal master ±2, and run batch1 5 more times on the branch.
   Gate: the branch fails no more often than master, and every failure has a trace that explains it.

SCREEN FIXES
4. Register Coach stage: the chest zone is the same black as the stage, so it disappears. Give both zones the same visible stage surface with a hairline edge. Clamp the marker's centre inside the zones, so it never sits on the diagram's top edge.
5. Mirror at 1280: the chart is about 60% of the card's width. Stretch it to the full width, like the other traces, on the stage and in the result.
6. Rhythm's beat chart: label the axis in words, in four languages: "300 ms late" at the top, "On the beat" at 0, "300 ms early" at the bottom.
7. Stage pills say "Listening…" (action_listening) while a tool listens: Rhythm's "Running…" and Emotion Mode's "Recording" change. One Take keeps its red Recording mark, since that one really is the recording. Grep scripts/ first; if a script matches "Running…", change the script and the copy in one commit.
8. Resonance: "Ripple Rippling" says it twice. The label becomes "Movement" (fr "Mouvement", es "Movimiento", tr "Hareket"); the values stay Rippling / Calm.
9. Voice Quality's result has no heading. Add an h3 "Your tone" (fr "Votre timbre", es "Tu timbre", tr "Ses tınınız") above the measured-on line, like Emotion Mode's heading.

CHECKS
hooks, house (the 4b tools), contrast, copyscan, stopcheck, live.js (Resonance by range), scores.js (Rhythm by average), and the batch1 work in 3.

SCREENSHOTS
On review/phase4b-fix, with one sheet:
- Register Coach stage at 390 and 1280, Light and Dark
- Mirror result at 1280
- Rhythm result (on-beat) at 390
- Rhythm and Emotion Mode stages at 390
- Resonance stage
- Voice Quality result
Run the secret check, push redesign/phase4b and review/phase4b-fix, report, and stop. No deploy until I type "deploy".

WHEN I TYPE "deploy"
1. Merge redesign/phase4b into master with --no-ff, secret check, push.
2. From deploy/: npx vercel@62.2.0 deploy --prod --yes --scope alegra1122. Retry once if it says "Not authorized".
3. Production checks: prod.sh (with house), modecheck, scores.js, stopcheck, live.js, navcheck, livevq. Space them out and delete the test accounts afterwards.
4. A failing check runs once more. If it fails again and isn't a network error or a Supabase 503, roll back to dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg and report.
5. Push review/phase4b-prod with the production screenshots; delete review/phase4b, review/phase4b-fix and review/phase4b-before; update HANDOFF.

## 4b.2: the user's review of 4b.1 (2026-10-29, verbatim)

4b.1 review: approved.

- batch1: accepted. Every failure has a trace showing the session ended correctly and the save then hit a network error (503 / Failed to fetch). Network failures don't count. Add to HANDOFF: the vocal-load save has no retry, so a session whose save fails is lost (same code on master). That's a later fix: retry with back-off, keep unsaved sessions on the device until the server confirms. Also note to look into the frequent Supabase 503s.
- scores.js: values whose own master-vs-master spread is wider than ±2 are gated by that spread instead: the branch median must fall inside master's range. Record this in scores.js with the values it applies to (Mirror per-note, Voice Quality centroid, Emotion Mode "louder", Register Drills per-note).

Before deploy step 1: run Emotion Mode alone with the louder stimulus, 5 runs per side, alternating master and branch. If the branch's dynamic-range median is inside master's own range over those runs, continue with the five deploy steps in PHASE4B.md. If it's lower than master's range, stop and report without merging.
