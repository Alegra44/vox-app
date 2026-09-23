// Live click-through on production for Phase 5: fight the Drowner (with a true-peak tap on the choir
// output), switch to French, check the boss names, then run one Chaos Mode session and read its results.
const { chromium } = require('playwright');
const fs = require('fs'), crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.argv[2] || 'https://deploy-alegra1122.vercel.app/';
const SHOTS = require('os').tmpdir() + '/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('language', 'en'); localStorage.removeItem('choirChallengeBest'); });

  const resp = await p.goto(URL, { waitUntil: 'load' });
  const liveHtml = await resp.text();
  const local = fs.readFileSync(require('path').join(__dirname, '../../deploy/index.html'), 'utf8');
  const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
  console.log('live sha', h(liveHtml), 'local sha', h(local), liveHtml === local ? 'IDENTICAL' : 'DIFFERENT');
  await sleep(4000);
  const ev = (f, a) => p.evaluate(f, a);
  const songT = () => ev(() => audioCtx.currentTime - choirStartCtxTime);
  const waitSongT = async s => { for (;;) { const t = await songT(); if (t >= s) return; await sleep(Math.max(10, (s - t) * 1000 - 30)); } };
  // Headless has no voice: a stand-in sine on your part's notes, fed to the pitch analyser. offs[i] cents, null = silent.
  const standIn = offs => ev(o => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    const cd = songChordDurMs() / 1000;
    SONG.parts[challenge.part].notes.forEach((m, i) => {
      const t0 = choirStartCtxTime + i * cd;
      osc.frequency.setValueAtTime(noteToFreq(m + (o[i] || 0) / 100), t0);
      g.gain.setValueAtTime(o[i] === null ? 0 : 0.3, t0);
      g.gain.setValueAtTime(0, t0 + cd * CHOIR_NOTE_FRACTION);
    });
    analyser = an;
  }, offs);

  // Real clicks: bottom nav Songs -> "I Am the Part" -> Alto.
  await p.locator('.shell-nav button, nav button').filter({ hasText: 'Songs' }).first().click();
  await sleep(600);
  const openBtn = p.locator('[data-enter-panel="partrehearsal"]:visible').first();
  await openBtn.scrollIntoViewIfNeeded(); await openBtn.click();
  await sleep(800);
  console.log('panel active:', await ev(() => document.getElementById('panel-partrehearsal').classList.contains('active')));
  await p.locator('#rehearsalPartRow [data-rh-part="Alto"]').click();

  // == Drowner fight
  await p.locator('#cbBosses [data-cb-boss="0"]').click();
  const fight = p.locator('#cbStartBtn');
  await fight.scrollIntoViewIfNeeded();
  console.log('button:', await fight.innerText());
  await fight.click();
  await ev(async () => { while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  // True-peak tap on choirOutNode, the single node that feeds the speakers.
  await ev(() => {
    const sp = audioCtx.createScriptProcessor(1024, 1, 1);
    choirOutNode.connect(sp); sp.connect(audioCtx.destination);
    window.__pk = { max: 0, over: 0, n: 0, sq: 0 };
    sp.onaudioprocess = e => { const d = e.inputBuffer.getChannelData(0); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > __pk.max) __pk.max = v; if (v > 1) __pk.over++; __pk.n++; __pk.sq += v * v; } e.outputBuffer.getChannelData(0).fill(0); };
  });
  await standIn([0, 0, 0, 0, 0, 0, 0, 0]);
  await waitSongT(5);
  console.log('Drowner mid-run:', JSON.stringify(await ev(() => ({ status: cbStatus.textContent, trim: +choirOutNode.gain.value.toFixed(3), fx: Object.fromEntries(Object.entries(choirFxNodes).map(([k, f]) => [k, +f.gain.value.toFixed(2)])), mix: Object.fromEntries(Object.entries(choirGainNodes).map(([k, g]) => [k, +g.gain.value.toFixed(3)])) }))));
  await p.locator('#choirBossCard').screenshot({ path: SHOTS + 'live-drowner-running.png' });
  await ev(async () => { while (challenge.active) await new Promise(r => setTimeout(r, 50)); });
  console.log('Drowner output peak:', JSON.stringify(await ev(() => ({ peak: +__pk.max.toFixed(3), peakDbfs: +(20 * Math.log10(__pk.max)).toFixed(2), samplesOver1: __pk.over, samples: __pk.n, rmsDbfs: +(10 * Math.log10(__pk.sq / __pk.n)).toFixed(2), trimAfter: choirOutNode.gain.value }))));
  console.log('Drowner result:', (await ev(() => cbResults.innerText)).split('\n').slice(0, 6).join(' | '));

  // == French, via the real language buttons if one is on screen, else the same setLanguage() they call.
  const frBtn = p.locator('[data-profile-lang="fr"]:visible, [data-lang="fr"]:visible').first();
  if (await frBtn.count()) { await frBtn.click(); console.log('switched to fr by clicking a language button'); }
  else { await ev(() => setLanguage('fr')); console.log('switched to fr via setLanguage (no language button visible on this panel)'); }
  await sleep(500);
  console.log('FR boss names:', await ev(() => [...document.querySelectorAll('#cbBosses .rh-level-name')].map(e => e.textContent)));
  console.log('FR boss card:', JSON.stringify(await ev(() => ({ title: document.querySelector('#choirBossCard .step-label').textContent, desc: document.getElementById('cbBossDesc').textContent, button: cbStartLabel.textContent, bars: cbBossHpText.textContent + ' / ' + cbLivesText.textContent, result: cbResults.innerText.split('\n').slice(0, 6).join(' | ') }))));
  await p.locator('#choirBossCard').screenshot({ path: SHOTS + 'live-fr-bosses.png' });

  // == One Chaos Mode session, in French: in tune on calm chords, +90 cents on chaos chords.
  const cx = p.locator('#cxStartBtn');
  await cx.scrollIntoViewIfNeeded();
  console.log('FR chaos button:', await cx.innerText());
  await cx.click();
  await ev(async () => { while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  const plan = await ev(() => challenge.cfg.plan);
  await standIn(plan.map(e => e ? 90 : 0));
  console.log('plan:', JSON.stringify(plan));
  await waitSongT(9);
  console.log('FR chaos status:', await ev(() => cxStatus.textContent));
  await ev(async () => { while (challenge.active) await new Promise(r => setTimeout(r, 50)); });
  console.log('FR chaos results:\n' + await ev(() => cxResults.innerText));
  console.log('FR chaos best:', await ev(() => cxBest.textContent));
  await p.locator('#chaosCard').screenshot({ path: SHOTS + 'live-fr-chaos.png' });
  console.log('shots in', SHOTS);
  console.log('page errors:', errors);
  await b.close();
})();
