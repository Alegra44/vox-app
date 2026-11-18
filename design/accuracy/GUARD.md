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

## Results

(Filled in as each part lands.)
