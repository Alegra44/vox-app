# Survey J: a tab left open overwriting another device's progress (silent)

Branch `survey/stale`, from master 6913a1e (release F live, dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h). No app changes on this
branch; trial fixes on a local scratch branch only. Background: RELEASE_H.md (H2, on save/h2) "Still not fixed:
saveProgress sends the page's whole row, so two devices saving close together still overwrite each other's other fields."

## The user's step (verbatim, 2026-11-24)

THEN SURVEY J, silent: a tab left open overwriting another device's progress. Branch survey/stale from master. Save this step as design/reliability/SURVEY_J.md and commit it first. No app changes.
- saveProgress sends the whole row. Reproduce it through the slow proxy on the local stack: a laptop tab loaded in the morning and left open; the phone then earns XP, scores and a session; then one save from the laptop tab. What does the server keep, field by field?
- Size it: which fields are counters or lists (XP, sessions, warm-ups, history, score lists) and which are plain values.
- Propose the fix with its effort, tried on a scratch branch: for example, counters sent as increments and merged on the server, score lists appended, plain values last-writer-wins; or a version number on the row, with a conflict answer that makes the page reload and merge. Say what each needs (a migration, the api function, the app) and what it does to release A's retry and to H2.
- Push survey/stale. REPORT, then stop.
