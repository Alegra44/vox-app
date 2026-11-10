// PHASE9.md 1a: every phase 9 screen (screens9.js) in each of its states, on master and on the branch (the working
// copy, or --branch-ref / --branch-url), compared button by button. Per screen and state: page errors, the overlay or
// panel it shows, the house. Then every button, link, checkbox and radio inside the screen's root is clicked, each from
// a freshly opened screen, and its effect recorded: the overlays open and the active panel after it, the house, a toast,
// and what it saved: the profile and progress fields that changed (saveProfile and saveProgress are stubbed, so
// nothing reaches the account) and the localStorage keys that changed. Then Escape and a click on the scrim (overlays).
// A button is matched across the builds by its id, else its data-* values, else its data-i18n key, else its text.
// "house up everywhere except the warm-up's stage": every screen opens with the page's house up; the warm-up stage's
// own house is reported (the overlay's data-house).
// Prints every difference; differences outside PHASE9.md §3's expected list are failures (judged by reading them:
// the script exits 1 on any difference and lists them). Focus after opening is reported per build (2.1), not compared.
// Out: <out>/states9.json. Usage: node scripts/design-verify/states9.js [--base master] [--branch-ref <ref> |
//      --branch-url <url>] [--only key,key] [--out <dir>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const { seedInPage } = require('./youSeed');
const { SCREENS: ALL, stateInPage, resetInPage, openOverlays } = require('./screens9');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ONLY = arg('--only') ? arg('--only').split(',') : null, OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-states9');
const BASE = arg('--base') || 'master';
const SIDES = { master: C.buildDir(BASE), branch: arg('--branch-url') || C.buildDir(arg('--branch-ref') || null) };
// the moment sheets and posters have no buttons worth a click-by-click (Continue / Download / Close are the checks of
// levelup.js and posters.js), but they're opened and their Escape/scrim checked here too
const SCREENS = ALL.filter(s => !ONLY || ONLY.includes(s.key));
const sleep = C.sleep;

// Runs in the page: the screen's controls with a stable identity.
function controlsInPage(root) {
  const r = document.querySelector(root); if (!r) return [];
  const vis = e => { const cs = getComputedStyle(e); return e.getClientRects().length && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const els = [...r.querySelectorAll('button, a[href], input[type="checkbox"], input[type="radio"], [role="button"], [role="radio"], [role="checkbox"]')].filter(e => vis(e) && !e.disabled);
  const seen = {};
  return els.map(e => {
    let id = e.id ? '#' + e.id : [...e.attributes].filter(a => a.name.startsWith('data-') && !a.name.startsWith('data-i18n')).map(a => `${a.name}=${a.value}`).join(' ');
    if (!id) id = e.getAttribute('data-i18n') ? 'i18n:' + e.getAttribute('data-i18n') : 'text:' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40);
    seen[id] = (seen[id] || 0) + 1; return seen[id] > 1 ? `${id} @${seen[id]}` : id;
  });
}
function clickInPage([root, ident]) {
  const r = document.querySelector(root);
  const vis = e => { const cs = getComputedStyle(e); return e.getClientRects().length && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const els = [...r.querySelectorAll('button, a[href], input[type="checkbox"], input[type="radio"], [role="button"], [role="radio"], [role="checkbox"]')].filter(e => vis(e) && !e.disabled);
  const seen = {};
  for (const e of els) {
    let id = e.id ? '#' + e.id : [...e.attributes].filter(a => a.name.startsWith('data-') && !a.name.startsWith('data-i18n')).map(a => `${a.name}=${a.value}`).join(' ');
    if (!id) id = e.getAttribute('data-i18n') ? 'i18n:' + e.getAttribute('data-i18n') : 'text:' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40);
    seen[id] = (seen[id] || 0) + 1; const full = seen[id] > 1 ? `${id} @${seen[id]}` : id;
    if (full === ident) { e.click(); return true; }
  }
  return false;
}
// Runs in the page: what could be saved (the auth token and timing keys left out).
function snapInPage() {
  const j = x => { try { return JSON.stringify(x); } catch (e) { return String(x); } };
  const o = { profile: {}, progress: {}, ls: {} };
  try { if (profile) for (const k of Object.keys(profile)) o.profile[k] = j(profile[k]); } catch (e) {}
  try { if (progress) for (const k of Object.keys(progress)) o.progress[k] = j(progress[k]); } catch (e) {}
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!/^sb-|auth-token|lastActive|vlFeed|vocalLoad/i.test(k)) o.ls[k] = localStorage.getItem(k); }
  o.ls.__fbRows = JSON.stringify((window.__fbRows || []).map(r => ({ ...r, email: r.email ? '<email>' : r.email, user_id: r.user_id ? '<id>' : r.user_id }))); // what Submit would insert
  o.toast = [...document.querySelectorAll('#appToastWrap *')].map(e => e.textContent.trim()).filter(Boolean).join(' | ');
  return o;
}
const diff = (a, b) => { const out = {}; for (const part of ['profile', 'progress', 'ls']) for (const k of new Set([...Object.keys(a[part]), ...Object.keys(b[part])]))
  if (a[part][k] !== b[part][k] && !/^(updatedAt|lastSeen|timelineEvents)$/.test(k)) out[`${part}.${k}`] = String(b[part][k]).replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, '<time>').replace(/\d{10,}/g, '<n>').slice(0, 90); return out; }; // ids and times from the clock

async function runSide(b, dir, state, side) {
  const res = {};
  const STATES = [...new Set(SCREENS.flatMap(s => s.states))];
  for (const st of STATES) {
    const list = SCREENS.filter(s => s.states.includes(st));
    const o = await C.openPage(b, { dir, storageState: st === 'signedout' ? undefined : state });
    const { page, errors } = o;
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await C.clearOverlays(page);
    const prep = async () => { if (st !== 'signedout') await page.evaluate(seedInPage, st === 'new' ? 'new' : 'active'); await page.evaluate(stateInPage, st); };
    await prep();
    const open = async sc => { await page.evaluate(resetInPage); await page.evaluate(() => window.scrollTo(0, 0));
      const err = await page.evaluate(code => { try { (0, eval)(code); return null; } catch (e) { return String(e); } }, sc.open);
      if (sc.then) await page.evaluate(code => (0, eval)(code), sc.then).catch(() => {});
      await sleep(sc.wait || 700); return err; };
    for (const sc of list) {
      const key = `${sc.key}-${st}`;
      if (sc.skipIf && await page.evaluate(sc.skipIf)) { res[key] = { absent: sc.skipWhy }; console.log(`  ${side} ${key}: absent (${sc.skipWhy})`); continue; }
      const err = await open(sc);
      const seen = await page.evaluate(openOverlays);
      const focus = await page.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.getAttribute('data-i18n') ? ':' + e.getAttribute('data-i18n') : '')) : null; });
      const stageHouse = await page.evaluate(id => { const e = id && document.getElementById(id); return e ? e.dataset.house || null : null; }, sc.overlay);
      const controls = await page.evaluate(controlsInPage, sc.root);
      const r = res[key] = { openError: err, ...seen, focus, overlayHouse: stageHouse, controls: {}, escape: null, scrim: null };
      if (!['levelup', 'newrecord', 'breakthrough'].includes(sc.key)) for (const c of controls) {
        await open(sc); await page.evaluate(() => { const w = document.getElementById('appToastWrap'); if (w) w.innerHTML = ''; });
        const before = await page.evaluate(snapInPage);
        const clicked = await page.evaluate(clickInPage, [sc.root, c]);
        await sleep(c.includes('wu-item') ? 2000 : 700);
        if (page.url().replace(/#.*/, '') !== (/^https?:/.test(dir) ? dir : C.LOCAL).replace(/#.*/, '')) { r.controls[c] = { navigated: page.url() }; await page.goBack().catch(() => {}); await sleep(2000); await prep(); continue; }
        const after = await page.evaluate(snapInPage), now = await page.evaluate(openOverlays);
        r.controls[c] = { clicked, overlays: now.overlays, panel: now.panel, house: now.house, saved: diff(before, after), toast: after.toast || null };
        await page.evaluate(stateInPage, st); // a click may have replaced profile/progress (sign-in, reset): the stubs again
      }
      if (sc.overlay) {
        await open(sc); await page.keyboard.press('Escape'); await sleep(500); r.escape = (await page.evaluate(openOverlays)).overlays;
        await open(sc); await page.mouse.click(4, 4); await sleep(500); r.scrim = (await page.evaluate(openOverlays)).overlays;
      }
      console.log(`  ${side} ${key.padEnd(26)} shown ${seen.overlays.join(',') || seen.panel}  house ${seen.house}  controls ${controls.length}  focus ${focus}${err ? '  OPEN ERROR ' + err : ''}`);
    }
    res[`errors-${st}`] = errors.slice();
    await page.evaluate(resetInPage).catch(() => {}); await o.ctx.close();
  }
  return res;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const out = {}; const diffs = [];
  try {
    const a = await C.openPage(b, { dir: SIDES.master }); await C.signUp(a.page, 'dvst9', 'Alex Rivera'); const state = await a.ctx.storageState(); await a.ctx.close();
    for (const side of ['master', 'branch']) { console.log(`== ${side}`); out[side] = await runSide(b, SIDES[side], state, side); }
    const M = out.master, B = out.branch;
    for (const k of Object.keys(M)) {
      if (k.startsWith('errors-')) { if (M[k].length || B[k].length) diffs.push(`${k}: page errors master ${M[k].length}, branch ${B[k].length} ${[...M[k], ...B[k]].slice(0, 2).join(' | ')}`); continue; }
      const m = M[k], br = B[k];
      if (!br) { diffs.push(`${k}: missing on the branch`); continue; }
      if (m.absent || br.absent) { if (!m.absent !== !br.absent) diffs.push(`${k}: ${m.absent ? 'absent on master' : 'absent on the branch (' + br.absent + ')'}`); continue; }
      if (br.house !== 'up') diffs.push(`${k}: the branch's house is ${br.house} on opening (must be up)`);
      for (const f of ['overlays', 'panel', 'house', 'escape', 'scrim']) if (JSON.stringify(m[f]) !== JSON.stringify(br[f])) diffs.push(`${k}: ${f} ${JSON.stringify(m[f])} → ${JSON.stringify(br[f])}`);
      for (const c of new Set([...Object.keys(m.controls), ...Object.keys(br.controls)])) {
        const x = m.controls[c], y = br.controls[c];
        if (!x || !y) { diffs.push(`${k} · ${c}: ${x ? 'only on master' : 'only on the branch'} → ${JSON.stringify(x || y).slice(0, 160)}`); continue; }
        for (const f of ['overlays', 'panel', 'house', 'saved', 'navigated']) if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) diffs.push(`${k} · ${c}: ${f} ${JSON.stringify(x[f])} → ${JSON.stringify(y[f])}`.slice(0, 400));
      }
    }
    for (const k of Object.keys(B)) if (!M[k]) diffs.push(`${k}: only on the branch`);
    console.log('\n-- focus after opening (2.1: the first field or the main button)');
    for (const k of Object.keys(B)) if (B[k] && B[k].controls) console.log(`   ${k.padEnd(26)} master ${M[k] && M[k].focus}  branch ${B[k].focus}`);
    console.log(`\n-- differences (${diffs.length})`); diffs.forEach(d => console.log('   ' + d));
    console.log(`\nSTATES9: ${diffs.length ? `${diffs.length} differences (each must be an expected change, PHASE9.md §3)` : 'PASS: master and the branch equal'}`);
    process.exitCode = diffs.length ? 1 : 0;
  } finally { fs.writeFileSync(path.join(OUT, 'states9.json'), JSON.stringify({ ...out, diffs }, null, 1)); await b.close(); await C.cleanup(); }
})();
