// A contact sheet of a shots8.js folder, drawn in the browser (no image library): one row per shot name, one column per
// combo (390-light, 390-dark, 1280-light, 1280-dark), each image scaled to the column. Out: <dir>/sheets/<name>.jpg.
// Usage: node scripts/design-verify/sheet8.js <dir> [--name phase8] [--only hub-,glider-] [--title "…"]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const DIR = path.resolve(process.argv[2]), NAME = arg('--name') || 'phase8', ONLY = arg('--only') ? arg('--only').split(',') : null;
const COMBOS = ['390-light', '390-dark', '1280-light', '1280-dark'].filter(c => fs.existsSync(path.join(DIR, c)));
const names = [...new Set(COMBOS.flatMap(c => fs.readdirSync(path.join(DIR, c)).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4))))]
  .filter(n => !ONLY || ONLY.some(p => n.startsWith(p)));
const order = ['hub', 'glider', 'bridge', 'boss', 'wraith', 'harmony', 'rift', 'skilltree', 'plans'];
names.sort((a, b) => (order.findIndex(p => a.startsWith(p)) - order.findIndex(p => b.startsWith(p))) || a.localeCompare(b));
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const img = (c, n) => { const f = path.join(DIR, c, n + '.jpg'); return fs.existsSync(f) ? `<img src="data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}">` : '<span>—</span>'; };
  await page.setContent(`<style>body{margin:0;padding:24px;font:13px system-ui;background:#fff;color:#111}h1{font-size:20px;margin:0 0 16px}
    table{border-collapse:collapse}td,th{vertical-align:top;padding:6px;border-top:1px solid #ddd;text-align:left}th{font-weight:600}
    td img{display:block;width:100%;height:auto}td.n{width:150px;font-weight:600}td.c390{width:190px}td.c1280{width:330px}</style>
    <h1>${arg('--title') || 'Phase 8: Vocal World'}</h1><table><tr><th></th>${COMBOS.map(c => `<th>${c}</th>`).join('')}</tr>
    ${names.map(n => `<tr><td class="n">${n}</td>${COMBOS.map(c => `<td class="c${c.split('-')[0]}">${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`);
  await page.waitForTimeout(500);
  fs.mkdirSync(path.join(DIR, 'sheets'), { recursive: true });
  await page.screenshot({ path: path.join(DIR, 'sheets', NAME + '.jpg'), fullPage: true, type: 'jpeg', quality: 72 });
  await b.close(); console.log(`sheet: ${path.join(DIR, 'sheets', NAME + '.jpg')} (${names.length} rows)`);
})();
