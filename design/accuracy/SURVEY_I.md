# Survey I: the pitch detector's octave decisions in noise (silent)

Branch `survey/octave`, from master 6913a1e (release F live, dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h; release H reverted).
No app changes on this branch: trial ideas live on a local scratch branch only (`scratch/octave`, never pushed).
Background: release G (design/accuracy/RELEASE_G.md, accuracy/g, not shipping) showed a short hold can't bridge the
long slips; HANDOFF's queue: "the next idea is in the detector itself (prefer the octave that continues the last
steady pitch when both peaks are close), which touches every tool, so it waits."

## The user's step (verbatim)

From the release H review (2026-11-23), step 4:

> 4. THEN SURVEY I, silent: the pitch detector's octave decisions in noise (the deeper fix release G couldn't make). Branch survey/octave from master. Save this step as design/accuracy/SURVEY_I.md and commit it first. No app changes; trial ideas on a local scratch branch only.
> - Measure per detector frame, on VocalSet takes in babble, talker, TV and white at 10 and 20 dB: how often the detector picks the wrong octave, and how long the wrong runs last.
> - Try a continuity rule in the detector itself: when the candidate an octave away and the one continuing the last steady pitch are close in strength, keep the one that continues. Tune how close "close" is.
> - Pass to aim for: wrong-octave frames at 10 dB cut by half or more; at 20 dB, 1% or less; a real octave leap recognised within 67 ms; clean takes unchanged in every tool (scores, scores4b, scores6, gamestates, survey.js within their gates).
> - Every tool uses this detector, so list them all and what each would gain.
> - Secret check, push survey/octave. REPORT, then stop.

And from the H2 step (2026-11-24):

> 4. THEN SURVEY I, silent, exactly as in my last message (the detector's octave decisions in noise, on survey/octave from master; no app changes).
>
> REPORT, then stop. Nothing merges or deploys until I've reviewed H2.

## Method

scripts/survey-i/octave.js, offline in a page of master's build (RELEASE_G's method, which it reproduces: 10 dB babble
at 1.6 s, 73 / 25 windows): 18 VocalSet takes (11,930 voiced frames), each mixed with white, babble, talker and TV noise
at 20 and 10 dB, through the pitch path's two 1.5 kHz low-passes, read at 60 frames a second. Truth: the same frame of
the clean take. A wrong octave: 9–15 semitones from it. The trial detector is a copy of the app's `autoCorrelate` with
its autocorrelation kept (checked against the app's every 400 frames: identical), plus the rule. Outputs:
scripts/survey-i/out/ (full.log/json: every cell; grid-*.log: the tuning on 10 dB babble).

## 1. How often the detector picks the wrong octave, and how long the runs last (master)

| | wrong-octave frames | of them reading low | runs 1–4 / 5–15 / 16+ frames | longest |
|---|---|---|---|---|
| 20 dB white | 2 (0.02 %) | 0 | 2 / 0 / 0 | 1 |
| 20 dB babble | 208 (1.74 %) | 206 | 140 / 68 / 0 | 13 |
| 20 dB talker | 292 (2.45 %) | 289 | 56 / 103 / 133 | 24 |
| 20 dB TV | 288 (2.41 %) | 286 | 69 / 176 / 43 | 26 |
| 10 dB white | 18 (0.15 %) | 14 | 18 / 0 / 0 | 2 |
| 10 dB babble | 1,845 (15.47 %) | 1,822 | 768 / 597 / 480 | 76 (1.3 s) |
| 10 dB talker | 1,084 (9.09 %) | 1,078 | 208 / 420 / 456 | 70 |
| 10 dB TV | 1,332 (11.17 %) | 1,329 | 329 / 426 / 577 | 69 |

**Almost every wrong octave is the detector reading an octave low** (99 %): the autocorrelation's peak at twice the
period beats the one at the period. Noise rarely pushes it an octave up.

**Most wrong runs have no steady pitch before them to continue.** Each run, by what the 4 frames before it were:

| | after 4 right frames on the same note | after the note's start | after a dropout (no reading) | after another wrong reading |
|---|---|---|---|---|
| 20 dB babble | 51 | 97 | 0 | 60 |
| 20 dB talker | 114 | 152 | 15 | 11 |
| 20 dB TV | 95 | 132 | 16 | 45 |
| 10 dB babble | 175 (9 %) | 658 | 335 | 677 |
| 10 dB talker | 492 (45 %) | 316 | 165 | 111 |
| 10 dB TV | 383 (29 %) | 486 | 319 | 144 |

## 2. The continuity rule, tuned

In the detector: when the reading is an octave from the last steady pitch and the ACF's peak near half or twice its lag
continues that pitch (±1.5 st), and the two are close in strength, the continuing one is kept. Strength: the ACF over
its overlap, so the short lags' built-in advantage doesn't count. "Close" has to be set per direction, because a voice
that repeats every T also repeats every 2T: the old, lower octave always reads about as strong as a real upward leap.

- **Upward** (keeping the longer lag: the reading went an octave high): with ε 0.02 it held real upward leaps 400 ms in
  10 dB babble and made long runs longer (16+ frames 480 → 793). Since noise almost never pushes the reading up, the
  best setting never applies it.
- **Downward** (keeping the shorter lag: the reading slipped an octave low): δ from 0.05 to 0.7. Below 0.2 it barely
  fires (the right peak is often much weaker than the wrong one). From 0.3 up it plateaus.
- **The steady pitch:** the median of the last S readings within ±1 st; S 2 catches more than S 4. Kept through G frames
  of gaps (10, 30, 60: no difference).
- **Release:** K frames in a row kept, then the reading goes as read. K 4 (67 ms) is the leap gate's limit.
- Tried as well: an earlier ACF peak ≥ k × the highest kept when it continues the steady pitch (k 0.5–0.85): no better
  (10.7–12.2 % at 10 dB babble). And, for comparison only, the same without the continuity (the first peak ≥ 0.85 × the
  highest): 8.5 %, but it changes 246 clean frames (125 to another octave).

Grids: 65 settings on 10 dB babble (grid-babble10.log, grid2-babble10.log). The full run (all cells), the settings
that stood out:

| wrong-octave frames | master | **A**: δ 0.5, up never, S 2, no release | **B**: δ 0.5, up never, S 4, K 4 | first peak ≥ 0.85 (no continuity) |
|---|---|---|---|---|
| 10 dB babble | 15.47 % | 10.58 % (−32 %) | 12.53 % (−19 %) | 8.51 % (−45 %) |
| 10 dB talker | 9.09 % | 7.15 % (−21 %) | 7.88 % (−13 %) | 7.87 % (−13 %) |
| 10 dB TV | 11.17 % | 8.16 % (−27 %) | 9.37 % (−16 %) | 8.08 % (−28 %) |
| 20 dB babble | 1.74 % | 0.68 % | 0.93 % | 1.33 % |
| 20 dB talker | 2.45 % | 1.29 % | 1.90 % | 1.84 % |
| 20 dB TV | 2.41 % | 1.20 % | 1.89 % | 1.65 % |
| 20 / 10 dB white | 0.02 / 0.15 % | 0.22 / 0.32 % | 0.08 / 0.20 % | 1.05 / 1.16 % |
| clean takes: frames changed | – | 26 (all at note starts, runs up to 12 frames) | 5 (runs ≤ 4) | 246 |
| synthetic leaps (A3↔A4, the fifth, D3→D4, D5→D4), clean and every noise | – | none later than master | none later | none later |

## Against the pass to aim for

| aim | A | B |
|---|---|---|
| wrong-octave frames at 10 dB cut by half or more | ✗ 21–32 % | ✗ 13–19 % |
| 20 dB, 1 % or less | babble ✓ 0.68; talker ✗ 1.29; TV ✗ 1.20 | babble ✓ 0.93; talker ✗ 1.90; TV ✗ 1.89 |
| a real octave leap within 67 ms | ✗ on real voices: VocalSet's own octave drops held up to 12 frames (200 ms; the 26 clean frames changed, white noise's added "up" errors). Synthetic tones pass (their half-period peak is weak) | ✓ by construction (K 4); synthetic leaps unchanged |
| clean takes unchanged in every tool | – | see section 4 |

**No setting reaches the aim.** The rule can only continue a pitch that was steady and right just before; at 10 dB
babble 91 % of the wrong frames come after a note's start, a dropout or another wrong reading (section 1). Making it
reach further (S 2, no release) is what costs the real leaps.

## 3. Every tool on this detector, and what each would gain

All 19 places that read pitch call `autoCorrelate` (deploy/index.html). Windows losing ≥25 % of their voiced frames to
octave errors, at the tool's own length (of the windows in that cell), master → B (A in brackets):

| tools | window | 10 dB babble | 10 dB talker | 10 dB TV | 20 dB babble / talker / TV |
|---|---|---|---|---|---|
| Pitch Match, Interval Match, custom notes, Eve, Boss training, Hear Your Mistake's sing-back (captureAccuracyForTarget) | 1.6 s, of 279 | 73 → 56 (44) | 38 → 31 (27) | 45 → 35 (30) | 9→3, 8→5, 8→5 |
| Sing It 5 Ways | 1.5 s, of 298 | 74 → 61 (46) | 45 → 38 (32) | 53 → 39 (39) | 9→3, 11→7, 10→8 |
| Scale Run (fastest level), the Rift's quick round | 0.65 s, of 643 | 155 → 115 (101) | 91 → 74 (71) | 107 → 84 (80) | 17→9, 25→21, 25→21 |
| the Rift's pitch round | 1.4 s, of 319 | 79 → 63 (50) | 50 → 39 (38) | 57 → 44 (42) | 10→3, 12→12, 11→8 |
| Karaoke Coach, Performance Director, Emotional Singing, Stay in Key, Harmony Arena, Pitch Dragon, the other bosses (a chord) | 2.86 s, of 154 | 36 → 25 (18) | 19 → 13 (12) | 26 → 19 (16) | 4→3, 3→1, 4→3 |

Not windowed (they read every frame live or keep their own filters), each would read fewer octave-low frames in a noisy
room, at the per-frame rates of section 2:
- the Tuner (tunerReading, initAudio's loop): fewer octave jumps on the display;
- Range Finder (initAudio's loop: the lowest and highest notes): an octave-low slip read as a "lowest note" is the
  worst case for it; fewer of those;
- Pitch Mountain (gliderLoop; already holds 4 frames, makeOctaveHold): fewer slips to hold;
- the warm-up's exercises and songs (wuExLoop, wuSongLoop), Mirror Echo (mirrorEchoLoop), One Take (runOneTake),
  Emotion Mode's rounds (runEmoRound), Harmony Memory and Hear Your Mistake's challenge (captureNoteFrame), Choir
  World's Hear me lane (cwHearFrame), Register Coach (readRegisterFrame), Voice Quality and the vibrato tools (vqCapture:
  the pitch track under the HNR and vibrato measures), Vocal Load (its pitch-weighted dose reads the same frames).

At 20 dB, where most rooms are, B leaves 1.9 % of frames wrong in talker and TV (master 2.4 %).
