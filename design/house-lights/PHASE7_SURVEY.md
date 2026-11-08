# Phase 7 survey: Progress and identity (the You screens)

Read-only survey for phase 7 (PHASE7.md 2b, as in PHASE6.md's last step). Nothing in the app was changed for it. Line
numbers are `deploy/index.html` on `redesign/phase7` 6372713 (master 170c145, phase 6 live as
dpl_6EgEe6idPGDet91hDsVkkwc2YGXx, plus the 2a tuner CSS, which moves everything after line 409 down by 15).
Screenshots are on `review/phase7-before` (`sheets/before.jpg`), taken on master with
`scripts/design-verify/shots7before.js`: full page, 390 Light, 390 Dark and 1280 Light, Choir-plan test account, in
three states — signed out, a fresh account ("new"), and a seeded singer some days in ("active": Skill Profile scores, a
range, 14 days of history, Voice Health readings on six days, timeline events, a Karaoke song best, the Journey on day 6,
one Choir World part with a Harmony Memory run). The seed lives in the page only (`saveProgress` stubbed), like Home's
`homeStates.js`. `states.json` there has, per shot, what the screen computed and contrast.js's own measure of the
filled-in panel. Copy findings: `scripts/design-verify/survey7/copy7.py` plus reading the code.

## At a glance

| Screen | Panel | Reached from | Shows | Data | Layout |
|---|---|---|---|---|---|
| You hub | `panel-you-hub` 2710 | the You tab | 7 cards: Profile, 21-Day Journey, Dashboard & Skill Profile, Voice Health, Plan & Pricing, Personal Records, Teacher Dashboard | — | old `journey-hero` + `hub-category-card` grid (the Coach and Songs hubs moved to House Lights rows in phases 3–6) |
| 21-Day Journey | `panel-journey` 2763 | You hub, Profile | Day 1 assessment (5 steps + optional clip, ticked by hand) → day N of 21, curriculum, Choir World milestone, Level/XP/Streak, achievements, Day 1 vs today | `profile.day1*`, `progress.curriculumDaysCompleted`, `xp`, `streak`, ACHIEVEMENTS, `computeSkillProfile()` | old `key-card`s, inline type styles, a "Billing: Day n of 21" trial bar inside the program |
| Dashboard & Skill Profile | `panel-dashboard` 3696 | You hub, Profile | name/streak/sessions, the 5-ring Skill Profile + summary, Today's Plan, Weekly Challenge + "How you compare", range bar, 14-day activity, Share recap / Reset local data / Sign out | `computeSkillProfile()`, `progress.history`, `weeklyLog` | old `dash-card` grid and `key-card`s |
| Personal Records | `panel-records` 5210 | You hub, Profile | 3 lists: Range & technique (7), Vocal World (4), Songs (2, always "not tracked") | `personalRecordValues()` 21338 | old `record-row`s, emoji category heads |
| Vocal Passport | `panel-passport` 4643 | Profile's "View my Vocal Passport" only | identity rows (level, 3 range tiers, strongest, focus, best song, achievements, breakthroughs), Voice Fingerprint, Breakthrough Timeline | `computeVocalLabTiers()`, `computeSkillProfile()`, `songBestScores`, `timelineEvents` | old `key-card` + `curriculum-detail-row`s |
| Voice Health | `panel-voicehealth` 3971 | You hub | a banner + two 14-day bar charts (stability, breath consistency) | `progress.dailyMetrics` (Tuner stability, Breath Trainer consistency only) | old `key-card`, `health-status-banner` |
| Profile & settings | `panel-profile` 5230 | You hub (the header avatar opens the You hub) | identity card, Voice Fingerprint, Voice Card (canvas), range, Skill Profile again, Training History, 21-Day line, achievements again, Skill Tree line, Unified Progress chart, records preview, Settings (language, theme, volume, feedback) | everything above | old `profile-id-card` and `key-card`s; the Voice Card is the pre-redesign palette |

None of the seven is on the House Lights layout yet (`journey-hero`, `key-card`, inline font styles, emoji in titles).
Nothing here sings, so there is no stage and the house stays up. No page errors in any shot.

## Per screen

### You hub (`panel-you-hub`, 2710–2752)
- Seven cards, each "Open". Two are outside this phase's list: Plan & Pricing and the Teacher Dashboard ("Real roster
  and assignment tracking — Teacher plan"; the Director Dashboard was hidden in phase 5 for invented people, the
  Teacher one is still here).
- The **Vocal Passport isn't a card**: it's reached only from a button inside Profile. Choir World's own Passport
  (`panel-choirpassport`) is a separate screen with the same word.
- Profile, Dashboard and Personal Records each repeat the others (below).

### 21-Day Journey (`panel-journey`, 2763–2888; `renderJourney` 19584, achievements 19452, snapshot 19483, milestone 17828)
- **Before Day 1:** five assessment steps (Range, Tuner, Interval, Breath, Scale) and an optional clip. Each "Open"
  jumps to the tool; the step is ticked by hand ("this page doesn't auto-detect across tabs"), then a goal, then "Set my
  baseline & begin" stores `profile.day1Snapshot` = today's `computeSkillProfile()`.
- **After:** "Day n of 21" from `day1StartDate`, a week theme, today's curriculum (`renderTodaysCurriculum`, Mark done
  → `curriculumDaysCompleted`), the Choir World milestone card (Harmony Memory stage pass, phase 9), Level / XP /
  Streak, the 12 achievements, Day 1 vs today per Skill Profile category, Reset.
- **Level:** `levelForXp`: level = ⌊xp/50⌋+1, tier names Explorer / Apprentice / Builder / Performer / Master by level
  5 / 10 / 15 / 20. XP comes from `recordSkillScore` (5 for a first score in a category, up to 40 for beating your
  recent average, 1 otherwise) and elsewhere.
- **Billing inside the program:** the "Billing: Day n of 21 free access" bar sits under the program day; both count
  to 21 from different dates.
- Placeholders in markup without `data-i18n` ("Day 1 of 21", "Week 1 — Control Your Voice", "Billing: …", "Today's
  Curriculum — Day 1") are overwritten by `renderJourney` when signed in.

### Dashboard & Skill Profile (`panel-dashboard`, 3696–3772; `renderDashboard` 13483, `renderSkillProfile` 18981)
- **Skill Profile** (`computeSkillProfile` 18972): Pitch, Breath, Agility = the mean of the last 20 stored scores in
  `progress.pitchScores` / `breathScores` / `agilityScores`; Range = semitone span / 30 × 100; **Expression is hard-coded
  `null`** ("needs Emotional Singing analysis — not built yet, not faked") although Emotional Singing (14869) and Harmony
  Arena (20825) both call `recordSkillScore('expression', …)`. The seeded account had an expression score stored and
  the ring still shows "—" and "Expression — no trainer built for these yet".
- Who writes the three averaged lists (`recordSkillScore`): pitch from 14 places (Pitch Match, Interval Match, Stay in
  Key, Karaoke, PD, One Take, Five Ways, Mirror Echo, Ear-Voice-Ear, Hear the Mistake, Boss training, Custom, Ear
  Training, Register drills); agility from Scale Run, Rhythm, Rift, Vocal Puzzle; breath from the Breath Trainer only.
  A Pitch score is therefore a mix of very different tasks (a held Tuner-style note, a sung song line, an ear-training
  answer), averaged with equal weight.
- **Summary** under the rings: "Read (early)" Professional / Intermediate / Beginner by the mean of the scored rings
  (≥ 80 / ≥ 55), Strongest, Needs work, Not scored yet. All of it hard-coded English (19016–19031).
- **Today's Plan** (19230): warm up → your lowest ring → Register Coach if your best crossing < 3 s → the Weekly
  Challenge. Rule-based; the card's copy explains that at length ("not a language model reasoning about you…").
- **Weekly Challenge** (19202): one of `WEEKLY_CHALLENGES` by ISO week, checked against the last 7 days of `weeklyLog`.
  **"How you compare" is a hard-coded `SAMPLE_LEADERBOARD`: four invented people (Jules M. 100 %, Amara T. 88 %, Devon
  R. 71 %, Priya K. 52 %) with you at "—"**, tagged SAMPLE DATA. Same kind of thing as the Director Dashboard's invented
  singers (rule 5).
- Range bar C2–C6, 14-day activity from `progress.history`. **Sign out and "Reset local data" live here**, not in
  Profile's Settings.

### Personal Records (`panel-records`, 5210–5227; `personalRecordValues` 21338, `renderRecordsList` 21361)
- Range & technique: highest / lowest note, best pitch % (max of `pitchScores`, i.e. the last 20 only), best agility %,
  longest breath, best stability (any Tuner day), longest register crossing. Vocal World: Glider, Bridge, boss wins,
  harmony accuracy.
- **Songs: both rows are always "Not tracked yet"** — `record_note_song_score` says "those tools show live results but
  don't save a persistent best", but Karaoke has saved `progress.songBestScores` since phase 6 (the Passport shows it as
  "Best song").
- **Nothing from Choir World**: no Harmony Memory stage, boss, or Performance Report best (the runs are stored, below).
- "Best pitch" is the best of the last 20 scores, not an all-time best.

### Vocal Passport (`panel-passport`, 4643–4680; `renderVocalPassport` 23091, `renderVoiceFingerprint` 23034)
- Needs a Range Finder result first ("passport_needrangefinder"); otherwise identity rows, the Fingerprint (the five
  rings as a radar), the timeline.
- **Timeline labels are stored English text** (`logTimelineEvent(type, label)` keeps the label in the language of the
  moment), and the date is the raw `YYYY-MM-DD`. Switching language leaves old entries as they were.
- "Updated" stamp is today's date every time, not when anything changed.
- Repeats Profile's Fingerprint and Dashboard's strongest / focus.

### Voice Health (`panel-voicehealth`, 3971–3985; `renderVoiceHealth` 19068, `checkVocalHealthSignal` 23179)
- Two inputs only: Tuner stability (6189) and Breath Trainer consistency (14225), per day. Needs ≥ 3 days with data;
  "declining" = the last three data days' mean more than 10 below the three before.
- **Vocal Load (the daily 6800 load-s budget, the 80 % / 100 % break prompts) isn't on this screen**, though it is the
  one health measure every singing tool feeds.
- The in-session warnings (`vocalHealthBanner`: 20 minutes on the Tuner, stability down 12 points) are hard-coded
  English (23187, 23199).
- The markup's first banner text ("Not enough data yet — practice on a few different days…") has no `data-i18n`; it is
  replaced on render.

### Profile & settings (`panel-profile`, 5230–5355; `renderProfile` 21537, `renderVoiceCard` 23337)
- **The hero has no translation**: "🎤 Profile", "One real singer identity — consolidated from Dashboard, Journey, and
  Personal Records…", and the signed-out line are English in every language (5232–5237).
- Repeats: the Skill Profile rings and summary (as on Dashboard), achievements (as on Journey), a records preview,
  the Fingerprint (as on Passport), the 21-day line.
- **Voice Card** (canvas, download): the pre-redesign look — near-black `#0e0d0b`, brass `#e8a33d`, teal `#4fd6c4`,
  coral, cream `#f1ead9`, Georgia serif and Archivo — in Light and Dark alike. Its rows: Pitch, Range, Breath, Agility,
  Harmony, streak, level.
- Unified Progress: pitch / breath / agility from `weeklyLog`, legend colours teal / brass / coral.
- **Settings:** language (4 buttons), theme (System / Light / Dark), playback volume, Feedback. No sign out, no account
  or data section (those are on Dashboard).

## The achievement icon (flagged since phase 5)

It isn't an icon colour. `ACHIEVEMENTS` (19452) gives `streak7` ("7-day streak") no `icon`, so `renderAchievements`
prints the text **"undefined"** in its `.a-icon`. Locked cards draw the icon at `opacity:.4` with `grayscale(1)`
(1353), so that word measures 2.6:1 in Light (`#a0a1a2` on `#ffffff`) and 3.38:1 in Dark (`#707376` on `#1e2126`):
the contrast row every run since phase 5 has reported. It shows on Profile and on the Journey (once started), new and
active alike (`states.json`). The real icons are emoji, which contrast.js skips (no letters). Fix when you want it: give
`streak7` an icon. A locked achievement at 40 % opacity is a separate design question (the names are at `--hl-ink-3`).

## Choir World and the Skill Profile (the open decision; options only, nothing changed)

**What exists:** every Harmony Memory stage and every challenge run (boss, chaos, ladder) is saved to the account in
`progress.choirReadiness.runs` (`rdRunSummary` 17526, at most 100): kind, song, part, score, passed, notes held of n,
and the Performance Report's **pitch** and **timing** (same pitch formula as the solo tools: 100 − 0.6 × mean |cents|
per note, vibrato out; timing 100 / 50 by the first 40 % of the note). Rehearsal play-throughs and Your Choir takes
count for readiness but carry no score. `computeSkillProfile`, Today's focus (`computeTodaysFocus`, Home and the Coach
tab), Today's Plan, Records, the Voice Card and the Fingerprint read none of it; only the Journey milestone and three
achievements look at Choir World.

**Options:**

1. **Leave them separate.** Choir World keeps its own Readiness / Passport; the Skill Profile stays solo. Simple and
   honest, but a singer who only does Choir World has an empty profile and a Today's focus that ignores their work.
2. **Feed Pitch at read time.** `computeSkillProfile` averages the last 20 solo pitch scores together with the recent
   Choir World run pitches (or blends the two averages by count). Nothing new is stored, it's reversible, no XP
   changes. Open questions: a run sung against four other parts is harder than a held solo note, so the same singer
   would score lower there; and a run's pitch is per note of a song line, closer to Karaoke than to Pitch Match.
3. **Feed Pitch at write time.** Each finished run calls `recordSkillScore('pitch', rep.pitch)` like the solo tools.
   The run then also earns XP (up to 40 when above your average) and moves Pitch Master, the Fingerprint and the Voice
   Card. Old runs aren't counted unless backfilled from `runs`.
4. **A sixth category ("Ensemble" or "Choir").** From readiness (`rdProgress`) or the runs' mean score, shown as its
   own ring. Keeps solo and choir apart and visible; changes the five-ring shape everywhere (Dashboard, Profile,
   Fingerprint, Voice Card, Day 1 snapshot) and Today's focus would need to know how to send you there.
5. **Timing.** The runs also have a timing score; the Skill Profile has no timing category (Karaoke and PD timing go
   nowhere either). Any of 2–4 could add Timing from Karaoke, PD and Choir World together, after the scoring-accuracy
   batch fixes "a held tone is on time" (HANDOFF, item 1), or it would reward the same flaw.

Whichever is chosen, Today's focus (`computeTodaysFocus`) and Today's Plan pick "your lowest ring": with 2 or 3, a
Choir World singer's pitch would steer them; with 4, the plan needs a panel for the new ring.

## Copy problems (four languages)

From `copy7.py` (each screen's `data-i18n` and `t('…')` keys in en, fr, es, tr: §7 words, emoji, missing or
untranslated languages, English in markup without `data-i18n`). No key is missing a language; none is left as English
in another language.

- **You hub** (17 keys) — §7: `hub_you_dashboard_desc`, `hub_you_profile_desc`, `hub_you_records_desc`,
  `hub_you_teacher_desc` ("real", all four languages). Emoji: `hub_you_profile_title` 🎤, `hub_you_teacher_title` 👩‍🏫.
- **21-Day Journey** (80 keys) — §7 in nine keys, all four languages: `journey_sub` ("honest"), `journey_day1_h2`,
  `journey_open_hint` ("asks honestly"), `journey_sequence_label` ("Real sequence"), `journey_step_breath_sub`,
  `journey_achievements_h2`, `journey_day1vtoday_h2`, `journey_day1vtoday_desc` ("Honest scope", "PRD", tr "§"),
  `journey_complete_theme`. Emoji: `journey_cw_label` 🎼, `journey_record_btn` 🎙. Hard-coded placeholders (above).
- **Dashboard** (48 keys) — §7: `dashboard_sub` ("engine", "real"), `dashboard_signedout_desc` ("PRD", "real"),
  `dashboard_skillprofile_desc` ("honest"), `dashboard_skillprofile_h2` (fr/es/tr), `dashboard_todaysplan_h2`,
  `dashboard_todaysplan_desc` ("engine"), `dashboard_backend_note`, `todaysplan_signin` (fr/es/tr). Emoji:
  `dashboard_title` 📊. Hard-coded: the Skill Profile summary (Status, Read (early), Professional / Intermediate /
  Beginner, Strongest, Needs work, Not scored yet, "no trainer built for these yet"), "Not captured yet — visit Range
  Finder" (3753), the leaderboard names.
- **Personal Records** (22 keys) — §7: `records_sub`, `records_signin_msg`. Emoji: `records_title` 🏆 and the three
  category heads 🎤 🗺 🎵. Wrong: `record_note_song_score` (above).
- **Vocal Passport** (31 keys) — §7 in seven keys: `passport_signin`, `passport_needrangefinder`, `passport_bestkey_note`
  ("Honest about scope"), `passport_timeline_desc`, `timeline_empty`, `fingerprint_all5tracked`,
  `fingerprint_of5_suffix` ("genuinely"). Emoji: `passport_title` 🪪, `passport_timeline_label` 🌱, the timeline icons.
  Timeline entries stored in one language (above).
- **Voice Health** (12 keys) — §7: `voicehealth_sub`. Emoji: `voicehealth_title` 🩺. Hard-coded: the two in-session
  warnings, the first banner text.
- **Profile & settings** (70 keys) — §7 in eleven keys: `profile_fingerprint_desc`, `profile_voicecard_desc`
  ("nothing staged"), `profile_vocalstats_h2`, `profile_unifiedprogress_desc`, `voicecard_footer` ("Real data, real
  progress"), `voicecard_note_real`, `voicecard_note_practice`, `skilltree_signin`, `skilltree_fullyunlocked_desc`,
  `settings_feedback_sub`, `lang_select_disclosure` ("Honest about scope"). Emoji: seven labels (🫆 🎤 📈 🪪 💬 🌐 🔊).
  Hard-coded: the hero and signed-out line (above), "Not captured yet", "Not started". (The four language names are
  meant to stay in their own language.)

## Broken or odd (noted, not fixed)

1. **Expression is never scored** although two tools store it (Dashboard, above); every screen says "no trainer built".
2. **The 7-day streak achievement prints "undefined"** (above).
3. **Invented people in "How you compare"** on the Dashboard (rule 5).
4. **Records says song scores aren't saved** while Karaoke saves them and the Passport shows them.
5. **The day is the UTC date.** `todayStr()` (13138) is `toISOString().slice(0,10)`: streaks, `history`,
   `dailyMetrics`, the Journey day and "today" roll over at UTC midnight, not the singer's (03:00 in Istanbul, 19:00 the
   evening before in New York). The 14-day bar labels parse those dates as UTC midnight and print the local weekday, so
   west of UTC every bar is labelled with the day before.
6. **Repetition:** the Skill Profile is drawn on Dashboard and Profile, achievements on Journey and Profile, the
   Fingerprint on Profile and Passport, strongest / focus on Dashboard, Passport and Profile — each with its own copy.
7. **Sign out is on the Dashboard**, under the activity chart; Settings (in Profile) has none.
8. **The Voice Card** is the old palette and fonts in both themes.
9. **The Journey's Day 1 steps are ticked by hand** though every step's tool already stores its result.
10. **Voice Health ignores Vocal Load**, the measure built for vocal health.
11. **"Best pitch" in Records is the best of the last 20 scores**, so an old best can disappear.
12. **The Vocal Passport is reachable only through Profile**; the same name is used for Choir World's Passport.
13. **Breath** in the Skill Profile comes from one tool (the Breath Trainer's consistency average); a singer who never
    opens it has no Breath ring whatever else they sing.

## Verify coverage

| Screen | Scripts | What they check |
|---|---|---|
| You hub | navcheck, shots (hubs), contrast, hooks | the tab and its panel; contrast on an empty account; ids and keys |
| Journey | choir-verify p9 | the Choir World milestone and the three CW achievements |
| Dashboard | contrast, hooks | empty account only |
| Records | home.js, levelup (record count) | Home's personal bests; levelup's records count |
| Passport | contrast, hooks | empty account (the "need Range Finder" line) |
| Voice Health | contrast, hooks | empty account |
| Profile & settings | shots (theme picker), contrast, hooks, signuptime | the theme picker; contrast on an empty account |

Nothing checks the Skill Profile's numbers, Today's Plan, the achievements' conditions, the records' values, Voice
Health's trend rule, the timeline, the Fingerprint or the Voice Card, and contrast.js has only ever measured these
screens empty. `shots7before.js` now measures them filled (`states.json`): the only items below 4.5:1 are the
"undefined" icon.

## Found while doing 2a (the tuner fix)

- **Stay in Key and Breath had the same lock-colour fault.** Stay in Key's ring (phase 6) shares the Tuner's fill and
  rules: its chord label sat in `--hl-on-voice` on the bare stage while the fill faded in, and its coral "Drifted" line
  on the full fill (both 1:1). Breath's ring has no fill, yet its timer turned `--hl-on-voice` (near-black on the dark
  stage, 1:1) for the 1.1 s goal pulse. Both fixed by the same rule (`rings7.js`).
- **contrast.js skipped `color-mix` colours.** Chromium computes them as `color(srgb …)`, which the parser didn't read,
  so such a text was skipped and such a background was treated as transparent. Master uses `color-mix` only for
  backgrounds (10–18 % tints: answer buttons, the health and trial banners, the snapshot delta), so earlier runs
  measured that text on the layer under the tint. Fixed in f8c86c3; the filled-in You screens measure clean with it.
