// Phase 9 screenshots (PHASE9.md 1g and §4): every phase 9 screen in each of its states, every onboarding step, the
// three moment sheets, both posters (on screen, plus the exported PNG), at 390 and 1280, Light and Dark. On a build: the
// working copy, or --base <ref> (the before set: --base master). Replaces shots8before.js's phase 9 half, whose level-up,
// new record and range poster shots showed the page behind (clearOverlays leaves an inline display:none on the moment
// overlays; the range poster's button needs a measured range) and whose warm-up shot showed Feedback (noWarmup.js
// skipped it). Here each screen names the overlay it must show; states.json records, per shot, the overlays actually
// open (ids), the active panel, the house, page errors, contrast.js's items below 4.5:1, and "ok": the expected overlay
// (or panel) is the one shown. A shot whose expected overlay isn't open is reported and counted (exit 1).
// States (set in the page only, saveProgress and saveProfile stubbed; youSeed.js): signedout; new (fresh account, Level
// 1, in the trial); active (Level 7); expired (active, the 21 days over, no plan); teacher (active on the Teacher plan
// with two students and one assignment: the Teacher Dashboard, master only, since phase 9 hides it).
// Out: <out>/<w>-<theme>/<screen>-<state>.jpg (+ <poster>-<state>-export.png), states.json, sheets/<name>.jpg
// Usage: node scripts/design-verify/shots9.js [--out <dir>] [--base <ref>] [--only key,key] [--combos 390-light,…]
//        [--name before9|phase9]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const { seedInPage } = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots9'), ONLY = arg('--only') ? arg('--only').split(',') : null;
const BASE = arg('--base') || null, DIR = C.buildDir(BASE);
const COMBOS = (arg('--combos') || '390-light,390-dark,1280-light,1280-dark').split(',').map(c => c.split('-'));
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 900 } }, Q = { type: 'jpeg', quality: 78 };
const sleep = C.sleep;
const src = fs.readFileSync(path.join(__dirname, 'contrast.js'), 'utf8');
const MEASURE = src.slice(src.indexOf('async function measure('), src.indexOf('\n}\n', src.indexOf('async function measure(')) + 2);
const SCREENS = require('./screens9').SCREENS.filter(s => !ONLY || ONLY.includes(s.key));
const { stateInPage, resetInPage, openOverlays } = require('./screens9');

async function openState(b, state, st, { theme, viewport }) {
  const signed = st !== 'signedout';
  const o = await C.openPage(b, { dir: DIR, theme, viewport, storageState: signed ? state : undefined });
  await o.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await C.clearOverlays(o.page);
  if (signed) { await o.page.evaluate(seedInPage, st === 'new' ? 'new' : 'active'); }
  await o.page.evaluate(stateInPage, st);
  return o;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }); const out = {}; let bad = 0; // the fake mic: the warm-up's stage
  try {
    const a = await C.openPage(b, { dir: DIR }); await C.signUp(a.page, 'dv9s', 'Alex Rivera');
    const state = await a.ctx.storageState(); await a.ctx.close();
    const STATES = [...new Set(SCREENS.flatMap(s => s.states))];
    console.log(`== shots9 · ${BASE || 'working copy'} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      for (const st of STATES) {
        const list = SCREENS.filter(s => s.states.includes(st)); if (!list.length) continue;
        const { ctx, page, errors } = await openState(b, state, st, { theme, viewport: SIZES[w] });
        for (const sc of list) {
          if (sc.skipIf && await page.evaluate(sc.skipIf)) { console.log(`  ${sc.key}-${st}: not in this build (${sc.skipWhy})`); continue; }
          await page.evaluate(resetInPage); await page.evaluate(() => window.scrollTo(0, 0));
          const err = await page.evaluate(code => { try { (0, eval)(code); return null; } catch (e) { return String(e); } }, sc.open);
          if (sc.then) await page.evaluate(code => (0, eval)(code), sc.then).catch(e => null);
          await sleep(sc.wait || 900);
          const name = `${sc.key}-${st}`;
          const seen = await page.evaluate(openOverlays);
          const ok = sc.overlay ? seen.overlays.includes(sc.overlay) : (!sc.panel || seen.panel === sc.panel) && !seen.overlays.length;
          if (!ok) bad++;
          if (!sc.overlay) await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n && innerWidth < 960) { const h = document.documentElement.scrollHeight; n.style.position = 'absolute'; n.style.top = h + 'px'; n.style.bottom = 'auto'; } });
          await page.screenshot({ path: path.join(d, `${name}.jpg`), fullPage: !sc.overlay, ...Q });
          const items = await page.evaluate(async ([m, r]) => { try { return (await eval('(' + m + ')')(r)).filter(i => i.status !== 'pass').map(i => ({ ratio: i.ratio, text: i.text, fg: i.fg, bg: i.bg })); } catch (e) { return [{ error: String(e) }]; } }, [MEASURE, sc.root]);
          await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n) { n.style.position = ''; n.style.top = ''; n.style.bottom = ''; } });
          let png = null;
          if (sc.exportBtn && seen.overlays.includes(sc.overlay)) { // the poster's own Download: the PNG it makes
            const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
            await page.evaluate(id => document.getElementById(id).click(), sc.exportBtn);
            const f = await dl; if (f) { png = `${name}-export.png`; await f.saveAs(path.join(d, png)); }
          }
          out[`${w}-${theme}/${name}`] = { expect: sc.overlay || sc.panel || null, ...seen, ok, openError: err, contrast: items, png, errors: errors.slice() };
          console.log(`  ${(ok ? '✓' : '✗')} ${name.padEnd(28)} ${w} ${theme}  shown: ${seen.overlays.join(',') || seen.panel}  house ${seen.house}  contrast<4.5: ${items.length}${err ? `  OPEN ERROR ${err}` : ''}${png ? '  png' : ''}`);
        }
        if (errors.length) console.log(`  page errors (${w} ${theme} ${st}): ${errors.join(' | ')}`);
        await ctx.close();
      }
    }
    console.log(`\nSHOTS9: ${bad ? `${bad} shot(s) without their overlay or panel` : 'every shot shows its overlay or panel'}`);
    process.exitCode = bad ? 1 : 0;
  } finally {
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(out, null, 1));
    await b.close(); await C.cleanup();
  }
})();
