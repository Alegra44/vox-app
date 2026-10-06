// (d) Level-up explanation. Two parts:
//   text: in each of the four languages, levelupWhyText with 1, 2 and 3 items (and more than 3, and the streak at 2
//     and at 5, and nothing at all) against the exact sentence expected, then rendered in the real level-up card
//   account (a throwaway account, deleted at exit): two level-ups caused through the app's own saveProgress. The first
//     shows the counts since the account started, the second only what happened since the first; the snapshot is in
//     the database, survives a reload, and loads in a second browser context (as a second device would).
// Needs migration 0008 and the api function with levelup_snapshot patchable (the account part).
// Usage: [LU_ONLY=text|account] node scripts/levelup-verify/levelup.js [url]   (no url: deploy/ served locally, production backend)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup');
const path = require('path');
const { track, db, cleanup } = require('../choir-verify/testAccounts');
const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const ONLY = process.env.LU_ONLY;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(70)} ${detail}`); };

const Z = { sessions: 0, records: 0, streak: 0, breakthroughs: 0, warmups: 0, boss_wins: 0, curriculum_days: 0 };
const CASES = [ // [name, now (prev is all zero)]
  ['1 item', { ...Z, records: 1 }],
  ['2 items', { ...Z, records: 2, sessions: 9 }],
  ['3 items', { ...Z, records: 2, breakthroughs: 1, boss_wins: 3 }],
  ['5 non-zero: top 3 by priority', { ...Z, records: 1, breakthroughs: 2, boss_wins: 1, curriculum_days: 4, sessions: 9, warmups: 2 }],
  ['1 item + a 5-day streak', { ...Z, sessions: 1, streak: 5 }],
  ['streak 2: not shown', { ...Z, warmups: 1, streak: 2 }],
  ['only a 3-day streak', { ...Z, streak: 3 }],
  ['nothing', { ...Z }],
];
const EXPECT = {
  en: ['You levelled up: 1 new record', 'You levelled up: 2 new records and 9 sessions',
    'You levelled up: 2 new records, 1 breakthrough and 3 Boss Battles won',
    'You levelled up: 1 new record, 2 breakthroughs and 1 Boss Battle won',
    'You levelled up: 1 session and a 5-day streak', 'You levelled up: 1 warm-up', 'You levelled up: a 3-day streak', ''],
  fr: ['Niveau supérieur : 1 nouveau record', 'Niveau supérieur : 2 nouveaux records et 9 séances',
    'Niveau supérieur : 2 nouveaux records, 1 percée et 3 combats de Boss remportés',
    'Niveau supérieur : 1 nouveau record, 2 percées et 1 combat de Boss remporté',
    'Niveau supérieur : 1 séance et une série de 5 jours', 'Niveau supérieur : 1 échauffement', 'Niveau supérieur : une série de 3 jours', ''],
  es: ['Subiste de nivel: 1 récord nuevo', 'Subiste de nivel: 2 récords nuevos y 9 sesiones',
    'Subiste de nivel: 2 récords nuevos, 1 avance y 3 batallas de jefe ganadas',
    'Subiste de nivel: 1 récord nuevo, 2 avances y 1 batalla de jefe ganada',
    'Subiste de nivel: 1 sesión y una racha de 5 días', 'Subiste de nivel: 1 calentamiento', 'Subiste de nivel: una racha de 3 días', ''],
  tr: ['Seviye atladın: 1 yeni rekor', 'Seviye atladın: 2 yeni rekor ve 9 seans',
    'Seviye atladın: 2 yeni rekor, 1 atılım ve 3 Boss Savaşı kazanıldı',
    'Seviye atladın: 1 yeni rekor, 2 atılım ve 1 Boss Savaşı kazanıldı',
    'Seviye atladın: 1 seans ve 5 günlük seri', 'Seviye atladın: 1 ısınma', 'Seviye atladın: 3 günlük seri', ''],
};

async function newContext(b) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(2500);
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  return { ctx, page, errors };
}
async function auth(page, mode, email, password) {
  await page.evaluate(m => { openAuthModal(); setAuthMode(m); }, mode);
  if (mode !== 'signin') await page.locator('#authName').fill('Level Check');
  await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 30000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
}
// what happened in the page, through the app's own code: sessions (recordActivity), new records (triggerNewRecord),
// breakthroughs; then XP to the next level's first point and a save, which is where a level-up is detected
async function levelUp(page, { sessions = 0, records = 0, breakthroughs = 0 }) {
  return page.evaluate(async ({ sessions, records, breakthroughs }) => {
    for (let i = 0; i < sessions; i++) await recordActivity();
    for (let i = 0; i < records; i++) triggerNewRecord('Check', String(i + 1));
    if (breakthroughs) progress.breakthroughCount = (progress.breakthroughCount || 0) + breakthroughs;
    await saveProgress(); // settles lastKnownLevel at the current level
    const before = levelForXp(progress.xp || 0).level;
    progress.xp = before * 50; // the first XP of the next level
    await saveProgress();
    await new Promise(r => setTimeout(r, 2500)); // the snapshot's own save
    return { from: before, to: levelForXp(progress.xp).level, why: document.getElementById('levelupWhy').textContent,
      shown: document.getElementById('levelupOverlay').classList.contains('levelup-show'), snap: progress.levelupSnapshot, counters: levelupCounters() };
  }, { sessions, records, breakthroughs });
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const contexts = [];
  try {
    console.log(`== ${URL_ || 'local deploy/ (production backend)'}`);
    if (ONLY !== 'account') {
      console.log('\n-- text, four languages');
      const { ctx, page, errors } = await newContext(b); contexts.push(ctx);
      for (const lang of ['en', 'fr', 'es', 'tr']) {
        await page.evaluate(l => setLanguage(l), lang); await sleep(300);
        const got = await page.evaluate(cases => cases.map(([, now]) => levelupWhyText(null, now)), CASES);
        CASES.forEach(([name], i) => check(`${lang} · ${name}`, got[i] === EXPECT[lang][i], `"${got[i]}"`));
        const shown = await page.evaluate(why => { showLevelUp(4, 'X', why); const t = document.getElementById('levelupWhy').textContent; document.getElementById('levelupOverlay').classList.remove('levelup-show'); return t; }, got[2]);
        check(`${lang} · rendered in the level-up card`, shown === EXPECT[lang][2], `"${shown}"`);
      }
      check('page errors', errors.length === 0, errors[0] || 'none');
    }
    if (ONLY !== 'text') {
      console.log('\n-- account: two level-ups, reload, a second device');
      const email = track(`voxcoach-lvl-${Date.now()}@example.com`), password = 'LV-' + Math.random().toString(36).slice(2) + '!x9';
      const A = await newContext(b); contexts.push(A.ctx);
      await auth(A.page, 'signup', email, password); console.log(`   signed up ${email}`);
      await A.page.evaluate(() => setLanguage('en'));
      const start = await A.page.evaluate(() => ({ snap: progress.levelupSnapshot ?? null, counters: levelupCounters() }));
      check('a new account starts with no snapshot', start.snap === null, JSON.stringify(start.snap));
      // first level-up: since the account started (a null snapshot)
      const l1 = await levelUp(A.page, { sessions: 3, records: 2, breakthroughs: 1 });
      const want1 = await A.page.evaluate(c => levelupWhyText(null, c), l1.snap);
      check(`level-up 1 (${l1.from} → ${l1.to}) shown, counted from the start of the account`, l1.shown && l1.to === l1.from + 1 && l1.why === want1 && /2 new records/.test(l1.why) && /1 breakthrough/.test(l1.why),
        `"${l1.why}" (sessions ${l1.snap.sessions}, records ${l1.snap.records})`);
      check('snapshot 1 = the counters at level-up 1', JSON.stringify({ ...l1.snap, level: undefined, at: undefined }) === JSON.stringify({ ...l1.counters }) && l1.snap.level === l1.to, JSON.stringify(l1.snap));
      // second level-up: only what happened since the first
      const l2 = await levelUp(A.page, { sessions: 1, records: 1 });
      check(`level-up 2 (${l2.from} → ${l2.to}): only what happened since level-up 1`, l2.shown && l2.why === 'You levelled up: 1 new record and 1 session', `"${l2.why}"`);
      // stored on the server, survives a reload, loads on a second device
      const uid = db(`select id from auth.users where email = '${email}'`)[0].id;
      const dbSnap = db(`select levelup_snapshot from public.user_progress where user_id = '${uid}'`)[0].levelup_snapshot;
      const same = (a, b) => a && b && ['level', 'sessions', 'records', 'breakthroughs'].every(k => a[k] === b[k]);
      check('the database holds snapshot 2', same(dbSnap, l2.snap), JSON.stringify(dbSnap));
      await A.page.reload({ waitUntil: 'load' }); await A.page.waitForFunction(() => !!profile && !!progress && progress.levelupSnapshot !== undefined, null, { timeout: 30000 });
      const afterReload = await A.page.evaluate(() => progress.levelupSnapshot);
      check('after a reload: the same snapshot', same(afterReload, l2.snap), JSON.stringify(afterReload));
      const B = await newContext(b); contexts.push(B.ctx);
      await auth(B.page, 'signin', email, password);
      const second = await B.page.evaluate(() => progress.levelupSnapshot);
      check('a second browser context (another device): the same snapshot', same(second, l2.snap), JSON.stringify(second));
      check('page errors', A.errors.length === 0 && B.errors.length === 0, (A.errors[0] || B.errors[0] || 'none').slice(0, 120));
    }
  } catch (e) { fail++; console.log('ERROR ' + (e.stack || e)); }
  finally { for (const c of contexts) await c.close().catch(() => {}); await b.close(); cleanup(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
