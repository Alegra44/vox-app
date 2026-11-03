# Phase 6 survey: the Songs-tab solo tools and the Performance Report

Read-only survey for the phase 6 spec (instructions in PHASE5.md, "## 5.1", "WHEN I TYPE deploy", step 4). Nothing in the
app was changed. Code references are to `deploy/index.html` at master 6266166 (phase 5 + 5.1 live as
dpl_7wMjFuZHdg3XE479UaD9N41gWCBY). Screenshots of every tool idle, live and with its result are on `review/phase6-before`
(`sheets/before.jpg`), taken with `scripts/design-verify/shots6before.js`, signed in with a Choir-plan test account
(all six are Pro), the fake mic singing a steady A4, at 390 Light, 390 Dark and 1280 Light. `states.json` there has
`data-house` for every shot and the leave probe (below). Copy findings come from `scripts/design-verify/survey6/copy6.py`
plus reading the code for strings that have no key.

## At a glance

| Tool | Panel | Measures | Mic path | House / session | Leaving mid-run |
|---|---|---|---|---|---|
| Studio Mode | `panel-studio` | nothing (records a 15 s take) | `recordShortClip` (MediaRecorder on `micStream`) | `singingSession(()=>btn.disabled)`, no stage | keeps recording and saves the take off-screen |
| Performance Director | `panel-performancedirector` | pitch, timing, "dynamics" per note against Lead | shared mic (`analyser` + `autoCorrelate`, `readRawMic` RMS) | `singingSession(()=>pdActive)`, no stage | not stopped (`pdActive` not in `stopAllActiveSessions`); finishes off-screen |
| AI Duet Partner | `panel-aiduet` | nothing (plays the other four parts) | none of its own; the vocal load sidecar reads the mic | `singingSession(()=>aiDuetActive && choirIsPlaying)`, no stage | choir stops; the button still reads "Stop" |
| Stay in Key | `panel-staykey` | % of voiced frames within ±35 ct of a chord tone | shared mic | `singingSession(()=>stayKeyActive)`, no stage | not stopped; backing pad and vocal load run on; result and skill score recorded off-screen |
| Karaoke Coach | `panel-karaoke` | pitch and timing per Lead note, missions | shared mic | `singingSession(()=>karaokeActive)`, no stage | loop stops, but the backing pad plays to the end of the song, the button stays "Stop", no result |
| Emotional Singing | `panel-emotion` | pitch against Lead, "expression" (loudness variation) | shared mic (`analyser` + `readRawMic` RMS) | `singingSession(()=>emotionActive)`, no stage | not stopped; finishes off-screen and records an expression score |
| Performance Report | `pdResultCard` (PD's) and `perfReportHtml` (Choir World's) | see below: two different reports with one name | — | — | — |

None of the six has a stage: the house never goes down (every shot in `states.json`: `"up"`). None is in house.js,
stopcheck.js, contrast.js, copyscan.js or scores.js. All six are on the old layout (`journey-hero`, `key-card`,
`dual-score`, inline styles), not the House Lights take layout the 4a/4b tools use.

## Per tool

### Studio Mode (`panel-studio`, markup 4377–4400, code 23541–23597)

- **Measures / scores:** nothing; "no XP, no streak, no gamification". Records one 15 s clip (`recordShortClip(15000)`,
  MediaRecorder at 32 kbit/s, webm/opus) and lists takes with `<audio controls>`. At most 3 takes; there is no delete,
  so after the third the tool is closed for good (`studio_limit_reached`: "delete isn't built yet").
- **Live / result:** `#studioSongName`, `#studioSongKey`, `#studioSongTempo` (`SONG.tempo+' BPM'`), `#studioMicStatus`,
  the 180 px round `#studioRecordBtn` / `#studioRecordLabel` (disabled while recording, label "REC… 15s"),
  `#studioRecordNote`, `#vlGaugeStudio`, `#studioTakesList`. No timer or level while recording.
- **Mic / session:** `micStream` via `initAudio`; `singingSession(()=>btn.disabled)` without a stage.
- **Storage:** a take is the base64 data URL inside `progress.studioTakes`, so it travels in every `saveProgress()`
  PATCH of `/me/progress` from every tool afterwards (15 s at 32 kbit/s is about 60 kB, about 80 kB as base64; three
  takes ≈ 240 kB on every save).
- **Verify scripts:** batch3a (vocal load, the saved note, take size), choir-verify yc.js (records through it to check
  MediaRecorder), warm-up entries.

### Performance Director (`panel-performancedirector`, markup 4421–4450, code 23749–23884)

- **Measures / scores:** the Lead line, note by note, against `SONG.parts.Lead.notes` (section cues from
  `getSongSections()`: the notes split in four as Verse / Pre-Chorus / Chorus / Bridge).
  - per note: pitch = 100 − 0.6 × mean |cents| (vibrato taken out, readings within ±300 ct); timing = 100 if the first
    voiced frame is in the first 40 % of the note, 50 if later, 0 if never;
  - report: Pitch = mean over heard notes; Timing = mean over heard notes; Technique = (Pitch + Timing)/2;
    Dynamics = (max − min)/max of frame RMS above 0.008, × 150, capped at 100; insight = the lowest of the four.
  - records skill `pitch`; `registerExerciseCompletion`.
- **Live:** `#pdBriefingCard` (`#pdBriefingRows`, `#pdStartBtn`) → `#pdRunnerCard` (`#pdCurrentSection`,
  `#pdCurrentCue`, `#pdCurrentNote`, `#pdProgressFill`, `#vlGaugePd`). **No Stop button**: a performance can only end
  by running out or by leaving (which doesn't stop it, below).
- **Result:** `#pdResultCard` (`#pdResultRows`: four `record-row`s, values in inline `color:var(--teal)`;
  `#pdInsight` in teal; `pd_expression_note`).
- **Mic / session:** shared mic; `singingSession(()=>pdActive)` without a stage. The rAF id isn't kept.
- **Verify scripts:** batch3b (vocal load, runs to the end), warm-up entries.

### AI Duet Partner (`panel-aiduet`, markup 4402–4419, code 24127–24165)

- **Measures / scores:** nothing. Mutes your part in `choirState`, `playChoir()` plays the other four.
- **Live / result:** `#aiDuetPartRow` (five `ex-type-btn`, `data-duet-part`), `#aiDuetNote`, `#aiDuetStartBtn`
  (its whole innerHTML swapped between hard-coded "Start singing with AI" and "Stop"), `#vlGaugeDuet`. No result; at
  the song's end nothing changes (the button keeps "Stop" until clicked).
- **Mic / session:** no reading of its own; `singingSession(()=>aiDuetActive && choirIsPlaying)` (vocal load sidecar)
  without a stage. The mute is written into the shared `choirState`, so Choir World's mixer opens with that part still
  muted afterwards.
- **Verify scripts:** batch3a (vocal load), warm-up entries.

### Stay in Key (`panel-staykey`, markup 3934–3964, code 14441–14535)

- **Measures / scores:** each frame's pitch (vibrato taken out live, `makeVibratoTolerantLive`) against the nearest
  tone of the current chord (`nearestChordToneCents`); in key = within ±35 ct. Result = in-key frames / voiced frames,
  as a %. Records skill `pitch` when more than 10 frames were voiced. Backing pad: `playBackingPad(false)` (the four
  non-Lead parts as sine tones).
- **Live:** `#stayKeyRingWrap` (`#stayKeyRingFill` ring: closeness, teal in key / coral drifted), `#stayKeyChordLabel`
  (`SONG.chordLabels`, e.g. "V — G Major"), `#stayKeyStatus` ("In key" / "Drifted — nearest G, +187 cents" /
  "Listening…", all hard-coded English), `#stayKeyStartBtn`, `#vlGaugeStayKey`, `#stayKeyProgressFill`.
  `locked-pulse` is added with a new `setTimeout` on every in-key frame.
- **Result:** `#stayKeyResult` (`#stayKeyAccuracyVal` big %, `staykey_feedback_text`). No per-chord breakdown, no
  "how this is measured".
- **Verify scripts:** batch1 (vocal load), vq-verify vibfix.js and noisegate.js (its status text with vibrato and with
  silence), audio-verify vlcompare.js, warm-up entries (plus the research scripts analyze/pivot/xscope).

### Karaoke Coach (`panel-karaoke`, markup 4010–4038, code 14717–14903)

- **Measures / scores:** per Lead note, the Performance Director formulas (pitch 100 − 0.6 × mean |cents|; timing
  100 / 50 / 0). Result: Pitch = mean over heard notes, Timing = mean over **all** notes (PD: heard only). Saves the
  best (Pitch + Timing)/2 per song in `progress.songBestScores`; records skill `pitch`. Missions (`renderKaraokeMissionObjectives`):
  Verse / Chorus ≥ 70, final note ≥ 75, no note missed; bonus Chorus ≥ 90, timing ≥ 85, pitch ≥ 90.
- **Live:** `#karaokeRollSvg` (roll of Lead notes scrolling at 40 px/s; `#karaokeLiveCursor` teal within ±25 ct,
  coral outside; a note turns `--hl-ok` at ≥ 70, coral below, hairline if not heard), the "NOW" label, `#karaokeStartBtn`,
  `#vlGaugeKaraoke`, `#karaokeLiveLine` (a chip per finished note: "Note 3 · 64%" / "Note 3 · missed", hard-coded English).
- **Result:** `#karaokeResult` (`#karaokePitchVal`, `#karaokeTimingVal`), `#karaokeMissionCard` (`#karaokeMissionRows`,
  `#karaokeMissionBonusRows`; ✅ ⬜ 🔥 in the rows).
- **Mic / session:** shared mic; `singingSession(()=>karaokeActive)` without a stage.
- **Verify scripts:** batch1 (vocal load), warm-up tracking.js (the roll's geometry; the warm-up's song mode reuses it),
  warm-up entries (plus analyze/pivot/xscope).

### Emotional Singing (`panel-emotion`, markup 3966–3986, code 14536–14620)

- **Measures / scores:** Pitch = 100 − 0.6 × mean |cents| against the Lead note, per note with vibrato taken out.
  Expression = coefficient of variation of frame RMS (frames with a pitch, RMS > 0.012) × 250, capped at 100, shown as a %.
  One of four coach lines by Pitch ≥ 85 / Expression < 35 / ≥ 55. Records skill `expression`; sets `progress.triedEmotion`.
- **Live:** `#emotionChordLabel` (the Lead note name), `#emotionProgressFill`, `#emotionStartBtn`, `#vlGaugeEmotion`.
  Nothing about loudness is shown while you sing.
- **Result:** `#emotionResult` (`#emotionPitchVal`, `#emotionExpressionVal`), `#emotionFeedback`.
- **Mic / session:** shared mic; `singingSession(()=>emotionActive)` without a stage. Not the same tool as 4b's
  Emotion **Mode** (`panel-emotionmode`, two takes compared, no score).
- **Verify scripts:** batch2 (vocal load, its result text), warm-up entries.

### Performance Report

Two different things carry the name `pd_report_label` ("Performance Report"):

| | Performance Director's (`#pdResultCard`) | Choir World's (`perfReportHtml`, 17127) |
|---|---|---|
| Where | its own card after a PD run | inside Harmony Memory and Choir Boss / Chaos / Ladder results |
| Rows | Technique, Pitch, Timing, Dynamics | Notes held, Pitch, Timing (each with a detail line) |
| Pitch | 100 − 0.6 × mean |cents| per note, mean over heard | same formula on the frames the verdict was judged from (`prNoteStats`) |
| Timing | 100 / 50 by the first 40 % of the note, mean over heard | same, `PR_ONTIME_FRACTION`, plus the median entry in ms |
| Coach line | `pd_insight_prefix` (§7 word) in teal | `cw_next_tpl` at the One Take size (5.1) |
| Method | `pd_expression_note` only | `pr_method_note` in hl-measure |
| Verify | batch3b (vocal load only) | p7.js, live7.js, hooks.js |

The Choir World one is the House Lights layout from phase 5; PD's is the old one. Technique (an average of two rows
already shown) and Dynamics (below) exist only in PD's.

## Copy problems (four languages)

From `copy6.py` (each tool's `data-i18n` keys and `t('…')` keys, in en, fr, es, tr: §7 words, emoji, missing or
untranslated languages) and by reading the code. No key is missing a language.

**Songs hub cards** (13 keys)
- §7 words: `hub_songs_aiduet_desc` (en "genuinely", fr "vraiment", es "realmente", tr "gerçek"); `hub_songs_pd_desc`
  (en "Real"/"real", fr "vraies"/"vrai", es "reales"/"real", tr "gerçek"); `hub_songs_studio_desc` (en "real",
  fr "vraies", es "reales", tr "gerçek")
- emoji: `hub_songs_aiduet_title` 🤝, `hub_songs_pd_title` 🎤, `hub_songs_studio_title` 🎙

**Studio Mode** (15 keys)
- §7 words: `studio_limit_reached` ("Real limit…"), `studio_notakes`, `studio_scope_note` ("Honest scope…"),
  `studio_takes_label` ("Your real takes"), all four languages each
- emoji: `studio_session_title` 🎙, `studio_mic_connected` ✓
- wrong: `studio_take_saved` "real audio, stored locally" (and its translations): takes are saved to the server
- hard-coded: "BPM" (`renderStudioMode`)

**AI Duet Partner** (4 keys)
- §7 words: `aiduet_sub` (en "real"/"genuinely", fr "vraiment"/"réel", es "realmente"/"real", tr "gerçek"); it also
  names "Choir Workspace" and a "synthesized progression"
- emoji: `aiduet_title` 🤝
- hard-coded: the button "Start singing with AI" / "Stop" (24151, 24165), set as innerHTML. (The five part buttons
  have no `data-i18n` but carry `data-part-name`, which `partName()` translates at 15350; the first `#aiDuetNote` is
  replaced at load by `aiduet_note_tpl`.)

**Performance Director** (13 keys)
- §7 words: `pd_sub`, `pd_direction_label` ("Today's real direction"), `pd_cue_chorus` ("trust your real technique";
  es has none), `pd_insight_prefix` ("Your next real improvement…"), `pd_insight_notenough`, `pd_expression_note`
  ("no reliable real detector… same honest limit"), most in all four languages
- emoji: `pd_title` 🎤
- hard-coded: "Begin the performance" (4433), "Verse" (4437); the section names in the briefing rows and the runner are
  `sec.name` in English (`sectionLabel()` and `section_name_*` exist and aren't used here)
- `pd_sub` names Karaoke Coach ("the exact same pitch and timing capture as Karaoke Coach")

**Stay in Key** (7 keys)
- §7 words: `staykey_sub` (fr "vraies", es "reales", tr "gerçek"; en says "actual chord tones")
- emoji: `staykey_title` 🎼
- jargon: `staykey_tag` "USES KNOWN BACKING TRACK"
- hard-coded: the live status "In key", "Drifted — nearest {note}, {±n} cents", "Listening…" (14490, 14497, 14507)

**Emotional Singing** (10 keys)
- §7 words: `emotion_sub` (en "real", fr "vraiment"/"réel", es "realmente"/"real", tr "gerçek"); it also quotes
  "technically perfect, needs more emotion"
- emoji: `emotion_title` 🎭
- jargon: `emotion_tag` "LOUDNESS-VARIANCE PROXY"

**Karaoke Coach** (20 keys)
- §7 words: `karaoke_sub` (en "real"/"honestly", fr "vraie"/"honnêtement", es "real"/"honestamente",
  tr "gerçek"/"dürüst")
- emoji: `karaoke_title` 🎤, `karaoke_mission_label` 🎵; ✅ ⬜ 🔥 built into the mission rows (14902)
- hard-coded: the note chips "Note {n} · {pct}%" / "Note {n} · missed" (14796); mission section names come from
  `getSongSections()` (used only for matching, not shown)

**Performance Report (Choir World)** (12 keys): none found.

**All four solo tools with a Start button:** `action_start_pro` "Start (Pro)" is shown to people who already have Pro
(and the Choir plan).

## Broken or odd (noted, not fixed)

1. **Leaving doesn't stop three tools.** `stopAllActiveSessions()` (20768) has no line for `stayKeyActive`,
   `emotionActive` or `pdActive`, and never calls `stopBackingPad()`. The leave probe (start, 3 s, the bottom nav's
   Home, read 2 s and 32 s later) on master:
   - Stay in Key: 2 s after leaving still active, 32 backing oscillators playing, vocal load session open; by 32 s it
     had finished off-screen, shown its result and recorded a `pitch` skill score.
   - Emotional Singing: the same; finished off-screen and recorded an `expression` score.
   - Performance Director: same code path (not probed: see 3).
   - Karaoke: `karaokeActive` is cleared, but the backing pad plays on to the end of the song, the button still reads
     "Stop" and no result is shown.
   - Studio Mode: the recording carries on for its 15 s and the take is saved.
   - AI Duet: the choir stops, the button still reads "Stop".
2. **AI Duet leaves your part muted in Choir World's mixer** (`choirState[part].muted = true`, never restored).
3. **Performance Director can only be run once per page load.** Start hides `#pdBriefingCard` (23783) and nothing
   shows it again, so the Start button is gone until a reload (the probe's second Start timed out on it).
4. **Performance Director has no Stop.**
5. **Scores a steady tone gets** (the fake mic: one steady A4 all through, nothing like the Lead line):
   - Emotional Singing: Expression 51 % (a steady tone has no dynamics; the variation is the onset and the room/backing).
   - Performance Director: Dynamics 86, Timing 100 with Pitch 0, Technique 50.
   - Karaoke: Timing 100 % with Pitch 0 %. Timing only asks whether anything voiced arrived in the first 40 % of a note,
     so a tone held through the whole song is "on time" on every note.
6. **Karaoke's note pitch divides by the wrong count:** `vibratoTolerantCents(buf)` sums over its own output but divides
   by `karaokeCentsBuf.length` (14782; PD has the same at 23795). They match only while the helper returns one value per
   reading.
7. **Karaoke and PD average Timing differently** (all notes vs heard notes), with the same formula and the same label.
8. **Studio:** no delete, so three takes end the tool for good; takes ride along in every progress save; the
   "save failed" line can't show (`saveProgress` catches its own errors).
9. **Stay in Key** starts a `setTimeout` per in-key frame for the pulse (60 a second while in key).
10. **No stage, no house:** all six sing with the house up; none has "How this is measured".

## Verify coverage

| Tool | Scripts | What they check |
|---|---|---|
| Studio Mode | vocal-load batch3a; choir-verify yc.js; warm-up entries | vocal load, the saved note and size; MediaRecorder level; the warm-up gate |
| Performance Director | batch3b; warm-up entries | vocal load over a whole run; the gate |
| AI Duet | batch3a; warm-up entries | vocal load; the gate |
| Stay in Key | batch1; vq-verify vibfix, noisegate; audio-verify vlcompare; warm-up entries | vocal load, result identical with/without the sidecar; status text with vibrato and silence; the gate |
| Karaoke | batch1; warm-up tracking, entries | vocal load; roll geometry; the gate |
| Emotional Singing | batch2; warm-up entries | vocal load, result text; the gate |
| Performance Report (CW) | choir-verify p7, live7; design-verify hooks | the report rows and insight; the hooks |

Nothing checks any of the six for the house, Stop/leave, contrast, copy or score regressions (scores.js), and nothing
checks PD's report beyond the vocal load.
