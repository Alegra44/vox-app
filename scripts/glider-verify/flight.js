// Glider on a real throwaway account, played through the UI with a live "singer": the page's microphone is an
// oscillator (5 harmonics) whose pitch a 15 ms timer steers to the gap centre just ahead, or which goes silent. The
// sound goes through the app's own mic path and pitch detection (analyser → autoCorrelate), not a stub. Every course,
// beginner difficulty:
//   - before the first note (3 s of silence): frozen in the lead-in gap: no scroll, no score, no crash; the take-off
//     hint is drawn
//   - singing along (up to 12 s): it takes off and flies; seconds flown and the score are reported
//   - then sustained silence: it falls and the run ends within 3 s; never NaN
//   - stopped during the freeze (a new account, best still 0): no best saved, and only the two activity ticks' XP
//     (+5 at start, +5 at the end), not the new-best bonus
//   - the take-off hint in en / fr / es / tr, as drawn on the canvas
//   - the account's saved glider best is the highest finished score
// The test account is deleted however the run ends (testAccounts.js).
// Usage: node scripts/glider-verify/flight.js [url]   (no url: deploy/ served locally, production backend)
const { chromium } = require('playwright');
const path = require('path');
const { track, db, cleanup } = require('../choir-verify/testAccounts');

const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const email = track(`voxcoach-gfl-${Date.now()}@example.com`), password = 'VC-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0;
function check(label, ok, detail = '') { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(72)} ${detail}`); }
const MODES = ['highway', 'melody', 'interval', 'sustain', 'agility', 'keyshift', 'memory'];
const HINT = { en: 'Sing to take off', fr: 'Chantez pour décoller', es: 'Canta para despegar', tr: 'Havalanmak için söyleyin' }; // written out, not read from the page

const INIT = () => {
  let s = 1; window.__seed = v => { s = v >>> 0 || 1; }; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  window.__drawn = []; const ft = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (txt, ...a) { if (__drawn.length < 50) __drawn.push(txt); return ft.call(this, txt, ...a); };
  // the singer
  window.__singer = { on: false, ahead: 30 };
  navigator.mediaDevices.getUserMedia = async () => {
    if (!window.__ac) {
      const ac = window.__ac = new AudioContext(); await ac.resume();
      const osc = window.__osc = ac.createOscillator();
      osc.setPeriodicWave(ac.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.5, 0.33, 0.25, 0.2])));
      const g = window.__g = ac.createGain(); g.gain.value = 0; osc.connect(g); osc.start();
      setInterval(() => {
        let on = false;
        try {
          if (__singer.on && gliderActive) {
            const H = document.getElementById('gliderCanvas').height, { lowMidi, highMidi } = registerRangeBounds();
            const y = gliderGapAtWorldX(gliderScroll + 90 + __singer.ahead).gapY, m = lowMidi + (1 - y / H) * (highMidi - lowMidi);
            osc.frequency.setTargetAtTime(440 * Math.pow(2, (m - 69) / 12), ac.currentTime, 0.005); on = true;
          }
        } catch {}
        g.gain.setTargetAtTime(on ? 0.3 : 0, ac.currentTime, 0.003);
      }, 15);
    }
    const d = __ac.createMediaStreamDestination(); __g.connect(d); return d.stream;
  };
};

async function openPage(b) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const resp = await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(3000);
  if (!resp || resp.status() >= 400) throw new Error('page answered ' + (resp && resp.status()));
  if (!await page.evaluate(() => { try { return typeof sb !== 'undefined'; } catch { return false; } })) throw new Error('Supabase client missing (CDN script failed to load)');
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  await page.evaluate(() => openAuthModal());
  await page.locator('#authName').fill('Glider'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  console.log(`   signed up ${email}`);
  await page.evaluate(() => appInitPromise);
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  return { ctx, page, errors };
}
async function openGlider(page) {
  await page.locator('.snb-item[data-shell="world"]').click(); await sleep(500);
  await page.locator('.arcade-game-card[data-game="glider"]').click(); await sleep(800);
}
const state = page => page.evaluate(() => ({ active: gliderActive, off: gliderTookOff, scroll: gliderScroll, score: gliderScoreVal, y: gliderY, nan: Number.isNaN(gliderY) }));
async function start(page, mode, seed) {
  await page.evaluate(([m, s]) => { __singer.on = false; document.querySelector(`[data-glider-mode="${m}"]`).click(); document.querySelector('[data-glider-difficulty="beginner"]').click(); __seed(s); __drawn = []; }, [mode, seed]);
  await page.locator('#gliderStartBtn').click();
  await page.waitForFunction(() => gliderActive, null, { timeout: 15000 });
}
const account = () => db(`select xp, glider_best from public.user_progress where user_id = (select id from auth.users where email = '${email}')`)[0];

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let ctx, page, errors, best = null;
  const errCheck = () => { check('page errors', errors.length === 0, errors.length ? errors[0].slice(0, 120) : 'none'); errors.length = 0; };
  try {
    console.log(`== ${URL_ || 'local deploy/ (production backend)'}\n`);
    ({ ctx, page, errors } = await openPage(b));
    await openGlider(page);

    console.log('-- stopped during the freeze (new account, best 0)');
    await sleep(2000); const a0 = account();
    await start(page, 'highway', 7); await sleep(2000);
    const f0 = await state(page);
    await page.locator('#gliderStartBtn').click(); await sleep(3000);
    const a1 = account();
    check('frozen until stopped: score 0, no scroll', f0.active && !f0.off && f0.score === 0 && f0.scroll === 0, JSON.stringify(f0));
    check('no best saved; XP only +10 (start + end ticks), no new-best bonus', JSON.stringify(a1.glider_best) === JSON.stringify(a0.glider_best) && a1.xp - a0.xp === 10, `best ${JSON.stringify(a0.glider_best)} → ${JSON.stringify(a1.glider_best)}, xp ${a0.xp} → ${a1.xp}`);
    errCheck();

    for (const m of MODES) {
      console.log(`\n-- ${m}`);
      await start(page, m, 7);
      await sleep(3000);
      const fz = await state(page), hinted = await page.evaluate(() => __drawn.includes(t('glider_takeoff_hint')));
      check('3 s before the first note: frozen, no score, still running, hint drawn', fz.active && !fz.off && fz.score === 0 && fz.scroll === 0 && hinted, JSON.stringify({ ...fz, hinted }));
      await page.evaluate(() => { __singer.on = true; });
      const t0 = Date.now(); let nan = false, flew = 0, s;
      while (Date.now() - t0 < 12000) { s = await state(page); nan = nan || s.nan; if (!s.active) break; await sleep(100); }
      flew = (Date.now() - t0) / 1000;
      check('singing along: takes off and flies (not out at take-off)', s.off && flew > 3, `${flew.toFixed(1)} s${s.active ? ' (still flying at 12 s)' : ''}, score ${s.score}`);
      if (s.active) {
        await page.evaluate(() => { __singer.on = false; });
        const t1 = Date.now(); let s2;
        while (Date.now() - t1 < 6000) { s2 = await state(page); nan = nan || s2.nan; if (!s2.active) break; await sleep(50); }
        const q = (Date.now() - t1) / 1000;
        check('then sustained silence: the run ends within 3 s', !s2.active && q <= 3, `${q.toFixed(2)} s, final score ${s2.score}`);
        s = s2;
      }
      check('never NaN', !nan, '');
      best = Math.max(best || 0, s.score);
      await sleep(1500);
    }
    errCheck();

    console.log('\n-- the take-off hint in every language');
    for (const l of ['fr', 'es', 'tr', 'en']) {
      await page.evaluate(l => document.querySelector(`#profileLanguageRow [data-profile-lang="${l}"]`).click(), l); await sleep(700);
      await openGlider(page);
      await start(page, 'highway', 7); await sleep(800);
      const drawn = await page.evaluate(() => __drawn);
      await page.locator('#gliderStartBtn').click(); await sleep(1500);
      check(`${l}: "${HINT[l]}"`, drawn.includes(HINT[l]), `drawn: ${JSON.stringify([...new Set(drawn)])}`);
    }
    errCheck();

    console.log('\n-- the account');
    await sleep(2000);
    check('saved glider best = the highest finished score', Number(account().glider_best) === best, `${JSON.stringify(account().glider_best)} vs ${best}`);
    await ctx.close(); ctx = null;
  } catch (e) { check('ran to the end', false, e.message.split('\n')[0]); }
  finally {
    try { cleanup(); } finally { await Promise.race([b.close().catch(() => {}), sleep(10000)]); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
