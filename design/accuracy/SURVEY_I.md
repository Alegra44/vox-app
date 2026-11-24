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
