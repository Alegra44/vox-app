Redesign phase 3: Home and the Coach tab. Work on a branch, no deploy. I review the screenshots and the diff before anything ships.

0. SETUP
- git checkout master && git pull, then git checkout -b redesign/phase3.
- Save this message as design/house-lights/PHASE3.md and commit it first.
- HOUSE_LIGHTS.md → v1.4, with these decisions in a changelog line and in §5:
  · Home shows current values, not "this week" with changes. There is no week-over-week storage, and nothing gets invented.
  · Coach rows show a tool's stored personal best (the Personal Records values) where one exists, labelled "Best". No per-tool "last result" is stored.
  · Today's focus is one shared function, computeTodaysFocus(), used by both Home and the Coach tab.
  · Home's pick-up rows come from existing signals: Choir World focus, the next Vocal World unlock, Journey level and XP, and the last practice.

1. GUARDS FIRST (commit before touching the app)
a) scripts/design-verify/home.js, run against master and the branch, same seeded states:
   1. a new account with no scores;
   2. onboarding priority set, no scores;
   3. scores with a clear weakest skill;
   4. a struggling note (3+ attempts averaging under 65);
   5. practised today, with a session snapshot (Today's Report rows);
   6. trial expired;
   7. signed out.
   For each state:
   - Home's mission label, percentage, message and CTA target panel must be identical on master and the branch. On the branch, computeTodaysFocus() must return the same values.
   - The Coach tab's focus block shows the same label and target.
   - All 23 [data-enter-panel] buttons in #panel-train-hub exist, and clicking each opens its panel.
   - Every "Best" value on a Coach row equals the matching value in the Personal Records list for the same seeded progress.
   - #homeVlCard's previous element sibling is #homeChoirCard (batch3c relies on this).
   - #homeChoirCard's text is identical on master and the branch (p9/p10 rely on it). Whitespace may differ; words and numbers may not.
b) contrast.js: add Home in each seeded state and the Coach tab, signed in and signed out, Light and Dark. Same gates (≥4.5 everywhere).
c) shots.js: the same states at 390 and 1280, Light and Dark.

2. BUILD (one commit per item)

2.1 computeTodaysFocus()
- Move the mission computation out of renderHomeScreen into a pure function. It returns {label, pct, hasScore, msg, panel}, with msg including the struggling-note sentence as today.
- renderHomeScreen uses it, and its output must not change (home.js proves it).
- No other logic changes.

2.2 Home (panel-home), lights up, single column, max-width 640px at every width. Order:
- Label line (hl-meta):
  · today's date via Intl.DateTimeFormat(currentLanguage, {weekday:'long', day:'numeric', month:'long'});
  · then " · " and the existing #homeTrialText (trial day or plan).
  · #homeTrialRow becomes this line; its progress track is hidden.
- H1: #homeGreeting (--hl-t-h1, wide).
- Meta line: #homeStatsLine as in phase 1. #homeVoiceIdentity, #homeWeakLabel/Val and #homeStrongLabel/Val stay in the DOM but are hidden: the same information appears elsewhere.
- Coach sentence: #proactiveInsightText in .hl-coach, with no card and no eyebrow, and only when it has content. #proactiveInsightCard stays as its wrapper, card chrome removed.
- The one raised block: #homeMissionCard (hl-raised, the only raised block on the page).
  · label (home_mission_eyebrow) → "Today's focus"
  · #homeMissionLabel as hl-h2
  · a meta line: "Score {pct}" when hasScore, otherwise home_focus_noscore ("No score yet")
  · #homeMissionMsg as body text
  · #homeMissionCta: ink, full width, with a chevron
  · The ring (#homeMissionRing, #homeMissionPct as a ring label) stays in the DOM, hidden; renderResonanceRing may keep drawing into it.
  · Signed out, #homeSignedOutCard takes this place with the same raised styling. When the trial has expired, #homeTrialCompleteCard does.
- "Today so far": #homeTodaysReportCard as a plain section (label + rows, no card), only when it shows today.
- "Your numbers": a 4-up row of .hl-stat (2×2 at 390):
  · Range: noteNameFromMidi(lowestMidi)–noteNameFromMidi(highestMidi), change line "{n} semitones". If none is captured, "—" and a quiet "Find your range" link (enterPanel('range')).
  · Pitch, Agility, Breath: computeSkillProfile() values, "—" when null.
  · The section label is a quiet link "Skill Profile ›" to the Dashboard.
- "Pick up": an hl-list, in this order:
  · #homeChoirCard, restyled as a compact block with no card. renderHomeChoirCard keeps every text, #homeCwDelta and the [data-cw-go]/[data-cw-cta] buttons; change only classes and inline styles. Its h2 becomes hl-h3, step-label becomes hl-label, and the choir icon comes from the sprite.
  · #homeVlCard directly after it: a quiet row with the gauge and the disclaimer (.vl-disclaimer stays visible).
  · #homeWorldNudge as an hl-item with the world icon and a chevron. Tapping it opens the World tab (.snb-item[data-shell="world"]).
  · #homeLevelLine as an hl-item with the medal icon and a chevron, opening Journey (enterPanel('journey')).
  · #homeContinueText as a plain row with the calendar icon and no chevron.
  · #homeSecondaryList stays as the list's container.
- No emoji left on Home. ↻ 🗺️ 📆 💡 🎤 and the rest are replaced by sprite icons or removed.

2.3 Coach tab (panel-train-hub)
- Title block as now.
- A new raised block #coachFocus (signed in only), using computeTodaysFocus():
  · label "Today's focus"
  · the skill as hl-h3
  · the meta line as on Home
  · an ink full-width button home_start_training_btn going to the focus panel (enterPanel)
- The 7 .hub-category-card groups become plain sections (class kept, card chrome removed):
  · .hc-title as hl-label
  · .hc-desc as hl-meta (copy rewritten, see 2.5)
  · an hl-list of rows
- Each existing button[data-enter-panel] becomes an .hl-item row (keep the element and the attribute; add classes). Content:
  · a sprite icon (one per tool, from house-lights-icons.svg; list the mapping in the report);
  · a title span carrying the existing data-i18n key. Move data-i18n from the button to this span, because applyTranslations sets textContent and would wipe the row;
  · at the end, "Best {value}" where a Personal Records value exists, then a chevron.
- Best values come from one new pure helper, personalRecordValues(), extracted from renderRecordsList. Its rendered output must stay byte-identical; home.js compares the records list text on master and the branch.
  · Tuner: best stability
  · Range Finder: lowest–highest note, no "Best" prefix
  · Register Coach: longest clean crossing (s)
  · Breath Trainer: longest breath (s)
  · Exercises: best pitch accuracy
  · Every other row: no end value.
- renderCoachHub() fills #coachFocus and the values. Call it when the Coach tab opens, after sign-in and progress load, and on language change.
- At 960px and up, the groups sit in two columns.

2.4 Interaction
- Rows and links are real buttons, with focus-visible rings from house-lights.css.
- No new routing: everything uses showShellSection, enterPanel or clicking the existing .snb-item.

2.5 Copy (Home and Coach only)
- Scan every string shown on these two screens, signed in and out, for the §7 banned words (real, really, genuinely, honest, not a demo, fake, PRD, §, engine or API names). Rewrite each one plainly, keeping its meaning.
- Grep scripts/ for each old string before changing it.
- Known ones: home_signedout_title, home_signedout_desc, home_mission_weakest_msg, home_todaysreport_desc, and hub_train_range/breath/agility/expression_desc.
- Also: home_mission_eyebrow → "Today's focus"; home_todaysreport_eyebrow → "Today so far"; the emoji in home_trialcomplete_eyebrow is removed.
- New keys: home_focus_noscore ("No score yet"), home_score_tpl ("Score {n}"), home_numbers_label ("Skill Profile"), home_range_find ("Find your range"), home_semitones_tpl ("{n} semitones"), home_pickup_label ("Pick up"), coach_best_tpl ("Best {v}").
- You write fr, es and tr for every new or changed string, using the terms each language already uses (skill names, Skill Profile, level names). Put a table of all four languages in the report for my review.

3. CHECKS (branch, local build, one at a time)
- hooks.js: 0 failures. The data-i18n keys moved onto spans still count as present.
- home.js: every state identical where required.
- contrast.js: same gates, no new failures.
- Suites (the Home and Coach screens are on many scripts' paths):
  · batch1, batch2, batch3a–c
  · warm-up entries and tracking (they reach panels through the hubs)
  · levelup
  · choir p9, p10 and the cv suites that pass on master
  · glider flight and courses, range reload, tt firsttick
  · house.js
  Failures are re-run on master and classified. The audio code doesn't change in this phase, so vibfix and noisegate aren't needed. If you end up touching anything outside the Home and Coach rendering and the two helpers, run them too and say why.

4. SCREENSHOTS
- Every seeded state of Home, plus the Coach tab signed in and signed out, at 390 and 1280, Light and Dark.
- Push to an orphan branch review/phase3; push redesign/phase3. Secret check before both pushes.

5. REPORT, then stop
- Commits; home.js, hooks and contrast results; the suite table; the icon mapping; the copy table (old → new, in all four languages).
- No merge and no deploy until I've reviewed.

Rules as before: keep every ID, data-i18n key, data-panel, data-shell and data-enter-panel value, and every protected class and string. No new dependencies. Lights up on both screens.

---

3.1 (after the phase 3 review; the user's text, verbatim)

Phase 3 review: approved, with three small fixes (3.1) before the deploy. Add this as "3.1" at the end of PHASE3.md.

Fixes:
1. renderTodaysReport: no inline colours.
   - The "+N%" improvement values use --hl-ok (a class, not the voice colour).
   - The "Still your weakest" value uses --hl-ink, not red.
2. #homeContinueText: format lastPracticeDate with Intl.DateTimeFormat(currentLanguage, {day:'numeric', month:'long'}) instead of the raw ISO date. The words stay the same.
3. #coachFocus at ≥960px: the button is width:auto with min-width 280px, not full width. Home stays as it is.

Checks (one at a time):
- home.js, contrast.js, copyscan.js
- batch3c, cv-p9, cv-p10
- Re-take the Home "today" and "new" states and the Coach tab at 390 and 1280, Light and Dark. Push them to review/phase3.

If all pass, this is my approval to deploy phase 3:
1. Merge redesign/phase3 into master with --no-ff, run the secret check, push.
2. From deploy/: npx vercel@62.2.0 deploy --prod --yes --scope alegra1122 (retry once on "Not authorized").
3. On production, one at a time, paced, cleaning up test accounts:
   - contrast.js, system.js, house.js
   - batch1, batch3c, warm-up entries, levelup
   - cv-p9, cv-p10
   - shots of Home (all 7 states) and the Coach tab at 390, Light and Dark
4. If a production check fails where the local run passed, and a re-run shows it isn't a flake, roll back at once to the phase 2 deployment dpl_CLqPg1gb25R563tBixH4WCXsUrNT and report. Don't fix on production.
5. Housekeeping:
   - update HANDOFF.md;
   - delete review/phase3 locally and on the remote;
   - push the production shots to review/phase3-prod.
6. Report the deployment id and the production results, then stop. I'll send the phase 4 spec next.
