// Phase 8 (PHASE8.md): the five Vocal World games, driven through the app's own globals and buttons, on master and on
// the branch. Shared by gamestates.js (the gate), stopcheck.js (--only8), treecheck.js and shots8.js; the same shape as
// tools6.js. The game's options are set through its state variables (gliderMode, selectedBossType, …), which both builds
// keep, so a layout change can't change what is played. Math.random is replaced at page start by a seeded generator
// (SEED_INIT); seed(page, n) resets it right before Start, so both builds draw the same courses, obstacles and rounds.
// Each game:
//   game      the name showArcadeGame() takes          start   the Start button's id (kept on the branch)
//   setup     (in the page) its options                busy    (in the page) running
//   stage     its stage on the branch (house.js)       result  its result element (the branch: .vc-result)
//   cap       ms after which the run is ended through its own Start/Stop button (Glider and Bridge run until a crash)
//   nums      (in the page, after the run) every number its result is made of, from the game's own state
//   shown     (in the page) the result's text, which must contain the score (the big number)
//   flags     (in the page) its loop flags, all off once you have left (stopcheck.js)
//   idleOk    (in the page) back at its starting state: not running, Start enabled, not labelled Stop
//   regin     reads the register input itself (Bridge, the Register Wraith): houseSession instead of singingSession
const C = require('./common');

const SEED_INIT = () => {
  const mk = s => { let a = s >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  window.__seed = s => { Math.random = mk(s); };
};
const seed = (page, n) => page.evaluate(n => window.__seed(n), n);
const open = game => async page => {
  await C.showPanel(page, 'arcade'); await C.clearOverlays(page);
  await page.evaluate(g => { showArcadeGame(g); if (typeof selectSong === 'function' && currentSongId !== 'hymn') selectSong('hymn'); }, game);
  await C.sleep(300);
};
const vis = sel => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && !!e.getClientRects().length; };
const idle = (btn, label, flag) => `(() => { const b = document.getElementById('${btn}'), l = document.getElementById('${label}');
  return !(${flag}) && !!b && !b.disabled && !b.classList.contains('listening') && !!l && !/tap to|^stop$|^arrêter$|^detener$|^durdur$/i.test(l.textContent.trim()); })`;

const GAMES = [
  { key: 'glider', name: 'Pitch Mountain', game: 'glider', start: 'gliderStartBtn', label: 'gliderStartLabel', stage: '#gliderStage', result: '#gliderGameOver', cap: 45000, liveAt: 2500,
    // The Glider's singer is steered per frame, not per ms, so both builds fly the same course frame for frame: while
    // gliderActive, the pitch gliderLoop reads is the centre of the gap 12 px ahead for 1500 frames, then none (it falls
    // and crashes). The mic still runs; only what the game is told it hears is steered (STEER_TAP).
    setup: () => {
      gliderMode = 'highway'; gliderDifficulty = 'intermediate'; const st = { frame: 0 };
      window.__steerFn = () => {
        if (!gliderActive) return null; if (++st.frame > 1500) return -1;
        const H = document.getElementById('gliderCanvas').height, { lowMidi, highMidi } = registerRangeBounds();
        return lowMidi + (1 - gliderGapAtWorldX(gliderScroll + 90 + 12).gapY / H) * (highMidi - lowMidi);
      };
    },
    busy: () => gliderActive,
    nums: () => ({ score: gliderScoreVal, coins: gliderCoins, combo: gliderCombo, 'took off': +gliderTookOff, best: progress.gliderBest || 0 }),
    flags: () => ({ glider: gliderActive }) },
  { key: 'bridge', name: 'Register Canyon', game: 'bridge', start: 'bridgeStartBtn', label: 'bridgeStartLabel', stage: '#bridgeStage', result: '#bridgeGameOver', cap: 45000, liveAt: 2500, regin: true,
    setup: () => { window.__steerFn = null; }, // the lane follows the real register reading of the steady A4
    busy: () => bridgeActive,
    nums: () => ({ score: bridgeScoreVal, lives: bridgeLives, lane: bridgeLane, best: progress.bridgeBest || 0 }),
    flags: () => ({ bridge: bridgeActive }) },
  { key: 'boss', name: 'Boss Arena (Pitch Dragon)', game: 'boss', start: 'bossStartBtn', label: 'bossStartLabel', stage: '#bossStage', result: '#bossGameOver', cap: 40000, liveAt: 4000,
    setup: () => { selectedBossType = 'pitch'; selectedBossDifficulty = 'intermediate'; window.__steerFn = window.__steerNote(() => bossActive ? [bossCurrentTargetMidi, bossCurrentIdx] : null); },
    busy: () => bossActive, nums: () => window.__bossNums(), flags: () => ({ boss: bossActive, pad: backingActiveOsc.length > 0 }) },
  { key: 'wraith', name: 'Boss Arena (Register Wraith)', game: 'boss', start: 'bossStartBtn', label: 'bossStartLabel', stage: '#bossStage', result: '#bossGameOver', cap: 40000, liveAt: 4000, regin: true,
    setup: () => { selectedBossType = 'register'; selectedBossDifficulty = 'intermediate'; window.__steerFn = window.__steerNote(() => bossActive ? [bossCurrentTargetMidi, bossCurrentIdx] : null); },
    busy: () => bossActive, nums: () => window.__bossNums(), flags: () => ({ boss: bossActive, pad: backingActiveOsc.length > 0 }) },
  { key: 'harmony', name: 'Harmony Castle', game: 'harmony', start: 'harmonyStartBtn', label: 'harmonyStartLabel', stage: '#harmonyStage', result: '#harmonyResult', cap: 40000, liveAt: 4000,
    setup: () => { harmonySelectedPart = 'Soprano'; harmonySelectedLevel = 1;
      window.__steerFn = window.__steerNote(() => { if (!harmonyActive) return null; const i = songIndexAtElapsed(performance.now() - harmonyStartTime);
        return [SONG.parts[harmonySelectedPart].notes[i] + harmonyTransposeShift, i]; }); },
    busy: () => harmonyActive,
    nums: () => {
      const n = id => { const m = (document.getElementById(id) || {}).textContent; const x = String(m || '').match(/-?\d+/); return x ? +x[0] : null; };
      const o = { overall: n('harmonyAccVal'), pitch: n('harmonyPitchVal'), timing: n('harmonyTimingVal'), part: n('harmonyPartVal'), independence: n('harmonyIndependenceVal'), best: progress.harmonyBest || 0 };
      harmonyNoteResults.forEach((r, i) => { o[`note ${i + 1}`] = r === null || r === undefined ? 'none' : r; });
      return o;
    },
    flags: () => ({ harmony: harmonyActive, choirOsc: choirActiveOscillators.length > 0 }) },
  { key: 'rift', name: 'The Rift', game: 'rift', start: 'riftStartBtn', label: 'riftStartLabel', stage: '#riftStage', result: '#riftResultCard', cap: 70000, liveAt: 4000,
    setup: () => { window.__steerFn = null; }, // the rounds hear the real steady A4
    busy: () => riftActive,
    nums: () => {
      const heard = riftRounds.filter(r => r.heard), o = { rounds: riftRounds.length, heard: heard.length,
        average: heard.length ? Math.round(heard.reduce((a, b) => a + b.accuracy, 0) / heard.length) : 0, best: progress.riftBest || 0 };
      riftRounds.slice(0, 12).forEach((r, i) => { o[`round ${i + 1} target`] = r.targetMidi; o[`round ${i + 1}`] = r.heard ? r.accuracy : 'missed'; });
      return o;
    },
    flags: () => ({ rift: riftActive }) },
];
// in the page, once: what a game is told it hears. While window.__steerFn() returns a MIDI number, autoCorrelate returns
// that pitch and readRegisterFrame that pitch with the real frame's chest reading and raw buffer; -1 is "no pitch"; null
// leaves the real reading. __steerNote(fn): fn() gives [target midi, note index]; the note is sung that many cents off
// (OFFSETS, by index), so on Boss and Harmony some notes land and some miss, the same on both builds.
const STEER_TAP = () => {
  if (window.__steerTap) return; window.__steerTap = true; window.__steerFn = null;
  const OFFSETS = [0, 15, 45, 5, 60, 10, 30, 0, 50, 20, 70, 5];
  window.__steerNote = fn => () => { const r = fn(); if (!r || r[0] === null || r[0] === undefined) return null; return r[0] + OFFSETS[Math.max(0, r[1]) % OFFSETS.length] / 100; };
  const hz = m => m < 0 ? -1 : 440 * Math.pow(2, (m - 69) / 12);
  const ac = autoCorrelate; autoCorrelate = function () { const real = ac.apply(this, arguments); const m = window.__steerFn && window.__steerFn(); return m === null || m === undefined ? real : hz(m); };
  const rr = readRegisterFrame; readRegisterFrame = function () { const fr = rr.apply(this, arguments); const m = window.__steerFn && window.__steerFn();
    return m === null || m === undefined ? fr : { ...fr, freq: hz(m) }; };
};
// in the page: the Boss's outcome (finishBoss's argument) and its numbers
const BOSS_TAP = () => {
  if (window.__bossTap) return; window.__bossTap = true; const orig = finishBoss;
  finishBoss = function (r) { window.__bossOutcome = r; return orig.apply(this, arguments); };
  window.__bossNums = () => {
    const o = { outcome: window.__bossOutcome || 'none', 'boss health': Math.round(bossHealth), 'your health': Math.round(playerHealth), victories: progress.bossVictories || 0 };
    const heard = bossNoteResults.filter(r => r && r.heard); o['notes heard'] = heard.length;
    bossNoteResults.forEach((r, i) => { if (r) o[`note ${i + 1}`] = r.heard ? r.pitchAcc : 'not heard'; });
    const w = bossFindWeakestNote(); o['weakest note'] = w ? noteNameFromMidi(w.midi) : 'none'; o['weakest %'] = w ? w.pitchAcc : 'none';
    return o;
  };
};
// in the page: vlFeed calls (the vocal load fed)
const FEED_TAP = () => {
  if (window.__feedTap) return; window.__feedTap = true; window.__feeds = 0; const f = vlFeed;
  vlFeed = function () { window.__feeds++; return f.apply(this, arguments); };
};
for (const g of GAMES) {
  g.panel = 'arcade';
  // open: the game's page with its options set (the steering installed first: setup may use it)
  g.open = async page => { await open(g.game)(page); await page.evaluate(STEER_TAP); await page.evaluate(`(${g.setup})()`); };
  g.act = page => page.evaluate(id => { window.__t0 = performance.now(); document.getElementById(id).click(); }, g.start);
  g.idleOk = idle(g.start, g.label, `(${g.busy})()`);
}
const byKey = k => GAMES.find(g => g.key === k);
module.exports = { GAMES, byKey, SEED_INIT, seed, BOSS_TAP, FEED_TAP, STEER_TAP, vis };
