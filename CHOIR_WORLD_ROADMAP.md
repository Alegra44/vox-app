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
| 7 | | Reporting: Performance Report, "Why Did I Fail?", Readiness Engine, Choir DNA, Choir Passport |
| 8 | | Monetization: gate the entire Choir World feature set (including the Phase 1–3 rehearsal view, trainers, and A Cappella Mode, which are currently unrestricted) behind the Choir/Studio plan, with an honest locked-preview for lower tiers |
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

Verification scripts for these phases live in `scripts/choir-verify/` (see its README).
