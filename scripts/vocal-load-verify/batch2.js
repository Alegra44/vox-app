// Vocal Load phase 3b, batch 2: the Train hub's solo features (and Emotional Singing), through harness.js.
// Shared mic (vlSidecar): Tuner, Interval Match, Scale Run, Breath Control, Custom Exercise, Rhythm Trainer, Mirror Mode,
// Emotional Singing, Range Finder. Register input (vlFeed on its own frames): Real-Time Feedback.
// Usage: node scripts/vocal-load-verify/batch2.js [url]
const { run, sleep } = require('./harness');

const train = p => `#panel-train-hub [data-enter-panel="${p}"]`;
// Numbers compared with a tolerance: results that count animation frames or wall-clock time move by a frame or two.
const near = (tol, keys) => (a, b) => keys.every(k => {
  const x = parseFloat(a[k]), y = parseFloat(b[k]);
  return Number.isNaN(x) || Number.isNaN(y) ? a[k] === b[k] : Math.abs(x - y) <= tol;
}) && Object.keys(a).filter(k => !keys.includes(k)).every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));

const FEATURES = [
  { key: 'tuner', label: 'Tuner (listens until stopped: 7 s)', kind: 'sidecar', shell: 'train', enter: train('tuner'), startBtn: 'micBtn', gauge: 'vlGaugeTuner', safari: true,
    active: "mode==='tuner'", stopAfter: 7000, stop: p => p.locator('#micBtn').click(),
    snap: () => ({ pitch: document.getElementById('pitchStat').textContent, freq: parseFloat(document.getElementById('freqStat').textContent),
      stability: Math.round(sessionStabilityReadings.reduce((a, b) => a + b, 0) / Math.max(1, sessionStabilityReadings.length)) }),
    // the saved score (the session's stability average) exactly; the Pitch readout is one frame's 100 − |cents| × 2, and
    // a steady tone's detected pitch wobbles by a cent between frames, so ±2 points; the frequency readout ±2 Hz
    same: (a, b) => a.stability === b.stability && Math.abs(parseFloat(a.pitch) - parseFloat(b.pitch)) <= 2 && Math.abs(a.freq - b.freq) <= 2 },
  { key: 'interval', label: 'Interval Match: target C4, a pass', kind: 'sidecar', shell: 'train', enter: train('exercises'), startBtn: 'intervalListenBtn', gauge: 'vlGaugeInterval', tab: '[data-extype="interval"]',
    prep: 'intervalTargetMidi = 60',
    active: '!!document.getElementById("intervalListenBtn").disabled', mid: 900, shortCapture: true,
    result: () => ({ acc: document.getElementById('intervalAccuracyVal').textContent, fb: document.getElementById('intervalFeedback').textContent }) },
  { key: 'scale', label: 'Scale Run from C4 (every note captured, runs to the end)', kind: 'sidecar', shell: 'train', enter: train('exercises'), startBtn: 'scaleStartBtn', gauge: 'vlGaugeScale', tab: '[data-extype="scale"]',
    prep: 'scaleRootMidi = 60',
    start: async p => { await p.locator('#scaleStartBtn').click(); },
    active: '!!document.getElementById("scaleStartBtn").disabled',
    result: () => ({ avg: document.getElementById('scaleAccuracyVal').textContent, dots: [...document.querySelectorAll('#scaleDots .scale-dot')].map(d => d.className).join(',') }),
    same: near(2, ['avg']) },
  { key: 'breath', label: 'Breath Control (a held tone, stopped at 8 s)', kind: 'sidecar', shell: 'train', enter: train('breath'), startBtn: 'breathStartBtn', gauge: 'vlGaugeBreath',
    active: 'breathActive', stopAfter: 8000, stop: p => p.locator('#breathStartBtn').click(),
    result: () => ({ acc: document.getElementById('breathAccuracyVal').textContent, samples: breathRmsSamples.length }),
    same: (a, b) => Math.abs(parseFloat(a.acc) - parseFloat(b.acc)) <= 3 },
  { key: 'custom', label: 'Custom Exercise: 6 notes (seeded), runs to the end', kind: 'sidecar', shell: 'train', enter: train('custom'), startBtn: 'customGenerateBtn', gauge: 'vlGaugeCustom',
    prep: "document.getElementById('customResultCard').style.display='none'; document.getElementById('customBuilderCard').style.display='block'; __seed(7);",
    start: async p => { await p.locator('#customGenerateBtn').click(); await sleep(300); await p.locator('#customStartBtn').click(); },
    active: "document.getElementById('customRunnerCard').style.display==='block'",
    result: () => ({ avg: document.getElementById('customResultAvg').textContent, rows: document.getElementById('customResultRows').textContent }) },
  { key: 'rhythm', label: 'Rhythm Trainer (runs to the end)', kind: 'sidecar', shell: 'train', enter: train('rhythm'), startBtn: 'rhythmStartBtn', gauge: 'vlGaugeRhythm',
    active: 'rhythmActive',
    result: () => ({ claimed: rhythmResults.map(r => r.claimed ? 1 : 0).join(''), card: document.getElementById('rhythmResultCard').style.display }) },
  { key: 'mirror', label: 'Mirror Mode (seeded phrase, the echo runs to the end)', kind: 'sidecar', shell: 'train', enter: train('mirror'), startBtn: 'mirrorPlayBtn', gauge: 'vlGaugeMirror',
    prep: '__seed(7)', active: 'mirrorActive', mid: 1500,
    result: () => ({ acc: document.getElementById('mirrorResultAcc').textContent }), same: near(2, ['acc']) },
  { key: 'livefb', label: 'Real-Time Feedback (register input; stopped at 7 s)', kind: 'register', shell: 'train', enter: train('livefeedback'), startBtn: 'liveFeedbackStartBtn', gauge: 'vlGaugeLiveFb',
    active: 'lfActive', stopAfter: 7000, stop: p => p.locator('#liveFeedbackStartBtn').click(),
    snap: () => Object.fromEntries(['Pitch', 'Stability', 'Breath', 'Register'].map(r => [r, document.getElementById(`lf${r}Icon`).className.replace(' state-pulse', '') + ' ' + document.getElementById(`lf${r}Text`).textContent])) },
  { key: 'emotion', label: 'Emotional Singing (song, runs to the end)', kind: 'sidecar', shell: 'songs', enter: '#panel-songs-hub [data-enter-panel="emotion"]', startBtn: 'emotionStartBtn', gauge: 'vlGaugeEmotion',
    active: 'emotionActive',
    result: () => ({ pitch: document.getElementById('emotionPitchVal').textContent, all: document.getElementById('emotionResult').innerText.replace(/\s+/g, ' ') }),
    same: (a, b) => Math.abs(parseFloat(a.pitch) - parseFloat(b.pitch)) <= 2 },
  // last: it saves the found range (C4–C4 here: under 12 st, so the engine keeps A2–C5 and the rate above holds)
  { key: 'range', label: 'Range Finder (low captured at 3.5 s, high at 6 s)', kind: 'sidecar', shell: 'train', enter: train('range'), startBtn: 'rangeStartBtn', gauge: 'vlGaugeRange',
    prep: "showStep('rangeIntro')", active: "mode==='rangeLow' || mode==='rangeHigh'", stopAfter: 3500,
    stop: async p => { await p.locator('#captureLowBtn').click(); await sleep(2500); await p.locator('#captureHighBtn').click(); },
    result: () => ({ type: document.getElementById('voiceTypeOut').textContent, span: document.getElementById('rangeSpanOut').textContent }) },
];

run(FEATURES).catch(e => { console.error(e); process.exitCode = 1; });
