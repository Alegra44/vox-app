Redesign phase 2: Lighting. Work on a branch, no deploy. I review the screenshots and the diff before anything ships.

0. SETUP
- git checkout master && git pull, then git checkout -b redesign/phase2.
- Save this whole message as design/house-lights/PHASE2.md and commit it first.
- Update HOUSE_LIGHTS.md to v1.3 with these decisions (changelog line + §9 Lighting hook rewritten):
  · houseSession(isActive, stage) does the lighting. singingSession(isActive, stage) = houseSession plus vlSidecar(isActive), with the same predicate; it returns vlSidecar's promise.
  · Lights go down only when a session passes a stage element that sits in the active panel (or in an open overlay). Without a stage, nothing changes on screen.
  · The stage re-lays out the live panel: everything else in it is hidden. It is not an overlay. Reason: scripts check that buttons stay topmost and that the gauge stays displayed while singing.
  · The header and tab bar stay on the stage at 38% opacity and still work (leaving stops the session, as today).
  · Allowed on the stage besides the singing controls: the vocal-load gauge, the Vocal Load break banner and the vocal health banner. They are safety signals.
  · Pitch Match dims for the whole take (reference tone, cue and singing), not only while listening.
  · Features that sing without vlSidecar (Register Coach, Voice Quality, Studio, Your Choir recording, part rehearsal, some games) get their call in the phase that rebuilds them.
  · The pre-session warm-up overlay is always a stage (data-house="down").
  · Results pattern: .vc-result.

1. GUARDS FIRST (commit before touching the app)
a) scripts/design-verify/house.js. Runs on the local build in Light and Dark, at 390 and 1280. It feeds the fake mic a steady sung note from the test data and checks:
   1. Tuner: after #micBtn, within 1.0 s:
      · body data-house="down"
      · #tunerStage.is-live, and its panel has .is-staged
      · the title block is offstage
      · header and tab bar at opacity ≈ 0.38, and elementFromPoint on a tab returns that tab
   2. Tuner lock: on the steady note, #centsDisplay reads "In tune" and #tunerLockFill is at opacity 1.
   3. Tuner stop (#micBtn):
      · data-house="up" within 1.5 s
      · no is-live, is-staged, data-offstage or data-stage-path left anywhere
      · #tunerResult visible with a number
   4. Navigation mid-session: start the Tuner, click .snb-item[data-shell="home"], and data-house="up" within 100 ms (instant) with no marks left.
   5. Pitch Match: after #pitchListenBtn:
      · house down within 1.5 s and never up while the button is disabled (sample every 100 ms)
      · #pitchLane's voice path gains points while singing
      · after the result: up within 1.5 s, #pitchResult visible, #pitchTrace has a path
   6. Not staged: a Breath Trainer hold and an Interval Match take keep data-house="up" throughout.
   7. Reduced motion (emulated): the dimmer never gets .is-on, and the house switches instantly.
   8. While down, meta theme-color is #060708; afterwards it's restored.
   9. #warmupOverlay has data-house="down".
   10. Break banner (signed in): with the Tuner live, call vlShowBreak(today, 80, false):
       · #vlBreak is displayed (not offstage)
       · #micBtn is still topmost (batch3c's check)
   On master this script has nothing to test; say so in the report.
b) contrast.js: add these states, in Light and Dark:
   · Tuner live (unlocked and locked)
   · Tuner result
   · Pitch Match during the take
   · Pitch Match result (heard and not heard)
   · the warm-up overlay
   Same gates. Stage text counts too.
c) shots.js: add the same states, plus a frame sequence for the motion: 0, 80, 160, 320, 480, 640, 900 and 1300 ms after the Tuner starts, and the same after it stops, at 390 Light.

2. BUILD (one commit per item)

2.1 Lighting engine (near stopAllActiveSessions ~18408)
- houseSession(isActive, stage) and singingSession(isActive, stage) as described in §0.
- One requestAnimationFrame watcher runs while any session is registered:
  · Down while any session's isActive() is true and its stage is in the active panel or an open overlay. The newest session's stage is the live one.
  · Up after 600 ms with none active. Sessions whose predicate is false get dropped.
- Dimmer: one .hl-dimmer element after the sprite. Going down or up: the dimmer fades in (--hl-d-house/2), then the house switches and the stage enters or exits, then the dimmer fades out. With reduced motion, switch at once with no dimmer. pointer-events stay none throughout.
- While down, meta theme-color is #060708. Restore it on the way up.
- stopAllActiveSessions(): house up instantly (no dimmer, no 600 ms), clear all sessions, exit the stage.
- Replace all 34 vlSidecar(…) calls with singingSession(…), same predicate. Pass a stage only for the Tuner and Pitch Match. vlSidecar itself is unchanged.

2.2 Stage pattern (generic, CSS + stageEnter/stageExit)
- stageEnter(stage):
  · the stage gets .is-live and its panel gets .is-staged;
  · every sibling of the stage, and of each ancestor up to the panel, gets data-offstage (display:none !important), except #vlBreak and anything with [data-keep-on-stage];
  · those ancestors get data-stage-path (no card chrome: background none, border 0, padding 0, margin 0, no shadow);
  · scroll the page to the top.
- stageExit() removes every mark.
- Inside a stage, .vc-paper-only is hidden while live and .vc-live-only is shown only while live.
- Stage layout: a centred column, min-height = 100dvh minus the header and tab bar, max-width 560px, gaps from --hl-s*.
- body[data-house="down"]: header and tab bar at opacity .38 (1 on :hover and :focus-within), transition --hl-d3, none with reduced motion. Never display:none and never visibility:hidden.

2.3 Results pattern (.vc-result, CSS only, reusable)
- One big number: --hl-t-metric-l, wide, tabular.
- A label (hl-h3).
- One coach sentence (.hl-coach).
- The take's chart.
- Rows of dimensions: a dl with hairline rules.
- details.hl-measure last.
- It sits on paper.

2.4 Tuner (panel-tuner; handler ~5150, updateTunerUI, setNeedle)
- Wrap the ring, #micBtn, #vlGaugeTuner, #vocalHealthBanner and the .stat-row in <div class="vc-stage" id="tunerStage">. .stat-row gets vc-paper-only; the scripts read those stats by textContent.
- Call: singingSession(()=>mode==='tuner', tunerStage).
- Ring:
  · idle: stroke var(--hl-rule);
  · approaching: var(--hl-ink-2);
  · locked (the existing |cents| ≤ 6): var(--hl-voice), plus a new disc #tunerLockFill (r 80, fill var(--hl-lock)) that fades in over --hl-d1, with the note and cents text in var(--hl-on-voice).
  · Keep the classes flat, sharp and locked, and the exact texts "In tune" and "Listening…".
  · Flat/sharp text becomes var(--hl-ink-2), not red.
  · The lock pulse glow is var(--hl-glow).
- On the stage: the ring is min(76vw, 320px) and the note uses the display style (--hl-t-display, wide, light weight).
- Ambient glow: the stage voice colour in both states, alpha by closeness, locked ×1.5. No brass. Parse --hl-voice from the stage once per session.
- Result: a new #tunerResult (vc-result, role="status", aria-live="polite") right after the stage.
  · On stop, with 6 or more readings: the big number is the session's average stability (the same average recordDailyMetric gets; compute it before the reset and show it signed in or out; recording stays signed-in only, unchanged).
  · Label tuner_result_label, meta = duration m:ss since tunerSessionStartTime, then hl-measure (tuner_measure).
  · Hidden with fewer than 6 readings, and again when a new session starts.
  · "Sing it again" is #micBtn itself; no new button.

2.5 Pitch Match (#exPanelPitch; handler ~16211; captureAccuracyForTarget ~15973)
- Wrap #pitchModeSub, #pitchTargetNote, the .btn-row and #vlGaugePitch in <div class="vc-stage" id="pitchStage"> inside .ex-target-card. #pitchResult stays after it (offstage while live).
- New vc-live-only elements in the stage: #pitchStageHz (target frequency, e.g. "220.0 Hz"), the lane svg #pitchLane, and the cents meter #pitchCents with its readout #pitchCentsRead.
- On the stage:
  · #pitchPlayBtn, #pitchNextBtn and #pitchAgainBtn get vc-paper-only.
  · #pitchListenBtn stays and keeps its texts (Listen… / Sing now / Listening…), styled as a quiet status pill while disabled.
- Lighting: as soon as initAudio() succeeds, houseSession(()=>btn.disabled, pitchStage). The existing call becomes singingSession(()=>listening, pitchStage).
- captureAccuracyForTarget: two additive changes only.
  · Optional opts.onFrame(t, cents), called after each voiced sample is pushed, inside try/catch, so drawing can never touch scoring.
  · When heard, return samples ({t, cents}, after vibrato tolerance) in the result.
  Nothing else in the function changes. Only Pitch Match passes onFrame.
- Lane:
  · x is time across LISTEN_WINDOW_MS[level]; y is cents ±150, clamped.
  · Grid lines at −100, 0 and +100, labelled with noteNameFromMidi(target−1), the target and target+1.
  · Target line in ink; the voice path in var(--hl-voice) with var(--hl-glow), raw cents, with a dot at its head.
- Meter: ticks from −50 to +50 (big ones at −50, 0, +50). The needle and readout use a fresh makeVibratoTolerantLive() per take, so natural vibrato doesn't flicker.
  · |c| ≤ 6 → pm_live_on, and the target note locks: on-voice text on a var(--hl-lock) pill.
  · Otherwise pm_live_flat / pm_live_sharp with n = |c|.
  · Before the voice arrives, the lane and readout are empty; the pill carries the cue.
- Result (#pitchResult gets vc-result):
  · #pitchAccuracyVal is the big number, with the new label pm_result_label.
  · #pitchFeedback uses .hl-coach.
  · A new #pitchTrace svg from res.samples: target line, voice line, axis labels "0 s" and "{window} s".
  · #pitchSubScores, #pitchCentsDetail and #pitchConfidenceBadge are restyled as dimension rows; keep their IDs and content.
  · hl-measure last (pm_measure).
  · Not heard or no voice: no trace, the rest as today.
- renderConfidenceBadge: inline colours become classes: High → --hl-ok, Moderate → --hl-ink-2, Low → --hl-warn.

2.6 Warm-up overlay: add data-house="down" to #warmupOverlay (~4582). Check it in the shots and in contrast.js.

2.7 Strings, in en / fr / es / tr. Grep scripts/ for every string you change or reuse.
- tuner_result_label: Average stability / Stabilité moyenne / Estabilidad media / Ortalama kararlılık
- pm_result_label: Pitch accuracy / Justesse / Precisión de afinación / Perde doğruluğu
- pm_live_on: On the note / Sur la note / En la nota / Tam notada
- pm_live_flat: {n} cents flat / {n} cents trop bas / {n} cents por debajo / {n} sent pes
- pm_live_sharp: {n} cents sharp / {n} cents trop haut / {n} cents por encima / {n} sent diyez
- measure_summary: How this is measured / Comment c'est mesuré / Cómo se mide / Nasıl ölçülüyor
- tuner_measure:
  en: Stability is 100 minus three times how much your pitch wavers, in cents, over its last 30 readings (about half a second). This number is the average for the whole time you sang. The ring locks when you're within 6 cents of the note.
  fr: La stabilité vaut 100 moins trois fois l'écart de votre hauteur, en cents, sur ses 30 dernières mesures (environ une demi-seconde). Ce chiffre est la moyenne de tout le temps où vous avez chanté. L'anneau se verrouille quand vous êtes à moins de 6 cents de la note.
  es: La estabilidad es 100 menos tres veces cuánto oscila tu afinación, en cents, en sus últimas 30 lecturas (alrededor de medio segundo). Este número es la media de todo el tiempo que cantaste. El anillo se fija cuando estás a 6 cents o menos de la nota.
  tr: Kararlılık, perdenizin son 30 ölçümde (yaklaşık yarım saniye) sent cinsinden ne kadar dalgalandığının üç katının 100'den çıkarılmasıyla bulunur. Bu sayı, şarkı söylediğiniz sürenin tamamının ortalamasıdır. Notaya 6 sent yaklaştığınızda halka kilitlenir.
- pm_measure. {beg}/{int}/{pro} are filled from t('skill_level_beginner'/'_intermediate'/'_professional'), so the level names match the app:
  en: Accuracy is 100 minus your average distance from the note, in cents, times 0.45 at {beg}, 0.6 at {int} or 0.9 at {pro}. Listening starts when you start singing and lasts 3, 2.5 or 2 seconds; the first 0.4 seconds aren't scored. Natural vibrato counts as its centre, not as an error.
  fr: La justesse vaut 100 moins votre écart moyen à la note, en cents, multiplié par 0,45 en {beg}, 0,6 en {int} ou 0,9 en {pro}. L'écoute commence quand vous commencez à chanter et dure 3, 2,5 ou 2 secondes ; les 0,4 premières secondes ne sont pas notées. Un vibrato naturel compte pour son centre, pas comme une erreur.
  es: La precisión es 100 menos tu distancia media a la nota, en cents, multiplicada por 0,45 en {beg}, 0,6 en {int} o 0,9 en {pro}. La escucha empieza cuando empiezas a cantar y dura 3, 2,5 o 2 segundos; los primeros 0,4 segundos no se puntúan. El vibrato natural cuenta como su centro, no como un error.
  tr: Doğruluk, 100'den notaya sent cinsinden ortalama uzaklığınızın {beg} seviyesinde 0,45, {int} seviyesinde 0,6, {pro} seviyesinde 0,9 katının çıkarılmasıyla bulunur. Dinleme, şarkı söylemeye başladığınızda başlar ve 3, 2,5 veya 2 saniye sürer; ilk 0,4 saniye puanlanmaz. Doğal vibrato bir hata olarak değil, merkezi olarak sayılır.
- Check these numbers against the code (multipliers, LISTEN_WINDOW_MS, LISTEN_GRACE_MS, the 30-reading buffer, the 6-cent lock) before committing. If one differs, the code wins: fix the text and tell me.

3. CHECKS (branch, local build, same machine)
- hooks.js: 0 failures.
- house.js: every check passes in both themes and at both widths.
- contrast.js with the new states: same gates. The shell, stage and result text must be ≥4.5.
- Every verify suite once, as in phase 1:
  · batch1–3c
  · warmup entries and tracking
  · levelup
  · glider courses and flight
  · range reload
  · tt firsttick
  · the cv suites that pass on master
  · vq: listenwin, picker, pmframes, rtfsoft, loopback, levels, and vibfix and noisegate in regress mode
  Any failure is re-run on master and classified; only a Regression blocks. The onFrame hook must leave every score unchanged (0 regressions in vibfix and noisegate). pmframes is the frame-rate gate: branch frames per take within master's spread.

4. SCREENSHOTS
- Tuner: idle, live (unlocked and locked), result.
- Pitch Match: idle, the reference/cue moment, live, result (heard, and not heard).
- A non-staged take (Breath) to show it's unchanged.
- The warm-up overlay.
- Each at 390 and 1280, Light and Dark, plus the two motion sequences.
- Push to an orphan branch review/phase2 (no code), and push redesign/phase2. Secret check before both pushes.

5. REPORT, then stop
- Commits; house.js, hooks and contrast results; the suite table; the pmframes numbers; anything the code made you change in the strings.
- No merge and no deploy until I've reviewed.

Rules as before: keep every ID, data-i18n key, data-panel, data-shell and data-enter-panel value, and every protected class and string (§9, including "In tune", "Listening…" and the ex_sing_now cue). No new dependencies. Every new string in all four languages.

---

## 2.8 fixes (review of phase 2, verbatim)

Phase 2 review: approved with one fix round (2.8) before deploy. Same branch (redesign/phase2). Add this message as "2.8 fixes" at the end of PHASE2.md and commit that first.

Keep: the lighting engine, the stage pattern, the motion timing, the Tuner lock, the Pitch Match stage layout, the warm-up overlay, and all seven of your differences from the spec (33 call sites, 0.09 glow base, ink-2 on #centsDisplay only, scroll-back, the probe, div rows, theme colour from --hl-bg). The glider-courses stub fix stands.

Decision 1, the dimmed header and tab bar: neither (a) nor (b). Dim by colour, not opacity:
- No opacity on the header or tab bar while the lights are down.
- While down, all their text and icons are var(--hl-ink-3), including the wordmark, its mark and the active tab label. The playhead is --hl-ink-3 too, so on the stage only the singer's own voice is in the voice colour.
- :hover and :focus-within bring them back to var(--hl-ink).
- Update house.js to check the computed colour instead of opacity, and to check that they stay clickable.
- contrast.js now has no exception for them: the stage gate is ≥4.5 for every text.

Decision 2, re-check: yes, once, covering both phases. After the fixes below and their short checks:
- Run vibfix and noisegate in regress mode, with 9a3bfbf (before phase 1) as the "before" side and redesign/phase2 HEAD as the "after" side. Default runs.
- Nothing else runs at the same time.
- Phase 2 deploys only if it shows 0 Regressions.
- If one appears, bisect it to phase 1 or phase 2 before fixing.
- Push the screenshots and send the report before this run starts. I'll review while it runs.

The fixes:

A. Pitch Match live readout and lock (bug)
- pmLaneFrame(t, cents) shadows the global t(): every frame throws at t('pm_live_on'), and the empty catch in captureAccuracyForTarget hides it. So the readout never shows and the target never locks.
- Rename the parameter (ms).
- The catch logs the first error per take with console.error and stays silent after that. It still never touches scoring.
- house.js gains these checks:
  · with the steady stimulus, #pitchCentsRead reads pm_live_on and #pitchTargetNote has .pm-locked at some point;
  · with the sharp stimulus, it reads pm_live_sharp with a number and never locks;
  · the page logs no console errors during a take.
  Also grep for any other function parameter or local named t that sits next to a t('…') call.

B. Cents meter: labels −50, 0, +50 under the big ticks, 12px, var(--hl-ink-3).

C. Result chart (#pitchTrace):
- About 120px tall at 390, as in the mockup.
- Axis labels render at 12px (--hl-t-label). Size the svg so viewBox scaling doesn't shrink the text, or put the labels outside the svg.

D. The big number in .vc-result is var(--hl-ink): no green, amber or red on it (the coach line and the confidence row carry the meaning). The .ex-accuracy good/mid/low colours stay for the results that aren't rebuilt yet (Interval, Scale, Ear).

E. Not heard or no voice: the big "—" is hidden. The label, the coach line and "How this is measured" remain.

F. details.hl-measure: the summary starts with the hl-info icon (as in house-lights.css and the mockup) and has a visible open state. Add a screenshot of it open.

G. Tuner result: while #tunerResult is showing, hide the live .stat-row: its last-moment values next to the average look like a contradiction (Stability 72% vs Average 79%). It shows again when a new session starts. CSS with :has() or a class on the card, your choice. The scripts read those stats only while singing.

H. "Sing it again (A4)" (#pitchAgainBtn) isn't visible in the heard-result shots. Find out whether that's the shot harness or a bug in the stage marks (vc-paper-only and the inline display). It must show after a heard take. Add a house.js check for it.

Checks after the fixes (one at a time):
- hooks.js
- house.js with the new checks
- contrast.js (no exceptions)
- batch1, batch3c (topmost #micBtn with the break banner), warmup entries
- listenwin, picker, pmframes ×1, glider-courses
Same rule: a failure is re-run on the "before" side and classified.

Then:
- shots.js for the states and the motion sequences; push to review/phase2 as a new commit.
- Push redesign/phase2, with the secret check before both pushes.
- Send me the report.
- Then start the 4¾-hour regress run (decision 2) and report when it ends. No merge and no deploy until I've reviewed the shots and the run shows 0 Regressions.
