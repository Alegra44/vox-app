// Phase 9 Hooks check, signed in, with real runs (stand-in singer for the pitch, a test-tone MediaStream as the
// Your Choir mic). Creates two fresh accounts through the real auth modal (voxcoach-p9-<ts>-a / -b@example.com):
//  A (trial): Home card / Songs hub / Journey milestone / achievements before any run, after a failed Harmony
//     Memory run and a lost boss (Learning: no milestone, no achievement), then Harmony Memory
//     stage 1 (the Journey milestone), Boss 1 win (First Choir Boss), a Your Choir take (First Your Choir
//     recording), 5 rehearsal level play-throughs, Harmony Memory stages 2–5 and Boss 2 win (Alto → Ready),
//     checking after each run what was stamped, saved (PATCH /me/progress) and announced, and the Home card.
//     Then en/fr/es/tr text, and a second device (empty localStorage) that must show the same Home card.
//  A locked: plan set to Monthly with the trial over (db query), signed in again: the upgrade Home card with the
//     saved readiness, the hub without status, and the CTA's destination.
//  B: plan Teacher with the trial over and no readiness: the upgrade card without saved readiness, the locked
//     Journey milestone, in en/fr/es.
// Plans are set with `npx supabase db query --linked` (no client path sets subscription_plan). Both accounts are
// deleted when the script exits (testAccounts.js), pass or fail.
// Usage: node scripts/choir-verify/p9.js [url]
const { chromium } = require('playwright');
const { track, db } = require('./testAccounts'); // deletes the accounts this run creates when it exits
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
const stamp = Date.now();
const acc = k => ({ email: track(`voxcoach-p9-${stamp}-${k}@example.com`), password: 'P9-' + Math.random().toString(36).slice(2) + '!x9' });
const A = acc('a'), B = acc('b');

async function openPage(browser, errors) {
  const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/progress (load|save) error|Not signed in/.test(m.text())) errors.push(m.text()); });
  page.on('requestfailed', r => errors.push(`request failed: ${r.url().slice(0, 90)} (${r.failure() && r.failure().errorText})`));
  await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]');
  if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  await page.evaluate(() => { window.__toasts = []; const o = showToast; showToast = (m, t) => { __toasts.push(m); o(m, t); }; });
  return page;
}
async function auth(page, a, mode) {
  await page.evaluate(() => openAuthModal());
  if (mode === 'signin') await page.locator('#authModeToggle').click();
  else await page.locator('#authName').fill('P9 Hooks');
  await page.locator('#authEmail').fill(a.email); await page.locator('#authPassword').fill(a.password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  return page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
}
const txt = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); return el ? el.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const visible = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); return !!el && el.getClientRects().length > 0; }, sel);
async function goHome(page) { await page.locator('.snb-item[data-shell="home"]').click(); await sleep(300); }
async function goSongs(page) { await page.locator('.snb-item[data-shell="songs"]').click(); await sleep(300); }
async function view(page, label) {
  await goHome(page);
  const home = { visible: await visible(page, '#homeChoirCard'), text: await txt(page, '#homeChoirCard') };
  await goSongs(page);
  const hub = { card: await txt(page, '#panel-songs-hub .cw-hub-feature'), status: (await visible(page, '#cwHubStatus')) ? await txt(page, '#cwHubStatus') : '(hidden)', lockTag: await visible(page, '#panel-songs-hub .cw-hub-feature .cw-lock-only') };
  const journey = await page.evaluate(() => { enterPanel('journey'); const b = document.getElementById('journeyChoirMilestone');
    return { visible: b.getClientRects().length > 0, text: b.innerText.replace(/\s+/g, ' ').trim() || b.textContent.replace(/\s+/g, ' ').trim(),
      achievements: [...document.querySelectorAll('#achievementGrid .achievement-card')].slice(-3).map(c => `${c.innerText.replace(/\s+/g, ' ')} [${c.classList.contains('unlocked') ? 'UNLOCKED' : 'locked'}]`) }; });
  console.log(`\n--- ${label}\n[home ${home.visible ? 'shown' : 'HIDDEN'}] ${home.text}\n[hub] ${hub.card}\n[hub status] ${hub.status} | lock tag shown: ${hub.lockTag}\n[journey milestone${journey.visible ? '' : ' (journey not started, box hidden)'}] ${journey.text}\n[achievements] ${journey.achievements.join(' | ')}`);
  return { home, hub, journey };
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const errors = [];
  const page = await openPage(browser, errors);
  const ev = (f, a) => page.evaluate(f, a);
  const patches = [];
  page.on('response', async r => {
    if (!/\/me\/progress$/.test(r.url()) || r.request().method() !== 'PATCH') return;
    let sent = null; try { sent = JSON.parse(r.request().postData()); } catch (e) {}
    patches.push({ status: r.status(), firsts: sent && sent.choir_readiness && sent.choir_readiness.firsts, notified: sent && sent.notified_achievements });
  });
  // Wait for this run's own save (a PATCH after `before`), then until no PATCH for 1.5 s: the achievement check
  // runs when the save returns, and its timeline entry saves once more.
  const waitPatches = async before => { for (let i = 0; i < 100 && patches.length <= before; i++) await sleep(200); let n = -1; while (n !== patches.length) { n = patches.length; await sleep(1500); } };

  const uidA = await auth(page, A, 'signup');
  console.log('account A', A.email, uidA);
  db(`update public.users set day1_start_date = current_date where id = '${uidA}'`); // so the Journey shows its in-progress view
  await ev(async () => { await loadProfile(); ['choirChallengeBest', 'harmonyMemoryBest', 'rehearsalPasses', 'yourChoirTakes'].forEach(k => localStorage.removeItem(k)); });
  await view(page, 'A (trial), before any Choir World run');

  // ---- real runs
  await ev(async () => { enterPanel('partrehearsal'); selectSong('hymn'); setRehearsalPart('Alto'); setRehearsalLevel(0); harmonyMemory.stage = 0; renderPartRehearsal(); });
  // silent: the stand-in never sings, so the run fails (nothing heard)
  const standIn = silent => ev(sil => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    const run = harmonyMemory.active ? harmonyMemory : challenge;
    run.notes.forEach(nt => { const on = choirStartCtxTime + nt.start; osc.frequency.setValueAtTime(noteToFreq(nt.midi), on); g.gain.setValueAtTime(sil ? 0 : 0.3, on); g.gain.setValueAtTime(0, choirStartCtxTime + nt.end - 0.01); });
    analyser = an;
  }, !!silent);
  const waitDone = () => ev(async () => { while (harmonyMemory.active || challenge.active) await new Promise(r => setTimeout(r, 50)); });
  const after = async (label, before) => {
    await waitPatches(before);
    const s = await ev(() => ({ toasts: __toasts.splice(0), firsts: Object.keys(progress.choirReadiness.firsts || {}), alto: rdStored('hymn', 'Alto') && rdStored('hymn', 'Alto').status,
      unlocked: ACHIEVEMENTS.filter(a => a.id.startsWith('cw_') && a.check()).map(a => a.id), notified: (progress.notifiedAchievements || []).filter(id => id.startsWith('cw_')) }));
    const last = patches[patches.length - 1];
    console.log(`${label}: toasts ${JSON.stringify(s.toasts)} | firsts ${JSON.stringify(s.firsts)} | Alto ${s.alto} | cw achievements unlocked ${JSON.stringify(s.unlocked)} notified ${JSON.stringify(s.notified)} | last PATCH HTTP ${last && last.status} firsts sent ${JSON.stringify(last && last.firsts && Object.keys(last.firsts))}`);
  };
  const hm = async (stage, silent) => {
    const before = patches.length;
    await ev(s => { harmonyMemory.stage = s; renderPartRehearsal(); }, stage);
    await ev(async () => { document.getElementById('hmemStartBtn').click(); while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await standIn(silent); await waitDone();
    await after(`HM stage ${stage + 1} (${JSON.stringify(await ev(() => ({ score: harmonyMemory.lastRun.score, passed: harmonyMemory.lastRun.passed })))})`, before);
  };
  const boss = async (slot, silent) => {
    const before = patches.length;
    await ev(s => { chSel.boss = s; renderChoirBosses(); }, slot);
    await ev(async () => { document.getElementById('cbStartBtn').click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await standIn(silent); await waitDone();
    await after(`Boss ${slot + 1} (${JSON.stringify(await ev(() => ({ score: challenge.lastRun.boss.score, passed: challenge.lastRun.boss.passed })))})`, before);
  };

  console.log('\n== Runs on Demo Hymn, Alto');
  // Failed runs first: the part has readiness data but is still Learning, and nothing may unlock
  await hm(0, true);
  await boss(0, true);
  await view(page, 'A after a failed Harmony Memory run and a lost boss (Learning)');
  await ev(() => enterPanel('partrehearsal'));
  await hm(0);
  await view(page, 'A after Harmony Memory stage 1');
  await ev(() => enterPanel('partrehearsal'));
  await boss(0);

  // Your Choir: one take through the real record button, a test tone as the mic
  await ev(async () => {
    enterPanel('choir'); await initAudioOnly(); ensureChoirGainNodes();
    const dest = audioCtx.createMediaStreamDestination(), osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    g.gain.value = 0.3; osc.frequency.value = 262; osc.connect(g).connect(dest); osc.start();
    micStream = dest.stream;
  });
  let before = patches.length;
  await page.locator('#ycParts [data-yc-rec="Alto"]').click();
  await ev(async () => { while (!yourChoir.recording) await new Promise(r => setTimeout(r, 20)); while (yourChoir.recording) await new Promise(r => setTimeout(r, 50)); });
  await after(`Your Choir take (${await txt(page, '#ycStatus')})`, before);

  // Five rehearsal levels, each played through once from chord 1
  await ev(() => enterPanel('partrehearsal'));
  before = patches.length;
  for (let L = 0; L < 5; L++) {
    await ev(async l => { setRehearsalLevel(l); await startPartRehearsal(0); const s0 = choirStartCtxTime; while (choirStartCtxTime === s0) await new Promise(r => setTimeout(r, 50)); stopPartRehearsal(); }, L);
  }
  await after(`5 level play-throughs (levels ${JSON.stringify(await ev(() => rdInputs('hymn', 'Alto').levels))})`, before);
  for (let s = 1; s < 5; s++) await hm(s);
  await view(page, 'A before the last qualifying run (Boss 2)');
  await ev(() => enterPanel('partrehearsal'));
  await boss(1);
  const final = await view(page, 'A after Boss 2 (Alto should be Ready)');
  console.log('\nindependent: rdInputs(hymn, Alto) =', JSON.stringify(await ev(() => rdInputs('hymn', 'Alto'))), '→', await ev(() => rdStatus(rdInputs('hymn', 'Alto'))));

  // Home "Continue rehearsing" really opens the named song and part
  await goHome(page);
  await page.locator('#homeChoirCard [data-cw-go]').click(); await sleep(500);
  console.log('Continue button →', JSON.stringify(await ev(() => ({ panel: document.querySelector('.panel.active').id, song: currentSongId, part: partRehearsal.part }))));

  for (const lg of ['fr', 'es', 'tr', 'en']) { await ev(l => setLanguage(l), lg); await sleep(300); await view(page, `A in ${lg}`); }

  // ---- the stored row, independently
  const row = db(`select choir_readiness->'firsts' as firsts, choir_readiness->'parts'->'hymn'->'Alto' as alto, choir_readiness->'ycTakes' as yc, notified_achievements from public.user_progress where user_id = '${uidA}'`)[0];
  console.log('\nDB row:', JSON.stringify(row));

  // ---- second device
  const errors2 = [];
  const page2 = await openPage(browser, errors2);
  await auth(page2, A, 'signin');
  console.log('\n== Second device, empty localStorage:', JSON.stringify(await page2.evaluate(() => ['choirChallengeBest', 'harmonyMemoryBest', 'rehearsalPasses'].map(k => localStorage.getItem(k)))));
  const d2 = await view(page2, 'A on device 2');
  console.log('device 2 Home card == device 1 (en):', d2.home.text === final.home.text);
  await page2.context().close();

  // ---- A locked: Monthly, trial over
  db(`update public.users set subscription_plan = 'monthly', trial_start_date = current_date - 30 where id = '${uidA}'`);
  const page3 = await openPage(browser, errors);
  await auth(page3, A, 'signin');
  console.log('\n== A locked:', JSON.stringify(await page3.evaluate(() => ({ tier: currentTier(), inTrial: isInTrial(), choirWorld: hasChoirWorldAccess(), locked: document.body.classList.contains('cw-locked') }))));
  await view(page3, 'A locked (Monthly, trial over, readiness from the trial)');
  await goHome(page3);
  await page3.locator('#homeChoirCard [data-cw-cta]').click(); await sleep(400);
  console.log('Home CTA →', await page3.evaluate(() => document.querySelector('.panel.active').id));
  await goSongs(page3);
  await page3.locator('#panel-songs-hub .cw-hub-feature [data-enter-panel="partrehearsal"]').click(); await sleep(500);
  console.log('hub "I Am the Part" → locked preview shown:', await visible(page3, '#cwPreviewRehearsal'), '| rehearsal controls hidden:', !(await visible(page3, '#hmemStartBtn')));
  await page3.context().close();

  // ---- B: Teacher, trial over, no readiness
  const page4 = await openPage(browser, errors);
  const uidB = await auth(page4, B, 'signup');
  console.log('\naccount B', B.email, uidB);
  db(`update public.users set subscription_plan = 'teacher', trial_start_date = current_date - 30, day1_start_date = current_date where id = '${uidB}'`);
  await page4.context().close();
  const page5 = await openPage(browser, errors);
  await auth(page5, B, 'signin');
  console.log('B:', JSON.stringify(await page5.evaluate(() => ({ tier: currentTier(), choirWorld: hasChoirWorldAccess(), locked: document.body.classList.contains('cw-locked') }))));
  for (const lg of ['en', 'fr', 'es']) { await page5.evaluate(l => setLanguage(l), lg); await sleep(300); await view(page5, `B locked (Teacher, no readiness) in ${lg}`); }

  console.log('\nUSER_IDS', uidA, uidB);
  console.log('page errors:', errors, errors2);
  await browser.close();
})();
