// Phase 7 guard (PHASE7.md §1c): the Voice Card on Profile & settings, in en, fr, es and tr and in Light and Dark, for
// the seeded states new and active (youSeed.js): the canvas is drawn (not blank: enough distinct colours and inked
// pixels), no page error, and "Download my Voice Card" gives a PNG (Playwright's download event: the file's PNG
// signature and its size). The downloaded images are kept (<out>/<lang>-<theme>-<state>.png) for the screenshots.
// Usage: node scripts/design-verify/voicecard.js [--base <git ref>] [--out <dir>] [--lang en]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), Y = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-voicecard');
const LANGS = arg('--lang') ? [arg('--lang')] : ['en', 'fr', 'es', 'tr'];

(async () => {
  const dir = C.buildDir(arg('--base')); fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch(); let fails = 0;
  try {
    const o = await C.openPage(b, { dir }); await C.signUp(o.page, 'dvvc', 'Voice Card'); const state = await o.ctx.storageState(); await o.ctx.close();
    console.log(`== voicecard · ${C.REMOTE || arg('--base') || 'working copy'} → ${OUT}`);
    for (const lang of LANGS) for (const theme of ['light', 'dark']) for (const st of ['new', 'active']) {
      const { ctx, page, errors } = await C.openPage(b, { dir, theme, lang, storageState: state });
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await C.clearOverlays(page); await page.evaluate(Y.seedInPage, st);
        await page.evaluate(() => enterPanel('profile')); await C.sleep(600);
        const px = await page.evaluate(() => {
          const cv = document.getElementById('voiceCardCanvas'); if (!cv) return null;
          const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, colours = new Set();
          let inked = 0; const bg = [d[0], d[1], d[2]];
          for (let i = 0; i < d.length; i += 16) { colours.add(`${d[i] >> 3},${d[i + 1] >> 3},${d[i + 2] >> 3}`);
            if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60) inked++; }
          return { w: cv.width, h: cv.height, colours: colours.size, inkedPct: Math.round(inked / (d.length / 16) * 1000) / 10, shown: cv.getClientRects().length > 0 };
        });
        const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
          page.evaluate(() => { const bt = document.getElementById('voiceCardDownloadBtn'); bt.scrollIntoView({ block: 'center' }); bt.click(); })]);
        let file = null, size = 0, png = false;
        if (dl) { file = path.join(OUT, `${lang}-${theme}-${st}.png`); await dl.saveAs(file); const buf = fs.readFileSync(file); size = buf.length; png = buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); }
        const ok = px && px.shown && px.colours >= 8 && px.inkedPct >= 1 && !errors.length && png && size > 10000;
        if (!ok) fails++;
        console.log(`  ${ok ? '✓' : '✗'} ${lang} ${theme} ${st.padEnd(6)} canvas ${px ? `${px.w}×${px.h}, ${px.colours} colours, ${px.inkedPct}% inked${px.shown ? '' : ', NOT SHOWN'}` : 'MISSING'}` +
          ` · download ${dl ? `${png ? 'PNG' : 'not a PNG'} ${Math.round(size / 1024)} kB (${dl.suggestedFilename()})` : 'NONE'} · page errors ${errors.length ? errors.join(' | ') : 'none'}`);
      } finally { await ctx.close(); }
    }
    console.log(`\nVOICECARD: ${fails ? `FAIL: ${fails}` : 'PASS'} (${LANGS.length * 4} cards)`);
    process.exitCode = fails ? 1 : 0;
  } finally { await b.close(); C.cleanup(); }
})();
