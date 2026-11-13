# Phase 10 part B: before | after

redesign/phase10 at 26b295f (B1–B10, one commit each), against master (phase 9, live as dpl_9GFdNrb4…).

## sheets/
`diff-<width>-<theme>.jpg`: every shot of the tour (tour10.js, shots pass) that differs between master and the
branch, as master | branch | difference in red. 389 of 618 shots differ.

## diffs/
- `master-vs-branch.json`: the tour diff (tourdiff.js, tolerance 24).
- `branch-vs-branch-noise.json`: the branch toured twice: 13 shots differ (Exercises' random target note, the
  warm-up stage canvas, one Genre shot). That is the noise floor; 376 of the 389 are real.
- `step-to-<commit>.json`: tours of the commits at the end of B3 (3adcecf), B4 (6c33c24), B7 (843bc1b), B8 (595aacc)
  and the final branch, each diffed against the one before (master first).
- `attribution-stable-combos.txt`: each real difference under the step(s) that made it, read in the three combos
  where every step tour was steady (390 Light, 1280 Light and Dark; the 843bc1b tour's 390 Dark and 768 Light runs
  shifted by a pixel throughout, which shows on both sides of that tour). Every difference falls under B3, B4, B8 or
  B9, except Performance Director under B5–B7: B5's section fix brought back the English Pre-chorus cue that was
  missing on master. The sheets that differ at 768 (sign-in, Language, onboarding, the paywall…) show Home behind
  the scrim, whose gutters B9 changed; at 1280 some differ by 1–4 px in one spot (x 320), below anything visible.

## checks/
- `checks10-2026-11-12T13-23-33`: contrast, 0 / 0 / 1 in Light and Dark (9403 and 9619 measured).
- `suites-2026-11-12T14-07-13`: every suite, WITH_CHOIR=1, contrast excepted (run just before). 46 of 53 pass.
- `suites-2026-11-13T04-12-21`: house, batch3a, batch3b, cv-fix again (their first runs stopped at a production
  sign-up or save that timed out): all pass.
- `checks10-2026-11-13T05-44-50`: rule1, targets, names, focus, motion, durations, datelocale, unusedkeys, onboard,
  checkout, feedback, posters, copyscan-all, navcheck, bootcheck pass. moments9 and youstates: only B8's durations
  differ from master ("15s" → "15 s"). states9 and tools stopped at sign-up.
- `checks10-2026-11-13T06-46-21` / `06-59-11`: states9 (2 differences: the share sheets close on Escape, B6) and
  tools (pass on its third run).
- `reruns/`: noisegate's flagged stimulus master vs branch (0 regressions, tunerInTune +3 within ±8) and tt-firsttick
  on the branch (fails as on master: Songs hub's Part Rehearsal button is hidden on both).
