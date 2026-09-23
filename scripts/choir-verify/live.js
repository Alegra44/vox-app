// Live click-through on production: Harmony Memory stage 1 + Breath Map, via real mouse clicks.
const { chromium } = require('playwright');
const fs = require('fs'), crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = 'https://deploy-alegra1122.vercel.app/';
const SHOTS = require('os').tmpdir() + '/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.addInitScript(() => localStorage.setItem('language', 'en'));

  const resp = await p.goto(URL, { waitUntil: 'load' });
  const liveHtml = await resp.text();
  const local = fs.readFileSync(require('path').join(__dirname, '../../deploy/index.html'), 'utf8');
  const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
  console.log('live sha', h(liveHtml), 'local sha', h(local), liveHtml === local ? 'IDENTICAL' : 'DIFFERENT');
  await sleep(4000);
  const ev = (f, a) => p.evaluate(f, a);

  // Real clicks: bottom nav Songs -> "I Am the Part" hub card Open.
  await p.locator('.shell-nav button, nav button').filter({ hasText: 'Songs' }).first().click();
  await sleep(600);
  const openBtn = p.locator('[data-enter-panel="partrehearsal"]:visible').first();
  await openBtn.scrollIntoViewIfNeeded(); await openBtn.click();
  await sleep(800);
  console.log('panel active:', await ev(() => document.getElementById('panel-partrehearsal').classList.contains('active')));
  await p.locator('#rehearsalPartRow [data-rh-part="Alto"]').click();

  // Breath Map as displayed
  const bm = await ev(() => ({ summary: bmSummary.textContent, rows: [...document.querySelectorAll('#bmRows .record-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), final: document.querySelector('#bmRows .fine-print').textContent, cue: bmLive.textContent }));
  console.log('== Breath Map (live)'); console.log(JSON.stringify(bm, null, 1));
  await p.locator('#breathMapCard').screenshot({ path: SHOTS + 'live-bm.png' });

  // Harmony Memory: fresh state, click stage 1 then Start
  console.log('stages:', await ev(() => [...document.querySelectorAll('#hmemStages [data-hm-stage]')].map(x => (x.disabled ? 'locked' : 'open') + ':' + x.querySelector('.rh-level-name').textContent)));
  await p.locator('#hmemStages [data-hm-stage="0"]').click();
  await p.locator('#hmemStartBtn').click();
  await ev(async () => { while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  // Stand-in singer (headless has no voice): sine on each Alto note; chord 3 +80 cents, chord 6 silent.
  await ev(() => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    const cd = songChordDurMs() / 1000;
    SONG.parts.Alto.notes.forEach((m, i) => {
      const t0 = choirStartCtxTime + i * cd;
      osc.frequency.setValueAtTime(noteToFreq(m + (i === 2 ? 0.8 : 0)), t0);
      g.gain.setValueAtTime(i === 5 ? 0 : 0.3, t0);
      g.gain.setValueAtTime(0, t0 + cd * CHOIR_NOTE_FRACTION);
    });
    analyser = an;
  });
  const songT = () => ev(() => audioCtx.currentTime - choirStartCtxTime);
  const waitSongT = async s => { for (;;) { const t = await songT(); if (t >= s) return; await sleep(Math.max(10, (s - t) * 1000 - 30)); } };
  const snap = () => ev(() => ({ songT: +(audioCtx.currentTime - choirStartCtxTime).toFixed(3), status: hmemStatus.textContent, cue: bmLive.textContent, gains: Object.fromEntries(Object.keys(choirGainNodes).map(k => [k, +choirGainNodes[k].gain.value.toFixed(4)])), readout: rehearsalGainValue.textContent, notesVisible: !!rehearsalNotes.offsetParent }));
  for (const t of [-1.5, 1.0, 3.2, 6.0]) { await waitSongT(t); console.log('run', JSON.stringify(await snap())); }
  await p.locator('#harmonyMemoryCard').screenshot({ path: SHOTS + 'live-hm-running.png' });
  await waitSongT(27.1); await sleep(400);
  console.log('== Result (live)', JSON.stringify(await ev(() => ({ active: harmonyMemory.active, score: harmonyMemory.lastRun && harmonyMemory.lastRun.score, results: hmemResults.innerText.split('\n').filter(Boolean), stored: localStorage.getItem('harmonyMemoryBest'), stages: [...document.querySelectorAll('#hmemStages [data-hm-stage]')].map(x => x.disabled ? 'locked' : 'open') })), null, 1));
  await p.locator('#harmonyMemoryCard').screenshot({ path: SHOTS + 'live-hm-result.png' });
  // Hear the Mistake's own button must not start Harmony Memory
  console.log('page errors:', errors);
  await ev(() => localStorage.removeItem('harmonyMemoryBest'));
  await b.close();
})();
