// PHASE10.md B7: reduced motion as a check. With prefers-reduced-motion: reduce, nothing slides or pulses: animations
// and transitions finish at once (0.01 ms, one iteration) and values jump to where they are.
//  1. At rest: tour10.js's motion pass (390, Light, reduce), every screen and sheet: no running animation over 10 ms, no
//     declared animation or transition over 0.01 ms on what is shown.
//  2. The running states the tour doesn't reach, in a browser whose fake mic sings a real A4 (stage.js), reduce on:
//     the Tuner locked, a Coach tool mid-take (Pitch Match), a level-up sheet (shown in place at once, not sliding in),
//     a game (Pitch Mountain flying). In each: the same two counts over the whole page, sampled 4 times 250 ms apart.
//     A game's canvas moves because it is the game (drawn per frame from the voice), not an animation: not counted.
// Usage: node scripts/design-verify/motion.js [--out <dir>] [--ref <git ref>] [--only states]   exit 1 on any motion
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const C = require('./common'), S = require('./stage');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'vc-motion-')), REF = arg('--ref');

let fails = 0;
const check = (name, ok, detail) => { console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) fails++; };

// In the page: what still moves. running: Web Animations (CSS animations and transitions) playing for over 10 ms;
// declared: visible elements whose computed animation or transition lasts over 0.01 ms.
const MOVING = () => {
  const pth = e => { const p = []; for (let a = e; a && a !== document.body && p.length < 3; a = a.parentElement) p.unshift(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList.length ? '.' + [...a.classList].slice(0, 2).join('.') : '')); return p.join(' > '); };
  const sec = v => Math.max(...v.split(',').map(x => x.trim().endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x) || 0));
  const running = document.getAnimations().filter(a => a.playState === 'running').map(a => {
    const t = a.effect && a.effect.getTiming(), dur = t && typeof t.duration === 'number' ? t.duration : 0;
    return { what: a.animationName || a.transitionProperty || a.constructor.name, ms: dur, iter: t && t.iterations, path: a.effect && a.effect.target ? pth(a.effect.target) : '' };
  }).filter(a => a.ms > 10);
  const declared = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!e.getClientRects().length) continue; const cs = getComputedStyle(e);
    const td = sec(cs.transitionDuration), ad = cs.animationName !== 'none' ? sec(cs.animationDuration) : 0;
    if (td > 0.00001 || ad > 0.00001) declared.push(`${pth(e)} ${td > 0.00001 ? 'transition ' + cs.transitionDuration : ''}${ad > 0.00001 ? 'animation ' + cs.animationName + ' ' + cs.animationDuration : ''}`);
  }
  return { running: running.map(a => `${a.path} ${a.what} ${Math.round(a.ms)} ms × ${a.iter}`), declared };
};

async function still(page, name) {
  const seen = { running: new Set(), declared: new Set() };
  for (let i = 0; i < 4; i++) { const m = await page.evaluate(MOVING); m.running.forEach(x => seen.running.add(x)); m.declared.forEach(x => seen.declared.add(x)); await C.sleep(250); }
  const out = [...seen.running, ...seen.declared];
  check(`${name}: nothing slides or pulses (reduce on)`, out.length === 0, out.length ? `${out.length}: ${out.slice(0, 4).join('; ')}` : 'still');
}

(async () => {
  // 1. at rest
  if (arg('--only') !== 'states') {
    const r = spawnSync('node', [path.join(__dirname, 'tour10.js'), '--passes', 'motion', '--combos', '390-light', '--out', OUT, ...(REF ? ['--ref', REF] : [])], { stdio: 'inherit' });
    if (r.status !== 0) { console.log('tour10 failed'); process.exit(1); }
    const audit = JSON.parse(fs.readFileSync(path.join(OUT, 'audit.json'), 'utf8'));
    const bad = Object.entries(audit.motion).filter(([, v]) => v.running.length || v.declared.length);
    for (const [k, v] of bad.slice(0, 12)) console.log(`  ✗ ${k}: ${[...v.running.map(a => `${a.path} ${a.name} ${a.ms} ms`), ...v.declared.map(d => `${d.path} ${d.transition}${d.animation}`)].slice(0, 3).join('; ')}`);
    check(`every screen and sheet at rest (390, Light, reduce): no animation or transition`, Object.keys(audit.motion).length > 0 && bad.length === 0, `${Object.keys(audit.motion).length} screen-states, ${bad.length} with motion`);
  }

  // 2. the running states
  S.ensureStimuli();
  const b = await S.launchMic(S.STIM.steady);
  try {
    const dir = C.buildDir(REF);
    const a = await C.openPage(b, { dir }); await C.signUp(a.page, 'dvmotion', 'Alex Rivera'); const state = await a.ctx.storageState(); await a.ctx.close();
    const { page, errors } = await C.openPage(b, { dir, theme: 'light', storageState: state, reducedMotion: 'reduce' });
    await C.clearOverlays(page); await S.warmMic(page);
    check('the page reports reduce', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));

    await C.G.step('the Tuner locked', 40, async () => { // normally 3–6 s
      await S.startTuner(page);
      await page.waitForFunction(() => document.getElementById('centsDisplay').textContent === 'In tune', null, { timeout: 15000 });
      await still(page, 'the Tuner locked');
      await S.stopTuner(page); await C.sleep(800);
    });
    await C.G.step('Pitch Match mid-take', 60, async () => { // normally 5–8 s
      await S.openPitch(page); await S.clickPitch(page);
      await page.waitForFunction(() => document.body.dataset.house === 'down', null, { timeout: 10000 }); await C.sleep(1500);
      await still(page, 'a Coach tool mid-take (Pitch Match)');
      await S.waitPitchDone(page, 30000); await C.sleep(800);
    });
    await C.G.step('a level-up sheet', 30, async () => { // normally 2 s
      await C.showPanel(page, 'home');
      const at = await page.evaluate(async () => {
        showLevelUp(7, levelForXp(340).name, levelupWhyText({}, { sessions: 3, records: 2, streak: 4 }));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const o = document.getElementById('levelupOverlay'), card = o.querySelector('.moment-sheet'), cs = getComputedStyle(card);
        return { opacity: getComputedStyle(o).opacity, transform: cs.transform };
      });
      check('the level-up sheet is in place at once (two frames after showing: opaque, not moved)', +at.opacity === 1 && (at.transform === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(at.transform)), `opacity ${at.opacity}, transform ${at.transform}`);
      await still(page, 'a level-up sheet');
      await page.evaluate(() => momentClose(document.getElementById('levelupOverlay')));
    });
    await C.G.step('a game (Pitch Mountain)', 60, async () => { // normally 5 s
      await C.showPanel(page, 'arcade');
      await page.evaluate(() => { showArcadeGame('glider'); if (typeof selectSong === 'function' && currentSongId !== 'hymn') selectSong('hymn'); });
      await C.sleep(400);
      await page.evaluate(() => document.getElementById('gliderStartBtn').click());
      await page.waitForFunction(() => typeof gliderActive !== 'undefined' && gliderActive, null, { timeout: 10000 }); await C.sleep(1500);
      await still(page, 'a game (Pitch Mountain flying)');
      await page.evaluate(() => { try { stopAllActiveSessions(); } catch (e) {} });
    });
    check('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${fails ? 'MOTION: FAIL' : 'MOTION: PASS'} (${fails} failed)`);
  process.exit(fails ? 1 : 0);
})();
