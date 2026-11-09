// PHASE8.md step 0: the plan buttons must not say something false. On the working copy (or --base <ref>, or DV_URL),
// in English and French, signed out and signed in (a fresh trial account): each of the four plan buttons on Plan &
// Pricing is clicked in turn.
//   signed out: the sign-in sheet opens with the title "Sign in to choose a plan" (keyed), never "Teacher Dashboard";
//   signed in:  #plansSoonOverlay opens with its keyed title and line and a Close button; the demo checkout stays hidden;
//               no toast or visible text says "subscribed" (en/fr); the plan is the same before, after the four clicks
//               and after a reload (profile.subscriptionPlan, read back from the server).
// No page errors. Out: <out>/checkout.json and one shot per case (--out, default a temp dir).
// Usage: node scripts/design-verify/checkout.js [--base <git ref>] [--out <dir>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-checkout'); const DIR = arg('--base') ? C.buildDir(arg('--base')) : C.REMOTE || C.DEPLOY;
const EXPECT = { en: { signin: 'Sign in to choose a plan', title: "Paid plans aren't on sale yet" },
                 fr: { signin: 'Connectez-vous pour choisir un forfait', title: 'Les forfaits payants ne sont pas encore en vente' } };
const SUBSCRIBED = /subscribed|abonné|suscrit|abone ol/i;

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await C.chromium.launch(); const res = []; let fails = 0;
  const check = (ok, what) => { res.push({ ok, what }); if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${what}`); };
  try {
    const o = await C.openPage(b, { dir: DIR }); await C.signUp(o.page, 'dvco', 'Plan Check'); const state = await o.ctx.storageState(); await o.ctx.close();
    for (const lang of ['en', 'fr']) for (const signed of [false, true]) {
      const { ctx, page, errors } = await C.openPage(b, { dir: DIR, lang, storageState: signed ? state : undefined });
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await C.clearOverlays(page);
        const tag = `${lang} ${signed ? 'signed in' : 'signed out'}`;
        const planBefore = signed ? await page.evaluate(() => profile.subscriptionPlan || null) : null;
        await page.evaluate(() => showPricingPanel()); await C.sleep(500);
        const plans = await page.evaluate(() => [...document.querySelectorAll('.plan-btn[data-plan]')].filter(x => !x.disabled).map(x => x.dataset.plan));
        check(plans.length >= 3, `${tag}: ${plans.length} enabled plan buttons (${plans.join(', ')})`);
        for (const plan of plans) {
          await page.locator(`.plan-btn[data-plan="${plan}"]`).scrollIntoViewIfNeeded();
          await page.locator(`.plan-btn[data-plan="${plan}"]`).click(); await C.sleep(400);
          const st = await page.evaluate(() => {
            const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
            const toast = [...document.querySelectorAll('.toast, #toast, [class*="toast"]')].map(e => e.textContent).join(' ');
            return { soon: vis('plansSoonOverlay'), checkout: vis('checkoutModalOverlay'), signin: vis('signinRequiredOverlay'),
              signinTitle: document.getElementById('signinRequiredTitle').textContent.trim(),
              soonTitle: (document.getElementById('plansSoonTitle') || {}).textContent || '', closeBtn: !!document.getElementById('plansSoonCloseBtn'),
              text: document.body.innerText, toast };
          });
          if (signed) {
            check(st.soon && !st.checkout && st.soonTitle.trim() === EXPECT[lang].title && st.closeBtn, `${tag} · ${plan}: the plans sheet ("${st.soonTitle.trim()}"), checkout hidden`);
            await page.screenshot({ path: path.join(OUT, `${lang}-signedin-${plan}.jpg`), type: 'jpeg', quality: 75 });
            await page.locator('#plansSoonCloseBtn').click(); await C.sleep(300);
          } else {
            check(st.signin && !st.soon && !st.checkout && st.signinTitle === EXPECT[lang].signin, `${tag} · ${plan}: sign-in sheet "${st.signinTitle}"`);
            await page.screenshot({ path: path.join(OUT, `${lang}-signedout-${plan}.jpg`), type: 'jpeg', quality: 75 });
            await page.locator('#signinRequiredCancelBtn').click(); await C.sleep(300);
          }
          check(!SUBSCRIBED.test(st.text + ' ' + st.toast), `${tag} · ${plan}: nothing says "subscribed"`);
        }
        if (signed) {
          const after = await page.evaluate(() => profile.subscriptionPlan || null);
          await page.reload({ waitUntil: 'load' });
          await page.waitForFunction(() => { try { return !!profile && !!progress; } catch (e) { return false; } }, null, { timeout: 30000 });
          const reloaded = await page.evaluate(() => profile.subscriptionPlan || null);
          check(after === planBefore && reloaded === planBefore, `${tag}: plan ${planBefore} → ${after} after the clicks → ${reloaded} after a reload`);
        }
        check(!errors.length, `${tag}: page errors ${errors.length}${errors.length ? ' ' + errors.slice(0, 2).join(' | ') : ''}`);
      } finally { await ctx.close(); }
    }
    console.log(`\nCHECKOUT: ${fails ? `FAIL: ${fails}` : 'PASS'} (${res.length} checks)`); process.exitCode = fails ? 1 : 0;
  } finally { fs.writeFileSync(path.join(OUT, 'checkout.json'), JSON.stringify(res, null, 1)); await b.close(); C.cleanup(); }
})();
