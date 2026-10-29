// Phase 4b guard (PHASE4B.md §1g): the tab bar highlights the hub a tool belongs to. Signed in (a throwaway account,
// deleted at exit), on a local build: each hub's tab (Coach, Songs, You) is shown, and every [data-enter-panel] button in
// it is clicked in turn; the tab bar's active tab (.snb-item.active, aria-current="page") must be that hub's. Coach has
// 23 tool buttons. World is left out: its only [data-enter-panel] buttons open Choir World, a Songs panel. A panel
// listed in two hubs is reported (its tab can match only one).
// Second pass: each of those panels opened from Home (enterPanel, as Home's cards and links open tools) must light its
// hub's tab too. From the hub itself the hub's tab is already lit, so only this pass shows a missing SHELL_SECTION_MAP
// entry (on master, Home stayed lit on most Coach tools).
// Usage: node scripts/design-verify/navcheck.js [--base <git ref>]
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const HUBS = [['train', 'train-hub', 'Coach'], ['songs', 'songs-hub', 'Songs'], ['you', 'you-hub', 'You']];

(async () => {
  const dir = C.buildDir(arg('--base'));
  const b = await C.chromium.launch(); let pass = 0, fail = 0;
  try {
    console.log(`== navcheck · ${arg('--base') || 'branch (working copy)'}`);
    const { page } = await C.openPage(b, { dir, theme: 'light' }); await C.signUp(page, 'dvnav', 'Nav Check'); await C.clearOverlays(page);
    const seen = {};
    for (const [shell, panel, name] of HUBS) {
      await page.evaluate(s => document.querySelector(`.snb-item[data-shell="${s}"]`).click(), shell); await C.sleep(600);
      const keys = await page.evaluate(p => [...new Set([...document.querySelectorAll(`#panel-${p} [data-enter-panel]`)].map(e => e.dataset.enterPanel))], panel);
      const wrong = [];
      for (const k of keys) {
        (seen[k] = seen[k] || []).push(name);
        await page.evaluate(s => document.querySelector(`.snb-item[data-shell="${s}"]`).click(), shell); await C.sleep(400);
        await C.clearOverlays(page);
        await page.evaluate(({ p, k }) => document.querySelector(`#panel-${p} [data-enter-panel="${k}"]`).click(), { p: panel, k }); await C.sleep(500);
        const st = await page.evaluate(() => { const a = document.querySelector('.snb-item.active'); return { active: a ? a.dataset.shell : null, current: document.querySelector('.snb-item[aria-current="page"]')?.dataset.shell || null, panel: document.querySelector('.panel.active')?.id || null }; });
        await page.evaluate(() => stopAllActiveSessions());
        if (st.active !== shell || st.current !== shell) wrong.push(`${k} → ${st.active}`);
      }
      const ok = !wrong.length && keys.length > 0 && (shell !== 'train' || keys.length === 23);
      ok ? pass++ : fail++;
      console.log(`  ${ok ? '✓' : '✗'} ${name}: ${keys.length} tool buttons, each highlights ${name}${wrong.length ? ` · wrong: ${wrong.join(', ')}` : ''}`);
    }
    // from Home
    for (const [shell, panel, name] of HUBS) {
      const keys = Object.entries(seen).filter(([, hubs]) => hubs.includes(name) && hubs.length === 1).map(([k]) => k), wrong = [];
      for (const k of keys) {
        await page.evaluate(() => document.querySelector('.snb-item[data-shell="home"]').click()); await C.sleep(400);
        await page.evaluate(k => enterPanel(k), k); await C.sleep(400); await C.clearOverlays(page);
        const st = await page.evaluate(() => { const a = document.querySelector('.snb-item.active'); return a ? a.dataset.shell : null; });
        await page.evaluate(() => stopAllActiveSessions());
        if (st !== shell) wrong.push(`${k} → ${st}`);
      }
      const ok = !wrong.length && keys.length > 0;
      ok ? pass++ : fail++;
      console.log(`  ${ok ? '✓' : '✗'} from Home: ${keys.length} ${name} panels, each highlights ${name}${wrong.length ? ` · wrong: ${wrong.join(', ')}` : ''}`);
    }
    const twice = Object.entries(seen).filter(([, hubs]) => hubs.length > 1);
    if (twice.length) console.log(`  (in two hubs, so one tab can't match: ${twice.map(([k, h]) => `${k} (${h.join(', ')})`).join('; ')})`);
  } finally { await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; C.cleanup(); }
})();
