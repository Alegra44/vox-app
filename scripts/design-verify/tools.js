// Phase 4a (PHASE4A.md): the 14 Coach tools, driven through the app's own buttons. Shared by scores.js, house.js,
// contrast.js, shots.js and copyscan.js. Works on master and on the branch: it only uses element ids and globals that
// both have.
// The singing tools (8) are made deterministic for the fake mic's note (stage.js: A4): their targets are set to it, or
// the singer's range (registerRangeBounds) is narrowed for the take so the tool's own pick lands on it:
//   Interval Match  root D4, a Perfect 5th (target A4), Professional
//   Scale Run       root A3, Professional (the arpeggio run: A, C#, E, A … octave-independent, so the As score)
//   Custom Challenge the sequence A4 A4 E4 A4 B4 A4, medium pace
//   Ear → Voice → Ear the range A4–A4: both steps target A4
//   Sing It 5 Ways  the range G#4–A#4: the base note A4 (rounds A4, A#4, G#4, A4, A4)
//   Hear Your Mistake the range A4–A4, and the correct pick (the sing-back targets A4)
//   Range Finder    capture the lowest after 1.5 s, the highest 1.5 s later (both the fake mic's note)
//   Breath Trainer  stopped after a 4 s hold
// The paper tools (6) are not sung: Key Trainer, Vocal Lab, Genre Coach, Smart Warmup, Ear Training, Vocal Puzzle.
// Each tool: open(page) (idle, on its panel), act(page) (starts the take, or the paper tool's action), busy (in the page:
// true while the take runs), btn (the tool's own control on the stage, its status pill: topmost while the take runs; Hear
// Your Mistake's take starts from the A/B pick on paper, so its pill is the sing-back's status line), result (shown after), and for
// the singing tools read (in the page: the numbers its result is made of, from the tool's own state).
const C = require('./common');

const exTab = (page, type) => page.evaluate(t => document.querySelector(`.ex-type-btn[data-extype="${t}"]`).click(), type);
const narrow = (lo, hi) => { // the singer's range for the take (restored by restoreRange)
  if (!window.__rrb) window.__rrb = registerRangeBounds;
  registerRangeBounds = () => ({ ...window.__rrb(), lowMidi: lo, highMidi: hi });
};
const restoreRange = page => page.evaluate(() => { if (window.__rrb) { registerRangeBounds = window.__rrb; delete window.__rrb; } });
const vis = sel => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && !!e.getClientRects().length; };

const TOOLS = [
  { key: 'interval', idle: '#intervalListenBtn', liveAt: 2300, name: 'Interval Match', panel: 'exercises', sung: true, btn: '#intervalListenBtn', result: '#intervalResult',
    open: async page => {
      await C.showPanel(page, 'exercises'); await C.clearOverlays(page); await exTab(page, 'interval');
      await page.evaluate(() => {
        setExerciseLevel('professional');
        intervalRootMidi = 62; intervalDef = { name: 'Perfect 5th', semi: 7 }; intervalTargetMidi = 69;
        if (typeof showIntervalTarget === 'function') showIntervalTarget(); // the branch: the name, the note and the root
        else { document.getElementById('intervalTargetLabel').textContent = intervalDef.name; document.getElementById('intervalRootLabel').textContent = noteNameFromMidi(62); }
      });
    },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('intervalListenBtn').click(); }),
    busy: () => document.getElementById('intervalListenBtn').disabled,
    display: () => ({ big: document.getElementById('intervalAccuracyVal').textContent, attack: document.getElementById('intervalAttackVal').textContent, landing: document.getElementById('intervalLandingVal').textContent }) },
  { key: 'scale', idle: '#scaleStartBtn', liveAt: 1600, name: 'Scale Run', panel: 'exercises', sung: true, btn: '#scaleStartBtn', result: '#scaleResult', timeout: 40000,
    open: async page => {
      await C.showPanel(page, 'exercises'); await C.clearOverlays(page); await exTab(page, 'scale');
      await page.evaluate(() => { setExerciseLevel('professional'); scaleRootMidi = 57; });
    },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('scaleStartBtn').click(); }),
    busy: () => document.getElementById('scaleStartBtn').disabled,
    display: () => ({ big: document.getElementById('scaleAccuracyVal').textContent, dots: [...document.querySelectorAll('#scaleDots .scale-dot')].map(d => d.className.replace('scale-dot', '').trim()).join(',') }) },
  { key: 'custom', idle: '#customStartBtn', liveAt: 1700, name: 'Custom Challenge', panel: 'custom', sung: true, btn: '#customStartBtn', result: '#customResultCard', timeout: 40000,
    open: async page => {
      await C.showPanel(page, 'custom'); await C.clearOverlays(page);
      await page.evaluate(() => {
        document.querySelector('#customTempoRow [data-custom-tempo="medium"]').click();
        document.getElementById('customGenerateBtn').click();
        customSequence = [69, 69, 64, 69, 71, 69];
        document.getElementById('customPreviewSummary').textContent = customSequence.map(m => noteNameFromMidi(m)).join(', ');
      });
    },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('customStartBtn').click(); }),
    busy: () => { const r = document.getElementById('customRunnerCard'); return !!r && r.style.display === 'block'; },
    display: () => ({ big: document.getElementById('customResultAvg').textContent, rows: [...document.querySelectorAll('#customResultRows .record-val, #customResultRows .vc-dim > :last-child')].map(e => e.textContent).join(',') }) },
  { key: 'eve', idle: '#eveStartBtn', liveAt: 1900, name: 'Ear → Voice → Ear', panel: 'earvoiceear', sung: true, btn: '#eveStartBtn', result: '#eveResultCard', timeout: 30000,
    open: async page => { await C.showPanel(page, 'earvoiceear'); await C.clearOverlays(page); await page.evaluate(`(${narrow})(69, 69)`); },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('eveStartBtn').click(); }),
    busy: () => eveActive,
    display: () => ({ first: document.getElementById('eveResultFirst').textContent, second: document.getElementById('eveResultSecond').textContent }) },
  { key: 'five', idle: '#fiveStartBtn', liveAt: 1500, name: 'Sing It 5 Ways', panel: 'fiveways', sung: true, btn: '#fiveStartBtn', result: '#fiveResultCard', timeout: 40000,
    open: async page => { await C.showPanel(page, 'fiveways'); await C.clearOverlays(page); await page.evaluate(`(${narrow})(68, 70)`); },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('fiveStartBtn').click(); }),
    busy: () => fiveActive,
    display: () => ({ rows: [...document.querySelectorAll('#fiveResultRows .record-val')].map(e => e.textContent).join(',') }) },
  { key: 'hearmistake', idle: '#hmStartBtn', liveAt: 700, name: 'Can You Hear Your Mistake?', panel: 'hearmistake', sung: true, btn: '#hmSingStatus', result: '#hmResultCard', timeout: 20000,
    open: async page => { await C.showPanel(page, 'hearmistake'); await C.clearOverlays(page); await page.evaluate(`(${narrow})(69, 69)`); },
    // listening (A and B) on paper, then the correct pick: the sing-back is the take
    pre: async page => {
      await page.evaluate(() => document.getElementById('hmStartBtn').click());
      await C.sleep(2400);
    },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.querySelector(`[data-hm-guess="${hmCorrectLabel}"]`).click(); }),
    busy: () => hmSinging,
    display: () => ({ big: document.getElementById('hmSingAccuracy').textContent }) },
  { key: 'range', idle: '#rangeStartBtn', liveAt: 900, name: 'Range Finder', panel: 'range', sung: true, btn: '#captureLowBtn', result: '#rangeResult', timeout: 15000,
    open: async page => { await C.showPanel(page, 'range'); await C.clearOverlays(page); },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('rangeStartBtn').click(); }),
    // the take: the lowest captured at 1.5 s, the highest 1.5 s later
    drive: async page => {
      await C.sleep(1500); await page.evaluate(() => document.getElementById('captureLowBtn').click());
      await C.sleep(1500); await page.evaluate(() => document.getElementById('captureHighBtn').click());
    },
    busy: () => mode === 'rangeLow' || mode === 'rangeHigh',
    display: () => ({ type: document.getElementById('voiceTypeOut').textContent, span: document.getElementById('rangeSpanOut').textContent }) },
  { key: 'breath', idle: '#breathStartBtn', liveAt: 1500, name: 'Breath Trainer', panel: 'breath', sung: true, btn: '#breathStartBtn', result: '#breathResult', timeout: 15000,
    open: async page => { await C.showPanel(page, 'breath'); await C.clearOverlays(page); },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('breathStartBtn').click(); }),
    drive: async page => { await C.sleep(4000); await page.evaluate(() => { if (breathActive) document.getElementById('breathStartBtn').click(); }); },
    busy: () => breathActive,
    display: () => ({ overall: document.getElementById('breathAccuracyVal').textContent, duration: document.getElementById('breathDurationStat').textContent, consistency: document.getElementById('breathConsistencyStat').textContent }) },
  // the paper tools: their action, and what's shown after it
  { key: 'key', name: 'Key Trainer', panel: 'key', sung: false, result: '#recResult',
    open: async page => { await C.showPanel(page, 'key'); await C.clearOverlays(page); },
    act: page => page.evaluate(() => { document.getElementById('playNoteBtn').click(); document.getElementById('calcKeyBtn').click(); }) },
  { key: 'vocallab', name: 'Vocal Lab', panel: 'vocallab', sung: false, result: '#vocalLabRangesCard',
    open: async page => { await C.showPanel(page, 'vocallab'); await C.clearOverlays(page); },
    act: async page => { await page.evaluate(async () => { await recordRangeCapture(45, 69); renderVocalLab(); }); } },
  { key: 'genre', name: 'Genre Coach', panel: 'genre', sung: false, result: '#genreTipsList',
    open: async page => { await C.showPanel(page, 'genre'); await C.clearOverlays(page); },
    act: page => page.evaluate(() => { const g = document.querySelectorAll('#genreGrid button, #genreGrid [data-genre]'); if (g[1]) g[1].click(); document.getElementById('genreApplyBtn').click(); }) },
  { key: 'warmup', name: 'Smart Warmup', panel: 'warmup', sung: false, result: '#warmupDoneNote',
    open: async page => { await C.showPanel(page, 'warmup'); await C.clearOverlays(page); },
    act: page => page.evaluate(() => { document.getElementById('warmupPlay1').click(); document.getElementById('warmupCompleteBtn').click(); }) },
  { key: 'ear', idle: '#earPlayBtn', name: 'Ear Training', panel: 'exercises', sung: false, result: '#earFeedback',
    open: async page => { await C.showPanel(page, 'exercises'); await C.clearOverlays(page); await exTab(page, 'ear'); },
    act: async page => {
      await page.evaluate(() => document.getElementById('earPlayBtn').click()); await C.sleep(1600);
      await page.evaluate(() => { const w = [...document.querySelectorAll('#earChoiceGrid .ear-choice-btn')].find(b => b.dataset.choiceName !== earTargetName); (w || document.querySelector('#earChoiceGrid .ear-choice-btn')).click(); });
    } },
  { key: 'vocalpuzzle', name: 'Vocal Puzzle', panel: 'vocalpuzzle', sung: false, result: '#puzzleResultCard',
    open: async page => { await C.showPanel(page, 'vocalpuzzle'); await C.clearOverlays(page); },
    act: async page => {
      await page.evaluate(() => document.getElementById('puzzleStartBtn').click()); await C.sleep(2900);
      await page.evaluate(() => document.querySelector(`#puzzleGuessRow [data-puzzle-guess="${puzzleWrongIndex}"]`).click());
    } },
];
const SUNG = TOOLS.filter(t => t.sung), PAPER = TOOLS.filter(t => !t.sung);
const byKey = k => TOOLS.find(t => t.key === k);

// Records every captureAccuracyForTarget result in the page (window.__caps): the numbers a tool's result is made of.
const CAPTURE_TAP = () => {
  if (window.__capTap) return; window.__capTap = true; window.__caps = [];
  const orig = captureAccuracyForTarget;
  captureAccuracyForTarget = async function (target, ms, opts) {
    const r = await orig.apply(this, arguments);
    window.__caps.push({ target, accuracy: r.accuracy, heard: !!r.heard, noVoice: !!r.noVoice, attack: r.attackAcc ?? null, landing: r.landingAcc ?? null,
      cents: r.avgCents ?? null, conf: r.confidence ? r.confidence.pct : null, confLevel: r.confidence ? r.confidence.level : null, n: r.samples ? r.samples.length : 0 });
    return r;
  };
};

// One take: act, wait for it to start and to finish (the tool's own drive steps in between), then the result's moment.
// onLive(ms) is awaited once the take is running (the stage state); returns {started, done}.
async function runTake(page, tool, { onLive = null, liveAt = 900 } = {}) {
  if (tool.pre) await tool.pre(page);
  await tool.act(page);
  const started = await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 8000 }).then(() => true, () => false);
  if (onLive) { await C.sleep(liveAt); await onLive(); }
  if (tool.drive) await tool.drive(page);
  const done = await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: tool.timeout || 20000 }).then(() => true, () => false);
  return { started, done };
}
// The numbers of a finished take, from the tool's own state (and its displayed values)
const readTake = (page, tool) => page.evaluate(({ display, key }) => {
  const caps = window.__caps || []; window.__caps = [];
  const out = { caps, display: new Function('return (' + display + ')()')() };
  if (key === 'range') out.range = lowNote && highNote ? { low: lowNote.midi, high: highNote.midi, type: classifyVoice(Math.min(lowNote.midi, highNote.midi), Math.max(lowNote.midi, highNote.midi)) } : null;
  if (key === 'breath') out.breath = { overall: parseInt(document.getElementById('breathAccuracyVal').textContent, 10), duration: parseFloat(document.getElementById('breathDurationStat').textContent), consistency: parseInt(document.getElementById('breathConsistencyStat').textContent, 10) };
  return out;
}, { display: tool.display.toString(), key: tool.key });

// The review states of a tool (contrast.js, shots.js): <key>-idle, then for a sung tool <key>-stage (mid-take, at its
// liveAt) and <key>-result (the house up again, the result in view); for a paper tool <key>-result (after its action).
// onState(name, rootSelector) is awaited at each.
async function toolStates(page, tool, onState) {
  await tool.open(page); await C.sleep(500);
  if (tool.idle) { await page.evaluate(sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, tool.idle); await C.sleep(250); }
  await onState(`${tool.key}-idle`, `#panel-${tool.panel}`);
  if (tool.sung) {
    await runTake(page, tool, { liveAt: tool.liveAt || 1200, onLive: () => onState(`${tool.key}-stage`, `#panel-${tool.panel}`) });
    await page.waitForFunction(() => document.body.dataset.house !== 'down', null, { timeout: 4000 }).catch(() => {});
    await C.sleep(700); await restoreRange(page);
  } else { await tool.act(page); await C.sleep(700); }
  await page.evaluate(sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, tool.result); await C.sleep(250);
  await onState(`${tool.key}-result`, `#panel-${tool.panel}`);
}
const STATE_NAMES = TOOLS.flatMap(t => [`${t.key}-idle`, ...(t.sung ? [`${t.key}-stage`] : []), `${t.key}-result`]);

module.exports = { toolStates, STATE_NAMES, TOOLS, SUNG, PAPER, byKey, CAPTURE_TAP, runTake, readTake, restoreRange, vis };
