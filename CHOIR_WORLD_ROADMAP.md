# Choir World 2.0 — Roadmap

The full phased plan for the Choir World upgrade of the Choir Workspace. One phase is built at a time,
verified on the live site with real measurements (actual GainNode values, hand-checked timings), and
reported back before the next phase starts. Production deploys need explicit approval.

`deploy/index.html` is the canonical client; `voxcoach-prototype.html` mirrors it (see BACKEND.md).

| Phase | Status | Scope |
|---|---|---|
| 1 | DONE | "I Am the {Part}" rehearsal view, 5 real volume-fade levels |
| 2 | DONE | Sonic X-Ray, Music Microscope, Harmony Vision (all real, scoped to the 2 real songs) |
| 3 | DONE | Entrance Trainer, Cutoff Trainer, A Cappella Mode |
| 4 | DONE | Harmony Memory (6 progressive stages, reusing the volume-fade mechanic from Phase 1 and A Cappella from Phase 3 for stage 5) + Breath Map (real breath points from real phrase-gap data) |
| 5 | DONE (live 2026-09-23, dpl_6AeAfDhn21zuEQenxAqnRhfXmMVd) | Gamification: Choir Boss System (6 bosses: Drowner, Drifter, Sprinter, Ghost, Shifter, Silence), Chaos Mode (random surge/dropout/drift plan per run), Tempo/Key Ladder (6 rungs up to 130% tempo, ±2 semitones) |
| 6 | DONE (live 2026-09-23, dpl_Hm1FPXgu1U4cVt8immnEg4daYXUn; see known issue below) | "Your Choir" in Choir Workspace: record each of the 5 parts with Studio Mode's recorder (count-in, synth guide for the part, earlier takes play back), stacked playback through the workspace mixer GainNodes |
| 7 | DONE (live 2026-09-24, dpl_GSwwHVrem2Bysbn8hgh7j61BWfPi) | Reporting: Performance Report, "Why Did I Fail?", Readiness Engine, Choir DNA, Choir Passport |
| 8 | DONE (live 2026-09-24, dpl_GsSgU8oxkt8ZYXjJkLpRP7iJwnJX) | Monetization: gate the entire Choir World feature set (including the Phase 1–3 rehearsal view, trainers, and A Cappella Mode, which are currently unrestricted) behind the Choir/Studio plan, with an honest locked-preview for lower tiers |
| 9 | | Hooks: Home card, Songs hub entry, Journey milestone, new achievements |

### Phase 6 known issue: recorder latency (uncompensated)

Recorded takes sit ~67 ms after the song clock because of recorder latency (measured in headless
Chromium with a test-tone mic; every take landed 65–68 ms late, and takes stay aligned with each other
within ~2.4 ms). It is not compensated, and the real figure varies by device and mic: input latency adds
to it, and the singer also hears the guide late by the output latency. A future fix needs a
calibration step before recording starts, e.g. measuring round-trip latency by playing a test click
and timing its arrival at the mic, then shifting each take's `lead` by that amount. Not blocking for
now, but it should be addressed before Your Choir is positioned as a serious rehearsal tool rather
than a fun feature.

### Phase 8 gate rules

Choir World (everything from phases 1–7) needs `hasChoirWorldAccess()`: the Choir plan, or anyone
inside the 21-day trial (the same trial rule as every other gate in the app). Monthly, Yearly and
Teacher get the locked preview. Signed-out visitors get it too, with a "start your trial" button. The
Phase-0 workspace (song picker, Song Difficulty, Song DNA, mixer, practice chips, Director Dashboard)
is unchanged: `requireChoirFeature` still lets trial, Choir, Monthly and Yearly use the mixer. Every
Choir World action checks `requireChoirWorld()` itself, so hiding the cards is only the view. A
subscriber who is still inside their first 21 days keeps full access until the trial window ends,
whatever their plan.

## Known issues (app-wide)

- **Page `lang` stays `"en"` whatever language is selected.** Text uppercased with CSS
  (`text-transform: uppercase`) is then transformed with English rules, which is wrong in Turkish: `i`
  should uppercase to `İ` (dotted) but comes out as `I`, so the dotted/dotless pair (i/İ, ı/I) is
  mixed up on every CSS-uppercased label. Not blocking, but worth fixing in a dedicated pass
  (set `document.documentElement.lang` on every language switch and check the result per language),
  since it likely affects text outside Choir World too.
- **Top bar overflows by 7 px at 390 px width** when the account chip shows a long plan label
  ("YEARLY"): the page scrolls sideways slightly. Already on production before Phase 8.
- **Paywall sentence spacing:** the paywall's `paywall_ispartof_p2` is appended after a space, so
  French and Spanish show "…du forfait Chorale ." with a space before the full stop, for every paywalled
  feature. The trial-ended variant also says a feature "continues on a paid plan" without naming it,
  even when only the Choir plan unlocks it (the plan chip underneath does say Choir · $79/mo).

Verification scripts for these phases live in `scripts/choir-verify/` (see its README).
