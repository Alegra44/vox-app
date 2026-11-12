// PHASE10.md A2: the tour and its audits, on the working copy. Every screen and state at 390, 768 and 1280 wide, Light
// and Dark, a full-page shot each (contact sheets: sheet10.js), and on each screen, in the page:
//   b) rule 1: every visible element whose computed colour, background, border colour, or SVG fill/stroke is the voice
//      colour (--hl-voice of the theme), with its path and text (classified by hand in PHASE10_SURVEY.md)
//   c) touch targets: every visible interactive element smaller than 44 × 44 px, except a link inside running text
//   d) names: every button, link, input, select, textarea, [role=button|link|tab|switch|checkbox|img], img and
//      non-hidden svg without an accessible name (aria-labelledby, aria-label, its text, alt, title, a <label>, an svg
//      <title>); and (the language pass, 390 Light) every aria-label that reads the same in fr / es / tr as in English
//   e) focus (1280, Light and Dark): Tab from the top of the page or the sheet, 40 presses: a focus that is invisible
//      (no outline, box-shadow, border, background or colour change against the same element blurred; or the element
//      is off screen / hidden), lost (focus on <body>, or out of an open sheet), or stuck (the same element twice in a
//      row); and for each sheet: opened while a button outside it has focus, closed with Escape, is focus back on it?
//   f) reduced motion (390 Light, prefers-reduced-motion: reduce): every animation still running (document.getAnimations,
//      longer than 0.01 s) and every visible element with a transition or animation longer than 0.01 s
//   g) leftovers: legacy CSS variables (the :root custom properties without the --hl- prefix) a visible element really
//      uses (a rule that matches it sets a property through the variable and the element's computed value is that);
//      and per stylesheet rule whether its selector (pseudo-classes removed) matched any element on any screen
// The screens: the 46 panels (the five hubs signed out, new and active; every other panel active, the Teacher Dashboard
// skipped: hidden since phase 9), the Vocal World game pages and the Skill Tree (phase 8), and every sheet of phase 9
// (screens9.js SCREENS and SCREENS_91, in their states). Game stages and results: shots8.js --combos 768-light,768-dark.
// Out: <out>/<w>-<theme>/<screen>-<state>.jpg, <out>/audit.json. Signed in through a test account (deleted at exit);
// states are set in the page only (youSeed.js, screens9.js stateInPage), nothing is saved.
// --ref <git ref> tours that commit's deploy/ instead of the working copy (the gates of PHASE10.md B1/B2: before vs after).
// Usage: node scripts/design-verify/tour10.js [--ref <ref>] [--out <dir>] [--combos 390-light,…] [--only key,key] [--passes shots,focus,motion,lang]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), { seedInPage } = require('./youSeed'), S9 = require('./screens9');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-tour10');
const COMBOS = (arg('--combos') || '390-light,390-dark,768-light,768-dark,1280-light,1280-dark').split(',').map(c => c.split('-'));
const PASSES = (arg('--passes') || 'shots,focus,motion,lang').split(',');
const DIR = C.buildDir(arg('--ref'));
const HIT = process.argv.includes('--hit'); // c) by hit-testing (targets.js); off by default: it scrolls, so the shots of a gate stay as before
const ONLY = arg('--only') ? arg('--only').split(',') : null;
const SIZES = { 390: { width: 390, height: 844 }, 768: { width: 768, height: 1024 }, 1280: { width: 1280, height: 900 } };
const Q = { type: 'jpeg', quality: 72 };
const HUBS = { home: 'home', 'train-hub': 'train', 'songs-hub': 'songs', 'you-hub': 'you' };

// ---- the screen list ----
function screens(panelIds) {
  const list = [];
  for (const p of panelIds) {
    if (p === 'teacher') continue; // hidden since phase 9: nothing opens it
    const hub = p in HUBS || p === 'arcade';
    list.push({ key: `panel-${p}`, open: p in HUBS ? `showShellSection('${HUBS[p]}')` : `enterPanel('${p}')`, panel: p, root: `#panel-${p}`,
      states: hub ? ['signedout', 'new', 'active'] : ['active'], group: 'panel' });
  }
  for (const g of ['glider', 'bridge', 'boss', 'harmony', 'rift', 'skilltree'])
    list.push({ key: `world-${g}`, open: `enterPanel('arcade'); showArcadeGame('${g}')`, panel: 'arcade', root: '#panel-arcade', states: ['active'], group: 'world' });
  for (const s of [...S9.SCREENS, ...S9.SCREENS_91]) list.push({ ...s, key: `sheet-${s.key}`, group: 'sheet' });
  return list.filter(s => !ONLY || ONLY.some(o => s.key === o || s.key.endsWith('-' + o)));
}

// ---- in the page: the audits b, c, d, g on the current screen ----
function AUDIT(arg) {
  const { rootSel, legacy, hit: hitTest } = arg;
  const root = (rootSel && document.querySelector(rootSel)) || document.body;
  const vis = e => { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    for (let a = e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || +s.opacity === 0) return false; } return true; };
  const pth = e => { const p = []; for (let a = e; a && a !== document.body && p.length < 5; a = a.parentElement) p.unshift(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList.length ? '.' + [...a.classList].slice(0, 2).join('.') : '')); return p.join(' > '); };
  const txt = e => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  // the scope: the root, plus the shell (header and tab bar) for a panel
  const scope = [root, ...(rootSel && rootSel.startsWith('#panel-') ? [...document.querySelectorAll('header.shell-topbar, nav.shell-bottomnav, .shell-topbar, .shell-bottomnav')] : [])];
  const all = [...new Set(scope.flatMap(r => [r, ...r.querySelectorAll('*')]))].filter(e => !(e instanceof SVGElement) || e.tagName === 'svg' || ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text'].includes(e.tagName));
  const visible = all.filter(vis);
  // b) the voice colour
  const probe = document.createElement('span'); probe.style.cssText = 'color:var(--hl-voice);position:absolute;'; document.body.appendChild(probe);
  const voice = getComputedStyle(probe).color; probe.remove();
  const voiceHits = [];
  for (const e of visible) {
    const cs = getComputedStyle(e), props = [];
    if (cs.color === voice && (e instanceof SVGElement ? false : txt(e).length > 0 && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))) props.push('color');
    if (cs.backgroundColor === voice) props.push('background');
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (+parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none' && cs[`border${side}Color`] === voice) { props.push('border'); break; }
    if (e instanceof SVGElement) { if (cs.fill === voice) props.push('fill'); if (cs.stroke === voice && cs.strokeWidth !== '0px') props.push('stroke'); }
    if (cs.boxShadow && cs.boxShadow !== 'none' && cs.boxShadow.includes(voice)) props.push('shadow');
    if (cs.accentColor === voice && e.matches('input, progress, meter')) props.push('accent');
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && cs.outlineColor === voice && document.activeElement !== e) props.push('outline');
    if (props.length) voiceHits.push({ path: pth(e), text: txt(e), props });
  }
  // c) touch targets
  const INTERACTIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [tabindex]:not([tabindex="-1"])';
  const inter = visible.filter(e => e.matches(INTERACTIVE) && !e.disabled);
  const inRunningText = e => { if (e.tagName !== 'A') return false; const cs = getComputedStyle(e); if (!cs.display.startsWith('inline')) return false;
    const p = e.parentElement; return !!p && [...p.childNodes].some(n => n !== e && n.nodeType === 3 && n.textContent.trim().length > 2); };
  const small = [];
  for (const e of inter) {
    if (inRunningText(e)) continue;
    // a visually hidden input inside a label: the label is the target
    let t = e; if (e.tagName === 'INPUT' && ['checkbox', 'radio', 'range', 'file'].includes(e.type) === false && e.closest('label')) t = e.closest('label');
    if ((e.tagName === 'INPUT' && ['checkbox', 'radio'].includes(e.type)) && e.closest('label')) t = e.closest('label');
    let r = t.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if ((r.width < 44 || r.height < 44) && !hitTest) small.push({ path: pth(e), text: txt(e) || e.getAttribute('aria-label') || '', w: Math.round(r.width), h: Math.round(r.height) });
    else if (r.width < 44 || r.height < 44) {
      // hitRect: a control can keep a small look and take its 44 px from padding or a ::before/::after box. Hit-test it:
      // in view, the points 21.5 px left, right, above and below its centre must all land on it (on a neighbour = overlap)
      t.scrollIntoView({ block: 'center', inline: 'center' }); r = t.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const on = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === t || t.contains(h) || h === e || (h.tagName === 'LABEL' && h.control === e)); };
      const hit = on(cx - 21.5, cy) && on(cx + 21.5, cy) && on(cx, cy - 21.5) && on(cx, cy + 21.5);
      if (!hit) small.push({ path: pth(e), text: txt(e) || e.getAttribute('aria-label') || '', w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  // d) names
  const nameOf = e => {
    const lb = e.getAttribute('aria-labelledby'); if (lb) { const s = lb.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim(); if (s) return s; }
    const al = (e.getAttribute('aria-label') || '').trim(); if (al) return al;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName)) {
      if (e.id) { const l = document.querySelector(`label[for="${CSS.escape(e.id)}"]`); if (l && l.textContent.trim()) return l.textContent.trim(); }
      const wl = e.closest('label'); if (wl && wl.textContent.trim()) return wl.textContent.trim();
      if (e.type === 'submit' || e.type === 'button') return (e.value || '').trim();
      return (e.getAttribute('title') || '').trim(); // a placeholder is not a name
    }
    if (e.tagName === 'IMG') return (e.getAttribute('alt') !== null ? e.getAttribute('alt') : null) ?? '';
    if (e.tagName.toLowerCase() === 'svg') { const ti = e.querySelector('title'); return ti ? ti.textContent.trim() : ''; }
    let s = ''; const walk = n => { if (n.nodeType === 3) { s += n.textContent; return; } if (n.nodeType !== 1) return; if (n.getAttribute('aria-hidden') === 'true') return;
      const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (n.tagName === 'IMG') { s += ' ' + (n.getAttribute('alt') || ''); return; } if (n !== e && n.getAttribute('aria-label')) { s += ' ' + n.getAttribute('aria-label'); return; }
      if (n.tagName.toLowerCase() === 'svg') { const ti = n.querySelector('title'); if (ti) s += ' ' + ti.textContent; return; } n.childNodes.forEach(walk); };
    walk(e); s = s.trim(); return s || (e.getAttribute('title') || '').trim();
  };
  const NAMED = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="img"], img, svg';
  const noName = [];
  for (const e of visible) {
    if (!e.matches(NAMED)) continue;
    if (e.tagName.toLowerCase() === 'svg' && (e.getAttribute('aria-hidden') === 'true' || e.closest('[aria-hidden="true"]') || (!e.getAttribute('role') && e.closest('a, button, [role="button"], [role="link"], label')))) continue;
    if (e.tagName.toLowerCase() === 'svg' && !e.getAttribute('role') && !e.querySelector('title')) { // an unlabelled decorative svg outside a control: listed, it should be aria-hidden
      noName.push({ path: pth(e), what: 'svg not hidden, no role or title' }); continue; }
    if (e.tagName === 'IMG' && e.getAttribute('alt') === '') continue; // decorative image, said so
    if (e.closest('[aria-hidden="true"]')) continue;
    if (!nameOf(e)) noName.push({ path: pth(e), what: e.tagName.toLowerCase() + (e.getAttribute('role') ? `[role=${e.getAttribute('role')}]` : '') + (e.type ? `[type=${e.type}]` : '') });
  }
  const ariaLabels = visible.filter(e => e.hasAttribute('aria-label')).map(e => ({ path: pth(e), label: e.getAttribute('aria-label') }));
  // g) legacy variables really in use, and which rules matched
  const legacyUse = [], matched = [];
  const rules = []; const collect = (list, sheetI) => { for (const r of list) { if (r.type === 1) rules.push(r); else if (r.cssRules && (r.type === 4 || r.type === 12 || r.type === 13 || r.constructor.name === 'CSSLayerBlockRule')) collect(r.cssRules, sheetI); } };
  [...document.styleSheets].forEach((sh, i) => { try { collect(sh.cssRules, i); } catch (e) {} });
  const strip = sel => sel.replace(/::?(hover|focus|focus-visible|focus-within|active|visited|before|after|placeholder|selection|first-letter|first-line|marker|-webkit-[a-z-]+|-moz-[a-z-]+|backdrop|disabled|checked|enabled|target)(\([^)]*\))?/g, '').replace(/:not\(\s*\)/g, '').trim() || '*';
  rules.forEach((r, i) => {
    let hit = false; try { hit = !!document.querySelector(strip(r.selectorText)); } catch (e) { hit = null; }
    if (hit) matched.push(i);
    if (!hit || !legacy.length) return;
    for (const prop of r.style) {
      const v = r.style.getPropertyValue(prop); const lv = legacy.find(n => v.includes(`var(${n})`) || v.includes(`var(${n},`)); if (!lv) continue;
      let els = []; try { els = [...root.querySelectorAll(strip(r.selectorText))].filter(vis).slice(0, 3); } catch (e) {}
      for (const el of els) {
        const pr = document.createElement(el.tagName === 'svg' || el instanceof SVGElement ? 'span' : 'span'); pr.style.setProperty(prop, v); pr.style.position = 'absolute'; pr.style.visibility = 'hidden';
        (el instanceof SVGElement ? document.body : el).appendChild(pr); const want = getComputedStyle(pr).getPropertyValue(prop); pr.remove();
        if (want && getComputedStyle(el).getPropertyValue(prop) === want) { legacyUse.push({ v: lv, prop, sel: r.selectorText.slice(0, 120), path: pth(el) }); break; }
      }
    }
  });
  if (hitTest) window.scrollTo(0, 0), document.querySelectorAll('.modal-overlay, .share-overlay, .levelup-overlay').forEach(o => { o.scrollTop = 0; });
  return { voice, voiceHits, small, noName, ariaLabels, legacyUse, matched, ruleCount: rules.length };
}
// the legacy variables: :root custom properties without the --hl- prefix
function LEGACY() {
  const names = new Set(); const walk = list => { for (const r of list) { if (r.type === 1 && /(^|,)\s*:root\b/.test(r.selectorText)) for (const p of r.style) if (p.startsWith('--') && !p.startsWith('--hl-')) names.add(p); if (r.cssRules) walk(r.cssRules); } };
  [...document.styleSheets].forEach(s => { try { walk(s.cssRules); } catch (e) {} });
  const rules = []; const collect = list => { for (const r of list) { if (r.type === 1) rules.push(r.selectorText); else if (r.cssRules && r.type !== 7) collect(r.cssRules); } };
  [...document.styleSheets].forEach(s => { try { collect(s.cssRules); } catch (e) {} });
  return { legacy: [...names], rules };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const audit = { started: new Date().toISOString(), combos: {}, focus: {}, motion: {}, lang: {}, rules: null, legacy: null, errors: {} };
  const save = () => fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(audit));
  try {
    // sign-up on the production backend times out now and then (Supabase): one more try on a fresh page
    let a = await C.openPage(b, { dir: DIR });
    try { await C.signUp(a.page, 'dvtour', 'Alex Rivera'); }
    catch (e) { console.log(`  sign-up failed (${String(e).split('\n')[0]}), trying once more`); await a.ctx.close(); a = await C.openPage(b, { dir: DIR }); await C.signUp(a.page, 'dvtour', 'Alex Rivera'); }
    const state = await a.ctx.storageState();
    const panelIds = await C.panelKeys(a.page); const meta = await a.page.evaluate(LEGACY); audit.legacy = meta.legacy; audit.rules = meta.rules;
    await a.ctx.close();
    const SCR = screens(panelIds); audit.screens = SCR.map(s => s.key);
    console.log(`== tour10 · ${SCR.length} screens (${SCR.reduce((n, s) => n + s.states.length, 0)} screen-states) × ${COMBOS.length} combos → ${OUT}`);
    const STATES = ['signedout', 'new', 'active', 'expired', 'teacher'];
    const openState = (st, o) => C.G.step(`open ${st}`, 60, () => openState_(st, o)); // normally 5–8 s
    const openState_ = async (st, { theme, viewport, reducedMotion, lang }) => {
      const signed = st !== 'signedout';
      const o = await C.openPage(b, { dir: DIR, theme, viewport, reducedMotion, storageState: signed ? state : undefined });
      await o.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await C.clearOverlays(o.page);
      if (signed) await o.page.evaluate(seedInPage, st === 'new' ? 'new' : 'active');
      await o.page.evaluate(S9.stateInPage, st);
      if (lang && lang !== 'en') await o.page.evaluate(l => setLanguage(l), lang);
      return o;
    };
    const show = async (page, sc) => {
      await page.evaluate(S9.resetInPage); await page.evaluate(() => { showShellSection('home'); window.scrollTo(0, 0); });
      const err = await page.evaluate(code => { try { (0, eval)(code); return null; } catch (e) { return String(e); } }, sc.open);
      if (sc.then) await page.evaluate(code => (0, eval)(code), sc.then).catch(() => null);
      await C.sleep(sc.wait || 900); await page.evaluate(() => window.scrollTo(0, 0));
      return err;
    };
    // pass 1: shots and audits b, c, d, g per combo
    if (PASSES.includes('shots')) for (const [w, theme] of COMBOS) {
      const combo = `${w}-${theme}`, d = path.join(OUT, combo); fs.mkdirSync(d, { recursive: true }); audit.combos[combo] = {};
      for (const st of STATES) {
        const list = SCR.filter(s => s.states.includes(st)); if (!list.length) continue;
        const { ctx, page, errors } = await openState(st, { theme, viewport: SIZES[w] });
        try {
          for (const sc of list) await C.G.step(`${combo} ${sc.key}-${st}`, 30, async () => { // normally 1–3 s
            const name = `${sc.key}-${st}`;
            if (sc.skipIf && await page.evaluate(sc.skipIf)) return;
            const err = await show(page, sc);
            const r = await page.evaluate(AUDIT, { rootSel: sc.root, legacy: audit.legacy, hit: HIT }).catch(e => ({ error: String(e) }));
            const on = await page.evaluate(S9.openOverlays);
            audit.combos[combo][name] = { ...r, open: on, openError: err, pageErrors: errors.splice(0) };
            // at narrow widths the fixed tab bar is moved below the page's end, so it doesn't cover the middle of a long page
            await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n && innerWidth < 960 && !document.querySelector('.modal-overlay[style*="flex"], .share-overlay[style*="flex"], .levelup-show')) { const h = document.documentElement.scrollHeight; n.style.position = 'absolute'; n.style.top = h + 'px'; n.style.bottom = 'auto'; } });
            await page.screenshot({ path: path.join(d, name + '.jpg'), fullPage: sc.group !== 'sheet', ...Q });
            await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n) { n.style.position = ''; n.style.top = ''; n.style.bottom = ''; } });
          });
        } finally { await ctx.close(); }
        save();
      }
      console.log(`  ${combo}: ${Object.keys(audit.combos[combo]).length} shots`);
    }
    // pass 2: focus (e), 1280 Light and Dark
    if (PASSES.includes('focus')) for (const theme of ['light', 'dark']) {
      const combo = `1280-${theme}`; audit.focus[combo] = {};
      for (const st of STATES) {
        const list = SCR.filter(s => s.states.includes(st)); if (!list.length) continue;
        const { ctx, page } = await openState(st, { theme, viewport: SIZES[1280] });
        try {
          for (const sc of list) await C.G.step(`focus ${combo} ${sc.key}-${st}`, 30, async () => {
            if (sc.skipIf && await page.evaluate(sc.skipIf)) return;
            const isSheet = !!sc.overlay;
            // the opener for the return test: a tab-bar button outside the sheet, focused before it opens
            await page.evaluate(S9.resetInPage); await page.evaluate(() => { showShellSection('home'); window.scrollTo(0, 0); });
            if (isSheet) await page.evaluate(() => { const o = document.querySelector('.shell-topnav button, nav.shell-bottomnav button, .shell-topbar button'); window.__opener = o; if (o) o.focus(); });
            await page.evaluate(code => { try { (0, eval)(code); } catch (e) {} }, sc.open); if (sc.then) await page.evaluate(code => (0, eval)(code), sc.then).catch(() => null);
            await C.sleep(sc.wait || 900);
            if (!isSheet) await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
            const steps = [];
            for (let i = 0; i < 40; i++) {
              await page.keyboard.press('Tab'); await C.sleep(60);
              steps.push(await page.evaluate(({ rootSel, isSheet }) => {
                const e = document.activeElement, root = rootSel && document.querySelector(rootSel);
                const pth = e => { if (!e) return 'null'; const p = []; for (let a = e; a && a !== document.body && p.length < 4; a = a.parentElement) p.unshift(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList.length ? '.' + [...a.classList].slice(0, 2).join('.') : '')); return p.join(' > ') || e.tagName.toLowerCase(); };
                // identity: a counter per element (siblings share a path); the tabbable list in DOM order, to tell a wrap from a loss
                window.__fid = window.__fid || 0; const idOf = el => el.__fid || (el.__fid = ++window.__fid);
                const scopeEl = isSheet && root ? root : document.body;
                const tabbables = [...scopeEl.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
                const lastId = tabbables.length ? idOf(tabbables[tabbables.length - 1]) : 0;
                if (!e || e === document.body || e === document.documentElement) return { p: 'body', id: 0, lost: true, lastId };
                const look = el => { const cs = getComputedStyle(el); return [cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? 'o' + cs.outlineWidth + cs.outlineColor : '', cs.boxShadow, cs.borderTopColor, cs.borderBottomColor, cs.backgroundColor, cs.color, cs.textDecorationLine].join('|'); };
                const on = look(e); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
                const hidden = r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || +cs.opacity === 0 || r.bottom < 0 || r.right < 0 || r.left > innerWidth || r.top > Math.max(innerHeight, document.documentElement.scrollHeight);
                e.blur(); const off = look(e); e.focus({ preventScroll: true });
                const outside = isSheet && root && !root.contains(e);
                return { p: pth(e), id: idOf(e), invisible: on === off, hidden, outside, lastId, n: tabbables.length };
              }, { rootSel: sc.root, isSheet }));
            }
            const issues = { invisible: [], hidden: [], lost: 0, outside: [], stuck: [] };
            // lost: focus on the body when the step before was not the scope's last tabbable (after it, the body is the normal wrap)
            // stuck: the same element on two Tabs in a row
            steps.forEach((s, i) => { const prev = steps[i - 1];
              if (s.lost && !(prev && !prev.lost && prev.id === prev.lastId) && !(prev && prev.lost)) issues.lost++;
              if (s.invisible) issues.invisible.push(s.p); if (s.hidden) issues.hidden.push(s.p); if (s.outside) issues.outside.push(s.p);
              if (prev && !s.lost && s.id === prev.id) issues.stuck.push(s.p); });
            for (const k of ['invisible', 'hidden', 'outside', 'stuck']) issues[k] = [...new Set(issues[k])];
            let ret = null;
            if (isSheet) {
              await page.keyboard.press('Escape'); await C.sleep(500);
              ret = await page.evaluate(id => { const o = document.getElementById(id); const cs = o && getComputedStyle(o); const open = !!o && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && (!o.classList.contains('levelup-overlay') || o.classList.contains('levelup-show'));
                const e = document.activeElement; return { closedByEscape: !open, back: !!window.__opener && e === window.__opener, opener: window.__opener ? (window.__opener.id || window.__opener.className) : null, now: e ? (e.id || e.tagName + '.' + e.className).slice(0, 60) : null }; }, sc.overlay);
            }
            audit.focus[combo][`${sc.key}-${st}`] = { steps: steps.length, distinct: new Set(steps.map(s => s.id)).size, controls: Math.max(0, ...steps.map(s => s.n || 0)), seq: steps.map(s => s.id).join(','), ...issues, return: ret, overlay: isSheet };
          });
        } finally { await ctx.close(); }
        save();
      }
      console.log(`  focus ${combo}: ${Object.keys(audit.focus[combo]).length} screens`);
    }
    // pass 3: reduced motion (f), 390 Light
    if (PASSES.includes('motion')) {
      for (const st of STATES) {
        const list = SCR.filter(s => s.states.includes(st)); if (!list.length) continue;
        const { ctx, page } = await openState(st, { theme: 'light', viewport: SIZES[390], reducedMotion: 'reduce' });
        try {
          for (const sc of list) await C.G.step(`motion ${sc.key}-${st}`, 30, async () => {
            if (sc.skipIf && await page.evaluate(sc.skipIf)) return;
            await show(page, sc);
            audit.motion[`${sc.key}-${st}`] = await page.evaluate(rootSel => {
              const pth = e => { const p = []; for (let a = e; a && a !== document.body && p.length < 4; a = a.parentElement) p.unshift(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList.length ? '.' + [...a.classList].slice(0, 2).join('.') : '')); return p.join(' > '); };
              const sec = v => Math.max(...v.split(',').map(x => x.trim().endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x) || 0));
              const running = document.getAnimations().filter(a => a.playState === 'running').map(a => { const t = a.effect && a.effect.getTiming(); const dur = t ? (typeof t.duration === 'number' ? t.duration : 0) : 0;
                return { name: a.animationName || a.transitionProperty || a.constructor.name, ms: Math.round(dur), iter: t && t.iterations, path: a.effect && a.effect.target ? pth(a.effect.target) : '' }; }).filter(a => a.ms > 10);
              const root = (rootSel && document.querySelector(rootSel)) || document.body; const trans = [];
              for (const e of [root, ...root.querySelectorAll('*')]) { if (!e.getClientRects().length) continue; const cs = getComputedStyle(e);
                const td = sec(cs.transitionDuration), ad = cs.animationName !== 'none' ? sec(cs.animationDuration) : 0;
                if (td > 0.01 || ad > 0.01) trans.push({ path: pth(e), transition: td > 0.01 ? `${cs.transitionProperty} ${cs.transitionDuration}` : '', animation: ad > 0.01 ? `${cs.animationName} ${cs.animationDuration}` : '' }); }
              return { running, declared: trans };
            }, sc.root);
          });
        } finally { await ctx.close(); }
      }
      save(); console.log(`  motion: ${Object.keys(audit.motion).length} screens`);
    }
    // pass 4: names in fr / es / tr (d), 390 Light: aria-labels that read as in English
    if (PASSES.includes('lang')) {
      const en = audit.combos['390-light'] || {};
      for (const lang of ['fr', 'es', 'tr']) {
        audit.lang[lang] = {};
        for (const st of STATES) {
          const list = SCR.filter(s => s.states.includes(st) && !/-fr$/.test(s.key)); if (!list.length) continue;
          const { ctx, page } = await openState(st, { theme: 'light', viewport: SIZES[390], lang });
          try {
            for (const sc of list) await C.G.step(`lang ${sc.key}-${st}`, 30, async () => {
              if (sc.skipIf && await page.evaluate(sc.skipIf)) return;
              await show(page, sc); await page.evaluate(l => { if (typeof currentLanguage !== 'undefined' && currentLanguage !== l) setLanguage(l); }, lang); await C.sleep(200);
              const labels = await page.evaluate(rootSel => { const root = (rootSel && document.querySelector(rootSel)) || document.body; const scope = [root, ...document.querySelectorAll('.shell-topbar, nav.shell-bottomnav')];
                return [...new Set(scope.flatMap(r => [...r.querySelectorAll('[aria-label]'), ...(r.hasAttribute && r.hasAttribute('aria-label') ? [r] : [])]))].filter(e => e.getClientRects().length).map(e => e.getAttribute('aria-label')); }, sc.root);
              const enSet = new Set(((en[`${sc.key}-${st}`] || {}).ariaLabels || []).map(x => x.label));
              const same = labels.filter(l => enSet.has(l) && /[A-Za-z]{3,}/.test(l) && !/^(VoxCoach|A\d|[A-G][#b]?\d)$/.test(l));
              if (same.length) audit.lang[lang][`${sc.key}-${st}`] = [...new Set(same)];
            });
          } finally { await ctx.close(); }
        }
      }
      save(); console.log(`  lang: ${Object.entries(audit.lang).map(([l, o]) => `${l} ${Object.keys(o).length} screens with English labels`).join(', ')}`);
    }
  } finally { audit.finished = new Date().toISOString(); save(); await b.close(); C.cleanup(); }
  console.log(`tour10: ${OUT}`);
})();
