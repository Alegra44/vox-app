Redesign phase 4a: 14 Coach tools onto the singing and results layouts. Branch redesign/phase4a from master. No deploy until I've reviewed the screenshots.

0. SETUP
- Save this message as design/house-lights/PHASE4A.md and commit it first.
- HOUSE_LIGHTS.md → next version, recording:
  · the shared take stage and result (2.1) are the pattern for every tool scored with captureAccuracyForTarget;
  · phase 4b covers the 10 tools with their own displays.

1. GUARDS FIRST (commit before touching the app)
a) scripts/design-verify/scores.js. For every singing tool changed here, run it on master and the branch in the same run, with the fake-mic steady A4 and sharp stimuli, 3 runs per side. Compare every number in its result: score, sub-scores, cents, confidence, steps heard.
   Gate: medians equal within ±2. The display changes; the scoring doesn't.
b) house.js: add each tool from 2.2 and 2.3:
   · the house goes down at take start and comes up after;
   · no marks left afterwards;
   · stopAllActiveSessions brings it up instantly;
   · #vlBreak is visible on its stage;
   · the start button is topmost.
   Tools you don't sing into must never dim.
c) contrast.js and shots.js: for every tool, idle, stage (during a take) and result, at 390 and 1280, Light and Dark. Plus one motion sequence (Scale Run start and stop).
d) copyscan.js over all 14 tools in all four languages.

2. BUILD (one commit per item)

2.1 Generalise Pitch Match's stage and result into one reusable module, vcTake.
- Stage: target note + Hz, the lane with neighbour-note grid lines, the cents meter with labels, the readout, the lock (|c| ≤ 6), the status pill (the tool's own button and its texts).
- Result: the big number in ink, the label, the coach line, the trace from res.samples, the dimension rows, details.hl-measure.
- Pitch Match switches to it with identical output; house.js and its screenshots must not change.

2.2 The take tools on vcTake. Each one, in its existing panel:
- a .vc-stage wrapper with houseSession over the whole take (reference, cue and singing), like Pitch Match;
- singingSession at its existing call;
- onFrame passed into captureAccuracyForTarget (read-only and in try/catch, as now);
- its existing result elements restyled into .vc-result.
The tools:
· Interval Match: the target shows the interval name and the target note; the root is a quiet label.
· Scale Run: the current target note, plus the sequence as dots (.scale-dot stays: done-good / done-mid / done-low); lane per note.
· Custom Challenge: as Scale Run, over its 6-note sequence.
· Ear → Voice → Ear: both sung steps on the stage, one after the other.
· Sing It 5 Ways: the round number and its instruction as the label, the target note as now.
· Can You Hear Your Mistake?: listening (A/B) stays on paper; only the sing-back goes on the stage.
For each tool:
- the big number is its main existing score;
- the rows are its existing sub-results;
- the trace appears only where res.samples exist;
- "Sing it again" and the next action are its existing buttons (no new logic);
- hl-measure text is written from that tool's code, in en/fr/es/tr, numbers checked against the code.

2.3 Two singing tools with their own loops:
· Range Finder: on the stage, the live note big (as the Tuner) with "Lowest so far" / "Highest so far" as rows. Result: the captured range as the big value (e.g. "A2–A4"), plus semitones and the voice type it already computes.
· Breath Trainer: on the stage, the seconds as the big number, the ring (voice colour) against the target, and an .hl-meter for the level it already reads. Result: the seconds held as the big number, the target and its existing consistency reading as rows.

2.4 Screens you don't sing into (lights stay up), restyled as paper with rows instead of cards and one raised block where there's a clear action:
· Key Trainer (the piano tokens stay)
· Vocal Lab (tiers as rows; the Extended bar goes from red to the voice colour, since it's your range)
· Genre Coach (genres as an hl-item list)
· Smart Warmup (steps as rows; "Mark warmup done" ink)
· Ear Training (A/B choices as hl-seg-style buttons; correct and wrong use ok and miss)
· Vocal Puzzle (sequence playback and choices)

2.5 Vocal Puzzle never uses the mic: its start calls initAudioOnly() instead of initAudio(), so there's no mic request and no warm-up gate. modecheck.js must confirm 0 getUserMedia calls during a Vocal Puzzle round. Its Start button then gets the ink look, because it doesn't sing.

2.6 Copy and icons
- Each of these 14 tools: the title drops its emoji. Rewrite the subtitle and result copy that carry §7 words in all four languages; grep scripts/ first.
- Three new sprite icons in the 24px / 1.6 stroke style, added to house-lights-icons.svg and used in the Coach rows:
  · Sing It 5 Ways: five dots rising like a short scale;
  · Mirror Mode: a wave and its reflection across a vertical line;
  · Warmup: a half sun on a horizon line.

3. CHECKS (one at a time; on AC power)
- hooks.js
- scores.js (the gate)
- house.js
- contrast.js
- copyscan.js
- modecheck.js (Vocal Puzzle)
- listenwin, picker, pmframes, levels, loopback (Mac speakers, nobody singing: reference tails no worse)
- batch1, batch2, batch3a–c
- warm-up entries and tracking
- levelup, range reload, tt firsttick, glider-courses, home.js
Failures are re-run on master and classified. vibfix and noisegate aren't needed if scores.js passes and no scoring function changed beyond the read-only onFrame; if anything else in a scorer changed, run them and say why.

4. SCREENSHOTS
- Every tool idle, stage and result at 390 and 1280, Light and Dark, plus the Scale Run motion sequence and the three new icons.
- Push to an orphan review/phase4a and push redesign/phase4a, with the secret check before both.

5. REPORT, then stop
- Commits; scores.js table; house and contrast results; the suite table; the copy table in four languages; anything you couldn't fit the pattern.
- No merge and no deploy until I've reviewed. The rollback target for this phase is dpl_6FBgCU661see6RBdPhXoMniCp42s.

4a.1 FIX ROUND (user's review, 2026-10-22)
Approved as built: Ear → Voice → Ear step 5 with no live guide and no note name (no live lane); Range Finder's captured-notes rows; Pitch Match's full-width attack/landing rows (list them in the report as the one expected change from master); per-note rows instead of a trace for Scale Run, Custom Challenge and Sing It 5 Ways; the half-faded lock (a 120 ms transition, not a bug).
Work on redesign/phase4a. AC power only, one verify script at a time. Ask the user before pushing anything.

FIXES
1. Ear → Voice → Ear says "1 points". When |delta| is 1, use new keys eve_note_better_one / eve_note_dropped_one: en "1 point higher / 1 point lower", fr "1 point de plus / de moins", es "1 punto más / menos". Turkish has no singular form, so the tr _one keys use the current text.
2. "No signal" is hard-coded in English in Custom Challenge's result rows and in Ear → Voice → Ear's step note. New key take_not_heard: en "Not heard", fr "Non entendu", es "No se oyó", tr "Duyulmadı". Same size as the other row values, in ink-3. Mirror's "No signal at this moment" stays for 4b (on the 4b list in HANDOFF).
3. Custom Challenge result rows: numbered like Scale Run ("1 · A4"), because a sequence can repeat a note.
4. Smart Warmup: remove the emoji from warmup_step1_title, warmup_step2_title, warmup_step3_title in all four languages ("1. Lip trill siren"). Replace warmup_stylescale_suffix with a template key warmup_stylescale: en "{genre}-style scale", fr "Gamme de style {genre}", es "Escala de estilo {genre}", tr "{genre} tarzı gam".
5. Breath Trainer:
   - The amber glow at the top of the stage (setVoiceAmbientTarget(…, [232,163,61])) uses the voice colour like the Tuner does (--hl-voice for the current theme), with the same cap.
   - The bar under the ring gets a label above it, small and ink-3: breath_level_label: en "Loudness", fr "Volume", es "Volumen", tr "Ses düzeyi"; the same key for its aria-label (now hard-coded "Level"). Its empty track takes the vocal-load bar's track colour, so it shows on the dark stage.
   - While a hold runs, the button looks like the active button on the other stages (neutral outline and dot, like "Listening…"), not voice blue. The label stays "Stop". Rule 1: the voice colour is for starting to sing, not for stopping.
   - Seconds: one format everywhere on Breath (ring, target line, result number, Duration row): one decimal from Intl.NumberFormat in the current language, a no-break space and "s" ("5.5 s", fr "5,5 s"). Display only; stored values unchanged.
6. Vocal Lab tiers are a record, not the live voice: no voice colour. In ink by reliability: Extended --hl-ink-3, Comfortable --hl-ink-2, Reliable --hl-ink, opacity 1. A tier covering a single note gets a minimum width of 8 px at its position.
7. Daily Exercises layout: flatten #panel-exercises > .key-card at every width (no background, border, shadow, radius or side padding); the tool card and the difficulty breakdown stay raised. Pitch Match changes too (intended). "Sing it again" stays on one line (white-space: nowrap); if it still overflows (scrollWidth), show "Sing it again" alone with the full text in its aria-label. Check at 390 and 360.
8. Ear Training answers don't rely on colour alone: hl-check before the correct choice, hl-close before a wrong pick (16 px, currentColor), visually hidden text ear_correct "Right answer", ear_wrong "Your pick, wrong" in four languages. Fills stay.
9. Range Finder result: "Run it again" becomes the same outline button as everywhere else.

CHECKS (branch vs master in the same run where it applies, medians of 3)
- scores.js is the gate: all tools, 3 runs per side, every score equal within ±2 (display-only changes).
- Then hooks.js; contrast.js (report the Vocal Lab fills: 3:1 or better against their track, both themes); copyscan.js (the new keys); house.js; stopcheck.js; picker; batch1.
- Secret check; push redesign/phase4a only after the user says so.

SCREENSHOTS (review/phase4a-fix, pushed only after the user says so)
At 390 Light and Dark and 1280 Light: Daily Exercises idle; Interval result (the again button); Scale result; Ear result; Custom result; Ear → Voice → Ear result, also in French; Breath stage and result; Vocal Lab; Smart Warmup, also in French; Range result. One sheet: sheets/fix.jpg.
Then stop and report. No deploy until the user types "deploy".

WHEN THE USER TYPES "deploy"
1. Merge redesign/phase4a into master with --no-ff, secret check, push.
2. From deploy/: npx vercel@62.2.0 deploy --prod --yes --scope alegra1122 (retry once on "Not authorized").
3. Production checks: prod.sh, house.js, modecheck, scores.js, stopcheck; spaced out; delete the test accounts afterwards.
4. A failing check runs once more; failing again → roll back to dpl_6FBgCU661see6RBdPhXoMniCp42s and report.
5. Delete review/phase4a and review/phase4a-fix, push review/phase4a-prod with production screenshots, update HANDOFF.md.

---

## 4a.2 COPY ROUND (user, 2026-10-22, verbatim)

4a.1 review: approved. The hooks failure is the intended removal of warmup_stylescale_suffix: record it in hooks.js as an intended removal so it passes. The house failures were Supabase 503s; the production checks run house again.

Before pushing, fix these on redesign/phase4a (copy only):

1. Breath Trainer: make "Target:" a template key, breath_target: en "Target: {s} ({level})", fr "Objectif : {s} ({level})", es "Objetivo: {s} ({level})", tr "Hedef: {s} ({level})". For the level names, use the existing Beginner / Intermediate / Professional keys.
2. Ear → Voice → Ear: new keys
   - eve_sing_back: en "Sing it back", fr "Rechantez-la", es "Vuelve a cantarla", tr "Şimdi siz söyleyin"
   - eve_from_memory: en "From memory — no replay", fr "De mémoire, sans réécoute", es "De memoria, sin volver a escuchar", tr "Ezberden, tekrar dinlemeden"
3. Ear Training answer labels:
   - ear_correct: fr "Bonne réponse", es "Respuesta correcta", tr "Doğru cevap"
   - ear_wrong: fr "Votre choix, incorrect", es "Tu elección, incorrecta", tr "Seçiminiz, yanlış"
4. French Smart Warmup: remove the space before the period in "préférence Rock ."

Re-run hooks (--base master), copyscan --tools and fixshots for the Ear → Voice → Ear stage and result and the Breath stage, in French and Turkish. Add those shots to review/phase4a-fix. Run the secret check, then push redesign/phase4a and review/phase4a-fix. Then stop and report. Don't deploy until I type "deploy".

Build note: ear_correct already existed on master as Ear Training's feedback line ("Correct!"); 4a.1 fix 8 defined it a second time, so the later definition replaced the feedback text too. The feedback line's key is now ear_feedback_correct with master's text in four languages; ear_correct is the visually hidden answer label above.

---

## 4a.3 (user, 2026-10-22, verbatim)

4a.2 review: approved. Two small CSS fixes before the merge:

1. Ear → Voice → Ear step 5: centre #eveStepNote when it shows the "From memory" phrase, to match the rest of the stage.
2. Remove the coloured mode stripes from the Daily Exercises tool card: .ex-target-card.mode-interval (--hl-sop) and .mode-scale (--brass). Every mode keeps the plain hairline top border. Part colours are only for choir parts.

Commit, run hooks (--base master), and take a fixshot of the Interval result and the Ear → Voice → Ear step 5 stage at 390 Light. If both look right, go straight on with the deploy steps from 4a.1: merge with --no-ff, secret check, push, deploy, production checks, roll back to dpl_6FBgCU661see6RBdPhXoMniCp42s if a failure repeats, review/phase4a-prod, HANDOFF.

Add these to HANDOFF:
- For phase 4b: Ear → Voice → Ear's English step headers ("Step 1 — Hear" … "Step 5 — Sing without help"), the hard-coded "Listening…" on stage buttons, and Mirror's "No signal at this moment".
- For phase 10: on Daily Exercises, the Today's Recommended Focus text is bigger than the page subtitle and its title isn't bold; Smart Warmup's "(3s)" needs a space before the unit, like everywhere else.

---

## 4a production rerun and phase 4b survey (user, 2026-10-23, verbatim)

The first production run (logs/prod-2026-10-22T10-46-51) lost the internet ~15 min in; every suite after house failed in seconds and cv-p10 hung ~19 h.

Plugged in, steady connection. Before the restart:

1. Make the run survive a dropped connection (test scripts only, no app changes):
   - Before each suite, prod.sh checks it can reach the live site and Supabase (one request each, 10 s limit). If either fails, wait 60 s and retry, up to 5 times. If it still fails, stop the whole run and say so, rather than failing every remaining suite.
   - Give each suite a time limit: 3× its usual run time, 30 min at most. A suite that hits the limit is stopped and reported as "timed out", and the run carries on.
   - Commit this on master; push it with the HANDOFF update at the end.

2. Count the leftover test accounts. If the Supabase CLI still can't sign in, tell me exactly what to type and I'll run it myself. Then delete the leftovers, including cv-p9's two.

3. Rerun the full production set against dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg: prod.sh with house, then modecheck, scores.js and stopcheck. Roll back to dpl_6FBgCU661see6RBdPhXoMniCp42s only if a failure repeats on a rerun and isn't a network error or a Supabase 503. If you roll back, report and stop.

4. If it passes: push review/phase4a-prod, delete review/phase4a and review/phase4a-fix, update HANDOFF, count test accounts (0 expected), push.

5. Then carry straight on to a read-only survey for phase 4b. Don't change any app code. For each of the 10 tools (One Take, Mirror, Rhythm, Register Coach, Register Drills, Real-Time Feedback, Vibrato, Voice Quality, Resonance, Emotion Mode), write the following into design/house-lights/PHASE4B_SURVEY.md:
   - what it measures and how it's scored (function names), and whether it already uses captureAccuracyForTarget / vcTake or has its own loop
   - its live display and its result: the element IDs, plus anything that doesn't fit the stage + result pattern (meters, charts, replays, multi-step flows)
   - whether it opens the mic, and whether it calls singingSession today
   - which verify scripts cover its scores (vibfix, noisegate, loopreal, others), and which tools have none
   - copy problems in the four languages: §7 words, emoji, hard-coded English
   - anything broken you notice (note it, don't fix it)
   Also add the three 4b items already in HANDOFF: Ear → Voice → Ear's step headers, the hard-coded "Listening…", and Mirror's "No signal at this moment".
   Take screenshots of each tool as it is now (idle, live, and its result if it has one) at 390 Light and Dark and 1280 Light. Put them on review/phase4b-before with one contact sheet.
   Commit the survey on a new branch, redesign/phase4b. Push both branches, then report. I'll write the 4b spec from the survey.
