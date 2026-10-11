// Redesign guard: WCAG text contrast on all 46 panels (plus the shell: header, tab bar, a toast), at 390x844, on the
// local build with a fresh signed-in test account (deleted at exit), in Light and in Dark.
// For each visible element with its own text: its colour against the effective background, found by walking up the
// ancestors and compositing alpha (opacity included). A gradient counts as its worst colour stop; only an image is
// "unknown". Thresholds: 4.5:1, or 3:1 for text ≥24px, or ≥18.66px and bold. Disabled controls are listed apart
// (WCAG 1.4.3 exempts inactive components) and don't fail.
// Output: JSON, plus a per-panel table of fails under 3, fails between 3 and 4.5, and unknown.
// Usage: node scripts/design-verify/contrast.js [--base <git ref>] [--themes light,dark] [--json <file>]
//   --base master serves master's deploy/index.html (the baseline: Dark only, master has no Light theme).
const path = require('path'), fs = require('fs');
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base'), THEMES = (arg('--themes') || (BASE ? 'dark' : 'light,dark')).split(',');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const JSON_OUT = arg('--json') || path.join(__dirname, 'logs', `contrast-${BASE ? BASE.replace(/\W/g, '_') : 'branch'}-${stamp}.json`);

// Runs in the page: every visible element with its own text inside `root`.
function measure(rootSel) {
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); if (!a) return [0, 0, 0, 0]; return [0, 1, 2].map(i => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a); };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // a canvas to resolve any CSS colour (color-mix, oklch…) to rgba
  const cv = document.createElement('canvas').getContext('2d');
  const resolve = s => { if (/^rgba?\(/.test(s)) return parse(s); cv.fillStyle = '#000'; cv.fillStyle = s; const v = cv.fillStyle; if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1]; return parse(v); };
  const stops = img => { // colour stops of the gradients in a background-image
    const out = []; const re = /(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b|\b(?:transparent|white|black)\b)/g; let m;
    while ((m = re.exec(img))) out.push(m[1] === 'transparent' ? [0, 0, 0, 0] : resolve(m[1]));
    return out.filter(Boolean);
  };
  const visible = el => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || +s.opacity === 0) return false;
      if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') return false;
    }
    const r = el.getBoundingClientRect(); return r.width >= 2 && r.height >= 2;
  };
  const path = el => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 4; e = e.parentElement) p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')); return p.join(' > '); };
  const roots = [...document.querySelectorAll(rootSel)];
  const out = [];
  for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
    if (/^(SCRIPT|STYLE|OPTION|NOSCRIPT|TEMPLATE|svg|SVG|TITLE)$/.test(el.tagName) || el.closest('svg') && el.tagName !== 'text') continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (!own || !/[\p{L}\p{N}]/u.test(own)) continue;
    if (!visible(el)) continue;
    const st = getComputedStyle(el);
    let fg = resolve(el.tagName === 'text' ? st.fill : st.color); if (!fg) continue;
    // text alpha: its own colour alpha times the opacity of every element up to the backdrop
    let alpha = fg[3], layers = [], unknown = false;
    // SVG text sits on a shape drawn before it (a sibling, not an ancestor): the topmost earlier shape under its centre
    if (el.tagName === 'text' && el.ownerSVGElement) {
      const tr = el.getBoundingClientRect(), cx = tr.x + tr.width / 2, cy = tr.y + tr.height / 2;
      let shape = null;
      for (const s of el.ownerSVGElement.querySelectorAll('rect,circle,ellipse,polygon,path')) {
        if (s.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) break; // after the text: drawn on top
        const r = s.getBoundingClientRect(), ss = getComputedStyle(s);
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom && ss.fill && ss.fill !== 'none' && ss.display !== 'none') shape = s;
      }
      if (shape) {
        const ss = getComputedStyle(shape), c = resolve(ss.fill);
        if (/url\(/.test(ss.fill)) unknown = true;
        else if (c) layers.push({ stops: [[c[0], c[1], c[2], c[3] * +ss.fillOpacity * +ss.opacity]] });
      }
    }
    for (let e = el; e && e.nodeType === 1 && !unknown; e = e.parentElement) {
      const s = getComputedStyle(e);
      alpha *= +s.opacity;
      const img = s.backgroundImage;
      if (img && img !== 'none') {
        if (/url\(/.test(img)) { unknown = true; break; }
        const ss = stops(img); if (ss.length) layers.push({ stops: ss });
      }
      const bg = resolve(s.backgroundColor); if (bg && bg[3] > 0) layers.push({ stops: [bg] });
      if (layers.length && layers[layers.length - 1].stops.every(c => c[3] >= 1) && layers[layers.length - 1].stops.length === 1) break;
    }
    const size = parseFloat(st.fontSize), bold = +st.fontWeight >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const disabled = el.closest('button:disabled, [aria-disabled="true"], input:disabled, select:disabled, fieldset:disabled') !== null;
    const item = { text: own.slice(0, 60), path: path(el), size, weight: +st.fontWeight, need, disabled };
    if (unknown) { out.push({ ...item, status: 'unknown', why: 'background image' }); continue; }
    // composite bottom-up from white (the canvas); a gradient branches over its stops
    let bgs = [[255, 255, 255, 1]];
    for (const L of layers.reverse()) { const next = []; for (const b of bgs) for (const c of L.stops) next.push(over(c, b)); bgs = next.slice(0, 64); }
    let worst = null;
    for (const b of bgs) { const f = over([fg[0], fg[1], fg[2], alpha], b), r = ratio(f, b); if (!worst || r < worst.r) worst = { r, f, b }; }
    const r = Math.round(worst.r * 100) / 100, hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    out.push({ ...item, ratio: r, fg: hex(worst.f), bg: hex(worst.b), status: r >= need ? 'pass' : r < 3 ? 'fail<3' : 'fail3-4.5' });
  }
  return out;
}

(async () => {
  const dir = C.buildDir(BASE);
  const b = await C.chromium.launch();
  const report = { base: BASE || 'working copy', at: new Date().toISOString(), viewport: '390x844', themes: {} };
  try {
    console.log(`== contrast · ${BASE || 'branch (working copy)'} · ${THEMES.join(', ')}`);
    const { ctx, page, errors } = await C.openPage(b, { dir, theme: THEMES[0] });
    await C.signUp(page, 'dvc');
    const state = await ctx.storageState(); await ctx.close();
    for (const theme of THEMES) {
      const { ctx, page } = await C.openPage(b, { dir, theme, storageState: state });
      await C.clearOverlays(page);
      const keys = await C.panelKeys(page), panels = {};
      // the shell, and a toast
      await C.showPanel(page, 'home');
      panels['shell: header'] = await page.evaluate(measure, 'header.shell-topbar');
      panels['shell: tab bar'] = await page.evaluate(measure, 'nav.shell-bottomnav');
      await page.evaluate(() => { showToast('Saved to your progress'); showToast('Microphone is busy', 'warn'); });
      await C.sleep(400);
      panels['shell: toast'] = await page.evaluate(measure, '#appToastWrap');
      for (const k of keys) {
        const shown = await C.showPanel(page, k); await C.clearOverlays(page);
        panels[k] = shown ? await page.evaluate(measure, `#panel-${k}`) : [{ status: 'unknown', why: 'panel did not open', text: '', path: '' }];
      }
      await ctx.close();
      report.themes[theme] = panels;
      // table
      console.log(`\n-- ${theme}: panel                       fail<3  fail3-4.5  unknown  checked`);
      const tot = { 'fail<3': 0, 'fail3-4.5': 0, unknown: 0, n: 0 };
      for (const [k, items] of Object.entries(panels)) {
        const counted = items.filter(i => !i.disabled);
        const n = s => counted.filter(i => i.status === s).length;
        tot['fail<3'] += n('fail<3'); tot['fail3-4.5'] += n('fail3-4.5'); tot.unknown += n('unknown'); tot.n += counted.length;
        console.log(`   ${k.padEnd(36)} ${String(n('fail<3')).padStart(6)} ${String(n('fail3-4.5')).padStart(10)} ${String(n('unknown')).padStart(8)} ${String(counted.length).padStart(8)}`);
      }
      console.log(`   ${'TOTAL'.padEnd(36)} ${String(tot['fail<3']).padStart(6)} ${String(tot['fail3-4.5']).padStart(10)} ${String(tot.unknown).padStart(8)} ${String(tot.n).padStart(8)}`);
      report.themes[theme].__totals = tot;
    }
    if (errors.length) console.log(`page errors: ${errors.slice(0, 3).join(' | ')}`);
  } finally {
    await b.close();
    fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
    fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
    console.log(`json: ${path.relative(C.ROOT, JSON_OUT)}`);
    C.cleanup();
  }
})();
