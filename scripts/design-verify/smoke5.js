// Phase 5 build smoke (scratch, not a guard): signs up, opens the landing, each tab and a trainer, screenshots each
// at the given width and theme, prints page errors. Usage: node scripts/design-verify/smoke5.js <out dir> [390|1280] [light|dark] [states,...]
const C = require('./common'), S = require('./stage'), path = require('path'), fs = require('fs');
const OUT = process.argv[2], W = +(process.argv[3] || 390), THEME = process.argv[4] || 'light', ONLY = process.argv[5] ? process.argv[5].split(',') : null;
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); S.ensureStimuli();
  const b = await S.launchMic(S.STIM.steady);
  try {
    const { page, errors } = await C.openPage(b, { theme: THEME, viewport: { width: W, height: W === 390 ? 844 : 800 } });
    const cons = []; page.on('console', m => { if (m.type() === 'error') cons.push(m.text().split('\n')[0]); });
    await C.signUp(page, 'dvsm5', 'Smoke Five'); await C.clearOverlays(page); await S.warmMic(page);
    const shot = async (name, full = true) => { await C.sleep(500); await page.screenshot({ path: path.join(OUT, `${name}.jpg`), fullPage: full, type: 'jpeg', quality: 70 }); console.log('  shot', name); };
    const STATES = {
      songs: async () => { await page.evaluate(() => showShellSection('songs')); await shot('songs'); },
      landing: async () => { await page.evaluate(() => { showShellSection('songs'); document.querySelector('[data-cw-landing]').click(); }); await shot('landing'); },
      rehearse: async () => { await page.evaluate(() => cwShowTab('rehearse')); await shot('rehearse'); },
      songlab: async () => { await page.evaluate(() => cwShowTab('songlab')); await shot('songlab'); },
      trainers: async () => { await page.evaluate(() => cwShowTab('trainers')); await shot('trainers'); },
      hm: async () => { await page.evaluate(() => cwOpenTrainer('hm')); await shot('trainer-hm'); },
      yourchoir: async () => { await page.evaluate(() => cwShowTab('yourchoir')); await shot('yourchoir'); },
      passport: async () => { await page.evaluate(() => cwShowTab('passport')); await shot('passport'); },
    };
    for (const [k, f] of Object.entries(STATES)) if (!ONLY || ONLY.includes(k)) await f();
    const extra = process.env.SMOKE_EVAL; if (extra) console.log('eval:', JSON.stringify(await page.evaluate(extra)));
    console.log('page errors:', errors.length ? errors.join(' | ') : 'none', '· console errors:', cons.length ? cons.slice(0, 5).join(' | ') : 'none');
  } finally { await b.close(); C.cleanup(); }
})();
