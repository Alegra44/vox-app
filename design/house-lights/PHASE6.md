Phase 6: the six Songs-tab solo tools and the Songs tab. Work on redesign/phase6 (it has PHASE6_SURVEY.md). Save this message as design/house-lights/PHASE6.md and commit it first. No merge or deploy until I've reviewed the screenshots. Rollback target: dpl_7wMjFuZHdg3XE479UaD9N41gWCBY. AC power only, one verify script at a time.

DECISIONS
- Survey bugs 1–3, 8 and 9 are fixed here.
- Bugs 4–7 (Timing counts a voice that's already sounding; Dynamics and Expression on a steady tone; Karaoke/PD dividing note pitch by the wrong count; the two Timing averages) change scores, so they're not in this phase. Add them to HANDOFF as a "scoring accuracy batch" for after the redesign, together with the Rhythm / Entrance & Cutoff latency item.
- The two "Performance Report"s: Choir World's keeps the name. Performance Director's result becomes "Your performance" (fr "Votre performance", es "Tu actuación", tr "Performansınız").
- AI Duet Partner is renamed "Sing With the Choir" (fr "Chanter avec le chœur", es "Canta con el coro", tr "Koroyla söyle"): it's the app's synthesised choir, not an AI. Grep scripts/ first.
- HOUSE_LIGHTS.md → v1.9, recording these decisions.

1. GUARDS FIRST (commit before touching the app)
a) scores.js: add Stay in Key, Karaoke, Emotional Singing and Performance Director. Master vs branch, 3 runs per side, every number in the result within ±2 (or master's A/A range for values that move more than that). The display changes; the scoring doesn't.
b) house.js: all six. Down while singing or recording (Studio from Record to the end of the take; Sing With the Choir while the choir plays), up after; stopAllActiveSessions brings it up at once; #vlBreak on the stage; Start/Stop topmost; no marks left.
c) stopcheck.js: all six, leaving at 0.8 s and 2.6 s:
   - no loop flags, no vlFeed after leaving;
   - no backing pad or choir still playing (count the oscillators);
   - no result or skill score recorded after leaving;
   - Studio: a take left midway isn't saved;
   - Sing With the Choir: your part is unmuted again in Choir World's mixer;
   - Start works again.
d) Vocal load: batch1, batch2, batch3a, batch3b loads equal to master ±2.
e) warm-up tracking.js (Karaoke's roll geometry: equal, or the script changes with the roll in the same commit and you say why); vibfix and noisegate in regress mode (Stay in Key's status text); vlcompare; yc.js (MediaRecorder through Studio).
f) contrast.js, copyscan.js over the six and the Songs tab in four languages, hooks.js, navcheck (all six highlight Songs).

2. BUILD (one commit per item, four languages for every string)

2.1 Shared
- Leaving stops everything: stopAllActiveSessions stops Stay in Key, Emotional Singing and Performance Director (through their own stop paths), stops the backing pad and the choir, ends a Studio recording without saving it, and resets every button. Use the 4b.3 start token for any start that awaits.
- Every Start button shows "Start" to people who have access; "Start (Pro)" only when it's locked.
- Each tool gets a .vc-stage around its live parts and passes it to its existing singingSession. The Stop button on the stage is the neutral active pill.
- Results use .vc-result: the big number in ink, a label, the coach line (standard .hl-coach size), dimension rows, details.hl-measure with the method written from the code, a "Sing it again" / next action from the existing buttons.
- Titles lose their emoji. The BETA-style tags ("USES KNOWN BACKING TRACK", "LOUDNESS-VARIANCE PROXY") become the "Estimate" label where the reading is an estimate (Emotional Singing), and go away where it isn't (Stay in Key).

2.2 Songs tab
- The Choir World card stays first, as the one raised block.
- The six tools become .hl-item rows with icons, like the Coach tab, with "Best {value}" where a best is stored (Karaoke's songBestScores).

2.3 Studio
- Stage while recording (Performance personality: timecode, red tally, input meter, stop):
  · the red "Recording" tally and the elapsed time ("0:07 / 0:15");
  · an .hl-meter input level from the raw path;
  · a Stop that ends the take early and keeps it. Leaving discards it.
- Takes move out of progress.studioTakes into device storage (the same way Your Choir stores its takes). Existing takes move across once on load and are removed from progress, so they no longer travel with every save. The "stored locally" line is then true; check its wording in four languages.
- Each take gets Delete (with a confirm), so the three-take limit is no longer permanent.
- "BPM" goes through a key; "Recording Session" / "No XP, no streak, no gamification" become one plain subtitle.
- The "save failed" line that can never show: make it reflect a real failure, or remove it.

2.4 Performance Director
- Stage: the five-part lanes from Choir World (2.2 of phase 5) with Lead as your part, your live voice line, the playhead, the section name and its cue as one quiet line, the current note.
- Add Stop (ends the run; no score). Start comes back after a run or a stop (the briefing card returns).
- Result "Your performance": big number Pitch (the stored skill score); rows Timing and Dynamics, and Technique labelled as "Pitch and timing together"; the insight as the coach line without "real"; hl-measure with the formulas.
- Section names through sectionLabel() / section_name_*; "Begin the performance" and "Verse" keyed.

2.5 Sing With the Choir (was AI Duet Partner)
- Part chooser as .hl-seg, like Choir World's.
- Stage while the choir plays: the five lanes with your part bold, and your voice line drawn from the frames the vocal-load sidecar already reads (display only), the playhead, Stop.
- At the song's end or on Stop: the button resets, your part is unmuted in choirState, and the paper shows one line with a link to rehearse this part in Choir World.
- The button text is keyed (no innerHTML swap of English).

2.6 Stay in Key
- Stage: the chord big ("V — G Major"); the ring as closeness, filling with the lock colour in key (like the Tuner); the status line keyed ("In key" stays the protected English string; "Drifted: nearest G, +187 ct"); the song's progress meter.
- The pulse: a class toggle, no setTimeout per frame.
- Result: big number % in key, label "Time in key", the coach line, hl-measure (±35 ct of a chord tone, vibrato taken out).

2.7 Karaoke Coach
- Stage: the roll restyled in House Lights tokens: Lead notes as part-colour bars, your cursor in the voice colour, the NOW line in ink-3, a finished note marked ok or miss. The per-note % chips leave the stage (no scores while singing).
- Result: big number Pitch, row Timing, then the per-note rows (Note n · % or "Not heard"). Song Mission and Bonus objectives as rows with hl-check / an empty ring instead of ✅ ⬜ 🔥. hl-measure.
- The note chips' text is keyed.
- Leaving or Stop stops the backing pad and resets the button.

2.8 Emotional Singing
- Stage: the Lead note big, the song's progress meter, and a Loudness meter (the RMS it already reads), so you can see your dynamics while you sing.
- Result: big number Expression (the stored skill score), label "Dynamic contrast", row Pitch, the existing coach line, hl-measure, and the "Estimate" label.

2.9 Copy
- Every §7 word in the six tools and the Songs tab is rewritten in four languages.
- The hard-coded English from the survey gets keys: Stay in Key's status, Karaoke's chips, the duet button, PD's start button and section names.
- PHASE6_COPY.md: old → new in four languages.

3. CHECKS (one at a time)
- hooks, scores.js (the gate), house, stopcheck, modecheck, vocal load (batch1, batch2, batch3a, batch3b), warm-up entries and tracking, vibfix and noisegate (regress), vlcompare, yc.js, contrast, copyscan, navcheck, picker, levelup, home.js.
- Expected changes (list them; nothing else may change): the leave fixes; PD's Stop and restart; the duet mixer restore and the rename; Studio's storage, Delete and Stop; the Start label; the Songs tab rows; the Stay in Key pulse.

4. SCREENSHOTS
- Each tool idle, stage and result (Studio: recording and the takes list; Sing With the Choir: playing and after), and the Songs tab, at 390 and 1280, Light and Dark, on review/phase6 with a contact sheet. Secret check, push both branches.

5. REPORT, then stop. No merge, no deploy until I've reviewed.

WHEN I TYPE "deploy" (after my review)
1. Merge into master with --no-ff, secret check, push. Then wait: the user runs the Vercel line.
2. Check where the production address points. If it's still on the previous build, tell the user to run the promote line for the new deployment.
3. Production checks: prod.sh with WITH_CHOIR=1. Same rollback rule (a failure that repeats on a rerun and isn't a network error or a Supabase 503 → roll back to dpl_7wMjFuZHdg3XE479UaD9N41gWCBY).
4. If it passes: review/phase6-prod; delete review/phase6, review/phase6-before and review/phase5-prod; update HANDOFF.
5. Then a read-only survey for phase 7 (Progress and identity: the You hub, Journey, Dashboard, Records, Vocal Passport, Voice Health, Profile and settings), in the same form as the phase 6 survey, on redesign/phase7, with before-screenshots on review/phase7-before. Also note where Choir World runs could feed the Skill Profile (the open decision), without changing anything. Push, report, stop.

## 6.1

PHASE 6: approved after a short fix round (6.1), on redesign/phase6 after the hotfix. Save this in PHASE6.md as "6.1".
1. Sing With the Choir's "Rehearse Soprano in Choir World" link is voice blue. Make it ink with an underline, like "Why?" in 5.1.
2. Karaoke's roll is about 280 px wide at 1280. Like the Choir World lanes, it fills the stage column, up to about 760 px.
3. Startup safety net: if the page's main script throws while starting, hide the splash and show one short message with a Reload button (four languages) instead of a stuck splash. bootcheck gets a case that forces an error and expects the message.
Checks: hooks, bootcheck, house (the six tools), contrast, copyscan, warm-up tracking (Karaoke's roll). Fixshots at 390 and 1280, Light and Dark, on review/phase6-fix. Push, report, stop. Deploy as in PHASE6.md when I type "deploy".

## Deploy (2026-11-07)

"6.1 approved. Deploy phase 6 with the steps in PHASE6.md, with one change: the rollback target is the hotfix, dpl_BGXeU41kbimZ6MekBmVSNkf39BFC (not dpl_7wMj…, which has the stuck-splash bug). bootcheck runs in the production checks."
