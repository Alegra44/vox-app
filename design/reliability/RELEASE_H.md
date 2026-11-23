# Release H: saves whose answers arrive out of order

Branch `save/h`, from master fb430a0 (release F live, dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h). Silent: no visible change.
Background: HANDOFF's note from release F ("saveProgress merges each PATCH's answer into progress, so overlapping
saves answered out of order leave the older values in memory until the next save").

## The user's step (verbatim)

NEXT, silent: release H, saves whose answers arrive out of order (HANDOFF's note from F). New branch save/h from master. Save this step as design/reliability/RELEASE_H.md and commit it first. AC power, the run lock and time limits on. Start caffeinate and stop it at the end.
- Reproduce it first: two progress saves whose responses arrive out of order leave the older values in memory. Write down the exact case (which calls, which fields), and a check that fails on master.
- Fix: every save carries a sequence number, and a response is applied only if it answers the newest save sent (or is merged field by field from the newest). Release A's outbox and saveProgress's retry keep working. Do the same for every other save path that writes the server's answer back into memory (vocal load, the warm-up day, any others), and list them in RELEASE_H.md.
- Pass: the new check passes on the branch and fails on master; progresssave, the vocal-load suite with the outbox, roundtrip, streak, warmup-tracking (with your in-flight fix), levelup, youstates, house, bootcheck. Everything that needs a database runs on the local stack, never production. Stop the local stack at the end.
- Secret check, push save/h. REPORT, then stop. Nothing merges until I've reviewed.
