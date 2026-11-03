// Phase 5 screenshots (PHASE5.md §4), signed in with a Choir-plan test account (its plan set in public.users, as p8.js
// does), the fake mic singing the steady A4 (stage.js), at 390 and 1280, Light and Dark.
//   --set part1   the midway checkpoint: the Songs tab, the landing, each tab idle, Rehearse playing with Hear me off and
//                 on, Song Lab with the mixer playing, the X-Ray and the Microscope
//   --set final   (the default) all of part1, plus the locked preview (an expired account), the trainer list, each
//                 trainer idle, on its stage and with its result, a "Why?" open, Your Choir recording and its result,
//                 a toast
// Paper pages are full-page shots (the fixed tab bar moved to the page's end for the capture only); a stage is the
// viewport as the singer sees it. Out: <out>/<width>-<theme>/<name>.jpg, <out>/sheets/<set>.jpg (a row per state, a
// column per size and theme), <out>/states.json (each state's house and errors).
// Usage: node scripts/design-verify/shots5after.js [--set part1|final] [--base <git ref>] [--out <dir>] [--only name,…]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage');
const { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const SET = arg('--set') || 'final', BASE = arg('--base'), OUT = arg('--out') || path.join(os.tmpdir(), `voxcoach-shots5-${SET}`);
const ONLY = arg('--only') ? arg('--only').split(',') : null;
const Q = { type: 'jpeg', quality: 82 };
const COMBOS = [['390', 'light'], ['390', 'dark'], ['1280', 'light'], ['1280', 'dark']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep;
const ev = (page, f, a) => page.evaluate(f, a);
const center = (page, sel) => ev(page, sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, sel);
const top = page => ev(page, () => window.scrollTo(0, 0));
const tab = (page, k, tr) => ev(page, ({ k, tr }) => { selectSong('hymn'); setRehearsalPart('Alto'); cwShowTab(k, tr || null); window.scrollTo(0, 0); }, { k, tr }).then(() => sleep(700));
const until = (page, fn, ms) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
const hear = (page, on) => ev(page, on => { localStorage.setItem('cwHearMe', on ? '1' : '0'); renderHearButton(); }, on);

// A trainer: alone on its tab, idle; Start; its stage 9 s in; the result after the run.
const trainer = (key, card, btn, busy, results) => ({ key, sets: ['final'], steps: async (page, shot) => {
  await tab(page, 'trainers', key); await shot('idle', true);
  await ev(page, sel => document.querySelector(sel).click(), btn); await sleep(9000); await shot('stage', false);
  await until(page, `!(${busy})()`, 60000); await sleep(1500); await center(page, results); await shot('result', false);
} });

const STATES = [
  { key: 'songs', sets: ['part1', 'final'], steps: async (page, shot) => { await C.showPanel(page, 'songs-hub'); await top(page); await shot('idle', true); } },
  { key: 'landing', sets: ['part1', 'final'], steps: async (page, shot) => { await ev(page, () => cwShowLanding()); await sleep(700); await top(page); await shot('idle', true); } },
  { key: 'rehearse', sets: ['part1', 'final'], steps: async (page, shot) => {
    await tab(page, 'rehearse'); await shot('idle', true);
    await hear(page, false); await ev(page, () => document.getElementById('rehearsalPlayBtn').click()); await sleep(6000); await shot('playing', false);
    await ev(page, () => document.getElementById('rehearsalStopBtn').click()); await sleep(1500);
    await hear(page, true); await ev(page, () => document.getElementById('rehearsalPlayBtn').click()); await sleep(7000); await shot('playing-hearme', false);
    await ev(page, () => document.getElementById('rehearsalStopBtn').click()); await sleep(1500); await hear(page, false);
  } },
  { key: 'songlab', sets: ['part1', 'final'], steps: async (page, shot) => {
    await tab(page, 'songlab'); await shot('idle', true);
    await ev(page, () => document.getElementById('choirPlayBtn').click()); await sleep(3000); await center(page, '#cwMixer'); await shot('mixer', false);
    await ev(page, () => stopChoir()); await sleep(400);
    await center(page, '#sonicXrayCard'); await shot('xray', false);
    await ev(page, () => { microscope.t = 4; renderSonicXray(); }); await center(page, '#microscopeBody'); await shot('microscope', false);
  } },
  { key: 'trainers', sets: ['part1', 'final'], steps: async (page, shot) => { await tab(page, 'trainers'); await shot('idle', true); } },
  trainer('hm', '#harmonyMemoryCard', '#hmemStartBtn', () => harmonyMemory.active, '#hmemResults'),
  { key: 'hm-why', sets: ['final'], steps: async (page, shot) => {
    await tab(page, 'trainers', 'hm');
    const has = await ev(page, () => { const b = document.querySelector('#hmemResults .why-btn, #hmemResults summary'); if (b) b.click(); return !!b; });
    if (has) { await sleep(500); await center(page, '#hmemResults .why-detail, #hmemResults details[open]'); await shot('open', false); }
  } },
  trainer('boss', '#choirBossCard', '#cbStartBtn', () => challenge.active, '#cbResults'),
  trainer('chaos', '#chaosCard', '#cxStartBtn', () => challenge.active, '#cxResults'),
  trainer('ladder', '#ladderCard', '#tkStartBtn', () => challenge.active, '#tkResults'),
  trainer('timing', '#timingTrainerCard', '#ttStartBtn', () => timingTrainer.active, '#ttResults'),
  { key: 'yourchoir', sets: ['part1', 'final'], steps: async (page, shot) => {
    await tab(page, 'yourchoir'); await shot('idle', true);
    if (SET !== 'final') return;
    await ev(page, () => document.querySelector('#ycParts [data-yc-rec="Alto"]').click()); await sleep(9000); await shot('recording', false);
    await until(page, () => !yourChoir.recording, 60000); await sleep(1500); await center(page, '#ycParts'); await shot('result', false);
  } },
  { key: 'passport', sets: ['part1', 'final'], steps: async (page, shot) => { await tab(page, 'passport'); await shot('idle', true); } },
  { key: 'toast', sets: ['final'], steps: async (page, shot) => {
    await tab(page, 'trainers'); await ev(page, () => showToast(t('cw_toast_sample') !== 'cw_toast_sample' ? t('cw_toast_sample') : 'Achievement unlocked: First Choir Boss Defeated', 'success'));
    await sleep(400); await shot('shown', false);
  } },
];
const LOCKED = [
  { key: 'locked-landing', sets: ['final'], steps: async (page, shot) => { await ev(page, () => cwShowLanding()); await sleep(700); await top(page); await shot('idle', true); } },
];

async function account(b, dir, prefix, plan, ago) {
  const { ctx, page } = await C.openPage(b, { dir }); await C.signUp(page, prefix, 'Phase Five');
  const uid = await page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
  db(`update public.users set subscription_plan = ${plan ? `'${plan}'` : 'null'}, trial_start_date = current_date - ${ago} where id = '${uid}'`);
  const state = await ctx.storageState(); await ctx.close(); return state;
}

async function combo(b, dir, state, w, theme, list, states) {
  const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
  const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state });
  try {
    await C.clearOverlays(page); await S.warmMic(page);
    for (const sc of list) {
      const rec = states[`${sc.key} ${w} ${theme}`] = {};
      const shot = async (name, full) => {
        if (full) await page.addStyleTag({ content: '.hl-tabbar{position:absolute!important;top:auto!important;bottom:0!important}body{position:relative!important}' }).then(h => page.evaluate(e => e.setAttribute('data-shots5', ''), h));
        await sleep(300); await page.screenshot({ path: path.join(d, `${sc.key}-${name}.jpg`), fullPage: !!full, ...Q });
        if (full) await page.evaluate(() => document.querySelectorAll('style[data-shots5]').forEach(e => e.remove()));
        rec[name] = await page.evaluate(() => document.body.dataset.house || 'up');
      };
      try { await sc.steps(page, shot); } catch (e) { rec.error = String(e).slice(0, 300); }
      await page.evaluate(() => stopAllActiveSessions()).catch(() => {}); await sleep(500);
      console.log(`  ${sc.key} ${w} ${theme} ${JSON.stringify(rec)}`);
    }
    states[`errors ${w} ${theme}`] = errors.slice(0, 10);
  } finally { await ctx.close(); }
}

(async () => {
  const dir = C.buildDir(BASE); fs.mkdirSync(OUT, { recursive: true });
  const pick = l => l.filter(s => s.sets.includes(SET) && (!ONLY || ONLY.includes(s.key)));
  const b0 = await C.chromium.launch();
  const choir = await account(b0, dir, 'dv5a', 'choir', 30);
  const expired = pick(LOCKED).length ? await account(b0, dir, 'dv5ax', null, 30) : null;
  await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); const states = {};
  try {
    console.log(`== shots5after ${SET} · ${BASE || 'branch (working copy)'} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      await combo(b, dir, choir, w, theme, pick(STATES), states);
      if (expired) await combo(b, dir, expired, w, theme, pick(LOCKED), states);
    }
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1));
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`);
    const order = [...STATES, ...LOCKED].map(s => s.key);
    const names = [...new Set(cols.flatMap(c => fs.existsSync(path.join(OUT, c)) ? fs.readdirSync(path.join(OUT, c)) : []).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4)))];
    names.sort((a, b) => order.findIndex(k => a.startsWith(k + '-')) - order.findIndex(k => b.startsWith(k + '-')) || a.localeCompare(b));
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{max-height:560px;width:200px;object-fit:cover;object-position:top}img.w1280{max-height:380px;width:400px;object-fit:cover;object-position:top}</style>
      <h1>Phase 5 ${SET}: Choir World (Choir plan${expired ? '; locked-* on an expired account' : ''})</h1>
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${names.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, `${SET}.html`); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(500); await sp.screenshot({ path: path.join(sd, `${SET}.jpg`), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
