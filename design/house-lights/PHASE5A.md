# Phase 5a: repair the Choir World test scripts (the user, 2026-10-29, verbatim)

Queue this for after the 4b production checks and deploy step 5. Don't start it before then, and never run it alongside another verify script. If the checks end in a rollback, stop and report instead.

Phase 5a: repair the Choir World test scripts (test code only, no app changes). Work on a new branch, tests/choir-verify, from master. Save this message as design/house-lights/PHASE5A.md and commit it first.

1. Inventory every script in scripts/choir-verify/: what it checks, and how it fails today on the live build (signed out and blocked, hangs, or passes). Include live.js and p8.js, which haven't been run since the redesign began.
2. Fix them:
   - Every script signs in with its own test account the way yc.js does, wrapped in track() from testAccounts.js, and deletes it at the end, even when the script fails.
   - Every wait has a time limit, and each script has an overall limit (10 min unless it needs longer; say why). A timeout fails with the name of the step that stalled, closes the browser and still cleans up.
   - Don't change what a script checks. If a check is wrong for today's app, report it rather than rewriting it.
3. Run each script 3 times against the live build. Each must pass at least 2 of its 3 runs; a failure that isn't a network error or a Supabase 503 is reported, with whether it's the script or the app. Don't fix the app.
4. Add the working scripts to suites.sh and prod.sh as a "choir" group, with their usual run times for the per-suite limits.
5. Secret check, push tests/choir-verify, report with a table: script, what it checks, before, after, run time. Then stop. Phase 5 itself (the Choir World redesign) comes after I've read it.

Started 2026-11-01, after phase 4b went live (dpl_BvNJh8hz89bSLfWzbAqHS15G85zs, production checks passed).

## 5a.1 (the user, 2026-11-01, after the 5a review, verbatim)

5a review: approved. Save this in PHASE5A.md as "5a.1" and commit it first. AC power, one script at a time.

1. timing.js: yes. The stand-in singer enters where a real voice does, through the fake mic stream, so every path the app reads (analyser and micG.rawAn) hears it. What the script checks doesn't change. If entrance/cutoff then come out ~30 ms late, that's the known output/input latency item already in HANDOFF (Rhythm and the Entrance and Cutoff Trainers), not a regression: report the numbers.
   Also fix p7's "(signed out, so nothing is sent)" line.
2. Choir regress mode, the phase 5 gate (test code only):
   - Each choir script writes its measurements to a JSON file, without changing what it measures.
   - choirregress.sh runs master's build and a branch's build in the same run, 3 runs per side.
   - It compares medians: ±2, or master's own A/A range for values that move more than that.
   - Prove it with master against itself.
3. Choir group: opt-in (ONLY=choir or WITH_CHOIR=1), not in the default prod.sh. Note in HANDOFF that it's required for phases 5, 6 and 10.
4. Secret check, merge tests/choir-verify into master with --no-ff, push. Test code only, so no deploy.

5. Then a read-only survey for phase 5, Choir World. No app changes. On a new branch redesign/phase5, write design/house-lights/PHASE5_SURVEY.md covering the Songs tab and every Choir World screen and section: the song list and song page, rehearsal (lanes, guide level, transport, mixer), Song Lab (Song DNA, Sonic X-Ray, Microscope), the trainers (Harmony Memory, Breath Map, Entrance and Cutoff, Bosses, Chaos Mode, Tempo/Key Ladder, the others), Your Choir, Passport, Performance Report / Why Did I Fail?, and anything else under Choir World. For each:
   - what it shows and does, and its element IDs;
   - whether you sing into it (it needs a stage) or read it (paper); whether it calls singingSession / houseSession today;
   - which choir scripts and other verify scripts cover it;
   - copy problems in four languages: §7 words, emoji, hard-coded English;
   - anything broken you notice (note it, don't fix it).
   Then:
   - Map the existing sections onto the five sub-navigation tabs in HOUSE_LIGHTS.md §6 (Rehearse · Song Lab · Trainers · Your Choir · Passport), and list anything that doesn't fit.
   - List the 32 known light-theme contrast rows (choir and part-rehearsal labels) with their elements.
   - Say which Songs-tab tools aren't Choir World (Karaoke, Stay in Key and the others), and which later phase each belongs to.
   Screenshots of every screen and state as it is now (idle, singing, result), signed in with a Choir-plan test account, at 390 Light and Dark and 1280 Light, on review/phase5-before with one contact sheet.
   Push redesign/phase5 and review/phase5-before, report, and stop. I'll write the phase 5 spec from the survey.
