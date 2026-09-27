# Choir World 2.0 — Roadmap

The full phased plan for the Choir World upgrade of the Choir Workspace. One phase is built at a time,
verified on the live site with real measurements (actual GainNode values, hand-checked timings), and
reported back before the next phase starts. Production deploys need explicit approval.

`deploy/index.html` is the canonical client; `voxcoach-prototype.html` mirrors it (see BACKEND.md).

| Phase | Status | Scope |
|---|---|---|
| 1 | DONE | "I Am the {Part}" rehearsal view, 5 real volume-fade levels |
| 2 | DONE | Sonic X-Ray, Music Microscope, Harmony Vision (all real, scoped to the 2 real songs) |
| 3 | DONE | Entrance Trainer, Cutoff Trainer, A Cappella Mode |
| 4 | DONE | Harmony Memory (6 progressive stages, reusing the volume-fade mechanic from Phase 1 and A Cappella from Phase 3 for stage 5) + Breath Map (real breath points from real phrase-gap data) |
| 5 | DONE (live 2026-09-23, dpl_6AeAfDhn21zuEQenxAqnRhfXmMVd) | Gamification: Choir Boss System (6 bosses: Drowner, Drifter, Sprinter, Ghost, Shifter, Silence), Chaos Mode (random surge/dropout/drift plan per run), Tempo/Key Ladder (6 rungs up to 130% tempo, ±2 semitones) |
| 6 | DONE (live 2026-09-23, dpl_Hm1FPXgu1U4cVt8immnEg4daYXUn; see known issue below) | "Your Choir" in Choir Workspace: record each of the 5 parts with Studio Mode's recorder (count-in, synth guide for the part, earlier takes play back), stacked playback through the workspace mixer GainNodes |
| 7 | DONE (live 2026-09-24, dpl_GSwwHVrem2Bysbn8hgh7j61BWfPi) | Reporting: Performance Report, "Why Did I Fail?", Readiness Engine, Choir DNA, Choir Passport |
| 8 | DONE (live 2026-09-24, dpl_GsSgU8oxkt8ZYXjJkLpRP7iJwnJX) | Monetization: gate the entire Choir World feature set (including the Phase 1–3 rehearsal view, trainers, and A Cappella Mode, which are currently unrestricted) behind the Choir/Studio plan, with an honest locked-preview for lower tiers |
| 9 | DONE (live 2026-09-24, dpl_8mrkgf1Do11dweAKXt2wVU4pWqFB) | Hooks: Home card, Songs hub entry, Journey milestone, new achievements |
| 10 | DONE (live 2026-09-24, dpl_3a4aZmkfkbtwMZeMB8aApZwzDMmR) | Growth Hooks: Personal Competition delta on the Home card, Your Choir WAV export |

### Phase 6 known issue: recorder latency (uncompensated)

Recorded takes sit ~67 ms after the song clock because of recorder latency (measured in headless
Chromium with a test-tone mic; every take landed 65–68 ms late, and takes stay aligned with each other
within ~2.4 ms). It is not compensated, and the real figure varies by device and mic: input latency adds
to it, and the singer also hears the guide late by the output latency. A future fix needs a
calibration step before recording starts, e.g. measuring round-trip latency by playing a test click
and timing its arrival at the mic, then shifting each take's `lead` by that amount. Not blocking for
now, but it should be addressed before Your Choir is positioned as a serious rehearsal tool rather
than a fun feature.

### Phase 8 gate rules

Choir World (everything from phases 1–7) needs `hasChoirWorldAccess()`: the Choir plan, or anyone
inside the 21-day trial (the same trial rule as every other gate in the app). Monthly, Yearly and
Teacher get the locked preview. Signed-out visitors get it too, with a "start your trial" button. The
Phase-0 workspace (song picker, Song Difficulty, Song DNA, mixer, practice chips, Director Dashboard)
is unchanged: `requireChoirFeature` still lets trial, Choir, Monthly and Yearly use the mixer. Every
Choir World action checks `requireChoirWorld()` itself, so hiding the cards is only the view. A
subscriber who is still inside their first 21 days keeps full access until the trial window ends,
whatever their plan.

### Phase 9 hooks

All of them read the readiness already stored in `user_progress.choir_readiness`; nothing new is measured.
The only new data is `choir_readiness.firsts` ({hmPass, bossWin, ready, ycTake}, each with a timestamp),
stamped by the run that did it (`cwStampFirsts` inside `rdSync` / `rdCountTake`), so no migration.

- **Home card** (`#homeChoirCard`, `renderHomeChoirCard`): the most recently updated part across both
  songs ("Your Alto is Developing — continue rehearsing"), its real counts and what is still missing for
  Ready, with a button into I Am the Part on that song and part. No readiness yet: an entry card. Locked
  tiers (Phase 8 rules): an upgrade card that names the Choir plan, shows readiness saved during the
  trial if any, and links to pricing. Hidden when signed out (the signed-out card already covers it).
- **Songs hub**: Choir World is its own featured card above the grid (I Am the Part, Choir Workspace,
  Choir Passport, plus a "last rehearsed" status line for unlocked users); the old I Am the Part tile is gone.
- **Journey milestone** (`#journeyChoirMilestone`): the first Harmony Memory stage passed (≥75% of notes
  held). Passes from before Phase 9 count from the stored stage bests, without a date.
- **Achievements**: `cw_boss` (first Choir Boss beaten), `cw_ready` (any part Ready), `cw_yourchoir`
  (first Your Choir take). A toast announces each one (and the milestone) as soon as the run ends, before the save (so a slow or failed save cannot swallow it).

### Phase 10 growth hooks

- **Delta on the Home card** (`cwDeltaText`, `#homeCwDelta`): when a part's status changes, `rdSync` keeps the part's
  last saved record from before that run as `choir_readiness.parts[song][part].snap` = {ts, status, levels, hm, bosses}
  (one per part, replaced at the next status change; ts is null and the counts 0 if the part had no record yet). The
  card shows what went up since then, e.g. "Since you were Learning (today): +2 Harmony Memory stages · +1 boss beaten";
  nothing when there is no snapshot or nothing went up. The "when" is relative (today, yesterday, 3 days ago, last
  week, 2 weeks ago) and becomes a date after 5 weeks. Stored in the existing jsonb column, so no migration.
- **Your Choir export** (`ycExport`, `#ycExportBtn`): plays the stacked takes once with `ycPlay()` (so faders, Mute/Solo
  and the output trim apply, and you hear it) while an AudioWorklet on `choirOutNode` copies the samples from the
  downbeat to the song end; they're saved as a 16-bit mono PCM WAV at the context's sample rate. It runs in real time.
  Stopping early saves nothing. Check with `p10.js`, which decodes the file outside the browser with `wavcheck.py`.

## Voice Quality Analysis — known issues

Voice Quality (`#panel-voicequality`, Train → Expression) is a separate feature line from Choir World; phase 1 (live 2026-09-24,
dpl_3yLCTs4WhNCdrSY52DEGwDi7SYum, verified with `scripts/vq-verify/livevq.js`) is
vibrato, breathiness (HNR) and brightness (spectral centroid), and the Vibrato Analyzer now shares its capture.
Method and injected-vs-measured results: `scripts/vq-verify/README.md`.

- **Noise-robustness testing was done in Chrome only.** The vibrato and breathiness tests (`vq.js`, `noisemic.js`) ran
  in Chromium with synthesized signals fed as the mic. The capture asks for echo cancellation, noise suppression and
  auto gain off, and Chrome honours that; Safari, Firefox and mobile browsers (and phones' own mic processing, which
  can sit below the browser) are unverified: they may ignore those constraints or process the signal differently,
  which would change breathiness most (noise suppression removes breath noise) and vibrato depth under noise.
- ~~Brightness reads high on notes with vibrato~~ **fixed** (9ce59cd + 630fe3b, live 2026-09-24, dpl_Y9AJou1nHAh94CGxLqKV1zFDBdeu): the centroid was magnitude-weighted, and
  vibrato spreads the upper harmonics over more FFT bins, which adds magnitude weight to them (a 330 Hz tone read 633 Hz
  straight, 679 / 699 / 713 Hz with 6 Hz ±25 / ±50 / ±100 ct). It is now power-weighted, which that spreading doesn't
  change: straight tones read exactly, vibrato up to ±100 ct moves it ≤ 0.7%. The reading bands were re-derived as a
  harmonic roll-off (dark steeper than 13 dB/oct, bright shallower than 9; the old 2× / 4× bands as they fell at 220 Hz)
  and converted to centroid ratios for the sung note, so they mean the same timbre at every pitch (18/18 known-slope
  tones read correctly at 110 / 220 / 440 Hz, straight and with vibrato; 24/24 tones ½ dB/oct either side of each line,
  straight and ±50 / ±100 ct, land on the right side). The ratio is shown to two decimals and the band is read from the
  shown value, so each shown ratio is one band (checked live). Check with `vq.js centroid`, `bands.js`, `cvib.js` and
  `brightui.js [url]`.
- The reading bands (HNR 20 / 12 dB; brightness 13 / 9 dB per octave) are rough guides for this tool, not norms measured
  on real voices; nothing has been measured on a real singer yet.

## Vocal Load Dosimetry — decisions

- **The daily budget counts active singing time, not wall-clock practice time.** DECIDED, CLOSED (2026-09-27, final).
  The budget is 6800 load-seconds (`DAILY_BUDGET` in `deploy/vocal-load.js`): about 52.5 minutes of active singing
  at mid-range with 3 dB of dynamics. Rests, count-ins and time spent listening don't count. The question of whether
  "45–60 min" meant active or wall-clock time (with about ⅓ rests, 45 min of practice reads as about 57%) is settled
  as active time. Don't raise it as open again.
- **Break suggestions** (phase 3c): a banner at 80% and at 100% of the budget. It appears in the panel of whichever
  feature is feeding the load at the moment today's total crosses the threshold, and never blocks anything. Each
  threshold can be dismissed once per day. Dismissals are kept per browser, per user and per UTC day, so a new browser
  shows a threshold again. The first banner shown on a day carries the disclaimer, which also sits under the Home
  card's gauge.
- **Known, accepted limitation: break-banner dismissals are per browser.** They are kept in the browser's local
  storage (per user and per UTC day), not on the account. Someone who dismisses the 80% or 100% banner on one device or
  browser will see it again on another the same day, once singing there crosses that threshold. This is not a bug, and
  it is not planned to change. Making dismissals follow the account would need a server-side store.

## Known issues (app-wide)

- **Page `lang` stays `"en"` whatever language is selected.** Text uppercased with CSS
  (`text-transform: uppercase`) is then transformed with English rules, which is wrong in Turkish: `i`
  should uppercase to `İ` (dotted) but comes out as `I`, so the dotted/dotless pair (i/İ, ı/I) is
  mixed up on every CSS-uppercased label. Not blocking, but worth fixing in a dedicated pass
  (set `document.documentElement.lang` on every language switch and check the result per language),
  since it likely affects text outside Choir World too.
- **Top bar overflows by 7 px at 390 px width** when the account chip shows a long plan label
  ("YEARLY"): the page scrolls sideways slightly. Already on production before Phase 8.
- ~~Paywall sentence spacing~~ fixed (20e6d01, live 2026-09-24, dpl_9vV6eaRknVdYSYBqDTP1fzfJvtdH): the paywall sentence is now one template per language
  (`paywall_ispartof_tpl`), so French/Spanish end "…du forfait Chorale." with no stray space. After the
  trial, Choir World features say they continue on the Choir plan with its price
  (`paywall_trialended_choir_tpl`); the mixer keeps "a paid plan", since Monthly/Yearly unlock it too.
  Check with `paywall.js`.
- **Register Coach ignores the saved range after a page reload** (FIXED and deployed 2026-09-27, dpl_5kEmsQp; found
  2026-09-25 while building Vocal Load Dosimetry). Fix: `userRange()` returns a Range Finder capture made on this page
  if there is one, otherwise the saved range, otherwise null, and `registerRangeBounds()` falls back to A2–C5 only on
  null. Song Difficulty also uses `userRange()`. `setExerciseLevel` now always re-runs after progress loads (at startup
  and at sign-in), so the first Pitch Match / Interval / Scale Run / Ear targets, drawn at script load, are redrawn from
  the saved range. After a reload the saved range is the account's *widest ever* (captures only widen it), while on the
  page that ran the capture it's that capture. Check: `scripts/range-verify/reload.js` (30/30 on production; the old code
  fails 11). Original report: `registerRangeBounds()` reads `lowNote` / `highNote`. Those are in-memory globals, set only
  by a Range Finder run since the page loaded and reset to null on every load. So after a reload it silently falls back
  to A2–C5 (MIDI 45–72), even though Register Coach's subtitle says it "Uses your Range Finder range if you've captured
  it". The saved range exists and is correct: `user_progress.lowest_midi` / `highest_midi` (`progress.lowestMidi` /
  `highestMidi`, written by `recordRangeCapture`). Register Coach just doesn't read it. The same function also sets the
  range for the passaggio line and the Bridge zones (`drawBridgeZones`), Real-Time Feedback's register row (`lfLoop`),
  Pitch Match, Interval and Scale Run targets (`newPitchTarget`, `newIntervalTarget`, `newScaleRoot`), the warm-up
  context and the Glider's scale, so they all use A2–C5 after a reload too.
  - **Repro:** sign in with an account that has a saved range different from A2–C5 (e.g. C3–C6), reload, open Register
    Coach: the passaggio sits at A2–C5's, round(45 + 0.6 × 27) = MIDI 61 (C♯4), not the saved range's, round(48 + 0.6 × 36)
    = MIDI 70 (A♯4). Run the Range Finder in the same page load and it moves.
- **An exercise started while progress is still loading drops its activity/XP tick** (open, not fixed; found
  2026-09-25 during the Register Coach production checks). `recordActivity()` only checks that `profile` has loaded,
  not `progress`, and `onSignedIn()` awaits `loadProfile()` and then `loadProgress()`. So on every page load (and right
  after sign-up), for one `/me/progress` round-trip, `profile` is set while `progress` is still `null`. Starting an
  exercise in that window throws `TypeError: Cannot read properties of null (reading 'history')` inside
  `recordActivity()`, and that session's activity, streak and base XP are silently lost. The exercise itself keeps
  working. All 14 `recordActivity()` callers are affected. It has been there since the initial commit (aa76461) and is
  not from the Register Coach fix, which doesn't touch any of these functions.
  - **Repro:** sign in (or load the app with a saved session) and start an exercise, e.g. Register Coach's mic button,
    as soon as the account chip appears, before `/me/progress` returns. Easiest with network throttling. The console
    shows the TypeError, and `progress.history[today]` doesn't go up. Seen 5 times in about 25 production sessions
    driven by `REG_URL=<url> scripts/vq-verify/regfix.js`, which starts an exercise as soon as `profile` exists.
- **The Glider can't crash after a frame with no pitch** (open, not fixed; found 2026-09-25 during the Vocal Load 3b
  checks). `autoCorrelate` returns −1 for "no pitch", but `gliderPitchToY` only returns null for a falsy `freq`, so −1
  becomes `log2(−1/440)` = NaN. `gliderY += (NaN − gliderY) × 0.25` makes `gliderY` NaN for the rest of the run, the
  "no pitch → fall" branch never runs again, and every crash comparison is false: the glider can't crash, the score
  climbs until the player stops it, and the best score and XP that come with it are saved. One silent frame is enough,
  e.g. before the singer starts or while they take a breath. It predates Vocal Load, which doesn't touch Glider's own code.
  - **Repro:** open Glider and start it without singing, or with the mic muted. Nothing crashes, and `gliderY` reads
    NaN in the console. Seen headless with a Safari user agent (where the Vocal Load sidecar doesn't run): score 353
    after 30 s, `gliderActive` still true.
- **One unexplained 59/60 in the Vocal Load batch 3a checks** (unreproduced flake; 2026-09-27). One production run of
  group 1 (`VLB_ONLY=bridge,wraith,resonance,drills scripts/vocal-load-verify/batch3a.js <url>`: Register Runner, the
  Register Wraith boss, the Resonance Visualizer, Register Drills) reported 59 passed and 1 failed. Only the summary
  line was captured, so there is no record of which check failed or why. The next two production runs of the same
  group passed 60/60, the second with its full log saved. Logged as a single flake with no diagnostic record. If a
  run of this group fails again, save the whole log and start from the ✗ line. Likely explanation, found
  later: the test mic dropping out under memory pressure (see "Testing infrastructure notes" below).
- **Entrance & Cutoff Trainer: a false entrance on its first tick** (pre-existing, not fixed; found 2026-09-27 while
  checking Vocal Load batch 3b, not caused by it). The trainer starts out assuming silence (`wasVoiced = false`), so if
  the singer is already making sound when it starts, its first tick reads as a note start. That start comes before the
  song, so it never claims a note, but depending on setup timing it can land inside the bleed-detection window (up to
  80 ms after a count-in click) and add a bleed hit. The "speakers leaking into the mic" warning needs 2 hits, so a
  single one is harmless. Seen with a steady test tone: the first tick fell between −3.405 s and −3.331 s, with the
  first click at −3.333 s, and 2 of 10 runs counted it as bleed. The Vocal Load sidecar starts after the trainer's
  ticker, so it can't affect this.
- **Register Coach reads vibrato as "pushing chest"** (live bug, found 2026-09-24; root cause found 2026-09-25; **fixed
  in 1932924, live 2026-09-25 as dpl_9RMYqhcfT9a7XSrZtJRG7sUymvwY** — see the fix below). A 330 Hz head-voice tone scoring 34 straight scores 64–69 with 6 Hz ±25 / ±50 ct, and up to
  98% of its frames cross the 62 "pushing chest" line; a straight 49 reads 85–89. That resets the bridge streak and
  skews best-bridge XP, the Bridge lane (50), drill register matches, boss and live-feedback register checks.
  - **Cause: the shared mic's noise suppression** (`initAudio` asks for it). With the same WAVs, noise suppression alone
    reproduces the jump, while all-off / echo-cancel-only / auto-gain-only read within ~1 point of a no-mic model. The
    suppressor's gains follow the moving harmonics and lift the floor between them from about −86 to −50 dB re the
    fundamental; the score sums magnitude over every bin to 6 kHz, so that floor drags the centroid up. The depth
    pattern (±100 ct reads less than ±50) is the suppressor's; every unsuppressed path rises steadily with depth.
  - **Not the cause:** pitch/spectrum sync. Both come from the same analyser in the same frame (≤ 1 render quantum
    apart); in a sample-exact model, the app's pitch is within 9 ct of the true instantaneous f0 at ±100 ct, using the
    true or mean f0 instead gives the same score, and taking pitch from a frame ±83 ms away moves it ≤ 3 points.
    Nor the analyser smoothing on its own.
  - **Second, smaller cause:** magnitude weighting itself (the Voice Quality issue): unsuppressed, a 50 still reads 62
    at ±100 ct, and room noise at 20 dB below the tone lifts a 35 to 76.
  - **Proposed fix** (tested in the browser, test-only): score from an unprocessed spectrum (a second, spectrum-only
    stream with processing off; pitch stays on the shared mic), power-weighted with power averaged per bin (the
    analyser's own smoothing averages magnitude, which reads vibrato low), turned into the score through the equivalent
    magnitude ratio so straight tones keep today's scores and the 35 / 50 / 62 lines. Result: within 0.9 points of
    straight at every depth; noise at 20 dB lifts a 35 to 43, not 76. Open: a second getUserMedia stream is verified in
    desktop Chrome only (iOS Safari may end the first track); the Bridge game and live feedback have their own copies of
    the formula; scores of real, formant-shaped voices will move somewhat, as the mapping assumes a smooth roll-off.
  - **Fix as built (1932924):** instead of the proposal's second stream, every register reading (Register Coach, live
    feedback, Register Runner, Drills, Register Wraith, Resonance Visualizer) goes through one unprocessed register input
    (`openRegisterInput` / `readRegisterFrame`: noise suppression and auto-gain off, echo cancel on; pitch behind a 1.5 kHz
    low-pass; `chestScoreFromPower`, power-weighted and mapped back to the old scale). It closes itself after 3 s idle;
    the Pitch boss and other features keep the shared mic. Verified with `regfix.js` (HEAD vs working tree): straight
    tones within 2 points of before and every drill / boss register decision unchanged; a head tone reading 31–39 with
    ±50 ct vibrato before now reads 14–15 (straight 15), a chest tone 98–100 → 75–76 (straight 76); the Bridge lane on a
    close 60 / 40 pair went from 52% to 100% right, straight and ±50 ct. A new stream is silent for its first ~400 ms
    (drill note 1 still scores as notes 2–5).
    Checked on production after the deploy (`REG_URL=<url> regfix.js`, a throwaway trial account through the real
    buttons and Pro gate, deleted after): the live page is byte-identical to the commit; Register Coach across 330 / 440 Hz
    at 35 / 50 / 62 / 80, straight and ±25 / ±50 / ±100 ct, stays within 0.8 points of each tone's straight score; Bridge,
    Drills and the Register Wraith read the same as locally (Bridge ±100 ct close pair: 12% of the chest note's frames).
  - **Follow-ups (open, not blocking):**
    - [ ] **Bridge lane smoothing for wide vibrato near the lane line.** With ±100 ct vibrato, a note a few points above
      the 50 line (a 60 / 40 pair: chest note reads median 58, frames 50–67) lands in the wrong lane on 11% of its frames;
      the lane follows each frame's score with no smoothing. Straight and ±50 ct are 100%.
    - [ ] **Safari and mobile browsers untested.** The fix (unprocessed register input: noise suppression / auto-gain off)
      is verified in desktop Chrome only; Safari (macOS / iOS) and Android browsers may ignore those constraints or
      process the mic differently.
  - Check with `scripts/vq-verify/rcmodel.js` (no browser), `rcmic.js` (per mic setting), `rcfix.js` (the proposal),
    `regcoach.js` / `regcoach2.js` (first findings).

Verification scripts for these phases live in `scripts/choir-verify/` (see its README).

## Testing infrastructure notes

These are about the test setup, not the app.

- **The synthetic mic can drop to exact zero under memory pressure** (found 2026-09-27, Vocal Load batch 3b). The
  verify scripts feed Chromium a WAV file as its microphone (`--use-file-for-fake-audio-capture`). With about 390 MB of
  7.9 GB RAM free (90% committed), that capture went to exact-zero silence for 0.05–0.6 s at a time, several times a
  run: 5 of 6 diagnostic runs of the Entrance & Cutoff Trainer, with the Vocal Load feed stubbed out and live alike.
  None of the gaps lined up with a stream being closed, and the WAV has no gaps (every 50 ms block is 0.270–0.272
  RMS). A group A run of `batch3b.js` failed 66/68 that way, both failures in stubbed runs, then passed 68/68 on the
  next run. It is the likely explanation for the unreproduced 59/60 in batch 3a (above). Dropouts can only make a check
  fail, never pass, so a clean run is valid at any memory level. **If an unexplained failure shows up in a live run,
  check free memory (`(Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory).AvailableMBytes`) before assuming an app
  bug**, and look in the full log for exact-zero RMS or a run of silence where the tone should be.
