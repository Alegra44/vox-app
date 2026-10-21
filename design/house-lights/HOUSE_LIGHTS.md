# House Lights: the VoxCoach design system (v1.6)

v1.6 (2026-10-21, phase 4a, spec `PHASE4A.md`): the shared take stage and result, `vcTake` (generalised from Pitch Match:
target note and Hz, the lane with neighbour-note grid lines, the cents meter, the readout, the lock at |c| ≤ 6, the status
pill; then the `.vc-result` result), are the pattern for every tool scored with `captureAccuracyForTarget`. Phase 4 splits
in two: 4a moves 14 Coach tools onto it (the take tools, Range Finder and Breath Trainer on the stage, and six paper
screens); phase 4b covers the 10 tools with their own displays.

v1.5 (2026-10-13, phase 3; the spec says v1.4, which phase 2.8 had already used): Home shows current values, not "this
week" with changes (there is no week-over-week storage, and nothing gets invented). Coach rows show a tool's stored
personal best (the Personal Records values) where one exists, labelled "Best"; no per-tool "last result" is stored.
Today's focus is one shared function, `computeTodaysFocus()`, used by Home and the Coach tab. Home's pick-up rows come
from existing signals: Choir World focus, the next Vocal World unlock, Journey level and XP, and the last practice (§5).

v1.4 (2026-10-12, phase 2.8): with the house down the header and tab bar dim by colour, not opacity: every text and
icon in them, the playhead included, is `--hl-ink-3`; hover or focus within gives back the usual colours. The stage's
contrast gate (≥4.5) has no exception for them. `details.hl-measure` starts with the `hl-info` icon and shows when it's
open; a result's big number is `--hl-ink`, and when nothing was heard it isn't shown (§9).

v1.3 (2026-10-11, phase 2): the lighting hook is `houseSession(isActive, stage)` (lighting) and `singingSession(isActive,
stage)` (lighting plus `vlSidecar`); the lights go down only on a session that passes a stage in the active panel or an
open overlay; the stage re-lays out the live panel instead of covering it; header and tab bar stay at 38%; the gauge, the
break banner and the health banner stay on stage; Pitch Match dims for the whole take; the warm-up overlay is always a
stage; results use `.vc-result` (§9).

v1.2 (2026-10-10, phase 1): font sizes on the ten-size scale (`--hl-t-*` variables, no px), 44px touch targets for
`.hl-seg` and `.hl-chip`, `.hl-seg` also matches `aria-pressed`, Light colours that were under 4.5:1 on `--hl-sunk` darkened
(ink-3, miss, warn, ok, lead, ten, bass, game-gold), `--hl-piano-white` / `--hl-piano-black`, the wordmark's mark in ink,
Archivo loaded as `wdth` 75–125 and `wght` 200–800.

v1.1 (2026-10-02) records five decisions checked against the app: the legacy tab bar stays (it is the
router), the `singingSession` lighting hook, System / Light / Dark themes, the protected script hooks, and
the Turkish `lang` fix.

This folder is the source of truth for the VoxCoach redesign.

| File | What it is |
|---|---|
| `HOUSE_LIGHTS.md` | This spec: rules, decisions, how to implement, build phases |
| `house-lights.css` | The real tokens and components. Paste into `deploy/index.html` in phase 1 |
| `house-lights-icons.svg` | The icon sprite (39 symbols; 4a added hl-fiveways, hl-mirror, hl-warmup) that replaces emoji. Paste inline in phase 1 |
| `house-lights.html` | Reference mockups of 8 screens, built from the same CSS. Open it in a browser to compare your work |
| `build.py`, `page.html` | How `house-lights.html` is generated (`python3 build.py`). Edit these, not the HTML |

The redesign changes **presentation only**. Same features, same logic, same element IDs, same
data. If a change seems to need new logic, stop and ask.

---

## 1. The concept

The app has two lighting states:

- **House lights up** (`data-house="up"`): planning, reading, reviewing. Ruled paper, ink type,
  full detail. Home, Coach landing, results, Song Lab, Microscope, Progress, Profile, Plans.
  Follows the theme: light paper, or "dusk" in dark mode.
- **House lights down** (`data-house="down"`): singing. A dark stage in every theme. Live
  instruments, Choir World rehearsal, Studio/performance, Vocal World games.

Starting to sing dims the house. Stopping brings the lights up on the full result. (The shared mic stays
open once granted, so the trigger is the singing session, not the mic itself: see §9.)

## 2. Five rules

1. **Your voice is the brightest thing.** `--hl-voice` (ultramarine) is reserved for the singer:
   the live pitch line, their range, their takes, the button that starts singing
   (`.hl-btn--sing`), the playhead on the active tab. Never use it for anything else.
2. **Lights down to sing, lights up to learn.** While singing, show only the target, the voice
   line and how far off it is. Scores, history, explanations and secondary buttons appear only
   after stopping.
3. **Paper is ruled, not boxed.** Hairline rules (`--hl-rule`), not cards. At most one raised
   block (`.hl-raised`) per screen: the thing to do now. Don't recreate `key-card`.
4. **The coach has its own voice.** `.hl-coach` (Spectral italic) only for the coach talking to
   the singer, in one or two sentences. Data is always Archivo.
5. **Measured, or not shown.** Every number must come from an existing measurement. The method
   is explained once per screen in `<details class="hl-measure">`, never in body text.

## 3. Tokens (all in `house-lights.css`)

- **Type:** Archivo variable (`wdth` 75–125, `wght` 200–800) and Spectral italic 400/500, from
  Google Fonts: `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,200..800&family=Spectral:ital,wght@1,400;1,500&display=swap`.
  Remove Fraunces, Inter and Space Mono.
- **Sizes:** only the ten `--hl-t-*` sizes. No half pixels. Most text is 14 or 16.
- **Widths:** `--hl-w-wide` (112%) for titles and numbers, normal for reading,
  `--hl-w-condensed` (82%) for uppercase labels.
- **Space:** `--hl-s1`…`--hl-s8` (4, 8, 12, 16, 24, 32, 48, 64).
- **Radius:** `--hl-r1` 2px (keys, chips), `--hl-r2` 6px (buttons, panels), `--hl-r3` 14px (sheets only).
- **Colour:** semantic tokens only (`--hl-bg`, `--hl-raised`, `--hl-sunk`, `--hl-rule`,
  `--hl-ink`, `--hl-ink-2`, `--hl-ink-3`, `--hl-voice`, `--hl-voice-soft`, `--hl-lock`,
  `--hl-miss`, `--hl-warn`, `--hl-ok`, `--hl-game-gold`). Parts via `data-part="sop|lead|alto|ten|bass"`,
  which sets `--part`. No literal colours in component rules.
- **Motion:** `--hl-d1` 120ms, `--hl-d2` 200ms, `--hl-d3` 320ms, `--hl-d-house` 640ms;
  `--hl-ease`, `--hl-ease-house`. Respect `prefers-reduced-motion` everywhere.

`data-house` goes on `<body>` or on a panel, **never on `<html>`** (it would lose to the theme
selectors). A house-up block inside a stage (e.g. a result sheet) can set `data-house="up"`.

## 4. Components (class names in `house-lights.css`)

| Need | Use | Notes |
|---|---|---|
| Start singing | `.hl-btn .hl-btn--sing` | Only for actions that open the mic |
| Other main action | `.hl-btn .hl-btn--ink` | One per screen |
| Secondary | `.hl-btn`, `.hl-btn--quiet` | |
| Play, pause, stop, record | `.hl-transport` (+ `--primary`, `--rec`, `--s`) | Round, never a text button |
| Solo, mute, loop, a cappella | `.hl-key` with `aria-pressed` | LED shows state |
| Volume, guide level | `input.hl-fader` (+ `data-part`, `--val`) | Replaces plain range inputs |
| Level meters | `.hl-meter > i` with `--val` | |
| Switch a view | `.hl-seg` with `aria-selected` | |
| Filter | `.hl-chip` with `aria-pressed` | Not for actions |
| Lists of tools/items | `.hl-list` + `.hl-item` rows | Icon, title, meta, last result, chevron |
| A number with change | `.hl-stat` | |
| Song sections | `.hl-mark` | Only for real sections (A, B, C…) |
| Loading | `ol.hl-steps` with `data-state="done|active"` | Words, not spinners |
| Empty | `.hl-empty` | What it is, why, one action |
| Error | `.hl-error` | Plain message, retry, technical details folded |
| Method note | `details.hl-measure` | One per result screen |
| Main tabs | `.hl-tabbar` + `.hl-tab[aria-current=page]` | |
| Icons | `<svg class="hl-icon"><use href="#hl-NAME"/></svg>` | Names in `house-lights-icons.svg` |

The mockups in `house-lights.html` use extra `m-*` classes. Treat those as the per-area styles
to recreate (with `vc-` or area prefixes), not as a library.

## 5. Area personalities

| Area | Lighting | Rule |
|---|---|---|
| Home | Up | Date and plan, greeting, one coach sentence, **one** raised "Today's focus" block (`computeTodaysFocus()`) with one start button, the current numbers (range, pitch, agility, breath: no weekly changes, none are stored), "pick up" rows from existing signals (Choir World focus, the next Vocal World unlock, Journey level and XP, the last practice) |
| Coach tab | Up | Today's focus (`computeTodaysFocus()`, the same as Home), then the 23 tools as 7 groups of `.hl-item` rows; a row ends with "Best {value}", the stored personal best from the Personal Records list (`personalRecordValues()`), where one exists. No per-tool last result is stored, so none is shown |
| Instruments while singing | Down | Target note, pitch lane, cents meter, stop. Nothing else |
| Instrument results | Up | One big number, the take's chart, 2–3 dimension rows, "What to work on next" + a Next button, "Sing it again", `hl-measure` |
| Choir World rehearsal | Down | Five lanes in part colours, singer's part bold, voice line on it, rehearsal marks, guide level as a fader with the 5 real levels as detents, transport, trainers behind one button |
| Song Lab | Up | Score header (key · chords · level · traits), Song DNA's 4 dimensions as bars, Sonic X-Ray as a dark lightbox (`data-house="down"` inset), Microscope as a table |
| Performance / Studio | Down | Timecode, red tally, input meter, stop. No scores until the take ends |
| Vocal World games | Down | Most expressive area: game colours, `--hl-game-gold` rewards, more motion, still tied to the voice. No emoji art |
| Progress / Passports | Up | Range over time, skills that moved, Day 1 vs today |
| Plans, account, teacher, feedback | Up | Plain and clear |

## 6. Navigation

- Tabs stay: Home, **Coach** (was Train), Songs, World, You. Keep `data-shell` values and routing
  (`data-shell="train"` stays). Restyle the existing tab bar (`.shell-bottomnav`, `.snb-item`) and add
  `hl-tabbar` / `hl-tab` alongside the old classes. **No new `<nav>` element anywhere.** No verify script
  matches the visible "Train" label today (checked 2026-10-02); grep `scripts/` again before the rename.
- Header: wordmark + avatar initial only. Streak and level move into Home. Signed out: "Sign in".
- Songs: Choir World first ("continue your rehearsal"), then the solo song tools.
- Choir World song page: a sub-navigation (Rehearse · Song Lab · Trainers · Your Choir · Passport)
  that shows/hides the **existing** sections. Keep every element ID.
- Every result ends with one "Next" action chosen from existing signals, plus "Sing it again".
- Group overlaps without removing anything: the five progress screens under You; Smart Warmup
  and the pre-session warm-up become one warm-up (decide the merge in that phase, ask first).
- **The hidden legacy tab bar (`nav.tabs.legacy-tabs`) stays. Never remove it.** It is the router:
  `enterPanel()` opens a panel by clicking `.legacy-tabs button[data-panel=…]`, so every
  `data-enter-panel` button depends on it. No verify script clicks it directly.

## 7. Copy

- Coach lines: one or two sentences, what happened then what to do, with real notes, bars, seconds.
- Never in user-facing text: "real", "really", "genuinely", "honest", "not a demo", "fake",
  "PRD", "§", engine or API names (GainNode, autocorrelation…).
- Remove the developer note shown under every screen ("Autocorrelation-based pitch detection…
  the new SIGNAL shell… described in the PRD").
- Method explanations move into `hl-measure`.
- Every changed string is updated in **en, es, fr and tr** through the existing `data-i18n`
  keys. Don't leave a language behind.

## 8. Decisions already made

- **Themes become System / Light / Dark** (today the app has `default`, `cyberpunk`, `aurora` and
  `velvetopera`, and no light theme). Use the existing `data-theme` on `<html>`: `light`, `dark`, or
  absent = System (follows `prefers-color-scheme`). Mapping of stored `localStorage.theme` values:
  `default` → System; `cyberpunk`, `aurora`, `velvetopera` → Dark. New users get System.
- **Turkish uppercase (phase 1):** set `document.documentElement.lang` to the active language on load
  and on every language change, so CSS-uppercased labels use the right rules. Verify that Turkish
  uppercase labels show İ, and mark the roadmap's "Page `lang` stays `en`" entry fixed once it's live.
- Part colours: Alto sand → rose, Bass red → moss. Red means a missed note or recording only.
- Tuner lock: the target fills with the voice colour (`--hl-lock`) instead of turning teal.
- Phase 1 remaps the legacy variables (`--bg`, `--surface`, `--surface-raised`, `--hairline`,
  `--cream`, `--muted`, `--brass`, `--brass-dim`, `--teal`, `--coral`…) to House Lights values,
  so screens not yet rebuilt still match.
- Instrument Lab, AI Conductor and analysing uploaded songs are **not** part of the redesign.

## 9. Implementation rules

- `deploy/index.html` stays one file. Add `house-lights.css` as a clearly marked block in the
  existing `<style>`, and the icon sprite right after `<body>`. It is the only client (the old
  `voxcoach-prototype.html` mirror was deleted on 2026-10-02).
- **Never change or remove an element ID, `data-i18n` key, `data-panel`, `data-shell` or
  `data-enter-panel` value.** The verify scripts depend on them. Add wrappers and classes instead.
- **Protected script hooks.** The verify scripts also depend on these classes and visible strings
  (found by scanning `scripts/` on 2026-10-02). Restyle the existing elements and add `hl-` classes
  alongside the old ones; never remove or rename these:
  - Classes: `.snb-item[data-shell]`, `.shell-bottomnav`, `.panel.active`, `.vl-gauge-val`,
    `.vl-gauge-fill`, `.vl-disclaimer`, `.rh-level-name`, `.rh-level-pct`, `.arcade-game-card`, `.vq-row`,
    `.record-row`, `.record-val`, `.step-label`, `.yc-row`, `.pr-report`, `.why-detail`, `.hub-category-card`,
    `.cw-hub-feature`, `.cw-lock-only`, `.achievement-card`, `.app-toast`, `.toast`, `.fine-print`,
    `.scale-dot`, `.j-title`, `.j-sub`, `.active`.
  - Visible strings (English): "In tune" and "Listening…" (Real-Time Feedback pitch row, Tuner `#centsDisplay`), "In key" (Stay in
    Key), "Steady" (RTF breath row), "Pushing" (RTF register row), "Head" / "Mixed" / "Chest"
    (resonance), "Speaker bleed detected" (`#ttResults`), "Fits comfortably in your captured range" /
    "Outside part of your captured range" (Song Difficulty), "Recording" (recorder button while
    recording), and the "Songs" tab label (matched as `.shell-nav button, nav button` with that text).
  - Attribute values read by scripts: `data-rd-part`, `data-boss-type`, `data-boss-difficulty`,
    `data-glider-mode`, `data-glider-difficulty`, `data-game`, `data-hm-stage`, `data-hm-guess`,
    `data-profile-lang`.
- **Before any copy change, grep `scripts/` for the old string.** If a script matches it, change the
  script and the copy in the same commit and say so in the phase report.
- Move inline `style=""` attributes into classes as each screen is rebuilt (750 today).
- **Lighting hook (v1.3, phase 2): `houseSession(isActive, stage)` and `singingSession(isActive, stage)`.** There is no
  common mic start/stop to hang it on: `initAudio()` opens the shared `micStream` once and never closes it, and the
  register input and Voice Quality capture open their own streams. Instead:
  - `houseSession(isActive, stage)` does the lighting. `singingSession(isActive, stage)` is `houseSession` plus
    `vlSidecar(isActive)` with the same predicate, and returns `vlSidecar`'s promise. `vlSidecar` itself is unchanged.
  - **A stage is required for the lights to go down.** They go down only while a session's `isActive()` is true and its
    stage sits in the active panel (or in an open overlay); the newest session's stage is the live one. Without a stage,
    nothing changes on screen. Lights come up 600 ms after no session is active, through the `.hl-dimmer`;
    `stopAllActiveSessions()` brings them up at once.
  - **The stage re-lays out the live panel; it is not an overlay.** Everything else in the panel is hidden
    (`data-offstage`), the stage's ancestors lose their card chrome (`data-stage-path`), and the stage becomes a centred
    column. Reason: the verify scripts check that buttons stay topmost and that the vocal-load gauge stays displayed while
    singing.
  - The header and tab bar stay on the stage and still work: leaving stops the session, as today. They dim by colour
    (v1.4), not opacity: every text and icon in them is `--hl-ink-3`, the wordmark, its mark, the active tab and the
    playhead included, so on the stage only the singer's own voice is in the voice colour. Hover or focus within gives
    back the usual colours.
  - Allowed on the stage besides the singing controls: the vocal-load gauge, the Vocal Load break banner (`#vlBreak`) and
    the vocal health banner. They are safety signals. Anything else that must stay takes `[data-keep-on-stage]`.
  - Pitch Match dims for the whole take (reference tone, cue and singing), not only while listening.
  - The 34 `vlSidecar(...)` call sites become `singingSession(...)` with the same predicate; only the Tuner and Pitch
    Match pass a stage in phase 2. Features that sing without `vlSidecar` (Register Coach, Voice Quality, Studio, Your
    Choir recording, part rehearsal, some games) get their call in the phase that rebuilds them.
  - The pre-session warm-up overlay is always a stage (`data-house="down"` on `#warmupOverlay`).
  - Results use one reusable pattern, `.vc-result`: a big number, a label, one coach sentence, the take's chart,
    dimension rows, and `details.hl-measure` last, on paper. The number is `--hl-ink` (no good / mid / low colour: the
    coach line and the confidence row carry the meaning); when nothing was heard there is no number. Chart axis labels
    render at 12 px whatever the chart's width.
- No new dependencies. Fonts come from Google Fonts as today.
- Keep performance: the voice line already draws per frame; don't add continuous animations on
  paper screens; pause anything that animates when it's off screen.

## 10. Build phases

Each phase: build → run **every** existing verify suite that touches the screens changed (and
the batch harnesses) → screenshot the changed screens at 390px and 1280px in Light and Dark →
report back → wait for approval → deploy with approval → verify on production. One phase at a
time. Phases start only after `wip/noise-gate` and `warmup` are merged into master.

1. **Foundation:** fonts, `house-lights.css`, icon sprite, legacy variable remap, header, tab
   bar (icons, "Coach" label, playhead), developer note removed, emoji replaced in the shell and
   tab bar, theme choice reduced to System / Light / Dark (with the §8 mapping), `<html lang>` set
   from the active language.
2. **Lighting:** `houseSession` / `singingSession` and the `data-house` watcher (§9), dimmer, the singing layout and the results layout
   as reusable patterns, applied first to the Tuner and Pitch Match only.
3. **Home and the Coach tab.**
4. **Vocal Coach tools**, one group at a time, onto the singing and results layouts. 4a (v1.6): the 14 tools on `vcTake`
   and paper; 4b: the 10 tools with their own displays.
5. **Choir World:** song page sub-navigation, rehearsal stage, Song Lab with X-Ray lightbox and
   Microscope, the mixer as channel strips.
6. **Performance:** Studio as the stage; the Performance Report.
7. **Progress and identity:** You hub, Journey, Dashboard, Records, both Passports, Voice
   Health, Profile.
8. **Vocal World games.**
9. **Everything else:** onboarding, sign-up, Plans, Teacher, Feedback, remaining copy in all
   four languages, all remaining emoji.
10. **Final pass:** motion, tablet/desktop layouts, accessibility (contrast, focus, touch
    targets, screen reader labels, reduced motion), screenshots of all 46 screens in both
    themes, the full verify run on production.
