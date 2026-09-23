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
| 6 | | "Your Choir": multi-part self-recording via Studio Mode, stacked playback |
| 7 | | Reporting: Performance Report, "Why Did I Fail?", Readiness Engine, Choir DNA, Choir Passport |
| 8 | | Monetization: gate the entire Choir World feature set (including the Phase 1–3 rehearsal view, trainers, and A Cappella Mode, which are currently unrestricted) behind the Choir/Studio plan, with an honest locked-preview for lower tiers |
| 9 | | Hooks: Home card, Songs hub entry, Journey milestone, new achievements |

Verification scripts for these phases live in `scripts/choir-verify/` (see its README).
