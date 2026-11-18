# The speaker guard, again: a real-device survey

Branch `survey/guard` from master (b08a3ca, release D live). No app changes yet. Release D's D3 (the guard) passed the
loop rig and failed on this Mac's own speakers; it was reverted (RELEASE_D.md, "Review and deploy"). The step, from the
user's review of 2026-11-18 (also in design/accuracy/RELEASE_D.md), verbatim:

> 5. THEN THE GUARD AGAIN, AS A REAL-DEVICE SURVEY (no app changes yet). Branch survey/guard from master. Save this step as design/accuracy/GUARD.md and commit it first. It plays sound out loud: only between 09:00 and 21:00 my time, and tell me before each loud part.
> a) Release B's speaker-delay sheet on this Mac with the echo canceller on: 10 runs at 50% volume and 10 at 100%. How often it hears the clicks, and what it reads against a reference taken with the canceller off. If it often misses them, try a short chirp or a held chord for the measurement, and a separate canceller-off stream used only for those 4 seconds, and compare.
> b) The guard on this Mac's speakers, canceller on, nobody singing, at 50% and 100%: your held chord plus a cautious default together, and learning during the lead-in made robust (a low quantile of the lead-in, with a cap so an early singer can't raise it much). Pass: nothing credited in Entrance & Cutoff, Rhythm, Harmony Arena and Harmony Memory.
> c) A real voice that isn't the Mac's own output: tell me which VocalSet file to put on my phone and when to play it next to the Mac (or I'll sing). Pass: each approach scores that voice within ±3 of the same recording with headphones on the Mac.
> Write the numbers in GUARD.md with your recommendation and its effort. Secret check, push survey/guard. REPORT, then stop.

Standing rules from the same message: AC power, the run lock and time limits on.

## How it's measured

Scripts in scripts/guard-verify/ (on this branch); the approaches live in a local scratch build, `scratch/guard`
(master + D3's output bus and guard, never pushed), switched per page by `window.__guard`; no app change on this branch.

- **a, `sdreal.js`:** release B's own `sdMeasure` ×10 per volume with the canceller on (the app's stream) and ×5 on a
  page whose mic has the canceller off (the reference); then three probes ×10 each, on the app's stream and on a
  separate canceller-off stream opened for that measurement only: the 2 ms click, a 20 ms chirp (0.5–6 kHz), a held
  chord (0.3 s, C major). Per run: how many it hears, the delay, and the gain (output → mic amplitude).
- **b, `guardreal.js --real`:** per page the scratch build's measurement (clicks, then three held chords: the chord's gain),
  stored as the app stores it, then the tool, nobody singing, at 50 % and 100 %:
  - `off`: no guard, the control (what the room's bleed credits);
  - `chord`: the chord's gain, the larger of it and a cautious default (`--def`);
  - `leadin`: learned in the take's lead-in (the count-in, with a pad of the first chord added so there's a sustained
    sound; Arena gets a 4-beat lead-in it doesn't have now): mic ÷ the output one delay earlier over 100 ms blocks, the
    20 % quantile, at most a cap (`--cap`); none learned → the default.
  The lead-in pad and Arena's lead-in are app behaviour changes the leadin approach needs; they're in the scratch build
  only. Checked silently on the loop rig first (−10 and 0 dB): `off` credits Entrance and Cutoff 8/8, Arena 94–95 %, Rhythm
  8/8; `chord` and `leadin` 0 in every tool (learned 0.26–0.31 against a true 0.3; capped at 0.6 at 0 dB).
- **c, `phonetrack.py` + `guardvoice.js`:** the phone plays a track built from VocalSet straight-625.wav (its steadiest
  1.6 s, ~A4, pitched to each note and looped): per tool a 2 kHz sync beep, then the voice on that tool's timeline (the
  Alto part for Entrance & Cutoff, Memory and Arena; 8 onsets for Rhythm). The script hears the beep on the app's mic path
  and starts the tool so its timeline lines up with the voice (a fixed delay stored in every condition, so only the guard
  differs). Headphones file (1 pass, guard off): the reference. Speakers file (4 passes): chord and leadin at 50 % and
  100 %. Pass: each within ±3 of the headphones pass. Checked silently (the track fed in as the mic): Entrance 8/8 acc 96,
  Cutoff 8/8 acc 92, Arena 98 %, Memory 8/8 100, Rhythm 8/8 acc 99; the beep found within 7 ms.

## Results

(Filled in as each part lands.)
