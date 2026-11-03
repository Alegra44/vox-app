// Phase 5 survey (PHASE5_SURVEY.md, PHASE5A.md 5a.1 step 5): every Choir World screen and state as it is now, before any
// phase 5 change, signed in with a Choir-plan test account (its plan set in public.users, as p8.js does), the fake mic
// singing the steady A4 (stage.js). Idle pages are full-page shots; live and result shots centre the card. Plus the locked
// preview on an expired account, and a French pass that lists the visible text left in English (--lang-check).
// At 390 Light, 390 Dark and 1280 Light. Out: <out>/<width>-<theme>/<screen>-<state>.jpg, <out>/sheets/before.jpg,
// <out>/states.json (what each screen showed), <out>/english-in-fr.json.
// Usage: node scripts/design-verify/shots5.js [--base <git ref>] [--out <dir>] [--only songs,workspace,…]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage');
const { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base'), OUT = arg('--out') || path.join(os.tmpdir(), `voxcoach-shots5-${BASE || 'branch'}`);
const ONLY = arg('--only') ? arg('--only').split(',') : null;
const Q = { type: 'jpeg', quality: 85 };
const COMBOS = [['390', 'light'], ['390', 'dark'], ['1280', 'light']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep;
const center = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, sel);
const top = page => page.evaluate(() => window.scrollTo(0, 0));
const click = (page, sel) => page.evaluate(sel => document.querySelector(sel).click(), sel);
const until = (page, fn, ms) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);

// A run in a trainer card: open the rehearsal page on Demo Hymn Alto, start, shoot mid-run, wait for the end, shoot the result.
const trainer = (key, card, btn, done, prep) => ({ key, steps: async (page, shot) => {
  await page.evaluate(() => { selectSong('hymn'); enterPanel('partrehearsal'); setRehearsalPart('Alto'); });
  if (prep) await page.evaluate(prep);
  await center(page, card); await shot('idle', false);
  await click(page, btn); await sleep(9000); await center(page, card); await shot('live', false);
  await until(page, done, 60000); await sleep(1200); await center(page, card); await shot('result', false);
} });

const SCREENS = [
  { key: 'songs', steps: async (page, shot) => { await C.showPanel(page, 'songs-hub'); await top(page); await shot('idle', true); } },
  { key: 'home-card', steps: async (page, shot) => { await C.showPanel(page, 'home'); await center(page, '#homeChoirCard'); await shot('idle', false); } },
  { key: 'workspace', steps: async (page, shot) => {
    await page.evaluate(() => { selectSong('hymn'); enterPanel('choir'); }); await top(page); await shot('idle', true);
    await center(page, '#volSoprano'); await click(page, '#choirPlayBtn'); await sleep(4000); await shot('playing', false);
    await click(page, '#choirStopBtn'); await sleep(500);
    await page.evaluate(() => { microscope.t = 4; renderSonicXray(); renderMicroscope(); }); await center(page, '#microscopeBody'); await shot('microscope', false);
    await center(page, '#rosterList'); await shot('roster', false);
  } },
  { key: 'yourchoir', steps: async (page, shot) => {
    await page.evaluate(() => { selectSong('hymn'); enterPanel('choir'); }); await center(page, '#yourChoirCard'); await shot('idle', false);
    await click(page, '#ycParts [data-yc-rec="Alto"]'); await sleep(9000); await center(page, '#yourChoirCard'); await shot('live', false);
    await until(page, () => !yourChoir.recording, 60000); await sleep(1500); await center(page, '#yourChoirCard'); await shot('result', false);
  } },
  { key: 'rehearsal', steps: async (page, shot) => {
    await page.evaluate(() => { selectSong('hymn'); enterPanel('partrehearsal'); setRehearsalPart('Alto'); }); await top(page); await shot('idle', true);
    await center(page, '#rehearsalPlayBtn'); await click(page, '#rehearsalPlayBtn'); await sleep(6000); await center(page, '#rehearsalRoll'); await shot('playing', false);
    await center(page, '#breathMapCard'); await shot('breathmap-live', false);
    await click(page, '#rehearsalStopBtn'); await sleep(500);
    await click(page, '#acappellaBtn'); await sleep(400); await top(page); await shot('acappella', true); await click(page, '#acappellaBtn');
  } },
  trainer('harmonymemory', '#harmonyMemoryCard', '#hmemStartBtn', () => !harmonyMemory.active),
  { key: 'harmonymemory-why', steps: async (page, shot) => {
    const has = await page.evaluate(() => { const b = document.querySelector('#hmemResults .why-btn'); if (b) b.click(); return !!b; });
    if (has) { await sleep(500); await center(page, '#hmemResults .why-detail'); await shot('result', false); }
  } },
  trainer('boss', '#choirBossCard', '#cbStartBtn', () => !challenge.active),
  trainer('chaos', '#chaosCard', '#cxStartBtn', () => !challenge.active),
  trainer('ladder', '#ladderCard', '#tkStartBtn', () => !challenge.active),
  trainer('timing', '#timingTrainerCard', '#ttStartBtn', () => !timingTrainer.active),
  { key: 'passport', steps: async (page, shot) => { await C.showPanel(page, 'choirpassport'); await top(page); await shot('idle', true); } },
];
// The same pages on an expired account: the locked preview.
const LOCKED = [
  { key: 'locked-workspace', steps: async (page, shot) => { await C.showPanel(page, 'choir'); await top(page); await shot('idle', true); } },
  { key: 'locked-rehearsal', steps: async (page, shot) => { await C.showPanel(page, 'partrehearsal'); await top(page); await shot('idle', true); } },
  { key: 'locked-passport', steps: async (page, shot) => { await C.showPanel(page, 'choirpassport'); await top(page); await shot('idle', true); } },
  { key: 'locked-songs', steps: async (page, shot) => { await C.showPanel(page, 'songs-hub'); await top(page); await shot('idle', true); } },
];

async function account(b, dir, prefix, plan, ago) {
  const { ctx, page } = await C.openPage(b, { dir }); await C.signUp(page, prefix, 'Survey Check');
  const uid = await page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
  db(`update public.users set subscription_plan = ${plan ? `'${plan}'` : 'null'}, trial_start_date = current_date - ${ago} where id = '${uid}'`);
  const state = await ctx.storageState(); await ctx.close(); return state;
}

// One page per size and theme: the screens run in order on it (the runs build the readiness the passport then shows).
async function combo(b, dir, state, w, theme, screens, states) {
  const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
  const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state });
  try {
    await C.clearOverlays(page); await S.warmMic(page);
    for (const sc of screens) {
      const rec = states[`${sc.key} ${w} ${theme}`] = {};
      const shot = async (name, full) => {
        // a full-page capture draws the fixed tab bar where the viewport ends, over the content: it goes to the page's end for the capture only
        if (full) await page.addStyleTag({ content: '.hl-tabbar{position:absolute!important;top:auto!important;bottom:0!important}body{position:relative!important}', }).then(h => page.evaluate(e => e.setAttribute('data-shots5', ''), h));
        await sleep(300); await page.screenshot({ path: path.join(d, `${sc.key}-${name}.jpg`), fullPage: !!full, ...Q });
        if (full) await page.evaluate(() => document.querySelectorAll('style[data-shots5]').forEach(e => e.remove()));
        rec[name] = await page.evaluate(() => { const p = document.querySelector('.panel.active'); return p ? p.innerText.replace(/\s+\n/g, '\n').trim().slice(0, 1500) : ''; });
        rec.house = await page.evaluate(() => document.body.dataset.house || null);
      };
      try { await sc.steps(page, shot); } catch (e) { rec.error = String(e).slice(0, 300); }
      await page.evaluate(() => stopAllActiveSessions()).catch(() => {}); await sleep(500);
      console.log(`  ${sc.key} ${w} ${theme}${rec.error ? ' ERROR ' + rec.error : ''}`);
    }
    states[`errors ${w} ${theme}`] = errors.slice(0, 10);
  } finally { await ctx.close(); }
}

// French: the visible text on the Choir World pages that is an English string of the dictionary (and differs in French),
// or text with no key that reads as English.
async function langCheck(b, dir, state) {
  const { ctx, page } = await C.openPage(b, { dir, storageState: state, lang: 'fr' });
  const found = {};
  try {
    await C.clearOverlays(page);
    for (const p of ['songs-hub', 'choir', 'partrehearsal', 'choirpassport']) {
      await C.showPanel(page, p); await sleep(500);
      found[p] = await page.evaluate(p => {
        const en = TRANSLATIONS.en, fr = TRANSLATIONS.fr, enVals = new Map(Object.entries(en).map(([k, v]) => [String(v).replace(/<[^>]+>/g, '').trim(), k]));
        const out = new Set(), words = /\b(the|and|your|you|Play|Playing|Stop|Loop|Practice|chords|Start|Record|Download|Sample|parts?|song|Quick)\b/;
        const w = document.createTreeWalker(document.getElementById('panel-' + p), NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode());) {
          const el = n.parentElement, s = n.textContent.trim();
          if (!s || s.length < 3 || !el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue;
          const k = enVals.get(s);
          if ((k && fr[k] !== en[k]) || (!k && words.test(s))) out.add(s.slice(0, 120));
        }
        return [...out];
      }, p);
    }
  } finally { await ctx.close(); }
  fs.writeFileSync(path.join(OUT, 'english-in-fr.json'), JSON.stringify(found, null, 1));
  console.log('English left on the French pages:', JSON.stringify(found));
}

(async () => {
  const dir = C.buildDir(BASE); fs.mkdirSync(OUT, { recursive: true });
  const b0 = await C.chromium.launch();
  const choir = await account(b0, dir, 'dv5', 'choir', 30), expired = await account(b0, dir, 'dv5x', null, 30);
  await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); const states = {};
  const pick = l => l.filter(s => !ONLY || ONLY.includes(s.key));
  try {
    console.log(`== shots5 · ${BASE || 'branch (working copy)'} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      await combo(b, dir, choir, w, theme, pick(SCREENS), states);
      await combo(b, dir, expired, w, theme, pick(LOCKED), states);
    }
    await langCheck(b, dir, choir);
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1));
    // the sheet: a row per screen and state, 390 Light | 390 Dark | 1280 Light
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`);
    const names = [...new Set(fs.readdirSync(path.join(OUT, cols[0])).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4)))];
    const order = [...SCREENS, ...LOCKED].map(s => s.key);
    names.sort((a, b) => order.findIndex(k => a.startsWith(k + '-')) - order.findIndex(k => b.startsWith(k + '-')) || a.localeCompare(b));
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{max-height:560px;width:220px;object-fit:cover;object-position:top}img.w1280{max-height:420px;width:460px;object-fit:cover;object-position:top}</style>
      <h1>Phase 5, before: Choir World as it is now (Choir plan; locked-* on an expired account)</h1>
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${names.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, 'before.html'); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1100, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(500); await sp.screenshot({ path: path.join(sd, 'before.jpg'), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
