# Phase 4b survey: the 10 tools with their own displays

Read-only survey for the 4b spec (instructions in PHASE4A.md, "4a production rerun and phase 4b survey"). Nothing in the
app was changed. Code references are to `deploy/index.html` at master 296d530 (phase 4a live). Screenshots of each tool as
it is now are on `review/phase4b-before` (`sheets/before.jpg`), taken with `scripts/design-verify/shots4b.js`, signed
in, the fake mic singing a steady A4.

## At a glance

| Tool | Panel | Mic path | `singingSession` | `captureAccuracyForTarget` / vcTake | Stored score | Result block | Score covered by |
|---|---|---|---|---|---|---|---|
| One Take | `onetake` | `initAudio` (shared `analyser`) | yes (no stage) | no, own 6 s loop | `pitch` skill; `progress.oneTakeHistory` | yes (rows) | xscope (formula, offline) |
| Mirror | `mirror` | `initAudio` | yes (no stage) | no, own 2.8 s loop | `pitch` skill | yes (% + replay) | none |
| Rhythm | `rhythm` | `initAudio` (raw RMS only) | yes (no stage) | no, onset loop | `agility` skill | yes (% + 8 rows) | none (batch2: load + which beats claimed) |
| Register Coach | `register` | `openRegisterInput` | **no** | no, `loop()` in `mode==='register'` | best clean crossing (`progress.bestBridgeSeconds`, XP) | no (live only) | regfix (`bug`, `noise`), rcmic / regcoach (investigations) |
| Register Drills | `registerdrills` | `openRegisterInput` | **no** | no, own 5-note loop | `pitch` skill | yes (5 rows) | vibfix, noisegate, regfix (`drills`) |
| Real-Time Feedback | `livefeedback` | `openRegisterInput` | **no** | no, `lfLoop` | none | no (live only) | vibfix, noisegate, rtfsteady, rtfsoft, regfix (`feedback`) |
| Vibrato | `vibrato` | `vqCapture` (`micGraph`) | **no** | no, `vqCapture` | none (completion only) | yes (3 chips + trace) | vq.js, bands, cvib, livevq (prod), realvib (offline) |
| Voice Quality | `voicequality` | `vqCapture` (`micGraph`) | **no** | no, `vqCapture` | none (completion only) | yes (3 rows) | vq.js, bands, brightui, cvib, livevq (prod) |
| Resonance | `resonance` | `openRegisterInput` | **no** | no, `resonanceLoop` | none | no (live only) | regfix (`feedback`: the zone only) |
| Emotion Mode | `emotionmode` | `initAudio` | yes (no stage) | no, own 2 × 3 s loop | none (completion only) | yes (3 comparison rows) | none (picker: the note; batch3b: load) |

- **None of the ten uses `captureAccuracyForTarget` or vcTake.** Each has its own capture loop.
- **Six don't call `singingSession`**: Register Coach, Register Drills, Real-Time Feedback, Vibrato, Voice Quality and
  Resonance. They feed today's vocal load themselves (`vlFeed` per frame, `vlEnd` at the end), but the house never goes
  down for them. The four that do call it (One Take, Mirror, Rhythm, Emotion Mode) pass no stage, so the house goes down
  with nothing staged.
- **Every one opens the mic.** Four read the shared pitch path through `initAudio`, four read the register input
  (`openRegisterInput`, raw + pitch analysers on the one stream), and Vibrato and Voice Quality build their own analysers
  on `micGraph` in `vqCapture`.
- **No score coverage at all:** Mirror, Rhythm, Emotion Mode. One Take's formula is only replicated offline (xscope),
  never through its UI. loopreal / loopback drive none of the ten.

## Per tool

### One Take (`panel-onetake`, code "One Take Challenge")
- **Measures:** one 6 s take (`ONE_TAKE_DURATION_MS`) of today's note (`dailyNote('onetake', …)`, played once). Every
  frame `autoCorrelate` on the shared `analyser`; cents within ±300 kept. Scored in `runOneTake`: pitch = 100 − mean
  |cents| × 0.6 over `vibratoTolerantCents`, stability = 100 − SD × 3, timing = 100 − onset / 6 s × 100.
  `finishOneTake` stores `progress.oneTakeHistory[today]`, `recordSkillScore('pitch')`, one take a day.
- **Live:** `#oneTakeRunnerCard` (`#oneTakeStepLabel`, `#oneTakeNote` shows the note then "●", `#oneTakeStatus`). No live
  pitch on purpose ("no pitch guide"), which fits a stage with no lane.
- **Result:** `#oneTakeResultCard` → `#oneTakeResultRows` (Pitch, Stability, Timing rows) + `onetake_expression_note`. On a
  second visit the same day, only the result shows (`renderOneTakeGate`).
- **Mic / house:** `initAudio`; `singingSession(()=>oneTakeActive)` with no stage.
- **Doesn't fit stage + result:** the daily gate (pre card replaced by the result for the rest of the day); a two-step
  run (listen once, then sing) inside one take.
- **Copy:** hard-coded English: the gate text ("ONE TAKE. No restarting…", "Sign in to start your daily one take."), the
  start button "Begin today's one take", the step labels "Listen once" / "Recording your one take", the statuses "This
  plays once — no repeats." / "Sing now — no live feedback shown, this is your one real take.", the result row labels
  Pitch / Stability / Timing and the not-heard sentence. §7: `onetake_sub` (real, honest), `onetake_expression_note`
  (real, fake) in all four languages. Emoji: 🔥 in `onetake_title`.
- **Broken:** leaving the panel mid-take (`stopAllActiveSessions` sets `oneTakeActive = false`) ends the loop early and
  `finishOneTake` still saves the partial take as today's only attempt.

### Mirror (`panel-mirror`, code "Mirror Mode")
- **Measures:** a 4-note phrase in the range (`generateMirrorPhrase`, steps −4…+4), played (700 ms a note), then a
  2.8 s echo read from the shared `analyser` (`mirrorEchoLoop`). `finishMirrorEcho`: per note, `vibratoTolerantCents`,
  accuracy = 100 − mean |cents| × 0.6; `recordSkillScore('pitch')`.
- **Live:** `#mirrorCompareSvg` (reference lines in `--brass-dim`, your contour in `--teal`, redrawn every frame), the
  legend, `#mirrorStatus` ("Listen…", "Your turn — echo what you heard").
- **Result:** `#mirrorResultCard` (`#mirrorResultAcc` + `mirror_result_desc`) and `#mirrorReplayCard`: a range slider
  (`#mirrorReplaySlider`) scrubbing the take, with `#mirrorReplayTime`, `#mirrorReplayTarget`, `#mirrorReplayYou`,
  `#mirrorReplayDeviation`.
- **Mic / house:** `initAudio`; `singingSession(()=>mirrorActive)` from `startMirrorEcho` (the house goes down only for
  the echo, not while the phrase plays).
- **Doesn't fit:** a contour chart that is both the live display and the result; the replay scrubber; legend colours
  that are brass/teal (not House Lights tokens).
- **Copy:** hard-coded English: "Play a new phrase", "Listen…", "Your turn — echo what you heard", the deviation text
  ("+12 cents sharp", "(dead on)") and **"No signal at this moment"** (4b list). §7: `mirror_sub` (real ×2),
  `mirror_result_desc` (real), `mirror_replay_label` (real) in all four. Emoji: 🪞 `mirror_title`, 🔍
  `mirror_replay_label`. `mirror_sub` says "The AI sings": it's a synth phrase.
- **Broken:** the Play button isn't disabled while a phrase plays or the echo runs, so a second click starts a second
  phrase and a second echo loop on top. Leaving the panel while the phrase plays doesn't cancel the `setTimeout` that
  starts the echo: 3.2 s later `startMirrorEcho` sets `mirrorActive = true` and listens on whatever panel is showing.

### Rhythm (`panel-rhythm`, code "Rhythm Trainer")
- **Measures:** timing only. 2 count-in clicks + 8 scored clicks at 70 / 100 / 130 BPM (`RHYTHM_BPM`). `rhythmOnsetLoop`
  detects rising edges of raw RMS (`ONSET_RMS_THRESHOLD` 0.02) and claims the nearest beat within half a beat
  (`claimNearestTarget`); accuracy per beat = 100 − |offset ms| × 0.6 (`timingAccuracy`), average; `recordSkillScore('agility')`.
  Clicks are scheduled on the audio clock (`playTone` delay), onsets timed with `performance.now()`: output and input
  latency aren't compensated.
- **Live:** `#rhythmBeatDots` (8 numbered `.scale-dot`s, the current one highlighted) and `#rhythmLiveStatus`.
- **Result:** `#rhythmResultCard`: `#rhythmResultAvg`, `rhythm_result_desc`, `#rhythmResultRows` (Beat n: ±ms · %).
- **Mic / house:** `initAudio`; `singingSession(()=>rhythmActive)`, no stage.
- **Doesn't fit:** nothing pitched; the live display is a beat counter, not a lane.
- **Copy:** labels are keyed. §7: `rhythm_sub` (Genuinely, Real, real), `rhythm_desc` (real), `rhythm_result_desc` (real)
  in all four. Emoji: 🥁 `rhythm_title`. `rhythm_sub` also says "WHEN" in capitals.
- **Broken:** leaving the panel mid-run sets `rhythmActive = false`; the loop returns without `finishRhythmTrainer`, so
  `#rhythmStartBtn` stays disabled with "Running…" until the page reloads (the 4a stopcheck bug, in Rhythm).

### Register Coach (`panel-register`, title "Register Bridge")
- **Measures:** live, no take. Each frame `readRegisterFrame` (pitch from the low-passed path, chest score from the raw
  path's power spectrum, `chestScoreFromPower`), `updateRegisterUI`: below the passaggio (`window._passaggioMidi`) →
  chest; above it chest ≥ 62 → "Pushing chest", ≥ 35 → mixed, else head. A clean crossing (above the break, not pushing
  chest) counts frames; `maybeSaveBestBridge` saves the best as seconds (frames ÷ 60) with XP and a record popup.
- **Live:** `#bridgeSvg` (head / chest zones in teal / brass, the passaggio line, `#pitchMarker` moving and recoloured
  by zone), `#regLabel`, `#regFeedback`, stat chips `#regNoteStat`, `#regChestScoreStat`, `#regBridgeStat`, `#regBestStat`.
- **Result:** none: a live tool (Start / Stop).
- **Mic / house:** `openRegisterInput` (no `initAudio`); **no `singingSession`**: the house stays up; `vlFeed` in `loop()`.
- **Doesn't fit:** a vertical bridge diagram with a moving marker; zone colours teal / brass / ink-2; no result.
- **Copy:** hard-coded English: "Start listening", "Listening — tap to stop", "Listening…", all four zone labels and
  their feedback sentences, the SVG labels HEAD / CHEST / passaggio, the initial "Tap start and slide…", and the toast
  "Microphone access is needed for this demo…" (demo). §7: `register_sub` (PRD §3.2 / §12, "model", "§") in all four;
  `beta_heuristic_tag` "BETA HEURISTIC". Emoji: 🌉 `register_title`. The title says "Register Bridge", the hub says
  "Register Coach".
- **Broken:** `updateRegisterUI` returns early when `analyser` is unset, and only `initAudio` sets it. Register Coach
  opens only the register input, so on a fresh page it may show "—" / "Listening…" the whole time. *(Checked in the
  screenshots, below.)* Leaving the panel while listening (`mode = null`) stops the loop but leaves the button on
  "Listening — tap to stop" with `.listening`. Crossing seconds assume 60 frames a second (a 120 Hz display doubles them).

### Register Drills (`panel-registerdrills`)
- **Measures:** 5 notes (`DRILL_NOTE_COUNT`) from the lower or upper third of the range (`pickNote('drill', …)`), each
  played 0.6 s then read 1.8 s (`DRILL_CAPTURE_MS`) from `readRegisterFrame`: pitch accuracy = 100 − mean |cents| × 0.6
  (vibrato-tolerant), average chest score, a register match (chest ≥ 50 or head < 50). `recordSkillScore('pitch')`.
- **Live:** `#drillRunnerCard`: `#drillStepLabel` ("Note n of 5"), `#drillNote` (the note name), `#drillStatus`
  (listen / listening / "n% Pitch" between notes).
- **Result:** `#drillResultCard`: `#drillResultRows` (Note n (A3): % · chest % · match), `#drillResultNote`
  (`drill_result_template`), `#drillRetryBtn`.
- **Mic / house:** `openRegisterInput`; **no `singingSession`**; `vlFeed` per frame, `vlEnd` in `finishDrillSequence`.
- **Doesn't fit:** a per-note register verdict next to the pitch score (two dimensions per row).
- **Copy:** **`t('action_listen')` doesn't exist in any language**, so the status shows the raw key "action_listen"
  during every note's reference tone. The start button's markup default is English. §7 in all four languages:
  `registerdrills_sub` (Real, real), `drill_note_chest` / `drill_note_head` (real ×2), `drill_result_template`
  (genuinely), `registerdrills_results_label` ("Real results"). Emoji: 🎯 `registerdrills_title`.
- **Broken:** besides `action_listen`, leaving the panel mid-drill returns from `runDrillSequence` without resetting the
  cards: the runner stays showing and the pre card hidden until a reload (`drillActive` only).

### Real-Time Feedback (`panel-livefeedback`)
- **Measures:** live, no take, nothing stored. `lfLoop` per frame on `readRegisterFrame`: Pitch "In tune" within 8 ct
  (+ vibrato slack, `makeVibratoTolerantLive`), Stability = 100 − SD × 3 over 30 frames (≥ 75 Steady), loudness
  consistency = 100 − CoV × 140 over 40 frames (≥ 65), Register (above 60 % of the range and chest ≥ 62 → pushing).
- **Live:** four `.checklist-row`s: `#lfPitchIcon/Text`, `#lfStabilityIcon/Text`, `#lfBreathIcon/Text`,
  `#lfRegisterIcon/Text`; icons are ✓ / ⚠ / ○ characters.
- **Result:** none.
- **Mic / house:** `openRegisterInput`; **no `singingSession`**; `vlFeed` per frame.
- **Doesn't fit:** a four-row live checklist; no take, no result.
- **Copy:** hard-coded English: every row text ("In tune", "Sharp (+12ct)", "Steady", "Wavering", "Steady breath
  support", "Volume dipping", "Pushing chest — try mixed", "Balanced tone", "Listening…"), the button "Start listening"
  / "Stop". §7: `livefeedback_title` "Real-Time" (the name itself), `livefeedback_sub` (real, heuristic) in all four.
  Emoji: ⚡ `livefeedback_title`; ⚠ as a status icon.
- **Broken:** `lfActive` isn't in `stopAllActiveSessions`: leaving the panel leaves `lfLoop` running, reading the mic and
  feeding today's vocal load on every other screen until you come back and press Stop.

### Vibrato (`panel-vibrato`, code "Vibrato Analyzer")
- **Measures:** a 4 s hold (`captureVibratoTrace` → `vqCapture({spectrum:false})`), `analyzeVibrato`: rate (Hz) from
  peak intervals, depth (ct), consistency %, `VIBRATO_MIN_CENTS` 8. No score; `registerExerciseCompletion` only.
- **Live:** nothing but the button ("Listening…"): no live trace while you hold.
- **Result:** `#vibratoWaveSvg` / `#vibratoPolyline` (the trace, `--teal`), chips `#vibratoRateStat`,
  `#vibratoDepthStat`, `#vibratoConsistencyStat`, `#vibratoFeedback`.
- **Mic / house:** `vqCapture` (`micGraph`); **no `singingSession`**; `vlFeed` inside `vqCapture`.
- **Doesn't fit:** the result is a waveform trace plus three chips; an empty SVG sits on the idle page.
- **Copy:** hard-coded English: "Hold a note for 4s" / "Listening…" (the button), both "no vibrato" sentences, the rate
  feedback ("… Hz is within the commonly-cited natural range…", the depth sentence). §7: `vibrato_sub` (Real) in all
  four. Emoji: 🌊 `vibrato_title`. Units "Hz" / "ct" are hard-coded, the number unformatted (no locale decimal).

### Voice Quality (`panel-voicequality`)
- **Measures:** a 4 s hold (`vqCapture`, 8192-point spectrum + pitch), `vqSummarize`: vibrato (`analyzeVibrato`), HNR
  (`vqHnr`, bands 20 / 12 dB), brightness (`vqCentroid` ÷ f0 against `vqBrightBounds`). No score; completion only.
- **Live:** nothing but the button.
- **Result:** `#vqResult`: `#vqNote`, three `.vq-row`s (`#vqVibVal`/`#vqVibRead`, `#vqHnrVal`/`#vqHnrRead`,
  `#vqBrightVal`/`#vqBrightRead`), `vq_how`, `vq_fine`.
- **Mic / house:** `vqCapture`; **no `singingSession`**; `vlFeed` inside `vqCapture`.
- **Doesn't fit:** three readings with an explanation each; no single number.
- **Copy:** clean: every string keyed, no §7 word, numbers through `localeForLang()`. Emoji: 🔬 `vq_title`. The markup
  default of `#vqStartLabel` is English (replaced by `renderVoiceQuality` at load).

### Resonance (`panel-resonance`, "Resonance Visualizer")
- **Measures:** live, nothing stored. `resonanceLoop` on `readRegisterFrame`: steadiness = 100 − SD × 2.2 over 45 frames,
  oscillation = mean crossings × 9, zone from the chest score (62 / 35).
- **Live:** `#resonanceCanvas` (90 particles, colour from `resonanceColorFor`: hard-coded cyan / violet / amber RGB,
  idle `rgb(90,84,70)`), chips `#resRegisterStat`, `#resSteadyStat`, `#resOscStat`.
- **Result:** none.
- **Mic / house:** `openRegisterInput`; **no `singingSession`**; `vlFeed` per frame.
- **Doesn't fit:** a canvas particle visual with colour literals; no take, no result.
- **Copy:** hard-coded English: "Start" / "Stop", zone names "Chest" / "Mixed" / "Head", "Rippling" / "Calm", the canvas
  aria-label. §7: `resonance_sub` (real, genuinely), `resonance_limits_note` (Honest, real) in all four;
  `beta_heuristic_tag`. Emoji: 🎨 `resonance_title`.
- **Broken:** leaving the panel sets `resonanceActive = false` without `stopResonanceVisualizer`: the button stays on
  "Stop" with `.listening` and the chips keep their last values; the next click "stops" (nothing), a second one starts.

### Emotion Mode (`panel-emotionmode`)
- **Measures:** one note (`pickNote('emo', …)`) sung twice, 3 s each (`EMO_CAPTURE_MS`), with two intentions (yours and
  a random other). Per take (`runEmoRound`): dynamic range (max − min raw RMS), average loudness, pitch stability
  (100 − SD × 3, vibrato-tolerant). `finishEmoMode` compares B with A (% and points). No score; completion only.
- **Live:** `#emoRunnerCard`: `#emoRunnerLabel` ("Take 1 — ❤️ Tender"), `#emoRunnerNote`, `#emoRunnerStatus`.
- **Result:** `#emoResultCard`: `#emoResultRows` (Dynamic range / Loudness / Pitch stability comparisons),
  `#emoResultNote`, `#emoRetryBtn`.
- **Mic / house:** `initAudio`; `singingSession(()=>emoActive)`, no stage.
- **Doesn't fit:** an intention picker (five chips) before the take; two takes compared with each other, not a score.
- **Copy:** hard-coded English: "Selected: …", "Begin — sing it … first", "Take n — …", "Sing this note as … as you
  genuinely can.", "Recording…", every result row label and sentence, "Not enough signal… to compare honestly.", and
  `EMOTION_LABELS` (emoji + English, used in the runner and the result in every language). §7: `emotionmode_sub` (real
  ×4, genuinely, honestly), `emotionmode_differences_label` ("Real, measured differences") in all four; also
  "genuinely" / "honestly" in the hard-coded strings. Emoji: 🎭 title, ❤️ 🔥 😔 😎 😱 on the five intention chips (all
  four languages) and in `EMOTION_LABELS`.
- **Broken:** leaving the panel mid-take returns without resetting the cards: the runner stays showing and the pre card
  hidden until a reload.

## The three 4b items already in HANDOFF
1. Ear → Voice → Ear's step headers are hard-coded English: `eveStepLabel` "Step 1 — Hear" … "Step 5 — Sing without
   help" (`runEveLoop`, five `textContent =`).
2. "Listening…" is hard-coded on stage buttons and statuses: Vibrato's button, Register Coach's `#regFeedback`, Real-Time
   Feedback's rows, Harmony Memory's `#hmSingStatus`, the Tuner's `centsDisplay`, and others (`grep -n "'Listening…'"`).
   Keys `action_listening` and `vq_listening` already exist.
3. Mirror's "No signal at this moment" (`updateMirrorReplayScrub`).

## Verify scripts by tool
- **vibfix.js** (vibrato tolerance, real singing): Register Drills, Real-Time Feedback (plus Pitch Match, Tuner, Stay in
  Key, Choir World).
- **noisegate.js** (the singing gate): Register Drills, Real-Time Feedback (plus Pitch Match, Tuner, Stay in Key, Choir).
- **rtfsteady.js**, **rtfsoft.js**: Real-Time Feedback's Steady row and soft singing.
- **regfix.js**: Register Coach (`bug`, `noise`), Register Drills (`drills`), Real-Time Feedback register row and
  Resonance zone (`feedback`).
- **rcmic.js / regcoach.js / regcoach2.js**: Register Coach investigations (chest-score bias), not regression checks.
- **vq.js, bands.js, cvib.js, brightui.js; livevq.js** (production): Voice Quality and the Vibrato capture; realvib.js
  is the vibrato helper offline.
- **xscope.js**: One Take's pitch / stability formula replicated offline on the mic frames (not through its UI).
- **batch2 / batch3a / batch3b / batch3c, warmup-verify/entries.js, picker.js**: vocal load, the warm-up gate and the
  note pickers for these tools; none checks their scores.
- **loopreal.js** (exp/single-stream only) and **loopback.js**: none of the ten.
- **No score check at all:** Mirror, Rhythm, Emotion Mode (One Take only offline).

## Screenshots: what the tools showed
`scripts/design-verify/shots4b.js` (2026-10-23, master fc2ed85 = production), each tool in a fresh page, signed in, the fake
mic singing a steady A4; 94 shots, no page errors, the house up at the end of every tool. `states.json` on
`review/phase4b-before` has each tool's visible text in every state.

- **Register Coach shows nothing while you sing (confirmed).** With A4 sung for 3 s on a fresh page: label "—",
  feedback "Listening…", Note "—", Chest character "—", Clean crossing 0.0 s; the vocal-load gauge rose meanwhile, so the
  mic was being read. Cause as above: `updateRegisterUI` needs `analyser`, which only `initAudio` sets. It works only
  after another tool has opened the mic in the same page. At 390 the bridge diagram is cut off at the top and the
  "passaggio" label is clipped at the card's edge. Signed in without a saved crossing, it says "Sign in to save your best
  crossing across sessions." (`registercoach_signin_beststat` is used for "no best yet" too).
- **Register Drills shows "action_listen"** under the note during each reference tone (`*-cue.jpg`). The steady A4
  sat outside the chest third, so notes read "No signal" or low %, as expected.
- **Real-Time Feedback** worked live (Flat −16 ct, Wavering, Steady breath support, Balanced tone) and went back to
  four "Listening…" rows on Stop.
- **Resonance** worked live (Head, 82 %, Rippling); on Stop the chips go back to "—".
- **Vibrato / Voice Quality:** a straight A4 gives "No clear oscillation detected" and "No regular vibrato: a straight
  tone"; Voice Quality measured A4 (440 Hz), 4.0 s. Neither shows anything live but the button.
- **One Take:** the take ran (● and "Sing now — …"); result Pitch 0 % (A4 isn't today's note), Stability 83 %, Timing 100 %.
- **Mirror:** echo and replay card shown; 0 % (A4 against a phrase around C#3), as expected.
- **Rhythm:** a continuous tone gives one onset, before the first scored beat: 0 %, all eight "Missed". In the result
  shot the tab bar highlights Home, not Coach (not checked further).
- **Emotion Mode:** both takes ran; "🔥 Powerful was +0% vs ❤️ Tender" (one steady tone), the emoji labels in the rows.
- The house stayed up during every take: the four tools that call `singingSession` pass no stage and put nothing on
  one, and the six others don't call it.
