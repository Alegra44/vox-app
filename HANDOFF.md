# VoxCoach handoff (Windows → Mac, 2026-10-02)

State of the project when it moved machines. The detailed history of every feature is in `CHOIR_WORLD_ROADMAP.md`,
and the commit messages carry deploy IDs and check results. This file covers what's in flight, what's waiting
on a decision, and how to set the machine up again. It contains no secrets.

## Branches on GitHub

| Branch | What it is | Status |
|---|---|---|
| `master` | Everything that is live, through House Lights phase 4a (merge 296d530, dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg, 2026-10-22; before it the single mic stream, dpl_6FBgCU661see6RBdPhXoMniCp42s) | Matches production |
| `redesign/phase4a` | House Lights phase 4a and fix rounds 4a.1–4a.3 (spec `design/house-lights/PHASE4A.md`) | Merged (296d530) and live 2026-10-22. Closed |
| `redesign/phase4b` | Phase 4b survey (`design/house-lights/PHASE4B_SURVEY.md`) and the 4b build (spec `design/house-lights/PHASE4B.md`) | Built and checked, pushed 2026-10-29 (1f06e2e and the HANDOFF commit); waiting for the user's screenshot review. No merge or deploy before it |
| `review/phase4b` | Orphan branch, no code: the 10 tools after 4b (idle, stage, result or stopped; 390 and 1280, Light and Dark; Mirror scrubbed, Rhythm with every beat sung, hl-alert, `sheets/tools.jpg`) | For the user's review |
| `review/phase4b-before` | Orphan branch, no code: the 10 phase 4b tools as they are now (idle, live, result; 390 Light/Dark, 1280 Light) | For the user to look at; delete after |
| `review/phase4a-prod` | Orphan branch, no code: production screenshots after the phase 4a deploy (the 14 tools, hubs, states, Home; 390, Light/Dark) | For the user to look at; delete after |
| `feat/single-stream` | Item 3: C3 + F2 single mic stream (spec `design/audio/BUILD.md`) | Merged (7bfc47a) and live 2026-10-21. Closed |
| `wip/noise-gate` | Fix A, the singing-detection gate | Merged (fce3993) and live. Closed |
| `warmup` | Pre-session warm-up, phases 1–2 (based on `d7a5691`, two commits behind master) | WIP. Never run, not deployed, not merged |
| `redesign/phase1` | House Lights redesign phase 1, Foundation, and the 1.1 fixes (spec `design/house-lights/PHASE1.md`) | Merged (12a1364) and live 2026-10-11. Closed |
| `redesign/phase2` | House Lights phase 2, Lighting, and the 2.8 fixes (spec `design/house-lights/PHASE2.md`) | Merged (3b29e93) and live 2026-10-13. Closed |
| `redesign/phase3` | House Lights phase 3, Home and the Coach tab, and the 3.1 fixes (spec `design/house-lights/PHASE3.md`) | Merged (7996514) and live 2026-10-13. Closed |
| `review/phase3-prod` | Orphan branch, no code: production screenshots after the phase 3 deploy (Home in the 7 seeded states and the Coach tab, 390, Light/Dark) | For the user to look at; delete after |
| `review/phase2-prod` | Orphan branch, no code: production screenshots after the phase 2 deploy (singing states and motion, 390, Light/Dark) | For the user to look at; delete after |
| `review/phase1-prod` | Orphan branch, no code: production screenshots after the phase 1 deploy (Home and the four hubs, 390, Light/Dark) | For the user to look at; delete after |

Production: https://deploy-alegra1122.vercel.app (Vercel project `deploy`, scope `alegra1122`).
`deploy/index.html` is the only client (the old `voxcoach-prototype.html` mirror was deleted on 2026-10-02).

## Working rules

- **Regression checks compare current master against the new branch on this Mac, in the same run.** The Windows
  numbers (vibfix 104/108, noisegate 146/160, prod 68/71) are reference only. See the roadmap's testing notes.
- Build one item at a time, verify it on production, report back, and wait for a go-ahead before starting the next.
  "Scope" means report only, with no app changes.
- **Write every approved spec into the repo (`CHOIR_WORLD_ROADMAP.md` and this file) before building it** (user,
  2026-10-05: the spec for (a) lived only in chat and was lost).
- Production deploys need the user's explicit approval. Run from `deploy/`:
  `npx vercel@62.2.0 deploy --prod --yes --scope alegra1122` (without `--scope` the CLI answers "Not authorized").
  The CLI is pinned to 62.2.0 (deployed fine 2026-10-06/07). "Not authorized" while logged in (`whoami` fine) has come
  from 62.4.0 and, once, from 62.2.0 too (2026-10-07): it's intermittent on Vercel's side, and the same command again
  deployed. Retry once before suspecting the login; try newer CLI versions later.
  The user often runs this themselves.
- Verification means real measurements (AudioParam values, per-frame pitch through the app's own code), never claims.
- Every verify script that creates accounts wraps each address in `track()` from `scripts/choir-verify/testAccounts.js`.
  The script then deletes those accounts on exit. Report the `[cleanup]` line.
- Never run two verify scripts at once (the Supabase CLI temp login collides). Save full logs, not just the tail.
- The fake mic drops out under memory pressure. Check free RAM before long prod runs.
- About 35 headless sessions in about 10 minutes triggers Vercel's automatic IP challenge (403). Pace prod runs
  (`REG_PACE_MS`, `VF_PACE_MS`).

## Order of work (set by the user, 2026-10-02)

1. Pre-session warm-up, phases 1–2 (`warmup`, below). Now.
2. The four tester-review fixes (a)–(d): (b) listening window and (c) shared note picker are live (2026-10-05,
   dpl_9iW4QDUnWwCQuxNz5bYoZQLotw8X); (a) playback volume is live (2026-10-06, dpl_5GhGgvgLAQCFZQXnmwdmAn8UcyKh, results
   in the roadmap); (d) level-up explanation is next: report its migration and API change before applying. Specs below.
3. House Lights redesign phase 1 (`design/house-lights/HOUSE_LIGHTS.md`): **live 2026-10-11** (with the 1.1 fixes).
   Phase 2 (Lighting): **live 2026-10-13** (with the 2.8 fixes). Phase 3 (Home and the Coach tab): **live 2026-10-13**
   (with the 3.1 fixes). **Phase 4a (14 Coach tools onto the take stage and result, spec
   verbatim `design/house-lights/PHASE4A.md`, with fix rounds 4a.1–4a.3): live 2026-10-22**, merge 296d530,
   dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg (rollback target was dpl_6FBgCU661see6RBdPhXoMniCp42s, not used). Production checks
   2026-10-23 (logs/prod-2026-10-23T07-03-38): every suite passed; scores.js (6f1fcf9 local vs production) within ±2; contrast
   light after the transition fix: 0 below 3:1, the 32 known choir / part-rehearsal rows. Approved by the user. Screenshots:
   `review/phase4a-prod`. The first production run (2026-10-22) lost the internet 15 min in: prod.sh now checks the site and
   Supabase before each suite (5 tries, then stops) and limits each suite to 3× its usual minutes (30 max); contrast.js waits
   for running transitions (1 s max) before measuring. Copy table `design/house-lights/PHASE4A_COPY.md`.
   **Phase 4b (the 10 tools with their own displays): survey** `design/house-lights/PHASE4B_SURVEY.md` on
   `redesign/phase4b`, shots on `review/phase4b-before`. **Spec verbatim `design/house-lights/PHASE4B.md` (2026-10-26):
   built on `redesign/phase4b` (2.1–2.12, follow-up 4278e4f), checked, pushed 2026-10-29 with the screenshots on
   `review/phase4b`**; no merge or deploy before the user reviews them; rollback target dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg;
   AC power only, one verify script at a time. Checks (logs `scripts/design-verify/logs/checks4b-2026-10-26T15-01-32`,
   `-2026-10-28T16-02-57`, `-2026-10-28T19-19-03`): hooks 19/0; scores.js within ±2 on every take tool except Rhythm's
   per-beat values (±1 frame, 16.7 ms, between runs whatever the build: the A/A misses the same way); live.js Register
   Coach and Live Feedback equal at the file's steady moments (`--at`), Resonance's ripple moves in steps of 9 and flips
   on master too; house 4b 284/0; stopcheck all pass (master 13 fail); vocal load equal to master on 34 tools (worst
   0.18); contrast 0; navcheck pass (master fails, the expected change); vibfix 0 regressions (2 already failing on
   master), noisegate 160/160; batch1: a tool's stored session sometimes missing (branch 2 of 4 runs, master 2 of 2;
   unexplained). Copy table `design/house-lights/PHASE4B_COPY.md`. In the spec too:
   - Ear → Voice → Ear's English step headers ("Step 1 — Hear" … "Step 5 — Sing without help").
   - The hard-coded "Listening…" on stage buttons and statuses.
   - Mirror's "No signal at this moment".
   **For phase 10:** on Daily Exercises, the Today's Recommended Focus text is bigger than the page subtitle and its title
   isn't bold; Smart Warmup's "(3s)" needs a space before the unit, like everywhere else.
   **Later accuracy item (from 4b 2.4, out of scope there):** Rhythm (and the Entrance and Cutoff Trainers, which share its
   onset timing) doesn't compensate output or input latency: clicks are scheduled on the audio clock and onsets timed with
   `performance.now()`, so the speaker's and the microphone's delay land in every offset as "late".
4. **Item 3**, the per-feature single-stream mic migration: before redesign phase 4 (Coach tools). **Step 1 (investigation) in
   progress since 2026-10-13 on `exp/single-stream`**, spec `design/audio/SPEC.md`; the user chooses the design after it.
   Measured 2026-10-14: `design/audio/STREAMS.md` (inventory), `design/audio/SINGLE_STREAM.md` (results, C3
   recommended). Branch-only flags `window.__streamMode`, `window.__bleedDefence`; scripts in `scripts/audio-verify/`.
   **Decided 2026-10-15: C3 + F2 (quiet-singer gain on the pitch path).** **Building on `feat/single-stream`** per
   `design/audio/BUILD.md` (5 commits, full verification, iPhone preview after a typed go-ahead, then report; no merge or
   prod deploy before review; rollback dpl_CAMGry4a7b8RewSA6bJNST64PVv7). **Live 2026-10-21: dpl_6FBgCU661see6RBdPhXoMniCp42s**
   (merge 7bfc47a; iPhone checks a–e, g pass, f skipped; every production check passed, results in the roadmap).
   Still open: real-speaker loopback timing, micdiag phone results, quiet-room loopreal (step 7). Long jobs on AC power with checkpoint/resume. Its priority went up
   on 2026-10-02: signed in, RTF hears soft singing on fewer frames than signed out (see the roadmap's noise-gate entry).
   Next to it, scoped (2026-10-06), not to be fixed yet: **"Speaker bleed scores as singing"** (roadmap, "Known
   issues (app-wide)"): with nobody singing, the app's own playback is credited (Entrance Trainer 8/8 entrances,
   Harmony Arena 0–8/8 notes, Harmony Memory 3/8 held); echo cancellation on real devices untested.
5. Redesign phase 4 onwards. **Item 4** (Glider octave crash) comes after item 3.

Redesign phase 1 loads `/me` and `/me/progress` in parallel (item 2.10): profile and progress ready in a median
1583 ms vs master's 2761 ms (local builds, production backend, 10 loads each); on production after the deploy, a
median 1902 ms (10 loads, `pageload.js`).

## In flight

### 1. Noise gate, fix A (`wip/noise-gate`): CLOSED 2026-10-02

What it does: `autoCorrelate` in `deploy/index.html` now rejects a frame unless it is periodic at the detected lag
(`VOICE_MIN_CLARITY` 0.6) and the pitch is at least 63 Hz (`VOICE_MIN_HZ`, which drops mains hum). Before, any sound
over the level floor got a pitch, so noise with nobody singing was scored as singing.

Decisions already made by the user:
- Ship fix A as is, with **no upper Hz cutoff**.
- All 14 noisegate fails are accepted. Local run: 146/160 (`scripts/vq-verify/logs/noisegate-local-2026-10-01T10-35-57.*`).
- Option B is answered. Option C (telling speech from singing) stays parked; don't build it.
- The RTF shared-mic artifact leak is logged in the roadmap and tied to item 3 below.

Status (2026-10-02, on the Mac):
1. Done: vibfix run locally with the `realvib.js` fix. Like-for-like (`VF_BEFORE=d7a5691`): 103/108, the 4 accepted
   fails plus N1 RTF Steady 9 → 23%, accepted as the fifth (the gate's own effect on it is +1). Details and the
   same-run comparison against `dccc80b` are in the roadmap's noise-gate entry.
2. Done: merged into master (fce3993).
3. Done: live 2026-10-02 as dpl_AzAW5FnTiAxntvcNmeRXcFNKD27D. Production noisegate 12/20 (accepted RTF leak),
   production vibfix 68/71 (unchanged). The RTF soft-singing gap is the signed-in state, not the gate (rtfsoft.js).
4. Done: reported.
5. Closed by the user. Next items: see "Order of work" above.

### 2. Pre-session warm-up, phases 1–2 (`warmup`)

Built: a once-per-day warm-up overlay (`wuOpen` / `warmupGate` / `wuFinish`, Skip button and Escape, key
`warmup:<id>:<date>`), awaited at the top of `initAudio` (the `noWarmup` opt bypasses it) and at 4 other sites. It
has 4 glide exercises (`WU_EXERCISES`, sharing Glider's follow via `glideFollow`), a song warm-up on the Karaoke roll,
and 22 i18n keys in 4 languages. Tests: `scripts/warmup-verify/entries.js` and `tracking.js`. **They have never been
run.** Expect real failures.

User's sequencing: don't start until fix A is merged and deployed. Then:
1. Rebase or merge `warmup` onto master. One hunk conflicts: the `initAudio(opts)` signature. Resolve it by hand.
2. Run entries.js and then tracking.js for the first time, alone. Run them from the main checkout, because they
   use the Supabase CLI link.
3. Fix what comes up.
4. Verify on production with throwaway accounts and full logs.
5. **Report back before committing to master or deploying.** Phase 3+ stays deferred.

### 3. Tester-review fixes (a) and (d): specs (also in `CHOIR_WORLD_ROADMAP.md`)

#### (a) Playback volume (approved 2026-10-05; next)

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

#### Next, approved 2026-10-06 (in this order; report after 1 is deployed, together with 2–4)

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

#### Approved 2026-10-07 (in this order; report after (d) is live)

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

#### (d) Level-up explanation (approved 2026-10-05; don't start until (a) is live)

- At each level-up, store a snapshot of the existing counters on the server (e.g. a jsonb column on user progress),
  so it follows the account. Only counters that already exist: sessions, new records, streak days, passed drills, and
  anything similar.
- At the next level-up, show the difference in one line, e.g. "You levelled up: 9 sessions, 2 new records and a 5-day
  streak". For the first level-up after this ships, count from the start of the account.
- The new text goes into all four languages.
- **Report the migration and the API change to the user before applying the migration.**

### Redesign phase 1, Foundation, and the 1.1 fixes: LIVE 2026-10-11

Spec: `design/house-lights/PHASE1.md` (phase 1 and the "1.1 fixes" section, verbatim). Reviewed by the user on
screenshots and the diff, approved, merged `--no-ff` (12a1364) and deployed (dpl_ANbkHxATnBsDJkiKTz6w4HMWh13g).
- Guards (`scripts/design-verify/`, `DV_URL=` runs them on a site): `hooks.js` (static master vs working copy: ids,
  data-i18n, data-panel / data-shell / data-enter-panel, §9 protected classes and strings, four languages, House
  Lights block byte for byte, colour literals): 19/0. `contrast.js` (46 panels + header, tab bar, toast; Light and
  Dark): 0 under 3:1 in both; between 3 and 4.5: Dark 0, Light 32, all Choir sonic X-ray / Breath Map SVG note labels
  on semi-transparent part shapes (neither ink nor white passes: phase 5). `system.js` 7/7 (System follows the device,
  explicit Light/Dark win, reduced motion, Archivo really loaded).
- Production (`prod.sh`, logs `scripts/design-verify/logs/prod-2026-10-11T15-28-49/`): system 7/7, contrast as
  above, batch1 112/0, warmup-entries 52/0, warmup-tracking 27/0 (the two master-comparison checks run only on a local
  build), levelup 45/0, cv-live7 and cv-modalz OK, glider-courses 50/0, pageload median 1902 ms; test accounts 0 left.
- Before the merge, every suite ran on the branch (`suites.sh`) and failures re-ran on master (`suites-master.sh`):
  11 choir-verify scripts are Already failing on both (signed-out Choir World runs, blocked by the phase-8 sign-in
  gate); the warmup-tracking roll check now ignores colour values (1.1). Not run: `choir-verify/live.js` and `p8.js`.
- `hub_world_sub` unchanged (no new text in the spec). The `.poster` (share poster) is left for phase 7.
- Logged for phase 4: **Vocal Puzzle asks for the mic it doesn't use** (#puzzleStartBtn calls `initAudio()`, which
  requests the mic and runs the warm-up gate). Don't change `initAudio` before then (user, 2026-10-11).

### Redesign phase 2, Lighting, and the 2.8 fixes: LIVE 2026-10-13

Spec: `design/house-lights/PHASE2.md` (phase 2, the review and the 2.8 fixes, verbatim). Approved by the user on
screenshots, merged `--no-ff` (3b29e93) and deployed (dpl_CLqPg1gb25R563tBixH4WCXsUrNT; the first deploy answered
"Not authorized", the retry deployed).
- The lighting engine (`houseSession` / `singingSession`, `houseWatch`, the dimmer) lowers the house while someone
  sings: the shell is dimmed by colour (all text and icons `--hl-ink-3`, no opacity), back to ink on hover or focus.
- Gate (decision 2): vibfix and noisegate regress, before 9a3bfbf (phase 0), after fd8a512: 0 regressions each
  (vibfix 136 passed, 1 already failing; noisegate 152 passed, 8 already failing). Logs in `scripts/vq-verify/logs/`.
- Guards: `house.js` 111/0 (lighting, shell colour, Tuner lock, Pitch Match readout, sharp stimulus, console errors,
  Sing it again), `hooks.js` 19/0. Fake-mic stimuli and the singing states: `scripts/design-verify/stage.js`.
- Production (`prod.sh`, logs `scripts/design-verify/logs/prod-2026-10-13T00-02-28/`): house 111/0, system 7/7,
  contrast as in phase 1 (Light 32 between 3 and 4.5, all Choir / Part Rehearsal labels: phase 5; Dark 0), batch1
  112/0, batch3c 40/0, warmup-entries 52/0, listenwin 27/0, picker 93/0, glider-courses 50/0; test accounts 0 left.
- Known flake: batch3c's "banner up at the crossing" can read exactly 100.000% on the poll before (39/1 once; 40/0 on
  master and the branch on re-run).
- `scripts/glider-verify/courses.js` stubs `houseSession` (its one-slot rAF stand-in collided with `houseWatch`).

### Redesign phase 3, Home and the Coach tab, and the 3.1 fixes: LIVE 2026-10-13

Spec: `design/house-lights/PHASE3.md` (phase 3 and 3.1, verbatim). Approved by the user on screenshots, merged `--no-ff`
(7996514) and deployed (dpl_CAMGry4a7b8RewSA6bJNST64PVv7; the first deploy answered "Not authorized", the retry deployed).
- `computeTodaysFocus()` is the one source for Home's "Today's focus" and the Coach tab's `#coachFocus`;
  `personalRecordValues()` feeds both the Personal Records list and the Coach rows' "Best" values; `renderCoachHub()`
  runs wherever `renderHomeScreen()` does, on a language change and when the tab opens.
- Coach icons: 23 sprite symbols, one per tool. Sing It 5 Ways (group), Mirror (you) and Warmup (calendar) get their
  own icons in phase 4 (user, 2026-10-13).
- 2.5 copy: no §7 word left on Home or the Coach tab in en/fr/es/tr (`copyscan.js`), including `home_cw_empty_desc`
  ("your own runs"). HOUSE_LIGHTS.md is v1.5 (the spec said v1.4, which 2.8 had used).
- Guards: `home.js` 102/0 (master vs branch in 7 seeded states, `homeStates.js`; master's page gets the branch's 18
  changed English strings first, so it compares what is computed), `hooks.js` 19/0.
- Production (`prod.sh`, logs `scripts/design-verify/logs/prod-2026-10-13T08-23-21/`): house 111/0, system 7/7,
  contrast as before (Light 32, all Choir / Part Rehearsal: phase 5; Dark 0), batch1 112/0, batch3c 40/0,
  warmup-entries 52/0, levelup 45/0, cv-p9 exit 0, cv-p10 exit 0 (7 MATCH); test accounts 0 left.
- Known flake: cv-p9 can time out at sign-up (backend); it passed on both re-runs.

## Waiting on the user (don't start without a go-ahead)

- **Stripe / billing:** payments are still simulated. Billing columns and `trial_start_date` are server-only
  (migrations 0006 and 0007, live). When Stripe is wired, `billing.ts` must save `stripe_customer_id` with
  `serviceClient()` (the user client is rejected by the trigger). On hold until the user says the Stripe dashboard
  (price IDs, secret key) is ready. `email`/`created_at` are still user-writable (logged, non-blocking).
- **Register Coach follow-ups:** Bridge lane jitter at ±100 ct vibrato (11% of frames), and Safari/mobile testing of
  the unprocessed mic. That path has only been verified on desktop Chrome.
- **`recordActivity()` race:** it checks `profile` but not `progress`, so an exercise started during sign-in can
  drop one XP tick. The user said not to fix it yet.
- **Tuner false-steady** with vibrato (logged as a follow-up).
- **Vocal Puzzle** isn't wired into Vocal Load (it never reads the mic). The user still has to decide.
- **Your Choir** has a ~67 ms take latency. A round-trip calibration step is wanted before it's marketed seriously.
- Choir World rehearsal view isn't plan-gated (gating deferred).
- Five pre-Choir-World test accounts (voxcoach-e2etest / smoketest / e2e / monday-readiness, Sept 11–18) are still in
  the production DB. The user hasn't said to delete them.

## Done and live (for reference)

Choir World 2.0 phases 1–10 · Voice Quality phase 1 (power-weighted brightness) · Register Coach vibrato fix
(one unprocessed register stream) · Vocal Load Dosimetry phases 1–3c (budget = active singing time, 6800 load-s:
closed, never reopen) · saved range after reload · Glider NaN / take-off · Entrance Trainer first tick ·
billing columns server-only · vibrato tolerance in pitch graders.

## Setting up the Mac (things that are not in git)

1. **Clone and install**
   `git clone https://github.com/Alegra44/vox-app.git && cd vox-app && npm ci && npx playwright install chromium`
   This brings in Playwright, the Supabase CLI, the Vercel CLI and PGlite as devDependencies.

2. **Python for the test scripts.** Use Python 3.11+ in a venv, so `python` (which the scripts call by that name)
   resolves on macOS:
   `python3 -m venv .venv && source .venv/bin/activate && pip install numpy imageio-ffmpeg`
   Activate the venv before running any vq-verify script.

3. **Test data folder.** Every verify script keeps its test data (recordings, built stimuli, scratch copies) in
   `~/VoxCoachTestData`, or wherever `VOXCOACH_TESTDATA` points (`scripts/testdata.js`; `gatestim.py` reads the same
   variable). Not `$TMPDIR`: macOS clears it of files not used for a few days, and on 2026-10-06 it deleted the
   VocalSet clips and the noise stimuli overnight. Only the test-account ledgers stay in `$TMPDIR` (they're meant to be
   short-lived).

4. **Supabase CLI link.** Needed by `testAccounts.js` (`npx supabase db query --linked`), migrations and function
   deploys:
   `npx supabase login` (opens the browser), then `npx supabase link --project-ref ccharikhpeqtzpobarxi`
   (it asks for the database password, which lives in the Supabase dashboard). This writes `supabase/.temp/`, which
   is gitignored.

5. **Vercel link.** `cd deploy && npx vercel login && npx vercel link --scope alegra1122`, then pick the existing
   project `deploy`. This writes `deploy/.vercel/`, which is gitignored.

6. **Edge-function env (only for local `supabase functions serve`).** Copy `supabase/functions/.env.example` to
   `supabase/functions/.env` and fill it in. Real secrets live in Supabase (`npx supabase secrets list`). Stripe
   secrets aren't set yet.

7. **Test recordings (VocalSet and the noise stimuli).** About 620 MB, all regenerable, nothing committed. With the
   venv active: `python scripts/vq-verify/fetchdata.py` fetches the 18 VocalSet clips the scripts use (Hugging Face
   mirror `Bill13579/vocalset-mirror`, CC BY 4.0, by row, label checked) and the public-domain sources of the noise
   recordings (LibriVox, archive.org), cut with ffmpeg into `gate/real-*.wav`. Then `python
   scripts/vq-verify/gatestim.py` builds noisegate's stimuli (it needs vibfix's `stim-S1.wav`: run vibfix once first);
   vibfix builds its own.

8. **Claude Code memory.** Claude's notes were stored on the Windows machine and won't come along. This file
   replaces them. On the Mac, ask Claude to read `HANDOFF.md` and `CHOIR_WORLD_ROADMAP.md` first.
