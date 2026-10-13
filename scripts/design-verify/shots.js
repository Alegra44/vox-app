// Redesign screenshots, for the user's review (they are not a pass/fail check). On the local build, production backend.
// Two states: a fresh signed-in account with a captured range (recordRangeCapture(45,69), so Home has content; deleted
// at exit), and signed out. All 46 panels at 390x844 and 1280x800, in Light and Dark: a viewport JPEG (quality 85)
// for every combination, and a full-page JPEG at 390 in both themes (signed in). Extra shots: signed-out Home, the
// auth modal in sign-in mode, Profile with the theme control, a toast, the splash, Turkish Home and a screen with
// uppercase labels (an uppercased "i" must render "İ"), and System with the device in dark.
// Then contact sheets, one per hub group: each row is 390 Light | 390 Dark | 1280 Light | 1280 Dark (signed in).
// Usage: node scripts/design-verify/shots.js [--base <git ref>] [--out <dir>]   (default out: <tmp>/voxcoach-shots-<ref>)
//   [--panels home,train-hub,…] [--sizes 390] [--no-extras]: a subset (e.g. on production, with DV_URL set)
//   Phase 2 (PHASE2.md §1c, §4): the singing states with the fake mic (stage.js), signed in, at every size and theme:
//   Tuner idle / live locked / live unlocked / result, Pitch Match idle / the reference playing / live / result heard /
//   result with no voice, a Breath hold (not staged), the warm-up overlay; and two motion sequences at 390 Light, frames
//   0, 80, 160, 320, 480, 640, 900 and 1300 ms after the Tuner starts and after it stops (each file named by the
//   measured time). Contact sheets: sheets/states.jpg and sheets/motion.jpg.
//   [--no-states] skips them; [--states-only] takes only them.
//   Phase 3 (PHASE3.md §1c): Home in each seeded state (homeStates.js) and the Coach tab signed in and signed out, at
//   390 and 1280 in Light and Dark, viewport and full page (home/<width>-<theme>/<name>.jpg and …-full/); sheet
//   sheets/home.jpg (full pages). [--no-home] skips them; [--home-only] takes only them.
const path = require('path'), fs = require('fs'), os = require('os');
const C = require('./common');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base');
const OUT = path.resolve(arg('--out') || path.join(os.tmpdir(), `voxcoach-shots-${BASE ? BASE.replace(/\W/g, '_') : 'branch'}`));
const THEMES = BASE ? ['dark'] : ['light', 'dark'];
const ALL_SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const SIZES = Object.fromEntries(Object.entries(ALL_SIZES).filter(([w]) => !arg('--sizes') || arg('--sizes').split(',').includes(w)));
const ONLY_PANELS = arg('--panels') ? arg('--panels').split(',') : null, EXTRAS = !process.argv.includes('--no-extras');
const HOME_ONLY = process.argv.includes('--home-only'), HOME = !process.argv.includes('--no-home');
const STATES = !process.argv.includes('--no-states') && !HOME_ONLY, STATES_ONLY = process.argv.includes('--states-only') || HOME_ONLY;
const H = require('./homeStates');
const HOME_ROWS = [...H.HOME_STATES, 'coach-signedin', 'coach-signedout'];
const S = require('./stage');
const STATE_ORDER = ['tuner-idle', 'tuner-live-unlocked', 'tuner-live-locked', 'tuner-result', 'pitch-idle', 'pitch-cue', 'pitch-live', 'pitch-result-heard', 'pitch-result-measure', 'pitch-result-noheard', 'breath-live', 'warmup-overlay'];
const MOTION_MS = [0, 80, 160, 320, 480, 640, 900, 1300];
const Q = { type: 'jpeg', quality: 85 };
const log = [];
const note = s => { console.log('  ' + s); log.push(s); };

async function shotPanels(b, dir, state, storageState) {
  for (const theme of THEMES) for (const [w, viewport] of Object.entries(SIZES)) {
    const { ctx, page } = await C.openPage(b, { dir, theme, viewport, storageState });
    await C.clearOverlays(page);
    const keys = (await C.panelKeys(page)).filter(k => !ONLY_PANELS || ONLY_PANELS.includes(k));
    const d = path.join(OUT, state, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
    for (const k of keys) {
      const ok = await C.showPanel(page, k); await C.clearOverlays(page); await C.sleep(150);
      await page.screenshot({ path: path.join(d, `${k}.jpg`), ...Q });
      if (w === '390' && state === 'signed-in') {
        fs.mkdirSync(path.join(OUT, state, `390-${theme}-full`), { recursive: true });
        await page.screenshot({ path: path.join(OUT, state, `390-${theme}-full`, `${k}.jpg`), fullPage: true, ...Q });
      }
      if (!ok) note(`${state} ${w} ${theme}: panel ${k} did not open`);
    }
    await ctx.close();
    console.log(`   ${state} · ${w} · ${theme}: ${keys.length} panels`);
  }
}

async function extras(b, dir, storageState) {
  const d = path.join(OUT, 'extra'); fs.mkdirSync(d, { recursive: true });
  for (const theme of THEMES) {
    // signed-out Home, the auth modal in sign-in mode
    let { ctx, page } = await C.openPage(b, { dir, theme });
    await C.showPanel(page, 'home');
    await page.screenshot({ path: path.join(d, `signed-out-home-390-${theme}.jpg`), ...Q });
    await page.evaluate(() => { openAuthModal(); setAuthMode('signin'); }); await C.sleep(400);
    await page.screenshot({ path: path.join(d, `auth-signin-390-${theme}.jpg`), ...Q });
    await ctx.close();
    // signed in: Profile's theme control, a toast
    ({ ctx, page } = await C.openPage(b, { dir, theme, storageState }));
    await C.clearOverlays(page);
    await C.showPanel(page, 'profile'); await C.clearOverlays(page);
    await page.evaluate(() => document.getElementById('themePickerGrid')?.scrollIntoView({ block: 'center' })); await C.sleep(300);
    await page.screenshot({ path: path.join(d, `profile-theme-390-${theme}.jpg`), ...Q });
    await C.showPanel(page, 'home');
    await page.evaluate(() => { showToast('Saved to your progress'); showToast('Microphone is busy', 'warn'); }); await C.sleep(500);
    await page.screenshot({ path: path.join(d, `toast-390-${theme}.jpg`), ...Q });
    await ctx.close();
    // the splash (signed in, so it waits on the session)
    const ctx2 = await b.newContext({ viewport: ALL_SIZES[390], colorScheme: theme, storageState });
    if (!C.REMOTE) await ctx2.route(C.LOCAL + '**', r => r.fulfill({ path: path.join(dir, 'index.html'), contentType: 'text/html' }));
    await ctx2.addInitScript(t => { try { localStorage.setItem('theme', t); } catch (e) {} }, theme);
    const p2 = await ctx2.newPage(); await p2.goto(C.PAGE_URL, { waitUntil: 'domcontentloaded' }); await C.sleep(900);
    await p2.screenshot({ path: path.join(d, `splash-390-${theme}.jpg`), ...Q });
    await ctx2.close();
  }
  // Turkish: Home, and a screen with an uppercased label containing "i"
  for (const theme of THEMES) {
    const { ctx, page } = await C.openPage(b, { dir, theme, storageState, lang: 'tr' });
    await C.clearOverlays(page); await C.showPanel(page, 'home');
    await page.screenshot({ path: path.join(d, `tr-home-390-${theme}.jpg`), ...Q });
    const found = await page.evaluate(async () => {
      const hubs = { home: 'home', 'train-hub': 'train', 'songs-hub': 'songs', 'you-hub': 'you' };
      for (const p of document.querySelectorAll('.panel')) {
        const k = p.id.replace(/^panel-/, ''); hubs[k] ? showShellSection(hubs[k]) : enterPanel(k);
        await new Promise(r => setTimeout(r, 200));
        for (const el of p.querySelectorAll('*')) {
          const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
          if (!/i/.test(own) || getComputedStyle(el).textTransform !== 'uppercase' || !el.getClientRects().length || el.getBoundingClientRect().width < 2) continue;
          el.scrollIntoView({ block: 'center' }); el.setAttribute('data-shot-upper', '1');
          return { panel: k, text: own.trim().slice(0, 50), lang: document.documentElement.lang, upper: own.trim().toLocaleUpperCase('tr').slice(0, 50) };
        }
      }
      return null;
    });
    if (found) {
      await C.sleep(300);
      await page.screenshot({ path: path.join(d, `tr-uppercase-${found.panel}-390-${theme}.jpg`), ...Q });
      await page.locator('[data-shot-upper]').screenshot({ path: path.join(d, `tr-uppercase-label-${theme}.png`) });
      note(`tr uppercase (${theme}): panel ${found.panel}, text "${found.text}", <html lang="${found.lang}">, expected rendering "${found.upper}"`);
    } else note(`tr uppercase (${theme}): no uppercased label with "i" found`);
    await ctx.close();
  }
  // System with the device in dark (and in light, for comparison)
  for (const scheme of BASE ? [] : ['dark', 'light']) {
    const { ctx, page } = await C.openPage(b, { dir, theme: 'system', scheme, storageState });
    await C.clearOverlays(page); await C.showPanel(page, 'home');
    await page.screenshot({ path: path.join(d, `system-device-${scheme}-390.jpg`), ...Q });
    note(`system, device ${scheme}: --hl-bg = ${await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--hl-bg').trim() || '(none)')}`);
    await ctx.close();
  }
}

async function stateShots(dir, state) {
  S.ensureStimuli();
  for (const theme of THEMES) for (const [w, viewport] of Object.entries(SIZES)) for (const stim of Object.keys(S.STATE_STIM)) {
    const b = await S.launchMic(S.STIM[stim]);
    try {
      const { page } = await C.openPage(b, { dir, theme, viewport, storageState: state });
      if (!await page.evaluate(() => typeof houseSession === 'function')) { note('states: no lighting engine on this build'); return; }
      const d = path.join(OUT, 'states', `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      await S.runStates(page, stim, async name => { await page.screenshot({ path: path.join(d, `${name}.jpg`), ...Q }); });
    } finally { await b.close(); }
    console.log(`   states · ${w} · ${theme} · ${stim}`);
  }
  // the motion: frames after the Tuner starts and after it stops, 390 Light
  const b = await S.launchMic(S.STIM.steady);
  try {
    const { page } = await C.openPage(b, { dir, theme: 'light', viewport: SIZES[390] || { width: 390, height: 844 }, storageState: state });
    await C.clearOverlays(page); await S.warmMic(page);
    await C.showPanel(page, 'tuner'); await C.clearOverlays(page);
    const d = path.join(OUT, 'motion'); fs.mkdirSync(d, { recursive: true });
    const frames = async (which, click) => {
      const t0 = Date.now(); await click(page);
      for (const ms of MOTION_MS) {
        const wait = t0 + ms - Date.now(); if (wait > 0) await C.sleep(wait);
        const at = Date.now() - t0;
        await page.screenshot({ path: path.join(d, `${which}-${String(ms).padStart(4, '0')}.jpg`), ...Q });
        note(`motion ${which} ${ms} ms: taken at ${at} ms, house ${await page.evaluate(() => document.body.dataset.house)}`);
      }
    };
    await frames('start', p => p.evaluate(() => document.getElementById('micBtn').click())); // the panel is open: the click alone
    await page.waitForFunction(() => document.getElementById('centsDisplay').textContent === 'In tune', null, { timeout: 6000 }).catch(() => {});
    await C.sleep(800);
    await frames('stop', S.stopTuner);
  } finally { await b.close(); }
}

async function homeShots(b, dir, state) {
  for (const theme of THEMES) for (const [w, viewport] of Object.entries(SIZES)) {
    const d = path.join(OUT, 'home', `${w}-${theme}`), df = d + '-full'; fs.mkdirSync(df, { recursive: true });
    for (const name of HOME_ROWS) {
      const seedName = name === 'coach-signedin' ? 'weakest' : name === 'coach-signedout' ? 'signedout' : name;
      const { ctx, page } = await C.openPage(b, { dir, theme, viewport, storageState: seedName === 'signedout' ? undefined : state });
      try {
        await C.clearOverlays(page); await H.seed(page, seedName);
        if (name.startsWith('coach-')) { await page.evaluate(() => { showShellSection('train'); window.scrollTo(0, 0); }); await C.sleep(400); }
        await page.screenshot({ path: path.join(d, `${name}.jpg`), ...Q });
        await page.screenshot({ path: path.join(df, `${name}.jpg`), fullPage: true, ...Q });
      } finally { await ctx.close(); }
    }
    console.log(`   home · ${w} · ${theme}: ${HOME_ROWS.length} shots`);
  }
}

async function contactSheets(b, groups) {
  const d = path.join(OUT, 'sheets'); fs.mkdirSync(d, { recursive: true });
  const cols = ['390-light', '390-dark', '1280-light', '1280-dark'].filter(c => THEMES.includes(c.split('-')[1]) && SIZES[c.split('-')[0]]);
  const page = await (await b.newContext({ viewport: { width: 1800, height: 1000 } })).newPage();
  for (const [group, all] of Object.entries(groups)) {
    const keys = all.filter(k => !ONLY_PANELS || ONLY_PANELS.includes(k)); if (!keys.length || STATES_ONLY) continue;
    const rows = keys.map(k => `<tr><th>${k}</th>${cols.map(c => {
      const f = path.join(OUT, 'signed-in', c, `${k}.jpg`);
      return `<td>${fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'}</td>`;
    }).join('')}</tr>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{height:420px}img.w1280{height:300px}</style><h1>${group}</h1><table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows}</table>`;
    const f = path.join(d, `${group}.html`); fs.writeFileSync(f, html);
    await page.goto('file://' + f); await C.sleep(300);
    await page.screenshot({ path: path.join(d, `${group}.jpg`), fullPage: true, ...Q });
    fs.rmSync(f);
  }
  const sheet = async (name, title, head, rows) => {
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{height:420px}img.w1280{height:300px}</style><h1>${title}</h1><table><tr><th></th>${head.map(c => `<th>${c}</th>`).join('')}</tr>${rows}</table>`;
    const f = path.join(d, `${name}.html`); fs.writeFileSync(f, html);
    await page.goto('file://' + f); await C.sleep(300);
    await page.screenshot({ path: path.join(d, `${name}.jpg`), fullPage: true, ...Q }); fs.rmSync(f);
  };
  const img = (f, w) => fs.existsSync(f) ? `<img src="file://${f}" class="w${w}">` : '—';
  if (fs.existsSync(path.join(OUT, 'states'))) {
    const sc = cols.filter(c => fs.existsSync(path.join(OUT, 'states', c)));
    await sheet('states', 'singing states (signed in)', sc, STATE_ORDER.map(n => `<tr><th>${n}</th>${sc.map(c => `<td>${img(path.join(OUT, 'states', c, n + '.jpg'), c.split('-')[0])}</td>`).join('')}</tr>`).join(''));
  }
  if (fs.existsSync(path.join(OUT, 'home'))) {
    const hc = cols.filter(c => fs.existsSync(path.join(OUT, 'home', c + '-full')));
    await sheet('home', 'Home (seeded states) and the Coach tab, full page', hc, HOME_ROWS.map(n => `<tr><th>${n}</th>${hc.map(c => {
      const f = path.join(OUT, 'home', c + '-full', n + '.jpg');
      return `<td>${fs.existsSync(f) ? `<img src="file://${f}" style="width:${c.startsWith('390') ? 260 : 420}px">` : '—'}</td>`; }).join('')}</tr>`).join(''));
  }
  if (fs.existsSync(path.join(OUT, 'motion'))) {
    await sheet('motion', 'motion, 390 Light (ms after the click)', MOTION_MS.map(String),
      ['start', 'stop'].map(w => `<tr><th>${w}</th>${MOTION_MS.map(ms => `<td>${img(path.join(OUT, 'motion', `${w}-${String(ms).padStart(4, '0')}.jpg`), '390')}</td>`).join('')}</tr>`).join(''));
  }
}

(async () => {
  const dir = C.buildDir(BASE);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch();
  try {
    console.log(`== shots · ${C.REMOTE || BASE || 'branch (working copy)'} → ${OUT}`);
    const { ctx, page } = await C.openPage(b, { dir, theme: THEMES[0] });
    await C.signUp(page, 'dvs', 'Design Review');
    await page.evaluate(() => recordRangeCapture(45, 69)); await C.sleep(2500);
    const groups = await page.evaluate(() => {
      const g = {}; for (const p of document.querySelectorAll('.panel')) {
        const k = p.id.replace(/^panel-/, ''), s = (typeof SHELL_SECTION_MAP !== 'undefined' && SHELL_SECTION_MAP[k]) || 'other';
        (g[s] = g[s] || []).push(k);
      }
      return g;
    });
    const state = await ctx.storageState(); await ctx.close();
    if (!STATES_ONLY) {
      await shotPanels(b, dir, 'signed-in', state);
      await shotPanels(b, dir, 'signed-out', undefined);
      if (EXTRAS) await extras(b, dir, state);
    }
    if (STATES) await stateShots(dir, state);
    if (HOME) await homeShots(b, dir, state);
    await contactSheets(b, groups);
    fs.writeFileSync(path.join(OUT, 'notes.txt'), log.join('\n') + '\n');
    console.log(`done: ${OUT}`);
  } finally { await b.close(); C.cleanup(); }
})();
