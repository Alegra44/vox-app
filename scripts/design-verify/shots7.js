// Phase 7 (PHASE7.md §4, and the midway checkpoint after 2.3): the You screens on the branch, full page, at 390 and 1280,
// Light and Dark, signed out and in the seeded states of youSeed.js (new, active; activecw for You and Records), on a
// Choir-plan test account (deleted at exit). Nothing sings. states.json: per shot, page errors and contrast.js's measure
// of the panel (items below 4.5:1). For the full-page shot at 390 the fixed tab bar is moved below the page's end, so it
// doesn't cover the middle of a long page. The Voice Card's image is saved as the canvas draws it (voicecard-<theme>-<state>.png).
// Out: <out>/<w>-<theme>/<screen>-<state>.jpg, <out>/states.json, <out>/sheets/<sheet>.jpg.
// Usage: node scripts/design-verify/shots7.js [--out <dir>] [--only you,progress,…] [--states new,active] [--combos 390-light,…]
//        [--sheet phase7] [--base <git ref>, default the working copy]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const { db } = require('../choir-verify/testAccounts');
const { seedInPage } = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots7'), ONLY = arg('--only') ? arg('--only').split(',') : null;
const STATES = arg('--states') ? arg('--states').split(',') : null, SHEET = arg('--sheet') || 'phase7';
const Q = { type: 'jpeg', quality: 80 };
const COMBOS = (arg('--combos') || '390-light,390-dark,1280-light,1280-dark').split(',').map(c => c.split('-'));
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep, ev = (page, f, a) => page.evaluate(f, a);
const src = fs.readFileSync(path.join(__dirname, 'contrast.js'), 'utf8');
const MEASURE = src.slice(src.indexOf('async function measure('), src.indexOf('\n}\n', src.indexOf('async function measure(')) + 2);
const SCREENS = [
  { key: 'you', panel: null, states: ['signedout', 'new', 'active', 'activecw'] },
  { key: 'progress', panel: 'dashboard', states: ['signedout', 'new', 'active'] },
  { key: 'profile', panel: 'profile', states: ['signedout', 'new', 'active'] },
  { key: 'journey', panel: 'journey', states: ['signedout', 'new', 'active'] },
  { key: 'records', panel: 'records', states: ['signedout', 'new', 'active', 'activecw'] },
  { key: 'passport', panel: 'passport', states: ['signedout', 'new', 'active'] },
  { key: 'voicehealth', panel: 'voicehealth', states: ['signedout', 'new', 'active'] },
].filter(s => !ONLY || ONLY.includes(s.key));

async function account(b, dir) {
  const { ctx, page } = await C.openPage(b, { dir }); await C.signUp(page, 'dv7s', 'Alex Rivera');
  const uid = await page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
  db(`update public.users set subscription_plan = 'choir' where id = '${uid}'`);
  const state = await ctx.storageState(); await ctx.close(); return state;
}

(async () => {
  const dir = C.buildDir(arg('--base')); fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch(); const statesOut = {};
  try {
    const state = await account(b, dir);
    console.log(`== shots7 · ${C.REMOTE || arg('--base') || 'working copy'} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      for (const signed of [false, true]) {
        const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: signed ? state : undefined });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await C.clearOverlays(page);
        for (const sc of SCREENS) for (const st of sc.states) {
          if ((st === 'signedout') === signed || (STATES && !STATES.includes(st))) continue;
          if (signed) await ev(page, seedInPage, st);
          await ev(page, p => { if (p) enterPanel(p); else showShellSection('you'); }, sc.panel); await sleep(700);
          await C.clearOverlays(page); await ev(page, () => window.scrollTo(0, 0)); await sleep(300);
          await ev(page, () => { const n = document.querySelector('nav.shell-bottomnav'); if (n && innerWidth < 960) { const h = document.documentElement.scrollHeight; n.style.position = 'absolute'; n.style.top = h + 'px'; n.style.bottom = 'auto'; } });
          const name = `${sc.key}-${st}`, root = sc.panel ? `#panel-${sc.panel}` : '#panel-you-hub';
          await page.screenshot({ path: path.join(d, `${name}.jpg`), fullPage: true, ...Q });
          const items = await ev(page, async ([m, r]) => (await eval('(' + m + ')')(r)).filter(i => i.status !== 'pass')
            .map(i => ({ status: i.status, ratio: i.ratio, text: i.text, fg: i.fg, bg: i.bg, path: i.path })), [MEASURE, root]);
          await ev(page, () => { const n = document.querySelector('nav.shell-bottomnav'); if (n) { n.style.position = ''; n.style.top = ''; n.style.bottom = ''; } });
          const tab = await ev(page, () => (document.querySelector('.snb-item.active') || {}).dataset?.shell || null);
          statesOut[`${name} ${w} ${theme}`] = { contrast: items, tab };
          if (sc.key === 'profile' && signed && w === '390') { // the Voice Card as the canvas draws it
            const png = await ev(page, () => { const cv = document.getElementById('voiceCardCanvas'); return cv ? cv.toDataURL('image/png') : null; });
            if (png) fs.writeFileSync(path.join(OUT, `voicecard-${theme}-${st}.png`), Buffer.from(png.split(',')[1], 'base64'));
          }
          console.log(`  ${name} ${w} ${theme}  contrast below 4.5: ${items.length}  tab: ${tab}`);
        }
        statesOut[`errors ${w} ${theme} ${signed ? 'signed in' : 'signed out'}`] = errors.slice();
        if (errors.length) console.log(`  page errors (${w} ${theme} ${signed ? 'in' : 'out'}): ${errors.join(' | ')}`);
        await ctx.close();
      }
    }
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(statesOut, null, 1));
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`), order = SCREENS.flatMap(s => s.states.map(st => `${s.key}-${st}`));
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="${c}/${n}.jpg" class="w${c.split('-')[0]}">` : '—'; };
    const cards = fs.readdirSync(OUT).filter(f => /^voicecard-.*\.png$/.test(f));
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{width:180px}img.w1280{width:380px}.cards img{width:150px;margin-right:8px}</style>
      <h1>Phase 7: the You screens (${C.REMOTE || arg('--base') || 'redesign/phase7'}, Choir plan)</h1>
      ${cards.length ? `<div class="cards"><h2>Voice Card</h2>${cards.map(f => `<figure style="display:inline-block;margin:0 8px 8px 0"><img src="${f}"><figcaption>${f}</figcaption></figure>`).join('')}</div>` : ''}
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${order.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(OUT, `${SHEET}.html`); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(1000); await sp.screenshot({ path: path.join(sd, `${SHEET}.jpg`), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
