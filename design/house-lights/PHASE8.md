# Phase 8: Vocal World (the user's spec, 2026-11-09, verbatim)

Phase 8: Vocal World. Work on redesign/phase8 (it has PHASE8_SURVEY.md). Save this message as design/house-lights/PHASE8.md and commit it first. No merge or deploy until I've reviewed the screenshots. Rollback target: dpl_AuR6tZ7FryuBFf6meMmQDxaryGEk. AC power only, one verify script at a time.

0. FIRST COMMIT, before anything else: the checkout must not say something false.
- The demo checkout's "Simulate successful subscription" and its "You're subscribed…" message go. Until Stripe is wired, every plan button opens one honest sheet: "Paid plans aren't on sale yet. Your current access continues; we'll tell you when they open." (four languages), with Close. No plan change, no success state. IDs kept; the old flow stays in the code, unreachable.
- Signed out, the plan buttons ask you to sign in "to choose a plan", not to "Teacher Dashboard".
- A small test, checkout.js: signed in and signed out, every plan button shows the honest sheet, nothing says "subscribed", and the plan is unchanged after a reload.

DECISIONS (record them in HANDOFF, including the phase 9 ones)
- scores4b: no rollback was right. From now on Voice Quality's centroid, and any value whose own noise is wider than ±2, is gated by master's A/A range or ±1%, whichever is wider.
- Phase 9: the Teacher Dashboard is hidden like the Director Dashboard (it can't reach students without a multi-user backend), and the Teacher plan card says "Coming later" instead of a button. Vocal Lab stays a Coach tool. .legacy-tabs is removed in phase 10, after a grep of scripts/.

1. GUARDS FIRST
a) gamestates.js (new): each of the five games (Glider, Bridge Runner, Boss Arena including the Register Wraith, Harmony Arena, Rift) idle → live → result, on master and the branch, with Math.random seeded identically on both sides.
   - Every number on the result (score, best, coins, combo, rounds, average, boss outcome, weakest note) equal within ±2, and the vocal load fed.
   - House: down while playing for all five (Bridge and the Wraith included), up after.
b) stopcheck: the five games, leaving at 0.8 s and 2.6 s, and the Rift's "Back to Vocal World" during a run. Listening stops, the house comes up, the Rift is hidden, Start works.
c) treecheck.js (new): the Skill Tree's unlocked nodes and its "next" panel equal to master for the seeded new and active states.
d) The existing game scripts: glider-verify flight and courses, regfix, batch1, batch3a, batch3b, warm-up entries and tracking, loopback.
e) house, contrast, copyscan (the hub and the games in four languages), hooks, navcheck (World), bootcheck.

2. BUILD (one commit per item, four languages)

2.1 Drawn marks (the biggest design item; checkpoint after it)
- 14 marks in the sprite's system (24 px grid, 1.6 stroke, currentColor), drawn to work from 24 to 96 px.
  · The six locations: Pitch Mountain (a peak with a flight line over it), Register Canyon (two lanes between cliffs), Boss Arena (a shield or crest), Harmony Castle (a turret with three stacked lines), Skill Tree (three linked nodes), The Rift (a split line).
  · The eight bosses, each with a tell that matches what it tests: Pitch Dragon (a head whose line ends in a pitch wave), Sustain Giant (a block figure over a long flat bar), Range Phoenix (rising wings), Agility Monster (a zigzag body), Register Wraith (a figure split across two lanes), Volume Phantom (a fading arc), Tempo Golem (blocks with a metronome arm), Tremor Serpent (a sine-wave body).
- No emoji art anywhere in Vocal World: game icons, bosses, the "versus" art, the Skill Tree nodes, labels.
- Checkpoint: push review/phase8-part1 with a sheet of all 14 marks at 24, 48 and 96 px in Light and Dark, the hub (2.2) and Pitch Mountain (2.3). Carry on; I'll review it meanwhile.

2.2 The World hub (house up)
- Title "Vocal World" and a one-line subtitle (six places, unlocked by your level; no "Four", no §7).
- Six tiles in a grid (2 columns at 390, 3 from 768). Each has the location's mark, its name (one name: "Pitch Mountain", not "Pitch Mountain — Vocal Journey"), one line, and the best or the lock.
- Locked tiles: the mark and name in ink-3, with hl-lock and "Level 5". No opacity, no 🔒.
- The lock message is keyed: "Opens at Level 5. You're Level 1."

2.3–2.7 The five games
- Each game page (house up): a back row, the title, one line, its options, Start (voice blue), the vocal-load gauge, best, and hl-measure with the method. The "REUSES … ENGINE" tags go.
- Options:
  · Glider's seven courses as .hl-item rows (name, one line, "For you" where recommended);
  · the eight bosses as tiles with their marks (2 columns at 390, 4 from 768), "For you" on the recommended one;
  · Harmony's parts as Choir World's part chooser (.hl-seg), and its five levels as .hl-seg (numbers at 390, names from 768);
  · difficulty as .hl-seg everywhere.
- The stage (house down): singingSession for the games that use it; houseSession for Bridge Runner and the Register Wraith, which feed load themselves.
  · The canvas fills the stage column, up to 760 px.
  · A HUD row above it: score, combo or rounds, best; condensed and tabular.
  · The neutral Stop pill, keyed "Stop", with no "Flying — tap to stop" literals.
- Game colours on the stage:
  · you in the voice colour;
  · terrain, gaps, lanes and the other parts in the ink scale;
  · rewards (coins, combo, wins) in --hl-game-gold;
  · hazards and crashes in --hl-miss;
  · part colours in Harmony;
  · the boss as its mark in ink, with its health bar in --hl-miss and yours in --hl-voice.
- Result (house up): .vc-result.
  · The big number is the score.
  · Rows: best, then coins, combo, rounds or average, as each game has them.
  · The coach line from the existing text (Boss: defeated or not, and the weakest note to train).
  · The next action (Fly again, Rematch, Next course) from the existing buttons.
- The Rift: "Back to Vocal World" stops a run, hides the Rift and brings the house up (showArcadeHub handles #gameRift and riftActive). Its Start label is keyed.

2.8 Skill Tree (house up)
- The tree with the sprite's icons as nodes (pitch, range, agility, breath, head, chest, mixed, master): unlocked in ink, the next one ringed in the voice colour, locked in ink-3 with hl-lock.
- The detail panel as rows ("Next: Chest voice · Breath ≥ 60% · now 58%").

2.9 Copy
- The Glider's course lines and the boss descriptions translated into fr, es and tr.
- Every §7 word, emoji and English literal from the survey's Vocal World rows.
- PHASE8_COPY.md: old → new.

3. CHECKS
gamestates (the gate), checkout, stopcheck, treecheck, the game scripts in 1d, house, contrast, copyscan, hooks, navcheck, bootcheck, batch1, picker.
Expected changes (nothing else may change): the checkout sheet and the sign-in title; the hub and game layouts; Bridge and the Wraith dimming the house; the Rift back link; the marks; the copy.

4. SCREENSHOTS
The hub (new, active, all locked, all open), each game's page, stage and result, the Skill Tree, and the checkout sheet (signed in and out), at 390 and 1280, Light and Dark, on review/phase8 with a contact sheet. Secret check, push both branches.

5. REPORT, then stop.

## 8.1

Phase 8 review: it passes. One short fix round, 8.1, on redesign/phase8, then push review/phase8 and stop. Add this message to the end of design/house-lights/PHASE8.md under "8.1" and commit it first. No merge or deploy yet. AC power only, one verify script at a time.

YOUR THREE QUESTIONS: yes to all three, as you built them. Record them in HANDOFF.
- "For you" on Pitch Mountain picks a course from the weakest of pitch, agility and range: yes.
- The Skill Tree's Control node uses the breath icon: yes.
- "All locked" can't happen, so the signed-out hub stands in for it: yes.

1. FOUR MARKS REDRAWN (same system: 24 px grid, 1.6 stroke, currentColor; each must read at 24 px)
- Range Phoenix (reads as a plant): a bird rising, seen from the front. Two wings raised high in a wide V, each ending in three feather points; a small head with the beak turned to one side; a short body; two or three flame strokes for a tail. No single stem running down the middle.
- Volume Phantom (too faint at 24 px): a ghost. A domed head, two dot eyes, straight sides and a wavy hem, with the right side breaking into two or three bold dashes for the fade. Fewer, heavier pieces than now.
- Register Canyon ("{=}" reads as code): the two cliff walls as angular zigzags (straight segments, sharp corners, three notches each, a little wider at the base), with the two lane lines between them not touching the walls.
- Harmony Castle (reads as a notepad at 24 px): wider than tall. Two towers with battlements on either side of a lower wall; the three stacked lines short, inside the wall.
- Make the marks sheet again (all 14 at 24, 48 and 96 px, Light and Dark), with the four old marks next to the new ones.

2. LINKS IN INK (Rule 1: voice blue is only the singer and the start buttons)
- The base .link-btn rule becomes: color var(--hl-ink), font-size inherit, underlined with text-underline-offset 2px. Remove the two overrides that already did this (.link-btn.why-btn and .duet-after .link-btn).
- This fixes "Change song" (Boss Arena, Harmony Castle, the Choir World rehearsal) and the Boss "Why?". Nothing else uses .link-btn.

3. BOSS RESULT
- The rows "You" and "Boss" become "Your health" and "Boss health" (four languages).
- The coach line drops "Your health left: 86%", since the row now shows it; "You dealt more damage than you took." stays. If it's one key, change it in all four languages.

4. A CHECK, NOT A CHANGE UNLESS IT FAILS
- At 390, after each of the five games ends, the result's big number is inside the viewport. Add this to gamestates. If it fails for a game, scroll the number into view when the house comes up, as the vcTake tools do.

CHECKS: gamestates, hooks, copyscan --world, contrast (Vocal World and Choir World), bootcheck.
SCREENSHOTS on review/phase8: the new marks sheet; the hub, Boss Arena page and result, Harmony Castle page and Register Canyon page at 390 and 1280, Light and Dark. Secret check, push both branches.
REPORT, then stop.
