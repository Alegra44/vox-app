// PHASE8.md step 0: the plan buttons must not say something false. On the working copy (or --base <ref>, or DV_URL),
// in English and French, signed out and signed in (a fresh trial account): each of the four plan buttons on Plan &
// Pricing is clicked in turn.
//   signed out: the sign-in sheet opens with the title "Sign in to choose a plan" (keyed), never "Teacher Dashboard";
//   signed in:  #plansSoonOverlay opens with its keyed title and line and a Close button; the demo checkout stays hidden;
//               no toast or visible text says "subscribed" (en/fr); the plan is the same before, after the four clicks
//               and after a reload (profile.subscriptionPlan, read back from the server).
// PHASE9.md 1c adds, in English and French:
//   Pricing signed out and in: no button offers a price (no enabled button's text has a price in it);
//   the paywall in the expired state (the 21 days over, no plan: set in the page only) for every gated feature, through
//   the app's own gate (requireProFeature / requireChoirWorld / requireChoirFeature with the label each call site
//   passes): it opens; its title is the feature's name from the feature-name map (translateFeatureLabel finds a key for
//   it) and never an internal label; no price anywhere on it; Close closes it; "See the plans" opens Plan & Pricing.
// No page errors. Out: <out>/checkout.json and one shot per case (--out, default a temp dir).
// Usage: node scripts/design-verify/checkout.js [--base <git ref>] [--out <dir>]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-checkout'); const DIR = arg('--base') ? C.buildDir(arg('--base')) : C.REMOTE || C.DEPLOY;
const EXPECT = { en: { signin: 'Sign in to choose a plan', title: "Paid plans aren't on sale yet" },
                 fr: { signin: 'Connectez-vous pour choisir un forfait', title: 'Les forfaits payants ne sont pas encore en vente' } };
const SUBSCRIBED = /subscribed|abonné|suscrit|abone ol/i;
const PRICE = /[$€£]\s?\d|\d\s?[$€£]|\d+[.,]\d{2}\s?(\/|per |par )|\/\s?(mo|yr|mois|an|mes|año|ay|yıl)\b/i;
// every gate and the label its call sites pass (grep of deploy/index.html, phase 9)
const GATED = [
  ...['Can You Hear Your Mistake?', 'AI Duet Partner', 'Ear → Voice → Ear', 'Emotion Mode', 'Emotional Singing', 'Exercises', 'Harmony Arena',
    'Karaoke Boss Battle', 'Karaoke Coach', 'Key recommendation', 'Mirror Mode', 'One Take Challenge', 'Performance Director', 'Range Finder',
    'Real-Time Feedback', 'Register Coach', 'Register Drills', 'Register Runner', 'Resonance Visualizer', 'Rhythm Trainer', 'Sing It 5 Ways',
    'Stay in Key', 'Studio Mode', 'The Vocal Rift', 'Tuner', 'Vocal Journey', 'Vocal Puzzle'].map(l => ['requireProFeature', l]),
  ...['A Cappella Mode', 'Entrance & Cutoff Trainer', 'Harmony Memory', 'I Am the Part', 'Sonic X-Ray', 'Your Choir', 'Choir Bosses', 'Chaos Mode', 'Tempo/Key Ladder'].map(l => ['requireChoirWorld', l]),
  ['requireChoirFeature', 'Per-part mixing'],
];
// the code's own names that aren't the feature's name on screen (PHASE8_SURVEY, PHASE9.md 2.5)
const INTERNAL = ['Sonic X-Ray', 'The Vocal Rift', 'Register Runner', 'Karaoke Boss Battle', 'Harmony Arena', 'Vocal Journey'];

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
        const priced = await page.evaluate(re => { const r = new RegExp(re, 'i'); return [...document.querySelectorAll('#panel-pricing button')].filter(b => b.getClientRects().length && !b.disabled && r.test(b.textContent)).map(b => b.textContent.trim()); }, PRICE.source);
        check(!priced.length, `${tag}: no button on Plan & Pricing offers a price${priced.length ? ': ' + priced.join(' | ') : ''}`);
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
    // the paywall, expired, for every gated feature
    for (const lang of ['en', 'fr']) {
      const { ctx, page, errors } = await C.openPage(b, { dir: DIR, lang, storageState: state });
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await C.clearOverlays(page);
        await page.evaluate(() => { window.saveProfile = async p => { profile = p; }; window.saveProgress = async () => {};
          const d = new Date(); d.setDate(d.getDate() - 30); profile.trialStartDate = d.toISOString(); profile.subscriptionPlan = null; });
        let n = 0;
        for (const [fn, label] of GATED) {
          const r = await page.evaluate(([fn, label, re]) => {
            document.getElementById('paywallModalOverlay').style.display = 'none';
            const ok = window[fn](label);
            const o = document.getElementById('paywallModalOverlay'), shown = getComputedStyle(o).display !== 'none';
            const vis = [...o.querySelectorAll('*')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
            const text = vis.map(e => [...e.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent).join('')).join(' ').replace(/\s+/g, ' ').trim();
            return { ok, shown, title: document.getElementById('paywallTitle').textContent.trim(), mapped: translateFeatureLabel(label) !== label || (typeof FEATURE_LABEL_KEYS !== 'undefined' && !!FEATURE_LABEL_KEYS[label]),
              want: translateFeatureLabel(label), price: new RegExp(re, 'i').test(text), text };
          }, [fn, label, PRICE.source]);
          const good = r.ok === false && r.shown && r.title === r.want && r.mapped && !INTERNAL.includes(r.title) && !r.price;
          if (!good) check(false, `${lang} expired · ${label}: paywall ${r.shown}, title "${r.title}"${r.mapped ? '' : ' (no name key)'}${INTERNAL.includes(r.title) ? ' (internal label)' : ''}${r.price ? ' · shows a price: ' + r.text.slice(0, 120) : ''}`);
          else n++;
          if (label === 'The Vocal Rift' || label === 'Sonic X-Ray') await page.screenshot({ path: path.join(OUT, `${lang}-expired-paywall-${label.replace(/\W+/g, '')}.jpg`), type: 'jpeg', quality: 75 });
        }
        check(n === GATED.length, `${lang} expired: ${n} of ${GATED.length} gated features open the paywall with the feature's name and no price`);
        // its two actions
        await page.evaluate(() => requireProFeature('Tuner')); await C.sleep(200);
        await page.locator('#paywallCancelBtn').click(); await C.sleep(300);
        check(await page.evaluate(() => getComputedStyle(document.getElementById('paywallModalOverlay')).display === 'none'), `${lang} expired: Close closes the paywall`);
        await page.evaluate(() => requireProFeature('Tuner')); await C.sleep(200);
        await page.locator('#paywallViewPlansBtn').click(); await C.sleep(500);
        check(await page.evaluate(() => getComputedStyle(document.getElementById('paywallModalOverlay')).display === 'none' && document.getElementById('panel-pricing').classList.contains('active')), `${lang} expired: "See the plans" opens Plan & Pricing`);
        check(!errors.length, `${lang} expired: page errors ${errors.length}${errors.length ? ' ' + errors.slice(0, 2).join(' | ') : ''}`);
      } finally { await ctx.close(); }
    }
    console.log(`\nCHECKOUT: ${fails ? `FAIL: ${fails}` : 'PASS'} (${res.length} checks)`); process.exitCode = fails ? 1 : 0;
  } finally { fs.writeFileSync(path.join(OUT, 'checkout.json'), JSON.stringify(res, null, 1)); await b.close(); C.cleanup(); }
})();
