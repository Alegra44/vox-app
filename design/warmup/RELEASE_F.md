# Release F: the warm-up

The step, as the user gave it (2026-11-22, step 4 of the message in design/accuracy/RELEASE_E.md, "Review and deploy"):

> 4. THEN BUILD RELEASE F, the warm-up, on a new branch warmup/f from master, from survey/warmup's WARMUP.md. Save this step as design/warmup/RELEASE_F.md and commit it first. One commit per item; four languages for every new line; no §7 words.
> F1. The banner fix (proposal d): vlPlaceBreak puts the banner in the open warm-up card while the overlay is shown, and back in the panel when it closes. bannerbehind.js becomes its check (the banner inside the overlay and visible).
> F2. The level-up why-line names every XP source (survey item 4): a "scores improved" counter and a "first bests" counter in levelupCounters, and Bridge Crossing's record logged before the save. whyline.js becomes its check: every XP source in its table produces a non-empty why-line that names it, and the Smart Warmup double-count is gone (F3 removes its click).
> F3. One warm-up instead of two (proposal c): Coach → Warm-up is the same warm-up as the pre-session one (the four exercises and the song warm-up, same tracking), with Smart Warmup's context line kept (time of day, days since you last sang). Drop the weakest-category hint, since it changes no exercise. Smart Warmup's Play buttons and "Mark warmup done" go; retire their keys in all four languages. One XP rule: finishing the first exercise of the day counts the warm-up: +5 XP and warmups_completed + 1, once per account and local day (the server's day, from F5), whichever entry was used. It is not a session (no recordActivity). Existing warmups_completed values stay as they are.
> F4. The summary (proposal a), as mock-1, with two changes: the "how closely you followed the line" bars in ink, not the voice colour (they're a result, not the live voice; Rule 1), and "Start my session" keeps the start-singing button style. Only measured things: range reached against the stored range, the share of voiced time within a semitone of the guide per exercise and where it was lost, Humming's spread in cents, one coach line from the weakest, and one next step by the proposal's rules. Shown only after at least one exercise is finished. Check with the file mic: following the guide exactly reads 95% or more; 2 semitones off reads 10% or less; the next-step rules each triggered once.
> F5. The warm-up streak (proposal b): migration 0011 (user_progress.last_warmup_day and warmup_streak, on the local day from release C), the api's column list, and the allowlist check. The day's "done" mark comes from the server (localStorage stays as a cache), which fixes "this device only". Shown in the warm-up's header ("4 days warmed up in a row · one exercise keeps it") and on Home's stats line as words, "4 days warmed up", not an icon alone. Separate from XP and from the practice streak, and it never breaks the practice streak. Check with two browser contexts as two devices: warm up on one, and the other sees it done the same day; the streak carries across local midnight and breaks after a missed day.
> Every database step runs on the local stack (Colima and supabase start, as for release C), never production. Migration 0011 isn't applied to production until F's deploy.
> CHECKS: warmup-entries, warmup-tracking, bannerbehind, whyline, keeps (with the new expectations), the summary and streak checks, allowlist, levelup, home, youstates, house, contrast, copyscan --all, names, focus, targets, hooks, bootcheck. Stop the local stack afterwards.
> SCREENSHOTS on review/warmupF: the summary, Coach → Warm-up, the warm-up header with the streak, Home's stats line, the banner inside the warm-up, and two level-up why-lines (a skill score, a first best). At 390 Light and Dark, and 1280 Light.
> Secret check, push warmup/f and review/warmupF. REPORT, then stop. Nothing from F merges, and 0011 isn't applied, until I've reviewed.

## What was built (warmup/f)

- **F1 the banner** (vlPlaceBreak): while the warm-up is open the break banner goes in its card, under the intro; wuOpen and
  wuFinish call it again, so it follows the warm-up in and back out to the panel.
- **F2 the why-line**: two counters in levelupCounters. "Scores above your average" is a running total kept in the snapshot
  itself (`scores_improved_total`: the score lists keep only 20, so they can't be counted; no column needed). "First bests"
  counts each best field set and each skill category with a score. A snapshot from before F gets both as they are now, once,
  at load (`levelupSnapshotUpgrade`), so nobody's next level-up lists every first best they ever had. Bridge Crossing's
  record is logged before its save.
- **F3 one warm-up**: the warm-up's body (tabs, exercises, stage, roll, status) moves between the overlay and Coach →
  Warm-up, so both are the same code and tracking. The context line is new copy: Smart Warmup's said the warm-up ran
  "gentler and a bit longer", which only its Play buttons did, so it would no longer be true; it keeps the time of day and
  the days since you last sang. The XP rule is `wuCount`: the day's first finished exercise (or song), +5 and
  warmups_completed + 1, once per account and local day; it asks the server first. 20 keys retired in four languages.
- **F4 the summary**: measured per frame in the exercise loop (the guide and the voice). Range reached = the 2nd–98th
  percentile of the voiced frames (a stray octave slip doesn't set it). "Where it was lost": the guide's semitone above
  which the share stays under half; the last semitone below it is named. Humming: the SD in cents. The next-step rules as
  proposed; in Coach → Warm-up rule 5 shows nothing (no session waits there), and Finish / Back show and leave the summary.
  "Open <tool>" from the pre-session summary: the session that asked doesn't start (the gate resolves false; initAudio
  and openRegisterInput return false), as several starts don't check startGen.
- **F5 the streak**: 0011 adds `last_warmup_day` (date) and `warmup_streak` (integer ≥ 0, default 0), both on the api's
  allow-list. The gate asks the server (1.5 s at most; ~0.1 s measured locally) before opening, so another device's
  warm-up today counts without a reload. The header line from 2 days; Home's words from 1 day.

## Checks (local stack started from warmup/f; scripts/warmup-verify/checksF.sh)

All pass. Logs: scripts/warmup-verify/logs/checksF-2026-11-22T* (on review/warmupF).

| check | result |
|---|---|
| migration11 | 12/12: 0010 → old row → 0011; columns, RLS, a negative streak refused, allow-list |
| bannerbehind (F1) | 18/18 at 1280, 390, 390 Dark: in the card, the point on it is the banner's own; back in the Tuner after Skip |
| whyline (F2) | 11/11: every source named (a score above your average, first bests, Bridge Crossing's record now at once); the warm-up "1 warm-up", no session |
| keeps (F3) | 19/19: the day's first exercise +5 XP, +1 warm-up, no session/history/streak; the rest of the day nothing, either entry; the next day once again |
| summary (F4) | 24/24: on the guide 100 %, 2 semitones off 0 %; rules 1–5 each once (lost above E4 → Register Coach; ±27 ct → Tuner; easy day; Range Finder; your session); ink bars; Start my session style |
| streak (F5) | 15/15: device B open since before sees "warmed up today" with no reload; D → D+1 carries (2), D+3 after a missed day 0 then 1; practice streak and sessions never move |
| warmup-entries, warmup-tracking, allowlist, levelup, home, youstates, house, contrast, copyscan --all, names, focus, targets, hooks, bootcheck | pass |

Found and fixed on the way (each in its own commit): the body put back before its own Finish row (the pre-session warm-up
never opened: F4 fix); the tabs' selector (F3 fix); `hidden` on the streak line overridden by hl-row's flex, and Skip on
the summary (F4/F5 fix). Checks updated for the new behaviour: keeps/tracking press Start my session twice (summary,
then session); tracking waits for the gate (it asks the server); levelup.js expects `scores_improved_total`; hooks.js
lists F3's retired ids and keys as intended removals.

## For the deploy (not done: the user reviews first)

F needs migration 0011 **and** the api Edge Function (the allow-list) on production with the app; without the function,
PATCH drops the two columns silently and F5 falls back to this device's mark. Rollback of the app leaves both harmless
(an old app never sends them).
