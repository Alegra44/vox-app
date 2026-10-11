// Phase 2 guard: the house lights. On the local build (production backend), in Light and Dark, at 390 and 1280, with
// the fake mic singing a steady real note (stage.js: VocalSet straight-625 centred on A4) and a fresh signed-in test
// account (deleted at exit). Checks (PHASE2.md §1a):
//  1 Tuner start: within 1.0 s body data-house="down", #tunerStage.is-live, its panel .is-staged, the title block
//    offstage, header and tab bar at opacity ≈ 0.38, and a tab is still what elementFromPoint finds at its centre.
//  2 Tuner lock: "In tune", #tunerLockFill at opacity 1.
//  3 Tuner stop: up within 1.5 s, no stage marks left, #tunerResult visible with a number.
//  4 Navigation mid-session (Home tab): up within 100 ms, no marks.
//  5 Pitch Match: down within 1.5 s and never up while the button is disabled (sampled every 100 ms); the lane's voice
//    path gains points; after the result up within 1.5 s, #pitchResult visible, #pitchTrace has a path.
//  6 Not staged: a Breath hold and an Interval Match take keep data-house="up" throughout.
//  7 Reduced motion: the dimmer never gets .is-on; down within 100 ms of the start, up 600 ms after the stop.
//  8 While down, every meta theme-color is #060708; afterwards they're restored.
//  9 #warmupOverlay has data-house="down".
// 10 Break banner with the Tuner live: #vlBreak displayed (not offstage), #micBtn still topmost (batch3c's check).
// The shared mic is opened once before the measured starts (stage.js warmMic), so the timings measure the lights.
// On a build without the lighting engine (master) there is nothing to test: the script says so and exits 0.
// Usage: node scripts/design-verify/house.js [--base <git ref>]   (DV_URL=https://… runs it on that site)
const C = require('./common'), S = require('./stage');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base');
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(74)} ${detail}`); };
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const STAGE_THEME = '#060708';

// in the page: a log of every data-house change and every time the dimmer is switched on
const MONITOR = () => {
  window.__hl = { log: [], dimOn: 0 };
  new MutationObserver(ms => { for (const m of ms) {
    if (m.target === document.body && m.attributeName === 'data-house') window.__hl.log.push({ t: performance.now(), house: document.body.dataset.house });
    if (m.target.classList && m.target.classList.contains('hl-dimmer') && m.target.classList.contains('is-on')) window.__hl.dimOn++;
  } }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-house', 'class'] });
};
const marks = page => page.evaluate(() => ({
  live: document.querySelectorAll('.is-live').length, staged: document.querySelectorAll('.is-staged').length,
  off: document.querySelectorAll('[data-offstage]').length, path: document.querySelectorAll('[data-stage-path]').length }));
const noMarks = m => !m.live && !m.staged && !m.off && !m.path;
const metas = page => page.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content));
// polls fn in the page every animation frame until it returns true or ms pass; resolves to the elapsed ms or null
const within = (page, fn, ms, from = '__t0') => page.evaluate(async ({ src, ms, from }) => {
  const f = new Function('return (' + src + ')()');
  const t0 = window[from] ?? performance.now();
  while (performance.now() - t0 <= ms) { if (f()) return Math.round(performance.now() - t0); await new Promise(r => requestAnimationFrame(r)); }
  return null;
}, { src: fn.toString(), ms, from });

async function combo(b, dir, state, theme, w) {
  console.log(`\n-- ${theme} · ${w}px`);
  const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state });
  await C.clearOverlays(page); await page.evaluate(MONITOR); await S.warmMic(page);
  const metaBefore = await metas(page);

  // 1 Tuner start
  await S.startTuner(page);
  const t1 = await within(page, () => {
    const st = document.getElementById('tunerStage'), panel = document.getElementById('panel-tuner'), hero = panel.querySelector('.journey-hero');
    const op = el => +getComputedStyle(el).opacity;
    const head = document.querySelector('header.shell-topbar'), nav = document.querySelector('nav.shell-bottomnav');
    const tab = document.querySelector('.snb-item[data-shell="songs"]'), r = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return document.body.dataset.house === 'down' && st.classList.contains('is-live') && panel.classList.contains('is-staged')
      && hero.hasAttribute('data-offstage') && getComputedStyle(hero).display === 'none'
      && Math.abs(op(head) - 0.38) < 0.02 && Math.abs(op(nav) - 0.38) < 0.02 && !!hit && hit.closest('.snb-item') === tab;
  }, 1000);
  const s1 = await page.evaluate(() => { const o = el => (+getComputedStyle(el).opacity).toFixed(2);
    const tab = document.querySelector('.snb-item[data-shell="songs"]'), r = tab.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return `house ${document.body.dataset.house} · stage ${document.getElementById('tunerStage')?.className} · header ${o(document.querySelector('header.shell-topbar'))} · nav ${o(document.querySelector('nav.shell-bottomnav'))} · tab hit ${!!hit && hit.closest('.snb-item') === tab}`; });
  check('1 Tuner start: down, stage live, panel staged, title offstage, shell .38, tab hit (≤1.0 s)', t1 !== null, t1 !== null ? `${t1} ms` : s1);
  // 8 theme-color while down
  const metaDown = await metas(page);
  check('8 while down: every meta theme-color is #060708', metaDown.length > 0 && metaDown.every(c => c.toUpperCase() === STAGE_THEME.toUpperCase()), metaDown.join(', '));
  // 2 lock
  const t2 = await within(page, () => document.getElementById('centsDisplay').textContent === 'In tune' && +getComputedStyle(document.getElementById('tunerLockFill')).opacity === 1, 4000);
  check('2 Tuner lock: "In tune" and #tunerLockFill at opacity 1', t2 !== null, t2 !== null ? `${t2} ms` : await page.evaluate(() => `${document.getElementById('centsDisplay').textContent} · fill ${document.getElementById('tunerLockFill') && getComputedStyle(document.getElementById('tunerLockFill')).opacity}`));
  // 10 break banner (signed in), the Tuner live
  await page.evaluate(() => vlShowBreak(todayStr(), 80, false)); await C.sleep(300);
  const brk = await page.evaluate(() => {
    const box = document.getElementById('vlBreak'), e = document.getElementById('micBtn'), r = e.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { shown: !!box && getComputedStyle(box).display !== 'none' && !!box.getClientRects().length, off: !!box && box.hasAttribute('data-offstage'), top: !!hit && (hit === e || e.contains(hit)) };
  });
  check('10 break banner: #vlBreak displayed (not offstage), #micBtn still topmost', brk.shown && !brk.off && brk.top, JSON.stringify(brk));
  await page.evaluate(() => vlHideBreak());
  // 3 stop
  await C.sleep(1500); await S.stopTuner(page);
  const t3 = await within(page, () => document.body.dataset.house === 'up', 1500, '__t1');
  await C.sleep(400);
  const m3 = await marks(page), res = await page.evaluate(() => { const r = document.getElementById('tunerResult');
    return { shown: !!r && getComputedStyle(r).display !== 'none' && !!r.getClientRects().length, text: r ? r.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : null }; });
  check('3 Tuner stop: up within 1.5 s', t3 !== null, t3 !== null ? `${t3} ms` : 'still down');
  check('3 Tuner stop: no is-live / is-staged / data-offstage / data-stage-path left', noMarks(m3), JSON.stringify(m3));
  check('3 Tuner stop: #tunerResult visible with a number', res.shown && /\d/.test(res.text || ''), JSON.stringify(res));
  const metaAfter = await metas(page);
  check('8 after: meta theme-color restored', JSON.stringify(metaAfter) === JSON.stringify(metaBefore), `${metaBefore.join(', ')} → ${metaAfter.join(', ')}`);
  // 4 navigation mid-session
  await S.startTuner(page);
  await within(page, () => document.body.dataset.house === 'down', 1500);
  const t4 = await page.evaluate(async () => {
    const t0 = performance.now(); document.querySelector('.snb-item[data-shell="home"]').click();
    while (performance.now() - t0 <= 100) { if (document.body.dataset.house === 'up') return Math.round(performance.now() - t0); await new Promise(r => setTimeout(r, 5)); }
    return null;
  });
  await C.sleep(50); const m4 = await marks(page);
  check('4 navigation mid-session: up within 100 ms, no marks left', t4 !== null && noMarks(m4), `${t4 !== null ? t4 + ' ms' : 'not up'} · ${JSON.stringify(m4)}`);
  // 5 Pitch Match
  await S.openPitch(page); await C.sleep(300);
  await page.evaluate(() => { // sample every 100 ms: the house, the button, the lane's voice points
    window.__pm = []; const pts = () => { const p = document.querySelector('#pitchLane .pm-lane-voice'); return p ? (p.getAttribute('d') || '').split(/[ML]/).length - 1 : 0; };
    window.__pmTimer = setInterval(() => window.__pm.push({ t: performance.now(), house: document.body.dataset.house, busy: document.getElementById('pitchListenBtn').disabled, pts: pts() }), 100);
  });
  await S.clickPitch(page); await C.sleep(300); await S.waitPitchDone(page); await page.evaluate(() => { window.__t1 = performance.now(); });
  const t5up = await within(page, () => document.body.dataset.house === 'up', 1500, '__t1');
  await C.sleep(300);
  const pm = await page.evaluate(() => { clearInterval(window.__pmTimer);
    const r = document.getElementById('pitchResult'), tr = document.getElementById('pitchTrace');
    return { log: window.__pm, t0: window.__t0, result: !!r && getComputedStyle(r).display !== 'none' && !!r.getClientRects().length,
      trace: !!tr && [...tr.querySelectorAll('path')].some(p => (p.getAttribute('d') || '').length > 10), acc: document.getElementById('pitchAccuracyVal').textContent }; });
  const firstDown = pm.log.find(s => s.house === 'down'), downAt = firstDown ? Math.round(firstDown.t - pm.t0) : null;
  const upWhileBusy = firstDown ? pm.log.filter(s => s.t >= firstDown.t && s.busy && s.house !== 'down').length : null;
  const maxPts = Math.max(0, ...pm.log.map(s => s.pts)), grew = pm.log.some((s, i) => i && s.pts > pm.log[i - 1].pts && pm.log[i - 1].pts > 0);
  check('5 Pitch Match: down within 1.5 s of the click', downAt !== null && downAt <= 1500, downAt !== null ? `${downAt} ms` : 'never down');
  check('5 Pitch Match: never up while the button is disabled (100 ms samples)', upWhileBusy === 0, `${upWhileBusy} samples up of ${pm.log.filter(s => s.busy).length} busy`);
  check('5 Pitch Match: #pitchLane voice path gains points while singing', maxPts > 1 && grew, `max ${maxPts} points`);
  check('5 Pitch Match: after the result up within 1.5 s, #pitchResult visible, #pitchTrace has a path', t5up !== null && pm.result && pm.trace, `${t5up !== null ? t5up + ' ms' : 'still down'} · result ${pm.result} · trace ${pm.trace} · ${pm.acc}`);
  // 6 not staged: a Breath hold and an Interval Match take
  await C.showPanel(page, 'breath'); await C.clearOverlays(page);
  await page.evaluate(() => { window.__ns = []; window.__nsTimer = setInterval(() => window.__ns.push(document.body.dataset.house + (document.querySelector('.is-live') ? '+live' : '')), 100); document.getElementById('breathStartBtn').click(); });
  await C.sleep(2500); await page.evaluate(() => { if (breathActive) document.getElementById('breathStartBtn').click(); }); await C.sleep(1200);
  const br = await page.evaluate(() => { clearInterval(window.__nsTimer); return window.__ns; });
  check('6 Breath hold: data-house="up" throughout, nothing staged', br.length > 10 && br.every(h => h === 'up'), `${br.length} samples: ${[...new Set(br)].join(', ')}`);
  await C.showPanel(page, 'exercises'); await C.clearOverlays(page);
  await page.evaluate(() => { document.querySelector('.ex-type-btn[data-extype="interval"]').click();
    window.__ns = []; window.__nsTimer = setInterval(() => window.__ns.push(document.body.dataset.house + (document.querySelector('.is-live') ? '+live' : '')), 100);
    document.getElementById('intervalListenBtn').click(); });
  await C.sleep(500); await page.waitForFunction(() => !document.getElementById('intervalListenBtn').disabled, null, { timeout: 20000 }); await C.sleep(1200);
  const iv = await page.evaluate(() => { clearInterval(window.__nsTimer); return window.__ns; });
  check('6 Interval Match take: data-house="up" throughout, nothing staged', iv.length > 10 && iv.every(h => h === 'up'), `${iv.length} samples: ${[...new Set(iv)].join(', ')}`);
  // 9 the warm-up overlay is a stage
  const wu = await page.evaluate(() => document.getElementById('warmupOverlay')?.getAttribute('data-house'));
  check('9 #warmupOverlay has data-house="down"', wu === 'down', String(wu));
  check('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
  await ctx.close();

  // 7 reduced motion
  const r = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state, reducedMotion: 'reduce' });
  await C.clearOverlays(r.page); await r.page.evaluate(MONITOR); await S.warmMic(r.page);
  await S.startTuner(r.page);
  const d7 = await within(r.page, () => document.body.dataset.house === 'down', 100);
  await C.sleep(1200); await S.stopTuner(r.page);
  const u7 = await within(r.page, () => document.body.dataset.house === 'up', 1500, '__t1');
  const dim7 = await r.page.evaluate(() => window.__hl.dimOn);
  check('7 reduced motion: down within 100 ms of the start', d7 !== null, d7 !== null ? `${d7} ms` : 'later');
  check('7 reduced motion: up 600 ms after the stop, at once (≤ 700 ms)', u7 !== null && u7 >= 590 && u7 <= 700, u7 !== null ? `${u7} ms` : 'not up');
  check('7 reduced motion: the dimmer never gets .is-on', dim7 === 0, `${dim7} times`);
  await r.ctx.close();
}

(async () => {
  S.ensureStimuli();
  const dir = C.buildDir(BASE);
  const b = await S.launchMic(S.STIM.steady);
  try {
    console.log(`== house · ${C.REMOTE || BASE || 'branch (working copy)'}`);
    const { ctx, page } = await C.openPage(b, { dir, theme: 'light' });
    const has = await page.evaluate(() => typeof houseSession === 'function' && !!document.getElementById('tunerStage'));
    if (!has) { await ctx.close(); console.log('\nthis build has no lighting engine (no houseSession, no #tunerStage): nothing to test'); return; }
    await C.signUp(page, 'dvh', 'House Check');
    const state = await ctx.storageState(); await ctx.close();
    for (const theme of ['light', 'dark']) for (const w of ['390', '1280']) await combo(b, dir, state, theme, w);
  } finally {
    await b.close();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
    C.cleanup();
  }
})();
