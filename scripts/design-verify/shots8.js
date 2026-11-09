// Phase 8 screenshots (PHASE8.md §4, and the 2.1 checkpoint): the World hub in four states (signed out: every tile that
// needs a level is locked, Pitch Mountain and the Skill Tree open at Level 1; "new": Level 1; "active": Level 7;
// "allopen": Level 10+), each game's page, stage and result (games8.js, the fake mic singing the steady A4, the same
// steering as gamestates), the Skill Tree (new, active), and the plans sheet signed in and out, at 390 and 1280 wide,
// Light and Dark. Full page for pages and results; the stage as the viewport (it fills it). states.json: per shot, page
// errors, the house, and contrast.js's measure (items below 4.5:1). Out: <out>/<w>-<theme>/<name>.jpg, <out>/states.json.
// Usage: node scripts/design-verify/shots8.js [--out <dir>] [--only hub,glider,…] [--combos 390-light,…] [--base <ref>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage'), G = require('./games8'), { seedInPage } = require('./youSeed');
const SRC = fs.readFileSync(path.join(__dirname, 'contrast.js'), 'utf8');
const MEASURE = SRC.slice(SRC.indexOf('async function measure('), SRC.indexOf('\n}\n', SRC.indexOf('async function measure(')) + 2);
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots8'), DIR = C.buildDir(arg('--base') || null);
const ONLY = arg('--only') ? arg('--only').split(',') : null, want = k => !ONLY || ONLY.includes(k);
const COMBOS = (arg('--combos') || '390-light,390-dark,1280-light,1280-dark').split(',');
const Q = { type: 'jpeg', quality: 78 };

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); S.ensureStimuli();
  const b0 = await C.chromium.launch(); const o = await C.openPage(b0, { dir: DIR }); await C.signUp(o.page, 'dv8s', 'Alex Rivera');
  const state = await o.ctx.storageState(); await o.ctx.close(); await b0.close();
  const b = await S.launchMic(S.STIM.steady); const states = {};
  try {
    for (const combo of COMBOS) {
      const [w, theme] = combo.split('-'), dir = path.join(OUT, combo); fs.mkdirSync(dir, { recursive: true });
      const vp = { width: +w, height: +w < 600 ? 844 : 900 };
      const page8 = async (signed, seed) => {
        const r = await C.openPage(b, { dir: DIR, theme, viewport: vp, storageState: signed ? state : undefined, prepare: c => c.addInitScript(G.SEED_INIT) });
        await r.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await C.clearOverlays(r.page);
        if (seed) await r.page.evaluate(seedInPage, seed === 'allopen' ? 'active' : seed);
        if (seed === 'allopen') await r.page.evaluate(() => { progress.xp = 99999; });
        if (seed) await r.page.evaluate(() => { saveProgress = () => {}; });
        return r;
      };
      const measure = async (page, name, root) => {
        const m = await page.evaluate(([src, root]) => new Function('return (' + src + ')')()(root), [MEASURE, root]).catch(() => null);
        states[`${combo}/${name}`] = { house: await page.evaluate(() => document.body.dataset.house), contrast: m ? m.filter(x => x.status !== 'pass').length : null, low: m ? m.filter(x => x.status !== 'pass').slice(0, 6).map(i => ({ ratio: i.ratio, text: i.text, fg: i.fg, bg: i.bg })) : null };
      };
      const full = async (page, name, root = '#panel-arcade') => {
        await C.sleep(400); await measure(page, name, root);
        // at 390 the fixed tab bar is moved below the page's end (as shots7.js), so it doesn't cover the middle of a long page
        await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n && innerWidth < 960) { const h = document.documentElement.scrollHeight; n.style.position = 'absolute'; n.style.top = h + 'px'; n.style.bottom = 'auto'; } });
        await page.screenshot({ path: path.join(dir, name + '.jpg'), fullPage: true, ...Q });
        await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n) { n.style.position = ''; n.style.top = ''; n.style.bottom = ''; } });
      };
      const view = async (page, name, root) => { await C.sleep(400); await measure(page, name, root); await page.screenshot({ path: path.join(dir, name + '.jpg'), ...Q }); };
      // the hub in four states
      if (want('hub')) for (const st of ['signedout', 'new', 'active', 'allopen']) {
        const { ctx, page, errors } = await page8(st !== 'signedout', st === 'signedout' ? null : st);
        try { await C.showPanel(page, 'arcade'); await page.evaluate(() => { showArcadeHub(); }); await full(page, `hub-${st}`); states[`${combo}/hub-${st}`].errors = errors.slice(); }
        finally { await ctx.close(); }
      }
      // the Skill Tree
      if (want('skilltree')) for (const st of ['new', 'active']) {
        const { ctx, page, errors } = await page8(true, st);
        try { await C.showPanel(page, 'arcade'); await page.evaluate(() => showArcadeGame('skilltree')); await full(page, `skilltree-${st}`); states[`${combo}/skilltree-${st}`].errors = errors.slice(); }
        finally { await ctx.close(); }
      }
      // the games: page, stage, result ("active" seed: some bests and a Skill Profile)
      const games = G.GAMES.filter(g => want(g.key) || (g.key === 'wraith' && want('boss')));
      if (games.length) {
        const { ctx, page, errors } = await page8(true, 'active');
        try {
          await S.warmMic(page);
          for (const g of games) {
            await g.open(page); await page.evaluate(() => window.scrollTo(0, 0));
            if (g.key !== 'wraith') await full(page, `${g.key}-page`);
            await G.seed(page, 7); await g.act(page);
            await page.waitForFunction(`(${g.busy})()`, null, { timeout: 8000 }).catch(() => {});
            await page.waitForFunction(() => document.body.dataset.house === 'down', null, { timeout: 4000 }).catch(() => {});
            await C.sleep(g.key === 'glider' || g.key === 'bridge' ? 2500 : 4500);
            await view(page, `${g.key}-stage`, g.stage);
            await page.waitForFunction(`!(${g.busy})()`, null, { timeout: g.cap }).catch(() => {});
            if (await page.evaluate(`(${g.busy})()`)) await page.evaluate(id => document.getElementById(id).click(), g.start);
            await C.sleep(1800); await C.clearOverlays(page);
            await page.evaluate(sel => { const e = document.querySelector(sel); if (e) e.scrollIntoView({ block: 'start' }); }, g.result);
            await full(page, `${g.key}-result`);
          }
          states[`${combo}/games`] = { errors: errors.slice() };
        } finally { await ctx.close(); }
      }
      // the plans sheet, signed in and out
      if (want('plans')) for (const signed of [false, true]) {
        const { ctx, page, errors } = await page8(signed, null);
        try {
          await page.evaluate(() => showPricingPanel()); await C.sleep(400);
          await page.locator('.plan-btn[data-plan="monthly"]').scrollIntoViewIfNeeded(); await page.locator('.plan-btn[data-plan="monthly"]').click(); await C.sleep(500);
          await view(page, `plans-${signed ? 'signedin' : 'signedout'}`, signed ? '#plansSoonOverlay' : '#signinRequiredOverlay');
          states[`${combo}/plans-${signed ? 'signedin' : 'signedout'}`].errors = errors.slice();
        } finally { await ctx.close(); }
      }
      console.log(`${combo}: done`);
    }
  } finally { fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1)); await b.close(); C.cleanup(); }
  console.log(`shots8: ${OUT}`);
})();
