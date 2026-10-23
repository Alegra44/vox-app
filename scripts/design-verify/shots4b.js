// Phase 4b survey (PHASE4B_SURVEY.md): the 10 tools with their own displays as they are now, before any 4b change.
// Each tool in a fresh page, signed in, the fake mic singing the steady A4 (stage.js): idle, live (mid-take), and its
// result if it has one (the tools that only run live are stopped instead and shown stopped), at 390 Light and Dark and
// 1280 Light. The mic is warmed only for the tools that open it with initAudio themselves: the register-input tools
// (Register Coach, Register Drills, Real-Time Feedback, Resonance) are shown as a fresh page opens them.
// Out: <out>/<width>-<theme>/<tool>-<state>.jpg, <out>/sheets/before.jpg, <out>/states.json (what each tool showed).
// Usage: node scripts/design-verify/shots4b.js [--base <git ref>] [--out <dir>] [--tools onetake,mirror,…]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base'), OUT = arg('--out') || path.join(os.tmpdir(), `voxcoach-shots4b-${BASE || 'branch'}`);
const Q = { type: 'jpeg', quality: 85 };
const COMBOS = [['390', 'light'], ['390', 'dark'], ['1280', 'light']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep;

// panel, start button, whether it opens the mic with initAudio (warm it first), when to take the live shot (ms after
// Start), how it ends: a predicate for "done" (then the result is shown) or 'stop' (click Start again: no result)
const TOOLS = [
  { key: 'onetake', name: 'One Take', panel: 'onetake', btn: '#oneTakeStartBtn', initAudio: true, live: 2600, result: '#oneTakeResultCard',
    prep: () => { progress.oneTakeLastDate = null; progress.oneTakeHistory = {}; renderOneTakeGate(); }, done: () => !oneTakeActive, timeout: 15000 },
  { key: 'mirror', name: 'Mirror', panel: 'mirror', btn: '#mirrorPlayBtn', initAudio: true, live: 4600, result: '#mirrorResultCard',
    done: () => !mirrorActive && document.getElementById('mirrorResultCard').style.display === 'block', timeout: 15000 },
  { key: 'rhythm', name: 'Rhythm', panel: 'rhythm', btn: '#rhythmStartBtn', initAudio: true, live: 3000, result: '#rhythmResultCard',
    done: () => !rhythmActive, timeout: 15000 },
  { key: 'register', name: 'Register Coach', panel: 'register', btn: '#regMicBtn', initAudio: false, live: 3000, end: 'stop' },
  { key: 'registerdrills', name: 'Register Drills', panel: 'registerdrills', btn: '#drillStartBtn', initAudio: false, live: 1600, cue: 400,
    result: '#drillResultCard', done: () => !drillActive, timeout: 25000 },
  { key: 'livefeedback', name: 'Real-Time Feedback', panel: 'livefeedback', btn: '#liveFeedbackStartBtn', initAudio: false, live: 3000, end: 'stop' },
  { key: 'vibrato', name: 'Vibrato', panel: 'vibrato', btn: '#vibratoStartBtn', initAudio: true, live: 2000, result: '#vibratoFeedback',
    done: () => !vibratoActive, timeout: 12000 },
  { key: 'voicequality', name: 'Voice Quality', panel: 'voicequality', btn: '#vqStartBtn', initAudio: true, live: 2000, result: '#vqResult',
    done: () => !vqActive, timeout: 12000 },
  { key: 'resonance', name: 'Resonance', panel: 'resonance', btn: '#resonanceStartBtn', initAudio: false, live: 3000, end: 'stop' },
  { key: 'emotionmode', name: 'Emotion Mode', panel: 'emotionmode', btn: '#emoStartBtn', initAudio: true, live: 2600, result: '#emoResultCard',
    done: () => !emoActive, timeout: 20000 },
];
const ONLY = arg('--tools') ? arg('--tools').split(',') : null;
const center = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, sel);
// what the tool shows: its panel's visible text, trimmed (for the survey)
const panelText = (page, panel) => page.evaluate(p => (document.getElementById('panel-' + p) || {}).innerText || '', panel).then(s => s.replace(/\s+\n/g, '\n').trim().slice(0, 1500));

async function tool(b, dir, state, w, theme, T, states) {
  const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
  const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state });
  const shot = async name => { await sleep(250); await page.screenshot({ path: path.join(d, `${T.key}-${name}.jpg`), ...Q }); };
  const rec = states[`${T.key} ${w} ${theme}`] = {};
  try {
    await C.clearOverlays(page);
    if (T.initAudio) await S.warmMic(page);
    await C.showPanel(page, T.panel); await C.clearOverlays(page);
    if (T.prep) await page.evaluate(T.prep);
    await page.evaluate(() => window.scrollTo(0, 0)); await shot('idle'); rec.idle = await panelText(page, T.panel);
    await center(page, T.btn);
    const t0 = Date.now();
    await page.evaluate(sel => document.querySelector(sel).click(), T.btn);
    if (T.cue) { await sleep(T.cue); await shot('cue'); rec.cue = await panelText(page, T.panel); }
    await sleep(Math.max(0, T.live - (Date.now() - t0)));
    await shot('live'); rec.live = await panelText(page, T.panel);
    if (T.end === 'stop') {
      await page.evaluate(sel => document.querySelector(sel).click(), T.btn); await sleep(600);
      await page.evaluate(() => window.scrollTo(0, 0)); await shot('stopped'); rec.stopped = await panelText(page, T.panel);
    } else {
      rec.done = await page.waitForFunction(T.done, null, { timeout: T.timeout }).then(() => true, () => false);
      await sleep(900); await center(page, T.result); await shot('result'); rec.result = await panelText(page, T.panel);
    }
    rec.house = await page.evaluate(() => document.body.dataset.house || null);
    rec.errors = errors.slice(0, 5);
  } catch (e) { rec.error = String(e).slice(0, 300); }
  finally { await page.evaluate(() => stopAllActiveSessions()).catch(() => {}); await ctx.close(); }
  console.log(`  ${T.key} ${w} ${theme}${rec.error ? ' ERROR ' + rec.error : ''}`);
}

(async () => {
  const dir = C.buildDir(BASE); fs.mkdirSync(OUT, { recursive: true });
  const b0 = await C.chromium.launch();
  const { ctx, page } = await C.openPage(b0, { dir }); await C.signUp(page, 'dv4b', 'Survey Check');
  const state = await ctx.storageState(); await ctx.close(); await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); const states = {};
  const tools = TOOLS.filter(T => !ONLY || ONLY.includes(T.key));
  try {
    console.log(`== shots4b · ${BASE || 'branch (working copy)'} → ${OUT}`);
    for (const T of tools) for (const [w, theme] of COMBOS) await tool(b, dir, state, w, theme, T, states);
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1));
    // the sheet: a row per tool and state, 390 Light | 390 Dark | 1280 Light
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`);
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const rows = tools.flatMap(T => ['idle', ...(T.cue ? ['cue'] : []), 'live', T.end === 'stop' ? 'stopped' : 'result'].map(s => `${T.key}-${s}`));
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{height:420px}img.w1280{height:300px}</style><h1>Phase 4b, before: the 10 tools as they are now</h1>
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, 'before.html'); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(300); await sp.screenshot({ path: path.join(sd, 'before.jpg'), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
