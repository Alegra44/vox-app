// Release F1's check (was WARMUP.md item 3's reproduction): the Vocal Load break banner while the pre-session warm-up is
// open. A user who already sang past 80 % of today's budget (seeded here as stored sessions, as if sung on another
// device) opens the Tuner; the day's first session shows the warm-up overlay; a warm-up exercise feeds Vocal Load
// (singingSession → vlSidecar) and vlCheckBreak shows the banner. Expected since F1: the banner is in the warm-up's card
// (vlPlaceBreak), inside the overlay, and visible (the point at its centre belongs to the banner); after Skip it is back
// in the Tuner's panel, visible. Shots: banner-inside-<1280|390|390-dark>.png and banner-after-skip-*.png.
// Local stack only, a throwaway account (deleted however the run ends), the fake mic (a C4 tone): silent.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/bannerbehind.js <outdir>
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const { sleep, check, totals, tone, launch, openPage, uid, db, warm, rearm, overlayShown } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OFF = -new Date().getTimezoneOffset(), LDAY = () => new Date(Date.now() + OFF * 60000).toISOString().slice(0, 10); // the app's day: local since release C
const OUT = process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : 'design/warmup/shots';
fs.mkdirSync(OUT, { recursive: true });
const BUDGET = 6800;
const dayTotal = () => Number(db(`select coalesce(sum(load), 0) as s from public.vocal_load_sessions where user_id = '${uid()}' and day = '${LDAY()}'`)[0].s);
function seedTo(pct) { // as batch3c: sessions under 60 active s, none over the load-rate bound
  const id = uid(), need = pct / 100 * BUDGET - dayTotal(), n = Math.ceil(need / (37 * 59)), each = need / n;
  for (let i = 0; i < n; i++) db('insert into public.vocal_load_sessions (user_id, session_id, day, started_at, ended, active_seconds, load, median_rms, p5_midi, p95_midi, tz_offset_min) '
    + `values ('${id}', gen_random_uuid(), '${LDAY()}', now(), true, 59, ${each.toFixed(6)}, 0.27, 60, 60, ${OFF})`);
  return dayTotal() / BUDGET * 100;
}
const state = page => page.evaluate(() => {
  const b = document.getElementById('vlBreak'), o = document.getElementById('warmupOverlay');
  if (!b) return { exists: false, pct: vlPercent() };
  const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 20));
  return { exists: true, displayed: getComputedStyle(b).display !== 'none', level: b.dataset.level, panel: (b.closest('section.panel') || {}).id || null,
    inOverlay: o.contains(b), inCard: !!b.closest('#warmupOverlay .wu-card'), seen: !!hit && b.contains(hit),
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inViewport: r.bottom > 0 && r.top < innerHeight,
    coveredByOverlay: !!hit && o.contains(hit), hitIn: hit ? (hit.id || hit.className || hit.tagName) : null,
    overlayZ: getComputedStyle(o).zIndex, overlayShown: getComputedStyle(o).display !== 'none', pct: vlPercent(), wuRunning: !!wuRun };
});

(async () => {
  const t = tone(60), b = await launch(t.wav);
  try {
    for (const [name, viewport, colorScheme] of [['1280', { width: 1280, height: 900 }, 'light'], ['390', { width: 390, height: 844 }, 'light'], ['390-dark', { width: 390, height: 844 }, 'dark']]) {
      const { page, errors } = await openPage(b, { viewport, colorScheme });
      await page.evaluate(() => { window.__wuAllow = true; });
      if (name === '1280') console.log(`   seeded today to ${seedTo(85).toFixed(2)} % of the budget (stored sessions, as from another device)`);
      await page.reload({ waitUntil: 'load' }); await sleep(3000);
      await page.evaluate(() => { window.__wuAllow = true; const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
      await rearm(page);
      // the Tuner: Train → Tuner → the mic button; the day's first session opens the warm-up first
      await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
      await page.locator('#panel-train-hub [data-enter-panel="tuner"]').click(); await sleep(800);
      await warm(page);
      const tc = Date.now(); await page.locator('#micBtn').click();
      const up = await page.waitForFunction(() => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', null, { timeout: 8000 }).then(() => true).catch(() => false);
      check(`${name}: the warm-up overlay is up before the Tuner starts`, up, `${Date.now() - tc} ms after the click`);
      await page.locator('#warmupList [data-wu-item="siren"]').click();
      let s; const t0 = Date.now();
      do { await sleep(200); s = await state(page); } while (!(s.exists && s.displayed) && Date.now() - t0 < 15000);
      console.log('   ' + JSON.stringify(s));
      check(`${name}: the banner is displayed, level 80`, s.exists && s.displayed && s.level === '80', `${s.pct?.toFixed(2)} %`);
      check(`${name}: it is in the warm-up's card, inside the overlay`, s.inOverlay && s.inCard, `panel: ${s.panel}`);
      check(`${name}: it is visible (the point on it is the banner's own, in the viewport)`, s.seen && s.inViewport, `hit: ${s.hitIn}`);
      await page.screenshot({ path: path.join(OUT, `banner-inside-${name}.png`) });
      await page.locator('#warmupSkipBtn').click(); await sleep(800);
      const after = await state(page);
      check(`${name}: after Skip it is back in the Tuner's panel and visible`, after.displayed && after.panel === 'panel-tuner' && !after.inOverlay && after.seen, `${after.panel}, hit: ${after.hitIn}`);
      await page.screenshot({ path: path.join(OUT, `banner-after-skip-${name}.png`) });
      check(`${name}: no page errors`, errors.length === 0, errors.join(' | '));
      await page.context().close();
    }
  } finally { await b.close(); await cleanup(); }
  const { pass, fail } = totals(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
