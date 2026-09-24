// Phase 7 signed-in check: signs up a fresh account through the real auth modal, runs Harmony Memory stage 1
// (pass), Boss 1 (win) and Boss 2 (loss) on Demo Hymn Alto with a stand-in singer, and logs every
// PATCH /me/progress body's choir_readiness plus what the API returned. Then a second browser context (a
// "second device", empty localStorage) signs in to the same account and reports what it loaded.
// Confirm the row independently afterwards: npx supabase db query --linked "select choir_readiness from
// public.user_progress where user_id = '<printed id>'"
// Usage: node scripts/choir-verify/p7signed.js [url]
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
const email = `voxcoach-p7-${Date.now()}@example.com`, password = 'P7-' + Math.random().toString(36).slice(2) + '!x9';

async function openPage(browser, errors) {
  const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await sleep(3000);
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]');
  if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  return page;
}
async function auth(page, mode) {
  await page.evaluate(() => openAuthModal());
  if (mode === 'signin') await page.locator('#authModeToggle').click();
  else await page.locator('#authName').fill('P7 Readiness');
  await page.locator('#authEmail').fill(email);
  await page.locator('#authPassword').fill(password);
  await page.locator('#authCreateBtn').click();
  // onSignedIn() closes the modal only after loadProgress(); profile alone is set before progress arrives
  await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const errors = [];
  const page = await openPage(browser, errors);
  const patches = [];
  page.on('response', async r => {
    if (!/\/me\/progress$/.test(r.url()) || r.request().method() !== 'PATCH') return;
    let sent = null, got = null;
    try { sent = JSON.parse(r.request().postData()).choir_readiness; } catch (e) {}
    try { got = (await r.json()).choir_readiness; } catch (e) {}
    patches.push({ status: r.status(), sent, got });
  });
  const ev = (f, a) => page.evaluate(f, a);

  await auth(page, 'signup');
  const uid = await ev(async () => (await sb.auth.getSession()).data.session.user.id);
  console.log('signed up', email, '| user_id', uid);
  console.log('loaded choir_readiness before any run:', JSON.stringify(await ev(() => progress.choirReadiness)));

  await ev(() => { ['choirChallengeBest', 'harmonyMemoryBest', 'rehearsalPasses'].forEach(k => localStorage.removeItem(k)); enterPanel('partrehearsal'); });
  await sleep(500);
  await ev(() => { selectSong('hymn'); setRehearsalPart('Alto'); setRehearsalLevel(0); harmonyMemory.stage = 0; renderPartRehearsal(); });

  const standIn = plan => ev(pl => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    const run = harmonyMemory.active ? harmonyMemory : challenge;
    run.notes.forEach((nt, i) => {
      const p = pl[i]; if (!p) return;
      const on = choirStartCtxTime + nt.start, off = choirStartCtxTime + nt.end - 0.01;
      osc.frequency.setValueAtTime(noteToFreq(nt.midi + p.c / 100), on);
      g.gain.setValueAtTime(0.3, on); g.gain.setValueAtTime(0, off);
    });
    analyser = an;
  }, plan);
  const waitDone = () => ev(async () => { while (harmonyMemory.active || challenge.active) await new Promise(r => setTimeout(r, 50)); });
  // wait until no PATCH has arrived for 1.5 s (a run can trigger more than one save)
  const waitPatches = async () => { let n = -1; while (n !== patches.length) { n = patches.length; await sleep(1500); } };
  const inTune = Array.from({ length: 8 }, () => ({ c: 0 }));

  console.log('\n== Harmony Memory stage 1, all in tune');
  await ev(async () => { document.getElementById('hmemStartBtn').click(); while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  await standIn(inTune); await waitDone(); await waitPatches();
  console.log('run:', JSON.stringify(await ev(() => ({ score: harmonyMemory.lastRun.score, passed: harmonyMemory.lastRun.passed }))));

  console.log('== Boss 1 (Drowner), all in tune');
  await ev(() => { chSel.boss = 0; renderChoirBosses(); });
  await ev(async () => { document.getElementById('cbStartBtn').click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  await standIn(inTune); await waitDone(); await waitPatches();
  console.log('run:', JSON.stringify(await ev(() => ({ score: challenge.lastRun.boss.score, passed: challenge.lastRun.boss.passed }))));

  console.log('== Boss 2 (Drifter), silent from chord 2');
  await ev(() => { chSel.boss = 1; renderChoirBosses(); });
  await ev(async () => { document.getElementById('cbStartBtn').click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  await standIn([{ c: 0 }, null, null, null, null, null, null, null]); await waitDone(); await waitPatches();
  console.log('run:', JSON.stringify(await ev(() => ({ score: challenge.lastRun.boss.score, passed: challenge.lastRun.boss.passed }))));
  await sleep(1000);

  console.log('\n== PATCH /me/progress calls:', patches.length);
  patches.forEach((p, i) => console.log(`#${i + 1} HTTP ${p.status} | sent==returned: ${JSON.stringify(p.sent) === JSON.stringify(p.got)} | returned parts.hymn.Alto:`,
    JSON.stringify(p.got && p.got.parts && p.got.parts.hymn && p.got.parts.hymn.Alto), '| log', (p.got && p.got.log || []).length, '| runs', (p.got && p.got.runs || []).length));
  const clientFinal = await ev(() => progress.choirReadiness);
  console.log('\nclient final choir_readiness:\n' + JSON.stringify(clientFinal, null, 1));
  console.log('readiness card:', await ev(() => rdRows.innerText.replace(/\s+/g, ' ')));

  console.log('\n== Second device: new context, empty localStorage, sign in to the same account');
  const page2 = await openPage(browser, errors);
  await auth(page2, 'signin');
  const loaded = await page2.evaluate(() => ({ cr: progress.choirReadiness, local: ['choirChallengeBest', 'harmonyMemoryBest', 'rehearsalPasses'].map(k => localStorage.getItem(k)), inputs: rdInputs('hymn', 'Alto'), status: rdStatus(rdInputs('hymn', 'Alto')) }));
  console.log('localStorage on device 2:', JSON.stringify(loaded.local));
  console.log('loaded == device 1 final:', JSON.stringify(loaded.cr) === JSON.stringify(clientFinal));
  console.log('rdInputs(hymn, Alto) on device 2:', JSON.stringify(loaded.inputs), '→', loaded.status);
  await page2.evaluate(() => { enterPanel('partrehearsal'); selectSong('hymn'); renderReadiness(); });
  console.log('device 2 readiness card:', await page2.evaluate(() => rdRows.innerText.replace(/\s+/g, ' ')));

  console.log('\nUSER_ID', uid);
  console.log('page errors:', errors);
  await browser.close();
})();
