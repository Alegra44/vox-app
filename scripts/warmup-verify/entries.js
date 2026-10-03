// Pre-session warm-up, phase 1: the warm-up screen appears before a session and is skipped with one visible tap, from
// every session start in the app (every solo feature, Choir World's individual practice, the arcade), and the session
// then actually runs. For each start: the gate is armed as on a new day, the feature is reached through its hub as a
// user would, its start button is clicked, the warm-up must show with its Skip button inside the viewport, one click on
// Skip must close it and the session must start. Then: not shown again the same day, shown again the next day, Escape
// skips, the phone layout, signed out, the four languages.
// Usage (from the main checkout): node scripts/warmup-verify/entries.js [url]   WU_ONLY=a,b runs only those starts.
const { URL_, sleep, check, totals, tone, launch, openPage, account, uid, db, warm, rearm, overlayShown } = require('./common');

const disabled = id => `!!document.getElementById('${id}').disabled`;
const shown = id => `document.getElementById('${id}').style.display==='block'`;
const click = sel => p => p.locator(sel).click();
const range = (lo, hi) => `lowNote = freqToNote(noteToFreq(${lo})); highNote = freqToNote(noteToFreq(${hi}));`;
const lead = `document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]').click();`;
// panel: reached through the hub that lists it; game: an arcade card. Every start below is a place a session begins.
const ENTRIES = [
  // Train hub
  { key: 'tuner', panel: 'tuner', startBtn: 'micBtn', active: "mode==='tuner'", stop: click('#micBtn') },
  { key: 'register', panel: 'register', startBtn: 'regMicBtn', active: "mode==='register'", stop: click('#regMicBtn') },
  { key: 'pitch', panel: 'exercises', tab: '[data-extype="pitch"]', startBtn: 'pitchListenBtn', active: disabled('pitchListenBtn') },
  { key: 'interval', panel: 'exercises', tab: '[data-extype="interval"]', prep: 'intervalTargetMidi = 60', startBtn: 'intervalListenBtn', active: disabled('intervalListenBtn') },
  { key: 'scale', panel: 'exercises', tab: '[data-extype="scale"]', prep: 'scaleRootMidi = 60', startBtn: 'scaleStartBtn', active: disabled('scaleStartBtn') },
  { key: 'breath', panel: 'breath', startBtn: 'breathStartBtn', active: 'breathActive', stop: click('#breathStartBtn') },
  { key: 'custom', panel: 'custom', startBtn: 'customStartBtn', active: "document.getElementById('customRunnerCard').style.display==='block'",
    prep: "document.getElementById('customResultCard').style.display='none'; document.getElementById('customBuilderCard').style.display='block'; __seed(7);",
    before: async p => { await p.locator('#customGenerateBtn').click(); await sleep(300); } },
  { key: 'rhythm', panel: 'rhythm', startBtn: 'rhythmStartBtn', active: 'rhythmActive' },
  { key: 'mirror', panel: 'mirror', startBtn: 'mirrorPlayBtn', prep: 'mirrorPhrase = null; __seed(7)', active: '!!mirrorPhrase' },
  { key: 'livefb', panel: 'livefeedback', startBtn: 'liveFeedbackStartBtn', active: 'lfActive', stop: click('#liveFeedbackStartBtn') },
  { key: 'resonance', panel: 'resonance', startBtn: 'resonanceStartBtn', active: 'resonanceActive', stop: click('#resonanceStartBtn') },
  { key: 'drills', panel: 'registerdrills', startBtn: 'drillStartBtn', active: 'drillActive',
    prep: "__seed(7); document.getElementById('drillResultCard').style.display='none'; document.getElementById('drillPreCard').style.display='block';" },
  { key: 'vibrato', panel: 'vibrato', startBtn: 'vibratoStartBtn', active: 'vibratoActive' },
  { key: 'vq', panel: 'voicequality', startBtn: 'vqStartBtn', active: 'vqActive' },
  { key: 'eve', panel: 'earvoiceear', startBtn: 'eveStartBtn', active: 'eveActive',
    prep: range(60, 60) + " __seed(7); document.getElementById('eveResultCard').style.display='none'; document.getElementById('evePreCard').style.display='block';" },
  { key: 'five', panel: 'fiveways', startBtn: 'fiveStartBtn', active: 'fiveActive',
    prep: range(56, 66) + " document.getElementById('fiveResultCard').style.display='none'; document.getElementById('fivePreCard').style.display='block';" },
  { key: 'onetake', panel: 'onetake', startBtn: 'oneTakeStartBtn', active: 'oneTakeActive',
    prep: range(56, 65) + ' progress.oneTakeLastDate = null; progress.oneTakeHistory = {}; renderOneTakeGate()' },
  { key: 'hm', panel: 'hearmistake', startBtn: 'hmStartBtn', active: shown('hmGuessCard'),
    prep: "__seed(7); document.getElementById('hmResultCard').style.display='none'; document.getElementById('hmGuessCard').style.display='none'; document.getElementById('hmPreCard').style.display='block';" },
  { key: 'emo', panel: 'emotionmode', startBtn: 'emoStartBtn', active: 'emoActive',
    prep: range(56, 65) + " __seed(7); document.querySelector('#emoIntentRow [data-emo=\"tender\"]').click(); document.getElementById('emoResultCard').style.display='none'; document.getElementById('emoPreCard').style.display='block';" },
  { key: 'puzzle', panel: 'vocalpuzzle', startBtn: 'puzzleStartBtn', active: shown('puzzleGuessCard'),
    prep: "document.getElementById('puzzleGuessCard').style.display='none'; document.getElementById('puzzleResultCard').style.display='none'; document.getElementById('puzzlePreCard').style.display='block';" },
  // Songs hub
  { key: 'staykey', panel: 'staykey', startBtn: 'stayKeyStartBtn', active: 'stayKeyActive', stop: click('#stayKeyStartBtn') },
  { key: 'karaoke', panel: 'karaoke', startBtn: 'karaokeStartBtn', active: 'karaokeActive', stop: click('#karaokeStartBtn') },
  { key: 'emotion', panel: 'emotion', startBtn: 'emotionStartBtn', active: 'emotionActive', stop: click('#emotionStartBtn') },
  { key: 'studio', panel: 'studio', startBtn: 'studioRecordBtn', active: disabled('studioRecordBtn') },
  { key: 'duet', panel: 'aiduet', startBtn: 'aiDuetStartBtn', active: 'aiDuetActive', stop: click('#aiDuetStartBtn') },
  { key: 'yourchoir', panel: 'choir', startSel: '[data-yc-rec="Lead"]', active: '!!yourChoir.recording' },
  { key: 'pd', panel: 'performancedirector', startBtn: 'pdStartBtn', active: 'pdActive',
    prep: "document.getElementById('pdResultCard').style.display='none'; document.getElementById('pdBriefingCard').style.display='block';" },
  // Choir World individual practice (I Am the Alto)
  { key: 'tt', panel: 'partrehearsal', startBtn: 'ttStartBtn', active: 'timingTrainer.active', stop: click('#ttStartBtn'),
    prep: lead + ` document.querySelector('#ttModeRow [data-tt-mode="entrance"]').click();` },
  { key: 'hmem', panel: 'partrehearsal', startBtn: 'hmemStartBtn', active: 'harmonyMemory.active', stop: click('#hmemStartBtn'),
    prep: lead + ` document.querySelector('[data-hm-stage="0"]')?.click();` },
  { key: 'cb', panel: 'partrehearsal', startBtn: 'cbStartBtn', active: 'challenge.active', stop: click('#cbStartBtn'), prep: lead + ' chSel.boss = 0; renderChoirBosses();' },
  { key: 'cx', panel: 'partrehearsal', startBtn: 'cxStartBtn', active: 'challenge.active', stop: click('#cxStartBtn'), prep: lead + ' __seed(7);' },
  { key: 'tk', panel: 'partrehearsal', startBtn: 'tkStartBtn', active: 'challenge.active', stop: click('#tkStartBtn'), prep: lead + " chSel.rung = 0; chSel.dir = 'up'; renderLadder();" },
  // You hub
  { key: 'journey', panel: 'journey', startBtn: 'journeyRecordBtn', active: disabled('journeyRecordBtn') },
  { key: 'today', panel: 'pricing', startBtn: 'recordTodayBtn', active: disabled('recordTodayBtn'),
    show: "document.getElementById('trialCompleteCard').style.display = 'block'; renderHearYourselfImprove()",
    prep: 'profile.todayAudioClip = null; renderHearYourselfImprove()' },
  // Arcade
  { key: 'glider', game: 'glider', startBtn: 'gliderStartBtn', active: 'gliderActive', stop: p => p.evaluate(() => gliderActive && finishGlider()),
    prep: `document.querySelector('[data-glider-mode="melody"]')?.click(); document.querySelector('[data-glider-difficulty="beginner"]')?.click(); __seed(7);` },
  { key: 'boss', game: 'boss', startBtn: 'bossStartBtn', active: 'bossActive', stop: click('#bossStartBtn'),
    prep: `document.querySelector('[data-boss-type="pitch"]').click(); document.querySelector('[data-boss-difficulty="beginner"]').click(); __seed(7)` },
  { key: 'wraith', game: 'boss', startBtn: 'bossStartBtn', active: 'bossActive', stop: click('#bossStartBtn'),
    prep: `document.querySelector('[data-boss-type="register"]').click(); document.querySelector('[data-boss-difficulty="beginner"]').click(); __seed(7)` },
  { key: 'bosstrain', game: 'boss', startBtn: 'bossTrainListenBtn', active: disabled('bossTrainListenBtn'),
    show: "document.getElementById('bossTrainingSection').style.display = 'block'; window._bossTrainTargetMidi = 60; document.getElementById('bossTrainNoteDisplay').textContent = 'C4'" },
  { key: 'bridge', game: 'bridge', startBtn: 'bridgeStartBtn', active: 'bridgeActive', stop: click('#bridgeStartBtn'), prep: 'progress.bridgeBest = 0; __seed(7)' },
  { key: 'harmony', game: 'harmony', startBtn: 'harmonyStartBtn', active: 'harmonyActive', stop: click('#harmonyStartBtn'), prep: '__seed(7)' },
  { key: 'rift', game: 'rift', startBtn: 'riftStartBtn', active: 'riftActive', stop: click('#riftStartBtn'), prep: '__seed(7)' },
  // last: it moves the page into its capture steps
  { key: 'range', panel: 'range', startBtn: 'rangeStartBtn', active: "mode==='rangeLow' || mode==='rangeHigh'", prep: "showStep('rangeIntro')" },
];
const startSel = E => E.startSel || '#' + E.startBtn;

// Through the navigation bar and the hub that lists the panel (or the arcade), as a user would.
async function reach(page, E) {
  if (E.game) {
    await page.locator('.snb-item[data-shell="world"]').click(); await sleep(500);
    await page.locator(`.arcade-game-card[data-game="${E.game}"]`).first().click(); await sleep(800);
  } else {
    const shell = await page.evaluate(p => { const hub = document.querySelector(`[data-enter-panel="${p}"]`)?.closest('[id$="-hub"]'); return hub && hub.id.replace(/^panel-|-hub$/g, ''); }, E.panel);
    if (!shell) throw new Error(`no hub lists panel ${E.panel}`);
    await page.locator(`.snb-item[data-shell="${shell}"]`).click(); await sleep(500);
    await page.locator(`#panel-${shell}-hub [data-enter-panel="${E.panel}"]`).first().click(); await sleep(800);
  }
  if (E.tab) { await page.locator(E.tab).click(); await sleep(300); }
  if (E.show) { await page.evaluate(E.show); await sleep(300); }
  return true;
}
const startVisible = (page, E) => page.evaluate(sel => { const e = document.querySelector(sel); return !!e && e.offsetParent !== null; }, startSel(E));
const skipInView = page => page.evaluate(() => {
  const b = document.getElementById('warmupSkipBtn'), r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { ok: r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth && (hit === b || b.contains(hit)), text: b.textContent };
});
// what the page shows when a start didn't happen: visible overlays, plan, the start button, the last toast
const why = page => page.evaluate(() => JSON.stringify({ overlays: [...document.querySelectorAll('[id$="Overlay"]')].filter(o => getComputedStyle(o).display !== 'none').map(o => o.id),
  paid: isPaid(), trial: isInTrial(), profile: !!profile, panel: document.querySelector('section.panel.active')?.id, pitchDisabled: document.getElementById('pitchListenBtn').disabled,
  toast: document.querySelector('#appToastWrap')?.textContent.trim().slice(0, 120) }));
// the run's ~40 sessions queue level-up / record / breakthrough celebrations; they open over the page after a reload
const clearCelebrations = page => page.evaluate(() => ['levelupOverlay', 'newRecordOverlay', 'breakthroughOverlay'].forEach(id => { const o = document.getElementById(id); if (o) o.style.display = 'none'; }));
// the app's UTC day n days from today (a far-off date would end the 21-day trial, and the session would hit the paywall)
const dayPlus = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const waitFor = (page, expr, ms) => page.waitForFunction(expr, null, { timeout: ms, polling: 50 }).then(() => true).catch(() => false);

// One start: warm-up shown, Skip in view, one click closes it and the session begins.
async function entry(page, E) {
  await rearm(page);
  await reach(page, E);
  if (E.prep) await page.evaluate(E.prep);
  if (E.before) await E.before(page);
  const reached = await startVisible(page, E); // after prep / before: Custom Routine's start appears once a routine exists
  await page.locator(startSel(E)).click();
  const up = await waitFor(page, () => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', 10000);
  const skip = up ? await skipInView(page) : { ok: false };
  const heldBack = up ? await page.evaluate(() => typeof wuPending !== 'undefined' && !!wuPending) : false; // the session is waiting on it
  if (up) await page.locator('#warmupSkipBtn').click();
  const closed = up && !await overlayShown(page);
  const started = up && await waitFor(page, E.active, 20000);
  check(`${E.key.padEnd(10)} warm-up shown → Skip (1 tap) → session starts`, reached && up && skip.ok && heldBack && closed && started,
    `reached ${reached} · shown ${up} · skip in view ${skip.ok} · session waiting ${heldBack} · closed ${closed} · started ${started}`);
  // end the session before the next one
  if (started && E.stop) { await sleep(1500); await E.stop(page).catch(() => {}); }
  if (started && !await waitFor(page, `!(${E.active})`, 150000)) console.log(`     (${E.key} still running after 150 s)`);
  await sleep(800);
}

(async () => {
  const T = tone(60), b = await launch(T.wav);
  console.log(`warm-up entries · ${URL_ || 'local deploy/ against the production backend'}`);
  try {
    let { ctx, page, errors } = await openPage(b), errors2;
    // arcade games unlock by level: set on the server, then reloaded as the app does
    db(`update public.user_progress set xp = greatest(xp, 450) where user_id = '${uid()}'`);
    await page.evaluate(async () => { await loadProgress(); renderArcadeLocks(); });
    if (!await warm(page)) throw new Error('fake mic silent');
    const ONLY = process.env.WU_ONLY ? process.env.WU_ONLY.split(',') : null;
    const list = ENTRIES.filter(E => !ONLY || ONLY.includes(E.key));
    console.log(`\n-- ${list.length} session starts`);
    for (const E of list) {
      try { await entry(page, E); } catch (e) { check(`${E.key.padEnd(10)} warm-up shown → Skip (1 tap) → session starts`, false, 'threw: ' + e.message.split('\n')[0]); }
    }
    if (!ONLY) {
      console.log('\n-- once a day');
      // skipped today (the last start above): the next session starts straight away
      await page.reload(); await sleep(3500); await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
      await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
      await clearCelebrations(page);
      const E = ENTRIES.find(x => x.key === 'pitch');
      await reach(page, E); await page.locator('#pitchListenBtn').click();
      // both at once: Pitch Match listens for only ~1.6 s, so waiting out the overlay first would miss the session
      const [again, ran] = await Promise.all([waitFor(page, () => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', 2500), waitFor(page, E.active, 5000)]);
      check('after a reload, the same day: not shown again, session starts', !again && ran, `shown ${again} · started ${ran} · stored ${await page.evaluate(() => localStorage.getItem(wuKey()))}${ran ? '' : ' · ' + await why(page)}`);
      await waitFor(page, `!(${E.active})`, 10000);
      // the next day (todayStr is the app's UTC day)
      await clearCelebrations(page);
      await page.evaluate(d => { window.__todayStr = todayStr; todayStr = () => d; }, dayPlus(1));
      await page.locator('#pitchListenBtn').click();
      const next = await waitFor(page, () => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', 5000);
      await page.keyboard.press('Escape');
      const escClosed = !await overlayShown(page), escRan = await waitFor(page, E.active, 8000);
      check('the next day: shown again; Escape skips it and the session starts', next && escClosed && escRan, `shown ${next} · closed ${escClosed} · started ${escRan}${escRan ? '' : ' · ' + await why(page)}`);
      await waitFor(page, `!(${E.active})`, 10000);
      // Smart Warmup (its own panel) marked done on a new day: counts as warmed up
      await clearCelebrations(page);
      await page.evaluate(d => { todayStr = () => d; }, dayPlus(2));
      await reach(page, { panel: 'warmup', startBtn: 'warmupCompleteBtn' }); await page.locator('#warmupCompleteBtn').click(); await sleep(1500);
      await clearCelebrations(page);
      await reach(page, E); await page.locator('#pitchListenBtn').click();
      const [smart, smartRan] = await Promise.all([waitFor(page, () => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', 2500), waitFor(page, E.active, 5000)]);
      check('Smart Warmup marked done today: not shown, session starts', !smart && smartRan, `shown ${smart} · started ${smartRan}${smartRan ? '' : ' · ' + await why(page)}`);
      await waitFor(page, `!(${E.active})`, 10000);
      await page.evaluate(() => { todayStr = window.__todayStr; });

      console.log('\n-- four languages');
      for (const l of ['fr', 'es', 'tr', 'en']) {
        const r = await page.evaluate(l => {
          currentLanguage = l; applyTranslations(); wuRender();
          const T = TRANSLATIONS[l], keys = Object.keys(TRANSLATIONS.en).filter(k => k.startsWith('wu_'));
          return { missing: keys.filter(k => !(k in T)), title: document.getElementById('warmupTitle').textContent === T.wu_title,
            skip: document.getElementById('warmupSkipBtn').textContent === T.wu_skip, item: document.querySelector('#warmupList .wu-text b').textContent === T.wu_ex_trill };
        }, l);
        check(`${l}: every wu_ string translated, title/Skip/exercise names shown in ${l}`, !r.missing.length && r.title && r.skip && r.item, JSON.stringify(r));
      }
      await ctx.close();

      console.log('\n-- phone (390 × 844)');
      ({ ctx, page, errors: errors2 } = await openPage(b, { viewport: { width: 390, height: 844 } }));
      await rearm(page);
      await reach(page, ENTRIES.find(x => x.key === 'tuner')); await page.locator('#micBtn').click();
      const sw0 = await page.evaluate(() => document.documentElement.scrollWidth); // before: the top bar's known overflow, not the warm-up's
      const pu = await waitFor(page, () => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', 8000);
      const ps = await skipInView(page);
      const fit = await page.evaluate(sw0 => { const c = document.querySelector('#warmupOverlay .wu-card'), r = c.getBoundingClientRect(); return { card: c.scrollWidth <= c.clientWidth + 1 && r.left >= 0 && r.right <= innerWidth, addsNoOverflow: document.documentElement.scrollWidth <= sw0, pageWidth: document.documentElement.scrollWidth, innerWidth }; }, sw0);
      await page.locator('#warmupSkipBtn').click();
      const pr = await waitFor(page, "mode==='tuner'", 8000);
      check('phone: shown, Skip in view without scrolling, card fits, adds no sideways overflow, skip → session', pu && ps.ok && fit.card && fit.addsNoOverflow && pr, `shown ${pu} · skip ${ps.ok} · fit ${JSON.stringify(fit)} · started ${pr}`);
      errors.push(...errors2);
      await ctx.close();

      console.log('\n-- signed out');
      ({ ctx, page, errors: errors2 } = await openPage(b, { signedIn: false }));
      await reach(page, ENTRIES.find(x => x.key === 'tuner')); await page.locator('#micBtn').click();
      const signin = await waitFor(page, () => getComputedStyle(document.getElementById('signinRequiredOverlay')).display !== 'none', 8000);
      const su = await overlayShown(page), sr = await page.evaluate(() => mode === 'tuner');
      check('signed out (Tuner): the sign-in prompt comes first; no warm-up, no session', signin && !su && !sr, `sign-in prompt ${signin} · warm-up ${su} · started ${sr}`);
      errors.push(...errors2);
      await ctx.close();
    }
    check('no page errors', !errors.length, errors.slice(0, 3).join(' | '));
  } finally {
    await b.close();
    const { pass, fail } = totals();
    console.log(`\n==== warm-up entries: ${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
