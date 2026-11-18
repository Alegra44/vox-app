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

Checks: `scripts/survey-d/logs/checksD-2026-11-17T10-29-39/` (local stack, run lock, time limits, AC; the queue paused
19:58–01:10 on battery, as its rule says). D3's rig, voiceguard and real-device logs: review/accuracyD.

### D1, Tuner: c2 and the follow-up, both kept

`tunerReading`: the vibrato centre only when `tunerVib.vibratoSure` (c2); the stability window (90 frames, 1.5 s) starts
afresh when the readout switches to the centre.

| input | master steady % | D1 steady % |
|---|---|---|
| vibrato 5.5 Hz ±40 ct | 100.0 | 100.0 (gate ≥95 ✓) |
| glide 10 ct/s | 100.0 | 2.7 (gate ≤20 ✓) |
| glide 20 ct/s | 89.6 | 0.0 (gate ≤20 ✓) |
| glide 40 ct/s | 0.0 | 0.0 |
| wobble ±20 ct, 3–7 Hz | 95.8 | 21.8 |
| wobble ±25 ct, 3–7 Hz | 95.7 | 95.3 |
| random walk 15 ct/s | 56.0 | 7.2 |
| steady, steady + noise 20/10/5 dB | 100 | 100 |

Both gates pass, so the follow-up stays. One trade to know: the ±20 ct wobble (too shallow for `vibratoSure`) now reads
steady 22 % of the time, from 96 %: it's no longer called vibrato, so its ±20 ct swing counts against stability. c2 alone
gave 11 % there; the follow-up doesn't cause it.

### D2, Pitch Mountain: the octave hold, anchored on the median of the last 5 frames

`window.gliderPitchGuard`: a reading 9–15 semitones from the median of the last 5 frames is held at that median, for up to
4 frames. **This isn't either of the two fixes the step named**; both were measured first and both fail the gate:

| variant | octave crashes 135 px, 10 dB babble/talker/tv | 20 dB | falling fifth | octave leaps |
|---|---|---|---|---|
| survey's hold | 0 / 5 / 2 | 0 / 2 / 0 | 183 ms | 217 / 183 ms |
| away from the frame before | 61 / 38 / 38 | 21 / 19 / 20 | 33 ms | 167 / 133 ms |
| median of the last 3 | 1 / 10 / 15 | 0 / 2 / 0 | 50 ms | 183 / 150 ms |
| a scratch try ("jump9", not shipped) | 0 / 7 / 3 | 0 / 2 / 0 | 117 ms | 217 / 183 ms |
| **median of the last 5 (shipped)** | **0 / 4 / 3** | **0 / 1 / 1** | **50 ms** | **200 / 167 ms** |
| master (no hold) | 113 / 47 / 53 | 40 / 22 / 24 | 50 ms | 150 / 117 ms |

(Leaps: A3→A4 / A4→A3; the falling fifth is A4→D4.) Gates: the falling fifth 50 ms ✓ (≤70); an octave leap +50 ms over master both ways ✓ (≤+67);
octave crashes no worse than the survey's hold: in total yes (7 vs 7 at 10 dB, 2 vs 2 at 20 dB), **but TV is one worse
at each SNR (3 vs 2, 1 vs 0)** while talker is one better. Your call whether that counts.

Pitch Dragon and the Rift (numbers only): they drop a frame ±300 ct or more from the target, so an octave slip costs
frames, not a crash. 1.6 s windows (279 per cell) losing ≥25 % / ≥50 % of their frames to octave errors:

| | white | babble | talker | tv |
|---|---|---|---|---|
| 20 dB | 0 / 0 | 9 / 2 | 8 / 1 | 8 / 1 |
| 10 dB | 0 / 0 | 73 / 25 | 38 / 7 | 45 / 17 |

### D3, the speaker guard: passes the rig, fails the real-device check

- One output bus (`appOutBus`: a unity gain, the analyser `outAn` on it; the 6 `audioCtx.destination` connections go
  through it; nothing patches `AudioNode.prototype`). The bus level every 5 ms; a mic frame counts only above
  2 × gain × the output's level the measured delay ago (loudest within ±50 ms). In Entrance & Cutoff, Rhythm, Harmony
  Arena and Harmony Memory (`overBleed`).
- `sdMeasure` returns the bleed gain; stored with the delay. A record measured before D (no `gain` key) opens the sheet
  once more before the next timing take; a failed or skipped once-more keeps the delay, stores gain null, isn't asked again.
- Gain ≥ 0.5: the sheet's headphones line (`sd_loud`, en/fr/es/tr); the once-more sheet says why (`sd_body_remeasuring`).

Rig (bleed.js, the loop over a −60 dBFS floor, D 120 ms): **every guard cell credits 0** (5 tools × −20/−10/0 dB × 2 runs).
Master at −20 dB credits Entrance 8/8, Cutoff 8/8, Arena 75 %; at 0 dB also Rhythm 8/8. ✓
Voiceguard (Rhythm, the on-beat voice, no bleed): no guard 90/91; −20 dB 91/91; −10 dB 90/91 ✓ (±2); 0 dB 45/44
(the guard expects bleed louder than the voice: blocked, as designed for a device that loud).

**Real device (this Mac's speakers and mic, the canceller on, nobody singing): fails.**

| volume | Entrance | Cutoff | Arena Acc | Memory | Rhythm |
|---|---|---|---|---|---|
| 50 % | 7/8 (clicks not heard: guard off) | 0/8 | 17 % | 0/8 | 0/8 |
| 100 % | 1/8 | 1/8 | 45 % (clicks not heard) | 0/8 | 0/8 |
| 50 %, diag run | 7/8 (not heard), 0/8 | | 7 %, 33 % | | |
| 100 %, diag run | 6/8, 4/8 | | 22 %, 40 % (one not heard) | | |

Why (`--diag`: the mic level ÷ the predicted bleed, per frame): with the canceller on, (1) the sheet's clicks often aren't
heard at all (heard 0–1 of 10), so no gain is stored and the guard is off; (2) when a gain is measured, the real bleed of
music runs 1.2–10× the prediction (median up to 2.5): the canceller cuts the short clicks harder than sustained tones, so
the click gain underestimates the music's bleed. I couldn't confirm the room was quiet.

Options, for you to choose:
1. Measure the gain with a music-like burst (a held chord, 300 ms) instead of the clicks: same sheet, longer.
2. Learn the gain during the take: the lead-in bars before the entrance play with nobody expected to sing; take the
   mic ÷ output ratio there (no sheet change; a singer who comes in early would be read as bleed).
3. A conservative default when nothing's measured or the clicks aren't heard (e.g. gain 0.3): would block a quiet singer
   on loud speakers; headphones unaffected.
1 + 3 together are what I'd try first.

### D4, tests

scores.js: the fake-mic browser launched per run, the canceller off (an init script, both sides). Rebaselined: Rhythm's
A/A range (5 runs a side, master vs master) is onbeat 90–91, late60 52–56 (was 82–87, 44–52: with the canceller off
the takes score higher and steadier). Per-note timing in Performance Director and Karaoke ("lead") moves by a frame
(3 points) between runs: master vs master spans 80–96.

### Checks

| check | result |
|---|---|
| tuner (master, branch) | pass; the table above |
| glider | pass; the table above |
| bleed (master; the branch with the guard) | master credits bleed as above; the guard 0 in all cells (bleed-d3b) |
| voiceguard | pass at −20 / −10 dB (above) |
| hygiene (master, branch) | pass, both: the canceller off on every track; Voice Quality f0 440, HNR 33 both sides; Emotion Mode's offline sweep identical |
| scores (4a tools) | pass |
| scores4b | first run: 4 rows out, all Rhythm's average against the old A/A range, **master too** (88/91/88, 55/55/55); re-gated on the same runs with D4's new range: pass |
| scores6 | first run (3 a side): 6 rows out, per-note timing in Performance Director and Karaoke on "lead" (master 92/92/92, branch 86–89). Bisected: D3's own commit passes against master, the commit before D3 fails 2, D3 with its 5 ms timer off fails 7 the other way: a frame of jitter, not D. Re-run with 5 a side: pass |
| house, hooks, contrast, copyscan --all, names, focus, targets, bootcheck | pass |

Logs: checksD-2026-11-17T10-29-39; scores-2026-11-17T21-15-24 (Rhythm A/A), …21-19-23 (Performance Director and
Karaoke A/A), …21-30-18 (scores4b re-gated), …21-30-37 (scores6, 5 a side); the bisect logs on review/accuracyD.

### Screenshots (review/accuracyD)

The sheet's headphones line (a new device, gain ≥ 0.5) and the once-more prompt (measuring, done), at 390 Light, 390
Dark and 1280 Light.

### Not merged

Nothing from D merges until reviewed. Open: D3's real-device failure (options 1–3 above), and D2's TV cell.

## Review and deploy

The user's review of 2026-11-18, verbatim:

> Release D review. Add this message to design/accuracy/RELEASE_D.md under "Review and deploy" and commit it first on accuracy/d. AC power, the run lock and time limits on. Rollback target: dpl_9zyqvjdkw6dus1h6mnDm2qru7S9Z.
>
> DECISIONS
> - D1 Tuner: approved, the follow-up window included. The ±20 ct wobble at 22% (from 96%) is fine.
> - D2 Pitch Mountain, median of 5: approved. One more TV crash per SNR with the same totals is within the noise. Pitch Dragon and the Rift go in the queue with your numbers (octave slips cost frames there, not crashes).
> - D4 tests: approved, with the new A/A range.
> - D3 the speaker guard: not shipping in D. It works on the rig and not on a real Mac, which is the case that matters. Revert e93de00 on accuracy/d (keep 728d1d3's scripts). D3 comes back as its own job, real device first (step 5).
>
> 1. THE REVERT
> - git revert e93de00. Then rerun bleed (now equal to master), scores, scores4b, scores6, house, hooks, contrast and bootcheck. The headphones line and the re-measure prompt go with it, so no screenshots are needed.
> - Secret check, push accuracy/d.
>
> 2. WAIT FOR "deploy". Say you're ready and wait for me to type it.
>
> 3. AFTER I TYPE "deploy": D is app-only (no migration, no Edge Function). Merge accuracy/d into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself. Confirm that https://deploy-alegra1122.vercel.app serves the new deployment; if it doesn't, give me the exact vercel promote line with the real dpl id.
>
> 4. PRODUCTION CHECKS: prod.sh (core), scores, scores4b, scores6, house, bootcheck. Rollback rule as before. Delete the test accounts; push the results to review/accuracyD-prod. When everything passes: delete accuracy/d, review/accuracyD, survey/d and review/dayC-prod. HANDOFF: release D live, its dpl id the rollback target.
>
> 5. THEN THE GUARD AGAIN, AS A REAL-DEVICE SURVEY (no app changes yet). Branch survey/guard from master. Save this step as design/accuracy/GUARD.md and commit it first. It plays sound out loud: only between 09:00 and 21:00 my time, and tell me before each loud part.
> a) Release B's speaker-delay sheet on this Mac with the echo canceller on: 10 runs at 50% volume and 10 at 100%. How often it hears the clicks, and what it reads against a reference taken with the canceller off. If it often misses them, try a short chirp or a held chord for the measurement, and a separate canceller-off stream used only for those 4 seconds, and compare.
> b) The guard on this Mac's speakers, canceller on, nobody singing, at 50% and 100%: your held chord plus a cautious default together, and learning during the lead-in made robust (a low quantile of the lead-in, with a cap so an early singer can't raise it much). Pass: nothing credited in Entrance & Cutoff, Rhythm, Harmony Arena and Harmony Memory.
> c) A real voice that isn't the Mac's own output: tell me which VocalSet file to put on my phone and when to play it next to the Mac (or I'll sing). Pass: each approach scores that voice within ±3 of the same recording with headphones on the Mac.
> Write the numbers in GUARD.md with your recommendation and its effort. Secret check, push survey/guard. REPORT, then stop.
>
> Also: ../voxcoach-master-wt has 43 uncommitted changes. Don't touch it. Tell me what they are (a git status summary and the files), so I can say whether they matter.
