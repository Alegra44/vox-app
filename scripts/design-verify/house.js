// Phase 2 guard: the house lights. On the local build (production backend), in Light and Dark, at 390 and 1280, with
// the fake mic singing a steady real note (stage.js: VocalSet straight-625 centred on A4) and a fresh signed-in test
// account (deleted at exit). Checks (PHASE2.md §1a):
//  1 Tuner start: within 1.0 s body data-house="down", #tunerStage.is-live, its panel .is-staged, the title block
//    offstage, and a tab is still what elementFromPoint finds at its centre. The header and tab bar dim by colour (2.8):
//    opacity 1, the wordmark, its mark, the avatar, every tab (the active one too) and the playhead at the stage's
//    --hl-ink-3; hovering the tab bar gives back the usual colours (the active tab --hl-ink, the playhead --hl-voice).
//  2 Tuner lock: "In tune", #tunerLockFill at opacity 1.
//  3 Tuner stop: up within 1.5 s, no stage marks left, #tunerResult visible with a number, the live .stat-row hidden.
//  4 Navigation mid-session (Home tab): up within 100 ms, no marks.
//  5 Pitch Match: down within 1.5 s and never up while the button is disabled (sampled every 100 ms); the lane's voice
//    path gains points; #pitchCentsRead reads pm_live_on and #pitchTargetNote gets .pm-locked at some point; no console
//    errors during the take; after the result up within 1.5 s, #pitchResult visible, #pitchTrace has a path, the big
//    number in --hl-ink, "Sing it again (A4)" shown. With the sharp stimulus (once, Light 390): the readout reads
//    pm_live_sharp with a number and the note never locks.
//  6 Phase 4a (PHASE4A.md §1b), the tools on the take stage (tools.js: Interval Match, Scale Run, Custom Challenge,
//    Ear → Voice → Ear, Sing It 5 Ways, Hear Your Mistake's sing-back, Range Finder, Breath Trainer), each: the house
//    down within 1.5 s of the take's start and never up while it runs (100 ms samples), its .vc-stage live; #vlBreak
//    displayed on its stage (not offstage); the tool's control on the stage (tools.js btn) topmost at its centre; after
//    the take up within 1.5 s, the result shown, no marks left. A second take: stopAllActiveSessions() brings the house
//    up within 100 ms, no marks left. The paper tools (Key Trainer, Vocal Lab, Genre Coach, Smart Warmup, Ear Training,
//    Vocal Puzzle): their action keeps data-house="up" throughout, nothing staged. (Phase 2's check 6, a Breath hold and an
//    Interval Match take not staged, is replaced: 4a puts both on the stage.)
// 11 Phase 4b (PHASE4B.md §1c), the 10 tools with their own displays (tools4b.js). The take tools (One Take, Mirror,
//    Rhythm, Register Drills, Vibrato, Voice Quality, Emotion Mode), each: down within 1.5 s of the start with its own
//    .vc-stage (tools4b.js stage) live, never up while the exercise runs (100 ms samples; Mirror: the phrase and the
//    echo), #vlBreak displayed on the stage, the start/stop button (btn) topmost, up within 1.5 s after, the result
//    shown, no marks left. The live tools (Register Coach, Live Feedback, Resonance): down within 1.5 s of Start with
//    the stage live, never up while listening, #vlBreak, the button topmost, up within 1.5 s of Stop, no marks. For
//    every one, a second start: stopAllActiveSessions() brings the house up within 100 ms, no marks left. No console
//    errors during any of it. --only4b runs check 11 alone (and the page checks it needs).
//  7 Reduced motion: the dimmer never gets .is-on; down within 100 ms of the start, up 600 ms after the stop.
//  8 While down, every meta theme-color is #060708; afterwards they're restored.
//  9 #warmupOverlay has data-house="down".
// 10 Break banner with the Tuner live: #vlBreak displayed (not offstage), #micBtn still topmost (batch3c's check).
// The shared mic is opened once before the measured starts (stage.js warmMic), so the timings measure the lights.
// On a build without the lighting engine (master) there is nothing to test: the script says so and exits 0.
// Usage: node scripts/design-verify/house.js [--base <git ref>]   (DV_URL=https://… runs it on that site)
const C = require('./common'), S = require('./stage'), T = require('./tools'), T4 = require('./tools4b');
const ONLY4B = process.argv.includes('--only4b');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base');
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(74)} ${detail}`); };
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const STAGE_THEME = '#060708';

// in the page: a log of every data-house change and every time the dimmer is switched on
const MONITOR = () => {
  window.__hl = { log: [], dimOn: 0 };
  // the shell while the house is down: opacity 1, every text and icon at --hl-ink-3 (2.8), tabs hit at their centres
  window.SHELL = () => {
    const tok = v => { const i = document.createElement('i'); i.style.color = `var(${v})`; document.body.appendChild(i); const c = getComputedStyle(i).color; i.remove(); return c; };
    const ink3 = tok('--hl-ink-3'), ink = tok('--hl-ink'), voice = tok('--hl-voice');
    const head = document.querySelector('header.shell-topbar'), nav = document.querySelector('nav.shell-bottomnav');
    const tabs = [...nav.querySelectorAll('.hl-tab')], act = nav.querySelector('.hl-tab[aria-current="page"]');
    const word = head.querySelector('.vc-brand'), mark = head.querySelector('.vc-mark'), av = head.querySelector('.vc-avatar, .vc-signin');
    const play = act ? getComputedStyle(act, '::before').backgroundColor : null;
    const hits = tabs.every(tb => { const r = tb.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && h.closest('.hl-tab') === tb; });
    const c = { opacity: [getComputedStyle(head).opacity, getComputedStyle(nav).opacity], word: getComputedStyle(word).color, mark: getComputedStyle(mark).stroke,
      avatar: av && getComputedStyle(av).color, tabs: tabs.map(tb => getComputedStyle(tb).color), active: act && getComputedStyle(act).color, playhead: play, hits, ink3 };
    c.ok = c.opacity.every(o => o === '1') && c.word === ink3 && c.mark === ink3 && (!av || c.avatar === ink3) && c.tabs.every(x => x === ink3) && c.playhead === ink3 && hits;
    c.hoverNav = c.active === ink && c.playhead === voice;
    return c;
  };
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
  const t0 = (from && window[from]) ?? performance.now();
  while (performance.now() - t0 <= ms) { if (f()) return Math.round(performance.now() - t0); await new Promise(r => requestAnimationFrame(r)); }
  return null;
}, { src: fn.toString(), ms, from });

async function combo(b, dir, state, theme, w) {
  console.log(`\n-- ${theme} · ${w}px`);
  const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: state });
  const consoleErrors = []; page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().split('\n')[0]); });
  await C.clearOverlays(page); await page.evaluate(MONITOR); await S.warmMic(page);
  if (ONLY4B) { await tool4bChecks(page, consoleErrors); check('no page errors', !errors.length, errors.slice(0, 2).join(' | ')); await ctx.close(); return; }
  const metaBefore = await metas(page);

  // 1 Tuner start
  await S.startTuner(page);
  const t1 = await within(page, () => {
    const st = document.getElementById('tunerStage'), panel = document.getElementById('panel-tuner'), hero = panel.querySelector('.journey-hero');
    return document.body.dataset.house === 'down' && st.classList.contains('is-live') && panel.classList.contains('is-staged')
      && hero.hasAttribute('data-offstage') && getComputedStyle(hero).display === 'none' && SHELL().ok;
  }, 1000);
  const s1 = await page.evaluate(() => SHELL());
  check('1 Tuner start: down, stage live, panel staged, title offstage, shell dimmed by colour, tabs hit (≤1.0 s)', t1 !== null, t1 !== null ? `${t1} ms` : JSON.stringify(s1));
  // 1 hover: the tab bar gets its usual colours back, and loses them again when the pointer leaves
  const nr = await page.evaluate(() => { const r = document.querySelector('nav.shell-bottomnav').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(nr.x, nr.y);
  const tHover = await within(page, () => { const s = SHELL(); return s.hoverNav; }, 1500, null);
  const sHover = await page.evaluate(() => SHELL());
  await page.mouse.move(2, 300);
  const tLeave = await within(page, () => SHELL().ok, 1500, null);
  check('1 hover on the tab bar: usual colours back (active tab ink, playhead voice); dim again on leaving', tHover !== null && tLeave !== null, `${tHover !== null ? `back in ${tHover} ms` : JSON.stringify(sHover)} · ${tLeave !== null ? `dim again in ${tLeave} ms` : 'not dim again'}`);
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
  const m3 = await marks(page), res = await page.evaluate(() => { const r = document.getElementById('tunerResult'), sr = document.querySelector('#tunerStage .stat-row');
    return { shown: !!r && getComputedStyle(r).display !== 'none' && !!r.getClientRects().length, text: r ? r.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : null,
      stats: !!sr && getComputedStyle(sr).display !== 'none' }; });
  check('3 Tuner stop: up within 1.5 s', t3 !== null, t3 !== null ? `${t3} ms` : 'still down');
  check('3 Tuner stop: no is-live / is-staged / data-offstage / data-stage-path left', noMarks(m3), JSON.stringify(m3));
  check('3 Tuner stop: #tunerResult visible with a number', res.shown && /\d/.test(res.text || ''), JSON.stringify(res));
  check('3 Tuner stop: the live .stat-row hidden while the result shows', res.shown && !res.stats, `stats ${res.stats ? 'shown' : 'hidden'}`);
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
    window.__pmTimer = setInterval(() => window.__pm.push({ t: performance.now(), house: document.body.dataset.house, busy: document.getElementById('pitchListenBtn').disabled, pts: pts(),
      read: document.getElementById('pitchCentsRead').textContent, locked: document.getElementById('pitchTargetNote').classList.contains('pm-locked') }), 50);
  });
  const cons0 = consoleErrors.length;
  await S.clickPitch(page); await C.sleep(300); await S.waitPitchDone(page); await page.evaluate(() => { window.__t1 = performance.now(); });
  const takeErrors = consoleErrors.slice(cons0);
  const t5up = await within(page, () => document.body.dataset.house === 'up', 1500, '__t1');
  await C.sleep(300);
  const pm = await page.evaluate(() => { clearInterval(window.__pmTimer);
    const r = document.getElementById('pitchResult'), tr = document.getElementById('pitchTrace');
    return { log: window.__pm, t0: window.__t0, result: !!r && getComputedStyle(r).display !== 'none' && !!r.getClientRects().length,
      trace: !!tr && [...tr.querySelectorAll('path')].some(p => (p.getAttribute('d') || '').length > 10), acc: document.getElementById('pitchAccuracyVal').textContent,
      on: t('pm_live_on'), numInk: (() => { const i = document.createElement('i'); i.style.color = 'var(--hl-ink)'; document.body.appendChild(i); const c = getComputedStyle(i).color; i.remove(); return getComputedStyle(document.getElementById('pitchAccuracyVal')).color === c; })(),
      again: (() => { const a = document.getElementById('pitchAgainBtn'); return { shown: getComputedStyle(a).display !== 'none' && !!a.getClientRects().length, text: a.textContent }; })() }; });
  const firstDown = pm.log.find(s => s.house === 'down'), downAt = firstDown ? Math.round(firstDown.t - pm.t0) : null;
  const upWhileBusy = firstDown ? pm.log.filter(s => s.t >= firstDown.t && s.busy && s.house !== 'down').length : null;
  const maxPts = Math.max(0, ...pm.log.map(s => s.pts)), grew = pm.log.some((s, i) => i && s.pts > pm.log[i - 1].pts && pm.log[i - 1].pts > 0);
  check('5 Pitch Match: down within 1.5 s of the click', downAt !== null && downAt <= 1500, downAt !== null ? `${downAt} ms` : 'never down');
  check('5 Pitch Match: never up while the button is disabled (100 ms samples)', upWhileBusy === 0, `${upWhileBusy} samples up of ${pm.log.filter(s => s.busy).length} busy`);
  check('5 Pitch Match: #pitchLane voice path gains points while singing', maxPts > 1 && grew, `max ${maxPts} points`);
  const reads = [...new Set(pm.log.map(s => s.read).filter(Boolean))];
  check('5 Pitch Match: #pitchCentsRead reads pm_live_on at some point', reads.includes(pm.on), reads.slice(0, 6).join(' | ') || 'empty');
  check('5 Pitch Match: #pitchTargetNote gets .pm-locked at some point', pm.log.some(s => s.locked), `${pm.log.filter(s => s.locked).length} of ${pm.log.length} samples`);
  check('5 Pitch Match: no console errors during the take', takeErrors.length === 0, takeErrors.slice(0, 2).join(' | ') || 'none');
  check('5 Pitch Match: after the result up within 1.5 s, #pitchResult visible, #pitchTrace has a path', t5up !== null && pm.result && pm.trace, `${t5up !== null ? t5up + ' ms' : 'still down'} · result ${pm.result} · trace ${pm.trace} · ${pm.acc}`);
  check('5 Pitch Match: the big number in --hl-ink', pm.numInk, pm.acc);
  check('5 Pitch Match: "Sing it again (A4)" shown with the result', pm.again.shown && /\(A4\)/.test(pm.again.text), JSON.stringify(pm.again));
  // 6 the phase 4a tools
  await toolChecks(page, consoleErrors);
  // 11 the phase 4b tools
  await tool4bChecks(page, consoleErrors);
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

// 6 the phase 4a tools (see the header)
async function toolChecks(page, consoleErrors) {
  const sample = () => page.evaluate(busySrc => { const busy = new Function('return (' + busySrc + ')()');
    window.__ts = []; clearInterval(window.__tsT);
    window.__tsT = setInterval(() => { let b = false; try { b = !!busy(); } catch (e) {} window.__ts.push({ t: performance.now(), house: document.body.dataset.house, busy: b, live: !!document.querySelector('.vc-stage.is-live') }); }, 100); }, ONE.busy.toString());
  let ONE;
  for (const tool of T.SUNG) {
    ONE = tool;
    await tool.open(page); await C.sleep(400);
    await sample(); const cons0 = consoleErrors.length;
    let brk = null, top = null;
    const { started, done } = await T.runTake(page, tool, { liveAt: 1300, onLive: async () => {
      top = await page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return { found: false };
        const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { found: true, shown: !!e.getClientRects().length && getComputedStyle(e).display !== 'none', top: !!h && (h === e || e.contains(h)) }; }, tool.btn);
      await page.evaluate(() => vlShowBreak(todayStr(), 80, false)); await C.sleep(250);
      brk = await page.evaluate(() => { const box = document.getElementById('vlBreak'); return { shown: !!box && getComputedStyle(box).display !== 'none' && !!box.getClientRects().length, off: !!box && box.hasAttribute('data-offstage'), house: document.body.dataset.house }; });
      await page.evaluate(() => vlHideBreak());
    } });
    await page.evaluate(() => { window.__t1 = performance.now(); });
    const up = await within(page, () => document.body.dataset.house === 'up', 1500, '__t1');
    await C.sleep(400);
    const log = await page.evaluate(() => { clearInterval(window.__tsT); return { s: window.__ts, t0: window.__t0 }; });
    const m = await marks(page), shown = await page.evaluate(T.vis, tool.result);
    const firstDown = log.s.find(x => x.house === 'down'), downAt = firstDown ? Math.round(firstDown.t - log.t0) : null;
    const upBusy = firstDown ? log.s.filter(x => x.t >= firstDown.t && x.busy && x.house !== 'down').length : null;
    const n = tool.name, errs = consoleErrors.slice(cons0);
    check(`6 ${n}: down within 1.5 s of the start, the stage live`, started && downAt !== null && downAt <= 1500 && log.s.some(x => x.live), `${downAt !== null ? downAt + ' ms' : 'never down'}${started ? '' : ' · take did not start'}`);
    check(`6 ${n}: never up while the take runs (100 ms samples)`, upBusy === 0, `${upBusy} up of ${log.s.filter(x => x.busy).length} busy`);
    check(`6 ${n}: #vlBreak displayed on its stage, not offstage`, !!brk && brk.shown && !brk.off && brk.house === 'down', JSON.stringify(brk));
    check(`6 ${n}: ${tool.btn} topmost on the stage`, !!top && top.found && top.shown && top.top, JSON.stringify(top));
    check(`6 ${n}: up within 1.5 s after, result shown, no marks left`, done && up !== null && shown && noMarks(m), `${up !== null ? up + ' ms' : 'still down'} · result ${shown} · ${JSON.stringify(m)}${done ? '' : ' · take did not finish'}`);
    check(`6 ${n}: no console errors during the take`, errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
    await T.restoreRange(page);
    // a second take, stopped by stopAllActiveSessions while the house is down
    await tool.open(page); await C.sleep(400);
    if (tool.pre) await tool.pre(page);
    await tool.act(page);
    const down2 = await page.waitForFunction(() => document.body.dataset.house === 'down', null, { timeout: 4000 }).then(() => true, () => false);
    const t6 = await page.evaluate(async () => { const t0 = performance.now(); stopAllActiveSessions();
      while (performance.now() - t0 <= 100) { if (document.body.dataset.house === 'up') return Math.round(performance.now() - t0); await new Promise(r => setTimeout(r, 5)); } return null; });
    await C.sleep(50); const m6 = await marks(page);
    check(`6 ${n}: stopAllActiveSessions() brings it up within 100 ms, no marks`, down2 && t6 !== null && noMarks(m6), `${down2 ? '' : 'never down · '}${t6 !== null ? t6 + ' ms' : 'not up'} · ${JSON.stringify(m6)}`);
    // let a take that stopAllActiveSessions doesn't end run out (it stays lit), then clean up
    await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: tool.timeout || 20000 }).catch(() => {});
    if (tool.key === 'range') await page.evaluate(() => { mode = null; });
    if (tool.key === 'breath') await page.evaluate(() => { if (breathActive) finishBreathHold(); });
    await T.restoreRange(page); await C.sleep(300);
  }
  for (const tool of T.PAPER) {
    await tool.open(page); await C.sleep(400);
    await page.evaluate(() => { window.__ns = []; clearInterval(window.__nsT); window.__nsT = setInterval(() => window.__ns.push(document.body.dataset.house + (document.querySelector('.is-live, .is-staged, [data-offstage]') ? '+staged' : '')), 100); });
    await tool.act(page); await C.sleep(1500);
    const ns = await page.evaluate(() => { clearInterval(window.__nsT); return window.__ns; });
    check(`6 ${tool.name} (not sung): data-house="up" throughout, nothing staged`, ns.length > 10 && ns.every(h => h === 'up'), `${ns.length} samples: ${[...new Set(ns)].join(', ')}`);
  }
}

// 11 the phase 4b tools (see the header)
async function tool4bChecks(page, consoleErrors) {
  const topmost = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return { found: false };
    const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { found: true, shown: !!e.getClientRects().length && getComputedStyle(e).display !== 'none', top: !!h && (h === e || e.contains(h)) }; }, sel);
  const breakOnStage = async () => {
    await page.evaluate(() => vlShowBreak(todayStr(), 80, false)); await C.sleep(250);
    const r = await page.evaluate(() => { const box = document.getElementById('vlBreak'); return { shown: !!box && getComputedStyle(box).display !== 'none' && !!box.getClientRects().length, off: !!box && box.hasAttribute('data-offstage'), house: document.body.dataset.house }; });
    await page.evaluate(() => vlHideBreak()); return r;
  };
  for (const tool of T4.TOOLS) {
    const n = tool.name;
    await tool.open(page); await C.sleep(400);
    await page.evaluate(({ busySrc, stage }) => { const busy = new Function('return (' + busySrc + ')()');
      window.__ts = []; clearInterval(window.__tsT);
      window.__tsT = setInterval(() => { let b = false; try { b = !!busy(); } catch (e) {} const st = document.querySelector(stage);
        window.__ts.push({ t: performance.now(), house: document.body.dataset.house, busy: b, live: !!st && st.classList.contains('is-live') }); }, 100); },
      { busySrc: tool.busy.toString(), stage: tool.stage });
    const cons0 = consoleErrors.length;
    let brk = null, top = null, started = false, done = false;
    if (tool.live) {
      await tool.act(page);
      started = await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 8000 }).then(() => true, () => false);
      await C.sleep(1500); top = await topmost(tool.btn); brk = await breakOnStage(); await C.sleep(500);
      await tool.stop(page);
      done = await page.waitForFunction(`!(${tool.busy})()`, null, { timeout: 4000 }).then(() => true, () => false);
    } else {
      ({ started, done } = await T.runTake(page, tool, { liveAt: tool.liveAt || 1300, onLive: async () => { top = await topmost(tool.btn); brk = await breakOnStage(); } }));
      await page.evaluate(() => { window.__t1 = performance.now(); });
    }
    const up = await within(page, () => document.body.dataset.house === 'up', 1500, '__t1');
    await C.sleep(400);
    const log = await page.evaluate(() => { clearInterval(window.__tsT); return { s: window.__ts, t0: window.__t0 }; });
    const m = await marks(page), res = tool.live ? true : await page.evaluate(T.vis, tool.result);
    const firstDown = log.s.find(x => x.house === 'down'), downAt = firstDown ? Math.round(firstDown.t - log.t0) : null;
    const upBusy = firstDown ? log.s.filter(x => x.t >= firstDown.t && x.busy && x.house !== 'down').length : null;
    const errs = consoleErrors.slice(cons0);
    check(`11 ${n}: down within 1.5 s of ${tool.live ? 'Start' : 'the start'}, ${tool.stage} live`, started && downAt !== null && downAt <= 1500 && log.s.some(x => x.live), `${downAt !== null ? downAt + ' ms' : 'never down'}${started ? '' : ' · did not start'}`);
    check(`11 ${n}: never up while ${tool.live ? 'listening' : 'the exercise runs'} (100 ms samples)`, upBusy === 0, `${upBusy} up of ${log.s.filter(x => x.busy).length} busy`);
    check(`11 ${n}: #vlBreak displayed on its stage, not offstage`, !!brk && brk.shown && !brk.off && brk.house === 'down', JSON.stringify(brk));
    check(`11 ${n}: ${tool.btn} topmost on the stage`, !!top && top.found && top.shown && top.top, JSON.stringify(top));
    check(`11 ${n}: up within 1.5 s ${tool.live ? 'of Stop' : 'after'}${tool.live ? '' : ', result shown'}, no marks left`, done && up !== null && res && noMarks(m), `${up !== null ? up + ' ms' : 'still down'} · result ${res} · ${JSON.stringify(m)}${done ? '' : ' · did not finish'}`);
    check(`11 ${n}: no console errors`, errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
    await T.restoreRange(page);
    // a second start, stopped by stopAllActiveSessions while the house is down
    await tool.open(page); await C.sleep(400);
    await tool.act(page);
    const down2 = await page.waitForFunction(() => document.body.dataset.house === 'down', null, { timeout: 5000 }).then(() => true, () => false);
    const t11 = await page.evaluate(async () => { const t0 = performance.now(); stopAllActiveSessions();
      while (performance.now() - t0 <= 100) { if (document.body.dataset.house === 'up') return Math.round(performance.now() - t0); await new Promise(r => setTimeout(r, 5)); } return null; });
    await C.sleep(50); const m2 = await marks(page);
    check(`11 ${n}: stopAllActiveSessions() brings it up within 100 ms, no marks`, down2 && t11 !== null && noMarks(m2), `${down2 ? '' : 'never down · '}${t11 !== null ? t11 + ' ms' : 'not up'} · ${JSON.stringify(m2)}`);
    await C.sleep(600); await T.restoreRange(page);
  }
}

// The sharp stimulus (40 cents sharp, once, Light 390): the readout reads pm_live_sharp with a number, never locks.
async function sharpTake(dir, state) {
  console.log('\n-- sharp stimulus · light · 390px');
  const b = await S.launchMic(S.STIM.sharp);
  try {
    const { page } = await C.openPage(b, { dir, theme: 'light', viewport: SIZES[390], storageState: state });
    const consoleErrors = []; page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().split('\n')[0]); });
    await C.clearOverlays(page); await S.warmMic(page); await S.openPitch(page); await C.sleep(300);
    await page.evaluate(() => { window.__sr = []; window.__srT = setInterval(() => window.__sr.push({ read: document.getElementById('pitchCentsRead').textContent, locked: document.getElementById('pitchTargetNote').classList.contains('pm-locked') }), 50); });
    await S.clickPitch(page); await C.sleep(300); await S.waitPitchDone(page);
    const r = await page.evaluate(() => { clearInterval(window.__srT); return { log: window.__sr, sharp: t('pm_live_sharp') }; });
    const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), re = new RegExp('^' + r.sharp.split('{n}').map(esc).join('\\d+') + '$');
    const reads = [...new Set(r.log.map(s => s.read).filter(Boolean))];
    check('5 sharp: #pitchCentsRead reads pm_live_sharp with a number', reads.some(x => re.test(x)), reads.slice(0, 6).join(' | ') || 'empty');
    check('5 sharp: #pitchTargetNote never gets .pm-locked', r.log.length > 20 && !r.log.some(s => s.locked), `${r.log.filter(s => s.locked).length} of ${r.log.length} samples locked`);
    check('5 sharp: no console errors during the take', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | ') || 'none');
  } finally { await b.close(); }
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
    if (!ONLY4B) await sharpTake(dir, state);
  } finally {
    await b.close();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
    C.cleanup();
  }
})();
