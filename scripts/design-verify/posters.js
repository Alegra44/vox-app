// PHASE9.md 1e: the two share posters, on the working copy (or --base <ref>, or DV_URL). Signed in (a test account,
// Level 7 seed in the page only), at 390 wide with a device scale of 2 (so a screenshot of the poster has the export's
// pixels), Light and Dark, in English, French, Spanish and Turkish. Per poster:
//   opens from its own button (Range Finder's "Share this result" with a measured range; Progress's "Share my recap");
//   Download (the app's own button) makes a PNG: not blank (more than one colour, under 98% of one colour), at the
//   poster's size ×2 (±2 px each way), and equal to a screenshot of the poster on screen: under 5% of pixels differ
//   (a pixel differs when any channel is more than 24 apart; both images are saved for looking at);
//   the text is right: every [data-i18n] inside the poster reads t(key) in the page's language, nothing else on it reads
//   as English in fr/es/tr, the recap's month is Intl's month name in the page's language;
//   Download and Close are readable on the scrim (contrast.js's measure: 4.5:1 or better);
//   Close closes it. No page errors; no toast says the export failed.
// Out: <out>/<theme>-<lang>-<poster>-{screen,export}.png, posters.json. Usage: node scripts/design-verify/posters.js
//      [--base <ref>] [--out <dir>] [--langs en,fr,es,tr] [--themes light,dark]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const { seedInPage } = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-posters'); const DIR = arg('--base') ? C.buildDir(arg('--base')) : C.REMOTE || C.DEPLOY;
const LANGS = (arg('--langs') || 'en,fr,es,tr').split(','), THEMES = (arg('--themes') || 'light,dark').split(',');
const src = fs.readFileSync(path.join(__dirname, 'contrast.js'), 'utf8');
const MEASURE = src.slice(src.indexOf('async function measure('), src.indexOf('\n}\n', src.indexOf('async function measure(')) + 2);
const POSTERS = [
  { key: 'range', open: `enterPanel('range'); lowNote = {midi:45, name:'A', octave:2, freq:110}; highNote = {midi:69, name:'A', octave:4, freq:440}; document.getElementById('shareRangeBtn').click();`,
    overlay: 'shareRangeOverlay', poster: 'rangePoster', download: 'downloadRangePosterBtn', close: 'closeRangePosterBtn' },
  { key: 'recap', open: `enterPanel('dashboard'); document.getElementById('shareRecapBtn').click();`,
    overlay: 'shareRecapOverlay', poster: 'recapPoster', download: 'downloadRecapPosterBtn', close: 'closeRecapPosterBtn' },
];
const EN = /\b(the|your|you|and|this|month|voice|range|day|days|streak|sessions|widest|download|close|recap|reveal|what's)\b/i;
let fails = 0; const res = []; const check = (ok, s) => { res.push({ ok, s }); if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${s}`); };

// Runs in the page: compare two PNG data URLs pixel by pixel.
async function comparePng([a, b]) {
  const load = u => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
  const [A, B] = await Promise.all([load(a), load(b)]);
  const px = img => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  const pa = px(A), w = Math.min(A.naturalWidth, B.naturalWidth), h = Math.min(A.naturalHeight, B.naturalHeight);
  const cb = document.createElement('canvas'); cb.width = A.naturalWidth; cb.height = A.naturalHeight; const xb = cb.getContext('2d'); xb.drawImage(B, 0, 0, A.naturalWidth, A.naturalHeight); // B scaled to A's size
  const pb = xb.getImageData(0, 0, cb.width, cb.height).data;
  let diff = 0, n = A.naturalWidth * A.naturalHeight; const counts = new Map();
  for (let i = 0; i < pa.length; i += 4) {
    if (Math.abs(pa[i] - pb[i]) > 24 || Math.abs(pa[i + 1] - pb[i + 1]) > 24 || Math.abs(pa[i + 2] - pb[i + 2]) > 24 || Math.abs(pa[i + 3] - pb[i + 3]) > 24) diff++;
    const k = (pa[i] >> 3) << 10 | (pa[i + 1] >> 3) << 5 | (pa[i + 2] >> 3); counts.set(k, (counts.get(k) || 0) + 1);
  }
  const top = Math.max(...counts.values());
  return { aw: A.naturalWidth, ah: A.naturalHeight, bw: B.naturalWidth, bh: B.naturalHeight, diffPct: 100 * diff / n, colours: counts.size, topPct: 100 * top / n };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await C.chromium.launch();
  try {
    const a = await C.openPage(b, { dir: DIR }); await C.signUp(a.page, 'dvpo', 'Alex Rivera'); const state = await a.ctx.storageState(); await a.ctx.close();
    for (const theme of THEMES) for (const lang of LANGS) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: state, colorScheme: theme, acceptDownloads: true });
      // openPage's routing, at scale 2: reuse it through a page opened by openPage on this browser would lose the scale, so route here
      const page = await (async () => {
        const fsx = require('fs'); const site = /^https?:/.test(DIR) ? DIR : null;
        if (!site) await ctx.route(C.LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html', f = path.join(DIR, p);
          if (!fsx.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ path: f, contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
        await ctx.addInitScript(t => { try { localStorage.setItem('theme', t); } catch (e) {} }, theme);
        const p = await ctx.newPage(); await p.goto(site || C.LOCAL, { waitUntil: 'load' }); await C.sleep(2500);
        await p.waitForFunction(() => { try { return !!profile && !!progress; } catch (e) { return false; } }, null, { timeout: 30000 });
        const ov = p.locator(`#languageSelectOverlay [data-lang="${lang}"]`); if (await ov.isVisible().catch(() => false)) { await ov.click(); await C.sleep(300); }
        if (lang !== 'en') { await p.evaluate(l => setLanguage(l), lang); await C.sleep(300); }
        await C.applyTheme(p, theme); return p;
      })();
      const errors = []; page.on('pageerror', e => errors.push(String(e)));
      await C.clearOverlays(page); await page.evaluate(seedInPage, 'active');
      for (const po of POSTERS) {
        const tag = `${theme} ${lang} ${po.key}`;
        await page.evaluate(() => { const w = document.getElementById('appToastWrap'); if (w) w.innerHTML = ''; });
        await page.evaluate(code => (0, eval)(code), po.open); await C.sleep(800);
        const shown = await page.evaluate(id => getComputedStyle(document.getElementById(id)).display !== 'none', po.overlay);
        check(shown, `${tag}: opens from its button`);
        if (!shown) continue;
        const box = await page.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { w: r.width, h: r.height }; }, po.poster);
        const shot = await page.locator('#' + po.poster).screenshot({ animations: 'disabled' });
        fs.writeFileSync(path.join(OUT, `${theme}-${lang}-${po.key}-screen.png`), shot);
        const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
        await page.locator('#' + po.download).click();
        const d = await dl; let png = null;
        if (d) { const f = path.join(OUT, `${theme}-${lang}-${po.key}-export.png`); await d.saveAs(f); png = fs.readFileSync(f); }
        const toast = await page.evaluate(() => [...document.querySelectorAll('#appToastWrap *')].map(e => e.textContent.trim()).filter(Boolean).join(' | '));
        check(!!png && !toast, `${tag}: Download makes a PNG${png ? '' : ' (none)'}${toast ? ` · toast "${toast}"` : ''}`);
        if (png) {
          const c = await page.evaluate(comparePng, ['data:image/png;base64,' + png.toString('base64'), 'data:image/png;base64,' + shot.toString('base64')]);
          check(Math.abs(c.aw - 2 * box.w) <= 2 && Math.abs(c.ah - 2 * box.h) <= 2, `${tag}: ${c.aw}×${c.ah} px = the poster's ${box.w}×${box.h} ×2 (±2)`);
          check(c.colours > 1 && c.topPct < 98, `${tag}: not blank (${c.colours} colours, the commonest ${c.topPct.toFixed(1)}%)`);
          check(c.diffPct < 5, `${tag}: matches the screen: ${c.diffPct.toFixed(2)}% of pixels differ (screen ${c.bw}×${c.bh})`);
        }
        const text = await page.evaluate(([id, lang]) => {
          const p = document.getElementById(id), keyed = [...p.querySelectorAll('[data-i18n]')].map(e => ({ key: e.dataset.i18n, text: e.textContent.trim(), want: t(e.dataset.i18n) }));
          const bad = keyed.filter(k => k.text !== k.want && !(k.want.includes('<br>') && k.text === k.want.replace(/<br>/g, '')));
          const words = []; const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          for (let n; (n = w.nextNode());) { const s = n.textContent.trim(); if (s) words.push(s); }
          const month = new Date().toLocaleDateString(localeForLang(), { month: 'long' });
          return { keyed: keyed.length, bad, words, month, hasMonth: p.textContent.toLocaleLowerCase(localeForLang()).includes(month.toLocaleLowerCase(localeForLang())) /* textContent: innerText carries the label's uppercase, and Turkish İ/ı don't survive toLowerCase */ };
        }, [po.poster, lang]);
        check(text.keyed > 0 && !text.bad.length, `${tag}: ${text.keyed} keyed lines read t(key)${text.bad.length ? ' · wrong: ' + JSON.stringify(text.bad.slice(0, 3)) : ''}`);
        if (lang !== 'en') { const en = text.words.filter(s => EN.test(s) && !/^VoxCoach$/.test(s)); check(!en.length, `${tag}: nothing reads as English${en.length ? ': ' + en.join(' | ') : ''}`); }
        if (po.key === 'recap') check(text.hasMonth, `${tag}: the month from Intl ("${text.month}")`);
        const m = await page.evaluate(async ([src, sel]) => (await (0, eval)('(' + src + ')')(sel)).filter(i => i.status !== 'pass'), [MEASURE, `#${po.overlay} .share-actions`]).catch(e => [{ error: String(e) }]);
        check(!m.length, `${tag}: Download and Close readable on the scrim${m.length ? ': ' + JSON.stringify(m.slice(0, 2).map(i => [i.text, i.ratio])) : ''}`);
        await page.locator('#' + po.close).click(); await C.sleep(400);
        check(await page.evaluate(id => getComputedStyle(document.getElementById(id)).display === 'none', po.overlay), `${tag}: Close closes it`);
      }
      check(!errors.length, `${theme} ${lang}: page errors ${errors.length}${errors.length ? ' ' + errors.slice(0, 2).join(' | ') : ''}`);
      await ctx.close();
    }
    console.log(`\nPOSTERS: ${fails ? `FAIL: ${fails}` : 'PASS'} (${res.length} checks) · images in ${OUT}`); process.exitCode = fails ? 1 : 0;
  } finally { fs.writeFileSync(path.join(OUT, 'posters.json'), JSON.stringify(res, null, 1)); await b.close(); await C.cleanup(); }
})();
