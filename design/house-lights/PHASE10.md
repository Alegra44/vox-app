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

## Part B

Phase 10 part B. Add this message to the end of design/house-lights/PHASE10.md under "Part B" and commit it first. One commit per item, in this order. No merge or deploy until I've reviewed. Rollback target: dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H. AC power only, one verify script at a time.

YOUR OPEN POINTS
- renderTeacherDashboard and the rest of the Teacher and Director code: keep them (hidden, "Coming later").
- The three durations without a space: fix them (B8).
- Scale Run's dots: the dot is a graphic (3:1), the number inside it is text (B8).
- Mirror Mode and the Breath ring: see B3.
- 10 (--teal) folds into B1 and B3.

B1. LEGACY VARIABLES (mechanical, no visual change)
- Replace all 592 var(--legacy) uses with the --hl- token each one aliases (--teal becomes --hl-voice for now; B3 changes what should change). Delete the 17 aliases, the two unused glow ones included.
- Gate: the tour, master against the branch, identical on all 618 shots (apart from proven noise such as the clock). Contrast and states9 unchanged. Any difference gets explained before you go on.

B2. DEAD CSS (no visual change)
- Remove the 103 dead candidates that aren't House Lights library rules, after a grep per family across the markup, script, deploy/*.js and scripts/. Keep the 14 library rules and the 280 state rules.
- Same gate as B1.

B3. RULE 1 (voice blue only for the singer and the start-singing buttons)
- To ink (or ink-2 for secondary text): the Vocal load fill (keep any warning colour it already switches to), Daily Exercises' "Adaptive" tag, the Vocal Passport fingerprint and its value, the Choir Passport DNA polygon, the .hm-held record values, "Alto (you)" (ink, 600), the interval labels (ink-2), Breath Map's live line, the Skill Tree's next-node ring (ink, dashed; my phase 8 spec said voice, that was wrong), Hear the Mistake's "Play A and B" (.hl-btn--ink: it plays, it doesn't listen), and the warm-up's Stop (the same as the vcTake tools' Stop).
- Categories: Pitch, Breath, Agility and Range get one set of category colours, used on Daily Exercises' Focus bar and legend and on Progress's chart. None of them is the voice colour; each 3:1 or better on paper in both themes.
- Stay voice: Vocal Lab's segments (the singer's range, as 9.1 asked), Breath Control's hold ring (a live measure of the singer).
- Mirror Mode's "Play a new phrase": if one press plays the phrase and then opens the mic, it's a start-singing button and stays voice; if the mic needs its own press, it goes ink.
- rule1.js becomes a check: only the allowed list uses the voice colour.

B4. TOUCH TARGETS (44 × 44, except links inside running text)
- min-height 44 on .mic-btn/.vc-take-pill, .solid-btn, .ghost-btn, .hl-key, .ex-type-btn and select.
- Small controls keep their look and get a 44 hit area from padding or a pseudo-element: .vc-avatar, Key Trainer's − / +, .hl-fader, the volume slider, .hl-chip, the top-bar Sign in. Hit areas mustn't overlap; where they would, grow the control instead.
- Change song and "Already have an account?": padding to 44 tall.
- targets.js becomes a check: 0 under 44 (the two hidden controls excluded).

B5. NAMES
- aria-hidden on the five skill rings, the tuner rings and the skill-tree icons.
- role="img" and a summary label, in the page's language and built from the data shown, on the Progress chart, the Karaoke roll, the Passport fingerprint and the X-Ray.
- for= on Custom Challenge's two selects; each of the 5 rehearsal level buttons named ("Level 1: Piano guide"…).
- The 7 English aria-labels get keys and data-i18n-aria-label (four languages); the canvases' changing parts built from keys.
- names.js becomes a check: 0 without a name, 0 English labels in fr, es, tr.

B6. FOCUS
- openModalWithA11y builds its list of controls on every Tab (fixes Sign-in's stop, the paywall's unreachable Close and onboarding step 1).
- Smart Warmup, the 3 moment sheets, the 2 share sheets and Language open through it: focus stays inside, Escape closes them, focus returns to the opener. Language at first run still needs a choice (Escape only when it's opened from settings); onboarding stays as it is.
- focus.js becomes a check: 0 stuck, 0 escaping, 0 not returned (onboarding and first-run Language excepted).

B7. REDUCED MOTION
- One global rule under prefers-reduced-motion: reduce: animation and transition durations 0.01ms, one iteration, scroll-behavior auto.
- Then check the running states the tour doesn't reach, with reduce on: a Coach tool mid-take, the tuner locked, a level-up sheet, a game. Nothing slides or pulses; values jump to where they are. motion.js becomes a check.

B8. SMALL COPY AND CONTRAST
- A space before "s" in the record values ("12.4 s", with the language's decimal sign), the weekly challenge ("x.x s / 20 s") and the rehearsal chord times.
- Scale Run: the dot stays a graphic at 3:1; the step number inside it is text, 4.5:1 against the dot's fill.

B9. LAYOUTS
- Progress · Today's Plan, every width: .hl-item rows like Home's (icon left, title and one line, chevron right), left-aligned, no stray rule.
- 600–959 px: Plans in two columns × two rows; Home's gutters the same as every other screen; .vc-stage and the Unified Progress chart max-width 600, centred.

B10. HOUSE_LIGHTS.md v3.0
- All ten phases marked done; the components added since v2.0 (the sheet, the moment sheet, the posters, the lanes, the marks); Rule 1's allowed list exactly as rule1.js enforces it.

CHECKS: the full local run, every suite with WITH_CHOIR=1, plus rule1, targets, names, focus, motion and datelocale. Then the tour diff, master against the branch: differences only on screens B3, B4, B8 and B9 touch.
SCREENSHOTS: the tour again (390, 768, 1280, Light and Dark), with before|after sheets of every screen that changed. Secret check, push redesign/phase10 and review/phase10.
REPORT, then stop. The deploy steps come from me after the review.

## Part B, additions (2026-11-12)

Agreed: time limits are the right fix, and thanks for saying plainly what happened. Four additions, then carry on with B3.

1. PUSH AS YOU GO
- origin/redesign/phase10 still ends at part A (2399605); B1, B2 and B3 are only on this Mac. After each B item is committed and its check passes, run the secret check and push redesign/phase10. Pushing the branch is not a deploy.

2. ONE RUN AT A TIME, ENFORCED
- A lock file that the runner takes at start and releases at exit (including on a crash or kill). A second run refuses to start while the lock's process is alive, and says which run holds it.

3. TIME LIMITS ON EVERYTHING
- Every script, every step inside one, and every database call (the Supabase CLI included) gets a limit of about 2× its normal time. Past it, kill the process and its browser and record a FAIL with "timed out", so a hang shows up as a failure in minutes.
- Check every long run at its expected end time, as you said. If it hasn't ended, look, don't wait.

4. LESS WAITING
- Per item, run only that item's own check: rule1 for B3, targets for B4, names for B5, focus for B6, motion for B7, the copy checks for B8, the layout shots for B9.
- Contrast, the full suite (WITH_CHOIR=1) and the tour diff run once each, after B9, in that order. A contrast failure then gets fixed in its item's commit, and only contrast is rerun.
- Everything else in PHASE10.md part B stays as written.

Then: rule1's warm-up step alone with its new limit, commit B3, push, and on to B4. REPORT when B9's checks and the tour are done, then stop.

## Deploy (2026-11-14)

Phase 10 part B approved. Two small fixes first, then the deploy. Add this message to the end of design/house-lights/PHASE10.md under "Deploy" and commit it first. AC power only, one run at a time (the lock), time limits on.

YOUR FOUR QUESTIONS
1. Merged branches: yes, delete them, but only after production passes (step 4).
2. Language from settings: no opener needed. Profile changing the language in place is right; drop that case.
3. Hear the Mistake's English: fix it now (B11).
4. tt-firsttick: fix it now (B11).

B11 (one commit)
- Hear the Mistake: "Which one was accurate?", "Not quite.", the result line and "Play A and B" get keys in four languages (no §7 words). Search the rest of the script for any other English written straight into textContent or innerHTML in a tool, key what you find, and list it in the commit message.
- tt-firsttick: open Part Rehearsal the way a person does now, and make it pass on the branch.
- Checks: Hear the Mistake's own check, tt-firsttick, copyscan --all, names, hooks, bootcheck. Secret check, push redesign/phase10.

1. WAIT FOR "deploy"
- When B11 is pushed, say you're ready and wait for me to type "deploy" here. Nothing else first.

2. AFTER I TYPE "deploy"
- Merge redesign/phase10 into master with --no-ff, run the secret check, push master, and tell me it's pushed. I run the Vercel line myself.
- After my Vercel line: confirm https://deploy-alegra1122.vercel.app serves the new deployment (check its page). If it doesn't, give me the exact vercel promote line with the real dpl id, and wait.
- Rollback target: dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H.

3. PRODUCTION CHECKS (against deploy-alegra1122.vercel.app). This is the last phase, so it's the full run:
- prod.sh with WITH_CHOIR=1; checkout, onboard, feedback, posters and moments9; and phase 10's rule1, targets, names, focus, motion and datelocale.
- Rollback rule: a failure that repeats on a rerun and isn't a network error or a Supabase 503 means rolling back to dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H. For a sign-up timeout, sign up through the page once by script; if that works in a few seconds, it was Supabase. If a rollback is needed, give me the line and stop.
- Delete the test accounts and any Feedback rows they sent. Push the results to review/phase10-prod.

4. WHEN EVERYTHING PASSES
- Delete the 15 merged branches, redesign/phase10, review/phase10, review/phase9-prod and the five old orphans review/phase1-prod … review/phase4b-prod. Keep master, review/phase10-prod and exp/single-stream.
- HANDOFF: the House Lights redesign is complete; phase 10 is live with its dpl id, which is the rollback target from now on.

REPORT, then stop.
