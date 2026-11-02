Phase 5: Choir World. Work on redesign/phase5 (it has PHASE5_SURVEY.md). Save this message as design/house-lights/PHASE5.md and commit it first. No merge or deploy until I've reviewed the screenshots. Rollback target: dpl_BvNJh8hz89bSLfWzbAqHS15G85zs. AC power only, one verify script at a time.

ANSWERS
1. AI Duet goes to phase 6, together with all six Songs-tab solo tools (Studio, Performance Director, AI Duet, Stay in Key, Karaoke Coach, Emotional Singing) and the Performance Report's own screen. Phase 5 is Choir World only.
2. live9's save round-trip times leave the gate (they measure the network, not the app). Keep printing them.
3. Broken items 9, 10, 11, 12 and 14 are in this phase. 13 (Today's focus ignores Choir World) isn't: Choir World runs don't feed the Skill Profile, and whether they should is a product decision for phase 7; record it in HANDOFF. Of the survey's first eight, 1, 2, 5, 6, 7 and 8 are in; 3 and 4 are decided below.
4. Structure: below.

0. SETUP
- HOUSE_LIGHTS.md → v1.8, recording the structure and the decisions below.

1. GUARDS FIRST (commit before touching the app)
a) choirregress.sh is the gate: master vs branch, 3 runs per side, all 21 scripts, ±2 or master's A/A range. Scripts that need a sub-nav tab first get a helper, cwTab(page, 'rehearse'|'songlab'|'trainers'|'yourchoir'|'passport'). Add it in the same commit as the structure change and list which scripts changed.
b) house.js:
   - The six singing activities (Harmony Memory, Bosses, Chaos, Ladder, Entrance & Cutoff, a Your Choir take) and rehearsal playback: down during, up after; stopAllActiveSessions brings the lights up at once; #vlBreak on the stage; Start/Stop topmost; no marks left.
   - The landing, Song Lab, Your Choir (when not recording) and Passport never dim. The X-Ray lightbox is a dark inset on paper and never changes the house.
c) stopcheck.js: the six activities and rehearsal playback, leaving at 0.8 s and 2.6 s: no loop flags, no vlFeed after leaving, playback stopped, Start working.
d) modecheck: rehearsal playback with "Hear me" off makes 0 mic requests; with it on, 1.
e) contrast.js (Light and Dark, every new state); copyscan.js over Choir World in four languages; hooks.js; navcheck (every Choir World page highlights Songs, and the sub-nav marks its current tab with aria-current).
f) shots: as listed in 4.

2. BUILD (one commit per item, four languages for every string)

2.1 Structure
- Choir World landing (the top of panel-choir when no tab is picked; the Songs tab's Choir World card opens it):
  · one raised block, "Continue": the last part and song (from cwHubStatus), with one button to Rehearse;
  · the songs as .hl-item rows (name; key · level · chords; your part's readiness on that song);
  · tapping a song opens its Rehearse tab.
- The song page: a sub-navigation (.hl-seg, aria-selected) under the song title on all three panels: Rehearse · Song Lab · Trainers · Your Choir · Passport.
  · Rehearse and Trainers are panel-partrehearsal; Song Lab and Your Choir are panel-choir; Passport is panel-choirpassport.
  · A tab enters its panel (enterPanel) and sets data-cw-tab on it; CSS shows only that tab's sections. Every element ID stays; sections only show or hide.
  · Deep links keep working: entering "choir" opens Song Lab, "partrehearsal" opens Rehearse, "choirpassport" opens Passport.
  · Sticky under the header at 390 while scrolling; on the stage it's off-stage like everything else.
- What goes where:
  · Rehearse: part chooser (.hl-seg); A Cappella (.hl-key with its LED); Readiness for your part (one row: status and what's next to reach Ready, with the five-part table folded into a details); the guide level fader; the lanes and transport; Harmony Vision; Breath Map.
  · Song Lab: the score header, Song DNA, the mixer with its transport and Quick practice, Sonic X-Ray, Music Microscope.
  · Trainers: the five trainers as .hl-item rows (name; status such as "Stage 2/6" or "Boss 1/6"; best). Tapping a row shows that trainer alone, with a back row. One trainer at a time, so the page is no longer seven cards long.
  · Your Choir: the Your Choir card alone.
  · Passport: the Choir Passport panel as it is, including its Choir DNA. The workspace copy of Choir DNA is hidden.
- Hidden (IDs kept, display only):
  · the Director Dashboard: invented people break rule 5; note in HANDOFF that it needs a real multi-user backend, later;
  · the "Rehearse one part" chips: the part chooser replaces them;
  · the second "Choir Workspace" card in the Songs tab grid.
- Locked preview: one, on the landing, for accounts without access. The panels keep theirs for deep links.

2.2 Rehearse on the stage
- Playback lights the stage: houseSession from Play until Stop or the end, passing the stage.
- The five lanes replace the piano roll (rehearsalRoll keeps its ID). Mockup: lanes() in design/house-lights/build.py.
  · parts in their part colours, top to bottom: Soprano, Lead, Alto, Tenor, Bass;
  · your part bold, the others faint;
  · section letters as rehearsal marks; the playhead;
  · Breath Map's breath marks on your lane, and the current note named on your lane.
- "Hear me" (.hl-key, aria-pressed, remembered on this device):
  · When on, the rehearsal also opens the mic and draws your voice line live on your lane. Display only: no score, and readiness doesn't change.
  · It counts vocal load (singingSession with the stage).
  · Off by default; on by default once the mic has been granted (Permissions API "granted").
  · Off means no mic, exactly as today.
- The guide level is an input.hl-fader with five detents. The five existing level buttons are its labels under it (clicking one sets that level). Prev and Next stay in the DOM, visually hidden. The live gain readout moves into hl-measure.
- Transport: .hl-transport (play/pause, stop) with the hl-play and hl-pause icons; no ▶ ⏸ characters.
- Harmony Vision: one compact line under the lanes (the chord, your note, its interval to the Lead). Tapping a note on the lanes inspects it, as now.
- Note chips: under the lanes, on paper only.
- Breath Map: its card on paper below. On the stage, only the breath marks and its live cue line ("breathe now", "next breath in 1.2 s").

2.3 Song Lab
- Score header:
  · the title from the choir_song_*_name keys (not SONG.name in English);
  · key · chords · level, and Song Difficulty's traits;
  · the synthesised demo as a quiet line, not a tag.
- Song DNA: the four dimensions as ink bars; the difficult moments as rows with their Practise buttons, using hl-flame instead of 🔥.
- The mixer as channel strips. One strip per part:
  · its part colour (data-part) and name;
  · an .hl-meter VU and an input.hl-fader volume (data-part, --val);
  · Mute and Solo as .hl-key with LEDs (aria-pressed).
  Rows at 390, vertical strips from 768. IDs kept (vol<Part>, mute<Part>, solo<Part>, vu<Part>). The transport as .hl-transport, Loop as .hl-key, Quick practice as .hl-chip (aria-pressed).
- Sonic X-Ray as a dark lightbox: a data-house="down" inset in both themes; part colours on dark; labels at least 4.5:1; section letters and flame marks; tapping works as now.
- Music Microscope as a table that fits. At 390, one row per part: part and note on the first line, note span and "at this moment" on the second. "vs Lead" becomes a third column only from 768.

2.4 The six singing activities on the stage
- Each gets a stage (singingSession at its existing call, passing the stage): Harmony Memory, Choir Bosses, Chaos Mode, Tempo/Key Ladder, Entrance & Cutoff, and a Your Choir take.
- The stage is the five lanes from 2.2: your part bold with your live voice line, the playhead, and the current chord and note ("Chord 2/8 · sing B4"). Per activity:
  · Bosses: the two health bars as now (the boss's in --hl-miss, yours in --hl-voice);
  · Chaos: the current event as a quiet line ("choir drifts +35 ct");
  · Ladder: the tempo and key as a quiet line;
  · Entrance & Cutoff: the count-in, then each note's timing as it happens;
  · Your Choir: a red recording tally ("Recording Alto") and Stop recording.
- The Stop button on the stage is the neutral active pill, not voice blue.
- Results use .vc-result:
  · the big number (notes held %) in ink; no red big number;
  · the pass line ("Not passed yet: you need 6 of 8") is the coach line, not red;
  · the Performance Report rows become dimension rows with values in ink, no voice blue;
  · the "next improvement" line becomes the coach line, without "real";
  · per-note rows keep "Why?" as a details; a missed note's status can be --hl-miss;
  · hl-measure carries the method.
- "Why?": the on-time sentence names the rule, not a raw number: "on time means arriving in the first 40% of the note (1.3 s here)", with seconds formatted by Intl.
- Storage notes say what's true: stage and boss progress are saved on this device; the readiness built from them is saved to your account.

2.5 Copy, emoji, contrast, toasts
- Every §7 word in Choir World is rewritten in four languages. Developer copy (PRD, §, GainNode, "not a simulated UI", "Honest about scope") is removed; method text goes into hl-measure.
- Every emoji in Choir World strings is removed: titles, buttons, boss names, status lines. Use icons only where the sprite has one (hl-play, hl-pause, hl-flame, hl-headphones, hl-choir…). Boss cards show number and name, no art.
- The English with no key gets keys: the workspace transport (Play, Playing, Stop, Loop), the Quick practice line, the track title, the rehearsal song label (song names from choir_song_*_name).
- Trainer descriptions: one size (small body text), one or two sentences; the rest goes into hl-measure.
- The 32 Light contrast rows pass 4.5:1. X-Ray's labels sit on dark in the lightbox; Breath Map's labels use a darker part tint or ink text, whichever passes.
- Toasts never cover content: they sit at the top, under the header, at both widths and above the stage too.
- Copy table: PHASE5_COPY.md, old → new in four languages.

3. CHECKS (one at a time)
- choirregress (the gate), house, stopcheck, modecheck, contrast, copyscan, hooks, navcheck.
- batch1, batch3a, batch3b, picker, warm-up entries and tracking, levelup, home.js, loopback (Harmony Memory and Entrance & Cutoff reference tails no worse).
- Vocal load: equal to master ±2 on every existing feature. Rehearsal with "Hear me" on is the one new source; report its load for one play-through.
- Expected changes from master (list them in the report; nothing else may change): the structure, the hidden sections, rehearsal listening when "Hear me" is on, the toast position.

4. SCREENSHOTS
- Midway checkpoint: when 2.1–2.3 are built, push review/phase5-part1 with the Songs tab, the landing, each tab idle, Rehearse playing with Hear me off and on, and Song Lab with the mixer, X-Ray and Microscope, at 390 and 1280, Light and Dark. Carry on with 2.4–2.5 without waiting; I'll review part 1 meanwhile.
- Final, at 390 and 1280, Light and Dark: the Songs tab, the landing, the locked preview, each tab idle, Rehearse playing (both ways), the trainer list, each trainer idle, stage and result, a "Why?" open, Your Choir recording and result, X-Ray, Microscope, the mixer, a toast. Put them on review/phase5 with a contact sheet, and push both branches after the secret check.

5. REPORT, then stop. No merge and no deploy until I've reviewed.
