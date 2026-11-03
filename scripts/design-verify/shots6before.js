// Phase 6 survey (PHASE6_SURVEY.md, PHASE5.md ## 5.1 step 4): before-screenshots of the six Songs-tab solo tools and
// Performance Director's Performance Report, as they are on master, at 390 Light, 390 Dark and 1280 Light. Signed in with
// a Choir-plan test account (the tools are Pro), the fake mic singing the steady A4. Each tool is reached through its
// Songs-hub card. States: idle, live (a few seconds in), result (run to the end; AI Duet has no result: "stopped").
// At 1280 Light also the leave probe: start, leave through the bottom nav's Home, and read what is still running.
// Out: <out>/<combo>/<tool>-<state>.jpg, <out>/states.json (data-house per shot, page errors, the leave probe),
// <out>/sheets/before.jpg. Read-only: nothing in the app is changed.
// Usage: node scripts/design-verify/shots6before.js [--out <dir>] [--only studio,pd,…] [--base <git ref>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage');
const { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots6before'), ONLY = arg('--only') ? arg('--only').split(',') : null;
const Q = { type: 'jpeg', quality: 82 };
const COMBOS = [['390', 'light'], ['390', 'dark'], ['1280', 'light']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep, ev = (page, f, a) => page.evaluate(f, a);
const center = (page, sel) => ev(page, sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, sel);
const until = (page, fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 250 }).then(() => true, () => false);

// start: the button; live: what to centre while it runs; busy: true while it runs; result: what to centre after
const TOOLS = [
  { key: 'studio', panel: 'studio', start: '#studioRecordBtn', live: '#studioRecordBtn', busy: () => document.getElementById('studioRecordBtn').disabled, result: '#studioTakesList' },
  { key: 'pd', panel: 'performancedirector', start: '#pdStartBtn', live: '#pdRunnerCard', busy: () => pdActive, result: '#pdResultCard' },
  { key: 'aiduet', panel: 'aiduet', start: '#aiDuetStartBtn', live: '#aiDuetStartBtn', busy: () => aiDuetActive, stopClick: true, result: '#aiDuetStartBtn' },
  { key: 'staykey', panel: 'staykey', start: '#stayKeyStartBtn', live: '#stayKeyRingWrap', busy: () => stayKeyActive, result: '#stayKeyResult' },
  { key: 'karaoke', panel: 'karaoke', start: '#karaokeStartBtn', live: '#karaokeRollSvg', busy: () => karaokeActive, result: '#karaokeResult', extra: '#karaokeMissionCard' },
  { key: 'emotion', panel: 'emotion', start: '#emotionStartBtn', live: '#emotionChordLabel', busy: () => emotionActive, result: '#emotionResult' },
];
const enter = async (page, panel) => {
  await ev(page, () => { stopAllActiveSessions(); showShellSection('songs'); window.scrollTo(0, 0); }); await sleep(600);
  await page.locator(`#panel-songs-hub [data-enter-panel="${panel}"]`).click(); await sleep(900);
  await ev(page, () => window.scrollTo(0, 0));
};
const house = page => ev(page, () => document.body.dataset.house || 'up');
// What still runs after leaving through the nav (stopAllActiveSessions)
const running = page => ev(page, () => ({
  panel: document.querySelector('section.panel.active')?.id, house: document.body.dataset.house || 'up',
  stayKeyActive, emotionActive, karaokeActive, pdActive, aiDuetActive, choirIsPlaying,
  studioRecording: document.getElementById('studioRecordBtn').disabled,
  backingOsc: backingActiveOsc.length, vlRun: !!vlRun, vlSideRaf: !!vlSideRaf,
  labels: { staykey: document.getElementById('stayKeyStartLabel').textContent, karaoke: document.getElementById('karaokeStartLabel').textContent,
    emotion: document.getElementById('emotionStartLabel').textContent, aiduet: document.getElementById('aiDuetStartBtn').textContent.trim() },
  results: { staykey: document.getElementById('stayKeyResult').style.display, emotion: document.getElementById('emotionResult').style.display,
    karaoke: document.getElementById('karaokeResult').style.display, pd: document.getElementById('pdResultCard').style.display },
}));

async function account(b, dir) {
  const { ctx, page } = await C.openPage(b, { dir }); await C.signUp(page, 'dv6b', 'Survey Six');
  const uid = await page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
  db(`update public.users set subscription_plan = 'choir', trial_start_date = current_date - 30 where id = '${uid}'`);
  const state = await ctx.storageState(); await ctx.close(); return state;
}

(async () => {
  const dir = C.buildDir(arg('--base')); fs.mkdirSync(OUT, { recursive: true });
  const b0 = await C.chromium.launch(); const state = await account(b0, dir); await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); const states = {};
  try {
    console.log(`== shots6before · ${C.REMOTE || arg('--base') || 'working copy'} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state });
      try {
        await C.clearOverlays(page); await S.warmMic(page);
        for (const tl of TOOLS.filter(x => !ONLY || ONLY.includes(x.key))) {
          const m = states[`${tl.key} ${w} ${theme}`] = {};
          const shot = async (name, sel) => { if (sel) await center(page, sel); await sleep(300); m[name] = await house(page); await page.screenshot({ path: path.join(d, `${tl.key}-${name}.jpg`), ...Q }); };
          try {
            await enter(page, tl.panel); await C.clearOverlays(page); await shot('idle');
            await page.locator(tl.start).click(); await sleep(4000); await shot('live', tl.live);
            if (tl.stopClick) { await page.locator(tl.start).click(); await sleep(1500); await shot('stopped', tl.result); }
            else { m.ended = await until(page, `!(${tl.busy})()`, 70000); await sleep(1500); await C.clearOverlays(page); await shot('result', tl.result); if (tl.extra) await shot('result-mission', tl.extra); }
            if (w === '1280' && theme === 'light') { // the leave probe
              await enter(page, tl.panel); await page.locator(tl.start).click(); await sleep(3000);
              await page.locator('.snb-item[data-shell="home"]').click(); await sleep(2000);
              m.leave_2s = await running(page); await sleep(30000); m.leave_32s = await running(page);
              await ev(page, () => { stopAllActiveSessions(); stayKeyActive = emotionActive = pdActive = false; if (typeof stopBackingPad === 'function') stopBackingPad(); });
              await until(page, () => !document.getElementById('studioRecordBtn').disabled, 20000);
            }
          } catch (e) { m.error = String(e).slice(0, 300); }
          await page.evaluate(() => stopAllActiveSessions()).catch(() => {}); await sleep(500);
          console.log(`  ${tl.key} ${w} ${theme} ${JSON.stringify(m).slice(0, 600)}`);
        }
        states[`errors ${w} ${theme}`] = errors.slice(0, 10);
      } finally { await ctx.close(); }
    }
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1));
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`), order = TOOLS.map(x => x.key);
    const names = [...new Set(cols.flatMap(c => fs.existsSync(path.join(OUT, c)) ? fs.readdirSync(path.join(OUT, c)) : []).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4)))];
    const st = n => ['idle', 'live', 'stopped', 'result', 'result-mission'].indexOf(n.slice(n.indexOf('-') + 1));
    names.sort((a, c) => order.indexOf(a.split('-')[0]) - order.indexOf(c.split('-')[0]) || st(a) - st(c));
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{width:200px}img.w1280{width:400px}</style>
      <h1>Phase 6 before: the Songs-tab solo tools (master, Choir plan)</h1>
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${names.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, 'before.html'); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(500); await sp.screenshot({ path: path.join(sd, 'before.jpg'), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
