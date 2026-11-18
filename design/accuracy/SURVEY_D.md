# Survey D: four accuracy items, measured, not shipped

The step as given (overnight plan, 2026-11-16, step 2), verbatim:

```
2. SURVEY D: four accuracy items, measured, not shipped
Branch survey/d from master. Save this step as design/accuracy/SURVEY_D.md and commit it first. For each item: measure it on master, find the cause, propose a fix, try it on a local scratch branch (never pushed), and give before/after numbers.
a) Speaker bleed scored as singing: with nobody singing and the speakers reaching the mic (the latency rig's loop), what Entrance & Cutoff, Harmony Arena, Harmony Memory and Rhythm credit, with the app's echo cancellation on and off. Propose a guard (for example, a voice must be heard above the measured bleed of the app's own output, using release B's speaker-delay round trip).
b) Pitch Mountain's octave crash under noise: the noise levels and voices where the pitch jumps an octave and moves the glider far enough to crash. Propose a guard (an octave-jump hold, or a limit on how far one frame can move it) that doesn't make a real fast leap feel sluggish.
c) The Tuner says steady when it isn't: build the inputs that fool it (a slow glide, a wobble, noise), measure how often it says "steady", and propose the fix.
d) Test hygiene: scores4b's Register Drills and Voice Quality change with whatever ran before them, and Emotion Mode swings between two values on master. Find out why and propose the fix (a fresh page per tool, a seeded random, or a real state leak in the app: say which).
Anything that needs an account uses the local stack, never production. Write the numbers and proposals in SURVEY_D.md with an effort for each (small / medium / large). Secret check, push survey/d.
```

---

## How it was measured
- **Builds:** master, and a local scratch branch `scratch/survey-d` (from master, never pushed) carrying the trial
  fixes.
- **Scripts:** `scripts/survey-d/` (bleed.js, glider.js, tuner.js, hygiene.js), with the raw numbers in
  `scripts/survey-d/out/`.
- **Accounts:** anything that needed one ran against the local Supabase stack (VOX_BACKEND=local), never production.
- **Variants:** each scratch variant is its own commit there, so a fix can be reproduced with `--ref <commit>`.

## c) The Tuner says steady when it isn't: **small**
**Measured** (tuner.js). Synthetic voices go frame by frame through the app's own chain: the pitch path's low-passes,
autoCorrelate, `tunerVib`, then `updateTunerUI`'s Stability readout and "In tune" lock. Each input is 6 s, ×3 seeds,
counted from the second second. "Steady" means a Stability reading of 90% or more.

| input | true SD over 0.5 s | master: steady / In tune | c2 (proposed): steady / In tune | c1 (1.5 s window too) |
|---|---|---|---|---|
| steady A4 | 0 ct | 100 / 100 % | 100 / 100 % | 100 / 100 % |
| real vibrato 5.5 Hz ±40 ct (should read steady) | 28 ct | 100 / 100 % | 97 / 100 % | **77** / 100 % |
| irregular wobble ±20 ct, rate wandering 3–7 Hz | 14 ct | **96 / 99 %** | **11 / 41 %** | 0 / 41 % |
| irregular wobble ±25 ct | 18 ct | **96 / 99 %** | 89 / 97 % | 63 / 97 % |
| wobble ±25 ct + noise 10 dB | 18 ct | 96 / 99 % | 89 / 97 % | 63 / 97 % |
| slow glide 10 ct/s | 1.4 ct | 100 / 26 % | 100 / 26 % | 3 / 26 % |
| slow glide 20 ct/s | 2.9 ct | 90 / 13 % | 90 / 13 % | 0 / 13 % |
| glide 40 ct/s | 5.8 ct | 0 / 14 % | 0 / 14 % | 0 / 14 % |
| random walk 15 ct/s | 3.8 ct | 56 / 20 % | 56 / 20 % | 7 / 20 % |
| steady + white noise 20 / 10 / 5 dB | 0 ct | 100 / 100 % | 100 / 100 % | 100 / 100 % |

**Cause.** There are two causes:
1. **The vibrato centre.** The Tuner reads its pitch through `makeVibratoTolerantLive()` and shows the vibrato centre
   whenever the gate fires. The function's own comment says an irregular ±20–25 ct wobble passes the gate in 800 ms,
   and that a readout saying "Steady" should use the centre only when `vibratoSure`. The Tuner doesn't check
   `vibratoSure`. So an unsteady voice reads 95% stability and "In tune" almost all the time.
2. **The window.** Stability is 100 − 3 × the SD over the last 30 frames (0.5 s). A slow glide of 10–20 ct/s moves only
   5–10 ct in that window, so it reads steady while the note drifts 60 ct over 3 s.

Noise doesn't fool it: at 5 dB the steady tone still reads 97%.

**Proposed fix (c2): the vibrato centre only when `vibratoSure`, else the reading as it is** (`tunerReading()` on the
scratch branch, 4 lines).
- **What it fixes:** the ±20 ct wobble goes from 96% to 11% steady, and a real vibrato stays 97%.
- **What it doesn't:**
  - A ±25 ct wobble wandering 3–7 Hz is still taken as a sure vibrato (89%). Making "sure" need 600 ms of a steady
    rate instead of 333 ms (c3) only brings it to 66%, and costs real vibrato 9 points (91%). A wobble that deep and
    that regular is close to a real vibrato, so I'd leave it.
  - A slow drift needs a longer window. A 1.5 s window (c1) catches the glides (100% → 3%), but it keeps the readings
    taken before the vibrato was "sure" for 1.5 s and drops real vibrato to 77%.
- **Follow-up:** a 1.5 s window that starts afresh when the reading switches to the vibrato centre. Not tried.

Effort: **small** (c2 alone), **medium** with the drift window.

## b) Pitch Mountain's octave crash under noise: **small**
**Measured** (glider.js). 18 VocalSet voices (straight, vibrato, breathy, pp), each mixed with 7 noises at 20, 10, 5
and 0 dB SNR, go frame by frame through the pitch path and autoCorrelate, as `gliderLoop` reads them. The glider is
simulated with the app's own rule (`glideFollow`, `gliderMidiToY`, H 320), flying a gap centred on the clean voice's
height. A crash is counted when the glider's edge leaves the gap. A crash is put down to octave errors when the same
flight with those frames corrected doesn't crash. "Octave frame": the noisy pitch is 9–15 st from the clean one.

**Master.** The numbers are summed over the 18 voices. The first run (all 7 noises) hit its 40-minute limit partway
through 5 dB, so there are no 0 dB numbers. The second run (white, babble, talker, TV at 20 and 10 dB, and the leaps)
compared master with the hold.

| noise, SNR | octave frames | crashes, 135 px gap (from octaves) | crashes, 100 px gap (from octaves) |
|---|---|---|---|
| white / pink / traffic / rumble, 20 dB | 0.01–0.03 % | 55–57 (0) | 67–68 (0) |
| babble, 20 dB | 1.7 % | 112 (40) | 116 (34) |
| talker, 20 dB | 2.5 % | 104 (22) | 120 (22) |
| TV, 20 dB | 2.4 % | 105 (24) | 118 (26) |
| white / pink, 10 dB | 0.15 / 0.26 % | 69 / 75 (5 / 1) | 79 / 97 (4 / 8) |
| babble, 10 dB | **15.5 %** | **306 (113)** | 301 (93) |
| talker, 10 dB | 9.1 % | 240 (47) | 258 (47) |
| TV, 10 dB | 11.2 % | 251 (53) | 261 (49) |
| rumble, 10 dB | 0.95 % | 97 (2) | 103 (3) |
| babble / talker, 5 dB | 18.4 / 12.6 % | 268 / 290 (37 / 45) | 318 / 310 (50 / 34) |

**Which voices** (octave frames per voice, 10 dB babble):
- breathy-1197 has by far the most (189), then pp and the breathy voices.
- The straight and vibrato voices have them in voice-like noise (babble, talker, TV) even at 20 dB.
- White, pink and traffic noise hardly ever cause them.

The baseline crashes (55 at 20 dB white) are note changes the glider lags behind, and silences where it falls. They
aren't octaves.

**Cause.**
- **The octave errors themselves:** autoCorrelate picks the octave below or above when voice-like noise sits in the
  lag window.
- **Why they crash the glider:** `glideFollow` moves a quarter of the way to that height every frame. With the
  signed-out range (`registerRangeBounds`), an octave is about half the canvas. So 2–3 octave frames move the glider
  40–80 px, which is past the edge of a 100–135 px gap.

**Proposed fix: an octave-jump hold.** `gliderPitchGuard` on the scratch branch, about 10 lines. A pitch 9–15 st from
the last one flown is held at the last one for up to 4 frames (67 ms). A jump that lasts longer is a real leap and is
flown.

| | master | with the hold |
|---|---|---|
| crashes from octaves, 10 dB babble / talker / TV (135 px) | 113 / 47 / 53 | **0 / 5 / 2** |
| all crashes, 10 dB babble / talker / TV (135 px) | 306 / 240 / 251 | 194 / 221 / 220 |
| crashes from octaves, 20 dB babble / talker / TV | 40 / 22 / 24 | 0 / 2 / 0 |
| a real octave leap up / down (A3↔A4): within 10 px of the new height | 150 / 117 ms | 217 / 183 ms (+67 ms) |
| a real fifth up (D4→A4) | 150 ms | 117 ms |
| a real fifth down (A4→D4) | **50 ms** | **183 ms** |

**Cost:**
- A real octave leap arrives 67 ms later. That is four frames, about one glider movement, and I'd judge it not
  sluggish.
- The falling fifth slowed from 50 to 183 ms, although a fifth is outside the hold's 9–15 st. Probably the detector
  reads the octave below for a frame or two as the note changes, and the hold then sits on that frame. This needs a
  look before shipping: hold only when the jump is away from the pitch of the frame before it, or compare against the
  last 3 frames' median.

**Follow-up (medium):** the same hold would help the other pitch-driven games (Pitch Dragon, The Vocal Rift); not
measured.

Effort: **small**.

## a) Speaker bleed scored as singing: **medium**
**Measured** (bleed.js). Nobody sings; the mic hears only the app's own output: release B's loop rig with a gain on the
loop, D = 120 ms, over a −60 dBFS floor. The speaker delay is stored as measured, and each tool is run through to its
end. The account is on the local stack, with the choir plan and level 10.

| bleed (output → mic) | Entrance | Cutoff | Harmony Arena (overall · pitch · timing · part) | Harmony Memory | Rhythm |
|---|---|---|---|---|---|
| none (control) | 0/8 | 0/8 | 0 % | 0/8 | 0/8 |
| −20 dB (0.1) | **8/8, 41 %** | **8/8, 84 %** | **75 % · 99 · 0 · 100** | 0/8 | 0/8 |
| −10 dB (0.3) | **8/8, 63 %** (bleed note shown) | **8/8, 91 %** | **86 % · 99 · 44 · 100** | 0/8 | **8/8, 80 %** |
| 0 dB (1) | **8/8, 66 %** (bleed note shown) | **8/8, 81 %** | **90 % · 99 · 60 · 100** | 0/8 | **8/8, 80 %** |

**The echo canceller.** The loop is a synthetic MediaStream, which Chrome's echo canceller never processes, so these
are the canceller-off numbers whatever the app asks for (`echoCancellation: true`).
- A real device's canceller removes some of the bleed. How much depends on the device and the room, and this rig can't
  reproduce it.
- The canceller is weakest exactly where bleed is worst: laptop speakers near the mic, Bluetooth, a USB interface.
- Measuring the canceller-on case needs a real speaker and mic, as a manual check.

**Cause.**
- **What credits it:** each of these tools takes any level above `ONSET_RMS_THRESHOLD`, or any pitch, as the singer.
  - **Pitch:** the bleed of the singer's own part (or the guide) is exactly on pitch, so Arena's pitch reads 99 and
    "part" 100.
  - **Timing:** release B subtracts the measured speaker delay, so bleed arrives "on time". Entrance credits 8 of 8.
- **Rhythm** needs the clicks at −10 dB or louder.
- **Harmony Memory credits nothing:** at the stages it ran, the singer's own part isn't played.
- **The existing guard:** Entrance & Cutoff's only one is `bleedHits` (an onset on a count-in click). It shows a note
  (at −10 dB and up) and blocks nothing.

**Proposed fix: the bleed guard** (on the scratch branch, ~40 lines):
1. **The bleed's gain:** release B's speaker-delay measurement also returns it, from the same click correlation that
   gives the delay (`gain = correlation peak ÷ click energy`). Stored with the delay.
2. **The app's output:** tapped. Every connection to the destination also feeds an analyser, and its level is kept
   every 5 ms.
3. **The check, `overBleed(raw)`:** a mic frame counts as a voice only if its level is more than twice (+6 dB) the
   predicted bleed: the gain × the output's level one round trip ago (the loudest of ±30 ms). The four tools use it
   where they decide "voiced" or read a pitch: the timing trainer, Rhythm, Arena's frames and Harmony Memory's frames.

**Results with the guard** (scratch build, its own measurement on the rig):
- **The measurement:** gain 0.100 / 0.300 / 1.000, exact; delay 151–159 ms (the rig's 120 ms plus the browser's
  buffering).
- **Bleed blocked:** every tool credits 0 at all three bleed levels (it was 8/8 and 75–90 %).
  - A first version tapped the output only from the first mic opening, missed sounds wired up before then, and blocked
    almost nothing. Tapping from script load fixed it.
- **A real voice still counts** (voiceguard.js: Rhythm's on-beat voice, no bleed; the guard's worst case, since the
  click's predicted bleed lands on the sung onset):

| guard expects bleed at | off | 0.1 | 0.3 | 1.0 |
|---|---|---|---|---|
| Rhythm on-beat average | 90 / 91 | 91 / 91 | 91 / 91 | 55 / 53 |

  At −20 and −10 dB the voice scores as before. At 0 dB (the speaker as loud at the mic as the voice) the guard also
  blocks some of the voice. A device that loud should be told to use headphones; the speaker-delay sheet could say so
  when it measures a gain ≥ 0.5.

**Before shipping:**
1. **A proper output bus.** The scratch build patches `AudioNode.prototype.connect`; the real version routes the app's
   six destination connections through one master gain with the analyser on it.
2. **Older measurements.** Devices measured before the change have no gain stored. The guard stays off until they are
   measured again, unless the sheet is shown once more.
3. **The other tools:** the same guard for the other timing and pitch tools that play while you sing (Karaoke, PD,
   Choir rehearsal and the rest), each needing its scores re-checked.
4. **A real-device check** with the canceller on.

Effort: **medium**.

## d) Test hygiene: scores4b's order effects and Emotion Mode's two values: **small**
**Measured** (hygiene.js). Local stack, the steady stimulus (vibfix stim-S1) as Chromium's file-backed fake mic, as
scores4b uses it. Four runs per condition, each in a fresh page: the tool alone, or after the tools scores4b runs
before it, each with the mic's echo cancellation as the app sets it (on) and forced off.

| | alone | after the tools before it | alone, canceller off | after, canceller off |
|---|---|---|---|---|
| Register Drills chest, notes 1–5 | 57 ×20 | 56–57 | 58 ×20 | 57–58 |
| Register Drills pitch, average | 96–97 | 96–97 | 96–97 | 97 |
| Voice Quality centroid (Hz) | 969–973 (971) | 972–976 (975) | 984–988 (986) | 992–995 (994) |
| Voice Quality HNR / f0 | 33 dB / 440 Hz | same | same | same |

| Emotion Mode stability | |
|---|---|
| 8 runs alone, take 1 / take 2 | 77 ×7, 87 ×1 / 87 ×3, 77 ×5 |
| offline: a take starting at each 50 ms of the 40 s file (800 starts) | 77: 564 · 78: 59 · 76: 5 · 86: 46 · 87: 126 |
| vibrato gate on / off | on at 172 of 800 starts (21.5 %): 86–87 · off: 76–78 |

**Causes:**
- **Emotion Mode: neither randomness nor leaked state.** The stimulus sits on the edge of the vibrato gate.
  - stim-S1 is a "steady" voice with a natural ±few-cent wobble. Over some 3 s stretches of the file the gate reads it
    as vibrato and `vibratoTolerantCents` smooths it: 87. Over others it doesn't: 77.
  - Chromium's fake mic loops the file from wherever it has got to, so where a take starts is set by how long
    everything before it took. 4 of 16 live takes read 87, matching the 21.5 % of starts in the sweep.
  - **The same happens to singers:** a voice near the gate's edge moves 10 points from take to take on whether the gate
    says yes. That is a real discontinuity in the app's stability measure, not only a test artefact.
- **Voice Quality: the echo canceller.** The canceller changes the spectrum: the centroid reads about 15 Hz higher
  with it off. Its adaptive state also carries over from earlier tools in the same page: +4 Hz after the other tools
  with it on, +8 Hz with it off.
  - This is carried state in the browser's audio processing (the one mic stream every tool shares, design decision C3
    + F2), not a leak in the app's code.
  - The shift is under 1 % and inside the SPREAD gate (master's range or ±1 %).
- **Register Drills: no order effect reproduced.** Chest 56–58 and pitch 96–97 in every condition. The canceller moves
  chest by 1.
  - The wider spreads in older scores4b runs (chest 56–64, in 2026-10-29 runs) were all in long single-browser runs.
    There the fake mic's file position also depends on everything before, so it is most likely the same file-position
    effect as Emotion Mode, on a stimulus whose chest reading changes along the file.
  - **Not proven:** 4 runs per condition here didn't reproduce the spread.

**Proposed fixes:**
1. **Tests: start every take at the same point of the stimulus.** Launch the fake-mic browser per run in scores.js
   (`S.launchMic` inside the run loop instead of once per stimulus), so the file always starts from 0. Or use a
   stimulus whose every 3 s stretch reads the same (a synthetic steady tone with no wobble for Emotion Mode). Either is
   a **small** change. A fresh page per tool doesn't help on its own: the file keeps playing across pages in one
   browser.
2. **Tests: open the mic with the canceller off in scores runs** (the AEC_OFF init script), so Voice Quality's numbers
   don't depend on the canceller's state. **Small.** It changes the baseline (centroid +15 Hz), so master and the
   branch must be run the same way.
3. **App (a proposal, not tried):** in Emotion Mode and the other `vibratoTolerantCents` users, blend the raw and the
   smoothed SD by how strongly the gate reads a vibrato, instead of switching between them, so a voice on the edge
   doesn't jump 10 points. **Medium**, since every tool that uses the gate would be re-checked.

No seeded random is needed: nothing random is involved in any of the three.

## Summary

| Item | Master | Cause | Proposed fix | Before → after | Effort |
|---|---|---|---|---|---|
| a. Speaker bleed | with nobody singing, Entrance/Cutoff credit 8/8 from −20 dB bleed, Arena 75–90 %, Rhythm 80 % from −10 dB (canceller off) | any level or pitch counts as the singer; delay compensation makes bleed "on time" | bleed guard: the gain from release B's speaker-delay measurement, an output tap, voice must exceed 2 × the predicted bleed | bleed credited 8/8 → 0/8 in all 4 tools; a real voice unchanged (91) up to −10 dB bleed, 54 at 0 dB | medium |
| b. Pitch Mountain octave crash | in voice-like noise (babble, talker, TV): 1.7–2.5 % octave frames at 20 dB, 9–18 % at 10–5 dB, up to 113 crashes from octaves (10 dB babble, 18 voices) | autoCorrelate octave slips + glideFollow's 25 %/frame | hold an octave jump up to 4 frames | octave crashes 113/47/53 → 0/5/2; real octave leap +67 ms; one falling-fifth case slower (50 → 183 ms) to look at | small |
| c. Tuner false steady | an irregular ±20–25 ct wobble reads ≥ 90 % stable on 96 % of frames, "In tune" 99 % | the vibrato centre used without `vibratoSure`; a 0.5 s window misses slow drift | the centre only when sure | ±20 ct wobble 96 → 11 %; real vibrato 100 → 97 %; ±25 ct wobble 96 → 89 %; slow glides need a longer window (tried: costs vibrato) | small (medium with the window) |
| d. Test hygiene | Emotion Mode 77 or 87; VQ centroid ±4–8 Hz by order | the looped fake-mic file's start position (gate edge); the echo canceller's state | a browser per run (or a gate-safe stimulus); canceller off in scores runs | sweep: 21.5 % of starts read 87, the rest 77: pinned to one start, one value | small |

The trial fixes are on the local branch `scratch/survey-d`, never pushed: one commit per variant. The raw numbers are
in `scripts/survey-d/out/`.
