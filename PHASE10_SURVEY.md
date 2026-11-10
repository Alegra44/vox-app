# Phase 10 · part A survey

Branch redesign/phase10. Master is phase 9, live as dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H, which is the rollback target. Part A runs
from c22e1e3 (PHASE10.md) to this commit. Nothing outside A1 is fixed. The proposed fixes are at the end, grouped by size.

## At a glance

| Audit | Count |
|---|---|
| a) Tour | 103 screen-states (86 screens) × 6 combos = **618 shots**, 0 open errors, 0 page errors; 24 contact sheets |
| a) 768 | **3 screens break or look unfinished** at 768 (Plans and its 4 sheets; Progress; Home gutters), plus 1 bug at every width |
| b) Rule 1 | voice colour on **39 screens**; **21 elements not allowed** (plus the warm-up's Stop, which you already know about) |
| c) Targets | **107 distinct controls** under 44 × 44 on **76 screen-states** (208 instances at 390 Light); 7 CSS classes cover 90 of them |
| d) Names | **17 unnamed** (12 svg graphics, 2 selects, 2 level buttons, 1 skill-tree icon); **7 aria-labels hard-coded in English** |
| e) Focus | 0 invisible, 0 hidden; **5 sheets lose or never take back focus**; **4 sheets with a stale trap**; **9 sheets without a trap** |
| f) Reduced motion | 0 animations running; **9 transitions over 0.01 s** still declared, on 35 screens |
| g) Leftovers | 15 of 17 legacy variables still used (592 `var()`s), visible on 98 screen-states; **397 CSS rules match nothing** (117 dead candidates, 280 that need a state); copyscan --all 0 |
| h) Branches | **15 merged** (to delete in B), **7 unmerged** (kept) |

## A1 · known items (done, one commit each)

| Commit | Item |
|---|---|
| d5681a8 | **.legacy-tabs** removed: the nav and its 41 buttons, the `nav.tabs` CSS, the click handler and two lines in showPricingPanel and the reweight legend. `enterPanel` now calls `showPanelByName()`, which holds the per-panel hooks the click handler used to run. enterPanel was compared on all 46 panels, master against the branch: identical. hooks.js allows the removed ids, and screens9.js's teacher check no longer reads the nav. `renderTeacherDashboard()` is now never called. It's left in place as a B candidate, since Teacher is hidden. |
| 09c99ae | **Daily Exercises · Today's Recommended Focus**: the text went from 16 px to `--hl-t-small` (14 px, the same as the page subtitle), colour `--hl-ink-2`. The title is `--hl-t-body` / `--hl-ink`, with **600 on the title span only**, so the "Adaptive" tag beside it stays as it was. |
| 8d5f4c2 | **Smart Warmup**: "(3 s)". Three other durations still have no space, all built in code (B, small): the record values ("12.4s", records and Breakthrough), the weekly challenge's "x.xs / 20s", and the rehearsal chord times "…s–…s". |
| 6c2862a | **English dates follow the device's region**: `dateLocale()`. Month-day only for en-US or a device without a region. Day-month for every other region: en-GB, en-IN, en-AU, en-IE, en-NZ, en-ZA… use their own locale, and en-CA and en-PH fall back to en-GB because Intl writes them month first. It's used at all 11 date sites. French, Spanish and Turkish are unchanged. datelocale.js checks 11 device languages. |
| 36323ac | **80 unused i18n keys** removed from en, fr, es and tr (2160 → 2080 each), list below. unusedkeys.js counts a key as used when it appears as a token outside TRANSLATIONS, or when it belongs to a family the code builds from strings. A family is a literal prefix plus an expression with its literal suffix (`'voicetype_' + x`, `'rhythm_' + tempo + '_btn'`, `` `levelup_${k}_${one}` ``, a ternary's `'key_rank_up_' : 'key_rank_down_'`). The 151 keys found only through a family were checked by hand and kept. |
| be808c3 | **Scale Run's step dots** (.scale-dot, 4.42:1 in Light): contrast.js now measures them as graphics against 3:1 (WCAG 1.4.11), flagged `nonText`. The colour is unchanged. One caveat: the dots carry the step number in 11 px text, so they are graphics that also hold a number. If that number counts as text, the dot should go to 4.5:1 (B, small). |

The 80 removed keys:

    theme_default theme_cyberpunk theme_aurora theme_velvetopera hub_you_teacher_desc staykey_tag emotion_tag
    boss_choose_desc boss_choose_h2 boss_reuses_tag boss_step_label bridge_h2 bridge_reuses_tag bridge_step_label
    hub_songs_rehearsal_desc hv_hint ac_btn_off ac_btn_on rehearsal_playing_btn dashboard_skillprofile_desc
    dashboard_skillprofile_h2 dashboard_todaysplan_desc dashboard_todaysplan_h2 glider_course_desc glider_step_label
    harmony_hold_h2 harmony_overall_desc harmony_part_alto_tag harmony_part_bass_tag harmony_part_lead_tag
    harmony_part_soprano_tag harmony_part_tenor_tag harmony_reuses_tag harmony_step_label pricing_continue_teacher_btn
    rift_desc rift_h2 rift_reuses_tag rift_step_label skilltree_desc skilltree_h2 skilltree_step_label
    record_label_keychange record_label_song_score record_note_keychange record_note_song_score action_go
    boss_recommend_p1 boss_recommend_p2 bridgerunner_wipedout dash_recap_suffix game_score_p1 glider_coins
    glider_crashed registercoach_beststat_p1 rift_avg_p1 rift_rounds_completed rift_rounds_p1 rift_time_p1
    weeklychallenge_you pd_dim_technique pd_insight_prefix skilltree_current skilltree_bestcrossing
    passport_updated_prefix passport_updated_suffix voicecard_nottracked feature_vocal_journey feature_boss_battle
    feature_register_runner feature_harmony_arena feature_vocal_rift arcade_pro_level_template arcade_trial_included
    arcade_unlocks_at_level_template studio_recording_label studio_no_gamification studio_session_title
    cw_trainers_label rhythm_running

## A3 · checks for A1

checks10.sh a3 on c0a7b5f: every check passed.

- hooks: 21 passed
- unusedkeys: 0 unused
- datelocale: PASS
- copyscan --all: 0 §7 words, 0 emoji, across 4 languages
- bootcheck: 9 passed
- navcheck: 20 passed
- home: 102 passed
- warmup-entries: 52 passed (the first run hit a sign-in timeout, and its rerun passed)
- warmup-tracking: 29 passed
- states9: master and the branch equal
- contrast: 0 under 3:1 and 0 at 3–4.5:1 in Light and Dark; 1 unknown per theme, the same as on master

The scripts that touched .legacy-tabs were hooks, navcheck and states9 (screens9's teacher entry), and all three are in that list.

## A2 · audits

The tooling is tour10.js (the tour plus audits b, c, d, e, f and g, each run in the page) and sheet10.js (the contact sheets).
The shots, contact sheets and audit.json are on review/phase10.

**How the tour opens screens.** Panels open through `enterPanel` or `showShellSection`. Hubs and Vocal World are shown signed out, new and active, and every other panel active. The six worlds open through `showArcadeGame`. Every sheet uses the same opener as screens9 (phases 8 and 9).

**What's skipped.** Teacher, panel and sheet: nothing opens it since phase 9.

**Limits.** The tour sees each screen at rest. A running exercise, a game in play, results and the warm-up while it's singing aren't in it. Those states were covered by shots8 and states9, and they bear on b and f.

### a) The tour, and 768

There are 24 contact sheets, `review/phase10:tour/sheets/tour-<width>-<theme>-<n>.jpg`. Read at 768 in Light and Dark, every screen keeps the phone layout stretched to 720 px, with the tab bar at the bottom (the desktop top bar starts at 960). Nothing overflows sideways or overlaps. These do break or look unfinished:

1. **Plans** (panel-pricing and the sheets pricing-signedout, pricing-new, pricing-expired, signinplan): the four plan columns squeeze into 720 px at about 160 px each.
   - Each button ("Continue with Monthly"…) wraps to two lines, and "Coming later" sits lower than the other three.
   - Choir / Studio's list runs twice as long as the others.
   - The subtitle wraps early and leaves "it." on its own line.
   - At 768 the plans want two columns × two rows.
2. **Progress** (panel-dashboard):
   - Unified Progress's chart scales with the width and comes out 670 × 270 px: mostly empty space around 5 dots.
   - Today's Plan is broken at **every width**, including 390 and 1280. Each step (icon, title, line, chevron) is centred in its row, and a rule runs down the left of steps 2 and 3 only. It reads like an unstyled leftover of the old plan stepper.
3. **Home** (every state): the column has 64 px gutters at 768, against 24 px on every other screen. Moving from Home to Coach makes the content jump sideways.
4. **Stretched but not broken:** the Coach tools' stage cards (Emotional Singing, Stay in Key, Vibrato, Voice Quality, Resonance, Mirror…) are 720 px wide around a small centred meter and button. Choir World's mixer strips stack Mute above Solo. Neither looks broken, but they're wide and empty. A max-width of about 600 px on `.vc-stage` at 600–959 px would tidy them.

### b) Rule 1: the voice colour

Voice colour appears on 39 screens. The audit found 53 distinct elements whose colour, background, border, fill or stroke equals `--hl-voice` (#2633D9 Light, #7F8CFF Dark).

**Allowed (32).**
- Start-singing buttons (28): the `.mic-btn` / `.vc-take-pill` starts on every Coach tool and world, Listen & score, Record and Begin the performance.
- The singer's trace or range:
  - Part Rehearsal's `path.cw-voice`;
  - the range bars `#dashRangeFill` and `#rangeFill`;
  - the range poster's keys `.pk-w.on` and `.pk-b.on`.

**Not allowed (21), by screen:**

| Screen | Element | What it is |
|---|---|---|
| Home (new, active), Live Tuner, Range Finder, Exercises, Register Coach, Register Drills and 22 other screens | `.vl-gauge-fill` (also `#vlGaugeFill`) | the **Vocal load today** bar's fill (28 screen-states). It's a budget meter, not the voice |
| Vocal Lab (panel and sheet) | `.vlab-seg` | the bar segments of a Vocal Lab row |
| Daily Exercises | `.mock-tag` (text and border) | the "Adaptive — recalculated daily" tag |
| Daily Exercises | `.rw-seg` (Range 14 %) and its legend dot `.rl-dot` | Range's share of the Recommended Focus bar: Range's category colour is the voice colour |
| Progress | `#unifiedTrendSvg` path and circles, the `.dash-key--pitch` legend | the Pitch history line: a record, not the live trace |
| Breath Control | `#breathRingFill` | the hold ring (a live measure of the singer, but a ring rather than a trace: **borderline**) |
| Hear the Mistake | `#hmStartBtn` "Play A and B" | a listening button styled as a start-singing button |
| Mirror Mode | `#mirrorPlayBtn` "Play a new phrase" | the same as Hear the Mistake: it plays and doesn't listen (**borderline**: singing follows straight after) |
| Vocal Passport | `#passportFingerprintSvg` polygon, circles and the "77%" text | the voice fingerprint chart |
| Choir Passport | `#cpDnaSvg` polygon | the song DNA chart |
| Choir Passport | `.record-val.hm-held` "95%" | a record value (through `--teal`) |
| Part Rehearsal | `.rd-part` "Alto (you)" | the singer's part name in the readiness list (through `--teal`) |
| Part Rehearsal | `.rh-note-iv` (twice) | interval labels "−5 · Perfect 4th" (through `--teal`) |
| Part Rehearsal | `#bmLive` | Breath Map's live line of text (through `--teal`) |
| Skill Tree | `circle.st-node-bg.next` | the next node's ring (through `--teal`) |
| Smart Warmup sheet | Stop | known; the tour doesn't reach it because the warm-up isn't running |

Five of these get the voice colour from the legacy `--teal` (see g). Removing `--teal` fixes those five.

### c) Touch targets under 44 × 44

The audit found 107 distinct controls on 76 screen-states. Links inside running text are left out. Seven classes cover 90 of the 107, so one CSS rule per class fixes most of them:

| Class | Height | Distinct controls | Where |
|---|---|---|---|
| `.mic-btn` / `.vc-take-pill` | 41 px | 30 | every start button (Coach tools, worlds), Download my Voice Card, Open Breath Trainer |
| `.solid-btn` | 34 px | 13 | Play (Smart Warmup ×3), Mark warmup done, Play note, Recommend a key, Share my recap, Set as my genre, Generate my challenge, Open Choir World (Songs hub) |
| `.hl-key` | 36 px | 13 | Choir World's MUTE and SOLO (44 × 36), LOOP, A CAPPELLA, HEAR ME |
| `.ghost-btn` | 36 px | 10 | Mark done, Reset my 21-day journey, Play major scale, New note, Give Feedback, Sign out, Erase my progress, Open Choir Passport |
| `select` | 35 px | 8 | Key Trainer's six selects, Custom Challenge's two (39 px) |
| `.hl-fader` | 28 px | 6 | the 5 choir faders, Part Rehearsal's level fader |
| `.ex-type-btn` and `.hl-chip` | 34 / 32 px | 5 types, about 20 buttons | Level, mode and tempo rows, Profile's language row, Emotion Mode's intent chips, the Practice chips |

The rest, one by one:

| Control | Size | Screens |
|---|---|---|
| `.vc-avatar` (the account button) | 32 × 32 | every signed-in screen (66 screen-states) |
| Sign in (top bar) | 69 × 40 | signed-out hubs |
| Key Trainer's − / + | 32 × 32 | Key Trainer |
| `#playbackVolumeSlider` | 16 px tall | Profile |
| Change song (`.link-btn`) | 16 px tall, not inside a sentence | Boss Arena, Harmony Castle |
| "Already have an account? Sign in" (`#authModeToggle`) | 15 px tall | Sign-up and Sign-in sheets |

Two of the 107 are not real targets: `#choirLoopCheck`, the visually hidden checkbox behind LOOP, and `#rehearsalNextBtn`, inside a visually hidden row.

### d) Names

There are 17 controls or graphics without an accessible name, on 12 screen-states:

| Item | Screens | Fix |
|---|---|---|
| Five skill-ring `svg`s (`#ring-youSkillBars-*`) | You (new, active) | `aria-hidden`: the value is printed beside each one |
| `svg.tuner-ring` | Live Tuner, Breath Control, Stay in Key | `aria-hidden`: the note and cents are text |
| `#unifiedTrendSvg` | Progress | `role="img"` plus a summary label |
| `#karaokeRollSvg` | Karaoke | `role="img"` plus a summary label |
| `#passportFingerprintSvg` | Vocal Passport | `role="img"` plus a summary label |
| `#xraySvg` | Choir World Song Lab | `role="img"` plus a summary label |
| `svg.st-node-icon` | Skill Tree | `aria-hidden` |
| `select#customLowNote`, `#customHighNote` | Custom Challenge | their labels aren't tied to them (`for`) |
| `button.rh-level` × 5 | Part Rehearsal | name each one by its level ("Level 1: Piano guide"…). Today they hold only a dot |

There are 7 English aria-labels, the same in French, Spanish and Turkish, all hard-coded in the markup with no `data-i18n-aria-label`:

| Label | Seen on the tour |
|---|---|
| "Main navigation" (tab bar) | every screen (72 screen-states) |
| "Account setup" (onboarding) | 10 sheets |
| "Warm-up pitch trace: …" | the warm-up stage |
| "Pitch Mountain: …" | no: a canvas hidden at rest |
| "Register Canyon: …" | no: a canvas hidden at rest |
| "Loudness" (`#breathLevel`) | no: hidden at rest |
| "Your voice as particles: …" (Resonance) | no: a canvas hidden at rest |

Nothing in script sets an English label. The only i18n attribute that exists for this is `data-i18n-aria-label`, used twice.

### e) Focus

Tab was pressed 40 times on each of the 103 screen-states at 1280, in Light and Dark. The two themes give the same results. Each element is tracked by identity, and leaving the page after the last element counts as a normal wrap.

- **Invisible focus: 0. Hidden focus: 0.** Every focused element changes how it looks.
- **Panels: no issues.** Every panel cycles through its controls and the tab bar. The single "lost" step on 7 panels is the first Tab after the harness blurs: it starts at the body, so it's not a loss.
- **Sheets that don't take focus back:**
  - Smart Warmup, all 3 states: Escape closes it, but focus lands on the **body**, not on what opened it.
  - Share range and Share recap: **Escape doesn't close them**.
  - Language: Escape doesn't close it. It's the first-run choice, so this may be intentional.
  - Onboarding (10 states): Escape doesn't close it. That's by design (setup can't be skipped), so the return to the opener is only checked when it finishes.
  - Sign-in, sign-up, plans-soon, the paywalls and the three moment sheets all return focus to what opened them.
- **Sheets with no trap** (focus walks out into the page behind): Smart Warmup (3), Level up, New record, Breakthrough, Share range, Share recap and Language. These aren't opened through `openModalWithA11y`, or not every time.
- **A stale trap** in `openModalWithA11y`: it lists the sheet's controls once, when the sheet opens. When the content changes after that, Tab sticks:
  - **Sign-in** stops at "Need an account? Create one" and doesn't wrap.
  - **Plans soon** pins focus to its one button. That's correct for a single control, but it's listed for completeness.
  - **The paywall** (4 states) pins focus to "See the plans", so **Close can't be reached by Tab**.
  - **Onboarding's first step** pins focus to "Get started".

  This is one fix: build the list on each Tab instead of at open.

### f) Reduced motion

With `prefers-reduced-motion: reduce`, **0 animations run** on any screen at rest (`document.getAnimations()`). These transitions are still declared over 0.01 s:

| Transition | Element | Screens |
|---|---|---|
| width 0.4 s | `.vl-gauge-fill` (Vocal load) | 28 |
| border-color 0.12 s | `.arcade-game-card` | Vocal World, 3 states |
| stroke-dashoffset 0.6 s | the skill-ring circles | You (new, active) |
| width 0.3 s | `.rw-seg` | Daily Exercises |
| height 0.2 s | `.bar` (Practice activity) | Progress |
| width 0.4 s | `#vlGaugeFill` | Register Coach |
| stroke-dashoffset 0.08 s, stroke 0.15 s | `#breathRingFill` | Breath Control |
| stroke-dashoffset 0.1 s, stroke 0.15 s | `#stayKeyRingFill` | Stay in Key |

These are transitions only. They run when a value changes, so a meter fill visibly slides while someone sings even with reduced motion on. The tour doesn't reach running states, so live-only animations (the tuner's locked pulse, the marker pulse, the levelup ring) aren't measured here. Their rules are among the 280 "need a state" rules in g, and the global reduce rule should be confirmed against them in B.

### g) Leftovers

**Legacy variables.** There are 17 non-`--hl-` custom properties on `:root`, and **all are aliases** of House Lights tokens (index.html:329–332):

| Legacy | Alias of |
|---|---|
| `--cream`, `--text`, `--brass` | `--hl-ink` |
| `--muted` | `--hl-ink-3` |
| `--teal` | `--hl-voice` |
| `--coral` | `--hl-miss` |
| `--surface` | `--hl-raised` |
| `--surface-raised` | `--hl-sunk` |
| `--hairline` | `--hl-rule` |
| `--brass-dim` | `--hl-rule-strong` |
| `--on-brass` | `--hl-bg` |
| `--on-teal`, `--on-part` | `--hl-on-voice` |
| `--shadow` | `none` |
| `--bg-glow-1`, `--bg-glow-2` | `transparent` (unused) |

**How much they're used.**
- 592 `var()` uses: hairline 125, muted 115, cream 76, brass 75, surface 67, teal 52, coral 28, surface-raised 15, brass-dim 15, bg 5, on-brass 6, on-teal 6, shadow 4, on-part 2, text 1.
- On the tour, 103 distinct rule-and-variable pairs reach a visible element, on 98 of the 103 screen-states. The commonest are `.journey-hero .j-title`, `.key-card` (shadow: none), the Vocal load gauge, `.trial-modal-title` and `.fine-print`.

**What it means.** Nothing looks wrong because they resolve to House Lights. The cost is reading the code, and one rule-1 gap: `--teal` is the voice colour under another name, behind the five non-trace uses in b.

**Unmatched rules: 397 of 1698** (1301 matched something on at least one of the 618 shots). Each was classified by whether its classes and ids appear anywhere outside the CSS (markup, script, deploy/*.js). Classes built in code (`'done-' + x`, `` `tt-${v}` ``) count as used.

- **117 dead candidates**: a class or id in the selector appears nowhere else. The full list is `review/phase10:tour/dead-rules.txt`. Families:
  - 14 House Lights library rules (`.hl-root`, `.hl-display`, `.hl-metric`, `.hl-stack`, `.hl-sheet`…): **keep**, they belong to the design system.
  - The rest are pre-House-Lights components:
    - `.brand`, `.account-chip`, `.restart-link`, `.register-layout`
    - `.track-name`, `.vu-meter-track`, `.loop-check`
    - `.pricing-grid`, `.plan-card`, `.tier-badge*`, `.paywall-overlay`, `.paywall-lock`, `.paywall-icon`, `.trial-banner*`, `.trial-modal-emoji`
    - `.skill-row`, `.skill-bar-*`, `.skill-summary-item`
    - `.breath-timer`, `.breath-meter-*`, `.vibrato-stat-row`, `.challenge-progress-*`
    - `.week-banner`, `.week-progress-track`, `.xp-level-row`, `.xp-card`, `.snapshot-compare`
    - `.ag-emoji`, `.arcade-hud`, `.arcade-overlay-msg`, `.arcade-lock-badge`, `.boss-arena`, `.boss-emoji`, `.rift-round-*`, `.skilltree-detail` parts
    - `.cb-emoji`, `.wu-emoji`, `.hv-main`/`.hv-sub`, `.karaoke-live-line`, `.karaoke-note-chip`
    - `.onboarding-dots`, the old `.levelup-ring*` / `-num` / `-title` / `-sub`, `.cw-songmeta`, `.p9-stack`
- **280 that need a state the tour doesn't reach** (`.is-live`, `.locked-pulse`, `.flat`/`.sharp`, results, hover-only…). Keep them. Their list is `review/phase10:tour/state-rules.txt`.

**Copy.** `copyscan --all`: 0 §7 words, 0 emoji in en, fr, es and tr.

### h) Branches

**Merged into master (15)**, to delete in B: feat/levelup, feat/single-stream, fix/4b-leave, redesign/phase1, redesign/phase2, redesign/phase3, redesign/phase4a, redesign/phase4b, redesign/phase5, redesign/phase6, redesign/phase7, redesign/phase8, redesign/phase9, tests/choir-verify, wip/noise-gate.

**Unmerged (7), kept:**

| Branch | What it holds |
|---|---|
| exp/single-stream | the mic-diagnostics stream-settings experiment, 10 commits ahead of where it left master; never merged |
| review/phase1-prod … review/phase4b-prod (5) | orphans: the production screenshots of each of those deploys |
| review/phase9-prod | orphan: phase 9's production checks (prod.sh, the phase 9 checks, the sign-up probe) |

## Proposed fixes for B, by size

**Small** (CSS or markup, one place each):
1. Targets:
   - min-height 44 on `.mic-btn`, `.solid-btn`, `.ghost-btn`, `.hl-key`, `.ex-type-btn`, `.hl-chip` and `select`;
   - a 44 × 44 hit area on `.vc-avatar`, Key Trainer's − / + and the top-bar Sign in;
   - a 44 px hit area on `.hl-fader` and the volume slider;
   - padding on Change song and "Already have an account?" (c: about 100 of 107).
2. Names:
   - `aria-hidden` on the 5 skill rings, the tuner rings and the skill-tree icons;
   - `for=` on Custom Challenge's two selects;
   - names for the 5 rehearsal level buttons (d: 17).
3. The 7 English aria-labels get keys and `data-i18n-aria-label` in 4 languages (d: 7).
4. Reduced motion: transitions set to none under reduce for the 9 in f, or one global rule that also covers transitions.
5. Rule 1: the Vocal load fill, the `.mock-tag`, Range's Focus segment and dot, the Progress Pitch line and the Vocal Lab segments move to ink or category colours. Hear the Mistake's "Play A and B" becomes a plain ink button (b: 7 of 21). Mirror Mode and Breath Control's ring, the two borderline cases, are your call.
6. Durations: a space before "s" in the record values, the weekly challenge and the rehearsal chord times. Scale Run's dot number goes to 4.5:1 if you count it as text.
7. Branches: delete the 15 merged ones.

**Medium** (one function or one screen's layout):
8. Focus trap: `openModalWithA11y` builds its list on each Tab. That fixes Sign-in's stop, the paywall's unreachable Close and onboarding step 1.
9. Focus for the sheets without a trap (Smart Warmup, the 3 moment sheets, the 2 share sheets, Language): open them through `openModalWithA11y`, with Escape on the share sheets and Smart Warmup returning focus to its opener.
10. Rule 1 via `--teal`: replace its 52 uses. The voice uses stay `--hl-voice`, and the five non-trace ones (the passport charts, `.hm-held`, `.rd-part`, `.rh-note-iv`, `#bmLive`, the next skill-tree node) go to ink.
11. 768:
    - Plans in two columns × two rows from 600 to 959 px;
    - Home's gutters the same as the other screens;
    - a max-width on `.vc-stage` and the Unified Progress chart at 600–959.
12. Progress · Today's Plan: restyle the steps as a left-aligned House Lights list without the stray rule (all widths).

**Large** (wide, mechanical, needs the full checks):
13. Legacy variables: replace all 592 `var(--legacy)` with their `--hl-` tokens and delete the 17 aliases. It's mechanical, but it touches about 400 rules, so contrast, states9 and the tour need to show no visual change outside the rule-1 items.
14. Dead CSS: remove the 103 non-library dead-candidate rules after a grep pass per family. `renderTeacherDashboard` and the rest of the Teacher-only code go too, if Teacher stays hidden.
