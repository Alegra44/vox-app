# Release E: smooth the vibrato gate's edge

Branch `accuracy/e` from master (b08a3ca, release D live). The step, from the user's message of 2026-11-21, verbatim:

> 3. SMOOTH THE VIBRATO GATE'S EDGE: build it, on a new branch accuracy/e from master. Save this step as design/accuracy/RELEASE_E.md and commit it first.
> - List every place that switches on the vibrato gate (vibratoTolerantCents and anything else that takes raw-or-smoothed by the gate's yes/no). The Tuner's live path from D1 stays as it is unless it shares the same switch; say which.
> - Replace the switch with a blend: a gate strength from 0 to 1, from the gate's own evidence (how regular the rate is, the depth, how long it has held), and the reading as (1 − strength) × raw + strength × smoothed.
> - Pass: on survey D's 800-start sweep of stim-S1, Emotion Mode's stability spreads 3 points or less (it was 76–87). VocalSet vibrato takes and straight takes each within ±2 of today in every affected tool. The ±20 and ±25 ct wobble stimuli score no better than today. Nothing outside the list changes (scores, scores4b, scores6, survey.js against master).
> - One commit for the blend, one for its checks. Secret check, push accuracy/e. No screenshots unless something visible changes.

Standing rules from the same message: AC power, the run lock and time limits on; nothing merges, deploys or touches
production.

## The places that switch on the vibrato gate

Two switches read the gate (`vibratoGate`, deploy/index.html ~6138):

**1. `vibratoTolerantCents(pts)`: one note's readings, after the note.** Gate yes → every reading becomes the centre line;
no → the readings as read. Replaced by the blend (below). Its callers, every one affected:

| caller | tool | what it makes from the cents |
|---|---|---|
| `finishEmotionalSinging` | Emotional Singing | pitch: 100 − 0.6 × mean \|c\| over each note |
| `finalizeKaraokeNote` | Karaoke Coach | per-note pitch, 100 − 0.6 × mean \|c\| |
| `heldNoteCents` → `judgeHeldNote` | Harmony Memory | the note's median: held if within ±50 ct |
| `captureAccuracyForTarget` | Pitch Match, Interval Match, Scale Run, Custom Challenge, Ear → Voice → Ear, Sing It 5 Ways, Hear Your Mistake (every take scored through it) | 100 − (0.45…0.9) × mean \|c\|, attack and landing halves |
| `bossFinalizeNote` | Karaoke Boss Battle | per-note pitch (Sustain Giant also a wobble penalty from the SD) |
| `harmonyFinalizeNote`, `finishHarmonyArena` | Harmony Arena | per-note pitch, the piece's pitch |
| `finishMirrorEcho` | Mirror Echo | per-note and overall pitch |
| `runOneTake` | One Take | pitch and stability (100 − 3 × SD) |
| `runEmoRound` | Emotion Mode | stability, 100 − 3 × SD (survey D's 76/87 swing) |
| `pdFinalizeNote` | Performance Director | per-note pitch |
| `runDrillSequence` | Register Drills | per-note pitch |

**2. `makeVibratoTolerantLive()`: frame by frame, while singing.** It switches too (the centre while the gate said yes
in the last `liveHoldMs`, else the reading; `.vibratoSure` on top). Its users: the **Tuner** (`tunerVib` →
`tunerReading`, D1's path), Live Feedback (`lfVib`: In tune and Steady), Stay in Key (`stayKeyVib`) and Pitch Mountain's
lanes. **The Tuner shares this switch**, so as the step says it stays as it is, and so do the other three: they read the
same function. Nothing else takes raw-or-smoothed by the gate (the Vibrato Analyzer reports the gate's rate and depth;
it doesn't choose a reading).

## The blend

`vibratoStrength(g, pts)` (0–1) from the gate's own evidence, a product of ramps that each start at the gate's own
threshold (0 there: a note just past the edge takes almost nothing of the centre line, so there is no jump) and reach 1
inside it (`VIB_BLEND`):

| evidence | gate's threshold | ramp to 1 |
|---|---|---|
| depth (± ct) | 8 | 8 → 13 |
| depth, too wide | 160 | 160 → 150 |
| how regular: periodicity | 0.40 | 0.400 → 0.402 |
| rate (Hz) | 4 and 8 | 4.0 → 4.25 and 8.0 → 7.75 |
| how long it has held (periods) | 2 | 2 → 2.25 |

`vibratoTolerantCents` returns (1 − s) × reading + s × centre; s = 1 gives exactly today's centre line, s = 0 today's
readings.

**How the ramps were chosen** (`scripts/accuracy-e/blend.js`, offline, candidates `cand1…5.js`, `out/`):
- stim-S1's 800 starts sit on two edges at once: periodicity 0.29–0.45 (gate yes at 0.400–0.453) and depth 8.3–9.2 ct.
  Real vibrato is 14–93 ct deep, the VocalSet straight notes the gate passes 12.5 ct or more, the wobbles 17–25 ct.
  So the depth ramp (8 → 13) caps S1's strength at 0.2 and touches no real voice or wobble note.
- Wider ramps on the other evidence (cand1–3: periodicity 0.3→0.5 or 0.40→0.45, held 2→2.5) also smooth S1, but real
  voices sit right on those edges: VocalSet vibrato-2961 has a deep note (±41 ct) at periodicity 0.403, and it moved
  from 77 to 32 (−45; its take −7); vibrato-628's note held 2.2 periods moved −11. A ramp that reaches below the
  threshold (cand1) also scores notes the gate rejects better than today (a wobble at 3.8 Hz, two straight notes).
- **What that leaves:** S1's edge is smoothed (by its depth), but a deep voice exactly on the periodicity edge still
  changes by the whole step between 0.400 and 0.402: the ±2 gate on VocalSet doesn't allow a wider regularity ramp.
  cand3 (periodicity 0.40 → 0.45) is the version that smooths that edge too, at the cost above.

## Checks (2026-11-22 00:35–04:45 IST, local stack, AC power, one run at a time under the lock)

`scripts/accuracy-e/checksE.sh` (logs: `scripts/accuracy-e/logs/checksE-2026-11-21T19-05-20/`, kept local), then
`vocalsetE.sh` and two reruns in the same folder. Offline results committed in `scripts/accuracy-e/out/`.

**Pass criteria:**

| criterion | result | |
|---|---|---|
| S1's 800-start sweep: Emotion Mode stability spreads ≤ 3 | **76–79** (master 76–87) | PASS |
| VocalSet vibrato and straight takes within ±2 in every affected tool | offline, each tool's formula (0.6× and 0.9× mean \|c\|, 3× SD, the median) on 22 vibrato + 32 straight notes: per note ≤ 2, per take 0. Live, on pitch (`vocalsetE.sh`: Performance Director, Karaoke Coach, Emotional Singing, 2 runs a side): every Pitch within ±1 | PASS |
| ±20 and ±25 ct wobbles no better than today | 240 notes (10 seeds × 6 s, 1/2/3 s cuts): **0** score better on any number; those near 4 Hz score lower (the rate ramp) | PASS |
| Nothing outside the list changes | scores: every value within its gate. scores6: every value within its gate. scores4b: 3 differences, all Emotion Mode on the steady stimulus (S1), **the change this release makes** (below). survey.js: every number within ±2 but Performance Director's Timing on loudlate, rerun 4 runs a side: 6 → 7, run-to-run noise | PASS (see scores4b) |

- **scores4b's three:** Emotion Mode, steady stimulus, take 1 stability 87 → 79 (master 87/87/87, branch 79/79/77) and
  the two rows that are take 2 − take 1 (−10 → −2). Master's three runs all happened to start on a stretch where the
  gate said yes; the branch reads 77–79 wherever it starts, as the sweep says. Emotion Mode is on the list; this is the
  edge going away, so the gate's failure is the intended change, not a regression.
- **Live VocalSet, first try:** checksE's `vs-*` steps ran the takes with survey.js's `--voice` as release B built it
  (for loudness): it shifts the voice as if it were an A4, so every take sang off pitch (Pitch 0 on both sides) and
  showed nothing about the gate. survey.js now takes `--voice-midi` (the take's measured pitch; the voice moves to the
  nearest octave of each Lead note, ±6 semitones at most, so a vibrato's rate changes ×1.41 at most); default unchanged.
- **One Timing cell:** Performance Director's Timing on vibrato-2961 read 49/49 → 52/51; rerun 4 runs a side: master
  48/40/50/52, branch 52/52/51/52, inside master's own range (Timing comes from onsets; `vibratoTolerantCents` isn't on
  that path).
- Not run: screenshots (nothing visible changes); the live Tuner path (unchanged, as listed).

## Recommendation

Ship as built: the switch in `vibratoTolerantCents` becomes a blend, and the near-straight voice that read 77 or 87
take to take now reads 76–79. Effort spent: the blend is 15 lines in one function. Decision for you: the regularity
(periodicity) edge is still close to a step (0.400 → 0.402) because a wider ramp moved real VocalSet vibrato takes by
up to 7 points; if a deep voice on that edge matters more than the ±2 on VocalSet, cand3 (0.40 → 0.45) is ready
(`scripts/accuracy-e/cand3.js`, numbers above).

## Review and deploy

The user's message (2026-11-22), verbatim:

> Reviews done. Add this message to design/accuracy/RELEASE_E.md under "Review and deploy" and commit it first on accuracy/e. AC power, the run lock and time limits on. Rollback target: dpl_HNBqZiW6idUPUjFccqbhvLnX8hsm.
>
> RELEASE E: approved as built. Not cand3: it moved a real VocalSet take by 7 points, and real voices must stay within ±2.
> - scores4b: update its expectation for Emotion Mode on stim-S1 to the new 76–79 (the intended change), with a one-line note why.
> - Remove ../voxcoach-master-wt: you showed nothing in it is missing from master.
>
> 1. WAIT FOR "deploy". Say you're ready and wait for me to type it.
> 2. AFTER I TYPE "deploy": E is app-only. Merge accuracy/e into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself. Confirm deploy-alegra1122.vercel.app serves the new deployment; otherwise give me the exact promote line with the real dpl id.
> 3. PRODUCTION CHECKS: prod.sh (core), scores, scores4b, scores6, house, bootcheck. Rollback rule as before. Delete the test accounts; push the results to review/accuracyE-prod. When everything passes: delete accuracy/e and review/accuracyD-prod. HANDOFF: release E live, its dpl id the rollback target. Keep survey/guard (parked) and survey/warmup (until F ships).
>
> 4. THEN BUILD RELEASE F, the warm-up, on a new branch warmup/f from master, from survey/warmup's WARMUP.md. Save this step as design/warmup/RELEASE_F.md and commit it first. One commit per item; four languages for every new line; no §7 words.
> F1. The banner fix (proposal d): vlPlaceBreak puts the banner in the open warm-up card while the overlay is shown, and back in the panel when it closes. bannerbehind.js becomes its check (the banner inside the overlay and visible).
> F2. The level-up why-line names every XP source (survey item 4): a "scores improved" counter and a "first bests" counter in levelupCounters, and Bridge Crossing's record logged before the save. whyline.js becomes its check: every XP source in its table produces a non-empty why-line that names it, and the Smart Warmup double-count is gone (F3 removes its click).
> F3. One warm-up instead of two (proposal c): Coach → Warm-up is the same warm-up as the pre-session one (the four exercises and the song warm-up, same tracking), with Smart Warmup's context line kept (time of day, days since you last sang). Drop the weakest-category hint, since it changes no exercise. Smart Warmup's Play buttons and "Mark warmup done" go; retire their keys in all four languages. One XP rule: finishing the first exercise of the day counts the warm-up: +5 XP and warmups_completed + 1, once per account and local day (the server's day, from F5), whichever entry was used. It is not a session (no recordActivity). Existing warmups_completed values stay as they are.
> F4. The summary (proposal a), as mock-1, with two changes: the "how closely you followed the line" bars in ink, not the voice colour (they're a result, not the live voice; Rule 1), and "Start my session" keeps the start-singing button style. Only measured things: range reached against the stored range, the share of voiced time within a semitone of the guide per exercise and where it was lost, Humming's spread in cents, one coach line from the weakest, and one next step by the proposal's rules. Shown only after at least one exercise is finished. Check with the file mic: following the guide exactly reads 95% or more; 2 semitones off reads 10% or less; the next-step rules each triggered once.
> F5. The warm-up streak (proposal b): migration 0011 (user_progress.last_warmup_day and warmup_streak, on the local day from release C), the api's column list, and the allowlist check. The day's "done" mark comes from the server (localStorage stays as a cache), which fixes "this device only". Shown in the warm-up's header ("4 days warmed up in a row · one exercise keeps it") and on Home's stats line as words, "4 days warmed up", not an icon alone. Separate from XP and from the practice streak, and it never breaks the practice streak. Check with two browser contexts as two devices: warm up on one, and the other sees it done the same day; the streak carries across local midnight and breaks after a missed day.
> Every database step runs on the local stack (Colima and supabase start, as for release C), never production. Migration 0011 isn't applied to production until F's deploy.
> CHECKS: warmup-entries, warmup-tracking, bannerbehind, whyline, keeps (with the new expectations), the summary and streak checks, allowlist, levelup, home, youstates, house, contrast, copyscan --all, names, focus, targets, hooks, bootcheck. Stop the local stack afterwards.
> SCREENSHOTS on review/warmupF: the summary, Coach → Warm-up, the warm-up header with the streak, Home's stats line, the banner inside the warm-up, and two level-up why-lines (a skill score, a first best). At 390 Light and Dark, and 1280 Light.
> Secret check, push warmup/f and review/warmupF. REPORT, then stop. Nothing from F merges, and 0011 isn't applied, until I've reviewed.
