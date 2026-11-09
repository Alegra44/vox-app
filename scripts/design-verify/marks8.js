// Phase 8 (PHASE8.md 2.1): the sheet of Vocal World's 14 drawn marks (six locations, eight bosses), each at 24, 48 and
// 96 px, in Light and Dark, drawn from the app's own sprite in the app's own colours (the working copy, or --base).
// Also the Skill Tree's node icons at 24 and 48. Out: <out>/marks-light.png, marks-dark.png.
// Usage: node scripts/design-verify/marks8.js [--out <dir>] [--base <ref>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-marks8'), DIR = C.buildDir(arg('--base') || null);
const MARKS = [['hl-loc-mountain', 'Pitch Mountain'], ['hl-loc-canyon', 'Register Canyon'], ['hl-loc-arena', 'Boss Arena'], ['hl-loc-castle', 'Harmony Castle'],
  ['hl-loc-tree', 'Skill Tree'], ['hl-loc-rift', 'The Rift'], ['hl-boss-dragon', 'Pitch Dragon'], ['hl-boss-giant', 'Sustain Giant'], ['hl-boss-phoenix', 'Range Phoenix'],
  ['hl-boss-agility', 'Agility Monster'], ['hl-boss-wraith', 'Register Wraith'], ['hl-boss-phantom', 'Volume Phantom'], ['hl-boss-golem', 'Tempo Golem'], ['hl-boss-serpent', 'Tremor Serpent']];
const NODES = [['hl-breath', 'Control'], ['hl-pitch', 'Pitch'], ['hl-range', 'Range'], ['hl-steps', 'Agility'], ['hl-head', 'Head voice'], ['hl-chest', 'Chest voice'], ['hl-mixed', 'Mixed voice'], ['hl-master', 'Vocal master']];

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await C.chromium.launch();
  try {
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await C.openPage(b, { dir: DIR, theme, viewport: { width: 900, height: 900 } });
      await C.clearOverlays(page);
      await page.evaluate(({ MARKS, NODES }) => {
        const u = (id, px) => `<svg class="hl-icon" style="width:${px}px;height:${px}px" aria-hidden="true"><use href="#${id}"/></svg>`;
        const row = ([id, name]) => `<div style="display:grid;grid-template-columns:150px 40px 64px 112px;align-items:center;gap:12px;padding:6px 0;border-top:1px solid var(--hl-rule)">
          <span style="font-size:13px;color:var(--hl-ink-2)">${name}</span>${u(id, 24)}${u(id, 48)}${u(id, 96)}</div>`;
        const node = ([id, name]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:92px">${u(id, 24)}${u(id, 48)}<span style="font-size:11px;color:var(--hl-ink-3)">${name}</span></div>`;
        const d = document.createElement('div'); d.id = 'marksSheet';
        d.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;background:var(--hl-bg);color:var(--hl-ink);padding:24px;font-family:var(--hl-font)';
        d.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 40px">
          <div><div class="hl-label" style="margin-bottom:6px">Locations · 24 · 48 · 96 px</div>${MARKS.slice(0, 6).map(row).join('')}
            <div class="hl-label" style="margin:22px 0 6px">Skill Tree nodes · 24 · 48 px</div><div style="display:flex;flex-wrap:wrap;gap:10px">${NODES.map(node).join('')}</div></div>
          <div><div class="hl-label" style="margin-bottom:6px">Bosses · 24 · 48 · 96 px</div>${MARKS.slice(6).map(row).join('')}</div></div>`;
        document.body.appendChild(d);
      }, { MARKS, NODES });
      await C.sleep(300);
      const h = await page.evaluate(() => document.getElementById('marksSheet').scrollHeight);
      await page.setViewportSize({ width: 900, height: h }); await C.sleep(200);
      await page.locator('#marksSheet').screenshot({ path: path.join(OUT, `marks-${theme}.png`) });
      await ctx.close();
    }
    console.log(`marks: ${OUT}/marks-light.png, marks-dark.png`);
  } finally { await b.close(); C.cleanup(); }
})();
