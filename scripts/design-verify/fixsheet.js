// 4b.1 (PHASE4B.md): the one sheet for review/phase4b-fix, from a shots.js run (--tools-only --set 4b --out <dir>):
// Register Coach's stage at 390 and 1280, Light and Dark; Mirror's result at 1280; Rhythm's result (every beat sung) at
// 390; Rhythm's and Emotion Mode's stages at 390; Resonance's stage; Voice Quality's result (both themes where asked
// for one size). Writes <dir>/sheets/fix.jpg and copies the shots it shows into <dir>/fix/.
// Usage: node scripts/design-verify/fixsheet.js <shots dir>
const path = require('path'), fs = require('fs'), C = require('./common');
const DIR = path.resolve(process.argv[2] || '');
const ROWS = [
  ['Register Coach · stage', ['390-light', '390-dark', '1280-light', '1280-dark'], 'register-stage'],
  ['Mirror · result', ['1280-light', '1280-dark'], 'mirror-result'],
  ['Rhythm · result, every beat sung', ['390-light', '390-dark'], 'rhythm-result-onbeat'],
  ['Rhythm · stage', ['390-light', '390-dark'], 'rhythm-stage'],
  ['Emotion Mode · stage', ['390-light', '390-dark'], 'emotionmode-stage'],
  ['Resonance · stage', ['390-light', '390-dark', '1280-light', '1280-dark'], 'resonance-stage'],
  ['Voice Quality · result', ['390-light', '390-dark', '1280-light', '1280-dark'], 'voicequality-result'],
];
(async () => {
  const out = path.join(DIR, 'fix'); fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(path.join(DIR, 'sheets'), { recursive: true });
  let missing = 0;
  const rows = ROWS.map(([title, cols, name]) => `<h2>${title}</h2><div class="row">${cols.map(c => {
    const f = path.join(DIR, 'tools', c, name + '.jpg');
    if (!fs.existsSync(f)) { missing++; return `<figure><div class="miss">missing</div><figcaption>${c}</figcaption></figure>`; }
    const to = path.join(out, `${name}-${c}.jpg`); fs.copyFileSync(f, to);
    return `<figure><img src="file://${to}" class="w${c.split('-')[0]}"><figcaption>${c}</figcaption></figure>`;
  }).join('')}</div>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
    h1{font-size:20px}h2{font-size:15px;margin:20px 0 6px}.row{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
    figure{margin:0}figcaption{font-size:12px;color:#555}img{border:1px solid #ccc;display:block}img.w390{height:560px}img.w1280{height:350px}
    .miss{width:200px;height:100px;border:1px dashed #c00;color:#c00;display:grid;place-content:center}</style>
    <h1>Phase 4b.1 fixes (redesign/phase4b)</h1>${rows}`;
  const b = await C.chromium.launch();
  try {
    const page = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
    const f = path.join(DIR, 'sheets', 'fix.html'); fs.writeFileSync(f, html);
    await page.goto('file://' + f); await C.sleep(400);
    await page.screenshot({ path: path.join(DIR, 'sheets', 'fix.jpg'), fullPage: true, type: 'jpeg', quality: 85 }); fs.rmSync(f);
  } finally { await b.close(); }
  console.log(`fix sheet: ${path.join(DIR, 'sheets', 'fix.jpg')} · ${missing} missing`);
  process.exitCode = missing ? 1 : 0;
})();
