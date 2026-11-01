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
