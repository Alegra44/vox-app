// Saved range after a page reload: every range-based feature reads the account's saved Range Finder range
// (user_progress.lowest_midi / highest_midi) at load, not A2–C5, on a real throwaway account.
//   - new account, no saved range: A2–C5 (MIDI 45–72), before and after a reload; signed out: A2–C5
//   - the Range Finder, sung for real (the fake mic alternates D3 and G5 every 3 s), saves D3–G5 (50–79)
//   - after a reload (lowNote/highNote are null again): Register Coach's passaggio/zones, the startup Pitch Match,
//     Interval and Scale Run targets, the Glider's pitch-to-height mapping and Song Difficulty all use 50–79
//   - things that depend on a Range Finder run this page: Restart falls back to the saved range, not A2–C5; the Key
//     Trainer's "use captured range" still needs a capture; a fresh capture still wins over a wider saved range, and
//     the saved range still only widens
// The test account is deleted however the run ends (testAccounts.js).
// Usage: node scripts/range-verify/reload.js [url]   (no url: deploy/ served locally, production backend)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track, db, cleanup } = require('../choir-verify/testAccounts');

const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const email = track(`voxcoach-rng-${Date.now()}@example.com`), password = 'VC-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0, auth = null;
function check(label, ok, detail = '') { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(72)} ${detail}`); }

const LO = 50, HI = 79, hz = m => 440 * Math.pow(2, (m - 69) / 12); // D3, G5
const WAV = path.join(TMP, 'rng-d3-g5.wav');
execFileSync('python', [path.join(__dirname, '../vq-verify/gen.py'), WAV, JSON.stringify({ seconds: 60,
  segments: [{ f0: hz(LO), harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 3 }, { f0: hz(HI), harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 3 }] })]);

async function openPage(b, { signedIn = true } = {}) {
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(signedIn && auth ? { storageState: auth } : {}) });
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const resp = await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(3000);
  if (!resp || resp.status() >= 400) throw new Error('page answered ' + (resp && resp.status()));
  if (!await page.evaluate(() => { try { return typeof sb !== 'undefined'; } catch { return false; } })) throw new Error('Supabase client missing (CDN script failed to load)');
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  if (signedIn && !auth) {
    await page.evaluate(() => openAuthModal());
    await page.locator('#authName').fill('Range'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
    await page.locator('#authCreateBtn').click();
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
    auth = await ctx.storageState(); console.log(`   signed up ${email}`);
  }
  await ready(page, signedIn);
  return { ctx, page, errors };
}
async function ready(page, signedIn = true) {
  if (signedIn) await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
  await page.evaluate(() => appInitPromise); await sleep(500);
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
}
async function reload(page) { await page.reload({ waitUntil: 'load' }); await sleep(3000); await ready(page); }
async function enter(page, p) { await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400); await page.locator(`#panel-train-hub [data-enter-panel="${p}"]`).click(); await sleep(800); }
const bounds = page => page.evaluate(() => registerRangeBounds());
const saved = () => { const r = db(`select lowest_midi, highest_midi from public.user_progress where user_id = (select id from auth.users where email = '${email}')`)[0]; return r ? [r.lowest_midi, r.highest_midi] : null; };

// Sing the Range Finder: capture once the fake mic's pitch reads as each note.
async function rangeFinder(page) {
  await enter(page, 'range');
  await page.locator('#rangeStartBtn').click();
  await page.waitForFunction(() => mode === 'rangeLow', null, { timeout: 15000 });
  await page.waitForFunction(m => liveFreq && freqToNote(liveFreq).midi === m, LO, { timeout: 15000, polling: 50 });
  await page.locator('#captureLowBtn').click();
  await page.waitForFunction(m => liveFreq && freqToNote(liveFreq).midi === m, HI, { timeout: 15000, polling: 50 });
  await page.locator('#captureHighBtn').click();
  await sleep(3000); // recordRangeCapture saves
  return page.evaluate(() => [lowNote && lowNote.midi, highNote && highNote.midi]);
}

// Each exercise's target at a given Math.random value (restored afterwards), through the app's own functions.
const targets = (page, rnd) => page.evaluate(rnd => {
  const orig = Math.random; Math.random = () => rnd;
  try {
    newPitchTarget(); newIntervalTarget(); newScaleRoot();
    return { pitch: pitchTargetMidi, root: intervalRootMidi, iv: intervalTargetMidi, scale: scaleRootMidi };
  } finally { Math.random = orig; }
}, rnd);
// The same formulas, worked out here for a range and the beginner level (pitchRangeFraction 0.45).
function expectPitchWindow(lo, hi, frac = 0.45) {
  const span = Math.max(1, Math.round((hi - lo) * frac)), mid = (lo + hi) / 2;
  const sLo = Math.max(lo, Math.round(mid - span / 2)), sHi = Math.min(hi, sLo + span);
  return [sLo, sLo + Math.max(1, sHi - sLo) - 1]; // inclusive
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] });
  let ctx, page, errors;
  const errCheck = () => { check('page errors', errors.length === 0, errors.length ? errors[0].slice(0, 120) : 'none'); errors.length = 0; };
  try {
    console.log(`== ${URL_ || 'local deploy/ (production backend)'}\n`);
    ({ ctx, page, errors } = await openPage(b));

    console.log('-- a new account with no saved range');
    let r = await bounds(page);
    check('no saved range in the DB', JSON.stringify(saved()) === '[null,null]', JSON.stringify(saved()));
    check('A2–C5 (45–72)', r.lowMidi === 45 && r.highMidi === 72, JSON.stringify(r));
    await reload(page); r = await bounds(page);
    check('after a reload: still A2–C5', r.lowMidi === 45 && r.highMidi === 72, JSON.stringify(r));
    errCheck();

    console.log('\n-- the Range Finder, sung');
    const cap = await rangeFinder(page);
    check('captured D3 and G5', cap[0] === LO && cap[1] === HI, JSON.stringify(cap));
    check('saved to the account (user_progress)', JSON.stringify(saved()) === JSON.stringify([LO, HI]), JSON.stringify(saved()));
    r = await bounds(page);
    check('same page: the capture is used', r.lowMidi === LO && r.highMidi === HI, JSON.stringify(r));
    errCheck();

    console.log('\n-- after a reload (no Range Finder run on this page)');
    await reload(page);
    const st = await page.evaluate(() => ({ lowNote, highNote, lo: progress.lowestMidi, hi: progress.highestMidi }));
    check('lowNote/highNote are null; progress has the saved range', st.lowNote === null && st.highNote === null && st.lo === LO && st.hi === HI, JSON.stringify(st));
    r = await bounds(page);
    check('registerRangeBounds: the saved range', r.lowMidi === LO && r.highMidi === HI, JSON.stringify(r));
    // targets drawn at startup, before anything is clicked
    const start = await page.evaluate(() => ({ pitch: pitchTargetMidi, root: intervalRootMidi, iv: intervalTargetMidi, scale: scaleRootMidi, level: exerciseLevel,
      pitchTxt: document.getElementById('pitchTargetNote').textContent, scaleTxt: document.getElementById('scaleTargetNote').textContent,
      pitchName: noteNameFromMidi(pitchTargetMidi), scaleName: noteNameFromMidi(scaleRootMidi) }));
    const win = expectPitchWindow(LO, HI);
    check('level is beginner (the windows below assume it)', start.level === 'beginner', start.level);
    check(`Pitch Match startup target in the saved range's window ${win.join('–')}`, start.pitch >= win[0] && start.pitch <= win[1] && start.pitchTxt === start.pitchName, `${start.pitch} "${start.pitchTxt}"`);
    check('Interval startup target inside 50–79', start.root >= LO && start.iv <= HI, `${start.root}→${start.iv}`);
    check('Scale Run startup root = the saved low note (D3)', start.scale === LO && start.scaleTxt.startsWith('D3'), `${start.scale} "${start.scaleTxt}"`);
    const t0 = await targets(page, 0), t1 = await targets(page, 0.9999);
    const oldWin = expectPitchWindow(45, 72);
    check(`Pitch Match window = ${win.join('–')} (A2–C5 would give ${oldWin.join('–')})`, t0.pitch === win[0] && t1.pitch === win[1], `${t0.pitch}–${t1.pitch}`);
    check('Interval: lowest root D3 (50), highest target 78 (A2–C5 caps at 71)', t0.root === LO && t1.iv === HI - 1, `root ${t0.root}, top ${t1.iv}`);
    check('Scale Run root D3 (50), not A2 (45)', t0.scale === LO && t1.scale === LO, `${t0.scale}`);
    const gl = await page.evaluate(() => [gliderMidiToY(50, 320), gliderMidiToY(79, 320), gliderMidiToY(72, 320), gliderMidiToY(45, 320)]);
    check('Glider: D3 at the bottom, G5 at the top, C5 below the top', gl[0] === 320 && gl[1] === 0 && gl[2] > 0 && gl[3] === 320, JSON.stringify(gl.map(v => Math.round(v))));
    const sd = await page.evaluate(() => { const n = Object.values(SONG.parts).flatMap(p => p.notes); return { txt: document.getElementById('songDifficultyBox').textContent, fits: Math.min(...n) >= 50 && Math.max(...n) <= 79 }; });
    check('Song Difficulty judges the song against the saved range', sd.txt.includes(sd.fits ? 'Fits comfortably in your captured range' : 'Outside part of your captured range'), sd.fits ? 'fits' : 'outside');
    await enter(page, 'register');
    await page.locator('#regMicBtn').click();
    await page.waitForFunction(() => mode === 'register', null, { timeout: 15000 });
    const reg = await page.evaluate(() => ({ lo: window._regLow, hi: window._regHigh, pass: window._passaggioMidi, zone: +document.getElementById('chestZoneRect').getAttribute('y') }));
    const expY = 10 + (1 - (67 - LO) / (HI - LO)) * 300; // midiToY, top 10 / bottom 310
    check('Register Coach: range 50–79, passaggio G4 (67), not C♯4 (61)', reg.lo === LO && reg.hi === HI && reg.pass === 67, JSON.stringify(reg));
    check('Register Coach: chest zone starts at the passaggio line', Math.abs(reg.zone - expY) < 1, `${reg.zone.toFixed(1)} vs ${expY.toFixed(1)}`);
    await page.locator('#regMicBtn').click(); await sleep(3000);
    errCheck();

    console.log('\n-- things that depend on a Range Finder run this page');
    await page.evaluate(() => document.getElementById('restartRangeBtn').click());
    r = await bounds(page);
    check('Restart (clears the capture): the saved range, not A2–C5', r.lowMidi === LO && r.highMidi === HI, JSON.stringify(r));
    const key = await page.evaluate(() => { const a = document.getElementById('singerLowSel').value, c = document.getElementById('singerHighSel').value; document.getElementById('useCapturedRangeBtn').click(); return [a === document.getElementById('singerLowSel').value, c === document.getElementById('singerHighSel').value]; });
    check('Key Trainer "use captured range" still needs a capture on this page', key[0] && key[1], '');
    const n = Number(db(`update public.user_progress set lowest_midi = 40, highest_midi = 84 where user_id = (select id from auth.users where email = '${email}') returning 1 as n`).length);
    await reload(page); r = await bounds(page);
    check('a wider saved range (40–84, set in the DB) is used after a reload', n === 1 && r.lowMidi === 40 && r.highMidi === 84, JSON.stringify(r));
    const cap2 = await rangeFinder(page); r = await bounds(page);
    check('a fresh capture on this page still wins over it', cap2[0] === LO && cap2[1] === HI && r.lowMidi === LO && r.highMidi === HI, JSON.stringify(r));
    check('the saved range only widens: still 40–84', JSON.stringify(saved()) === '[40,84]', JSON.stringify(saved()));
    errCheck();

    console.log('\n-- signed out');
    await ctx.close();
    ({ ctx, page, errors } = await openPage(b, { signedIn: false }));
    r = await bounds(page);
    check('A2–C5', r.lowMidi === 45 && r.highMidi === 72, JSON.stringify(r));
    errCheck();
    await ctx.close(); ctx = null;
  } catch (e) { check('ran to the end', false, e.message.split('\n')[0]); }
  finally {
    try { cleanup(); } finally { await Promise.race([b.close().catch(() => {}), sleep(10000)]); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
