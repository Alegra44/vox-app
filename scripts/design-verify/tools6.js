// Phase 6 (PHASE6.md): the six Songs-tab solo tools and the Songs tab, driven through the app's own buttons. Shared by
// scores.js, house.js, stopcheck.js, contrast.js, copyscan.js and shots.js (--set 6); the same shape as tools4b.js (open,
// act, busy, btn, stage, result, nums, idleOk), so tools.js's runTake and toolStates drive them. Works on master and on
// the branch: where the branch changes a control (Studio's Record button stays live as Stop, Performance Director gets
// a Stop, the takes move to device storage), each check reads whichever the build has.
// Five tools that sing on a stage (sung: true): Studio Mode (a 15 s take), Performance Director, Stay in Key, Karaoke
// Coach, Emotional Singing (the song once, Demo Hymn: 8 chords, 26.7 s). One that plays (live: true): Sing With the
// Choir (was AI Duet Partner), Start, the choir sings, Stop. And the Songs tab itself (page: true, idle only).
// Each tool also has:
//   stage     its .vc-stage on the branch (house.js)
//   stims     the stimuli scores.js runs it with: stage.js's steady A4, and "lead" (synthmic.js: the steady note moved
//             onto the song's Lead line, each note on its chord, from the tool's own start)
//   nums      (scored tools, in the page after the run) every number its result is made of, from the tool's own state,
//             its display and the skill score it recorded, flattened to name → value (text values compared equal)
//   idleOk    (in the page) back at its starting state: not running, Start enabled with its idle label (stopcheck.js)
//   flags     (in the page) every loop flag and sound that must be off once you have left (stopcheck.js)
//   snap, leaveOk  (in the page) a snapshot before the start, and what must still hold after leaving (stopcheck.js):
//             no skill score and no result after leaving; Studio: no take saved; Sing With the Choir: the mixer as before
//   settle    ms to wait after leaving before the checks (Studio: past the take's 15 s, so a take saved late is seen)
const C = require('./common');

const shown = sel => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && !!e.getClientRects().length; };
// in the page: every recordSkillScore call, timed (the leave check: none after leaving)
const SKILL_TAP = () => {
  window.__skills = [];
  if (window.__skillTap) return; window.__skillTap = true; const orig = recordSkillScore;
  recordSkillScore = function (cat, score) { window.__skills.push({ cat, score, t: performance.now() }); return orig.apply(this, arguments); };
};
const open = panel => async page => {
  await C.showPanel(page, panel); await C.clearOverlays(page);
  await page.evaluate(SKILL_TAP);
  await page.evaluate(() => { if (typeof selectSong === 'function' && currentSongId !== 'hymn') selectSong('hymn'); });
};
// Start, and with the "lead" stimulus the synthetic mic sings the Lead line from the tool's own start time
const startSung = (id, active, startVar) => page => page.evaluate(async ({ id, active, startVar }) => {
  const g = v => new Function('return (' + v + ')')();
  window.__t0 = performance.now();
  const lead = window.__synth && window.__leadLine, line = () => SONG.parts.Lead.notes.map(m => m - 69);
  if (lead) __synth.melody(performance.now(), line(), songChordDurMs()); // provisional, until the tool's clock is known
  document.getElementById(id).click();
  if (!lead) return;
  const until = performance.now() + 6000;
  while (!g(active) && performance.now() < until) await new Promise(r => setTimeout(r, 5));
  if (g(active)) __synth.melody(g(startVar), line(), songChordDurMs());
}, { id, active, startVar });
// the Start button's label is not Stop (master: "Start (Pro)", the branch: "Start")
const startIdle = (btn, label, flag) => `(() => { const b = document.getElementById('${btn}'), l = document.getElementById('${label}');
  return !(${flag}) && !!b && !b.disabled && !b.classList.contains('listening') && !!l && l.textContent.trim() !== t('action_stop'); })`;

// Studio: recording (the branch keeps the button live as Stop; master disables it for the take)
const STUDIO_REC = () => typeof studioRec !== 'undefined' ? !!studioRec.active : document.getElementById('studioRecordBtn').disabled;
// the takes stored (the branch: device storage; master: progress.studioTakes)
const STUDIO_TAKES = () => typeof studioTakes === 'function' ? studioTakes().length : ((typeof progress !== 'undefined' && progress && progress.studioTakes) || []).length;

const FLAGS = () => ({ stayKey: stayKeyActive, emotion: emotionActive, karaoke: karaokeActive, pd: pdActive, duet: aiDuetActive,
  choir: choirIsPlaying, backingPad: backingActiveOsc.length > 0, choirOsc: choirActiveOscillators.length > 0,
  studioRec: typeof studioRec !== 'undefined' ? !!studioRec.active : document.getElementById('studioRecordBtn').disabled });
const SNAP = () => ({ takes: typeof studioTakes === 'function' ? studioTakes().length : ((progress && progress.studioTakes) || []).length,
  muted: Object.keys(choirState).filter(p => choirState[p].muted).join(','), solo: Object.keys(choirState).filter(p => choirState[p].solo).join(',') });
// after leaving: no skill score, no result shown; Studio no take saved; the mixer as it was before
const leaveOk = result => `(before => {
  const now = (${SNAP.toString()})(), leftAt = window.__leaveT || 0;
  const skills = (window.__skills || []).filter(s => s.t > leftAt).map(s => s.cat + ' ' + s.score);
  const res = ${result ? `(${shown.toString()})('${result}')` : 'false'};
  const ok = !skills.length && !res && now.takes === before.takes && now.muted === before.muted && now.solo === before.solo;
  return { ok, detail: 'skill scores after leaving ' + (skills.join(', ') || 'none') + ' · result shown ' + res + ' · takes ' + before.takes + ' → ' + now.takes
    + ' · muted [' + before.muted + '] → [' + now.muted + '] · solo [' + before.solo + '] → [' + now.solo + ']' };
})`;

const TOOLS = [
  { key: 'studio', name: 'Studio Mode', panel: 'studio', sung: true, idle: '#studioRecordBtn', btn: '#studioRecordBtn', stage: '#studioStage',
    result: '#studioTakesList', liveAt: 4000, timeout: 25000, settle: 14000, drain: true,
    open: async page => {
      await open('studio')(page);
      // no takes stored, so the three-take limit never stops a check (a throwaway test account)
      await page.evaluate(() => { if (typeof studioSaveTakes === 'function') studioSaveTakes([]); else if (progress) progress.studioTakes = []; renderStudioTakes(); });
    },
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('studioRecordBtn').click(); }),
    busy: STUDIO_REC,
    idleOk: `(() => !(${STUDIO_REC})() && !document.getElementById('studioRecordBtn').disabled && document.getElementById('studioRecordLabel').textContent.trim() === t('studio_record_btn'))` },

  { key: 'pd', name: 'Performance Director', panel: 'performancedirector', sung: true, idle: '#pdStartBtn', btn: '#pdStopBtn', stage: '#pdStage',
    result: '#pdResultCard', liveAt: 6000, timeout: 40000, stims: ['steady', 'lead'],
    open: open('performancedirector'),
    act: startSung('pdStartBtn', 'pdActive', 'pdStartTime'),
    busy: () => pdActive,
    nums: () => {
      const o = {}, num = s => { const m = String(s ?? '').match(/-?\d+/); return m ? +m[0] : null; };
      pdResults.forEach((r, i) => { if (!r) return; o[`note ${i + 1} pitch`] = r.heard ? r.pitchAcc : 'not heard'; o[`note ${i + 1} timing`] = r.timingScore; });
      const heard = pdResults.filter(r => r && r.heard);
      o['notes heard'] = heard.length;
      o.pitch = heard.length ? Math.round(heard.reduce((a, b) => a + b.pitchAcc, 0) / heard.length) : 0;
      o.timing = heard.length ? Math.round(heard.reduce((a, b) => a + b.timingScore, 0) / heard.length) : 0;
      o.technique = Math.round((o.pitch + o.timing) / 2);
      // the shown values: the branch's own ids, master's four rows (Technique, Pitch, Timing, Dynamics)
      const ids = ['pdTechniqueVal', 'pdPitchVal', 'pdTimingVal', 'pdDynamicsVal'];
      const vals = document.getElementById('pdPitchVal') ? ids.map(id => num(document.getElementById(id).textContent))
        : [...document.querySelectorAll('#pdResultRows .record-val')].map(e => num(e.textContent));
      ['result: technique', 'result: pitch', 'result: timing', 'result: dynamics'].forEach((n, i) => { if (vals[i] !== undefined) o[n] = vals[i]; });
      const s = (window.__skills || []).filter(x => x.cat === 'pitch'); o['skill pitch recorded'] = s.length ? s[s.length - 1].score : 'none';
      return o;
    },
    idleOk: `(() => !pdActive && (${shown.toString()})('#pdStartBtn') && !document.getElementById('pdStartBtn').disabled && (${shown.toString()})('#pdBriefingCard') && !(${shown.toString()})('#pdRunnerCard'))` },

  { key: 'duet', name: 'Sing With the Choir', panel: 'aiduet', live: true, idle: '#aiDuetStartBtn', btn: '#aiDuetStartBtn', stage: '#aiDuetStage', liveAt: 4000,
    open: open('aiduet'),
    act: page => page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('aiDuetStartBtn').click(); }),
    stop: page => page.evaluate(() => { window.__t1 = performance.now(); document.getElementById('aiDuetStartBtn').click(); }),
    busy: () => aiDuetActive && choirIsPlaying,
    idleOk: `(() => { const b = document.getElementById('aiDuetStartBtn'), tx = b.textContent.trim();
      return !aiDuetActive && !choirIsPlaying && !b.disabled && tx !== 'Stop' && tx !== t('action_stop') && !Object.values(choirState).some(s => s.muted); })` },

  { key: 'staykey', name: 'Stay in Key', panel: 'staykey', sung: true, idle: '#stayKeyStartBtn', btn: '#stayKeyStartBtn', stage: '#stayKeyStage',
    result: '#stayKeyResult', liveAt: 6000, timeout: 40000, stims: ['steady', 'lead'],
    open: open('staykey'),
    act: startSung('stayKeyStartBtn', 'stayKeyActive', 'stayKeyStartTime'),
    busy: () => stayKeyActive,
    nums: () => {
      const o = {}, num = s => { const m = String(s ?? '').match(/-?\d+/); return m ? +m[0] : null; };
      o['in key %'] = stayKeyTotalFrames > 0 ? Math.round(stayKeyInKeyFrames / stayKeyTotalFrames * 100) : 0;
      o['scored (over 10 voiced frames)'] = stayKeyTotalFrames > 10 ? 1 : 0;
      o['result: big number'] = num(document.getElementById('stayKeyAccuracyVal').textContent);
      const s = (window.__skills || []).filter(x => x.cat === 'pitch'); o['skill pitch recorded'] = s.length ? s[s.length - 1].score : 'none';
      return o;
    },
    idleOk: startIdle('stayKeyStartBtn', 'stayKeyStartLabel', 'stayKeyActive') },

  { key: 'karaoke', name: 'Karaoke Coach', panel: 'karaoke', sung: true, idle: '#karaokeStartBtn', btn: '#karaokeStartBtn', stage: '#karaokeStage',
    result: '#karaokeResult', liveAt: 6000, timeout: 40000, stims: ['steady', 'lead'],
    open: open('karaoke'),
    act: startSung('karaokeStartBtn', 'karaokeActive', 'karaokeStartTime'),
    busy: () => karaokeActive,
    nums: () => {
      const o = {}, num = s => { const m = String(s ?? '').match(/-?\d+/); return m ? +m[0] : null; };
      const all = karaokeResults.filter(Boolean), heard = all.filter(r => r.heard);
      karaokeResults.forEach((r, i) => { if (!r) return; o[`note ${i + 1} pitch`] = r.heard ? r.pitchAcc : 'not heard'; o[`note ${i + 1} timing`] = r.timingScore; });
      o['notes heard'] = heard.length;
      o.pitch = heard.length ? Math.round(heard.reduce((a, b) => a + b.pitchAcc, 0) / heard.length) : 0;
      o.timing = all.length ? Math.round(all.reduce((a, b) => a + b.timingScore, 0) / all.length) : 0;
      o['result: pitch'] = num(document.getElementById('karaokePitchVal').textContent);
      o['result: timing'] = num(document.getElementById('karaokeTimingVal').textContent);
      o['song best'] = progress && progress.songBestScores && progress.songBestScores[currentSongId] !== undefined ? progress.songBestScores[currentSongId] : 'none';
      // the Song Mission and Bonus rows: done (the branch marks data-done; master's labels start ✅) and the number shown
      [...document.querySelectorAll('#karaokeMissionRows > *, #karaokeMissionBonusRows > *')].forEach((row, i) => {
        o[`mission ${i + 1} done`] = row.dataset.done !== undefined ? +(row.dataset.done === '1') : +row.textContent.includes('✅');
        o[`mission ${i + 1} value`] = row.lastElementChild ? num(row.lastElementChild.textContent) : null;
      });
      const s = (window.__skills || []).filter(x => x.cat === 'pitch'); o['skill pitch recorded'] = s.length ? s[s.length - 1].score : 'none';
      return o;
    },
    idleOk: startIdle('karaokeStartBtn', 'karaokeStartLabel', 'karaokeActive') },

  { key: 'emotion', name: 'Emotional Singing', panel: 'emotion', sung: true, idle: '#emotionStartBtn', btn: '#emotionStartBtn', stage: '#emotionStage',
    result: '#emotionResult', liveAt: 6000, timeout: 40000, stims: ['steady', 'lead'],
    open: open('emotion'),
    act: startSung('emotionStartBtn', 'emotionActive', 'emotionStartTime'),
    busy: () => emotionActive,
    nums: () => {
      const o = {}, num = s => { const m = String(s ?? '').match(/-?\d+/); return m ? +m[0] : null; };
      // the two scores recomputed from the run as finishEmotionalSinging does
      let pitch = 'none', expr = 'none';
      if (emotionCentsSamples.length > 10) {
        const byNote = {}; emotionCentsSamples.forEach(s => { (byNote[s.idx] = byNote[s.idx] || []).push(s); });
        const abs = Object.values(byNote).flatMap(pts => vibratoTolerantCents(pts).map(Math.abs));
        pitch = Math.max(0, Math.round(100 - abs.reduce((a, b) => a + b, 0) / abs.length * 0.6));
      }
      const voiced = emotionRmsSamples.filter(r => r > 0.012);
      if (emotionRmsSamples.length > 10 && voiced.length > 10) {
        const mean = voiced.reduce((a, b) => a + b, 0) / voiced.length, v = voiced.reduce((a, b) => a + (b - mean) * (b - mean), 0) / voiced.length;
        expr = Math.max(0, Math.min(100, Math.round(Math.sqrt(v) / mean * 250)));
      }
      o.pitch = pitch; o.expression = expr;
      o['result: pitch'] = num(document.getElementById('emotionPitchVal').textContent);
      o['result: expression'] = num(document.getElementById('emotionExpressionVal').textContent);
      const fb = document.getElementById('emotionFeedback').textContent.trim();
      o['coach line'] = ['nosignal', 'flatdynamics', 'gooddynamics', 'moreneeded'].find(k => t('emotion_fb_' + k) === fb) || (fb ? 'other' : 'none');
      const s = (window.__skills || []).filter(x => x.cat === 'expression'); o['skill expression recorded'] = s.length ? s[s.length - 1].score : 'none';
      return o;
    },
    idleOk: startIdle('emotionStartBtn', 'emotionStartLabel', 'emotionActive') },
];
for (const tl of TOOLS) { tl.flags = FLAGS; tl.snap = SNAP; tl.leaveOk = leaveOk(tl.key === 'studio' || tl.live ? null : tl.result); }
// the Songs tab (paper)
const PAGES = [{ key: 'songs', name: 'Songs tab', panel: 'songs-hub', page: true, idle: '#panel-songs-hub',
  open: async page => { await C.showPanel(page, 'songs-hub'); await C.clearOverlays(page); } }];
const SCORED = TOOLS.filter(t => t.nums);
const byKey = k => TOOLS.find(t => t.key === k) || PAGES.find(t => t.key === k);
const STATE_NAMES = [...TOOLS.flatMap(t => [`${t.key}-idle`, `${t.key}-stage`, `${t.key}-${t.live ? 'stopped' : 'result'}`]), 'songs-idle'];

module.exports = { TOOLS, PAGES, SCORED, byKey, STATE_NAMES, SKILL_TAP, STUDIO_REC, STUDIO_TAKES };
