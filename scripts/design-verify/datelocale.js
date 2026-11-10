// PHASE10.md A1: English dates follow the device's region. The working copy opened with the browser's locale set to
// each device language below; the app in English, French, Spanish and Turkish. Checks:
//   app in English: en-US (and "en", no region) → month-day ("Tuesday, November 3"); every other region → day-month
//     ("Tuesday 3 November", "Tuesday, 3 November"), en-CA and en-PH included, a non-English device (de-DE) too;
//   app in fr / es / tr: the same text whatever the device (the locale the page used before: fr-FR / es-ES / tr-TR
//     for the localeForLang sites, fr / es / tr for the currentLanguage ones);
//   Home's date line (#homeDate) as rendered, in English, per device.
// Usage: node scripts/design-verify/datelocale.js   (exit 1 on any failure)
const C = require('./common'); const fs = require('fs'), path = require('path');
const DEVICES = ['en-US', 'en', 'en-GB', 'en-IN', 'en-AU', 'en-IE', 'en-CA', 'en-PH', 'de-DE', 'fr-FR', 'tr-TR'];
const D = new Date(2026, 10, 3);
(async () => {
  const b = await C.chromium.launch(); let fails = 0; const other = {};
  for (const dev of DEVICES) {
    const ctx = await b.newContext({ locale: dev });
    await ctx.route(C.LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html', f = path.join(C.DEPLOY, p);
      fs.existsSync(f) ? r.fulfill({ path: f, contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' }) : r.fulfill({ status: 404, body: '' }); });
    const page = await ctx.newPage(); await page.goto(C.LOCAL); await C.sleep(2500);
    const r = await page.evaluate(ts => { const d = new Date(ts), o = {};
      for (const l of ['en', 'fr', 'es', 'tr']) { currentLanguage = l;
        o[l] = { long: new Intl.DateTimeFormat(dateLocale(l), { weekday: 'long', day: 'numeric', month: 'long' }).format(d),
                 short: new Intl.DateTimeFormat(dateLocale(localeForLang()), { day: 'numeric', month: 'short', year: 'numeric' }).format(d) }; }
      currentLanguage = 'en'; renderHomeScreen && renderHomeScreen(); return { nav: navigator.language, o, home: document.getElementById('homeDate').textContent }; }, +D);
    const usOrder = dev === 'en-US' || dev === 'en';
    const enOk = usOrder ? /November 3/.test(r.o.en.long) && /^Nov 3, 2026$/.test(r.o.en.short) : /3 November/.test(r.o.en.long) && /^3 Nov 2026$/.test(r.o.en.short);
    const homeOk = usOrder ? /^\w+, \w+ \d+$/.test(r.home) : /^\w+,? \d+ \w+$/.test(r.home);
    if (!enOk || !homeOk) fails++;
    for (const l of ['fr', 'es', 'tr']) (other[l] ||= new Set()).add(JSON.stringify(r.o[l]));
    console.log(`${enOk && homeOk ? '✓' : '✗'} device ${dev.padEnd(6)} (navigator ${r.nav}): en "${r.o.en.long}" / "${r.o.en.short}" · Home "${r.home}" · fr "${r.o.fr.long}" es "${r.o.es.long}" tr "${r.o.tr.long}"`);
    await ctx.close();
  }
  for (const l of ['fr', 'es', 'tr']) { const same = other[l].size === 1; if (!same) fails++; console.log(`${same ? '✓' : '✗'} ${l}: the same on every device ${[...other[l]][0]}`); }
  await b.close(); console.log(fails ? `\nDATELOCALE: ${fails} failed` : '\nDATELOCALE: PASS'); process.exit(fails ? 1 : 0);
})();
