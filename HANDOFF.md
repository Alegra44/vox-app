# VoxCoach handoff (Windows → Mac, 2026-10-02)

State of the project when it moved machines. The detailed history of every feature is in `CHOIR_WORLD_ROADMAP.md`,
and the commit messages carry deploy IDs and check results. This file covers what's in flight, what's waiting
on a decision, and how to set the machine up again. It contains no secrets.

## Branches on GitHub

| Branch | What it is | Status |
|---|---|---|
| `master` | Everything that is live, through the noise gate (dpl_AzAW5Fn, 2026-10-02) | Matches production |
| `wip/noise-gate` | Fix A, the singing-detection gate | Merged (fce3993) and live. Closed |
| `warmup` | Pre-session warm-up, phases 1–2 (based on `d7a5691`, two commits behind master) | WIP. Never run, not deployed, not merged |

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
3. House Lights redesign phase 1 (`design/house-lights/HOUSE_LIGHTS.md`).
4. **Item 3**, the per-feature single-stream mic migration: before redesign phase 4 (Coach tools). Its priority went up
   on 2026-10-02: signed in, RTF hears soft singing on fewer frames than signed out (see the roadmap's noise-gate entry).
   Next to it, scoped (2026-10-06), not to be fixed yet: **"Speaker bleed scores as singing"** (roadmap, "Known
   issues (app-wide)"): with nobody singing, the app's own playback is credited (Entrance Trainer 8/8 entrances,
   Harmony Arena 0–8/8 notes, Harmony Memory 3/8 held); echo cancellation on real devices untested.
5. Redesign phase 4 onwards. **Item 4** (Glider octave crash) comes after item 3.

Idea for redesign phase 1 (don't change it before then): `onSignedIn` loads `/me` and then `/me/progress` one after
the other, so a returning user waits for both (2.7–3.9 s on production, `pageload.js`). Check whether `/me/progress`
depends on the `/me` response; if not, load them in parallel.

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
