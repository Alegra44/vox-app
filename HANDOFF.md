# VoxCoach handoff (Windows → Mac, 2026-10-02)

State of the project when it moved machines. The detailed history of every feature is in `CHOIR_WORLD_ROADMAP.md`,
and the commit messages carry deploy IDs and check results. This file covers what's in flight, what's waiting
on a decision, and how to set the machine up again. It contains no secrets.

## Branches on GitHub

| Branch | What it is | Status |
|---|---|---|
| `master` | Everything that is live, through `dccc80b` (vibrato fix, dpl_FbeuU2H) | Matches production |
| `wip/noise-gate` | Fix A, the singing-detection gate, plus its test scripts and logs | WIP. Not deployed, not merged |
| `warmup` | Pre-session warm-up, phases 1–2 (based on `d7a5691`, two commits behind master) | WIP. Never run, not deployed, not merged |

Production: https://deploy-alegra1122.vercel.app (Vercel project `deploy`, scope `alegra1122`).
`deploy/index.html` is the canonical client. `voxcoach-prototype.html` mirrors it (see BACKEND.md).

## Working rules

- **Regression checks compare current master against the new branch on this Mac, in the same run.** The Windows
  numbers (vibfix 104/108, noisegate 146/160, prod 68/71) are reference only. See the roadmap's testing notes.
- Build one item at a time, verify it on production, report back, and wait for a go-ahead before starting the next.
  "Scope" means report only, with no app changes.
- Production deploys need the user's explicit approval. Run from `deploy/`:
  `npx vercel@latest deploy --prod --yes --scope alegra1122` (without `--scope` the CLI answers "Not authorized").
  The user often runs this themselves.
- Verification means real measurements (AudioParam values, per-frame pitch through the app's own code), never claims.
- Every verify script that creates accounts wraps each address in `track()` from `scripts/choir-verify/testAccounts.js`.
  The script then deletes those accounts on exit. Report the `[cleanup]` line.
- Never run two verify scripts at once (the Supabase CLI temp login collides). Save full logs, not just the tail.
- The fake mic drops out under memory pressure. Check free RAM before long prod runs.
- About 35 headless sessions in about 10 minutes triggers Vercel's automatic IP challenge (403). Pace prod runs
  (`REG_PACE_MS`, `VF_PACE_MS`).

## In flight

### 1. Noise gate, fix A (`wip/noise-gate`)

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
3. Deploy (approved), then on prod run `NG_URL=<prod> node scripts/vq-verify/noisegate.js` and
   `VF_URL=<prod> node scripts/vq-verify/vibfix.js`, one at a time, with full logs and accounts cleaned up.
4. Report A and B together.
5. Then the user picks the next item: **item 3** (per-feature single-stream mic migration) or **item 4** (Glider
   octave crash). Don't scope either until told.

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

3. **Temp folder.** Node scripts use `os.tmpdir()/vq-verify` (`$TMPDIR` on macOS). `gatestim.py` uses
   `$TEMP` or `/tmp`. Put `export TEMP="$TMPDIR"` in `~/.zshrc` so both use the same folder.

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

7. **Test recordings (VocalSet and the noise stimuli).** About 620 MB, all regenerable. Nothing is committed.
   - VocalSet clips go in `$TMPDIR/vq-verify/vocalset`. They come from the Hugging Face mirror
     `Bill13579/vocalset-mirror` (CC BY 4.0). The clip naming and labels are in the headers of `realvib.js` and
     `gatestim.py`.
   - vibfix stimuli (`vq-verify/vibfix/stim-*.wav`) are rebuilt by `vibfix.js` itself through `realstim.py`.
   - Noise-gate stimuli (`vq-verify/gate/`) come from `python scripts/vq-verify/gatestim.py`, after vibfix has made
     its stims. Its header lists the LibriVox and archive.org sources to download into `gate/src`.
   - Copying the Windows `%TEMP%\vq-verify` folder over by USB or cloud saves the downloads.

8. **Claude Code memory.** Claude's notes were stored on the Windows machine and won't come along. This file
   replaces them. On the Mac, ask Claude to read `HANDOFF.md` and `CHOIR_WORLD_ROADMAP.md` first.
