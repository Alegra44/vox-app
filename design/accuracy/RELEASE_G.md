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
