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
