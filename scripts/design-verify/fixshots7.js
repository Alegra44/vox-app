// Phase 7 review fixes (the four): what shots7.js doesn't cover. Per language (en, fr, es, tr), Light, 390 wide, signed in
// with the seeded "active" state: the Profile account section and language buttons (fix 1, fix 4), the "Erase my progress"
// confirmation's text (read from the dialog, dismissed, nothing erased), the Journey's curriculum card (fix 2), the
// You → Progress row (fix 3), and the language chooser overlay (fix 4). Also checks no "->" is left in the curriculum card
// and no flag emoji in either set of language buttons. Out: <out>/<lang>-<what>.jpg, <out>/fixes.json.
// Usage: node scripts/design-verify/fixshots7.js [--out <dir>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common'), { seedInPage } = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-fixshots7'); const Q = { type: 'jpeg', quality: 80 };
const FLAGS = /[\u{1F1E6}-\u{1F1FF}]/u;

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await C.chromium.launch(); const res = {}; let fails = 0;
  try {
    const o = await C.openPage(b, {}); await C.signUp(o.page, 'dvfx', 'Alex Rivera'); const state = await o.ctx.storageState(); await o.ctx.close();
    for (const lang of ['en', 'fr', 'es', 'tr']) {
      const { ctx, page, errors } = await C.openPage(b, { lang, theme: 'light', storageState: state });
      const r = res[lang] = {};
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await C.clearOverlays(page); await page.evaluate(seedInPage, 'active');
        const shot = async (sel, name) => { const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await C.sleep(250); await el.screenshot({ path: path.join(OUT, `${lang}-${name}.jpg`), ...Q }); };
        // fix 3: You → Progress row
        await page.evaluate(() => showShellSection('you')); await C.sleep(600);
        r.progressRow = await page.evaluate(() => document.getElementById('youValProgress').textContent.trim());
        await shot('#youValProgress >> xpath=ancestor::button[1]', 'you-progress-row');
        // fix 1 + 4: Profile account section and language buttons
        await page.evaluate(() => enterPanel('profile')); await C.sleep(600);
        r.resetBtn = await page.evaluate(() => document.getElementById('dashResetBtn').textContent.trim());
        r.profileLangs = await page.evaluate(() => [...document.querySelectorAll('[data-profile-lang]')].map(x => x.textContent.trim()));
        await shot('#dashResetBtn >> xpath=ancestor::*[contains(@class,"profile-set") or self::section][1]', 'profile-account');
        await shot('[data-profile-lang="en"] >> xpath=..', 'profile-languages');
        let msg = null; page.once('dialog', async d => { msg = d.message(); await d.dismiss(); });
        const before = await page.evaluate(() => JSON.stringify(progress).length);
        await page.evaluate(() => document.getElementById('dashResetBtn').click()); await C.sleep(500);
        r.confirm = msg; r.keptProgress = (await page.evaluate(() => JSON.stringify(progress).length)) === before;
        // fix 2: the Journey's curriculum card (the seed is on day 6)
        await page.evaluate(() => enterPanel('journey')); await C.sleep(600);
        r.sequence = await page.evaluate(() => (document.getElementById('curriculumExercises') || {}).textContent || null);
        r.message = await page.evaluate(() => (document.getElementById('curriculumMessage') || {}).textContent || null);
        if (r.sequence) await shot('#curriculumExercises >> xpath=ancestor::*[contains(@class,"card")][1]', 'journey-curriculum');
        // fix 4: the language chooser overlay
        await page.evaluate(() => { document.getElementById('languageSelectOverlay').style.display = 'flex'; }); await C.sleep(300);
        r.chooserLangs = await page.evaluate(() => [...document.querySelectorAll('#languageSelectOverlay [data-lang]')].map(x => x.textContent.replace(/\s+/g, ' ').trim()));
        await shot('#languageSelectOverlay .modal-card', 'language-chooser');
        r.errors = errors.slice();
        const ok = r.resetBtn && !/reset|réinit|restablecer|sıfırla/i.test(r.resetBtn) && r.confirm && r.keptProgress && r.sequence && !/->/.test(r.sequence + r.message)
          && !FLAGS.test(r.profileLangs.join('') + r.chooserLangs.join('')) && /^(Challenge|Défi|Desafío|Meydan)/.test(r.progressRow) && !errors.length;
        r.ok = !!ok; if (!ok) fails++;
        console.log(`${ok ? '✓' : '✗'} ${lang}: button "${r.resetBtn}" · confirm "${r.confirm}" (progress kept: ${r.keptProgress}) · row "${r.progressRow}"\n    sequence "${r.sequence}"\n    languages ${r.profileLangs.join(' | ')} / ${r.chooserLangs.join(' | ')} · page errors ${errors.length}`);
      } finally { await ctx.close(); }
    }
    console.log(`\nFIXSHOTS7: ${fails ? `FAIL: ${fails}` : 'PASS'}`); process.exitCode = fails ? 1 : 0;
  } finally { fs.writeFileSync(path.join(OUT, 'fixes.json'), JSON.stringify(res, null, 1)); await b.close(); C.cleanup(); }
})();
