# Release J: a version on the progress row (Survey J, option 2)

## The step, verbatim

H2: good. Merge the batch3c test fix (2d626e6) into master now: it's test-only, so no deploy.

Survey J: approved, the version on the row. Build it as release J on a new branch save/j from master (the scratch patch is your starting point). Save this message as design/reliability/RELEASE_J.md and commit it first. AC power, the run lock and time limits on; every local check through the slow proxy. Rollback target: dpl_A5EJRUAnPUdykqW7nckBa8957xx3.

J1. Migration 0012 (version, the last 8 save ids, the trigger) and the api: a PATCH carrying a version that doesn't match gets a 409 with the current row. A PATCH without a version (an older app, a page already open, a rollback) is accepted as today, so rolling the app back stays safe.
J2. The app: one progress save in flight at a time (later saves wait and go as one). On a 409, a three-way merge from the version this page loaded (the base), what this page has now, and the server's row, using the survey's class for each of the 44 columns: counters as server + (mine − base); lists combined without duplicates; bests the best; a day and its streak, the later day with its streak; flags on if either is; per-day records merged by day; the 5 plain values, mine. Then save again with the server's version. Write the table (column → class → rule) in RELEASE_J.md.
J3. No giving up: after 5 conflicts in a row, fall back to release A's retry with back-off; never drop the save.
J4. H2's save numbering and warm-up merge: replace them where J covers them, and say exactly what's removed and why in RELEASE_J.md.
J5. Level-ups: a merge must not announce the same level twice; announce only if the merged XP crosses a level this page hasn't announced.

CHECKS (local stack, through the proxy, 5 runs each on master and the branch)
- Survey J's five repro cases: nothing lost (master loses).
- The retry case: +7 once; +107 with the other device's 100 in between.
- Erase on the phone, then a stale laptop save: the server keeps the erase plus only the laptop's gains since it loaded.
- An old-app save (no version) still works.
- Two tabs on the same device saving in turn; a level crossed during a merge announced once.
- outoforder.js rewritten for J (the old out-of-order case can't happen now; test what replaces it).
- progresssave, erasecheck, streak, roundtrip, levelup, outbox, warmup-tracking, youstates, house, hooks, bootcheck.
Secret check, push save/j. REPORT, then stop: J changes how every save works, so it waits for my review of the code and your typed "deploy" (order: 0012, then the api, then the app).
