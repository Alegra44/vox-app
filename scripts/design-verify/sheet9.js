// Phase 9 contact sheets (PHASE9.md §4): the before set (master) next to the branch, one sheet per combo (390-light,
// 390-dark, 1280-light, 1280-dark): a row per screen-state, before | after, and the posters' exported PNGs at the end.
// Drawn in the browser (no image library). Out: <after>/sheets/phase9-<combo>.jpg.
// Usage: node scripts/design-verify/sheet9.js <before dir> <after dir> [--only key,key]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BEFORE = path.resolve(process.argv[2]), AFTER = path.resolve(process.argv[3]);
const ONLY = arg('--only') ? arg('--only').split(',') : null;
const COMBOS = ['390-light', '390-dark', '1280-light', '1280-dark'].filter(c => fs.existsSync(path.join(AFTER, c)));
const ORDER = ['signup', 'signin', 'signinrequired', 'signinplan', 'language', 'onboarding', 'pricing', 'plansoon', 'paywall', 'teacher',
  'feedback', 'warmup', 'levelup', 'newrecord', 'breakthrough', 'sharerange', 'sharerecap', 'vocallab'];
const rank = n => { const i = ORDER.findIndex(p => n.startsWith(p)); return i < 0 ? 99 : i; };
const list = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /\.(jpg|png)$/.test(f)) : [];
const uri = f => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
(async () => {
  const b = await chromium.launch();
  for (const combo of COMBOS) {
    const w = combo.startsWith('390') ? 300 : 560;
    const files = [...new Set([...list(path.join(BEFORE, combo)), ...list(path.join(AFTER, combo))])]
      .filter(f => !ONLY || ONLY.some(p => f.startsWith(p)))
      .sort((a, c) => (rank(a) - rank(c)) || (/export/.test(a) - /export/.test(c)) || a.localeCompare(c));
    const cell = (dir, f) => fs.existsSync(path.join(dir, combo, f)) ? `<img src="${uri(path.join(dir, combo, f))}">` : '<span class="none">none</span>';
    const page = await b.newPage({ viewport: { width: 2 * w + 260, height: 1000 } });
    await page.setContent(`<style>body{margin:0;padding:24px;font:13px system-ui;background:#fff;color:#111}h1{font-size:20px;margin:0 0 4px}
      p{margin:0 0 16px;color:#555}table{border-collapse:collapse}td,th{vertical-align:top;padding:8px;border-top:1px solid #ddd;text-align:left}
      td img{display:block;width:${w}px;height:auto;border:1px solid #eee}td.n{width:170px;font-weight:600;word-break:break-all}.none{color:#999}</style>
      <h1>Phase 9 · ${combo}</h1><p>Before: master (= production, dpl_2fus…). After: redesign/phase9. "-export" rows are the posters' downloaded PNGs.</p>
      <table><tr><th></th><th>before</th><th>after</th></tr>
      ${files.map(f => `<tr><td class="n">${f.replace(/\.(jpg|png)$/, '')}</td><td>${cell(BEFORE, f)}</td><td>${cell(AFTER, f)}</td></tr>`).join('')}</table>`);
    await page.waitForTimeout(500);
    fs.mkdirSync(path.join(AFTER, 'sheets'), { recursive: true });
    const out = path.join(AFTER, 'sheets', `phase9-${combo}.jpg`);
    await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 70 });
    await page.close(); console.log(`sheet: ${out} (${files.length} rows)`);
  }
  await b.close();
})();
