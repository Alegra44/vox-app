# Phases 8 and 9 survey: every screen not yet on House Lights

Read-only survey for phases 8 and 9 (the user's instruction of 2026-11-08, after the phase 7 deploy; HOUSE_LIGHTS.md §10:
phase 8 the Vocal World games, phase 9 everything else). Nothing in the app was changed for it. Line numbers are
`deploy/index.html` on `redesign/phase8` f529496 (= master 0c39e09, phase 7 live as dpl_AuR6tZ7FryuBFf6meMmQDxaryGEk,
plus test-script commits). Screenshots are on `review/phase8-before` (`sheets/before8.jpg`, `sheets/before9.jpg`),
taken on master with `scripts/design-verify/shots8before.js`: 390 Light, 390 Dark and 1280 Light, Choir-plan test
account, in up to five states set in the page only (`saveProgress` stubbed) — signed out, a fresh account ("new"), a
singer at Level 7 ("active"), an ended trial with no plan ("expired") and a Teacher-plan account with a two-student
roster and one assignment ("teacher"). 147 shots; `states.json` has, per shot, the phase, any error opening the screen
and contrast.js's measure of what's on screen; `french.json` the English left on each screen with the page in French;
`probes.json` three behaviour probes (below). Copy findings: `scripts/design-verify/survey8/copy8.py` plus reading the
code. No page errors and no error opening any screen.

## At a glance

| Screen | IDs (markup · code) | Sing into it? | Reached from | Layout now |
|---|---|---|---|---|
| **Phase 8: Vocal World** | | | | |
| World hub | `panel-arcade` 3013, `#arcadeHub` 3016–3059 · `showArcadeHub` 20000, `showArcadeGame` 20014, `renderArcadeLocks` 20040, `updateArcadeBestLabels` 20058, `gameUnlockedAtLevel` 19995 | no | the World tab | 6 `.arcade-game-card`s with emoji art (`ag-emoji`), old card grid |
| Pitch Mountain (Glider) | `#gameGlider` 3062–3125 · `startGlider` 20235, `gliderLoop` 20260, `finishGlider` 20329, `gliderComputeDifficulty` 20116 | yes (pitch; house down, load counted) | hub card, Level 1 | old `key-card`, course picker of 7 courses, canvas |
| Register Canyon (Bridge Runner) | `#gameBridge` 3364–3380 · `startBridgeRunner` 20882, `bridgeLoop` 20901, `finishBridgeRunner` 20950 | yes (chest/head register; load counted, **house stays up**) | hub card, Level 3 | old `key-card`, canvas |
| Boss Arena | `#gameBoss` 3128–3239 · `BOSS_TYPES` 20570, `startBoss` 20612, `bossFinalizeNote` 20632, `bossLoop` 20713, `finishBoss` 20777, `renderBossMemoryAndRecommendation` 22525 | yes (pitch; the Register Wraith reads the register input: load counted, **house stays up**) | hub card, Level 5 | old `key-card`, 8 boss cards with emoji, emoji "versus" art, 3 difficulty pills |
| Harmony Castle (Harmony Arena) | `#gameHarmony` 3242–3321 · `startHarmonyArena` 21042, `harmonyLoop` 21082, `finishHarmonyArena` 21137, `scheduleHarmonyDistraction` 21004 | yes (pitch against the other parts; house down) | hub card, Level 10 | old `key-card`, part picker, 5 levels |
| Vocal Skill Tree | `#gameSkillTree` 3324–3333, `#skillTreeSvg` · `SKILL_TREE_NODES` 21196, `renderSkillTree` 21239 | no | hub card, always open | SVG tree with emoji nodes |
| The Vocal Rift | `#gameRift` 3336–3361 · `riftGenerateTarget` 23179, `riftParamsFor` 23191, start handler 23198, `riftTimerTick` 23216, `riftRunNextRound` 23232, `finishRift` 23259 | yes (pitch; house down) | hub card, Level 7 | old `key-card` |
| **Phase 9: everything else** | | | | |
| Sign up / sign in | `#authModalOverlay` 2505–2544 · `setAuthMode` 13668, `openAuthModal` 13684, `closeAuthModal` 13689, `translateAuthError` 13727 | no | header avatar, any gated action | modal card |
| "Sign in required" | `#signinRequiredOverlay` 5618–5628 · `requireSignIn` 18492 | no | any signed-in-only action | modal card |
| Onboarding (7 steps) | `#onboardingOverlay` 5688–5752 · `populateOnboardingGrids` 21866, `renderOnboardingStep` 21899, `renderObPlanSummary` 21918, `openOnboarding` 21930 (`obStepIndex`) | no | first sign-up | modal card, dots, option grids |
| Language chooser | `#languageSelectOverlay` 5665–5685 | no | first visit | modal card, four names (flagless since phase 7) |
| Plan & Pricing | `panel-pricing` 5233–5339 · `showPricingPanel` 18456, plan buttons 18508, `renderPricingState` 18546, `renderTrialCompareRows` 18590 | no | You hub, paywall, Choir World preview | old `key-card`s, emoji plan names, a dev disclosure |
| Paywall | `#paywallModalOverlay` 5605–5616 · `openPaywallPrompt` 18464 | no | any Pro/Choir feature after the trial | modal card |
| Demo checkout | `#checkoutModalOverlay` 5649–5662 · confirm 18523, `closeCheckoutModal` | no | a plan button | modal card, "Simulate successful subscription" |
| Teacher Dashboard | `panel-teacher` 5550–5602 · `renderTeacherDashboard` 22183, `renderTeacherRoster` 22226, `renderTeacherAssignments` 22247 | no | You hub | old `key-card`s, emoji title, dev scope note |
| Feedback | `panel-feedback` 5484–5547 | no | Profile → Settings | old form, emoji title |
| Pre-session warm-up | `#warmupOverlay` 5630–5647 · `warmupGate` 20383, `wuOpen` 20390, `wuRender` 20412, `wuStartExercise` 20435, `wuStartSong` 20447, `wuEndRun` 20501 | yes (the exercises; staged since phase 4) | before the first singing feature of the day | modal card; the stage inside is House Lights already |
| Level up / new record / breakthrough | `#levelupOverlay` 2442, `#newRecordOverlay` 2460, `#breakthroughOverlay` 2478 · `showLevelUp` 13552, `levelupWhyText` 13523, `triggerNewRecord` 13567, `triggerBreakthrough` 13582 | no | after a session | modal cards |
| Share posters | `#shareRangeOverlay` 5757, `#shareRecapOverlay` 5778 · `exportPoster` 13928 | no | Range Finder, Progress | poster card (image export) |
| Vocal Lab (Coach tool) | `panel-vocallab` 4762–4772 · `computeVocalLabTiers` 23323, `renderVocalLab` 23340 | no | Coach tab | old `journey-hero` + `key-card` |
| Also found | the splash (`#splashScreen` 2431) and the startup safety net are House Lights already; `.legacy-tabs` (2 uses) is the old nav, hidden in markup | — | — | — |

## Per screen

### Phase 8: Vocal World

#### World hub (`panel-arcade` 3013; `#arcadeHub` 3016–3059)
- Six cards: Pitch Mountain (Level 1), Register Canyon (3), Boss Arena (5), Harmony Castle (10), Vocal Skill Tree
  (always), The Vocal Rift (7). Each has emoji art (`ag-emoji`: ⛰️ 🌉 🐉 🎼 🌳 🌀), a locked card is greyed with
  "🔒 Unlocks at Level n" and still shows its best.
- **The subtitle says "Four connected locations"**; there are six. It also carries the §7 lines "real Level",
  "detection engines", "fake game bolted on".
- **The lock toast is an English template** in every language (probe: French page, "This location unlocks at Level 5.
  You're currently Level 1 — keep practicing to level up.").
- **Leaving the Rift doesn't stop or hide it.** `showArcadeHub` hides five of the six games and stops four; it never
  touches `#gameRift` or `riftActive`. Probe: after the Rift's "← Back to Vocal World", the hub is shown and the Rift
  card is still shown under it. In a live run the Rift keeps listening and timing while the hub shows, and the house
  stays down (its stage is in the active panel). Leaving the World tab does stop it (`stopAllActiveSessions`).
- Scripts: hooks (ids and keys), vq-verify/entries.js and the batch scripts open the games through these cards.

#### Pitch Mountain — Glider (`#gameGlider` 3062–3125)
- You sing to fly through gaps on a canvas; seven courses (free, melody, interval, sustain, speed, key-shift, memory),
  difficulty from the weakest Skill Profile score. House down and load counted (`singingSession`).
- Copy: the seven course taglines are English-only in every language (French leftovers: all seven), five with §7
  words ("real Lead melody", "real interval", "genuinely steady"); "Score: 0", "Best: 0", "Crashed!" are literals.
  `glider_step_label` has emoji.
- Scripts: glider-verify/flight.js and courses.js, warmup-verify/entries.js and tracking.js, batch1.js.

#### Register Canyon — Bridge Runner (`#gameBridge` 3364–3380)
- You switch chest/head voice to change lane. Reads the register input itself; its loop feeds vocal load
  (`vlFeed`), but it never calls `houseSession`, so **the house stays up while you sing** — the only singing game in
  the app without a stage.
- Copy: "REUSES … ENGINE" tag (§7 "engine"), "Score:", "Best:", "Running — tap to stop", "Wiped out!" are literals.
- Scripts: vq-verify/regfix.js, batch3a.js, entries.js.

#### Boss Arena (`#gameBoss` 3128–3239; `BOSS_TYPES` 20570)
- Eight bosses (Pitch Dragon, Sustain Giant, Range Phoenix, Agility Monster, Register Wraith, Volume Phantom, Tempo
  Golem, Tremor Serpent), each an emoji (🐲 🗿 🦅 🌀 👻 😐 🪨 🐍), plus emoji "versus" art (🐲 vs 🎤), three
  difficulties, a recommendation from the weakest Skill Profile score ("⭐ Sustain Giant is recommended…").
- **The Register Wraith reads the register input** and skips `singingSession` (20616, 20630): load is counted by its loop,
  but the house stays up for that one boss.
- Copy: the eight boss descriptions are English-only in every language (French leftovers), four with "Real …";
  `boss_choose_desc` "Same real engine, genuinely different scoring"; "Battling — tap to flee" is a literal;
  `boss_defeated_title`, `boss_rematch_btn`, `boss_step_label` have emoji. "Now practicing: Demo Hymn (C Major) —" is
  English in French.
- Scripts: vq-verify/regfix.js, batch3a.js, entries.js, batch1.js.

#### Harmony Castle — Harmony Arena (`#gameHarmony` 3242–3321)
- Pick a part, hold it while the others get louder, five levels with a random-key boss level. House down.
- Copy: four taglines with §7 words; "Singing — tap to stop" literal; 9 markup lines without `data-i18n` (the level
  and part labels).
- Scripts: warmup-verify/entries.js, batch3a.js, vq-verify/loopback.js.

#### Vocal Skill Tree (`#gameSkillTree` 3324–3333; `SKILL_TREE_NODES` 21196)
- Nothing sung: an SVG tree whose nodes unlock from measured thresholds, each node an emoji.
- Copy: `skilltree_h2`, `skilltree_desc` ("real measured threshold… nothing here is bought with XP").
- Scripts: hooks only. **Nothing checks the tree or its thresholds.**

#### The Vocal Rift (`#gameRift` 3336–3361)
- 60 s of random rounds (pitch, interval jump, sustain hold, quick catch). House down.
- Broken: the back link (hub, above). The start label is set to the literal 'Stop'.
- Copy: `rift_h2`, `rift_desc`, `rift_reuses_tag` (§7); "Rounds: 0", "Time: 60s" English in French.
- Scripts: warmup-verify/entries.js, batch3b.js.

### Phase 9: everything else

#### Sign up / sign in (`#authModalOverlay` 2505–2544) and "Sign in required" (`#signinRequiredOverlay` 5618–5628)
- Clean copy (35 keys, no §7, no emoji); the e-mail placeholder `you@example.com` has no `data-i18n-placeholder`.
- **Signed out, every plan button asks you to sign in to "Teacher Dashboard"** (18510 `requireSignIn('Teacher
  Dashboard')`; probe: the French title reads "Tableau de bord enseignant" from the Monthly button).
- Scripts: common.js `signUp` (every script that signs up), home.js, p8.js, entries.js.

#### Onboarding (`#onboardingOverlay` 5688–5752; 7 steps)
- Welcome, singer type, experience, what you sing, goal, priority, plan summary. Small eyebrow lines above the titles.
- **Steps 1–6 are English in French**: 24 markup lines have no `data-i18n` (French leftovers: every step title and
  eyebrow — "What kind of singer are you?", "Be honest — it just shapes your defaults", …, "Your plan is ready").
- Step 5 offers **Expression** as a priority, which phase 7 made "Not in your profile yet" (it isn't scored).
- §7: `ob_welcome_sub`, `ob_summary_priority_unset`, and the step 6 line "your real Day 1 baseline assessment — five
  quick real measurements, not a demo."
- Scripts: dismissed by most scripts (`clearOverlays`); **no script steps through it** (nothing clicks `obNextBtn`).

#### Language chooser (`#languageSelectOverlay` 5665–5685)
- Four names in their own language (phase 7 fix 4); `lang_select_disclosure` "Honest about scope" was listed in the
  phase 7 survey and is still there.
- Scripts: common.js `openPage` picks a language through it; fixshots7.js.

#### Plan & Pricing (`panel-pricing` 5233–5339)
- Four plans (Monthly, Yearly, Choir, Teacher), each name with an emoji (`pricing_planname_*`), the trial comparison
  rows, and a **developer disclosure on screen**: "A real version replaces this with real Stripe checkout sessions …
  (PRD §6)" — and in French it's still that line half-translated with "vraie … (PRD §6)".
- §7 in six keys (`pricing_sub`, `pricing_realnumbers_desc`, `pricing_disclosure_p3`, …), emoji in seven.
- Scripts: choir-verify/p8.js (the Choir card and the preview's link). Nothing checks the other plans or the states.

#### Paywall (`#paywallModalOverlay` 5605–5616) and demo checkout (`#checkoutModalOverlay` 5649–5662)
- **The paywall's title is the feature's internal label** (e.g. "Sonic X-Ray", "The Vocal Rift") straight from the
  calling code, English in every language; "Not now" has no `data-i18n`.
- **The demo checkout is live on production and says something false.** "Simulate successful subscription" shows
  "You're subscribed to Monthly (demo). Your vocal journey continues — nothing was lost." but the server refuses the
  plan change (migration 0006): probe on a Choir account, plan choir before, choir after confirm, choir after a
  reload. The whole modal is English markup without `data-i18n`.
- Scripts: choir-verify/paywall.js, p8.js, home.js (paywall). **Nothing covers the checkout.**

#### Teacher Dashboard (`panel-teacher` 5550–5602)
- Roster (add/remove), one assignment form (tool + note → whole roster), assignments with a tick per student. Stored
  on the teacher's own profile; students have no accounts here.
- Copy: `teacher_sub` "A real roster … not sample data", a dashed **"Honest about scope:" box with "PRD §6, Phase 1
  week 8"**, the emoji title 👩‍🏫, `teacher_ex_pitch` English in fr/es/tr.
- **Roster names and notes go into `innerHTML` unescaped** (22233): a name like `<img onerror=…>` runs in the teacher's
  own page (self-XSS; low, the data is their own).
- Scripts: **none.**

#### Feedback (`panel-feedback` 5484–5547)
- A form saved to the account. Copy: `feedback_sub`, `feedback_storage_note`, `feedback_thanks_desc` (§7), emoji
  title, 7 emoji lines (the rating faces). Scripts: **none.**

#### Pre-session warm-up (`#warmupOverlay` 5630–5647)
- Already staged since phase 4 (the exercise and song runs are a House Lights stage); the chooser card around them is
  the old style. **The mode button reads "Crazy exercises"** (`wu_mode_exercises`). `wu_done_mark` has an emoji.
- Scripts: house.js, stage.js, warmup-verify/* (entries, tracking, gate).

#### Level up, new record, breakthrough (`#levelupOverlay` 2442, `#newRecordOverlay` 2460, `#breakthroughOverlay` 2478)
- Clean keys; the level names ("Pitch Apprentice" …) come from `levelForXp` and are translated. 5 markup lines without
  `data-i18n` are defaults the code replaces (French run: none left).
- Scripts: levelup.js, home.js, p8.js.

#### Share posters (`#shareRangeOverlay` 5757, `#shareRecapOverlay` 5778)
- The range and month-recap posters (exported as an image). **No keys at all**: 14 markup lines; the recap is English
  in French ("Your voice, this month.", "day streak", "Sessions", "Widest range", "Download image", "Close").
- contrast.js reports 10 items at 1.3:1 on the recap in Light: it measures the dark overlay behind the poster, whose
  light background is a gradient image the tool can't read. On screen the text is dark on light and readable; the
  "Close" button is faint grey on the dark overlay.
- Scripts: **none.**

#### Vocal Lab (`panel-vocallab` 4762–4772)
- A Coach-tab tool (tiers from your range and scores) still on `journey-hero` + `key-card`; `vocallab_signin` §7; two
  English literals in `renderVocalLab`. Scripts: tools.js, fixshots.js (phase 4).

## Copy problems (four languages)

From `copy8.py` (per screen: its keys in en/fr/es/tr — §7 words, emoji, missing or untranslated — English in markup
without `data-i18n`, English literals in code, emoji lines) and `french.json` (what is still English with the page in
French). No key is missing a language.

| Screen | keys | keys with §7 | keys with emoji | markup w/o i18n | code literals | emoji lines |
|---|---|---|---|---|---|---|
| World hub | 37 | 11 | 1 | 5 | 0 | 6 |
| Glider | 27 | 1 | 1 | 5 | 1 | 10 |
| Bridge | 12 | 1 | 0 | 3 | 1 | 0 |
| Boss Arena | 51 | 4 | 3 | 3 | 1 | 14 |
| Harmony | 26 | 4 | 1 | 9 | 1 | 4 |
| Skill Tree | 11 | 2 | 1 | 0 | 0 | 3 |
| Rift | 20 | 3 | 1 | 4 | 0 | 1 |
| Sign in / up | 35 | 0 | 0 | 8 | 0 | 2 |
| Onboarding | 20 | 2 | 0 | 24 | 0 | 2 |
| Language | 2 | 0 | 0 | 3 (the names, intended) | 0 | 1 |
| Plan & Pricing | 72 | 6 | 7 | 0 | 0 | 6 |
| Paywall + checkout | 6 | 0 | 0 | 9 | 0 | 2 |
| Teacher | 41 | 4 | 1 | 2 | 0 | 1 |
| Feedback | 17 | 3 | 1 | 0 | 0 | 7 |
| Warm-up | 9 | 0 | 1 | 0 | 0 | 1 |
| Level up / record / breakthrough | 9 | 0 | 0 | 5 | 0 | 1 |
| Share posters | 0 | 0 | 0 | 14 | 1 | 0 |
| Vocal Lab | 12 | 1 | 0 | 0 | 2 | 0 |

The biggest English-in-French blocks: the Glider's seven course taglines, the Boss Arena's eight descriptions,
onboarding steps 1–6, the checkout, the recap poster, the Pricing disclosure, and the lock toast. The "REUSES … ENGINE"
tags on four games are developer notes on screen.

## Broken or odd (noted, not fixed)

1. **The Rift isn't stopped or hidden by the back link**: it stays under the hub and, in a run, keeps listening with the
   house down (probe + code).
2. **The demo checkout says "You're subscribed"** while nothing changes (probe); it's reachable by anyone on production.
3. **Every plan button signed out asks to sign in to "Teacher Dashboard".**
4. **Bridge Runner and the Register Wraith never go house-down** (load is counted; the stage isn't).
5. **The World lock toast, the game status lines ("Battling — tap to flee", "Flying / Running / Singing — tap to
   stop"), "Score:", "Crashed!", "Wiped out!" and the Rift's "Stop" are English literals.**
6. **"Four connected locations"** over six cards.
7. **Emoji as art** across Vocal World (game icons, 8 bosses, the versus art, Skill Tree nodes) — HOUSE_LIGHTS says no
   emoji art; the games need their own drawn marks in the game colours.
8. **The paywall title is the raw feature label.**
9. **English markup without `data-i18n`**: the checkout, both posters, onboarding steps 1–6, Harmony's levels.
10. **Teacher roster names and notes are inserted unescaped** (self-XSS, low).
11. **Developer notes on screen**: "REUSES … ENGINE" tags, Pricing's Stripe/PRD disclosure, Teacher's "Honest about
    scope … PRD §6, Phase 1 week 8".
12. **Onboarding offers Expression as a priority**, which isn't scored.
13. **Vocal Lab** (a Coach tool) is still on the old hero/card layout.
14. **The warm-up mode reads "Crazy exercises".**
15. **The curriculum text is English-only** (as its disclosure says; phase 7 left it).
16. **`.legacy-tabs`**, the old nav, is still in the markup (hidden).

## Verify coverage

| Screen | Scripts | What they check |
|---|---|---|
| World hub | hooks; entries.js, batch scripts open games through it | ids/keys; the cards open |
| Glider | glider-verify flight.js, courses.js; warmup-verify entries.js, tracking.js; batch1 | take-off, every course, the warm-up gate, load |
| Bridge | vq-verify regfix.js, batch3a.js, entries.js | the register input, load |
| Boss Arena | regfix.js, batch3a.js, entries.js, batch1 | the register boss, load, the gate |
| Harmony | entries.js, batch3a.js, loopback.js | the gate, loopback |
| Skill Tree | hooks | **nothing on the tree or thresholds** |
| Rift | entries.js, batch3b.js | the gate, load; **not the back link** |
| Sign in / up | common.js signUp (all), home.js, p8.js, entries.js | sign-up works; sign-in-required |
| Onboarding | clearOverlays (all) | **only that it can be dismissed** |
| Pricing | choir-verify p8.js | the Choir card only |
| Paywall | choir-verify paywall.js, p8.js, home.js | which features gate |
| Checkout | — | **nothing** |
| Teacher | — | **nothing** |
| Feedback | — | **nothing** |
| Warm-up | house.js, stage.js, warmup-verify/* | stage, gate, tracking |
| Level up etc. | levelup.js, home.js, p8.js | the why-line, counts |
| Share posters | — | **nothing** |
| Vocal Lab | tools.js, fixshots.js | phase 4 shots |

`shots8before.js` adds a measure of every screen filled in (states.json): the only items below 4.5:1 are the recap
poster's measurement artefact above.

## Two build phases, and how big each is

**Phase 8: Vocal World** — the hub and six games (seven screens, ~350 markup lines, ~930 lines of game code, ~185
keys × 4 languages).
- Five games become stages (house down, game colours on the stage, no emoji art): Glider, Bridge, Boss, Harmony, Rift;
  Bridge and the Register Wraith gain their house session. The hub and the Skill Tree are house up (rows like the Coach
  and Songs hubs since phases 3–6; the tree drawn without emoji).
- New drawn marks for six games and eight bosses (the largest single design item), the canvases' colours checked in
  Light and Dark.
- Copy pass: the course and boss descriptions translated, the §7 words and "REUSES … ENGINE" tags gone, the literals
  through `t()`, "Four" → six.
- Fixes: the Rift back link (hide + stop), the lock toast.
- Guards to add first: a game-states script (each game idle / live / result, house state, load fed) and the Skill Tree.
- **Size: about phase 6** (six Songs-tab tools, each a stage). Bigger in drawing (14 marks), smaller in scoring risk
  (no scoring change is needed; the games' numbers should stay equal, checked with the existing scripts).

**Phase 9: everything else** — eleven house-up screens (~500 markup lines, ~230 keys), no stage except the warm-up's,
which is already done.
- Sign in/up, sign-in required, onboarding (7 steps), language chooser, Pricing, paywall, checkout, Teacher,
  Feedback, warm-up card, level-up/record/breakthrough, share posters, Vocal Lab: the House Lights modal and panel
  styles, emoji off titles and plan names, the developer notes off screen.
- Copy pass: onboarding, checkout, posters and paywall title translated; §7 words out.
- Fixes: the plan buttons' sign-in title, the teacher escaping, "Crazy exercises", Expression in onboarding.
- **Decisions needed before it** (the user's): what the demo checkout should do on production while Stripe waits
  (hide it, or say "Coming soon"); whether the Teacher Dashboard stays (it's local-only, like the Director Dashboard
  that was hidden in phase 5); whether Vocal Lab stays a separate tool; whether `.legacy-tabs` can go.
- Guards to add first: checkout, Teacher, Feedback, posters and onboarding in a states script.
- **Size: about phase 7** (many screens, mostly layout and copy, little logic). The posters (image export) and the
  onboarding grids are the fiddliest parts.
