# Release E: smooth the vibrato gate's edge

Branch `accuracy/e` from master (b08a3ca, release D live). The step, from the user's message of 2026-11-21, verbatim:

> 3. SMOOTH THE VIBRATO GATE'S EDGE: build it, on a new branch accuracy/e from master. Save this step as design/accuracy/RELEASE_E.md and commit it first.
> - List every place that switches on the vibrato gate (vibratoTolerantCents and anything else that takes raw-or-smoothed by the gate's yes/no). The Tuner's live path from D1 stays as it is unless it shares the same switch; say which.
> - Replace the switch with a blend: a gate strength from 0 to 1, from the gate's own evidence (how regular the rate is, the depth, how long it has held), and the reading as (1 − strength) × raw + strength × smoothed.
> - Pass: on survey D's 800-start sweep of stim-S1, Emotion Mode's stability spreads 3 points or less (it was 76–87). VocalSet vibrato takes and straight takes each within ±2 of today in every affected tool. The ±20 and ±25 ct wobble stimuli score no better than today. Nothing outside the list changes (scores, scores4b, scores6, survey.js against master).
> - One commit for the blend, one for its checks. Secret check, push accuracy/e. No screenshots unless something visible changes.

Standing rules from the same message: AC power, the run lock and time limits on; nothing merges, deploys or touches
production.
