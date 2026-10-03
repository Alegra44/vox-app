// Voice Quality phase 1 checks. Every test signal is a WAV of known properties (gen.py) fed to Chromium as the
// microphone (--use-file-for-fake-audio-capture), so it goes through the real getUserMedia → AnalyserNode path.
// The panel's own capture and analysis run on it (vqCapture + vqSummarize), and the injected values are printed
// next to the measured ones. No server needed: deploy/index.html is served on localhost by request interception.
// Usage: node scripts/vq-verify/vq.js [vibrato|hnr|centroid|ui|vibui|all] [captures per signal, default 2]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '../..');
const which = process.argv[2] || 'all', RUNS = +(process.argv[3] || 2);
const TMP = path.join(os.tmpdir(), 'vq-verify'); require('fs').mkdirSync(TMP, { recursive: true });
const SR = 48000, HNR_MAX = 5000, CENTROID_MAX = 6000;

function gen(name, spec) {
  const file = path.join(TMP, name + '.wav');
  const truth = JSON.parse(execFileSync('python', [path.join(__dirname, 'gen.py'), file, JSON.stringify(spec)], { encoding: 'utf8' }));
  return { file, truth };
}
async function withMic(file, fn) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.join(ROOT, 'deploy/index.html'), contentType: 'text/html' }));
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]');
    if (await lang.isVisible()) await lang.click();
    const out = await fn(page);
    if (errors.length) console.log('  page errors:', errors);
    return out;
  } finally { await browser.close(); }
}
// The panel's measurement, exactly as the button runs it (minus the sign-in gate).
const measure = page => page.evaluate(async () => {
  vqActive = true; const frames = await vqCapture(); vqActive = false;
  const r = vqSummarize(frames);
  return { frames: frames.length, ok: r.ok, f0: r.f0, vib: r.vib && { ok: r.vib.ok, rate: r.vib.rate, depth: r.vib.depth, straight: !!r.vib.straight }, hnr: r.hnr, centroid: r.centroid };
});
const f = (v, d = 1) => v === null || v === undefined ? '—' : (+v).toFixed(d);

async function vibrato() {
  console.log('\n==== VIBRATO (voice-like tone: harmonics 1, ½, ⅓, ¼)');
  const H = [1, 0.5, 0.33, 0.25];
  const cases = [
    ['6 Hz ±50 ct @330 Hz', { f0: 330, vibRate: 6, vibCents: 50 }],
    ['4.5 Hz ±30 ct @330 Hz', { f0: 330, vibRate: 4.5, vibCents: 30 }],
    ['7 Hz ±100 ct @330 Hz', { f0: 330, vibRate: 7, vibCents: 100 }],
    ['5.5 Hz ±40 ct @220 Hz', { f0: 220, vibRate: 5.5, vibCents: 40 }],
    ['6 Hz ±20 ct @440 Hz', { f0: 440, vibRate: 6, vibCents: 20 }],
    ['6 Hz ±50 ct + 15 ct/s drift', { f0: 330, vibRate: 6, vibCents: 50, driftCentsPerSec: 15 }],
    ['6 Hz ±50 ct + white noise', { f0: 330, vibRate: 6, vibCents: 50, noiseRms: 0.029 }],
    ['straight tone @330 Hz', { f0: 330 }],
  ];
  for (const [label, spec] of cases) {
    const { file } = gen('vib', { ...spec, harmonics: H });
    const rows = await withMic(file, async page => { const r = []; for (let i = 0; i < RUNS; i++) r.push(await measure(page)); return r; });
    const inj = spec.vibRate ? `${spec.vibRate} Hz ±${spec.vibCents} ct` : 'none';
    console.log(`${label.padEnd(30)} injected ${inj.padEnd(16)} measured ${rows.map(r => r.vib.ok ? `${r.vib.rate} Hz ±${r.vib.depth} ct` : `none${r.vib.straight ? ' (straight)' : ''}`).join(' | ')}  [${rows.map(r => r.frames).join('/')} frames]`);
  }
  // A 600 ms main-thread stall in the middle of the hold (no frames then, so a peak is missed)
  {
    const { file } = gen('vib', { f0: 330, vibRate: 4.5, vibCents: 30, harmonics: H });
    const rows = await withMic(file, async page => { const r = []; for (let i = 0; i < RUNS; i++) r.push(await page.evaluate(async () => {
      setTimeout(() => { const e = performance.now() + 600; while (performance.now() < e); }, 1800);
      vqActive = true; const fr = await vqCapture(); vqActive = false;
      const gap = Math.max(...fr.slice(1).map((f, i) => f.t - fr[i].t)), v = vqSummarize(fr).vib;
      return `${v.ok ? `${v.rate} Hz ±${v.depth} ct` : 'none'} (longest frame gap ${Math.round(gap)} ms)`;
    })); return r; });
    console.log(`${'4.5 Hz ±30 ct + 600 ms stall'.padEnd(30)} injected 4.5 Hz ±30 ct    measured ${rows.join(' | ')}`);
  }
  // The existing Vibrato Analyzer panel's own capture (captureVibratoTrace, shared mic) on the two signals that broke it
  console.log('\n-- Vibrato Analyzer panel (its capture, now the unprocessed low-passed one), the two cases that used to fail');
  for (const [label, spec] of [['4.5 Hz ±30 ct (was ±984)', { f0: 330, vibRate: 4.5, vibCents: 30 }], ['6 Hz ±50 ct + 15 ct/s drift (was 74)', { f0: 330, vibRate: 6, vibCents: 50, driftCentsPerSec: 15 }]]) {
    const { file } = gen('vib', { ...spec, harmonics: H });
    const rows = await withMic(file, async page => { const r = []; for (let i = 0; i < RUNS; i++) r.push(await page.evaluate(async () => { vibratoActive = true; const s = await captureVibratoTrace(4000); vibratoActive = false; const a = analyzeVibrato(s, VQ_PITCH_WIN / audioCtx.sampleRate); return a.ok ? `${a.rate} Hz ±${a.depth} ct` : 'none'; })); return r; });
    console.log(`${label.padEnd(38)} measured ${rows.join(' | ')}`);
  }
}

async function hnr() {
  console.log('\n==== BREATHINESS (HNR), tone at 220 Hz, harmonics 1, ½, ⅓, ¼, ⅕, plus white noise');
  // Injected HNR over the measured band (f0/2 to 5 kHz): harmonic power Σa²/2 against the white noise's share of that band.
  const H = [1, 0.5, 0.33, 0.25, 0.2], f0 = 220;
  const probe = gen('h', { f0, harmonics: H }).truth.harmonicAmps;
  const P = probe.reduce((a, v, k) => a + ((k + 1) * f0 <= HNR_MAX ? v * v / 2 : 0), 0), band = (HNR_MAX - f0 / 2) / (SR / 2);
  const sigmaFor = db => Math.sqrt(P / Math.pow(10, db / 10) / band);
  const cases = [['clean (no noise)', null], ...[35, 25, 20, 15, 12, 8, 4, 0].map(db => [`noise for ${db} dB`, db])];
  const out = [];
  for (const [label, db] of cases) {
    const noiseRms = db === null ? 0 : sigmaFor(db);
    const { file } = gen('h', { f0, harmonics: H, noiseRms, seed: 7 });
    const rows = await withMic(file, async page => { const r = []; for (let i = 0; i < RUNS; i++) r.push(await measure(page)); return r; });
    out.push({ db, m: rows.map(r => r.hnr) });
    console.log(`${label.padEnd(18)} noise RMS ${noiseRms.toFixed(4)}  injected HNR ${db === null ? '∞ (16-bit floor)' : db + ' dB'}`.padEnd(64) + `measured ${rows.map(r => f(r.hnr) + ' dB').join(' | ')}`);
  }
  const mono = out.slice(1).every((x, i, a) => i === 0 || Math.max(...x.m) < Math.min(...a[i - 1].m));
  console.log('measured HNR falls strictly as noise rises:', mono);
  console.log('\n-- the same, with 6 Hz ±50 ct vibrato (harmonics smear across bins within one 170 ms frame)');
  for (const db of [25, 12]) {
    const { file } = gen('h', { f0, harmonics: H, noiseRms: sigmaFor(db), vibRate: 6, vibCents: 50, seed: 7 });
    const rows = await withMic(file, async page => { const r = []; for (let i = 0; i < RUNS; i++) r.push(await measure(page)); return r; });
    console.log(`injected ${db} dB + vibrato`.padEnd(30) + `measured ${rows.map(r => f(r.hnr) + ' dB').join(' | ')}`);
  }
}

async function centroid() {
  console.log('\n==== BRIGHTNESS (spectral centroid, power-weighted, 50 Hz–6 kHz), straight and with 6 Hz vibrato');
  const k10 = [...Array(10).keys()].map(k => k + 1);
  const cases = [
    ['pure sine 440 Hz', 440, [1]],
    ['220 Hz, 10 harmonics, 1/k²', 220, k10.map(k => 1 / (k * k))],
    ['220 Hz, 10 harmonics, 1/k', 220, k10.map(k => 1 / k)],
    ['220 Hz, 10 harmonics, flat', 220, k10.map(() => 1)],
    ['330 Hz, harmonics 1, ½, ⅓, ¼', 330, [1, 0.5, 0.33, 0.25]],
    ['165 Hz, 1/k (to 6 kHz: 36 harmonics)', 165, [...Array(36).keys()].map(k => 1 / (k + 1))],
  ];
  const depths = [0, 25, 50, 100];
  for (const [label, f0, H] of cases) {
    const inj = H.reduce((a, v, k) => a + ((k + 1) * f0 <= CENTROID_MAX ? (k + 1) * f0 * v * v : 0), 0) / H.reduce((a, v, k) => a + ((k + 1) * f0 <= CENTROID_MAX ? v * v : 0), 0);
    const cells = [];
    for (const d of depths) {
      const { file } = gen('c', { f0, harmonics: H, ...(d ? { vibRate: 6, vibCents: d } : {}) });
      const rows = await withMic(file, async page => { const r = []; for (let i = 0; i < RUNS; i++) r.push(await measure(page)); return r; });
      cells.push(`${d ? '±' + d : 'straight'} ${rows.map(r => f(r.centroid, 0)).join('/')} (${rows.map(r => (r.centroid / inj - 1) * 100).map(e => (e >= 0 ? '+' : '') + e.toFixed(1)).join('/')}%)`);
    }
    console.log(`${label.padEnd(38)} injected ${f(inj, 0).padStart(4)} Hz | ${cells.join(' | ')}`);
  }
  const { file } = gen('c', { f0: 220, harmonics: k10.map(k => 1 / k), noiseRms: 0.05, seed: 3 });
  const r = await withMic(file, measure);
  const clean = k10.reduce((a, k) => a + 220 * k / (k * k), 0) / k10.reduce((a, k) => a + 1 / (k * k), 0);
  console.log(`${'220 Hz 1/k + white noise (rms 0.05)'.padEnd(38)} clean value ${f(clean, 0)} Hz → measured ${f(r.centroid, 0)} Hz (noise adds high-frequency energy, so it rises)`);

  console.log('\n-- reading bands: harmonic tones rolling off at a known slope, straight and ±50 ct vibrato (dark < 13 dB/oct steepness, bright > 9)');
  for (const f0 of [110, 220, 440]) {
    const K = Math.floor(CENTROID_MAX / f0), out = [];
    for (const [dbo, want] of [[16, 'dark'], [11, 'balanced'], [6, 'bright']]) {
      const H = [...Array(K).keys()].map(k => Math.pow(k + 1, -dbo / 6.0206));
      for (const d of [0, 50]) {
        const { file } = gen('band', { f0, harmonics: H, ...(d ? { vibRate: 6, vibCents: d } : {}) });
        const got = await withMic(file, page => page.evaluate(async () => {
          vqActive = true; const fr = await vqCapture(); vqActive = false; const r = vqSummarize(fr);
          const [dk, br] = vqBrightBounds(r.f0), ratio = r.centroid / r.f0;
          return { ratio, dk, br, band: ratio < dk ? 'dark' : ratio > br ? 'bright' : 'balanced' };
        }));
        out.push(`${dbo} dB/oct${d ? ' ±50' : ''}: ${got.ratio.toFixed(2)}× (bounds ${got.dk.toFixed(2)}–${got.br.toFixed(2)}) → ${got.band}${got.band === want ? ' ✓' : ' ✗ want ' + want}`);
      }
    }
    console.log(`${f0} Hz  ${out.join(' | ')}`);
  }
}

async function ui() {
  console.log('\n==== PANEL (real button click; sign-in gate stubbed, since the test has no account)');
  const { file } = gen('ui', { f0: 262, harmonics: [1, 0.5, 0.33, 0.25], vibRate: 5.8, vibCents: 45, noiseRms: 0.012, seed: 5 });
  await withMic(file, async page => {
    await page.evaluate(() => { blockExercise = () => false; enterPanel('voicequality'); });
    console.log('panel active:', await page.evaluate(() => document.querySelector('.panel.active').id), '| result hidden before a run:', await page.evaluate(() => document.getElementById('vqResult').style.display === 'none'));
    await page.locator('#vqStartBtn').click();
    await page.waitForTimeout(500);
    console.log('during: label', JSON.stringify(await page.locator('#vqStartLabel').innerText()), '| listening class', await page.evaluate(() => document.getElementById('vqStartBtn').classList.contains('listening')));
    await page.waitForFunction(() => !vqActive && vqLast, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.locator('#vqResult').screenshot({ path: path.join(TMP, 'vq-result-1280.png') });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
    await page.locator('#vqResult').screenshot({ path: path.join(TMP, 'vq-result-390.png') });
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const lg of ['en', 'fr', 'es', 'tr']) {
      await page.evaluate(l => setLanguage(l), lg); await page.waitForTimeout(200);
      console.log(`\n[${lg}] ${await page.evaluate(() => [...document.querySelectorAll('#panel-voicequality .j-title, #panel-voicequality .j-sub, #vqStartLabel, #vqNote, .vq-row, #panel-voicequality .fine-print[data-i18n]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).join('\n     '))}`);
    }
    await page.evaluate(() => setLanguage('en'));
    // Navigating away mid-hold stops the capture and releases the mic
    await page.evaluate(() => { const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); window.__streams = []; navigator.mediaDevices.getUserMedia = async c => { const st = await g(c); __streams.push({ c, st }); return st; }; });
    await page.locator('#vqStartBtn').click(); await page.waitForTimeout(800);
    const before = await page.evaluate(() => __streams.map(x => ({ constraints: x.c.audio, tracks: x.st.getTracks().map(t => t.readyState) })));
    await page.evaluate(() => enterPanel('tuner')); await page.waitForTimeout(600);
    console.log('\nmic stream opened with', JSON.stringify(before));
    console.log('navigated away mid-hold: vqActive', await page.evaluate(() => vqActive), '| listening class removed', await page.evaluate(() => !document.getElementById('vqStartBtn').classList.contains('listening')), '| nothing shown for the cut-short hold', await page.evaluate(() => vqLast === null), '| mic tracks now', JSON.stringify(await page.evaluate(() => __streams.map(x => x.st.getTracks().map(t => t.readyState)))));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => enterPanel('voicequality'));
    console.log('390 px: page scrolls sideways:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), `(scrollWidth ${await page.evaluate(() => document.documentElement.scrollWidth)})`);
    await page.screenshot({ path: path.join(TMP, 'vq-390.png'), fullPage: false });
    await page.setViewportSize({ width: 1280, height: 900 }); await page.screenshot({ path: path.join(TMP, 'vq-1280.png') });
    console.log('screenshots:', TMP);
  });
}

async function vibui() {
  console.log('\n==== VIBRATO ANALYZER PANEL (real button click; sign-in gate stubbed)');
  for (const [label, spec] of [['6 Hz ±50 ct', { f0: 330, vibRate: 6, vibCents: 50 }], ['straight tone', { f0: 330 }]]) {
    const { file } = gen('vui', { ...spec, harmonics: [1, 0.5, 0.33, 0.25] });
    await withMic(file, async page => {
      await page.evaluate(() => { blockExercise = () => false; enterPanel('vibrato'); const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); window.__streams = []; navigator.mediaDevices.getUserMedia = async c => { const st = await g(c); __streams.push({ c, st }); return st; }; });
      await page.locator('#vibratoStartBtn').click(); await page.waitForTimeout(300);
      const during = await page.locator('#vibratoStartLabel').innerText();
      await page.waitForFunction(() => !vibratoActive, null, { timeout: 15000 });
      const r = await page.evaluate(() => ({ rate: vibratoRateStat.textContent, depth: vibratoDepthStat.textContent, consistency: vibratoConsistencyStat.textContent, feedback: vibratoFeedback.textContent, wavePoints: vibratoPolyline.getAttribute('points').split(' ').filter(Boolean).length, mic: __streams.map(x => ({ audio: x.c.audio, tracks: x.st.getTracks().map(t => t.readyState) })) }));
      console.log(`${label.padEnd(14)} injected ${spec.vibRate ? `${spec.vibRate} Hz ±${spec.vibCents} ct` : 'none'} | during "${during}" | shown: rate ${r.rate}, depth ${r.depth}, consistency ${r.consistency}, ${r.wavePoints} wave points\n  feedback: ${r.feedback}\n  mic: ${JSON.stringify(r.mic)}`);
    });
  }
}

(async () => {
  if (which === 'vibrato' || which === 'all') await vibrato();
  if (which === 'hnr' || which === 'all') await hnr();
  if (which === 'centroid' || which === 'all') await centroid();
  if (which === 'ui' || which === 'all') await ui();
  if (which === 'vibui' || which === 'all') await vibui();
})().catch(e => { console.error(e); process.exitCode = 1; });
