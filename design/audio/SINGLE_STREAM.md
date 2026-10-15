# One mic stream: measurements and recommendation (single-stream migration, step 1)

Branch `exp/single-stream`. Spec: `design/audio/SPEC.md`. Inventory: `design/audio/STREAMS.md`. Everything here was
measured on this Mac (MacBook Pro, built-in mic and speakers; Playwright 1.63: Chromium 153, WebKit 26.6, Firefox
155), local build against the production backend. Logs are in `scripts/audio-verify/logs/` and `scripts/vq-verify/logs/`.
No app change is merged or deployed. The configurations sit behind branch-only flags:
- `window.__streamMode` = `C1` / `C2` / `C3`, in `initAudio`, `openRegisterInput`, `vqCapture` and `vlSidecar`;
- `window.__bleedDefence` = `D1` / `D2`, in `autoCorrelate` and `computeRMS`.

The configurations:
- **Today**: three streams. Shared (EC + NS on, AGC default), register input (EC on, NS and AGC off), Voice Quality (all off). The sidecar opens the register input next to the shared stream, desktop Chromium only.
- **C1**: one stream with today's shared constraints (EC + NS + AGC). Everything reads it, Vocal Load included.
- **C2**: one stream, EC on, NS and AGC off. Every pitch reader goes through the 1.5 kHz low-pass. The shared analyser's loudness readers read the filtered signal too.
- **C3**: C2's stream split in Web Audio. Pitch goes through the low-pass. Loudness (`computeRMS` on the shared buffer, Vocal Load, chest) reads the unfiltered signal.

## Summary

| | Today (3 streams + sidecar) | C1: one stream, EC + NS + AGC | C2: one stream, EC only, all pitch low-passed | C3: as C2, loudness unfiltered |
|---|---|---|---|---|
| **Scores** (Pitch Match, Drills, Choir World; vibfix) | — | ±1 | ±2 (one +4 on a flutter) | ±2 (one +4 on a flutter) |
| **RTF** (vibfix) | — | **7 regressions**: a vibrato note 25 ct flat reads in tune 67% (today 18%); Steady −6 on average, −24 at worst | Steady +21 on one unsteady note (EC is now on, see vibfix) | the same |
| **Tuner** (vibfix) | — | ±4 | stability +7 on average (V2 7–25% → 57%), −7/−15 on two notes | the same, ±6 |
| **Soft-singing frames** (RTF, whole loop) | — | **+32** on the quietest stimulus, −6 on breathy-3002 | ±2 | ±2 |
| **Quietest singing on shared features** (noisegate pp-92) | Tuner 70%, CW 72% | — | **11%, 40%** (no AGC) | **11%, 39%** |
| **Broadband noise** (RTF pink / traffic) | 56% / 80% | 2% / 1% | **0% / 0%** | **0% / 0%** |
| **Babble / speech** | — | RTF +13 to +17 | RTF +9 to +12, shared features −7 to −31 | the same |
| **Vocal Load accuracy** vs today's sidecar | (Chromium only) | **+92% on very quiet singing**, −3% on breathy | within 0.3% (4% on the quietest) | within 0.3% (4%) |
| **Vocal Load on Safari, iOS, Firefox, Android** | 33 features: none | all | all | all |
| **Processing a feature actually gets** | depends on which feature opened first (Chromium) | as asked | as asked | as asked |
| **Speaker bleed, continuous playback** (Harmony Arena guide landed; Entrance Trainer of 8) | 4; 5–8 | 5; 4 | 5; 4 | 5; 4 |
| **Speaker bleed, reference tails** (Scale / Custom / Rift / Pitch Match heard) | 1 / 2 / 1 / 2 | **3 / 4 / 3 / 3** | 0 / 1 / 1 / 0 | 0 / 1 / 0 / 0 |
| **Browser support** | sidecar desktop Chromium only | every engine; nothing muted in B3 | the same | the same |
| **Effort** | — | smallest (one stream as today's shared) | small: the shared analyser gets the low-pass | small + one split (a second analyser, `computeRMS` reads it) |
| **Risk** | — | high: breaks RTF and the register features' chest reading, Vocal Load overcounts | low/medium: quiet singers on shared features, the Tuner moves | low/medium: the same, loudness readers keep today's signal |

Bleed rows: daytime room, inconclusive per defence (B4). Neither D1 nor D2 changed the continuous-playback phantoms.

## B1 · What the second stream costs (Real-Time Feedback, soft singing)

`scripts/audio-verify/sidecar.js`, log `sidecar-2026-10-13T10-10-35`. The sequence follows rtfsoft.js (Pitch Match ×2 →
Register Drills → RTF), 3 runs per side. **RTF is sampled for one whole 40 s loop of the stimulus.** The soft-singing
stimuli swing by up to 60 dB inside their loop (pp-92 runs from −85 to −25 dBFS). A 6 s window, as rtfsoft.js uses,
reads a different stretch of singing depending on how long the page took to get there, and signing in takes longer.

| RTF frames heard (median of 3) | signed out (no sidecar) | signed in (sidecar) | C1 | C2 | C3 |
|---|---|---|---|---|---|
| pp-92 | 38% | 38% | **70%** | 36% | 36% |
| pp-646 | 68% | 68% | 68% | 68% | 68% |
| breathy-5 | 88% | 88% | 87% | 88% | 88% |
| breathy-3002 | 84% | 84% | **78%** | 84% | 84% |

- **The sidecar costs RTF no soft-singing frames**: signed in equals signed out on all four stimuli, in every run. The
  2026-10-02 finding (pp-92 0% signed in against 11% signed out) came from where the 6 s window fell in the loop, not
  from the second stream.
- **C1 moves soft singing in both directions**: +32 points on the quietest stimulus (AGC lifts it over the 0.008 RMS
  floor), −6 on breathy-3002 (noise suppression takes breath noise and some voice with it). C2 and C3 stay within 2
  points of today.

## B3 · What a second capture does to the first (per engine)

`scripts/audio-verify/browsers.js`, log `browsers-2026-10-13T11-24-36`. Each engine's fake capture.

| Engine | First track muted? | First track's level with a second open | What the second capture gets |
|---|---|---|---|
| Chromium 153 | no | unchanged (AGC drift only) | **Not what it asked for.** Shared first, then register-style: the second gets EC **off**, NS off, AGC off. Register first, then shared: the second gets NS off and AGC off. Same constraints twice: as asked. |
| WebKit 26.6 (desktop) | no | unchanged | EC reported on for both (WebKit reports only EC) |
| Firefox 155 | no | unchanged | its fake device has no processing at all |

- **Chromium processes each mic one way.** The first capture decides, and a later capture with different constraints
  gets something else. Today's shared stream is opened by the first shared-mic feature and never closed. So the
  processing a feature actually gets depends on what the user opened earlier in the session:
  - **After any shared-mic feature**, the register input (Register Coach, Drills, Runner, the Register Wraith boss,
    Resonance, RTF) and the sidecar run **without echo cancellation**. The code assumes EC is on there ("echo
    cancellation stays on so the boss's backing pad doesn't leak").
  - **If a register feature ran first**, the 30 shared-stream features run without noise suppression or AGC.
  - Measured on the real mic (`realprobe`): EC on removes the app's own 1 s reference tone entirely (−65 dBFS, under the
    room's −58). With EC off the mic hears it at +26 dB over the room.
- **No engine mutes or starves the first capture here.** iOS Safari is the open case: WebKit there can mute a capture
  when another opens. Fake devices can't show that. `micdiag.html` asks the phones.

## B2 · Vocal Load

`scripts/audio-verify/vlcompare.js`, log `vlcompare-2026-10-13T13-25-10`. Signed in, 3 runs. Today is the sidecar for
shared-mic features and own frames for the rest. Each cell is active seconds / load per session.

| Stimulus · feature | today | C1 | C2 | C3 |
|---|---|---|---|---|
| harness C4 tone · Tuner 6 s | 5.93 / 11.42 | +0% | +0% | +0% |
| harness C4 · Breath, Stay in Key, Pitch Match, Drills, RTF, Voice Quality | (each as today) | ±0% | ±0% | ±0% |
| pp-646 · Tuner, a whole loop | 27.2 / 71.4 | −0% | −0% | −0% |
| breathy-3002 · Tuner, a whole loop | 33.5 / 54.5 | **−3%** | −0% | −0% |
| pp-92 · RTF, a whole loop (B1) | 13.4 / 39.3 | **+92% (29.1 / 75.5)** | +3% | +4% |

- **C2 and C3 give today's Vocal Load** (within 0.3% wherever the stimulus is steady, within 4% on the quietest one),
  and on every browser, because nothing opens a second stream.
- **C1 doesn't.** Its AGC brings quiet singing up: about twice the load on very soft singing, −3% on breathy singing.
  Its stream also reads about 19 dB lower on the harness tone (median RMS 0.030 against 0.271), so loudness on it can't
  be compared with sessions measured today.

## B2 · Pitch, noise and soft singing against today (regress method)

### vibfix (real sung notes)

Log `vibfix-local-2026-10-13T15-06-26` (`VF_MODE=regress VF_MODES=C1,C2,C3 VF_BEFORE=master`). 17 stimuli: real
VocalSet vibrato and straight notes, plus real notes made wrong, wandering, fluttering or unsteady. Pitch Match, Drills,
RTF, the Tuner, Stay in Key and Choir World run on each. The regress rules are unchanged: ±3 on per-note graders, and
master's own spread (±5 to ±10) on the noisy RTF and Tuner readings.

| | Regressions | Fixed | Passed | Where the regressions are |
|---|---|---|---|---|
| C1 | **7** | 2 | 127 | **all in RTF**: N3 (vibrato 25 ct flat) reads in tune 67% (today 18%); N1 in tune +8; Steady −24 (V2), −11 (V4), −6 (S1), +24 on an unsteady note (N2) |
| C2 | 7 | 7 | 122 | the Tuner: stability −7 (V1), −15 (W5, 80 ct off: arguably right), in tune +10 on the flutter; Pitch Match pro +4 on the flutter (tolerance 3); RTF Steady +21 on N2 |
| C3 | 5 | 6 | 125 | the Tuner: in tune −6 (V1), +6 on the flutter; Pitch Match pro +4 on the flutter; RTF Steady +24 on N2 |

Average change on the real vibrato and straight notes (the mode's median minus today's median, averaged over the
stimuli; the largest single change in brackets):

| | Pitch Match int / pro | Drills | Choir World | RTF in tune / Steady | Tuner in tune / stability ≥75 |
|---|---|---|---|---|---|
| C1 | −0.1 / +0.4 (1) | −0.6 (1) | 0 | −1.0 (4) / **−6.1 (24)** | 0 (4) / −0.7 (4) |
| C2 | +0.3 / +1.0 (2) | −0.1 (1) | −0.1 (2) | +0.6 (4) / −0.6 (4) | +2.6 (10) / **+7.3 (46)** |
| C3 | +0.1 / +0.6 (2) | −0.1 (1) | −0.1 (2) | +1.4 (3) / +0.1 (3) | +2.6 (10) / **+8.0 (46)** |

- **Every scored grader (Pitch Match, Drills, Choir World) is unchanged within 2 points in all three modes.** The one
  exception is Pitch Match professional on the 11 Hz flutter (79 → 83 in C2 and C3): the low-pass smooths a little of
  the flutter.
- **C1 breaks RTF.** RTF reads the register input, and on C1's stream noise suppression follows the vibrato. That
  fills in between the harmonics, so a note 25 ct flat with wide vibrato reads in tune on 67% of frames instead of 18%,
  and steady vibrato reads less steady. It is the effect the register input was built to avoid (2026-09, chest scores 34 → 64–69).
- **C2 and C3 change the Tuner.** It now reads pitch through the low-pass. Mostly better: V2's stability rises from a
  noisy 7–25% to 57%. Mostly small otherwise: −6 to −15 on two notes, both within the reading's own noise or on a note
  80 ct off.
- **RTF Steady on N2 (+21 to +24 in C2 and C3, past the ≤25% limit) is most likely echo cancellation.** Today's RTF
  runs on a register input opened *after* the shared stream, so Chromium gives it **no echo cancellation** (B3). In C2
  and C3 the one stream has EC on. EC is the only processing difference between the two, so it is the likely cause,
  though it wasn't isolated. The ≤25% limit was set on readings taken without EC.

### noisegate (noise and soft singing)

Log `noisegate-local-2026-10-13T19-43-27` (`NG_MODE=regress NG_MODES=C1,C2,C3 NG_BEFORE=master`). 24 stimuli:
noise alone at 10 dB under a sung note (white, pink, traffic, rumble, hum, babble, talker, synthetic TV, real speech,
real TV), and soft and breathy VocalSet singing, alone and mixed with noise. On Pitch Match, Drills, RTF, the Tuner,
Stay in Key and Choir World.

| | Regressions | Fixed | Passed |
|---|---|---|---|
| C1 | 10 | 14 | 132 |
| C2 | 13 | 33 | 114 |
| C3 | 14 | 34 | 112 |

What moves:

| | today | C1 | C2 | C3 |
|---|---|---|---|---|
| **RTF hears broadband noise** (pink / traffic, % of frames) | **56 / 80** | 2 / 1 | **0 / 0** | **0 / 0** |
| Drills hears pink / traffic (notes of 5) | 5 / 5 | 1–3 | 0 / 0 | 0 / 0 |
| Babble: RTF / Tuner / Stay in Key / Choir World heard | 57 / 73 / 72 / 67 | 74 / … | 69 / 56 / 42 / 42 | 70 / 55 / 41 / 43 |
| Real speech (Holmes): RTF / Tuner | 54 / 46 | 67 / … | 63 / 52 | 60 / 54 |
| Synthetic TV: Choir World notes held | 0 | 0 | 1 | 1 |
| Quietest singing (pp-92): Tuner / Choir World frames | 70 / 72 | — | **11 / 40** | **11 / 39** |
| pp-92: RTF frames (6 s window) | 11 | 79 | 62 | 61 |
| pp-1717: Tuner / RTF | 74 / 91 | — | 96 / 100 | 96 / 100 |
| Breathy and pp singing: RTF frames (6 s window) | 81–100 | 40–89 | **53–85** | **53–85** |

- **C2 and C3 close the open noise-gate item** (roadmap, 2026-10-02: "RTF still hears broadband noise while the shared
  mic is also open … the real fix is one stream per feature"). Pink, traffic and rumble are heard on 0% of RTF frames
  and score nothing in Drills. With one stream, the second capture's processing artefacts are gone.
- **Babble and speech**: RTF hears a little more (+6 to +13), the shared-stream features clearly less (−7 to −31). One
  phantom Choir World note on synthetic TV (0 → 1), the known periodic-noise case.
- **The quietest singing on shared-stream features is a real loss in C2 and C3.** pp-92: Tuner 70% → 11%, Choir World
  72% → 40% of frames. Today's shared stream has AGC, which lifts this singer over the detector's 0.008 RMS floor.
  Without AGC they fall under it. pp-1717 (quiet but not the quietest) goes the other way (Tuner 74 → 96).
- **The RTF "soft singing loses frames" regressions (C2/C3 breathy-5 −13, breathy-3002 −47, pp-646 −21, the two
  mixes −20/−26) need re-measuring before they count.** noisegate samples RTF for 6 s, the window B1 showed depends
  on timing. B1 re-measured three of these stimuli over a whole loop: C2 and C3 equal today (breathy-5 88/88,
  breathy-3002 84/84, pp-646 68/68). breathy-1197 and the two mixes weren't re-measured.
- **C1 loses breathy singing in RTF** (breathy-3002 100 → 40%, also −8 to −34 elsewhere). Noise suppression removes
  breath noise and some of the voice with it.

## B4 · Speaker bleed on real speakers

### What bleed looks like on real speakers (nobody singing)

`scripts/audio-verify/loopreal.js`, log `loopreal-2026-10-13T12-24-27` (all 30 passes; summary in
`loopreal-2026-10-13-summary.txt`). MacBook Pro built-in speakers and mic, output volume 50% (56% in round 3), headed
Chromium, 3 rounds × 10 configurations. The drivers are loopback.js's plus Pitch Match. Song hymn, Harmony part Alto.

**The room wasn't quiet.** Before every pass the script measures 2 s of the room with nothing playing. Only 6 of 30
passes had a quiet room (at or below −50 dBFS, no pitched sound, Harmony Memory stage 6 hearing nothing in its silent
half). The others had talking or music, from −24 to −48 dBFS, and the output volume was changed during the run. The
overnight rerun was stopped when the Mac was in use again (volume 94% → 19%, the room at −24 dBFS). So the per-defence
numbers below are **not conclusive**. What holds across every pass, quiet or not:

| Phantoms (median of 3 passes) | today | C1 | C2 | C3 |
|---|---|---|---|---|
| Harmony Arena, piano guide: notes landed (≥ 75) / scored | 4 / 7 | 5 / 6 | 5 / 5 | 5 / 6 |
| Harmony Arena, Distraction Mode: notes scored | 4 | 7 | 6 | 6 |
| Entrance Trainer: entrances claimed of 8 | 5 (8 in the quiet pass) | 4 | 4 | 4 |
| Harmony Memory stage 1: notes held of 8 | 1 | 2 | 3 | 3 |
| Scale Run pro: steps heard of 10 | 1 | **3** | 0 | 0 |
| Custom, 5 notes: steps heard | 2 | **4** | 1 | 1 |
| Pitch Rift: rounds heard | 1 | **3** | 1 | 0 |
| Pitch Match ×3: takes heard | 2 | **3** | 0 | 0 |

- **Echo cancellation removes a reference tone completely, but not the continuous playback.** On this Mac, EC takes
  a 1 s reference to below the room's level (`realprobe`: −65 dBFS with EC on, +26 dB over the room with it off). The
  choir, the guide and the backing play for whole songs, and Harmony Arena still lands 4–6 phantom notes in every
  configuration. Its guide plays *your own part's note*, so the bleed reads as in tune.
- **The Entrance Trainer claims entrances on bleed in every configuration.** It reads loudness only (any frame over
  `ONSET_RMS_THRESHOLD` is "voiced"), with no pitch.
- **C1 hears reference tails the other two don't** (Scale Run, Custom, Rift, Pitch Match: 3–4 against 0–1). Its AGC
  lifts the quiet tail after a reference over the detector's floor.
- **C2 and C3 hear reference tails no more than today**, often less, and the same continuous-playback phantoms as today.

### The two defences

| Defence | Phantoms on real speakers | Cost to real singing (`costsing.js`) |
|---|---|---|
| D1 (calibrated bleed level × 2) | no consistent change from the same mode without it: Harmony Arena still 3–6 landed, Entrance Trainer 3–5 | C2 / C3: none (Stay in Key 100%, Harmony Memory frames ±3, Harmony Arena unchanged). C1: Stay in Key 100 → **68%**, Harmony Memory frames 1457 → **882** |
| D2 (pitch within ±50 ct of a playing note, unless +12 dB over the bleed) | the same: no consistent change | C2 / C3: none. C1: Stay in Key → **81%**, Harmony Memory → **916** |

Log `costsing-2026-10-13T13-55-42`: sung stimuli as the fake mic with the app's playback running (no bleed in the
input), 2 rounds. The bleed ratio is fixed at each mode's median calibration on this Mac (C1 0.041, C2 0.028, C3 0.024).

- **The calibration is unstable.** The ratio that D1 and D2 calibrate from the session's first 0.5 s of playback varied
  about 40-fold between sessions on the same Mac and mode (C2: 0.004–0.17; C1 0.003–1.0, n = 32 each). EC is still
  converging at the start of a session, the count-in clicks and the first chord differ in level, and room sound gets
  in. A threshold set from it lands somewhere different every session.
- **Neither defence, as specified, removes the phantoms that matter.** Harmony Arena's guide and the Entrance
  Trainer's loudness onsets get through both in every configuration. In C2 and C3 they cost real singing nothing, so
  they are cheap but don't help. In C1 they cost real singing a lot: the AGC pulls loud singing down towards the
  calibrated bleed.
- **Not measured: a user singing during the calibration.** The cost figures fix k at the median. If the singer is
  already singing on the session's first tone (Harmony Arena starts listening with its first chord), k comes out high
  and both defences would reject real singing for the whole session.

## B5 · Phones

`scripts/audio-verify/micdiag.html`: one standalone page, no app, nothing sent anywhere. It was checked here in
Chromium, WebKit and Firefox with their fake capture devices (all three steps run, no errors).
1. It opens a stream with the app's shared constraints and shows its level and state.
2. It opens a second stream with the register input's constraints next to it, for about 8 s while the user hums. It
   reports stream 1's level before, during and after, its muted / readyState / events, and the processing each stream
   got.
3. It plays a 1 s reference-level A4 through the phone's speaker, once with EC on and once with EC off. It reports how
   many dB the mic level rose and on what share of frames the mic heard the tone *as a note* (±50 ct).

Deployed as a Vercel preview after the user's go-ahead. The URL and checklist are in the report.

**Checklist** (about a minute per phone; no headphones; volume about ¾):
1. Open the link in **Safari on the iPhone** (then Chrome on Android, if there is one).
2. Tap *Start the mic*, allow it, say "ah": the bar moves.
3. Tap *Open a second stream* and hum steadily for about 8 s. Note what it says ("kept working" / "dropped" / "went
   quiet" / "muted").
4. Stay quiet, tap *Play the tone*. Note whether the tone came from the **loudspeaker** or the **earpiece**.
5. Tap *Copy the results* and send them, with the phone model, the iOS / Android version and the answer to 4.

The numbers that decide things: `step2.verdict` and `step2.s1Before / s1With` (does a second capture hurt the first:
only matters if the migration is phased), `step3.ec_on.heardAsNotePct` and `rise` (how much playback the phone's EC
leaves for the scorer), and the speaker/earpiece answer (iOS can route playback to the earpiece once the mic is open,
which changes both how loud the app sounds and how much it bleeds).

## Step 1b · The quiet-singer floor (F1 / F2)

C3 has no auto gain. `quietdiag.js` showed that `autoCorrelate()`'s RMS floor (0.008, −42 dBFS) is the only gate that
rejects a quiet singer's frames in C3. Two branch-only fixes sit behind `window.__quietFix`, with C2 or C3:
- **F1**: the RMS floor drops to −60 dBFS. The clarity gate (0.6) and the 63 Hz floor still do the noise rejection.
- **F2**: a slow gain on the pitch path only (at most +18 dB). The RMS floor stays 0.008.

Logs (all 2026-10-14/15, master as "today", 3 runs per side, medians): `vlcompare-2026-10-14T10-49-47`,
`wholeloop-2026-10-14T11-20-25`, `noisegate-local-2026-10-14T14-29-52`, and vibfix in three parts
(`vibfix-local-2026-10-14T18-15-29`, `…-15T02-53-29` and the run that finished it, joined with `VF_RESUME`; the Mac's
battery ran out and then the network dropped, and the finished stimuli were kept).

### wholeloop (Tuner, Choir World, RTF over one whole 40 s loop)

`scripts/audio-verify/wholeloop.js`. A whole loop removes the timing dependence of short windows (B1).

| Stimulus | | Tuner heard | Choir World frames | RTF heard | RTF in tune |
|---|---|---|---|---|---|
| **sing-pp-92** (quietest) | today | 69 | 70 | 38 | 22 |
| | C3 | **37** | **36** | 36 | 20 |
| | C3+F1 | **69** | **69** | 69 | 49 |
| | C3+F2 | 66 | 67 | 67 | 48 |
| sing-pp-646 | today / C3 / F1 / F2 | 68 / 68 / **77** / 69 | 68 / 68 / 77 / 69 | 68 / 68 / 77 / 69 | 20 / 20 / 22 / 21 |
| sing-breathy-3002 | today / C3 / F1 / F2 | 77 / 83 / **92** / 86 | 77 / 84 / 94 / 87 | 84 / 84 / 95 / 88 | 14 / 13 / 16 / 15 |
| breathy-1197, the two mixes | F1 against today | +1 to +5 | −1 to +8 | 0 to +2 | within ±2 |

- **F1 recovers the quietest singer completely**, F2 nearly (−3). Both also nearly double RTF's frames on pp-92
  (38 → 67–69): today RTF hears nothing in 3 or 4 of the loop's 8 five-second stretches.
- **Every other singing stimulus is within ±1 of C3 or better** in both. F1 gains +5 to +17 on the breathy and pp
  stimuli. The vibfix notes (N2, S2) don't move.
- **The noisegate "RTF loses soft singing" items are not real.** Over whole loops, breathy-1197 and both mixes equal or
  beat today (open item 2 under "What C3 needs", closed).

### noisegate (regress)

| | Regressions | Fixed | Passed |
|---|---|---|---|
| C3 (2026-10-13) | 14 | 34 | 112 |
| C3+F1 | 12 | 38 | 110 |
| C3+F2 | 12 | 33 | 115 |

- **C3's two quiet-singer regressions are gone in both** (pp-92 Tuner 70 → 68, Choir World 72 → 72 for F1 / 68 for F2).
- **5 (F1) or 6 (F2) are RTF voiced drops on soft singing in noisegate's 6 s window**, the artefact wholeloop disproves
  above. F2 adds pp-646 (80 → 62), F1 doesn't.
- **7 (F1) or 6 (F2) are noise alone.** F2's six are C3's own six: babble RTF +15, one phantom Choir World note on
  synthetic TV, Holmes speech in RTF and the Tuner, the Bonanza TV recording in the Tuner +6. F1 has five of them
  plus two new ones (next point).
- **F1 hears slightly more speech than C3:** Holmes RTF 71% (C3 60%, today 54%), Holmes Stay in Key 68% (today 59%),
  Alice Tuner 62% (today 55%). F2 doesn't add these. The broadband noise fixes hold in both (pink, traffic, rumble 0%).

### vlcompare (Vocal Load)

All four sides (today, C3, C3+F1, C3+F2) within 1% of today on every feature and stimulus. Neither fix touches Vocal Load.

### vibfix (regress)

Final log `vibfix-local-2026-10-15T08-01-23` (17 stimuli, `VF_MODE=regress VF_MODES=C3+F1,C3+F2 VF_BEFORE=master`).

| | Regressions | Fixed | Passed |
|---|---|---|---|
| C3 (2026-10-13) | 5 | 6 | 125 |
| C3+F1 | **11** | 5 | 120 |
| C3+F2 | 6 | 6 | 124 |

- **F2's six are C3's own, or master moving between days.** C3's: Pitch Match pro +4 on the flutter (W4) and RTF Steady
  +22 on N2 (echo cancellation, see vibfix above). The N1 Tuner's stability (+22) is master moving: master read 65
  on 2026-10-13 and 46 today, while C3, F1 and F2 all read 66–70. Three are one point past the line, as C3 was the
  same day: N4 Tuner stability +6 (C3 +5), W4 Choir World +4 (C3 +3), V2 RTF in tune −6 (C3 −4).
- **F1 adds real costs on normal-level notes.** The −60 dBFS floor lets in a note's quiet edges, which read off
  pitch: V2 (real vibrato) Choir World 94 → 86, with 177 frames read instead of 152 and 23 of them out of tune; V2 RTF
  in tune −8; W5 Tuner stability −15 (C2's figure, C3's was −4); W4 RTF in tune +8; W1 Pitch Match pro −2.
- Every scored grader in F2 stays within ±4 of today, the same as C3.

### Result

**F2 (pitch-path gain, at most +18 dB, RMS floor unchanged)**:
- It recovers the quietest singer: Tuner 37 → 66 (today 69), Choir World 36 → 67 (70), RTF 36 → 67 (38).
- It adds no noise or speech beyond C3, and no vibfix cost beyond C3. Vocal Load is unchanged.

F1 recovers 3 points more on pp-92 and +9 on pp-646. It pays for that with speech heard more often and V2's Choir
World −8.

Still open before C3 ships: the bleed fixes (loopreal in a quiet room, on AC power) and the phone numbers (micdiag).

## Decision (the user, 2026-10-15)

- **Configuration: C3** (one stream: EC on, NS and AGC off; pitch through the 1.5 kHz low-pass; loudness unfiltered).
- **Quiet-singer fix: F2**: a gain on the pitch path only, at most +18 dB, rising over 1.5 s, falling over 0.25 s,
  and held still in silence. The RMS floor stays 0.008.
- **No bleed defence for now.** The bleed fixes are step 7, measured later with `loopreal.js` in a quiet room on AC
  power.
- Built on `feat/single-stream` from master, C3 + F2 as the only code path (no flags). Spec verbatim:
  `design/audio/BUILD.md`.

## Recommendation

### Configuration: C3

**One stream: `echoCancellation: true, noiseSuppression: false, autoGainControl: false`, opened once and shared by every
feature.**
- **Pitch**: every feature reads pitch through the register input's 1.5 kHz low-pass.
- **Loudness**: Breath, the Entrance Trainer, Rhythm, Emotion Mode, Performance Director, Emotional Singing, the
  Karaoke Boss, Vocal Load and the chest reading read the unfiltered signal.
- **Recording**: MediaRecorder records the stream.

The evidence:
- **It keeps every score**: Pitch Match, Drills and Choir World within ±2 on 17 real-note stimuli (vibfix).
- **It keeps Vocal Load exactly** (within 0.3%), and gives it to the 33 features that have none today on Safari, iOS,
  Firefox and Android. Nothing opens a second stream, so `VL_SIDECAR_BLOCKED` goes.
- **It removes the order problem** (B3). Today, on Chromium, the register input loses echo cancellation whenever a
  shared-mic feature ran first, and the shared stream loses noise suppression whenever a register feature ran first.
- **It closes the open noise-gate item**: RTF hears pink and traffic noise on 0% of frames, against 56% and 80% today.
- **It hears reference tails no more than today** on real speakers, where C1 hears them more.
- **C3 rather than C2**: C3 had 5 vibfix regressions to C2's 7 (noisegate 14 and 13, the same items). Its loudness
  readers keep today's unfiltered signal, so Breath times, Entrance Trainer onsets and Rhythm onsets are judged on the
  signal they were tuned on. The extra effort is one analyser.

**Not C1.** It would be the smallest change, but it puts noise suppression and AGC under everything:
- RTF regresses (7 checks: a flat vibrato note reads in tune 67%);
- breathy singing loses up to 60 points of RTF frames;
- Vocal Load nearly doubles on quiet singing;
- reference tails turn into phantom steps on real speakers;
- noise suppression lifts head voice into the chest zone, the problem the register input was built to avoid.

**What C3 needs before it ships**:
1. **A floor for quiet singers on the shared path** (measured in step 1b: **F2**, pitch-path gain). Without AGC, the quietest stimulus drops from 70% to 11% of Tuner
   frames and from 72% to 40% in Choir World. The shared path needs its own level handling: a lower `autoCorrelate`
   RMS floor, or a gain stage before it (a fixed gain or a slow, measured one, not the browser's AGC, which pumps).
   This is measurable with noisegate's soft stimuli plus the noise-alone checks, so it doesn't let noise back in.
2. **RTF re-measured over whole loops** for breathy-1197 and the two mixes. noisegate's 6 s window can't separate a
   real loss from timing.
3. **The Tuner's thresholds checked** against its new readings (in tune +2.6, stability +7 on average).

### Bleed defence: neither D1 nor D2 as specified

- **They don't remove the phantoms that matter.** On real speakers, Harmony Arena's guide (4–6 notes landed) and the
  Entrance Trainer's loudness onsets (4–8 of 8) got through both, in every configuration.
- **D1's calibration is unstable.** The bleed ratio varied 40-fold between sessions on one Mac.
- **The risk is one-sided.** A singer already singing on the session's first tone calibrates a high bleed, and both
  defences would then reject real singing for the whole session. In C3 they cost real singing nothing at the median,
  so the harm is that tail, not the average.
- **Echo cancellation on one stream does the general part.** A reference tone is gone entirely (−65 dBFS against a
  −58 room). What's left is specific: continuous playback at your own part's pitch, and loudness-only detection.

**Proposed instead**, each measured with `loopreal.js` in a quiet room before and after:
- **Entrance & Cutoff Trainer**: an onset counts only with a pitch in the singer's range that isn't the note being
  played. It already flags "Speaker bleed detected" on count-in hits, so the knowledge is there.
- **Harmony Arena guide and Harmony Memory stage 1** (the guide plays your note): a short gap in the guide at each
  scoring window's start, so the first frames of a note are heard without it; or score only frames above a level
  measured with the guide alone at the start of *that note*. Either is a product choice about how the guide sounds.
- **Re-measure everything in a quiet room and on the phones.** Today's bleed numbers come from a room with people
  talking. The overnight quiet run was stopped because the Mac was in use. The command:
  `node scripts/audio-verify/loopreal.js` (about 1¾ hours, plays sound).

### Migration order

Each step lands with its own verification. The single stream module comes first so later steps only change who reads it.

| Step | Features | Must verify |
|---|---|---|
| 1. The stream | `micStream` becomes C3's one stream (pitch path + loudness path); `openRegisterInput`, `vqCapture` and the sidecar take it instead of opening their own; Vocal Load from it everywhere; `VL_SIDECAR_BLOCKED` and the hidden gauges go | `modecheck.js` (one stream, every path reads), `vlcompare.js`, Vocal Load batch1–3c and harness (its Safari check changes: the gauge now shows), house.js, hooks.js |
| 2. Register features | Register Coach, Drills, Runner, Wraith, Resonance, RTF | regfix (chest readings, now with EC on), vibfix RTF, noisegate RTF with whole-loop windows, rtfsoft (fix its window first) |
| 3. Shared pitch features | Tuner, Range, Pitch Match, Interval, Scale Run, Custom, Rift, EVE, Five Ways, One Take, Hear Your Mistake, Mirror, Glider, warm-up, Karaoke Coach, Stay in Key, Harmony Arena, Choir World (Harmony Memory, challenges), AI Duet, Karaoke Boss | vibfix, noisegate, the quiet-singer floor (above), listenwin, pmframes, picker, glider-verify, choir p9/p10, live7/9, batch1–3b |
| 4. Loudness readers | Breath, Entrance & Cutoff Trainer, Rhythm, Emotion Mode, Emotional Singing, Performance Director | tt-verify firsttick, choir timing, batch2/3b, house.js (Breath) |
| 5. Recording | Your Choir, Studio, Journey and Hear Yourself recordings | yc.js, live6, batch3a (playback level of new takes: EC on, NS off now) |
| 6. Voice Quality | Voice Quality, Vibrato Analyzer: today all processing off, now EC on | vq.js, livevq, bands, cvib (EC on a held note: brightness and breathiness may move) |
| 7. Bleed fixes | Entrance Trainer onsets, Harmony Arena / Harmony Memory guide | loopreal.js in a quiet room, before and after; costsing.js |

Every step: no app change outside its features, and the same-run master-vs-branch regress method.

### What changes for users

- **Scores**: Pitch Match, Drills and Choir World within ±2 for singers at normal level. The Tuner reads vibrato
  steadier (stability +7 points on average) and in tune +3.
- **Quiet singers**: without the floor fix, the quietest singers lose most shared-feature frames (Tuner 70% → 11%).
  With it, to be measured. Slightly quiet singers gain (pp-1717 Tuner 74% → 96%).
- **Noisy rooms**: RTF stops reacting to fans, traffic and hum (0% instead of 56–80%). Babble and speech are heard
  slightly more in RTF and less in the other features.
- **Vocal Load**: the same number for the same singing. New on Safari, iOS, Firefox and Android for 33 features: those
  users see a gauge and get break reminders for the first time, and their daily totals rise to the true value.
- **Register features**: echo cancellation always on. Today they sometimes run without it, depending on what was
  opened before. Chest readings can move for users who had been getting the unprocessed version.
- **Voice Quality**: EC is now on during its capture. Its readings could move slightly (not measured).
- **Not changed by the migration**: Harmony Arena's guide and the Entrance Trainer still hear the app's own playback
  until the bleed fixes in step 7.

### Open questions only the phones can answer

1. **iOS Safari: does a second capture mute or starve the first?** (micdiag step 2.) If it does, the migration has to
   be all at once on iOS, not feature by feature.
2. **How much of its own playback does a phone's EC leave?** (micdiag step 3, EC on: rise and heard-as-a-note.) On
   this Mac it's none for a reference tone. Phone speakers sit centimetres from the mic.
3. **Does iOS route playback to the earpiece once the mic is open?** If so, the app is quiet *and* bleeds less, and the
   fix is an audio-session setting, separate from this work.
4. **Phone mic levels without AGC.** The quiet-singer floor (above) has to work at a phone's input level. micdiag step
   1's level for a normal "ah" tells us where that is.

