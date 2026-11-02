// Phase 5 (PHASE5.md §1): Choir World, driven through the app's own buttons. Shared by house.js, stopcheck.js,
// contrast.js, copyscan.js and shots.js (--set choir); the same shape as tools4b.js (open, act, busy, btn, stage, result),
// so tools.js's runTake and toolStates drive them.
// Seven activities that sing or play on a stage, all on Demo Hymn, Alto:
//   rehearsal       rehearsal playback with "Hear me" off (live: Play, Stop; it loops until Stop, no result)
//   rehearsalhear   the same with "Hear me" on (the mic opens, your voice is drawn on your lane)
//   hm, boss, chaos, ladder, timing   the five trainers (sung: Start, the song plays once, the result)
//   yctake          a Your Choir take of the Alto part (sung: Record, the song plays once, the take is saved)
// And the paper pages (page: true; toolStates shows them idle only): the Choir World landing, each sub-nav tab, the
// trainer list, the X-Ray lightbox. On the stage the house is down; the paper pages never dim it.
// The phase 5 app names used here: cwShowTab(tab) shows a song page tab ('rehearse' | 'songlab' | 'trainers' |
// 'yourchoir' | 'passport'), cwOpenTrainer(key) shows one trainer alone ('hm' | 'boss' | 'chaos' | 'ladder' |
// 'timing'), cwShowLanding() the landing; the stages are .vc-stage elements; #rehearsalHearBtn is "Hear me". On a build
// without them (master) open() falls back to entering the panel, so the same descriptors run there.
// Each activity also has:
//   idleOk  (in the page) back at its starting state: not busy, its Start enabled with its idle label (stopcheck.js)
//   flags   (in the page) every loop flag that must be off once you have left (stopcheck.js)
const C = require('./common');

const SONG_PART = () => { // Demo Hymn, Alto, no run of any kind going on
  if (typeof selectSong === 'function') selectSong('hymn');
  if (typeof setRehearsalPart === 'function') setRehearsalPart('Alto');
};
// opens a Choir World page: the tab (and trainer) on the phase 5 build, the panel on master
const openTab = (page, panel, tab, trainer) => page.evaluate(({ panel, tab, trainer, prep }) => {
  new Function(prep)();
  if (typeof cwShowTab === 'function') { cwShowTab(tab); if (trainer && typeof cwOpenTrainer === 'function') cwOpenTrainer(trainer); }
  else enterPanel(panel);
  window.scrollTo(0, 0);
}, { panel, tab, trainer, prep: `(${SONG_PART})()` }).then(() => C.sleep(700));
const clickSel = (page, sel) => page.evaluate(sel => { window.__t0 = performance.now(); document.querySelector(sel).click(); }, sel);
const stopSel = (page, sel) => page.evaluate(sel => { window.__t1 = performance.now(); document.querySelector(sel).click(); }, sel); // Stop: house.js times "up" from __t1
const hear = (page, on) => page.evaluate(on => { // "Hear me" set as asked (remembered on this device: set it every time)
  const b = document.getElementById('rehearsalHearBtn'); if (!b) return;
  if ((b.getAttribute('aria-pressed') === 'true') !== on) b.click();
}, on);
const FLAGS = () => ({ hm: harmonyMemory.active, challenge: challenge.active, timing: timingTrainer.active,
  rehearsal: partRehearsal.active, playing: choirIsPlaying, ycRec: !!yourChoir.recording, ycPlay: !!yourChoir.playing });
const startIdle = (id, label) => `(() => { const b = document.getElementById('${id}'), l = document.getElementById('${label}');
  return !!b && !b.disabled && !!l && l.textContent.trim() !== t('tt_stop_btn'); })`;

const trainer = (key, name, card, btn, stage, result, busy) => ({
  key, name, panel: 'partrehearsal', sung: true, idle: `#${card}`, btn: `#${btn}`, stage: `#${stage}`, result: `#${result}`,
  liveAt: 9000, timeout: 60000,
  open: page => openTab(page, 'partrehearsal', 'trainers', key),
  act: page => clickSel(page, `#${btn}`),
  stop: page => clickSel(page, `#${btn}`),
  busy,
  idleOk: startIdle(btn, btn.replace('Btn', 'Label')),
});

const TOOLS = [
  { key: 'rehearsal', name: 'Rehearsal playback', panel: 'partrehearsal', live: true, idle: '#rehearsalPlayBtn', btn: '#rehearsalStopBtn',
    stage: '#rehearsalStage', liveAt: 3000, hear: false,
    open: async page => { await openTab(page, 'partrehearsal', 'rehearse'); await hear(page, false); },
    act: page => clickSel(page, '#rehearsalPlayBtn'),
    stop: page => stopSel(page, '#rehearsalStopBtn'),
    busy: () => partRehearsal.active && choirIsPlaying && !timingTrainer.active && !harmonyMemory.active && !challenge.active,
    idleOk: `(() => !partRehearsal.active && !choirIsPlaying && !document.getElementById('rehearsalPlayBtn').disabled)` },
  { key: 'rehearsalhear', name: 'Rehearsal playback, Hear me on', panel: 'partrehearsal', live: true, idle: '#rehearsalPlayBtn', btn: '#rehearsalStopBtn',
    stage: '#rehearsalStage', liveAt: 3000, hear: true,
    open: async page => { await openTab(page, 'partrehearsal', 'rehearse'); await hear(page, true); },
    act: page => clickSel(page, '#rehearsalPlayBtn'),
    stop: page => stopSel(page, '#rehearsalStopBtn'),
    busy: () => partRehearsal.active && choirIsPlaying && !timingTrainer.active && !harmonyMemory.active && !challenge.active,
    idleOk: `(() => !partRehearsal.active && !choirIsPlaying && !document.getElementById('rehearsalPlayBtn').disabled)` },
  trainer('hm', 'Harmony Memory', 'harmonyMemoryCard', 'hmemStartBtn', 'hmemStage', 'hmemResults', () => harmonyMemory.active),
  trainer('boss', 'Choir Bosses', 'choirBossCard', 'cbStartBtn', 'cbStage', 'cbResults', () => challenge.active && challenge.kind === 'boss'),
  trainer('chaos', 'Chaos Mode', 'chaosCard', 'cxStartBtn', 'cxStage', 'cxResults', () => challenge.active && challenge.kind === 'chaos'),
  trainer('ladder', 'Tempo/Key Ladder', 'ladderCard', 'tkStartBtn', 'tkStage', 'tkResults', () => challenge.active && challenge.kind === 'ladder'),
  trainer('timing', 'Entrance & Cutoff', 'timingTrainerCard', 'ttStartBtn', 'ttStage', 'ttResults', () => timingTrainer.active),
  { key: 'yctake', name: 'Your Choir take', panel: 'choir', sung: true, idle: '#yourChoirCard', btn: '#ycStopBtn', stage: '#ycStage',
    result: '#ycParts [data-yc-part="Alto"]', liveAt: 9000, timeout: 60000,
    open: page => openTab(page, 'choir', 'yourchoir'),
    act: page => clickSel(page, '#ycParts [data-yc-rec="Alto"]'),
    stop: page => clickSel(page, '#ycStopBtn'),
    busy: () => !!yourChoir.recording,
    idleOk: `(() => !yourChoir.recording && !!document.querySelector('#ycParts [data-yc-rec="Alto"]') && !document.querySelector('#ycParts [data-yc-rec="Alto"]').disabled)` },
];
TOOLS.forEach(tl => { tl.flags = FLAGS; });

// The paper pages: shown idle only (toolStates stops after the idle state). house.js plays the mixer on Song Lab and
// Your Choir's stacked takes on Your Choir: neither dims the house.
const PAGES = [
  { key: 'cw-landing', name: 'Choir World landing', panel: 'choir', page: true, idle: '#panel-choir',
    open: page => page.evaluate(() => { if (typeof cwShowLanding === 'function') cwShowLanding(); else enterPanel('choir'); window.scrollTo(0, 0); }).then(() => C.sleep(700)) },
  { key: 'cw-rehearse', name: 'Rehearse tab', panel: 'partrehearsal', page: true, idle: '#panel-partrehearsal', open: page => openTab(page, 'partrehearsal', 'rehearse') },
  { key: 'cw-songlab', name: 'Song Lab tab', panel: 'choir', page: true, idle: '#panel-choir', open: page => openTab(page, 'choir', 'songlab') },
  { key: 'cw-trainers', name: 'Trainers tab', panel: 'partrehearsal', page: true, idle: '#panel-partrehearsal', open: page => openTab(page, 'partrehearsal', 'trainers') },
  { key: 'cw-yourchoir', name: 'Your Choir tab', panel: 'choir', page: true, idle: '#panel-choir', open: page => openTab(page, 'choir', 'yourchoir') },
  { key: 'cw-passport', name: 'Passport tab', panel: 'choirpassport', page: true, idle: '#panel-choirpassport', open: page => openTab(page, 'choirpassport', 'passport') },
  { key: 'cw-xray', name: 'Sonic X-Ray lightbox', panel: 'choir', page: true, idle: '#sonicXrayCard',
    open: async page => { await openTab(page, 'choir', 'songlab'); await page.evaluate(() => { const e = document.getElementById('sonicXrayCard'); if (e) e.scrollIntoView({ block: 'center' }); }); } },
];

const byKey = k => [...TOOLS, ...PAGES].find(tl => tl.key === k);
const STATE_NAMES = [...TOOLS.flatMap(tl => [`${tl.key}-idle`, `${tl.key}-stage`, tl.live ? `${tl.key}-stopped` : `${tl.key}-result`]), ...PAGES.map(p => `${p.key}-idle`)];
module.exports = { TOOLS, PAGES, byKey, STATE_NAMES, openTab, hear, FLAGS };
