// PHASE10.md B8: durations as a check. A space before "s" and the language's decimal sign ("12.4 s", "12,4 s").
//  1. The source: no number glued to "s" in deploy/index.html's script (+'s', ${…}s, toFixed(n)}s).
//  2. fmtSecs in en, fr, es, tr: "12.4 s" / "12,4 s" / "12,4 s" / "12,4 s" (a no-break space).
//  3. Rendered, in en and fr, on a signed-in account with a breath record and a weekly best: the records list, Progress's
//     weekly challenge and Part Rehearsal's chord times: no digit followed directly by "s", and in fr no "d.d s".
// Usage: node scripts/design-verify/durations.js [--ref <git ref>]   exit 1 on any failure
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const C = require('./common'), S9 = require('./screens9');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const REF = arg('--ref');
let fails = 0;
const check = (name, ok, detail) => { console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) fails++; };

const html = REF ? execFileSync('git', ['show', `${REF}:deploy/index.html`], { cwd: C.ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }) : fs.readFileSync(path.join(C.ROOT, 'deploy/index.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const GLUED = [/\+\s*'s'(?![a-z])/g, /toFixed\(\d\)\}s(?![a-z])/g, /\)\}s[ <·\/–)`]/g];
const hits = [];
script.split('\n').forEach((l, i) => { if (/^\s*\/\//.test(l)) return; for (const re of GLUED) { re.lastIndex = 0; if (re.test(l)) hits.push(`${i + 1}: ${l.trim().slice(0, 90)}`); } });
check('the source: no number glued to "s"', hits.length === 0, hits.length ? hits.slice(0, 4).join(' | ') : 'none');

(async () => {
  const b = await C.chromium.launch();
  try {
    const dir = C.buildDir(REF);
    const a = await C.openPage(b, { dir }); await C.signUp(a.page, 'dvdur', 'Alex Rivera'); const state = await a.ctx.storageState(); await a.ctx.close();
    for (const lang of ['en', 'fr', 'es', 'tr']) {
      const { page, errors } = await C.openPage(b, { dir, theme: 'light', storageState: state, lang });
      await C.clearOverlays(page); await page.evaluate(S9.stateInPage, 'active');
      const f = await page.evaluate(() => typeof fmtSecs === 'function' ? fmtSecs(12.4) : null);
      const want = lang === 'en' ? '12.4 s' : '12,4 s';
      check(`fmtSecs(12.4) in ${lang}`, f === want, JSON.stringify(f));
      if (lang !== 'en' && lang !== 'fr') { await page.context().close(); continue; }
      // a breath record and a weekly best, so the values show
      await page.evaluate(() => {
        progress.bestBreathDuration = 12.4; progress.bestBridgeSeconds = 7.5;
        const today = todayStr(); progress.weeklyLog = (progress.weeklyLog || []).concat([{ date: today, type: 'breath', score: 60, duration: 12.4 }]);
      });
      const texts = {};
      for (const [panel, sel] of [['records', '#panel-records'], ['dashboard', '#panel-dashboard'], ['partrehearsal', '#panel-partrehearsal']]) {
        await C.G.step(`${lang} ${panel}`, 30, async () => {
          await C.showPanel(page, panel); await C.sleep(900);
          texts[panel] = await page.evaluate(s => { const r = document.querySelector(s); return r ? r.innerText : ''; }, sel);
        });
      }
      const all = Object.entries(texts).map(([k, v]) => v.split('\n').map(l => `${k}: ${l}`)).flat();
      const glued = all.filter(l => /\d s\b/.test(l) === false && /\d+([.,]\d+)?s\b/.test(l.replace(/^[a-z]+: /, '')));
      const dot = lang === 'fr' ? all.filter(l => /\d\.\d+\s?s\b/.test(l.replace(/^[a-z]+: /, ''))) : [];
      const seen = all.filter(l => /\d([.,]\d+)?[  ]s\b/.test(l));
      check(`${lang}: durations shown with a space (records, weekly challenge, chord times)`, glued.length === 0 && seen.length > 0, glued.length ? glued.slice(0, 3).join(' | ') : `${seen.length} durations, e.g. ${seen.slice(0, 3).map(s => s.slice(0, 60)).join(' | ')}`);
      if (lang === 'fr') check('fr: durations with a decimal comma', dot.length === 0, dot.length ? dot.slice(0, 3).join(' | ') : 'none with a point');
      check(`${lang}: no page errors`, !errors.length, errors.slice(0, 2).join(' | '));
      await page.context().close();
    }
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${fails ? 'DURATIONS: FAIL' : 'DURATIONS: PASS'} (${fails} failed)`);
  process.exit(fails ? 1 : 0);
})();
