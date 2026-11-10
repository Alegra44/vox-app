# VoxCoach handoff (Windows → Mac, 2026-10-02)

State of the project when it moved machines. The detailed history of every feature is in `CHOIR_WORLD_ROADMAP.md`,
and the commit messages carry deploy IDs and check results. This file covers what's in flight, what's waiting
on a decision, and how to set the machine up again. It contains no secrets.

## Branches on GitHub

| Branch | What it is | Status |
|---|---|---|
| `master` | Everything through House Lights phase 4b (merge ffa49b1, 2026-10-29) | **Ahead of production**: 4b was deployed (dpl_FjTuxeuo8kehTKyepm2wKSEHtR5g) and rolled back to dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg (phase 4a) after stopcheck failed twice on production; see phase 4b below |
| `redesign/phase4a` | House Lights phase 4a and fix rounds 4a.1–4a.3 (spec `design/house-lights/PHASE4A.md`) | Merged (296d530) and live 2026-10-22. Closed |
| `redesign/phase4b` | Phase 4b survey (`design/house-lights/PHASE4B_SURVEY.md`) and the 4b build (spec `design/house-lights/PHASE4B.md`) | Built and checked, pushed 2026-10-29 (1f06e2e and the HANDOFF commit); waiting for the user's screenshot review. No merge or deploy before it |
| `review/phase4b-fix` | Orphan branch, no code: the 4b.1 fixed screens and `sheets/fix.jpg` | For the user's review |
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

Production: https://deploy-alegra1122.vercel.app (Vercel project `deploy`, scope `alegra1122`). Live since 2026-11-10:
phase 9, **dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H** (deployed by the user from master 4c2aa7f, the --no-ff merge of
redesign/phase9), **the rollback target for phase 10**. The previous target was phase 8,
dpl_2fusEnGruFnpBJmfa4FzV6mPEGbx. The table above predates phase 5; `review/phase9-prod` is the current review branch.
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
   unexplained). Copy table `design/house-lights/PHASE4B_COPY.md`.
   **4b.1 (the user's review, verbatim in PHASE4B.md, 6aaac33), built, checked and pushed 2026-10-29 with the fixed
   screens on `review/phase4b-fix` (`sheets/fix.jpg`); no deploy until the user types "deploy" (steps in PHASE4B.md
   4b.1).** vltrace.js + batch1-alt.sh (2ce8506), screen fixes 4–9 (261d513), Rhythm gated on its average (3fa9fdf),
   Resonance by range (4490b88). batch1 5 + 5 alternating (logs `scripts/vocal-load-verify/logs/batch1-alt-2026-10-29T09-36-08`):
   no vlEnd ended a session it didn't open, on either side, so no ownership change. Runs 2–3 on both sides cut short by
   Supabase timeouts; completed runs: master 4 of 4 pass, branch 1 of 3 (the other 2 each one missing row, explained by
   the trace: the session ended on time and its write failed, 503 / Failed to fetch; the vl* code and
   vocal-load-store.js are identical on both sides). Checks (logs `scripts/design-verify/logs/checks4b-2026-10-29T11-55-03`,
   rerun `-14-08-05`): hooks 19/0; live within ±2 (Resonance by range); copyscan 0 in 4 languages; stopcheck all pass;
   contrast 0; house 629–630 of 631 (the failures Supabase 503 / CORS console errors); scores: Rhythm's average inside
   the A/A range, and each run 3–6 single values beyond ±2, different ones each run, on values where master's own three
   runs spread wider (e.g. Mirror note 2 master 76/79/79). **4b.2 (the user's review, PHASE4B.md):** network failures don't count for
   batch1; scores.js gates the values whose master runs spread wider than ±2 (Mirror and Register Drills per-note,
   Voice Quality centroid, Emotion Mode louder) by master's own range. **Later fixes, noted by the user:** the
   vocal-load save has no retry, so a session whose save fails is lost (same code on master): retry with back-off and
   keep unsaved sessions on the device until the server confirms. And look into the frequent Supabase 503s (batch1,
   house and the checks all hit them on 2026-10-29). **Deploy 2026-10-29/30:** merged (ffa49b1), deployed dpl_FjTuxeuo8kehTKyepm2wKSEHtR5g,
   production checks (logs `scripts/design-verify/logs/prod-2026-10-29T16-07-15`, reruns `prod-2026-10-29T19-48-56`): every
   suite passed except cv-modalz (a page timeout; passed on its rerun), scores4b (one Voice Quality centroid value out
   of its gate each run, a different stimulus each time) and stopcheck: the first run hit prod.sh's 6-minute limit (now
   7 × 3), the rerun failed 2 of 24 cases (today's vocal load grew after leaving Register Coach at 2.6 s, 72.44 → 74.44,
   and Live Feedback at 0.8 s, 74.44 → 82.85, with no mic calls and no page errors; vlDay changes from the server only at
   sign-in, so a session still closing, not the network). **Rolled back to dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg** per step 4.
   The review branches are kept (step 5 not done). **4b.3 (2026-10-31, spec verbatim in PHASE4B.md):** investigate the two
   hypotheses (A start/leave race, B late finalisation), fix on `fix/4b-leave` (start tokens; stopcheck checks vlFeed calls and
   loop flags), checks, push, report, stop; additions: a start never cancels itself (startGen taken after any
   stopAllActiveSessions/enterPanel the start path runs itself, every such path listed), and more checks (warm-up, home.js, batch1,
   picker, scores 4a, vibfix/noisegate regress, vq.js, the cv-* suites); then merge and redeploy with the five steps. Phase 5a waits until 4b is live.
   **4b.3 result (2026-11-01, pushed, awaiting the user's review):** both production failures are B (deferred finishes, 0 mic
   calls on Home; reproduced with `--slow-state 4000`, finishes 2.2–5.6 s after the end); A is real (`--slow-input 2000`: master
   7/21 fail with 187–300 mic loop calls on Home, fix 21/21). Fix A 9a132ab, fix B (stopcheck) 9ae5b25. Checks
   `logs/checks4b3-2026-10-31T08-01-00` (+ `reruns/`): all pass; the 4 failures were rerun and classified (house: Supabase 503,
   house master 631/0 and branch 630/1 only from it; batch3b: a 503 on the first save, rerun 179/0; batch3a-master: Supabase CLI
   then a timeout, rerun 168/1 with a master-only gauge timing miss on Hear Yourself Improve; vq: a TDZ on `vqActive` on one
   page load, reruns on the branch clean and matching master). Loads: 34 features compared, max gap 0.125. **Approved 2026-11-01** (verbatim in
   PHASE4B.md): merged --no-ff into master (5ff44f3, f33c6ca). **Phase 4b is live: dpl_BvNJh8hz89bSLfWzbAqHS15G85zs** (the user
   deployed 2026-11-01; index.html = master). Prod checks `logs/prod-2026-11-01T05-47-24` (base fc2ed85 = the previous deployment's
   build; a first run was cut by a Wi-Fi drop): house 629/2 (both Supabase 503s), modecheck, scores, stopcheck (25/25, the
   late finishes allowed), scores4b, live, navcheck, livevq all pass. Emotion louder 5+5 vs fc2ed85: first run dynamic range
   median 103 vs master 98–102 (readings are bimodal, ~99 or ~102–103), rerun 99 vs master 99–103, passes; no rollback.
   Screenshots on orphan `review/phase4b-prod` (132); review/phase4b, -fix, -before deleted. vq one-off: the log has no first
   page error (vq.js printed page errors only after a case passed); vq.js now logs the page errors and failed requests of a
   page load whose case throws. If a run shows a script or CDN failing to load: add the later item (an error and a retry
   when a required script fails to load, instead of half-starting). Next: Phase 5a. In the spec too:
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

### Phase 5a, the Choir World test scripts (`tests/choir-verify`): DONE 2026-11-01; 5a.1 in progress 2026-11-02
Spec verbatim in `design/house-lights/PHASE5A.md` (194aa5c). Test code only, no app changes.
- Before (`scripts/choir-verify/logs/5a-before-2026-11-01T07-34`): desc, paywall pass; shot, verify, live, live5, live6
  fail fast signed out; fix, s6fr, p5, p7, peaks, timing hang (killed at 20 min); live7, live9, modalz, p7signed, p9,
  p10, yc run; p8 can't start (no accounts file).
- Fixes (e37d96c): `harness.js`, an own tracked test account per script, a limit per step and overall (10 min; p8 15,
  yc 15, p9 20, p10 25: their usual 6–11 min), cleanup however it ends; p8 makes its own tier accounts. Smoke
  (`logs/5a-smoke-10-35`) 19/21, both failures script bugs, fixed.
- Counted runs (`logs/5a-runs-11-48`): 63/63 pass (each script 3/3). Pass = exit 0, no "FAILED (", no page errors, no
  MISMATCH, paywall bad: 0. A home-Wi-Fi drop failed desc/shot/verify #1 (ERR_INTERNET_DISCONNECTED, `network-drop/`);
  rerun.
- Choir group in suites.sh and prod.sh (`ONLY="choir"`, limit 3× the usual minutes, 30 at most).
- Reported, not rewritten: timing.js runs to the end but its own check fails (errors ~1.2–1.7 s, "should match within
  a few ms"). Script, not app: its stand-in feeds `analyser`, but since 4c57929 (2026-10-15) the Entrance & Cutoff
  Trainer reads `readRawMic()` (`micG.rawAn`), so it hears the fake mic's beep. The other scripts' stand-ins feed pitch,
  which still reads `analyser` (p9: silent 0, sung 100). p7's label "(signed out, so nothing is sent)" is outdated.
  Most scripts print values rather than a verdict.
- 5a.1 (approved 2026-11-01, verbatim in PHASE5A.md): timing.js's stand-in enters through getUserMedia (every note now
  reads +20/+21 ms, the known output/input latency item; 3/3 identical); p7's line fixed. Choir regress mode:
  `scripts/choir-verify/choirregress.sh <branch|working> [base]` (master's and the branch's build in the same run, 3
  runs per side, base :8766, branch :8767) and `choircompare.js` (medians, ±2 or master's A/A range from
  `aa-ranges.json`). The A/A proof (master against itself) writes `aa-ranges.json`.
- A/A proof 2026-11-02 (logs/regress-2026-11-01T19-01-40, master 34bf80d both sides, 3 runs each, 7 h): raw, 7 of 21
  scripts "moved". Causes, all fixed in the comparer: lines that come a different number of times per run (Chaos
  Mode's random chords, verify's arrays of varying length) were lined up by occurrence, so they're now counted as
  variable and not compared; times of day and Turkish dates are masked; failed runs are left out of the numbers. Two
  runs failed signing up (p5 branch #1, live6 base #2: auth timeout, nothing measured): choirregress.sh now keeps such
  a run as .failed and runs it once more. What's left is real noise and goes into aa-ranges.json: timing 17–20 ms,
  p5 onset 5–16 ms, yc VU ±4, live9 network save times, random Chaos scores. A 10 ms shift in timing still fails.
  Independent check (not circular): `ONLY="live5 live6 live7 live9 p5 p7 timing yc" RUNS=3 choirregress.sh master`,
  2026-11-02 07:33–10:25 IST (logs/regress-2026-11-02T02-03-53, compare.txt): 7 of 8 pass, all 48 runs exit 0; live9
  failed on one network value only (save #3 returned after 1450–1969 ms on base, 1728–2427 ms on branch, same build:
  Supabase round-trip, not the build). Both A/A runs are now in aa-ranges.json (widest range per value), so live9's
  save times have wide ranges: they measure the network.
- **The choir group is opt-in** (`ONLY=choir` or `WITH_CHOIR=1`; not in a default suites.sh/prod.sh run any more, which
  used to include cv-live7, cv-modalz, cv-p9 and cv-p10). **Required for phases 5, 6 and 10**, with choirregress.sh as
  the gate.
- Merged into master with --no-ff 2026-11-02 (7296998), pushed; test code only, no deploy.
- **Phase 5 survey DONE 2026-11-02, reported; waiting for the user's phase 5 spec.** Branch `redesign/phase5`:
  `design/house-lights/PHASE5_SURVEY.md` (every Choir World screen, the five-tab mapping, the 32 contrast rows, the
  Songs-tab tools by phase, copy problems, 14 broken or odd items), `scripts/design-verify/shots5.js` (the screenshots:
  `node scripts/design-verify/shots5.js --base <ref> --out <dir>`; signs up a Choir-plan and an expired account) and
  `scripts/design-verify/survey5/cwcopy.py` (the copy check). Screenshots: orphan `review/phase5-before` (102 shots,
  34 per size at 390 Light/Dark and 1280 Light, sheets/before.jpg, states.json, english-in-fr.json). The first full
  shots run failed signing up (auth timeout after several sign-ups in a few minutes); the retry 3 min later passed.

### Phase 5, Choir World (`redesign/phase5`, spec `PHASE5.md`): LIVE 2026-11-04, dpl_7wMjFuZHdg3XE479UaD9N41gWCBY (master 1d0fce8)
- Rollback target dpl_BvNJh8hz89bSLfWzbAqHS15G85zs. No merge or deploy until the user has reviewed the screenshots.
- Out of phase 5 (the user's answers): AI Duet, the six Songs-tab solo tools and the Performance Report's own screen go
  to phase 6. live9's save round-trip times leave the choir gate (still printed).
- Part 1 (2.1–2.3) pushed 2026-11-02 12:10 IST: review/phase5-part1 (9409169), redesign/phase5 3e05d9a. The user
  approved the structure and added 2.6 (seven fixes, verbatim in PHASE5.md), built after 2.5 and before the checks; the
  final screenshots include its screens.
- Built 2026-11-02: 2.4 and 2.5 in one commit (eaaee8f; their edits interleave), 2.6 (c2b029a), the runner
  checks5.sh (f4c6bad), guard fixes (ca77b84: choir5 Stop stamps __t1; contrast skips closed <details>; fr
  hm_off_pitch faux → pas juste).
- **Guards DONE** (logs/checks5-2026-11-02T07-41-37 and the re-run checks5-2026-11-02T09-26-25): house 882/1 (the one:
  a Supabase 503 in Register Coach, 4b, not Choir World), stopcheck pass, modecheck pass (Hear me off 0 / on 1
  getUserMedia), contrast only the master Profile icon rows, copyscan 0, hooks 21/0, navcheck 20/0.
- **Gate DONE.** Full run regress-2026-11-02T10-55-10: 19/21 pass. Re-run of fix and live7 (2026-11-03,
  regress-2026-11-03T03-51-*): live7 3/3 pass; fix's only moved values are the Harmony Memory result rows' colour:
  held/in tune teal → ink in the new .cw-result layout (2.4, by design: colour only for a miss; misses still coral).
  Expected change, in the report.
- **After set DONE 2026-11-03** (logs checks5-2026-11-03T04-13-00, re-runs -06-44-41 and -07-51-06): batch1 112/0
  (master 111/1: Karaoke's mid-run gauge sample, timing, on master too), batch3a 169/0 (= master), batch3b 179/0
  (= master), picker 93/0, warm-up entries 52/0, tracking 29/0, levelup 45/0, home 102/0, loopback pass. The first runs
  failed on the five trainers and Your Choir: the scripts clicked the Songs-hub entries 2.1 hid; cwreach.js enterHub
  (e13856c, 400c3da) takes the user's route there. Vocal load = master on 31 stored sessions (worst 0.06). hearme.js:
  one play-through (26.7 s, A4) Hear me off +0.00 (no session), on +66.39 load-s (26.75 active s, ~1% of 6800).
- **Final screenshots DONE** and pushed 2026-11-03: review/phase5 (1e17386, orphan: 128 shots + sheets/final.jpg +
  notes.txt); redesign/phase5 pushed. They showed one bug, fixed in afe655f: Passport's recent runs read
  "undefined The Drowner" (the boss emoji removed in 2.5); boss and passport re-shot.
- **Review: approved after the 5.1 fix round** (six fixes, the deploy steps and the phase 6 survey, verbatim in PHASE5.md
  ## 5.1). Built 804e15c, a9ea7de; copy 9a5a956 (2 changed, 15 new keys, four languages).
- **5.1 checks DONE 2026-11-03** (logs checks5-2026-11-03T10-50-30): hooks 21/0, copyscan 0, contrast unchanged (only the
  master Profile icon rows), house --onlychoir 256/0 (first run 255/1: a CORS/network failure on /me/progress, passed on
  rerun). Gate (ONLY="fix p7 yc timing live7"): p7, yc, timing, live7 pass; fix's only moves are the result rows' colour
  in ink (expected, as in phase 5). Fixshots: review/phase5-fix (orphan, 45 files, sheets/fix.jpg, notes.txt,
  measures.json). English dates are en-US ("Nov 3, 7:26 PM"), not the en-GB example; one-line change if wanted.
- **Deployed 2026-11-03/04.** "deploy" given; master 1d0fce8 (--no-ff merge) pushed; the user ran `vercel deploy --prod`
  and then `vercel promote dpl_7wMjFuZHdg3XE479UaD9N41gWCBY` (CLI 62.2.0 built it as production but left the alias on the
  old deployment: "productionUrl": null; check `vercel inspect deploy-alegra1122.vercel.app` after every deploy).
- **Production checks** (logs/prod-2026-11-03T17-03-49, base 7296998): modecheck, scores, stopcheck, navcheck, livevq
  and all 21 choir scripts pass. house hit prod.sh's 30 min cap (now ~33 min with Choir World; prod.sh's cap is now 45 min);
  rerun uncapped 883/0. scores4b and live each had 1–2 values just outside master's range; on rerun those passed and
  different ones moved (Resonance sharp 4.1 s ripple is bimodal 18/54/72 on master itself). Not repeated → no rollback.
- **review/phase5-prod** (7532270, orphan): the final set and the 5.1 fixes on production, sheets, checks. Deleted:
  review/phase5, -part1, -fix, -before. Old rollback target dpl_BvNJh8hz89bSLfWzbAqHS15G85zs; new one is dpl_7wMj….
- **Phase 6 survey DONE 2026-11-04, reported; waiting for the user's phase 6 spec.** Branch `redesign/phase6`
  (a3bc61f): design/house-lights/PHASE6_SURVEY.md, survey6/copy6.py, shots6before.js. review/phase6-before (24fa630,
  orphan): idle/live/result of the six tools at 390 Light/Dark and 1280 Light, sheets/before.jpg, states.json with the
  leave probe. Headline findings: stopAllActiveSessions doesn't stop Stay in Key, Emotional Singing or Performance
  Director (they finish and score off-screen) nor the backing pad; PD can only run once per page load; AI Duet leaves your
  part muted in Choir World; a steady tone scores Expression 51 / PD Dynamics 86. No app changes.
- **Phase 7 decision (recorded for later):** Today's focus and the Skill Profile ignore Choir World runs (survey item
  13). Whether Choir World should feed them is a product decision for phase 7.
- **Director Dashboard** is hidden in phase 5 (its invented people break rule 5). It needs a real multi-user backend
  (a director and their singers) before it can come back; later, not scheduled.

### Hotfix: the startup splash (LIVE 2026-11-05, dpl_BGXeU41kbimZ6MekBmVSNkf39BFC, master bf9cf5d)
- hotfix/splash from master 6266166: the cwMeasureHtml fix only (e9a7722) + bootcheck.js + prod.sh runs bootcheck first.
  bootcheck: master failed only the Your Choir case; the hotfix 8/8. Checks on the hotfix: hooks, bootcheck, yc, warm-up
  entries 52/0, house --onlychoir 256/0, batch1 112/0. Production: bootcheck 8/8 (first run 7/1: the Studio old-format
  case 6.7 s with the test's re-fetch; not repeated), yc, warm-up entries, house --onlychoir 256/0 on rerun (first run
  one CORS block on a vocal-load request), batch1 112/0. The deploy aliased itself; no promote needed (an extra alias
  deploy-nine-rouge-32.vercel.app appeared, same project). **New rollback target: dpl_BGXeU41kbimZ6MekBmVSNkf39BFC**
  (the old one, dpl_7wMj…, has the splash bug). bootcheck now runs in prod.sh and in every phase's checks.
- Found while writing bootcheck: user_progress has no studio_takes column, so on master Studio takes never reached
  the server (they lasted until a reload); phase 6's device storage fixes that.

### Phase 6 + 6.1 (`redesign/phase6`, spec `PHASE6.md`): LIVE 2026-11-07, dpl_6EgEe6idPGDet91hDsVkkwc2YGXx (master 170c145)
- **Deployed 2026-11-07.** "deploy" given with the rollback target the hotfix dpl_BGXeU41kbimZ6MekBmVSNkf39BFC (PHASE6.md
  "Deploy"). Master 170c145 (--no-ff) pushed, secret check clean. The user's first `vercel deploy --prod` answered "Not
  authorized"; the same command again deployed and aliased deploy-alegra1122 itself (no promote; checked with inspect).
- **Production checks** (logs/prod-2026-11-07T17-15-32, reruns in its rerun/; summary in review/phase6-prod notes.txt):
  29 of 36 suites pass first run (bootcheck 9/0 with the 6.1 forced-error case). house and contrast hit prod.sh's caps
  (phase 6 added ~170 house checks and the six tools to contrast): reruns uncapped house 1051/0 (46 min), contrast 42 min.
  scores, tools-shots, cv-live: the test sign-up timed out; all pass on rerun; signuptime.js (new): 20/20 sign-ups,
  site median 1.6 s vs master 1.8 s. scores4b (vibrato consistency 93/96, then brightness 222/217 instead) and live
  (steady Resonance ripple, master bimodal) moved on different values each run: not repeated → no rollback.
- **Found:** contrast Dark tuner-live-locked 3 items < 3:1 on the rerun (note, octave and cents over the lock fill
  mid-fade, captured just after the lock dropped: the text drops locked-pulse colours at once while #tunerLockFill
  fades out over --hl-d1). Tuner code unchanged from master; a timing case. Fix (not made, needs a go-ahead): keep the
  on-voice text colour until the fill has faded, or drop the fill without the fade.
- **review/phase6-prod** (9555f0f, orphan): shots6.js on production (84 shots, the 6.1 fixes in them, sheets/phase6.jpg,
  states.json: no page errors, house down on all 24 stages), checks/ with every log. **The rollback target for the
  next deploy is dpl_6EgEe6idPGDet91hDsVkkwc2YGXx** (phase 6, live and checked).
- Deleted by the user 2026-11-08 (local and GitHub): review/phase6 60173be, -before 24fa630, -fix fc9e3b5,
  review/phase5-prod 7532270, hotfix/splash 522a2d8 (in master).
- 6.1 (PHASE6.md "6.1"): 564d63f the duet's link in ink; 9152993 Karaoke's stage up to 760 px; 6eae11c the startup
  safety net (#bootError) + bootcheck's forced-error case. Checks (logs checks61-*): hooks, bootcheck 9/0, house --only6
  172/0 on rerun (two Supabase 503s first), contrast, copyscan, warm-up tracking. review/phase6-fix fc9e3b5.
- On "deploy": the rollback target is now **dpl_BGXeU41kbimZ6MekBmVSNkf39BFC** (the hotfix), not PHASE6.md's dpl_7wMj….
  prod.sh runs bootcheck first. Afterwards also delete review/phase6-fix and hotfix/splash with the branches PHASE6.md lists.
- Spec PHASE6.md (0f6f584). Guards 83f371f (tools6.js; scores/house/stopcheck/navcheck/contrast/copyscan cover the six;
  synthmic "lead" stimulus). Build, one commit per item: 2.1 6faad57, 2.2 d6cb9ee, 2.3 859daae, 2.4 c763390, 2.5 003104c,
  2.6 8d9407c, 2.7 849ee0a, 2.8 e7ce975, 2.9 9aeef83 (PHASE6_COPY.md, 60 keys). checks6.sh, shots6.js.
- **Found and fixed, live since phase 5 (0d2c888):** with a Your Choir take stored on the device, the page's first
  renderYourChoir() reached cwMeasureHtml (a const) before it was defined; the error stopped the script and the splash
  never hid. cwMeasureHtml is now a function declaration. Reproduced on master 1d0fce8. The user was asked whether to
  hotfix production or wait for the phase 6 deploy.
- **Checks all pass** (logs checks6-2026-11-04T*; summary in review/phase6 notes.txt): hooks; the scores gate; house
  (1 network error, rerun passed); stopcheck (the six failed 12/12 on master); modecheck; vocal load (41 loads, largest
  difference 0.06); warm-up entries 52/0 and tracking; vibfix and noisegate vs master, 0 regressions; vlcompare; yc;
  contrast (the six and the Songs tab clean; Profile's achievement icon in Dark 3.38:1, known); copyscan 0 in four
  languages; navcheck, picker, levelup (45/0 on rerun), home; extra 4a and 4b scores (4b on rerun: bimodal on master).
- **review/phase6** (60173be, orphan): 84 shots, sheets/phase6.jpg, states.json, notes.txt. No merge or deploy until
  the user has reviewed and types "deploy" (then the steps in PHASE6.md, including the promote check).

### Phase 7 (`redesign/phase7`, spec `PHASE7.md`): LIVE 2026-11-08, dpl_AuR6tZ7FryuBFf6meMmQDxaryGEk (master 0c39e09)
- Phase 6 production approved, no rollback. **Rollback target from now on: dpl_6EgEe6idPGDet91hDsVkkwc2YGXx.**
- Order: (1) prod.sh limits for house and contrast at 1.5× their measured times, 75 min at most (master);
  (2a) the tuner drift-off colour fix, first commit on redesign/phase7, proven by 10 contrast runs of the drift-off
  moment in Light and Dark (0 below 3:1), ships with phase 7; (2b) the read-only phase 7 survey + review/phase7-before.
  Push both, report, stop.
- **1 DONE** 2026-11-08 (4748c1f, master): house 46 → 69 min, contrast 42 → 63 min (measured on production 2026-11-08).
- **2a DONE** 6372713: the lock fill's opacity is a registered property (`--hl-lock-a`); the ring's text reads its
  colour from it (on-voice above 0.75, stage ink 0.75–0.15, own colour below), for the Tuner and Stay in Key; Breath's
  timer no longer turns on-voice. contrast.js --drift 10 (f8c86c3): 0 below 3:1 in 10 drift-off runs × Light/Dark
  (lowest 4.34); master fails 20/20. rings7.js: Stay in Key and Breath had the same fault on master (1:1), fixed.
  contrast.js now reads color(srgb …) (color-mix): before, such colours were skipped. hooks 21/0. Logs
  scripts/design-verify/logs/checks7-tuner/.
- **2b DONE** ecbf1e2: design/house-lights/PHASE7_SURVEY.md, shots7before.js, survey7/copy7.py. review/phase7-before
  d0d488b (orphan: 42 shots, sheets/before.jpg, states.json, notes.txt). Headlines: Expression never scored though two
  tools store it; the "achievement icon" is the 7-day streak printing "undefined"; invented people in Dashboard's "How
  you compare"; Records says song scores aren't saved; the day is the UTC date; Voice Health ignores Vocal Load; Choir
  World vs Skill Profile: five options described. Waiting for the user's phase 7 spec.
- **Phase 7 spec given 2026-11-08** (PHASE7.md "Phase 7 spec"): option 2 (Choir World run pitches in Pitch, 2.9, its
  own commit); Expression "Not in your profile yet"; "How you compare" hidden; Dashboard → Progress; HOUSE_LIGHTS v2.0.
  Guards first (youstates.js), build 2.1–2.10, midway review/phase7-part1 after 2.3, then review/phase7. No merge or
  deploy before the user's review. Rollback target dpl_6EgEe6idPGDet91hDsVkkwc2YGXx.
- 2.9 clarified by the user (PHASE7.md "2.9 clarified"): pool the last 20 solo pitch scores with the last 20 Choir World
  run pitches (solo scores have no time). Guards 3fc88f0: youstates.js (gate; baseline equal on 4 states), youSeed.js,
  voicecard.js (master 16/16), contrast --you, copyscan --you (baseline 145 §7 / 142 emoji). Logs logs/checks7/.
- Built: 2.1 + 2.2 5e32178 (one commit, interleaved), 2.3 bec95e6. **review/phase7-part1 42a3ee5** pushed (midway
  checkpoint, 40 shots, no contrast item, You lit). Found: the 14-day activity bars never showed (CSS, fixed); Today's
  Plan Go skipped enterPanel (fixed); **Reset local data erases the account's saved progress** (saveProgress), its
  confirm said "locally": copy made accurate, behaviour unchanged (decision for the user).
- Built 2.4 bb91540, 2.5 4ca829d, 2.6 d2f204d, 2.7 17901f6, 2.8 cafdca3, 2.9 7abbf8d (own commit), 2.10 43a0cdc
  (PHASE7_COPY.md, copyscan --you 0/0), HOUSE_LIGHTS v2.0 eacb477, checks7.sh. Interval Match's Day 1 step stays manual
  (its score is stored with Pitch Match's). **Next:** `bash scripts/design-verify/checks7.sh all` (was started
  2026-11-08), then shots7.js → review/phase7.
- **Phase 7 DONE 2026-11-08, reported; waiting for the user's review.** Checks (logs checks7-*): youstates en/fr equal
  except expected; contrast --you 0; full contrast: Profile row gone, Light Scale Run dots 4.42:1 on their color-mix tint
  (existing, newly measured); copyscan --you 0/0; hooks 21/0, navcheck, bootcheck 9/0, home 102/0 (script updated for
  2.5; first run a sign-up timeout), levelup, p9, voicecard 16/16, batch1, picker. **review/phase7 3c49ef9** (92 shots,
  sheet, notes). No merge or deploy before the user's review.
- **Review approved 2026-11-08 with four fixes** (PHASE7.md "Review fixes and deploy", verbatim): "Erase my progress"
  with a confirmation naming what's erased (c463005, behaviour unchanged), 18971f4, 2bae6b7, 4bc351f, the curriculum "→" with no break inside, You →
  Progress "Challenge 0%", flagless language buttons. fixshots7.js 4/4 languages; review/phase7-fix (deleted since).
- **Deployed 2026-11-08.** Merge 0c39e09 (--no-ff), secret check clean, pushed. The user's first `vercel deploy --prod`
  answered "Not authorized"; the same command again deployed dpl_AuR6tZ7FryuBFf6meMmQDxaryGEk and moved the alias
  itself (no promote). prod.sh now runs youstates (b13d79d).
- **Production checks** (logs/prod-2026-11-08T13-43-52; summary in review/phase7-prod notes.txt): all suites pass first
  run except pageload (a /api/me 404 at sign-up; rerun 10/10), cv-p8 (sign-up timeout; rerun PASS), youstates (a script
  bug: the sign-in saved on the local origin doesn't apply on the site; fixed 374bc33, rerun PASS) and scores4b: the
  Voice Quality vowel centroid failed both runs (961, 951 vs master 952–966). The Voice Quality code is byte-identical
  to phase 6 and an A/A run (4748c1f against itself) fails the same reading (973 vs 968): the ±2 gate is tighter than
  its noise. Judged noise → no rollback; reported to the user with the promote line. **Follow-up (not done):** gate the
  Voice Quality centroid by its A/A spread (or ±1%), as for the other values in master's-range list.
- **review/phase7-prod** (4d44b08, orphan): shots7.js on production (92 shots + 4 Voice Card images, 0 page errors,
  0 below 4.5:1), sheets/phase7.jpg, checks/ with every log and rerun/. Deleted (local and GitHub): review/phase7,
  -before, -fix, review/phase6-prod. review/phase7-part1 (42a3ee5) is still on GitHub (not in the delete list).
  **The rollback target for the next deploy is dpl_AuR6tZ7FryuBFf6meMmQDxaryGEk.**

- **Phases 8 and 9 survey DONE 2026-11-09, reported; waiting for the user's phase 8 spec.** Branch `redesign/phase8`:
  design/house-lights/PHASE8_SURVEY.md, survey8/copy8.py, shots8before.js. review/phase8-before (08b2875, orphan, 147
  shots, sheets before8/before9, states, french.json, probes). Headlines: the Rift's back link leaves it shown and
  running; the demo checkout says "subscribed" while nothing changes (production); signed-out plan buttons ask to sign
  in to "Teacher Dashboard"; Bridge and the Register Wraith never go house-down; emoji art across Vocal World; onboarding
  steps 1–6, checkout and posters English in every language. Phase 8 ≈ phase 6 in size, phase 9 ≈ phase 7; phase 9
  needs decisions first (demo checkout, Teacher Dashboard, Vocal Lab, legacy tabs). No app changes.
- Follow-up from the phase 7 deploy: scores.js's Voice Quality centroid gate (±2 Hz) is tighter than its A/A noise.
  **Decided in PHASE8.md:** no rollback was right; done in scores.js (below).

### Phase 8 (`redesign/phase8`, spec `PHASE8.md`, given 2026-11-09): LIVE 2026-11-09, dpl_2fusEnGruFnpBJmfa4FzV6mPEGbx
- **Decisions (PHASE8.md "DECISIONS"):**
  - scores4b: not rolling back phase 7 was right. From now on Voice Quality's centroid, and any value whose own noise
    is wider than ±2, is gated by master's A/A range or ±1% of master's median, whichever is wider (scores.js SPREAD;
    a value newly found noisier than ±2 is added to SPREAD). Replayed on the phase 7 production runs: run 1 passes
    (961 in 956.3–975.7), the rerun still misses by 1 Hz (951 vs 952–975.7), the A/A passes.
  - Phase 9: the Teacher Dashboard is hidden like the Director Dashboard (it can't reach students without a
    multi-user backend), and the Teacher plan card says "Coming later" instead of a button. Vocal Lab stays a Coach
    tool. `.legacy-tabs` is removed in phase 10, after a grep of scripts/.
- **Step 0 DONE** 41a74e5: every plan button opens "Paid plans aren't on sale yet…" (Close only, no plan change);
  signed out "Sign in to choose a plan". The demo checkout stays in the code, unreachable. checkout.js 42/42 (master
  fails it).
- **Guards** 604f326: games8.js (the five games through their globals; Math.random seeded before Start; Glider, Boss
  and Harmony told a steered pitch per frame), gamestates.js (the gate), treecheck.js, stopcheck --only8 (+ the Rift's
  back link), copyscan --world. Master baselines: gamestates A/A all equal; stopcheck --only8 0/14 on master (Start
  left reading its running label, Harmony's notes sounding, the Rift running under the hub); copyscan --world 101 §7,
  162 emoji, 90 English-in-other-languages texts.
- **Built** (one commit each): 2.1 marks (14 + 5 tree icons, marks8.js), 2.2 hub, 2.3 Pitch Mountain (+ the shared game
  page/stage/result, gameColors, gameStartIdle/Live), 2.4 Register Canyon (houseSession), 2.5 Boss Arena (Wraith via
  houseSession), 2.6 Harmony Castle, 2.7 The Rift (back link stops all; captureAccuracyForTarget opts.active), 2.8 Skill
  Tree, 2.9 copy (PHASE8_COPY.md, 178 keys). Midway checkpoint review/phase8-part1 8587076.
- Found: on master no game dimmed the house (singingSession without a stage), not only Bridge and the Wraith. The
  Skill Tree's Vocal Master needs Expression ≥ 60, which phase 7 made "Not in your profile yet": unreachable until the
  scoring batch scores Expression. Glider "For you" maps the weakest of pitch/agility/range to Melody Road / Agility
  Run / Interval Jump (no course recommendation existed). The tree's Control node uses hl-breath (spec's icon list).
- **Fix after the checks** 93fa691: the Glider's course lines, the bosses' lines and the games' song line were set once at
  load, so fr/es/tr showed English after a language change (copyscan --world 48); renderWorldCopy() refills them on
  every language change, the song's name and key translated. Rest of the checks below.
- **Checks (§3)**, checks8.sh, logs checks8-2026-11-09T06-10-24 (all) + T10-47-53 and T12-36-39 (reruns): all pass.
  gamestates PASS (Register Canyon 307 vs 249 in the first run: not noise, see 8.1; rerun alone 3 a side gave
  174/172/84 on both); checkout 42/42; stopcheck pass; treecheck PASS; glider flight/courses, regfix, batch1
  112/0, batch3a 169/0, batch3b 179/0, warm-up entries/tracking, loopback, house 1051/0, contrast, copyscan --world
  0/0/0, hooks 21/0, navcheck, bootcheck 9/0, picker. Passed on rerun only: batch1, house, batch3a, copyscan, bootcheck
  (each failed once on the production backend: "Failed to fetch", a sign-up timeout, a 6.7 s signed-in boot).
  Test scripts changed for expected UI changes or harness gaps: batch3b (boss training is inside the result card),
  batch1 (a non-best Glider run is titled "Score"), regfix (it served only the page, not vocal-load.js beside it:
  broken since Vocal Load phase 2, not by phase 8).
- **Screenshots** review/phase8 (shots8.js at 93fa691): 100 shots, house down on every stage and up elsewhere, 0
  contrast items under 4.5:1, no page errors. Waiting for review: no merge, no deploy.
- **Review (2026-11-09): passes.** The three questions, all yes as built: Pitch Mountain's "For you" picks a course from
  the weakest of pitch, agility and range; the Skill Tree's Control node uses the breath icon; "All locked" can't
  happen, so the signed-out hub stands in for it.
- **8.1** (PHASE8.md "8.1"): 338a15d app, d7552f1 checks.
  - Marks redrawn: Range Phoenix (a bird rising, front on), Volume Phantom (a ghost, the right side in bold dashes),
    Register Canyon (angular cliff walls, lanes clear of them), Harmony Castle (wider than tall, two towers, a lower
    wall). marks8.js --old <ref> draws old next to new.
  - .link-btn in ink (font-size inherit, underline offset 2px); the why-btn and duet-after overrides removed.
  - Boss result rows "Your health" / "Boss health"; the win line without the health number (one key, four languages).
  - gamestates at 390: every game's big result number in view when it ends (259–366 px of 844): no scroll fix.
  - Register Canyon's 307 vs 249 was the test, not the game: the lane followed the real register reading of the
    looping A4 (158 frames chest, 27 head), and the branch's run started two frames later in that loop, so different
    obstacles were hit. games8's bridge now scripts that cycle per frame from the run's first frame: master and branch
    match (307/307, 172/172). contrast.js --panels a,b (arcade also opens each Vocal World page).
  - Checks (logs checks81-2026-11-09T15-48-33): gamestates PASS (all equal to master, Register Canyon 307 → 307; at
    390 all six numbers in view), hooks 21/0, copyscan --world 0/0/0, contrast --panels arcade,choir,partrehearsal,
    choirpassport,aiduet 0 of 434 per theme, bootcheck 9/0. Screenshots: review/phase8, folder 8.1/. Waiting for
    review: no merge, no deploy.
- **8.2** (PHASE8.md "8.2"): 547dbf7, the Range Phoenix replaced exactly with the user's drawing; marks sheet looked at
  (a bird at 24 px, Light and Dark), hooks 21/0, bootcheck 9/0.
- **Deployed 2026-11-09** by the user from deploy/ (first `vercel deploy --prod` "Not authorized", the retry deployed):
  dpl_2fusEnGruFnpBJmfa4FzV6mPEGbx, deploy-di7cgbnem-alegra1122.vercel.app. The main address was checked before the
  checks: byte-identical page (same etag), same vocal-load scripts, the 8.2 Phoenix in it; no promote needed.
- **Production checks** against deploy-alegra1122 (review/phase8-prod, notes.txt): prod.sh WITH_CHOIR=1 SCORES_BASE=
  master (log prod-2026-11-09T17-16-30; SCORES_BASE set explicitly because master isn't merged and the default would
  pick phase 6), gamestates --branch-url, checkout DV_URL. 45 of 52 passed first; the rest passed on rerun, none
  repeated: scores, cv-p5, cv-p10 and gamestates sign-up timeouts (Supabase auth; a probe signed up 3/3 in 2–4 s;
  gamestates' own was on the local master page), gamestates and checkout ERR_INTERNET_DISCONNECTED, live Resonance
  ripple once, scores4b a different reading each run (brightness, then Register Drills chest %) then a clean third
  run; neither tool's code differs from master. No rollback. 0 test accounts left.
- Deleted after the checks (8.2 §3): review/phase8, review/phase8-part1, review/phase8-before, review/phase7-prod,
  review/phase7-part1. "deploy" given 2026-11-10: master 27eab03 (--no-ff of redesign/phase8), identical to production.

### Phase 9 (`redesign/phase9` from master 27eab03, spec `PHASE9.md`, given 2026-11-10)
- Rollback target: phase 8, **dpl_2fusEnGruFnpBJmfa4FzV6mPEGbx**. No merge or deploy before the user reviews the shots.
- **Decisions (PHASE9.md "DECISIONS"):**
  - Day 21 while plans aren't on sale: accounts past their 21 days keep losing the paid features, as today; the
    paywall says so plainly and shows no price (one switch, `PLANS_ON_SALE = false`).
  - The Teacher Dashboard is hidden like the Director Dashboard; the Teacher plan card says "Coming later" with no
    button. Vocal Lab stays a Coach tool. `.legacy-tabs` goes in phase 10.
  - Expression is no longer offered as an onboarding priority; accounts that chose it keep it, nothing is migrated.
  - Share posters are always paper (light) in both themes, so a shared image looks the same whoever made it.
- **Built and checked, 2026-11-10; waiting on the user's review of the shots.** redesign/phase9 at fae5ef9 (pushed):
  step 0, the guards (a46ce64), 2.1–2.11 one commit each, then review fixes (9a3e94e, 19bf82d, fae5ef9). §3: all 20
  checks pass (logs on review/phase9 `checks/`); states9's 9 differences are all expected (Teacher button and
  dashboard, Expression, Vocal Lab's back row). review/phase9 (orphan, pushed): before | after contact sheets per
  combo, every shot, the exported poster PNGs, states.json, notes.txt. Run the checks with
  `bash scripts/design-verify/checks9.sh all` (AC power, one at a time, ~3 h).
- **Found on master (= production), to tell the user, not changed in phase 9:** an empty Feedback submit inserts a
  blank row (hasAnyContent counts submittedAt); voice types read in English on Range Finder and Profile (translated
  only on the poster); Pricing's Choir plan still lists "Director dashboard", which is hidden. **Fixed by phase 9:**
  the poster export failed on every poster (html2canvas can't draw color-mix).
- **Kept as on master:** a breakthrough can fire mid-exercise. Sonic X-Ray's paywall title reads "Song Lab" (its Choir World section).
- **9.1, the review's fix round (PHASE9.md "9.1"), built and checked 2026-11-10; waiting on the user's review.**
  Feedback's empty Send saves nothing and says so under the button (a rating or one answer sends); voice types in
  the page's language (Range Finder, poster; Profile's range line is hidden since phase 7); Plans without "Director
  dashboard" and the paragraph under the heading; moment sheets 6 s / 4 s, a pointer or key inside stops the timer,
  then Continue, Escape or the scrim close (momentTimers.js); Vocal Lab plain bars with Cs under each and "Find your
  range"; poster PNG opaque at 3x (1020×1800). Checks: feedback posters levelup moments9 states9 checkout tools
  youstates copyscan-all contrast hooks bootcheck all pass (states9: 13 expected differences). Shots, sheets (before =
  phase 9 as reviewed) and logs on review/phase9 `9.1/`. Shots: `node scripts/design-verify/shots9.js --set 91 …`.
- Six feedback rows the first states9/feedback runs inserted into public.feedback were deleted by id; both scripts
  now stub the insert (feedback.js inserts one real row, reads it back and deletes it).

- **Live 2026-11-10: dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H** (deploy-n0n6rz9s9-alegra1122.vercel.app), deployed by the user
  after "deploy" from master 4c2aa7f (first `vercel deploy --prod` "Not authorized", the retry deployed); the main
  address served it byte-identically, no promote. Production checks (review/phase9-prod, notes.txt): prod9.sh
  (checkout, onboard, feedback, posters, moments9; master side 27eab03 served locally, branch side the site: common.js
  buildDir takes a URL and openPage copies the local session to the site's origin) and prod.sh WITH_CHOIR=1
  SCORES_BASE=27eab03. First run 46 of 52; checkout, warmup-entries, stopcheck, cv-live sign-in timeouts and scores4b
  Voice Quality centroid spread all passed on rerun (scores4b on its third run), none repeated; probe-signup.js: 3/3
  page sign-ups in 2.5–4.7 s. No rollback. 0 test accounts and 0 test Feedback rows left. review/phase9 and
  review/phase8-prod deleted. **Rollback target for phase 10: dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H.**

## Scoring accuracy batch (after the redesign; decided in PHASE6.md, not to be done in a redesign phase)

These change scores, so they wait until the redesign is finished (survey items in PHASE6_SURVEY.md "Broken or odd"):
1. **Timing counts a voice that's already sounding.** Karaoke and Performance Director give a note 100 if anything voiced
   arrives in its first 40 %, so a tone held through the whole song is "on time" on every note (steady tone: Timing 100
   with Pitch 0).
2. **Dynamics and Expression on a steady tone.** Emotional Singing's Expression (loudness spread × 250) gives a steady tone
   51; PD's Dynamics ((max − min) / max × 150) gives it 86. Both read the onset, the room and the backing as dynamics.
3. **Karaoke and PD divide note pitch by the wrong count:** `vibratoTolerantCents(buf)` is summed over its own output but
   divided by the buffer's length (Karaoke 14782, PD 23795 on master 6266166). Equal only while the helper returns one
   value per reading.
4. **The two Timing averages:** Karaoke averages Timing over every note (a note not heard is 0), PD over the notes heard,
   with the same formula and the same label.
5. **Rhythm / Entrance & Cutoff latency** (from 4b 2.4, see "Later accuracy item" above): output and input latency land
   in every onset offset as "late".

6. **Expression joins the Skill Profile after its fix** (PHASE7.md decision): Emotional Singing and Harmony Arena
   already store `expressionScores`; once the batch fixes Expression's measurement (a steady tone scores 51), add it
   to `computeSkillProfile` from those stored scores. Until then it reads "Not in your profile yet".

## Later: the day is the UTC date (PHASE7_SURVEY.md item 5; decided in PHASE7.md, not in phase 7)

`todayStr()` is `toISOString().slice(0,10)`: streaks, `history`, `dailyMetrics`, the Journey day and the vocal-load
budget roll over at UTC midnight, and the 14-day labels print the day before west of UTC. Not fixed in phase 7 because
the vocal-load budget and the server share that day; needs a plan that moves both together.

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
