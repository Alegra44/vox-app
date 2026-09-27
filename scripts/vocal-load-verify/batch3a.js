// Vocal Load phase 3b, batch 3 part 1, through harness.js.
// Register input, fed with vlFeed from the frames they already read (no second reader): Register Runner, the Register
// Wraith boss, the Resonance Visualizer, Register Drills. Their own unprocessed capture (vqCapture), fed the same way:
// Vibrato Analyzer, Voice Quality. Shared mic (vlSidecar): Studio Mode, Hear Yourself Improve (day-1 clip and today's
// clip), Harmony Arena, AI Duet Partner, Your Choir.
// Usage: node scripts/vocal-load-verify/batch3a.js [url]
const { run } = require('./harness');

const hub = (shell, p) => ({ shell, enter: `#panel-${shell}-hub [data-enter-panel="${p}"]` });
// arcade games unlock by level (floor(xp / 50) + 1): Register Runner 3, the boss 5, Harmony Arena 10
const arcade = g => ({ shell: 'world', enter: `.arcade-game-card[data-game="${g}"]`, xp: 450 });
const num = v => parseFloat(String(v).replace(',', '.'));
// Numbers within tol, everything else exact.
const near = (tol, keys) => (a, b) => Object.keys(a).every(k => keys.includes(k)
  ? (Number.isNaN(num(a[k])) || Number.isNaN(num(b[k])) ? a[k] === b[k] : Math.abs(num(a[k]) - num(b[k])) <= tol)
  : JSON.stringify(a[k]) === JSON.stringify(b[k]));
const disabled = id => `!!document.getElementById('${id}').disabled`;

const FEATURES = [
  { key: 'bridge', label: 'Register Runner (seeded course, runs until the lives are gone)', kind: 'register', ...arcade('bridge'), startBtn: 'bridgeStartBtn', gauge: 'vlGaugeBridge',
    prep: 'progress.bridgeBest = 0; __seed(7)', active: 'bridgeActive', // no best yet both times, so both titles read "New best!"
    result: () => ({ score: bridgeScoreVal, lives: bridgeLives, lane: bridgeLane, title: document.getElementById('bridgeGameOverTitle').textContent }),
    same: near(3, ['score']) },
  { key: 'wraith', label: 'Register Wraith boss, beginner (runs to the end)', kind: 'register', ...arcade('boss'), startBtn: 'bossStartBtn', gauge: 'vlGaugeBoss',
    prep: `document.querySelector('[data-boss-type="register"]').click(); document.querySelector('[data-boss-difficulty="beginner"]').click(); __seed(7)`,
    safariPrep: `document.querySelector('[data-boss-type="register"]').click()`,
    active: 'bossActive',
    result: () => ({ boss: Math.round(bossHealth), player: Math.round(playerHealth), notes: bossNoteResults.map(r => r && r.pitchAcc !== undefined ? r.pitchAcc : JSON.stringify(r)).join(' ') }) },
  { key: 'resonance', label: 'Resonance Visualizer (stopped at 7 s)', kind: 'register', ...hub('train', 'resonance'), startBtn: 'resonanceStartBtn', gauge: 'vlGaugeResonance',
    active: 'resonanceActive', stopAfter: 7000, stop: p => p.locator('#resonanceStartBtn').click(),
    snap: () => ({ register: document.getElementById('resRegisterStat').textContent, steady: document.getElementById('resSteadyStat').textContent, osc: document.getElementById('resOscStat').textContent }),
    same: near(2, ['steady', 'osc']) },
  { key: 'drills', label: 'Register Drills (5 seeded notes)', kind: 'register', ...hub('train', 'registerdrills'), startBtn: 'drillStartBtn', gauge: 'vlGaugeDrill',
    prep: "__seed(7); document.getElementById('drillResultCard').style.display='none'; document.getElementById('drillPreCard').style.display='block';",
    active: 'drillActive',
    // it reads the register input only in each note's 1.8 s capture window (not while the reference tone plays or in
    // the 0.4 s pause after): 5 × 1.8 = 9.0 s, plus the first frame of windows 2–5, whose gap the engine caps at 0.1 s
    expectActive: () => [9.0 - 0.8, 9.0 + 0.4 + 0.3, '5 capture windows × 1.8 s, not the whole run'],
    result: () => ({ rows: document.getElementById('drillResultRows').innerText.replace(/\s+/g, ' '), note: document.getElementById('drillResultNote').textContent }) },
  { key: 'vibrato', label: 'Vibrato Analyzer (its own unprocessed capture, 4 s)', kind: 'own', ...hub('train', 'vibrato'), startBtn: 'vibratoStartBtn', gauge: 'vlGaugeVibrato',
    active: 'vibratoActive',
    result: () => ({ rate: document.getElementById('vibratoRateStat').textContent, depth: document.getElementById('vibratoDepthStat').textContent,
      consistency: document.getElementById('vibratoConsistencyStat').textContent, fb: document.getElementById('vibratoFeedback').textContent }) },
  { key: 'vq', label: 'Voice Quality (its own unprocessed capture, 4 s)', kind: 'own', ...hub('train', 'voicequality'), startBtn: 'vqStartBtn', gauge: 'vlGaugeVq',
    active: 'vqActive',
    result: () => Object.fromEntries(['vqVibVal', 'vqVibRead', 'vqHnrVal', 'vqHnrRead', 'vqBrightVal', 'vqBrightRead', 'vqNote'].map(id => [id, document.getElementById(id).textContent])),
    // the note's voiced time ±0.1 s (one 0.1 s rounding step; where the capture's last frame lands), the rest of it exact
    same: (a, b) => {
      const secs = s => s.match(/(\d+(?:[.,]\d+)?) s\b/), sa = secs(a.vqNote), sb = secs(b.vqNote);
      const rest = s => s.replace(/(\d+(?:[.,]\d+)?) s\b/, 'N s');
      return near(1.5, ['vqVibVal', 'vqHnrVal', 'vqBrightVal'])({ ...a, vqNote: rest(a.vqNote) }, { ...b, vqNote: rest(b.vqNote) })
        && !!sa === !!sb && (!sa || Math.abs(num(sa[1]) - num(sb[1])) <= 0.1 + 1e-9);
    } },
  { key: 'studio', label: 'Studio Mode (a 15 s take)', kind: 'sidecar', ...hub('songs', 'studio'), startBtn: 'studioRecordBtn', gauge: 'vlGaugeStudio', safari: true,
    active: disabled('studioRecordBtn'),
    result: async () => { // the note is written once the take has been saved, after the button comes back
      const el = document.getElementById('studioRecordNote'), t0 = Date.now(), before = el.dataset.seen || '';
      while ((!el.textContent || el.textContent === before) && Date.now() - t0 < 10000) await new Promise(r => setTimeout(r, 100));
      el.dataset.seen = el.textContent;
      return { note: el.textContent.replace(/\d+/, 'N'), kb: Math.round(progress.studioTakes[progress.studioTakes.length - 1].base64.length / 1000) };
    },
    same: (a, b) => a.note === b.note && Math.abs(a.kb - b.kb) <= 0.15 * a.kb },
  { key: 'journey', label: 'Hear Yourself Improve: the day-1 clip (Journey, 4 s)', kind: 'sidecar', ...hub('you', 'journey'), startBtn: 'journeyRecordBtn', gauge: 'vlGaugeJourney',
    active: disabled('journeyRecordBtn'),
    result: async () => { // the check and the label change once the clip has been saved, after the button comes back
      const btn = document.getElementById('journeyRecordBtn'), t0 = Date.now();
      while (/Recording/.test(btn.textContent) && Date.now() - t0 < 10000) await new Promise(r => setTimeout(r, 100));
      return { check: document.getElementById('voiceRecordCheck').textContent, btn: btn.textContent, kb: Math.round(profile.day1AudioClip.base64.length / 1000) };
    },
    same: (a, b) => a.check === b.check && a.btn === b.btn && Math.abs(a.kb - b.kb) <= 0.15 * a.kb },
  { key: 'today', label: "Hear Yourself Improve: today's clip (4 s)", kind: 'sidecar', ...hub('you', 'pricing'), startBtn: 'recordTodayBtn', gauge: 'vlGaugeToday',
    // in the app this card appears when the 21-day trial has ended (which would also lock the Pro features this run
    // uses), so it is revealed directly; the section inside shows once the day-1 clip exists (recorded just above)
    show: "document.getElementById('trialCompleteCard').style.display = 'block'; renderHearYourselfImprove()",
    prep: 'profile.todayAudioClip = null; renderHearYourselfImprove()', // once a clip is saved the record button is hidden
    active: disabled('recordTodayBtn'),
    result: async () => { // shown once the clip has been saved, after the button comes back
      const t0 = Date.now(), seen = window.__todayClip;
      while ((!profile.todayAudioClip || profile.todayAudioClip === seen || document.getElementById('todayAudioPlayer').style.display !== 'block') && Date.now() - t0 < 10000) await new Promise(r => setTimeout(r, 100));
      window.__todayClip = profile.todayAudioClip;
      return { player: document.getElementById('todayAudioPlayer').style.display, kb: Math.round(profile.todayAudioClip.base64.length / 1000) };
    },
    same: (a, b) => a.player === b.player && Math.abs(a.kb - b.kb) <= 0.15 * a.kb },
  { key: 'harmony', label: 'Harmony Arena (song, runs to the end)', kind: 'sidecar', ...arcade('harmony'), startBtn: 'harmonyStartBtn', gauge: 'vlGaugeHarmony',
    prep: '__seed(7)', active: 'harmonyActive',
    result: () => ({ acc: document.getElementById('harmonyAccVal').textContent, pitch: document.getElementById('harmonyPitchVal').textContent,
      timing: document.getElementById('harmonyTimingVal').textContent, part: document.getElementById('harmonyPartVal').textContent }),
    same: near(2, ['acc', 'pitch', 'timing', 'part']) },
  { key: 'duet', label: 'AI Duet Partner (the other parts play; stopped at 8 s)', kind: 'sidecar', ...hub('songs', 'aiduet'), startBtn: 'aiDuetStartBtn', gauge: 'vlGaugeDuet',
    active: 'aiDuetActive && choirIsPlaying', stopAfter: 8000, stop: p => p.locator('#aiDuetStartBtn').click(),
    snap: () => ({ muted: Object.keys(choirState).filter(p => choirState[p].muted).join(','), playing: choirIsPlaying, part: aiDuetSelectedPart }) },
  { key: 'yourchoir', label: 'Your Choir: record the Lead part (runs to the end of the song)', kind: 'sidecar', ...hub('songs', 'choir'), startSel: '[data-yc-rec="Lead"]', gauge: 'vlGaugeYc',
    active: '!!yourChoir.recording && (!yourChoir.recording.recorder || yourChoir.recording.recorder.state !== "inactive")',
    result: async () => {
      while (yourChoir.recording) await new Promise(r => setTimeout(r, 100)); // decoded and saved
      const tk = ycTakes(currentSongId).Lead;
      return { status: document.getElementById('ycStatus').textContent, dur: tk && tk.dur, lead: tk && +tk.lead.toFixed(1) };
    },
    same: (a, b) => a.status === b.status && Math.abs(a.dur - b.dur) <= 0.3 && Math.abs(a.lead - b.lead) <= 0.3 },
];

run(FEATURES).catch(e => { console.error(e); process.exitCode = 1; });
