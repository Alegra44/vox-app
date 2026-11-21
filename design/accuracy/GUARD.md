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

### a. The sheet on this Mac (2026-11-19 09:01–09:11, quiet room; `guard/sdreal.json`, `guard/sdreal.log`)

| volume | reference, canceller off | sheet, canceller on (×10) |
|---|---|---|
| 50 % | ok 5/5, 108 ms (10/10 clicks heard) | ok **3/10**, clicks heard 0/5/0/2/1/3/4/5/0/2 of 10, 97 ms when ok |
| 100 % | ok 5/5, 109 ms | ok **2/10**, heard 8/5/0/0/0/0/0/0/0/0, 98 ms when ok |

The probes (heard of 10, chord of 6; median delay; gain = recorded ÷ sent amplitude):

| probe | stream | 50 % | 100 % |
|---|---|---|---|
| click | app's (canceller on) | 0–5 heard, 97 ms, gain 0.04 | 0 heard |
| chirp | app's | 0–3 heard, gain 0.03 | 0–1 heard |
| chord | app's | **0** | 1 run of 10 (a false 0 ms) |
| click | separate, canceller off | 10/10 every run, 76 ms, gain 0.28 | 10/10, 80 ms, gain 1.58 |
| chirp | separate, canceller off | 10/10, 76 ms, gain 0.14 | 10/10, 80 ms, gain 0.63 |
| chord | separate, canceller off | 6/6, 86 ms, gain **0.125** | 6/6, 89 ms, gain **0.58** |

- With the canceller on, as the app asks, Chrome's echo canceller removes the sheet's own clicks most of the time: the
  sheet stores a measured delay in 3 and 2 runs of 10 (the estimate otherwise), 11 ms shorter than the reference when it
  does. The chirp and the held chord do no better on that stream: the canceller removes what the page itself plays.
- A separate canceller-off stream, opened only for the measurement, hears every probe in every run, with a steady gain
  (±2 %). Its delay is 20–30 ms shorter than the reference's: a different capture path, so a delay from it can't be stored
  for the app's stream as it is.
- So the room's coupling (output → mic before the canceller) is 0.125 at 50 % and 0.58 at 100 % for a held chord. Part b
  uses a default of 0.3 and a cap of 0.6 (the 100 % chord gain: the most the bleed can be).

### b. The approaches, nobody singing (09:12–10:02; `guard/guardreal-app.*`, `guard/guardreal-aecoff.*`)

Each cell: run 1, run 2 (credited of 8; Arena: its overall accuracy). Pass: nothing credited.

| volume | approach | Entrance | Cutoff | Memory | Rhythm | Arena |
|---|---|---|---|---|---|---|
| 50 % | off (control) | 4, 7 | 4, 4 | 1, 0 | 0, 0 | 12 %, 20 % |
| 50 % | chord (app stream; default 0.3) | **0, 0** | **0, 0** | **0, 0** | **0, 0** | 17 %, 2 % |
| 50 % | chord, gain from a canceller-off stream | **0, 0** | **0, 0** | **0, 0** | **0, 0** | 1 %, 5 % |
| 50 % | leadin | 5, 4 | 5, 6 | 0, 0 | 0, 0 | 17 %, 21 % |
| 100 % | off (control) | 8, 7 | 7, 5 | 0, 0 | 2, 3 | 20 %, 45 % |
| 100 % | chord (app stream) | **0, 0** | **0, 0** | **0, 0** | 0, **1** | 34 %, 22 % |
| 100 % | chord, canceller-off stream | **0, 0** | **0, 0** | **0, 0** | **0, 0** | 18 %, 51 % |
| 100 % | leadin | 5, 4 | 7, 4 | 0, 0 | 0, 0 | 35 %, 31 % |

- **The bleed is real through the canceller:** with no guard the music alone is credited as entrances and cutoffs (up to
  8/8), Rhythm onsets at 100 % (2–3/8) and 12–45 % in Arena.
- **chord** stops it in Entrance & Cutoff and Memory. On the app's stream the chord is never heard (part a), so it runs on
  the default 0.3, which let 1 Rhythm onset through in one run at 100 %. With the gain from the canceller-off stream
  (0.12–0.14 at 50 %, 0.60 at 100 %) Rhythm is 0 too.
- **leadin fails:** the learned gain is 0.0023–0.0026 in Entrance & Cutoff (the floor), because the canceller has adapted
  to the steady count-in pad and removes it; the bleed that gets through comes once the music moves. Learning in the
  lead-in measures the canceller's best case, not the take.
- **Arena fails with every approach** (1–51 %), also with the gain at 0.6. On the loop rig (no room) both chord variants
  gave 0 %, so it is something the room adds; not yet tested: the room's tail after each chord change (the prediction
  uses the output's level one delay earlier, and the tail outlasts it), or Arena's own scoring path.
- Pass for part b: chord with the canceller-off gain passes four tools of five; nothing passes Arena.


### c. A real voice (not run yet: parked 2026-11-21)

Not measured. Two tries, no numbers:

- **2026-11-19 18:09**, headphones pass: `no sync beep heard` in the first block (`guard/guardvoice-headphones.log`).
- **2026-11-21 00:10–00:45**, a beep check first (a 64 s file of 15 beeps, 4 s apart, the Mac listening on the app's
  stream and on a raw stream side by side): the two streams heard the same, so neither the canceller nor macOS's mic
  mode removes the beep. The few beeps heard were clear (2 kHz share 0.98, level 0.03–0.07 against a threshold of
  0.003). A raw recording of the mic showed why so few: the phone was playing a voice file (the Alto part, pitch-tracked
  G4 B4 A4 A4 G4 A4 B4 G4, 3.3 s each), not the beep file, and it went on playing into the next test (its player moved
  to the next file). The detector is fine; the phone has to play exactly one file.
- In both voice files every sync beep has 25–30 s of silence before it and ≥ 7.7 s after it (nothing within 0.5 s
  either side), so nothing masks it; the files don't need rebuilding.
- guardvoice.js now launches its window with Chrome's timer throttling off (1203aca), so the 20 ms beep listener can't
  slow to once a second if the window is behind another.

**What's left (needs the user, somewhere quiet, 09:00–21:00 IST):**

1. Rebuild the three phone files (the session scratchpad holding them is temporary): `timeline.json` dumped from the
   scratch build (`songTimeline()`: the Alto part, chordDur 3.33 s; `SONG.parts.Alto.notes`; `RHYTHM_BPM`, tempo
   medium), then `python3 -I scripts/guard-verify/phonetrack.py timeline.json 1-headphones.wav 1` and
   `… 2-speakers.wav 6`, `afconvert -f m4af -d aac -b 192000` each; AirDrop to the phone.
2. Phone setup: play from the **Files app** (one file, no next track; or Music with Autoplay and Repeat off),
   **Do Not Disturb on**, full volume, ~30 cm from the Mac, speaker facing it. The Mac's input on **MacBook
   Microphone** (System Settings → Sound → Input), headphones without a mic for the first pass.
3. The local stack (`colima start`, `supabase start`), AC power, the run lock.
4. **Headphones pass** (5 min, the reference): `guardvoice.js --track 1-headphones.wav.json --conditions off:50
   --out guard/guardvoice-headphones.json`; press play at READY (the first beep is 30 s in).
5. **Speakers pass** (30 min, loud, headphones out): `--track 2-speakers.wav.json --conditions
   chord:50,chordoff:50,leadin:50,chord:100,chordoff:100,leadin:100` (six passes: chordoff, the gain from a canceller-off
   stream, is part b's best approach, so it's added to chord and leadin).
6. Pass: each approach's score within ±3 of the headphones pass in every tool; then the recommendation and its effort
   here, secret check, push survey/guard, report.
