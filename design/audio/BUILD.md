# Single-stream build: the user's spec (verbatim, 2026-10-15)

Single-stream build: one stream (C3) with F2. My decisions on 1b: F2 is the quiet-singer fix. Record it in SINGLE_STREAM.md (a "Decision" section), CHOIR_WORLD_ROADMAP.md and HANDOFF.md first. The quiet-room loopreal run waits for a quiet room and AC power; it isn't needed until the bleed fixes (step 7, later). Run every long job on AC power from now on, with checkpoint/resume as you did.

Build on a new branch, feat/single-stream, from master. Port the measured C3 + F2 code from exp/single-stream as the only code path: no flags. Save this message as design/audio/BUILD.md and commit it first.

1. COMMITS, in this order, each one self-contained so a regression can be bisected:
   1.1 The stream module.
       - One getUserMedia({audio:{echoCancellation:true, noiseSuppression:false, autoGainControl:false}}), opened on first use, kept open as today's shared stream is, and never a second one.
       - One Web Audio graph:
         · pitch path: the two 1.5 kHz low-passes, then the F2 gain (at most +18 dB, up over 1.5 s, down over 0.25 s, held still in silence), then the pitch analyser;
         · raw path: unfiltered, then the raw analyser(s).
       - initAudio, initAudioOnly, openRegisterInput, vqCapture and vlSidecar keep their names and signatures but use this stream and graph, so call sites don't change.
         · Register input: chest spectrum from the raw path (fft 2048, smoothing 0, as today), pitch from the pitch path.
         · Voice Quality: its analysers (VQ_FFT, VQ_PITCH_WIN) attach to the same graph, raw and pitch paths, at today's sizes.
         · Vocal Load: reads the raw path for every feature on every browser. vlSidecar opens nothing. VL_SIDECAR_BLOCKED and the gauges hidden because of it are removed.
         · MediaRecorder records the one stream.
   1.2 Loudness readers on the raw path, as in C3: Breath, Entrance & Cutoff Trainer, Rhythm, Emotion Mode, Emotional Singing, Performance Director, the Karaoke Boss, and the chest reading.
   1.3 RTF "Steady" with echo cancellation on (vibfix N2: an unsteady note reads Steady +22, past the ≤25% line). Retune the Steady criterion on C3 readings, so that N2 stays under its line and every steady stimulus (S1, the V notes) still passes. Show both sides in vibfix. If no criterion separates them, stop and tell me.
   1.4 Tuner thresholds. The in-tune lock (6 ct) is unchanged. Stability reads +7 on average now. Check that checkVocalHealthSignal and any stability band still mean the same thing on the vibfix notes. Change a number only with evidence, and list it.
   1.5 Remove the experiment: __streamMode, __bleedDefence, D1/D2 code, and the old three-stream constraints. No other app change. The bleed fixes are a separate later step.

2. VERIFICATION (one at a time; "before" = master in the same run; medians of 3 where the suite supports it)
   2.1 First, as a scripts-only commit: rtfsoft and noisegate sample RTF over a whole loop instead of 6 s. It runs on both sides.
   2.2 Then:
       - vibfix and noisegate in regress mode
       - vlcompare; Vocal Load batch1–3c and the harness (the Safari check now expects the gauge)
       - regfix (chest readings, now with EC on)
       - listenwin, pmframes, picker
       - glider courses and flight
       - choir p9, p10, live7, live9, and the cv suites that pass on master
       - yc.js, live6, batch3a (recordings: playback level of new takes)
       - vq.js, livevq, bands, cvib (Voice Quality with EC on: brightness and breathiness may move; report by how much)
       - tt firsttick, range reload, warm-up entries and tracking, levelup
       - house.js, home.js, hooks.js, contrast.js
       - loopback on the Mac's speakers, nobody singing: reference tails no worse than today
       - modecheck.js on Chromium, WebKit and Firefox: exactly one getUserMedia per page session, every path reading it, the Vocal Load gauge showing on all three
   2.3 Gate: 0 Regressions, apart from these accepted ones:
       - Pitch Match pro +4 on the flutter note (W4, the low-pass);
       - the Tuner stability and in-tune shifts already listed in SINGLE_STREAM.md, if 1.4 shows they're harmless.
       Anything else new blocks. Report it with its cause.

3. PHONE CHECK (needs my typed go-ahead)
- Deploy feat/single-stream as a Vercel preview, not --prod.
- Give me the link and a 2-minute checklist for my iPhone:
  1. the Tuner shows "In tune" on a held note;
  2. Pitch Match scores a sung note;
  3. the Vocal Load gauge appears (a first on iPhone);
  4. a recording in Studio plays back;
  5. the mic indicator shows once, not twice.

4. REPORT, then stop
- Commits; the verification table; anything accepted and why; the Voice Quality shifts; the browser matrix; the preview link.
- No merge and no production deploy until I've reviewed. The production rollback target will be dpl_CAMGry4a7b8RewSA6bJNST64PVv7.
