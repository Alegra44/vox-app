# Phase 5 survey: Choir World and the Songs tab

Read-only survey for the phase 5 spec (instructions in PHASE5A.md, "5a.1", step 5). Nothing in the app was changed.
Code references are to `deploy/index.html` at master 7296998 (phase 4b live, 5a merged). Screenshots of every
screen and state as it is now are on `review/phase5-before` (`sheets/before.jpg`), taken with
`scripts/design-verify/shots5.js`, signed in with a Choir-plan test account, at 390 Light, 390 Dark and 1280 Light.

## At a glance

Choir World today is **two long pages plus a passport**, not a song page with sections:

- **Choir Workspace** (`panel-choir`): the song list (two songs), the practice track (title, description, Song
  Difficulty), Song DNA, Sonic X-Ray with Music Microscope, the five-part mixer and transport, Quick practice chips,
  "Rehearse one part" chips, Your Choir, Choir DNA, and the Director Dashboard (sample data).
- **I Am the Part** (`panel-partrehearsal`): part chooser and song label, A Cappella, Readiness, rehearsal level and
  live guide gain, "Your line" (transport, Harmony Vision, piano roll, note list), then six trainers stacked: Breath Map,
  Harmony Memory, Choir Bosses, Chaos Mode, Tempo/Key Ladder, Entrance & Cutoff.
- **Choir Passport** (`panel-choirpassport`): ensemble record, Choir DNA, readiness history, recent scored runs.

Reached from the Songs tab's Choir World card (`cwHubStatus`, three buttons), Home's Choir World card and the 21-Day
Journey milestone. Without Choir World access (`hasChoirWorldAccess()`: trial or Choir plan) each page shows a locked
preview (`cw-preview`) and hides the `cw-gated` sections.

| Section | Page | Sing or read | Mic | `singingSession` / `houseSession` | Stored | Covered by (choir scripts · others) |
|---|---|---|---|---|---|---|
| Songs-tab Choir World card | songs-hub | read | no | no | — | p8, p9 · navcheck, shots, contrast |
| Song list | choir | read | no | no | `currentSongId` (session) | every choir script via `selectSong` · levels |
| Practice track + Song Difficulty | choir | read | no | no | — | p8 · range-reload |
| Song DNA | choir | read | no | no | — | p8 |
| Sonic X-Ray + Music Microscope | choir | read (taps seek playback) | no | no | — | p8 (visible only) |
| Mixer + transport + Quick practice | choir | listen | no | no | per-part volume (session) | fix, peaks, yc, p10, paywall, p8 · levels (vq-verify), hooks |
| Rehearse-one-part chips | choir | read | no | no | — | p8 |
| Your Choir | choir | **sing** (record) | yes, `initAudio` | `singingSession`, **no stage** | takes in localStorage (device) | yc, live6, p9, p10 (export), p8 · batch3a |
| Choir DNA (workspace) | choir | read | no | no | readiness (account) | p7, p8 |
| Director Dashboard | choir | read | no | no | none: hard-coded sample rows | p8 |
| Part chooser, song label | partrehearsal | read | no | no | `partRehearsal.part` | most choir scripts |
| A Cappella | partrehearsal | listen | no | no | — | p5, p8, s6fr, verify |
| Readiness | partrehearsal | read | no | no | `user_progress.choir_readiness` (account) | live7, live9, p7, p7signed, p9, p10 |
| Rehearsal level + live guide gain | partrehearsal | listen | no (reads the guide's own analyser) | no | level (session) | verify (gain per stage), fix, p9, p10 |
| Your line: transport, Harmony Vision, roll, notes | partrehearsal | **sing along, not heard** | **no** | **no** | full play-throughs count for readiness | fix, s6fr, verify, p9, p10 |
| Breath Map | partrehearsal | read (+ live breath line during playback) | no | no | — | fix, live, shot, s6fr, verify |
| Harmony Memory (6 stages) | partrehearsal | **sing** | yes, `initAudio` | `singingSession`, **no stage** | stage bests (device), readiness (account) | live, live7, fix, desc, p7, p7signed, p9, p10, s6fr, verify, shot · batch1, loopback, entries |
| Choir Bosses (6) | partrehearsal | **sing** | yes | `singingSession`, **no stage** | boss bests (device), readiness (account) | live5, live9, p5, p7, p7signed, p9, p10, peaks, paywall · batch3b, entries |
| Chaos Mode | partrehearsal | **sing** | yes | `singingSession`, **no stage** | best (device) | live5, p5, peaks · batch3b, entries |
| Tempo/Key Ladder (6 rungs) | partrehearsal | **sing** | yes | `singingSession`, **no stage** | best rung (device) | p5 · batch3b, entries |
| Entrance & Cutoff Trainer | partrehearsal | **sing** | yes (`readRawMic`) | `singingSession`, **no stage** | — | timing · firsttick, batch3b, loopback, entries |
| Performance Report / Why Did I Fail? | inside HM and challenge results | read | no | no | runs log (account) | p7, live7 · hooks |
| Choir Passport | choirpassport | read | no | no | readiness + runs (account) | p7, p8 · contrast, shots |
| Locked preview | all three | read | no | no | — | p8, p9, p10, live9 |
| Hooks: Home card, hub status, Journey milestone, 3 achievements | home, songs-hub, journey | read | no | no | `cr.firsts` (account) | p9, live9 |

- **Six things you sing into, none with a stage.** Your Choir, Harmony Memory, the three challenges (one engine:
  `startChallenge`) and the Entrance & Cutoff Trainer all call `singingSession(isActive)` with no stage, so the house
  goes down with nothing staged (the 4b survey's finding for One Take, Mirror, Rhythm and Emotion Mode).
- **The rehearsal itself never listens.** "Play" on I Am the Part (`startPartRehearsal`) is a sing-along: no mic, no
  session, the house stays up. Its live readout is the guide part's own GainNode and analyser
  (`choirAnalyserNodes[part]`), not your voice. Only a full play-through at one level counts for readiness.
- **Every choir trainer card is on one page**: below "Your line" there are six cards, each with its own Start
  button, status line, vocal-load gauge and result block, so the page is very long at 390 px (see the screenshots).
- **Scoring is shared**: Harmony Memory, the bosses, Chaos and the Ladder judge each note with `judgeHeldNote`
  (±50 ct, 75% of notes held, attack skipped); results end with the Performance Report and a per-note list with
  "Why?" (Why Did I Fail?). The Entrance & Cutoff Trainer reads onsets and releases on the raw path.

## Per screen and section

### Songs tab (`panel-songs-hub`)
- Shows: hero (`hub_songs_title`, `hub_songs_sub`), then the **Choir World card first** (`cw-hub-feature`: title, a
  "CHOIR PLAN" tag shown only when locked, description, `cwHubStatus` "Last rehearsed: Alto on Demo Hymn — Learning",
  buttons I Am the Part / Choir Workspace / Open Choir Passport), then a grid of six solo tools (Choir Workspace again,
  Studio Mode, AI Duet Partner, Performance Director, Stay in Key, Karaoke Coach, Emotional Singing).
- Already in the §6 order (Choir World first). "Choir Workspace" appears twice (card button and grid card).
- Read. Hooks: `renderCwHubStatus()` (phase 9).

### Song list and song page (`panel-choir`, top)
- There is **no song page**: the song list is the "Practice Songs" card on Choir Workspace (`songSelectRow`, two
  `.mode-card` buttons `data-song-id="hymn"` Demo Hymn and `"ballad"` Autumn Requiem, each with emoji, name and a tag
  "C Major · Beginner–Intermediate · 8 chords"). `selectSong(id)` swaps the live `SONG` and re-renders everything.
- "Practice Track" card: `choirTrackTitle` (built in English: "Demo Hymn — C Major (8 chords)"), the SYNTHESIZED DEMO
  tag, `choir_track_desc` (mentions "PRD §3.3"/"§9"), `songDifficultyBox` (stars, highest/lowest note, "fits your
  range" from the stored range).
- I Am the Part shows the song only as `rehearsalSongLabel` with a "change song" link back to Choir Workspace.

### Mixer and transport (`panel-choir`)
- Five `.track-row`s (Soprano, Lead, Alto, Tenor, Bass; part colour swatch, `vu<Part>` meter, `vol<Part>` slider,
  `mute<Part>`, `solo<Part>`), transport (`choirPlayBtn`, `choirStopBtn`, `choirProgressFill`, `choirLoopCheck`),
  Quick practice chips (`data-practice-part`, `practiceClearBtn`), "Rehearse one part" chips (`rehearseEntryRow`,
  `data-rehearse-part`, labelled "🎙️ I Am the Soprano"…).
- Listen only (`initAudioOnly`, no mic). Playback: `playChoir()`, the per-part gain/analyser/fx nodes, `choirOutNode`
  → `playbackOutNode` (limiter). The phase-5 target is "the mixer as channel strips" (§10).

### Song Lab today: Song DNA, Sonic X-Ray, Music Microscope (`panel-choir`)
- **Song DNA** (`songDnaCard`): `songDnaDimensions` (4 dimensions from the note data: pitch, agility, breath, register) and
  `songDnaMoments` (🔥 difficult moments: highest sustained note, biggest leap, longest descending run).
- **Sonic X-Ray** (`sonicXrayCard`, `cw-gated`): `xraySvg`, all five parts on the song's timeline as coloured note bars
  with note names (the 24 Light contrast rows), section bands, 🔥 markers; tap a section to seek playback, tap a part to
  put that moment under the Microscope.
- **Music Microscope** (`microscopeBody`): a table of every part at the tapped moment (columns Part, Note, Note span,
  At this moment, vs Lead); empty until you tap (`mx_empty`).
- **Harmony Vision** (`harmonyVisionBox`, on I Am the Part): the chord at the playhead, each part's note and interval
  ("is the Lead" for the Lead); follows the playhead while playing, tap a note to inspect it.
- Read. §5 wants: score header, Song DNA as bars, X-Ray as a dark lightbox (`data-house="down"` inset), Microscope as a
  table.

### Rehearsal (`panel-partrehearsal`, top half)
- Title `rehearsalTitle` ("🎙️ I Am the Alto", from `rehearsal_title_<Part>`), sub (`rehearsal_sub`), part chooser
  (`rehearsalPartRow`, `data-rh-part`), song label, **A Cappella** (`acappellaBtn`, `acappellaNote`: your part silent,
  the others through Solo, roll/notes/Harmony Vision hidden via `.rh-hide-ac`).
- **Readiness** (`readinessCard`: `rdDesc`, `rdRule`, `rdRows`, `rdSyncNote`, Open Choir Passport): Learning /
  Developing / Ready per part from levels played (5), Harmony Memory stages (5) and bosses beaten (2); stored in
  `user_progress.choir_readiness`.
- **Guide level** (`rehearsalLevels`, five buttons Learn 100% / Guided 75% / Ensemble 50% / Independent 25% /
  Performance 0%, `rehearsalLevelDesc`, `rehearsalPrevBtn`/`NextBtn`) and the live guide gain readout
  (`rehearsalGainValue`, `rehearsalGainTarget`, `rehearsalGuideVu`, "read from the real audio GainNode").
- **Your line** (`rehearsalPlayBtn`, `rehearsalStopBtn`, `harmonyVisionBox`, `rehearsalRoll` piano roll with your part
  bold and the others faint, `rehearsalNotes` note chips with the current one lit).
- Sing along, **not heard**: no mic, no session. §5 wants five lanes in part colours, your part bold with your voice
  line on it, rehearsal marks, the guide level as a fader with the 5 levels as detents, transport, and the trainers
  behind one button: today there is no voice line because nothing listens.

### Breath Map (`breathMapCard`)
- Every breath point in your part (the gap between one note's release and the next attack): `bmSummary`, `bmShape`,
  `bmLive` (count-in, "breathe now", "next breath in 1.2 s", from the audio clock while the rehearsal plays),
  `breathMapSvg` (your part's notes with names: the 8 Light contrast rows, breath marks, playhead), `bmRows`.
- Read, plus a live cue during playback. Not a trainer: nothing is scored.

### Harmony Memory (`harmonyMemoryCard`)
- Six stages (`hmemStages`): guide at levels 1–4, then A Cappella, then from memory (stage 6: hear the starting note
  in the count-in, then sing the whole part with no choir, guide or notes). `hmemDesc`, `hmemStageDesc`, headphones
  line, `hmemStartBtn` (`.mic-btn`), `hmemStatus`, `vlGaugeHmem`, `hmemResults` (score, held x/8, the Performance
  Report, per-note rows with "Why?").
- Sing. `startHarmonyMemory()`: `initAudio`, `singingSession(()=>harmonyMemory.active)`, no stage.

### Choir Bosses, Chaos Mode, Tempo/Key Ladder (`choirBossCard`, `chaosCard`, `ladderCard`)
- One engine (`startChallenge(kind)`): the real song with a variant (tempo, key) and per-chord effects, scored like
  Harmony Memory.
- **Bosses** (`cbBosses`: 🌊 Drowner, 🌀 Drifter, ⚡ Sprinter, 👻 Ghost, 🎚️ Shifter, 🕳️ Silence): an arena with the
  boss's health (`cbBossName`, `cbBossHp`, `cbBossHpText`) against yours (`cbLives`, `cbLivesText`, "YOU"),
  `cbStartBtn`, `cbStatus`, `vlGaugeCb`, `cbResults`.
- **Chaos Mode**: random surges, dropouts and drifts (`cxDesc`, `cxBest`, `cxStartBtn`, `cxStatus`, `vlGaugeCx`,
  `cxResults`).
- **Tempo/Key Ladder**: six rungs from 1.0× to 1.3× and up to 2 semitones (`tkDirRow` up/down, `tkRungs`,
  `tkRungDesc`, `tkStartBtn`, `tkStatus`, `vlGaugeTk`, `tkResults`).
- Sing. `singingSession(()=>challenge.active)`, no stage. Progress on this device (`ch_storage_note`).

### Entrance & Cutoff Trainer (`timingTrainerCard`)
- Two modes (`ttModeRow`: Entrance / Cutoff), `ttDesc`, headphones line, `ttStartBtn`, `ttStatus`, `vlGaugeTt`,
  `ttResults` (per-note ms early/late, verdicts, average).
- Sing. `startTimingTrainer()`: `initAudio`, onsets/releases from `readRawMic()`, `singingSession`, no stage. The known
  output/input latency item applies (timing.js reads +20 ms on every note, 5a.1).

### Your Choir (`yourChoirCard`, on Choir Workspace)
- Record your own take of any part over the choir, then play your stack: `ycDesc`, headphones line, `ycSummary`,
  `ycParts` (per part: record / play / delete), `vlGaugeYc`, `ycPlayBtn`, `ycStopBtn`, `ycExportBtn` (WAV, phase 10),
  `ycExportNote`, `ycStatus`, storage note.
- Sing (record). `initAudio`, `singingSession` while a take records, no stage. Takes in localStorage per song.

### Performance Report and Why Did I Fail? (inside Harmony Memory and challenge results)
- `perfReportHtml(run)` (`.pr-report`): held %, pitch, timing (on time = voice within the note's first 40%), one
  "real weak point" line, a method note. `noteRowsHtml` + `whyDetailHtml`: each missed note's "Why?" opens what was
  expected (note, Hz, window, frames needed), what the mic caught, the reason, and a cents-over-time plot
  (`whyPlotSvg`).
- Read (results). No own panel today; §10 puts the Performance Report in phase 6 with Studio.

### Choir DNA (`choirDnaWorkspaceCard` on Choir Workspace, and in the Passport)
- A radar with one spoke per part, as far as its readiness goes, coloured by status, the boss record in the middle
  (`choirDnaWorkspaceSvg`, `choirDnaWorkspaceNote`; `cpDnaSvg`, `cpDnaSongRow`, `cpDnaNote`, `cpDnaDesc`). Read.

### Choir Passport (`panel-choirpassport`)
- Hero (`cp_title` 🪪, `cp_sub`), locked preview, `cpEmpty`, `cpContent`: ensemble record (`cpRows`), Choir DNA,
  the "blend isn't shown" note (`cp_blend_note`), readiness history (`cpHistory`), recent scored runs (`cpRuns`),
  `cpSyncNote`. Read. §5 puts both passports in phase 7 (Progress and identity).

### Director Dashboard (`panel-choir`, bottom)
- "Choir roster progress" with a SAMPLE DATA tag and five invented singers (`rosterList`, `renderRoster()`: "Devon R.
  Tenor 61%"…), and copy saying it needs a multi-user backend (mentions PRD §3.3). Read.

### Locked preview and hooks
- `cwPreviewWorkspace`, `cwPreviewRehearsal`, `cwPreviewPassport` (`renderCwPreviews()`): shown instead of the gated
  sections without access; one teaser (Choir DNA from the user's own readiness or a labelled example) and the reason.
- Phase 9 hooks outside Choir World: Home's Choir World card (`renderHomeChoirCard`, "Continue rehearsing"), the Songs
  hub status line, the 21-Day Journey milestone (first Harmony Memory pass) and three achievements (First Choir Boss
  Defeated, A Part Is Ready, First Your Choir Recording).


## The five sub-navigation tabs (HOUSE_LIGHTS.md §6)

Proposed mapping of what exists today (every element ID kept; the sections only move between tabs):

| Tab | Sections |
|---|---|
| **Rehearse** | part chooser + song label, A Cappella, guide level + live guide gain (→ fader with 5 detents), Your line (transport, Harmony Vision, roll, notes → five lanes), the mixer (→ channel strips) and its transport, Quick practice |
| **Song Lab** | Practice Track title and Song Difficulty (→ score header), Song DNA, Sonic X-Ray (→ lightbox), Music Microscope (→ table), Breath Map |
| **Trainers** | Harmony Memory, Choir Bosses, Chaos Mode, Tempo/Key Ladder, Entrance & Cutoff (each result keeps its Performance Report and "Why?") |
| **Your Choir** | Your Choir card (record, play, export) |
| **Passport** | Readiness card, Choir DNA, the Choir Passport page's content (ensemble record, history, runs) |

Doesn't fit, or needs a decision:
1. **Two pages, one song page.** Choir Workspace and I Am the Part both hold song-page sections today; the song list
   (two songs) has no page of its own. Decide whether the song list stays a card or becomes the Choir World landing.
2. **The mixer** sits on Choir Workspace with its own transport, separate from the rehearsal transport. Rehearse needs
   one transport; which one wins (and whether Quick practice stays) is a decision.
3. **Breath Map** is read (Song Lab) but has a live cue tied to the rehearsal's playback (Rehearse).
4. **Readiness** lives on the rehearsal page today; Passport or Rehearse.
5. **Choir Passport** is its own panel and is also reached from Home, the hub and three buttons; as a tab, the panel
   stays and the tab opens it, or its content moves (IDs kept). §10 lists both passports under phase 7 too.
6. **Director Dashboard** (sample data, invented names) fits no tab.
7. **"Rehearse one part" chips** on Choir Workspace become redundant with a Rehearse tab.
8. **The locked preview** spans all tabs (one per page today).
9. **Hooks** stay outside (Home, Journey, achievements).


## The 32 light-theme contrast rows

From `contrast.js` on production (`scripts/design-verify/logs/prod-2026-10-29T16-07-15/contrast-prod.json`, Light,
390 px, signed in), the rows between 3:1 and 4.5:1 that aren't disabled controls. All 32 are note-name labels: white
bold text inside a part-coloured note bar, 8.5 px in Sonic X-Ray and 10 px in Breath Map, so they need 4.5:1 and
measure 4.16–4.22. Dark has none (the bars are darker there).

| # | Panel | Text | Element | Size | Ratio | Colours |
|---|---|---|---|---|---|---|
| 1 | choir | C5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 2 | choir | D5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 3 | choir | C5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 4 | choir | C5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 5 | choir | C5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 6 | choir | C5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 7 | choir | D5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 8 | choir | C5 | `svg#xraySvg > text` | 8.5px 700 | 4.19 | #ffffff on #a77026 |
| 9 | choir | E4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 10 | choir | G4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 11 | choir | E4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 12 | choir | F4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 13 | choir | E4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 14 | choir | F4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 15 | choir | G4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 16 | choir | E4 | `svg#xraySvg > text` | 8.5px 700 | 4.22 | #ffffff on #2f878d |
| 17 | choir | C3 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 18 | choir | G2 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 19 | choir | A2 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 20 | choir | F2 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 21 | choir | C3 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 22 | choir | F2 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 23 | choir | G2 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 24 | choir | C3 | `svg#xraySvg > text` | 8.5px 700 | 4.17 | #ffffff on #708436 |
| 25 | partrehearsal | G4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |
| 26 | partrehearsal | B4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |
| 27 | partrehearsal | A4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |
| 28 | partrehearsal | A4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |
| 29 | partrehearsal | G4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |
| 30 | partrehearsal | A4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |
| 31 | partrehearsal | B4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |
| 32 | partrehearsal | G4 | `svg#breathMapSvg > text` | 10px 700 | 4.16 | #ffffff on #c0598b |

By part colour: Soprano bars `#a77026` (8 rows, 4.19), Tenor `#2f878d` (8, 4.22), Bass `#708436` (8, 4.17) in
Sonic X-Ray; Alto `#c0598b` (8, 4.16) in Breath Map. Lead and Alto labels in X-Ray pass.


## Songs-tab tools that aren't Choir World

| Tool | Panel | What it is | Choir World? | Phase |
|---|---|---|---|---|
| Studio Mode | `studio` | Record takes, no scores | no | 6 (Performance: "Studio as the stage") |
| Performance Director | `performancedirector` | Sing a song, section cues, multi-dimension report | no | 6 (Performance: "the Performance Report") |
| AI Duet Partner | `aiduet` | You sing one part, the choir engine sings the other four (`playChoir`) | uses the choir engine; not under Choir World and not gated | decision: 5 (with the rehearsal, as a Rehearse mode) or 6 (Performance) |
| Stay in Key | `staykey` | Sing over a backing track, chord-tone matching | no | 6 (singing over a track) or 9; not in 4a/4b's lists |
| Karaoke Coach | `karaoke` | Note display, live pitch + timing score | no | 6 or 9; the Karaoke Boss game is phase 8 |
| Emotional Singing | `emotion` | Pitch and dynamic contrast scored separately | no | 6 or 9 (Emotion **Mode** was 4b) |

None of the six was in phase 4a's 14 or 4b's 10 tools. All six call `singingSession` without a stage except Studio
(no session; HOUSE_LIGHTS.md §9 lists it with the tools that sing without `vlSidecar`).


## Copy problems (four languages)

Found by `cwcopy.py` (the keys each section uses: its `data-i18n` attributes and the `t('…')` keys in its code, in
en, fr, es and tr): §7 words ("real", "really", "genuinely", "honest", "PRD", "§", "GainNode" and their translations:
vrai/vraiment/réel, real/realmente/de verdad, gerçek/gerçekten, dürüst…), emoji in strings, and English in the markup or
code with no key. Keys built at run time (`t('rehearsal_title_'+part)` and similar) were checked by hand. No key is
missing a language and none is left in English in another language.

**Songs hub** (22 keys)
- §7 words: `hub_songs_aiduet_desc` (en “genuinely”, es “realmente”, fr “vraiment”, tr “gerçek”); `hub_songs_pd_desc` (en “real”, es “reales”, es “real”, fr “vraies”, fr “vrai”, tr “gerçek”); `hub_songs_studio_desc` (en “real”, es “reales”, fr “vraies”, tr “gerçek”)
- emoji: `cw_label` 🎼; `hub_songs_aiduet_title` 🤝; `hub_songs_pd_title` 🎤; `hub_songs_rehearsal_title` 🎙; `hub_songs_studio_title` 🎙; `rd_open_passport` 🪪

**Choir Workspace** (26 keys)
- §7 words: `choir_roster_desc` (en “honestly”, en “prd”, en “real”, es “honestamente”, es “prd”, es “reales”, es “real”, fr “honnêtement”, fr “prd”, fr “réels”, fr “vrai”, tr “dürüst”, tr “gerçek”, tr “prd”, tr “§”); `choir_sub` (en “genuinely”, en “real”, es “realmente”, es “real”, fr “vraiment”, fr “vrai”, tr “gerçek”); `choir_track_desc` (en “genuinely”, en “prd”, en “real”, es “prd”, es “realmente”, es “real”, fr “prd”, fr “vraiment”, fr “vrai”, tr “gerçek”, tr “prd”, tr “§”)
- emoji: `choir_title` 🎶

**Song Difficulty** (18 keys)
- none found

**Song DNA** (3 keys)
- §7 words: `choir_difficultmoments_label` (en “real”, es “reales”, fr “vrais”, tr “gerçek”); `choir_songdna_desc` (en “real”, es “reales”, fr “réelles”, fr “vraies”, fr “vrais”, tr “gerçek”)
- emoji: `choir_songdna_label` 🧬

**Sonic X-Ray + Microscope + Harmony Vision** (27 keys)
- §7 words: `mx_tap_hint` (en “real”, es “reales”, fr “réels”, tr “gerçek”); `xray_desc` (en “real”, es “real”, fr “vraie”, tr “gerçek”)
- emoji: `mx_title` 🔬; `xray_dna_legend` 🔥; `xray_title` 🩻

**Rehearsal (I Am the Part)** (23 keys)
- §7 words: `rehearsal_live_gain_label` (en “gainnode”, en “real”, es “gainnode”, es “real”, fr “gainnode”, fr “vrai”, tr “gainnode”, tr “gerçek”); `rehearsal_roll_desc` (es “reales”, fr “vraies”, tr “gerçek”); `rehearsal_sub` (en “genuinely”, es “realmente”, fr “vraiment”, tr “gerçek”); `rehearsal_yourline_label` (en “real”, es “reales”, fr “vraies”, fr “vrai”, tr “gerçek”)
- emoji: `hv_title` 👁; `rehearsal_play_btn` ▶; `rehearsal_playing_btn` ⏸

**A Cappella** (4 keys)
- emoji: `ac_btn_off` 🎧; `ac_btn_on` 🎧

**Readiness** (8 keys)
- §7 words: `rd_desc` (es “realmente”, fr “réellement”, tr “gerçek”)
- emoji: `rd_open_passport` 🪪; `rd_title` 📈

**Breath Map** (18 keys)
- §7 words: `bm_desc` (en “real”, es “real”, fr “vrai”, tr “gerçek”)
- emoji: `bm_title` 🌬

**Harmony Memory** (24 keys)
- emoji: `hm_title` 🧠; `rehearsal_playing_btn` ⏸; `tt_headphones` 🎧

**Bosses / Chaos / Ladder** (58 keys)
- §7 words: `cb_desc` (en “real”, es “real”, fr “vrai”, tr “gerçek”); `tk_desc` (en “really”, es “de verdad”, fr “réellement”, tr “gerçek”)
- emoji: `cb_title` 👹; `cx_title` 🌪; `rehearsal_playing_btn` ⏸; `tk_title` 🪜; `tt_headphones` 🎧

**Entrance & Cutoff** (17 keys)
- emoji: `rehearsal_playing_btn` ⏸; `tt_headphones` 🎧; `tt_title` ⏱

**Your Choir** (32 keys)
- emoji: `tt_headphones` 🎧; `yc_export_btn` ⬇; `yc_play_btn` ▶; `yc_playing_btn` ⏸; `yc_title` 🎤

**Performance Report / Why** (36 keys)
- §7 words: `pd_insight_notenough` (en “real”, fr “vraie”, tr “gerçek”); `pd_insight_prefix` (en “real”, es “real”, fr “vraie”, tr “gerçek”)

**Choir DNA** (5 keys)
- §7 words: `cw_teaser_example` (en “real”, es “reales”, fr “vraies”, tr “gerçek”)
- emoji: `dna_title` 🧬; `rd_open_passport` 🪪

**Locked preview** (11 keys)
- §7 words: `cw_teaser_real_tpl` (en “real”, es “real”, fr “vrai”, tr “gerçek”)
- emoji: `cw_label` 🎼; `dna_title` 🧬

**Hooks (milestones, achievements)** (22 keys)
- emoji: `cw_label` 🎼; `journey_cw_label` 🎼; `journey_cw_toast` 🎼

**Choir Passport** (32 keys)
- §7 words: `cp_blend_note` (en “honest”, en “real”, es “real”, fr “honnête”, fr “vrai”, tr “dürüst”, tr “gerçek”); `cp_sub` (es “realmente”, fr “réellement”, tr “gerçek”); `dna_desc` (en “real”, es “real”, fr “réelle”, tr “gerçek”)
- emoji: `cp_history_label` 📈; `cp_runs_hist_label` 🎯; `cp_title` 🪪; `cx_title` 🌪; `dna_title` 🧬; `hm_title` 🧠; `tk_title` 🪜


**English with no key** (shows in English in every language):
- Choir Workspace: `choirStopBtn` "Stop", the "Loop" label (`choirLoopCheck`), the Quick practice line ("Quick practice
  — solos one part, brings the rest down softly for context:"), `choirPlayBtn` "▶ Play" / "⏸ Playing…" (set in code,
  lines ~14646–14677), `choirTrackTitle` "… (8 chords)" (line 20840) with the English song name (the
  `choir_song_*_name` keys exist but aren't used there), and `rehearsalSongLabel` "Demo Hymn (C Major)" (line 14927).
- Songs on Choir Workspace keep their names in every language in `SONGS` (`SONG.name`), used in titles and labels.


## Broken or odd (noted, not fixed)

1. **English in every language**: the Choir Workspace transport (Play/Playing…, Stop, Loop), the Quick practice line,
   the track title and the rehearsal song label (above).
2. **Singing with no stage**: six singing activities call `singingSession` with no stage (house down, nothing staged).
3. **The rehearsal never listens**: you sing along with "Your line" but nothing hears you, so there is no voice line
   (§5 wants one) and the house stays up while you sing.
4. **Director Dashboard** shows invented people as sample data, and its copy talks about the PRD.
5. **Developer copy on screen**: `choir_track_desc` (PRD §3.3, §9), `choir_sub` ("not a simulated UI"),
   `rehearsal_live_gain_label` ("GainNode"), `cp_blend_note` ("Honest about scope"), the "SYNTHESIZED DEMO" tag.
6. **"Choir Workspace" twice** on the Songs tab (the Choir World card's button and its own grid card).
7. **Storage notes disagree with the account**: Harmony Memory and the challenges say "saved on this device only",
   while readiness built from those runs is saved to the account and follows you.
8. **Contrast**: the 32 Light note labels (above).

Seen in the screenshots (2026-11-02, master 7296998, 102 shots, no page errors on any screen):

9. **Music Microscope is cut off at 390**: its five-column table (Part, Note, Note span, At this moment, vs Lead) runs
   past the card, so "At this moment" is clipped mid-word and "vs Lead" is off screen (`workspace-microscope`, both
   390 shots). Fine at 1280.
10. **Breath Map rows don't line up at 390**: the second column ("200 ms · then B4, 4 semitones up") starts at a
    different place in each row, because the first column wraps differently (`rehearsal-breathmap-live`).
11. **Two text sizes for trainer descriptions**: Breath Map, Chaos Mode and the Tempo/Key Ladder set their description
    at heading size (about 19 px), while Harmony Memory, the bosses and Entrance & Cutoff use small body text.
12. **"On time is within 1253 ms"** in the Harmony Memory "Why?" panel: the on-time window is 40% of the note, so on
    a 3.133 s note the sentence names a 1.25 s window, which reads as a mistake to a singer.
13. **Today's focus ignores Choir World**: after Harmony Memory, a boss, Chaos, the ladder, the timing trainer and a
    Your Choir take, the Home card still says "Get your first score · No score yet" (`home-card`, 390 Dark and 1280 Light, taken after the
    390 Light runs on the same account).
14. **Toasts cover the card's last row**: the "Achievement unlocked" toast sits over "Download my choir (WAV)" on the
    Your Choir result (`yourchoir-result`, 390).

Not app problems, but how the shots were taken: the fake mic sings one steady A4 from the start, so the Entrance &
Cutoff result reads 0/8 "no entrance detected" (there is no onset to catch) and the boss and Harmony Memory scores
are low (A4 against the Alto line). The live shots are taken 9 s into each run. In full-page shots the tab bar is
moved to the page's end for the capture only (otherwise it is drawn over the content where the viewport ends).
French pass (`english-in-fr.json`): the only English left on the French pages is on the Choir Workspace: "▶ Play",
"Stop", "Loop" and the Quick practice line (item 1). The track title and the rehearsal song label are song names.

