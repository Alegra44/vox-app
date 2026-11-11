// PHASE10.md B1/B2 gates and the final tour diff: two tour10.js output dirs compared shot by shot, pixel by pixel, in
// the browser (no image library). A pixel differs when any channel differs by more than --tol (default 24: JPEG noise
// is below that, a 1 px rule or a colour change is above). A shot differs when more than --min pixels (default 0) differ,
// or when its size differs. Out: a line per differing shot (combo/name: N px, bounding box, or size before → after),
// <after>/diff.json, and with --sheets, <after>/sheets/diff-<combo>.jpg: before | after | the differing pixels in red.
// Usage: node scripts/design-verify/tourdiff.js <before dir> <after dir> [--tol 24] [--min 0] [--sheets] [--title "…"]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BEFORE = path.resolve(process.argv[2]), AFTER = path.resolve(process.argv[3]);
const TOL = +(arg('--tol') || 24), MIN = +(arg('--min') || 0), SHEETS = process.argv.includes('--sheets'), TITLE = arg('--title') || 'Tour diff';
const COMBOS = ['390-light', '390-dark', '768-light', '768-dark', '1280-light', '1280-dark'].filter(c => fs.existsSync(path.join(AFTER, c)) || fs.existsSync(path.join(BEFORE, c)));
const list = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.jpg')).sort() : [];
const uri = f => `data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}`;
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  await page.setContent('<canvas id="c"></canvas>');
  const out = { tol: TOL, min: MIN, combos: {} }; let total = 0, differing = 0;
  for (const combo of COMBOS) {
    const files = [...new Set([...list(path.join(BEFORE, combo)), ...list(path.join(AFTER, combo))])];
    out.combos[combo] = {}; const rows = [];
    for (const f of files) {
      total++;
      const A = path.join(BEFORE, combo, f), B = path.join(AFTER, combo, f);
      if (!fs.existsSync(A) || !fs.existsSync(B)) { out.combos[combo][f] = { missing: fs.existsSync(A) ? 'after' : 'before' }; differing++; console.log(`${combo}/${f}: missing ${out.combos[combo][f].missing}`); continue; }
      const r = await page.evaluate(async ({ a, b, tol, mark }) => {
        const load = s => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}×${ia.height} → ${ib.width}×${ib.height}` };
        const w = ia.width, h = ia.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true });
        g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, w, h).data; g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, w, h).data;
        let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1; const m = mark ? g.createImageData(w, h) : null;
        for (let i = 0; i < da.length; i += 4) {
          const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
          if (d > tol) { n++; const p = i / 4, x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (m) { m.data[i] = 230; m.data[i + 3] = 255; } }
          else if (m) { m.data[i] = m.data[i + 1] = m.data[i + 2] = 255 - ((255 - db[i + 1]) >> 2); m.data[i + 3] = 255; }
        }
        let markUri = null; if (m && n) { g.putImageData(m, 0, 0); markUri = cv.toDataURL('image/jpeg', 0.6); }
        return { n, box: n ? [x0, y0, x1, y1] : null, markUri };
      }, { a: uri(A), b: uri(B), tol: TOL, mark: SHEETS });
      const diff = !!r.size || r.n > MIN;
      out.combos[combo][f] = { n: r.n, box: r.box, size: r.size, diff };
      if (diff) { differing++; console.log(`${combo}/${f}: ${r.size ? 'size ' + r.size : `${r.n} px in [${r.box.join(', ')}]`}`); rows.push({ f, A, B, mark: r.markUri, label: r.size || `${r.n} px` }); }
    }
    if (SHEETS && rows.length) {
      const w = combo.startsWith('390') ? 260 : combo.startsWith('768') ? 340 : 420;
      const sp = await b.newPage({ viewport: { width: 3 * w + 260, height: 1000 } });
      await sp.setContent(`<style>body{margin:0;padding:24px;font:13px system-ui;background:#fff;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#555}
        table{border-collapse:collapse}td,th{vertical-align:top;padding:8px;border-top:1px solid #ddd;text-align:left}td img{display:block;width:${w}px;height:auto;border:1px solid #eee}
        td.n{width:190px;font-weight:600;word-break:break-all}td.n small{display:block;font-weight:400;color:#777}</style>
        <h1>${TITLE} · ${combo}</h1><p>${rows.length} of ${files.length} shots differ (a pixel differs by more than ${TOL} in a channel). Before | after | the differing pixels in red.</p>
        <table><tr><th></th><th>before</th><th>after</th><th>difference</th></tr>${rows.map(r => `<tr><td class="n">${r.f.replace('.jpg', '')}<small>${r.label}</small></td><td><img src="${uri(r.A)}"></td><td><img src="${uri(r.B)}"></td><td>${r.mark ? `<img src="${r.mark}">` : ''}</td></tr>`).join('')}</table>`);
      await sp.waitForTimeout(500); fs.mkdirSync(path.join(AFTER, 'sheets'), { recursive: true });
      const o = path.join(AFTER, 'sheets', `diff-${combo}.jpg`); await sp.screenshot({ path: o, fullPage: true, type: 'jpeg', quality: 70 }); await sp.close(); console.log(`sheet: ${o}`);
    }
  }
  fs.writeFileSync(path.join(AFTER, 'diff.json'), JSON.stringify(out, null, 1));
  console.log(`\n${differing} of ${total} shots differ (tol ${TOL}, min ${MIN})`);
  await b.close(); process.exit(0);
})();
