// PHASE10.md A2a: the tour's contact sheets, one set per width and theme: the screens in tour order, each shot scaled to
// a column (390: 7 across, 768: 5, 1280: 4), its name under it, at most 28 shots per sheet. Drawn in the browser.
// Out: <tour dir>/sheets/tour-<combo>-<n>.jpg. Usage: node scripts/design-verify/sheet10.js <tour dir>
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const DIR = path.resolve(process.argv[2]); const audit = JSON.parse(fs.readFileSync(path.join(DIR, 'audit.json'), 'utf8'));
const order = audit.screens || [];
const rank = f => { const i = order.findIndex(k => f.startsWith(k + '-')); return i < 0 ? 999 : i; };
(async () => {
  const b = await chromium.launch(); fs.mkdirSync(path.join(DIR, 'sheets'), { recursive: true });
  for (const combo of Object.keys(audit.combos)) {
    const d = path.join(DIR, combo); if (!fs.existsSync(d)) continue;
    const files = fs.readdirSync(d).filter(f => f.endsWith('.jpg')).sort((a, c) => rank(a) - rank(c) || a.localeCompare(c));
    const cols = combo.startsWith('390') ? 7 : combo.startsWith('768') ? 5 : 4, colW = combo.startsWith('390') ? 230 : combo.startsWith('768') ? 320 : 420;
    for (let n = 0; n * 28 < files.length; n++) {
      const part = files.slice(n * 28, n * 28 + 28);
      const page = await b.newPage({ viewport: { width: cols * (colW + 16) + 48, height: 1000 } });
      await page.setContent(`<style>body{margin:0;padding:24px;font:12px system-ui;background:#fff;color:#111}h1{font-size:18px;margin:0 0 12px}
        .g{display:grid;grid-template-columns:repeat(${cols},${colW}px);gap:16px;align-items:start}figure{margin:0}img{width:${colW}px;display:block;border:1px solid #ddd;max-height:${colW * 4}px;object-fit:cover;object-position:top}
        figcaption{margin-top:4px;word-break:break-all;color:#333}</style><h1>Phase 10 tour · ${combo} · ${n + 1}/${Math.ceil(files.length / 28)} (redesign/phase10; tall pages cut at 4 column-widths)</h1>
        <div class="g">${part.map(f => `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(d, f)).toString('base64')}"><figcaption>${f.replace(/\.jpg$/, '')}</figcaption></figure>`).join('')}</div>`);
      await page.waitForTimeout(400);
      const out = path.join(DIR, 'sheets', `tour-${combo}-${n + 1}.jpg`); await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 70 }); await page.close();
      console.log(`sheet: ${out} (${part.length})`);
    }
  }
  await b.close();
})();
