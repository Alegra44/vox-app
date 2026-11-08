Phase 6 production: approved, no rollback. Rollback target from now on: dpl_6EgEe6idPGDet91hDsVkkwc2YGXx.

1. prod.sh: raise the time limits for house and contrast to fit the six phase 6 tools (measure their usual times and use 1.5×, capped at 75 min). Test scripts only. Commit on master, push.
2. Start phase 7 on a new branch redesign/phase7 from master.
   a) First commit, the tuner fix (approved): when the voice leaves the lock, the note, octave and cents text change colour together with the lock fill's 120 ms fade instead of switching at once, so the text never sits on the fading blue in its normal colour. contrast.js on the Tuner in Light and Dark must show 0 below 3:1 across 10 runs of the drift-off moment. This goes out with phase 7.
   b) Then the read-only phase 7 survey, as in PHASE6.md's last step: the You hub, Journey, Dashboard, Records, Vocal Passport, Voice Health, Profile and settings, and where Choir World runs could feed the Skill Profile (describe the options, change nothing). Include Profile's achievement icon (3.38:1 in Dark, flagged since phase 5). Before-screenshots on review/phase7-before with a contact sheet. Push both, report, stop.

## Phase 7 spec (2026-11-08)

Phase 7: Progress and identity (the You screens). Work on redesign/phase7 (it has the tuner fix and PHASE7_SURVEY.md). Add this message to design/house-lights/PHASE7.md and commit it first. No merge or deploy until I've reviewed the screenshots. Rollback target: dpl_6EgEe6idPGDet91hDsVkkwc2YGXx. AC power only, one verify script at a time. Nothing here sings: no stage, the house stays up.

DECISIONS
- Choir World and the Skill Profile: option 2. computeSkillProfile's Pitch averages the solo pitch scores together with Choir World run pitches: each finished run with a Performance Report pitch counts as one score, merged by time, last 20 overall. Nothing new is stored, no XP changes, reversible. Its own commit (2.9) so it can be dropped. The Pitch ring's hl-measure names the tools that feed it, Choir World included.
- Expression stays "not scored yet" until the scoring-accuracy batch fixes its measurement (the steady tone at 51). The copy stops saying "no trainer built"; it says "Not in your profile yet." Add to HANDOFF under the batch: after the fix, Expression joins the profile from the stored scores.
- The UTC day (survey item 5) isn't fixed here, because the vocal-load budget and the server share that day. Add it to HANDOFF as its own later item.
- "How you compare" (invented people) is hidden, like the Director Dashboard. The Teacher Dashboard row stays on You for Teacher-plan accounts only; if it shows invented people too, hide them the same way.
- "Dashboard" is renamed "Progress" (fr "Progrès", es "Progreso", tr "İlerleme"). Grep scripts/ first.
- HOUSE_LIGHTS.md → v2.0, recording the structure below.

1. GUARDS FIRST
a) youstates.js (new): the seeded states from shots7before (signed out, new, active, plus an active singer with Choir World runs), on master and the branch. Compare what each screen computes: Skill Profile numbers and summary, level, XP, streak, sessions, records values, achievements unlocked, the Journey day and steps, the Voice Health trend, the Passport rows. They must be equal except for the expected changes listed in 3.
b) contrast.js on the filled states (as shots7before measured them), Light and Dark; copyscan over the You screens in four languages; hooks; navcheck (every You screen highlights You); bootcheck; home.js and levelup (they read records); choir-verify p9 (the Journey milestone and achievements).
c) The Voice Card renders (canvas not blank, no page error) in four languages and both themes, and its download works.

2. BUILD (one commit per item, four languages)

2.1 The You tab (panel-you-hub) becomes the one place for you:
- An identity block (raised): avatar initial, name, "Level 7 · Pitch Apprentice", an .hl-meter for XP to the next level (from levelForXp), and streak and sessions as two quiet figures.
- The Skill Profile, drawn here only: the five rings; the summary as rows (Level read, Strongest, Needs work, Not scored yet), keyed instead of hard-coded English; hl-measure (where each ring comes from).
- Rows (.hl-item, icons, one value each): 21-Day Journey (Day n of 21), Progress, Personal Records (n records), Vocal Passport, Voice Health (today's vocal load %), Choir World (your parts' readiness) when you have runs, Teacher Dashboard (Teacher plan only), Plan & Pricing, Profile & settings.
- Signed out: one block with sign-in and a line on what this page will show.

2.2 Progress (panel-dashboard, was Dashboard):
- Today's Plan as rows (keyed copy). The "not a language model" text goes; one line in hl-measure says it's rule-based.
- The Weekly Challenge as a block with its .hl-meter. "How you compare" is hidden.
- Range progress; the 14-day activity (find out why it's empty for the seeded active account, and fix it if it's the app); Unified Progress, moved here from Profile, with legend colours from House Lights, not teal/brass/coral.
- Share my recap. The Skill Profile copy here is hidden (it lives on You). Sign out and Reset local data move to Profile & settings.

2.3 Profile & settings (panel-profile):
- The hero is keyed (no English in other languages).
- The Voice Card (2.7), then Settings: language, theme, playback volume, feedback, and an Account section with Sign out and Reset local data (moved from Progress, IDs kept).
- Hidden here because they live elsewhere (IDs kept): the Fingerprint (Passport), the Skill Profile (You), training history (You), the 21-day line (You), achievements (Journey), the Skill Tree line (Vocal World, phase 8), Unified Progress (Progress), the records preview (Records).

Midway checkpoint: when 2.1–2.3 are built, push review/phase7-part1 (You, Progress, and Profile & settings: signed out, new and active, at 390 and 1280, Light and Dark) and carry on. I'll review it meanwhile.

2.4 21-Day Journey
- House Lights layout: "Day n of 21" and the week theme as the header; today's curriculum as rows with Mark done; level, XP and streak as one row (the meter is on You).
- The Day 1 steps tick themselves from the result each tool already stores (a saved range; a Tuner stability day; an Interval score; a Breath score; a Scale Run score). The manual tick stays.
- The trial bar leaves the program: a quiet line under the header, only while a trial runs.
- Achievements live here:
  · streak7 gets an icon;
  · a locked achievement uses ink-3 for its icon and name instead of 40% opacity, so it passes 4.5:1;
  · icons come from the sprite where one fits, otherwise a neutral badge; no emoji.
- Day 1 vs today as dimension rows.

2.5 Personal Records
- Category headings without emoji. Songs reads songBestScores (Karaoke's best per song); the wrong note goes.
- A Choir World section from progress.choirReadiness: best run score, bosses beaten, parts Ready.
- "Best pitch" is labelled honestly ("best of your last 20").

2.6 Vocal Passport
- Identity rows, the Fingerprint (moved here), the Breakthrough Timeline.
- Timeline labels are rendered from the event type with t() in the current language; stored text is only a fallback for old entries. Dates go through Intl. "Updated" shows the last change, not today.

2.7 Voice Card
- Redraw the canvas in House Lights: ink background, paper text, the voice colour for the bars, Archivo only, the same in both themes. Rows as now: only measured values, a missing one shows "—". The footer loses "real".

2.8 Voice Health
- Add Vocal Load: today's load against the budget (the same numbers as the gauge) and the break prompts' thresholds in plain words. If the vocal-load API already returns past days, add a 14-day bar chart beside the two existing ones; if not, show today only and note the history in HANDOFF.
- The two in-session warnings and the first banner text get keys.

2.9 Choir World runs in Pitch (the decision above): its own commit, with youstates showing the expected Pitch change for the Choir World state only.

2.10 Copy: every §7 word and emoji on the seven screens is rewritten in four languages (the survey's list). PHASE7_COPY.md: old → new.

3. CHECKS
youstates (the gate), contrast, copyscan, hooks, navcheck, bootcheck, home, levelup, p9, the Voice Card check, batch1, picker.
Expected changes (list them in the report; nothing else may change):
- the structure (sections moved or hidden), and "How you compare" hidden;
- the Journey's auto-ticks;
- Records' Songs and Choir World rows;
- the Passport timeline's language and dates;
- Voice Health's vocal load;
- the Pitch blend (2.9);
- the rename;
- the achievement icon and the locked style.

4. SCREENSHOTS
All seven screens, signed out, new and active (plus the Choir World state for You and Records), at 390 and 1280, Light and Dark, and the Voice Card image itself. Put them on review/phase7 with a contact sheet. Secret check, push both branches.

5. REPORT, then stop.
