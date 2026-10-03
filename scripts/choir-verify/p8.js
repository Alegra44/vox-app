// Phase 8 gate check, one tier at a time, with real clicks. For each tier: navigate Songs → "I Am the Part"
// and Songs → Choir Workspace and record what is actually visible (locked preview vs features), check the
// basic mixer still works, then click every Choir World action. For locked tiers the gated cards are first
// forced visible (body class removed, as a user could in devtools) so the clicks reach the real buttons:
// nothing may start and the Choir paywall (or sign-in prompt) must open instead. For unlocked tiers the same
// clicks must really start each run.
// Usage: node scripts/choir-verify/p8.js <accounts.json> [tiers comma-separated|all] [url] [langs]
//   accounts.json: {"monthly": {"email", "password"}, ...}; the tier "signedout" needs no account.
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const accounts = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const tiers = !process.argv[3] || process.argv[3] === 'all' ? ['signedout', ...Object.keys(accounts)] : process.argv[3].split(',');
const url = process.argv[4] || 'http://localhost:8765/';
const langs = (process.argv[5] || '').split(',').filter(Boolean);

const ACTIONS = [
  // [label, panel, selector, "did it start?" check]
  ['Harmony Memory start', 'partrehearsal', '#hmemStartBtn', 'harmonyMemory.active'],
  ['Choir Boss start', 'partrehearsal', '#cbStartBtn', 'challenge.active && challenge.kind==="boss"'],
  ['Chaos Mode start', 'partrehearsal', '#cxStartBtn', 'challenge.active && challenge.kind==="chaos"'],
  ['Tempo/Key Ladder start', 'partrehearsal', '#tkStartBtn', 'challenge.active && challenge.kind==="ladder"'],
  ['Entrance Trainer start', 'partrehearsal', '#ttStartBtn', 'timingTrainer.active'],
  ['Rehearsal play (levels)', 'partrehearsal', '#rehearsalPlayBtn', 'partRehearsal.active'],
  ['A Cappella on', 'partrehearsal', '#acappellaBtn', 'partRehearsal.acappella'],
  ['Your Choir record Alto', 'choir', '#ycParts [data-yc-rec="Alto"]', '!!yourChoir.recording'],
  ['Sonic X-Ray section tap', 'choir', '#xraySvg .xray-sec', 'choirIsPlaying'],
];
const STOP_ALL = () => { try { document.getElementById('levelupOverlay').classList.remove('levelup-show'); // a run's XP can trigger the level-up celebration, which covers the page
     if (timingTrainer.active) finishTimingTrainer(); if (harmonyMemory.active) finishHarmonyMemory(false); if (challenge.active) finishChallenge(false); if (partRehearsal.active) stopPartRehearsal(); if (yourChoir.recording || yourChoir.playing) ycStop(); if (partRehearsal.acappella) setAcappella(false); if (choirIsPlaying) stopChoir(); } catch (e) {} };

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  for (const tier of tiers) {
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(String(e)));
    p.on('console', m => { if (m.type() === 'error' && !/Not signed in|progress (load|save) error/.test(m.text())) errors.push(m.text()); });
    const ev = (f, a) => p.evaluate(f, a);
    await p.goto(url, { waitUntil: 'load' }); await sleep(3000);
    const lang = p.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) await lang.click();
    if (tier !== 'signedout') {
      const acc = accounts[tier];
      await ev(() => openAuthModal());
      await p.locator('#authModeToggle').click();
      await p.locator('#authEmail').fill(acc.email); await p.locator('#authPassword').fill(acc.password);
      await p.locator('#authCreateBtn').click();
      await p.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
      await ev(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
    }
    const st = await ev(() => ({ tier: currentTier(), plan: profile && profile.subscriptionPlan, inTrial: isInTrial(), choirWorld: hasChoirWorldAccess(), mixer: hasChoirAccess(), locked: document.body.classList.contains('cw-locked') }));
    console.log(`\n================ ${tier.toUpperCase()} ================\nstate: ${JSON.stringify(st)}`);

    const vis = sel => ev(s => [...document.querySelectorAll(s)].some(el => el.getClientRects().length > 0), sel);
    const shown = panelSel => ev(s => [...document.querySelector(s).children].filter(el => el.getClientRects().length > 0).map(el => el.id || el.className.split(' ')[0]), panelSel);
    const goSongs = async () => { await p.locator('.snb-item[data-shell="songs"]').click(); await sleep(400); };
    const openHub = async panel => { await goSongs(); const btn = p.locator(`#panel-songs-hub [data-enter-panel="${panel}"]`).first(); /* the Choir World card (phase 9) comes first */ await btn.scrollIntoViewIfNeeded(); await btn.click(); await sleep(700); };

    // --- what a real user sees
    await goSongs();
    console.log('Songs hub, "I Am the Part" card:', JSON.stringify(await ev(() => document.querySelector('#panel-songs-hub [data-enter-panel="partrehearsal"]').closest('.hub-category-card').innerText.replace(/\s+/g, ' '))));
    await openHub('partrehearsal');
    console.log('I Am the Part — visible blocks:', JSON.stringify(await shown('#panel-partrehearsal')));
    if (st.locked) console.log('  preview text:', JSON.stringify(await ev(() => document.getElementById('cwPreviewRehearsal').innerText.replace(/\s+/g, ' '))));
    if (st.locked) console.log('  teaser radar:', JSON.stringify(await ev(() => ({ dots: document.querySelectorAll('#cwPreviewRehearsalDna circle').length, aria: document.getElementById('cwPreviewRehearsalDna').getAttribute('aria-label') }))));
    await openHub('choir');
    const ws = await ev(() => Object.fromEntries(['sonicXrayCard', 'rehearseEntryRow', 'yourChoirCard', 'choirDnaWorkspaceCard', 'cwPreviewWorkspace', 'songDnaCard', 'songDifficultyBox', 'rosterList'].map(id => [id, document.getElementById(id).getClientRects().length > 0])));
    console.log('Choir Workspace — visible:', JSON.stringify(ws));
    // basic mixer: real clicks on MUTE Alto, then the volume slider state
    const m0 = await ev(() => JSON.stringify(choirState.Alto));
    await p.locator('#muteAlto').click(); await sleep(300);
    const m1 = await ev(() => JSON.stringify(choirState.Alto));
    const pw0 = await vis('#paywallModalOverlay'), si0 = await vis('#signinRequiredOverlay');
    console.log(`mixer: MUTE Alto ${m0} → ${m1} | volume slider disabled: ${await ev(() => volAlto.disabled)} | paywall after MUTE: ${pw0} | sign-in prompt: ${si0}`);
    if (pw0) await p.locator('#paywallCancelBtn').click(); if (si0) await p.locator('#signinRequiredCancelBtn').click();
    if (m1 !== m0) { await p.locator('#muteAlto').click(); await sleep(200); }
    await ev(() => { enterPanel('choirpassport'); });
    console.log('Choir Passport — visible blocks:', JSON.stringify(await shown('#panel-choirpassport')));

    // --- every Choir World action, by real click
    console.log(st.locked ? 'Actions (gated cards forced visible first):' : 'Actions:');
    for (const [label, panel, sel, startedExpr] of ACTIONS) {
      await ev(STOP_ALL);
      await ev(pn => { enterPanel(pn); if (pn === 'choir') renderSonicXray(); }, panel);
      await sleep(400);
      if (st.locked) await ev(() => document.body.classList.remove('cw-locked'));
      const loc = p.locator(sel).first();
      await loc.scrollIntoViewIfNeeded();
      await loc.click({ timeout: 5000 });
      let started = false;
      for (let i = 0; i < 30 && !started; i++) { await sleep(100); started = await ev(e => !!eval(e), startedExpr); }
      if (!st.locked) await sleep(300);
      const pw = await vis('#paywallModalOverlay'), si = await vis('#signinRequiredOverlay');
      const pwText = pw ? await ev(() => `${paywallTitle.textContent} — ${paywallReason.textContent} [${paywallPlanChip.textContent}]`) : si ? await ev(() => `sign-in prompt: ${signinRequiredTitle.textContent}`) : '';
      const ok = st.locked ? (!started && (pw || si)) : (started && !pw && !si);
      console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}: started=${started} paywall=${pw} signin=${si}${pwText ? ' | ' + pwText : ''}`);
      if (pw) await p.locator('#paywallCancelBtn').click();
      if (si) await p.locator('#signinRequiredCancelBtn').click();
      await ev(STOP_ALL);
      if (st.locked) await ev(() => applyChoirWorldGateUI());
      await sleep(200);
    }

    // --- the preview's call to action, by real click
    if (st.locked) {
      await openHub('partrehearsal');
      const cta = p.locator('#cwPreviewRehearsal [data-cw-cta]');
      const ctaText = await cta.innerText();
      await cta.click(); await sleep(500);
      const after = await ev(() => ({ pricing: document.getElementById('panel-pricing').classList.contains('active'), auth: document.getElementById('authModalOverlay').style.display === 'flex',
        choirCard: [...document.querySelectorAll('#panel-pricing [data-i18n^="pricing_choir_f"]')].map(li => li.textContent) }));
      console.log(`preview CTA "${ctaText}" → ${after.auth ? 'auth modal (sign up for the trial)' : after.pricing ? 'pricing page; Choir card lists: ' + JSON.stringify(after.choirCard) : 'NOTHING'}`);
      if (after.auth) await ev(() => closeAuthModal());
    }

    for (const lg of (st.locked ? langs : [])) {
      await ev(l => setLanguage(l), lg); await sleep(300);
      await openHub('partrehearsal');
      if (lg === langs[0]) await p.locator('#cwPreviewRehearsal').screenshot({ path: require('os').tmpdir() + `/p8-preview-${tier}-${lg}.png` });
      const txt = await ev(() => document.getElementById('cwPreviewRehearsal').innerText.replace(/\s+/g, ' '));
      await ev(() => document.body.classList.remove('cw-locked'));
      await p.locator('#cbStartBtn').scrollIntoViewIfNeeded(); await p.locator('#cbStartBtn').click(); await sleep(400);
      const si = await vis('#signinRequiredOverlay'); // signed out gets the sign-in prompt, not the paywall
      const pw = si ? await ev(() => `sign-in prompt: ${signinRequiredTitle.textContent}`) : await ev(() => `${paywallTitle.textContent} — ${paywallReason.textContent} [${paywallPlanChip.textContent}]`);
      await p.locator(si ? '#signinRequiredCancelBtn' : '#paywallCancelBtn').click(); await ev(() => applyChoirWorldGateUI());
      await goSongs();
      const tag = await ev(() => document.querySelector('#panel-songs-hub .cw-lock-only').textContent);
      console.log(`\n[${lg}] preview: ${txt}\n[${lg}] boss paywall: ${pw}\n[${lg}] hub tag: ${tag}`);
    }
    if (st.locked && langs.length) await ev(() => setLanguage('en'));
    console.log('page errors:', errors);
    await ctx.close();
  }
  await b.close();
})();
