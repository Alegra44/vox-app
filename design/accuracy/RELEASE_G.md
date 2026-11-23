# Release G: the octave hold for Pitch Dragon and the Rift (silent)

Branch `accuracy/g`, from master 84703d0 (release F live). The user's step, verbatim (2026-11-23):

> 4. THEN RELEASE G, silent: the octave hold for Pitch Dragon and the Rift. New branch accuracy/g from master. Save this step as design/accuracy/RELEASE_G.md and commit it first.
> - RELEASE_D.md measured them: at 10 dB, up to 73 of 279 windows (babble) lose a quarter or more of their frames to octave slips.
> - Use Pitch Mountain's median-of-5 hold in both: the same function, shared, not a copy.
> - Pass: at 10 dB, the windows losing 25% or more are cut by two-thirds or more in babble, talker and TV; at 20 dB, 2 or fewer; white stays 0. A real octave leap costs no more than +67 ms, and the falling fifth 70 ms or less. Clean takes unchanged (scores, scores4b and gamestates within their gates).
> - Also list any other tool that drops off-target frames the same way, with its numbers (measure only).
> - Secret check, push accuracy/g. REPORT, then stop. Nothing from G merges until I've reviewed.

## Where it starts (RELEASE_D.md, D2)

Pitch Dragon and the Rift drop a frame 300 ct or more from the target, so an octave slip costs frames, not a crash.
1.6 s windows (279 per cell) losing ≥25 % / ≥50 % of their frames to octave errors, no hold:

| | white | babble | talker | tv |
|---|---|---|---|---|
| 20 dB | 0 / 0 | 9 / 2 | 8 / 1 | 8 / 1 |
| 10 dB | 0 / 0 | 73 / 25 | 38 / 7 | 45 / 17 |

Gates at 10 dB (≥25 %): babble ≤ 24, talker ≤ 12, TV ≤ 15; 20 dB: each ≤ 2; white 0.

## What was built (accuracy/g)

- **G1** (e839cfb): Pitch Mountain's hold is now `makeOctaveHold()`, one function (`window.gliderPitchGuard` points at
  it; octave.js checks they are the same object). Pitch Dragon: `bossLoop` puts its readings through one hold a battle,
  the pitch boss only (`bossOctaveHold`). The Rift: `captureAccuracyForTarget(…, {octaveHold: true})`, a new hold for
  each round (one note each). Only the cents the games score pass through it; onset and loudness don't.
- **G2** (5c98589): `scripts/accuracy-g/octave.js` (offline, D2's method and windows) and `checksG.sh`.

## Result: the gate fails

1.6 s windows (279 a cell) losing ≥25 % / ≥50 % of their voiced frames to octave errors (out/octave-branch.log). The
"none" column reproduces RELEASE_D's table exactly.

| | none | Pitch Dragon (hold) | the Rift (hold) | gate (≥25 %) |
|---|---|---|---|---|
| 10 dB babble | 73 / 25 | 73 / 30 | 75 / 30 | ≤ 24 ✗ |
| 10 dB talker | 38 / 7 | 42 / 7 | 42 / 8 | ≤ 12 ✗ |
| 10 dB TV | 45 / 17 | 50 / 16 | 50 / 17 | ≤ 15 ✗ |
| 20 dB babble | 9 / 2 | 8 / 2 | 8 / 2 | ≤ 2 ✗ |
| 20 dB talker | 8 / 1 | 10 / 1 | 10 / 1 | ≤ 2 ✗ |
| 20 dB TV | 8 / 1 | 10 / 1 | 9 / 1 | ≤ 2 ✗ |
| white, 10 and 20 dB | 0 / 0 | 0 / 0 | 0 / 0 | 0 ✓ |

At each game's own lengths it's the same picture (Pitch Dragon's 2.86 s chord at 10 dB babble 36 → 37; the Rift's
1.4 s round 79 → 78, 0.65 s 155 → 155; talker and TV a few windows worse). Leaps (the gate's other half) pass:
A3→A4 0 → 50 ms, A4→A3 0 → 17 ms (≤ +67), the falling fifth A4→D4 0 → 0 ms (≤ 70). Clean VocalSet: the hold changes
57 of 11,930 voiced frames in Pitch Dragon, 74 in the Rift's 1.4 s rounds.

**Why:** the slips these windows lose are long. At 10 dB, octave-error frames by the length of the run they're in
(out/octave-runs-10dB.log):

| | 1–4 frames (what a 67 ms hold can cover) | 5–15 | 16+ |
|---|---|---|---|
| babble | 768 (42 %) | 597 (32 %) | 480 (26 %) |
| talker | 208 (19 %) | 420 (39 %) | 456 (42 %) |
| TV | 329 (25 %) | 426 (32 %) | 577 (43 %) |

Pitch Mountain's crashes came from the short slips (a glider survives a long wrong stretch only if it's short), so the
hold fixed them; a window losing a quarter of its frames is made of the long ones. After 4 frames the hold lets go, the
median of the last 5 then moves onto the wrong octave, and when the reading comes back it is held there for up to 4
more frames: hence a few windows worse. A longer hold would cost a real octave leap more than +67 ms (4 frames is the
gate's limit). So no setting of this hold passes both halves.

Not done, since G fails its first gate: scores, scores4b and gamestates (checksG.sh has them ready).

## The other tools that drop a frame ±300 ct from the note (no hold; measure only)

Windows losing ≥25 % / ≥50 % of their voiced frames to octave slips, at each tool's window length (same voices):

| tool (window) | 20 dB babble / talker / TV | 10 dB babble / talker / TV |
|---|---|---|
| Pitch Match, Interval, custom notes, Harmony Memory, Eve, Boss training (1.6 s, of 279) | 9/2 · 8/1 · 8/1 | 73/25 · 38/7 · 45/17 |
| the five-note loop (1.5 s, of 298) | 9/3 · 11/0 · 10/0 | 74/26 · 45/9 · 53/17 |
| Scales (0.65 s a note at the fastest level, of 643) | 17/5 · 25/11 · 25/8 | 155/69 · 91/35 · 107/47 |
| Karaoke, Performance Director, Emotional Singing, Harmony Arena, the other bosses (a chord, 2.86 s, of 154) | 4/1 · 3/0 · 4/0 | 36/10 · 19/2 · 26/7 |

Also dropping off-note frames, not windowed above: One Take (runOneTake), the drills (runDrillSequence), Song
onsets (makeOnsetTracker: a note kept only if 3 of the next frames are within ±300 ct), and the vibrato gate's outlier
filter (vibratoGate: points 300 ct from the take's median).

## Decision (the user's review, 2026-11-23): not shipping

Release G is not shipping, and accuracy/g stays pushed as a record; it does not merge. Crediting a reading an octave
from the target note was rejected: a singer who really is an octave off would score as right. And the problem only
bites in a very noisy room (10 dB); at 20 dB it is about 3 % of windows.

Queued in HANDOFF: "Octave slips in noisy rooms: a short hold can't bridge long slips. The next idea is in the detector
itself (prefer the octave that continues the last steady pitch when both peaks are close), which touches every tool,
so it waits."
