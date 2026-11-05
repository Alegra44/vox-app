// Startup guard (the splash hotfix, 2026-11-05): the page loads in each of these states with no page error and the
// splash hidden within 5 s of the navigation:
//   nothing stored (signed out) · a Your Choir take stored on the device · a Studio take in the old progress format
//   (studio_takes in the /me/progress answer, signed in) · the warm-up already done today (signed in) · fr, es, tr
//   (signed out, the language stored) · signed in
// The Your Choir case is the bug the hotfix fixes (master 6266166: "Cannot access 'cwMeasureHtml' before
// initialization", the splash never hides). A throwaway account (deleted at exit), the production backend.
// Usage: node scripts/design-verify/bootcheck.js [--base <git ref>]   (DV_URL=https://… runs it on that site)
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const LIMIT = 5000;

// in the page, before its scripts: when the splash is hidden, in ms from the navigation
const WATCH = () => document.addEventListener('DOMContentLoaded', () => {
  const s = document.getElementById('splashScreen'); if (!s) { window.__splashAt = -1; return; }
  const seen = () => { if (!window.__splashAt && (s.classList.contains('splash-hide') || getComputedStyle(s).display === 'none')) window.__splashAt = Math.round(performance.now()); };
  new MutationObserver(seen).observe(s, { attributes: true, attributeFilter: ['class', 'style'] }); seen();
});
const YC_TAKE = { hymn: { Lead: { base64: 'data:audio/webm;base64,AAAA', mimeType: 'audio/webm', peak: 0.5, lead: 0.5, recordedAt: Date.now() } } };
const OLD_STUDIO = [{ base64: 'data:audio/webm;base64,AAAA', mimeType: 'audio/webm', recordedAt: '2026-10-01T10:00:00.000Z' }];

(async () => {
  const dir = C.buildDir(arg('--base'));
  const b = await C.chromium.launch(); let pass = 0, fail = 0;
  try {
    console.log(`== bootcheck · ${C.REMOTE || arg('--base') || 'working copy'}`);
    const { ctx: c0, page: p0 } = await C.openPage(b, { dir }); await C.signUp(p0, 'dvboot', 'Boot Check');
    const uid = await p0.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
    const signedIn = await c0.storageState(); await c0.close();
    const day = new Date().toISOString().slice(0, 10); // todayStr(): the app's UTC day
    const CASES = [
      { name: 'nothing stored (signed out)' },
      { name: 'a Your Choir take stored', ls: { yourChoirTakes: JSON.stringify(YC_TAKE) } },
      { name: 'a Studio take in the old progress format (signed in)', signedIn: true, studio: true },
      { name: 'the warm-up already done today (signed in)', signedIn: true, ls: { [`warmup:${uid}:${day}`]: 'done' } },
      ...['fr', 'es', 'tr'].map(l => ({ name: `language ${l} (signed out)`, ls: { language: l } })),
      { name: 'signed in', signedIn: true },
    ];
    for (const cs of CASES) {
      let r; const seen = []; // page errors, kept even when the page never finishes loading
      try {
        const { ctx, page, errors } = await C.openPage(b, { dir, storageState: cs.signedIn ? signedIn : undefined, prepare: async ctx => {
          ctx.on('weberror', e => seen.push(String(e.error()).split('\n')[0].slice(0, 160)));
          await ctx.addInitScript(WATCH);
          if (cs.ls) await ctx.addInitScript(kv => { try { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); } catch (e) {} }, cs.ls); // (about:blank has no storage)
          if (cs.studio) await ctx.route(u => /\/me\/progress$/.test(u.pathname), async rt => { // the old format: takes inside progress
            if (rt.request().method() !== 'GET') return rt.continue();
            const res = await rt.fetch(); const body = await res.json();
            rt.fulfill({ response: res, json: { ...body, studio_takes: OLD_STUDIO } });
          });
        } });
        await page.waitForFunction(() => !!window.__splashAt, null, { timeout: 4000 }).catch(() => {});
        r = { at: await page.evaluate(() => window.__splashAt || null), errors: [...new Set([...seen, ...errors])].slice(0, 3) };
        await ctx.close();
      } catch (e) { r = { at: null, errors: [...new Set(seen)].slice(0, 3).concat(['did not load: ' + String(e).split('\n')[0].slice(0, 120)]) }; }
      const ok = r.at !== null && r.at > 0 && r.at <= LIMIT && !r.errors.length;
      ok ? pass++ : fail++;
      console.log(`  ${ok ? '✓' : '✗'} ${cs.name.padEnd(56)} splash hidden ${r.at ? r.at + ' ms' : 'never'} · page errors ${r.errors.join(' | ') || 'none'}`);
    }
  } finally { await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; C.cleanup(); }
})();
