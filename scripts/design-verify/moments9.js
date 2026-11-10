// PHASE9.md 1f, with levelup-verify/levelup.js (the why-line's text in four languages and the snapshot on the server):
// the three moment sheets triggered through the app's own code, on master and the branch (the working copy, or
// --branch-ref). Each side on its own fresh test account (a level-up snapshot is stored per account), English:
//   level up     3 sessions (recordActivity), 2 new records (triggerNewRecord), 1 breakthrough counted, then XP to the
//                next level's first point and the app's saveProgress, where a level-up is detected;
//   new record   a Breath hold of about 15 s over a stored best of 12.4 s, finished by the app's finishBreathHold;
//   breakthrough five notes in tune (90%) on E4 after four at 50%, through recordNoteAttempt.
// Per sheet: shown, the number (level / record value / note), the name or label, the why-line or delta / detail, and the
// counts (levelupSnapshot, bestBreathDuration, breakthroughCount); then it closes (Continue where there is one, else a
// click on the sheet, as on master). The texts and counts must equal master's. Reduced motion: the sheet shows at once.
// Usage: node scripts/design-verify/moments9.js [--base master] [--branch-ref <ref>]
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const SIDES = { master: C.buildDir(arg('--base') || 'master'), branch: C.buildDir(arg('--branch-ref') || null) };
let fails = 0; const check = (ok, s) => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${s}`); };

// Runs in the page: what a moment sheet shows.
function sheetInPage(id) {
  const o = document.getElementById(id), txt = i => { const e = document.getElementById(i); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
  const shown = o.classList.contains('levelup-show') && getComputedStyle(o).visibility !== 'hidden' && getComputedStyle(o).display !== 'none';
  return { shown, levelupNum: txt('levelupNum'), levelupSub: txt('levelupSub'), levelupWhy: txt('levelupWhy'), newRecordLabel: txt('newRecordLabel'),
    newRecordVal: txt('newRecordVal'), newRecordDelta: txt('newRecordDelta'), breakthroughNote: txt('breakthroughNote'), breakthroughDetail: txt('breakthroughDetail'),
    text: o.innerText.replace(/\s+/g, ' ').trim() };
}
async function close(page, id) {
  await page.evaluate(id => { const o = document.getElementById(id), btn = o.querySelector('[data-moment-close], .moment-continue'); (btn || o).click(); }, id); await C.sleep(400);
  return page.evaluate(id => !document.getElementById(id).classList.contains('levelup-show'), id);
}

// the app's saves aren't awaited and each reply replaces progress: wait until nothing has been in flight for 600 ms
const SETTLE_INIT = () => { window.__inflight = 0; window.__lastNet = Date.now(); const f = window.fetch;
  window.fetch = (...a) => { window.__inflight++; return f(...a).finally(() => { window.__inflight--; window.__lastNet = Date.now(); }); }; };
const settle = page => page.waitForFunction(() => window.__inflight === 0 && Date.now() - window.__lastNet > 600, null, { timeout: 20000 }).catch(() => {});

async function runSide(b, side) {
  const { ctx, page, errors } = await C.openPage(b, { dir: SIDES[side], reducedMotion: 'reduce', prepare: c => c.addInitScript(SETTLE_INIT) });
  try {
    await C.signUp(page, 'dvmo', 'Moment Check'); await C.clearOverlays(page);
    await page.evaluate(() => document.querySelectorAll('.levelup-overlay').forEach(o => { o.style.display = ''; o.classList.remove('levelup-show'); }));
    const r = {}; await settle(page);
    // level up
    r.levelup = await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) await recordActivity();
      for (let i = 0; i < 2; i++) triggerNewRecord('Check', String(i + 1));
      progress.breakthroughCount = (progress.breakthroughCount || 0) + 1;
      document.getElementById('newRecordOverlay').classList.remove('levelup-show');
      await saveProgress();
      const before = levelForXp(progress.xp || 0).level; progress.xp = before * 50; await saveProgress();
      return { from: before };
    });
    r.levelup.sheet = await page.evaluate(sheetInPage, 'levelupOverlay');
    r.levelup.closed = await close(page, 'levelupOverlay');
    await settle(page); r.levelup.snap = await page.evaluate(() => progress.levelupSnapshot);
    // new record: a Breath hold over the stored best
    await page.evaluate(() => { progress.bestBreathDuration = 12.4; breathActive = true; breathStartTime = performance.now() - 15020; breathRmsSamples = Array(20).fill(0.1); finishBreathHold(); });
    r.record = { sheet: await page.evaluate(sheetInPage, 'newRecordOverlay') };
    r.record.closed = await close(page, 'newRecordOverlay');
    await settle(page); r.record.best = await page.evaluate(() => progress.bestBreathDuration);
    // breakthrough: E4 (64) in tune five times after four misses
    await page.evaluate(() => { window.__n0 = progress.breakthroughCount || 0; for (let i = 0; i < 4; i++) recordNoteAttempt(64, 50); for (let i = 0; i < 5; i++) recordNoteAttempt(64, 90); });
    r.breakthrough = { sheet: await page.evaluate(sheetInPage, 'breakthroughOverlay') };
    r.breakthrough.closed = await close(page, 'breakthroughOverlay');
    await settle(page); r.breakthrough.count = await page.evaluate(() => (progress.breakthroughCount || 0) - window.__n0);
    r.errors = errors.slice();
    return r;
  } finally { await ctx.close(); }
}

(async () => {
  const b = await C.chromium.launch(); const out = {};
  try {
    for (const side of ['master', 'branch']) { out[side] = await runSide(b, side); console.log(`== ${side}: ${JSON.stringify(out[side]).slice(0, 600)}`); }
    const M = out.master, B = out.branch, eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const snapCounts = s => s && Object.fromEntries(Object.entries(s).filter(([k]) => !['at'].includes(k)));
    check(B.levelup.sheet.shown && M.levelup.sheet.shown, `level up shown (master ${M.levelup.sheet.shown}, branch ${B.levelup.sheet.shown})`);
    for (const f of ['levelupNum', 'levelupSub', 'levelupWhy']) check(M.levelup.sheet[f] === B.levelup.sheet[f], `level up · ${f}: "${B.levelup.sheet[f]}"${M.levelup.sheet[f] === B.levelup.sheet[f] ? '' : ` (master "${M.levelup.sheet[f]}")`}`);
    check(eq(snapCounts(M.levelup.snap), snapCounts(B.levelup.snap)), `level up · counts ${JSON.stringify(snapCounts(B.levelup.snap))}`);
    check(B.record.sheet.shown && M.record.sheet.shown, `new record shown (master ${M.record.sheet.shown}, branch ${B.record.sheet.shown})`);
    for (const f of ['newRecordLabel', 'newRecordVal', 'newRecordDelta']) check(M.record.sheet[f] === B.record.sheet[f], `new record · ${f}: "${B.record.sheet[f]}"${M.record.sheet[f] === B.record.sheet[f] ? '' : ` (master "${M.record.sheet[f]}")`}`);
    check(M.record.best === B.record.best, `new record · best stored ${B.record.best} (master ${M.record.best})`);
    check(B.breakthrough.sheet.shown && M.breakthrough.sheet.shown, `breakthrough shown (master ${M.breakthrough.sheet.shown}, branch ${B.breakthrough.sheet.shown})`);
    for (const f of ['breakthroughNote', 'breakthroughDetail']) check(M.breakthrough.sheet[f] === B.breakthrough.sheet[f], `breakthrough · ${f}: "${B.breakthrough.sheet[f]}"${M.breakthrough.sheet[f] === B.breakthrough.sheet[f] ? '' : ` (master "${M.breakthrough.sheet[f]}")`}`);
    check(M.breakthrough.count === 1 && B.breakthrough.count === 1, `breakthrough · counted once (master ${M.breakthrough.count}, branch ${B.breakthrough.count})`);
    for (const k of ['levelup', 'record', 'breakthrough']) check(B[k].closed, `${k}: closes (${B[k].sheet.text.slice(0, 90)})`);
    check(!M.errors.length && !B.errors.length, `page errors: master ${M.errors.length}, branch ${B.errors.length} ${[...M.errors, ...B.errors].slice(0, 2).join(' | ')}`);
    console.log(`\nMOMENTS9: ${fails ? `FAIL: ${fails}` : 'PASS'}`); process.exitCode = fails ? 1 : 0;
  } catch (e) { console.log('ERROR ' + (e.stack || e)); process.exitCode = 1; }
  finally { await b.close(); await C.cleanup(); }
})();
