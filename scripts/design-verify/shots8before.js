// Phases 8 and 9 survey (PHASE8_SURVEY.md): before-screenshots of every screen not yet on House Lights, on a build
// (default: master, the production build), plus what each screen shows in French that is still English, and three
// behaviour probes. Nothing sings: games are shown at their setup screens (no Start), the warm-up overlay at its list.
// States: signedout; new (fresh account, Level 1); active (youSeed.js's singer, Level 7: four of five World locations
// open); expired (active with the 21-day trial over); teacher (active on the Teacher plan with two students and an
// assignment, in the page only). The seed is in the page only (saveProgress stubbed); the plan and the trial date are
// set in the page's profile only. Choir-plan test account (deleted at exit).
// Shots: full page for screens, the viewport for overlays; 390 Light, 390 Dark, 1280 Light.
// French: per screen (390 Light, fr), visible text that reads as English (a word list), written to french.json.
// Probes (probes.json): 1. the Vocal Rift's "Back to Vocal World" (is the Rift still shown under the hub?);
//   2. the demo checkout ("Simulate successful subscription": the toast, the plan in the page, the plan after a reload);
//   3. the World's lock toast and the signed-out plan buttons' sign-in title, in French.
// Out: <out>/<w>-<theme>/<screen>-<state>.jpg, states.json (page errors, contrast below 4.5 per shot), french.json,
//      probes.json, sheets/before8.jpg and sheets/before9.jpg.
// Usage: node scripts/design-verify/shots8before.js [--out <dir>] [--base <ref>, default master] [--only key,key]
//        [--combos 390-light,…] [--no-french] [--no-probes]
const fs = require('fs'), path = require('path'), os = require('os');
const C = require('./common');
const { db } = require('../choir-verify/testAccounts');
const { seedInPage } = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(os.tmpdir(), 'voxcoach-shots8before'), ONLY = arg('--only') ? arg('--only').split(',') : null;
const COMBOS = (arg('--combos') || '390-light,390-dark,1280-light').split(',').map(c => c.split('-'));
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } }, Q = { type: 'jpeg', quality: 78 };
const sleep = C.sleep;
const src = fs.readFileSync(path.join(__dirname, 'contrast.js'), 'utf8');
const MEASURE = src.slice(src.indexOf('async function measure('), src.indexOf('\n}\n', src.indexOf('async function measure(')) + 2);
const SO = ['signedout'], IN = ['new', 'active'], ALL = ['signedout', 'new', 'active'];
// open: run in the page (string body); root: what contrast and the French scan read; overlay: viewport shot
const game = g => `enterPanel('arcade'); showArcadeGame('${g}');`;
const SCREENS = [
  { key: 'world', phase: 8, open: `enterPanel('arcade'); showArcadeHub();`, root: '#arcadeHub', states: ALL },
  { key: 'glider', phase: 8, open: game('glider'), root: '#gameGlider', states: ALL },
  { key: 'bridge', phase: 8, open: game('bridge'), root: '#gameBridge', states: ['signedout', 'active'] },
  { key: 'boss', phase: 8, open: game('boss'), root: '#gameBoss', states: ['signedout', 'active'] },
  { key: 'harmony', phase: 8, open: game('harmony'), root: '#gameHarmony', states: ['signedout', 'active'] },
  { key: 'skilltree', phase: 8, open: game('skilltree'), root: '#gameSkillTree', states: ALL },
  { key: 'rift', phase: 8, open: game('rift'), root: '#gameRift', states: ['signedout', 'active'] },
  { key: 'signup', phase: 9, open: `openAuthModal();`, root: '#authModalOverlay', overlay: true, states: SO },
  { key: 'signin', phase: 9, open: `openAuthModal(); setAuthMode('signin');`, root: '#authModalOverlay', overlay: true, states: SO },
  { key: 'signinrequired', phase: 9, open: `requireSignIn('Vocal World');`, root: '#signinRequiredOverlay', overlay: true, states: SO },
  { key: 'language', phase: 9, open: `document.getElementById('languageSelectOverlay').style.display='flex';`, root: '#languageSelectOverlay', overlay: true, states: SO },
  ...[0, 1, 2, 3, 4, 5, 6].map(n => ({ key: `onboarding${n}`, phase: 9, open: `openOnboarding(); obStepIndex=${n}; renderOnboardingStep();`, root: '#onboardingOverlay', overlay: true, states: ['new'] })),
  { key: 'pricing', phase: 9, open: `enterPanel('pricing');`, root: '#panel-pricing', states: ['signedout', 'new', 'expired'] },
  { key: 'paywall', phase: 9, open: `openPaywallPrompt('Vocal World', 'monthly', false);`, root: '#paywallModalOverlay', overlay: true, states: ['new', 'expired'] },
  { key: 'paywallchoir', phase: 9, open: `openPaywallPrompt('Choir World', 'choir', true);`, root: '#paywallModalOverlay', overlay: true, states: ['expired'] },
  { key: 'checkout', phase: 9, open: `enterPanel('pricing'); document.querySelector('.plan-btn[data-plan]').click();`, root: '#checkoutModalOverlay', overlay: true, states: ['new'] },
  { key: 'teacher', phase: 9, open: `enterPanel('teacher');`, root: '#panel-teacher', states: ['signedout', 'new', 'teacher'] },
  { key: 'feedback', phase: 9, open: `enterPanel('feedback');`, root: '#panel-feedback', states: ['signedout', 'new'] },
  { key: 'warmup', phase: 9, open: `wuOpen();`, root: '#warmupOverlay', overlay: true, states: ['new'] },
  { key: 'levelup', phase: 9, open: `showLevelUp(7, levelForXp(340).name, '');`, root: '#levelupOverlay', overlay: true, states: ['active'] },
  { key: 'newrecord', phase: 9, open: `triggerNewRecord('G4 stability', '91%', '+6 since last time');`, root: '#newRecordOverlay', overlay: true, states: ['active'] },
  { key: 'breakthrough', phase: 9, open: `triggerBreakthrough(67, 61);`, root: '#breakthroughOverlay', overlay: true, states: ['active'] },
  { key: 'sharerange', phase: 9, open: `document.getElementById('shareRangeBtn').click();`, root: '#shareRangeOverlay', overlay: true, states: ['active'] },
  { key: 'sharerecap', phase: 9, open: `document.getElementById('shareRecapBtn').click();`, root: '#shareRecapOverlay', overlay: true, states: ['active'] },
  { key: 'vocallab', phase: 9, open: `enterPanel('vocallab');`, root: '#panel-vocallab', states: ['signedout', 'new', 'active'] },
].filter(s => !ONLY || ONLY.includes(s.key));

// Runs in the page: the state on top of youSeed's (expired and teacher build on active).
function stateInPage(st) {
  if (st === 'expired' || st === 'teacher') {
    if (st === 'expired') { const d = new Date(); d.setDate(d.getDate() - 30); profile.trialStartDate = d.toISOString(); profile.subscriptionPlan = null; }
    if (st === 'teacher') {
      profile.subscriptionPlan = 'teacher';
      profile.teacherRoster = [{ id: 's1', name: 'Maya' }, { id: 's2', name: 'Leo' }];
      profile.teacherAssignments = [{ id: 'a1', exerciseType: 'pitch', note: 'Five takes on G4, then two on A4.', completions: { s1: true } }];
    }
    window.saveProfile = async p => { profile = p; };
  }
}
// Runs in the page: hide every overlay and stop anything a screen opened.
function resetInPage() {
  document.querySelectorAll('.modal-overlay, .share-overlay').forEach(o => { o.style.display = 'none'; });
  document.querySelectorAll('.levelup-overlay').forEach(o => o.classList.remove('levelup-show'));
  try { if (typeof wuStop === 'function') wuStop(); } catch (e) {}
  document.body.style.overflow = '';
}
// Runs in the page: visible text under root that reads as English (for the French pass).
function englishInPage(root) {
  const EN = /\b(the|your|you|and|with|this|that|start|stop|best|score|level|tap|not now|plan|day|days|free|sign in|sign up|cancel|close|download|back|next|get started|choose|pick|what|record|new|now|unlock|unlocks|practicing|running|flying|singing|battling|crashed|wiped|rounds|time|sessions|range|streak|feature|reason|price|upgrade|simulate|subscription|demo|account|level up)\b/i;
  const r = document.querySelector(root); if (!r) return [];
  const out = new Set(), w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const s = n.textContent.replace(/\s+/g, ' ').trim(); if (s.length < 3) continue;
    const el = n.parentElement; if (!el || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (/^(English|Français|Español|Türkçe|VoxCoach)$/.test(s)) continue;
    if (EN.test(s)) out.add(s.slice(0, 120));
  }
  for (const i of r.querySelectorAll('input[placeholder]')) if (i.getClientRects().length && EN.test(i.placeholder)) out.add(`placeholder: ${i.placeholder}`);
  return [...out];
}

async function openState(b, dir, state, st, { theme = 'light', viewport = SIZES[390], lang = 'en' } = {}) {
  const signed = st !== 'signedout';
  const o = await C.openPage(b, { dir, theme, viewport, lang, storageState: signed ? state : undefined });
  await o.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await C.clearOverlays(o.page);
  if (signed) { await o.page.evaluate(seedInPage, st === 'new' ? 'new' : 'active'); await o.page.evaluate(stateInPage, st); }
  return o;
}

(async () => {
  const dir = C.buildDir(arg('--base') || 'master'); fs.mkdirSync(OUT, { recursive: true });
  const b = await C.chromium.launch(); const statesOut = {}, french = {}, probes = {};
  try {
    const a = await C.openPage(b, { dir }); await C.signUp(a.page, 'dv8s', 'Alex Rivera');
    const uid = await a.page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
    db(`update public.users set subscription_plan = 'choir' where id = '${uid}'`);
    const state = await a.ctx.storageState(); await a.ctx.close();
    const STATES = [...new Set(SCREENS.flatMap(s => s.states))];
    console.log(`== shots8before · ${arg('--base') || 'master'} → ${OUT}`);
    for (const [w, theme] of COMBOS) {
      const d = path.join(OUT, `${w}-${theme}`); fs.mkdirSync(d, { recursive: true });
      for (const st of STATES) {
        const list = SCREENS.filter(s => s.states.includes(st)); if (!list.length) continue;
        const { ctx, page, errors } = await openState(b, dir, state, st, { theme, viewport: SIZES[w] });
        for (const sc of list) {
          await page.evaluate(resetInPage); await page.evaluate(() => window.scrollTo(0, 0));
          const err = await page.evaluate(code => { try { (0, eval)(code); return null; } catch (e) { return String(e); } }, sc.open);
          await sleep(900);
          if (!sc.overlay) await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n && innerWidth < 960) { const h = document.documentElement.scrollHeight; n.style.position = 'absolute'; n.style.top = h + 'px'; n.style.bottom = 'auto'; } });
          const name = `${sc.key}-${st}`;
          await page.screenshot({ path: path.join(d, `${name}.jpg`), fullPage: !sc.overlay, ...Q });
          const items = await page.evaluate(async ([m, r]) => { try { return (await eval('(' + m + ')')(r)).filter(i => i.status !== 'pass').map(i => ({ ratio: i.ratio, text: i.text, fg: i.fg, bg: i.bg })); } catch (e) { return [{ error: String(e) }]; } }, [MEASURE, sc.root]);
          await page.evaluate(() => { const n = document.querySelector('nav.shell-bottomnav'); if (n) { n.style.position = ''; n.style.top = ''; n.style.bottom = ''; } });
          statesOut[`${name} ${w} ${theme}`] = { phase: sc.phase, openError: err, contrast: items };
          console.log(`  ${name.padEnd(26)} ${w} ${theme}  contrast<4.5: ${items.length}${err ? `  OPEN ERROR ${err}` : ''}`);
        }
        statesOut[`errors ${w} ${theme} ${st}`] = errors.slice();
        if (errors.length) console.log(`  page errors (${w} ${theme} ${st}): ${errors.join(' | ')}`);
        await ctx.close();
      }
    }
    if (!process.argv.includes('--no-french')) for (const st of [...new Set(SCREENS.flatMap(s => s.states))]) {
      const list = SCREENS.filter(s => s.states.includes(st));
      const { ctx, page } = await openState(b, dir, state, st, { lang: 'fr' });
      for (const sc of list) {
        await page.evaluate(resetInPage); await page.evaluate(code => { try { (0, eval)(code); } catch (e) {} }, sc.open); await sleep(800);
        french[`${sc.key}-${st}`] = await page.evaluate(englishInPage, sc.root);
      }
      await ctx.close();
    }
    if (!process.argv.includes('--no-probes')) {
      { // 1. the Rift's back link
        const { ctx, page } = await openState(b, dir, state, 'active');
        await page.evaluate(() => { enterPanel('arcade'); showArcadeGame('rift'); }); await sleep(500);
        await page.evaluate(() => document.querySelector('#gameRift [data-back-to-hub]').click()); await sleep(500);
        probes.riftBack = await page.evaluate(() => ({ hubShown: getComputedStyle(document.getElementById('arcadeHub')).display !== 'none',
          riftStillShown: getComputedStyle(document.getElementById('gameRift')).display !== 'none' }));
        await page.screenshot({ path: path.join(OUT, 'probe-rift-back.jpg'), fullPage: true, ...Q });
        await ctx.close();
      }
      { // 2. the demo checkout, on the real account (the server keeps subscription_plan; nothing else is changed)
        const { ctx, page } = await C.openPage(b, { dir, storageState: state });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await C.clearOverlays(page);
        const before = await page.evaluate(() => profile.subscriptionPlan);
        await page.evaluate(() => { enterPanel('pricing'); document.querySelector('.plan-btn[data-plan="monthly"]').click(); }); await sleep(400);
        await page.evaluate(() => document.getElementById('checkoutConfirmBtn').click()); await sleep(2500);
        const after = await page.evaluate(() => ({ plan: profile.subscriptionPlan, toast: [...document.querySelectorAll('#appToastWrap *')].map(e => e.textContent.trim()).filter(Boolean).slice(-2) }));
        await page.screenshot({ path: path.join(OUT, 'probe-checkout.jpg'), ...Q });
        await page.reload(); await sleep(3000); await page.waitForFunction(() => { try { return !!profile; } catch (e) { return false; } }, null, { timeout: 30000 }).catch(() => {});
        const reloaded = await page.evaluate(() => profile.subscriptionPlan);
        probes.checkout = { before, afterConfirm: after.plan, toast: after.toast, afterReload: reloaded };
        await ctx.close();
      }
      { // 3. strings that skip t(): the World lock toast and the signed-out plan buttons, in French
        const n = await openState(b, dir, state, 'new', { lang: 'fr' });
        await n.page.evaluate(() => { enterPanel('arcade'); showArcadeHub(); document.querySelector('.arcade-game-card[data-game="boss"]').click(); }); await sleep(600);
        const lockToast = await n.page.evaluate(() => [...document.querySelectorAll('#appToastWrap *')].map(e => e.textContent.trim()).filter(Boolean).pop() || null);
        await n.ctx.close();
        const o = await openState(b, dir, state, 'signedout', { lang: 'fr' });
        await o.page.evaluate(() => { enterPanel('pricing'); document.querySelector('.plan-btn[data-plan="monthly"]').click(); }); await sleep(500);
        const planSignin = await o.page.evaluate(() => document.getElementById('signinRequiredTitle').textContent);
        await o.ctx.close();
        probes.frenchStrings = { lockToast, planButtonSigninTitle: planSignin };
      }
      console.log('probes', JSON.stringify(probes));
    }
    fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(statesOut, null, 1));
    fs.writeFileSync(path.join(OUT, 'french.json'), JSON.stringify(french, null, 1));
    fs.writeFileSync(path.join(OUT, 'probes.json'), JSON.stringify(probes, null, 1));
    const cols = COMBOS.map(([w, t]) => `${w}-${t}`), sd = path.join(OUT, 'sheets'); fs.mkdirSync(sd, { recursive: true });
    for (const ph of [8, 9]) {
      const order = SCREENS.filter(s => s.phase === ph).flatMap(s => s.states.map(st => `${s.key}-${st}`));
      const img = (c, n) => fs.existsSync(path.join(OUT, c, `${n}.jpg`)) ? `<img src="${c}/${n}.jpg" class="w${c.split('-')[0]}">` : '—';
      const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;margin:16px;background:#fff;color:#111}
        table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{text-align:left;font-weight:600}
        img.w390{width:170px}img.w1280{width:360px}</style><h1>Before phase ${ph}: ${ph === 8 ? 'Vocal World' : 'everything else'} (${arg('--base') || 'master'})</h1>
        <table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${order.map(n => `<tr><th>${n}</th>${cols.map(c => `<td>${img(c, n)}</td>`).join('')}</tr>`).join('')}</table>`;
      const f = path.join(OUT, `before${ph}.html`); fs.writeFileSync(f, html);
      const sp = await (await b.newContext({ viewport: { width: 1000, height: 1000 } })).newPage();
      await sp.goto('file://' + f); await sleep(1500); await sp.screenshot({ path: path.join(sd, `before${ph}.jpg`), fullPage: true, ...Q }); fs.rmSync(f);
    }
    console.log(`done: ${OUT}`);
  } finally { await b.close(); await C.cleanup(); }
})();
