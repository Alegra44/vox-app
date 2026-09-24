# Choir World verification scripts

Headless Playwright checks used to verify Choir World phases with real measurements (live GainNode
values, recorded audio, and a stand-in "singer" oscillator fed into the pitch analyser). They're for
when the Claude-in-Chrome extension isn't connected.

Serve the client first: `cd deploy && python -m http.server 8765`, then run from the repo root:

| Script | Checks |
|---|---|
| `verify.js [gates\|ref\|breath\|score\|all]` | Harmony Memory unlocks and gain per stage, stage 6 starting note, Breath Map rows and recorded audio gaps, mic scoring, and language switches mid-run (localhost) |
| `s6fr.js [url]` | Stage 6 (From memory) with a French switch mid-run: status line, all gains 0, no note shown |
| `fix.js [url]` | Playback end timed on the audio clock, loop restart, verdict colours |
| `live.js` | Production click-through (Songs → I Am the Part → Stage 1 + Breath Map); checks the live HTML is identical to `deploy/index.html` |
| `p5.js [fx\|score\|i18n\|all] [url]` | Phase 5: each boss's real effect (fx gain, measured detune/transposition, tempo, count-in note), a Chaos plan chord by chord, Ladder rungs, live judging/early loss/unlocks with a stand-in singer, and en/fr/es/tr text |
| `peaks.js [url] [scenarios]` | True peak / % samples over full scale / RMS of what reaches the speakers (choir bus and backing pad): workspace Hymn, Requiem, faders at 100%, a Chaos run with per-chord peaks, the Drowner, and the 4- and 5-part backing pad. Run against production for "before" |
| `timing.js [url]` | Phase 3: Entrance and Cutoff Trainer offsets measured against a stand-in singer with known edge offsets |
| `live5.js [url]` | Production click-through for Phase 5: Drowner fight with a true-peak tap on choirOutNode, French boss names, one Chaos run with French results; checks live HTML is identical to `deploy/index.html` |
| `yc.js [url]` | Phase 6 Your Choir: records parts through the real UI with a test tone as the mic (a real MediaStream into Studio Mode's MediaRecorder), checks take alignment, overdub playback, stacked playback per-part pitch / fader ratios / mute, the stacked output peak with all 5 parts, delete, and en/fr/es/tr text |
| `live6.js [url]` | Production click-through for Phase 6 in French (picked in the first-visit language chooser): records Alto and Bass with a test-tone mic, plays the 2-part stack, measures per-part pitch/gain/RMS, take alignment and the stacked peak; checks live HTML is identical to `deploy/index.html` |
| `p7.js [report\|why\|ready\|i18n\|all] [url]` | Phase 7: Performance Report and "Why Did I Fail?" against a stand-in singer with known offsets/entry delays (recomputed independently from the raw frames), Readiness play-through counting and status rules, Choir DNA, Choir Passport, and en/fr/es/tr text (signed out) |
| `p7signed.js [url]` | Phase 7 signed in: signs up a fresh account through the auth modal, runs Harmony Memory stage 1 + a boss win + a boss loss, logs each `PATCH /me/progress` `choir_readiness`, then signs in on a second context with empty localStorage and checks the readiness loaded from the account. Confirm the row with `npx supabase db query --linked` on the printed user id |
| `modalz.js [url] [email password]` | Sign-in modal above the bottom nav: at 1280x720 and 390x844, checks the element on top at the "Already have an account? Sign in" link and signs in with real clicks (no credentials: signs up a new account) |
| `live7.js [url]` | Production check for Phase 7, signed in: live HTML identical to `deploy/index.html`, sign-up through the auth modal at 1280x720, one Harmony Memory run with a stand-in singer (misses, a late entry, a silent chord) whose Performance Report is compared with an independent recomputation, and the stored `choir_readiness` |
| `desc.js` | Stage descriptions and buttons in en/fr/es/tr |
| `shot.js` | Screenshots of the Breath Map and Harmony Memory cards at desktop and phone widths |

Notes:
- Headless mic scores come from Chromium's fake device (a fixed beep) unless a script injects its own stand-in `analyser`.
- Rehearsal playback loops at the song end, so never wait for song time past the song's total length.
- In headless Chromium the audio clock runs slower than the wall clock, so time everything against `audioCtx.currentTime`.
