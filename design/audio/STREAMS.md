# Mic streams: inventory (single-stream migration, step 1, part A)

Read from `deploy/index.html` at master `30915b4` (2026-10-13). Line numbers are master's.

## The three streams today

| Stream | Opened by | Constraints | Read through | Who reads it |
|---|---|---|---|---|
| **Shared** `micStream` | `initAudio()` (5224) | echoCancellation on, noiseSuppression on, autoGainControl default (on in Chromium and Safari) | one `AnalyserNode`, fftSize 2048, `analyser.getFloatTimeDomainData(dataArray)` → `autoCorrelate()` (pitch) and/or `computeRMS()` (loudness). Most features use the helpers `captureAccuracyForTarget()` (16205) or `captureNoteFrame()` (15378). MediaRecorder features record the stream itself. | 30 of the 33 `singingSession` sites |
| **Register input** `regIn` | `openRegisterInput()` (11978) | EC on, NS off, AGC off | two analysers, fftSize `REG_FFT` 2048: pitch behind two 1.5 kHz low-passes (`VQ_PITCH_LP_HZ`); spectrum and raw signal unfiltered (`chestScoreFromPower`, loudness). `readRegisterFrame()` | Register Coach, Register Drills, Register Runner, the Register Wraith boss, Resonance, Real-Time Feedback; **and `vlSidecar`** |
| **Voice Quality capture** | `vqCapture()` (12695), opened and closed per capture | EC off, NS off, AGC off | spectrum analyser fftSize `VQ_FFT` 8192; pitch analyser `VQ_PITCH_WIN` 2048 behind the same 1.5 kHz low-pass | Voice Quality, the Vibrato Analyzer |

**`vlSidecar(isActive)`** (12329) is called by `singingSession()` (18718), so by every one of the 33 sites. Signed in, on desktop
Chromium only (`VL_SIDECAR_BLOCKED`, 12224: not Chromium, any Android or mobile UA, iOS, iPadOS), it opens the **register
input next to the shared stream**. While the session runs it feeds Vocal Load one register frame per animation frame.
The register input closes itself once nothing has read it for 3 s (`REG_IDLE_MS`). Signed out it returns at once.
Where it is blocked, those features add nothing to Vocal Load and their gauge is hidden. Exception: the Karaoke Boss
skips it when the boss reads the register input itself (`bossUsesRegisterInput`, the Register Wraith).

All playback goes through one chain: `playbackIn` → the limiter → `destination` (`ensurePlaybackChain`, `playbackDest()`).
Its sources:
- reference tones, `playTone`: harmonic, about −12 dBFS RMS, played *before* the mic listens;
- guide tones, `playGuideTone`: a plain sine at about −23.4 dBFS, played *while* it listens;
- the backing pad, `playBackingPad` → `scheduleBackingNote`: sine chords on S/A/T/B;
- the choir, `playChoir` → `scheduleChoirNote`: five sine parts, each with its own gain per rehearsal level;
- clicks and ticks (`playTone` with a gain);
- the siren (`playSiren`);
- recorded takes (`AudioBufferSourceNode`, `<audio>`).

## One row per singing feature

**Plays while listening** has three levels:
- **during**: the app plays something while the mic is scored. Bleed can be scored as singing.
- **before**: a reference plays first and the listening window opens after it. Bleed comes only from a tail.
- **—**: nothing plays.

**VL** is where Vocal Load comes from: the **sidecar** (`vlSidecar`, desktop Chromium only) or the feature's **own** frames (`vlFeed` in its loop, every browser).

**Blocked**: unless a row says otherwise, the only block is the sidecar's (no Vocal Load and no gauge outside desktop Chromium). Nothing else in the app branches on the browser. Your Choir's export needs AudioWorklet. MediaRecorder picks a supported mime type.

| # | Feature (site) | Stream · reader · FFT | Plays while listening | VL | Blocked | Verify scripts |
|---|---|---|---|---|---|---|
| 1 | Tuner (5391) | shared · `analyser` 2048 · pitch (live vibrato centre) | — | sidecar | sidecar | vibfix, noisegate, house, stage, batch2, batch3c |
| 2 | Range Finder (5417) | shared · 2048 · pitch | — | sidecar | sidecar | range-verify/reload, batch2 |
| 3 | Breath Trainer (12404) | shared · 2048 · **loudness only** (`computeRMS`) | — | sidecar | sidecar | house, stage, batch2 |
| 4 | Stay in Key (12931) | shared · 2048 · pitch | **during**: backing pad (S/A/T/B chords) for the whole song | sidecar | sidecar | vibfix, noisegate (both measured only), batch1 |
| 5 | Emotional Singing (13020) | shared · 2048 · pitch + loudness | **during**: backing pad | sidecar | sidecar | batch2 |
| 6 | Karaoke Coach (13233) | shared · 2048 · pitch | **during**: backing pad | sidecar | sidecar | batch1 |
| 7 | Entrance & Cutoff Trainer (14391) | shared · 2048 · loudness onsets + pitch | **during**: the choir at the rehearsal level, the count-in clicks, the audio ticker | sidecar | sidecar | choir-verify p8, timing; tt-verify firsttick; batch3b; **loopback** |
| 8 | Harmony Memory (14613) | shared · `captureNoteFrame` · pitch | **during**: the choir at the stage's level (stage 1: your part as a full guide; stage 6: your note over the count-in, then silence) | sidecar | sidecar | choir-verify verify; **loopback** |
| 9 | Choir Bosses, Chaos Mode, Tempo/Key Ladder (14857) | shared · `captureNoteFrame` · pitch | **during**: the choir with the boss's effects (guide per boss; The Silence: a reference over the count-in) | sidecar | sidecar | live9, p5, p7, p9, p10, peaks, batch3b |
| 10 | Your Choir recording (15138) | shared · **MediaRecorder** (the stream as captured: EC + NS) | **during**: your part's synth and the other parts' recorded takes | sidecar | sidecar; export needs AudioWorklet | yc, live6, p8, p9, p10, batch3a |
| 11 | Pitch Match (16513) | shared · `captureAccuracyForTarget` 2048 · pitch | **before**: reference 0.9 s, then the cue (`referenceThenCue`) | sidecar | sidecar | vibfix, noisegate, listenwin, pmframes, rtfsoft, house, stage, batch1 |
| 12 | Interval Match (16593) | shared · `captureAccuracyForTarget` | **before**: two references | sidecar | sidecar | house, batch2 |
| 13 | Scale Run (16678) | shared · `captureAccuracyForTarget` per step | **before**, per step (it waits `referenceDoneMs` since 2026-10-06) | sidecar | sidecar | batch2; **loopback** |
| 14 | Pitch Glider / Vocal Journey (17669) | shared · 2048 · pitch | — | sidecar | sidecar | glider-verify courses, flight; batch1 |
| 15 | Warm-up, exercise (17874) | shared · 2048 · pitch | — (a visual guide) | sidecar | sidecar | warmup-verify tracking, entries |
| 16 | Warm-up, song (17931) | shared · 2048 · pitch | **during**: backing pad | sidecar | sidecar | warmup-verify entries (reaches it, doesn't score it) |
| 17 | Karaoke Boss Battle (18039) | shared · 2048 · pitch + loudness | **during**: backing pad | sidecar | sidecar | batch1, batch3a, regfix |
| 18 | Boss training, Listen (18271) | shared · `captureAccuracyForTarget` | before (a separate Play button) | sidecar | sidecar | batch3b |
| 19 | Harmony Arena (18479) | shared · 2048 · pitch | **during**: all five choir parts (yours at 0.08, the others at the level's mix), the piano guide (`playGuideTone`, optional), Distraction Mode's guide-level notes | sidecar | sidecar | batch3a; **loopback** |
| 20 | Custom Challenge (19943) | shared · `captureAccuracyForTarget` | **before**: reference 0.5 s, waits `referenceDoneMs` | sidecar | sidecar | batch2; **loopback** |
| 21 | Journey "Record" (20042, `recordShortClip`) | shared · MediaRecorder 4 s | — | sidecar | sidecar | batch3a |
| 22 | Hear Yourself Improve, Record today (20090) | shared · MediaRecorder 4 s | — | sidecar | sidecar | batch3a |
| 23 | Rhythm Trainer (20149) | shared · 2048 · **loudness onsets** | **during**: metronome clicks (`playTone` 660/880 Hz, 80 ms) | sidecar | sidecar | batch2 |
| 24 | Mirror Mode (20274) | shared · 2048 · pitch contour | before: the phrase, then the echo is captured | sidecar | sidecar | batch2 |
| 25 | The Vocal Rift (20403) | shared · `captureAccuracyForTarget` | before | sidecar | sidecar | batch3b; **loopback** |
| 26 | Ear → Voice → Ear (20843) | shared · `captureAccuracyForTarget` | before: reference 0.9 s, 1.3 s wait | sidecar | sidecar | batch3b |
| 27 | Sing It 5 Ways (21060) | shared · `captureAccuracyForTarget` | before: 0.7 s, 1 s wait | sidecar | sidecar | batch3b, picker |
| 28 | One Take Challenge (21149) | shared · 2048 · pitch | before: 0.9 s, 1.3 s wait | sidecar | sidecar | batch3b |
| 29 | Can You Hear Your Mistake, sing-back (21321) | shared · `captureAccuracyForTarget` | before (the A/B pair) | sidecar | sidecar | batch3b |
| 30 | Studio Mode (21378) | shared · MediaRecorder 15 s | — | sidecar | sidecar | batch3a |
| 31 | Emotion Mode (21432) | shared · 2048 · pitch + loudness | before: 0.6 s, 0.9 s wait | sidecar | sidecar | batch3b, picker |
| 32 | Performance Director (21550) | shared · 2048 · pitch + loudness | — | sidecar | sidecar | batch3b |
| 33 | AI Duet Partner (21877) | shared · 2048 · pitch | **during**: the full choir, looping | sidecar | sidecar | batch3a |
| R1 | Register Coach (`regMicBtn`) | register · `readRegisterFrame` (pitch LP 2048, spectrum 2048) | — | own | none | regfix, pilot, batch3c, range-verify/reload |
| R2 | Register Drills (21649) | register | before: reference 0.6 s, 0.8 s wait, per note | own | none | vibfix, noisegate, rtfsoft, regfix, batch3a |
| R3 | Register Runner (18286) | register | — | own | none | regfix, batch2, batch3a |
| R4 | Register Wraith boss (`bossUsesRegisterInput`) | register | **during**: backing pad (EC on this stream is meant to keep it out) | own | none | regfix, batch3a |
| R5 | Resonance Visualizer (19691) | register | — | own | none | regfix, batch3a |
| R6 | Real-Time Feedback (13369) | register (pitch, stability; raw for loudness) | — | own | none | vibfix, noisegate, rtfsoft, batch2 |
| V1 | Voice Quality, Vibrato Analyzer (12640, 12502) | **own capture**, all processing off · 8192 + LP 2048 | — | own (`vlFeed` in `vqCapture`) | none | vq, livevq, bands, brightui, cvib, shotlang, batch3a, harness |
| — | Part rehearsal, plain Play (14011) | **no mic** (playback and the Breath Map only) | — | — | — | p7–p10, fix, verify |
| — | Studio / Your Choir *recording* | as rows 10 and 30 | | | | |

## What this means for the migration

- **One switch serves 30 features.** The 30 shared-stream sites read the same `analyser` / `dataArray`, or the same
  `micStream` for MediaRecorder. Changing what backs `initAudio()` changes all of them at once. The six register
  features share `openRegisterInput()`. Voice Quality has its own function. The experiment flag on this branch uses
  exactly these three places plus `vlSidecar` (`window.__streamMode`, see SINGLE_STREAM.md).
- **Thirteen features listen during playback**, so speaker bleed can be scored as singing: Stay in Key, Emotional Singing,
  Karaoke Coach, the Entrance & Cutoff Trainer, Harmony Memory, the Choir challenges, Your Choir, the warm-up song, the
  Karaoke Boss, the Register Wraith, Harmony Arena, the Rhythm Trainer and AI Duet. Thirteen play a reference first
  (exposed only to its tail). Fourteen play nothing.
- **Loudness readers** (`computeRMS` on the shared buffer): Breath, Emotional Singing, the Entrance & Cutoff Trainer,
  the Karaoke Boss, the Rhythm Trainer, Emotion Mode, Performance Director. These are the features where C2 and C3 differ.
- **Vocal Load today has two sources.** The sidecar covers the 33 sites, desktop Chromium only. Own frames cover the
  register features and Voice Quality, on every browser. On Safari, iOS, Firefox and Android, 33 features add nothing.
- **Gaps in coverage**: no script scores the warm-up song, Register Runner's or Wraith's pitch (regfix checks their
  chest readings), the AI Duet or Performance Director beyond "it runs and Vocal Load is stored" (batch3a/3b).
