// Sign-up probe (PHASE9.md "Deploy" §3): signs up through the page's own sheet N times (default 3) on the site in DV_URL
// (or the working copy), prints the seconds each took, deletes the accounts. Tells a slow Supabase from a broken sheet.
const C = require('./common'); const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const n = +(process.argv[2] || 3);
  for (let i = 0; i < n; i++) { const { ctx, page } = await C.openPage(b, {}); const t0 = Date.now();
    try { await C.signUp(page, 'probe', 'Probe'); console.log(`sign-up ${i + 1}: ${((Date.now() - t0) / 1000).toFixed(1)} s`); }
    catch (e) { console.log(`sign-up ${i + 1}: FAILED after ${((Date.now() - t0) / 1000).toFixed(1)} s (${e.message.split('\n')[0]})`); }
    await ctx.close(); }
  await b.close(); C.cleanup(); })();
