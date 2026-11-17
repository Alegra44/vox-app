# Release D: Survey D's fixes

Branch `accuracy/d` from master (after release C went live). Survey D (`survey/d`, design/accuracy/SURVEY_D.md) stays
until D ships. The step, from the user's message of 2026-11-17 (also in design/day/DAY.md, "Deploy, and release D"),
verbatim:

> 4. THEN BUILD RELEASE D on a new branch accuracy/d from master (survey/d stays until D ships). Save this step as design/accuracy/RELEASE_D.md and commit it first. One commit per item; four languages for any new line.
> D1. Tuner: c2 (the vibrato centre only when vibratoSure). Then try the follow-up: a 1.5 s stability window that starts afresh when the readout switches to the vibrato centre. Keep it only if real vibrato stays 95% or more steady and the 10–20 ct/s glides read 20% or less; otherwise ship c2 alone and write down why.
> D2. Pitch Mountain: the octave-jump hold, with the falling-fifth case fixed first (hold only when the jump is away from the frame before it, or compare with the median of the last 3 frames; ship whichever measures better). Pass: octave crashes no worse than the survey's hold numbers, the falling fifth 70 ms or less, a real octave leap no more than +67 ms. Also measure Pitch Dragon and the Rift for the same octave crash (numbers only, into the queue).
> D3. The speaker guard, for Entrance & Cutoff, Rhythm, Harmony Arena and Harmony Memory:
> - One output bus: the app's destination connections all go through one master gain with the analyser on it (no patching of AudioNode.prototype).
> - The bleed gain measured with the speaker delay and stored with it. Devices measured before D (no gain stored) see the speaker-delay sheet once more before their next timing take.
> - When the gain is 0.5 or more, the sheet adds: "Your speakers are loud at the mic. Headphones will give truer scores." (four languages).
> - Pass: the bleed rig credits 0 in all four tools at −20, −10 and 0 dB; a real voice (voiceguard.js) within ±2 of no guard at −20 and −10 dB.
> - A real-device check on this Mac: its own speakers and mic, echo canceller on, volume at 50% and at 100%, nobody singing, a quiet room. The four tools credit nothing. (It plays sound out loud; do it during the day.)
> D4. Tests: the fake-mic browser launched per run in scores.js, and the canceller off in score runs (master and branch the same way); rebaseline.
> CHECKS: tuner, glider, bleed, voiceguard, hygiene (master against the branch); scores, scores4b, scores6 (changes only in the Tuner, Pitch Mountain, Entrance & Cutoff, Rhythm, Harmony Arena and Harmony Memory); house, hooks, contrast, copyscan --all, names, focus, targets, bootcheck.
> SCREENSHOTS on review/accuracyD: the sheet's headphones line and the re-measure prompt, at 390 Light and Dark and 1280 Light. Secret check, push accuracy/d and review/accuracyD.
> REPORT, then stop. Nothing from D merges until I've reviewed.

Standing rules from the same message: AC power, the run lock and time limits on.

## Results

(Filled in as each item lands.)
