Phase 9: everything else. Start only after phase 8 is live and its production checks have passed. Branch redesign/phase9 from master. Save this message as design/house-lights/PHASE9.md and commit it first. No merge or deploy until I've reviewed the screenshots. Rollback target: the phase 8 deployment (its dpl id is in HANDOFF). AC power only, one verify script at a time.

DECISIONS (record them in HANDOFF)
- Day 21 while plans aren't on sale: accounts past their 21 days keep losing the paid features, as today. The paywall says so plainly and shows no price (2.5).
- The Teacher Dashboard is hidden like the Director Dashboard; the Teacher plan card says "Coming later" with no button. Vocal Lab stays a Coach tool. .legacy-tabs goes in phase 10.
- Expression is no longer offered as an onboarding priority. Accounts that already chose it keep it; nothing is migrated.
- Share posters are always paper (light), in both themes, so a shared image looks the same whoever made it.

0. FIRST COMMIT: Teacher hidden, and its escaping fixed
- The You-hub row and every other way into panel-teacher go, as the Director Dashboard did in phase 5. The panel and its code stay, unreachable.
- Every roster name, note and assignment put into innerHTML in the Teacher code goes through the existing escape helper, even though it's hidden.
- The Teacher plan card: "Coming later" in place of its button (four languages).

1. GUARDS FIRST
a) states9.js (new): every phase 9 screen in each state it has (signed out, new, active, expired, teacher), on master and the branch. No page errors; each button opens the same panel or overlay and saves the same thing; house up everywhere except the warm-up's stage.
b) onboard.js (new): through all 7 onboarding steps with each choice, Back included, on master and the branch. The saved fields (singer type, experience, genres, goal, priority) and the summary rows equal.
c) checkout.js (phase 8) extended: Pricing signed in and out, the paywall in the expired state for each gated feature, the "not on sale" sheet. No screen offers a price as buyable now; the plan is unchanged after a reload.
d) feedback.js (new): fill every field, submit; the saved row equals master's; the thanks state shows.
e) posters.js (new): both posters open from their buttons; Download makes a PNG that isn't blank, at the poster's size ×2 (±2 px), and matches a screenshot of the poster on screen (under 5% of pixels differ; look at both yourself); the text is right in four languages; Close works.
f) levelup.js plus the new record and breakthrough: each triggered on master and the branch; the why-line and counts equal.
g) The survey's "before" shots of the level-up, new record and range poster show the Rift page, and the warm-up card shows Feedback. Fix the shot script so each state really shows its overlay (states.json records the open overlay's id per shot), and take the before set again on master.
h) The existing: common.js signUp, home.js, entries.js, choir-verify paywall.js and p8.js, warmup-verify/*, tools.js, house, contrast, copyscan, hooks, navcheck, bootcheck, youstates.

2. BUILD (one commit per item, four languages)

2.1 One sheet for every overlay in this phase
- Paper (--hl-raised) on a scrim, radius --hl-r3, 24 px padding, max width 440 (full width less the 16 px gutters at 390). Title hl-h2 left-aligned, one line in ink-2, the content, then the actions: the main one .hl-btn--ink (or --sing if it opens the mic), the rest quiet. The × close keeps its 44 px target where one exists today.
- Escape, the scrim and Close work as they do today. Focus goes to the first field or the main button and returns to what opened the sheet.
- No emoji in titles or as art. An icon only where the sprite has one (hl-lock on the paywall); otherwise none.
- Used by: sign up/in, sign-in required, onboarding, the language chooser, the paywall, the checkout sheet, the warm-up card, level up, new record, breakthrough, and the posters' frames.

2.2 Sign up, sign in, "Sign in required"
- Sentence case titles ("Start your vocal journey", "Sign in"). The 11-tick feature list and the "21 DAYS FREE" box go; one line instead: "21 days of full access: every Coach tool, Songs, Vocal World and your progress." The fine print stays factual: "After 21 days, some features need a paid plan. No payment today."
- Fields in the style Profile has used since phase 7 (label above, 48 px tall). The e-mail placeholder gets its data-i18n-placeholder.
- "Already have an account? Sign in" in ink, underlined (the .link-btn rule from 8.1).
- "Sign in required": its title from the feature's name key (2.5's map), never the internal label.

2.3 Onboarding (7 steps)
- Every step keyed: the 24 markup lines without data-i18n, in four languages.
- Progress as "Step 2 of 6" and a hairline bar in ink; no blue dots.
- The choices as .hl-item rows with a check when chosen (radio rows; genres are checkboxes), saving the same values.
- Welcome: "Five quick questions, then your Day 1 assessment." (There are five questions; it says six today.) No §7 anywhere: ob_welcome_sub, ob_summary_priority_unset, and step 6's "your real Day 1 baseline assessment — five quick real measurements, not a demo" becomes "Next: your Day 1 assessment, five short measurements."
- Expression off the priority list.
- The summary as rows: Level, Genres, Starting priority. Unset values read "Beginner (you can change it later)" and "Picked from your first scores".
- 🎤 and ✨ go.

2.4 Language chooser
- The four names as .hl-item rows, each in its own language; 🌐 goes.
- The disclosure: "Everything is translated except the 21-Day Journey's daily lessons, which are in English for now." (fr, es, tr).

2.5 Plan & Pricing, the paywall, the checkout sheet
- Pricing: emoji off the plan names; the developer disclosure ("A real version replaces this with real Stripe…", PRD §6) off the screen; §7 out of the six keys. A line at the top while plans aren't on sale: "Paid plans aren't on sale yet; we'll tell you when they open. Your current access continues." The plan buttons keep opening the honest sheet. The Teacher card: "Coming later" (from step 0). Plans as ruled rows, or columns from 768, not old key-cards; the trial comparison rows as hl rows.
- The paywall: the title from a map of feature-name keys (four languages), never the internal label ("Sonic X-Ray", "The Vocal Rift"); "Not now" keyed. Expired copy: "Your 21 free days have ended. Paid plans aren't on sale yet; we'll tell you when they open. Your progress is saved." No price chip while plans aren't on sale. Actions: Close (ink) and "See the plans" (quiet).
- The checkout sheet on 2.1's style; same text.

2.6 Feedback
- Title without the emoji. The sub line: "A sentence or two per question helps most." §7 out of feedback_sub, feedback_storage_note and feedback_thanks_desc.
- The form on paper with ruled fields, not a card. The rating faces become a .hl-seg of the same values with words at each end; the saved values don't change.
- The thanks state as .hl-empty: what happened, one action.

2.7 Warm-up card
- The chooser around the stage restyled on the stage's own controls (it's always house down). "Crazy exercises" becomes "Exercises". wu_done_mark's emoji becomes the sprite's check.

2.8 Level up, new record, breakthrough
- One "moment" sheet: a label ("Level up", "New record", "Breakthrough"), the number large (hl-metric-l: the level, the record's value), the name or what it was before as a row (only values that are stored), the why-line as .hl-coach, and Continue (ink).
- Gold only as a 2 px --hl-game-gold rule at the top of the sheet; text stays ink. No confetti or emoji. If it animates today, one 300 ms rise, none with reduced motion.
- The 5 markup defaults keyed.

2.9 Share posters
- Paper, flat: no gradient, no glass. The label ("Vocal range", "November recap" with the month from Intl in the page's language), the title in hl-h1, the main value large, two or three stat rows, the wordmark at the foot. On the range poster the singer's range is drawn in the voice colour on a keyboard strip in ink (Rule 1 allows the singer's range).
- All 14 lines keyed (four languages).
- What html2canvas can't draw stays off the poster: no color-mix(), no gradients, no backdrop-filter, no font-stretch; fixed weights and flat token colours. posters.js (1e) proves the PNG matches the screen.
- The export failure toast keyed and plain: "Couldn't make the image. Try again." No "preview environment".
- Download (ink) and Close (quiet) readable on the scrim, 4.5:1 or better.

2.10 Vocal Lab (Coach tool)
- The Coach tool layout: back row, title, one line, the three tiers as rows (name, the range as hl-note, one line), each with a bar on a shared keyboard axis, the singer's range in the voice colour. "Not enough data yet" as meta text, not a bar.
- What each tier means moves into hl-measure. "1 distinct notes" → plural keys ("1 note", "{n} notes"). vocallab_signin's §7 and the two English literals in renderVocalLab go.

2.11 Every emoji and §7 word left anywhere in the app
- Scan the whole app's markup and keys (copyscan --all), in four languages. Anything left goes; a sprite icon where one is needed.
- PHASE9_COPY.md: old → new.

3. CHECKS
states9, onboard, checkout, feedback, posters, levelup (with record and breakthrough), signUp via common.js, home, entries, paywall.js and p8.js (ONLY=choir for those two), warmup-verify/*, tools, house, contrast, copyscan --all, hooks, navcheck, bootcheck, youstates.
Expected changes (nothing else may change): Teacher hidden and escaped; the layouts of the phase 9 screens; the copy; Expression off onboarding; the paywall's price chip while not on sale; the posters' look.

4. SCREENSHOTS
Every phase 9 screen in each of its states, every onboarding step, the three moment sheets, both posters (on screen and the exported PNG), at 390 and 1280, Light and Dark, on review/phase9 with a contact sheet and the before set next to it. Secret check, push both branches.

5. REPORT, then stop.

9.1

Phase 9 review: it's close. One fix round, 9.1, on redesign/phase9, then push review/phase9 and stop. Add this message to the end of design/house-lights/PHASE9.md under "9.1" and commit it first. No merge or deploy yet. AC power only, one verify script at a time.

YOUR QUESTIONS
- Empty Feedback form: yes, fix it here (1).
- Voice types in English on Range Finder and Profile: yes, fix it here (2).
- "Director dashboard" under the Choir plan: remove it (3).
- Moment sheets on timers: keep the timers, but longer, and they stop when touched (4).
- Sonic X-Ray's paywall reads "Song Lab": yes, keep it.
- Prices on the plan cards: yes, keep them; the top line and the sheet say they aren't on sale.

1. FEEDBACK
- Send with nothing filled in (no text and no rating) saves nothing and shows "Write at least one answer first." under the button (four languages). A rating alone, or any one text answer, sends as today.
- feedback.js: add the empty case (no row saved) and the rating-only case.

2. VOICE TYPES
- Everywhere a voice type is shown (Range Finder's result, Profile, the Voice Card, anywhere else you find one), use the poster's voice-type keys so it's in the page's language. The stored value doesn't change. This is an expected change for states9 and youstates.

3. PLANS PAGE
- Remove "Director dashboard" from the Choir / Studio plan (the dashboard is hidden).
- Remove the paragraph under "Continue your vocal journey" ("Every new account gets 21 days…"): the page's first line already says it. Keep the PLANS label and the heading.

4. MOMENT SHEETS
- Level up with a why-line, and Breakthrough: 6 s. Level up without one, and New record: 4 s. (Today 4.5, 2.4, 3.2 and 2.4 s: too short to read.)
- Any pointer, touch or key inside the sheet stops its timer; after that only Continue, Escape or the scrim close it.
- levelup.js and moments9: add both cases.

5. VOCAL LAB BARS
- A plain bar, not piano keys (the keys read as noise at this height, worst in Dark): the track in the rule colour, the tier's range as one solid voice-colour segment.
- The note labels (the Cs) directly under each bar that's drawn, on the same axis for all three. No axis row of its own lower down (today C3 and C4 float under Reliable, away from the only bar).
- The empty state (no range yet) gets one action: "Find your range" (ink link), opening the Range Finder as Home's link does.

6. POSTER EXPORT
- The PNG has transparent rounded corners, which some apps show black. Export it opaque: fill behind the poster with its paper colour, so the image is a clean rectangle.
- Export at scale 3 (1020 × 1800) instead of 2, so it holds up full-screen on a phone.
- posters.js: the four corner pixels are opaque paper; the new size.

CHECKS: feedback, posters, levelup, moments9, states9, checkout, tools, youstates, copyscan --all, contrast, hooks, bootcheck.
SCREENSHOTS on review/phase9 under 9.1/: Feedback with the empty-send note; Range Finder's result and Profile in French; Plans (new and expired); the three moment sheets; Vocal Lab (active, new, signed out); both posters on screen and their PNGs; onboarding steps 1 and 3 with choices made (I haven't seen the chosen state yet). 390 and 1280, Light and Dark. Secret check, push both branches.
REPORT, then stop.
