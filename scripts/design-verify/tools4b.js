// Phase 4b (PHASE4B.md): the 10 Coach tools with their own displays, driven through the app's own buttons. Shared by
// scores.js, live.js, house.js, stopcheck.js, contrast.js, shots.js and copyscan.js; the same shape as tools.js (open, act,
// busy, drive, btn, result), so tools.js's runTake and toolStates drive them. Works on master and on the branch: it reads
// element ids and globals both have.
// Seven take tools (sung: true) and three live tools (live: true: Start, sing, Stop; no result).
// The take tools are made deterministic for the fake mic's A4 (stage.js): the singer's range is narrowed to A4–A4 for
// One Take, Mirror, Register Drills (chest) and Emotion Mode, so today's note, the phrase (A4 ×4), the five drill notes and
// the note are all A4. Rhythm, Vibrato and Voice Quality have no target.
// Each tool also has:
//   stage     its .vc-stage on the branch (house.js)
//   stims     the stimuli scores.js runs it with (stage.js files, the vibrato tone, or synthmic.js: onbeat, late60, louder)
//   nums      (take tools, in the page after the take) every number its result is made of, from the tool's own state
//             and its displayed values, flattened to name → value (text values compared equal)
//   readout   (live tools, in the page) what it shows at this moment, as numbers and states (live.js)
//   idleOk    (in the page) the tool is back at its starting state: Start enabled, idle labels, cards reset (stopcheck.js)
// Units in nums: Hz in tenths ("5.6 Hz" → 56), the brightness ratio in hundredths, seconds in tenths: the precision each
// result shows, so the ±2 gate means 2 of the last digit shown. HNR in whole dB (same-code runs differ by 0.4 dB on a
// clean synthetic tone, which reads 84 dB).
const C = require('./common');

const narrow = (lo, hi) => { // the singer's range (restored by tools.js restoreRange)
  if (!window.__rrb) window.__rrb = registerRangeBounds;
  registerRangeBounds = () => ({ ...window.__rrb(), lowMidi: lo, highMidi: hi });
};
const clickId = (page, id) => page.evaluate(id => { window.__t0 = performance.now(); document.getElementById(id).click(); }, id);
const shown = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && !!e.getClientRects().length; };
const idleBtn = (id, flag) => `(() => { const b = document.getElementById('${id}'); return !!b && !b.disabled && !b.classList.contains('listening') && !(${flag}); })`;

const TOOLS = [
  { key: 'onetake', name: 'One Take', panel: 'onetake', sung: true, idle: '#oneTakeStartBtn', btn: '#oneTakeStartBtn', stage: '#oneTakeStage',
    result: '#oneTakeResultCard', liveAt: 2600, timeout: 15000, stims: ['steady', 'sharp'], fresh: true,
    open: async page => {
      await C.showPanel(page, 'onetake'); await C.clearOverlays(page);
      await page.evaluate(`(${narrow})(69, 69)`);
      // today's take not taken yet on this page (scores.js also gives every run a fresh account)
      await page.evaluate(() => { if (progress) { progress.oneTakeLastDate = null; progress.oneTakeHistory = {}; } renderOneTakeGate(); });
    },
    act: page => clickId(page, 'oneTakeStartBtn'),
    busy: () => oneTakeActive,
    nums: () => {
      const o = {}, r = progress.oneTakeHistory && progress.oneTakeHistory[todayStr()];
      if (r) { o.pitch = r.pitch; o.stability = r.stability; o.timing = r.timing; o.heard = r.heard ? 1 : 0; }
      o.saved = r ? 1 : 0;
      const num = s => { const m = String(s ?? '').match(/-?\d+(?:[.,]\d+)?/); return m ? +m[0].replace(',', '.') : null; };
      const big = document.getElementById('oneTakePitchVal');
      const vals = big ? [big, document.getElementById('oneTakeStabilityVal'), document.getElementById('oneTakeTimingVal')].map(e => e && num(e.textContent))
        : [...document.querySelectorAll('#oneTakeResultRows .record-val')].map(e => num(e.textContent));
      ['result: pitch', 'result: stability', 'result: timing'].forEach((n, i) => { if (vals[i] !== undefined) o[n] = vals[i]; });
      return o;
    },
    idleOk: () => { const b = document.getElementById('oneTakeStartBtn'), pre = document.getElementById('oneTakePreCard');
      return !oneTakeActive && !!b && !b.disabled && getComputedStyle(b).display !== 'none' && getComputedStyle(pre).display !== 'none'
        && getComputedStyle(document.getElementById('oneTakeRunnerCard')).display === 'none'; } },

  { key: 'mirror', name: 'Mirror', panel: 'mirror', sung: true, idle: '#mirrorPlayBtn', btn: '#mirrorPlayBtn', stage: '#mirrorStage',
    result: '#mirrorResultCard', liveAt: 4600, timeout: 15000, stims: ['steady', 'sharp'], phraseMs: 3200,
    open: async page => { await C.showPanel(page, 'mirror'); await C.clearOverlays(page); await page.evaluate(`(${narrow})(69, 69)`); },
    act: page => clickId(page, 'mirrorPlayBtn'),
    // the phrase and the echo (the branch disables Play for both; master has only the echo's flag)
    busy: () => document.getElementById('mirrorPlayBtn').disabled || mirrorActive,
    nums: () => {
      const o = {}, num = s => { const m = String(s ?? '').match(/-?\d+/); return m ? +m[0] : null; };
      o['result: accuracy'] = num(document.getElementById('mirrorResultAcc').textContent);
      // the score and each note's, recomputed from the take as finishMirrorEcho does (100 − mean |cents| × 0.6, vibrato-tolerant)
      const byNote = [[], [], [], []];
      mirrorUserTrace.forEach(p => { const i = Math.min(3, Math.floor(p.t / MIRROR_NOTE_MS)); byNote[i].push({ t: p.t, c: (p.midi - mirrorPhrase[i]) * 100 }); });
      let tot = 0, n = 0;
      byNote.forEach((pts, i) => {
        const c = vibratoTolerantCents(pts); c.forEach(x => { tot += Math.abs(x); n++; });
        o[`note ${i + 1}`] = c.length ? Math.max(0, Math.round(100 - c.reduce((a, x) => a + Math.abs(x), 0) / c.length * 0.6)) : 'not heard';
      });
      o.accuracy = n ? Math.max(0, Math.round(100 - tot / n * 0.6)) : 0;
      o.phrase = mirrorPhrase.map(m => noteNameFromMidi(m)).join(' ');
      return o;
    },
    idleOk: () => { const b = document.getElementById('mirrorPlayBtn'); return !mirrorActive && !!b && !b.disabled; } },

  { key: 'rhythm', name: 'Rhythm', panel: 'rhythm', sung: true, idle: '#rhythmStartBtn', btn: '#rhythmStartBtn', stage: '#rhythmStage',
    result: '#rhythmResultCard', liveAt: 3000, timeout: 15000, stims: ['steady', 'sharp', 'onbeat', 'late60'],
    open: async page => { await C.showPanel(page, 'rhythm'); await C.clearOverlays(page); },
    // with the synthetic mic: a sung onset on each scored beat, window.__rhythmLate ms late (synthmic.js)
    act: page => page.evaluate(async () => {
      const t0 = window.__t0 = performance.now(); document.getElementById('rhythmStartBtn').click();
      if (!window.__synth) return;
      const until = performance.now() + 5000;
      while (!(rhythmActive && rhythmBeatTimestamps.length === 8 && rhythmBeatTimestamps[0] > t0) && performance.now() < until) await new Promise(r => setTimeout(r, 5));
      __synth.pulses(rhythmBeatTimestamps.map(ts => ts + (window.__rhythmLate || 0)), 150);
    }),
    busy: () => rhythmActive,
    nums: () => {
      const o = {}, num = s => { const m = String(s ?? '').match(/-?\d+/); return m ? +m[0] : null; };
      const claimed = rhythmResults.filter(r => r.claimed);
      o.average = claimed.length ? Math.round(claimed.reduce((a, b) => a + b.accuracy, 0) / claimed.length) : 0;
      o['beats caught'] = claimed.length;
      rhythmResults.forEach((r, i) => { o[`beat ${i + 1} ms`] = r.claimed ? r.offsetMs : 'missed'; o[`beat ${i + 1} %`] = r.claimed ? r.accuracy : 'missed'; });
      if (claimed.length) o['result: average'] = num(document.getElementById('rhythmResultAvg').textContent); // none caught: the branch shows no number (v1.4), master 0%
      return o;
    },
    idleOk: () => { const b = document.getElementById('rhythmStartBtn'); return !rhythmActive && !!b && !b.disabled && document.getElementById('rhythmStartLabel').textContent === t('action_start'); } },

  { key: 'registerdrills', name: 'Register Drills', panel: 'registerdrills', sung: true, idle: '#drillStartBtn', btn: '#drillStartBtn', stage: '#drillStage',
    result: '#drillResultCard', liveAt: 1600, timeout: 25000, stims: ['steady', 'sharp'],
    open: async page => {
      await C.showPanel(page, 'registerdrills'); await C.clearOverlays(page);
      await page.evaluate(() => document.querySelector('#drillModeRow [data-drill-mode="chest"]').click());
      await page.evaluate(`(${narrow})(69, 69)`);
    },
    act: page => clickId(page, 'drillStartBtn'),
    busy: () => drillActive,
    nums: () => {
      const o = {};
      drillResults.forEach((r, i) => {
        o[`note ${i + 1}`] = noteNameFromMidi(r.midi);
        o[`note ${i + 1} pitch`] = r.heard ? r.pitchAcc : 'not heard';
        o[`note ${i + 1} chest`] = r.avgChest ?? 'none';
        o[`note ${i + 1} match`] = r.registerMatch ? 1 : 0;
      });
      const h = drillResults.filter(r => r.heard);
      o['average pitch'] = h.length ? Math.round(h.reduce((a, b) => a + b.pitchAcc, 0) / h.length) : 'not heard';
      o.matched = h.filter(r => r.registerMatch).length;
      o.notes = drillResults.length;
      return o;
    },
    idleOk: () => { const b = document.getElementById('drillStartBtn');
      return !drillActive && !!b && !b.disabled && getComputedStyle(document.getElementById('drillPreCard')).display !== 'none'
        && getComputedStyle(document.getElementById('drillRunnerCard')).display === 'none'; } },

  { key: 'vibrato', name: 'Vibrato', panel: 'vibrato', sung: true, idle: '#vibratoStartBtn', btn: '#vibratoStartBtn', stage: '#vibratoStage',
    result: '#vibratoFeedback', liveAt: 2000, timeout: 12000, stims: ['steady', 'sharp', 'vibrato'],
    open: async page => {
      await C.showPanel(page, 'vibrato'); await C.clearOverlays(page);
      await page.evaluate(() => { // the analysis's own result, as returned (both builds call analyzeVibrato)
        if (window.__vibTap) return; window.__vibTap = true; const orig = analyzeVibrato;
        analyzeVibrato = function () { const r = orig.apply(this, arguments); window.__vib = r; return r; };
      });
    },
    act: page => clickId(page, 'vibratoStartBtn'),
    busy: () => vibratoActive,
    nums: () => {
      const o = {}, r = window.__vib || {}, num = s => { const m = String(s ?? '').match(/-?\d+(?:[.,]\d+)?/); return m ? +m[0].replace(',', '.') : null; };
      o.found = r.ok ? 1 : 0; o.straight = r.straight ? 1 : 0;
      if (r.ok) { o['rate (0.1 Hz)'] = Math.round(r.rate * 10); o['depth ct'] = r.depth; o.consistency = r.consistency; }
      o['trace points'] = r.trace ? r.trace.length : 0;
      const rate = num(document.getElementById('vibratoRateStat').textContent);
      o['result: rate (0.1 Hz)'] = rate === null ? null : Math.round(rate * 10);
      o['result: depth'] = num(document.getElementById('vibratoDepthStat').textContent);
      o['result: consistency'] = num(document.getElementById('vibratoConsistencyStat').textContent);
      return o;
    },
    idleOk: idleBtn('vibratoStartBtn', 'vibratoActive') },

  { key: 'voicequality', name: 'Voice Quality', panel: 'voicequality', sung: true, idle: '#vqStartBtn', btn: '#vqStartBtn', stage: '#vqStage',
    result: '#vqResult', liveAt: 2000, timeout: 12000, stims: ['steady', 'sharp', 'vibrato'],
    open: async page => { await C.showPanel(page, 'voicequality'); await C.clearOverlays(page); },
    act: page => clickId(page, 'vqStartBtn'),
    busy: () => vqActive,
    nums: () => {
      const o = {}, r = vqLast || {};
      o.ok = r.ok ? 1 : 0;
      if (!r.ok) return o;
      o['f0 Hz'] = Math.round(r.f0); o.note = midiName(Math.round(r.midi)); o['seconds (0.1)'] = Math.round(r.seconds * 10);
      o['vibrato found'] = r.vib.ok ? 1 : 0;
      if (r.vib.ok) { o['vibrato rate (0.1 Hz)'] = Math.round(r.vib.rate * 10); o['vibrato depth ct'] = r.vib.depth; o['vibrato consistency'] = r.vib.consistency; }
      if (r.hnr !== null) { o['HNR dB'] = Math.round(r.hnr); o['HNR band'] = r.hnr >= VQ_HNR_CLEAR ? 'clear' : r.hnr >= VQ_HNR_BREATHY ? 'some' : 'breathy'; }
      if (r.centroid !== null) {
        const ratio = Math.round(r.centroid / r.f0 * 100) / 100, [dk, br] = vqBrightBounds(r.f0);
        o['centroid Hz'] = Math.round(r.centroid); o['brightness (0.01×)'] = Math.round(ratio * 100); o['brightness band'] = ratio < dk ? 'dark' : ratio > br ? 'bright' : 'balanced';
      }
      return o;
    },
    idleOk: idleBtn('vqStartBtn', 'vqActive') },

  { key: 'emotionmode', name: 'Emotion Mode', panel: 'emotionmode', sung: true, idle: '#emoStartBtn', btn: '#emoStartBtn', stage: '#emoStage',
    result: '#emoResultCard', liveAt: 2600, timeout: 20000, stims: ['steady', 'sharp', 'louder'],
    open: async page => {
      await C.showPanel(page, 'emotionmode'); await C.clearOverlays(page);
      await page.evaluate(`(${narrow})(69, 69)`);
      await page.evaluate(() => { // the louder stimulus: take 2 at +6 dB (synthmic.js)
        if (!window.__synth || window.__emoTap) return; window.__emoTap = true; const orig = runEmoRound;
        runEmoRound = function (intent, n) { __synth.level(n === 2 ? 2 : 1); return orig.apply(this, arguments); };
      });
    },
    act: page => clickId(page, 'emoStartBtn'),
    busy: () => emoActive,
    nums: () => {
      const o = {}, [a, b] = emoResults, db = v => v > 0 ? Math.round(20 * Math.log10(v)) : null;
      if (!a || !b) return { takes: emoResults.length };
      [a, b].forEach((r, i) => { o[`take ${i + 1} heard`] = r.heard ? 1 : 0; o[`take ${i + 1} stability`] = Math.round(r.stability); o[`take ${i + 1} loudness dBFS`] = db(r.avgLoudness); o[`take ${i + 1} range dB`] = db(r.dynamicRange); });
      if (a.heard && b.heard) { // the comparisons, as finishEmoMode makes them
        o['dynamic range %'] = a.dynamicRange > 0 ? Math.round((b.dynamicRange - a.dynamicRange) / a.dynamicRange * 100) : 0;
        o['loudness %'] = a.avgLoudness > 0 ? Math.round((b.avgLoudness - a.avgLoudness) / a.avgLoudness * 100) : 0;
        o['pitch stability points'] = Math.round(b.stability - a.stability);
      }
      // the rows shown: each row's own number (master "… was +12% vs …"; the branch "+12 %")
      [...document.querySelectorAll('#emoResultRows .record-row, #emoResultRows .vc-dim')].forEach((row, i) => {
        const v = row.lastElementChild ? row.lastElementChild.textContent : row.textContent, m = v.replace(/−/g, '-').match(/[+-]?\d+/);
        o[`result: row ${i + 1}`] = m ? +m[0] : null;
      });
      return o;
    },
    idleOk: () => { const b = document.getElementById('emoStartBtn');
      return !emoActive && !!b && !b.disabled && getComputedStyle(document.getElementById('emoPreCard')).display !== 'none'
        && getComputedStyle(document.getElementById('emoRunnerCard')).display === 'none'; } },

  // the live tools: Start, sing, Stop (the same button)
  { key: 'register', name: 'Register Coach', panel: 'register', live: true, idle: '#regMicBtn', btn: '#regMicBtn', stage: '#registerStage', liveAt: 3000,
    open: async page => { await C.showPanel(page, 'register'); await C.clearOverlays(page); },
    act: page => clickId(page, 'regMicBtn'),
    stop: page => page.evaluate(() => { window.__t1 = performance.now(); document.getElementById('regMicBtn').click(); }),
    busy: () => mode === 'register',
    readout: () => {
      const num = s => { const m = String(s ?? '').match(/-?\d+(?:[.,]\d+)?/); return m ? +m[0].replace(',', '.') : null; };
      const mk = document.getElementById('pitchMarker'), cross = num(document.getElementById('regBridgeStat').textContent);
      return { note: document.getElementById('regNoteStat').textContent.trim(), chest: num(document.getElementById('regChestScoreStat').textContent),
        zone: document.getElementById('regNoteStat').textContent.trim() === '—' ? 'none' : (mk.dataset.zone || 'none'),
        pushing: document.getElementById('regFeedback').classList.contains('warn') ? 1 : 0, 'crossing (0.1 s)': cross === null ? null : Math.round(cross * 10) };
    },
    idleOk: idleBtn('regMicBtn', "mode === 'register'") },
  { key: 'livefeedback', name: 'Live Feedback', panel: 'livefeedback', live: true, idle: '#liveFeedbackStartBtn', btn: '#liveFeedbackStartBtn', stage: '#liveFeedbackStage', liveAt: 3000,
    open: async page => { await C.showPanel(page, 'livefeedback'); await C.clearOverlays(page); },
    act: page => clickId(page, 'liveFeedbackStartBtn'),
    stop: page => page.evaluate(() => { window.__t1 = performance.now(); document.getElementById('liveFeedbackStartBtn').click(); }),
    busy: () => lfActive,
    readout: () => {
      const o = {};
      for (const p of ['Pitch', 'Stability', 'Breath', 'Register']) o[p.toLowerCase()] = document.getElementById('lf' + p + 'Icon').dataset.state || 'none';
      const m = document.getElementById('lfPitchText').textContent.replace(/−/g, '-').match(/[+-]?\d+/);
      o['pitch ct'] = m ? +m[0] : (o.pitch === 'good' ? 0 : null);
      return o;
    },
    idleOk: idleBtn('liveFeedbackStartBtn', 'lfActive') },
  { key: 'resonance', name: 'Resonance', panel: 'resonance', live: true, idle: '#resonanceStartBtn', btn: '#resonanceStartBtn', stage: '#resonanceStage', liveAt: 3000,
    open: async page => {
      await C.showPanel(page, 'resonance'); await C.clearOverlays(page);
      await page.evaluate(() => { // the frame's own numbers (both builds draw through drawResonanceFrame)
        if (window.__resTap) return; window.__resTap = true; const orig = drawResonanceFrame;
        drawResonanceFrame = function (st, osc, col, active) { window.__res = { st, osc, active }; return orig.apply(this, arguments); };
      });
    },
    act: page => clickId(page, 'resonanceStartBtn'),
    stop: page => page.evaluate(() => { window.__t1 = performance.now(); document.getElementById('resonanceStartBtn').click(); }),
    busy: () => resonanceActive,
    readout: () => {
      const r = window.__res || {}, m = document.getElementById('resSteadyStat').textContent.match(/\d+/);
      return { zone: document.getElementById('resRegisterStat').textContent.trim(), steadiness: m ? +m[0] : null,
        ripple: r.active ? Math.round(r.osc) : null, rippling: r.active ? (r.osc > 25 ? 1 : 0) : null };
    },
    idleOk: idleBtn('resonanceStartBtn', 'resonanceActive') },
];
const TAKE = TOOLS.filter(t => t.sung), LIVE = TOOLS.filter(t => t.live);
const byKey = k => TOOLS.find(t => t.key === k);
const STATE_NAMES = TOOLS.flatMap(t => [`${t.key}-idle`, `${t.key}-stage`, `${t.key}-${t.live ? 'stopped' : 'result'}`]);

// The tools a review script covers, from its --set argument: 4a (tools.js), 4b (these) or all (the default).
function toolSet(argv = process.argv) {
  const i = argv.indexOf('--set'), set = i > 0 ? argv[i + 1] : 'all', T = require('./tools');
  const tools = set === '4a' ? T.TOOLS : set === '4b' ? TOOLS : [...T.TOOLS, ...TOOLS];
  const names = set === '4a' ? T.STATE_NAMES : set === '4b' ? STATE_NAMES : [...T.STATE_NAMES, ...STATE_NAMES];
  return { set, tools, names };
}

module.exports = { TOOLS, TAKE, LIVE, byKey, STATE_NAMES, narrow, shown, toolSet };
