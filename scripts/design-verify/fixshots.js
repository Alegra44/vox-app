// Phase 4a.1 (PHASE4A.md, "4a.1 FIX ROUND", SCREENSHOTS): only the screens the fixes touch, at 390 Light and Dark and
// 1280 Light, with the fake mic singing (stage.js), signed in. Ear → Voice → Ear and Smart Warmup also in French. Smart
// Warmup with a genre set, so its step 3 shows the {genre}-style scale. Vocal Lab also with a one-note tier (8 px).
// Also measures the Vocal Lab fills against their track (3:1 or better, both themes).
// Out: <out>/<width>-<theme>[-fr]/<shot>.jpg and <out>/sheets/fix.jpg; vocallab-fills.json.
// Usage: node scripts/design-verify/fixshots.js [--base <git ref>] [--out <dir>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage'), T = require('./tools');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base'), OUT = arg('--out') || path.join(os.tmpdir(), `voxcoach-fixshots-${BASE || 'branch'}`);
const Q = { type: 'jpeg', quality: 85 };
const COMBOS = [['390', 'light', 'en'], ['390', 'dark', 'en'], ['1280', 'light', 'en'], ['390', 'light', 'fr'], ['390', 'dark', 'fr'], ['1280', 'light', 'fr']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const FR_ONLY = ['eve-result', 'warmup'];
const ROWS = ['exercises-idle', 'interval-result', 'scale-result', 'ear-result', 'custom-result', 'eve-result', 'breath-stage', 'breath-result', 'vocallab', 'vocallab-onenote', 'warmup', 'range-result'];
const tool = k => T.TOOLS.find(t => t.key === k);
const center = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, sel);

// WCAG contrast of each Vocal Lab fill against its track
const FILLS = () => {
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100; };
  return [...document.querySelectorAll('#panel-vocallab .vlab-fill')].map(f => { const tr = f.parentElement, cf = getComputedStyle(f), r = f.getBoundingClientRect();
    return { fill: cf.backgroundColor, opacity: cf.opacity, track: getComputedStyle(tr).backgroundColor, ratio: ratio(cf.backgroundColor, getComputedStyle(tr).backgroundColor), width: Math.round(r.width) }; });
};

async function combo(b, dir, state, w, theme, lang, fills) {
  const d = path.join(OUT, `${w}-${theme}${lang === 'en' ? '' : '-' + lang}`); fs.mkdirSync(d, { recursive: true });
  const { ctx, page } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state, lang });
  const shot = async name => { if (lang !== 'en' && !FR_ONLY.includes(name)) return; await C.sleep(250); await page.screenshot({ path: path.join(d, `${name}.jpg`), ...Q }); };
  try {
    await C.clearOverlays(page); await S.warmMic(page);
    if (lang === 'en') {
      await C.showPanel(page, 'exercises'); await C.clearOverlays(page); await page.evaluate(() => window.scrollTo(0, 0)); await shot('exercises-idle');
      for (const k of ['interval', 'scale', 'custom', 'range']) {
        await T.toolStates(page, tool(k), async name => { if (name.endsWith('-result')) {
          if (k === 'interval') { await page.waitForFunction(() => !!document.getElementById('intervalAgainBtn').textContent, null, { timeout: 8000 }).catch(() => {}); await center(page, '#intervalAgainBtn'); }
          await shot(name);
        } });
        await page.evaluate(() => stopAllActiveSessions());
      }
      await T.toolStates(page, tool('ear'), async name => { if (name === 'ear-result') { await center(page, '#earChoiceGrid'); await shot(name); } });
      await T.toolStates(page, tool('breath'), async name => { if (name !== 'breath-idle') await shot(name); });
      await page.evaluate(() => stopAllActiveSessions());
      await T.toolStates(page, tool('vocallab'), async name => { if (name === 'vocallab-result') { await shot('vocallab'); fills[`${theme} ${w}`] = await page.evaluate(FILLS); } });
    }
    await T.toolStates(page, tool('eve'), async name => { if (name === 'eve-result') await shot(name); });
    await page.evaluate(() => stopAllActiveSessions());
    await page.evaluate(() => { profile.genre = 'rock'; }); await C.showPanel(page, 'warmup'); await C.clearOverlays(page);
    await page.evaluate(() => renderWarmupContext()); await center(page, '#warmupStep3Sub'); await shot('warmup');
    if (lang === 'en') { // a one-note tier: Reliable on A4 only (the tiers are computed from the attempts stored here)
      await C.showPanel(page, 'vocallab'); await C.clearOverlays(page);
      const one = await page.evaluate(() => { const t = computeVocalLabTiers(); const orig = computeVocalLabTiers; window.computeVocalLabTiers = () => ({ ...t, reliable: { lowMidi: 69, highMidi: 69 } }); renderVocalLab(); window.computeVocalLabTiers = orig; return true; }).catch(() => false);
      if (one) { await center(page, '#vocalLabRangesCard'); await shot('vocallab-onenote'); fills[`${theme} ${w} one-note`] = await page.evaluate(FILLS); }
    }
  } finally { await ctx.close(); }
  console.log(`  ${w} ${theme} ${lang}`);
}

(async () => {
  const dir = C.buildDir(BASE); fs.mkdirSync(OUT, { recursive: true });
  const b0 = await C.chromium.launch();
  const { ctx, page } = await C.openPage(b0, { dir }); await C.signUp(page, 'dvfix', 'Fix Check');
  const state = await ctx.storageState(); await ctx.close(); await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady); const fills = {};
  try {
    console.log(`== fixshots · ${BASE || 'branch (working copy)'} → ${OUT}`);
    for (const [w, theme, lang] of COMBOS) await combo(b, dir, state, w, theme, lang, fills);
    fs.writeFileSync(path.join(OUT, 'vocallab-fills.json'), JSON.stringify(fills, null, 1));
    for (const [k, v] of Object.entries(fills)) console.log(`  Vocal Lab fills ${k}: ${v.map(f => `${f.ratio}:1 (${f.width}px)`).join(' · ')}`);
    // the sheet: a row per screen, 390 Light | 390 Dark | 1280 Light; the French rows after
    const cols = ['390-light', '390-dark', '1280-light'];
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const rows = [...ROWS.map(n => [n, cols]), ...FR_ONLY.map(n => [`${n} (fr)`, cols.map(c => c + '-fr')])]
      .map(([n, cs]) => `<tr><th>${n}</th>${cs.map(c => `<td>${img(c, n.replace(' (fr)', ''))}</td>`).join('')}</tr>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{height:420px}img.w1280{height:300px}</style><h1>Phase 4a.1: the screens the fixes touch</h1><table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, 'fix.html'); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await C.sleep(300); await sp.screenshot({ path: path.join(sd, 'fix.jpg'), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
