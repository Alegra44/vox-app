# Choir World 2.0 — Roadmap

The full phased plan for the Choir World upgrade of the Choir Workspace. One phase is built at a time,
verified on the live site with real measurements (actual GainNode values, hand-checked timings), and
reported back before the next phase starts. Production deploys need explicit approval.

`deploy/index.html` is the only client (the `voxcoach-prototype.html` mirror was deleted on 2026-10-02; see BACKEND.md).

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

## Pre-session warm-up (phases 1–2, live 2026-10-03, dpl_hkE5jNste3QiwT28KTYppF1kKdaJ)

A once-a-day overlay before the first mic session (per account and UTC day): four sung exercises traced on the mic with
Glider's own tracking, a song warm-up on Karaoke's roll, Skip / Escape. Feeds Vocal Load through `vlSidecar`. No test
switch in the app; the verify scripts skip it through `scripts/warmup-verify/noWarmup.js`. Checks: `entries.js` 52/52,
`tracking.js` 29/29 (local, production backend); master vs the branch on the Mac, same run: pilot, batch1–3c, Rift ×3
and vibfix unchanged.

Follow-ups (logged 2026-10-03, not fixed):
- [ ] **A Vocal Load break banner can sit behind the warm-up overlay.** The banner goes into the active panel, under the
  modal. Rare: it needs a user who already sang a lot that day (e.g. on another device) and then starts the warm-up.
  Fix with the redesign's phase 2 layering (`HOUSE_LIGHTS.md`).
- [ ] **Smart Warmup awards XP without using the mic; the new sung warm-up awards none.** "Mark warmup done" adds to
  `warmupsCompleted` and records activity / XP; the pre-session warm-up stores only a per-day key in the browser.
  Settle it when the two become one warm-up in the redesign.

## Tester-review fixes (a)–(d): specs

(b) and (c) are live (next section). (a) and (d) were approved in chat on 2026-10-05 and are written here so they
survive a session reset.

### (a) Playback volume (approved 2026-10-05; built on `fix/volume`, deployed 2026-10-06, see below)

**Result (2026-10-06).** One playback chain: every sound → `playbackIn` (the Playback volume setting) → a look-ahead
limiter (AudioWorklet, 2.6 ms, ≤ 0.949) → speakers. References −12.0 dBFS RMS with soft harmonics (was −16.5 to −18);
block chords at 1/√n per note; guides, clicks, backing and choir unchanged. `levels.js`: 0 clipped samples and nothing
over 0.95 anywhere, including the three overlaps that clip on master (tone over backing 1.12, chord over backing 1.37,
Harmony Memory note over the choir 1.08). `tonepitch.js`: every reference C2–C7 reads as the right note, no octave
errors, no worse than master's sine. Guides stay at −23.4 dBFS, a plain sine: `loopback.js` (the app's playback fed
back into its own mic, nobody singing) credits phantom notes at that level already (Harmony Arena piano guide: 1 of 8
landed at −20 dB coupling, 8 of 8 at −10 dB), 3 with the harmonic timbre at the same level, 8 of 8 from −20 dBFS up.
Regression, master vs branch, same run: firsttick 15/15 both, batch1 112/112 both, batch2 150 vs 149 (Interval Match
analyser, one-off: 6 reruns identical), batch3a/3b/3c identical, noisegate 153/7 (6 fail on both, bonanza-b Choir held
0 → 1, which also flipped on 2026-10-04 with an unrelated branch), vibfix regress 0 regressions / 2 already failing.

Known issues found by the loopback check (not caused by (a); open):
- [ ] **Speaker bleed scores as singing**: now a scoped item under "Known issues (app-wide)", next to item 3.
- [ ] **Scale Run (Intermediate / Professional) scores its own reference tone.** Each step plays a 0.5 s reference, waits
  `scaleGap` (450 / 280 ms) and starts listening, so the last 50 / 220 ms of the tone is in the capture. With nobody
  singing, Professional shows 93–94% on master at −20 and −10 dB coupling; 96% with (a)'s louder reference (+2–3).
  Fix candidate: start listening when the reference ends (gap measured from the tone's end). Not fixed: outside (a).

**Live 2026-10-06 as dpl_5GhGgvgLAQCFZQXnmwdmAn8UcyKh** (merge e61dd49). Production, paced: `levels.js` 0 clipped, nothing
over 0.95 (loudest 0.949); batch1 112/112; firsttick 15/15; `loopback.js` the same counts as the branch locally.


Measured with `levels.js` (ce0d435): reference tones −16.5 to −18 dBFS RMS, guide notes −23.4, backing and choir −9.6
to −10.6 (already at the anti-clipping ceiling).
1. **Reference tones** (Pitch Match, Interval Match, Key Trainer and every other exercise reference): raise to about
   −12 dBFS RMS, using soft harmonics with the fundamental dominant, so small speakers carry low notes. Confirm that
   `autoCorrelate` reads every tone at the right pitch, with no octave errors, across the whole note range.
2. **Guide notes** (Choir World rehearsal and anything else that plays while the mic listens): raise them toward the
   tone level only as far as the speaker-bleed checks keep passing: the Entrance / Cutoff "Speaker bleed detected"
   check and the Choir World phantom-held-note checks. Report the level landed on and why.
   **Decided 2026-10-05:** those checks can't measure it (their test mic is an oscillator; the speakers never reach
   it, and the Entrance Trainer's bleed is simulated with 70 ms bursts). So a loopback check is built: the app's
   real playback fed into its own mic path at a stated speaker-to-mic coupling (−20 dB typical laptop, −10 dB worst
   case, no echo cancellation); with nobody singing, the Entrance Trainer bleed counter, Choir World's held-note
   verdict and the guide-time pitch graders run; guides go to the highest level with 0 bleed hits and 0 phantom
   notes at the worst case.
3. **Backing and choir:** leave as they are.
4. **No clipping anywhere:** combined peaks stay under the existing 0.95 ceiling, including when tones and backing
   overlap. `levels.js` must show 0 clipped samples in every exercise.
5. **A playback volume control:** one master playback slider, 0–100%, default 100% = gain 1.0, never above 1.0. Saved
   with the existing settings and applied to all playback (tones, guides, backing, choir, warm-up, karaoke, Studio
   playback). It never touches the mic or scoring. It goes in the existing Profile settings; the redesign restyles it.
6. **Measure** with `levels.js` before and after for every exercise (RMS, peak, clipped samples); the table goes in the
   report.

Regression: the same run against master, with vibfix regress mode, noisegate, batch1 / 2 / 3a / 3b / 3c, the choir
bleed checks and the Entrance Trainer first-tick check. **Deploy is approved if there is no Regression-class
failure.** Then on production: batch1, the bleed checks, and `levels.js` if it can run against a URL. Report after
(a) is deployed and checked on production.

### Next, approved 2026-10-06 (in this order; report after 1 is deployed, together with 2–4)

**Status (2026-10-07).** 1: Scale Run live as dpl_EXzNjN56Cwy56P75YYLNcyJq9uGK (merge a06ed17); loopback, nobody singing:
Intermediate 95–97% → 0%, Professional 97–98% → 0% (also on production); the C4 test singer scores 24% on master,
branch and production alike; regression: no Regression-class failure. 2: done (merge 762ef35): `~/VoxCoachTestData`,
`fetchdata.py` (VocalSet clips verified identical: rv.json rebuilt byte for byte), gate stimuli rebuilt, Vercel CLI
pinned, noisegate regress mode (A/A on bonanza-b: 0 regressions; the held count uses master's own spread). 3: logged.
4: proposal under (d) below, awaiting approval.

1. **Scale Run listens only after its reference has fully ended** (all levels). Show it with `loopback.js` before and
   after: with nobody singing, the score drops to the "didn't hear you" result or close to 0; real singing scores as
   before. Regression: vibfix regress mode plus the batch suites, same run against master. **Deploy approved if no
   Regression-class failure**, then a production check. Also list every other exercise that starts listening before its
   reference ends; fix only Scale Run now.
2. **Test setup (test-only).** All test data (VocalSet clips, noise recordings, built stimuli) moves out of `$TMPDIR`
   to a persistent folder outside the repo (`~/VoxCoachTestData`, overridable by an environment variable); every
   script and HANDOFF.md updated; the noise recordings downloaded again into it. The deploy command pins the Vercel CLI
   to 62.2.0 (`npx vercel@62.2.0 …`; 62.4.0 answered "Not authorized" while logged in), with the reason in HANDOFF;
   try newer versions later. noisegate gets the same regress mode as vibfix: Regression / Fixed / Already failing,
   with medians over 3 runs for flaky readings (e.g. the Choir World held note under TV noise).
3. **Log "Speaker bleed scores as singing"** in the roadmap as a scoped item next to item 3 (one mic stream per
   feature), with the loopback numbers (nobody singing: Entrance Trainer 8/8 entrances, Harmony Arena 0–8/8 notes,
   Harmony Memory 3/8 held); echo cancellation on real devices untested. Don't fix it yet.
4. **(d) as a proposal only:** the migration SQL, the API change, which existing counters go into the snapshot, and
   the four-language text. Nothing applied until the user approves.

### Approved 2026-10-07 (in this order; report after (d) is live)

1. **Custom exercise and Pitch Rift:** measure both with `loopback.js` (nobody singing). If either scores its own
   reference, apply the shared wait-until-the-tone-ends function (`referenceDoneMs`). Same rules as Scale Run: real
   singing unchanged; regress-mode vibfix and noisegate plus the batch suites, same run against master; **deploy
   approved if no Regression-class failure**; then production loopback and batch1.
2. **(d) level-up explanation: approved as proposed, with these refinements.**
   - At most 3 non-zero items, in this priority: new records, breakthroughs, Boss Battle wins, curriculum days,
     sessions, warm-ups. Add "and a N-day streak" when the streak is 3 or more. Never show a zero.
   - Proper singular / plural and list joining in all four languages (Turkish doesn't pluralise after a number); the
     app's existing English spelling. Tested with 1, 2 and 3 items in every language.
   - Migration `supabase/migrations/0008_levelup_snapshot.sql`, committed. Release order: `db push`, then the `api`
     function deploy with `levelup_snapshot` in `PROGRESS_PATCHABLE_COLUMNS`, then the client deploy.
   - New check script: on a test account, cause two level-ups; the first shows counts since the account started, the
     second only what happened since the first. The snapshot survives a reload and shows in a second browser context
     (a second device); the text renders in all four languages.
   - Regression: regress-mode vibfix and noisegate plus the batch suites, same run against master. **Deploy approved
     if no Regression-class failure**, then a production check with test accounts cleaned up.
   **Decided 2026-10-07 (the user):** noisegate flagged one Regression in (d)'s run (rumble noise, RTF heard 4/8/4% on
     master vs 9/12/5% on the branch, bar ≤5%; RTF untouched by (d); this reading ranges 2–20% on identical code).
     Rerun rumble alone, 5 runs per side; if the branch isn't clearly worse, it counts as noise and the release goes
     on. And noisegate's rule changes: a pass/fail flip is a Regression only when the change also exceeds the noise
     tolerance; a flip within it is reported as "within noise", not blocking.
     **Rumble rerun (2026-10-07, 5 runs per side):** RTF heard master 7/6/4/9/11% (median 7) → branch 4/7/5/6/3%
     (median 5): not worse. Verdict 0 regressions, 1 within noise, 1 already failing (Drills heard on both sides).
     Gate met; release started 2026-10-10.
     **(d) live 2026-10-10 (dpl_7FcmBiWSDoEjES4WGfUQSUfF3HWQ, merge 307c50b):** 0008 pushed, api deployed with
     levelup_snapshot, levelup.js 45/45 local (production backend) and 45/45 on production, batch1 112/112 on
     production; test accounts deleted (0 left). The four tester bugs are done. Next: redesign phase 1 (user specifies).
   That completes the four tester bugs. Next: redesign phase 1, specified separately by the user; it changes how the
   app looks, so **screenshots are reviewed by the user before anything deploys.**

### (d) Level-up explanation (approved 2026-10-05; don't start until (a) is live)

- At each level-up, store a snapshot of the existing counters on the server (e.g. a jsonb column on user progress),
  so it follows the account. Only counters that already exist: sessions, new records, streak days, passed drills, and
  anything similar.
- At the next level-up, show the difference in one line, e.g. "You levelled up: 9 sessions, 2 new records and a 5-day
  streak". For the first level-up after this ships, count from the start of the account.
- The new text goes into all four languages.
- **Report the migration and the API change to the user before applying the migration.**

**Proposal (2026-10-06), awaiting the user's approval. Nothing applied.**

*Counters in the snapshot* (all exist on the server today, in `user_progress`):

| Key | From | Shown as |
|---|---|---|
| `sessions` | `total_sessions` | "9 sessions" (difference) |
| `records` | `timeline_events` entries of type `record` (never trimmed) | "2 new records" (difference) |
| `streak` | `streak` | "a 5-day streak" (current value, shown when ≥ 2) |
| `breakthroughs` | `breakthrough_count` | "1 breakthrough" (difference) |
| `warmups` | `warmups_completed` | "3 warm-ups" (difference) |
| `boss_wins` | `boss_victories` (a number) | "1 Boss Battle won" (difference) |
| `curriculum_days` | `curriculum_days_completed`, days marked done | "2 curriculum days" (difference) |
| `level`, `at` | the level reached, ISO time | not shown |

**Passed drills have no server counter**: Register Drills results aren't stored, and rehearsal passes are kept only
in the browser (`rehearsalPasses`), so they can't follow the account. Left out; adding one would be a new counter.

*Migration* (`supabase/migrations/0008_levelup_snapshot.sql`, written only after approval):
```sql
-- (d) Level-up explanation: the counters at the last level-up, so the next one can say what changed since.
-- Null until the first level-up after (d) ships; that one counts from the start of the account (a null snapshot = all 0).
alter table public.user_progress add column levelup_snapshot jsonb;
comment on column public.user_progress.levelup_snapshot is
  '{level, at, sessions, records, streak, breakthroughs, warmups, boss_wins, curriculum_days} at the last level-up (client-written)';
```
No new RLS: the row is already the user's own (like `xp`), and the snapshot only feeds a sentence the user sees.

*API change*: add `"levelup_snapshot"` to `PROGRESS_PATCHABLE_COLUMNS` in `supabase/functions/_shared/patchableColumns.ts`,
then redeploy the `api` function. `GET /me/progress` already returns every column. No new route.

*Client*: in `saveProgress()`, when a level-up is detected: the difference between the counters now and
`progress.levelupSnapshot` (or 0 when null) → the up to three largest non-zero items, plus the streak when ≥ 2 → one line
under the level name in the level-up card (`#levelupWhy`); then `progress.levelupSnapshot = {level, at, …counters now}`
and save. Nothing to show (all zero): no line.

*Text, four languages* (`{list}` joined with ", " and the language's "and" before the last item):

| Key | EN | FR | ES | TR |
|---|---|---|---|---|
| `levelup_why` | You levelled up: {list} | Niveau supérieur : {list} | Subiste de nivel: {list} | Seviye atladın: {list} |
| `levelup_and` | and | et | y | ve |
| `levelup_sessions` | {n} session / {n} sessions | {n} séance / {n} séances | {n} sesión / {n} sesiones | {n} seans |
| `levelup_records` | {n} new record / {n} new records | {n} nouveau record / {n} nouveaux records | {n} récord nuevo / {n} récords nuevos | {n} yeni rekor |
| `levelup_streak` | a {n}-day streak | une série de {n} jours | una racha de {n} días | {n} günlük seri |
| `levelup_breakthroughs` | {n} breakthrough / {n} breakthroughs | {n} percée / {n} percées | {n} avance / {n} avances | {n} atılım |
| `levelup_warmups` | {n} warm-up / {n} warm-ups | {n} échauffement / {n} échauffements | {n} calentamiento / {n} calentamientos | {n} ısınma |
| `levelup_boss_wins` | {n} Boss Battle won / {n} Boss Battles won | {n} combat de Boss remporté / {n} combats de Boss remportés | {n} batalla de jefe ganada / {n} batallas de jefe ganadas | {n} Boss Savaşı kazanıldı |
| `levelup_curriculum` | {n} curriculum day / {n} curriculum days | {n} jour du programme / {n} jours du programme | {n} día del programa / {n} días del programa | {n} program günü |

Terms follow the app's existing ones (Percées / Avances / Atılımlar, Échauffement / Calentamiento / Isınma, Série,
Boss Battles). Example: "You levelled up: 9 sessions, 2 new records and a 5-day streak."

## Practice fixes (b) + (c): listening window and shared note picker (live 2026-10-05, dpl_9iW4QDUnWwCQuxNz5bYoZQLotw8X)

Merged as e01912b. Production (paced, the same checks as locally, accounts cleaned up): `listenwin.js` 27/27 (no voice:
"I didn't hear you", not an attempt, same note; "Sing it again" keeps the note), `picker.js` 93/93 (no repeats, the
whole range per level, One Take one note all day), batch1 112/112 and batch2 150/150 (Pitch Match and Interval Match
log 2.95–2.97 s of active time on a 3.0–3.1 s listening window, the reference not counted). Same as local.

(c) `df2dfc4`: one shared note picker across the singer's range, never the same note twice in a row (`picker.js` 93/93).
(b) `29b274c`: Pitch Match and Interval Match play the reference, then a cue, then listen from the first voiced frame;
the first 400 ms isn't scored and the window is 3.0 / 2.5 / 2.0 s by level (`listenwin.js` 27/27). They ship together.

- **Pitch Match Professional reads 4–5 higher on vibfix's W2 (a real note 40 ct sharp): expected, not leniency**
  (2026-10-05). Master 60/61, the branch 65/66 over three runs, past vibfix's "no vibrato: must not rise more than 3",
  which therefore doesn't apply to this change. `pmframes.js`: on both versions every take's score is exactly
  100 − mean|c| × 0.9 of the frames it scored. A steady sine 40 ct sharp scores 62 on both, at every level and take (the
  detector reads it at +42.4 ct; 100 − 40 × 0.9 = 64 for a true 40). W2 is a real voice that wanders ±10 ct around +40,
  and the two versions score different 1.6 s stretches of it (master from the click, the branch about 1.7 s later):
  mean |c| 44 against 38–39. The looped stimulus has no onset, so it isn't master scoring onset frames.

## Known issues (app-wide)

- [ ] **Speaker bleed scores as singing** (scoped, logged 2026-10-06; not fixed; sits next to item 3, one mic stream per
  feature: HANDOFF.md, "Order of work"). Found by `scripts/vq-verify/loopback.js`, which feeds the app's own playback
  back into its own mic with nobody singing, at a speaker-to-mic coupling of −20 dB (a laptop's own speakers and mic)
  and −10 dB (worst case), with no echo cancellation. Production and local agree:
  - **Entrance & Cutoff Trainer:** 8 of 8 entrances claimed (the choir's playback); at −10 dB also 4 count-in bleed
    hits and the "Speaker bleed detected" warning.
  - **Harmony Arena, piano guide on:** 0–8 of 8 notes landed (counted in Part Accuracy): 0–1 at −20 dB, 8 at −10 dB.
    The guide plays your own part's note, so its bleed reads as in tune.
  - **Harmony Memory stage 1:** 3 of 8 notes held (your part as the full guide).
  - **Echo cancellation on real devices hasn't been tested.** The shared mic asks for it (it would remove much of
    this); the register input doesn't. Measure on real laptops and phones before choosing a fix.
  - Fix candidates (not chosen): score only frames that don't match what's playing; or warn when the mic correlates
    with the output; or tie it to item 3's per-feature streams. Scale Run's case was fixed separately (2026-10-06).

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
- **The Glider can't crash after a frame with no pitch** (FIXED and deployed 2026-09-28, dpl_HHDB2xi, with the start-of-run bug it was hiding).
  The fix has three parts:
  - **No-pitch handling:** `gliderPitchToY` returns null for anything but a positive frequency, so no pitch makes the
    glider fall, as the course description says ("Sing to fly, go quiet to fall").
  - **Start-of-run bug:** that fall exposed an older bug. For the lead-in stretch (world x before the first gap
    point), `gliderGapAtWorldX` used the *last* generated point, and the glider always started at y = 160. Most runs
    then crashed on their first frames: 200 seeded courses per mode found the start outside the gap in 11–200 of 200
    runs depending on the course. The lead-in now uses the first point, and the glider starts at its centre.
  - **Freeze until the first note:** the glider waits in the lead-in gap until the first sung note, with no gravity,
    scrolling, score or crash, and a "Sing to take off" hint (`glider_takeoff_hint`, 4 languages) is drawn on the
    canvas. A run stopped before take-off saves no best and earns no new-best XP.

  Checks: `scripts/glider-verify/courses.js` (all 7 courses, 200 seeds each, stepping the real loop; 52/52 on production) and
  `flight.js` (real account, a steered oscillator as the mic; 38/38 on production). Existing players' bests may be inflated by the old
  bug; they were left as they are. Original report: `autoCorrelate` returns −1 for "no pitch", but `gliderPitchToY` only returns null for a falsy `freq`, so −1
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
- **Entrance & Cutoff Trainer: a false entrance on its first tick** (FIXED and deployed 2026-09-28; found 2026-09-27 while checking
  Vocal Load batch 3b, not caused by it). Fix: the trainer doesn't count any edge until it has heard 50 ms of unbroken
  silence (`TT_ARM_SILENCE_S`). A note already sounding when it starts is ignored: neither its unheard "start" nor its
  end counts. The control run found a second symptom of the same cause: in Cutoff mode, the end of that note counted
  as a cutoff (−0.948 s). Bleed from the very first click can fall inside the 50 ms before arming. The other three
  clicks still count, and the warning needs 2 hits. Check: `scripts/tt-verify/firsttick.js` (real account, an
  oscillator scheduled on the song clock; locally 15/15, production 17/17 after the deploy (dpl_9ehp1UD); the old code fails 11: a false entrance at −3.41 to −3.44 s
  in 10/10 runs, plus the false cutoff). Original report: The trainer starts out assuming silence (`wasVoiced = false`), so if
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
- **A signed-in user could set their own plan, or restart their trial** (FIXED and live 2026-09-28, migrations 0006 +
  0007; found in the pre-Stripe billing review). The "users update own row" policy let a user write any column of their
  own row straight through PostgREST with their own JWT, skipping the api function's allow-list. A trigger now rejects
  any change made as authenticated/anon to `subscription_plan`, `stripe_customer_id`, `payment_failed_at` or
  `trial_start_date`. The Stripe webhook (service_role), `handle_new_user()` (grants the trial on signup) and migrations
  still write them. Check: `scripts/billing-verify/protected-columns.js` (a real account on the linked project).
  When Stripe is wired, `billing.ts`'s checkout route must save `stripe_customer_id` with `serviceClient()`: the user
  client's write is now rejected, and that route ignores the error.
- **`users.email` and `users.created_at` are still user-writable** (open, not blocking; found 2026-09-28 with the item
  above). The same policy lets a user change them on their own row directly. Nothing gates access on either, so it
  isn't a free-access hole. But `email` here can drift from the login email in `auth.users`, which is what Stripe
  customers and support would go by. Fix: add them to the same trigger. `email` could be kept in sync from
  `auth.users` by a security definer trigger instead.

- **Pitch graders marked centred vibrato as off-pitch** (FIXED and live 2026-09-30, 18d3cc6, dpl_FbeuU2HWAkSxEjQ1soh8eEQye97p; found in the noise / vibrato scope study).
  Every grader built on `100 − mean|cents|×mult` scored the vibrato's swing as error, and so did Stay in Key's per-frame
  window. A shared helper, placed after `autoCorrelate` in deploy/index.html, now handles it: `vibratoGate` (4–8 Hz, ±8–160 ct, periodic),
  `vibratoTolerantCents` (a note's centre over whole periods) and `makeVibratoTolerantLive` (the same thing, live). It's wired
  into `captureAccuracyForTarget`, Stay in Key, Karaoke, Boss, Harmony Arena / Memory, Performance Director, Mirror Echo,
  One Take, Emotional, Drills, Real-Time Feedback and the Performance Report. RTF's "In tune" window gets a vibrato-only
  allowance (`vibratoCentreSlack`). RTF "Steady" uses the centre only when `live.vibratoSure` is set (±20 ct or more,
  and read as vibrato at a steady rate for 333 ms), so irregular wobble isn't smoothed into "Steady". Check:
  `scripts/vq-verify/vibfix.js`, which puts real VocalSet singing through the real UI. Result: 104/108. The 4 accepted fails:
  V1 Pitch Match pro 66 → 76 and V1 RTF In tune 22 → 61% (V1's detector drops out on about 20% of frames); N2 / N4 RTF Steady
  0 → 10% / 15% on wobbly notes without vibrato. That breaks the rise ≤5 check but stays within the ≤25% limit.
  Checked on production (`VF_URL=<url> vibfix.js`, a throwaway account, deleted after): 68/71. Vibrato V2–V6 score within
  0–5 of straight notes on every grader. Wobbly N1 / N2 / N4 read RTF Steady 21 / 21 / 8% and In tune ≤9%. The 3 fails are the
  2 accepted V1 ones and W4 flutter in Drills at 89 against a ≥10-below-straight line, which is unchanged from before the fix (88–89).
  livevq.js, live9.js and reload.js (30/30) also pass on production.
  - **Follow-ups (open, not blocking):**
    - [ ] **Tuner stability meter reads wobble as steady.** It has the same cause RTF's Steady had: the Tuner's
      `stabilityBuffer` takes the live helper's centre, and the 800 ms gate also passes irregular ±20–25 ct jitter as
      vibrato, which the box-mean then smooths. In vibfix.js (measured, not checked), stability ≥75 went from 0% to as much as
      68% of frames on wobbly stimuli without vibrato (N1: 0 → 62%). Likely fix: feed it the reading as is unless
      `vibratoSure`, as RTF's Steady buffer does.

- **Noise with nobody singing was heard and scored as singing** (fix A, 2026-10-01; found in the noise / vibrato scope study).
  The only voicing check was `autoCorrelate`'s level floor (rms ≥ 0.008), so hiss, traffic, a fan or mains hum got a
  pitch. Every pitch reader now goes through two more checks in `autoCorrelate`. The frame must repeat at the detected
  period: `VOICE_MIN_CLARITY` 0.6, the normalized autocorrelation at that lag. The pitch must be at least `VOICE_MIN_HZ`
  63 Hz, which drops 50 / 60 Hz hum. Check: `scripts/vq-verify/noisegate.js` (real UI, before / after, or `NG_URL` on a
  deployed page). Stimuli come from `gatestim.py`: synthetic noise, real speech (LibriVox) and real TV (archive.org)
  at 10 dB under the singing, VocalSet singing, and the two mixed. Local result: 146/160.
  - White noise alone: heard on 0% of frames in every exercise (was 74–100%). Pink, traffic and rumble: about 0% on the
    shared mic (Tuner, Stay in Key, Choir World).
  - Real speech and TV alone are heard less often (e.g. Choir World 40 → 20%). Breathy and pp singing keep 94–100%.
  - Accepted fails (2026-10-01): Choir World held one phantom note on real speech (Holmes) and on real TV (Bonanza b),
    up from 0. Babble and speech are periodic, which is the known hard case. Small losses for singing over noise:
    talker mix CW 92 → 82%, breathy + white RTF 100 → 94%, pp-92 RTF 12 → 10%.
  - **Open: RTF still hears broadband noise while the shared mic is also open; re-test with the per-feature
    single-stream migration (item 3).** In noisegate, RTF heard pink 59%, traffic 78% and rumble 7% (was 100%). With
    RTF's register input open alone, the same noise is heard on 0% of frames (offline frames and an isolated RTF run).
    When initAudio's processed stream (echo cancellation + noise suppression) is open at the same time, the register
    input carries processing artifacts at 1.1–1.6 kHz. Those are periodic enough to pass the clarity check and sit under
    its 1.5 kHz low-pass. An upper pitch limit was turned down: about 1.1 kHz would cut sung notes above C#6 in the
    Range test, and about 1.4 kHz would leave a quarter of the artifacts. The real fix is one stream per feature, so
    re-run `noisegate.js` (pink, traffic, rumble: RTF heard ≤5%) when that migration lands.
  - Not built: telling speech from singing (option C in the scope study), parked for a later product decision.
  - **Merged to master 2026-10-02 (fce3993), after vibfix on the Mac** (Node 22.23.3, Python 3.12.15; logs
    `vibfix-local-2026-10-02T10-31-59` and `…T11-23-17`):
    - Same run, `VF_BEFORE=dccc80b` (live vibrato fix, no gate) vs the gate: every checked score within 5 points (one
      larger move, an improvement: V5 Choir World pitch 80 → 88); voiced frames down by at most 5. Verdict 76/32: all
      32 are "must rise from before" checks, which can't pass when both sides have the vibrato fix.
    - Like-for-like, `VF_BEFORE=d7a5691` (before the vibrato fix) vs the gate: 103/108. The 4 accepted fails as before
      (V1 Pitch Match pro 65 → 76, V1 RTF In tune 24 → 60%, N2 / N4 RTF Steady 0 → 10% / 15%) plus a fifth, **accepted
      2026-10-02: N1 RTF Steady 9 → 23%** (must not rise more than 5; it stays under the 25% limit). The gate's own
      effect on it is +1 (21 → 22% in the same run); the rise against the Windows baseline (12 → 17%) comes from the
      machine.
    - N1 spread (3 runs of N1 alone, `VF_BEFORE=dccc80b` vs the gate, same run): RTF Steady 21 / 23 / 21% without the
      gate, 22 / 22 / 22% with it. The live vibrato fix's Steady rule sits 2–4 points under its 25% limit on N1.
  - **Live 2026-10-02 (dpl_AzAW5FnTiAxntvcNmeRXcFNKD27D)**; the live page is byte-identical to the merge.
    - Local noisegate on the Mac (`NG_BEFORE=b37cd57`, same run): 150/160. The 10 fails are the accepted classes: RTF on
      pink and rumble, the Choir World phantom note on real speech (now Alice rather than Holmes / Bonanza b; the real
      recordings were re-cut on the Mac), breathy + white RTF 100 → 94%, and the talker mix (CW 92 → 83%, Stay in Key
      76 → 70%). Traffic passed on the Mac (RTF 0%).
    - Production noisegate: 12/20 (prod mode has only the 20 noise-alone checks). The 8 fails are RTF on pink (67%),
      traffic (50%) and rumble (15%): the accepted shared-mic leak. Tuner, Stay in Key, Choir World, Pitch Match and
      Drills match the local after-side within about ±3 on all 24 stimuli.
    - Production vibfix: 68/71, the same 71 checks with the same pass/fail as before the gate (V1 Pitch Match pro 76,
      V1 RTF In tune 59%, W4 flutter in Drills 89).
    - **RTF hears soft singing less when the page is signed in; the gate isn't the cause.** Production RTF read soft
      singing lower than the local runs (pp-92 0 vs 11%, pp-646 63 vs 80%, breathy-5 85 vs 97%). The local runs were
      signed out, so `vlSidecar` / `vlFeed` returned early; production was signed in (sidecar during Pitch Match, Vocal
      Load fed during Drills and RTF), with the same two streams open during RTF in both (shared mic and register input).
      Signed in on all three sides (`scripts/vq-verify/rtfsoft.js`, 3 runs each): pp-92 0 / 0 / 0%, pp-646 63 / 63.3 /
      63.3%, breathy-5 84.7 / 84.7 / 84.7%, breathy-3002 89.7 / 89.7 / 89.7% for `b37cd57` / the gate / production. Gate
      effect ≤ 0.3 points, and local signed in reproduces production. Why signing in costs RTF soft-singing frames is
      open and goes with item 3 (one stream per feature). **This raises item 3's priority** (user, 2026-10-02): it
      now comes before redesign phase 4 (see HANDOFF.md, "Order of work").
  - Closed 2026-10-02.

Verification scripts for these phases live in `scripts/choir-verify/` (see its README).

## Testing infrastructure notes

These are about the test setup, not the app.

- **Regression checks compare current master against the new branch on this Mac, in the same run** (rule from
  2026-10-02, when the project moved from Windows to a Mac). E.g. `VF_BEFORE=<master> vibfix.js` with the branch checked
  out, or `NG_BEFORE=<master> noisegate.js`; other scripts likewise through their own before-side. Numbers measured on the Windows machine (e.g.
  vibfix 104/108 and noisegate 146/160) are reference only: on the Mac the same code reads somewhat differently (RTF
  samples about 116 voiced frames per 6 s against 107, and RTF / Tuner percentages move by up to ±10 between
  machines). Mac reference numbers from 2026-10-02 are in the noise-gate entry above.
  For a change that isn't the vibrato fix, run vibfix with `VF_MODE=regress` (from 2026-10-05): both sides already have
  the fix, so its "must rise" checks become "must not move" (±3 per-note, ±5 RTF). The plain mode proves the fix itself
  against `d7a5691`. When a feature's own length changes, hold each take to the same length on both sides (vibfix and
  noisegate hold every Pitch Match take to 8 s), or the features after it hear a different stretch of the stimulus.

- **Signed-in page load: no real-user problem found** (2026-10-02). noisegate's and rtfsoft's harnesses wait for
  `profile` and `progress` after loading the page with a saved session, and that wait timed out 3 times in about 110
  loads (twice at 20 s on production, once at 60 s locally). `scripts/vq-verify/pageload.js` (20 fresh production
  loads with a saved session, no mic) found nothing: ready in 2.7–3.9 s (median 3.3 s), none over 20 s, `/me/progress`
  1.0–1.7 s (median 1.2 s), `/me` 1.2–1.9 s, no 401 / 403 / 429. `onSignedIn` loads `/me` and then `/me/progress` one
  after the other, so the wait is about their sum. The harness timeouts are unexplained; if they come back, run
  pageload.js with the mic flags and look at the stuck load's requests. Resume the run with `NG_RESUME` / `VF_RESUME`.
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
