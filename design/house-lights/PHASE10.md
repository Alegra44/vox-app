Phase 10: the final pass. Start only after phase 9 is live and its production checks have passed. Branch redesign/phase10 from master. Save this message as design/house-lights/PHASE10.md and commit it first. Two parts: A is a survey plus the known small fixes, then you stop; I send the fix list for B after reading the survey. Rollback target: the phase 9 deployment (its dpl id is in HANDOFF). AC power only, one verify script at a time.

A1. KNOWN ITEMS (fix now, one commit each, four languages where there's copy)
- .legacy-tabs: grep scripts/ and the app first; then remove its markup, its CSS and any code path that only served it, and update any script that used it.
- Daily Exercises: the Today's Recommended Focus text no bigger than the page subtitle, and its title bold (House Lights type tokens).
- Smart Warmup: "(3s)" gets the space before the unit that every other duration has.
- English dates follow the device's region: US order only for en-US; other English regions (en-GB, en-IN, en-AU…) get day-month order, through Intl with navigator.language when the app is in English. French, Spanish and Turkish don't change.
- Unused i18n keys: list every key that no code or markup references (watch for keys built from strings: grep their prefixes too), and remove them from all four languages. The list goes in PHASE10_SURVEY.md.
- Scale Run's step dots (4.42:1 in Light): they're graphics, where 3:1 is the bar. Mark them as non-text in contrast.js instead of changing the colour, and say so in the survey.

A2. AUDITS (results in PHASE10_SURVEY.md; fix nothing beyond A1 yet)
a) The tour: every screen and state (the 46 screens in HOUSE_LIGHTS plus the sheets from phases 8 and 9) at 390, 768 and 1280, Light and Dark, with a contact sheet per width and theme. 768 is new: list every screen whose layout breaks or looks unfinished there.
b) Rule 1: every element whose computed colour, background or border is the voice colour, by screen. List the ones that aren't the singer's trace or range, a start-singing button, the focus ring or the tab bar's playhead. (I know of the warm-up's "Stop".)
c) Touch targets: every interactive element smaller than 44 × 44 px, by screen, unless it's a link inside running text.
d) Names: every button, link, input and icon without an accessible name, and every aria-label still in English in French, Spanish or Turkish.
e) Focus: tab through each screen and sheet. List any focus that's invisible, lost or stuck, and any sheet that doesn't return focus to what opened it.
f) Reduced motion: with prefers-reduced-motion on, every animation or transition longer than 0.01 s that still runs, by screen.
g) Leftovers: legacy CSS variables (--teal, --brass and the rest) still used by visible elements; CSS rules that match nothing on any screen of the tour (candidates only, nothing removed); any emoji or §7 word left (copyscan --all).
h) Branches: remote branches already merged into master (to delete in B) and unmerged ones (kept; one line on what each holds).

A3. CHECKS for A1: hooks, contrast, copyscan --all, bootcheck, navcheck, home, warmup-verify, and every script that touched .legacy-tabs.

A4. Push redesign/phase10, and review/phase10 with the tour sheets and the survey. Secret check. REPORT the counts per audit and your proposed fixes grouped by size, then stop.
