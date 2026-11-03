// Phase 5.1 fixshots (PHASE5.md 5.1): each fix at 390 and 1280, Light and Dark, signed in with a Choir-plan test account,
// the fake mic singing the steady A4. One state per fix:
//   1-coach      Harmony Memory's result: the coach lines ("Not passed yet…", "Work on pitch next…") at the One Take size
//   1-boss       a Choir Boss result: its coach line
//   2-why        the result rows with "Why?" (ink, underlined) and one opened
//   3-timing     Entrance & Cutoff after a run; 3-timing-none: the same renderer with nothing caught (no big number)
//   4-yourchoir  a recorded take's row (Intl date, rounded seconds) and its peak in "How this is measured", opened
//   5-hm-idle    Harmony Memory idle: the guide-volume line, the gain in "How this is measured", opened
//   6-parts      the part chooser (Rehearse tab, top); at 390 also in fr, es and tr (6-parts-<lang>)
// Each shot's coach-line font sizes, and at 6 each part segment's width and the text's margin to its edges, go to
// <out>/measures.json. Out: <out>/<width>-<theme>/<name>.jpg, <out>/sheets/fix.jpg.
// Usage: node scripts/design-verify/shots51.js [--out <dir>] [--only 1-coach,…]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage');
const { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots51'), ONLY = arg('--only') ? arg('--only').split(',') : null;
const Q = { type: 'jpeg', quality: 82 };
const COMBOS = [['390', 'light'], ['390', 'dark'], ['1280', 'light'], ['1280', 'dark']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep, ev = (page, f, a) => page.evaluate(f, a);
const center = (page, sel) => ev(page, sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, sel);
const tab = (page, k, tr) => ev(page, ({ k, tr }) => { selectSong('hymn'); setRehearsalPart('Alto'); cwShowTab(k, tr || null); window.scrollTo(0, 0); }, { k, tr }).then(() => sleep(700));
const until = (page, fn, ms) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
const openMeasure = (page, sel) => ev(page, sel => { const d = document.querySelector(sel + ' details.hl-measure'); if (d) d.open = true; }, sel);
const coachSizes = (page, sel) => ev(page, sel => [...document.querySelectorAll(sel + ' .hl-coach')].map(e => `${getComputedStyle(e).fontSize} "${e.textContent.trim().slice(0, 40)}"`), sel);
const runTrainer = async (page, key, btn, busy) => { await tab(page, 'trainers', key); await ev(page, s => document.querySelector(s).click(), btn); await sleep(1500); await until(page, `!(${busy})()`, 60000); await sleep(1500); };
const partsMeasure = page => ev(page, () => {
  const bs = [...document.querySelectorAll('#rehearsalPartRow button')], rs = bs.map(x => x.getBoundingClientRect());
  return bs.map((x, i) => { const rg = document.createRange(); rg.selectNodeContents(x); const tr = rg.getBoundingClientRect();
    return `${x.textContent} ${Math.round(rs[i].width)}×${Math.round(rs[i].height)} margin ${Math.round(Math.min(tr.left - rs[i].left, rs[i].right - tr.right))}`; });
});

const STATES = [
  { key: '1-coach', steps: async (page, shot, m) => {
    await runTrainer(page, 'hm', '#hmemStartBtn', () => harmonyMemory.active);
    await center(page, '#hmemResults .hl-coach'); m.coach = await coachSizes(page, '#hmemResults'); await shot('result');
  } },
  { key: '1-boss', steps: async (page, shot, m) => {
    await runTrainer(page, 'boss', '#cbStartBtn', () => challenge.active);
    await center(page, '#cbResults .hl-coach'); m.coach = await coachSizes(page, '#cbResults'); await shot('result');
  } },
  { key: '2-why', steps: async (page, shot, m) => {
    await tab(page, 'trainers', 'hm'); await center(page, '#hmemResults .why-btn'); await shot('rows');
    m.why = await ev(page, () => { const b = document.querySelector('#hmemResults .why-btn'); return b && `${getComputedStyle(b).color} ${getComputedStyle(b).textDecorationLine}`; });
    await ev(page, () => document.querySelector('#hmemResults .why-btn')?.click()); await sleep(500); await center(page, '#hmemResults .why-detail'); await shot('open');
  } },
  { key: '3-timing', steps: async (page, shot, m) => {
    await runTrainer(page, 'timing', '#ttStartBtn', () => timingTrainer.active);
    await openMeasure(page, '#ttResults'); await center(page, '#ttResults .vc-result-dims'); m.coach = await coachSizes(page, '#ttResults'); await shot('result');
    await ev(page, () => { timingTrainer.results = timingTrainer.results.map(() => ({ claimed: false })); timingTrainer.bleedHits = 0; renderTimingResults(); });
    await openMeasure(page, '#ttResults'); await center(page, '#ttResults .vc-result'); m.none = await ev(page, () => getComputedStyle(document.querySelector('#ttResults .vc-result-num')).display); await shot('none');
  } },
  { key: '4-yourchoir', steps: async (page, shot, m) => {
    await tab(page, 'yourchoir');
    if (!(await ev(page, () => !!ycTakes().Alto))) { await ev(page, () => document.querySelector('#ycParts [data-yc-rec="Alto"]').click()); await sleep(1500); await until(page, () => !yourChoir.recording, 60000); await sleep(1500); }
    await openMeasure(page, '#ycParts'); await center(page, '#ycParts'); m.row = await ev(page, () => document.querySelector('#ycParts [data-yc-part="Alto"] .record-label').textContent.trim()); await shot('rows');
  } },
  { key: '5-hm-idle', steps: async (page, shot, m) => {
    await tab(page, 'trainers', 'hm'); await ev(page, () => { document.querySelector('#harmonyMemoryCard details.hl-measure').open = true; });
    await center(page, '#hmemStageDesc'); m.desc = await ev(page, () => document.getElementById('hmemStageDesc').textContent); await shot('idle');
  } },
  { key: '6-parts', steps: async (page, shot, m, w) => {
    await tab(page, 'rehearse'); await center(page, '#rehearsalPartRow'); m.en = await partsMeasure(page); await shot('chooser');
    if (w !== '390') return;
    for (const l of ['fr', 'es', 'tr']) { await ev(page, l => setLanguage(l), l); await sleep(500); await center(page, '#rehearsalPartRow'); m[l] = await partsMeasure(page); await shot(l); }
    await ev(page, () => setLanguage('en')); await sleep(300);
  } },
];

async function account(b, dir) {
  const { ctx, page } = await C.openPage(b, { dir }); await C.signUp(page, 'dv51', 'Fix Round');
  const uid = await page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
  db(`update public.users set subscription_plan = 'choir', trial_start_date = current_date - 30 where id = '${uid}'`);
  const state = await ctx.storageState(); await ctx.close(); return state;
}

(async () => {
  const dir = C.buildDir(null); fs.mkdirSync(OUT, { recursive: true });
  const b0 = await C.chromium.launch(); const state = await account(b0, dir); await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); const measures = {};
  try {
    console.log(`== shots51 · branch (working copy) → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state });
      try {
        await C.clearOverlays(page); await S.warmMic(page);
        for (const sc of STATES.filter(s => !ONLY || ONLY.includes(s.key))) {
          const m = measures[`${sc.key} ${w} ${theme}`] = {};
          const shot = async name => { await sleep(300); await page.screenshot({ path: path.join(d, `${sc.key}-${name}.jpg`), ...Q }); };
          try { await sc.steps(page, shot, m, w); } catch (e) { m.error = String(e).slice(0, 300); }
          await page.evaluate(() => stopAllActiveSessions()).catch(() => {}); await sleep(500);
          console.log(`  ${sc.key} ${w} ${theme} ${JSON.stringify(m)}`);
        }
        measures[`errors ${w} ${theme}`] = errors.slice(0, 10);
      } finally { await ctx.close(); }
    }
    fs.writeFileSync(path.join(OUT, 'measures.json'), JSON.stringify(measures, null, 1));
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`), order = STATES.map(s => s.key);
    const names = [...new Set(cols.flatMap(c => fs.existsSync(path.join(OUT, c)) ? fs.readdirSync(path.join(OUT, c)) : []).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4)))];
    names.sort((a, b) => order.findIndex(k => a.startsWith(k + '-')) - order.findIndex(k => b.startsWith(k + '-')) || a.localeCompare(b));
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{width:200px}img.w1280{width:400px}</style>
      <h1>Phase 5.1 fixes (Choir plan)</h1>
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${names.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, 'fix.html'); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(500); await sp.screenshot({ path: path.join(sd, 'fix.jpg'), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
