// Phase 7 survey (PHASE7_SURVEY.md, PHASE7.md 2b): before-screenshots of the You screens as they are on master: the You
// hub, the 21-Day Journey, the Dashboard & Skill Profile, Personal Records, the Vocal Passport, Voice Health, and Profile
// with its settings. At 390 Light, 390 Dark and 1280 Light, full page. Signed in on a Choir-plan test account (deleted at
// exit) in two states set in the page's memory, the way homeStates.js seeds Home (nothing is saved: saveProgress is
// stubbed for the run):
//   new     a fresh account: nothing practised
//   active  a singer some days in: Skill Profile scores (pitch, breath, agility, plus Emotional Singing's expression),
//           a range, 14 days of history, Voice Health readings on six days, timeline events, a Karaoke song best, the
//           Journey on day 6 with a Day 1 snapshot, one Choir World part in progress with a Harmony Memory run
// plus signed out where a screen has its own signed-out view. For each shot, states.json has what the screen computed
// (computeSkillProfile, personalRecordValues, the unlocked achievements, the Voice Health banner) and contrast.js's own
// measure of the panel (the regular contrast run sees only an empty account): every item below 4.5:1.
// Out: <out>/<combo>/<screen>-<state>.jpg, <out>/states.json, <out>/sheets/before.jpg. Read-only: nothing in the app
// is changed. Usage: node scripts/design-verify/shots7before.js [--out <dir>] [--base <git ref>, default master]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots7before'), BASE = arg('--base') || 'master';
const Q = { type: 'jpeg', quality: 80 };
const COMBOS = [['390', 'light'], ['390', 'dark'], ['1280', 'light']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const sleep = C.sleep, ev = (page, f, a) => page.evaluate(f, a);
const src = fs.readFileSync(path.join(__dirname, 'contrast.js'), 'utf8');
const MEASURE = src.slice(src.indexOf('async function measure('), src.indexOf('\n}\n', src.indexOf('async function measure(')) + 2);

// screen → the panel and which states it is shot in
const SCREENS = [
  { key: 'you', panel: null, states: ['active'] },
  { key: 'journey', panel: 'journey', states: ['new', 'active'] },
  { key: 'dashboard', panel: 'dashboard', states: ['signedout', 'new', 'active'] },
  { key: 'records', panel: 'records', states: ['signedout', 'active'] },
  { key: 'passport', panel: 'passport', states: ['new', 'active'] },
  { key: 'voicehealth', panel: 'voicehealth', states: ['new', 'active'] },
  { key: 'profile', panel: 'profile', states: ['signedout', 'new', 'active'] },
];

// the seeded states (youSeed.js; shots7before used new and active)
const { seedInPage } = require('./youSeed');

const facts = page => ev(page, () => {
  if (!profile) return { signedIn: false };
  const sp = computeSkillProfile(), rec = personalRecordValues();
  return { signedIn: true, skillProfile: sp, expressionStored: (progress.expressionScores || []).length,
    records: rec, achievements: ACHIEVEMENTS.map(a => `${a.id}:${a.check() ? 'on' : 'off'}${a.icon ? '' : ' (no icon)'}`),
    level: levelForXp(progress.xp || 0), healthBanner: document.getElementById('healthBanner').textContent,
    choirRuns: ((progress.choirReadiness || {}).runs || []).length };
});

async function account(b, dir) {
  const { ctx, page } = await C.openPage(b, { dir }); await C.signUp(page, 'dv7b', 'Survey Seven');
  const uid = await page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
  db(`update public.users set subscription_plan = 'choir' where id = '${uid}'`);
  const state = await ctx.storageState(); await ctx.close(); return state;
}

(async () => {
  const dir = C.buildDir(BASE); fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch(); const states = {};
  try {
    const state = await account(b, dir);
    console.log(`== shots7before · ${C.REMOTE || BASE} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      for (const signed of [true, false]) {
        const { ctx, page, errors } = await C.openPage(b, { dir, theme, viewport: SIZES[w], storageState: signed ? state : undefined });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await C.clearOverlays(page);
        for (const sc of SCREENS) for (const st of sc.states) {
          if ((st === 'signedout') === signed) continue;
          if (signed) await ev(page, seedInPage, st);
          await ev(page, p => { if (p) enterPanel(p); else showShellSection('you'); }, sc.panel); await sleep(700);
          await C.clearOverlays(page); await ev(page, () => window.scrollTo(0, 0)); await sleep(300);
          const name = `${sc.key}-${st}`, root = sc.panel ? `#panel-${sc.panel}` : '#panel-you-hub';
          await page.screenshot({ path: path.join(d, `${name}.jpg`), fullPage: true, ...Q });
          const items = await ev(page, async ([m, r]) => (await eval('(' + m + ')')(r)).filter(i => i.status !== 'pass')
            .map(i => ({ status: i.status, ratio: i.ratio, text: i.text, fg: i.fg, bg: i.bg, path: i.path })), [MEASURE, root]);
          states[`${name} ${w} ${theme}`] = { contrast: items, ...(w === '390' && theme === 'light' ? { facts: await facts(page) } : {}) };
          console.log(`  ${name} ${w} ${theme}  contrast below 4.5: ${items.length}`);
        }
        states[`errors ${w} ${theme} ${signed ? 'signed in' : 'signed out'}`] = errors.slice();
        await ctx.close();
      }
    }
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1));
    // the contact sheet
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`), order = SCREENS.flatMap(s => s.states.map(st => `${s.key}-${st}`));
    const img = (c, n) => { const f = path.join(OUT, c, `${n}.jpg`); return fs.existsSync(f) ? `<img src="file://${f}" class="w${c.split('-')[0]}">` : '—'; };
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
      table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
      img.w390{width:180px}img.w1280{width:420px}</style>
      <h1>Phase 7 before: the You screens (${BASE}, Choir plan)</h1>
      <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${order.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
    const sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true }); const f = path.join(sd, 'before.html'); fs.writeFileSync(f, html);
    const sp = await (await b.newContext({ viewport: { width: 1100, height: 1000 } })).newPage();
    await sp.goto('file://' + f); await sleep(800); await sp.screenshot({ path: path.join(sd, 'before.jpg'), fullPage: true, ...Q }); fs.rmSync(f);
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
