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
| `desc.js` | Stage descriptions and buttons in en/fr/es/tr |
| `shot.js` | Screenshots of the Breath Map and Harmony Memory cards at desktop and phone widths |

Notes:
- Headless mic scores come from Chromium's fake device (a fixed beep) unless a script injects its own stand-in `analyser`.
- Rehearsal playback loops at the song end, so never wait for song time past the song's total length.
- In headless Chromium the audio clock runs slower than the wall clock, so time everything against `audioCtx.currentTime`.
