# Single-stream migration, step 1: investigation (the user's spec, verbatim, 2026-10-13)

Next: the single-stream migration, step 1: investigation only. No app change gets merged or deployed. Phase 4 waits until this is designed.

Why: signed-in users lose soft-singing frames in Real-Time Feedback (the Vocal Load sidecar opens a second stream); Firefox and Android get no Vocal Load (VL_SIDECAR_BLOCKED); and with nobody singing, speaker bleed scores as singing (Entrance Trainer 8/8, Harmony Arena 0–8/8, Harmony Memory 3/8).

Today the app opens three kinds of stream:
- the shared micStream (initAudio: echoCancellation and noiseSuppression on, AGC default);
- the register input (openRegisterInput: EC on, NS off, AGC off, pitch through the 1.5 kHz low-pass);
- the Voice Quality capture (vqCapture: all off).
vlSidecar opens the register input next to the shared stream.

Work on a branch, exp/single-stream. Measurement scripts go in scripts/audio-verify/. Any experimental variant of the app sits behind a flag that exists only on that branch (for example window.__streamMode), never on master. One verify script at a time, as always.

A. INVENTORY → design/audio/STREAMS.md
A table with one row per singing feature: all 33 singingSession sites, plus Register Coach, Register Drills, Register Runner, the Register Wraith boss, Resonance, Voice Quality, Studio and Your Choir recording (MediaRecorder), part rehearsal and the warm-up. Columns:
- which stream(s) it reads, and the analyser or FFT size;
- what it plays while listening (reference tone, backing, guide, choir parts) and whether it listens during playback;
- where its Vocal Load comes from (sidecar or its own register frames);
- what's blocked on which browser;
- which verify scripts cover it.

B. MEASUREMENTS (local build; numbers in the doc, logs committed)
1. Two-stream cost: rtfsoft.js signed in vs signed out (sidecar on vs off), 3 runs each, on Chromium.
2. Candidate single-stream configurations, each with every feature AND Vocal Load reading the one stream:
   C1. today's shared stream (EC+NS on), with Vocal Load computed from it;
   C2. the register-style stream (EC on, NS off, AGC off), with pitch through the 1.5 kHz low-pass for every feature;
   C3. one raw stream (EC on, NS off, AGC off) split in Web Audio into a pitch path (low-pass) and a loudness path.
   For each, against today, by the regress method (3 runs per side, medians):
   · vibfix and noisegate stimuli on Pitch Match, Drills, Choir World and RTF;
   · rtfsoft soft-singing frames;
   · Vocal Load per session against today's sidecar value, on the batch harness stimuli.
3. Browser matrix (Playwright Chromium, WebKit and Firefox on this Mac, using each engine's fake-capture setting): open a second getUserMedia stream next to the first. Does the first track mute, drop level or keep working? Record track.muted, readyState and RMS on both, per engine.
4. Speaker bleed, on the Mac's real speakers and mic: run the loopback check (nobody singing) for Entrance Trainer, Harmony Arena, Harmony Memory, Pitch Match, Scale Run, Custom and Pitch Rift under C1, C2 and C3. Then try two bleed defences and measure each with the loopback check:
   D1. a bleed calibration at session start: play the session's own first tone for 0.5 s, measure the mic level it produces, and ignore frames below that level × a margin while that tone class is playing;
   D2. while the app is playing, reject frames whose detected pitch is within ±50 cents of a note currently playing, unless the level is clearly above the calibrated bleed.
   Report false singing (loopback) for each option, AND the cost to real singing using the sung stimuli played as the fake mic with playback running (scores and frames vs today).
5. Real devices (I can't measure these; the user can):
   - Build scripts/audio-verify/micdiag.html: a standalone page that opens a stream, shows its live level, opens a second stream, shows both levels and whether the first went quiet or muted, then plays a 1 s tone and shows how much of it the mic hears with EC on and with EC off.
   - Deploy it as a Vercel preview (not --prod), only after the user types the go-ahead.
   - Give the user the URL and a 1-minute checklist for their phone(s) (iPhone Safari, and Android Chrome if they have one), with the numbers they should send back.

C. RECOMMENDATION → design/audio/SINGLE_STREAM.md
- The options compared in one table: score changes, soft-singing frames, Vocal Load accuracy, bleed, browser support, effort and risk.
- Your recommended configuration and bleed defence, with the evidence for each.
- A migration order (feature groups), and what each step must verify.
- What changes for users: scores that would move, by how much, and in which direction.
- Open questions only the user's phone test can answer.

D. REPORT, then stop
- Push exp/single-stream after the secret check (no merge).
- Send the summary table, the browser matrix, the bleed results, the micdiag URL with its checklist, and your recommendation.
- I'll choose the design and write the build spec. Phase 4 starts after the migration ships.
