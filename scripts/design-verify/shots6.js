// Phase 6 (PHASE6.md §4): the six Songs-tab solo tools and the Songs tab, for the user's review (not a pass/fail check).
// On the local build (production backend), signed in on a fresh account (a trial: full access; deleted at exit), the
// synthetic mic singing the steady A4 moved onto the song's Lead line (synthmic.js, "lead", from each tool's own start),
// so the results show what a sung line gets. At 390 and 1280, Light and Dark. Each tool: idle, its stage mid-run, its
// result (tools6.js); Studio: recording and the takes list; Sing With the Choir: playing and after (the line with the
// Choir World link). Plus the Songs tab, and Studio's take list with three takes (the limit line and Delete).
// Out: <out>/<w>-<theme>/<tool>-<state>.jpg, <out>/states.json (data-house per shot, page errors), <out>/sheets/phase6.jpg.
// Usage: node scripts/design-verify/shots6.js [--out <dir>] [--only studio,pd,…] [--combos 390-light,1280-dark] [--base <git ref>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), S = require('./stage'), SYN = require('./synthmic'), T6 = require('./tools6');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.resolve(arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots6')), ONLY = arg('--only') ? arg('--only').split(',') : null;
const Q = { type: 'jpeg', quality: 82 };
const COMBOS = (arg('--combos') || '390-light,390-dark,1280-light,1280-dark').split(',').map(c => c.split('-'));
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep, ev = (page, f, a) => page.evaluate(f, a);
const center = (page, sel) => ev(page, sel => { const e = document.querySelector(sel); if (e && e.getClientRects().length) e.scrollIntoView({ block: 'center' }); }, sel);
const house = page => ev(page, () => document.body.dataset.house || 'up');

(async () => {
  const dir = C.buildDir(arg('--base')); fs.mkdirSync(OUT, { recursive: true });
  S.ensureStimuli();
  const b0 = await C.chromium.launch(); const { ctx: c0, page: p0 } = await C.openPage(b0, { dir }); await C.signUp(p0, 'dv6s', 'Shots Six');
  const state = await c0.storageState(); await c0.close(); await b0.close();
  const b = await SYN.launch(); const states = {};
  try {
    console.log(`== shots6 · ${C.REMOTE || arg('--base') || 'working copy'} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state, prepare: c => SYN.attach(c, S.STIM.steady, { level: 1 }) });
      page.on('dialog', dl => dl.accept());
      try {
        await C.clearOverlays(page); await S.warmMic(page); await ev(page, () => { window.__leadLine = true; });
        const shot = async (name, sel) => { if (sel) await center(page, sel); else await ev(page, () => window.scrollTo(0, 0)); await sleep(350);
          states[`${name} ${w} ${theme}`] = await house(page); await page.screenshot({ path: path.join(d, `${name}.jpg`), ...Q }); };
        // the Songs tab
        if (!ONLY || ONLY.includes('songs')) { await T6.PAGES[0].open(page); await sleep(400); await shot('songs-idle'); }
        for (const tl of T6.TOOLS.filter(x => !ONLY || ONLY.includes(x.key))) {
          try {
            await tl.open(page); await sleep(500); await shot(`${tl.key}-idle`);
            await tl.act(page);
            await page.waitForFunction(`(${tl.busy})()`, null, { timeout: 8000 }).catch(() => {});
            await sleep(tl.key === 'studio' ? 3500 : 7000); await shot(`${tl.key}-stage`);
            if (tl.live) { await tl.stop(page); await sleep(1800); await shot(`${tl.key}-after`, '#aiDuetAfter'); }
            else {
              await page.waitForFunction(`!(${tl.busy})()`, null, { timeout: tl.timeout || 40000 }).catch(() => {});
              await sleep(2200); await C.clearOverlays(page);
              await shot(`${tl.key}-result`, tl.key === 'studio' ? '#studioTakesList' : tl.result);
              if (tl.key === 'karaoke') await shot('karaoke-result-mission', '#karaokeMissionCard');
              if (tl.key === 'studio') { // three takes: the limit line and Delete
                await ev(page, () => { const one = studioTakes()[0]; studioSaveTakes([one, { ...one, recordedAt: new Date(Date.now() - 6e5).toISOString() }, { ...one, recordedAt: new Date(Date.now() - 3e5).toISOString() }]); renderStudioTakes(); });
                await ev(page, () => document.getElementById('studioRecordBtn').click()); await sleep(900);
                await shot('studio-three', '#studioRecordNote');
              }
            }
          } catch (e) { states[`${tl.key} ${w} ${theme} error`] = String(e).slice(0, 300); }
          await ev(page, () => stopAllActiveSessions()).catch(() => {}); await sleep(600);
          console.log(`  ${tl.key} ${w} ${theme}`);
        }
        states[`errors ${w} ${theme}`] = errors.slice(0, 10);
      } finally { await ctx.close(); }
    }
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1));
    // the contact sheet: a row per state, a column per size and theme
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`), order = ['songs', ...T6.TOOLS.map(x => x.key)];
    const names = [...new Set(cols.flatMap(c => fs.existsSync(path.join(OUT, c)) ? fs.readdirSync(path.join(OUT, c)) : []).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4)))];
    const st = n => ['idle', 'stage', 'after', 'result', 'result-mission', 'three'].indexOf(n.slice(n.indexOf('-') + 1));
    names.sort((a, c) => order.indexOf(a.split('-')[0]) - order.indexOf(c.split('-')[0]) || st(a) - st(c));
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{width:190px}img.w1280{width:380px}</style>
      <h1>Phase 6: the Songs-tab solo tools and the Songs tab (redesign/phase6, the lead-line stimulus)</h1>
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${names.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, 'phase6.html'); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(800); await sp.screenshot({ path: path.join(sd, 'phase6.jpg'), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
