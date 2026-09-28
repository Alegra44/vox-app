// Vocal Load phase 3b, batch 3 part 2, through harness.js: the last solo features on the shared mic, all fed through
// vlSidecar. Choir World individual practice (I Am the Alto panel): the Entrance & Cutoff Trainer, Choir Bosses, Chaos
// Mode, the Tempo/Key Ladder. Arcade: The Vocal Rift, the Pitch Dragon's weakest-note training. Train hub: Ear → Voice →
// Ear, Sing It 5 Ways, One Take, Can You Hear Your Mistake (the sing-back only), Emotion Mode. Songs hub: Performance
// Director. (Vocal Puzzle is not here: it only plays notes and takes a click, it never reads the mic.)
// Usage: node scripts/vocal-load-verify/batch3b.js [url]
const { run, sleep } = require('./harness');

const hub = (shell, p) => ({ shell, enter: `#panel-${shell}-hub [data-enter-panel="${p}"]` });
const arcade = g => ({ shell: 'world', enter: `.arcade-game-card[data-game="${g}"]`, xp: 450 }); // Rift unlocks at 7, the boss at 5
const num = v => parseFloat(String(v).replace(',', '.'));
// Numbers within tol, everything else exact.
const near = (tol, keys) => (a, b) => Object.keys(a).every(k => keys.includes(k)
  ? (Number.isNaN(num(a[k])) || Number.isNaN(num(b[k])) ? a[k] === b[k] : Math.abs(num(a[k]) - num(b[k])) <= tol)
  : JSON.stringify(a[k]) === JSON.stringify(b[k]));
// The range captured in this session (registerRangeBounds), which these features pick their notes from: set so the notes
// land on C4, the tone. The load engine reads the saved range (progress), not this one, so the rate in harness.js holds.
const range = (lo, hi) => `lowNote = freqToNote(noteToFreq(${lo})); highNote = freqToNote(noteToFreq(${hi}));`;
const disabled = id => `!!document.getElementById('${id}').disabled`;
// I Am the Alto, singing the Lead part (the tone is C4)
const rehearsal = { ...hub('songs', 'partrehearsal'), lead: `document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]').click();` };
// a finished challenge: which notes were held, the score, whether it passed, where a boss that won early stopped
// (a string: it runs in the page, where a closure's variables don't exist)
const chRun = kind => `(() => { const r = challenge.lastRun['${kind}']; return r && { held: r.results.map(x => x.held ? 1 : 0).join(''), score: r.score, passed: r.passed, stoppedAt: r.stoppedAt }; })()`;

const FEATURES = [
  { key: 'tt', label: 'Entrance & Cutoff Trainer, entrances, Lead (runs to the end of the song)', kind: 'sidecar', ...rehearsal, startBtn: 'ttStartBtn', gauge: 'vlGaugeTt',
    // counts the loudness edges (note starts/stops) the trainer sees after its first tick. Its first tick on the
    // already-sounding tone flips wasVoiced from its reset value, so that change is not counted. (Since 2026-09-28 the
    // trainer doesn't count edges at all until it has heard 50 ms of silence, which a steady tone never gives it; see
    // scripts/tt-verify/firsttick.js.)
    prep: rehearsal.lead + ` document.querySelector('#ttModeRow [data-tt-mode="entrance"]').click();
      if (!window.__ttTick) window.__ttTick = timingTrainerTick;
      window.__ttEdges = { ticks: 0, later: 0 };
      timingTrainerTick = function () {
        const was = timingTrainer.wasVoiced, first = timingTrainer.active && window.__ttEdges.ticks++ === 0;
        window.__ttTick.apply(this, arguments);
        if (!first && was !== timingTrainer.wasVoiced) window.__ttEdges.later++;
      };`,
    active: 'timingTrainer.active',
    // a steady tone makes no note starts or stops: zero edges after the first tick in both runs shows the shared stream
    // had no dropout when the register input opened (a gap would read as a stop and a start)
    result: () => ({ ticks: window.__ttEdges.ticks > 100, laterEdges: window.__ttEdges.later, claimed: timingTrainer.results.map(r => r.claimed ? 1 : 0).join('') }),
    same: (a, b) => a.ticks && b.ticks && a.laterEdges === 0 && b.laterEdges === 0 && a.claimed === b.claimed },
  { key: 'cb', label: 'Choir Bosses, the first boss, Lead (runs to the end or the boss wins)', kind: 'sidecar', ...rehearsal, startBtn: 'cbStartBtn', gauge: 'vlGaugeCb',
    prep: rehearsal.lead + ' chSel.boss = 0; renderChoirBosses();', // a win moves the selection on to the next boss
    active: 'challenge.active', result: chRun('boss') },
  { key: 'cx', label: 'Chaos Mode, Lead (seeded plan, runs to the end)', kind: 'sidecar', ...rehearsal, startBtn: 'cxStartBtn', gauge: 'vlGaugeCx',
    prep: rehearsal.lead + ' __seed(7);', active: 'challenge.active', result: chRun('chaos') },
  { key: 'tk', label: 'Tempo/Key Ladder, rung 1 up, Lead (runs to the end)', kind: 'sidecar', ...rehearsal, startBtn: 'tkStartBtn', gauge: 'vlGaugeTk',
    prep: rehearsal.lead + " chSel.rung = 0; chSel.dir = 'up'; renderLadder();", // a pass moves the selection up a rung
    active: 'challenge.active', result: chRun('ladder') },
  { key: 'rift', label: 'The Vocal Rift (seeded rounds, runs the full 60 s)', kind: 'sidecar', ...arcade('rift'), startBtn: 'riftStartBtn', gauge: 'vlGaugeRift',
    prep: '__seed(7)', active: 'riftActive',
    result: () => riftRounds.map(r => ({ type: r.type, target: r.targetMidi, acc: r.heard ? r.accuracy : null })),
    // the rounds that fit in 60 s can differ by one (where the last one starts); the ones both runs have are compared
    same: (a, b) => Math.abs(a.length - b.length) <= 1 && a.slice(0, Math.min(a.length, b.length)).every((r, i) => r.type === b[i].type && r.target === b[i].target
      && (r.acc === null ? b[i].acc === null : Math.abs(r.acc - b[i].acc) <= 2)) },
  { key: 'bosstrain', label: "Pitch Dragon weakest-note training: Listen & score (C4, 1.6 s)", kind: 'sidecar', ...arcade('boss'), startBtn: 'bossTrainListenBtn', gauge: 'vlGaugeBossTrain',
    // the section appears after a battle, with that battle's weakest note: shown directly, with C4 as the note
    show: "document.getElementById('bossTrainingSection').style.display = 'block'; window._bossTrainTargetMidi = 60; document.getElementById('bossTrainNoteDisplay').textContent = 'C4'",
    active: disabled('bossTrainListenBtn'), mid: 900, shortCapture: true,
    result: () => ({ acc: document.getElementById('bossTrainAccVal').textContent }), same: near(2, ['acc']) },
  { key: 'eve', label: 'Ear → Voice → Ear (seeded notes, runs to the end)', kind: 'sidecar', ...hub('train', 'earvoiceear'), startBtn: 'eveStartBtn', gauge: 'vlGaugeEve',
    prep: range(60, 60) + " __seed(7); document.getElementById('eveResultCard').style.display='none'; document.getElementById('evePreCard').style.display='block';",
    active: 'eveActive',
    result: () => ({ first: document.getElementById('eveResultFirst').textContent, second: document.getElementById('eveResultSecond').textContent, note: document.getElementById('eveResultNote').textContent.replace(/\d+%/g, 'N%') }),
    same: near(2, ['first', 'second']), safari: true },
  { key: 'five', label: 'Sing It 5 Ways (runs to the end)', kind: 'sidecar', ...hub('train', 'fiveways'), startBtn: 'fiveStartBtn', gauge: 'vlGaugeFive',
    prep: range(56, 66) + " document.getElementById('fiveResultCard').style.display='none'; document.getElementById('fivePreCard').style.display='block';",
    active: 'fiveActive',
    result: () => fiveResults.map(r => ({ midi: r.midi, heard: r.heard, acc: r.accuracy })),
    same: (a, b) => a.length === b.length && a.every((r, i) => r.midi === b[i].midi && r.heard === b[i].heard && Math.abs(r.acc - b[i].acc) <= 2) },
  { key: 'onetake', label: "One Take (today's take cleared before each run)", kind: 'sidecar', ...hub('train', 'onetake'), startBtn: 'oneTakeStartBtn', gauge: 'vlGaugeOneTake',
    prep: range(56, 65) + ' progress.oneTakeLastDate = null; progress.oneTakeHistory = {}; renderOneTakeGate()', // one take a day
    active: 'oneTakeActive',
    result: () => progress.oneTakeHistory[todayStr()], same: near(2, ['pitch', 'stability', 'timing']) },
  { key: 'hm', label: 'Can You Hear Your Mistake: the right pick, then the sing-back (1.6 s)', kind: 'sidecar', ...hub('train', 'hearmistake'), startBtn: 'hmStartBtn', gauge: 'vlGaugeHm',
    prep: "__seed(7); document.getElementById('hmResultCard').style.display='none'; document.getElementById('hmPreCard').style.display='block';",
    start: async p => { await p.locator('#hmStartBtn').click(); await sleep(2000); await p.evaluate(() => { hmTargetMidi = 60; document.querySelector(`[data-hm-guess="${hmCorrectLabel}"]`).click(); }); }, // sung back against C4, the tone
    active: 'hmSinging', mid: 900, shortCapture: true,
    result: () => ({ acc: document.getElementById('hmSingAccuracy').textContent, title: document.getElementById('hmResultTitle').textContent }), same: near(2, ['acc']) },
  { key: 'emo', label: 'Emotion Mode: Tender, then a seeded second intention (runs to the end)', kind: 'sidecar', ...hub('train', 'emotionmode'), startBtn: 'emoStartBtn', gauge: 'vlGaugeEmo',
    prep: range(56, 65) + " __seed(7); document.querySelector('#emoIntentRow [data-emo=\"tender\"]').click(); document.getElementById('emoResultCard').style.display='none'; document.getElementById('emoPreCard').style.display='block';",
    active: 'emoActive',
    result: () => emoResults.map(r => ({ intent: r.intent, heard: r.heard, stability: Math.round(r.stability) })),
    same: (a, b) => a.length === b.length && a.every((r, i) => r.intent === b[i].intent && r.heard === b[i].heard && Math.abs(r.stability - b[i].stability) <= 2) },
  { key: 'pd', label: 'Performance Director (runs to the end of the song)', kind: 'sidecar', ...hub('songs', 'performancedirector'), startBtn: 'pdStartBtn', gauge: 'vlGaugePd',
    prep: "document.getElementById('pdResultCard').style.display='none'; document.getElementById('pdBriefingCard').style.display='block';",
    active: 'pdActive',
    result: () => ({ notes: pdResults.map(r => r && r.heard ? r.pitchAcc + '/' + r.timingScore : '-').join(' ') }),
    same: (a, b) => { const x = a.notes.split(' '), y = b.notes.split(' ');
      return x.length === y.length && x.every((n, i) => { const [p, t] = n.split('/'), [q, u] = y[i].split('/'); return n === '-' ? y[i] === '-' : t === u && Math.abs(p - q) <= 2; }); } },
];

run(FEATURES).catch(e => { console.error(e); process.exitCode = 1; });
