# The warm-up survey (phases 3–7)

Branch `survey/warmup` from master (b08a3ca, release D live). No app changes. The step, from the user's message of
2026-11-21, verbatim:

> 2. THE WARM-UP SURVEY (phases 3–7), no app changes. Branch survey/warmup from master. Save this step as design/warmup/WARMUP.md and commit it first.
> - What the daily warm-up keeps today: per day and per exercise (the four glides and the song warm-up), what's measured, what's saved and where, and the XP it gives.
> - Smart Warmup (the Coach tool): what it does, what it saves, its XP, and where it overlaps with the daily warm-up.
> - The Vocal Load break banner behind the warm-up screen: reproduce it with a screenshot and say why it happens.
> - Phase 9's level-up sheet: what "level-up transparency" still lacks, if anything (is every XP source named in the why-line?).
> - Proposals, each with a 390 mockup in House Lights: a summary at the end of the warm-up with only measured things (range reached, how closely each glide was followed, one coach line) and the one next step it suggests from what it measured; a warm-up streak of its own (where it shows, how it differs from the practice streak); one warm-up instead of two (Smart Warmup and the daily warm-up as one set of exercises, one XP rule, once a day); the banner fix. Teacher visibility is skipped while the Teacher Dashboard is hidden; say so.
> - Secret check, push survey/warmup.

Standing rules from the same message: AC power, the run lock and time limits on; nothing merges, deploys or touches
production (the local stack only).

## How it was measured

Master's app (`deploy/`, b08a3ca) on the local stack, a throwaway account per script (deleted at exit), Chromium's file
mic playing a C4 tone (silent). Scripts in `scripts/warmup-verify/`: `keeps.js` (items 1–2: the same snapshot of the
server row, today's vocal-load rows, localStorage and the warm-up's memory after every step → `keeps.json`),
`bannerbehind.js` (item 3 → `shots/banner-*`), `whyline.js` (item 4 → `whyline.json`), `mockups.js` (item 5 →
`shots/mock-*`: the real page with the proposal's markup put in, House Lights classes and tokens only; the numbers in them
are examples). Logs in `logs/`. 2026-11-21 23:55 – 11-22 00:03 IST.

## 1. What the daily warm-up keeps today

The pre-session warm-up (`wuOpen`, deploy/index.html ~21490–21700): offered before the day's first practice session
(`warmupGate`, called by the shared mic openers), once per account and local day.

| exercise | what it asks (p = a fraction of your range: the stored range, or A2–C5) | measured while it runs | kept after |
|---|---|---|---|
| Lip trills | ±2 semitones around p(0.35), a 3 s wave | the pitch every frame (autoCorrelate) moves a dot (Glider's `glideFollow`) along a dotted guide; a 20 s countdown from the first voiced frame | nothing from the trace (the trail holds the last ~2 s for drawing and is dropped at the end); 1 vocal-load row |
| Sirens | p(0.1) → p(0.9) and back, 5 s | same | same |
| Sustained glides | p(0.25) → p(0.6) and back, 8 s | same | same |
| Humming | one note, p(0.35) | same | same |
| Song warm-up | any song on Karaoke's roll with the backing pad (hymn: 26.7 s) | the live cursor, coloured by ±25 ct from the note | 1 vocal-load row |

Measured (`keeps.json`), per step:

- **Each exercise / song:** one `vocal_load_sessions` row on the server (20.1 s active, load 38.7 for an exercise; p5 and
  p95 MIDI). Nothing else: XP 0, sessions 0, history 0, streak and `warmups_completed` untouched, no timeline event.
- **Per day:** `localStorage["warmup:<user id>:<local day>"]` = `done` (Start my session) or `skipped`. **This device only**:
  another device, or cleared site data, offers the warm-up again the same day. Nothing on the server says you warmed up.
- **XP: none**, done or skipped. The session it leads into gives its own.
- "Done" means one exercise or song finished; how well the line was followed is never computed.

## 2. Smart Warmup (Coach → Smart Warmup)

`renderWarmupContext` (~20530–20590):

- **What it does:** a context line (morning / midday / evening; "you haven't practised for N days" from 2 days; "lean
  toward <your weakest Skill Profile category>"; your genre) and three steps, each a **Play** button that plays a
  reference sound: 1. a siren from your low note up 7 semitones (3–4.5 s by time of day), 2. **the same siren** (hum it),
  3. a 5-note pattern (your genre's, or a beginner pattern). It never opens the mic (0 getUserMedia calls), so nothing is
  measured and nothing goes into vocal load. The weakest-category line changes no exercise; only the text.
- **What it saves:** "Mark warmup done": `warmups_completed` + 1, today's daily warm-up marked done on this device (so the
  pre-session one isn't offered), and `recordActivity()`: **+5 XP, +1 session, +1 history, the streak day**.
- **No limit:** measured, three clicks on one day = +15 XP, 3 sessions, 3 warm-ups. It needs no singing.
- **Overlap with the daily warm-up:** the same idea twice (sirens and a hum on your range). Smart Warmup is the one with
  XP and a counter but measures nothing; the daily warm-up has live tracking and vocal load but no XP and no counter. The
  level-up why-line's "warm-ups" are Smart Warmup clicks only. Smart Warmup's done mark silences the daily one; the
  daily one's done does nothing to Smart Warmup.

## 3. The break banner behind the warm-up

Reproduced (`bannerbehind.js`, 12/12): a user already at 85 % of today's vocal-load budget (seeded as stored sessions, as
if sung on another device) opens the Tuner, the warm-up overlay comes first, and a siren starts.

- The banner (level 80) is displayed, in **panel-tuner**, under the overlay (z-index 120): the point on it belongs to
  the overlay at 1280 and 390. After Skip it is visible in the Tuner. Shots: `shots/banner-behind-390.png` (what you
  see), `banner-behind-390-underneath.png` (the overlay hidden for the shot only), `-1280`, `banner-after-skip-*`.
- **Why:** the warm-up's exercises feed vocal load (`singingSession` → `vlSidecar`), so `vlCheckBreak` runs while you
  warm up, and `vlPlaceBreak` always puts the banner in `section.panel.active` (under its title). The active panel is the
  feature behind the warm-up; the warm-up is a modal over it. So the break advice arrives while you're singing in the
  warm-up and stays hidden until you leave it.

## 4. Phase 9's level-up sheet: what the why-line still lacks

The why-line names counter changes since the last level-up (records, breakthroughs, Boss wins, curriculum days,
sessions, warm-ups, the streak), not XP. Each XP source, set 1 XP under a level and done once (`whyline.json`):

| XP source | XP | why-line |
|---|---|---|
| a session (`recordActivity`) | +5 | "1 session" |
| Smart Warmup, Mark warmup done | +5 | "1 session and 1 warm-up" (the same 5 XP named twice) |
| a skill score, first in its category | +5 | **empty** |
| a skill score better than your average | up to +40 | **empty** |
| a Bridge Crossing best over an earlier one | +8–40 | **empty**: the record is logged after the save that levels you up (`await saveProgress()` then `triggerNewRecord`), so it's named at the next level-up instead |
| a first best (Bridge Crossing, Glider, Bridge Runner, Harmony Arena, Longest breath) | +8–60 | not named: a first best is no record (`hadPriorBest`); Glider's says "1 session", its own +5 |
| a Glider best over an earlier one | +10–60 | "1 new record and 1 session" |
| a Boss Battle won | +50 | "1 Boss Battle won" |
| a curriculum day (+15, plus its session's +5) | +20 | "1 curriculum day and 1 session" (code; not run) |

So: **not every XP source is named.** Skill scores (the most frequent XP, up to 40 a take) are never named, first bests
aren't, and Bridge Crossing's record is named one level late; the empty why-line is what most level-ups after a scored
exercise show. The daily warm-up gives no XP, so it can't be named. Fix (small, app-only): count skill-score XP and first
bests in the snapshot (`levelupCounters`: a "scores improved" and a "first bests" counter, both already in `progress`
as score lists and best fields) and log Bridge Crossing's record before the save.

## 5. Proposals (390 mockups in House Lights, `shots/mock-*`)

**a. A summary at the end of the warm-up** (`mock-1-summary.png`): shown when you press Start my session after at least
one exercise, in place of the list. Only measured things:
- *Range reached:* the lowest and highest voiced pitch over the warm-up (the frames it already reads), against your
  stored range.
- *How closely each glide was followed:* per exercise, the share of voiced time within a semitone of the guide (the
  guide and your pitch are both known every frame today; only the sum is new), plus where it was lost (the guide's pitch
  where the share falls), or for Humming the spread in cents.
- *One coach line,* from the weakest of those.
- *One next step,* from what it measured, one rule each, first match wins: lost the line above a pitch in the sirens or
  glides → **Register Coach** (the break is there); humming spread > 20 ct → **Live Tuner** (steadiness); range reached
  below the stored one by 3+ semitones at both ends → no tool, "an easy day"; no stored range → **Range Finder**;
  otherwise the session you were going to start. Effort: about a day (app-only; copy in 4 languages; checks with the file mic).

**b. A warm-up streak of its own** (`mock-2-streak-warmup.png`, `mock-2-streak-home.png`): days in a row with at least
one exercise finished. Shown in the warm-up's header ("4 days warmed up in a row · one exercise keeps it") and on Home's
stats line next to the practice streak, with its own icon. It differs from the practice streak: that one counts any day
with a session (including today's Smart Warmup clicks, which need no singing); this one counts only days you actually
sang a warm-up. It never breaks the practice streak and isn't part of XP. Needs the day on the server
(`user_progress`: `last_warmup_day`, `warmup_streak`; a migration and the api's column list), which also fixes item 1's
"this device only". Effort: about a day. Note: on Home the icon alone is ambiguous; it needs the label "4 days warmed up".

**c. One warm-up instead of two** (`mock-3-one-warmup.png`): Coach → Warm-up becomes the same warm-up as the pre-session
one (the four exercises and the song warm-up, same tracking), keeping Smart Warmup's context line (time of day, days
since you last sang; its weakest-category hint only if it changes the exercises, e.g. glides start lower for Range).
Smart Warmup's Play buttons and Mark warmup done go. **One XP rule:** finishing the first exercise of the day counts the
warm-up: +5 XP, `warmups_completed` + 1, the warm-up streak's day; once a day per account (server day), whichever entry
you used; more singing is welcome and adds nothing. It is not a session (no `recordActivity`), so it no longer moves the
practice streak by itself. Effort: 1–1.5 days with (b)'s server day; the copy keys for Smart Warmup retire.

**d. The banner fix** (`mock-4-banner-fix.png`): `vlPlaceBreak` puts the banner in the open warm-up card (under its
intro) while the warm-up overlay is shown, and moves it back to the panel when the overlay closes (the same function
already follows the singer between panels). Effort: an hour plus `bannerbehind.js` turned into its check (expects the
banner inside the overlay, visible).

**Teacher visibility** (whether a teacher sees their students' warm-ups) is skipped: the Teacher Dashboard is hidden.

## Recommendation

d first (a bug, an hour), then a + c together (the summary needs the one warm-up's exercises; one XP rule ends the
unlimited +5 clicks), then b (it shares c's server day). Item 4's fix is separate and small.
